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

Concurrency-sensitive retry defaults must also be exercised against the real
dependency under the approved concurrent load. A bounded retry unit test alone
does not establish that the selected bound is operationally adequate.

## Generated artifacts

Generated build output must not be versioned unless intentionally required. Transient and generated artifacts must be explicitly ignored by Git, and source-quality tools must not accidentally treat them as source. Build and verification must not leave unexpected repository changes; completion evidence includes checking repository state after verification.

## Delivery evidence

- Deterministic verification: `npm run verify` passed with 87 tests; `npm run build` passed.
- Integration mode: `PROVIDED_DOCKER_STACK` services were used for Numerator and the supplied `vimagick/json-server` image. Because Docker Desktop could not publish the supplied json-server on host port 8080 (an external port allocation conflict), the same supplied image was run on isolated host port 18080 with a temporary copy of `config/db.json`; the orchestration API exercised real HTTP against it. The Docker runtime is therefore `NOT_VERIFIED` for the exact published Compose topology, while the dependency image and Numerator implementation were exercised through real HTTP.
- Three isolated N=20 runs each produced 20 HTTP 201 responses, 20 transactions, 20 receivables, 20 unique IDs in each collection, exact transaction links, zero created orphans, final Numerator 43, four-digit card data, credit status `waiting_funds`, discount `10.00`, total `240.00`, and no PAN/CVV in public responses.
- The supplied Compose service declares `vimagick/json-server` without a tag. This is an infrastructure reproducibility limitation; compatible fallback evidence must not be presented as bit-for-bit verification of an unspecified latest image.

## Operational documentation

Run commands from `orchestration-api/` unless stated otherwise:

```text
npm install
npm run verify
npm run build
```

From the repository root, `docker compose up --build` starts the supplied Numerator, json-server, and orchestration services. `GET /health` returns `{ "status": "ok" }`; `/docs` serves the OpenAPI UI. `POST /transactions` accepts the documented transaction fields and returns HTTP 201 with one transaction and one linked receivable.

Money is accepted as a non-negative decimal string with at most two fractional digits, calculated with integer cents, and returned with exactly two fractional digits. Debit uses status `paid`, a 2% fee, and D+0 settlement; credit uses `waiting_funds`, a 4% fee, and D+30 settlement. `discount` is the monetary fee amount and `total = value - discount`, rounded half-up to cents.

Numerator allocation uses CAS from N to N+2 and assigns transaction N+1 and receivable N+2. Conflicts retry with a bounded configurable limit (`NUMERATOR_MAX_ATTEMPTS`, default 32); an ambiguous CAS result is never retried or reused. Persistence is transaction first, receivable second, with read-after-write verification and safe compensation for definite receivable failure. Ambiguous or mismatching verification never returns false 201 and never performs destructive compensation without confirmation. The service provides consistency safeguards but does not claim ACID or durable reconciliation.

Responses contain only the last four card digits and never CVV; logs and errors do not expose PAN, CVV, or request bodies.
