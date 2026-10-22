import { describe, it, expect } from 'vitest';
import { buildCadence } from '../cadence.js';
import { Orchestrator } from './orchestrator.js';
import { llmPolicy, rulePolicy, type ActorContext, type ActionDecision, type DecisionPolicy } from './policy.js';
import { ProvenanceMonitor } from './provenanceMonitor.js';
import { runActorCycle, type ExecutorState } from './index.js';
import type { HypothesisRecord, Preregistration } from '../srt/registry.js';
import type { ResponseCase } from '../rano/score.js';
import type { RootConcepts } from '../rano/concepts.js';

function prereg(id: string): HypothesisRecord {
  const p: Preregistration = {
    title: 't',
    mechanism: 'RANO lesion measurement error',
    dataPlan: 'LUMIERE',
    analysisPlan: 'kappa + cluster bootstrap',
    holdout: 'patient-grouped folds',
    primaryOutcome: 'flip rate',
    successCriterion: 'flip rate > 0.1',
    falsifier: 'flip rate <= 0.1',
    hash: 'abc',
    enteredAt: '2026-10-07',
  };
  return {
    id,
    title: 'Criteria-version flips',
    mechanism: 'RANO lesion measurement error',
    status: 'preregistered',
    createdAt: '2026-10-07',
    updatedAt: '2026-10-07',
    calibratedConfidence: 0.5,
    evidenceTier: 3,
    preregistration: p,
    outcomes: [],
  };
}

function idleCtx(): ActorContext {
  return {
    cpuBusyPct: 10,
    memUsedPct: 20,
    kaggleQuotaRemainingGpuHours: 10,
    cycleCountThisHour: 0,
    consecutiveErrors: 0,
    cadence: buildCadence({ hypotheses: [{ id: 'h1', status: 'preregistered' }] }),
    submittedCardIds: [],
  };
}

const state: ExecutorState = { hypotheses: [prereg('h1')], runs: [] };

const concept = (over: Partial<RootConcepts> = {}): RootConcepts => ({
  sumProductsMm2: 1000,
  enhancingVolumeMm3: 2000,
  nonEnhancingVolumeMm3: 500,
  newLesions: 0,
  daysSinceRadiotherapy: 200,
  onCorticosteroids: false,
  ...over,
});

describe('actor core — orchestrator / policy', () => {
  it('refuses an action that is not in the catalog', async () => {
    const bad = {
      name: 'bad',
      decide: () =>
        ({ action: 'delete-everything', input: {}, allowKaggle: false, allowLlm: false, intervalMs: 1, reason: 'no', by: 'bad' }) as unknown as ActionDecision,
    } as DecisionPolicy;
    const o = await new Orchestrator(bad).decide(idleCtx());
    expect(o.refused).toBe(true);
    expect(o.decision).toBeNull();
    expect(o.errors[0]).toMatch(/unknown action/);
  });

  it('rule policy yields when the machine is busy', () => {
    const d = rulePolicy.decide({ ...idleCtx(), cpuBusyPct: 95 });
    expect(d).toMatchObject({ action: 'pause', allowKaggle: false });
  });

  it('llm policy falls back to the rule decision on an invalid choice', async () => {
    const p = llmPolicy({ complete: async () => ({ action: 'not-a-real-action' }) });
    const d = await p.decide(idleCtx());
    expect(d.action).toBe('mint-run-cards'); // rule decision preserved
    expect(d.by).toBe('llm→rule');
  });

  it('llm policy accepts a valid catalog choice', async () => {
    const p = llmPolicy({ complete: async () => ({ action: 'evaluate-promotion', reason: 'evidence ready' }) });
    const d = await p.decide(idleCtx());
    expect(d.action).toBe('evaluate-promotion');
    expect(d.by).toBe('llm');
  });

  it('llm policy falls back when the model throws', async () => {
    const p = llmPolicy({ complete: async () => { throw new Error('model down'); } });
    const d = await p.decide(idleCtx());
    expect(d.action).toBe('mint-run-cards');
    expect(d.by).toBe('llm→rule');
    expect(d.reason).toMatch(/model down/);
  });
});

