#!/usr/bin/env node
/**
 * hatchet-worker.ts — the durable oncology worker, wired to a live Hatchet engine.
 *
 * Registers the `onco-ensemble` and `onco-scheduler-tick` durable workflows plus
 * their child tasks, starts a worker, runs the ensemble once, registers the
 * hourly cron, and stops. Mirrors the validated spike, but drives the tested
 * workflow bodies (src/durable/*) instead of inline code.
 *
 *   $env:HATCHET_CLIENT_TOKEN="<token>"
 *   $env:HATCHET_CLIENT_HOST_PORT="localhost:7077"
 *   $env:HATCHET_CLIENT_TLS_STRATEGY="none"
 *   npx tsx scripts/hatchet-worker.ts
 */
import { execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { HatchetClient } from '@hatchet-dev/typescript-sdk/v1';
import { registerOncoWorkflows, registerEnsembleCron } from '../src/durable/hatchet.js';
import { ensembleRegistry, type EnsemblePorts, type EnsembleSnapshot } from '../src/durable/ensemble.js';
import { schedulerRegistry, type JobOutcome, type SchedulerJobSpec } from '../src/durable/schedulerJobs.js';
import { buildKaggleNotebookJob, submitNotebookJob, fetchComputeResult } from '../src/kaggle/recourse.js';
import type { TaskRegistry } from '../src/durable/context.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..', '..'); // …/Oncology Ecosystem

/** Submit the ensemble to the Kaggle lane through Recourse. */
const ensemblePorts: EnsemblePorts = {
  submit: async ({ seeds, cells }) => {
    const job = buildKaggleNotebookJob(cells, { hardware: 'cpu', maxRuntimeMs: 600_000 });
    const r = await submitNotebookJob(job);
    const handle = (r.data ?? {}) as { externalId?: string; status?: string };
    return { externalId: handle.externalId ?? job.id, status: handle.status ?? (r.available ? 'submitted' : 'unavailable') };
  },
  read: async (externalId): Promise<EnsembleSnapshot> => {
    // AWAIT the kernel via Recourse's result route and parse the envelope the
    // notebook prints. Never invent a number: meanFinal stays null if absent.
    const r = await fetchComputeResult(externalId, { platform: 'kaggle', awaitTimeoutMs: 300_000 });
    const env = r.envelope ?? {};
    return {
      ok: r.available && r.success && env.ok === true,
      meanFinal: typeof env.meanFinal === 'number' ? env.meanFinal : null,
      nSeeds: typeof env.nSeeds === 'number' ? env.nSeeds : 0,
    };
  },
};

/** Mirror scheduler.mjs: the volume is present only if its expected subtrees exist. */
function dataVolumeExists(): boolean {
  const override = process.env.ONCOLOGY_DATA_ROOT;
  const roots = override?.trim() ? [override.trim()] : ['E:\\', 'F:\\', 'G:\\', 'H:\\', 'I:\\'];
  return roots.some(
    (root) =>
      fs.existsSync(path.join(root, 'survboard', 'data_reproduced')) &&
      fs.existsSync(path.join(root, 'datasets', 'Oncology Datasets')),
  );
}

/** Resolve a job's command, choosing tsx for .ts scripts (not bare node). */
function resolveCommand(spec: SchedulerJobSpec): { file: string; args: string[] } {
  if (spec.command.kind === 'python') return { file: process.env.PYTHON_PATH || 'python', args: spec.command.args };
  if (spec.command.kind === 'tsx') {
    const local = path.join(ROOT, 'platform', 'node_modules', 'tsx', 'dist', 'cli.mjs');
    if (fs.existsSync(local)) return { file: process.execPath, args: [local, ...spec.command.args] };
    return { file: process.platform === 'win32' ? 'tsx.cmd' : 'tsx', args: spec.command.args };
  }
  return { file: process.execPath, args: spec.command.args };
}

/** Spawn a scheduler.mjs job. */
function spawnJob(spec: SchedulerJobSpec): Promise<JobOutcome> {
  const started = Date.now();
  const { file, args } = resolveCommand(spec);
  return new Promise((resolve) => {
    execFile(file, args, { cwd: ROOT, timeout: spec.budgetMs, maxBuffer: 4 * 1024 * 1024 }, (err, stdout) => {
      const ms = Date.now() - started;
      if (err && (err as { killed?: boolean }).killed) {
        return resolve({ status: 'deferred', ms, detail: `exceeded ${Math.round(spec.budgetMs / 60000)}m budget` });
      }
      if (/^SKIPPED/im.test(String(stdout))) return resolve({ status: 'skipped', ms, detail: 'SKIPPED' });
      if (err) return resolve({ status: 'failed', ms, detail: err.message });
      return resolve({ status: 'ok', ms, detail: String(stdout).trim().split('\n').slice(-1)[0] ?? '' });
    });
  });
}

async function main(): Promise<void> {
  const hatchet = HatchetClient.init();

  const registry: TaskRegistry = {
    ...ensembleRegistry(ensemblePorts),
    ...schedulerRegistry({ spawnJob }),
  };

  const { ensemble, scheduler, decls } = registerOncoWorkflows(hatchet, registry, { dataVolumePresent: dataVolumeExists });
  const workflows = [ensemble, scheduler, ...Object.values(decls)] as never[];

  const worker = await hatchet.worker('onco-orchestrator', { workflows });
  void worker.start();

  const wf = ensemble as { run: (input: { seeds: number[] }) => Promise<unknown> };
  const out = await wf.run({ seeds: [1, 2, 3, 4, 5] });
  console.log('WORKFLOW OUTPUT:', JSON.stringify(out));

  const cron = await registerEnsembleCron(ensemble);
  console.log('CRON REGISTERED:', JSON.stringify(cron));

  await worker.stop();
  process.exit(0);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
