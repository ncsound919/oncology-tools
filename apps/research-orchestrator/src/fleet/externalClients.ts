// ── Phase 3: ecosystem wiring clients (Recourse verifier, OpenHub, Synthbook) ─
// Every client is fail-soft and env-configurable. "unavailable" is a distinct
// state from "verified"/"passed" — the promotion gate records it as `skipped`,
// never as a fabricated pass.

export interface ClientResult<T> {
  available: boolean;
  data?: T;
  error?: string;
}

export interface CallOptions {
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

function trimUrl(u: string): string {
  return u.replace(/\/+$/, '');
}

// ── Recourse verifier ─────────────────────────────────────────────────────────
// POST {RECOURSE_URL}/api/recourse/verify — sandbox-verifies generated code
// before it is trusted. Mirrors the lane's "remote output is never verified" rule.

export function recourseUrl(env: NodeJS.ProcessEnv = process.env): string {
  return trimUrl(env.RECOURSE_URL ?? 'http://localhost:3050');
}

export interface VerifyCodeInput {
  code: string;
  language?: string;
  test?: string;
}

export interface VerifyCodeResult {
  verified: boolean;
  available: boolean;
  detail?: string;
}

export async function reverifyGeneratedCode(input: VerifyCodeInput, opts: CallOptions = {}): Promise<VerifyCodeResult> {
  if (!input?.code || !input.code.trim()) return { verified: false, available: true, detail: 'no code supplied' };
  const baseUrl = opts.baseUrl ?? recourseUrl();
  const fetchImpl = opts.fetchImpl ?? fetch;
  try {
    const res = await fetchImpl(`${baseUrl}/api/recourse/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: input.code, language: input.language ?? 'python', test: input.test }),
      signal: AbortSignal.timeout(opts.timeoutMs ?? 30_000),
    });
    if (!res.ok) return { verified: false, available: false, detail: `HTTP ${res.status}` };
    const j = (await res.json().catch(() => null)) as { ok?: boolean; verified?: boolean; detail?: string } | null;
    return { verified: j?.verified === true || j?.ok === true, available: true, detail: j?.detail };
  } catch (err) {
    return { verified: false, available: false, detail: err instanceof Error ? err.message : String(err) };
  }
}

// ── OpenHub audit gate ────────────────────────────────────────────────────────
// POST {OPENHUB_URL}/api/audit/run (path env-overridable). OpenHub lives on :3011.

export function openhubUrl(env: NodeJS.ProcessEnv = process.env): string {
  return trimUrl(env.OPENHUB_URL ?? 'http://localhost:3011');
}

export interface OpenHubGateResult {
  available: boolean;
  passed?: boolean;
  score?: number;
  failing?: string[];
  error?: string;
}

export async function runOpenHubGate(
  findings: Array<Record<string, unknown>>,
  opts: CallOptions & { path?: string } = {},
): Promise<OpenHubGateResult> {
  const baseUrl = opts.baseUrl ?? openhubUrl();
  const path = opts.path ?? (process.env.OPENHUB_AUDIT_PATH ?? '/api/audit/run');
  const fetchImpl = opts.fetchImpl ?? fetch;
  try {
    const res = await fetchImpl(`${baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ findings }),
      signal: AbortSignal.timeout(opts.timeoutMs ?? 60_000),
    });
    if (!res.ok) return { available: false, error: `HTTP ${res.status}` };
    const j = (await res.json().catch(() => null)) as { passed?: boolean; score?: number; failing?: string[] } | null;
    if (!j) return { available: false, error: 'non-JSON response' };
    return { available: true, passed: j.passed === true, score: j.score, failing: j.failing ?? [] };
  } catch (err) {
    return { available: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ── Synthbook grounding ───────────────────────────────────────────────────────
// POST {SYNTHBOOK_URL}/api/retrieve — corpus-grounded citations for P1. Unset URL
// means the service is not configured (not "empty results").

export function synthbookUrl(env: NodeJS.ProcessEnv = process.env): string {
  return (env.SYNTHBOOK_URL ?? '').replace(/\/+$/, '');
}

export interface GroundingHit {
  source: string;
  snippet: string;
  score?: number;
}

export interface GroundingResult {
  available: boolean;
  hits: GroundingHit[];
  error?: string;
}

export async function synthbookGround(query: string, opts: CallOptions & { k?: number } = {}): Promise<GroundingResult> {
  const baseUrl = opts.baseUrl ?? synthbookUrl();
  if (!baseUrl) return { available: false, hits: [], error: 'SYNTHBOOK_URL not configured' };
  const fetchImpl = opts.fetchImpl ?? fetch;
  try {
    const res = await fetchImpl(`${baseUrl}/api/retrieve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, k: opts.k ?? 8 }),
      signal: AbortSignal.timeout(opts.timeoutMs ?? 30_000),
    });
    if (!res.ok) return { available: false, hits: [], error: `HTTP ${res.status}` };
    const j = (await res.json().catch(() => null)) as { chunks?: unknown[]; hits?: unknown[] } | null;
    const raw = (j?.chunks ?? j?.hits ?? []) as Array<Record<string, unknown>>;
    const hits: GroundingHit[] = raw
      .map((h) => ({ source: String(h.source ?? h.title ?? ''), snippet: String(h.text ?? h.snippet ?? '').slice(0, 400), score: typeof h.score === 'number' ? h.score : undefined }))
      .filter((h) => h.source || h.snippet);
    return { available: true, hits };
  } catch (err) {
    return { available: false, hits: [], error: err instanceof Error ? err.message : String(err) };
  }
}
