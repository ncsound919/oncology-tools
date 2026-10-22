# OncoKB annotation-attention study

Research tooling. Not a diagnostic, not a treatment recommendation, not validated
for patient use.

**Question.** Does surplus literature attention to a gene predict OncoKB
annotation of that gene in a cancer type — after adjusting for non-literature
biology and forcing attention to predate annotation by 12 months?

## Layout

```
apps/oncokb-attention/
├─ README.md                 this file
├─ config.yaml               frozen design (snapshot_date, t0, lag, measures, seed)
├─ requirements.txt          frozen dependency floor
├─ Snakefile                 build_pairs → build_attention → build_biology → validate → expected_attention
├─ workflow/
│  ├─ schemas.py             pandera contracts for the three interim tables
│  ├─ checks.py              leakage guards (lag / t0 / snapshot freeze / level eligibility)
│  ├─ validate.py            schema + guard runner (Snakemake script AND standalone CLI)
│  ├─ expected_attention.py  cross-fitted E[log-pubs | biology]; residual = surplus
│  ├─ oncokb_client.py       HTTP + frozen-cache layer (stdlib only)
│  ├─ io_util.py             parquet I/O with provenance attrs
│  ├─ build_gene_universe.py public phase: genes × HGNC (no token; LIVE 2026-10-10)
│  ├─ build_pairs.py         gated phase: levels + dating (needs ONCOKB_TOKEN)
│  └─ build_attention.py / build_biology.py  TO_IMPLEMENT; schemas are the contract
├─ tests/                    unittest suites + recorded-live fixtures (27 tests)
└─ prereg/                   frozen prereg.json + hash-chained snapshots
```

## Design (frozen 2026-10-10, see prereg/prereg.json)

- **Hurdle model** ("annotated at all"): attention vintage ≤ `t0` (2020-01-01),
  hurdle-prefixed measures (`t0_*`) only.
- **Level models**: sensitivity (`sens_level`) and resistance (`res_level`) are
  **separate axes, never pooled** — separate models, separate reports.
- **Predictor of interest**: `surplus_attention` = observed log-pubs minus
  cross-fitted expected log-pubs from non-literature biology (LightGBM, 5-fold).
- **Negative control**: surplus attention must NOT predict `depmap_dependency`.
  If it does, the surplus carries generic essentiality signal.
- **Spec curve**: 4 attention measures × pharos_tdl in/out. Report all cells.

## Leakage discipline (enforced, not aspirational)

`workflow/checks.py::assert_no_leakage` runs in the Snakefile `validate` rule and
writes a guard file; `expected_attention` cannot run before the guard passes:

1. Pair-level attention: `asof_date <= annotation_date − 12 months`.
2. Hurdle attention: `asof_date <= t0`.
3. Everything: `asof_date <= snapshot_date` (download freeze 2026-10-09).
4. Gene-level rows (`oncotree_code` null) are exempt from (1) by construction —
   they cannot join to pair annotation dates — but still obey (2) and (3).
5. Predictor vintage: gene-level counts entering the expectation model are
   capped at `attention_vintage_cap` (= t0). Post-period counts fail loudly.
6. Level models (sens/res) must subset to pairs annotated at/after t0 + lag
   (`level_model_eligible()`; counts reported in the guard file) — for older
   annotations a pre-t0 predictor would postdate annotation-minus-lag.

## What changed vs the source fragments (Downloads/*.py, 2026-10-09)

Source files were four loose fragments with no pipeline, no tests, no prereg.
Integrated as-is they had five live issues; all are fixed here:

| # | Issue | Fix |
|---|---|---|
| 1 | `attention.measure` unconstrained | allowlist from config (+ `t0_` variants), `set_measure_allowlist()` |
| 2 | Hurdle check vacuously passed with no `t0_` rows (`.all()` on empty) | `require_hurdle` flag; config `require_hurdle_measures` |
| 3 | Download freeze never checked | `snapshot_date` assertion in `assert_no_leakage` |
| 4 | Primary measure hardcoded; `drop_duplicates("gene_id")` kept arbitrary oncotree rows | config `primary_measure`; gene-level filter before join; observed value kept in output |
| 5 | `annotated ⟺ dated+labelled` not enforced anywhere | `validate_pairs_consistency()` in the `validate` rule + tests |

Open (not fixed, flagged in code): `ONCOGENICITY` terms partly verified vs
OncoKB (audit 2026-10-10 spot-check of live oncokb.org pages confirmed 4/5;
"Predicted Oncogenic" unobserved, "Resistance"/"Unknown" possibly missing —
see `schemas.py:20-31`); `build_*.py` adapters unimplemented; SHAP summary
pending `results/figures/`; `annotation_date` provenance is the hardest data
need (see `build_pairs.py` contract).

## Audit round 2 (2026-10-10, product-audit + code-review skills)

