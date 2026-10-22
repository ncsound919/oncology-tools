import { describe, it, expect } from 'vitest';
import {
  FORECAST_WEIGHTS,
  forecastBreakthrough,
  measureProgress,
  rankForNextRun,
} from './forecast';
import type { HypothesisRecord } from './registry';

function hyp(over: Partial<HypothesisRecord> = {}): HypothesisRecord {
  return {
    id: 'h1', title: 't', mechanism: 'm', status: 'preregistered',
    createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
    calibratedConfidence: 0.5, evidenceTier: 3, outcomes: [],
    ...over,
  };
}

describe('forecastBreakthrough is labelled, bounded and never a measurement', () => {
  it('always carries the uncalibrated label and the reason', () => {
    const f = forecastBreakthrough({ evidenceTier: 2, calibratedConfidence: 0.5 });
    expect(f.isMeasurement).toBe(false);
    expect(f.label).toBe('uncalibrated-prior');
    expect(f.weightsVersion).toBe(FORECAST_WEIGHTS.version);
    expect(f.uncalibratedBecause).toMatch(/no adjudicated outcomes exist/i);
    expect(f.wouldRequire.length).toBeGreaterThanOrEqual(3);
    expect(f.wouldRequire.join(' ')).toMatch(/reliability curve/i);
  });

  it('never expresses certainty (bounded away from 0 and 1)', () => {
    const hi = forecastBreakthrough({ evidenceTier: 0, calibratedConfidence: 0.999, outcomes: [{ verdict: 'supported' }, { verdict: 'supported' }, { verdict: 'supported' }], hasPreregistration: true, hasRun: true });
    const lo = forecastBreakthrough({ evidenceTier: 5, calibratedConfidence: 0.001, outcomes: [{ verdict: 'falsified' }, { verdict: 'falsified' }, { verdict: 'null' }] });
    expect(hi.probability).toBeLessThan(1);
    expect(hi.probability).toBeGreaterThan(0.9);
    expect(lo.probability).toBeGreaterThan(0);
    expect(lo.probability).toBeLessThan(0.1);
  });

  it('is monotone in evidence strength: a stronger tier never forecasts lower', () => {
    const at = (tier: 0 | 1 | 2 | 3 | 4 | 5) => forecastBreakthrough({ evidenceTier: tier, calibratedConfidence: 0.5 }).probability;
    for (let t = 0 as 0 | 1; t < 5; t++) {
      const stronger = at(t as 0);
      const weaker = at((t + 1) as 1);
      expect(stronger).toBeGreaterThanOrEqual(weaker);
    }
  });

  it('is monotone in calibrated confidence', () => {
    const a = forecastBreakthrough({ evidenceTier: 3, calibratedConfidence: 0.2 }).probability;
    const b = forecastBreakthrough({ evidenceTier: 3, calibratedConfidence: 0.8 }).probability;
    expect(b).toBeGreaterThan(a);
  });

  it('moves down on falsification and null, up on support', () => {
    const base = forecastBreakthrough({ evidenceTier: 2, calibratedConfidence: 0.5 }).probability;
    const supported = forecastBreakthrough({ evidenceTier: 2, calibratedConfidence: 0.5, outcomes: [{ verdict: 'supported' }] }).probability;
    const falsified = forecastBreakthrough({ evidenceTier: 2, calibratedConfidence: 0.5, outcomes: [{ verdict: 'falsified' }] }).probability;
    const nullResult = forecastBreakthrough({ evidenceTier: 2, calibratedConfidence: 0.5, outcomes: [{ verdict: 'null' }] }).probability;
    expect(supported).toBeGreaterThan(base);
    expect(falsified).toBeLessThan(base);
    expect(nullResult).toBeLessThan(base);
  });
});

describe('measureProgress is the falsifiable half', () => {
  const records = [
    hyp({ id: 'a', status: 'proposed' }),
    hyp({ id: 'b', status: 'preregistered' }),
    hyp({ id: 'c', status: 'testing' }),
    hyp({ id: 'd', status: 'supported' }),
    hyp({ id: 'e', status: 'falsified' }),
    hyp({ id: 'f', status: 'null' }),
  ];

  it('counts states and shares, and declares itself a measurement', () => {
    const m = measureProgress(records);
    expect(m.isMeasurement).toBe(true);
    expect(m.total).toBe(6);
    expect(m.open).toEqual({ proposed: 1, preregistered: 1, testing: 1 });
    expect(m.decided).toEqual({ supported: 1, falsified: 1, nullResult: 1, retracted: 0 });
    expect(m.decidedShare).toBeCloseTo(0.5, 4);
    expect(m.negativeShare).toBeCloseTo(2 / 3, 4);
  });

  it('names the compute gap instead of inventing a per-compute rate', () => {
    const m = measureProgress(records);
    expect(m.computeAttributionGap).toMatch(/NOT computed here/);
    expect(m.computeAttributionGap).toMatch(/would be invented/);
    // There is deliberately no per-compute field to read.
    expect('decidedPerCompute' in m).toBe(false);
  });

  it('handles the empty registry without dividing by zero', () => {
    const m = measureProgress([]);
    expect(m.total).toBe(0);
    expect(m.decidedShare).toBe(0);
    expect(m.negativeShare).toBe(0);
  });

  it('a negative result is not treated as failure of the loop', () => {
    const allNegative = [hyp({ id: 'x', status: 'falsified' }), hyp({ id: 'y', status: 'null' })];
    expect(measureProgress(allNegative).negativeShare).toBe(1);
  });
});

describe('rankForNextRun', () => {
  it('sorts decided hypotheses last and uses the forecast only to order the rest', () => {
    const ranked = rankForNextRun([
      hyp({ id: 'strong-undecided', status: 'preregistered', evidenceTier: 0, calibratedConfidence: 0.7 }),
      hyp({ id: 'weak-undecided', status: 'proposed', evidenceTier: 5, calibratedConfidence: 0.3 }),
      hyp({ id: 'already-decided', status: 'supported', evidenceTier: 0, calibratedConfidence: 0.9 }),
    ]);
    expect(ranked[0].id).toBe('strong-undecided');
    expect(ranked[1].id).toBe('weak-undecided');
    expect(ranked[2].id).toBe('already-decided');
    expect(ranked[2].decided).toBe(true);
    // Every entry states that its number is not a measurement.
    expect(ranked.every((r) => r.forecast.isMeasurement === false)).toBe(true);
  });
});
