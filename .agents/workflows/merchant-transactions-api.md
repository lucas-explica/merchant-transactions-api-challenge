# Merchant Transactions API Workflow

Phase 0 — Establish and verify the harness.

Phase 1 — Architect reviews requirements, ambiguities, architecture, invariants, failure model, verification strategy, and plan; use an Architecture Decision Gate when necessary.

Phase 2 — Implementer delivers approved small vertical slices. Expected slices are API contract/OpenAPI, financial rules, Numerator allocation/concurrency, orchestration, and failure/compensation behavior; the Architect may adjust order.

Phase 3 — Run deterministic verification.

Phase 4 — Test Engineer independently attacks claims, including real-service integration where valuable.

Phase 5 — Reviewer uses fresh context and returns PASS or CHANGES_REQUIRED.

Phase 6 — Implementer corrects accepted findings; verification and fresh review repeat.

Phase 7 — Delivery Auditor maps requirements to evidence and reports delivery readiness.
