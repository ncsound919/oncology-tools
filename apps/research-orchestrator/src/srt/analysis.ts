import {
  type RegistryDoc,
  type HypothesisRecord,
  type OutcomeVerdict,
  getHypothesis,
  recordOutcome,
  clamp01,
} from './registry.js';

// ── SRT: analysis ─────────────────────────────────────────────────────────────
// Score a finished run against its preregistered criterion and update belief.
// Pure and deterministic. This is the step the orchestrator was missing: it turns
// a run result into a verdict (supported / falsified / inconclusive) and a
// calibrated confidence delta, then writes the outcome (including the null
// ledger).
//
// HONEST RULE: `supported` = "the preregistered criterion was met on this run".
// A run that did not complete is `inconclusive`, never `falsified`.

export type Comparator = '>=' | '<=' | 'approx';

export interface Criterion {
  metricName: string;
  comparator: Comparator;
  threshold: number;
  /** Required for `approx`: |metric - threshold| <= tolerance counts as met. */
  tolerance?: number;
}

export interface RunResult {
  runId: string;
  systemId?: string;
  ok: boolean;
  metricName: string;
  metric: number;
  n?: number;
  ciLo?: number;
  ciHi?: number;
  pValue?: number;
}

export interface Verdict {
  verdict: Exclude<OutcomeVerdict, 'null'>;
  met: boolean;
  rationale: string;
}

function pointMet(metric: number, c: Criterion): boolean {
  switch (c.comparator) {
    case '>=': return metric >= c.threshold;
    case '<=': return metric <= c.threshold;
    case 'approx': return Math.abs(metric - c.threshold) <= Math.abs(c.tolerance ?? Number.EPSILON);
  }
}

export function scoreAgainstCriterion(result: RunResult, criterion: Criterion): Verdict {
  if (!result.ok) return { verdict: 'inconclusive', met: false, rationale: 'run did not complete; no verdict is possible' };
  if (!Number.isFinite(result.metric)) return { verdict: 'inconclusive', met: false, rationale: 'metric is not finite' };
  if (result.metricName !== criterion.metricName) {
    return { verdict: 'inconclusive', met: false, rationale: `metric mismatch: got '${result.metricName}', criterion is '${criterion.metricName}'` };
  }
  const hasCI = Number.isFinite(result.ciLo) && Number.isFinite(result.ciHi);
  if (hasCI) {
    const lo = result.ciLo as number;
    const hi = result.ciHi as number;
    let straddles: boolean;
    if (criterion.comparator === 'approx') {
      const tol = Math.abs(criterion.tolerance ?? 0);
      const loEdge = criterion.threshold - tol;
      const hiEdge = criterion.threshold + tol;
      straddles = (lo < loEdge && hi > loEdge) || (lo < hiEdge && hi > hiEdge);
    } else {
      straddles = lo < criterion.threshold && hi > criterion.threshold;
    }
    if (straddles) {
      return { verdict: 'inconclusive', met: false, rationale: `95% interval [${lo}, ${hi}] straddles the decision boundary ${criterion.threshold}` };
    }
  }
  const met = pointMet(result.metric, criterion);
  return {
    verdict: met ? 'supported' : 'falsified',
    met,
    rationale: `${result.metricName}=${result.metric} ${met ? 'met' : 'missed'} the preregistered ${criterion.comparator} ${criterion.threshold}`,
  };
}

// ── Bayes (log-odds) confidence update ───────────────────────────────────────

export function logit(p: number): number {
  const e = 1e-6;
  const c = Math.min(1 - e, Math.max(e, clamp01(p)));
  return Math.log(c / (1 - c));
}

export function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

const VERDICT_LOGLR: Record<Exclude<OutcomeVerdict, 'null'>, number> = {
  supported: 1.0,
  falsified: -1.0,
  inconclusive: 0,
};

export function updateConfidence(
  prior: number,
  verdict: Exclude<OutcomeVerdict, 'null'>,
  opts: { weight?: number } = {},
): number {
  const w = opts.weight ?? 1.0;
  return clamp01(sigmoid(logit(prior) + w * VERDICT_LOGLR[verdict]));
}

export interface ApplyOutcome {
  doc: RegistryDoc;
  hypothesis: HypothesisRecord;
  verdict: Verdict;
  confidenceBefore: number;
  confidenceAfter: number;
}

export function applyRunToHypothesis(
  doc: RegistryDoc,
  hypothesisId: string,
  result: RunResult,
  criterion: Criterion,
  opts: { weight?: number; now?: string } = {},
): ApplyOutcome {
  const h = getHypothesis(doc, hypothesisId);
  if (!h) throw new Error(`unknown hypothesis: ${hypothesisId}`);
  const verdict = scoreAgainstCriterion(result, criterion);
  const confidenceBefore = h.calibratedConfidence;
  const confidenceAfter = updateConfidence(confidenceBefore, verdict.verdict, { weight: opts.weight });
  const bumped: RegistryDoc = { ...doc, hypotheses: doc.hypotheses.map((x) => (x.id === hypothesisId ? { ...x, calibratedConfidence: confidenceAfter } : x)) };
  const { doc: next, hypothesis } = recordOutcome(
    bumped,
    hypothesisId,
    {
      verdict: verdict.verdict,
      metricName: result.metricName,
      metric: result.metric,
      runId: result.runId,
      systemId: result.systemId,
      detail: verdict.rationale,
    },
    opts.now,
  );
  return { doc: next, hypothesis, verdict, confidenceBefore, confidenceAfter };
}
