import type { HatchetClient } from '@hatchet-dev/typescript-sdk/v1';
import type { DurableContext, TaskRegistry } from './context.js';
import { ensembleWorkflow, type EnsembleInput } from './ensemble.js';
import { runSchedulerTick, SCHEDULER_JOB_SPECS } from './schedulerJobs.js';

// ── Durable execution: the Hatchet adapter ───────────────────────────────────
// Maps our pure DurableContext onto Hatchet 1.36.0. The workflow bodies
// (ensembleWorkflow, runSchedulerTick) are the tested core; this file only
// translates:
//   ctx.task(name, input)  -> ctx.spawnChild(<registered child task>, input)
//   ctx.sleepFor(ms)       -> ctx.sleepFor('Nms')   (durable, slot-free)
//
// Confirmed against @hatchet-dev/typescript-sdk@1.36.0:
//   hatchet.task({ name, fn })            -> a directly-runnable child task
//   hatchet.workflow({ name })            -> wf.durableTask({name, fn}) / wf.cron(...)
//   DurableContext.spawnChild(decl, input) checkpoints the child on replay.

/** A registered child task declaration (opaque SDK handle). */
export type ChildDeclarations = Record<string, unknown>;

/**
 * Register one child task per registry entry. Each is a plain task (no
 * determinism constraint) — the side-effecting step the durable body names.
 */
export function registerChildTasks(hatchet: HatchetClient, registry: TaskRegistry): ChildDeclarations {
  const decls: ChildDeclarations = {};
  for (const [name, impl] of Object.entries(registry)) {
    // The SDK's task generics require a JSON input/output; our registry is
    // name-keyed and implementation-agnostic, so the call is cast at the edge.
    decls[name] = hatchet.task({ name, fn: (input: unknown) => impl(input) } as never);
  }
  return decls;
}

/**
 * Format milliseconds as a Hatchet duration string. Hatchet rejects "5000ms";
 * it wants forms like "1h30m5s", "10m", "30s", so round to seconds (min 1s).
 */
export function toHatchetDuration(ms: number): string {
  const totalSec = Math.max(1, Math.round(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  let out = '';
  if (h) out += `${h}h`;
  if (m) out += `${m}m`;
  if (s || !out) out += `${s}s`;
  return out;
}

/**
 * Map a Hatchet durable task context onto our DurableContext. A task name with
 * no registered child fails closed rather than silently running non-durably.
 */
export function toDurableContext(hctx: unknown, decls: ChildDeclarations): DurableContext {
  const ctx = hctx as {
    spawnChild: (decl: unknown, input: unknown) => Promise<unknown>;
    sleepFor: (duration: string) => Promise<unknown>;
  };
  return {
    task: <T>(name: string, input: unknown): Promise<T> => {
      const decl = decls[name];
      if (!decl) return Promise.reject(new Error(`no child task registered for '${name}'`));
      return ctx.spawnChild(decl, input) as Promise<T>;
    },
    sleepFor: async (ms: number): Promise<void> => {
      await ctx.sleepFor(toHatchetDuration(ms));
    },
  };
}

export interface OncoWorkflows {
  ensemble: unknown;
  scheduler: unknown;
  decls: ChildDeclarations;
}

export interface RegisterOncoOptions {
  /**
   * Whether the removable data volume is attached. The `derive` job skips (not
   * fails) when it is absent. Defaults to true only when no provider is given.
   */
  dataVolumePresent?: () => boolean;
}

/**
 * Register the oncology workflows and their child tasks on a Hatchet client.
 * `onco-ensemble` is the Kaggle job; `onco-scheduler-tick` wraps the
 * scheduler.mjs jobs. Register the hourly cron separately (see registerCron).
 */
export function registerOncoWorkflows(
  hatchet: HatchetClient,
  registry: TaskRegistry,
  opts: RegisterOncoOptions = {},
): OncoWorkflows {
  const decls = registerChildTasks(hatchet, registry);

  const ensemble = hatchet.workflow({ name: 'onco-ensemble' });
  ensemble.durableTask({
    name: 'ensemble-job',
    retries: 1,
    fn: (input: EnsembleInput, ctx: unknown) => ensembleWorkflow(toDurableContext(ctx, decls), input),
  } as never);

  const scheduler = hatchet.workflow({ name: 'onco-scheduler-tick' });
  scheduler.durableTask({
    name: 'scheduler-tick',
    retries: 1,
    fn: (_input: unknown, ctx: unknown) =>
      runSchedulerTick(toDurableContext(ctx, decls), {
        now: new Date(),
        dataVolumePresent: opts.dataVolumePresent?.() ?? true,
        jobs: SCHEDULER_JOB_SPECS,
      }),
  } as never);

  return { ensemble, scheduler, decls };
}

/** Register the hourly ensemble cron. Idempotent: a pre-existing identical cron is success. */
export async function registerEnsembleCron(ensemble: unknown, expression = '0 * * * *'): Promise<unknown> {
  const wf = ensemble as { cron: (name: string, expr: string, input: unknown) => Promise<unknown> };
  try {
    return await wf.cron('onco-ensemble-hourly', expression, { seeds: [1, 2, 3, 4, 5] });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/already exists/i.test(msg)) return { name: 'onco-ensemble-hourly', existed: true };
    throw err;
  }
}
