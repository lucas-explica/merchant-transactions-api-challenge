# Quality and verification

## Unit tests

- Parse/serialize decimal strings, reject invalid precision, and verify half-up fee rounding with integer cents.
- Verify debit/credit status, fee amount, settlement date, and totals.
- Verify validation and last-four masking.
- Verify CAS success, bounded conflict retries, and exhaustion.

## Orchestration tests

Cover definite transaction failure, receivable failure and DELETE compensation, ambiguous writes with read-after-write, and uncertain compensation. Assert no false success and correct error class.

## Required real integration test

Run the actual application against the provided Numerator and json-server. Launch N (for example 20) concurrent successful POSTs and assert N new transactions, N receivables, uniqueness and non-overlap only among newly allocated IDs, each reservation's transaction=N+1 and receivable=N+2, exact links, no created orphans, and four-digit card data. Do not assert global disjointness against the pre-existing fixture collections. The test must fail if newly allocated IDs are reused. Keep deterministic concurrency separate from optional stress testing.

## Gates

Each plan slice has a deterministic gate. Before delivery: typecheck, unit/orchestration tests, service-backed integration/concurrency test, fresh review, and delivery audit. Tests are evidence and do not override requirements.
