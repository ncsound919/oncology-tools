# Territory map: what oncoreplay is, and what it deliberately is not

Status: result of a limited search pass in Oct 2026, re-run 2026-10-13 (OpenAlex,
`title.search` verified to discriminate — a negative-control query returned 0
results, not a saturated list). **Not an exhaustive landscape review.** Re-run
before making any "first" or "only" claim publicly.

## The gap oncoreplay targets

Somatic therapeutic evidence changes over time (guideline updates, approvals, new
trials). A past interpretation silently goes stale, and when a re-run gives a
different answer nobody can say whether *knowledge changed* or *interpretation
rules changed*.

oncoreplay provides, as an open, offline, dependency-free core:

1. Content-addressed evidence snapshots (identity = hash of content).
2. Interpretation policy as versioned data, not hard-coded logic.
3. A pure deterministic evaluator with a per-variant rule trace.
4. A 2x2 counterfactual replay that attributes every changed answer to
   knowledge, policy, interaction, overdetermination, or offsetting changes.
5. A fail-closed claim verifier (so an LLM agent's or a human's statement about a
   case can be checked against a recorded decision).

**What is *not* ours, and is deliberately not rebuilt here:** the record store,
the hash chain, the claim-lint pattern, the timestamp authority and the artefact
packaging. All of those already exist in the ecosystem and are consumed, not
forked — see "Adjacent work in *this* repo" below.

## Adjacent work in *this* repo — reuse, do not fork

Prior art in the operator's own tree, which is the first place a duplicate gets
written by accident:

| Component | Where it lives | Status |
|---|---|---|
| Evidence status model `P`/`S`/`U`/`A` | `evidence/evidence_gate.py:42-48` | In use by `apps/oncokb-attention`. The illustrative tier policy is registered there as status `A` |
| Hash chain (the only chained impl) | `evidence_gate.py:194-240` | Adopted; see `records.py` for why this repo does not add a second |
| Fail-closed claim verification | `apps/research-orchestrator/src/claims.ts` | 537 lines + tests; research-scoped |
| Tamper-evident (not -proof) language | `evidence_gate.py:17-19` | Already stated verbatim by the repo |

## Adjacent work elsewhere (and why this is not a duplicate)

| Adjacent work | What it does | What it does not do |
|---|---|---|
| Genome Alert! (ClinVar follow-up) | Automated reinterpretation of variant pathogenicity via ClinVar version comparison | Germline-style pathogenicity, single source; no somatic therapeutic levels, no policy versioning, no attribution |
| GLIMS (open-source genomic LIMS) | Keeps variant annotations current and reclassifies patients' variants | A laboratory information system; no policy-as-code, no cause attribution, no verifier |
| CanVIG-UK reinterpretation framework | Clinical process guidance for reclassification | A framework document, not software |
| Tempus "Refresh" reports (abstract, ASCO 2024) | Re-annotates prior reports against current therapies and trials | Proprietary service; not an open, pinned, replayable engine |
| MSK OncoKB two-version analysis (47,271 tumors) | Showed Level 1/2 actionability rising from 8.9% to 31.6% (2017 to 2022) | A one-off research analysis, not a reusable tool |
| PORI / GraphKB | Open-source somatic reporting with a graph knowledge base and curation | Reporting-centric; no snapshot pinning or knowledge-vs-policy attribution |
| CancerVar | Rule-based interpretation with user-adjustable weights | No frozen snapshots, no version-diff attribution |
| MTB Report (Göttingen) | Browse actionable somatic variants against CIViC/OncoKB | Stateless lookup |

### The prior-art omission corrected (2026-10-13)

The previous version of this document did not mention the **executable /
computer-interpretable guidelines** field. That is a decade of prior work with
established formalisms, and any clinical-informatics reviewer will ask about it.
Cited with grades:

