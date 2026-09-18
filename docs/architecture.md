# Architecture

## Recommendation

Use Node.js + TypeScript + Fastify. Fastify provides schema validation, inferred types, OpenAPI support, and test ergonomics with little ceremony; NestJS adds unjustified structure for this bounded exercise. Schema-first route definitions are the source for validation, types, and OpenAPI.

## Minimal structure

    src/
      http/             route, schemas, error mapping
      orchestration/    reserve, persist, compensate
      domain/           integer-cent and receivable rules
      numerator/        HTTP client and CAS allocator
      persistence/      json-server HTTP client
    tests/
      unit/ orchestration/ integration/

## Numerator and concurrency

GET followed by PUT is unsafe: callers can read the same value. Lock + GET + PUT is also unsafe because numerator.js leaves GET, PUT, and CAS unaffected by the lock; it only serializes lock acquisition. It has no ownership token, so an unsuccessful caller must not unlock another caller's lock.

Use CAS: read N, atomically test-and-set N to N+2, then assign transaction N+1 and receivable N+2. For every successful reservation, the caller exclusively claims the newly advanced values N+1 and N+2. The service starts at 3 and fixture data already uses 3, so N itself is not newly allocated. Under concurrency, successful pairs cannot overlap. Retry only known CAS conflicts, separately from network/dependency failures. The 400 currentNumerator may be used as the next observed value. Retries are always bounded; an initial default such as 8 is a tunable implementation safety limit, not a business invariant. Add delay/jitter only if measurements justify it. Exhaustion is a temporary allocation error.

If the CAS response is lost, the outcome is unknown. Do not retry with or reuse the pair: return an allocation-uncertain error and accept abandoned IDs. A subsequent allocation starts from freshly observed Numerator state. Durable reconciliation is outside this take-home.

## Consistency and failure model

Reserve pair -> POST transaction -> POST receivable -> return. A definite transaction failure consumes IDs but creates no resource. For an ambiguous transaction POST, an exact GET match continues; confirmed 404 fails, unavailable verification or mismatch fails without false success. A definite receivable failure triggers DELETE transaction. For an ambiguous receivable POST, an exact GET match may return 201 without compensation; confirmed 404 compensates; unavailable verification or mismatch fails without blindly compensating. Compensation failure or uncertainty is reported as reconciliation-required. Absence requires positive evidence: only HTTP 404 confirms absence. No queue, outbox, saga engine, or distributed transaction is added.

Guarantee: every 201 response represents one linked pair, and definite receivable failure is not knowingly left orphaned. Non-guarantee: lost responses after writes can leave an orphan.

HTTP 201 is reserved for a transaction and receivable that have both been
persisted, linked, and represented by Numerator-originated IDs. Slice 1B
therefore exposes schemas and domain functions only; the public POST route is
activated as a complete endpoint in Slice 3 after allocation and persistence.

The HTTP composition boundary receives a minimal injected `now(): Date`
function (or equivalent single seam), not a general clock framework.

## Security, observability, and exclusions

Keep Fastify structured request logging enabled. Logs contain safe request
metadata and later IDs, method, CAS outcome, and compensation outcome. They
never contain PAN, CVV, or complete request bodies. `logger:false` is not a
security substitute; no large redaction framework is needed. No Kafka,
RabbitMQ, Redis, custom database, saga engine, event sourcing, CQRS, generic
repositories, custom DI, circuit breaker, metrics, or tracing stack.

## Invariants

1. Successful operations create one transaction and one linked receivable.
2. For each reservation from previous value N to N+2, the caller exclusively claims (N+1, N+2); newly allocated pairs do not overlap. Existing fixture IDs are not asserted globally disjoint across collections.
3. IDs are Numerator-originated strings.
4. Persisted card number is exactly four digits and CVV is never returned/logged.
5. total equals subtotal minus discount in exact cents.
