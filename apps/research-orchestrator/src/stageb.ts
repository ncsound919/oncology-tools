import type { DispatchResult, EvidenceClass, FleetSystem, Study, StudyStage } from './types.js';

// ── Stage B: simulation dispatch ─────────────────────────────────────────────
// Real per-system runs against each system's documented endpoint contract.
// Every adapter is fail-soft: a validation-gate failure returns a DispatchResult
// with validationError set and makes NO network call.

export interface StageBSystemSpec {
  id: string;
  endpoint: string; // path appended to baseUrl
  requiredInputs: string[]; // keys that MUST exist in study.stageBInputs[id] (top-level presence, non-null)
  evidenceClass: EvidenceClass;
  note?: string; // provenance caveat surfaced in claims/paper
}

export const STAGE_B_ROSTER: StageBSystemSpec[] = [
  {
    id: 'overlay-oncology',
    endpoint: '/api/simulate',
    requiredInputs: ['ic50'],
    evidenceClass: 'computed',
    note: 'Multiscale TME engine: two-compartment PK/PD ODE, reaction-diffusion PDE (CFL sub-cycling), agent-based contact mechanics. ic50 is validated upstream — no silent default.',
  },
  {
    id: 'oncoforesight',
    endpoint: '/api/simulate',
    requiredInputs: ['patientId', 'armLabel'],
    evidenceClass: 'computed',
    note: 'Counterfactual arm-switch simulator over calibrated remission/resistance/toxicity predictors for a patient in its trial database.',
  },
  {
    id: 'umoe',
    endpoint: '/inference/run',
    requiredInputs: ['tumor_id'],
    evidenceClass: 'computed',
    note: 'UMOE mechanistic engine pipeline (ume.standard_therapy_pipeline) — ODE engine registry run with optional calibration.',
  },
  {
    id: 'chemlab',
    endpoint: '/api/simulate/kinetics',
    requiredInputs: ['temperature', 'totalTime'],
    evidenceClass: 'computed',
    note: 'Reaction kinetics ODE (temperature/time/equivalents/catalyst drops).',
  },
  {
    id: 'attec',
    endpoint: '/api/screening/run',
    requiredInputs: [],
    evidenceClass: 'computed',
    note: 'In-silico virtual screening. CAVEAT: the payload enrichmentFactor is a hardcoded constant upstream — ignore it; hits/totalScreened are computed.',
  },
  {
    id: 'oncograph',
    endpoint: '/api/tumor/simulate-knockout',
    requiredInputs: ['mutation'],
    evidenceClass: 'narrated',
    note: 'OUTPUT IS A GEMINI LLM NARRATIVE, not a mechanistic simulation. Claims from this system are model opinion and must never be presented as computed results.',
  },
];

export function getStageBSpec(systemId: string): StageBSystemSpec | undefined {
  return STAGE_B_ROSTER.find(s => s.id === systemId);
}

// Deterministic input gate: every required key must be present and non-null in
// study.stageBInputs[systemId]. The orchestrator NEVER invents defaults.
export function validateStageBInputs(
  spec: StageBSystemSpec,
  study: Pick<Study, 'stageBInputs'>,
): { ok: boolean; missing: string[] } {
  const provided = study.stageBInputs?.[spec.id];
  const missing = spec.requiredInputs.filter(k => {
    const v = provided?.[k];
    return v === undefined || v === null;
  });
  return { ok: missing.length === 0, missing };
}

