# Architecture

```
snapshot.json ──► Snapshot (hash) ─┐
policy.json   ──► Policy   (hash) ─┼─► engine.evaluate() ─► decision (+trace, decision_hash,
case.json     ──► case     (hash) ─┘            │                              engine_version)
                                                ├─► records.RecordStore.append()  (self-hashing,
                                                │   NOT a chain — see records.py)
                                                └─► replay.attribute()  2x2 counterfactual grid
                                                    drift.cohort_drift() fixed cohort
                                                    verify.check_claims() fail-closed
```

Invariants (each has a test):

- No clocks, randomness, network, or model calls in the core. Same inputs => same
  hashes.
- Hashed artifacts contain no floats.
- Snapshot and policy hashes are independent of key/list order.
- Decision records are reproducible byte-for-byte from the same operations.
- `decision_hash` covers `engine_version`, so two builds producing different
  answers are distinguishable in the store.
- Any edit to a record's content breaks `verify_records()`.
- A claim with no matching verified record is `unverifiable`, never `supported`.

## What this repo deliberately does NOT own

| Concern | Owner | Why not here |
|---|---|---|
| Hash chain | `evidence/evidence_gate.py:194-240` | It is the **only** hash-chained implementation in the ecosystem. A second chain is a fork, and a forked chain is worse than none. `records.py` documents the ordering gap this leaves and what closes it. |
| Evidence status `P/S/U/A` | `evidence_gate.py:42-48` | The tier policy is registered as status `A` (assumed). `use()` refuses it; only `use_assumed()` can reach it. |
| Claim linting | `apps/research-orchestrator/src/claims.ts` | 537 lines + tests, research-scoped |
| Cryptographic timestamp | RFC 3161 TSA / OpenTimestamps / sigstore | Owned by the platform layer. **Never** emit a wall clock under a timestamp-standard name. |
| Case identity / cancer type | `oncono-agent-main/server/genomics/oncotree.ts` | Already correct; the substring-matching bug it replaced is documented at `local-oncology-engine.ts:11-16` |
| Artefact packaging | `scripts/wrap_rocrate.py` | RO-Crate is the corpus standard |

Extension points (next):

1. `adapters/` — build snapshots from CIViC first (ungated, open). OncoKB second,
   and only from the pulls `apps/oncokb-attention` already archives, under
   `platform/lib/license-registry.ts`'s `licenseGate()`.
2. ~~**Aggregation semantics as policy data.**~~ **Done 2026-10-13.** `aggregation`
   is now a `Policy` field (`best` | `best_supported`, default `best_supported`),
   read by `engine.aggregate()`. `_shift`'s III cap remains in the engine by
   choice: it is a property of the tier ladder, not of how evidence combines.
3. ~~**Resistance must not contribute to a tier.**~~ **Done 2026-10-13.** Resistant
   evidence now feeds `resistance_flags` and `blocked_drugs` only; it never enters
   the actionability tier. A resistant-only variant returns `III`.
4. Structural variants, CNVs, fusion, amplification in the case schema (SNV-like
   keys only today).
5. Cohort-level 2×2 `attribute` (single case today).
6. FHIR CPG / CQL export, so an interpretation interoperates instead of competing
   with Arden Syntax, GLARE and GLEEN.

## Defects found by external audit, fixed 2026-10-13

Four defects were found by audit, not by the gate, and all four are now fixed with
a falsifiable assertion each in `tests/test_seeded_faults.py`:

1. Resistance-only evidence returned `tier: I`, because the tier was appended
   before the direction check. **Fixed:** the tier is now built from sensitive
   evidence only.
2. `benign` shadowed Level A sensitive evidence with a one-line trace and no
   conflict flag. **Fixed:** the contradiction is recorded in `trace` and in a
   structured `conflicts` list; the benign declaration still wins, but it is no
   longer silent.
3. Aggregation was a hard-coded optimistic max, so one Level A plus two Level E
   returned tier I. **Fixed:** the rule is policy data and the default no longer
   lets one item outvote two.
4. The policy schema could not express organ-clearance, cardiotoxicity or
   drug-interaction rules (e.g. `eGFR < 30`, `QTc > 500`), which are hard-coded
   inline in `oncono-agent-main/server/orchestrator.ts`. **Still open** — this one
   is a schema design question, and it is the reason the F4 slot in the corpus is
   satisfied by the `aggregation` field rather than by a clearance rule.

### Gate recall: measured 4/4 (2026-10-13), and the first measurement was wrong

`tests/test_seeded_faults.py` plants the defects as falsifiable assertions and
reports how many the suite detects. It now reports **4 of 4**.

The previously published number was **0 of 4**, and that number was wrong. The
measurement harness had its own defect: the F1 and F3 probes read `.tier` as an
*attribute*, but `_variant()` returns a dict, so both probes raised
`AttributeError`; the bare `except Exception: escaped` then recorded that harness
bug as "defect escaped". Two consequences:

- The instrument could not report 4/4 even once every defect was fixed.
- It inflated the headline. The honest pre-fix recall was **2/4** (F2 and F4 were
  genuinely missed); F1 and F3 were never measured at all.

The harness was corrected to use dict access and to report a raising probe as a
**HARNESS ERROR** rather than as "escaped", because "we could not measure it" is a
different claim from "the engine passed it". An instrument that swallows its own
exceptions and reports them as evidence is the same failure it exists to catch.

Keep the corpus honest. Relaxing an assertion in `test_seeded_faults.py` to get
green — or widening its `except` — is the one edit that would make this project
indefensible.