# Oncology tool sources

Source for the instruments listed in the Concordance marketplace tool roster:
eight oncology research tools, each in its own folder under `apps/`.

> **Research use only.** These are research instruments, not medical devices.
> None of them diagnoses, treats, or recommends treatment for a patient.

| Tool | Folder | What it is | Runtime |
|---|---|---|---|
| AncestralMT | [`apps/AncestralMT`](apps/AncestralMT) | Ancestry-aware cancer mutation workbench: diversity scores, frequency-gap analysis, biobank hand-off | Next.js · Prisma · SQLite |
| OncoSIM | [`apps/Onconosim`](apps/Onconosim) | Cancer systems biology simulator built on a four-leg cure framework with kill criteria | Next.js · Tailwind · Prisma |
| Prometheus | [`apps/prometheus`](apps/prometheus) | Eight-layer autonomous discovery engine with a governance queue | Next.js · Prisma · SQLite |
| Multi-Agent Debate Arena | [`apps/Discourse Tool`](apps/Discourse%20Tool) | Adversarial research personas arguing over pinned evidence tiers, with a judge panel | Vite · React · Express |
| Onco Agent | [`apps/oncono-agent-main`](apps/oncono-agent-main) | Molecular tumour-board copilot grounded in ClinVar, ClinicalTrials.gov and PubMed | Vite · React · Express |
| oncoreplay | [`apps/oncoreplay`](apps/oncoreplay) | Version-pinned replay that attributes a changed interpretation to knowledge or policy | Python 3.10+ |
| OncoKB Attention | [`apps/oncokb-attention`](apps/oncokb-attention) | Literature-attention study pipeline with leakage guards | Python · Snakemake |
| Research Orchestrator | [`apps/research-orchestrator`](apps/research-orchestrator) | Fleet runtime: durable jobs, cadence, claim ledger and provenance | Express · TypeScript |

## Download

- Whole repository: **Code → Download ZIP**, or
  `https://github.com/ncsound919/oncology-tools/archive/refs/heads/main.zip`
- One tool: open its folder and download the repository, or use the per-tool ZIP
  attached to the [latest release](../../releases/latest).

## Running a tool

Each folder carries its own package manifest. The browser tools use
`npm install && npm run dev` (oncoreplay is `python -m pytest -q` with
`PYTHONPATH=src`). Copy any `.env.example` to `.env.local` and fill in your own
credentials — no keys are shipped here.

SQLite demo databases are included where the tool seeds one; they contain
synthetic example data only.

## Licences

Every folder keeps its own `LICENSE` and `NOTICE`. Read them before
redistributing a tool or its third-party components.

## Related

- `ncsound919/Concordance` — the Android companion app.
- `ncsound919/Referee` — the deterministic audit core.
