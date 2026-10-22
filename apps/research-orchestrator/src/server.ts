import express from 'express';
import { z } from 'zod';
import { REGISTRY, systemsForDomain } from './registry.js';
import { dispatchAll } from './dispatcher.js';
import { dispatchStageB, STAGE_B_ROSTER } from './stageb.js';
import { dispatchStageC, STAGE_C_ROSTER } from './stagec.js';
import { buildReport, buildPaper, buildLaymanPaper } from './reporter.js';
import { synthesizeSpec } from './harness.js';
import { scheduleStudy, unscheduleStudy } from './scheduler.js';
import { ensureLedger, archivePayloads, appendRun, hashArtifact, nonSecretEnvHash, loadRuns, getRun, verifyRun } from './ledger.js';
import { extractAndVerifyClaims, extractSystemClaims, loadClaims, claimChain } from './claims.js';
import { persistRunInsights, readFleetInsights, analyzeTrends, fleetOverview, persistContradictions } from './trends-bridge.js';
import { listValidity } from './validity.js';
import type { Study, StudyReport, SystemId, ResearchSpec } from './types.js';
import { DEFAULT_INGESTION } from './types.js';
import { SrtStore } from './srt/store.js';
import { buildRunCard } from './srt/experiment.js';
import { findNearDuplicates, type HypothesisStatus } from './srt/registry.js';
import { applyRunToHypothesis, type Criterion, type RunResult } from './srt/analysis.js';
import { hypothesesFromRun } from './srt/fromRun.js';
import { runDebate, dossierToHypotheses, dossierCandidates } from './srt/discourse.js';
import { resolveKaggleCredentials, kaggleCredentialsStatus } from './kaggle/credentials.js';
import { kaggleMcpConfig, KAGGLE_MCP_URL, kaggleMcpToolCount } from './kaggle/mcp.js';
import { buildCriterionBenchmarkTask, fetchBenchmarkLeaderboard } from './kaggle/benchmarks.js';
import { buildKaggleNotebookJob, submitNotebookJob, fetchComputePlatforms } from './kaggle/recourse.js';
import { verifyNotebook } from './verify/notebookGate.js';
import { buildBenchmarkNotebook, benchmarkPushPlan } from './kaggle/benchmarkNotebook.js';
import { evaluatePromotion } from './gate/promotion.js';
import { reverifyGeneratedCode, runOpenHubGate } from './fleet/externalClients.js';
import { buildProvenanceSpine, anchorTimestamp, isSha256Hex } from './provenance/spine.js';
import { buildCadence } from './cadence.js';
import { runCadenceLoop } from './cadenceRunner.js';
import { WorldStore } from './world/store.js';
import { buildTeamPlan, planSummary } from './team.js';
import fs from 'node:fs';
import path from 'node:path';

// Minimal .env loader — orchestrator runs under plain tsx; keep the Phoenix key local (gitignored).
(function loadEnv() {
  const envPath = path.join(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf-8').split(/\r?\n/)) {
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (m && !process.env[m[1]!]) process.env[m[1]!] = m[2]!;
  }
})();

const PORT = Number(process.env.ORCHESTRATOR_PORT ?? 8099);
const STORE = path.join(process.cwd(), 'data');
const STUDIES_FILE = path.join(STORE, 'studies.json');
const REPORTS_DIR = path.join(STORE, 'reports');
const SCHEDULES_FILE = path.join(STORE, 'schedules.json');

// A run writes several sidecars next to its report: <date>-<id>.json (the report)
// plus .spec.md/.dispatch.md/.paper.md/.layman.md/.claims.json. The claims sidecar
// also ends in ".json" and contains the run id, so a naive
// `includes(id) && endsWith('.json')` can select it as if it were the report
// (no directive/studyId -> downstream crash). Select the report precisely.
const isReportJson = (f: string): boolean => f.endsWith('.json') && !f.endsWith('.claims.json');

function ensureStore() {
  fs.mkdirSync(STORE, { recursive: true });
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
  if (!fs.existsSync(STUDIES_FILE)) fs.writeFileSync(STUDIES_FILE, '[]');
  if (!fs.existsSync(SCHEDULES_FILE)) fs.writeFileSync(SCHEDULES_FILE, '[]');
}
ensureStore();

function loadStudies(): Study[] {
  try { return JSON.parse(fs.readFileSync(STUDIES_FILE, 'utf-8')); } catch { return []; }
}
function saveStudies(s: Study[]) { fs.writeFileSync(STUDIES_FILE, JSON.stringify(s, null, 2)); }
function loadSchedules(): any[] {
  try { return JSON.parse(fs.readFileSync(SCHEDULES_FILE, 'utf-8')); } catch { return []; }
}
function saveSchedules(s: any[]) { fs.writeFileSync(SCHEDULES_FILE, JSON.stringify(s, null, 2)); }

let lastReport: StudyReport | null = null;
try {
  const files = fs.readdirSync(REPORTS_DIR).filter(isReportJson).sort().reverse();
  if (files[0]) lastReport = JSON.parse(fs.readFileSync(path.join(REPORTS_DIR, files[0]), 'utf-8'));
} catch {}

// SRT — hypothesis registry / experiment generator / analysis. Owns the
// judgement layer; persisted under data/srt/.
const srt = new SrtStore();
// World model snapshots (derived view, not a ledger); persisted under data/world/.
const worldStore = new WorldStore();

