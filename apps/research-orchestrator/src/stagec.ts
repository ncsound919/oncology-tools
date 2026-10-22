import type { DispatchResult, EvidenceClass, FleetSystem, Study, StudyStage } from './types.js';

// ── Stage C: synthesis dispatch ──────────────────────────────────────────────
// Completes the study pipeline: A literature → B simulation → C synthesis.
// Every adapter is fail-soft and mirrors stageb.ts conventions — real endpoint
// contracts, required-input gates (never invented defaults), and an
// evidenceClass that separates LLM-generated synthesis (narrated) from
// deterministic cross-system integration (computed/mixed).

export interface StageCSystemSpec {
  id: string;
  endpoint: string;
  method: 'POST' | 'GET';
  requiredInputs: string[]; // keys that MUST exist in study.stageCInputs[id]
  evidenceClass: EvidenceClass;
  note?: string;
}

export const STAGE_C_ROSTER: StageCSystemSpec[] = [
  {
    id: 'overlay-oncology',
    endpoint: '/api/mechanism-fusion',
    method: 'GET',
    requiredInputs: [],
    evidenceClass: 'computed',
    note: 'Mechanism Fusion Engine — GET runs discover() over the registered mechanism DAGs and returns alignments, fusions, contradictions and transfer hypotheses. No request body.',
  },
  {
    id: 'oncoforesight',
    endpoint: '/api/narrative',
    method: 'POST',
    requiredInputs: ['patientId'],
    evidenceClass: 'narrated',
    note: 'OncoForesight narrative — LLM-generated clinical narrative over its calibrated predictors. Model opinion, not a computed result.',
  },
  {
    id: 'discourse',
    endpoint: '/api/debate/generate-brief',
    method: 'POST',
    requiredInputs: ['topic'],
    evidenceClass: 'narrated',
    note: 'Discourse debate — AI agents argue for/against the topic. Argued positions, not measurements.',
  },
  {
    id: 'decon',
    endpoint: '/api/decon-annotate/interpret',
    method: 'POST',
    requiredInputs: [],
    evidenceClass: 'computed',
    note: 'Deconvolve+Annotate TME interpretation over the overlay deconvolution service.',
  },
  {
    id: 'helixforge',
    endpoint: '', // CLI/pnpm only — no HTTP; gates on nothing and reports as probe
    method: 'POST',
    requiredInputs: [],
    evidenceClass: 'mixed',
    note: 'HelixForge hypothesis tournament — pnpm CLI only; when baseUrl is absent this stage reports CLI availability, not a synthesis result.',
  },
];

export function getStageCSpec(systemId: string): StageCSystemSpec | undefined {
  return STAGE_C_ROSTER.find(s => s.id === systemId);
}

export function validateStageCInputs(
  spec: StageCSystemSpec,
  study: Pick<Study, 'stageCInputs'>,
): { ok: boolean; missing: string[] } {
  if (!spec.requiredInputs.length) return { ok: true, missing: [] };
  const provided = study.stageCInputs?.[spec.id];
  const missing = spec.requiredInputs.filter(k => {
    const v = provided?.[k];
    return v === undefined || v === null;
  });
  return { ok: missing.length === 0, missing };
}

export function buildStageCBody(
  spec: StageCSystemSpec,
  study: Pick<Study, 'stageCInputs' | 'query' | 'directive'>,
): Record<string, unknown> {
  const provided = study.stageCInputs?.[spec.id] ?? {};
  switch (spec.id) {
    case 'overlay-oncology':
      return { signals: provided.signals };
    case 'oncoforesight':
      return {
        patientId: provided.patientId,
        ...(typeof provided.armLabel === 'string' ? { armLabel: provided.armLabel } : {}),
        ...(typeof provided.focus === 'string' ? { focus: provided.focus } : {}),
      };
    case 'discourse':
      return {
        topic: provided.topic,
        ...(Array.isArray(provided.agents) ? { agents: provided.agents } : {}),
        ...(typeof provided.rounds === 'number' ? { rounds: provided.rounds } : {}),
      };
    case 'decon':
      return {
        ...(typeof provided.sampleId === 'string' ? { sampleId: provided.sampleId } : {}),
        ...(typeof provided.cellType === 'string' ? { cellType: provided.cellType } : {}),
        ...(provided.expressionData && typeof provided.expressionData === 'object' ? { expressionData: provided.expressionData } : {}),
      };
    default:
      return { query: study.query, objective: study.directive.objective, ...provided };
  }
}

const STAGE_C_TIMEOUT_MS = 45_000;

function timeoutSignal(ms: number): AbortSignal {
  const c = new AbortController();
  setTimeout(() => c.abort(), ms);
  return c.signal;
}

export async function dispatchStageCToSystem(
  sys: FleetSystem,
  study: Pick<Study, 'id' | 'query' | 'directive' | 'stageCInputs'>,
): Promise<DispatchResult> {
  const t0 = Date.now();
  const spec = getStageCSpec(sys.id);
  if (!spec) {
    return { systemId: sys.id, ok: false, latencyMs: 0, stage: 'synthesis', error: 'no Stage C adapter' };
  }
  const gate = validateStageCInputs(spec, study);
  if (!gate.ok) {
    return {
      systemId: sys.id,
      ok: false,
      latencyMs: Date.now() - t0,
      stage: 'synthesis',
      evidenceClass: spec.evidenceClass,
      validationError: `missing required Stage C inputs for ${sys.id}: ${gate.missing.join(', ')} — supply them via study.stageCInputs["${spec.id}"]`,
    };
  }
  if (!sys.baseUrl || !spec.endpoint) {
    return {
      systemId: sys.id,
      ok: true,
      latencyMs: Date.now() - t0,
      stage: 'synthesis',
      evidenceClass: spec.evidenceClass,
      body: { note: 'Stage C system is CLI-only or has no endpoint contract — synthesis via local probes', query: study.query },
    };
  }
  try {
    const r = await fetch(`${sys.baseUrl}${spec.endpoint}`, {
      method: spec.method,
      headers: { 'Content-Type': 'application/json' },
      body: spec.method === 'POST' ? JSON.stringify(buildStageCBody(spec, study)) : undefined,
      signal: timeoutSignal(STAGE_C_TIMEOUT_MS),
    });
    const body = await r.json().catch(() => ({}));
    return {
      systemId: sys.id,
      ok: r.ok,
      latencyMs: Date.now() - t0,
      httpStatus: r.status,
      body,
      stage: 'synthesis',
      evidenceClass: spec.evidenceClass,
    };
  } catch (e: any) {
    return {
      systemId: sys.id,
      ok: false,
      latencyMs: Date.now() - t0,
      stage: 'synthesis',
      evidenceClass: spec.evidenceClass,
      error: e?.message ?? String(e),
    };
  }
}

export async function dispatchStageC(
  systems: FleetSystem[],
  study: Pick<Study, 'id' | 'query' | 'directive' | 'stageCInputs'>,
): Promise<DispatchResult[]> {
  const selected = STAGE_C_ROSTER
    .filter(spec => systems.some(s => s.id === spec.id))
    .map(spec => systems.find(s => s.id === spec.id)!);
  const out: DispatchResult[] = [];
  for (let i = 0; i < selected.length; i += 3) {
    const chunk = selected.slice(i, i + 3);
    const res = await Promise.all(chunk.map(s => dispatchStageCToSystem(s, study)));
    out.push(...res);
  }
  return out;
}