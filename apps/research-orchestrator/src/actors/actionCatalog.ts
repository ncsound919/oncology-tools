// ── Actor core: the validated action catalog ─────────────────────────────────
// Every actor may act only by naming one of these actions. The catalog is the
// single adapter boundary (Avatar-style): a rule-based policy and an LLM-backed
// policy both return an ActionId from this set, and the orchestrator refuses
// anything that is not in it. A policy can therefore never invent a capability
// the executor does not have.

export type ActionId =
  | 'pause'
  | 'throttle'
  | 'mint-run-cards'
  | 'submit-kaggle'
  | 'evaluate-promotion'
  | 'score-response'
  | 'record-outcome';

export interface ActionSpec {
  id: ActionId;
  description: string;
  /** True when running it touches an external system or writes durable state. */
  sideEffecting: boolean;
  /** Validation errors for the given input ([] = valid). */
  validate: (input: unknown) => string[];
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

export const ACTIONS: Record<ActionId, ActionSpec> = {
  pause: {
    id: 'pause',
    description: 'yield: machine busy or no reachable step — do nothing this cycle',
    sideEffecting: false,
    validate: () => [],
  },
  throttle: {
    id: 'throttle',
    description: 'back off this cycle (hourly budget or consecutive errors)',
    sideEffecting: false,
    validate: () => [],
  },
  'mint-run-cards': {
    id: 'mint-run-cards',
    description: 'mint a run card for every preregistered hypothesis that lacks one',
    sideEffecting: false,
    // State is drawn from the actor context by the executor; no inline input needed.
    validate: () => [],
  },
  'submit-kaggle': {
    id: 'submit-kaggle',
    description: 'submit one Kaggle notebook job through Recourse',
    sideEffecting: true,
    validate: (i) =>
      isObj(i) && typeof i.cardId === 'string' && i.cardId.trim()
        ? []
        : ['submit-kaggle requires { cardId: string }'],
  },
  'evaluate-promotion': {
    id: 'evaluate-promotion',
    description: 'run the deterministic promotion gate for a hypothesis',
    sideEffecting: false,
    validate: () => [],
  },
  'score-response': {
    id: 'score-response',
    description: 'run the RANO concept head over response evidence (P7 analysis)',
    sideEffecting: false,
    validate: () => [],
  },
  'record-outcome': {
    id: 'record-outcome',
    description: 'record an outcome for a finished run (never invented)',
    sideEffecting: true,
    validate: (i) =>
      isObj(i) && typeof i.runId === 'string' && i.runId.trim() && isObj(i.outcome)
        ? []
        : ['record-outcome requires { runId: string, outcome: object }'],
  },
};

export function isActionId(x: unknown): x is ActionId {
  return typeof x === 'string' && Object.prototype.hasOwnProperty.call(ACTIONS, x);
}

export function validateAction(id: unknown, input: unknown): { ok: boolean; errors: string[] } {
  if (!isActionId(id)) return { ok: false, errors: [`unknown action: ${String(id)}`] };
  const errors = ACTIONS[id].validate(input);
  return { ok: errors.length === 0, errors };
}
