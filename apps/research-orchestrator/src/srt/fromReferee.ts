import type { ApplyOutcome, Criterion, RunResult } from './analysis.js';
import { applyRunToHypothesis } from './analysis.js';
import type { RegistryDoc } from './registry.js';

// ── SRT: referee assurance artifact -> hypothesis verdict ─────────────────────
// This is the adapter that closes cadence P7. `cadence.ts` already said P7
// "analyse & update" REQUIRES ['referee','analysis']; `cadenceRunner.ts` deferred
// it with the reason "analysis needs a finished run result (never invented)".
// `analysis.ts` already knows how to turn a RunResult into a verdict and write it.
// The one missing piece was translating a finished, verifiable referee scorecard
// into a RunResult. That is all this file does.
//
// It consumes the PUBLISHED ASSURANCE ARTIFACT, not the referee's internal types.
// Two reasons: (1) the artifact is the cross-app contract, so this app does not
// import the platform's scorer (different tsconfig rootDir, and a second copy of
// the scoring is exactly the fork this ecosystem keeps having to remove); (2) the
// artifact is the hash-locked, anchored form, which is the only form worth
// recording against a hypothesis.
//
// HONEST RULES, all enforced below and each naming its own failure:
//   * A REFUSED outcome is `inconclusive`, never `falsified`. (analysis.ts already
//     states this; here a refusal is expressed as ok:false so that holds.)
//   * A `supported` verdict requires the falsification gate to have PASSED — the
//     shuffled control must be near chance. A scorecard whose control is above the
//     ceiling is not evidence for anything.
//   * Every required referee gate must be present in `gatesCleared`.
//   * An UNANCHORED artifact is not evidence by default (requireAnchor), matching
//     the assurance verifier's own default. A hand-written report is not a run.

/** The published artifact schema. Pinned: a change here is a contract change. */
export const ASSURANCE_SCHEMA = 'overlay-oncology-assurance/1';

/** The referee's primary outcome. A preregistered criterion must name this metric. */
export const REFEREE_PRIMARY_METRIC = 'weighted_kappa';

export type RefereeGateName =
  | 'criteria-pack-hash'
  | 'engine-drift'
  | 'manifest-hash'
  | 'manifest-membership'
  | 'sut-identity'
  | 'sut-coverage'
  | 'negative-control'
  | 'scorable-set';

/** Gates that must all be cleared before a scorecard may support a hypothesis. */
export const REQUIRED_GATES: RefereeGateName[] = [
  'criteria-pack-hash',
  'manifest-hash',
  'manifest-membership',
  'sut-identity',
  'sut-coverage',
  'negative-control',
  'scorable-set',
];

export interface RefereeNegativeControl {
  sutId: string;
  weightedKappa: number;
  unweightedKappa?: number;
  margin?: number;
}

export interface RefereePrimary {
  sutA: string;
  sutB: string;
  nUnits: number;
  weightedKappa: number;
  unweightedKappa?: number;
  kappaCi?: { lower: number; upper: number };
}

export interface RefereeScoringReport {
  packId: string;
  criterionName: string;
  manifestHash: string;
  nCasesLocked: number;
  nCasesScored: number;
  primary: RefereePrimary;
  negativeControl: RefereeNegativeControl;
  gatesCleared: RefereeGateName[];
  limitations: string[];
}

export type RefereeOutcome =
  | { status: 'scored'; report: RefereeScoringReport }
  | { status: 'refused'; failure: { gate: string; reason: string; details?: string[] } };

export interface RefereeAssuranceArtifact {
  schema: string;
  generatedAt: string;
  subject: { id: string; name?: string; version?: string; kind?: string };
  outcome: RefereeOutcome;
  integrity: { algorithm: string; canonicalization?: string; outcomeHash: string; subjectHash?: string };
  anchor: { status: 'anchored' | 'refused' | 'not-requested'; tsa?: string; genTime?: string; tokenPath?: string; error?: string };
  limitations?: string[];
}

