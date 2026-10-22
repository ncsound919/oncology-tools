import {
  DEFAULT_RANO_POLICY,
  REQUIRED_CONCEPT_KEYS,
  ROOT_CONCEPT_KEYS,
  deriveResponse,
  type DerivedResponse,
  type RanoPolicy,
  type ResponseCategory,
  type RootConcepts,
} from './concepts.js';

// ── Concept-bottleneck model ─────────────────────────────────────────────────
// A model predicts CONCEPTS; the response label is derived from them by the
// deterministic RANO head. That ordering is the whole point (TRACE, arXiv
// 2606.30313): the label is inspectable and CORRECTABLE at the concept level,
// and a low-confidence concept makes the model ABSTAIN rather than emit a label.
//
// The predictor is pluggable. `fitLinearConcepts` is a deterministic ridge fit
// over a small table (no GPU); a segmentation model can be dropped in behind the
// same interface without changing the head or the guarantees.

export type ConceptKey = keyof RootConcepts;

export interface ConceptPrediction {
  concepts: RootConcepts;
  /** 0..1 per concept; a required concept below the threshold forces abstention. */
  confidence: Partial<Record<ConceptKey, number>>;
}

export interface ConceptPredictor {
  name: string;
  predict(features: number[]): ConceptPrediction;
}

export interface BottleneckOptions {
  antiAngiogenic?: boolean;
  confirmedProgression?: boolean;
}

export interface BottleneckResult {
  concepts: RootConcepts;
  derived: DerivedResponse;
  category: ResponseCategory;
  abstained: boolean;
  reasons: string[];
}

export class ConceptBottleneckModel {
  constructor(
    private readonly predictor: ConceptPredictor,
    private readonly policy: RanoPolicy = DEFAULT_RANO_POLICY,
    private readonly abstainBelow = 0.5,
  ) {}

  predict(baseline: RootConcepts, features: number[], opts: BottleneckOptions = {}): BottleneckResult {
    const pred = this.predictor.predict(features);
    const derived = deriveResponse({ baseline, current: pred.concepts }, { ...opts, policy: this.policy });
    const lowConfidence = REQUIRED_CONCEPT_KEYS.filter((k) => (pred.confidence[k] ?? 1) < this.abstainBelow);
    const reasons = [...derived.reasons];
    let abstained = false;
    let category = derived.category;
    if (lowConfidence.length) {
      abstained = true;
      category = 'indeterminate';
      reasons.push(`abstained: low confidence on ${lowConfidence.join(', ')} (< ${this.abstainBelow})`);
    } else if (derived.category === 'indeterminate') {
      abstained = true;
    }
    return { concepts: pred.concepts, derived, category, abstained, reasons };
  }
}

/** Apply human corrections to predicted concepts (the bottleneck's inspectability). */
export function correctConcepts(base: RootConcepts, patch: Partial<RootConcepts>): RootConcepts {
  return { ...base, ...patch };
}

/**
 * Concept-level influence: which concept, reset to its baseline value, changes the
 * category. A deterministic counterfactual (echoes concept-level influence, CLIF
 * arXiv 2605.19848) — it says which concept the label actually depends on.
 */
export function conceptInfluence(
  baseline: RootConcepts,
  current: RootConcepts,
  opts: { antiAngiogenic?: boolean; confirmedProgression?: boolean; policy?: RanoPolicy } = {},
): Array<{ concept: ConceptKey; changesLabel: boolean }> {
  const baseCat = deriveResponse({ baseline, current }, opts).category;
  return ROOT_CONCEPT_KEYS.map((k) => {
    const counterfactual: RootConcepts = { ...current, [k]: baseline[k] };
    const cat = deriveResponse({ baseline, current: counterfactual }, opts).category;
    return { concept: k, changesLabel: cat !== baseCat };
  });
}

// ── Linear concept predictor (deterministic ridge fit, no GPU) ───────────────

export interface LinearConceptModel {
  featureNames: string[];
  conceptNames: ConceptKey[];
  /** [nConcepts][nFeatures] */
  weights: number[][];
  bias: number[];
}

function solveLinearSystem(A: number[][], B: number[][]): number[][] {
  const n = A.length;
  const m = B[0]?.length ?? 0;
  const M = A.map((row, i) => [...row, ...B[i]]);
  for (let col = 0; col < n; col++) {
    let piv = col;
    for (let r = col + 1; r < n; r++) if (Math.abs(M[r][col]) > Math.abs(M[piv][col])) piv = r;
    if (Math.abs(M[piv][col]) < 1e-12) continue;
    [M[col], M[piv]] = [M[piv], M[col]];
    const d = M[col][col];
    for (let c = col; c < n + m; c++) M[col][c] /= d;
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const factor = M[r][col];
      if (factor === 0) continue;
      for (let c = col; c < n + m; c++) M[r][c] -= factor * M[col][c];
    }
  }
  return M.map((row) => row.slice(n));
}

