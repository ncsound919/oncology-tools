import { describe, it, expect } from 'vitest';
import { ConceptBottleneckModel, fitLinearConcepts, linearPredictor, type LinearConceptModel } from './bottleneck.js';
import {
  calibratedLinearPredictor,
  calibrationReport,
  conceptCoverage,
  conformalHalfWidth,
  fitConceptCalibration,
} from './calibration.js';
import { DEFAULT_RANO_POLICY, type RootConcepts } from './concepts.js';

// ── Deterministic RNG so the coverage numbers are stable ─────────────────────
function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (1664525 * s + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
function normal(r: () => number): number {
  const u = Math.max(r(), 1e-12);
  const v = r();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

const base = (over: Partial<RootConcepts> = {}): RootConcepts => ({
  sumProductsMm2: 1000,
  enhancingVolumeMm3: 2000,
  nonEnhancingVolumeMm3: 500,
  newLesions: 0,
  daysSinceRadiotherapy: 200,
  onCorticosteroids: false,
  ...over,
});

function dataset(n: number): { X: number[][]; Y: number[][] } {
  const r = rng(42);
  const X: number[][] = [];
  const Y: number[][] = [];
  for (let i = 0; i < n; i++) {
    const x = [r() * 10 - 5, r() * 4 - 2, r() * 2];
    const y0 = 5 + 2 * x[0] - 1 * x[1] + 0.5 * x[2] + 3 * normal(r);
    const y1 = 1 + 0.3 * x[0] + 2 * normal(r);
    X.push(x);
    Y.push([y0, y1]);
  }
  return { X, Y };
}

describe('concept confidence calibration', () => {
  const { X, Y } = dataset(400);
  const train = { X: X.slice(0, 200), Y: Y.slice(0, 200) };
  const cal = { X: X.slice(200, 300), Y: Y.slice(200, 300) };
  const test = { X: X.slice(300), Y: Y.slice(300) };

  const model = fitLinearConcepts(train.X, train.Y, { conceptNames: ['sumProductsMm2', 'newLesions'], lambda: 1e-6 });
  const calibration = fitConceptCalibration(model, cal.X, cal.Y);

  it('conformal coverage is close to the claim on a held-out split', () => {
    const report = calibrationReport(model, calibration, test.X, test.Y, 0.1);
    for (const r of report) {
      expect(r.halfWidth).not.toBeNull();
      expect(r.empiricalCoverage).toBeGreaterThanOrEqual(0.7);
      expect(r.empiricalCoverage).toBeLessThanOrEqual(1.0);
    }
  });

  it('a tighter target coverage gives a wider conformal interval', () => {
    const q90 = conformalHalfWidth(calibration, 'sumProductsMm2', 0.1)!;
    const q80 = conformalHalfWidth(calibration, 'sumProductsMm2', 0.2)!;
    expect(q90).toBeGreaterThanOrEqual(q80);
  });

  it('coverage at the conformal half-width is high; the range is [0,1]', () => {
    const cov = conceptCoverage(calibration, 'sumProductsMm2');
    expect(cov).toBeGreaterThanOrEqual(0);
    expect(cov).toBeLessThanOrEqual(1);
    // At a tolerance equal to the 90% conformal half-width, ~90% of residuals fit.
    const q90 = conformalHalfWidth(calibration, 'sumProductsMm2', 0.1)!;
    expect(conceptCoverage(calibration, 'sumProductsMm2', q90)).toBeGreaterThanOrEqual(0.85);
  });

  it('a miscalibrated predictor gets low confidence and the bottleneck abstains', () => {
    const garbage: LinearConceptModel = {
      featureNames: ['f0', 'f1', 'f2'],
      conceptNames: ['sumProductsMm2', 'newLesions'],
      weights: [
        [100, -80, 60],
        [7, 7, 7],
      ],
      bias: [0, 0],
    };
    const garbageCal = fitConceptCalibration(garbage, cal.X, cal.Y);
    const cov = conceptCoverage(garbageCal, 'sumProductsMm2');
    expect(cov).toBeLessThan(0.3);
    // And strictly worse than the well-fit model.
    expect(cov).toBeLessThan(conceptCoverage(calibration, 'sumProductsMm2'));

    const predictor = calibratedLinearPredictor(garbage, garbageCal);
    const bottleneck = new ConceptBottleneckModel(predictor, DEFAULT_RANO_POLICY, 0.5);
    const r = bottleneck.predict(base(), [1, 2, 3]);
    expect(r.abstained).toBe(true);
    expect(r.category).toBe('indeterminate');
  });

  it('an uncalibrated concept yields confidence 0 (abstain, never a guess)', () => {
    const predictor = calibratedLinearPredictor(model, { n: 0, residuals: {}, tolerance: {} });
    const r = predictor.predict([1, 2, 3]);
    expect(r.confidence.sumProductsMm2).toBe(0);
  });

  it('the linear predictor alone reports a fixed confidence (uncalibrated baseline)', () => {
    const p = linearPredictor(model, 1).predict([1, 2, 3]);
    expect(p.confidence.sumProductsMm2).toBe(1);
  });
});
