import { verifyNotebook, type GateCell } from '../verify/notebookGate.js';
import type { VerifyCodeResult, OpenHubGateResult } from '../fleet/externalClients.js';

// ── Phase 3: deterministic promotion gate ─────────────────────────────────────
// A research artifact may only be PROMOTED when every required check passes.
// External checks (Recourse sandbox re-verify, OpenHub audit) are optional: when
// a service is unavailable the gate records `skipped` and returns `conditional`
// — never a fabricated pass, and never a silent block.

export interface PromotionInput {
  hypothesisId: string;
  preregistered: boolean;
  /** Evidence refs resolved by the deterministic verifier. */
  claimsResolved: { total: number; unresolved: number };
  negativeControlPresent: boolean;
  /** Highest evidence tier 0..5; 0 = agent agreement only (no evidence). */
  evidenceTier: number;
  notebookCells?: GateCell[];
  generatedCode?: string;
}

export interface PromotionDeps {
  reverifyCode?: (code: string) => Promise<VerifyCodeResult>;
  openhubAudit?: (findings: Array<Record<string, unknown>>) => Promise<OpenHubGateResult>;
}

export type PromotionDecision = 'promote' | 'refuse' | 'conditional';

export interface PromotionVerdict {
  hypothesisId: string;
  decision: PromotionDecision;
  reasons: string[];
  skipped: string[];
}

export async function evaluatePromotion(input: PromotionInput, deps: PromotionDeps = {}): Promise<PromotionVerdict> {
  const reasons: string[] = [];
  const skipped: string[] = [];
  let refused = false;
  let conditional = false;

  if (!input.preregistered) {
    reasons.push('not preregistered: promotion requires a preregistration hash fixed before execution');
    refused = true;
  }
  if (input.claimsResolved.unresolved > 0) {
    reasons.push(`${input.claimsResolved.unresolved}/${input.claimsResolved.total} evidence refs unresolved (resolve-or-refuse)`);
    refused = true;
  }
  if (!input.negativeControlPresent) {
    reasons.push('no negative control: agreement cannot be distinguished from a self-consistent pipeline');
    refused = true;
  }
  if (input.evidenceTier <= 0) {
    reasons.push('evidence tier 0 (agent agreement) is not independent evidence');
    refused = true;
  }

  if (input.notebookCells && input.notebookCells.length) {
    const gate = verifyNotebook(input.notebookCells);
    if (!gate.ok) {
      reasons.push(`notebook gate failed: ${gate.errors.map((e) => e.code).join(', ')}`);
      refused = true;
    }
  }

  if (input.generatedCode && input.generatedCode.trim() && deps.reverifyCode) {
    const v = await deps.reverifyCode(input.generatedCode);
    if (!v.available) {
      skipped.push('recourse-verify');
      reasons.push(`recourse verifier unavailable (${v.detail ?? 'no detail'}) — code not re-verified`);
      conditional = true;
    } else if (!v.verified) {
      reasons.push(`recourse sandbox did not verify the generated code (${v.detail ?? 'no detail'})`);
      refused = true;
    }
  }

  if (deps.openhubAudit) {
    const findings: Array<Record<string, unknown>> = [
      { dimension: 'oncology', category: `hypothesis/${input.hypothesisId}`, severity: input.evidenceTier <= 1 ? 'high' : 'info' },
    ];
    const a = await deps.openhubAudit(findings);
    if (!a.available) {
      skipped.push('openhub-audit');
      reasons.push(`openhub audit unavailable (${a.error ?? 'no detail'}) — not promoted as gated`);
      conditional = true;
    } else if (!a.passed) {
      reasons.push(`openhub gate failed${a.failing?.length ? `: ${a.failing.join(', ')}` : ''}`);
      refused = true;
    }
  }

  const decision: PromotionDecision = refused ? 'refuse' : conditional ? 'conditional' : 'promote';
  return { hypothesisId: input.hypothesisId, decision, reasons, skipped };
}
