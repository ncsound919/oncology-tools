# Task 2-b — Genomic Variant Explorer (subagent)

## What I was asked to do
Build a client component at `/src/components/sections/genomic-explorer.tsx` that fetches from `/api/genomic` (GET) and renders an interactive genomic-variant explorer with a 2-column layout (variant table + stacked VAF chart on the left, HLA-binding prediction panel on the right), with loading skeletons, error fallback to static `VARIANTS` / `HLA_ALLELES`, TanStack Query for fetching, and proper accessibility (labeled controls, thead/tbody, color paired with text).

## Work Log
- Read `/home/z/my-project/worklog.md` and confirmed backend (`/api/genomic`) and static data (`VARIANTS`, `HLA_ALLELES`, `Variant`, `HlaAllele` types) exist in `src/lib/data.ts`.
- Verified available shadcn/ui primitives (Select, Skeleton, Badge, Card, Table, ToggleGroup) and recharts exports.
- Wrote `/src/components/sections/genomic-explorer.tsx` as a `'use client'` component exporting `GenomicExplorer`, which wraps `GenomicExplorerInner` in a local `QueryClientProvider` (via `useState(() => new QueryClient())`) because the app root does not yet have a provider.
- Implemented:
  - Section header with `Dna` icon, mono label `GENOMIC SEQUENCING · VARIANT CALLS` (teal) and sans heading `Cohort variant landscape`.
  - Cohort + Gene `Select` filters (All / PDAC / NSCLC / CRC / HCC / MEL / BRCA; All / KRAS / TP53 / EGFR / BRAF / PIK3CA / STK11). Each has a `<label htmlFor=…>` and `aria-label`.
  - Variant table with `<thead>`/`<tbody>`, scrollable (`max-h-96 overflow-y-auto onc-scroll`). Columns: Gene | Protein change (+ hgvs) | Cohort | VAF (%) with mini horizontal bar | HLA binding (nM, color-coded + text) | Tier badge.
  - VAF mini-bar uses `width = alleleFreq * 100%`, colored by gene.
  - HLA binding color tiers: ≤100 green / 100–300 teal / 300–500 amber / >500 coral / null dim `—`. Color is never the only signal — text always present (e.g. `86 strong`, `540 poor`).
  - Tier badge: gradient coral → amber → violet → teal → green by tier level.
  - HLA-binding color legend below the table.
  - Stacked `BarChart` (recharts) showing VAF distribution by cohort, one stacked bar per cohort, segments colored by gene using the exact mapping (KRAS=teal, TP53=coral, EGFR=violet, BRAF=amber, PIK3CA=#6EE7B7, STK11=#9F7AEA). Legend below.
  - Right column: `Microscope` icon, mono label `HLA-BINDING PREDICTION`, sans heading `NetMHCpan-class stratification`, the required explanation paragraph (dim).
  - Horizontal `BarChart` (`layout="vertical"`) with HLA allele on Y axis, bestAffinity-derived `strength = 800 - affinity` for visual length (so strong binders = longer bars). Per-bar `Cell` color via `hlaBarColor`. `LabelList` shows actual `nM` text on the right of each bar (color always paired with text/number).
  - "Population coverage" stat card — sum of `freq` for alleles with `bestAffinity ≤ 500nM`, big number with `%`, labeled `Eligible population (predicted sub-500nM binder)`.
  - Loading: 3-row `SkeletonTable` while fetching.
  - Error / empty: dim coral-bordered banner `Sequencing data unavailable — showing fallback.` + uses static `VARIANTS` / `HLA_ALLELES` from `@/lib/data` as fallback data source.
- Used only relative fetch (`/api/genomic`), no port literals, no new routes, no test code, did not modify `src/app/page.tsx`.
- Ran `bun run lint` — clean (no errors in my file or anywhere else in the project).

## Stage Summary
- File produced: `/home/z/my-project/src/components/sections/genomic-explorer.tsx` (default export `GenomicExplorer`, fully self-contained, wraps itself in a local `QueryClientProvider`).
- Public surface for orchestrator (Task 3): `import GenomicExplorer from "@/components/sections/genomic-explorer"`. The component renders its own `onc-dark` section wrapper, so it can be dropped into `page.tsx` directly without extra theming.
- Data flow: `GET /api/genomic` → `{ variants, hlaAlleles }` → TanStack Query (`useQuery`, key `["genomic"]`, `staleTime` 60s) → fall back to `VARIANTS` / `HLA_ALLELES` on error or empty payload.
- Lint: clean.
- Not modified: `src/app/page.tsx` (orchestrator owns composition).
