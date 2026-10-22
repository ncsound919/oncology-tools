// ── Runtime: power/compute policy (pure) ──────────────────────────────────────
// The daemon must be a good citizen: always yield the machine to whatever else
// the user is doing, spend Kaggle GPU-hours only when there is headroom, and cap
// its own hourly work. This module turns load + quota + recent history into a
// single decision — deterministic and unit-tested, with no timers of its own.

export interface PowerPolicy {
  /** Above this aggregate CPU busy %, pause entirely. */
  cpuBusyCeilingPct: number;
  /** Above this memory-used %, pause entirely. */
  memUsedCeilingPct: number;
  /** LLM-backed steps run only below this CPU busy % (deterministic steps always run). */
  llmIdleCeilingPct: number;
  baseIntervalMs: number;
  maxIntervalMs: number;
  /** Power throttle: at most this many RUN cycles per rolling hour. */
  maxCyclesPerHour: number;
  /** Do not submit Kaggle (GPU) work below this many remaining GPU-hours. */
  quotaFloorGpuHours: number;
  errorBackoffBaseMs: number;
}

export const DEFAULT_POWER_POLICY: PowerPolicy = {
  cpuBusyCeilingPct: 70,
  memUsedCeilingPct: 90,
  llmIdleCeilingPct: 35,
  baseIntervalMs: 15 * 60_000,
  maxIntervalMs: 60 * 60_000,
  maxCyclesPerHour: 4,
  quotaFloorGpuHours: 2,
  errorBackoffBaseMs: 60_000,
};

export interface CycleInput {
  cpuBusyPct: number;
  memUsedPct: number;
  /** Remaining Kaggle GPU-hours this week, or null when unknown. */
  kaggleQuotaRemainingGpuHours: number | null;
  cycleCountThisHour: number;
  consecutiveErrors: number;
}

export interface CycleDecision {
  action: 'run' | 'throttle' | 'pause';
  allowKaggle: boolean;
  allowLlm: boolean;
  intervalMs: number;
  reason: string;
}

export function decideCycle(input: CycleInput, policy: PowerPolicy = DEFAULT_POWER_POLICY): CycleDecision {
  if (input.cpuBusyPct >= policy.cpuBusyCeilingPct || input.memUsedPct >= policy.memUsedCeilingPct) {
    return {
      action: 'pause',
      allowKaggle: false,
      allowLlm: false,
      intervalMs: Math.min(policy.baseIntervalMs, 5 * 60_000),
      reason: `machine busy (cpu ${input.cpuBusyPct.toFixed(0)}%, mem ${input.memUsedPct.toFixed(0)}%) — yielding`,
    };
  }
  if (input.consecutiveErrors > 0) {
    const backoff = Math.min(policy.maxIntervalMs, policy.errorBackoffBaseMs * 2 ** input.consecutiveErrors);
    return { action: 'throttle', allowKaggle: false, allowLlm: false, intervalMs: backoff, reason: `backing off after ${input.consecutiveErrors} consecutive error(s)` };
  }
  if (input.cycleCountThisHour >= policy.maxCyclesPerHour) {
    return { action: 'throttle', allowKaggle: false, allowLlm: false, intervalMs: policy.baseIntervalMs, reason: `power throttle: ${input.cycleCountThisHour}/${policy.maxCyclesPerHour} cycles this hour` };
  }
  const allowKaggle = input.kaggleQuotaRemainingGpuHours !== null && input.kaggleQuotaRemainingGpuHours > policy.quotaFloorGpuHours;
  const allowLlm = input.cpuBusyPct < policy.llmIdleCeilingPct && input.memUsedPct < policy.memUsedCeilingPct * 0.8;
  return {
    action: 'run',
    allowKaggle,
    allowLlm,
    intervalMs: policy.baseIntervalMs,
    reason: allowKaggle ? 'idle + quota headroom: full cycle (local + Kaggle)' : 'idle: local-deterministic only (no GPU headroom)',
  };
}
