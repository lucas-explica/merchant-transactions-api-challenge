import Fastify, { type FastifyInstance } from 'fastify';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { Type } from '@sinclair/typebox';

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
    app.log.error(error);
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