async function runStudy(study: Study): Promise<StudyReport> {
  const startedAt = new Date().toISOString();
  study.status = 'running';
  ensureLedger();
  const systems = systemsForDomain(study.domain, study.systems);
  // Stage A: literature ingestion + reachability probes
  const stageAResults = await dispatchAll(systems, study);
  // Stage B: real simulation runs per system (inputs REQUIRED from the study
  // spec where the upstream API demands them — the orchestrator never invents
  // defaults; under-supplied systems fail their Stage B with a validation error)
  const stageBResults = await dispatchStageB(systems, study);
  // Stage C: real synthesis runs (mechanism fusion, narratives, debates). Same
  // rules — inputs REQUIRED where the upstream API demands them; never invented.
  const stageCResults = await dispatchStageC(systems, study);
  const results = [...stageAResults, ...stageBResults, ...stageCResults];
  // Phase 1: archive verbatim payloads with integrity hashes BEFORE anything else consumes them
  const rawPayloadRefs = archivePayloads(study.id, results);
  const report = buildReport(study, results, startedAt);
  // Commander layer: harvest contributions + synthesize ONE research spec
  const researchSpec = await synthesizeSpec(study.directive, results, study.title);
  // Phase 2: per-system deterministic claim extraction from Stage B + Stage C
  // structured payloads…
  const systemCandidates = [...stageBResults, ...stageCResults].flatMap(r =>
    extractSystemClaims(r, study.stageBInputs?.[r.systemId]),
  );
  // …then global extraction + deterministic evidence-ref verification
  const claimsResult = await extractAndVerifyClaims(study.directive, researchSpec.contributions, study.id, systemCandidates);
  // SRT: propose hypotheses from this run (question generation). Never
  // preregistered here — a reviewer locks the plan before execution.
  let proposed = 0;
  for (const h of hypothesesFromRun({ studyId: study.id, directive: study.directive, claims: claimsResult.claims })) {
    try { if (srt.upsert(h).created) proposed++; } catch { /* skip malformed */ }
  }
  if (proposed) console.log(`[srt] proposed ${proposed} hypothesis(es) from ${study.id}`);
  // Phase 3: persist the run into Draymond's science_insights fleet trends store
  const trendsPersist = persistRunInsights(study.id, study.directive, claimsResult.claims, study.domain);
  if (!trendsPersist.ok) console.warn('[trends-bridge] persist failed:', trendsPersist.error);
  // Phase 3.5: persist contradiction candidates (heuristic, idempotent) back
  // into the claim store so they are traceable via the claims API.
  const contraPersist = persistContradictions(study.id, claimsResult.claims);
  if (contraPersist.written) console.log(`[trends-bridge] persisted ${contraPersist.written} potential contradiction(s)`);
  study.status = 'done';
  // persist
  const studies = loadStudies();
  const idx = studies.findIndex(s => s.id === study.id);
  if (idx >= 0) studies[idx] = study; else studies.push(study);
  saveStudies(studies);
  const fname = `${report.startedAt.slice(0,10)}-${study.id}.json`;
  // Phase 4: paper assembled FROM the verified claims (never free-form invention)
  // + real-data validation scorecard cited when Overlay Oncology is reachable.
  let validation: any = null;
  try {
    const oncUrl = process.env.ONCOLOGY_URL ?? 'http://localhost:3000';
    const vRes = await fetch(`${oncUrl}/api/validation/scorecard`, { signal: AbortSignal.timeout(120000) });
    if (vRes.ok) {
      const vBody = await vRes.json();
      validation = {
        summary: vBody.summary,
        fittedModel: vBody.fittedModel,
        calibration: vBody.calibration,
      };
    }
  } catch { validation = null; }
  const paper = buildPaper({
    study,
    contributions: researchSpec.contributions,
    claims: claimsResult.claims,
    payloadRefs: rawPayloadRefs,
    finishedAt: report.finishedAt,
    validation,
  });
  // Phase 4b: plain-language companion — same verified claims, jargon removed,
  // plus an honest account of what could not run and why.
  const dispatchProblems = stageBResults
    .filter(r => !r.ok)
    .map(r => ({
      systemId: r.systemId,
      reason: r.validationError
        ? `the study did not supply required inputs (${r.validationError.replace(/^missing required Stage B inputs for [^:]+: /, '').replace(/ — supply them via .*/, '')})`
        : r.error ?? 'the system did not respond',
    }));
  const laymanPaper = buildLaymanPaper({
    study,
    contributions: researchSpec.contributions,
    claims: claimsResult.claims,
    payloadRefs: rawPayloadRefs,
    finishedAt: report.finishedAt,
    dispatchProblems,
  });
  const full = { ...report, researchSpec };
  fs.writeFileSync(path.join(REPORTS_DIR, fname), JSON.stringify(full, null, 2));
  fs.writeFileSync(path.join(REPORTS_DIR, fname.replace('.json','.spec.md')), researchSpec.spec);
  fs.writeFileSync(path.join(REPORTS_DIR, fname.replace('.json','.dispatch.md')), report.summary);
  fs.writeFileSync(path.join(REPORTS_DIR, fname.replace('.json','.claims.json')), JSON.stringify({ runId: study.id, extractor: claimsResult.extractor, claims: claimsResult.claims }, null, 2));
  fs.writeFileSync(path.join(REPORTS_DIR, fname.replace('.json','.paper.md')), paper);
  fs.writeFileSync(path.join(REPORTS_DIR, fname.replace('.json','.layman.md')), laymanPaper);
  lastReport = full;
  // Phase 1: append the run manifest — artifacts hashed from the exact bytes just written
  // (refs are relative to data/ledger/, where verifyRun resolves them)
  const rel = (f: string) => path.join('..', 'reports', f);
  appendRun({
    runId: study.id,
    createdAt: startedAt,
    title: study.title,
    directive: study.directive,
    ingestion: study.ingestion,
    domain: study.domain,
    fleet: results.map(r => {
      const sys = systems.find(s => s.id === r.systemId);
      return { systemId: r.systemId, baseUrl: sys?.baseUrl ?? null, kind: sys?.kind ?? 'unknown', ok: r.ok, latencyMs: r.latencyMs };
    }),
    models: [{ purpose: 'synthesis', provider: researchSpec.synthesizedBy, model: researchSpec.synthesizedBy === 'phoenix' ? (process.env.PHOENIX_SYNTH_MODEL ?? 'glm-5.3-flash') : 'deterministic-assembly' }],
    envHash: nonSecretEnvHash(),
    contributions: researchSpec.contributions,
    rawPayloadRefs,
    artifactRefs: [
      hashArtifact(rel(fname), fs.readFileSync(path.join(REPORTS_DIR, fname), 'utf-8')),
      hashArtifact(rel(fname.replace('.json','.spec.md')), researchSpec.spec),
      hashArtifact(rel(fname.replace('.json','.dispatch.md')), report.summary),
      hashArtifact(rel(fname.replace('.json','.claims.json')), fs.readFileSync(path.join(REPORTS_DIR, fname.replace('.json','.claims.json')), 'utf-8')),
      hashArtifact(rel(fname.replace('.json','.paper.md')), paper),
      hashArtifact(rel(fname.replace('.json','.layman.md')), laymanPaper),
    ],
    claimIds: claimsResult.claims.map(c => c.claimId),
    stages: results.map(r => ({
      stage: r.stage ?? 'probe',
      systemId: r.systemId,
      ok: r.ok,
      evidenceClass: r.evidenceClass,
      validationError: r.validationError,
    })),
    schema: 'run-manifest.v2',
  });
  return full;
}

