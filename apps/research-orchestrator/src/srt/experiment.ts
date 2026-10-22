import { createHash } from 'node:crypto';
import type { SystemId } from '../types.js';
import { STAGE_B_ROSTER } from '../stageb.js';
import { STAGE_C_ROSTER } from '../stagec.js';
import { sha256 } from '../ledger.js';
import { canonicalize, type HypothesisRecord, type Preregistration } from './registry.js';

// ── SRT: experiment generator ─────────────────────────────────────────────────
// Turns a preregistered hypothesis into a run card naming the system that will
// test it. Two execution targets:
//   * fleet  — a Stage B/C system the orchestrator dispatches to directly. The
//              card lists the inputs the study MUST supply; the orchestrator
//              never invents them (mirrors stageb.ts/stagec.ts gates).
//   * kaggle-remote — a registered Oncology Kaggle job, executed via Recourse.
// When nothing matches, the card is `unrouted` and must be satisfied by a new
// adapter or a wet-lab protocol — it is never faked.

export type RunTarget =
  | { kind: 'fleet'; systemId: SystemId; stage: 'simulation' | 'synthesis'; requiredInputs: string[] }
  | { kind: 'kaggle-remote'; experimentId: string; hardware: 'cpu' | 'gpu' | 'tpu' };

export interface RoutingRule {
  test: RegExp;
  target: RunTarget;
  because: string;
}

function fleet(systemId: SystemId, stage: 'simulation' | 'synthesis'): RunTarget {
  const roster = stage === 'simulation' ? STAGE_B_ROSTER : STAGE_C_ROSTER;
  const spec = roster.find((s) => s.id === systemId);
  return { kind: 'fleet', systemId, stage, requiredInputs: spec ? [...spec.requiredInputs] : [] };
}

export const EXPERIMENT_ROUTES: RoutingRule[] = [
  {
    test: /contaminat|leakage|pretrain|membership|validity decay/i,
    target: { kind: 'kaggle-remote', experimentId: 'contamination-audit', hardware: 'cpu' },
    because: 'a leakage/validity-decay claim is tested by nearest-neighbour corpus overlap on the oncology Kaggle lane',
  },
  {
    test: /foundation model|\bfm\b|slide|tile|pathology|\bvit\b|\buni\b|conch|gigapath|embedding/i,
    target: { kind: 'kaggle-remote', experimentId: 'fm-embed', hardware: 'gpu' },
    because: 'the claim turns on an embedding representation the oncology Kaggle lane extracts',
  },
  {
    test: /\bsite\b|scanner|batch|shortcut|confound|subgroup|\bbias\b|canary/i,
    target: { kind: 'kaggle-remote', experimentId: 'bias-canary', hardware: 'gpu' },
    because: 'a site/scanner signal recoverable from features is what the canary measures',
  },
  {
    test: /conformal|coverage|abstention|calibrat|set-valued|selective/i,
    target: { kind: 'kaggle-remote', experimentId: 'conformal-response', hardware: 'cpu' },
    because: 'abstention/coverage is a conformal-set property',
  },
  {
    test: /serena-?6|dco3|kaplan|digitiz|pseudo-?ipd/i,
    target: { kind: 'kaggle-remote', experimentId: 'serena6-multirun', hardware: 'cpu' },
    because: 'a SERENA-6 reconstruction claim is a digitization-uncertainty ensemble',
  },
  {
    test: /gse278126|gse322943|gse324453|processed matrix|signature (gene )?presence|phase [ab]\b/i,
    target: { kind: 'kaggle-remote', experimentId: 'protocol-loaders', hardware: 'cpu' },
    because: 'a Phase A/B data-presence claim is a processed-matrix summary',
  },
  {
    test: /concept bottleneck|interpretab|pseudoprogression|true progression|\btrace\b|rano 2\.0/i,
    target: { kind: 'kaggle-remote', experimentId: 'concept-bottleneck', hardware: 'cpu' },
    because: 'a PsP-vs-TP interpretability claim is a concept-bottleneck diagnostic',
  },
  {
    test: /brain metastas|rano-bm|intracranial response|leptomening|bcbm|cns metastas/i,
    target: { kind: 'kaggle-remote', experimentId: 'rano-bm', hardware: 'cpu' },
    because: 'a brain-metastasis response claim is assessed by RANO-BM-aligned per-lesion scoring',
  },
  {
    test: /volumetric|3d measurement|\b1d\b vs|sum of diamet|per-?lesion/i,
    target: { kind: 'kaggle-remote', experimentId: 'volumetric-response', hardware: 'cpu' },
    because: 'a 1D-vs-volumetric response claim is a direct criterion comparison',
  },
  {
    test: /\bcsf\b|cerebrospinal|ctdna|liquid biops|circulating tumor dna/i,
    target: { kind: 'kaggle-remote', experimentId: 'csf-ctdna', hardware: 'cpu' },
    because: 'a compartment-specific liquid-biopsy claim is CSF-vs-plasma detection analysis',
  },
  {
    test: /rano|lesion|inter-?reader|measurement error|flip-?rate|volumetric/i,
    target: { kind: 'kaggle-remote', experimentId: 'rano-perturbation', hardware: 'cpu' },
    because: 'criteria-version sensitivity is driven by inter-reader measurement error',
  },
  {
    test: /survival|hazard|\bcox\b|prognos|c-?index|time-to-event|resist(ance|ant) escape/i,
    target: fleet('overlay-oncology', 'simulation'),
    because: 'a resistance/prognosis claim is a multiscale TME simulation the fleet can run with a supplied IC50',
  },
  {
    test: /\bpatient|arm-switch|\barm\b|remission|response rate|trial assignment|counterfactual/i,
    target: fleet('oncoforesight', 'simulation'),
    because: 'a patient-level treatment-response claim is a counterfactual arm-switch run',
  },
  {
    test: /mechanis|\bode\b|oxygen|calibrat|therapy pipeline/i,
    target: fleet('umoe', 'simulation'),
    because: 'a mechanistic claim is an UMOE engine-registry run',
  },
  {
    test: /kinetic|reaction|temperature|arrhenius|catalyst|chem/i,
    target: fleet('chemlab', 'simulation'),
    because: 'a reaction-kinetics claim is a chemlab ODE run',
  },
  {
    test: /screening|degrader|\baatac\b|atten|target protein|hit rate/i,
    target: fleet('attec', 'simulation'),
    because: 'a candidate-molecule claim is an in-silico screen',
  },
  {
    test: /deconvol|cell-?type|tumou?r microenvironment composition|annotat/i,
    target: fleet('decon', 'synthesis'),
    because: 'a TME-composition claim is a deconvolution+annotation run',
  },
  {
    test: /debate|controvers|competing hypothesis|argue/i,
    target: fleet('discourse', 'synthesis'),
    because: 'a contested-hypothesis claim is resolved by a structured debate',
  },
];

