# Implement Skill

Implement approved slices only. Preserve service boundaries, use Numerator for every ID, protect card data, use exact money arithmetic, and add behavior-focused tests. Stop on requirement or architecture conflicts.

Before adding a validation restriction, compare it with the authoritative
requirements and approved architecture; do not infer a stricter business rule
from an implementation prompt or intuition.

Before declaring a slice complete, run its deterministic verification and required build/generated-output steps, inspect `git status --short`, and confirm no unexpected generated files are tracked or left as unignored working-tree noise. Follow the generated-artifact policy in `docs/quality.md`.

Do not activate a final creation endpoint in an intermediate slice when its
success status implies persistence or externally allocated identifiers. Escalate
contract conflicts instead of adding temporary success semantics, placeholder
IDs, or fake persistence. Keep safe structured logging enabled; security
requires omission of payment data, not disabling all observability.
