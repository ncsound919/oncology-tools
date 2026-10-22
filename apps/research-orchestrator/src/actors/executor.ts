import { runCadenceCycle } from '../cadenceRunner.js';
import { evaluatePromotion, type PromotionInput, type PromotionVerdict } from '../gate/promotion.js';
import { scoreResponseCohort, type ResponseCase } from '../rano/score.js';
import { evaluateCriterion } from '../rano/criterion.js';
import { ACTIONS, type ActionId } from './actionCatalog.js';
import type { ActionDecision } from './policy.js';
import type { HypothesisRecord } from '../srt/registry.js';
import type { RunCard } from '../srt/experiment.js';

// ── Actor core: the Executor ─────────────────────────────────────────────────
// Runs exactly one validated action. The deterministic Phase 4 cadence executor
// (runCadenceCycle) and the Phase 3 promotion gate (evaluatePromotion) are now
// ACTIONS reached through here, not functions called ad hoc. External effects
// are injected ports, so the executor itself stays testable and side-effect-free.

export interface ExecutorState {
  hypotheses: HypothesisRecord[];
  runs: RunCard[];
  /** Promotion evidence for this cycle, when available. */
  promotion?: PromotionInput;
  /** Concept evidence for the P7 concept-head analysis, when available. */
  response?: { hypothesisId: string; cases: ResponseCase[]; successCriterion?: string | null; falsifier?: string | null };
}

export interface KaggleSubmitResult {
  available: boolean;
  externalId?: string;
  status?: string;
  detail?: string;
}

export interface ExecutorPorts {
  mintRunCards?: (state: ExecutorState) => RunCard[];
  submitKaggle?: (input: { cardId: string }, state: ExecutorState) => Promise<KaggleSubmitResult>;
  evaluatePromotion?: (input: PromotionInput) => Promise<PromotionVerdict>;
  recordOutcome?: (input: { runId: string; outcome: Record<string, unknown> }) => Promise<void>;
}

export interface ExecutionResult {
  action: ActionId;
  ok: boolean;
  sideEffecting: boolean;
  result?: unknown;
  error?: string;
}

const defaultMintRunCards = (state: ExecutorState): RunCard[] =>
  runCadenceCycle({ hypotheses: state.hypotheses, runs: state.runs }).mintedRunCards;

export async function executeAction(
  decision: ActionDecision,
  state: ExecutorState,
  ports: ExecutorPorts = {},
): Promise<ExecutionResult> {
  const sideEffecting = ACTIONS[decision.action].sideEffecting;
  try {
    switch (decision.action) {
      case 'pause':
      case 'throttle':
        return {
          action: decision.action,
          ok: true,
          sideEffecting,
          result: { deferred: true, reason: decision.reason },
        };

      case 'mint-run-cards': {
        const mint = ports.mintRunCards ?? defaultMintRunCards;
        const cards = mint(state);
        return { action: decision.action, ok: true, sideEffecting, result: { minted: cards.length, cards } };
      }

      case 'submit-kaggle': {
        if (!ports.submitKaggle) {
          return { action: decision.action, ok: false, sideEffecting, error: 'no submitKaggle port wired' };
        }
        const cardId = (decision.input as { cardId?: string }).cardId ?? '';
        const res = await ports.submitKaggle({ cardId }, state);
        return {
          action: decision.action,
          ok: res.available,
          sideEffecting,
          result: res,
          error: res.available ? undefined : res.detail ?? 'kaggle submit unavailable',
        };
      }

      case 'evaluate-promotion': {
        if (!state.promotion) {
          return { action: decision.action, ok: false, sideEffecting, error: 'no promotion input in state' };
        }
        const verdict = await (ports.evaluatePromotion ?? evaluatePromotion)(state.promotion);
        return { action: decision.action, ok: true, sideEffecting, result: verdict };
      }

      case 'score-response': {
        if (!state.response) {
          return { action: decision.action, ok: false, sideEffecting, error: 'no response evidence in state' };
        }
        const scored = scoreResponseCohort(state.response.cases);
        const verdict = state.response.successCriterion || state.response.falsifier
          ? evaluateCriterion(scored.summary, state.response.successCriterion, state.response.falsifier)
          : undefined;
        return {
          action: decision.action,
          ok: true,
          sideEffecting,
          result: { hypothesisId: state.response.hypothesisId, ...scored, verdict },
        };
      }

      case 'record-outcome': {
        if (!ports.recordOutcome) {
          return { action: decision.action, ok: false, sideEffecting, error: 'no recordOutcome port wired' };
        }
        const input = decision.input as { runId: string; outcome: Record<string, unknown> };
        await ports.recordOutcome(input);
        return { action: decision.action, ok: true, sideEffecting, result: { recorded: input.runId } };
      }

      default: {
        const never: never = decision.action;
        return { action: never, ok: false, sideEffecting, error: 'unreachable' };
      }
    }
  } catch (err) {
    return {
      action: decision.action,
      ok: false,
      sideEffecting,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
