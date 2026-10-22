import { validateAction } from './actionCatalog.js';
import type { ActorContext, ActionDecision, DecisionPolicy } from './policy.js';

// ── Actor core: the Orchestrator ─────────────────────────────────────────────
// Asks the policy what to do, then VALIDATES the answer against the catalog
// before anyone acts on it. A policy that returns an unknown action, or an
// action whose input fails its own schema, is refused — not executed.

export interface OrchestrationResult {
  decision: ActionDecision | null;
  refused: boolean;
  errors: string[];
}

export class Orchestrator {
  constructor(private readonly policy: DecisionPolicy) {}

  async decide(ctx: ActorContext): Promise<OrchestrationResult> {
    const raw = await this.policy.decide(ctx);
    const v = validateAction(raw.action, raw.input);
    if (!v.ok) return { decision: null, refused: true, errors: v.errors };
    return { decision: raw, refused: false, errors: [] };
  }
}
