import { describe, it, expect } from 'vitest';
import { buildTeamPlan, planSummary } from './team.js';
import { createRegistry, upsertHypothesis, preregister } from './srt/registry.js';
import { buildRunCard } from './srt/experiment.js';
import type { ResearchDirective } from './types.js';

const directive: ResearchDirective = { objective: 'Test reaction kinetics.', questions: [], direction: 'mechanism-mapping' };
const SPEC = { dataPlan: 'd', analysisPlan: 'a', holdout: 'h', primaryOutcome: 'o', successCriterion: 's', falsifier: 'f' };

describe('team plan', () => {
  it('mints a run card for a preregistered hypothesis that has no run', () => {
    const { doc, hypothesis } = upsertHypothesis(createRegistry(), { title: 'Reaction kinetics depend on temperature', mechanism: 'Arrhenius' });
    const locked = preregister(doc, hypothesis.id, SPEC).hypothesis;
    const plan = buildTeamPlan({ studyId: 's', directive, contributions: [], claims: [], hypotheses: [locked], runs: [] });
    expect(plan.runCards).toHaveLength(1);
    expect(plan.runCards[0]!.hypothesisId).toBe(locked.id);
    expect(plan.runCards[0]!.target).toMatchObject({ kind: 'fleet', systemId: 'chemlab' });
    expect(plan.tasks.some((t) => t.kind === 'run-experiment')).toBe(true);
    expect(planSummary(plan)).toContain('hypothesis(es)');
  });

  it('does not re-mint a run card when the hypothesis already has one', () => {
    const { doc, hypothesis } = upsertHypothesis(createRegistry(), { title: 'Reaction kinetics depend on temperature', mechanism: 'Arrhenius' });
    const locked = preregister(doc, hypothesis.id, SPEC).hypothesis;
    const card = buildRunCard(locked, locked.preregistration!);
    const plan = buildTeamPlan({ studyId: 's', directive, contributions: [], claims: [], hypotheses: [locked], runs: [card] });
    expect(plan.runCards).toHaveLength(0);
    expect(plan.tasks.some((t) => t.kind === 'run-experiment')).toBe(false);
  });

  it('proposes preregistration for a fresh hypothesis', () => {
    const { hypothesis } = upsertHypothesis(createRegistry(), { title: 'A brand new idea', mechanism: 'm' });
    const plan = buildTeamPlan({ studyId: 's', directive, contributions: [], claims: [], hypotheses: [hypothesis], runs: [] });
    expect(plan.tasks[0]).toMatchObject({ kind: 'preregister', target: hypothesis.id, priority: 'high' });
  });
});