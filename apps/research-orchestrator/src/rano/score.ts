import { deriveResponse, type RanoPolicy, type ResponseCategory, type RootConcepts } from './concepts.js';

// ── Concept head: cohort scoring (the P7 analysis entry point) ───────────────
// Given measured concepts per case, derive the response category for each and
// summarise the cohort. This is the deterministic concept head as an ANALYSIS
// action: it invents nothing, and a case missing a required concept lands in
// `indeterminate` rather than a label.
//
// `pspProxyRate` is the fraction with an UNCONFIRMED early progression — the
// RANO 2.0 pseudoprogression proxy (progression inside the 12-week window that
// has not been confirmed). It is a proxy, not a PsP diagnosis.

export interface ResponseCase {
  id: string;
  baseline: RootConcepts;
  current: RootConcepts;
  antiAngiogenic?: boolean;
  confirmedProgression?: boolean;
}

export interface ResponseScore {
  id: string;
  category: ResponseCategory;
  reasons: string[];
}

export interface ResponseCohortSummary {
  n: number;
  counts: Record<ResponseCategory, number>;
  indeterminateRate: number;
  /** Fraction with an unconfirmed early progression (RANO 2.0 PsP proxy). */
  pspProxyRate: number;
  confirmedPDRate: number;
}

export interface ResponseCohortResult {
  scores: ResponseScore[];
  summary: ResponseCohortSummary;
}

export function scoreResponseCohort(cases: ResponseCase[], opts: { policy?: RanoPolicy } = {}): ResponseCohortResult {
  const scores: ResponseScore[] = cases.map((c) => {
    const d = deriveResponse(
      { baseline: c.baseline, current: c.current },
      { antiAngiogenic: c.antiAngiogenic, confirmedProgression: c.confirmedProgression, policy: opts.policy },
    );
    return { id: c.id, category: d.category, reasons: d.reasons };
  });

  const counts: Record<ResponseCategory, number> = { CR: 0, PR: 0, SD: 0, PD: 0, unconfirmed: 0, indeterminate: 0 };
  for (const s of scores) counts[s.category] += 1;
  const denom = scores.length || 1;

  return {
    scores,
    summary: {
      n: scores.length,
      counts,
      indeterminateRate: counts.indeterminate / denom,
      pspProxyRate: counts.unconfirmed / denom,
      confirmedPDRate: counts.PD / denom,
    },
  };
}
