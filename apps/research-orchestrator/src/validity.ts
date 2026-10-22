import type { SystemId, ValidationClass } from './types.js';

// ── Validity registry (credibility audit) ────────────────────────────────────
// Maps each fleet system to how credible its OUTPUTS are, as determined by a
// source-level audit (reports/2026-08-31-science-credibility-refutation-audit.md).
//
//   real           — validated against external data / public API
//   self_consistent— internally-correct math, no external validation
//   theater        — hardcoded/synthetic constants presented as results
//   unvalidated    — not audited or not applicable (literature/probe/OSS sidecar)
//
// This class propagates onto every computed claim and into the paper so a
// theater/self-consistent result can never be read as a validated one.

export interface ValidityEntry {
  class: ValidationClass;
  note: string;
  evidence: string;
}

const REGISTRY: Record<string, ValidityEntry> = {
  'overlay-oncology': {
    class: 'self_consistent',
    note: 'Simulator now uses the real cBioPortal CCLE drug-IC50 fit (n=392, Erlotinib 11.84µM) when no client ic50 is supplied, with provenance labeled. Sim params otherwise hand-tuned. No fabricated do-calculus, no tuned-to-win benchmarks, real finite-difference PDE, honest MLE+Laplace inference.',
    evidence: 'lib/simulator/parameters.ts; app/api/simulate/route.ts (ccle_calibration); gemini routes (honest fallbacks)',
  },
  'oncoforesight': {
    class: 'self_consistent',
    note: 'Hand-weighted logit model anchored to published arm-level rates (intercept-shift), not trained on patient-level data.',
    evidence: 'src/lib/engine/remission.ts:8-10; toxicity.ts:133-145',
  },
  'oncograph': {
    class: 'theater',
    note: 'Knockout "simulation" is a Gemini LLM narrative — model opinion, not a computed result.',
    evidence: 'app/api/tumor/simulate-knockout (LLM prompt, no solver)',
  },
  'decon': {
    class: 'real',
    note: 'Now ships the REAL published reference matrices: LM22 (Newman 2015, 547x22) at data/lm22.json and EPIC (Racle 2017, 23,686x7) at data/epic_tref.json. Deconvolution is reference-grade; outputs report reference_authenticity={lm22,epic}. Verified: pure CD8 resolves to 1.0.',
    evidence: 'service/data/lm22.json; service/data/epic_tref.json; service/deconv/{lm22,epic}.py',
  },
  'umoe': {
    class: 'self_consistent',
    note: 'ABC + PDE machinery is real; without a real observations CSV, calibrate() reports calibrated=false, fixture=true. Results tagged honestly.',
    evidence: 'umoe/calibration.py; api.py calibrate() provenance flags',
  },
  'chemlab': {
    class: 'self_consistent',
    note: 'Arrhenius/kinetics ODE with hand-set rate constants.',
    evidence: 'src/core kinetics (no external rate data)',
  },
  'attec': {
    class: 'self_consistent',
    note: 'In-silico screening; enrichmentFactor is a hardcoded constant upstream (excluded from claims).',
    evidence: 'stageb.ts ATTEC note',
  },
  'daraxonrasib': {
    class: 'real',
    note: 'Live NCI GDC API — genuine public-tier data, verified against a working-SSM floor.',
    evidence: 'src/data/sources/gdc.ts; scripts/probe-gdc.ts',
  },
  'biocomposable': {
    class: 'unvalidated',
    note: 'Pipeline/evidence composition hub — no biological inference of its own.',
    evidence: 'agent/v1/evidence aggregate',
  },
  'metamap': {
    class: 'unvalidated',
    note: 'Metastasis/HPC map — endpoints not audited for external validation.',
    evidence: '—',
  },
  'discourse': {
    class: 'unvalidated',
    note: 'LLM debate — argued positions, not measurements.',
    evidence: 'api/debate/*',
  },
  'helixforge': {
    class: 'unvalidated',
    note: 'CLI-only genome intelligence — not exercised over HTTP in this fleet.',
    evidence: 'pnpm workspace',
  },
  'biosim': {
    class: 'unvalidated',
    note: 'Quantum-classical folding — no external benchmark run in this audit.',
    evidence: '—',
  },
  'tum': { class: 'unvalidated', note: 'Biobank/gap-report platform.', evidence: '—' },
  'use': { class: 'unvalidated', note: 'Simulation/agent visualization.', evidence: '—' },
  'sciforge': { class: 'unvalidated', note: 'Event bus library.', evidence: '—' },
  'planetary': { class: 'unvalidated', note: 'Visualization OS.', evidence: '—' },
  'stirling-pdf': { class: 'unvalidated', note: 'OSS PDF toolkit.', evidence: '—' },
  'open-notebook': { class: 'unvalidated', note: 'OSS notebook synthesis.', evidence: '—' },
  'scrapling': { class: 'unvalidated', note: 'OSS stealth scraper.', evidence: '—' },
};

export function validityClass(systemId: string | undefined): ValidationClass {
  if (!systemId) return 'unvalidated';
  return REGISTRY[systemId]?.class ?? 'unvalidated';
}

export function validityEntry(systemId: string | undefined): ValidityEntry {
  if (!systemId) return { class: 'unvalidated', note: 'No source system.', evidence: '—' };
  return REGISTRY[systemId] ?? { class: 'unvalidated', note: 'Not audited.', evidence: '—' };
}

export const VALIDITY_LABELS: Record<ValidationClass, string> = {
  real: 'REAL — validated against external data',
  self_consistent: 'SELF-CONSISTENT — internally correct math, no external validation',
  theater: 'THEATER — hardcoded/synthetic constants presented as results',
  unvalidated: 'UNVALIDATED — not audited or not a computation',
};

export function listValidity(): Array<{ id: string; class: ValidationClass; note: string; evidence: string }> {
  return Object.entries(REGISTRY).map(([id, v]) => ({ id, class: v.class, note: v.note, evidence: v.evidence }));
}
