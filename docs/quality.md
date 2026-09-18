# Quality and verification

## Unit tests

- Parse/serialize decimal strings, reject invalid precision, and verify half-up fee rounding with integer cents.
- Verify debit/credit status, fee amount, settlement date, and totals.
- Verify validation, non-negative monetary values (including `0` and `0.00`),
  and last-four masking.
- Verify CAS success, bounded conflict retries, and exhaustion.
- Slice 1B also requires adversarial evidence for required fields, extra
  properties, invalid methods, relevant OpenAPI constraints, sanitized errors,
  and deterministic injected dates. Financial tests cover below/exactly/above
  the half-cent boundary and `subtotal = discount + total`; calendar tests cover
  month and year transitions. Complete responses contain neither PAN nor CVV.

## Orchestration tests

Cover definite transaction failure, receivable failure and DELETE compensation, ambiguous writes with read-after-write, and uncertain compensation. Assert no false success and correct error class.

## Required real integration test

Run the actual application against the provided Numerator and json-server. Launch N (for example 20) concurrent successful POSTs and assert N new transactions, N receivables, uniqueness and non-overlap only among newly allocated IDs, each reservation's transaction=N+1 and receivable=N+2, exact links, no created orphans, and four-digit card data. Do not assert global disjointness against the pre-existing fixture collections. The test must fail if newly allocated IDs are reused. Keep deterministic concurrency separate from optional stress testing.

## Contract gates

HTTP 201 is evidence of durable creation, not merely calculation. Until
Numerator allocation and both json-server writes exist, Slice 1B must not
expose a successful public POST runtime endpoint or use placeholder IDs.

## Gates

Each plan slice has a deterministic gate. Before delivery: typecheck, unit/orchestration tests, service-backed integration/concurrency test, fresh review, and delivery audit. Tests are evidence and do not override requirements.

## Generated artifacts

Generated build output must not be versioned unless intentionally required. Transient and generated artifacts must be explicitly ignored by Git, and source-quality tools must not accidentally treat them as source. Build and verification must not leave unexpected repository changes; completion evidence includes checking repository state after verification.
