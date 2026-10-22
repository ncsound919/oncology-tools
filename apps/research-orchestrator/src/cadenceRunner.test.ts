import { describe, it, expect } from 'vitest';
import { runCadenceCycle, runCadenceLoop } from './cadenceRunner.js';
import type { HypothesisRecord, Preregistration } from './srt/registry.js';

function prereg(id: string): HypothesisRecord {
  const p: Preregistration = {
    title: 't', mechanism: 'RANO lesion measurement error', dataPlan: 'LUMIERE', analysisPlan: 'kappa + cluster bootstrap',
    holdout: 'patient-grouped folds', primaryOutcome: 'flip rate', successCriterion: 'flip rate > 0.1', falsifier: 'flip rate <= 0.1', hash: 'abc', enteredAt: '2026-10-07',
  };
  return {
    id, title: 'Criteria-version flips', mechanism: 'RANO lesion measurement error', status: 'preregistered',
    createdAt: '2026-10-07', updatedAt: '2026-10-07', calibratedConfidence: 0.5, evidenceTier: 3, preregistration: p, outcomes: [],
  };
}

describe('Phase 4 — cadence executor', () => {
  it('mints a run card for a preregistered hypothesis without one, and defers the rest', () => {
    const c = runCadenceCycle({ hypotheses: [prereg('h1')], runs: [] });
    expect(c.progressed).toBe(true);
    expect(c.mintedRunCards).toHaveLength(1);
    expect(c.mintedRunCards[0].hypothesisId).toBe('h1');
    expect(c.mintedRunCards[0].target).not.toBeNull(); // routes to rano-perturbation
    const phases = c.deferred.map((d) => d.phase);
    expect(phases).toContain('P6'); // execution is external
    expect(c.deferred.find((d) => d.phase === 'P6')?.reason).toMatch(/Recourse|wet-lab/);
  });

  it('does not re-mint a card that already exists', () => {
    const h = prereg('h1');
    const first = runCadenceCycle({ hypotheses: [h], runs: [] });
    const second = runCadenceCycle({ hypotheses: [h], runs: first.mintedRunCards });
    expect(second.mintedRunCards).toHaveLength(0);
    expect(second.progressed).toBe(false);
  });

  it('never preregisters a proposed hypothesis and never invents an outcome', () => {
    const proposed: HypothesisRecord = { id: 'p1', title: 'x', mechanism: 'y', status: 'proposed', createdAt: '', updatedAt: '', calibratedConfidence: 0.5, evidenceTier: 5, outcomes: [] };
    const c = runCadenceCycle({ hypotheses: [proposed], runs: [] });
    expect(c.mintedRunCards).toHaveLength(0);
    expect(c.deferred.map((d) => d.phase)).toEqual(expect.arrayContaining(['P0', 'P1', 'P2', 'P3']));
  });

  it('loops to a fixed point and stops on no-progress', () => {
    const loop = runCadenceLoop({ hypotheses: [prereg('h1')], runs: [], maxCycles: 5 });
    expect(loop.stoppedBecause).toBe('no-progress');
    expect(loop.mintedRunCards).toHaveLength(1);
    expect(loop.cycles.length).toBeGreaterThanOrEqual(2);
  });
});
