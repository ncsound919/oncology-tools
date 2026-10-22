# OncoSIM — Unified Cancer Systems Biology Platform · Worklog

Project root: `/home/z/my-project`
Stack: Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · shadcn/ui · Prisma (SQLite) · recharts · z-ai-web-dev-sdk
Single user-visible route: `/` (composed of multiple themed sections inside a dark scientific wrapper).

## Theme
- Dark scientific aesthetic (`.onc-dark` wrapper) with teal `#4FD1C0`, amber `#E8A94D`, coral `#E8664F`, violet `#9E8CF2` accents.
- Fonts: IBM Plex Sans (body) + IBM Plex Mono (data/labels).
- Sticky footer at the bottom of the viewport on short pages, pushed down naturally on long pages.

## Content sources (uploaded)
- `upload/cure-criteria.md` — Four-Leg Cure Framework + tier ladder 0..5 + kill criteria.
- `upload/precision-targeting-experiment-set.md` — 5 protocol experiments.
- `upload/precision-targeting-simulator.jsx` — reference JSX simulator (degrader kinetics + organotropic delivery) to port into a client React component.

## Architecture
- `/src/lib/data.ts` — static domain data (legs, tiers, assets, experiments, variants, HLA alleles, combination scores).
- `/src/lib/zai.ts` — server-side singleton wrapper for z-ai-web-dev-sdk.
- `/src/lib/db.ts` — Prisma client (already existed).
- `/prisma/schema.prisma` — Asset, Experiment, Simulation, ChatLog, Variant models.
- API routes (all `GET`/`POST`, all use relative paths):
  - `/api/assets` — seeds + lists tracked assets.
  - `/api/experiments` — seeds + lists protocol experiments.
  - `/api/genomic` — seeds + lists variants + HLA alleles.
  - `/api/chat` — LLM-powered research assistant (POST {message, history}).
  - `/api/simulations` — persist/list simulation runs.
  - `/api/scoring` — LLM-assisted cross-leg combination scoring.
- Components under `/src/components/sections/`:
  - hero, framework, asset-registry, experiment-lab, simulator, genomic-explorer, ai-assistant, cure-rubric.
- `/src/components/site-nav.tsx` + `/src/components/site-footer.tsx` — chrome.
- `/src/app/page.tsx` — composes everything inside the dark wrapper with sticky footer.

## Task IDs
- 1 — schema + data + api routes (DONE by orchestrator)
- 2-a — Precision Targeting Simulator (subagent, in-flight)
- 2-b — Genomic Variant Explorer (subagent, in-flight)
- 3 — Hero, framework, asset registry, experiment lab, cure rubric, nav, footer, page composition (orchestrator, in-flight)
- 4 — AI Research Assistant (orchestrator, pending)
- 5 — lint + agent-browser self-verify + fixes (orchestrator, pending)
- 6 — cron job every 15 min, webDevReview kind (orchestrator, pending)

---
Task ID: 1
Agent: orchestrator
Task: Prisma schema, static domain data, z-ai singleton, all API routes, layout/fonts/globals theme tokens.

Work Log:
- Wrote `prisma/schema.prisma` with Asset, Experiment, Simulation, ChatLog, Variant models.
- Installed missing `effect` dep; ran `bunx prisma db push` (SQLite created at `db/custom.db`).
- Wrote `/src/lib/data.ts` (legs, tier ladder, 9 assets, 5 experiments, 12 variants, 8 HLA alleles, 2 combination scores).
- Wrote `/src/lib/zai.ts` (server-side z-ai-web-dev-sdk singleton).
- Wrote 6 API routes: assets, experiments, genomic, chat, simulations, scoring.
- Updated `src/app/layout.tsx` (IBM Plex Sans + Mono, OncoSIM metadata).
- Added `.onc-dark` theme tokens + slider/scrollbar/grid/radial utilities to `globals.css`.
- Removed old `/src/app/api/route.ts`.
- Dev server running on :3000 (verified `✓ Ready`).

Stage Summary:
- Backend + data layer complete. Ready for frontend section components.
- Hero image generation kicked off in background to `public/hero-oncology.png` (may or may not be ready when frontend renders — components should gracefully fall back to a CSS-only hero if the file is absent).

---
Task ID: 2-b
Agent: full-stack-developer (Genomic Variant Explorer)
Task: Build a client component at /src/components/sections/genomic-explorer.tsx that fetches /api/genomic (GET) and renders an interactive genomic-variant explorer (variant table + stacked VAF-by-cohort chart + HLA-binding prediction panel) with TanStack Query, loading skeletons, and static-data fallback on error.

