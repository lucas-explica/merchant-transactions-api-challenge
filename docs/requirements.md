# Requirements

## Authority

README.md and README-pt-br.md are authoritative and agree. README-es-ar.md is a translation. config/db.json is fixture evidence, not a contract. Existing documents were drafts and were freshly re-reviewed.

## Explicit requirements

| ID | Requirement | Evidence |
|---|---|---|
| FUNC-01 | Provide an orchestration API that creates a transaction and its merchant receivable. | README task |
| FUNC-02 | Accept only debit_card and credit_card. | README table |
| DATA-01 | Persist transaction value as a decimal string with the described transaction/card fields. | README example |
| DATA-02 | Persist and return only the last four card-number digits. | README fields |
| DATA-03 | Preserve CVV in the supplied challenge persistence shape, but never return or log it. | README/db fixture; security decision |
| ID-01 | Generate both IDs through Numerator and convert them to json-server string IDs; never use UUIDs. | README Numerator section |
| BUS-01 | Debit: status paid, fee 2%, settlement D+0. | README rules |
| BUS-02 | Credit: status waiting_funds, fee 4%, settlement D+30. | README rules |
| OPS-01 | Use the provided json-server and Numerator without changing either. | README resources |

## Derived engineering requirements

- A successful response has exactly one newly persisted transaction and one receivable linked by transaction_id.
- For a reservation from previous Numerator value N to N+2, the caller exclusively claims N+1 and N+2; newly allocated pairs do not overlap. Existing fixture IDs may repeat across collections.
- Financial arithmetic is exact; no JavaScript floating-point arithmetic is used.
- Failed orchestration must not knowingly return success with an orphan transaction.
- Errors expose stable application classes, not downstream response bodies.

## Contract decisions

- POST /transactions returns HTTP 201 and { "transaction": {...}, "receivable": {...} }.
- The request accepts the README transaction fields except id; the full PAN is accepted only to derive the last four digits. Persistence and response contain only those four digits.
- Use integer cents (BigInt) internally. Accept non-negative decimal strings with at most two fractional digits; serialize money with exactly two digits. Fee is percentage times subtotal, rounded half-up to cents; total = subtotal - fee.
- discount is the monetary fee amount, not the rate. For 250 at 4%, it is 10.00 and total is 240.00. Fixture values "4" and "2" are percentage-like and inconsistent with the README example; the README wins.
- Because the supplied receivable shape has only create_date, do not invent payment_date. Store the settlement date in create_date: D+0 for debit and D+30 for credit. This is the smallest representation compatible with the date rule.
- CVV may be sent to the challenge persistence endpoint because the supplied representation includes it, but is never returned, logged, or retained by orchestration beyond the downstream write. Production systems must not store CVV.
- Validate required shape, enum, decimal syntax, card digits, MM/YY, and three-digit CVV. Luhn and expiry-date business checks are out of scope.

## Ambiguities and traceability

No material product ambiguity remains for implementation. A reviewer requiring a separately named settlement field must reopen the Architecture Decision Gate. Requirements map to boundary/unit tests, financial tests, CAS tests, orchestration failure tests, and a real concurrent integration test named in the plan.
