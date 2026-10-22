import { describe, it, expect } from 'vitest';
import { createRegistry, upsertHypothesis, preregister, getHypothesis, type RegistryDoc } from './registry.js';
import { scoreAgainstCriterion, updateConfidence, logit, sigmoid, applyRunToHypothesis, type Criterion } from './analysis.js';

const SPEC = {
  dataPlan: 'locked cohort',
  analysisPlan: 'paired bootstrap',
  holdout: '30% by patient',
  primaryOutcome: 'flip rate',
  successCriterion: 'flip rate <= 0.20',
  falsifier: 'flip rate > 0.20',
};

function locked(): { doc: RegistryDoc; id: string } {
  const { doc, hypothesis } = upsertHypothesis(createRegistry(), { title: 'Criteria sensitivity', mechanism: 'inter-reader error' });
  const lockedDoc = preregister(doc, hypothesis.id, SPEC).doc;
  return { doc: lockedDoc, id: hypothesis.id };
}

const LEQ: Criterion = { metricName: 'flipRate', comparator: '<=', threshold: 0.2 };
const GEQ: Criterion = { metricName: 'cIndex', comparator: '>=', threshold: 0.6 };
const APPROX: Criterion = { metricName: 'coverage', comparator: 'approx', threshold: 0.9, tolerance: 0.03 };

describe('srt analysis', () => {
  it('scores a completed run against the criterion', () => {
    expect(scoreAgainstCriterion({ runId: 'r', ok: true, metricName: 'flipRate', metric: 0.18 }, LEQ).verdict).toBe('supported');
    expect(scoreAgainstCriterion({ runId: 'r', ok: true, metricName: 'flipRate', metric: 0.22 }, LEQ).verdict).toBe('falsified');
    expect(scoreAgainstCriterion({ runId: 'r', ok: true, metricName: 'cIndex', metric: 0.64 }, GEQ).verdict).toBe('supported');
    expect(scoreAgainstCriterion({ runId: 'r', ok: true, metricName: 'coverage', metric: 0.95 }, APPROX).verdict).toBe('falsified');
  });

  it('a run that did not complete is inconclusive, never falsified', () => {
    expect(scoreAgainstCriterion({ runId: 'r', ok: false, metricName: 'flipRate', metric: NaN }, LEQ).verdict).toBe('inconclusive');
  });

  it('a metric-name mismatch is inconclusive', () => {
    expect(scoreAgainstCriterion({ runId: 'r', ok: true, metricName: 'auc', metric: 0.1 }, LEQ).verdict).toBe('inconclusive');
  });

  it('a CI straddling the boundary is inconclusive (negative control)', () => {
    expect(scoreAgainstCriterion({ runId: 'r', ok: true, metricName: 'cIndex', metric: 0.61, ciLo: 0.55, ciHi: 0.67 }, GEQ).verdict).toBe('inconclusive');
    expect(scoreAgainstCriterion({ runId: 'r', ok: true, metricName: 'cIndex', metric: 0.7, ciLo: 0.64, ciHi: 0.76 }, GEQ).verdict).toBe('supported');
  });

  it('Bayes update moves belief the right way and is clamped', () => {
    expect(logit(0.5)).toBeCloseTo(0, 6);
    expect(sigmoid(0)).toBeCloseTo(0.5, 6);
    expect(updateConfidence(0.5, 'supported')).toBeGreaterThan(0.5);
    expect(updateConfidence(0.5, 'falsified')).toBeLessThan(0.5);
    expect(updateConfidence(0.5, 'inconclusive')).toBeCloseTo(0.5, 6);
    expect(updateConfidence(0.99, 'supported')).toBeLessThan(1);
    expect(updateConfidence(0.01, 'falsified')).toBeGreaterThan(0);
  });

  it('applyRunToHypothesis persists the outcome and the new confidence', () => {
    const { doc, id } = locked();
    const out = applyRunToHypothesis(doc, id, { runId: 'run-1', systemId: 'overlay-oncology', ok: true, metricName: 'flipRate', metric: 0.18 }, LEQ);
    expect(out.verdict.verdict).toBe('supported');
    expect(out.confidenceAfter).toBeGreaterThan(out.confidenceBefore);
    const persisted = getHypothesis(out.doc, id)!;
    expect(persisted.status).toBe('supported');
    expect(persisted.calibratedConfidence).toBeCloseTo(out.confidenceAfter, 9);
    expect(persisted.outcomes[0]!.runId).toBe('run-1');
  });

  it('refuses an unknown hypothesis', () => {
    expect(() => applyRunToHypothesis(createRegistry(), 'nope', { runId: 'r', ok: true, metricName: 'x', metric: 1 }, LEQ)).toThrow(/unknown hypothesis/);
  });
});
