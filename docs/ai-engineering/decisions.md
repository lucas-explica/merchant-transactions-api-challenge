# Engineering Decisions

## Persistence failure classification corrected by external review

- Observed failure: the persistence adapter treated every non-ambiguous GET HTTP error as resource absence, so HTTP 500 could trigger destructive compensation.
- Promoted rule: resource absence requires explicit positive evidence such as HTTP 404; dependency failures, authorization failures, timeouts, and server errors must remain failures.
- Responsible roles: Implementer preserves HTTP failure semantics; Test Engineer tests 404 separately from non-404 failures and asserts forbidden destructive side effects.
- Verification: direct adapter tests and ambiguous receivable regression tests cover these cases.

## Governance context corrected before architecture approval

- AI proposal: Begin architecture analysis immediately.
- Engineering evaluation: The repository did not yet contain the governance harness needed to make architecture work explicit and reviewable.
- Evidence/problem: Architecture work had started before the harness existed, creating a risk that draft conclusions would be treated as approved.
- Decision: Establish the repository harness first and require fresh Architect review before architecture approval.
- Verification: The harness and workflow were created; existing architecture documents remain explicitly unapproved drafts.

## Discount interpretation corrected by human review

- AI proposal: Treat the README example subtotal 250, discount 10, total 240 as inconsistent with the 4% fee rule and interpret discount as a percentage.
- Evidence-based human correction: 4% of 250 is exactly 10; the README is internally consistent.
- Final engineering decision: discount is the monetary fee amount. Fixture values "4" and "2" are percentage-like and are recorded as a fixture discrepancy, not authority.

## Numerator pair allocation corrected by independent review

AI architecture initially proposed assigning N and N+1 after CAS N→N+2.
Independent review compared that decision with the supplied Numerator initial state and fixture and found that N is already allocated.
Decision corrected to N+1 and N+2 before implementation.

## Slice 1B creation semantics corrected by independent review

- AI implementation exposed the final POST endpoint during Slice 1B.
- It returned 201 before Numerator/persistence guarantees existed.
- Independent Test Engineer review detected the semantic mismatch before commit.
- Architecture ownership was restored before remediation: Slice 1B now owns schemas and deterministic domain behavior only; the complete public POST endpoint belongs to the persistence/orchestration slice.
- Logging had also been disabled to avoid sensitive-data exposure, revealing the need to distinguish security from observability; structured logging remains enabled with payment data excluded.

## First implementation slice scope corrected by independent review

Implementation instructions decomposed the first planned slice more narrowly than the approved plan described.
Independent Test Engineer review detected the mismatch.
The Architect approved a smaller sequential decomposition: Slice 1A for application and verification foundation, followed by Slice 1B for the public transaction contract and deterministic domain behavior.

## Generated artifact tracking corrected by independent review

- Initial verification excluded `dist/` from Prettier, but did not exclude it from Git.
- Independent Test Engineer review noticed that build output could remain visible as untracked content and be accidentally committed.
- Decision: ignore the project-specific build output in the repository and add a concise generated-artifact policy requiring systematic checks in future slices.
- Verification: build output is ignored by Git, and verification is run before and after a build.

## Slice 1B monetary and card-data contract corrected before remediation

- AI implementation instructions required zero monetary values to be rejected.
- Independent Test Engineer review compared that behavior with the approved
  contract and detected the mismatch before the Slice 1B commit.
- Architecture re-established the authoritative requirement: monetary input is
  non-negative (`value >= 0`), not positive (`value > 0`). Code remediation is
  owned by the Implementer.
- Slice 1B also explicitly owns deterministic card transformation: full PAN is
  reduced to its last four digits, and CVV is excluded from response and logs.

## Harness file ownership correction

- An untracked `.agents/rules/ponytail.md` introduced overlapping YAGNI and
  simplicity guidance without a canonical workflow reference.
- Architecture removed the standalone file to preserve a single source of
  truth. New harness guidance must be placed in an existing canonical artifact
  with explicit ownership/reference, rather than added as an incidental rules
  file.