describe('actor core — cycle', () => {
  it('mints run cards through the executor and records a provenance spine', async () => {
    const res = await runActorCycle({ runId: 'run-1', ctx: idleCtx(), state });
    expect(res.orchestration.refused).toBe(false);
    expect(res.execution?.action).toBe('mint-run-cards');
    expect((res.execution?.result as { minted: number }).minted).toBe(1);
    expect(res.spine.runId).toBe('run-1');
    expect(res.spine.hash).toHaveLength(64);
    expect(res.spine.entities).toHaveLength(1);
    expect(res.riskState).toHaveLength(0);
  });

  it('pauses (no execution) when the machine is busy', async () => {
    const res = await runActorCycle({ runId: 'run-2', ctx: { ...idleCtx(), cpuBusyPct: 95 }, state });
    expect(res.execution?.action).toBe('pause');
    expect(res.spine.entities).toHaveLength(1);
  });

  it('selects submit-kaggle for a pending card and calls the submit port', async () => {
    let submitted = '';
    const ctx: ActorContext = {
      ...idleCtx(),
      cadence: buildCadence({ hypotheses: [] }), // no P4 step, so P6 is reachable
      pendingSubmitCardId: 'card-9',
      kaggleQuotaRemainingGpuHours: 10,
    };
    const res = await runActorCycle({
      runId: 'run-3',
      ctx,
      state: { hypotheses: [], runs: [] },
      ports: {
        submitKaggle: async ({ cardId }) => {
          submitted = cardId;
          return { available: true, externalId: 'kaggle-1', status: 'running' };
        },
      },
    });
    expect(res.execution?.action).toBe('submit-kaggle');
    expect(submitted).toBe('card-9');
    expect(res.execution?.ok).toBe(true);
  });

  it('runs the concept head when response evidence is ready (P7)', async () => {
    const cases: ResponseCase[] = [
      { id: 'c1', baseline: concept(), current: concept({ sumProductsMm2: 1300, daysSinceRadiotherapy: 30 }) },
      { id: 'c2', baseline: concept(), current: concept({ sumProductsMm2: 1300, daysSinceRadiotherapy: 200 }) },
    ];
    const ctx: ActorContext = { ...idleCtx(), responseFor: 'h1' };
    const res = await runActorCycle({
      runId: 'run-4',
      ctx,
      state: {
        hypotheses: [],
        runs: [],
        response: { hypothesisId: 'h1', cases, successCriterion: 'pspProxyRate >= 0.10', falsifier: 'pspProxyRate < 0.10' },
      },
    });
    expect(res.execution?.action).toBe('score-response');
    expect(res.execution?.ok).toBe(true);
    const result = res.execution?.result as {
      summary: { n: number; pspProxyRate: number; confirmedPDRate: number };
      verdict: { verdict: string };
    };
    expect(result.summary.n).toBe(2);
    expect(result.summary.pspProxyRate).toBe(0.5); // c1 is an unconfirmed early progression
    expect(result.summary.confirmedPDRate).toBe(0.5); // c2 is confirmed PD
    expect(result.verdict.verdict).toBe('supported'); // preregistered criterion met
  });
});

describe('actor core — provenance monitor', () => {
  it('carries cumulative risk forward across steps', () => {
    const m = new ProvenanceMonitor();
    m.record({ action: 'submit-kaggle', ok: false, reason: 'boom', riskLevel: 'high', at: 't' });
    m.record({ action: 'mint-run-cards', ok: true, reason: 'ok', riskLevel: 'none', at: 't' });
    expect(m.riskState).toHaveLength(1);
    expect(m.riskState[0]).toMatch(/submit-kaggle: boom/);
    expect(m.finalize('run-x').entities).toHaveLength(2);
  });
});
