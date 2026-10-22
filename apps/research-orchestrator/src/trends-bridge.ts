import Database from 'better-sqlite3';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { Claim, EvidenceRef, ResearchDirective, ValidationClass } from './types.js';
import { appendClaims, getClaim, loadClaims } from './claims.js';

// ── Trends bridge (Phase 3) ──────────────────────────────────────────────────
// The fleet's ONE trends/insights store is Draymond's `science_insights` table
// in draymond.db (src/lib/science/trendsFeed.ts conventions). This module
// writes each orchestrator run into that same store and ports the
// research-grade.ts trend classification (rising/stable/falling,
// trend/discovery/optimization insights). No second engine is invented.
//
// 2026-09-01 upgrade — four additions:
//   1. Credibility axis: each run now persists per-claim validationStatus plus
//      per-run credibility metrics (theater/real/self-consistent/unvalidated
//      counts and a credible_verified_ratio), so trends reflect how much the
//      evidence is TRUSTWORTHY (source audited real/self-consistent) and not
//      only whether refs resolve (verified). Theater sources are never blended
//      into a credible ratio.
//   2. Phase 3.5 contradiction detection: deterministic heuristic pairing of
//      opposing claims that share an evidence ref; each pair is written back
//      into the claim store as a low-confidence "POTENTIAL CONTRADICTION"
//      claim referencing both sources (never presented as confirmed).
//   3. Fleet-wide view: per-source breakdown. The store is HETEROGENEOUS —
//      bbtech (sports), oncology (validation scorecard), research-orchestrator
//      (claims-credibility) use different metric vocabularies, so a single
//      blended trend line would be theater. Trends are computed per source only
//      where >=3 runs share a metric schema, and this is stated honestly.
//   4. Unit tests (trends-bridge.test.ts) for classifyTrend, credibility
//      metrics, contradiction detection and the minimum-data gate.

const DRAYMOND_DB = process.env.DRAYMOND_DB_PATH
  ?? path.resolve(process.cwd(), '..', '..', '..', 'Draymond-Orchestrator', 'data', 'draymond.db');

const SOURCE = 'research-orchestrator';
const TIERS = new Set(['E1', 'E2', 'E3', 'E4']);
const CREDIBLE: ReadonlySet<ValidationClass> = new Set(['real', 'self_consistent']);

export type GradeTrend = 'rising' | 'stable' | 'falling';
export interface RunInsight {
  type: 'trend' | 'discovery' | 'optimization' | 'contradiction';
  runId: string;
  impact: number; // 0-100
  detail: string;
  claimRefs: string[];
}

// ── Credibility ───────────────────────────────────────────────────────────────
// A claim is "credible" as a source when it is grounded in a real published
// paper (literature) or in a system whose outputs were audited real or
// self-consistent. Theater and unvalidated sources are explicitly NOT credible.

export function isCredibleClaim(c: Pick<Claim, 'evidenceClass' | 'validationStatus'>): boolean {
  if (c.evidenceClass === 'literature') return true;
  return CREDIBLE.has(c.validationStatus ?? 'unvalidated');
}

function openDb(): Database.Database {
  if (!fs.existsSync(DRAYMOND_DB)) {
    throw new Error(`draymond.db not found at ${DRAYMOND_DB} — set DRAYMOND_DB_PATH`);
  }
  // WAL mode on the Draymond side makes multi-process access safe.
  const db = new Database(DRAYMOND_DB);
  db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 3000');
  return db;
}

// ── Persist one run into the fleet trends store ─────────────────────────────
// Follows persistInsightReport conventions: InsightReport-shaped payload,
// deterministic si_ id, idempotent upsert on (source, session_id, generated_at).

export interface PersistRunResult {
  ok: boolean;
  id?: string;
  duplicate?: boolean;
  error?: string;
}

