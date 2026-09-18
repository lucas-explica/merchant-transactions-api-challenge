import { describe, expect, it, vi } from 'vitest';
import {
  jsonServer,
  PersistenceError,
} from '../src/persistence/json-server.js';

describe('json-server persistence adapter', () => {
  it.each([
    [200, { id: '1' }],
    [404, null],
  ])('GET %s returns the expected result', async (status, expected) => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(new Response(JSON.stringify(expected), { status })),
    );
    await expect(
      jsonServer('http://db').get('transactions', '1'),
    ).resolves.toEqual(expected === null ? null : expected);
    vi.unstubAllGlobals();
  });

  it.each([400, 403, 500])(
    'GET %s throws instead of returning absence',
    async (status) => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(new Response('', { status })),
      );
      await expect(
        jsonServer('http://db').get('transactions', '1'),
      ).rejects.toMatchObject({
        name: 'Error',
        statusCode: status,
      });
      vi.unstubAllGlobals();
    },
  );

  it('turns network rejection into ambiguous PersistenceError', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    await expect(
      jsonServer('http://db').get('transactions', '1'),
    ).rejects.toMatchObject({
      ambiguous: true,
    });
    vi.unstubAllGlobals();
  });
});