// Rehydrate cron schedules on boot
for (const s of loadSchedules()) {
  scheduleStudy(s, async () => {
    const study: Study = { id: s.id, title: s.title, query: s.query, domain: s.domain, priority: 'normal', systems: s.systems ?? undefined, directive: s.directive, ingestion: s.ingestion ?? DEFAULT_INGESTION, createdAt: new Date().toISOString(), schedule: s.cron, status: 'queued' };
    try { await runStudy(study); } catch (e) { console.error('[cron] study failed', s.id, e); }
  });
}

const app = express();
app.use(express.json({ limit: '1mb' }));
// Serve the cockpit UI at /
app.use(express.static(path.join(process.cwd(), 'public')));

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'research-orchestrator', registry: REGISTRY.length, lastReport: lastReport ? { studyId: lastReport.studyId, at: lastReport.finishedAt } : null }));

app.get('/api/systems', (_req, res) => {
  res.json(REGISTRY.map(s => ({ id: s.id, name: s.name, domains: s.domains, baseUrl: s.baseUrl, healthPath: s.healthPath, kind: s.kind })));
});

app.get('/api/studies', (_req, res) => res.json(loadStudies()));
app.get('/api/schedules', (_req, res) => res.json(loadSchedules()));

// ── Stage B contract API ──────────────────────────────────────────────────────
app.get('/api/stageb/requirements', (_req, res) => {
  res.json({
    note: 'Stage B simulation systems. Inputs MUST be supplied in study.stageBInputs[systemId] — the orchestrator never invents defaults.',
    systems: STAGE_B_ROSTER.map(s => ({
      id: s.id,
      endpoint: s.endpoint,
      requiredInputs: s.requiredInputs,
      evidenceClass: s.evidenceClass,
      note: s.note,
    })),
  });
});

// ── Stage C contract API ──────────────────────────────────────────────────────
app.get('/api/stagec/requirements', (_req, res) => {
  res.json({
    note: 'Stage C synthesis systems. Inputs MUST be supplied in study.stageCInputs[systemId] — the orchestrator never invents defaults.',
    systems: STAGE_C_ROSTER.map(s => ({
      id: s.id,
      endpoint: s.endpoint,
      method: s.method,
      requiredInputs: s.requiredInputs,
      evidenceClass: s.evidenceClass,
      note: s.note,
    })),
  });
});

// ── Validation status API (credibility audit) ─────────────────────────────────
app.get('/api/validity', (_req, res) => {
  res.json({
    note: 'Source-level credibility audit of each fleet system (see reports/2026-08-31-science-credibility-refutation-audit.md). real = externally validated; self_consistent = correct math, hand-tuned; theater = hardcoded/synthetic presented as results; unvalidated = not audited.',
    systems: listValidity(),
  });
});

// ── Ledger API (Phase 1) ──────────────────────────────────────────────────────
app.get('/api/runs', (_req, res) => {
  const runs = loadRuns();
  res.json({
    count: runs.length,
    runs: runs.map(r => ({
      runId: r.runId, title: r.title, createdAt: r.createdAt, domain: r.domain,
      directive: r.directive, models: r.models, envHash: r.envHash,
      systemsDispatched: r.fleet.length, systemsOk: r.fleet.filter(f => f.ok).length,
      payloadCount: r.rawPayloadRefs.length, artifactCount: r.artifactRefs.length,
      claimCount: r.claimIds.length, schema: r.schema,
    })).reverse(),
  });
});
app.get('/api/runs/:runId', (req, res) => {
  const run = getRun(req.params.runId);
  if (!run) return res.status(404).json({ error: 'run not found' });
  if (req.query.verify === '1') {
    return res.json({ manifest: run, integrity: verifyRun(req.params.runId) });
  }
  res.json(run);
});