export function persistRunInsights(
  runId: string,
  directive: ResearchDirective,
  claims: Claim[],
  domain: string,
): PersistRunResult {
  const verified = claims.filter(c => c.verified);
  const quarantined = claims.filter(c => !c.verified);
  const credibleVerified = verified.filter(isCredibleClaim);
  // E3 rule-based default (metadata-tier evidence): E1 requires experimentally
  // supported/refuted hypothesis status, which the claim store does not assert.
  const tier = 'E3';
  const meanConfidence = verified.length
    ? verified.reduce((s, c) => s + c.confidence, 0) / verified.length
    : 0;
  const countOf = (status: ValidationClass | undefined): number =>
    claims.filter(c => c.validationStatus === status).length;
  // Claims with no validationStatus that are NOT literature are unvalidated.
  const unvalidated = countOf('unvalidated') + claims.filter(
    c => !c.validationStatus && c.evidenceClass !== 'literature',
  ).length;

  const report = {
    from_domain: domain,
    to_domain: 'research-command',
    translated_metrics: [
      { name: 'claims_total', value: claims.length },
      { name: 'claims_verified', value: verified.length },
      { name: 'claims_quarantined', value: quarantined.length },
      { name: 'verified_ratio', value: claims.length ? +(verified.length / claims.length).toFixed(3) : 0 },
      { name: 'mean_confidence', value: +meanConfidence.toFixed(3) },
      { name: 'hypothesis_claims', value: claims.filter(c => c.kind === 'hypothesis').length },
      { name: 'gap_claims', value: claims.filter(c => c.kind === 'gap').length },
      // Credibility axis (upgrade): how much of the evidence is TRUSTWORTHY.
      { name: 'real_claims', value: countOf('real') },
      { name: 'self_consistent_claims', value: countOf('self_consistent') },
      { name: 'theater_claims', value: countOf('theater') },
      { name: 'unvalidated_claims', value: unvalidated },
      { name: 'credible_verified_ratio', value: claims.length ? +(credibleVerified.length / claims.length).toFixed(3) : 0 },
    ],
    confidence: +meanConfidence.toFixed(3),
    evidence_tier: tier,
    run_id: runId,
    objective: directive.objective.slice(0, 300),
    direction: directive.direction,
    claims: claims.map(c => ({
      claimId: c.claimId, kind: c.kind, verified: c.verified,
      confidence: c.confidence, text: c.text.slice(0, 300),
      validationStatus: c.validationStatus ?? null, evidenceClass: c.evidenceClass,
    })),
  };

  try {
    const db = openDb();
    try {
      // Table may not exist if Draymond has never booted against this file.
      const exists = db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='science_insights'").get();
      if (!exists) return { ok: false, error: 'science_insights table missing — boot Draymond once to create schema' };

      const generatedAt = new Date().toISOString();
      const id = `si_${createHash('sha256').update(`${SOURCE}:${runId}:${generatedAt}`).digest('hex').slice(0, 24)}`;
      const now = new Date().toISOString();
      const existing = db.prepare(
        'SELECT id FROM science_insights WHERE source = ? AND session_id = ? AND generated_at = ?',
      ).get(SOURCE, runId, generatedAt) as { id: string } | undefined;
      if (existing) {
        db.prepare('UPDATE science_insights SET domain = ?, report = ?, evidence_tier = ?, updated_at = ? WHERE id = ?')
          .run(domain, JSON.stringify(report), tier, now, existing.id);
        return { ok: true, id: existing.id, duplicate: true };
      }
      db.prepare(
        `INSERT INTO science_insights (id, source, session_id, domain, report, evidence_tier, generated_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(id, SOURCE, runId, domain, JSON.stringify(report), tier, generatedAt, now, now);
      return { ok: true, id, duplicate: false };
    } finally {
      db.close();
    }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ── Trend classification (ported from research-grade.ts) ────────────────────

export function classifyTrend(history: number[]): GradeTrend {
  if (history.length < 2) return 'stable';
  const delta = history[history.length - 1] - history[0];
  if (delta > 0.1) return 'rising';   // verified_ratio scale 0-1
  if (delta < -0.1) return 'falling';
  return 'stable';
}

// source === null reads ALL sources (fleet-wide); a string filters to one source.
export function readFleetInsights(source: string | null = SOURCE, limit = 50): Array<Record<string, unknown>> {
  try {
    const db = openDb();
    try {
      const exists = db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='science_insights'").get();
      if (!exists) return [];
      const cap = Math.max(1, Math.min(1000, limit));
      const rows = source === null
        ? db.prepare('SELECT * FROM science_insights ORDER BY generated_at DESC LIMIT ?').all(cap)
        : db.prepare('SELECT * FROM science_insights WHERE source = ? ORDER BY generated_at DESC LIMIT ?').all(source, cap);
      return (rows as Array<Record<string, unknown>>).map(r => ({
        ...r,
        report: (() => { try { return JSON.parse(String(r.report)); } catch { return {}; } })(),
      }));
    } finally {
      db.close();
    }
  } catch {
    return [];
  }
}

// ── Cross-run insights ───────────────────────────────────────────────────────
// Same insight grammar as research-grade.buildInsights: trend (score delta),
// discovery (frontier candidate), optimization (high-novelty low-evidence).
// Minimum-data rule: <3 runs returns insufficient_data instead of noise.

export interface TrendsResult {
  ok: boolean;
  source: string;
  runsAnalyzed: number;
  insufficientData?: boolean;
  reason?: string;
  trends: { metric: string; history: number[]; classification: GradeTrend }[];
  insights: RunInsight[];
  contradictions: Contradiction[];
}

function metricValue(rep: any, name: string): number {
  return rawMetric(rep, name) ?? 0;
}

// The fleet store is schema-heterogeneous: research-orchestrator rows carry
// metrics as {name, value}, while bbtech InsightReports carry translated
// metrics as {metric, source_value}. Extract the name/value from either shape.
function metricName(m: any): string | null {
  const n = m?.name ?? m?.metric;
  return typeof n === 'string' && n ? n : null;
}
function metricNumber(m: any): number | null {
  const v = m?.value ?? m?.source_value ?? m?.target_value;
  return typeof v === 'number' && isFinite(v) ? v : null;
}

// Real (non-defaulted) numeric value of a named metric, or null when the run
// does not carry that metric at all. Distinguishes "absent" from a genuine 0.
function rawMetric(rep: any, name: string): number | null {
  if (rep && Array.isArray(rep.translated_metrics)) {
    const m = rep.translated_metrics.find((x: any) => metricName(x) === name);
    const v = metricNumber(m);
    return v === null ? null : v;
  }
  return null;
}

// Names of all metrics a report carries, regardless of shape.
function metricNamesOf(rep: any): string[] {
  if (!rep || !Array.isArray(rep.translated_metrics)) return [];
  const names: Array<string | null> = (rep.translated_metrics as any[]).map((m: any) => metricName(m));
  return [...new Set(names.filter((n): n is string => typeof n === 'string'))];
}

export function analyzeTrends(source: string = SOURCE): TrendsResult {
  const rows = readFleetInsights(source, 1000);
  const runs = rows
    .map(r => r.report as any)
    .filter(rep => rep && Array.isArray(rep.translated_metrics) && rep.translated_metrics.length > 0)
    .sort((a, b) => String(a.run_id).localeCompare(String(b.run_id)));

  if (runs.length < 3) {
    return {
      ok: true,
      source,
      runsAnalyzed: runs.length,
      insufficientData: true,
      reason: `only ${runs.length} run(s) in the trends store for source "${source}" — need >=3 for trend classification`,
      trends: [],
      insights: [],
      contradictions: [],
    };
  }

  // Schema-agnostic trend lines: any numeric metric present in >=3 runs of this
  // source gets a history + classification. This makes heterogeneous fleet
  // sources (bbtech's ter/proliferation/injury_risk, research-orchestrator's
  // claims-credibility metrics) trendable without inventing a common schema.
  const metricNames = [...new Set(runs.flatMap(metricNamesOf))];
  const trends = metricNames
    .map(name => ({ name, values: runs.map(r => rawMetric(r, name)) }))
    .filter(({ values }) => values.filter(v => v !== null).length >= 3)
    .map(({ name, values }) => ({
      metric: name,
      history: values.map(v => v ?? 0),
      classification: classifyTrend(values.map(v => v ?? 0)),
    }));

  const insights: RunInsight[] = [];
  const latest = runs[runs.length - 1];
  const prev = runs[runs.length - 2];
  const has = (n: string) => metricNames.includes(n);

  // trend: verified_ratio movement between the two most recent runs
  if (has('verified_ratio')) {
    const ratio = (rep: any) => metricValue(rep, 'verified_ratio');
    const delta = ratio(latest) - ratio(prev);
    if (Math.abs(delta) > 0.1) {
      insights.push({
        type: 'trend',
        runId: String(latest.run_id),
        impact: 60,
        detail: `Evidence verification ${delta > 0 ? 'improving' : 'degrading'}: verified_ratio ${ratio(prev)} → ${ratio(latest)} across the last two runs.`,
        claimRefs: [],
      });
    }
  }

  // credibility trend: credible_verified_ratio movement (trustworthiness)
  if (has('credible_verified_ratio')) {
    const credibleRatio = (rep: any) => metricValue(rep, 'credible_verified_ratio');
    const credDelta = credibleRatio(latest) - credibleRatio(prev);
    if (Math.abs(credDelta) > 0.1) {
      insights.push({
        type: 'trend',
        runId: String(latest.run_id),
        impact: 70,
        detail: `Evidence credibility ${credDelta > 0 ? 'improving' : 'degrading'}: credible_verified_ratio ${credibleRatio(prev)} → ${credibleRatio(latest)}. Credibility reflects source trustworthiness (real/self-consistent/literature), independent of ref resolution.`,
        claimRefs: [],
      });
    }
  }

  // discovery: high-confidence frontier findings in the latest run
  const frontier = (latest.claims ?? []).filter((c: any) => c.verified && c.kind === 'finding' && c.confidence >= 0.8);
  for (const c of frontier.slice(0, 3)) {
    insights.push({
      type: 'discovery',
      runId: String(latest.run_id),
      impact: 90,
      detail: `High-confidence finding (${c.confidence}): ${c.text.slice(0, 180)}`,
      claimRefs: [c.claimId],
    });
  }

  // optimization: quarantined claims signal a grounding gap worth fixing
  if (has('claims_quarantined')) {
    const q = metricValue(latest, 'claims_quarantined');
    if (q > 0) {
      insights.push({
        type: 'optimization',
        runId: String(latest.run_id),
        impact: 45,
        detail: `${q} quarantined claim(s) in the latest run — tighten evidence refs or bring more systems online to lift grounding.`,
        claimRefs: [],
      });
    }
  }

  // optimization: theater-grounded claims — trustworthiness gap
  if (has('theater_claims')) {
    const theater = metricValue(latest, 'theater_claims');
    if (theater > 0) {
      insights.push({
        type: 'optimization',
        runId: String(latest.run_id),
        impact: 75,
        detail: `${theater} claim(s) grounded only in THEATER sources (LLM-narrated, hardcoded/synthetic outputs per the credibility audit). These are hypothesis material, never measurements — they do not count toward the credible ratio.`,
        claimRefs: [],
      });
    }
  }

  // Phase 3.5: surface persisted contradiction candidates from the claim store
  // (written idempotently at run time by persistContradictions).
  const contradictions = loadContradictions();

  return { ok: true, source, runsAnalyzed: runs.length, trends, insights, contradictions };
}

// ── Phase 3.5 — Contradiction detection ──────────────────────────────────────
// A CONSERVATIVE heuristic: pair two finding/hypothesis claims that cite the
// SAME evidence ref but assert opposite polarity (one increases/improves, the
// other decreases/suppresses). Every result is labeled "POTENTIAL ... heuristic,
// NOT confirmed" and written at low confidence — the detector surfaces a lead
// for review, it never asserts a real contradiction.

export interface Contradiction {
  id: string;
  runId: string;
  claimA: string;
  claimB: string;
  ref: string;      // shared evidence ref key
  basis: string;    // why flagged
  confidence: number;
}

const UP = new Set([
  'increase', 'increases', 'increased', 'improve', 'improves', 'improved', 'improving',
  'upregulat', 'elevat', 'higher', 'greater', 'promot', 'activ', 'enhanc', 'benefit',
  'overexpress', 'gain', 'boost',
]);
const DOWN = new Set([
  'decrease', 'decreases', 'decreased', 'reduce', 'reduces', 'reduced', 'reduction',
  'downregulat', 'suppress', 'inhibit', 'lower', 'worsen', 'impair', 'loss', 'delet',
  'knockout', 'kill',
]);

function polarity(text: string): number {
  const t = text.toLowerCase();
  let up = 0; let down = 0;
  for (const w of UP) if (t.includes(w)) up += 1;
  for (const w of DOWN) if (t.includes(w)) down += 1;
  if (up > down) return 1;
  if (down > up) return -1;
  return 0;
}

function refKey(ref: EvidenceRef): string {
  const id = ref.id.includes(':') ? ref.id.replace(/^[^:]+:/, '') : ref.id;
  return `${ref.type}:${id}`;
}

export function detectContradictions(claims: Claim[], runId: string): Contradiction[] {
  const byRef = new Map<string, Claim[]>();
  for (const c of claims) {
    if (c.text.startsWith('POTENTIAL CONTRADICTION')) continue;
    for (const ref of c.evidenceRefs) {
      const key = refKey(ref);
      if (!byRef.has(key)) byRef.set(key, []);
      byRef.get(key)!.push(c);
    }
  }
  const out: Contradiction[] = [];
  const seen = new Set<string>();
  for (const [ref, group] of byRef) {
    if (group.length < 2) continue;
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const a = group[i]!;
        const b = group[j]!;
        const pa = polarity(a.text);
        const pb = polarity(b.text);
        if (pa === 0 || pb === 0 || pa === pb) continue;
        const kindsOk = ['finding', 'hypothesis'].includes(a.kind) && ['finding', 'hypothesis'].includes(b.kind);
        if (!kindsOk) continue;
        const pairKey = [a.claimId, b.claimId].sort().join('|');
        if (seen.has(pairKey)) continue;
        seen.add(pairKey);
        out.push({
          id: `c_${runId}_contra_${createHash('sha256').update(pairKey).digest('hex').slice(0, 10)}`,
          runId,
          claimA: a.claimId,
          claimB: b.claimId,
          ref,
          basis: `${a.kind} "${a.text.slice(0, 90)}…" (${a.claimId}) vs ${b.kind} "${b.text.slice(0, 90)}…" (${b.claimId}). Opposite polarity asserted on shared evidence ${ref}.`,
          confidence: 0.3,
        });
      }
    }
  }
  return out;
}

// Write contradiction candidates back into the claim store, idempotently.
// Each contradiction becomes a low-confidence "POTENTIAL CONTRADICTION" claim
// whose prior-claim refs resolve to the two source claims (traceable in ≤2 hops).
export function persistContradictions(runId: string, claims: Claim[]): { written: number; existing: number } {
  const candidates = detectContradictions(claims, runId);
  const createdAt = new Date().toISOString();
  let existing = 0;
  const toWrite: Claim[] = [];
  for (const c of candidates) {
    if (getClaim(c.id)) { existing += 1; continue; }
    toWrite.push({
      claimId: c.id,
      runId,
      text: `POTENTIAL CONTRADICTION (heuristic, NOT confirmed): ${c.basis}`,
      kind: 'finding',
      evidenceRefs: [
        { type: 'prior-claim', id: c.claimA },
        { type: 'prior-claim', id: c.claimB },
      ],
      evidenceDepth: 'derived',
      evidenceClass: 'mixed',
      confidence: c.confidence,
      verified: true,
      unresolvableRefs: [],
      createdAt,
    });
  }
  if (toWrite.length) appendClaims(toWrite);
  return { written: toWrite.length, existing };
}

// Read persisted contradiction candidates back from the claim store. Each
// stored contradiction is a low-confidence claim whose two prior-claim refs
// point at the opposing source claims, so it is traceable in <=2 hops.
export function loadContradictions(): Contradiction[] {
  return loadClaims()
    .filter(c => c.text.startsWith('POTENTIAL CONTRADICTION'))
    .map(c => {
      const refs = c.evidenceRefs ?? [];
      return {
        id: c.claimId,
        runId: c.runId,
        claimA: refs[0]?.id ?? '',
        claimB: refs[1]?.id ?? '',
        ref: 'two prior-claim refs',
        basis: c.text,
        confidence: c.confidence,
      };
    });
}

// ── Fleet-wide overview ──────────────────────────────────────────────────────
// Honest per-source view. Sources use DIFFERENT metric schemas, so trends are
// computed per source only where a source has >=3 runs carrying the
// orchestrator claim-credibility schema. No blended fleet line is fabricated.

export interface FleetSource {
  source: string;
  runs: number;
  latestAt: string | null;
  metricNames: string[];
  trendable: boolean;
  trends: TrendsResult | null;
  note: string;
}

export interface FleetOverview {
  totalRuns: number;
  note: string;
  sources: FleetSource[];
}

export function fleetOverview(): FleetOverview {
  const rows = readFleetInsights(null, 1000);
  const bySource = new Map<string, Array<Record<string, unknown>>>();
  for (const r of rows) {
    const src = String(r.source ?? 'unknown');
    if (!bySource.has(src)) bySource.set(src, []);
    bySource.get(src)!.push(r);
  }

  const sources: FleetSource[] = [...bySource.entries()].map(([src, srcRows]) => {
    const reps = srcRows.map(r => r.report as any)
      .filter(rep => rep && Array.isArray(rep.translated_metrics) && rep.translated_metrics.length > 0);
    const metricNames = [...new Set(reps.flatMap(metricNamesOf))];
    const latest = [...srcRows].sort((a, b) => String(b.generated_at).localeCompare(String(a.generated_at)))[0];
    const trendable = reps.length >= 3 && metricNames.length > 0;
    return {
      source: src,
      runs: srcRows.length,
      latestAt: latest ? String(latest.generated_at) : null,
      metricNames,
      trendable,
      trends: trendable ? analyzeTrends(src) : null,
      note: trendable
        ? `${reps.length} metric-bearing run(s) sharing ${metricNames.length} metric(s) — trend lines computed`
        : reps.length < 3
          ? `only ${reps.length} metric-bearing run(s) — need >=3 to classify trends`
          : 'reports carry no translated metrics — no trend line computed (would be theater)',
    };
  });

  return {
    totalRuns: rows.length,
    note: 'Fleet trends are PER-SOURCE and schema-agnostic. Each source is trended over its OWN common numeric metrics (bbtech: ter/four-factors/gravity/flow/injury_risk; oncology: validation scorecard; research-orchestrator: claims-credibility). Trends are never blended into one line.',
    sources,
  };
}
