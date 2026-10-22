import type { ResponseCohortSummary } from './score.js';

// ── Preregistered criterion evaluation (closes the P7 loop) ──────────────────
// The preregistration already fixes and HASHES `successCriterion` and
// `falsifier` (the registry requires every field to be a non-empty string), so
// the criterion is attested before execution. Here we require it to be written
// in a machine-readable form — "<metric> <op> <number>" — and evaluate it
// against the concept head's cohort summary.
//
// Nothing is invented: an unparseable criterion or an unknown metric yields
// `inconclusive`, and no outcome is recorded.

export type CriterionOp = '>=' | '<=' | '==' | '>' | '<';

export interface ParsedCriterion {
  metric: string;
  op: CriterionOp;
  threshold: number;
}

export type CriterionVerdictName = 'supported' | 'falsified' | 'null' | 'inconclusive';

export interface CriterionVerdict {
  verdict: CriterionVerdictName;
  metric: string | null;
  value: number | null;
  detail: string;
}

export function parseCriterion(text: string | null | undefined): ParsedCriterion | null {
  if (!text) return null;
  const m = /^\s*([A-Za-z_][\w.]*)\s*(>=|<=|==|>|<)\s*(-?\d+(?:\.\d+)?)\s*$/.exec(text);
  if (!m) return null;
  return { metric: m[1], op: m[2] as CriterionOp, threshold: Number(m[3]) };
}

/** Resolve a metric name against the cohort summary. Unknown => null. */
export function resolveMetric(summary: ResponseCohortSummary, metric: string): number | null {
  if (metric === 'n') return summary.n;
  if (metric === 'pspProxyRate') return summary.pspProxyRate;
  if (metric === 'confirmedPDRate') return summary.confirmedPDRate;
  if (metric === 'indeterminateRate') return summary.indeterminateRate;
  const cm = /^counts\.(CR|PR|SD|PD|unconfirmed|indeterminate)$/.exec(metric);
  if (cm) return summary.counts[cm[1] as keyof ResponseCohortSummary['counts']];
  return null;
}

function compare(value: number, op: CriterionOp, threshold: number): boolean {
  switch (op) {
    case '>=':
      return value >= threshold;
    case '<=':
      return value <= threshold;
    case '>':
      return value > threshold;
    case '<':
      return value < threshold;
    case '==':
      return value === threshold;
  }
}

export function evaluateCriterion(
  summary: ResponseCohortSummary,
  successText: string | null | undefined,
  falsifierText?: string | null,
): CriterionVerdict {
  const success = parseCriterion(successText);
  if (!success) {
    return { verdict: 'inconclusive', metric: null, value: null, detail: 'success criterion is not machine-readable (expected "<metric> <op> <number>")' };
  }
  const value = resolveMetric(summary, success.metric);
  if (value == null) {
    return { verdict: 'inconclusive', metric: success.metric, value: null, detail: `unknown metric '${success.metric}'` };
  }
  if (compare(value, success.op, success.threshold)) {
    return { verdict: 'supported', metric: success.metric, value, detail: `${success.metric}=${value} satisfies '${successText}'` };
  }
  const falsifier = parseCriterion(falsifierText);
  if (falsifier) {
    const fv = resolveMetric(summary, falsifier.metric);
    if (fv != null && compare(fv, falsifier.op, falsifier.threshold)) {
      return { verdict: 'falsified', metric: falsifier.metric, value: fv, detail: `${falsifier.metric}=${fv} satisfies falsifier '${falsifierText}'` };
    }
  }
  return { verdict: 'null', metric: success.metric, value, detail: `${success.metric}=${value} met neither the success criterion nor the falsifier` };
}
