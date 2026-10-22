import { buildCadence, type CadenceStep } from './cadence.js';
import { buildRunCard, type RunCard } from './srt/experiment.js';
import type { HypothesisRecord } from './srt/registry.js';
import type { RefereeAssuranceArtifact } from './srt/fromReferee.js';

// ── Phase 4: autonomous cadence executor ──────────────────────────────────────
// The cadence names WHAT to do; this decides what the orchestrator can ACTUALLY
// do unattended today — and refuses to fake the rest. It mints run cards for
// preregistered hypotheses (P4), and since the referee bridge exists it also
// surfaces P7 as ACTIONABLE when a finished, gated referee artifact is supplied.
// Everything else is *deferred* with an explicit reason (external service, or a
// spec only a human/study may supply).
//
// It never preregisters (P0) a hypothesis it was not given a spec for, and never
// records an outcome (P7) without a finished run.

export interface CadenceDeferred {
  phase: string;
  name: string;
  reason: string;
}

/** A finished referee scorecard paired with the hypothesis it was run for. */
export interface RefereeRunInput {
  hypothesisId: string;
  artifact: RefereeAssuranceArtifact;
}

export interface CadenceCycleReport {
  steps: CadenceStep[];
  mintedRunCards: RunCard[];
  /**
   * Hypotheses whose P7 analysis can run now, because a finished referee artifact
   * was supplied for them. Application is the caller's step (applyRefereeArtifact),
   * so this function stays side-effect-free.
   */
  p7Actionable: string[];
  deferred: CadenceDeferred[];
  progressed: boolean;
}

const DEFER_REASON: Record<string, string> = {
  P0: 'preregistration needs a hypothesis spec (never auto-fabricated)',
  P1: 'grounding needs Synthbook/OpenAlex (external)',
  P2: 'hypothesis expansion needs the mechanism/debate engine (external)',
  P3: 'adversarial falsification needs the Discourse engine (external)',
  P6: 'execution needs Recourse/Kaggle or a wet-lab partner (external)',
  P7: 'analysis needs a finished referee artifact for this hypothesis (never invented)',
};

/** One deterministic cycle: build the agenda, execute the reachable step(s). */
export function runCadenceCycle(args: {
  hypotheses: HypothesisRecord[];
  runs: RunCard[];
  referees?: RefereeRunInput[];
  now?: string;
}): CadenceCycleReport {
  const steps = buildCadence({ hypotheses: args.hypotheses.map((h) => ({ id: h.id, status: h.status })) });
  const withRuns = new Set(args.runs.map((r) => r.hypothesisId));
  const withReferees = new Set((args.referees ?? []).map((r) => r.hypothesisId));
  const mintedRunCards: RunCard[] = [];
  const p7Actionable: string[] = [];
  const deferred: CadenceDeferred[] = [];

  for (const step of steps) {
    if (step.phase === 'P4') {
      for (const h of args.hypotheses) {
        if (h.status === 'preregistered' && h.preregistration && !withRuns.has(h.id)) {
          mintedRunCards.push(buildRunCard(h, h.preregistration, { now: args.now }));
        }
      }
    } else if (step.phase === 'P7') {
      // Actionable only for hypotheses that actually have an artifact; the rest
      // keep the explicit reason. Never treat "some artifact exists" as "all do".
      const pending: string[] = [];
      for (const id of step.targets) {
        if (withReferees.has(id)) p7Actionable.push(id);
        else pending.push(id);
      }
      if (pending.length) {
        deferred.push({
          phase: 'P7',
          name: step.name,
          reason: `${DEFER_REASON.P7} (no artifact for: ${pending.join(', ')})`,
        });
      }
    } else if (step.phase !== 'P5') {
      deferred.push({ phase: step.phase, name: step.name, reason: DEFER_REASON[step.phase] ?? 'external system required' });
    }
  }
  return { steps, mintedRunCards, p7Actionable, deferred, progressed: mintedRunCards.length > 0 || p7Actionable.length > 0 };
}

export interface CadenceLoopReport {
  cycles: CadenceCycleReport[];
  mintedRunCards: RunCard[];
  stoppedBecause: 'no-progress' | 'max-cycles';
}

/**
 * Run cycles until no progress (deterministic fıxed point) or a cycle cap. The
 * loop is bounded, side-effect-free (returns the cards to persist), and stops the
 * moment a cycle would repeat itself.
 */
export function runCadenceLoop(args: {
  hypotheses: HypothesisRecord[];
  runs: RunCard[];
  now?: string;
  maxCycles?: number;
}): CadenceLoopReport {
  const maxCycles = Math.max(1, args.maxCycles ?? 5);
  const cycles: CadenceCycleReport[] = [];
  const minted: RunCard[] = [];
  let runs = [...args.runs];
  let stoppedBecause: CadenceLoopReport['stoppedBecause'] = 'max-cycles';
  for (let i = 0; i < maxCycles; i++) {
    const c = runCadenceCycle({ hypotheses: args.hypotheses, runs, now: args.now });
    cycles.push(c);
    minted.push(...c.mintedRunCards);
    runs = [...runs, ...c.mintedRunCards];
    if (!c.progressed) {
      stoppedBecause = 'no-progress';
      break;
    }
  }
  return { cycles, mintedRunCards: minted, stoppedBecause };
}
