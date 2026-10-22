// ── Phase 4: autonomous cadence ───────────────────────────────────────────────
// Deterministic P0–P7 agenda for one cycle, built from the world model state.
// Pure and testable: no timer, no hidden state. The scheduler may run it; this
// module only decides WHAT to do next and WHY.

export type Phase = 'P0' | 'P1' | 'P2' | 'P3' | 'P4' | 'P5' | 'P6' | 'P7';

export interface CadenceHypothesis {
  id: string;
  status: 'proposed' | 'preregistered' | 'testing' | 'supported' | 'falsified' | 'null' | 'retracted';
}

export interface CadenceTask {
  kind: string;
  priority: 'high' | 'medium' | 'low';
}

export interface CadenceStep {
  phase: Phase;
  name: string;
  action: string;
  priority: 'high' | 'medium' | 'low';
  requires: string[];
  /** Hypothesis ids this step acts on. */
  targets: string[];
}

export interface CadenceState {
  hypotheses: CadenceHypothesis[];
  worldTasks?: CadenceTask[];
  /** Ids of hypotheses that have a matching analysis run outstanding. */
  testing?: string[];
}

const OPEN = new Set(['proposed', 'preregistered', 'testing']);

export function buildCadence(state: CadenceState): CadenceStep[] {
  const steps: CadenceStep[] = [];
  const proposed = state.hypotheses.filter((h) => h.status === 'proposed');
  const preregistered = state.hypotheses.filter((h) => h.status === 'preregistered');
  const testing = state.hypotheses.filter((h) => h.status === 'testing');

  if (proposed.length) {
    steps.push({
      phase: 'P1', name: 'literature & prior art', action: 'ground each proposed hypothesis (Synthbook + OpenAlex) before it advances',
      priority: 'high', requires: ['synthbook', 'openalex'], targets: proposed.map((h) => h.id),
    });
    steps.push({
      phase: 'P2', name: 'hypothesis generation', action: 'expand proposed hypotheses into ranked candidates with mechanisms',
      priority: 'high', requires: ['mechanism_builder', 'translator'], targets: proposed.map((h) => h.id),
    });
  }
  if (proposed.length) {
    steps.push({
      phase: 'P3', name: 'adversarial falsification', action: 'run the Discourse debate; harvest candidate hypotheses + falsifiers',
      priority: 'high', requires: ['discourse'], targets: proposed.map((h) => h.id),
    });
    steps.push({
      phase: 'P0', name: 'preregister', action: 'fix hypothesis + data plan + analysis plan + hold-out, then hash (before any run)',
      priority: 'high', requires: ['ledger'], targets: proposed.map((h) => h.id),
    });
  }
  if (preregistered.length) {
    steps.push({
      phase: 'P4', name: 'experiment design', action: 'emit a run card (Kaggle job / ecosystem engine) or a structured wet-lab protocol',
      priority: 'high', requires: ['experiment_generator'], targets: preregistered.map((h) => h.id),
    });
    steps.push({
      phase: 'P6', name: 'execute', action: 'submit run cards; carry seeds + dataset sources; never trust remote output as verified',
      priority: 'medium', requires: ['kaggle', 'ecosystem_engine'], targets: preregistered.map((h) => h.id),
    });
  }
  if (testing.length) {
    steps.push({
      phase: 'P7', name: 'analyse & update', action: 'score against the preregistered criterion; update the world model; null ledger on falsification',
      priority: 'high', requires: ['referee', 'analysis'], targets: testing.map((h) => h.id),
    });
  }
  steps.push({
    phase: 'P5', name: 'synthesis & ranking', action: 'assemble the dossier; every statement cites a claim card or a run',
    priority: 'medium', requires: ['synthesis_editor'], targets: state.hypotheses.filter((h) => OPEN.has(h.status)).map((h) => h.id),
  });

  const rank = { high: 0, medium: 1, low: 2 } as const;
  return steps.sort((a, b) => rank[a.priority] - rank[b.priority] || a.phase.localeCompare(b.phase));
}
