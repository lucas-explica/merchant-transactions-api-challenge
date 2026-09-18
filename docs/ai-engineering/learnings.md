# Engineering Learnings

## CAS retry bound requires real contention evidence

- Observed failure: the first real N=20 run returned only 10/20 successes;
  successful allocations remained unique, while the allocator exhausted its
  bounded 8-attempt CAS loop under contention.
- Reusable rule: a bounded retry unit test does not prove that the selected
  bound is operationally adequate; concurrency-sensitive defaults must be
  exercised against the real dependency.
- Canonical file: `docs/quality.md`.
- Responsible agent: Test Engineer.

## Unpinned external development infrastructure limits exact reproduction

- Evidence: the supplied Compose service uses `vimagick/json-server` without a version tag; the delivery run therefore records exact Compose topology separately from compatible real-HTTP image evidence.
- Reusable rule: external integration dependencies used as delivery evidence should be pinned where the project controls them; when supplied infrastructure is unpinned, tests and documentation must distinguish exact supplied-runtime verification from compatible fallback verification.
- Canonical file: `docs/quality.md`.
- Responsible agent: Delivery Auditor.
