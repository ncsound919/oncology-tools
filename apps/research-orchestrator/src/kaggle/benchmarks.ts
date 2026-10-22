import { kaggleAuthHeader, type KaggleCredentials } from './credentials.js';

// ── Kaggle Benchmarks ─────────────────────────────────────────────────────────
// Kaggle Benchmarks is a public, leaderboarded eval framework with an Apache-2.0
// SDK (`kaggle-benchmarks`): tasks are defined with `@kbench.task`, checked with
// `kbench.assertions`, and run against models. This is where the oncology
// referee/criteria packs can be published as "verification as the product".
// Source: github.com/Kaggle/kaggle-benchmarks; kaggle.com/docs/benchmarks.

const KAGGLE_API = 'https://www.kaggle.com/api/v1';

/** Python identifier-safe task name: lowercase [a-z0-9_], 3..60, no edge underscore. */
export function slugBenchmarkName(s: string): string {
  const t = String(s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 60).replace(/_+$/g, '');
  return t.length >= 3 ? t : `task_${t || 'x'}`.slice(0, 60);
}

export interface KaggleBenchmarkTask {
  name: string;
  description: string;
  python: string;
}

function pyString(s: string): string {
  return JSON.stringify(String(s));
}

/**
 * Build a `kaggle-benchmarks` task that asks a model a question and asserts the
 * response matches a preregistered pattern. Deterministic string assembly — the
 * assertion is explicit and the prompt is never invented.
 */
export function buildCriterionBenchmarkTask(input: {
  name: string;
  prompt: string;
  /** Regex the model's answer must contain (case-insensitive). */
  regex: string;
  expectation?: string;
}): KaggleBenchmarkTask {
  const name = slugBenchmarkName(input.name);
  const expectation = input.expectation ?? 'the response should satisfy the preregistered criterion';
  const docstring = input.name.replace(/"""/g, "'''");
  const python = [
    'import kaggle_benchmarks as kbench',
    '',
    `@kbench.task(name=${pyString(name)})`,
    'def expected_behavior(llm, prompt: str):',
    `    """${docstring}"""`,
    '    response = llm.prompt(prompt)',
    '    kbench.assertions.assert_contains_regex(',
    `        ${pyString(`(?i)${input.regex}`)},`,
    '        response,',
    `        expectation=${pyString(expectation)},`,
    '    )',
    '',
    `expected_behavior.run(llm=kbench.llm, prompt=${pyString(input.prompt)})`,
  ].join('\n');
  return { name, description: input.name, python };
}

export function benchmarkLeaderboardUrl(owner: string, slug: string, opts: { version?: number } = {}): string {
  const base = `${KAGGLE_API}/benchmarks/${encodeURIComponent(owner)}/${encodeURIComponent(slug)}/leaderboard`;
  return opts.version ? `${base}?versionNumber=${opts.version}` : base;
}

export interface LeaderboardResult {
  ok: boolean;
  url: string;
  rows?: unknown;
  error?: string;
}

/** Fetch a benchmark leaderboard. Public benchmarks need no auth; private do. */
export async function fetchBenchmarkLeaderboard(
  owner: string,
  slug: string,
  opts: { fetchImpl?: typeof fetch; creds?: KaggleCredentials | null; timeoutMs?: number; version?: number } = {},
): Promise<LeaderboardResult> {
  const url = benchmarkLeaderboardUrl(owner, slug, { version: opts.version });
  const fetchImpl = opts.fetchImpl ?? fetch;
  const headers: Record<string, string> = { Accept: 'application/json' };
  const auth = kaggleAuthHeader(opts.creds ?? null);
  if (auth.Authorization) headers.Authorization = auth.Authorization;
  try {
    const res = await fetchImpl(url, { headers, signal: AbortSignal.timeout(opts.timeoutMs ?? 15000) });
    if (!res.ok) return { ok: false, url, error: `HTTP ${res.status}` };
    return { ok: true, url, rows: await res.json().catch(() => null) };
  } catch (err) {
    return { ok: false, url, error: err instanceof Error ? err.message : String(err) };
  }
}