export interface RoutedTarget {
  target: RunTarget;
  because: string;
}

/** First matching route; null when nothing in the roster fits (fail-closed). */
export function routeHypothesis(
  hypothesis: Pick<HypothesisRecord, 'title' | 'mechanism'>,
): RoutedTarget | null {
  const text = `${hypothesis.title} ${hypothesis.mechanism}`;
  for (const rule of EXPERIMENT_ROUTES) {
    if (rule.test.test(text)) return { target: rule.target, because: rule.because };
  }
  return null;
}

// ── Seeds — seed(day) = sha256(weekId|day) ───────────────────────────────────

export function weekId(date: Date = new Date()): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(((d.getTime() - firstThursday.getTime()) / 86_400_000 - 3) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

export function daySeed(week: string, day: string): string {
  return sha256(`${week}|${day}`);
}

// ── Run card ─────────────────────────────────────────────────────────────────

export interface RunCard {
  id: string;
  hypothesisId: string;
  hypothesisTitle: string;
  /** null = unrouted: no fleet system or registered job fits. */
  target: RunTarget | null;
  seeds: { scheme: string; week: string; day: string; seed: string };
  analysisPlan: string;
  primaryOutcome: string;
  successCriterion: string;
  falsifier: string;
  /** For fleet targets: input keys the study MUST supply (never invented). */
  requiredInputs: string[];
  notes: string;
  createdAt: string;
}

export interface BuildRunCardOptions {
  day?: string;
  week?: string;
  now?: string;
}

export function buildRunCard(
  hypothesis: HypothesisRecord,
  prereg: Preregistration,
  opts: BuildRunCardOptions = {},
): RunCard {
  const now = opts.now ?? new Date().toISOString();
  const when = new Date(now);
  const week = opts.week ?? weekId(when);
  const day = opts.day ?? when.toISOString().slice(0, 10);
  const seed = daySeed(week, day);
  const routed = routeHypothesis(hypothesis);
  const target = routed?.target ?? null;
  const requiredInputs = target && target.kind === 'fleet' ? target.requiredInputs : [];
  const id = `run_${hypothesis.id}_${createHash('sha256').update(`${hypothesis.id}|${week}|${day}`, 'utf8').digest('hex').slice(0, 6)}`;
  const notes = !routed || !target
    ? `Unrouted: no fleet system or registered Kaggle job matches; requires a new adapter or a wet-lab protocol before execution.`
    : target.kind === 'fleet'
      ? `Routed to fleet system '${target.systemId}' (Stage ${target.stage === 'simulation' ? 'B' : 'C'}). Supply: ${target.requiredInputs.join(', ') || 'no required inputs'}.`
      : `Routed to registered Kaggle job '${target.experimentId}' (${target.hardware}) via Recourse.`;
  return {
    id,
    hypothesisId: hypothesis.id,
    hypothesisTitle: hypothesis.title,
    target,
    seeds: { scheme: 'sha256(weekId|day)', week, day, seed },
    analysisPlan: prereg.analysisPlan,
    primaryOutcome: prereg.primaryOutcome,
    successCriterion: prereg.successCriterion,
    falsifier: prereg.falsifier,
    requiredInputs,
    notes,
    createdAt: now,
  };
}

export function runCardFingerprint(card: RunCard): string {
  return createHash('sha256')
    .update(canonicalize({ id: card.id, hypothesisId: card.hypothesisId, target: card.target, seeds: card.seeds, successCriterion: card.successCriterion, falsifier: card.falsifier }))
    .digest('hex');
}
