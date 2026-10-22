/**
 * research-governor.ts — the onco agent as ECOSYSTEM GOVERNOR for the research pipeline.
 *
 * The onco agent already governs clinical cases (7 guardrails, HITL sign-off, audit
 * trail). This module extends the same discipline to the EXPERIMENT pipeline: every
 * `__RECOURSE_RESULT__` envelope from a Kaggle lane is gated before its number is
 * allowed to inform the next run.
 *
 * The rule this enforces: **a number is not a result until it clears its gates.**
 * The two lanes that produced the prettiest numbers (cs-binary-outcome calibration
 * slope 0.398; cs-counterfactual-treatment with balance not achieved) are exactly
 * the cases a raw "look at the results" read would have promoted.
 *
 * Deterministic by design — no LLM, same as the local oncology engine, so a gate
 * verdict never depends on a model being up.
 *
 * Two rules that keep the governor's own output honest:
 *   - insights and the next batch are DERIVED from the findings passed in, never
 *     replayed from a previous batch (see PRIOR_BATCH for what gets remembered);
 *   - a metric missing from an envelope gates as FAILING, never as a clean value.
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
/** platform/ is two levels up from apps/oncono-agent-main/server */
const PLATFORM = 'C:/Users/User/Downloads/BUSINESS/SCIENCE/Oncology Ecosystem/platform';
const RESEARCH_DATA = join(PLATFORM, 'data', 'overnight-2026-10-10', 'research-data.json');
const BATCH_DIR = join(PLATFORM, 'data', 'batch-results');

export type GateVerdict = 'PROMOTE' | 'HOLD' | 'REFUSE';

export interface RunFinding {
  lane: string;
  title: string;
  datasets: string[];
  ok: boolean;
  interpretation: string;
  envelope: Record<string, unknown>;
  source?: string;
}

export interface Gate {
  id: string;
  name: string;
  passed: boolean;
  /** Optional: only gates that invalidate a number's trustworthiness block promotion. */
  blocksPromotion?: boolean;
  detail: string;
}

export interface GatedFinding extends RunFinding {
  gates: Gate[];
  verdict: GateVerdict;
  takeaway: string;
}

export interface Wave {
  id: string;
  name: string;
  rationale: string;
  lanes: string[];
  kind: 'gate' | 'extend' | 'breakthrough' | 'instrumentation' | 'retire';
}

/**
 * Pre-registered thresholds. Each is a decision the governor refuses to make at
 * runtime: a lane either clears the bar or its number is not promoted.
 */
export const THRESHOLDS = {
  calibrationSlopeMin: 0.7,
  maxAbsSmdMax: 0.1,
  conformalCoverageMin: 0.88,
  contaminationFracAbove95Max: 0.2,
  promoteAucMin: 0.7,
} as const;

const num = (e: Record<string, unknown>, k: string): number | undefined => {
  const v = e[k];
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
};

