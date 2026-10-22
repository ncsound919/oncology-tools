import { describe, it, expect } from 'vitest';
import { extractSystemClaims, verifyClaims } from './claims.js';
import type { ClaimCandidateInput } from './claims.js';
import type { Contribution, DispatchResult } from './types.js';

function simResult(systemId: DispatchResult['systemId'], body: unknown, ok = true): DispatchResult {
  return { systemId, ok, latencyMs: 10, httpStatus: 200, body, stage: 'simulation', evidenceClass: 'computed' };
}

const CONTRIBUTIONS: Contribution[] = [
  { systemId: 'oncoforesight', kind: 'data', title: 'payload', detail: 'x' },
  { systemId: 'overlay-oncology', kind: 'data', title: 'payload', detail: 'x' },
  { systemId: 'umoe', kind: 'data', title: 'payload', detail: 'x' },
  { systemId: 'chemlab', kind: 'data', title: 'payload', detail: 'x' },
  { systemId: 'attec', kind: 'data', title: 'payload', detail: 'x' },
  { systemId: 'oncograph', kind: 'data', title: 'payload', detail: 'x' },
];

describe('per-system deterministic extraction', () => {
  it('oncoforesight: reads real predictor fields, tags computed', () => {
    const r = simResult('oncoforesight', {
      armLabel: 'Arm B',
      remission: { pResponse: 0.612, pDurable12: 0.4 },
      resistance: { risk6mo: 0.23 },
      toxicity: { pGrade3Any: 0.31, benefitRiskIndex: 1.7 },
    });
    const claims = extractSystemClaims(r, { patientId: 'p1', armLabel: 'Arm B' });
    expect(claims).toHaveLength(1);
    expect(claims[0]!.evidenceClass).toBe('computed');
    expect(claims[0]!.text).toContain('61.2%');
    expect(claims[0]!.text).toContain('23.0%');
    expect(claims[0]!.evidenceRefs).toEqual([{ type: 'system-output', id: 'oncoforesight' }]);
  });

  it('overlay-oncology: derives live-cell reduction and mass balance from history', () => {
    const r = simResult('overlay-oncology', {
      success: true,
      ic50: 0.8,
      seed: 42,
      massBalance: { conservationErrorPct: 0.02 },
      history: [
        { step: 0, timeHour: 0, liveCells: 1000, deadCells: 0 },
        { step: 59, timeHour: 60, liveCells: 400, deadCells: 650 },
      ],
    });
    const claims = extractSystemClaims(r);
    expect(claims).toHaveLength(1);
    expect(claims[0]!.text).toContain('60.0%');
    expect(claims[0]!.text).toContain('conservation error 0.02%');
    expect(claims[0]!.evidenceClass).toBe('computed');
  });

  it('umoe: reports run id, ok flag and prediction count', () => {
    const r = simResult('umoe', { run_id: 'run_9', ok: true, predictions: [{}, {}, {}], timeline: [1, 2, 3, 4] });
    const claims = extractSystemClaims(r);
    expect(claims[0]!.text).toContain('run_9');
    expect(claims[0]!.text).toContain('3 predictions');
  });

  it('attec: excludes the hardcoded enrichmentFactor from the claim', () => {
    const r = simResult('attec', { scaffoldId: 'indolinone', targetProtein: 'KRAS-G12D', hitsScreened: 1200, enrichmentFactor: 4.8, hits: [{}, {}] });
    const claims = extractSystemClaims(r);
    expect(claims[0]!.text).toContain('1200');
    expect(claims[0]!.text).toContain('hardcoded');
    expect(claims[0]!.text).not.toContain('4.8');
  });

  it('oncograph: emits a narrated provenance meta-claim, never a finding', () => {
    const r = simResult('oncograph', { simulationReport: '## Predicted Clonal Dynamics ...' });
    const claims = extractSystemClaims(r, { mutation: { gene: 'EGFR' } });
    expect(claims).toHaveLength(1);
    expect(claims[0]!.evidenceClass).toBe('narrated');
    expect(claims[0]!.kind).toBe('method-note');
    expect(claims[0]!.text).toContain('LLM-GENERATED');
  });

  it('failed or non-simulation dispatches produce no claims', () => {
    expect(extractSystemClaims({ ...simResult('umoe', { ok: true, predictions: [{}] }), ok: false })).toEqual([]);
    expect(extractSystemClaims({ ...simResult('umoe', { ok: true, predictions: [{}] }), stage: 'literature' })).toEqual([]);
    expect(extractSystemClaims(simResult('oncoforesight', { error: 'Patient not found' }, false))).toEqual([]);
  });
});

describe('deterministic verifier', () => {
  it('verifies claims whose refs resolve to run contributions', () => {
    const cand: ClaimCandidateInput = {
      text: 'test claim', kind: 'finding',
      evidenceRefs: [{ type: 'system-output', id: 'oncoforesight' }],
      evidenceDepth: 'derived', confidence: 0.9,
    };
    const [claim] = verifyClaims([cand], CONTRIBUTIONS, 'run_t');
    expect(claim!.verified).toBe(true);
    expect(claim!.evidenceClass).toBe('computed');
    expect(claim!.claimId).toBe('c_run_t_0');
  });

  it('quarantines claims citing unresolvable refs', () => {
    const cand: ClaimCandidateInput = {
      text: 'hallucinated', kind: 'finding',
      evidenceRefs: [{ type: 'paper', id: 'PMC999999' }],
      evidenceDepth: 'metadata', confidence: 0.9,
    };
    const [claim] = verifyClaims([cand], CONTRIBUTIONS, 'run_t2');
    expect(claim!.verified).toBe(false);
    expect(claim!.unresolvableRefs).toHaveLength(1);
  });

  it('THEATER REMOVAL: confidence is evidence-derived, never the 0.95 self-report', () => {
    // The old `candidate()` helper defaulted EVERY claim to confidence 0.95.
    // Confidence must now come from the evidence class, not an arbitrary default.
    const computed: ClaimCandidateInput = {
      text: 'computed claim', kind: 'finding',
      evidenceRefs: [{ type: 'system-output', id: 'oncoforesight' }],
      evidenceDepth: 'derived',
    };
    const narrated: ClaimCandidateInput = {
      text: 'narrated hypothesis', kind: 'hypothesis',
      evidenceRefs: [{ type: 'system-output', id: 'oncoforesight' }],
      evidenceDepth: 'derived',
      evidenceClass: 'narrated',
    };
    const [a] = verifyClaims([computed], CONTRIBUTIONS, 'run_c');
    const [b] = verifyClaims([narrated], CONTRIBUTIONS, 'run_c2');
    expect(a!.confidence).not.toBe(0.95); // no self-report default
    expect(a!.confidence).toBeLessThanOrEqual(0.9);
    expect(b!.confidence).toBeLessThan(a!.confidence); // narrated < computed
  });

  it('THEATER REMOVAL: a computed claim against an LLM-narrated system is NOT verified', () => {
    // A claim labelled 'computed' must not be stamped verified when the system
    // it cites is only capable of narrated/LLM output — the "garbage in,
    // verified out" path.
    const cand: ClaimCandidateInput = {
      text: 'claims a computed result', kind: 'finding',
      evidenceRefs: [{ type: 'system-output', id: 'llm_synthesis' }],
      evidenceDepth: 'derived',
      evidenceClass: 'computed',
    };
    const [claim] = verifyClaims([cand], CONTRIBUTIONS, 'run_llm');
    expect(claim!.verified).toBe(false);
  });
});
