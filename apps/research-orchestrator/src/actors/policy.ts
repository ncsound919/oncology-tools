import {
  decideCycle,
  DEFAULT_POWER_POLICY,
  type CycleDecision,
  type PowerPolicy,
} from '../runtime/policy.js';
import type { CadenceStep } from '../cadence.js';
import { ACTIONS, isActionId, type ActionId } from './actionCatalog.js';

// ── Actor core: the pluggable decision policy ────────────────────────────────
// The orchestrator does not decide for itself; it asks a policy. Two policies
// ship here and they are interchangeable:
//   rulePolicy — deterministic, wraps the power policy + the cadence agenda.
//   llmPolicy  — an adapter over rulePolicy that may only choose an ActionId
//                from the catalog, and falls back to the rule decision on any
//                error or invalid choice.
// This is the Avatar result: one unchanged core, agentic reasoning as a
// pluggable adapter rather than a replacement.

export interface ActorContext {
  cpuBusyPct: number;
  memUsedPct: number;
  /** Remaining Kaggle GPU-hours this week, or null when unknown. */
  kaggleQuotaRemainingGpuHours: number | null;
  cycleCountThisHour: number;
  consecutiveErrors: number;
  /** Deterministic P0–P7 agenda for this cycle. */
  cadence: CadenceStep[];
  /** Run-card ids already submitted to Kaggle (idempotency guard). */
  submittedCardIds: string[];
  /** A minted run card that is ready to submit to the Kaggle lane (P6). */
  pendingSubmitCardId?: string;
  /** A hypothesis with promotion evidence ready, if any. */
  promotionFor?: string;
  /** A testing hypothesis with concept evidence ready (the concept head's input). */
  responseFor?: string;
  policy?: PowerPolicy;
}

export interface ActionDecision {
  action: ActionId;
  input: unknown;
  allowKaggle: boolean;
  allowLlm: boolean;
  intervalMs: number;
  reason: string;
  /** Which policy produced this decision (e.g. 'rule', 'llm', 'llm→rule'). */
  by: string;
}

export interface DecisionPolicy {
  name: string;
  decide(ctx: ActorContext): Promise<ActionDecision> | ActionDecision;
}

function powerDecision(d: CycleDecision, by: string): ActionDecision | null {
  if (d.action === 'pause') {
    return { action: 'pause', input: {}, allowKaggle: false, allowLlm: false, intervalMs: d.intervalMs, reason: d.reason, by };
  }
  if (d.action === 'throttle') {
    return { action: 'throttle', input: {}, allowKaggle: false, allowLlm: false, intervalMs: d.intervalMs, reason: d.reason, by };
  }
  return null;
}

export const rulePolicy: DecisionPolicy = {
  name: 'rule',
  decide(ctx) {
    const d = decideCycle(
      {
        cpuBusyPct: ctx.cpuBusyPct,
        memUsedPct: ctx.memUsedPct,
        kaggleQuotaRemainingGpuHours: ctx.kaggleQuotaRemainingGpuHours,
        cycleCountThisHour: ctx.cycleCountThisHour,
        consecutiveErrors: ctx.consecutiveErrors,
      },
      ctx.policy ?? DEFAULT_POWER_POLICY,
    );
    const power = powerDecision(d, 'rule');
    if (power) return power;

    // Idle: prefer the highest-priority reachable cadence step. A minted-but-
    // unsubmitted card is submitted first (P6) so a run does not wait a cycle.
    // P7 analysis (the concept head) is high-priority and runs first when ready.
    if (ctx.responseFor) {
      return {
        action: 'score-response',
        input: {},
        allowKaggle: d.allowKaggle,
        allowLlm: d.allowLlm,
        intervalMs: d.intervalMs,
        reason: 'P7 analysis: concept head over response evidence',
        by: 'rule',
      };
    }
    const step = ctx.cadence.find((s) => s.phase !== 'P5');
    if (step?.phase === 'P4' && !(ctx.pendingSubmitCardId && d.allowKaggle)) {
      return {
        action: 'mint-run-cards',
        input: {},
        allowKaggle: d.allowKaggle,
        allowLlm: d.allowLlm,
        intervalMs: d.intervalMs,
        reason: 'P4 experiment design reachable',
        by: 'rule',
      };
    }
    if (ctx.pendingSubmitCardId && d.allowKaggle) {
      return {
        action: 'submit-kaggle',
        input: { cardId: ctx.pendingSubmitCardId },
        allowKaggle: true,
        allowLlm: d.allowLlm,
        intervalMs: d.intervalMs,
        reason: 'P6 execute: submit a minted run card to the Kaggle lane',
        by: 'rule',
      };
    }
    if (ctx.promotionFor) {
      return {
        action: 'evaluate-promotion',
        input: {},
        allowKaggle: d.allowKaggle,
        allowLlm: d.allowLlm,
        intervalMs: d.intervalMs,
        reason: 'promotion evidence available',
        by: 'rule',
      };
    }
    return {
      action: 'pause',
      input: {},
      allowKaggle: false,
      allowLlm: false,
      intervalMs: d.intervalMs,
      reason: 'idle but no reachable deterministic step',
      by: 'rule',
    };
  },
};

export interface LlmPolicyDeps {
  /** Returns the model's chosen action id and a reason. */
  complete: (prompt: string, allowed: ActionId[]) => Promise<{ action: string; reason?: string }>;
}

export function buildPolicyPrompt(ctx: ActorContext, allowed: ActionId[]): string {
  const options = allowed.map((a) => `- ${a}: ${ACTIONS[a].description}`).join('\n');
  const step = ctx.cadence.find((s) => s.phase !== 'P5');
  return [
    'You are the decision policy for an autonomous research orchestrator.',
    'Choose exactly one action id from the list. Reply as JSON {"action":"<id>","reason":"<short>"}.',
    'You may not invent an action that is not listed.',
    '',
    `machine: cpu ${ctx.cpuBusyPct.toFixed(0)}%, mem ${ctx.memUsedPct.toFixed(0)}%`,
    `kaggle gpu-hours remaining: ${ctx.kaggleQuotaRemainingGpuHours ?? 'unknown'}`,
    `next cadence step: ${step ? `${step.phase} ${step.name}` : 'none'}`,
    '',
    options,
  ].join('\n');
}

/**
 * LLM-backed policy. Bounded by construction: the model may only pick a
 * catalog ActionId, and any error or invalid choice falls back to the
 * deterministic rule decision. The core never depends on the model being up.
 */
export function llmPolicy(deps: LlmPolicyDeps, fallback: DecisionPolicy = rulePolicy): DecisionPolicy {
  return {
    name: 'llm',
    async decide(ctx) {
      const rule = await fallback.decide(ctx);
      // Only consult the model when the deterministic policy found real work.
      if (rule.action === 'pause' || rule.action === 'throttle') return rule;
      const allowed = Object.keys(ACTIONS) as ActionId[];
      try {
        const out = await deps.complete(buildPolicyPrompt(ctx, allowed), allowed);
        if (!isActionId(out.action)) {
          return { ...rule, by: 'llm→rule', reason: `${rule.reason} (llm chose invalid action '${out.action}')` };
        }
        return {
          action: out.action,
          input: rule.input,
          allowKaggle: rule.allowKaggle,
          allowLlm: rule.allowLlm,
          intervalMs: rule.intervalMs,
          reason: out.reason ?? rule.reason,
          by: 'llm',
        };
      } catch (err) {
        return {
          ...rule,
          by: 'llm→rule',
          reason: `${rule.reason} (llm error: ${err instanceof Error ? err.message : String(err)})`,
        };
      }
    },
  };
}