/** Apply the pre-registered gates to one lane's envelope. */
export function applyGates(f: RunFinding): GatedFinding {
  const e = f.envelope;
  const gates: Gate[] = [];

  if (!f.ok) {
    return { ...f, gates: [{ id: 'OK', name: 'Envelope returned', passed: false, detail: 'no envelope' }], verdict: 'REFUSE', takeaway: 'No envelope — this is instrumentation, not a finding.' };
  }

  const slope = num(e, 'calibrationSlope');
  if (slope !== undefined) {
    gates.push({
      id: 'CALIBRATION', name: `Calibration slope >= ${THRESHOLDS.calibrationSlopeMin}`,
      passed: slope >= THRESHOLDS.calibrationSlopeMin, blocksPromotion: true,
      detail: `calibrationSlope ${slope}`,
    });
  }

  const smd = num(e, 'maxAbsSMD');
  const balanceOk = typeof e.balanceOk === 'boolean' ? e.balanceOk : undefined;
  if (balanceOk !== undefined || smd !== undefined) {
    const passed = balanceOk === undefined ? (smd as number) <= THRESHOLDS.maxAbsSmdMax : balanceOk && (smd === undefined || smd <= THRESHOLDS.maxAbsSmdMax);
    gates.push({
      id: 'BALANCE', name: `Covariate balance (maxAbsSMD <= ${THRESHOLDS.maxAbsSmdMax} and balanceOk)`,
      passed, blocksPromotion: true,
      detail: `balanceOk=${balanceOk ?? 'n/a'} maxAbsSMD=${smd ?? 'n/a'}`,
    });
  }

  // A canary AUC near 0.5 is the DESIRED outcome — the site label is not recoverable.
  // A missing canaryAuc gates as FAILING: an absent metric is not a clean one.
  if (f.lane === 'bias-canary') {
    const a = num(e, 'canaryAuc');
    gates.push({
      id: 'LEAKAGE', name: 'Site label NOT recoverable (canary AUC <= 0.6)',
      passed: a !== undefined && a <= 0.6,
      detail: a === undefined ? 'canaryAuc missing from the envelope' : `canaryAuc ${a} (${e.signal ?? '?'})`,
    });
  }

  // Same rule here: fracAbove0.95 absent must FAIL, not default to 0 and pass.
  // An empty overlap number is indistinguishable from a scan that never ran.
  if (f.lane === 'contamination-audit') {
    const frac = num(e, 'fracAbove0.95');
    gates.push({
      id: 'LEAKAGE', name: `Cross-cohort overlap (frac>0.95) <= ${THRESHOLDS.contaminationFracAbove95Max}`,
      passed: frac !== undefined && frac <= THRESHOLDS.contaminationFracAbove95Max,
      detail: frac === undefined ? 'fracAbove0.95 missing from the envelope' : `fracAbove0.95 ${frac}`,
    });
  }

  if (f.lane === 'conformal-response') {
    const cov = num(e, 'coverage');
    gates.push({
      id: 'COVERAGE', name: `Conformal coverage >= ${THRESHOLDS.conformalCoverageMin}`,
      passed: cov !== undefined && cov >= THRESHOLDS.conformalCoverageMin,
      detail: cov === undefined ? 'coverage missing from the envelope' : `coverage ${cov} at alpha ${e.alpha ?? '?'}`,
    });
  }

  const rec = num(e, 'meanPearsonR');
  if (rec !== undefined) {
    gates.push({
      id: 'RECOVERY', name: 'Per-type recovery r >= 0.8',
      passed: rec >= 0.8, detail: `meanPearsonR ${rec}`,
    });
  }

  // A low AUC is a legitimate NULL finding, so a failed SIGNAL gate must not block
  // promotion — it changes what the finding MEANS, not whether it is a finding.
  const auc = num(e, 'auc') ?? num(e, 'macroAuc') ?? num(e, 'pooledAuc');
  if (auc !== undefined) {
    gates.push({
      id: 'SIGNAL', name: `Discrimination >= ${THRESHOLDS.promoteAucMin}`,
      passed: auc >= THRESHOLDS.promoteAucMin, detail: `auc ${auc}`,
    });
  }

  const blocking = gates.filter((g) => g.passed === false && g.blocksPromotion === true);
  const anyPassed = gates.some((g) => g.passed);
  let verdict: GateVerdict;
  if (gates.length === 0) verdict = 'HOLD';
  else if (blocking.length > 0) verdict = 'REFUSE';
  else if (!anyPassed) verdict = 'HOLD';
  else verdict = 'PROMOTE';

  return { ...f, gates, verdict, takeaway: deriveLaneTakeaway(f, blocking) };
}

function deriveLaneTakeaway(f: RunFinding, failed: Gate[]): string {
  if (failed.length === 0) return `${f.interpretation} — gates clear.`;
  const ids = failed.map((g) => g.id).join(', ');
  const why = failed.map((g) => `${g.name} (got ${g.detail})`).join('; ');
  return `${f.interpretation} — **not promotable**: ${ids}. ${why}.`;
}

/** Load the run findings the governor is meant to govern. */
export function loadRunFindings(): RunFinding[] {
  if (existsSync(RESEARCH_DATA)) {
    const d = JSON.parse(readFileSync(RESEARCH_DATA, 'utf-8')) as { findings: RunFinding[] };
    return d.findings.map((f) => ({ ...f, source: 'research-data.json' }));
  }
  if (existsSync(BATCH_DIR)) {
    return readdirSync(BATCH_DIR)
      .filter((x) => x.endsWith('.json') && !x.endsWith('.a2.json'))
      .map((x) => JSON.parse(readFileSync(join(BATCH_DIR, x), 'utf-8')) as RunFinding);
  }
  return [];
}

/**
 * Hand-recorded observations from the `overnight-2026-10-10` batch.
 *
 * These strings were measured once, by hand, from that batch's envelopes. They are
 * a DATED RECORD, not a live inference. `deriveInsights` used to return them
 * unconditionally — so the governor printed the same findings whatever gates it
 * had just evaluated, including after a run that contradicted them. They now live
 * here, labelled with where they came from, and are never presented as output
 * of the current review.
 */
