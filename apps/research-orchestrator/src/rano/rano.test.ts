import { describe, it, expect } from 'vitest';
import { DEFAULT_RANO_POLICY, deriveResponse, type RootConcepts } from './concepts.js';
import {
  ConceptBottleneckModel,
  conceptInfluence,
  conceptMetrics,
  correctConcepts,
  fitLinearConcepts,
  labelMetrics,
  linearPredictor,
  type ConceptPredictor,
} from './bottleneck.js';
import { scoreResponseCohort, type ResponseCase } from './score.js';

const base = (over: Partial<RootConcepts> = {}): RootConcepts => ({
  sumProductsMm2: 1000,
  enhancingVolumeMm3: 2000,
  nonEnhancingVolumeMm3: 500,
  newLesions: 0,
  daysSinceRadiotherapy: 200, // outside the 12-week window by default
  onCorticosteroids: false,
  ...over,
});

describe('RANO 2.0 concept graph', () => {
  it('derives PR / SD / PD / CR from the 2D area', () => {
    expect(deriveResponse({ baseline: base(), current: base({ sumProductsMm2: 400 }) }).category).toBe('PR');
    expect(deriveResponse({ baseline: base(), current: base({ sumProductsMm2: 1100 }) }).category).toBe('SD');
    expect(deriveResponse({ baseline: base(), current: base({ sumProductsMm2: 1300 }) }).category).toBe('PD');
    expect(deriveResponse({ baseline: base(), current: base({ sumProductsMm2: 0 }) }).category).toBe('CR');
  });

  it('treats a new lesion as progression outright', () => {
    const d = deriveResponse({ baseline: base(), current: base({ newLesions: 1 }) });
    expect(d.category).toBe('PD');
    expect(d.reasons.join(' ')).toMatch(/new lesion/);
  });

  it('requires confirmation of progression within 12 weeks of radiotherapy', () => {
    const early = base({ sumProductsMm2: 1300, daysSinceRadiotherapy: 30 });
    const unconfirmed = deriveResponse({ baseline: base(), current: early });
    expect(unconfirmed.category).toBe('unconfirmed');
    expect(unconfirmed.needsConfirmation).toBe(true);

    expect(deriveResponse({ baseline: base(), current: early }, { confirmedProgression: true }).category).toBe('PD');
    expect(deriveResponse({ baseline: base(), current: base({ sumProductsMm2: 1300, daysSinceRadiotherapy: 200 }) }).category).toBe('PD');
  });

  it('is indeterminate when a required concept is missing (never invents a label)', () => {
    const d = deriveResponse({ baseline: base(), current: base({ sumProductsMm2: null }) });
    expect(d.category).toBe('indeterminate');
    expect(d.missing).toContain('sumProductsMm2');
  });

  it('assesses non-enhancing disease only for anti-angiogenic agents', () => {
    const b = base({ nonEnhancingVolumeMm3: 500 });
    const c = base({ nonEnhancingVolumeMm3: 700 }); // +40%
    expect(deriveResponse({ baseline: b, current: c }).category).toBe('SD');
    const aa = deriveResponse({ baseline: b, current: c }, { antiAngiogenic: true });
    expect(aa.category).toBe('PD');
    expect(aa.reasons.join(' ')).toMatch(/non-enhancing/);
  });
});

