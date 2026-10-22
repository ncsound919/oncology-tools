import { logit, sigmoid } from './analysis.js';
import type { EvidenceTier, HypothesisRecord, OutcomeVerdict } from './registry.js';

// ── SRT: forecast, and the measured progress it must never be confused with ───
// Two different things live here, deliberately in one file so neither can be
// quoted without the other:
//
//   1. `measureProgress` — the FALSIFIABLE signal. Counts hypotheses that left
//      proposed/testing for a decided verdict through a gated referee artifact.
//      This is a measurement; it can go down.
//
//   2. `forecastBreakthrough` — an UNCALIBRATED PRIOR. It produces a number, and
//      that number is NOT a probability and must never be reported as one. There
//      is no adjudicated reference standard in this ecosystem (the assurance
//      mapping itself marks npj phase 4 "Clinical evidence" not-addressed for
//      exactly that reason), so nothing here can be calibrated: a probability
//      requires outcomes to score the forecasts against, and there are none.
//
// The forecast's only defensible use is ORDERING hypotheses to decide what to run
// next. `isMeasurement:false` and `label` travel with the value so a consumer
// cannot lift `probability` out on its own.

const EPS = 1e-6;

/**
 * Declared prior weights — NOT fitted, because there is nothing to fit against.
 * Changing these is a judgement call, not a learning step; that is why they are
 * exported and versioned rather than inlined.
 */
export const FORECAST_WEIGHTS = {
  version: 'uncalibrated-v1',
  intercept: -1.1,
  evidence: 0.9,
  confidence: 1.0,
  supported: 0.6,
  falsified: -0.9,
  nullResult: -0.3,
  preregistered: 0.3,
  hasRun: 0.2,
} as const;

export interface ForecastInputs {
  /** 0 = agent agreement (no independent evidence) .. 5 = weakest. Lower is stronger. */
  evidenceTier: EvidenceTier;
  /** 0..1, maintained by analysis.ts. */
  calibratedConfidence: number;
  outcomes?: { verdict: OutcomeVerdict }[];
  hasPreregistration?: boolean;
  hasRun?: boolean;
}

export interface Forecast {
  /** 0..1. NOT a probability. Use only to ORDER hypotheses. */
  probability: number;
  /** Always false. There is nothing to calibrate against. */
  isMeasurement: false;
  label: 'uncalibrated-prior';
  method: string;
  weightsVersion: string;
  inputs: ForecastInputs;
  /** Why this number cannot be read as a probability. */
  uncalibratedBecause: string;
  /** What would have to exist before it could be. */
  wouldRequire: string[];
}

export function forecastBreakthrough(inputs: ForecastInputs): Forecast {
  const w = FORECAST_WEIGHTS;
  const tier = Math.max(0, Math.min(5, Math.floor(inputs.evidenceTier))) as EvidenceTier;
  const strength = (5 - tier) / 5; // tier 0 -> 1.0, tier 5 -> 0
  const conf = Math.min(1 - EPS, Math.max(EPS, inputs.calibratedConfidence));

  const outcomes = inputs.outcomes ?? [];
  const nSupported = outcomes.filter((o) => o.verdict === 'supported').length;
  const nFalsified = outcomes.filter((o) => o.verdict === 'falsified').length;
  const nNull = outcomes.filter((o) => o.verdict === 'null').length;

  const x =
    w.intercept +
    w.evidence * strength +
    w.confidence * logit(conf) +
    w.supported * nSupported +
    w.falsified * nFalsified +
    w.nullResult * nNull +
    (inputs.hasPreregistration ? w.preregistered : 0) +
    (inputs.hasRun ? w.hasRun : 0);

  // Clamped away from 0/1: an uncalibrated prior must never express certainty.
  const probability = Number(Math.min(0.98, Math.max(0.02, sigmoid(x))).toFixed(4));

  return {
    probability,
    isMeasurement: false,
    label: 'uncalibrated-prior',
    method: `sigmoid(${w.intercept} + ${w.evidence}*evidenceStrength + ${w.confidence}*logit(confidence) + outcomeTerms)`,
    weightsVersion: w.version,
    inputs: { ...inputs, outcomes },
    uncalibratedBecause:
      'no adjudicated outcomes exist to score forecasts against, so no reliability curve (Brier score / reliability diagram) can be computed; the weights are a declared prior, not fitted',
    wouldRequire: [
      'an adjudicated reference standard (a partner gate, not code)',
      'a held-out set of hypotheses with decided outcomes',
      'a reliability curve (Brier score / calibration bins) computed on that set',
      'a declared minimum n before any probability is quoted as calibrated',
    ],
  };
}

// ── measured progress (the falsifiable half) ─────────────────────────────────

export interface ProgressMeasurement {
  isMeasurement: true;
  total: number;
  open: { proposed: number; preregistered: number; testing: number };
  decided: { supported: number; falsified: number; nullResult: number; retracted: number };
  /** decided / total. 0 when there are no hypotheses. */
  decidedShare: number;
  /**
   * Fraction of decided hypotheses that ended in a NEGATIVE result (falsified or
   * null). A high share is healthy, not bad: it means the loop is willing to close
   * hypotheses. A loop that never produces a negative is not testing anything.
   */
  negativeShare: number;
  /** Named gap, not a number: compute is not attributable at this layer. */
  computeAttributionGap: string;
}

export function measureProgress(records: HypothesisRecord[]): ProgressMeasurement {
  const count = (s: string) => records.filter((h) => h.status === s).length;
  const supported = count('supported');
  const falsified = count('falsified');
  const nullResult = count('null');
  const retracted = count('retracted');
  const decided = supported + falsified + nullResult + retracted;
  const total = records.length;
  return {
    isMeasurement: true,
    total,
    open: { proposed: count('proposed'), preregistered: count('preregistered'), testing: count('testing') },
    decided: { supported, falsified, nullResult, retracted },
    decidedShare: total > 0 ? Number((decided / total).toFixed(4)) : 0,
    negativeShare: decided > 0 ? Number(((falsified + nullResult) / decided).toFixed(4)) : 0,
    computeAttributionGap:
      'decided-per-unit-compute is NOT computed here: run cards do not carry GPU-hours, so a per-compute rate would be invented. Needs the Kaggle/run linkage.',
  };
}

export interface RankedHypothesis {
  id: string;
  status: HypothesisRecord['status'];
  /** Measured: is this hypothesis decided by a recorded outcome. */
  decided: boolean;
  forecast: Forecast;
}

/**
 * Order hypotheses for what to run next. Decided hypotheses sort last; within the
 * undecided, the UNCALIBRATED priority orders them. The forecast is a tiebreak for
 * a queue, never a claim about the world.
 */
export function rankForNextRun(records: HypothesisRecord[]): RankedHypothesis[] {
  return records
    .map((h) => ({
      id: h.id,
      status: h.status,
      decided: ['supported', 'falsified', 'null', 'retracted'].includes(h.status),
      forecast: forecastBreakthrough({
        evidenceTier: h.evidenceTier,
        calibratedConfidence: h.calibratedConfidence,
        outcomes: h.outcomes,
        hasPreregistration: Boolean(h.preregistration),
        hasRun: h.outcomes.length > 0,
      }),
    }))
    .sort((a, b) => Number(a.decided) - Number(b.decided) || b.forecast.probability - a.forecast.probability || a.id.localeCompare(b.id));
}
