import type { Claim, Contribution, ResearchDirective } from '../types.js';
import type { HypothesisRecord } from '../srt/registry.js';
import type { RunCard } from '../srt/experiment.js';

// ── World model ───────────────────────────────────────────────────────────────
// The structured, queryable state of a study — the Kosmos pattern: assemble what
// is known (question, systems, claims, hypotheses, runs, gaps) into one object,
// then QUERY it to propose the next tasks. Pure and deterministic; persistence is
// in world/store.ts.

export interface WorldClaimRef {
  claimId: string;
  text: string;
  kind: string;
  verified: boolean;
  evidenceClass: string;
  systemId?: string;
}

export interface WorldHypothesisRef {
  id: string;
  title: string;
  status: string;
  calibratedConfidence: number;
}

export interface WorldRunRef {
  id: string;
  hypothesisId: string;
  targetKind: string;
  targetId: string | null;
  notes: string;
}

export interface WorldModel {
  studyId: string;
  objective: string;
  direction: string;
  standingHypothesis?: string;
  questions: string[];
  systemsOnline: string[];
  systemsOffline: string[];
  claims: WorldClaimRef[];
  verifiedClaims: number;
  quarantinedClaims: number;
  hypotheses: WorldHypothesisRef[];
  runs: WorldRunRef[];
  gaps: string[];
  generatedAt: string;
}

export interface BuildWorldModelInput {
  studyId: string;
  directive: ResearchDirective;
  contributions: Contribution[];
  claims: Claim[];
  hypotheses: HypothesisRecord[];
  runs: RunCard[];
}

function uniq(xs: string[]): string[] {
  return [...new Set(xs)];
}

export function buildWorldModel(input: BuildWorldModelInput): WorldModel {
  const verified = input.claims.filter((c) => c.verified);
  return {
    studyId: input.studyId,
    objective: input.directive.objective,
    direction: input.directive.direction,
    ...(input.directive.hypothesis ? { standingHypothesis: input.directive.hypothesis } : {}),
    questions: [...input.directive.questions],
    systemsOnline: uniq(input.contributions.filter((c) => c.kind !== 'offline').map((c) => c.systemId)),
    systemsOffline: uniq(input.contributions.filter((c) => c.kind === 'offline').map((c) => c.systemId)),
    claims: input.claims.map((c) => ({ claimId: c.claimId, text: c.text, kind: c.kind, verified: c.verified, evidenceClass: c.evidenceClass, ...(c.systemId ? { systemId: c.systemId } : {}) })),
    verifiedClaims: verified.length,
    quarantinedClaims: input.claims.length - verified.length,
    hypotheses: input.hypotheses.map((h) => ({ id: h.id, title: h.title, status: h.status, calibratedConfidence: h.calibratedConfidence })),
    runs: input.runs.map((r) => ({
      id: r.id,
      hypothesisId: r.hypothesisId,
      targetKind: r.target?.kind ?? 'unrouted',
      targetId: r.target ? (r.target.kind === 'fleet' ? r.target.systemId : r.target.experimentId) : null,
      notes: r.notes,
    })),
    gaps: verified.filter((c) => c.kind === 'gap').map((c) => c.text),
    generatedAt: new Date().toISOString(),
  };
}

export interface ProposedTask {
  kind: 'preregister' | 'run-experiment' | 'gather-evidence' | 'review-literature';
  target: string;
  rationale: string;
  priority: 'high' | 'medium' | 'low';
}

const PRIORITY: Record<ProposedTask['priority'], number> = { high: 0, medium: 1, low: 2 };

/** Query the world model for what the team should do next (sorted by priority). */
export function proposeNextTasks(model: WorldModel): ProposedTask[] {
  const tasks: ProposedTask[] = [];
  for (const h of model.hypotheses) {
    const hasRun = model.runs.some((r) => r.hypothesisId === h.id);
    if (h.status === 'proposed') {
      tasks.push({ kind: 'preregister', target: h.id, rationale: `"${h.title}" is proposed but not preregistered — no analysis plan is locked.`, priority: 'high' });
    } else if (h.status === 'preregistered' && !hasRun) {
      tasks.push({ kind: 'run-experiment', target: h.id, rationale: `"${h.title}" is preregistered but has no run card.`, priority: 'high' });
    } else if (h.status === 'testing') {
      tasks.push({ kind: 'run-experiment', target: h.id, rationale: `"${h.title}" is in testing; more runs are needed for a verdict.`, priority: 'medium' });
    } else if (h.status === 'falsified' || h.status === 'null') {
      tasks.push({ kind: 'review-literature', target: h.id, rationale: `"${h.title}" was ${h.status}; review prior art and methods before re-posing it.`, priority: 'low' });
    }
  }
  if (model.quarantinedClaims > 0) {
    tasks.push({ kind: 'gather-evidence', target: 'claims', rationale: `${model.quarantinedClaims} claim(s) failed evidence verification — supply real evidence refs.`, priority: 'high' });
  }
  for (const s of model.systemsOffline) {
    tasks.push({ kind: 'gather-evidence', target: s, rationale: `System '${s}' was offline; its role in the run is unfulfilled.`, priority: 'medium' });
  }
  for (const g of model.gaps) {
    tasks.push({ kind: 'gather-evidence', target: 'gap', rationale: g, priority: 'medium' });
  }
  return tasks.sort((a, b) => PRIORITY[a.priority] - PRIORITY[b.priority]);
}