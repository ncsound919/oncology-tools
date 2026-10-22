import { describe, it, expect } from 'vitest';
import { buildWorldModel, proposeNextTasks } from './model.js';
import type { Claim, Contribution, ResearchDirective } from '../types.js';
import { createRegistry, upsertHypothesis, preregister, type HypothesisRecord } from '../srt/registry.js';
import { buildRunCard, type RunCard } from '../srt/experiment.js';

const directive: ResearchDirective = {
  objective: 'Determine whether HIF2A drives resistance escape.',
  hypothesis: 'HIF2A-driven dedifferentiation drives resistance',
  questions: ['Does HIF2A inhibition restore sensitivity?'],
  direction: 'mechanism-mapping',
};

const contributions: Contribution[] = [
  { systemId: 'overlay-oncology', kind: 'insight', title: 'x', detail: 'y' },
  { systemId: 'umoe', kind: 'offline', title: 'umoe offline', detail: 'no response' },
];

function claim(id: string, kind: Claim['kind'], verified: boolean): Claim {
  return {
    claimId: id, runId: 'study_1', text: `${kind} claim ${id}`, kind,
    evidenceRefs: [{ type: 'system-output', id: 'overlay-oncology' }],
    evidenceDepth: 'derived', evidenceClass: 'computed', confidence: 0.7,
    verified, unresolvableRefs: [], createdAt: '2026-10-07T00:00:00Z',
  };
}

function hypWith(status: 'proposed' | 'preregistered' | 'falsified'): { h: HypothesisRecord; runs: RunCard[] } {
  const SPEC = { dataPlan: 'd', analysisPlan: 'a', holdout: 'h', primaryOutcome: 'o', successCriterion: 's', falsifier: 'f' };
  const { doc, hypothesis } = upsertHypothesis(createRegistry(), { title: `Hypothesis ${status}`, mechanism: 'm' });
  if (status === 'proposed') return { h: hypothesis, runs: [] };
  const locked = preregister(doc, hypothesis.id, SPEC).hypothesis;
  if (status === 'preregistered') return { h: locked, runs: [] };
  return { h: { ...locked, status: 'falsified' }, runs: [] };
}

describe('world model', () => {
  it('assembles the state of a run', () => {
    const { h } = hypWith('preregistered');
    const model = buildWorldModel({
      studyId: 'study_1', directive, contributions,
      claims: [claim('c1', 'finding', true), claim('c2', 'hypothesis', true), claim('c3', 'gap', false)],
      hypotheses: [h], runs: [],
    });
    expect(model.studyId).toBe('study_1');
    expect(model.standingHypothesis).toContain('HIF2A');
    expect(model.systemsOnline).toEqual(['overlay-oncology']);
    expect(model.systemsOffline).toEqual(['umoe']);
    expect(model.verifiedClaims).toBe(2);
    expect(model.quarantinedClaims).toBe(1);
    expect(model.gaps).toHaveLength(0); // c3 is a gap but unverified
    expect(model.hypotheses).toHaveLength(1);
  });

  it('proposes preregister for a proposed hypothesis and run-experiment for a preregistered one', () => {
    const { h: proposed } = hypWith('proposed');
    const m1 = buildWorldModel({ studyId: 's', directive, contributions: [], claims: [], hypotheses: [proposed], runs: [] });
    const t1 = proposeNextTasks(m1);
    expect(t1.some((t) => t.kind === 'preregister' && t.target === proposed.id && t.priority === 'high')).toBe(true);

    const { h: pre, runs } = hypWith('preregistered');
    const m2 = buildWorldModel({ studyId: 's', directive, contributions: [], claims: [], hypotheses: [pre], runs: [] });
    expect(proposeNextTasks(m2).some((t) => t.kind === 'run-experiment' && t.target === pre.id)).toBe(true);

    const card = buildRunCard(pre, pre.preregistration!);
    const m3 = buildWorldModel({ studyId: 's', directive, contributions: [], claims: [], hypotheses: [pre], runs: [card] });
    expect(proposeNextTasks(m3).some((t) => t.kind === 'run-experiment')).toBe(false);
    void runs;
  });

  it('surfaces offline systems, quarantined claims, and falsified hypotheses; sorts by priority', () => {
    const { h: falsified } = hypWith('falsified');
    const model = buildWorldModel({
      studyId: 's', directive, contributions,
      claims: [claim('c1', 'finding', false)],
      hypotheses: [falsified], runs: [],
    });
    const tasks = proposeNextTasks(model);
    expect(tasks[0]!.priority).toBe('high'); // quarantined claims rank first
    expect(tasks.some((t) => t.target === 'umoe' && t.kind === 'gather-evidence')).toBe(true);
    expect(tasks.some((t) => t.target === falsified.id && t.kind === 'review-literature' && t.priority === 'low')).toBe(true);
    // priorities are non-decreasing (sorted)
    for (let i = 1; i < tasks.length; i++) {
      expect(['high', 'medium', 'low'].indexOf(tasks[i - 1]!.priority)).toBeLessThanOrEqual(['high', 'medium', 'low'].indexOf(tasks[i]!.priority));
    }
  });
});