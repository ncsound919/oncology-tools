import { entity, buildProvenanceSpine, type ProvenanceSpine } from '../provenance/spine.js';
import type { ActionId } from './actionCatalog.js';

// ── Actor core: the Provenance Monitor ───────────────────────────────────────
// Records every action the executor takes, carries a CUMULATIVE risk state
// forward across steps (SciTrace-style — an early warning is never silently
// dropped), and finalises a hash-chained provenance spine for the run.

export type RiskLevel = 'none' | 'low' | 'high';

export interface ActorStep {
  action: ActionId;
  ok: boolean;
  reason: string;
  riskLevel: RiskLevel;
  at: string;
}

export class ProvenanceMonitor {
  private readonly steps: ActorStep[] = [];
  private readonly risks: string[] = [];

  record(step: ActorStep): void {
    this.steps.push(step);
    if (step.riskLevel === 'high') this.risks.push(`${step.action}: ${step.reason}`);
  }

  /** Cumulative risk state — every high-risk step seen so far, in order. */
  get riskState(): string[] {
    return [...this.risks];
  }

  get journal(): ActorStep[] {
    return [...this.steps];
  }

  /** Build the run's spine: one content-addressed entity per recorded step. */
  finalize(runId: string, prev?: ProvenanceSpine | null): ProvenanceSpine {
    const entities = this.steps.map((s, i) =>
      entity('output', `${runId}/step-${i}-${s.action}`, JSON.stringify(s)),
    );
    return buildProvenanceSpine({ runId, entities, prev: prev ?? null });
  }
}
