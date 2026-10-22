import { describe, it, expect, vi } from 'vitest';
import { decideCycle, DEFAULT_POWER_POLICY } from './policy.js';
import { runDaemon, type DaemonDeps, type HeartbeatRecord } from './daemon.js';
import { cpuBusyPct, memUsedPct, sampleMachine } from './load.js';

describe('power policy', () => {
  const base = { cpuBusyPct: 10, memUsedPct: 40, kaggleQuotaRemainingGpuHours: 20, cycleCountThisHour: 0, consecutiveErrors: 0 };

  it('pauses when the machine is busy', () => {
    const d = decideCycle({ ...base, cpuBusyPct: 85 });
    expect(d.action).toBe('pause');
    expect(d.allowKaggle).toBe(false);
    expect(d.allowLlm).toBe(false);
    expect(d.reason).toMatch(/machine busy/);
  });

  it('throttles with exponential backoff after errors', () => {
    const d = decideCycle({ ...base, consecutiveErrors: 3 });
    expect(d.action).toBe('throttle');
    expect(d.intervalMs).toBe(Math.min(DEFAULT_POWER_POLICY.maxIntervalMs, DEFAULT_POWER_POLICY.errorBackoffBaseMs * 8));
  });

  it('throttles at the hourly cap (power)', () => {
    const d = decideCycle({ ...base, cycleCountThisHour: DEFAULT_POWER_POLICY.maxCyclesPerHour });
    expect(d.action).toBe('throttle');
    expect(d.reason).toMatch(/power throttle/);
  });

  it('allows Kaggle only with quota headroom; LLM only when idle', () => {
    expect(decideCycle({ ...base }).allowKaggle).toBe(true);
    expect(decideCycle({ ...base, kaggleQuotaRemainingGpuHours: 1 }).allowKaggle).toBe(false);
    expect(decideCycle({ ...base, kaggleQuotaRemainingGpuHours: null }).allowKaggle).toBe(false);
    expect(decideCycle({ ...base, cpuBusyPct: 50 }).allowLlm).toBe(false);
    expect(decideCycle({ ...base, cpuBusyPct: 10 }).allowLlm).toBe(true);
  });
});

describe('daemon loop', () => {
  function deps(over: Partial<DaemonDeps> = {}): DaemonDeps {
    let t = 0;
    return {
      sample: async () => ({ cpuBusyPct: 10, memUsedPct: 40 }),
      quotaGpuHours: async () => 20,
      runCycle: async () => ({ progressed: true, minted: 1 }),
      sleep: async () => {},
      now: () => (t += 1000),
      recordHeartbeat: () => {},
      shouldStop: () => false,
      ...over,
    };
  }

  it('runs when idle, records heartbeats, and stops at max-cycles', async () => {
    const hb: HeartbeatRecord[] = [];
    const r = await runDaemon(deps({ recordHeartbeat: (x) => hb.push(x) }), { maxCycles: 3 });
    expect(r.runs).toBe(3);
    expect(hb).toHaveLength(3);
    expect(hb[0].action).toBe('run');
    expect(hb[0].minted).toBe(1);
  });

  it('pauses and never runs when the machine is busy', async () => {
    const r = await runDaemon(deps({ sample: async () => ({ cpuBusyPct: 99, memUsedPct: 40 }) }), { maxCycles: 2 });
    expect(r.runs).toBe(0);
    expect(r.pauses).toBe(2);
  });

  it('backs off after a thrown cycle (an error is not a run)', async () => {
    let n = 0;
    const r = await runDaemon(deps({ runCycle: async () => { n += 1; if (n === 1) throw new Error('boom'); return { progressed: false, minted: 0 }; } }), { maxCycles: 2 });
    expect(r.errors).toBe(1);
    expect(r.runs).toBe(0);
  });

  it('stops on the stop signal', async () => {
    let called = 0;
    const r = await runDaemon(deps({ shouldStop: () => { called += 1; return called > 1; } }), { maxCycles: 10 });
    expect(r.stoppedBecause).toBe('stop-signal');
  });
});

describe('machine load', () => {
  it('computes cpu busy from time deltas and mem in 0..100', () => {
    expect(cpuBusyPct({ idle: 0, total: 0 }, { idle: 25, total: 100 })).toBe(75);
    expect(memUsedPct()).toBeGreaterThanOrEqual(0);
    expect(memUsedPct()).toBeLessThanOrEqual(100);
  });

  it('sampleMachine uses the injected sleep', async () => {
    const s = vi.fn(async () => {});
    const m = await sampleMachine(s, 1);
    expect(s).toHaveBeenCalled();
    expect(m.cpus).toBeGreaterThanOrEqual(1);
  });
});
