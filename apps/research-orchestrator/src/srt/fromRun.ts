import type { Claim, ResearchDirective } from '../types.js';
import type { NewHypothesisInput } from './registry.js';

// ── SRT: turn a run into candidate hypotheses ────────────────────────────────
// Question/hypothesis generation is the largest missing capability in the
// orchestrator (docs/AUTONOMOUS-RESEARCH-ROADMAP.md "Question generation"). This
// is the minimal honest version: every run proposes the directive's stated
// hypothesis and any VERIFIED claim of kind 'hypothesis' as `proposed` registry
// entries. Nothing is preregistered automatically; a reviewer locks a plan.

function firstSentence(text: string, max = 160): string {
  const t = String(text ?? '').trim().replace(/\s+/g, ' ');
  const end = t.search(/[.!?]\s/);
  const s = end > 20 ? t.slice(0, end + 1) : t;
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

export function hypothesesFromRun(input: {
  studyId: string;
  directive: ResearchDirective;
  claims: Claim[];
}): NewHypothesisInput[] {
  const out: NewHypothesisInput[] = [];
  const standing = (input.directive.hypothesis ?? '').trim();
  if (standing) {
    out.push({
      title: firstSentence(standing),
      mechanism: standing,
      sourceStudyId: input.studyId,
      evidenceTier: 5,
      calibratedConfidence: 0.5,
    });
  }
  for (const c of input.claims) {
    if (!c.verified || c.kind !== 'hypothesis') continue;
    out.push({
      title: firstSentence(c.text),
      mechanism: '',
      sourceStudyId: input.studyId,
      sourceClaimIds: [c.claimId],
      // A hypothesis claim's evidence tier is at best the tier of what it cites;
      // without a tier field, mark it computational/plausibility (5).
      evidenceTier: 5,
      calibratedConfidence: c.confidence,
    });
  }
  return out;
}
