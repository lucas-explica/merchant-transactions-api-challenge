import { describe, expect, it, vi } from 'vitest';
import {
  AllocationUncertainError,
  reservePair,
} from '../src/numerator/allocator.js';

describe('numerator pair allocation', () => {
  it('assigns N+1 and N+2', async () => {
    const client = {
      get: vi.fn().mockResolvedValue(3),
      compareAndSet: vi.fn().mockResolvedValue({ ok: true }),
    };
    await expect(reservePair(client)).resolves.toEqual({
      transactionId: '4',
      receivableId: '5',
    });
  });
  it('uses the current value from a conflict and remains bounded', async () => {
    const client = {
      get: vi.fn().mockResolvedValue(3),
      compareAndSet: vi
        .fn()
        .mockResolvedValueOnce({ ok: false, currentNumerator: 5 })
        .mockResolvedValueOnce({ ok: true }),
    };
    await expect(reservePair(client, 2)).resolves.toEqual({
      transactionId: '6',
      receivableId: '7',
    });
    expect(client.compareAndSet).toHaveBeenCalledTimes(2);
  });
  it('rejects exhausted retries', async () => {
    const client = {
      get: vi.fn().mockResolvedValue(3),
      compareAndSet: vi
        .fn()
        .mockResolvedValue({ ok: false, currentNumerator: 3 }),
    };
    await expect(reservePair(client, 2)).rejects.toThrow('exhausted');
    expect(client.compareAndSet).toHaveBeenCalledTimes(2);
  });

  it('does not retry after an ambiguous CAS outcome', async () => {
    const client = {
      get: vi.fn().mockResolvedValue(3),
      compareAndSet: vi
        .fn()
        .mockRejectedValue(new AllocationUncertainError('unknown')),
    };
    await expect(reservePair(client, 32)).rejects.toBeInstanceOf(
      AllocationUncertainError,
    );
    expect(client.compareAndSet).toHaveBeenCalledTimes(1);
  });
});