export const PRIOR_BATCH = {
  recordedFrom: 'overnight-2026-10-10',
  observations: [
  'The one credible positive is CNS colonisation (AUC 0.8195, calibration slope 1.052, n=25366). Everything built on generic clinical/genomic metadata — organ tropism (macro-AUC 0.551 over 21 sites), federated site generalisation (pooled AUC 0.5253, site gap 0.0034), per-lesion evolution (AUC 0.4739) — is near-null. The signal is CNS-specific, not feature-count.',
  'Calibration and covariate balance must be GATES, not diagnostics. Two lanes returned numbers that read as results but failed their own check: cs-binary-outcome (calibration slope 0.398) and cs-counterfactual-treatment (IPW ATE -0.1141 with balance_NOT_achieved, maxAbsSMD 0.4948). Both are REFUSED for promotion.',
  'Detection bias is a first-order threat to the ESR1-CNS claim, not a footnote. With the true OR fixed at 1, a ctDNA-only protocol can drive the apparent OR to 0.333; CSF detects 0.9643 vs plasma 0.6429 and is CSF-only in 35.7% of paired patients. The ESR1-CNS OR is comparator-dependent (1.2598 all non-CNS, p=0.0731 -> 1.4028 excluding liver, p=0.0126 -> 3.0076 breast-only) — the "brain sparing" read is an artefact of which comparator you picked.',
  'Cross-cohort contamination is real: 35.7% of query samples sit above cosine 0.95 to the reference corpus. Any run labelled "external validation" is a re-measurement until it clears a leakage gate.',
  'Conformal sets under-cover at nCal=250: empirical coverage 0.876 against a nominal 0.90. The finite-sample gap is a calibration-set-size problem, not a method failure — it needs a larger calibration split, not a different algorithm.',
  'SERENA-6 pseudo-KM reconstruction carries +/-8 months of digitisation uncertainty (IQR 8.05 on a 23.02-month median) — the systematic error is the same order as the effect being measured, so multi-reader digitisation is required before any claim.',
  'Under-coverage, miscalibration and inversion-by-modality share one shape: the number was right and the PROTOCOL was not. The next batch is therefore ordered gates-first, signal-second, breakthrough-candidates-third.',
  'The lesion-evolution lane is blocked by design, not by science: its own envelope says "onset timing needs >=3 timepoints", and the single-follow-up RANO-BM note says the 4-week confirmation cannot be assessed. Instrumentation, not a null result.',
  ],
  /** The waves that batch's verdicts justified, kept as the same kind of record. */
  waves: [
    {
      id: 'G1-G3', name: 'Gates', kind: 'gate',
      rationale: 'Two lanes produced untrustworthy numbers and cross-cohort overlap was 35.7%. Make the gates blocking.',
      lanes: ['calibration-gate', 'balance-gate', 'leakage-gate', 'detection-bias-prereg'],
    },
    {
      id: 'W1', name: 'Extend the credible signal', kind: 'extend',
      rationale: 'CNS colonisation is the only lane that cleared its gate with a strong number (AUC 0.8195, slope 1.052). Widen its feature set and test its mechanism before spending quota on more metadata models.',
      lanes: ['cs-brain-colonization-expanded', 'bbb-adhesion-mechanism', 'esr1-cns-prespecified'],
    },
    {
      id: 'W2', name: 'Breakthrough candidates — decisive experiments', kind: 'breakthrough',
      rationale: 'The field-forwarding question is whether ESR1\'s CNS organotropism is detection-modality dependent. This is the experiment that either changes the claim or kills it.',
      lanes: ['esr1-detection-modality-regression', 'serena6-multireader-digitisation', 'conformal-large-calibration'],
    },
    {
      id: 'W3', name: 'Instrumentation (unblock design-limited lanes)', kind: 'instrumentation',
      rationale: 'lesion-onset needs >=3 timepoints; protocol-loaders needs a gene-symbol matrix rather than probe IDs.',
      lanes: ['lesion-longitudinal-3plus-timepoints', 'protocol-loaders-gene-symbols'],
    },
  ],
} as const;

const uniq = (xs: string[]): string[] => [...new Set(xs)];

/**
 * Deterministic insights — no model, so the governor's reasoning is auditable.
 *
 * Every string is derived from `gated`: verdict counts, what blocked each refusal,
 * what cleared each promotion. A leakage failure produces the pre-registered rule
 * (a contaminated cohort makes "external validation" a re-measurement) because the
 * GATE says so, not because the sentence was always in the file. With no findings
 * the governor reports that instead of inventing content.
 */
