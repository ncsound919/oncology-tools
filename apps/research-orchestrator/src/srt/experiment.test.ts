import { describe, it, expect } from 'vitest';
import { createRegistry, upsertHypothesis, preregister, type HypothesisRecord, type Preregistration } from './registry.js';
import { routeHypothesis, buildRunCard, runCardFingerprint, weekId, daySeed } from './experiment.js';

const SPEC = {
  dataPlan: 'locked cohort + reference corpus',
  analysisPlan: 'nearest-neighbour cosine distribution',
  holdout: 'held-out test split',
  primaryOutcome: 'fraction of queries above 0.95 cosine',
  successCriterion: 'frac > 0.95 below 0.05',
  falsifier: 'frac > 0.05',
};

function hyp(title: string, mechanism: string): { h: HypothesisRecord; pre: Preregistration } {
  const { doc, hypothesis } = upsertHypothesis(createRegistry(), { title, mechanism });
  const r = preregister(doc, hypothesis.id, SPEC);
  return { h: r.hypothesis, pre: r.hypothesis.preregistration! };
}

describe('srt experiment generator', () => {
  it('routes methodological claims to the Kaggle lane', () => {
    expect(routeHypothesis({ title: 'Benchmark contamination inflates FM scores', mechanism: 'pretraining leakage' })?.target).toMatchObject({ kind: 'kaggle-remote', experimentId: 'contamination-audit' });
    expect(routeHypothesis({ title: 'A foundation model slide embedding separates grades', mechanism: 'ViT pathology tiles' })?.target).toMatchObject({ kind: 'kaggle-remote', experimentId: 'fm-embed' });
    expect(routeHypothesis({ title: 'Scanner site is recoverable from features', mechanism: 'batch shortcut' })?.target).toMatchObject({ kind: 'kaggle-remote', experimentId: 'bias-canary' });
  });

  it('routes BCBM / CNS-metastasis claims to the new response lanes', () => {
    expect(routeHypothesis({ title: 'RANO-BM response in breast cancer brain metastases', mechanism: 'intracranial response' })?.target).toMatchObject({ kind: 'kaggle-remote', experimentId: 'rano-bm' });
    expect(routeHypothesis({ title: 'Volumetric beats 1D measurement', mechanism: 'per-lesion 3D measurement' })?.target).toMatchObject({ kind: 'kaggle-remote', experimentId: 'volumetric-response' });
    expect(routeHypothesis({ title: 'CSF ctDNA detects CNS-only clones', mechanism: 'cerebrospinal liquid biopsy' })?.target).toMatchObject({ kind: 'kaggle-remote', experimentId: 'csf-ctdna' });
    expect(routeHypothesis({ title: 'A concept bottleneck separates pseudoprogression from true progression', mechanism: 'RANO 2.0 interpretable concepts' })?.target).toMatchObject({ kind: 'kaggle-remote', experimentId: 'concept-bottleneck' });
    expect(routeHypothesis({ title: 'SERENA-6 DCO3 reconstruction from the KM curve', mechanism: 'digitization uncertainty' })?.target).toMatchObject({ kind: 'kaggle-remote', experimentId: 'serena6-multirun' });
    expect(routeHypothesis({ title: 'Phase B processed matrix signature presence', mechanism: 'GSE322943 BCBM cohort' })?.target).toMatchObject({ kind: 'kaggle-remote', experimentId: 'protocol-loaders' });
  });

  it('routes mechanistic claims to the fleet and carries the required inputs', () => {
    const surv = routeHypothesis({ title: 'Resistance escape shortens survival', mechanism: 'hazard model' });
    expect(surv?.target).toMatchObject({ kind: 'fleet', systemId: 'overlay-oncology', stage: 'simulation' });
    if (surv && surv.target.kind === 'fleet') expect(surv.target.requiredInputs).toContain('ic50');

    const kin = routeHypothesis({ title: 'Reaction kinetics depend on temperature', mechanism: 'Arrhenius' });
    expect(kin?.target).toMatchObject({ kind: 'fleet', systemId: 'chemlab' });
    if (kin && kin.target.kind === 'fleet') expect(kin.target.requiredInputs).toEqual(expect.arrayContaining(['temperature', 'totalTime']));
  });

  it('does not false-match short tokens inside longer words', () => {
    expect(routeHypothesis({ title: 'Pharma economics of pricing', mechanism: 'market' })).toBeNull();
    expect(routeHypothesis({ title: 'The opposite of a control', mechanism: 'rhetoric' })).toBeNull();
  });

  it('seeds are pinned to sha256(weekId|day)', () => {
    expect(weekId(new Date('2026-10-07T12:00:00Z'))).toMatch(/^2026-W\d{2}$/);
    expect(daySeed('2026-W41', '2026-10-07')).toBe(daySeed('2026-W41', '2026-10-07'));
    expect(daySeed('2026-W41', '2026-10-07')).not.toBe(daySeed('2026-W41', '2026-10-08'));
    expect(daySeed('2026-W41', '2026-10-07')).toHaveLength(64);
  });

  it('builds a routed run card with the required inputs and a deterministic id', () => {
    const { h, pre } = hyp('Reaction kinetics depend on temperature', 'Arrhenius catalyst');
    const card = buildRunCard(h, pre, { now: '2026-10-07T12:00:00Z' });
    expect(card.target).toMatchObject({ kind: 'fleet', systemId: 'chemlab' });
    expect(card.requiredInputs).toEqual(expect.arrayContaining(['temperature', 'totalTime']));
    expect(card.seeds.day).toBe('2026-10-07');
    expect(card.successCriterion).toBe(SPEC.successCriterion);
    expect(runCardFingerprint(card)).toBe(runCardFingerprint(buildRunCard(h, pre, { now: '2026-10-07T12:00:00Z' })));
  });

  it('builds an unrouted card honestly when nothing fits', () => {
    const { h, pre } = hyp('A novel claim no adapter covers', 'unclassified phenomenon');
    const card = buildRunCard(h, pre, { now: '2026-10-07T12:00:00Z' });
    expect(card.target).toBeNull();
    expect(card.notes).toMatch(/Unrouted/);
  });
});
