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

Reserve pair -> POST transaction -> POST receivable -> return. A definite transaction failure consumes IDs but creates no resource. A definite receivable failure triggers DELETE transaction. For ambiguous writes, GET by reserved ID first; if the receivable exists, treat the pair as committed but return an uncertainty error; if absent, compensate. Compensation failure or uncertainty is reported as reconciliation-required. No queue, outbox, saga engine, or distributed transaction is added.

Guarantee: every 201 response represents one linked pair, and definite receivable failure is not knowingly left orphaned. Non-guarantee: lost responses after writes can leave an orphan.

## Security, observability, and exclusions

Logs contain correlation ID, IDs, method, CAS outcome, and compensation outcome. They never contain PAN, CVV, or the complete request body. No Kafka, RabbitMQ, Redis, custom database, saga engine, event sourcing, CQRS, generic repositories, custom DI, circuit breaker, metrics, or tracing stack.

## Invariants

1. Successful operations create one transaction and one linked receivable.
2. For each reservation from previous value N to N+2, the caller exclusively claims (N+1, N+2); newly allocated pairs do not overlap. Existing fixture IDs are not asserted globally disjoint across collections.
3. IDs are Numerator-originated strings.
4. Persisted card number is exactly four digits and CVV is never returned/logged.
5. total equals subtotal minus discount in exact cents.