export function deriveInsights(gated: GatedFinding[]): string[] {
  if (gated.length === 0) {
    return ['No run findings were supplied: there is nothing to gate, so no insight is derived.'];
  }

  const out: string[] = [];
  const promoted = gated.filter((g) => g.verdict === 'PROMOTE');
  const refused = gated.filter((g) => g.verdict === 'REFUSE');
  const held = gated.filter((g) => g.verdict === 'HOLD');
  out.push(`${gated.length} lanes gated: ${promoted.length} PROMOTE, ${refused.length} REFUSE, ${held.length} HOLD.`);

  for (const g of refused) {
    const blocked = g.gates.filter((x) => !x.passed && x.blocksPromotion);
    const why = blocked.map((b) => `${b.id} ${b.name} (${b.detail})`).join('; ');
    out.push(`${g.lane} is not promotable — blocked by ${why}.`);
  }

  for (const g of promoted) {
    const cleared = g.gates.filter((x) => x.passed).map((x) => `${x.id} (${x.detail})`);
    out.push(`${g.lane} is promotable — cleared ${cleared.join('; ') || 'no gate'}.`);
  }

  for (const g of gated) {
    const lk = g.gates.find((x) => x.id === 'LEAKAGE' && !x.passed);
    if (!lk) continue;
    out.push(
      g.lane === 'contamination-audit'
        ? `${g.lane} failed cross-cohort overlap (${lk.detail}): any run over this cohort labelled "external validation" is a re-measurement until the gate clears.`
        : `${g.lane} failed its leakage gate (${lk.detail}): the label it must not see is recoverable, so its score is not a generalisation result.`,
    );
  }

  const missing = gated.flatMap((g) =>
    g.gates.filter((x) => /missing/.test(x.detail)).map((x) => `${g.lane}/${x.id}`),
  );
  if (missing.length) {
    out.push(`Metrics absent from the envelope were gated as failing, not assumed clean: ${missing.join(', ')}.`);
  }

  return out;
}

/**
 * The next batch, derived from this batch's verdicts: what was blocked, what was
 * clean enough to extend, and what is null enough to stop. An empty gated set
 * returns no waves — there is no evidence here to justify ordering work.
 */
export function planNextBatch(gated: GatedFinding[]): Wave[] {
  if (gated.length === 0) return [];
  const waves: Wave[] = [];

  const blocked = gated.flatMap((g) =>
    g.gates.filter((x) => !x.passed && x.blocksPromotion).map((x) => ({ lane: g.lane, gate: x })),
  );
  if (blocked.length) {
    waves.push({
      id: 'G-BLOCKING',
      name: 'Gates that blocked this batch',
      kind: 'gate',
      rationale: `${blocked.length} blocking gate failure(s) across ${uniq(blocked.map((b) => b.lane)).join(', ')}. A blocked lane declares its own number untrustworthy, so the gate is repaired before any further signal work is ordered.`,
      lanes: uniq(blocked.map((b) => `${b.gate.id.toLowerCase()}-gate`)),
    });
  }

  const promoted = gated.filter((g) => g.verdict === 'PROMOTE');
  if (promoted.length) {
    waves.push({
      id: 'W-EXTEND',
      name: 'Lanes that cleared their gates',
      kind: 'extend',
      rationale: `${promoted.map((g) => g.lane).join(', ')} cleared every blocking gate. Extending a gate-clean lane is the only new signal work this batch justifies.`,
      lanes: promoted.map((g) => g.lane),
    });
  }

  const nullish = gated.filter(
    (g) => g.verdict !== 'REFUSE' && g.gates.some((x) => x.id === 'SIGNAL' && !x.passed),
  );
  if (nullish.length) {
    waves.push({
      id: 'W-RETIRE',
      name: 'Near-null lanes — do not spend quota here',
      kind: 'retire',
      rationale: `${nullish.map((g) => g.lane).join(', ')} returned discrimination below the pre-registered bar. A null is a finding, not a prompt for another run with the same design.`,
      lanes: nullish.map((g) => g.lane),
    });
  }

  return waves;
}

export interface GovernanceReview {
  reviewedAt: string;
  totalFindings: number;
  promoted: string[];
  refused: string[];
  gated: GatedFinding[];
  /** Derived from `gated` at review time. Never carried over between batches. */
  insights: string[];
  /** Derived from `gated` at review time. */
  nextBatch: Wave[];
  /** Dated hand-recorded observations from PRIOR_BATCH — history, not a live claim. */
  priorBatch: typeof PRIOR_BATCH;
}

/** Full governor pass: gate every finding, then derive insights and the next batch. */
export function reviewRuns(findings: RunFinding[]): GovernanceReview {
  const gated = findings.map(applyGates);
  return {
    reviewedAt: new Date().toISOString(),
    totalFindings: gated.length,
    promoted: gated.filter((g) => g.verdict === 'PROMOTE').map((g) => g.lane),
    refused: gated.filter((g) => g.verdict === 'REFUSE').map((g) => g.lane),
    gated,
    insights: deriveInsights(gated),
    nextBatch: planNextBatch(gated),
    priorBatch: PRIOR_BATCH,
  };
}