export function buildStageBBody(
  spec: StageBSystemSpec,
  study: Pick<Study, 'stageBInputs' | 'query'>,
): Record<string, unknown> {
  const provided = study.stageBInputs?.[spec.id] ?? {};
  switch (spec.id) {
    case 'overlay-oncology':
      return {
        ic50: provided.ic50,
        steps: provided.steps ?? 120,
        seed: provided.seed ?? 42,
        ...(typeof provided.provider === 'string' ? { provider: provided.provider } : {}),
      };
    case 'oncoforesight':
      return {
        patientId: provided.patientId,
        armLabel: provided.armLabel,
        ...(provided.timepointId != null ? { timepointId: provided.timepointId } : {}),
      };
    case 'umoe':
      return {
        tumor_id: provided.tumor_id,
        ...(Array.isArray(provided.therapies) ? { therapies: provided.therapies } : {}),
        ...(typeof provided.mode === 'string' ? { mode: provided.mode } : {}),
        ...(provided.overrides && typeof provided.overrides === 'object' ? { overrides: provided.overrides } : {}),
        ...(provided.params && typeof provided.params === 'object' ? { params: provided.params } : {}),
        ...(typeof provided.seed === 'number' ? { seed: provided.seed } : {}),
      };
    case 'chemlab':
      return {
        temperature: provided.temperature,
        totalTime: provided.totalTime,
        ...(provided.steps != null ? { steps: provided.steps } : {}),
        ...(provided.equiv != null ? { equiv: provided.equiv } : {}),
        ...(provided.catalystDrops != null ? { catalystDrops: provided.catalystDrops } : {}),
      };
    case 'attec':
      return {
        ...(typeof provided.scaffoldId === 'string' ? { scaffoldId: provided.scaffoldId } : {}),
        ...(typeof provided.targetProtein === 'string' ? { targetProtein: provided.targetProtein } : {}),
      };
    case 'oncograph':
      return {
        sample: provided.sample && typeof provided.sample === 'object' ? provided.sample : undefined,
        mutation: provided.mutation,
        ...(typeof provided.therapeuticAgent === 'string' ? { therapeuticAgent: provided.therapeuticAgent } : {}),
      };
    default:
      return { query: study.query, ...provided };
  }
}

const STAGE_B_TIMEOUT_MS = 60_000; // ODE/PDE runs can take longer than literature probes

function timeoutSignal(ms: number): AbortSignal {
  const c = new AbortController();
  setTimeout(() => c.abort(), ms);
  return c.signal;
}

export async function dispatchStageBToSystem(
  sys: FleetSystem,
  study: Pick<Study, 'id' | 'query' | 'stageBInputs'>,
): Promise<DispatchResult> {
  const t0 = Date.now();
  const spec = getStageBSpec(sys.id);
  if (!spec) {
    return { systemId: sys.id, ok: false, latencyMs: 0, stage: 'simulation', error: 'no Stage B adapter' };
  }
  const gate = validateStageBInputs(spec, study);
  if (!gate.ok) {
    return {
      systemId: sys.id,
      ok: false,
      latencyMs: Date.now() - t0,
      stage: 'simulation',
      evidenceClass: spec.evidenceClass,
      validationError: `missing required Stage B inputs for ${sys.id}: ${gate.missing.join(', ')} — supply them via study.stageBInputs["${spec.id}"]`,
    };
  }
  if (!sys.baseUrl) {
    return {
      systemId: sys.id, ok: false, latencyMs: Date.now() - t0, stage: 'simulation',
      error: 'Stage B system has no baseUrl (CLI-only) — cannot dispatch over HTTP',
    };
  }
  try {
    const r = await fetch(`${sys.baseUrl}${spec.endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildStageBBody(spec, study)),
      signal: timeoutSignal(STAGE_B_TIMEOUT_MS),
    });
    const body = await r.json().catch(() => ({}));
    return {
      systemId: sys.id,
      ok: r.ok,
      latencyMs: Date.now() - t0,
      httpStatus: r.status,
      body,
      stage: 'simulation',
      evidenceClass: spec.evidenceClass,
    };
  } catch (e: any) {
    return {
      systemId: sys.id,
      ok: false,
      latencyMs: Date.now() - t0,
      stage: 'simulation',
      evidenceClass: spec.evidenceClass,
      error: e?.message ?? String(e),
    };
  }
}

export async function dispatchStageB(
  systems: FleetSystem[],
  study: Pick<Study, 'id' | 'query' | 'stageBInputs'>,
): Promise<DispatchResult[]> {
  const selected = STAGE_B_ROSTER
    .filter(spec => systems.some(s => s.id === spec.id))
    .map(spec => systems.find(s => s.id === spec.id)!);
  // Bounded concurrency 3 — ODE/PDE runs are heavier than literature probes.
  const out: DispatchResult[] = [];
  for (let i = 0; i < selected.length; i += 3) {
    const chunk = selected.slice(i, i + 3);
    const res = await Promise.all(chunk.map(s => dispatchStageBToSystem(s, study)));
    out.push(...res);
  }
  return out;
}

export function stageOfResult(r: DispatchResult): StudyStage {
  return r.stage ?? 'probe';
}
