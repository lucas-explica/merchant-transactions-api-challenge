export class PersistenceError extends Error {
  constructor(
    message: string,
    public readonly ambiguous = false,
    public readonly downstreamStatusCode?: number,
  ) {
    super(message);
  }
}
export class ConsistencyError extends Error {}
export type Resource = Record<string, unknown>;
export function jsonServer(baseUrl: string) {
  async function request(path: string, init: RequestInit) {
    try {
      const response = await fetch(`${baseUrl}/${path}`, init);
      if (!response.ok)
        throw new PersistenceError(
          `Persistence failed (${response.status})`,
          false,
          response.status,
        );
      return response;
    } catch (error) {
      if (error instanceof PersistenceError) throw error;
      throw new PersistenceError('Persistence dependency failure', true);
    }
  }
  return {
    create: (collection: string, resource: Resource) =>
      request(collection, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(resource),
      }),
    async get(collection: string, id: string) {
      try {
        const response = await request(
          `${collection}/${encodeURIComponent(id)}`,
          {
            method: 'GET',
          },
        );
        return (await response.json()) as Resource;
      } catch (error) {
        if (
          error instanceof PersistenceError &&
          error.downstreamStatusCode === 404
        )
          return null;
        throw error;
      }
    },
    remove: (collection: string, id: string) =>
      request(`${collection}/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  };
}