/** Ridge-regularised normal-equation fit: Y ~ [1, X] W. */
export function fitLinearConcepts(
  X: number[][],
  Y: number[][],
  opts: { featureNames?: string[]; conceptNames?: ConceptKey[]; lambda?: number } = {},
): LinearConceptModel {
  const n = X.length;
  const d = X[0]?.length ?? 0;
  const k = Y[0]?.length ?? 0;
  const lambda = opts.lambda ?? 1e-3;
  const p = d + 1;
  const A: number[][] = Array.from({ length: p }, () => new Array(p).fill(0));
  const B: number[][] = Array.from({ length: p }, () => new Array(k).fill(0));
  for (let i = 0; i < n; i++) {
    const row = [1, ...X[i]];
    for (let a = 0; a < p; a++) {
      for (let b = 0; b < p; b++) A[a][b] += row[a] * row[b];
      for (let c = 0; c < k; c++) B[a][c] += row[a] * Y[i][c];
    }
  }
  for (let a = 1; a < p; a++) A[a][a] += lambda;
  const W = solveLinearSystem(A, B);
  const weights: number[][] = Array.from({ length: k }, (_, c) => Array.from({ length: d }, (_, a) => W[a + 1]?.[c] ?? 0));
  return {
    featureNames: opts.featureNames ?? Array.from({ length: d }, (_, i) => `f${i}`),
    conceptNames: opts.conceptNames ?? ROOT_CONCEPT_KEYS,
    weights,
    bias: W[0] ?? new Array(k).fill(0),
  };
}

/** Wrap a fitted linear model as a ConceptPredictor (confidence is fixed). */
export function linearPredictor(model: LinearConceptModel, confidence = 1): ConceptPredictor {
  return {
    name: 'linear',
    predict(features: number[]): ConceptPrediction {
      const concepts: Record<string, unknown> = {};
      const conf: Partial<Record<ConceptKey, number>> = {};
      model.conceptNames.forEach((name, ci) => {
        let v = model.bias[ci] ?? 0;
        for (let a = 0; a < features.length; a++) v += (model.weights[ci]?.[a] ?? 0) * features[a];
        concepts[name] = v;
        conf[name] = confidence;
      });
      return { concepts: concepts as unknown as RootConcepts, confidence: conf };
    },
  };
}

// ── Metrics (concept-level AND label-level, as TRACE reports) ─────────────────

export function conceptMetrics(predicted: RootConcepts[], truth: RootConcepts[]): { mae: Record<string, number>; n: number } {
  const mae: Record<string, number> = {};
  for (const k of ROOT_CONCEPT_KEYS) {
    let sum = 0;
    let n = 0;
    for (let i = 0; i < predicted.length; i++) {
      const p = predicted[i][k];
      const t = truth[i]?.[k];
      if (typeof p === 'number' && typeof t === 'number') {
        sum += Math.abs(p - t);
        n += 1;
      }
    }
    if (n) mae[k] = sum / n;
  }
  return { mae, n: predicted.length };
}

export function labelMetrics(
  predicted: ResponseCategory[],
  truth: ResponseCategory[],
): { accuracy: number; macroF1: number; labels: ResponseCategory[] } {
  const n = Math.min(predicted.length, truth.length);
  if (!n) return { accuracy: 0, macroF1: 0, labels: [] };
  let correct = 0;
  for (let i = 0; i < n; i++) if (predicted[i] === truth[i]) correct += 1;
  const labels = [...new Set([...predicted.slice(0, n), ...truth.slice(0, n)])] as ResponseCategory[];
  const f1s: number[] = [];
  for (const lab of labels) {
    let tp = 0;
    let fp = 0;
    let fn = 0;
    for (let i = 0; i < n; i++) {
      if (predicted[i] === lab && truth[i] === lab) tp += 1;
      else if (predicted[i] === lab) fp += 1;
      else if (truth[i] === lab) fn += 1;
    }
    const prec = tp + fp ? tp / (tp + fp) : 0;
    const rec = tp + fn ? tp / (tp + fn) : 0;
    f1s.push(prec + rec ? (2 * prec * rec) / (prec + rec) : 0);
  }
  return { accuracy: correct / n, macroF1: f1s.reduce((a, b) => a + b, 0) / (f1s.length || 1), labels };
}
