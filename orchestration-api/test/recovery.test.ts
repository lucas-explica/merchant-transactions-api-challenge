import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  create: vi.fn(),
  get: vi.fn(),
  remove: vi.fn(),
}));
vi.mock('../src/persistence/json-server.js', () => {
  class PersistenceError extends Error {
    constructor(
      message: string,
      public ambiguous = false,
      public downstreamStatusCode?: number,
    ) {
      super(message);
    }
  }
  class ConsistencyError extends Error {}
  return { PersistenceError, ConsistencyError, jsonServer: () => state };
});
vi.mock('../src/numerator/allocator.js', () => ({
  httpNumerator: vi.fn(),
  reservePair: vi
    .fn()
    .mockResolvedValue({ transactionId: '4', receivableId: '5' }),
}));

import { buildApp } from '../src/app.js';
import { PersistenceError } from '../src/persistence/json-server.js';

const request = {
  value: '10.00',
  description: 'sale',
  method: 'debit_card',
  cardNumber: '4111111111111111',
  cardHolderName: 'A',
  cardExpirationDate: '12/30',
  cardCvv: '123',
};
const transaction = {
  id: '4',
  value: '10.00',
  description: 'sale',
  method: 'debit_card',
  cardNumber: '1111',
  cardHolderName: 'A',
  cardExpirationDate: '12/30',
  cardCvv: '123',
};

describe('Slice 4 recovery semantics', () => {
  afterEach(() => vi.useRealTimers());
  beforeEach(() => {
    vi.clearAllMocks();
    state.create.mockResolvedValue({});
    state.get.mockResolvedValue(null);
    state.remove.mockResolvedValue({});
  });
  async function post() {
    const app = buildApp();
    const response = await app.inject({
      method: 'POST',
      url: '/transactions',
      payload: request,
    });
    await app.close();
    return response;
  }
  it('A: definite transaction failure stops before receivable', async () => {
    state.create.mockRejectedValueOnce(new PersistenceError('failed'));
    const response = await post();
    expect(response.statusCode).toBe(500);
    expect(state.create).toHaveBeenCalledTimes(1);
  });
  it('B: ambiguous transaction matching continues', async () => {
    state.create.mockRejectedValueOnce(new PersistenceError('unknown', true));
    state.get.mockResolvedValueOnce(transaction);
    const response = await post();
    expect(response.statusCode).toBe(201);
    expect(state.create).toHaveBeenCalledTimes(2);
  });
  it('C/D/L: transaction absent, unavailable, or mismatched never continues', async () => {
    for (const found of [null, undefined, { ...transaction, value: '11.00' }]) {
      vi.clearAllMocks();
      state.create.mockRejectedValueOnce(new PersistenceError('unknown', true));
      state.get.mockImplementationOnce(() =>
        found === undefined
          ? Promise.reject(new PersistenceError('unknown', true))
          : Promise.resolve(found),
      );
      const response = await post();
      expect(response.statusCode).toBe(500);
      expect(state.create).toHaveBeenCalledTimes(1);
    }
  });
  it('E/G: receivable definite failure or confirmed absence compensates', async () => {
    for (const receivableError of [
      new PersistenceError('failed'),
      new PersistenceError('unknown', true),
    ]) {
      vi.clearAllMocks();
      state.create
        .mockResolvedValueOnce({})
        .mockRejectedValueOnce(receivableError);
      const response = await post();
      expect(response.statusCode).toBe(500);
      expect(state.remove).toHaveBeenCalledWith('transactions', '4');
    }
  });
  it('F: ambiguous matching receivable succeeds without compensation', async () => {
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    state.create
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new PersistenceError('unknown', true));
    state.get.mockResolvedValueOnce({
      id: '5',
      transaction_id: '4',
      status: 'paid',
      create_date: '2026-01-01T00:00:00.000Z',
      subtotal: '10.00',
      discount: '0.20',
      total: '9.80',
    });
    const response = await post();
    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.transaction).not.toHaveProperty('cardCvv');
    expect(JSON.stringify(body)).not.toContain('4111111111111111');
    expect(state.remove).not.toHaveBeenCalled();
  });
  it('does not compensate when verification reports a server failure', async () => {
    state.create
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new PersistenceError('unknown', true));
    state.get.mockRejectedValueOnce(
      new PersistenceError('server failure', false, 500),
    );
    const response = await post();
    expect(response.statusCode).toBe(500);
    expect(state.remove).not.toHaveBeenCalled();
  });
  it('maps downstream 403 to public 500 while validation remains 400', async () => {
    state.create.mockRejectedValueOnce(
      new PersistenceError('forbidden by dependency', false, 403),
    );
    expect((await post()).statusCode).toBe(500);
    const app = buildApp();
    const response = await app.inject({ method: 'POST', url: '/transactions' });
    await app.close();
    expect(response.statusCode).toBe(400);
  });
  it('H/L: ambiguous receivable mismatch or unavailable never deletes transaction', async () => {
    for (const found of [{ id: '5', transaction_id: 'wrong' }, undefined]) {
      vi.clearAllMocks();
      state.create
        .mockResolvedValueOnce({})
        .mockRejectedValueOnce(new PersistenceError('unknown', true));
      state.get.mockImplementationOnce(() =>
        found === undefined
          ? Promise.reject(new PersistenceError('unknown', true))
          : Promise.resolve(found),
      );
      const response = await post();
      expect(response.statusCode).toBe(500);
      expect(state.remove).not.toHaveBeenCalled();
    }
  });
  it('I/J/K: ambiguous compensation is confirmed, failed, or uncertain', async () => {
    for (const remaining of [null, { id: '4' }, undefined]) {
      vi.clearAllMocks();
      state.create
        .mockResolvedValueOnce({})
        .mockRejectedValueOnce(new PersistenceError('failed'));
      state.remove.mockRejectedValueOnce(new PersistenceError('unknown', true));
      state.get.mockImplementationOnce(() =>
        remaining === undefined
          ? Promise.reject(new PersistenceError('unknown', true))
          : Promise.resolve(remaining),
      );
      const response = await post();
      expect(response.statusCode).toBe(500);
      expect(state.get).toHaveBeenCalled();
    }
  });
});
