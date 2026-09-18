export type NumeratorClient = {
  get(): Promise<number>;
  compareAndSet(
    oldValue: number,
    newValue: number,
  ): Promise<{ ok: true } | { ok: false; currentNumerator?: number }>;
};

export class AllocationError extends Error {}
export class AllocationUncertainError extends AllocationError {}

export async function reservePair(client: NumeratorClient, maxAttempts = 32) {
  let observed = await client.get();
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const result = await client.compareAndSet(observed, observed + 2);
    if (result.ok)
      return {
        transactionId: String(observed + 1),
        receivableId: String(observed + 2),
      };
    if (typeof result.currentNumerator === 'number')
      observed = result.currentNumerator;
    else observed = await client.get();
    if (attempt + 1 < maxAttempts)
      await new Promise((resolve) => setTimeout(resolve, 1 + (attempt % 3)));
  }
  throw new AllocationError('Numerator reservation retries exhausted');
}

export function httpNumerator(baseUrl: string): NumeratorClient {
  return {
    async get() {
      let response: Response;
      try {
        response = await fetch(`${baseUrl}/numerator`);
      } catch {
        throw new AllocationError('Numerator dependency failure');
      }
      if (!response.ok)
        throw new AllocationError('Numerator dependency failure');
      const body = (await response.json()) as { numerator: number };
      return body.numerator;
    },
    async compareAndSet(oldValue, newValue) {
      let response: Response;
      try {
        response = await fetch(`${baseUrl}/numerator/test-and-set`, {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ oldValue, newValue }),
        });
      } catch {
        throw new AllocationUncertainError(
          'Numerator reservation outcome is uncertain',
        );
      }
      if (response.ok) return { ok: true };
      if (response.status === 400)
        return {
          ok: false,
          ...((await response.json()) as { currentNumerator?: number }),
        };
      throw new AllocationError('Numerator dependency failure');
    },
  };
}
