import Fastify, { type FastifyInstance } from 'fastify';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { Type } from '@sinclair/typebox';
import {
  TransactionRequest,
  TransactionResponse,
  ReceivableResponse,
  CreateTransactionResponse,
  type TransactionRequestType,
} from './http/schemas.js';
import { maskCardNumber } from './domain/card.js';
import { parseMoney, serializeMoney } from './domain/money.js';
import { buildReceivable } from './domain/receivable.js';
import { httpNumerator, reservePair } from './numerator/allocator.js';
import {
  ConsistencyError,
  jsonServer,
  PersistenceError,
} from './persistence/json-server.js';

export const HealthResponse = Type.Object({
  status: Type.Literal('ok'),
});

export function buildApp(): FastifyInstance {
  const app = Fastify({ logger: true });

  void app.register(swagger, {
    openapi: {
      openapi: '3.0.3',
      info: {
        title: 'Merchant Transactions Orchestration API',
        version: '1.0.0',
      },
    },
  });
  void app.register(swaggerUi, { routePrefix: '/docs' });

  void app.register(async (routes) => {
    routes.post<{ Body: TransactionRequestType }>(
      '/transactions',
      {
        schema: {
          body: TransactionRequest,
          response: { 201: CreateTransactionResponse },
        },
      },
      async (request, reply) => {
        const input = request.body;
        const value = parseMoney(input.value);
        const now = new Date();
        const configuredAttempts = Number(process.env.NUMERATOR_MAX_ATTEMPTS);
        const maxAttempts =
          Number.isInteger(configuredAttempts) && configuredAttempts > 0
            ? configuredAttempts
            : 32;
        const pair = await reservePair(
          httpNumerator(process.env.NUMERATOR_URL ?? 'http://localhost:3000'),
          maxAttempts,
        );
        const transaction = {
          id: pair.transactionId,
          value: serializeMoney(value),
          description: input.description,
          method: input.method,
          cardNumber: maskCardNumber(input.cardNumber),
          cardHolderName: input.cardHolderName,
          cardExpirationDate: input.cardExpirationDate,
          cardCvv: input.cardCvv,
        };
        const publicTransaction = {
          id: transaction.id,
          value: transaction.value,
          description: transaction.description,
          method: transaction.method,
          cardNumber: transaction.cardNumber,
          cardHolderName: transaction.cardHolderName,
          cardExpirationDate: transaction.cardExpirationDate,
        };
        const receivable = {
          id: pair.receivableId,
          transaction_id: pair.transactionId,
          ...buildReceivable(value, input.method, now),
        };
        const db = jsonServer(
          process.env.JSON_SERVER_URL ?? 'http://localhost:8080',
        );
        try {
          await db.create('transactions', transaction);
        } catch (error) {
          if (error instanceof PersistenceError && error.ambiguous) {
            const found = await db.get('transactions', pair.transactionId);
            if (!found || !matches(found, transaction))
              throw new ConsistencyError(
                'Transaction persistence outcome is uncertain',
              );
          } else throw error;
        }
        try {
          await db.create('receivables', receivable);
        } catch (error) {
          if (error instanceof PersistenceError && error.ambiguous) {
            const found = await db.get('receivables', pair.receivableId);
            if (found && matches(found, receivable))
              return reply
                .status(201)
                .send({ transaction: publicTransaction, receivable });
            if (!found) {
              await compensate(db, pair.transactionId);
            }
            throw new ConsistencyError(
              'Receivable persistence outcome is uncertain',
            );
          }
          await compensate(db, pair.transactionId);
          throw error;
        }
        return reply.status(201).send({
          transaction: publicTransaction,
          receivable,
        });
      },
    );
    routes.get(
      '/health',
      {
        schema: {
          response: { 200: HealthResponse },
        },
      },
      async () => ({ status: 'ok' as const }),
    );
  });

  app.setErrorHandler((error, _request, reply) => {
    if (typeof error === 'object' && error !== null && 'validation' in error) {
      return void reply.status(400).send({ error: 'Invalid request' });
    }
    const statusCode =
      error instanceof Error &&
      'statusCode' in error &&
      typeof error.statusCode === 'number'
        ? error.statusCode
        : 500;
    void reply
      .status(statusCode < 500 ? statusCode : 500)
      .send({ error: 'Internal Server Error' });
  });

  return app;
}

async function compensate(
  db: ReturnType<typeof jsonServer>,
  transactionId: string,
) {
  try {
    await db.remove('transactions', transactionId);
  } catch (error) {
    if (!(error instanceof PersistenceError) || !error.ambiguous)
      throw new ConsistencyError('Compensation failed');
    const remaining = await db.get('transactions', transactionId);
    if (remaining) throw new ConsistencyError('Compensation failed');
    // A confirmed 404 after an ambiguous DELETE establishes compensation.
  }
}

function matches(
  actual: Record<string, unknown>,
  expected: Record<string, unknown>,
) {
  return Object.entries(expected).every(
    ([key, value]) => actual[key] === value,
  );
}
