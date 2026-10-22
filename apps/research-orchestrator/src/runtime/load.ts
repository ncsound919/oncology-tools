import os from 'node:os';

// ── Runtime: machine load sampling ────────────────────────────────────────────
// CPU busy is computed from the delta of `os.cpus()` cumulative times (Windows
// returns [0,0,0] from `os.loadavg()`, so it is not used). Memory is a point
// reading. Sampling is total (all cores) — the daemon throttles on aggregate load.

export interface CpuTimes {
  idle: number;
  total: number;
}

export function readCpuTimes(): CpuTimes {
  let idle = 0;
  let total = 0;
  for (const c of os.cpus()) {
    for (const v of Object.values(c.times)) total += v;
    idle += c.times.idle;
  }
  return { idle, total };
}

export function cpuBusyPct(prev: CpuTimes, cur: CpuTimes): number {
  const dTotal = cur.total - prev.total;
  const dIdle = cur.idle - prev.idle;
  if (dTotal <= 0) return 0;
  return Math.max(0, Math.min(100, ((dTotal - dIdle) / dTotal) * 100));
}

export function memUsedPct(): number {
  const total = os.totalmem();
  return total > 0 ? (1 - os.freemem() / total) * 100 : 0;
}

export function cpuCount(): number {
  return os.cpus().length || 1;
}

export interface MachineSample {
  cpuBusyPct: number;
  memUsedPct: number;
  cpus: number;
}

/** Machine load with no side effects beyond two CPU reads separated by `sleep`. */
export async function sampleMachine(sleep: (ms: number) => Promise<void>, gapMs = 300): Promise<MachineSample> {
  const before = readCpuTimes();
  await sleep(gapMs);
  const after = readCpuTimes();
  return { cpuBusyPct: cpuBusyPct(before, after), memUsedPct: memUsedPct(), cpus: cpuCount() };
}
