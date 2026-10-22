import { describe, it, expect } from 'vitest';
import { toHatchetDuration, registerEnsembleCron, toDurableContext } from './hatchet.js';

// ── Hatchet adapter tests ────────────────────────────────────────────────────
// These pin the two things the live run taught us: Hatchet rejects "5000ms"
// (it wants "5s"), and re-registering an identical cron is a duplicate error
// that must be treated as success.

describe('hatchet adapter', () => {
  it('formats ms as a Hatchet duration (regression: "5000ms" was rejected)', () => {
    expect(toHatchetDuration(5000)).toBe('5s');
    expect(toHatchetDuration(1000)).toBe('1s');
    expect(toHatchetDuration(90_000)).toBe('1m30s');
    expect(toHatchetDuration(3_600_000)).toBe('1h');
    expect(toHatchetDuration(250)).toBe('1s'); // floor of 1s
  });

  it('treats an already-registered cron as success', async () => {
    const wf = {
      cron: async () => {
        throw new Error('cron trigger with that name-expression pair already exists');
      },
    };
    expect(await registerEnsembleCron(wf)).toMatchObject({ existed: true });
  });

  it('returns the engine record when the cron is new', async () => {
    const wf = { cron: async () => ({ id: 'cron-1' }) };
    expect(await registerEnsembleCron(wf)).toEqual({ id: 'cron-1' });
  });

  it('maps task() to spawnChild and rejects an unregistered task', async () => {
    const spawned: unknown[] = [];
    const hctx = {
      spawnChild: async (decl: unknown, input: unknown) => {
        spawned.push([decl, input]);
        return 'ok';
      },
      sleepFor: async () => undefined,
    };
    const ctx = toDurableContext(hctx, { 'submit-ensemble': 'decl-1' });
    await expect(ctx.task('submit-ensemble', { seeds: [1] })).resolves.toBe('ok');
    expect(spawned).toHaveLength(1);
    await expect(ctx.task('nope', {})).rejects.toThrow(/no child task registered/);
  });

  it('sleepFor converts ms to a Hatchet duration', async () => {
    const slept: string[] = [];
    const hctx = { spawnChild: async () => 'x', sleepFor: async (d: string) => { slept.push(d); } };
    await toDurableContext(hctx, {}).sleepFor(5000);
    expect(slept).toEqual(['5s']);
  });
});
