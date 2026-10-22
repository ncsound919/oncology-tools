import { describe, it, expect } from 'vitest';
import {
  MemoryDurableContext,
  NonDeterminismError,
  SimulatedCrash,
  type DurableEvent,
  type TaskRegistry,
} from './context.js';
import { ensembleWorkflow, ensembleRegistry, type EnsemblePorts } from './ensemble.js';
import {
  runSchedulerTick,
  isDueAt,
  schedulerRegistry,
  SCHEDULER_JOB_SPECS,
  type SchedulerJobSpec,
} from './schedulerJobs.js';

// ── Durable replay tests ─────────────────────────────────────────────────────
// The point of durable execution is that a crash resumes from the last
// checkpoint and a completed side effect is not repeated. These tests simulate a
// process death (SimulatedCrash) after a checkpoint, replay from the journal,
// and assert the side effect ran exactly once and the result is identical to an
// uninterrupted run. No engine, no Docker.

function makeEnsemble(): { registry: TaskRegistry; submits: () => number } {
  let submits = 0;
  const ports: EnsemblePorts = {
    submit: async () => {
      submits += 1;
      return { externalId: `kaggle-${submits}`, status: 'running' };
    },
    read: async () => ({ ok: true, meanFinal: 42.5, nSeeds: 5 }),
  };
  return { registry: ensembleRegistry(ports), submits: () => submits };
}

describe('durable replay — ensemble', () => {
  it('replays a crashed run without re-submitting, and yields the same result', async () => {
    // Reference: an uninterrupted run.
    const clean = makeEnsemble();
    const cleanOut = await ensembleWorkflow(new MemoryDurableContext({ registry: clean.registry }), { seeds: [1, 2, 3] });
    expect(clean.submits()).toBe(1);

    // Crash run: die immediately after the submit checkpoint is written.
    const crashed = makeEnsemble();
    const crashCtx = new MemoryDurableContext({ registry: crashed.registry, crashAfterTasks: 1 });
    await expect(ensembleWorkflow(crashCtx, { seeds: [1, 2, 3] })).rejects.toBeInstanceOf(SimulatedCrash);
    expect(crashed.submits()).toBe(1);

    const journal = crashCtx.journal;
    expect(journal.map((e) => e.name)).toContain('submit-ensemble');
    expect(journal.some((e) => e.name === 'read-ensemble')).toBe(false);

    // Replay from the journal: the submit is served, not re-run.
    const replay = makeEnsemble();
    const replayOut = await ensembleWorkflow(
      new MemoryDurableContext({ registry: replay.registry, replayFrom: journal }),
      { seeds: [1, 2, 3] },
    );
    expect(replay.submits()).toBe(0); // the side effect was NOT repeated
    expect(replayOut).toEqual(cleanOut); // deterministic replay
  });

  it('detects a replay that diverges from the journal', async () => {
    const journal: DurableEvent[] = [
      { kind: 'task', name: 'submit-ensemble', result: { externalId: 'x', status: 'running' } },
    ];
    const ctx = new MemoryDurableContext({ registry: { other: () => 1 }, replayFrom: journal });
    await expect(ctx.task('a-different-task', {})).rejects.toBeInstanceOf(NonDeterminismError);
  });

  it('fails closed when a task is not registered', async () => {
    await expect(new MemoryDurableContext({ registry: {} }).task('nope', {})).rejects.toThrow(/no task registered/);
  });
});

describe('durable replay — scheduler jobs', () => {
  const matrix = SCHEDULER_JOB_SPECS.find((j) => j.name === 'matrix') as SchedulerJobSpec;

  it('runs a due job once and does not re-run it on replay', async () => {
    const now = new Date(2026, 9, 7, 3, 0, 0); // local 03:00 → matrix cron '0 3 * * *'
    expect(isDueAt(matrix.cron, now)).toBe(true);

    let runs = 0;
    const spawnJob = async () => {
      runs += 1;
      return { status: 'ok' as const, ms: 5, detail: 'done' };
    };
    const registry = schedulerRegistry({ spawnJob });

    const ctx = new MemoryDurableContext({ registry, crashAfterTasks: 1 });
    await expect(
      runSchedulerTick(ctx, { now, dataVolumePresent: true, jobs: [matrix] }),
    ).rejects.toBeInstanceOf(SimulatedCrash);
    expect(runs).toBe(1);

    const out = await runSchedulerTick(new MemoryDurableContext({ registry, replayFrom: ctx.journal }), {
      now,
      dataVolumePresent: true,
      jobs: [matrix],
    });
    expect(runs).toBe(1); // not re-run on replay
    expect(out.matrix.status).toBe('ok');
  });

  it('records skipped, not failed, when the data volume is absent', async () => {
    const derive = SCHEDULER_JOB_SPECS.find((j) => j.name === 'derive') as SchedulerJobSpec;
    const now = new Date(2026, 9, 7, 2, 15, 0); // derive cron '15 2 * * *'
    expect(isDueAt(derive.cron, now)).toBe(true);

    const out = await runSchedulerTick(
      new MemoryDurableContext({ registry: schedulerRegistry({ spawnJob: async () => ({ status: 'ok', ms: 1 }) }) }),
      { now, dataVolumePresent: false, jobs: [derive] },
    );
    expect(out.derive.status).toBe('skipped');
  });

  it('runs nothing when no job is due', async () => {
    const out = await runSchedulerTick(
      new MemoryDurableContext({ registry: schedulerRegistry({ spawnJob: async () => ({ status: 'ok', ms: 1 }) }) }),
      { now: new Date(2026, 9, 7, 12, 34, 0), dataVolumePresent: true },
    );
    expect(Object.keys(out)).toHaveLength(0);
  });
});
