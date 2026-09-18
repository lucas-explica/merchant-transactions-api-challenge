export class PersistenceError extends Error {
  constructor(
    message: string,
    public readonly ambiguous = false,
  ) {
    super(message);
  }
}
export type Resource = Record<string, unknown>;
export function jsonServer(baseUrl: string) {
  async function request(path: string, init: RequestInit) {
    try {
      const response = await fetch(`${baseUrl}/${path}`, init);
      if (!response.ok)
        throw new PersistenceError(`Persistence failed (${response.status})`);
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
    get: (collection: string, id: string) =>
      request(`${collection}/${encodeURIComponent(id)}`, { method: 'GET' }),
    remove: (collection: string, id: string) =>
      request(`${collection}/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  };
}
