# Merchant Transactions API implementation plan

Status: ARCHITECTURE_READY_FOR_IMPLEMENTATION.

## Slice 1 — scaffold and contract
Goal: TypeScript/Fastify app, schema-first POST route, OpenAPI, test harness.
Acceptance: valid envelope has 201 contract; invalid input maps to stable 4xx.
Tests/gate: typecheck, route/schema tests, OpenAPI check. Exclude persistence and business behavior.

## Slice 2 — request and financial rules
Goal: validation, masking, BigInt cents, fees, totals, and create_date settlement representation.
Acceptance: debit/credit rules and rounding are exact.
Tests/gate: deterministic unit tests. Exclude Numerator and persistence.

## Slice 3 — Numerator pair allocator
Goal: CAS N to N+2, assign transaction N+1 and receivable N+2, with bounded conflict retry.
Acceptance: no GET/PUT allocation path, no UUIDs, each successful reservation exclusively claims N+1/N+2, and unknown CAS outcome never reuses IDs.
Tests/gate: conflict/exhaustion tests, including validation of the tunable retry default against real-service contention. Separate CAS conflicts from network/dependency failures; use currentNumerator from a 400 conflict when available. Exclude generic retry libraries and resource writes.

## Slice 4 — persistence and orchestration
Goal: use supplied json-server to persist transaction then linked receivable.
Acceptance: successful request returns both resources and preserves invariants.
Tests/gate: controlled persistence-failure tests. Exclude durable reconciliation.

## Slice 5 — compensation and ambiguity
Goal: bounded read-after-write checks and transaction DELETE compensation.
Acceptance: definite receivable failure is compensated; uncertainty is never false success.
Tests/gate: failure-matrix tests. Exclude queues, outbox, and saga frameworks.

## Slice 6 — real integration/concurrency
Goal: verify with supplied Numerator and json-server.
Acceptance: N concurrent successes with unique/non-overlapping newly allocated IDs, correct N+1/N+2 assignment, exact links, no created orphans, four-digit card data; fixture IDs need not be globally disjoint.
Tests/gate: deterministic N=20 integration test; stress separate. Exclude modifying provided services.

## Slice 7 — hardening and documentation
Goal: redacted structured logging, documentation, and final contract review.
Acceptance: forbidden data absent from logs/responses; docs agree.
Tests/gate: full deterministic suite, fresh Reviewer, Delivery Auditor. Exclude production observability infrastructure.
