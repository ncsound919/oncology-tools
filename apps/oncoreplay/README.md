# oncoreplay

Version-pinned, policy-as-code replay of somatic oncology interpretation.
**Research use only. Synthetic example data. Not a medical device.**

Question it answers: *this interpretation changed. Was it the knowledge or the rules?*

## Quickstart (zero dependencies, Python >= 3.10)

```bash
cd "Oncology Ecosystem/apps/oncoreplay"
python -m pytest -q

PYTHONPATH=src python -m oncoreplay.cli decide --case examples/case-001.json \
  --snapshot examples/snapshot_2024.json --policy examples/policy_v1.json \
  --records run.records.jsonl
PYTHONPATH=src python -m oncoreplay.cli attribute --case examples/case-001.json \
  --snapshot-old examples/snapshot_2024.json --snapshot-new examples/snapshot_2026.json \
  --policy-old examples/policy_v1.json --policy-new examples/policy_v2.json
PYTHONPATH=src python -m oncoreplay.cli drift --cases examples/cases.json \
  --snapshot-old examples/snapshot_2024.json --snapshot-new examples/snapshot_2026.json \
  --policy examples/policy_v1.json
PYTHONPATH=src python -m oncoreplay.cli verify-records --records run.records.jsonl
PYTHONPATH=src python -m oncoreplay.cli check-claims --claims examples/claims.json \
  --records run.records.jsonl    # exit 0 only if every claim is supported
```

## Two things to read before trusting it

1. **The example tier policy is illustrative, not validated.** It is installed in
   `evidence_ledger.csv` as `ONCORE_TIER_POLICY` with status `A` (assumed).
   `evidence_gate.use()` refuses it; only `use_assumed()` may reference it, inside
   a labelled sensitivity analysis. It needs a named clinical reviewer.
2. **`verify-records` proves content integrity only.** There is deliberately no
   hash chain in this repo — the only one is
   `evidence/evidence_gate.py`, and a second chain is a fork. Reordering or
   deleting a record is therefore *not* detected here. The command says so in its
   own output.

## What this project is for

Everything else a provenance layer needs already exists in this repository, and
this package does not reimplement it. The one thing that does not exist anywhere
in this repo or in the literature searched is the **2×2 counterfactual
attribution** — knowledge vs policy vs interaction vs overdetermined vs
offsetting — which is what `replay.attribute()` does.

`docs/TERRITORY.md` is the prior-art map, including the corrected section on the
executable/computer-interpretable-guidelines field (Arden Syntax, GLARE,
statecharts, GLEAN, CPGPrompt) that the first draft of this document omitted.

`docs/ARCHITECTURE.md` records what is deliberately reused rather than rebuilt, and
the four audited engine defects. All four are now fixed, with a falsifiable
assertion each in `tests/test_seeded_faults.py`; measured gate recall is 4/4. That
number is only trustworthy because the harness that produced it was itself
repaired — the first published figure was 0/4, two of which were the measurement's
own `AttributeError`, not engine behaviour. See the ARCHITECTURE section.

Bump note: the four fixes changed `aggregation` into policy data, so every
`decision_hash` computed by `0.1.0` differs from `0.2.0` for the same inputs.
`engine_version` is inside the hashed payload, which is what makes the two
distinguishable in a record store.