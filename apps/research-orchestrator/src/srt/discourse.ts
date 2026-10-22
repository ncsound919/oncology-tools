import type { NewHypothesisInput } from './registry.js';

// ── SRT: Discourse bridge ─────────────────────────────────────────────────────
// Drives the Discourse Tool's scientific multi-agent debate (spawn agents →
// turns → judge) and harvests the judge's candidate hypotheses into the SRT
// registry. The debate is ONE phase of the research team — its output is
// candidate material ("agent agreement = zero independent evidence"), never a
// result.
//
// NOTE: the fleet registry maps `discourse` to :3014, but the tool honours PORT
// and defaults to :3030 (its own :3000 collides with Grafana). DISCOURSE_URL
// overrides; the default here matches the tool as it actually runs.

export const DISCOURSE_DEFAULT_URL = 'http://localhost:3030';

export interface DebateAgent { id: string; name: string; role?: string; scientificRole?: string; [k: string]: unknown }
export interface DebateRound { name: string; userInterjection?: string; statements: Array<Record<string, unknown>> }

export interface DebateOptions {
  topic: string;
  materials?: string;
  numAgents?: number;
  rounds?: number;
  modelEngine?: 'gemini' | 'llama' | 'openai';
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

export interface DebateOutcome {
  ok: boolean;
  error?: string;
  agents: DebateAgent[];
  rounds: DebateRound[];
  dossier: Record<string, unknown> | null;
}

async function postJson<T>(
  path: string,
  body: unknown,
  opts: { baseUrl: string; fetchImpl: typeof fetch; timeoutMs: number },
): Promise<{ ok: boolean; data?: T; error?: string }> {
  try {
    const res = await opts.fetchImpl(`${opts.baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(opts.timeoutMs),
    });
    const data = (await res.json().catch(() => null)) as T | null;
    if (!res.ok) return { ok: false, error: (data as { error?: string } | null)?.error ?? `HTTP ${res.status}` };
    return { ok: true, data: data ?? undefined };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function runDebate(opts: DebateOptions): Promise<DebateOutcome> {
  const baseUrl = (opts.baseUrl ?? process.env.DISCOURSE_URL ?? DISCOURSE_DEFAULT_URL).replace(/\/+$/, '');
  const fetchImpl = opts.fetchImpl ?? fetch;
  const timeoutMs = opts.timeoutMs ?? 180_000;
  const numAgents = opts.numAgents ?? 6;
  const nRounds = opts.rounds ?? 2;
  const modelEngine = opts.modelEngine ?? 'openai';
  const materials = opts.materials ?? '';

  const spawned = await postJson<DebateAgent[]>('/api/debate/spawn-agents', { topic: opts.topic, numAgents, materials, modelEngine }, { baseUrl, fetchImpl, timeoutMs });
  if (!spawned.ok || !Array.isArray(spawned.data)) {
    return { ok: false, error: `spawn-agents failed: ${spawned.error}`, agents: [], rounds: [], dossier: null };
  }
  const agents = spawned.data;
  const rounds: DebateRound[] = Array.from({ length: nRounds }, (_, i) => ({
    name: i === 0 ? 'Round 1 — Proposal & Evidence Mapping' : `Round ${i + 1} — Adversarial Falsification`,
    statements: [],
  }));

  for (let r = 0; r < nRounds; r++) {
    for (const agent of agents) {
      const turn = await postJson<Record<string, unknown>>('/api/debate/agent-turn', {
        topic: opts.topic, format: 'roundtable', materials, agents, agentId: agent.id,
        rounds, currentRoundIndex: r, modelEngine,
      }, { baseUrl, fetchImpl, timeoutMs });
      if (!turn.ok || !turn.data) {
        return { ok: false, error: `agent-turn failed (round ${r + 1}, ${agent.name}): ${turn.error}`, agents, rounds, dossier: null };
      }
      rounds[r]!.statements.push(turn.data);
    }
  }

  const judged = await postJson<Record<string, unknown>>('/api/debate/judge', { topic: opts.topic, format: 'roundtable', materials, agents, rounds, modelEngine }, { baseUrl, fetchImpl, timeoutMs });
  if (!judged.ok) return { ok: false, error: `judge failed: ${judged.error}`, agents, rounds, dossier: null };
  return { ok: true, agents, rounds, dossier: judged.data ?? null };
}

export interface DossierCandidate {
  rank: number;
  title: string;
  mechanism: string;
  calibratedConfidence: number;
  noveltyScore?: number;
  claimCardCount: number;
}

/** Extract ranked candidate hypotheses from a judge dossier (tolerant of shape). */
export function dossierCandidates(dossier: Record<string, unknown> | null): DossierCandidate[] {
  if (!dossier) return [];
  const raw = (dossier as { candidateHypotheses?: unknown }).candidateHypotheses;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((h, i) => {
      const o = (h ?? {}) as Record<string, unknown>;
      const claimCards = Array.isArray(o.claimCards) ? o.claimCards : [];
      return {
        rank: typeof o.rank === 'number' ? o.rank : i + 1,
        title: String(o.title ?? '').trim(),
        mechanism: String(o.mechanism ?? '').trim(),
        calibratedConfidence: typeof o.calibratedConfidence === 'number' ? o.calibratedConfidence : 0.5,
        noveltyScore: typeof o.noveltyScore === 'number' ? o.noveltyScore : undefined,
        claimCardCount: claimCards.length,
      };
    })
    .filter((c) => c.title.length > 0)
    .sort((a, b) => a.rank - b.rank);
}

/** Map dossier candidates to registry inputs. */
export function dossierToHypotheses(
  dossier: Record<string, unknown> | null,
  opts: { studyId?: string } = {},
): NewHypothesisInput[] {
  return dossierCandidates(dossier).map((c) => ({
    title: c.title,
    mechanism: c.mechanism,
    calibratedConfidence: c.calibratedConfidence,
    noveltyScore: c.noveltyScore,
    evidenceTier: 5, // agent debate = zero independent evidence class
    sourceStudyId: opts.studyId,
  }));
}
