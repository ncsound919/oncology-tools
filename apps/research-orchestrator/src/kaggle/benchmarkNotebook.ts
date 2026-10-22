import { buildCriterionBenchmarkTask } from './benchmarks.js';
import type { GateCell } from '../verify/notebookGate.js';

// ── Kaggle benchmark notebook ─────────────────────────────────────────────────
// Emits a valid Jupyter notebook (nbformat 4) whose code cell is a `kaggle-
// benchmarks` task. Paste it into kaggle.com/benchmarks/tasks/new (the kbench
// library is preinstalled there) to publish a leaderboarded eval. Deterministic
// assembly; the caller supplies the prompt and the assertion regex.
//
// NOT AUTHENTICATED / NOT PUSHED: publishing a task is a Kaggle web action and
// accounts registered after 2025-12-15 need extra identity verification. This
// module produces the artifact and the push plan; it does not push.

export interface JupyterCell {
  cell_type: 'markdown' | 'code';
  metadata: Record<string, unknown>;
  source: string[];
  outputs?: unknown[];
  execution_count?: number | null;
}

export interface JupyterNotebook {
  nbformat: 4;
  nbformat_minor: 5;
  metadata: Record<string, unknown>;
  cells: JupyterCell[];
}

export interface BenchmarkNotebookInput {
  name: string;
  prompt: string;
  regex: string;
  expectation?: string;
}

function toLines(src: string): string[] {
  const lines = src.split('\n');
  return lines.map((l, i) => (i < lines.length - 1 ? `${l}\n` : l));
}

/** The benchmark task as Recourse-shaped cells (for the submit lane / the gate). */
export function benchmarkTaskCells(input: BenchmarkNotebookInput): GateCell[] {
  const task = buildCriterionBenchmarkTask(input);
  return [
    { type: 'markdown', source: `# ${input.name}` },
    { type: 'code', source: task.python },
  ];
}

export function buildBenchmarkNotebook(input: BenchmarkNotebookInput): JupyterNotebook {
  const cells = benchmarkTaskCells(input);
  return {
    nbformat: 4,
    nbformat_minor: 5,
    metadata: {
      kernelspec: { name: 'python3', display_name: 'Python 3', language: 'python' },
      language_info: { name: 'python' },
      kaggle: { language: 'python', kernelType: 'notebook' },
    },
    cells: cells.map((c) =>
      c.type === 'markdown'
        ? { cell_type: 'markdown' as const, metadata: {}, source: toLines(String(c.source)) }
        : { cell_type: 'code' as const, metadata: {}, source: toLines(String(c.source)), outputs: [], execution_count: null },
    ),
  };
}

export function benchmarkPushPlan(owner: string, slug: string): string[] {
  return [
    '1. Open https://www.kaggle.com/benchmarks/tasks/new — the kbench library is preinstalled in that notebook.',
    '2. Paste the generated cells (GET /api/kaggle/benchmark/notebook).',
    `3. Save the task, then add it to a benchmark named "${owner}/${slug}".`,
    '4. To keep it in the repo-driven flow, `kaggle kernels pull <ref> -p <dir>` and re-push with `kaggle kernels push -p <dir>`; the notebook must resolve to the same slug.',
    'NOTE: accounts registered after 2025-12-15 need extra identity verification to execute task notebooks.',
    'NOTE: this artifact is generated, not pushed; a real leaderboard entry is not claimed here.',
  ];
}