// ── Claims API (Phase 2) ──────────────────────────────────────────────────────
app.get('/api/claims', (req, res) => {
  const claims = loadClaims({
    runId: req.query.runId as string | undefined,
    kind: req.query.kind as string | undefined,
    verified: req.query.verified === 'true' ? true : req.query.verified === 'false' ? false : undefined,
  });
  res.json({
    count: claims.length,
    verified: claims.filter(c => c.verified).length,
    quarantined: claims.filter(c => !c.verified).length,
    claims: claims.reverse(),
  });
});
app.get('/api/claims/:claimId/chain', (req, res) => {
  const chain = claimChain(req.params.claimId);
  if (!chain) return res.status(404).json({ error: 'claim not found' });
  res.json(chain);
});

// ── Trends API (Phase 3 — Draymond science_insights store) ───────────────────
app.get('/api/trends', (req, res) => {
  const source = typeof req.query.source === 'string' && req.query.source ? req.query.source : undefined;
  res.json(analyzeTrends(source));
});
// Fleet-wide overview: honest PER-SOURCE breakdown (sources use different
// metric schemas; trends are never blended into one line).
app.get('/api/trends/fleet', (_req, res) => {
  res.json(fleetOverview());
});
// Raw fleet insights feed (all sources), newest first.
app.get('/api/insights', (req, res) => {
  const limit = typeof req.query.limit === 'string' ? Number(req.query.limit) : undefined;
  res.json({ count: (readFleetInsights(null, limit) ?? []).length, insights: readFleetInsights(null, limit) });
});
app.get('/api/reports', (_req, res) => {
  const files = fs.readdirSync(REPORTS_DIR).filter(isReportJson).sort().reverse().slice(0, 50);
  const metas = files.map(f => {
    try {
      const j = JSON.parse(fs.readFileSync(path.join(REPORTS_DIR, f), 'utf-8')) as StudyReport;
      return {
        file: f, studyId: j.studyId, title: j.title, domain: j.domain, finishedAt: j.finishedAt,
        ok: j.results.filter(r=>r.ok).length, total: j.results.length,
        synthesizedBy: j.researchSpec?.synthesizedBy ?? 'legacy',
        objective: j.researchSpec?.directive?.objective ?? '',
      };
    } catch { return { file: f, error: 'unreadable' }; }
  });
  res.json({ reports: metas, lastReport });
});
app.get('/api/reports/:id', (req, res) => {
  const id = req.params.id;
  const files = fs.readdirSync(REPORTS_DIR).filter(f => f.includes(id) && isReportJson(f));
  if (!files.length) return res.status(404).json({ error: 'report not found' });
  const j = JSON.parse(fs.readFileSync(path.join(REPORTS_DIR, files[0]), 'utf-8')) as StudyReport;
  const base = files[0].replace('.json','');
  if (req.query.format === 'md') {
    // spec is the primary artifact; dispatch log is secondary
    const specPath = path.join(REPORTS_DIR, `${base}.spec.md`);
    const mdPath = path.join(REPORTS_DIR, `${base}.dispatch.md`);
    const p = fs.existsSync(specPath) ? specPath : mdPath;
    if (!fs.existsSync(p)) return res.status(404).json({ error: 'markdown not found' });
    res.type('text/markdown').send(fs.readFileSync(p, 'utf-8'));
    return;
  }
  if (req.query.format === 'dispatch') {
    const mdPath = path.join(REPORTS_DIR, `${base}.dispatch.md`);
    if (!fs.existsSync(mdPath)) return res.status(404).json({ error: 'dispatch log not found' });
    res.type('text/markdown').send(fs.readFileSync(mdPath, 'utf-8'));
    return;
  }
  if (req.query.format === 'paper' || req.query.format === 'layman') {
    const suffix = req.query.format === 'paper' ? 'paper' : 'layman';
    const p = path.join(REPORTS_DIR, `${base}.${suffix}.md`);
    if (!fs.existsSync(p)) return res.status(404).json({ error: `${suffix} paper not found — runs before the staged pipeline may not have one` });
    res.type('text/markdown').send(fs.readFileSync(p, 'utf-8'));
    return;
  }
  res.json(j);
});

const directiveSchema = z.object({
  objective: z.string().min(10).max(2000),
  hypothesis: z.string().max(2000).nullable().optional(),
  questions: z.array(z.string().min(3).max(500)).max(12).default([]),
  direction: z.enum(['exploratory','confirmatory','therapeutic-design','mechanism-mapping','evidence-review']).default('exploratory'),
  contextNotes: z.string().max(2000).nullable().optional(),
});

