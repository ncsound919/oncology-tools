import { type RootConcepts } from './concepts.js';
import type { ConceptKey, ConceptPredictor, LinearConceptModel } from './bottleneck.js';

// ── Confidence calibration for the concept predictor ─────────────────────────
// A bottleneck can only abstain usefully if its per-concept confidence means
// something. This module turns a fitted concept predictor into a CALIBRATED one:
//   - fit residuals on a held-out calibration split;
//   - confidence = the empirical fraction of calibration residuals within a
//     tolerance (estimated P(|error| <= tol));
//   - split-conformal half-widths for a target coverage, and a report that
//     checks claimed vs empirical coverage on a separate test split.
// No fabrication: a concept with no calibration data gets confidence 0 (abstain),
// not a guessed number.

export interface ConceptCalibration {
  n: number;
  /** Sorted |residual| per concept (ascending). */
  residuals: Partial<Record<ConceptKey, number[]>>;
  /** Absolute tolerance used for coverage, per concept. */
  tolerance: Partial<Record<ConceptKey, number>>;
}

function predictVector(model: LinearConceptModel, features: number[]): number[] {
  return model.conceptNames.map((_, ci) => {
    let v = model.bias[ci] ?? 0;
    for (let a = 0; a < features.length; a++) v += (model.weights[ci]?.[a] ?? 0) * features[a];
    return v;
  });
}

export function fitConceptCalibration(
  model: LinearConceptModel,
  X: number[][],
  Y: number[][],
  opts: { tolerance?: Partial<Record<ConceptKey, number>>; relativeTol?: number } = {},
): ConceptCalibration {
  const relativeTol = opts.relativeTol ?? 0.1;
  const residuals: Partial<Record<ConceptKey, number[]>> = {};
  const tolerance: Partial<Record<ConceptKey, number>> = {};

  model.conceptNames.forEach((name, ci) => {
    const res: number[] = [];
    const truths: number[] = [];
    for (let i = 0; i < X.length; i++) {
      const t = Y[i]?.[ci];
      if (typeof t !== 'number' || Number.isNaN(t)) continue;
      res.push(Math.abs(predictVector(model, X[i])[ci] - t));
      truths.push(Math.abs(t));
    }
    res.sort((a, b) => a - b);
    residuals[name] = res;
    const meanAbs = truths.length ? truths.reduce((a, b) => a + b, 0) / truths.length : 0;
    tolerance[name] = opts.tolerance?.[name] ?? Math.max(relativeTol * meanAbs, 1e-9);
  });

  return { n: X.length, residuals, tolerance };
}

/** Empirical fraction of calibration residuals within the tolerance. */
export function conceptCoverage(cal: ConceptCalibration, name: ConceptKey, tol?: number): number {
  const res = cal.residuals[name];
  if (!res || res.length === 0) return 0;
  const t = tol ?? cal.tolerance[name] ?? 0;
  let lo = 0;
  let hi = res.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (res[mid] <= t) lo = mid + 1;
    else hi = mid;
  }
  return lo / res.length;
}

/** Split-conformal half-width for a target coverage 1 - alpha. */
export function conformalHalfWidth(cal: ConceptCalibration, name: ConceptKey, alpha = 0.1): number | null {
  const res = cal.residuals[name];
  if (!res || res.length === 0) return null;
  const idx = Math.min(res.length - 1, Math.max(0, Math.ceil((res.length + 1) * (1 - alpha)) - 1));
  return res[idx];
}

/**
 * Wrap a fitted linear model as a calibrated ConceptPredictor. Confidence is the
 * empirical coverage at the tolerance; an uncalibrated concept gets 0 so the
 * bottleneck abstains rather than trusting it.
 */
export function calibratedLinearPredictor(
  model: LinearConceptModel,
  cal: ConceptCalibration,
  opts: { tolerance?: Partial<Record<ConceptKey, number>> } = {},
): ConceptPredictor {
  return {
    name: 'linear-calibrated',
    predict(features: number[]) {
      const vec = predictVector(model, features);
      const concepts: Record<string, unknown> = {};
      const confidence: Partial<Record<ConceptKey, number>> = {};
      model.conceptNames.forEach((name, ci) => {
        concepts[name] = vec[ci];
        confidence[name] = conceptCoverage(cal, name, opts.tolerance?.[name]);
      });
      return { concepts: concepts as unknown as RootConcepts, confidence };
    },
  };
}

export interface CoverageReport {
  concept: ConceptKey;
  claimedCoverage: number;
  empiricalCoverage: number;
  halfWidth: number | null;
  nTest: number;
}

/** Claimed vs empirical coverage on a separate test split — the honesty check. */
export function calibrationReport(
  model: LinearConceptModel,
  cal: ConceptCalibration,
  X: number[][],
  Y: number[][],
  alpha = 0.1,
): CoverageReport[] {
  return model.conceptNames.map((name, ci) => {
    const q = conformalHalfWidth(cal, name, alpha);
    let within = 0;
    let total = 0;
    if (q != null) {
      for (let i = 0; i < X.length; i++) {
        const t = Y[i]?.[ci];
        if (typeof t !== 'number' || Number.isNaN(t)) continue;
        if (Math.abs(predictVector(model, X[i])[ci] - t) <= q) within += 1;
        total += 1;
      }
    }
    return { concept: name, claimedCoverage: 1 - alpha, empiricalCoverage: total ? within / total : 0, halfWidth: q, nTest: total };
  });
}
