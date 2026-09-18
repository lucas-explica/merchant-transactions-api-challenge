# Merchant Transactions Orchestration API

Repository-level guidance for the AI engineering harness.

## Authority

1. Authoritative product specification (the provided README files) and services
2. Human-approved requirement decisions
3. Approved architecture decisions
4. Approved implementation plan
5. Tests as evidence, never as authority over requirements

## Canonical artifacts

- `docs/requirements.md`
- `docs/architecture.md`
- `docs/quality.md`
- `.agents/plans/merchant-transactions-api.md`
- `.agents/workflows/merchant-transactions-api.md`

## Non-negotiable constraints

- Use the provided json-server and Numerator; do not reimplement either.
- Never use UUID or another ID generator; both transaction and receivable IDs originate from Numerator.
- Treat concurrency and consistency as first-class concerns.
- Use exact decimal arithmetic for money, never floating point.
- Persist and return only the last four card digits; never log sensitive card data.
- Prefer simple solutions over speculative abstractions.

## Workflow

Architect → Architecture Decision Gate when needed → Implementer → deterministic verification → Test Engineer → Reviewer → remediation and fresh review → Delivery Auditor.

Detailed role, skill, plan, workflow, and AI-journey guidance lives under `.agents/` and `docs/ai-engineering/`.

## Escalation

Stop and surface the issue rather than inventing behavior when the project is materially ambiguous, an approved decision would be violated, another role owns the decision, or evidence is unavailable.

Existing `docs/` artifacts created before this harness are drafts requiring fresh Architect review; they are not approved authority.
