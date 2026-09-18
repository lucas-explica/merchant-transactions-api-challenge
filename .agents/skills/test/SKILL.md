# Test Skill

Derive tests from requirements and invariants. Include boundary, malformed-input, failure, concurrency, consistency, security, and integration cases where applicable. Verify assertions actually establish their stated claim.

Independent verification should check that build output is intentionally ignored or intentionally versioned, that verification remains reproducible after artifacts exist, and that the working tree is not polluted by accidental generated files. See `docs/quality.md`.

For creation endpoints, verify that success status semantics are backed by the
state they claim. Include financial/calendar boundary evidence where those
rules are in scope, and document the working directory for verification commands.
