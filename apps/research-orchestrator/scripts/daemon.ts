#!/usr/bin/env node
/**
 * daemon.ts — the 24/7 research daemon.
 *
 * Loop: sample machine load → read Kaggle GPU quota → decide (run / throttle /
 * pause) → run a cycle (always the local deterministic cadence; Kaggle work only
 * when the machine is idle AND quota remains) → heartbeat → sleep.
 *
 *   npx tsx scripts/daemon.ts [--cycles N] [--minutes M] [--interval-ms MS] [--no-kaggle]
 *
 * It yields to whatever else the machine is doing (`DEFAULT_POWER_POLICY`), caps
 * its hourly work, backs off on errors, and stops on `--minutes`, `--cycles`, or
 * the presence of `data/runtime/STOP`. It does NOT start any service; run it via
 * Task Scheduler / a boot entry for true 24/7 operation.
 *
 * Each cycle runs through the actor core (orchestrator → executor → provenance
 * monitor) and appends a hash-chained spine to data/runtime/spines.jsonl.
 */
import fs from 'node:fs';
import path from 'node:path';
import { SrtStore } from '../src/srt/store.js';
import { buildCadence } from '../src/cadence.js';
import { runActorCycle, type ActorContext } from '../src/actors/index.js';
import { ensembleCells } from '../src/durable/ensemble.js';
import { sampleMachine } from '../src/runtime/load.js';
import { runDaemon, type HeartbeatRecord } from '../src/runtime/daemon.js';
import { DEFAULT_POWER_POLICY } from '../src/runtime/policy.js';
import { buildKaggleNotebookJob, submitNotebookJob, fetchComputePlatforms } from '../src/kaggle/recourse.js';
import type { RunCard } from '../src/srt/experiment.js';
import type { ResponseCase, ResponseCohortSummary } from '../src/rano/score.js';
import type { CriterionVerdict } from '../src/rano/criterion.js';

const args = process.argv.slice(2);
const flag = (n: string): string | undefined => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
const runtimeDir = path.join(process.cwd(), 'data', 'runtime');
fs.mkdirSync(runtimeDir, { recursive: true });
const HEARTBEAT = path.join(runtimeDir, 'heartbeat.jsonl');
const SUBMITTED = path.join(runtimeDir, 'submitted.json');
const SPINES = path.join(runtimeDir, 'spines.jsonl');
const RESPONSE_CASES = path.join(runtimeDir, 'response-cases.json');
const RESPONSE_SCORES = path.join(runtimeDir, 'response-scores.jsonl');
const STOP = path.join(runtimeDir, 'STOP');

const srt = new SrtStore();
const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));
const minutes = flag('--minutes') ? Number(flag('--minutes')) : undefined;
const deadline = minutes ? Date.now() + minutes * 60_000 : undefined;
const intervalMs = flag('--interval-ms') ? Number(flag('--interval-ms')) : undefined;
const enableKaggle = !args.includes('--no-kaggle');

function loadSubmitted(): Set<string> {
  try { return new Set(JSON.parse(fs.readFileSync(SUBMITTED, 'utf8')) as string[]); } catch { return new Set(); }
}
function saveSubmitted(s: Set<string>): void {
  fs.writeFileSync(SUBMITTED, JSON.stringify([...s]));
}

/**
 * Concept evidence for the P7 analysis, if a study supplied it:
 *   data/runtime/response-cases.json  -> { hypothesisId, cases: ResponseCase[] }
 * The concept head runs only for a hypothesis in 'testing' status.
 */
function loadResponseCases(): { hypothesisId: string; cases: ResponseCase[] } | undefined {
  try {
    const j = JSON.parse(fs.readFileSync(RESPONSE_CASES, 'utf8')) as { hypothesisId?: string; cases?: ResponseCase[] };
    if (j?.hypothesisId && Array.isArray(j.cases) && j.cases.length) return { hypothesisId: j.hypothesisId, cases: j.cases };
    return undefined;
  } catch {
    return undefined;
  }
}

