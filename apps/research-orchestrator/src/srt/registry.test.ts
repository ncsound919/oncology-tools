import { describe, it, expect } from 'vitest';
import {
  createRegistry,
  canonicalize,
  preRegHash,
  tokenize,
  jaccard,
  findNearDuplicates,
  upsertHypothesis,
  preregister,
  recordOutcome,
  retract,
  nullLedger,
  makeHypothesisId,
  type PreregistrationInput,
} from './registry.js';

const SPEC = {
  dataPlan: 'locked cohort, patient-clustered hold-out',
  analysisPlan: 'paired bootstrap of the flip-rate difference',
  holdout: '30% of patients, split by patient id, locked before first look',
  primaryOutcome: 'flat-call flip rate',
  successCriterion: 'upper 95% bound of flip rate <= 0.20',
  falsifier: 'upper 95% bound > 0.20 OR effect vanishes after reader adjustment',
};

describe('srt registry', () => {
  it('canonicalize is key-order independent and preRegHash is stable', () => {
    expect(canonicalize({ b: 1, a: 2 })).toBe(canonicalize({ a: 2, b: 1 }));
    const base: PreregistrationInput = { title: 'T', mechanism: 'M', ...SPEC };
    expect(preRegHash(base)).toBe(preRegHash({ ...base }));
    expect(preRegHash(base)).toMatch(/^[0-9a-f]{64}$/);
  });

  it('upsert creates then dedupes by identity without losing a locked plan', () => {
    const a = upsertHypothesis(createRegistry(), { title: 'Hypoxia drives plasticity', mechanism: 'HIF2A loop' });
    expect(a.created).toBe(true);
    expect(a.hypothesis.status).toBe('proposed');
    const locked = preregister(a.doc, a.hypothesis.id, SPEC).doc;
    const b = upsertHypothesis(locked, { title: 'Hypoxia drives plasticity', mechanism: 'HIF2A loop', noveltyScore: 70 });
    expect(b.created).toBe(false);
    expect(b.doc.hypotheses).toHaveLength(1);
    expect(b.hypothesis.preregistration?.hash).toBeTruthy();
    expect(b.hypothesis.noveltyScore).toBe(70);
  });

  it('makeHypothesisId is deterministic under cosmetic edits', () => {
    expect(makeHypothesisId('A B!', 'm')).toBe(makeHypothesisId('a b', 'm'));
    expect(makeHypothesisId('A B!', 'm')).toMatch(/^hyp_a-b_[0-9a-f]{6}$/);
  });

  it('refuses to preregister a non-proposed hypothesis and refuses empty fields', () => {
    const { doc, hypothesis } = upsertHypothesis(createRegistry(), { title: 'X', mechanism: 'Y' });
    const locked = preregister(doc, hypothesis.id, SPEC).doc;
    expect(() => preregister(locked, hypothesis.id, SPEC)).toThrow(/cannot preregister a preregistered/);
    const d2 = upsertHypothesis(createRegistry(), { title: 'Z', mechanism: 'W' });
    expect(() => preregister(d2.doc, d2.hypothesis.id, { ...SPEC, falsifier: '   ' })).toThrow(/falsifier/);
  });

  it('refuses an outcome before preregistration and routes falsified into the null ledger', () => {
    const { doc, hypothesis } = upsertHypothesis(createRegistry(), { title: 'Unregistered', mechanism: 'none' });
    expect(() => recordOutcome(doc, hypothesis.id, { verdict: 'supported' })).toThrow(/before preregistration/);

    const { doc: d, hypothesis: h } = upsertHypothesis(createRegistry(), { title: 'Falsifiable', mechanism: 'm' });
    const locked = preregister(d, h.id, SPEC).doc;
    const fal = recordOutcome(locked, h.id, { verdict: 'falsified', metric: 0.31 }).hypothesis;
    expect(fal.status).toBe('falsified');
    const next = recordOutcome(locked, h.id, { verdict: 'falsified', metric: 0.31 }).doc;
    expect(nullLedger(next)).toHaveLength(1);
  });

  it('retract is terminal for outcomes', () => {
    const { doc, hypothesis } = upsertHypothesis(createRegistry(), { title: 'Retractable', mechanism: 'm' });
    const r = retract(doc, hypothesis.id, 'prior work found first').hypothesis;
    expect(r.status).toBe('retracted');
    expect(() => recordOutcome(retract(doc, hypothesis.id, 'x').doc, hypothesis.id, { verdict: 'supported' })).toThrow(/retracted/);
  });

  it('novelty flags a near-duplicate and passes a distinct idea', () => {
    const { doc } = upsertHypothesis(createRegistry(), {
      title: 'HIF2A-driven dedifferentiation drives therapy resistance',
      mechanism: 'hypoxia transcription loop',
    });
    expect(findNearDuplicates(doc, { title: 'HIF2A driven dedifferentiation causes therapy resistance', mechanism: 'hypoxia loop' }, 0.4).length).toBeGreaterThan(0);
    expect(findNearDuplicates(doc, { title: 'ctDNA half-life predicts pseudoprogression', mechanism: 'clearance kinetics' }, 0.4)).toHaveLength(0);
  });

  it('tokenize and jaccard behave on known inputs', () => {
    expect(tokenize('The HIF2A loop, driven by hypoxia!')).toEqual(['hif2a', 'loop', 'driven', 'hypoxia']);
    expect(jaccard(['a', 'b'], ['a', 'b'])).toBe(1);
    expect(jaccard(['a'], ['b'])).toBe(0);
    expect(jaccard([], [])).toBe(0);
  });
});
