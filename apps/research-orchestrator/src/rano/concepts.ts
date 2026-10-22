// ── RANO 2.0 concept graph (deterministic) ───────────────────────────────────
// The concept-bottleneck core (TRACE, arXiv 2606.30313): predict clinically
// meaningful measurements as CONCEPTS, then derive the response category by
// deterministic RANO rules. This file is the deterministic head — pure, testable,
// correctable. It never invents a concept: a missing required measurement yields
// `indeterminate`, not a label.
//
// Grounded rules (RANO 2.0, JCO 2024):
//   - the POST-RADIOTHERAPY MRI is the baseline (the caller supplies it as such);
//   - progression within 12 weeks of radiotherapy must be CONFIRMED (repeat MRI
//     or histopathology), so an unconfirmed early progression is not PD;
//   - the primary measurement is the 2D maximum cross-sectional area, with
//     volumetric measurement optional;
//   - non-enhancing disease is assessed only for anti-angiogenic agents
//     (IDH-wildtype glioblastoma).
//
// NOT grounded here, and therefore POLICY not fact: the percentage thresholds.
// They are protocol-defined; the defaults below are the widely used RANO glioma
// values and must be confirmed against the trial protocol before any claim
// depends on them.

export type ResponseCategory = 'CR' | 'PR' | 'SD' | 'PD' | 'unconfirmed' | 'indeterminate';

export interface RanoPolicy {
  /** PD: current 2D area >= baseline * (1 + this). */
  pdIncreasePct: number;
  /** PR: current 2D area <= baseline * (1 - this). */
  prDecreasePct: number;
  /** Non-enhancing volume increase counting toward PD when anti-angiogenic. */
  nonEnhancingPdIncreasePct: number;
  /** Days after radiotherapy inside which progression must be confirmed (12 weeks). */
  confirmationWindowDays: number;
  /** Area (mm^2) at or below which target lesions count as disappeared. */
  crAreaMm2: number;
}

export const DEFAULT_RANO_POLICY: RanoPolicy = {
  pdIncreasePct: 0.25,
  prDecreasePct: 0.5,
  nonEnhancingPdIncreasePct: 0.25,
  confirmationWindowDays: 84, // 12 weeks
  crAreaMm2: 0,
};

/** The root concepts a bottleneck model predicts. */
export interface RootConcepts {
  /** Sum of products of perpendicular diameters of target lesions (mm^2) — the 2D primary. */
  sumProductsMm2: number | null;
  /** Enhancing tumour volume (mm^3) — the optional volumetric measurement. */
  enhancingVolumeMm3: number | null;
  /** Non-enhancing tumour volume (mm^3). */
  nonEnhancingVolumeMm3: number | null;
  /** Count of unequivocal new lesions. */
  newLesions: number | null;
  /** Days from the end of radiotherapy to this scan. */
  daysSinceRadiotherapy: number | null;
  /** On corticosteroids (confounds clinical interpretation). */
  onCorticosteroids: boolean | null;
}

export const ROOT_CONCEPT_KEYS: Array<keyof RootConcepts> = [
  'sumProductsMm2',
  'enhancingVolumeMm3',
  'nonEnhancingVolumeMm3',
  'newLesions',
  'daysSinceRadiotherapy',
  'onCorticosteroids',
];

/** Concepts required to derive ANY response (the rest are optional/contextual). */
export const REQUIRED_CONCEPT_KEYS: Array<keyof RootConcepts> = ['sumProductsMm2', 'newLesions'];

export interface ConceptPair {
  baseline: RootConcepts;
  current: RootConcepts;
}

export interface DerivedResponse {
  category: ResponseCategory;
  /** Required concepts that were missing (=> indeterminate). */
  missing: string[];
  reasons: string[];
  /** True when a progression was seen inside the window but is unconfirmed. */
  needsConfirmation: boolean;
}

export interface DeriveOptions {
  antiAngiogenic?: boolean;
  confirmedProgression?: boolean;
  policy?: RanoPolicy;
}

/** The deterministic RANO head: concepts in, response category out. */
export function deriveResponse(pair: ConceptPair, opts: DeriveOptions = {}): DerivedResponse {
  const policy = opts.policy ?? DEFAULT_RANO_POLICY;
  const b = pair.baseline;
  const c = pair.current;
  const reasons: string[] = [];

  const missing: string[] = [];
  for (const k of REQUIRED_CONCEPT_KEYS) {
    if (b[k] == null || c[k] == null) missing.push(k);
  }
  if (missing.length) {
    return { category: 'indeterminate', missing, reasons: [`missing required concept(s): ${missing.join(', ')}`], needsConfirmation: false };
  }

  const confirm = (category: ResponseCategory, why: string): DerivedResponse => {
    const inWindow = c.daysSinceRadiotherapy != null && c.daysSinceRadiotherapy <= policy.confirmationWindowDays;
    if (category === 'PD' && inWindow && !opts.confirmedProgression) {
      return {
        category: 'unconfirmed',
        missing,
        reasons: [...reasons, why, `progression within ${policy.confirmationWindowDays}d of radiotherapy requires confirmation (RANO 2.0)`],
        needsConfirmation: true,
      };
    }
    return { category, missing, reasons: [...reasons, why], needsConfirmation: false };
  };

  // New lesions are progression outright.
  if ((c.newLesions ?? 0) > 0) {
    return confirm('PD', `${c.newLesions} new lesion(s)`);
  }

  const base = b.sumProductsMm2 ?? 0;
  const cur = c.sumProductsMm2 ?? 0;

  // Anti-angiogenic agents: non-enhancing disease is assessed and can drive PD.
  if (opts.antiAngiogenic && b.nonEnhancingVolumeMm3 != null && c.nonEnhancingVolumeMm3 != null && b.nonEnhancingVolumeMm3 > 0) {
    const ratio = c.nonEnhancingVolumeMm3 / b.nonEnhancingVolumeMm3;
    if (ratio >= 1 + policy.nonEnhancingPdIncreasePct) {
      return confirm('PD', `non-enhancing volume +${((ratio - 1) * 100).toFixed(1)}% (anti-angiogenic)`);
    }
  }

  if (base <= policy.crAreaMm2) {
    // Baseline measured as disappeared; any measurable recurrence is progression.
    return cur <= policy.crAreaMm2 ? confirm('CR', 'target lesions absent at both timepoints') : confirm('PD', 'measurable disease recurred from a zero baseline');
  }

  const ratio = cur / base;
  if (cur <= policy.crAreaMm2) return confirm('CR', 'target lesions disappeared');
  if (ratio >= 1 + policy.pdIncreasePct) return confirm('PD', `2D area +${((ratio - 1) * 100).toFixed(1)}% (>= +${(policy.pdIncreasePct * 100).toFixed(0)}%)`);
  if (ratio <= 1 - policy.prDecreasePct) return confirm('PR', `2D area ${((ratio - 1) * 100).toFixed(1)}% (<= -${(policy.prDecreasePct * 100).toFixed(0)}%)`);
  reasons.push(`2D area ${((ratio - 1) * 100).toFixed(1)}% between PR and PD thresholds`);
  if (c.onCorticosteroids === true) reasons.push('on corticosteroids: clinical status confounds the category');
  return { category: 'SD', missing, reasons, needsConfirmation: false };
}
