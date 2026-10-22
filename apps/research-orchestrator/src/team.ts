import { buildWorldModel, proposeNextTasks, type BuildWorldModelInput, type ProposedTask, type WorldModel } from './world/model.js';
import { buildRunCard, type RunCard } from './srt/experiment.js';

// ── Team orchestrator ─────────────────────────────────────────────────────────
// The Scientific Research Team's loop over a study: assemble the world model from
// what the run produced, ask it what to do next, and mint run cards for every
// preregistered hypothesis that has none. Pure — the server persists the world
// model and can optionally execute the run cards via the existing pipeline.

export interface TeamPlan {
  worldModel: WorldModel;
  tasks: ProposedTask[];
  runCards: RunCard[];
  notes: string;
}

export function buildTeamPlan(input: BuildWorldModelInput): TeamPlan {
  const worldModel = buildWorldModel(input);
  const tasks = proposeNextTasks(worldModel);
  const withRuns = new Set(input.runs.map((r) => r.hypothesisId));
  const runCards: RunCard[] = [];
  for (const h of input.hypotheses) {
    if (h.status === 'preregistered' && h.preregistration && !withRuns.has(h.id)) {
      runCards.push(buildRunCard(h, h.preregistration));
    }
  }
  const notes = [
    `${input.hypotheses.length} hypothesis(es) in the registry`,
    `${tasks.length} next task(s)`,
    `${runCards.length} new run card(s)`,
  ].join(' · ');
  return { worldModel, tasks, runCards, notes };
}

/** One-line human summary of a plan (for logs / API responses). */
export function planSummary(plan: TeamPlan): string {
  return `${plan.notes}; top task: ${plan.tasks[0] ? `${plan.tasks[0].kind} ${plan.tasks[0].target}` : 'none'}`;
}