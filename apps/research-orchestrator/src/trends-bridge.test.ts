import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import type { Claim, ResearchDirective } from './types.js';

// Point the module at a throwaway SQLite file BEFORE import (DRAYMOND_DB is
// captured at module load), and give it the science_insights schema so
// persistence/analysis paths work without a live Draymond.
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'trends-bridge-'));
process.env.DRAYMOND_DB_PATH = path.join(tmpDir, 'draymond.db');
const db = new Database(process.env.DRAYMOND_DB_PATH);
db.exec(`CREATE TABLE science_insights (
  id TEXT PRIMARY KEY, source TEXT, session_id TEXT, domain TEXT, report TEXT,
  evidence_tier TEXT, generated_at TEXT, created_at TEXT, updated_at TEXT
)`);
db.close();

const mod = await import('./trends-bridge.js');
const {
  classifyTrend, isCredibleClaim, persistRunInsights, analyzeTrends,
  detectContradictions, fleetOverview,
} = mod;

const directive = {
  objective: 'test objective', direction: 'test direction',
} as unknown as ResearchDirective;

function mkClaim(over: Partial<Claim>): Claim {
  return {
    claimId: 'c_r_0', runId: 'r', text: 'test', kind: 'finding',
    evidenceRefs: [], evidenceDepth: 'derived', evidenceClass: 'computed',
    confidence: 0.5, verified: true, unresolvableRefs: [],
    createdAt: new Date().toISOString(), ...over,
  } as Claim;
}

describe('classifyTrend', () => {
  it('returns stable below 2 samples', () => {
    expect(classifyTrend([])).toBe('stable');
    expect(classifyTrend([0.5])).toBe('stable');
  });
  it('rising above +0.1, falling below -0.1, else stable', () => {
    expect(classifyTrend([0.2, 0.9])).toBe('rising');
    expect(classifyTrend([0.9, 0.2])).toBe('falling');
    expect(classifyTrend([0.5, 0.55])).toBe('stable');
  });
});

describe('isCredibleClaim', () => {
  it('literature and real/self-consistent are credible', () => {
    expect(isCredibleClaim({ evidenceClass: 'literature', validationStatus: undefined })).toBe(true);
    expect(isCredibleClaim({ evidenceClass: 'computed', validationStatus: 'real' })).toBe(true);
    expect(isCredibleClaim({ evidenceClass: 'computed', validationStatus: 'self_consistent' })).toBe(true);
  });
  it('theater and unvalidated are NOT credible', () => {
    expect(isCredibleClaim({ evidenceClass: 'computed', validationStatus: 'theater' })).toBe(false);
    expect(isCredibleClaim({ evidenceClass: 'computed', validationStatus: 'unvalidated' })).toBe(false);
    expect(isCredibleClaim({ evidenceClass: 'computed', validationStatus: undefined })).toBe(false);
  });
});

describe('persistRunInsights + credibility metrics', () => {
  it('writes credibility metrics and per-claim validationStatus into the store', () => {
    const claims = [
      mkClaim({ claimId: 'c_a', evidenceClass: 'computed', validationStatus: 'theater', verified: true }),
      mkClaim({ claimId: 'c_b', evidenceClass: 'computed', validationStatus: 'self_consistent', verified: true }),
      mkClaim({ claimId: 'c_c', evidenceClass: 'literature', verified: true }),
    ];
    const res = persistRunInsights('r1', directive, claims, 'test-domain');
    expect(res.ok).toBe(true);
    expect(res.duplicate).toBe(false);

    const rows = mod.readFleetInsights('research-orchestrator', 10);
    const rep = rows[0]?.report as any;
    const m = (name: string) => rep.translated_metrics.find((x: any) => x.name === name)?.value;
    expect(m('theater_claims')).toBe(1);
    expect(m('self_consistent_claims')).toBe(1);
    expect(m('real_claims')).toBe(0);
    // literature + self_consistent are credible; theater is not → 2/3
    expect(m('credible_verified_ratio')).toBeCloseTo(2 / 3, 3);
    // validationStatus propagated onto each stored claim
    expect(rep.claims.find((c: any) => c.claimId === 'c_a')?.validationStatus).toBe('theater');
  });
});

describe('analyzeTrends minimum-data gate', () => {
  it('returns insufficient_data below 3 runs', () => {
    const r = analyzeTrends();
    expect(r.insufficientData).toBe(true);
    expect(r.runsAnalyzed).toBeLessThan(3);
    expect(r.trends).toEqual([]);
  });
});

describe('detectContradictions', () => {
  const shared = [{ type: 'system-output', id: 'overlay-oncology' }] as Claim['evidenceRefs'];
  it('flags opposing polarity claims sharing an evidence ref', () => {
    const claims = [
      mkClaim({ claimId: 'c_1', text: 'Treatment increases survival in the cohort.', kind: 'finding', evidenceRefs: shared }),
      mkClaim({ claimId: 'c_2', text: 'Treatment decreases survival in the cohort.', kind: 'finding', evidenceRefs: shared }),
    ];
    const out = detectContradictions(claims, 'r9');
    expect(out).toHaveLength(1);
    expect(out[0]!.confidence).toBe(0.3);
    expect([out[0]!.claimA, out[0]!.claimB].sort()).toEqual(['c_1', 'c_2']);
  });
  it('ignores same-polarity pairs and non-finding kinds', () => {
    const claims = [
      mkClaim({ claimId: 'c_1', text: 'X increases survival.', kind: 'finding', evidenceRefs: shared }),
      mkClaim({ claimId: 'c_2', text: 'Y increases survival too.', kind: 'finding', evidenceRefs: shared }),
      mkClaim({ claimId: 'c_3', text: 'Z decreases survival.', kind: 'method-note', evidenceRefs: shared }),
    ];
    expect(detectContradictions(claims, 'r9')).toHaveLength(0);
  });
});

describe('fleetOverview', () => {
  it('reports per-source breakdown and never fabricates a blended line', () => {
    // research-orchestrator already has 1 row from the persist test; add 2 more
    // so it is trendable (>=3 runs sharing the claims schema).
    persistRunInsights('r2', directive, [mkClaim({ claimId: 'c_x' })], 'd');
    persistRunInsights('r3', directive, [mkClaim({ claimId: 'c_y' })], 'd');
    const overview = fleetOverview();
    const src = overview.sources.find(s => s.source === 'research-orchestrator');
    expect(src).toBeDefined();
    expect(src!.trendable).toBe(true);
    expect(src!.metricNames).toContain('credible_verified_ratio');
    expect(src!.trends?.runsAnalyzed).toBeGreaterThanOrEqual(3);
    // No cross-source "fleet trend" is fabricated.
    expect(overview.note).toMatch(/never blended|not blended/i);
    expect(overview.note).toMatch(/per-source|PER-SOURCE/i);
  });
});