const ingestionSchema = z.object({
  sources: z.array(z.string()).default(DEFAULT_INGESTION.sources),
  pageSize: z.number().int().min(1).max(100).default(DEFAULT_INGESTION.pageSize),
  dateFrom: z.string().nullable().optional(),
  dateTo: z.string().nullable().optional(),
  confidenceThreshold: z.number().min(0).max(1).default(DEFAULT_INGESTION.confidenceThreshold),
  dedup: z.boolean().default(DEFAULT_INGESTION.dedup),
  maxPapers: z.number().int().min(1).max(200).default(DEFAULT_INGESTION.maxPapers),
  includePreprints: z.boolean().default(DEFAULT_INGESTION.includePreprints),
  evidenceFilter: z.string().nullable().optional(),
});

const studySchema = z.object({
  title: z.string().min(3).max(200).default('Ad-hoc research study'),
  query: z.string().min(3).max(1000),
  domain: z.string().min(2).max(64).default('all'),
  systems: z.array(z.string()).optional(),
  priority: z.enum(['low','normal','high']).default('normal'),
  directive: directiveSchema,
  ingestion: ingestionSchema.optional(),
  // Stage B simulation inputs keyed by SystemId — REQUIRED for systems whose
  // upstream APIs demand structured inputs (GET /api/stageb/requirements).
  stageBInputs: z.record(z.string(), z.record(z.string(), z.unknown())).optional(),
  // Stage C synthesis inputs keyed by SystemId (GET /api/stagec/requirements).
  stageCInputs: z.record(z.string(), z.record(z.string(), z.unknown())).optional(),
});