export interface GateOptions {
  /** Ceiling on |negativeControl.weightedKappa| for the control to count as near chance. */
  controlCeiling?: number;
  /** Require a verified anchor. Default true: a scorecard without trusted time is not evidence. */
  requireAnchor?: boolean;
  /** Required gates. Default REQUIRED_GATES. */
  requiredGates?: RefereeGateName[];
}

export interface RefereeGateCheck {
  /** May a `supported` verdict come from this artifact at all. */
  eligible: boolean;
  metricName: string;
  metric: number;
  n?: number;
  ciLo?: number;
  ciHi?: number;
  /** Every reason the artifact is not eligible. Empty means eligible. */
  reasons: string[];
  /** Where the artifact's hash and anchor live, so a reader can re-verify. */
  provenance: { outcomeHash: string; anchorStatus: string; tokenPath?: string; tsa?: string; genTime?: string };
}

const DEFAULT_CONTROL_CEILING = 0.2;

/**
 * Decide whether a referee artifact is allowed to move a hypothesis, and name
 * every reason it is not. Pure; no I/O; never throws on a malformed artifact
 * (it reports, because a thrown error in a research loop loses the reason).
 */
export function gateRefereeArtifact(
  artifact: RefereeAssuranceArtifact | null | undefined,
  opts: GateOptions = {},
): RefereeGateCheck {
  const reasons: string[] = [];
  const required = opts.requiredGates ?? REQUIRED_GATES;
  const ceiling = Math.abs(opts.controlCeiling ?? DEFAULT_CONTROL_CEILING);
  const requireAnchor = opts.requireAnchor !== false;

  const provenance = {
    outcomeHash: artifact?.integrity?.outcomeHash ?? '',
    anchorStatus: artifact?.anchor?.status ?? 'missing',
    tokenPath: artifact?.anchor?.tokenPath,
    tsa: artifact?.anchor?.tsa,
    genTime: artifact?.anchor?.genTime,
  };
  const base = { metricName: REFEREE_PRIMARY_METRIC, metric: Number.NaN, reasons, provenance };

  if (!artifact || typeof artifact !== 'object') {
    return { ...base, eligible: false, reasons: ['no artifact supplied'] };
  }
  if (artifact.schema !== ASSURANCE_SCHEMA) {
    return { ...base, eligible: false, reasons: [`wrong schema: expected ${ASSURANCE_SCHEMA}, got ${String(artifact.schema)}`] };
  }
  if (!artifact.integrity?.outcomeHash) {
    reasons.push('artifact carries no integrity.outcomeHash, so nothing can be re-verified');
  }

  // A refusal is information, but it is not a falsification.
  if (artifact.outcome.status === 'refused') {
    reasons.push(`refused at gate '${artifact.outcome.failure.gate}': ${artifact.outcome.failure.reason} (a refusal is INCONCLUSIVE, never falsified)`);
    return { ...base, eligible: false, reasons };
  }

  const report = artifact.outcome.report;
  if (requireAnchor && artifact.anchor.status !== 'anchored') {
    reasons.push(`anchor is '${artifact.anchor.status}', not 'anchored' (set requireAnchor:false to accept an unanchored scorecard)`);
  }

  const cleared = new Set(report.gatesCleared ?? []);
  const missing = required.filter((g) => !cleared.has(g));
  if (missing.length) reasons.push(`uncleared required gate(s): ${missing.join(', ')}`);

  const kappa = report.primary?.weightedKappa;
  if (!Number.isFinite(kappa)) {
    reasons.push('primary.weightedKappa is not finite; no metric to score');
  }

  // The falsification gate: a control that is not near chance means the scorecard
  // cannot distinguish the SUT from a shuffled label assignment.
  const control = report.negativeControl?.weightedKappa;
  if (!Number.isFinite(control)) {
    reasons.push('negativeControl.weightedKappa is missing; the falsification gate cannot be assessed');
  } else if (Math.abs(control) > ceiling) {
    reasons.push(`negative control |kappa|=${Math.abs(control)} exceeds the near-chance ceiling ${ceiling}; this scorecard does not falsify anything`);
  }

  const ci = report.primary?.kappaCi;
  return {
    ...base,
    eligible: reasons.length === 0,
    metric: Number.isFinite(kappa) ? kappa : Number.NaN,
    n: report.nCasesScored,
    ciLo: Number.isFinite(ci?.lower) ? ci?.lower : undefined,
    ciHi: Number.isFinite(ci?.upper) ? ci?.upper : undefined,
    reasons,
  };
}

