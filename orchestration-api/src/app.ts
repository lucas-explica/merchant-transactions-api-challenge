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
import { jsonServer } from './persistence/json-server.js';

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
        const pair = await reservePair(
          httpNumerator(process.env.NUMERATOR_URL ?? 'http://localhost:3000'),
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
        const receivable = {
          id: pair.receivableId,
          transaction_id: pair.transactionId,
          ...buildReceivable(value, input.method, now),
        };
        const db = jsonServer(
          process.env.JSON_SERVER_URL ?? 'http://localhost:8080',
        );
        await db.create('transactions', transaction);
        try {
          await db.create('receivables', receivable);
        } catch (error) {
          try {
            await db.remove('transactions', pair.transactionId);
          } catch {
            /* compensation is best effort */
          }
          throw error;
        }
        return reply.status(201).send({
          transaction: { ...transaction, value: transaction.value },
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