function makeStudy(data: z.infer<typeof studySchema>): Study {
  return {
    id: `study_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    title: data.title,
    query: data.query,
    domain: data.domain,
    priority: data.priority,
    systems: data.systems as SystemId[] | undefined,
    directive: data.directive,
    ingestion: { ...DEFAULT_INGESTION, ...(data.ingestion ?? {}) } as Study['ingestion'],
    stageBInputs: data.stageBInputs as Study['stageBInputs'],
    stageCInputs: data.stageCInputs as Study['stageCInputs'],
    createdAt: new Date().toISOString(),
    schedule: null,
    status: 'queued',
  };
}

app.post('/api/study', async (req, res) => {
  const parsed = studySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid study', details: parsed.error.flatten() });
  const study: Study = makeStudy(parsed.data);
  // run inline and return the report
  try {
    const report = await runStudy(study);
    res.json(report);
  } catch (e: any) {
    study.status = 'failed';
    const studies = loadStudies(); studies.push(study); saveStudies(studies);
    res.status(500).json({ error: e?.message ?? String(e), study });
  }
});

const scheduleSchema = z.object({
  cron: z.string().min(5),
  title: z.string().min(3).max(200),
  query: z.string().min(3).max(1000),
  domain: z.string().min(2).max(64).default('all'),
  systems: z.array(z.string()).optional(),
  directive: directiveSchema,
  ingestion: ingestionSchema.optional(),
  stageBInputs: z.record(z.string(), z.record(z.string(), z.unknown())).optional(),
  stageCInputs: z.record(z.string(), z.record(z.string(), z.unknown())).optional(),
});

app.post('/api/schedule', (req, res) => {
  const parsed = scheduleSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid schedule', details: parsed.error.flatten() });
  const id = `sched_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,6)}`;
  const sched = { id, cron: parsed.data.cron, title: parsed.data.title, query: parsed.data.query, domain: parsed.data.domain, systems: parsed.data.systems, directive: parsed.data.directive, ingestion: { ...DEFAULT_INGESTION, ...(parsed.data.ingestion ?? {}) }, stageBInputs: parsed.data.stageBInputs, stageCInputs: parsed.data.stageCInputs };
  // validate cron
  try { scheduleStudy(sched, async () => {
    const study: Study = { id, title: sched.title, query: sched.query, domain: sched.domain, priority: 'normal', systems: sched.systems as any, directive: sched.directive, ingestion: sched.ingestion as any, stageBInputs: sched.stageBInputs, stageCInputs: sched.stageCInputs, createdAt: new Date().toISOString(), schedule: sched.cron, status: 'queued' };
    await runStudy(study);
  }); } catch (e: any) { return res.status(400).json({ error: `invalid cron: ${e.message}` }); }
  const all = loadSchedules(); all.push(sched); saveSchedules(all);
  res.json({ ok: true, schedule: sched });
});

app.delete('/api/schedule/:id', (req, res) => {
  const ok = unscheduleStudy(req.params.id);
  const all = loadSchedules().filter((s:any) => s.id !== req.params.id);
  saveSchedules(all);
  res.json({ ok, removed: req.params.id });
});

// ── Validation proxy (credibility surface) ───────────────────────────────────
// Pulls the real-data validation scorecard from Overlay Oncology so the
// orchestrator's research reports can cite actual concordance numbers. Fail-soft:
// if oncology is offline, returns a clear unavailable instead of fabricating.
app.get('/api/validation', async (_req, res) => {
  const oncologyUrl = process.env.ONCOLOGY_URL ?? 'http://localhost:3000';
  try {
    const r = await fetch(`${oncologyUrl}/api/validation/scorecard`, { signal: AbortSignal.timeout(120000) });
    if (!r.ok) throw new Error(`oncology scorecard HTTP ${r.status}`);
    const body = await r.json();
    res.json({ proxiedFrom: oncologyUrl, ...body });
  } catch (e: any) {
    res.status(503).json({
      status: 'unavailable',
      error: `Could not reach Overlay Oncology validation scorecard: ${e?.message ?? String(e)}`,
      summary: 'No real-data validation score available — start Overlay Oncology and retry.',
    });
  }
});

// ── SRT API (judgement layer) ────────────────────────────────────────────────
// Hypothesis registry + experiment generator + analysis. All logic lives in the
// unit-tested modules under src/srt/; these handlers are thin.
const hypothesisSchema = z.object({
  title: z.string().min(3).max(300),
  mechanism: z.string().max(4000).optional(),
  calibratedConfidence: z.number().min(0).max(1).optional(),
  evidenceTier: z.number().min(0).max(5).optional(),
  noveltyScore: z.number().min(0).max(100).optional(),
  sourceStudyId: z.string().max(200).optional(),
  sourceClaimIds: z.array(z.string()).optional(),
  checkNovelty: z.boolean().optional(),
});
const preregSchema = z.object({
  dataPlan: z.string().min(5),
  analysisPlan: z.string().min(5),
  holdout: z.string().min(3),
  primaryOutcome: z.string().min(2),
  successCriterion: z.string().min(3),
  falsifier: z.string().min(3),
});
const criterionSchema = z.object({
  metricName: z.string().min(1),
  comparator: z.enum(['>=', '<=', 'approx']),
  threshold: z.number(),
  tolerance: z.number().optional(),
});
const runResultSchema = z.object({
  runId: z.string().min(1),
  systemId: z.string().optional(),
  ok: z.boolean(),
  metricName: z.string().min(1),
  metric: z.number(),
  n: z.number().optional(),
  ciLo: z.number().optional(),
  ciHi: z.number().optional(),
  pValue: z.number().optional(),
});
const debateSchema = z.object({
  topic: z.string().min(3).max(1000),
  materials: z.string().max(20000).optional(),
  numAgents: z.number().int().min(2).max(12).optional(),
  rounds: z.number().int().min(1).max(5).optional(),
  modelEngine: z.enum(['gemini', 'llama', 'openai']).optional(),
  register: z.boolean().optional(),
  studyId: z.string().optional(),
});

app.get('/api/hypotheses', (req, res) => {
  const status = typeof req.query.status === 'string' ? (req.query.status as HypothesisStatus) : undefined;
  res.json({ count: srt.list(status ? { status } : {}).length, hypotheses: srt.list(status ? { status } : {}) });
});

app.post('/api/hypotheses', (req, res) => {
  const parsed = hypothesisSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid hypothesis', details: parsed.error.flatten() });
  const { checkNovelty = true, ...input } = parsed.data;
  try {
    const nearDuplicates = checkNovelty === false ? [] : findNearDuplicates(srt.readRegistry(), input);
    const { hypothesis, created } = srt.upsert(input);
    res.json({ hypothesis, created, nearDuplicates });
  } catch (e: any) {
    res.status(400).json({ error: e?.message ?? String(e) });
  }
});

// Static paths declared before the /:id param route.
app.get('/api/hypotheses/null-ledger', (_req, res) => {
  res.json({ count: srt.nullLedger().length, falsifiedOrNull: srt.nullLedger() });
});
app.get('/api/srt/runs', (req, res) => {
  const hypothesisId = typeof req.query.hypothesisId === 'string' ? req.query.hypothesisId : undefined;
  res.json({ runs: srt.listRuns(hypothesisId) });
});

app.post('/api/debate', async (req, res) => {
  const parsed = debateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid debate', details: parsed.error.flatten() });
  const { topic, materials, numAgents, rounds, modelEngine, register, studyId } = parsed.data;
  const outcome = await runDebate({ topic, materials, numAgents, rounds, modelEngine });
  const candidates = dossierCandidates(outcome.dossier);
  let registered: string[] = [];
  if (register && outcome.ok) {
    registered = dossierToHypotheses(outcome.dossier, { studyId })
      .map((h) => { try { return srt.upsert(h).hypothesis.id; } catch { return null; } })
      .filter((x): x is string => Boolean(x));
  }
  res.json({ ok: outcome.ok, error: outcome.error, agents: outcome.agents.length, candidateCount: candidates.length, candidates, registered, dossier: outcome.dossier });
});

app.get('/api/hypotheses/:id', (req, res) => {
  const h = srt.get(req.params.id);
  if (!h) return res.status(404).json({ error: 'hypothesis not found' });
  res.json({ hypothesis: h, runs: srt.listRuns(req.params.id) });
});

app.post('/api/hypotheses/:id/preregister', (req, res) => {
  const parsed = preregSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid preregistration', details: parsed.error.flatten() });
  try {
    res.json({ hypothesis: srt.preregister(req.params.id, parsed.data) });
  } catch (e: any) {
    res.status(409).json({ error: e?.message ?? String(e) });
  }
});

app.post('/api/hypotheses/:id/experiment', (req, res) => {
  const h = srt.get(req.params.id);
  if (!h) return res.status(404).json({ error: 'hypothesis not found' });
  if (!h.preregistration) return res.status(409).json({ error: 'hypothesis must be preregistered before an experiment is generated' });
  const card = buildRunCard(h, h.preregistration);
  srt.addRunCard(card);
  res.json({ runCard: card });
});

app.post('/api/hypotheses/:id/analysis', (req, res) => {
  const body = z.object({ result: runResultSchema, criterion: criterionSchema, weight: z.number().optional() }).safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: 'invalid analysis', details: body.error.flatten() });
  try {
    const outcome = applyRunToHypothesis(srt.readRegistry(), req.params.id, body.data.result as RunResult, body.data.criterion as Criterion, { weight: body.data.weight });
    srt.applyDoc(outcome.doc);
    res.json({ verdict: outcome.verdict, confidenceBefore: outcome.confidenceBefore, confidenceAfter: outcome.confidenceAfter, hypothesis: outcome.hypothesis });
  } catch (e: any) {
    res.status(400).json({ error: e?.message ?? String(e) });
  }
});

// ── Kaggle lane ──────────────────────────────────────────────────────────────
// L2 MCP (config + surface), L3 Benchmarks (task builder + leaderboard), L1/L6
// compute via Recourse. All logic is in src/kaggle/; these handlers are thin.
const kaggleBenchmarkTaskSchema = z.object({
  name: z.string().min(3).max(120),
  prompt: z.string().min(3).max(4000),
  regex: z.string().min(1).max(500),
  expectation: z.string().max(500).optional(),
});
const kaggleSubmitSchema = z.object({
  cells: z.array(z.object({ type: z.enum(['code', 'markdown']), source: z.string() })).min(1),
  hardware: z.enum(['gpu', 'cpu', 'tpu']).optional(),
  maxRuntimeMs: z.number().int().positive().optional(),
  datasetSources: z.array(z.string()).optional(),
  kernel: z.string().optional(),
});

app.get('/api/kaggle/status', async (_req, res) => {
  const creds = resolveKaggleCredentials();
  const compute = await fetchComputePlatforms();
  res.json({
    credentials: kaggleCredentialsStatus(creds),
    mcpUrl: KAGGLE_MCP_URL,
    mcpToolCount: kaggleMcpToolCount(),
    mcp: kaggleMcpConfig(creds),
    compute,
  });
});

app.post('/api/kaggle/benchmark/task', (req, res) => {
  const parsed = kaggleBenchmarkTaskSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid benchmark task', details: parsed.error.flatten() });
  res.json(buildCriterionBenchmarkTask(parsed.data));
});

app.get('/api/kaggle/benchmark/leaderboard', async (req, res) => {
  const owner = String(req.query.owner ?? '');
  const slug = String(req.query.slug ?? '');
  if (!owner || !slug) return res.status(400).json({ error: 'owner and slug query params are required' });
  const version = req.query.version !== undefined ? Number(req.query.version) : undefined;
  const result = await fetchBenchmarkLeaderboard(owner, slug, { creds: resolveKaggleCredentials(), version });
  res.status(result.ok ? 200 : 502).json(result);
});

app.post('/api/kaggle/submit', async (req, res) => {
  const parsed = kaggleSubmitSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid submission', details: parsed.error.flatten() });
  const job = buildKaggleNotebookJob(
    parsed.data.cells as Array<{ type: 'code' | 'markdown'; source: string }>,
    { hardware: parsed.data.hardware, maxRuntimeMs: parsed.data.maxRuntimeMs, datasetSources: parsed.data.datasetSources, kernel: parsed.data.kernel },
  );
  // Gate: never submit a notebook that fails the envelope/secret checks.
  const gate = verifyNotebook(job.payload.cells, { requireEnvelope: true });
  if (!gate.ok) return res.status(422).json({ error: 'notebook failed the submission gate', gate, job });
  const out = await submitNotebookJob(job);
  res.status(out.available ? 200 : 503).json({ ...out, job, gate });
});

// ── Notebook gate + benchmark notebook ───────────────────────────────────────
const kaggleVerifySchema = z.object({
  cells: z.array(z.object({ type: z.string().optional(), source: z.union([z.string(), z.array(z.string())]) })).min(1),
  requireEnvelope: z.boolean().optional(),
});

app.post('/api/kaggle/verify', (req, res) => {
  const parsed = kaggleVerifySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid notebook', details: parsed.error.flatten() });
  res.json(verifyNotebook(parsed.data.cells, { requireEnvelope: parsed.data.requireEnvelope }));
});

app.get('/api/kaggle/benchmark/notebook', (req, res) => {
  const name = String(req.query.name ?? '');
  const prompt = String(req.query.prompt ?? '');
  const regex = String(req.query.regex ?? '');
  if (!name || !prompt || !regex) return res.status(400).json({ error: 'name, prompt and regex query params are required' });
  const expectation = req.query.expectation ? String(req.query.expectation) : undefined;
  const owner = req.query.owner ? String(req.query.owner) : 'owner';
  const slug = req.query.slug ? String(req.query.slug) : 'benchmark';
  res.json({
    notebook: buildBenchmarkNotebook({ name, prompt, regex, ...(expectation ? { expectation } : {}) }),
    pushPlan: benchmarkPushPlan(owner, slug),
  });
});

// ── World model + team orchestrator (Phase 1) ────────────────────────────────
// Assemble what a study produced into a world model, query it for the next
// tasks, and mint run cards for preregistered hypotheses. Pure logic is in
// world/model.ts + team.ts; these handlers read the persisted artifacts.
function loadReportById(id: string): (StudyReport & { researchSpec?: ResearchSpec }) | null {
  try {
    const files = fs.readdirSync(REPORTS_DIR).filter((f) => f.includes(id) && isReportJson(f));
    if (!files[0]) return null;
    return JSON.parse(fs.readFileSync(path.join(REPORTS_DIR, files[0]), 'utf-8'));
  } catch {
    return null;
  }
}

function planFromReport(report: StudyReport & { researchSpec?: ResearchSpec }) {
  const contributions = report.researchSpec?.contributions ?? [];
  const hypotheses = srt.list().filter((h) => h.sourceStudyId === report.studyId || !h.sourceStudyId);
  const plan = buildTeamPlan({
    studyId: report.studyId,
    directive: report.directive,
    contributions,
    claims: loadClaims({ runId: report.studyId }),
    hypotheses,
    runs: srt.listRuns(),
  });
  worldStore.save(plan.worldModel);
  return plan;
}

app.get('/api/world', (_req, res) => res.json({ worlds: worldStore.list() }));

app.get('/api/world/:studyId', (req, res) => {
  const m = worldStore.load(req.params.studyId);
  if (!m) return res.status(404).json({ error: 'world model not found' });
  res.json(m);
});

// ── Phase 4: autonomous cadence + provenance spine; Phase 3: promotion gate ──

app.get('/api/cadence', (_req, res) => {
  const doc = srt.readRegistry();
  res.json({ steps: buildCadence({ hypotheses: doc.hypotheses.map((h) => ({ id: h.id, status: h.status })) }) });
});

app.post('/api/cadence/run', (req, res) => {
  const maxCycles = Number(req.body?.maxCycles ?? 3);
  const doc = srt.readRegistry();
  const runs = srt.listRuns();
  const report = runCadenceLoop({ hypotheses: doc.hypotheses, runs, maxCycles });
  if (report.mintedRunCards.length) srt.writeRuns([...runs, ...report.mintedRunCards]);
  res.json({
    stoppedBecause: report.stoppedBecause,
    cycles: report.cycles.length,
    minted: report.mintedRunCards.length,
    mintedRunCards: report.mintedRunCards,
    deferred: report.cycles[0]?.deferred ?? [],
  });
});

app.post('/api/promotion/evaluate', async (req, res) => {
  const b = req.body ?? {};
  if (!b.hypothesisId) return res.status(400).json({ error: 'hypothesisId is required' });
  const verdict = await evaluatePromotion(
    {
      hypothesisId: String(b.hypothesisId),
      preregistered: b.preregistered === true,
      claimsResolved: { total: Number(b.claimsTotal ?? 0), unresolved: Number(b.claimsUnresolved ?? 0) },
      negativeControlPresent: b.negativeControlPresent === true,
      evidenceTier: Number(b.evidenceTier ?? 0),
      generatedCode: typeof b.generatedCode === 'string' ? b.generatedCode : undefined,
    },
    { reverifyCode: (code) => reverifyGeneratedCode({ code }), openhubAudit: (findings) => runOpenHubGate(findings) },
  );
  res.json(verdict);
});

app.get('/api/provenance/:runId', (req, res) => {
  const run = getRun(req.params.runId);
  if (!run) return res.status(404).json({ error: 'run not found' });
  const entities = [
    ...run.rawPayloadRefs.map((r) => ({ role: 'input' as const, id: r.systemId, sha256: r.sha256 })),
    ...run.artifactRefs.map((r) => ({ role: r.kind === 'paper' ? ('paper' as const) : ('output' as const), id: r.file, sha256: r.sha256 })),
  ];
  res.json(buildProvenanceSpine({ runId: run.runId, entities }));
});

app.post('/api/provenance/anchor', (req, res) => {
  const hash = typeof req.body?.hash === 'string' ? req.body.hash : '';
  // 400 for a malformed request, 502 for a dependency failure. A bad digest is the
  // caller's error, not an upstream outage.
  if (!hash) return res.status(400).json({ error: 'hash is required' });
  if (!isSha256Hex(hash)) return res.status(400).json({ error: 'hash must be a 64-char lowercase sha256 hex' });
  // Real RFC-3161 stamp + verify against the ecosystem's one engine
  // (platform/scripts/engines/tsa_prove.py). 502 when the TSA or engine refuses,
  // so a caller can never read a refusal as a success.
  const anchor = anchorTimestamp(hash);
  res.status(anchor.anchored ? 200 : 502).json(anchor);
});

app.post('/api/team/plan', (req, res) => {
  const studyId = typeof req.body?.studyId === 'string' ? req.body.studyId : '';
  if (!studyId) return res.status(400).json({ error: 'studyId is required' });
  const report = loadReportById(studyId);
  if (!report) return res.status(404).json({ error: 'report not found for studyId' });
  const plan = planFromReport(report);
  res.json({ ...plan, summary: planSummary(plan) });
});

app.post('/api/team/run', async (req, res) => {
  const parsed = studySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid study', details: parsed.error.flatten() });
  const study = makeStudy(parsed.data);
  try {
    const report = await runStudy(study);
    const plan = planFromReport(report as StudyReport & { researchSpec?: ResearchSpec });
    for (const card of plan.runCards) srt.addRunCard(card);
    res.json({
      report: { studyId: report.studyId, title: report.title, systemsDispatched: report.systemsDispatched, finishedAt: report.finishedAt },
      plan: { ...plan, summary: planSummary(plan) },
    });
  } catch (e: any) {
    study.status = 'failed';
    const studies = loadStudies(); studies.push(study); saveStudies(studies);
    res.status(500).json({ error: e?.message ?? String(e) });
  }
});

app.listen(PORT, () => {
  console.log(`[research-orchestrator] listening on :${PORT} — registry ${REGISTRY.length} systems`);
  console.log(`[research-orchestrator] POST /api/study { title, query, domain, systems? } — run now`);
  console.log(`[research-orchestrator] POST /api/schedule { cron, title, query, domain } — e.g. { cron: "0 2 * * *", domain: "all" }`);
});
