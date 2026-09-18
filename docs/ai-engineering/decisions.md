# Engineering Decisions

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

## First implementation slice scope corrected by independent review

Implementation instructions decomposed the first planned slice more narrowly than the approved plan described.
Independent Test Engineer review detected the mismatch.
The Architect approved a smaller sequential decomposition: Slice 1A for application and verification foundation, followed by Slice 1B for the public transaction contract and deterministic domain behavior.

## Generated artifact tracking corrected by independent review

- Initial verification excluded `dist/` from Prettier, but did not exclude it from Git.
- Independent Test Engineer review noticed that build output could remain visible as untracked content and be accidentally committed.
- Decision: ignore the project-specific build output in the repository and add a concise generated-artifact policy requiring systematic checks in future slices.
- Verification: build output is ignored by Git, and verification is run before and after a build.
