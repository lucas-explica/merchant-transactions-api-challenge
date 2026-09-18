import { afterEach, describe, expect, it } from 'vitest';
import { buildApp, HealthResponse } from '../src/app.js';

describe('application foundation', () => {
  const apps: ReturnType<typeof buildApp>[] = [];
  afterEach(async () => {
    await Promise.all(apps.map((app) => app.close()));
    apps.length = 0;
  });

  it('returns the documented health response', async () => {
    const app = buildApp();
    apps.push(app);
    const response = await app.inject({ method: 'GET', url: '/health' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok' });
  });

  it('generates OpenAPI with GET /health without external services', async () => {
    const app = buildApp();
    apps.push(app);
    await app.ready();
    const document = app.swagger();
    const healthOperation = document.paths?.['/health']?.get;
    expect(document.paths?.['/health']).toBeDefined();
    expect(healthOperation).toBeDefined();
    const healthResponse = healthOperation?.responses?.['200'];
    expect(healthResponse).toBeDefined();
    if (!healthResponse || !('content' in healthResponse)) {
      throw new Error('The health operation has no response content');
    }
    const responseSchema = healthResponse.content?.['application/json']?.schema;
    expect(responseSchema).toMatchObject({
      type: HealthResponse.type,
      required: ['status'],
      properties: {
        status: {
          type: HealthResponse.properties.status.type,
          enum: [HealthResponse.properties.status.const],
        },
      },
    });
    expect(
      (await app.inject({ method: 'GET', url: '/health' })).json(),
    ).toEqual({
      status: 'ok',
    });
    expect((await app.inject({ method: 'GET', url: '/docs' })).statusCode).toBe(
      200,
    );
  });

  it('exposes the transaction contract after orchestration is enabled', async () => {
    const app = buildApp();
    apps.push(app);
    await app.ready();
    expect(app.swagger().paths?.['/transactions']?.post).toBeDefined();
    expect(
      (await app.inject({ method: 'POST', url: '/transactions' })).statusCode,
    ).toBe(400);
  });
});
