// ── Recourse compute client (Kaggle lane) ─────────────────────────────────────
// Submits a Kaggle notebook job through Recourse's compute router
// (`/api/recourse/compute/*`). Fail-soft: every call reports `available:false`
// with the real reason when Recourse is down — never a fabricated handle. Remote
// output is never trusted as verified; the caller re-verifies locally.
// Mirrors platform/lib/recourse-compute-client.ts.

export function recourseBaseUrl(env: NodeJS.ProcessEnv = process.env): string {
  return (env.RECOURSE_URL ?? 'http://localhost:3050').replace(/\/+$/, '');
}

export interface NotebookCell {
  type: 'code' | 'markdown';
  source: string;
}

export interface KaggleNotebookJob {
  id: string;
  platform: 'kaggle';
  kind: 'notebook';
  payload: { cells: NotebookCell[]; kernel: string; metadata?: Record<string, unknown> };
  hardware: { type: 'gpu' | 'cpu' | 'tpu'; spec?: string };
  maxRuntimeMs: number;
  /** datasetSources travels in meta; Recourse threads it into kernelMetadata. */
  meta?: { datasetSources?: string[] };
}

export interface BuildJobOptions {
  kernel?: string;
  hardware?: 'gpu' | 'cpu' | 'tpu';
  maxRuntimeMs?: number;
  datasetSources?: string[];
}

export function buildKaggleNotebookJob(cells: NotebookCell[], opts: BuildJobOptions = {}): KaggleNotebookJob {
  const budget = Math.min(opts.maxRuntimeMs ?? 3_600_000, 12 * 3_600_000);
  return {
    id: `onco_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    platform: 'kaggle',
    kind: 'notebook',
    payload: { cells, kernel: opts.kernel ?? 'python3' },
    hardware: { type: opts.hardware ?? 'cpu' },
    maxRuntimeMs: budget,
    ...(opts.datasetSources && opts.datasetSources.length ? { meta: { datasetSources: opts.datasetSources } } : {}),
  };
}

export interface ComputeCallOptions {
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

export interface ComputeResponse<T = unknown> {
  available: boolean;
  data?: T;
  error?: string;
}

export async function submitNotebookJob(job: KaggleNotebookJob, opts: ComputeCallOptions = {}): Promise<ComputeResponse> {
  const baseUrl = opts.baseUrl ?? recourseBaseUrl();
  const fetchImpl = opts.fetchImpl ?? fetch;
  try {
    const res = await fetchImpl(`${baseUrl}/api/recourse/compute/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(job),
      signal: AbortSignal.timeout(opts.timeoutMs ?? 30_000),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) return { available: false, error: `compute POST /jobs -> HTTP ${res.status}` };
    return { available: true, data };
  } catch (err) {
    return { available: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export interface PlatformStatus {
  platforms?: Array<{
    id: string;
    name?: string;
    configured: boolean;
    available: boolean;
    quota?: { weeklyLimit: number | null; consumed: number; sessionCap: number | null };
    hardware?: Array<{ type: string; spec: string; count: number }>;
  }>;
}

export async function fetchComputePlatforms(opts: ComputeCallOptions = {}): Promise<ComputeResponse<PlatformStatus>> {
  const baseUrl = opts.baseUrl ?? recourseBaseUrl();
  const fetchImpl = opts.fetchImpl ?? fetch;
  try {
    const res = await fetchImpl(`${baseUrl}/api/recourse/compute/platforms`, { signal: AbortSignal.timeout(opts.timeoutMs ?? 10_000) });
    const data = (await res.json().catch(() => null)) as PlatformStatus | null;
    if (!res.ok) return { available: false, error: `compute GET /platforms -> HTTP ${res.status}` };
    return { available: true, data: data ?? undefined };
  } catch (err) {
    return { available: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ── Job result (waits for completion) ────────────────────────────────────────
// GET /compute/jobs/{id}/result?platform=kaggle&timeoutMs=… — Recourse AWAITS
// the kernel and returns its result (success + stdout). The notebook prints a
// `__RECOURSE_RESULT__ <json>` envelope; we parse it and never invent a value.

export interface ComputeJobResult {
  available: boolean;
  success: boolean;
  envelope?: Record<string, unknown>;
  stdout?: string;
  error?: string;
}

export interface FetchResultOptions extends ComputeCallOptions {
  platform?: string;
  /** How long Recourse should wait for the kernel (default 5 min). */
  awaitTimeoutMs?: number;
}

export const RECOURSE_RESULT_MARKER = '__RECOURSE_RESULT__';

/** Parse the last `__RECOURSE_RESULT__ {json}` line from a notebook's stdout. */
export function parseRecourseEnvelope(stdout: string | undefined): Record<string, unknown> | undefined {
  if (!stdout) return undefined;
  const lines = stdout.split(/\r?\n/).filter((l) => l.includes(RECOURSE_RESULT_MARKER));
  for (let i = lines.length - 1; i >= 0; i--) {
    const idx = lines[i].indexOf(RECOURSE_RESULT_MARKER);
    const json = lines[i].slice(idx + RECOURSE_RESULT_MARKER.length).trim();
    try {
      const parsed: unknown = JSON.parse(json);
      if (parsed && typeof parsed === 'object') return parsed as Record<string, unknown>;
    } catch {
      // malformed line — try the previous one
    }
  }
  return undefined;
}

export async function fetchComputeResult(jobId: string, opts: FetchResultOptions = {}): Promise<ComputeJobResult> {
  const baseUrl = opts.baseUrl ?? recourseBaseUrl();
  const fetchImpl = opts.fetchImpl ?? fetch;
  const platform = opts.platform ?? 'kaggle';
  const awaitTimeoutMs = opts.awaitTimeoutMs ?? 300_000;
  const url =
    `${baseUrl}/api/recourse/compute/jobs/${encodeURIComponent(jobId)}/result` +
    `?platform=${encodeURIComponent(platform)}&timeoutMs=${awaitTimeoutMs}`;
  try {
    const res = await fetchImpl(url, { signal: AbortSignal.timeout(awaitTimeoutMs + 15_000) });
    const body = (await res.json().catch(() => null)) as
      | { success?: boolean; result?: { success?: boolean; stdout?: string[] | string; error?: string } }
      | null;
    if (!res.ok) return { available: false, success: false, error: `compute GET /jobs/:id/result -> HTTP ${res.status}` };
    const r = body?.result;
    const stdout = Array.isArray(r?.stdout) ? r!.stdout.join('\n') : r?.stdout;
    return {
      available: true,
      success: Boolean(r?.success),
      envelope: parseRecourseEnvelope(stdout),
      stdout,
      error: r?.error,
    };
  } catch (err) {
    return { available: false, success: false, error: err instanceof Error ? err.message : String(err) };
  }
}