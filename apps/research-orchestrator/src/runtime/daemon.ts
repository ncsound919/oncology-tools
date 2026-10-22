import { decideCycle, DEFAULT_POWER_POLICY, type PowerPolicy } from './policy.js';

// ── Runtime: the always-on daemon loop ────────────────────────────────────────
// Fully injected (sample/quota/runCycle/sleep/now/heartbeat/shouldStop) so it is
// deterministic under test. It never runs a cycle the policy paused, records a
// heartbeat every tick, tracks a rolling-hour run budget, and backs off on error.
// It does not start any service: a caller (a script, Task Scheduler, or a boot
// entry) owns the process.

export interface HeartbeatRecord {
  at: number;
  action: string;
  cpuBusyPct: number;
  memUsedPct: number;
  kaggleQuotaRemainingGpuHours: number | null;
  allowKaggle: boolean;
  allowLlm: boolean;
  progressed?: boolean;
  minted?: number;
  error?: string;
  reason: string;
}

export interface DaemonDeps {
  sample: () => Promise<{ cpuBusyPct: number; memUsedPct: number }>;
  quotaGpuHours: () => Promise<number | null>;
  runCycle: (opts: { allowKaggle: boolean; allowLlm: boolean }) => Promise<{ progressed: boolean; minted: number }>;
  sleep: (ms: number) => Promise<void>;
  now: () => number;
  recordHeartbeat: (r: HeartbeatRecord) => void;
  shouldStop: () => boolean;
}

export interface DaemonOptions {
  policy?: PowerPolicy;
  maxCycles?: number;
}

export interface DaemonResult {
  cycles: number;
  runs: number;
  throttles: number;
  pauses: number;
  errors: number;
  stoppedBecause: 'max-cycles' | 'stop-signal';
}

export async function runDaemon(deps: DaemonDeps, options: DaemonOptions = {}): Promise<DaemonResult> {
  const policy = options.policy ?? DEFAULT_POWER_POLICY;
  const maxCycles = options.maxCycles ?? Number.POSITIVE_INFINITY;
  let cycles = 0;
  let runs = 0;
  let throttles = 0;
  let pauses = 0;
  let errors = 0;
  let consecutiveErrors = 0;
  const runTimes: number[] = [];
  let stoppedBecause: DaemonResult['stoppedBecause'] = 'max-cycles';

  while (cycles < maxCycles) {
    if (deps.shouldStop()) {
      stoppedBecause = 'stop-signal';
      break;
    }
    const { cpuBusyPct, memUsedPct } = await deps.sample();
    const quota = await deps.quotaGpuHours();
    const now = deps.now();
    const cycleCountThisHour = runTimes.filter((t) => now - t < 3_600_000).length;

    const decision = decideCycle({ cpuBusyPct, memUsedPct, kaggleQuotaRemainingGpuHours: quota, cycleCountThisHour, consecutiveErrors }, policy);

    if (decision.action === 'pause') {
      pauses += 1;
      deps.recordHeartbeat({ at: now, action: 'pause', cpuBusyPct, memUsedPct, kaggleQuotaRemainingGpuHours: quota, allowKaggle: false, allowLlm: false, reason: decision.reason });
    } else if (decision.action === 'throttle') {
      throttles += 1;
      deps.recordHeartbeat({ at: now, action: 'throttle', cpuBusyPct, memUsedPct, kaggleQuotaRemainingGpuHours: quota, allowKaggle: false, allowLlm: false, reason: decision.reason });
    } else {
      try {
        const res = await deps.runCycle({ allowKaggle: decision.allowKaggle, allowLlm: decision.allowLlm });
        runs += 1;
        runTimes.push(now);
        consecutiveErrors = 0;
        deps.recordHeartbeat({ at: now, action: 'run', cpuBusyPct, memUsedPct, kaggleQuotaRemainingGpuHours: quota, allowKaggle: decision.allowKaggle, allowLlm: decision.allowLlm, progressed: res.progressed, minted: res.minted, reason: decision.reason });
      } catch (err) {
        errors += 1;
        consecutiveErrors += 1;
        deps.recordHeartbeat({ at: now, action: 'error', cpuBusyPct, memUsedPct, kaggleQuotaRemainingGpuHours: quota, allowKaggle: decision.allowKaggle, allowLlm: decision.allowLlm, error: err instanceof Error ? err.message : String(err), reason: 'cycle threw' });
      }
    }

    cycles += 1;
    await deps.sleep(decision.intervalMs);
  }

  if (deps.shouldStop()) stoppedBecause = 'stop-signal';
  return { cycles, runs, throttles, pauses, errors, stoppedBecause };
}