/**
 * Translate a gated referee artifact into the RunResult `analysis.ts` consumes.
 *
 * Ineligible artifacts become `ok:false`, which `scoreAgainstCriterion` maps to
 * `inconclusive` — the honest verdict for "the run cannot decide this", as opposed
 * to `falsified`.
 */
export function fromReferee(
  artifact: RefereeAssuranceArtifact | null | undefined,
  opts: GateOptions = {},
): { result: RunResult; gate: RefereeGateCheck } {
  const gate = gateRefereeArtifact(artifact, opts);
  const runId = gate.provenance.outcomeHash ? `referee:${gate.provenance.outcomeHash.slice(0, 12)}` : 'referee:unknown';
  const name =
    artifact && artifact.outcome.status === 'scored'
      ? `${artifact.outcome.report.criterionName} (${artifact.outcome.report.primary.sutA} vs ${artifact.outcome.report.primary.sutB})`
      : undefined;
  return {
    gate,
    result: {
      runId,
      systemId: name,
      ok: gate.eligible,
      metricName: gate.metricName,
      metric: gate.metric,
      n: gate.n,
      ciLo: gate.ciLo,
      ciHi: gate.ciHi,
    },
  };
}

export interface ApplyReferee extends ApplyOutcome {
  gate: RefereeGateCheck;
}

/**
 * Compose the whole P7 step: gate the artifact, score it against the
 * preregistered criterion, update belief, and record the outcome.
 *
 * Gate reasons are appended to the recorded outcome detail, because a verdict
 * whose artifact was ineligible must say WHY it was inconclusive — otherwise the
 * ledger records a number with no reason, which is the defect this session keeps
 * finding.
 */
export function applyRefereeArtifact(
  doc: RegistryDoc,
  hypothesisId: string,
  artifact: RefereeAssuranceArtifact | null | undefined,
  criterion: Criterion,
  opts: GateOptions & { weight?: number; now?: string } = {},
): ApplyReferee {
  const { result, gate } = fromReferee(artifact, opts);
  const applied = applyRunToHypothesis(doc, hypothesisId, result, criterion, { weight: opts.weight, now: opts.now });
  if (gate.reasons.length === 0) return { ...applied, gate };

  // Append the gate reasons to the recorded outcome detail, then derive BOTH the
  // doc and the returned hypothesis from the SAME patched array. Returning a
  // patched doc beside an unpatched hypothesis would make the two disagree — the
  // caller reading `hypothesis` would see a verdict with no reason while the doc
  // carried one.
  const suffix = ` | not eligible: ${gate.reasons.join('; ')}`;
  const hypotheses = applied.doc.hypotheses.map((h) => {
    if (h.id !== hypothesisId) return h;
    const outcomes = [...h.outcomes];
    const last = outcomes[outcomes.length - 1];
    if (!last) return h;
    outcomes[outcomes.length - 1] = { ...last, detail: `${last.detail ?? ''}${suffix}`.trim() };
    return { ...h, outcomes };
  });
  const patchedDoc: RegistryDoc = { ...applied.doc, hypotheses };
  const patchedHypothesis = hypotheses.find((h) => h.id === hypothesisId) ?? applied.hypothesis;
  return { ...applied, doc: patchedDoc, hypothesis: patchedHypothesis, gate };
}