| Work | Year | Grade | What it does not do |
|---|---|---|---|
| Arden Syntax — executable medical guidelines, Artif Intell Med, doi:10.1016/j.artmed.2016.08.003 | 2016 | primary | No version comparison of the knowledge base; no attribution of a changed answer |
| Transforming medical best practice guidelines to executable and verifiable statechart models | 2016 | primary | Verifies guideline *logic*, not evidence drift |
| META-GLARE meta-engine for executing CIGs, doi:10.1007/978-3-319-26585-8_3 | 2015 | primary | Execution engine only; no snapshot identity or cause decomposition |
| GLEAN — clinical guidelines as executable FHIR-compliant workflows, doi:10.1007/978-3-031-09342-5_43 | 2022 | primary | FHIR workflow, no temporal attribution |
| CPGPrompt — translating clinical guidelines into LLM-executable decision support, JAMIA, doi:10.1093/jamia/ocag026 | 2026 | primary | The opposite design stance: *probabilistic* interpretation by an LLM |

**Differentiation:** that field formalizes guideline *logic*. None of it
compares two states of the knowledge base over time, and none decomposes a
changed conclusion into knowledge vs rules. version attribution is the axis
oncoreplay contributes, and it is the axis none of them occupy.

**Counter-position to note publicly:** CPGPrompt (2026) shows the frontier is
moving toward LLM-*executable* guidelines. oncoreplay deliberately runs the other
way — interpretation stays deterministic and hash-pinned, and any LLM in the loop
is permitted to narrate a recorded decision and nothing else. That contrast is
the position, and it should be stated as deliberate rather than as an omission.

### Where the literature *supports* us (graded)

- The drift premise is established and quantified: "Quantifying the Expanding
  Landscape of Clinical Actionability for Patients with Cancer", Cancer Discovery
  2023, 401 citations, doi:10.1158/2159-8290.cd-23-0467 — **primary**.
- Current normative reference: ASCO Provisional Clinical Opinion on somatic
  genomic testing, JCO 2022, doi:10.1200/jco.21.02767 — **primary**. Policy
  anchors must name it and AMP/ASCO/CAP, not AMP/ASCO/CAP alone.
- Governance expectations for AI-enabled CDS: JAMIA 2024,
  doi:10.1093/jamia/ocae209 — **primary**. Build to these from the start.
- Reproducibility as a field-level concern: AAAI 2025, doi:10.1002/aaai.70002 —
  **primary**.

### Where the search ran out (recorded as an absence)

- **No prior art found** doing version comparison + cause decomposition + claim
  verification together. **Grade: none** — broad OpenAlex full-text searches
  degraded into generic XAI/graph surveys and were re-run. Absence here is
  unproven, *not* proof of novelty. Re-run with a systematic pass before any
  novelty claim is made publicly.
- Europe PMC keyword searches drifted topically and returned readers unrelated
  results; OpenAlex `title.search` was the only field-restricted query that
  discriminated. Any prior-art claim resting on the drifted queries is unusable.

## Explicit non-goals (reuse, do not rebuild)

Aligners, variant callers, consequence annotation (VEP/SnpEff), curated databases
(ClinVar, CIViC, OncoKB, gnomAD), workflow engines (Nextflow/Snakemake). oncoreplay
consumes their outputs through snapshot adapters — and where the ecosystem already
has them (`apps/oncokb-attention` archives OncoKB pulls;
`oncono-agent-main/server/genomics/civic.ts` and `oncotree.ts` are live ungated
clients), it consumes those instead of writing new ones.

## Honest limits

- **Ships with synthetic data only.** The example tier policy is `ILLUSTRATIVE
  and NOT a validated implementation` of AMP/ASCO/CAP or ASCO PCO 2022. It is
  registered in `evidence_ledger.csv` as `ONCORE_TIER_POLICY` with status `A`
  (assumed), so `evidence_gate.use()` refuses it and only `use_assumed()` can
  reach it inside a labelled sensitivity analysis. It needs a named clinical
  reviewer before any use that is not research.
- **Research use only.** Not validated for clinical decision-making.
- **The record store is not a chain.** `records.py` detects content tampering
  but not reordering or deletion; `verify-records` says so in its own output.
  Order integrity requires the ecosystem chain and an externally published hash.
- Snapshot adapters for real sources (CIViC/OncoKB licensing, token gating) are
  not built. **No `ONCOKB_TOKEN` exists in the vault** (checked directly,
  ~130 keys), so OncoKB's therapeutic-implication endpoints return 401 and CIViC
  is the only ungated somatic source today.
- OncoKB pairs are datable only from the second archived release onward, so real
  version diffing cannot run until a second pull exists.