Work Log:
- Read worklog.md and confirmed Task 1 left `/api/genomic` + static `VARIANTS` / `HLA_ALLELES` data ready in `src/lib/data.ts`.
- Verified available shadcn/ui primitives (Select, Skeleton, Badge, Card, Table) and recharts exports.
- Wrote `/src/components/sections/genomic-explorer.tsx` (`'use client'`, default export `GenomicExplorer`) which wraps `GenomicExplorerInner` in a local `QueryClientProvider` (`useState(() => new QueryClient())`) because no provider exists at the app root yet.
- Layout: `grid grid-cols-1 lg:grid-cols-[1fr_320px]`. Left = filter controls + scrollable variant table + stacked VAF-by-cohort recharts BarChart. Right = HLA-binding prediction panel.
- Variant table columns: Gene | Protein change (+hgvs) | Cohort | VAF (% with mini horizontal bar) | HLA binding (nM, color-coded) | Tier (badge). HLA color tiers pair color with text (`86 strong`, `540 poor`) — color is never the only signal.
- HLA chart: recharts `BarChart layout="vertical"`, Y axis = HLA allele, bar length = `800 - bestAffinity` (so strong binders appear longer), per-bar `Cell` color, `LabelList` shows actual `nM` value. Colors: ≤100 green / 100–300 teal / 300–500 amber / >500 coral / null dim.
- Population coverage stat: sum of `freq` for alleles with `bestAffinity ≤ 500nM`, big number + `%`, labeled `Eligible population (predicted sub-500nM binder)`.
- Stacked VAF chart uses the exact gene→color mapping from the spec (KRAS=teal, TP53=coral, EGFR=violet, BRAF=amber, PIK3CA=#6EE7B7, STK11=#9F7AEA).
- Loading: 3-row `SkeletonTable`. Error/empty: dim coral-bordered banner `Sequencing data unavailable — showing fallback.` and falls back to `VARIANTS` / `HLA_ALLELES` from `@/lib/data`.
- Accessibility: every control has a `<label htmlFor>` or `aria-label`; table uses real `<thead>`/`<tbody>` with `scope="col"` headers; charts wrapped in `role="figure"` with `aria-label`s.
- Ran `bun run lint` — clean (no errors in this file or anywhere else in the project).
- Did NOT modify `src/app/page.tsx`, did NOT add a route, did NOT use any port literal, did NOT write tests.

Stage Summary:
- File: `/home/z/my-project/src/components/sections/genomic-explorer.tsx` (default export `GenomicExplorer`).
- Public surface for orchestrator (Task 3): `import GenomicExplorer from "@/components/sections/genomic-explorer"`. Component renders its own `.onc-dark` section wrapper — can be dropped straight into `page.tsx`.
- Data: TanStack `useQuery({ queryKey: ["genomic"], queryFn: () => fetch("/api/genomic") })`, `staleTime` 60s, fallback to static data on error.
- Agent-ctx notes saved at `/home/z/my-project/agent-ctx/2-b-genomic-variant-explorer.md`.

---
Task ID: 2-a
Agent: full-stack-developer (Precision Targeting Simulator)
Task: Port `upload/precision-targeting-simulator.jsx` into a Next.js 16 client component at `src/components/sections/simulator.tsx`, faithfully preserving the degrader-kinetics + organotropic-delivery math and charting, then add shadcn/ui enhancements, a Save-run flow that POSTs to `/api/simulations`, a dual-address boost readout, responsive layout, and the OncoSIM dark theme.

Work Log:
- Read `worklog.md`, `upload/precision-targeting-simulator.jsx`, `src/app/globals.css`, the `simulations` API route, and the shadcn primitives (`button`, `card`, `tabs`, `switch`, `slider`) plus `use-toast` to confirm prop contracts and the existing dark theme tokens.
- Wrote `src/components/sections/simulator.tsx` (`'use client'`) with:
  - Faithful port of both tabs and all math: `ligaseFactor` (CRBN=1.0/VHL=0.8/Novel=0.65), `mhcFactor` (intact=1.0/partial=0.5/lost=0.05), `k = ln(2)/(halfLife/24)` 7-day kinetics over [0,0.5,1,2,3,4,5,6,7], inhibitor protein flat at 100, inhibitor activity = 100·max(0, 1−engagement·min(1, d/0.5)), clearedFraction at day 3, neoepitope score, priming index, organotropic homing normalization with the dual-address 1.35× boost and baseSystemic 20 vs 100.
  - shadcn `Tabs` (value/onValueChange), `Switch` for coTarget, `Card` for both the parameter panel and the chart panel, `Button` for the segmented toggles (ligase / MHC-I / particle design) and the Save-run button. `role="radiogroup"` + `aria-checked` on the segmented toggles for accessibility.
  - Custom `SimulatorSlider` built on a raw `<input type="range">` styled with the `.onc-slider` class; thumb tint comes from `currentColor` (inline `color: accent`), so teal is used for dose / half-life / lung, amber for liver.
  - `Readout` sub-component rendering the metric tiles (mono numerals + dim sans labels).
  - LineChart (4 series — Degrader protein teal solid, Inhibitor protein dim dashed, Degrader activity amber solid, Inhibitor activity coral dashed) and BarChart (Lung teal, Liver amber, Omentum violet, Off-target coral) using the exact hex colors from the reference. Tooltip/Legend use dark styles (`background #0D1013`, `border #262D34`, mono font).
  - "Save run" button POSTs `{kind: 'kinetics'|'delivery', params, results, assetCode: 'KRAS-PROTAC-neoepitope'}` to `/api/simulations` (relative path, no port), shows a `useToast` success toast on 2xx and a destructive toast on failure; `Loader2` spinner + "Saving…" label while in flight.
  - Third readout in Tab 2: "Dual-address boost" = `+35%` when coTarget is on, `+0%` when off.
  - Amber disclaimer banner preserved verbatim.
  - Section header: small teal mono label "SIMULATION SET · PRECISION TARGETING LAB" + sans heading "Degrader immunogenicity & organotropic delivery".
  - Responsive: parameter/chart grid collapses from `md:grid-cols-[280px_1fr]` to `grid-cols-1` on mobile; chart `ResponsiveContainer width="100%"`.
  - Whole component wrapped in `<section className="onc-dark onc-sans rounded-lg" style={{ background: BG, color: INK, padding: "22px 20px 40px" }}>` so the OncoSIM dark theme tokens apply.
- Ran `bun run lint` — passes with zero errors across the project.
- Verified dev server log shows `✓ Ready in 675ms` with no compile errors.

Stage Summary:
- Artifact: `/home/z/my-project/src/components/sections/simulator.tsx` (single default export `Simulator`, also named export `Simulator`).
- Default export is `Simulator`; orchestrator can drop `<Simulator />` straight into `src/app/page.tsx` inside the dark wrapper. No new route, no edits to `page.tsx`.
- Lint clean. Ready to be composed by Task 3.

---
Task ID: 3
Agent: orchestrator
Task: Build nav, footer, hero, framework, asset-registry, experiment-lab, ai-assistant, cure-rubric sections; compose main page.tsx; lint; agent-browser self-verification.

Work Log:
- Built `src/components/site-nav.tsx` (sticky, scroll-aware, mobile menu).
- Built `src/components/site-footer.tsx` (sticky via mt-auto, safe-area padding).
- Built `src/components/sections/hero.tsx` (animated molecular network SVG, gradient headline, stats grid, leg quick-nav).
- Built `src/components/sections/framework.tsx` (interactive leg selector + tier ladder with hover-to-reveal "does not establish" notes + kill criteria + open gaps).
- Built `src/components/sections/asset-registry.tsx` (filterable table by leg, expandable rows, tier progress bars, status badges).
- Built `src/components/sections/experiment-lab.tsx` (5 expandable protocol cards with objective/hypothesis/method/endpoints/controls/positive/negative fields).
- Built `src/components/sections/ai-assistant.tsx` (LLM chat with suggestion chips, loading state, history, clear button — POSTs to /api/chat).
- Built `src/components/sections/cure-rubric.tsx` (interactive combination scorer POSTing to /api/scoring + static reference combinations).
- Composed `src/app/page.tsx` (dark wrapper, flex-col min-h-screen, sticky footer).
- Ran `bun run lint` — 0 errors.
- agent-browser verification: page loads HTTP 200, all 8 sections render (hero, framework, assets, experiments, simulator, genomic, rubric, assistant), no console errors, no dev-log errors, Prisma queries succeed (/api/genomic returned variants).
- VLM visual QA of hero: "highly polished and scientific, excellent spacing and alignment, no visible issues."

Stage Summary:
- Frontend complete and verified. App is interactive end-to-end (leg switching, asset expansion, experiment expansion, simulator tabs/sliders, AI chat, combination scoring).
- Known env quirk: the dev server (`bun run dev`) is killed when the bash tool's session ends. The webDevReview cron agent must restart it (`pkill -9 -f next; cd /home/z/my-project && setsid bash -c 'exec bun run dev' &`) before running agent-browser. Server takes ~2s to be ready, ~6s to compile `/` on first hit.

---
Task ID: 2-a
Agent: full-stack-developer (Precision Targeting Simulator)
Task: Port upload/precision-targeting-simulator.jsx into a 'use client' Next.js component with shadcn/ui + save-run + responsive layout.

Work Log:
- Read the reference JSX and ported kinetics math (ligaseFactor, mhcFactor, k=ln(2)/(halfLife/24), 7-day series) and organotropic homing math (1.35× dual-address boost, baseSystemic 20/100, normalization) byte-for-byte.
- Replaced raw buttons with shadcn Tabs/Button/Switch/Card.
- Added "Save run" button → POST /api/simulations with useToast feedback.
- Added "Dual-address boost" third readout on Tab 2.
- Responsive grid-cols-1 md:grid-cols-[280px_1fr].
- Full a11y (radiogroup roles, aria-labels, aria-valuenow on sliders).

Stage Summary:
- `src/components/sections/simulator.tsx` complete. Lint clean. Renders dark themed LineChart (4 series) + BarChart (4 bars) with exact reference palette.

---
Task ID: 2-b
Agent: full-stack-developer (Genomic Variant Explorer)
Task: Build genomic variant explorer with variant table, HLA-binding panel, stacked VAF chart, population-coverage stat.

Work Log:
- Built `src/components/sections/genomic-explorer.tsx` with local QueryClientProvider.
- Left col: cohort + gene Select filters, scrollable variant table with VAF mini-bars + color-coded HLA binding, stacked BarChart (VAF by cohort, colored by gene).
- Right col: horizontal HLA-binding BarChart, population-coverage stat (sum of freq for ≤500nM alleles).
- Loading skeletons, error fallback to static data.

Stage Summary:
- Component complete. Lint clean. Fetches /api/genomic. Renders charts + table + filters.

---
Task ID: 4 (webDevReview cron round 1)
Agent: webDevReview cron
Task: Assess status, QA via agent-browser, fix bugs, add new features, improve styling.

## Current project status description/assessment
- Platform was stable and complete at start of round: 8 sections, 6 API routes, lint clean, server HTTP 200.
- No runtime errors found in QA (console errors captured: []; dev log errors: none).
- All interactions functional: leg switching, asset expansion, simulator tabs/sliders, AI chat, combination scoring.

## Current goals / completed modifications / verification results
### New features added (Mandatory: more features)
1. **Pipeline Progression section** (`src/components/sections/pipeline-progression.tsx`) — new analytical view showing every asset's position on its leg's 0→5 tier ladder, the next rung being pursued, the specific evidence gap to climb, and an ETA label. Interactive leg filter (All / Leg 1-4). Custom `TierTrack` component with current-marker (filled circle) + target-marker (hollow diamond) + gap bracket.
2. **Resistance Atlas section** (`src/components/sections/resistance-atlas.tsx`) — interactive heatmap of 6 assets × 8 resistance mechanisms (21 status cells). Cells show overcomes(✓)/vulnerable(✕)/unknown(?) with hover-to-reveal rationale tooltips. Filter by status. Includes the **Leg 3 gap callout** (the underserved leg) with 3 candidate experiment proposals. This directly addresses the worklog's noted gap that Leg 3 has no asset clearing tier 2.
3. **New data** in `src/lib/data.ts`: `RESISTANCE_MECHANISMS` (8 mechanisms, 3 categories), `RESISTANCE_STATUSES` (21 asset×mechanism ratings), `PIPELINE_STEPS` (9 programs with currentTier/targetTier/nextGap/eta), `LEG3_GAP` (title + body + 3 candidates).
4. **Dev server watchdog** (`scripts/dev-watchdog.sh`) — robust detached startup that survives bash session boundaries (the known sandbox quirk where `bun run dev` was killed when the launching bash tool call returned).
5. Nav + footer updated with Pipeline + Resistance links.

### Styling improvements (Mandatory: more styling details)
- Hero: added generated-image backdrop layer (subtle, opacity-20, mix-blend-screen) over the existing CSS molecular network — gracefully no-ops if image absent.
- Resistance Atlas: widened columns from 80px→120px, container min-width 760px→1180px, added `break-words`, brightened header text to `#E9E7DF` and tier labels to `#C9BFB5` (were too dim).
- Pipeline: tier numbers brightened (unreached now `#8B9299` semibold, gap-tier `#C9BFB5`), asset names changed from `truncate`→`line-clamp-2` (no more clipping), gap-text spacing increased, card padding p-3→p-4.
- Leg 3 candidate cards: added `break-words`, increased padding p-3→p-3.5, brightened text to `#E9E7DF`.
- Legend text contrast bumped from `#5C646C`→`#8B9299`.

### Verification results
- `bun run lint` clean (0 errors).
- agent-browser full QA: 9 sections render (top, framework, assets, pipeline, experiments, resistance, genomic-explorer, rubric, assistant), 0 captured console errors, 0 dev-log errors.
- Resistance heatmap: 21 interactive cells, hover tooltip works ("RP04340 Vulnerable KRAS locus amplification"), status filters work.
- Pipeline Leg-4 filter works.
- AI assistant: suggestion chip click → real LLM reply ("PT0511 is Tier 4... Phase 1 trial data... distinguishing it from the higher bar of Tier 5").
- VLM visual QA confirmed all three previously-reported issues (header truncation, faint tier numbers, cut-off card text) are now **FIXED** in pipeline, resistance, and leg3-gap sections.

## Unresolved issues or risks, and priority recommendations for the next phase
- **Hero image generation** (`z-ai image`) hung/timed out this round — process killed. The hero falls back gracefully to the CSS molecular network, so not blocking. Next round could retry with a shorter prompt or smaller size.
- **Dev server persistence**: the watchdog script helps, but the server can still be killed between non-consecutive bash calls. Next round could investigate a `tmux`/`screen`-based or `systemd`-style persistent runner if available.
- **Next feature ideas**: (1) a "Combination Designer" interactive builder that lets users pick 2-3 assets and auto-generates a cross-leg score via /api/scoring; (2) a persistence layer for saved simulations (currently POSTs work but there's no UI to list/reload them); (3) a dark/light theme toggle; (4) export-any-section-as-PDF; (5) deeper Leg 3 content (a dedicated resistance-anticipation experiment proposal section, since Leg 3 is the most underserved).

---
Task ID: 5 (webDevReview cron round 2)
Agent: webDevReview cron
Task: Assess status, QA via agent-browser, add new features, improve styling.

## Current project status description/assessment
- Platform stable at start: 11 sections, lint clean, server HTTP 200, 0 console errors, 0 dev-log errors.
- All prior interactions functional (leg switching, asset expansion, simulator tabs/sliders, AI chat, combination scoring, resistance heatmap hover/filter, pipeline tier filter).
- No bugs found — proceeded to new feature development.

## Current goals / completed modifications / verification results
### New features added (Mandatory: more features)
1. **Combination Designer section** (`src/components/sections/combination-designer.tsx`) — interactive regimen builder. Users pick 2–4 assets from the registry (clickable palette with leg-colored selection states), the designer composes them into a regimen, shows touched-leg coverage chips, and scores each leg independently via `/api/scoring` (LLM). Results show per-leg tier bars + verdict + highest-unmet-tier-gap. Max-4 selection limit, disabled state when <2 selected.
2. **Saved Simulations panel** (`src/components/sections/saved-simulations.tsx`) — collapsible persistence layer. Fetches from `/api/simulations` GET, lists every saved run with kind (kinetics/delivery), asset link, timestamp. Each row expands to show full JSON params + results. Refresh button. Empty state. Closes the persistence loop (simulator "Save run" → DB → this panel lists/reloads).
3. **Scroll UX component** (`src/components/scroll-ux.tsx`) — two features: (a) a thin gradient (teal→violet→coral) scroll-progress bar fixed to the very top of the viewport; (b) an animated back-to-top floating button (appears after 800px scroll, framer-motion enter/exit).
4. **Nav active-section highlight** (`src/components/site-nav.tsx`) — scroll-spy tracks which section is in view and highlights the corresponding nav link in teal with an underline indicator. Nav breakpoint moved to `lg` to fit 10 links. Version bumped to v0.5.
5. **Simulator section id** — added `id="simulator"` to the simulator's `<section>` (was missing, breaking the nav link + scroll-spy).
6. Nav + footer updated with Designer link.

### Styling improvements (Mandatory: more styling details)
- Combination Designer asset cards: secondary text contrast bumped (`#8B9299`→`#C9BFB5` for names, tier badges colored per-leg with `font-semibold`).
- Proposed regimen list: spacing `space-y-2`→`space-y-2.5`, name text `#5C646C`→`#8B9299`.
- Leg coverage chips: untouched-leg text `#3A4148`→`#5C646C`, border `#1F262D`→`#262D34` (more visible).
- Scroll-progress bar uses a tri-color gradient matching the brand palette with a subtle glow.
- Back-to-top button: glassmorphic (`backdrop-blur-md`, `bg-[#0D1013]/90`), hover glow effect.

### Verification results
- `bun run lint` clean (0 errors).
- agent-browser full QA: **12 sections** render (top, framework, assets, pipeline, experiments, resistance, designer, simulator, saved, genomic-explorer, rubric, assistant), 0 captured console errors, 0 dev-log errors.
- Combination Designer: 3-asset selection works, "Score combination" returns LLM-scored per-leg tiers + verdict + gap.
- Simulator "Save run" → DB persisted (1 simulation confirmed via `/api/simulations` API).
- Saved Simulations panel: opens, fetches, displays the saved run with timestamp.
- VLM visual QA confirmed all designer contrast issues **FIXED** (asset text, regimen spacing, chip visibility).
- VLM confirmed scroll-ux features render correctly: "teal progress bar spans the width", "RESISTANCE link highlighted with teal underline", "circular back-to-top button in bottom-right".

## Unresolved issues or risks, and priority recommendations for the next phase
- **Hero image generation** (`z-ai image`) timed out again this round (both 1440x720 and 1024x1024 attempts). The z-ai image service appears slow/unavailable this session. The hero falls back gracefully to the CSS molecular network — not blocking. Next round could try the SDK directly from a server script instead of the CLI, or use a different prompt.
- **Dev server persistence**: still killed between non-consecutive bash calls. The watchdog script (`scripts/dev-watchdog.sh`) works reliably within a single session. Next round could try a `nohup` + `disown` chain or check if `systemd --user` is available.
- **Next feature ideas for future rounds**: (1) export-any-section-as-PDF (use the `pdf` skill / agent-browser `pdf` command); (2) a dedicated Leg 3 resistance-anticipation experiment proposal section (Leg 3 is still the most underserved); (3) a "Cohort comparison" view in the genomic explorer (side-by-side VAF distributions); (4) voice narration of tier explanations via the `TTS` skill; (5) a glossary/popover system for scientific terms (PROTAC, DC50, DTC, etc.) to improve accessibility for non-expert users.

---
Task ID: 6 (webDevReview cron round 3)
Agent: webDevReview cron
Task: Assess status, QA via agent-browser, add new features (glossary + cohort comparison), improve styling, generate hero image.

## Current project status description/assessment
- Platform stable at start: 12 sections, lint clean, server HTTP 200, 0 console errors, 0 dev-log errors.
- All prior interactions functional. No bugs found — proceeded to new feature development.
- The hero image had never generated successfully (z-ai image CLI timed out across all prior rounds).

## Current goals / completed modifications / verification results
### New features added (Mandatory: more features)
1. **Scientific glossary system** — two parts:
   - `src/lib/glossary.ts` — 20 scientific terms (PROTAC, DC50, Dmax, DTC, MHC-I, neoepitope, HLA, E3 ligase, CRBN, VHL, ctDNA, ICD, DAMP, ADC, EP4, VAF, TME, organotropic, xenograft, organoid) across 5 categories (Target, Mechanism, Evidence, Model, Biomarker), each with a short popover definition and a full mechanistic explanation.
   - `src/components/glossary-term.tsx` — `GTerm` inline popover component: renders a term with a dotted teal underline; hover or click opens a popover with the short definition + category badge; keyboard accessible (Enter/Space toggle, Escape closes); click-outside to dismiss.
   - `src/components/sections/glossary-section.tsx` — full reference section: searchable (text input), category-filterable, expandable cards showing the full definition.
2. **Inline glossary terms integrated** into the Hero and Framework section intro paragraphs (8 hoverable terms: PROTAC, neoepitope, ctDNA, organotropic, DC50, DTC, MHC-I) — demonstrates the feature and improves accessibility for non-expert users.
3. **Cohort Comparison section** (`src/components/sections/cohort-comparison.tsx`) — side-by-side mutation-landscape comparison across 6 cohorts (PDAC, NSCLC, CRC, HCC, MEL, BRCA). Users pick up to 4 cohorts; a recharts RadarChart compares them across 6 normalized metrics (mutation density, mean VAF, max VAF, HLA-binder coverage, tier diversity, mean evidence tier). A raw-metric table scrolls alongside.
4. **Hero image** — finally generated successfully via the SDK directly (`scripts/gen-hero.ts`, a server-side bun script using `z-ai-web-dev-sdk`) instead of the timing-out CLI. The hero now shows an abstract molecular-network background (confirmed by VLM: "molecular network visualization with interconnected nodes and colorful circular elements").

### Styling improvements (Mandatory: more styling details)
- Cohort radar chart: height 380→440, margins increased (top 10→24, bottom 10→24), axis label fill `#8B9299`→`#C9BFB5` and fontSize 10.5→11 (VLM-confirmed FIX for truncation + contrast).
- Cohort raw-metric table: added `max-h-[440px] overflow-y-auto onc-scroll` so it scrolls within bounds instead of overflowing.
- Glossary section: secondary text contrast `#8B9299`→`#C9BFB5`, bottom padding `py-20`→`pb-24` so the back-to-top button doesn't overlap the last card.
- Glossary popover: z-index `z-[80]`, glassmorphic dark card, category badge colored per-category.

### Verification results
- `bun run lint` clean (0 errors).
- agent-browser full QA: **14 sections** render (top, framework, assets, pipeline, experiments, resistance, designer, simulator, saved, genomic-explorer, cohort, rubric, assistant, glossary), 0 captured console errors, 0 dev-log errors.
- Glossary: 8 hoverable `GTerm` instances detected on the page; hover opens popover ("PROTAC" confirmed).
- Glossary section: search ("PROTAC") filters, category chips filter, cards expand to show full definitions.
- Cohort comparison: default 3 cohorts (PDAC/NSCLC/CRC) selected, MEL+BRCA toggle works, radar re-renders, metric table updates.
- Hero image: generated (148KB) and rendering — VLM confirmed "background image renders successfully, showing an abstract molecular network visualization".
- VLM visual QA confirmed all cohort + glossary issues **FIXED** (chart truncation, axis contrast, table cut-off, text contrast).

## Unresolved issues or risks, and priority recommendations for the next phase
- **None blocking.** The hero image is now generated and rendering. The dev-server watchdog (`scripts/dev-watchdog.sh`) remains the reliable way to restart the server within a single bash session.
- **Next feature ideas for future rounds**: (1) export-any-section-as-PDF (use the `pdf` skill / agent-browser `pdf` command); (2) a dedicated Leg 3 resistance-anticipation experiment proposal section (Leg 3 is still the most underserved — the resistance atlas covers the heatmap, but a dedicated experiment-proposal section would deepen it); (3) voice narration of tier explanations via the `TTS` skill (an audio "play" button on each tier); (4) integrate glossary `GTerm` popovers into more sections (experiments, resistance-atlas, asset-registry summaries); (5) a "compare two assets head-to-head" view (side-by-side tier + resistance profile).

---
Task ID: 7 (webDevReview cron round 4)
Agent: webDevReview cron
Task: Assess status, QA via agent-browser, add Leg-3 dedicated section + head-to-head compare, integrate glossary, fix nav crowding.

## Current project status description/assessment
- Platform stable at start: 14 sections, lint clean, server HTTP 200, 0 console errors, 0 dev-log errors.
- All prior interactions functional. No bugs found — proceeded to new feature development.

## Current goals / completed modifications / verification results
### New features added (Mandatory: more features)
1. **Leg-3 dedicated experiment-proposal section** (`src/components/sections/leg3-proposals.tsx`) — three full protocols designed to fill the gap that no asset clears tier 2 on resistance anticipation:
   - **Closed-loop ctDNA adaptive switching trial** (Tier 1→2): pre-specified switching rule vs. reactive SOC, resistance-evolution-competent organoid model.
   - **Anticipatory RTK-bypass combination** (Tier 0→2): degrader + EGFR/HER2 inhibitor started at first ctDNA signal vs. at progression.
   - **Closed-loop organoid resistance-atlas platform** (Tier 0→1 platform): serial passage + weekly variant calling to convert resistance-atlas "unknown" cells to "overcomes"/"vulnerable".
   - Each proposal: hypothesis, 4-step design, endpoints, "what this fills" (the gap), null-result interpretation, resistance-mechanism chips. Expandable cards. Includes glossary `GTerm` popovers (ctDNA, organoid, EP4).
   - New data: `LEG3_PROPOSALS` (3 proposals) in `src/lib/data.ts`.
2. **Head-to-head asset comparison section** (`src/components/sections/asset-compare.tsx`) — curated pairs (clinical vs. preclinical degrader, EP4 vs. perioperative, two neoantigen vaccines). Side-by-side asset cards show: current tier, status, modality, resistance profile (overcomes/vulnerable/unknown counts), pipeline progression (tier climb + gap), summary. Below: a full resistance-mechanism comparison matrix (✓/✕/? per mechanism per asset). Pair selector with smooth framer-motion transitions.
   - New data: `ASSET_COMPARISON_PAIRS` (3 curated pairs) in `src/lib/data.ts`.
3. **Glossary `GTerm` integration** into the Leg-3 section intro (ctDNA, organoid, EP4 hoverable) — continues the accessibility-for-non-experts push from round 3.

### Styling improvements (Mandatory: more styling details)
- **Nav bar crowding fix**: with 14 nav links the `lg` breakpoint was wrapping text ("LEG S", "V0.5"). Moved horizontal nav to `xl` breakpoint, tightened link padding (`px-2.5`→`px-2`), reduced font-size (`10.5px`→`10px`), shortened version label to "v0.6", added `whitespace-nowrap` to logo + version + each link, widened nav container `max-w-7xl`→`max-w-[1400px]`, mobile menu grid `sm:grid-cols-3`. VLM confirmed: "all 14 links displayed on a single line without any text wrapping or truncation".
- Leg-3 section: violet accent theme (matching Leg 3), gap callout card, expandable proposal cards with resistance-mechanism chips.
- Asset-compare: two-card grid with colored side badges (A=teal, B=violet), resistance-mechanism matrix with status symbols.

### Verification results
- `bun run lint` clean (0 errors).
- agent-browser full QA: **16 sections** render (top, framework, assets, pipeline, compare, experiments, resistance, leg3, designer, simulator, saved, genomic-explorer, cohort, rubric, assistant, glossary), 0 captured console errors, 0 dev-log errors.
- Leg-3: default proposal 1 open, proposal 2 (Anticipatory RTK) expands on click, resistance-mechanism chips render.
- Asset-compare: default pair (PT0511 vs RP04340) renders, EP4-vs-COMPIT-2 pair switches correctly, resistance-mechanism matrix shows ✓/✕/? per asset.
- VLM visual QA confirmed nav crowding **FIXED** ("all 14 links on a single line") across hero, leg3, and compare views; all sections render with good contrast, no cut-off.

## Unresolved issues or risks, and priority recommendations for the next phase
- **None blocking.** The platform is now feature-rich (16 sections) and visually polished.
- **Next feature ideas for future rounds**: (1) export-any-section-as-PDF (use the `pdf` skill / agent-browser `pdf` command); (2) voice narration of tier explanations via the `TTS` skill (audio "play" button on each tier); (3) integrate glossary `GTerm` popovers into more sections (experiment-lab methods, asset-registry summaries, simulator parameter help text); (4) a "deep-dive" modal for each asset (click an asset → full detail view with all resistance statuses, pipeline history, related experiments); (5) a dark/light theme toggle (next-themes is already installed); (6) keyboard-shortcut layer (j/k to jump between sections, / to focus search).

---
Task ID: 8 (webDevReview cron round 5)
Agent: webDevReview cron
Task: Assess status, QA via agent-browser, add TTS narration + keyboard-shortcut layer + section mini-map.

## Current project status description/assessment
- Platform stable at start: 16 sections, lint clean, server HTTP 200, 0 console errors, 0 dev-log errors.
- All prior interactions functional. No bugs found — proceeded to new feature development.

## Current goals / completed modifications / verification results
### New features added (Mandatory: more features)
1. **TTS audio narration** — a genuine AI capability (z-ai-web-dev-sdk `audio.tts.create`):
   - `src/app/api/tts/route.ts` — POST endpoint that takes `{text, voice?, speed?}`, generates a WAV (24000 Hz mono PCM), returns the audio buffer with `Content-Type: audio/wav`. Enforces the 1024-char API limit by slicing.
   - `src/components/narrate-button.tsx` — reusable `NarrateButton` component: fetches from `/api/tts`, creates an object-URL, plays via `new Audio()`. Three states (idle/loading/playing) with Volume2/Loader2/Square icons. Click-to-play, click-again-to-stop. Properly revokes object URLs.
   - Integrated into the Framework section: a "Narrate" button next to each leg's thesis (narrates the leg name + thesis) and a narrate button on each "What tier 5 means here" card (narrates the tier-5 definition).
   - Verified: TTS API returns HTTP 200 with a valid 348KB RIFF WAVE file (16-bit PCM, mono 24000 Hz).
2. **Keyboard-shortcut layer** (`src/components/keyboard-nav.tsx`):
   - **j / k** (or ↑/↓) — smooth-scroll to the next/previous section.
   - **/** — opens a command palette (search dialog) to filter+jump to any section by name/group.
   - **Escape** — closes the palette.
   - Palette: autofocus input, ↑/↓ to navigate results, Enter to select, group-colored dots, footer with section count. Click-outside to dismiss.
   - Respects typing context (disabled when focused in an input/textarea).
3. **Section mini-map rail** (in the same component) — a fixed vertical rail on the right edge (xl+ breakpoint) with 16 dots (one per section), group-colored, active section enlarged with a glow. Hover reveals the section label. Includes a `/ search` button at the bottom.
4. **Keyboard hint** — a dismissible bottom-left card showing `j k jump sections | / search` that appears after 1.5s and can be closed.

### Styling improvements (Mandatory: more styling details)
- Narrate buttons: subtle bordered pill, hover turns teal, Loader2 spinner during generation, Square icon during playback.
- Mini-map rail: dots transition from 6px→10px when active, glow shadow in the section's group color, hover-reveal labels.
- Command palette: glassmorphic backdrop blur, framer-motion enter/exit, color-coded result dots, keyboard footer with kbd-styled keys.

### Verification results
- `bun run lint` clean (0 errors).
- agent-browser full QA: 16 sections render, 0 captured console errors, 0 dev-log errors.
- TTS API: HTTP 200, returns valid WAV (RIFF, 16-bit PCM, mono 24000 Hz, 348KB).
- Framework: 2 Narrate buttons detected per leg (thesis + tier-5 meaning).
- Mini-map rail: 16 section dots present.
- Command palette: opens with `/`, accepts typing ("leg" filters to Leg-3 proposals), closes with ESC.
- `j` key navigates sections (scrollY advanced from 0 to 2376).
- VLM confirmed all new features visible: "NARRATE button with speaker icon", "command palette search dialog", "vertical mini-map with dots on the right edge", "keyboard navigation hints".

## Unresolved issues or risks, and priority recommendations for the next phase
- **None blocking.** The platform now has 16 sections + TTS audio narration + keyboard navigation + mini-map rail.
- **Next feature ideas for future rounds**: (1) export-any-section-as-PDF (use the `pdf` skill / agent-browser `pdf` command); (2) integrate glossary `GTerm` popovers into more sections (experiments, asset-registry, simulator help text); (3) a "deep-dive" modal for each asset (click → full detail view with all resistance statuses, pipeline history, related experiments); (4) dark/light theme toggle (next-themes already installed); (5) voice input to the AI assistant via the `ASR` skill (speak a question instead of typing); (6) a "compare two cohorts head-to-head" view (genomic + clinical side-by-side).

---
Task ID: 9 (webDevReview cron round 6)
Agent: webDevReview cron
Task: Assess status, QA via agent-browser, add asset deep-dive modal + glossary integration into experiments.

## Current project status description/assessment
- Platform stable at start: 16 sections, lint clean, server HTTP 200, 0 console errors, 0 dev-log errors.
- All prior interactions functional. No bugs found — proceeded to new feature development.

## Current goals / completed modifications / verification results
### New features added (Mandatory: more features)
1. **Asset deep-dive modal** (`src/components/asset-deep-dive.tsx`) — a full-detail dialog that opens when an asset is clicked, showing:
   - Header: leg badge, tier badge, status badge, asset code/name, sponsor/modality/target meta.
   - Evidence summary (full text).
   - Evidence tier ladder (0→5 visual bar with current tier highlighted).
   - Pipeline — next rung gap (current→target, ETA, the specific gap text).
   - Resistance profile — every resistance mechanism the asset has a status against, each with category, status icon (✓/✕/?), and the rationale note.
   - Related experiments — up to 3 experiments matching the asset's leg/target/modality, with number + title + objective.
   - Combination scores — any combination-score entries that reference this asset, with the verdict.
   - Glossary nudge footer with hoverable terms + link to the full glossary.
   - ESC to close, click-outside to close, body scroll lock while open, framer-motion enter/exit, scrollable body (`max-h-[calc(100vh-220px)] overflow-y-auto`).
   - Exported `openAssetDeepDive(code)` helper so any component can trigger the modal.
2. **Wired the deep-dive modal into two entry points**:
   - Asset Registry: each expanded asset row now has an "Open deep dive" button (ExternalLink icon).
   - Asset Compare: each asset's code in the side-by-side cards is now a clickable button (hover reveals an ExternalLink icon, turns teal).
3. **Glossary `GTerm` integration into the Experiment Lab section** intro — 5 hoverable terms (PROTAC, HLA, ADC, ICD, organotropic) added, continuing the accessibility-for-non-experts push. The page now has 16 hoverable glossary terms across hero, framework, experiments, and leg3 sections.

### Styling improvements (Mandatory: more styling details)
- Deep-dive modal: glassmorphic backdrop blur, gradient header in the leg's color, sectioned body with color-coded section headers, rounded status-icon badges (teal/coral/dim) in the resistance profile, numbered experiment cards.
- Asset-compare clickable code: ExternalLink icon fades in on hover, text turns teal.
- Asset-registry "Open deep dive" button: bordered pill, hover teal.

### Verification results
- `bun run lint` clean (0 errors).
- agent-browser full QA: 16 sections render, 16 hoverable glossary terms on the page, 0 captured console errors, 0 dev-log errors.
- Asset Registry → expand RP04340 row → click "Open deep dive" → modal opens (confirmed "modal open"), ESC closes it.
- Asset Compare → click PT0511 code → modal opens with full detail (resistance profile + related experiments + combination scores visible after scrolling; modal scrollHeight 1106px, clientHeight 357px — fully scrollable).
- Experiment Lab: 5 glossary terms present in the section intro.
- VLM confirmed the deep-dive modal renders with "Evidence Summary, Evidence Tier ladder, Pipeline Gap, Related Experiments, Combination Scores" sections visible.

## Unresolved issues or risks, and priority recommendations for the next phase
- **None blocking.** The platform now has 16 sections + a full asset deep-dive modal + 16 inline glossary terms + TTS narration + keyboard navigation + mini-map rail.
- **Next feature ideas for future rounds**: (1) export-any-section-as-PDF (use the `pdf` skill / agent-browser `pdf` command); (2) dark/light theme toggle (next-themes already installed); (3) voice input to the AI assistant via the `ASR` skill (speak a question instead of typing); (4) a "compare two cohorts head-to-head" view (genomic + clinical side-by-side); (5) integrate glossary `GTerm` popovers into the simulator parameter help text and asset-registry summaries; (6) a "favorites/pin" system for assets (persist in localStorage, show a pinned strip).

---
Task ID: 10 (webDevReview cron round 7)
Agent: webDevReview cron
Task: Assess status, QA via agent-browser, add ASR voice input for AI assistant + favorites/pin system.

## Current project status description/assessment
- Platform stable at start: 16 sections, lint clean, server HTTP 200, 0 console errors, 0 dev-log errors.
- All prior interactions functional. No bugs found — proceeded to new feature development.

## Current goals / completed modifications / verification results
### New features added (Mandatory: more features)
1. **ASR voice input for the AI assistant** — a genuine AI capability (z-ai-web-dev-sdk `audio.asr.create`):
   - `src/app/api/asr/route.ts` — POST endpoint that takes `{audio: "<base64>"}` (any common format: wav/mp3/webm/etc.), returns `{text: "<transcription>"}`. Uses the existing `getZai()` singleton.
   - `src/components/voice-input.tsx` — reusable `VoiceInput` component: records audio via `MediaRecorder` (browser mic), converts to base64 via `FileReader.readAsDataURL`, POSTs to `/api/asr`, calls `onTranscript(text)`. Three states (idle/recording/transcribing) with Mic/Square/Loader2 icons + a pulsing red dot while recording. Graceful error handling for mic-denied.
   - Integrated into the AI assistant: a mic button in the chat input row. On transcript, auto-fills the input AND auto-sends the question to the LLM — fully hands-free Q&A.
   - Verified: ASR API returns HTTP 200 with `{"text":""}` for silent audio (correct empty-transcription handling).
2. **Favorites/pin system for assets** (localStorage-persisted):
   - `src/hooks/use-pinned-assets.ts` — a tiny global store (module-level state + listener set) so the pinned strip + pin buttons across sections stay in sync. Persists to `localStorage` under `oncosim:pinned-assets`. Exports `{pinned, toggle, isPinned, hydrated}`.
   - `src/components/pinned-strip.tsx` — a fixed bottom strip (above the back-to-top button) that shows pinned asset codes as colored chips (leg-colored), each clickable to open the asset deep-dive, with an X to unpin. Only renders when ≥1 asset is pinned. Horizontal scroll for many pins.
   - **Pin buttons in 3 places**: (a) Asset Registry expanded rows ("Pin"/"Pinned" toggle button with filled Pin icon when pinned), (b) Asset deep-dive modal header (pin button next to close, leg-colored when pinned), (c) the pinned strip itself (X to unpin).
   - Verified: pinned RP04340 + PT0511 from the registry → localStorage `["RP04340","PT0511"]` → strip appeared. Pinned PT0511 from the deep-dive modal → synced to the strip. State persists across reloads.

### Styling improvements (Mandatory: more styling details)
- Voice button: bordered icon button, turns coral with a pulsing red dot while recording, spinner while transcribing.
- Pinned strip: glassmorphic (`bg-[#0D1013]/95 backdrop-blur-md`), leg-colored chips with dot + code + hover ExternalLink icon, horizontal scroll for overflow, "PINNED" label with Pin icon.
- Pin buttons: filled Pin icon + leg color when pinned, bordered pill, hover states.
- Modal pin button: leg-colored border + background when pinned, sits in a header button group with the close button.

### Verification results
- `bun run lint` clean (0 errors).
- agent-browser full QA: 16 sections render, 0 captured console errors, 0 dev-log errors.
- ASR API: HTTP 200, returns `{"text":""}` for silent audio.
- AI assistant: 1 voice-input button present.
- Favorites: pinned RP04340 + PT0511 from registry → strip appeared → localStorage persisted `["RP04340","PT0511"]`. Pinned PT0511 from deep-dive modal → synced to strip. State persists across reloads.
- VLM confirmed: "microphone icon for voice input within the AI assistant's chat entry area" and "PINNED assets strip displaying asset codes like RP04340 and PT0511".

## Unresolved issues or risks, and priority recommendations for the next phase
- **None blocking.** The platform now has 16 sections + asset deep-dive modal + ASR voice input + TTS narration + favorites/pin system + keyboard navigation + mini-map rail + 16 inline glossary terms.
- **Next feature ideas for future rounds**: (1) export-any-section-as-PDF (use the `pdf` skill / agent-browser `pdf` command); (2) dark/light theme toggle (next-themes already installed); (3) a "compare two cohorts head-to-head" view (genomic + clinical side-by-side); (4) integrate glossary `GTerm` popovers into the simulator parameter help text; (5) a "recently viewed assets" list (track deep-dive opens in localStorage); (6) a dashboard/summary card at the very top showing the user's pinned assets + their aggregate tier distribution.

---
Task ID: 11 (webDevReview cron round 8)
Agent: webDevReview cron
Task: Assess status, QA via agent-browser, add dashboard summary card + recently-viewed tracking + simulator glossary integration.

## Current project status description/assessment
- Platform stable at start: 16 sections, lint clean, server HTTP 200, 0 console errors, 0 dev-log errors.
- All prior interactions functional. No bugs found — proceeded to new feature development.

## Current goals / completed modifications / verification results
### New features added (Mandatory: more features)
1. **Dashboard summary card** (`src/components/sections/dashboard-card.tsx`) — a personalized landing overview placed right after the hero, showing 3 cards:
   - **Pinned assets**: every pinned asset code (clickable → opens deep dive), tier badge, unpin (trash) button, plus a mini leg-distribution row showing how many pinned assets fall on each leg.
   - **Recently viewed**: up to 6 most-recently-opened asset codes (numbered, clickable → opens deep dive), with a "Clear" button.
   - **Evidence-tier distribution**: a horizontal bar chart of all 9 tracked assets across T0–T5, with the pinned-asset count overlaid in teal on each tier bar. Shows both the global distribution and where the user's pinned assets concentrate.
   - Empty state: a dashed-border card prompting the user to pin assets or open a deep dive.
2. **Recently-viewed tracking** (`src/hooks/use-recent-assets.ts`) — a global store (same pattern as the pinned-assets hook) that records asset codes when their deep-dive modal opens, most-recent-first, deduped, capped at 6. Persists to `localStorage` under `oncosim:recent-assets`. The `AssetDeepDive` modal now calls `push(code)` on open.
3. **Glossary `GTerm` integration into the simulator** — 3 hoverable terms added to the precision-targeting simulator: PROTAC (target engagement help), DC50 (degradation half-life help), and MHC-I (the MHC-I status toggle help text). The `SimulatorSlider` `help` prop type was widened from `string` to `ReactNode` to support inline glossary popovers. The page now has 19 hoverable glossary terms (up from 16).
4. Dashboard wired into the nav (first link), the keyboard-nav SECTIONS list (so j/k + mini-map include it), and the page composition.

### Styling improvements (Mandatory: more styling details)
- Dashboard cards: 3-column grid on desktop, each with a color-coded header (teal/violet/amber), count badge, and content area.
- Pinned-assets card: leg-colored dot + code + tier badge + hover ExternalLink + trash unpin; mini leg-distribution row with colored bars.
- Recently-viewed card: numbered list with leg dots + codes + hover arrow; "Clear" action in the header.
- Tier-distribution card: horizontal bars colored per tier (T0 dim → T5 green), pinned-asset overlay in teal with a 📌 count.
- Empty state: dashed border, centered icon + prompt.

### Verification results
- `bun run lint` clean (0 errors).
- agent-browser full QA: **17 sections** render (top, dashboard, framework, assets, pipeline, compare, experiments, resistance, leg3, designer, simulator, saved, genomic-explorer, cohort, rubric, assistant, glossary), 0 captured console errors, 0 dev-log errors.
- 19 hoverable glossary terms on the page (up from 16).
- Dashboard: empty state renders; after opening 2 deep dives (RP04340 + PT0511), recently-viewed populated to `["RP04340","PT0511"]` and the dashboard showed pinned (PT0511) + recently viewed (both) + tier distribution.
- Simulator: 3 glossary terms present (PROTAC, DC50, MHC-I).
- VLM confirmed: "Your dashboard section is present and contains exactly the three cards: Pinned assets, Recently viewed, Evidence-tier distribution" with correct content.

## Unresolved issues or risks, and priority recommendations for the next phase
- **None blocking.** The platform now has 17 sections + a personalized dashboard + recently-viewed tracking + 19 inline glossary terms + asset deep-dive modal + ASR voice input + TTS narration + favorites/pin system + keyboard navigation + mini-map rail.
- **Next feature ideas for future rounds**: (1) export-any-section-as-PDF (use the `pdf` skill / agent-browser `pdf` command); (2) dark/light theme toggle (next-themes already installed); (3) a "compare two cohorts head-to-head" view (genomic + clinical side-by-side); (4) a "what's new" changelog/timeline section showing recent platform additions; (5) integrate glossary `GTerm` popovers into the resistance-atlas mechanism descriptions; (6) a "tier calculator" tool — pick an asset + a leg + the evidence you have, and it tells you the current tier + what's needed for the next rung.

---
Task ID: 12 (webDevReview cron round 9)
Agent: webDevReview cron
Task: Assess status, QA via agent-browser, add tier calculator + changelog timeline + resistance-atlas glossary integration.

## Current project status description/assessment
- Platform stable at start: 17 sections, lint clean, server HTTP 200, 0 console errors, 0 dev-log errors.
- All prior interactions functional. No bugs found — proceeded to new feature development.

## Current goals / completed modifications / verification results
### New features added (Mandatory: more features)
1. **Tier calculator** (`src/components/sections/tier-calculator.tsx`) — an interactive analytical tool:
   - Pick any of the 9 tracked assets via a chip picker (leg-colored, with T-tier badge).
   - The interactive tier ladder (T0–T5) pre-fills with the asset's reviewed-evidence ceiling (consecutive tiers claimed up to the actual tier).
   - Click any tier to toggle it (claiming requires the tier below to be claimed — enforced consecutively; unclaiming removes it and all above; tiers above the reviewed ceiling are disabled with an "above ceiling" warning).
   - Right panel shows: **Computed tier** (big readout T{n}/5 with a 6-segment progress bar), **Next rung** (the T{n}→T{n+1} gap with the tier-ladder definition + the asset's pipeline gap if it matches), and an **At the reviewed ceiling** warning when the user has claimed all reviewed tiers.
   - Includes glossary `GTerm` popovers (DC50, xenograft, ctDNA) in the intro.
2. **Platform changelog timeline** (`src/components/sections/changelog-section.tsx`) — a vertical timeline of 11 platform additions, newest first:
   - Each entry: version badge, tag chip (Feature/Improvement/Data, color-coded), date/round, title, body.
   - Filter chips (All / Feature / Improvement / Data).
   - Alternating left/right cards on desktop, single column on mobile, with a gradient vertical line and per-entry icon dots.
   - New data: `CHANGELOG` (11 entries) in `src/lib/data.ts`.
3. **Glossary `GTerm` integration into the resistance atlas** — 4 hoverable terms (PROTAC, ctDNA, TME, EP4) added to the resistance-atlas section intro. The page now has 26 hoverable glossary terms (up from 19).
4. Both new sections wired into nav, keyboard-nav SECTIONS list (j/k + mini-map), and footer links.

### Styling improvements (Mandatory: more styling details)
- Tier calculator: leg-colored asset chips with T-tier badges; tier-ladder rows with claim-state borders (current tier highlighted, claimed tiers leg-tinted, ceiling warning amber); big computed-tier readout with 6-segment bar; next-rung card with pipeline-gap highlight.
- Changelog: vertical timeline with gradient line (teal→transparent), alternating cards, per-entry icon dots (Sparkles/Wrench/Database), tag chips color-coded, version + date badges.
- Resistance-atlas intro: 4 inline glossary terms with dotted teal underlines.

### Verification results
- `bun run lint` clean (0 errors).
- agent-browser full QA: **19 sections** render (top, dashboard, framework, assets, pipeline, compare, experiments, resistance, leg3, designer, simulator, saved, genomic-explorer, cohort, calculator, rubric, assistant, changelog, glossary), 0 captured console errors, 0 dev-log errors.
- 26 hoverable glossary terms on the page (up from 19).
- Tier calculator: default asset (RP04340, T3) loads with T0–T3 claimed; switching to PT0511 (T4) recomputes to T4/5.
- Changelog: timeline renders with 11 entries; filter chips work (Data filter shows data-tagged entries).
- Resistance-atlas: 4 glossary terms present in the intro.
- VLM confirmed: tier calculator shows "asset picker, interactive evidence ladder, Computed Tier T4/5, next-rung gap"; changelog shows "vertical timeline of platform additions with version badges and tag chips".

## Unresolved issues or risks, and priority recommendations for the next phase
- **None blocking.** The platform now has 19 sections + a tier calculator + a changelog timeline + 26 inline glossary terms + a personalized dashboard + asset deep-dive modal + ASR voice input + TTS narration + favorites/pin system + keyboard navigation + mini-map rail.
- **Next feature ideas for future rounds**: (1) export-any-section-as-PDF (use the `pdf` skill / agent-browser `pdf` command); (2) dark/light theme toggle (next-themes already installed); (3) a "compare two cohorts head-to-head" view (genomic + clinical side-by-side); (4) integrate glossary `GTerm` popovers into the asset-registry summaries and the cure-rubric verdicts; (5) a "guided tour" onboarding flow (first-visit walkthrough highlighting the hero, framework, dashboard, calculator); (6) a "share a combination score" permalink system (encode the designer's selected assets in the URL).

---
Task ID: 13 (webDevReview cron round 10)
Agent: webDevReview cron
Task: Assess status, QA via agent-browser, add guided-tour onboarding + shareable combination-score permalinks.

## Current project status description/assessment
- Platform stable at start: 19 sections, lint clean, server HTTP 200, 0 console errors, 0 dev-log errors.
- All prior interactions functional. No bugs found — proceeded to new feature development.

## Current goals / completed modifications / verification results
### New features added (Mandatory: more features)
1. **Guided-tour onboarding flow** (`src/components/guided-tour.tsx`) — a 5-step first-visit walkthrough:
   - Auto-opens on first visit (1.5s delay) via `localStorage` flag `oncosim:tour-completed`.
   - 5 steps highlighting: hero (welcome), dashboard, framework, tier calculator, AI assistant — each scrolls the target into view + shows a tooltip card with title/body.
   - Tooltip: step counter (X/5), progress dots, Prev/Next/Skip buttons, close X. Keyboard: ←/→ navigate, Enter next, Escape close.
   - "Done" button on the last step marks the tour completed.
   - `FooterTourButton` — a small "Tour" button (Compass icon) in the footer that re-opens the tour any time.
   - Composed into `page.tsx` at the root level.
2. **Shareable combination-score permalinks** — encode the designer's selected assets in the URL hash:
   - `parseHash()` reads `#designer=PT0511,DT-9081,autogene cevumeran` on mount and pre-selects those assets.
   - `writeHash(codes)` updates the URL hash (via `history.replaceState`) whenever the selection changes.
   - **Share button** (Share2 icon) next to the Score button — appears when ≥2 assets are selected; copies the full permalink URL to the clipboard, shows "Copied!" with a Check icon for 2s.
   - Verified: opening `http://localhost:3000/#designer=PT0511,COMPIT-2,mRNA-4157` pre-selects 3 assets on load ("3 regimen items" confirmed).

### Styling improvements (Mandatory: more styling details)
- Tour tooltip: glassmorphic dark card with a colored header bar (per-step color), progress dots that fill with the step color, teal Next button, Skip/Skip-tour text buttons, smooth framer-motion enter/exit.
- Share button: bordered icon button, hover teal, transitions to "Copied!" with a teal Check icon.
- Score + Share button row: flex layout, Score takes flex-1, Share is a fixed-width icon button.

### Verification results
- `bun run lint` clean (0 errors).
- agent-browser full QA: 19 sections render, 26 glossary terms, 0 captured console errors, 0 dev-log errors.
- Guided tour: auto-opens on first visit (after clearing `tour-completed`), advances "Tour · 1/5 → 2/5" on Next, Skip closes it + sets `tour-completed=1`.
- Share permalink: 3 assets selected → Share clicked → URL hash updates to `#designer=RP04340%2CDT-9081%2Cautogene%20cevumeran`. Opening a fresh URL with `#designer=PT0511,COMPIT-2,mRNA-4157` pre-selects 3 assets ("3 regimen items").
- VLM confirmed: "guided tour tooltip card with step progress dots + Next/Skip buttons" and "Share button adjacent to Score Combination button, pre-populated Combination Designer".

## Unresolved issues or risks, and priority recommendations for the next phase
- **None blocking.** The platform now has 19 sections + a guided-tour onboarding + shareable combination permalinks + a tier calculator + a changelog timeline + 26 inline glossary terms + a personalized dashboard + asset deep-dive modal + ASR voice input + TTS narration + favorites/pin system + keyboard navigation + mini-map rail.
- **Next feature ideas for future rounds**: (1) export-any-section-as-PDF (use the `pdf` skill / agent-browser `pdf` command); (2) dark/light theme toggle (next-themes already installed); (3) a "compare two cohorts head-to-head" view (genomic + clinical side-by-side); (4) integrate glossary `GTerm` popovers into the asset-registry summaries and the cure-rubric verdicts; (5) a "share a saved simulation" permalink (encode simulator params in the URL); (6) a "compare two tier-calculator states" view (side-by-side asset A vs asset B tier ladders).
