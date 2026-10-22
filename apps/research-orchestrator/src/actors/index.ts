import type { ProvenanceSpine } from '../provenance/spine.js';
import { Orchestrator, type OrchestrationResult } from './orchestrator.js';
import { executeAction, type ExecutionResult, type ExecutorPorts, type ExecutorState } from './executor.js';
import { rulePolicy, type ActorContext, type DecisionPolicy } from './policy.js';
import { ProvenanceMonitor } from './provenanceMonitor.js';

// ── Actor core: one cycle, wired ─────────────────────────────────────────────
// orchestrator.decide → executor.execute → provenance-monitor.record → spine.
// Deterministic by default (rulePolicy); an LLM policy can be injected and will
// fall back to the rule decision on any error.

export * from './actionCatalog.js';
export * from './policy.js';
export * from './orchestrator.js';
export * from './executor.js';
export * from './provenanceMonitor.js';

export interface ActorCycleArgs {
  runId: string;
  ctx: ActorContext;
  state: ExecutorState;
  policy?: DecisionPolicy;
  ports?: ExecutorPorts;
  monitor?: ProvenanceMonitor;
  prev?: ProvenanceSpine | null;
  now?: () => string;
}

export interface ActorCycleResult {
  orchestration: OrchestrationResult;
  execution: ExecutionResult | null;
  riskState: string[];
  spine: ProvenanceSpine;
  monitor: ProvenanceMonitor;
}

export async function runActorCycle(args: ActorCycleArgs): Promise<ActorCycleResult> {
  const policy = args.policy ?? rulePolicy;
  const monitor = args.monitor ?? new ProvenanceMonitor();
  const now = args.now ?? (() => new Date().toISOString());
  const orchestrator = new Orchestrator(policy);

  const orchestration = await orchestrator.decide(args.ctx);

  if (orchestration.refused || !orchestration.decision) {
    monitor.record({
      action: 'pause',
      ok: false,
      reason: `refused: ${orchestration.errors.join('; ')}`,
      riskLevel: 'high',
      at: now(),
    });
    return {
      orchestration,
      execution: null,
      riskState: monitor.riskState,
      spine: monitor.finalize(args.runId, args.prev),
      monitor,
    };
  }

  const execution = await executeAction(orchestration.decision, args.state, args.ports);
  monitor.record({
    action: orchestration.decision.action,
    ok: execution.ok,
    reason: execution.error ?? orchestration.decision.reason,
    riskLevel: execution.ok ? (execution.sideEffecting ? 'low' : 'none') : 'high',
    at: now(),
  });

  return {
    orchestration,
    execution,
    riskState: monitor.riskState,
    spine: monitor.finalize(args.runId, args.prev),
    monitor,
  };
}