async function main(): Promise<void> {
  const submitted = loadSubmitted();
  console.log(`[daemon] start · cycles=${flag('--cycles') ?? 'inf'} minutes=${minutes ?? 'inf'} kaggle=${enableKaggle}`);

  const result = await runDaemon(
    {
      sample: () => sampleMachine(sleep, 300),
      quotaGpuHours: async () => {
        const r = await fetchComputePlatforms();
        if (!r.available) return null;
        const k = r.data?.platforms?.find((p) => p.id === 'kaggle');
        const q = k?.quota;
        if (!q || q.weeklyLimit == null) return null;
        return Math.max(0, q.weeklyLimit - q.consumed);
      },
      runCycle: async ({ allowKaggle }) => {
        const doc = srt.readRegistry();
        const runs = srt.listRuns();
        const cadence = buildCadence({ hypotheses: doc.hypotheses.map((h) => ({ id: h.id, status: h.status })) });
        // A minted-but-unsubmitted Kaggle card is this cycle's P6 candidate.
        const pending = runs.find((c: RunCard) => c.target?.kind === 'kaggle-remote' && !submitted.has(c.id));
        // Concept evidence is only scored for a hypothesis under test (P7), and the
        // preregistered criterion (successCriterion/falsifier) is passed through so
        // the head can close the loop with a verdict.
        const evidence = loadResponseCases();
        const testingHyp = evidence ? doc.hypotheses.find((h) => h.id === evidence.hypothesisId && h.status === 'testing') : undefined;
        const response =
          evidence && testingHyp
            ? {
                ...evidence,
                successCriterion: testingHyp.preregistration?.successCriterion ?? null,
                falsifier: testingHyp.preregistration?.falsifier ?? null,
              }
            : undefined;
        const ctx: ActorContext = {
          cpuBusyPct: 0,
          memUsedPct: 0,
          // The daemon's outer loop already yielded on load; inside a run cycle the
          // actor sees an idle machine plus the daemon's Kaggle verdict.
          kaggleQuotaRemainingGpuHours: allowKaggle ? Number.POSITIVE_INFINITY : 0,
          cycleCountThisHour: 0,
          consecutiveErrors: 0,
          cadence,
          submittedCardIds: [...submitted],
          pendingSubmitCardId: pending?.id,
          responseFor: response?.hypothesisId,
        };

        const res = await runActorCycle({
          runId: `cycle-${Date.now()}`,
          ctx,
          state: { hypotheses: doc.hypotheses, runs, response },
          ports: {
            submitKaggle: async ({ cardId }) => {
              if (!enableKaggle || !allowKaggle) return { available: false, detail: 'kaggle disabled or no quota' };
              const job = buildKaggleNotebookJob(ensembleCells([1, 2, 3, 4, 5]), { hardware: 'cpu', maxRuntimeMs: 600_000 });
              const r = await submitNotebookJob(job);
              const handle = (r.data ?? {}) as { externalId?: string; status?: string };
              if (r.available) { submitted.add(cardId); saveSubmitted(submitted); }
              // A failed/unavailable submit is not recorded — the next cycle retries.
              return { available: r.available, externalId: handle.externalId, status: handle.status, detail: r.error };
            },
          },
        });

        const mintedCards = res.execution?.action === 'mint-run-cards'
          ? ((res.execution.result as { cards: RunCard[] }).cards ?? [])
          : [];
        if (mintedCards.length) srt.writeRuns([...runs, ...mintedCards]);
        // P7: persist the concept-head cohort summary, and CLOSE THE LOOP by
        // recording the preregistered-criterion verdict. `inconclusive` is not
        // recorded (it would re-record every cycle while the hypothesis is still
        // under test); supported/falsified/null move the status, so the `testing`
        // gate makes the write idempotent.
        if (res.execution?.action === 'score-response' && res.execution.ok) {
          const r = res.execution.result as { hypothesisId: string; summary: ResponseCohortSummary; verdict?: CriterionVerdict };
          fs.appendFileSync(RESPONSE_SCORES, JSON.stringify({ at: new Date().toISOString(), ...r }) + '\n');
          const v = r.verdict;
          if (v && v.verdict !== 'inconclusive') {
            try {
              const updated = srt.recordOutcome(r.hypothesisId, {
                verdict: v.verdict,
                metricName: v.metric ?? undefined,
                metric: v.value ?? undefined,
                systemId: 'concept-head',
                detail: v.detail,
              });
              fs.appendFileSync(RESPONSE_SCORES, JSON.stringify({ at: new Date().toISOString(), hypothesisId: r.hypothesisId, recorded: updated.status }) + '\n');
            } catch (err) {
              fs.appendFileSync(RESPONSE_SCORES, JSON.stringify({ at: new Date().toISOString(), hypothesisId: r.hypothesisId, recordError: err instanceof Error ? err.message : String(err) }) + '\n');
            }
          }
        }
        // Provenance: append the run's hash-chained spine.
        fs.appendFileSync(SPINES, JSON.stringify(res.spine) + '\n');
        const submittedNow = res.execution?.action === 'submit-kaggle' && res.execution.ok ? 1 : 0;
        const scoredNow = res.execution?.action === 'score-response' && res.execution.ok ? 1 : 0;
        return { progressed: mintedCards.length > 0 || submittedNow > 0 || scoredNow > 0, minted: mintedCards.length + submittedNow + scoredNow };
      },
      sleep,
      now: () => Date.now(),
      recordHeartbeat: (r: HeartbeatRecord) => fs.appendFileSync(HEARTBEAT, JSON.stringify(r) + '\n'),
      shouldStop: () => fs.existsSync(STOP) || (deadline !== undefined && Date.now() >= deadline),
    },
    { policy: intervalMs ? { ...DEFAULT_POWER_POLICY, baseIntervalMs: intervalMs } : DEFAULT_POWER_POLICY, maxCycles: flag('--cycles') ? Number(flag('--cycles')) : undefined },
  );

  console.log(`[daemon] stop · ${JSON.stringify(result)}`);
}

main().catch((e) => { console.error(e instanceof Error ? e.message : String(e)); process.exit(1); });
