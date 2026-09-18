# Merchant Transactions API implementation plan

Status: SLICE_1A_IMPLEMENTED_PENDING_REVIEW.

## Slice 1A — application and verification foundation
Goal: TypeScript/Fastify app foundation, strict TypeScript, schema/OpenAPI foundation, health route, deterministic verification tooling, and Docker foundation.
Acceptance: application boots and health/OpenAPI are available without external services.
Tests/gate: typecheck, health/schema tests, OpenAPI check, and deterministic verification. Exclude POST /transactions, persistence, and business behavior.

## Slice 1B — transaction contract schemas and deterministic domain behavior
Goal: define and test the POST /transactions request/response schemas plus boundary validation, card masking, exact money representation, debit/credit financial rules, and settlement-date calculation.
Acceptance: schemas and pure domain behavior are reviewable and deterministic; no public successful POST endpoint is exposed until IDs and resources can actually be created.
Tests/gate: schema/OpenAPI and deterministic unit tests for validation, masking, fees, totals, rounding, status, and settlement date. Exclude public POST activation, Numerator, persistence, and orchestration compensation.

## Slice 2 — Numerator pair allocator
Goal: CAS N to N+2, assign transaction N+1 and receivable N+2, with bounded conflict retry.
Acceptance: no GET/PUT allocation path, no UUIDs, each successful reservation exclusively claims N+1/N+2, and unknown CAS outcome never reuses IDs.
Tests/gate: conflict/exhaustion tests, including validation of the tunable retry default against real-service contention. Separate CAS conflicts from network/dependency failures; use currentNumerator from a 400 conflict when available. Exclude generic retry libraries and resource writes.

## Slice 3 — persistence and orchestration
Goal: activate POST /transactions using Numerator-allocated IDs and supplied json-server to persist transaction then linked receivable.
Acceptance: successful request returns both resources and preserves invariants.
Tests/gate: controlled persistence-failure tests. Exclude durable reconciliation.

## Slice 4 — compensation and ambiguity
Goal: bounded read-after-write checks and transaction DELETE compensation.
Acceptance: definite receivable failure is compensated; uncertainty is never false success.
Tests/gate: failure-matrix tests. Exclude queues, outbox, and saga frameworks.

## Slice 5 — real integration/concurrency
Goal: verify with supplied Numerator and json-server.
Acceptance: N concurrent successes with unique/non-overlapping newly allocated IDs, correct N+1/N+2 assignment, exact links, no created orphans, four-digit card data; fixture IDs need not be globally disjoint.
Tests/gate: deterministic N=20 integration test; stress separate. Exclude modifying provided services.

## Slice 6 — hardening and documentation
Goal: redacted structured logging, documentation, and final contract review.
Acceptance: forbidden data absent from logs/responses; docs agree.
Tests/gate: full deterministic suite, fresh Reviewer, Delivery Auditor. Exclude production observability infrastructure.
