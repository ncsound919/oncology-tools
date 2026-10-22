import type { DurableContext, TaskRegistry } from './context.js';

// ── Durable workflows: the scheduler.mjs jobs ────────────────────────────────
// orchestration/scheduler.mjs runs three deterministic science jobs on a cron
// (probe / derive / matrix). Here they are re-expressed as durable tasks: each
// job is a child task keyed by job name + wall-clock minute, so a replay after a
// crash never re-runs a job that already completed — the "background jobs are
// idempotent by design" rule the business-logic store warns about, enforced
// structurally rather than by convention.

export type JobStatus = 'ok' | 'skipped' | 'deferred' | 'failed';

export interface JobOutcome {
  status: JobStatus;
  ms: number;
  detail?: string;
}

export interface SchedulerJobSpec {
  name: string;
  cron: string;
  description: string;
  /** Skip (not fail) when the removable data volume is absent. */
  needsDataVolume: boolean;
  budgetMs: number;
  /** How the adapter should spawn it; resolved to an absolute path at wire time. */
  command: { kind: 'node' | 'python' | 'tsx'; args: string[] };
}

/** Mirrors the JOBS table in orchestration/scheduler.mjs. */
export const SCHEDULER_JOB_SPECS: SchedulerJobSpec[] = [
  {
    name: 'probe',
    cron: '*/15 * * * *',
    description: 'Re-probe LLM entitlements so litellm.yaml tracks live reality.',
    needsDataVolume: false,
    budgetMs: 5 * 60_000,
    command: { kind: 'node', args: ['orchestration/llm/probe-pool.mjs'] },
  },
  {
    name: 'derive',
    cron: '15 2 * * *',
    description: 'Build the reduced SurvBoard analysis artifact from the removable volume.',
    needsDataVolume: true,
    budgetMs: 90 * 60_000,
    command: { kind: 'python', args: ['platform/scripts/survboard_prepare.py'] },
  },
  {
    name: 'matrix',
    cron: '0 3 * * *',
    description: 'Cohort matrix over cached features (cache-only; no data volume needed).',
    needsDataVolume: false,
    budgetMs: 90 * 60_000,
    command: { kind: 'tsx', args: ['platform/scripts/run-cohort-matrix.ts', '--pooled'] },
  },
];

export const SCHEDULER_JOB_TASK = 'scheduler-job';

/** Match a single cron field against one integer (same semantics as scheduler.mjs). */
export function cronFieldMatches(field: string, value: number): boolean {
  for (const part of field.split(',')) {
    const [range, stepRaw] = part.split('/');
    const step = stepRaw === undefined ? 1 : Number(stepRaw);
    if (!Number.isFinite(step) || step <= 0) return false;

    let lo = 0;
    let hi = Number.MAX_SAFE_INTEGER;
    if (range !== '*') {
      const dash = range.indexOf('-');
      if (dash === -1) {
        if (!/^\d+$/.test(range)) return false;
        lo = Number(range);
        hi = lo;
      } else {
        lo = Number(range.slice(0, dash));
        hi = Number(range.slice(dash + 1));
        if (!Number.isFinite(lo) || !Number.isFinite(hi)) return false;
      }
    }
    if (value >= lo && value <= hi && (value - lo) % step === 0) return true;
  }
  return false;
}

export function isDueAt(cron: string, now: Date): boolean {
  const [minField, hourField, domField] = cron.split(/\s+/);
  if (!cronFieldMatches(minField, now.getMinutes())) return false;
  if (!cronFieldMatches(hourField, now.getHours())) return false;
  if (domField && !cronFieldMatches(domField, now.getDate())) return false;
  return true;
}

/** Stable per-minute key for idempotent task inputs (local time, matching scheduler.mjs). */
export function minuteKey(now: Date): string {
  const p = (n: number): string => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}T${p(now.getHours())}:${p(now.getMinutes())}`;
}

export interface SchedulerTickArgs {
  now: Date;
  dataVolumePresent: boolean;
  jobs?: SchedulerJobSpec[];
}

export interface SchedulerRegistryArgs {
  spawnJob: (spec: SchedulerJobSpec) => Promise<JobOutcome>;
}

/**
 * The single `scheduler-job` task implementation. It looks the job up by name,
 * honours the data-volume skip rule, and delegates the actual spawn to a port.
 */
export function schedulerRegistry(args: SchedulerRegistryArgs): TaskRegistry {
  return {
    [SCHEDULER_JOB_TASK]: async (input) => {
      const { name, dataVolumePresent } = input as { name: string; minuteKey: string; dataVolumePresent: boolean };
      const spec = SCHEDULER_JOB_SPECS.find((j) => j.name === name);
      if (!spec) return { status: 'failed', ms: 0, detail: `unknown job '${name}'` } satisfies JobOutcome;
      if (spec.needsDataVolume && !dataVolumePresent) {
        return { status: 'skipped', ms: 0, detail: 'oncology data volume not attached' } satisfies JobOutcome;
      }
      const started = Date.now();
      const r = await args.spawnJob(spec);
      return { ...r, ms: r.ms || Date.now() - started };
    },
  };
}

/**
 * Run whatever is due, each job once, durably. A crash after a job completed
 * resumes without re-running it, because the task input carries the minute key
 * and the child task is checkpointed by the engine.
 */
export async function runSchedulerTick(
  ctx: DurableContext,
  args: SchedulerTickArgs,
): Promise<Record<string, JobOutcome>> {
  const jobs = args.jobs ?? SCHEDULER_JOB_SPECS;
  const out: Record<string, JobOutcome> = {};
  for (const job of jobs) {
    if (!isDueAt(job.cron, args.now)) continue;
    out[job.name] = await ctx.task<JobOutcome>(SCHEDULER_JOB_TASK, {
      name: job.name,
      minuteKey: minuteKey(args.now),
      dataVolumePresent: args.dataVolumePresent,
    });
  }
  return out;
}