| # | Finding (severity) | Fix |
|---|---|---|
| 6 | `set_measure_allowlist` rebuilt the schema into a discarded local (WARNING, latent) | rebinds module-global `attention`; regression test `test_allowlist_rebuild_replaces_global` |
| 7 | Trailing commas after `script:` paths = Snakefile SyntaxError (CRITICAL, pipeline would not parse) | commas removed; `snakemake -n` dry-run verified, 6-job DAG |
| 8 | `validate` as inline `run:` block: cwd-fragile, untestable (WARNING) | extracted to `workflow/validate.py`, Snakemake-`script:` + standalone CLI |
| 9 | Expectation model had no predictor-vintage cap (WARNING, second-order leakage) | `attention_vintage_cap` (= t0); `level_model_eligible()` for sens/res subsetting |
| 10 | Study assumed per-pair `annotation_date`s exist; OncoKB publishes no public per-pair timestamps (Lens 2 BLOCKER for real-data run) | `build_pairs.py` contract requires stated provenance per date; unresolved until builders land |

## Run

```powershell
cd apps\oncokb-attention
pip install -r requirements.txt
snakemake -n --cores 1        # dry-run: parses + plans the 6-job DAG (verified 2026-10-10)
snakemake --cores 4           # full run — needs build_*.py adapters first
python -m unittest discover -s tests -v   # 27/27 green without Snakemake or data
```

Evidence hygiene (ecosystem `evidence/evidence_gate.py` — the newer copy with
assumed-status support; do NOT copy the old Downloads one over it):

```powershell
python ..\..\evidence\evidence_gate.py check --ledger ..\..\evidence\evidence_ledger.csv --scripts workflow
python ..\..\evidence\evidence_gate.py prereg-verify --prereg prereg\prereg.json --snapshots prereg\snapshots
```

## Builder status (2026-10-10 — the "do that" build-out)

`build_pairs.py` is implemented, not a stub. Two phases:

- **Public phase (LIVE, verified):** `build_gene_universe.py` pulled OncoKB
  cancerGeneList (1247 genes) + OncoTree (897 types, `oncotree_2025_10_03`) +
  MyGene HGNC mapping → `data/interim/gene_universe.parquet`: **1247/1247
  HGNC-mapped, 1033 OncoKB-annotated**, OncoKB data v7.6 (09/30/2026 — 9 days
  before the snapshot freeze). Raw responses frozen under `data/raw/oncokb/`
  with provenance sidecars; `versions.jsonl` started (first-appearance ledger).
- **Gated phase (real code, token-needed):** per-gene therapeutic implications
  (`/api/v1/genes/{symbol}` etc.) require `ONCOKB_TOKEN` — every other
  endpoint returns 401 without one (measured), the vault holds no token
  (165 keys checked), and there is intentionally no scraping/proxy fallback.
  Without the token the rule fails loudly after the universe step. With a
  token, aggregation rules are frozen in code (sensitivity 1>2>3A>3B>4,
  R1>R2, oncogenicity-behind-top-level); unknown levels/cancers are counted,
  never dropped.
- **Dates:** first-appearance across versioned pulls. The inaugural pull
  archives release N; pairs are datable only from the second release onward.
  Until then the builder REFUSES to write `pairs.parquet` (a data-version-date
  imputation would be anti-conservative and silently weaken the leakage guard).
  Verified live: refusal raised, no file written.
- **Controls (pre-data rule, needs prereg amendment to change):**
  `control_cancers: annotated_cancers` — unannotated pairs = HGNC genes ×
  cancers carrying any annotated pair. The prereg pins the unit of analysis
  but not the negative set; this choice is explicit in config, not buried.
- `annotation_date_source` column added to the pairs schema (per-row
  provenance; NULL = unprovenanced, never imputed).

Provenance decision record: public/token-gated endpoint inventory, vault
search, and rejected options (imputed dates, HTML scraping, portal-proxy use,
CIViC substitution, silent shape-guessing) are in the build lesson
(`Coding lessons/2026-10-10-oncokb-attention-build-pairs.md`).

Environment note: `snakemake --force` cannot shell out on THIS machine
(Snakemake 9.27 quotes `C:/Program Files/...python.exe` unquoted → `'C:/Program'
is not recognized`). DAG/dry-run verified; all three `script:` branches
additionally executed via faithful injection emulation
(`ALL_SNAKEMAKE_BRANCHES_OK`). Real fix: a space-free Python path.

## Provenance

- Source fragments: `Downloads/{config.yaml,schemas.py,checks.py,expected_attention.py}` (2026-10-09).
- `evidence_gate.py` / ledger / prereg template already live in `evidence/` and
  are referenced, not duplicated. The ecosystem `evidence_gate.py` is newer
  (assumed-`A` status + `use_assumed()`) than the Downloads copy — keep it.