describe('concept-bottleneck model', () => {
  const fixed = (concepts: RootConcepts, confidence = 1): ConceptPredictor => ({
    name: 'fixed',
    predict: () => ({ concepts, confidence: { sumProductsMm2: confidence, newLesions: confidence } }),
  });

  it('derives the label from predicted concepts', () => {
    const model = new ConceptBottleneckModel(fixed(base({ sumProductsMm2: 1300 })));
    const r = model.predict(base(), []);
    expect(r.category).toBe('PD');
    expect(r.abstained).toBe(false);
  });

  it('abstains when a required concept is low-confidence', () => {
    const model = new ConceptBottleneckModel(fixed(base({ sumProductsMm2: 1300 }), 0.2));
    const r = model.predict(base(), []);
    expect(r.abstained).toBe(true);
    expect(r.category).toBe('indeterminate');
    expect(r.reasons.join(' ')).toMatch(/low confidence/);
  });

  it('a concept correction can change the label (inspectable + correctable)', () => {
    const predicted = base({ sumProductsMm2: 1300 });
    expect(deriveResponse({ baseline: base(), current: predicted }).category).toBe('PD');
    const corrected = correctConcepts(predicted, { sumProductsMm2: 1050 });
    expect(deriveResponse({ baseline: base(), current: corrected }).category).toBe('SD');
  });

  it('reports which concept the label depends on', () => {
    const influence = conceptInfluence(base(), base({ sumProductsMm2: 1300 }));
    expect(influence.find((i) => i.concept === 'sumProductsMm2')?.changesLabel).toBe(true);
    expect(influence.find((i) => i.concept === 'newLesions')?.changesLabel).toBe(false);
  });
});

describe('concept-bottleneck metrics', () => {
  it('fits a linear concept map and recovers it', () => {
    const X = Array.from({ length: 20 }, (_, i) => [i, i % 5]);
    const Y = X.map(([a, b]) => [10 + 3 * a - b, 2 - 0.5 * a + 2 * b]);
    const model = fitLinearConcepts(X, Y, { conceptNames: ['sumProductsMm2', 'newLesions'], lambda: 1e-8 });
    const pred = linearPredictor(model).predict([7, 2]).concepts;
    expect(pred.sumProductsMm2).toBeCloseTo(29, 3);
    expect(pred.newLesions).toBeCloseTo(2.5, 3);
  });

  it('reports concept MAE and label accuracy / macro-F1', () => {
    const p = [base({ sumProductsMm2: 1100 }), base({ sumProductsMm2: 1300 })];
    const t = [base({ sumProductsMm2: 1000 }), base({ sumProductsMm2: 1400 })];
    const cm = conceptMetrics(p, t);
    expect(cm.mae.sumProductsMm2).toBeCloseTo(100, 6);
    expect(cm.n).toBe(2);

    const lm = labelMetrics(['PD', 'PD'], ['SD', 'PD']);
    expect(lm.accuracy).toBeCloseTo(0.5, 6);
    expect(lm.labels).toEqual(expect.arrayContaining(['PD', 'SD']));
  });

  it('exposes the policy thresholds (protocol-defined, not invented)', () => {
    expect(DEFAULT_RANO_POLICY.confirmationWindowDays).toBe(84);
  });
});

describe('concept head — cohort scoring', () => {
  it('summarises the RANO 2.0 PsP proxy and confirmed PD rates', () => {
    const cases: ResponseCase[] = [
      { id: 'a', baseline: base(), current: base({ sumProductsMm2: 1300, daysSinceRadiotherapy: 30 }) }, // unconfirmed
      { id: 'b', baseline: base(), current: base({ sumProductsMm2: 1300, daysSinceRadiotherapy: 200 }) }, // PD
      { id: 'c', baseline: base(), current: base({ sumProductsMm2: 400 }) }, // PR
      { id: 'd', baseline: base(), current: base({ sumProductsMm2: null }) }, // indeterminate
    ];
    const { scores, summary } = scoreResponseCohort(cases);
    expect(summary.n).toBe(4);
    expect(summary.counts.unconfirmed).toBe(1);
    expect(summary.counts.PD).toBe(1);
    expect(summary.counts.PR).toBe(1);
    expect(summary.counts.indeterminate).toBe(1);
    expect(summary.pspProxyRate).toBe(0.25);
    expect(summary.confirmedPDRate).toBe(0.25);
    expect(summary.indeterminateRate).toBe(0.25);
    expect(scores[0].category).toBe('unconfirmed');
  });
});
