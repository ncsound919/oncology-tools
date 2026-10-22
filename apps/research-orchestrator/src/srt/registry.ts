import { createHash } from 'node:crypto';
import { sha256 } from '../ledger.js';

// ── SRT: hypothesis registry ─────────────────────────────────────────────────
// The judgement layer the research-orchestrator was missing (see
// docs/AUTONOMOUS-RESEARCH-ROADMAP.md): a hypothesis lifecycle, a preregistration
// hash fixed BEFORE execution, near-duplicate novelty detection, and a
// first-class null-result ledger.
//
// HONEST RULE: `supported` means "the preregistered criterion was met on a run",
// not "true". A result is a reproducibility measurement, never a clinical claim.
// The orchestrator never invents a data plan or a result; this module only holds
// what a study or a reviewer supplied.

export type HypothesisStatus =
  | 'proposed'
  | 'preregistered'
  | 'testing'
  | 'supported'
  | 'falsified'
  | 'null'
  | 'retracted';

export type EvidenceTier = 0 | 1 | 2 | 3 | 4 | 5;

export interface PreregistrationInput {
  title: string;
  mechanism: string;
  dataPlan: string;
  analysisPlan: string;
  holdout: string;
  primaryOutcome: string;
  successCriterion: string;
  falsifier: string;
}

export interface Preregistration extends PreregistrationInput {
  hash: string;
  enteredAt: string;
}

export type OutcomeVerdict = 'supported' | 'falsified' | 'null' | 'inconclusive';

export interface HypothesisOutcome {
  verdict: OutcomeVerdict;
  metricName?: string;
  metric?: number;
  runId?: string;
  systemId?: string;
  detail?: string;
  at: string;
}

export interface HypothesisRecord {
  id: string;
  title: string;
  mechanism: string;
  status: HypothesisStatus;
  createdAt: string;
  updatedAt: string;
  /** Calibrated probability 0..1 that the preregistered criterion will be met. */
  calibratedConfidence: number;
  /** Highest evidence tier 0..5 (0 = agent agreement, i.e. no independent evidence). */
  evidenceTier: EvidenceTier;
  noveltyScore?: number;
  sourceStudyId?: string;
  sourceClaimIds?: string[];
  preregistration?: Preregistration;
  outcomes: HypothesisOutcome[];
}

export interface RegistryDoc {
  version: 1;
  hypotheses: HypothesisRecord[];
}

export function createRegistry(): RegistryDoc {
  return { version: 1, hypotheses: [] };
}

/** Tolerant read: a malformed or version-mismatched file yields an empty registry. */
export function parseRegistry(text: string): RegistryDoc {
  try {
    const d = JSON.parse(text) as Partial<RegistryDoc>;
    if (!d || !Array.isArray(d.hypotheses)) return createRegistry();
    return { version: 1, hypotheses: d.hypotheses as HypothesisRecord[] };
  } catch {
    return createRegistry();
  }
}

export function serializeRegistry(doc: RegistryDoc): string {
  return JSON.stringify(doc, null, 2);
}

// ── Hashing ──────────────────────────────────────────────────────────────────

/** Stable stringify: object keys sorted, so the same input always hashes alike. */
export function canonicalize(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`;
  const obj = value as Record<string, unknown>;
  return `{${Object.keys(obj).sort().map((k) => `${JSON.stringify(k)}:${canonicalize(obj[k])}`).join(',')}}`;
}

/** Prefer the ledger's sha256 so there is one hashing convention in this app. */
export function preRegHash(input: PreregistrationInput): string {
  return sha256(canonicalize(input));
}

// ── Novelty (lexical near-duplicate detection over title + mechanism) ────────

const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'of', 'to', 'in', 'on', 'for', 'with', 'by',
  'is', 'are', 'was', 'were', 'be', 'as', 'at', 'from', 'that', 'this', 'it',
  'its', 'via', 'into', 'than', 'then', 'but', 'not', 'no', 'can', 'may', 'we',
]);

export function tokenize(s: string): string[] {
  return String(s ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/[\s-]+/)
    .filter((t) => t.length > 2 && !STOPWORDS.has(t));
}

export function jaccard(a: string[], b: string[]): number {
  const A = new Set(a);
  const B = new Set(b);
  if (A.size === 0 && B.size === 0) return 0;
  let inter = 0;
  for (const t of A) if (B.has(t)) inter += 1;
  const union = A.size + B.size - inter;
  return union === 0 ? 0 : inter / union;
}

export interface NearDuplicate {
  id: string;
  title: string;
  similarity: number;
}

export function findNearDuplicates(
  doc: RegistryDoc,
  candidate: { title: string; mechanism?: string },
  threshold = 0.5,
): NearDuplicate[] {
  const cand = tokenize(`${candidate.title} ${candidate.mechanism ?? ''}`);
  return doc.hypotheses
    .map((h) => ({ id: h.id, title: h.title, similarity: jaccard(cand, tokenize(`${h.title} ${h.mechanism}`)) }))
    .filter((x) => x.similarity >= threshold)
    .sort((a, b) => b.similarity - a.similarity);
}

// ── Mutations (pure: each returns a NEW doc) ─────────────────────────────────

export interface NewHypothesisInput {
  title: string;
  mechanism?: string;
  calibratedConfidence?: number;
  evidenceTier?: number;
  noveltyScore?: number;
  sourceStudyId?: string;
  sourceClaimIds?: string[];
  id?: string;
}

function slug(s: string): string {
  return String(s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
}

const identityKey = (h: { title: string; mechanism?: string }): string => `${slug(h.title)}|${slug(h.mechanism ?? '')}`;

export function makeHypothesisId(title: string, mechanism = ''): string {
  const h = createHash('sha256').update(identityKey({ title, mechanism }), 'utf8').digest('hex').slice(0, 6);
  return `hyp_${slug(title) || 'untitled'}_${h}`;
}

export function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0.5;
  return Math.max(0, Math.min(1, x));
}

export function getHypothesis(doc: RegistryDoc, id: string): HypothesisRecord | undefined {
  return doc.hypotheses.find((h) => h.id === id);
}

export function upsertHypothesis(
  doc: RegistryDoc,
  input: NewHypothesisInput,
  now: string = new Date().toISOString(),
): { doc: RegistryDoc; hypothesis: HypothesisRecord; created: boolean } {
  const title = String(input.title ?? '').trim();
  if (!title) throw new Error('hypothesis title is required');
  const mechanism = String(input.mechanism ?? '').trim();
  const key = identityKey({ title, mechanism });
  const existing = doc.hypotheses.find((h) => identityKey(h) === key);
  if (existing) {
    const merged: HypothesisRecord = {
      ...existing,
      title,
      mechanism,
      calibratedConfidence: input.calibratedConfidence ?? existing.calibratedConfidence,
      evidenceTier: input.evidenceTier !== undefined ? clampTier(input.evidenceTier) : existing.evidenceTier,
      noveltyScore: input.noveltyScore ?? existing.noveltyScore,
      sourceStudyId: input.sourceStudyId ?? existing.sourceStudyId,
      sourceClaimIds: input.sourceClaimIds ?? existing.sourceClaimIds,
      updatedAt: now,
    };
    return { doc: { ...doc, hypotheses: doc.hypotheses.map((h) => (h.id === existing.id ? merged : h)) }, hypothesis: merged, created: false };
  }
  const rec: HypothesisRecord = {
    id: input.id ?? makeHypothesisId(title, mechanism),
    title,
    mechanism,
    status: 'proposed',
    createdAt: now,
    updatedAt: now,
    calibratedConfidence: clamp01(input.calibratedConfidence ?? 0.5),
    evidenceTier: input.evidenceTier !== undefined ? clampTier(input.evidenceTier) : 5,
    noveltyScore: input.noveltyScore,
    sourceStudyId: input.sourceStudyId,
    sourceClaimIds: input.sourceClaimIds,
    outcomes: [],
  };
  if (doc.hypotheses.some((h) => h.id === rec.id)) throw new Error(`duplicate hypothesis id: ${rec.id}`);
  return { doc: { ...doc, hypotheses: [...doc.hypotheses, rec] }, hypothesis: rec, created: true };
}

function clampTier(t: number): EvidenceTier {
  const v = Math.max(0, Math.min(5, Math.round(t)));
  return v as EvidenceTier;
}

export function preregister(
  doc: RegistryDoc,
  id: string,
  spec: Omit<PreregistrationInput, 'title' | 'mechanism'>,
  now: string = new Date().toISOString(),
): { doc: RegistryDoc; hypothesis: HypothesisRecord; hash: string } {
  const h = getHypothesis(doc, id);
  if (!h) throw new Error(`unknown hypothesis: ${id}`);
  if (h.status !== 'proposed') throw new Error(`cannot preregister a ${h.status} hypothesis`);
  const input: PreregistrationInput = { title: h.title, mechanism: h.mechanism, ...spec };
  for (const [k, v] of Object.entries(input)) {
    if (typeof v !== 'string' || v.trim().length === 0) throw new Error(`preregistration field '${k}' must be a non-empty string`);
  }
  const hash = preRegHash(input);
  const updated: HypothesisRecord = { ...h, status: 'preregistered', preregistration: { ...input, hash, enteredAt: now }, updatedAt: now };
  return { doc: { ...doc, hypotheses: doc.hypotheses.map((x) => (x.id === id ? updated : x)) }, hypothesis: updated, hash };
}

const OUTCOME_TO_STATUS: Record<OutcomeVerdict, HypothesisStatus> = {
  supported: 'supported',
  falsified: 'falsified',
  null: 'null',
  inconclusive: 'testing',
};

export function recordOutcome(
  doc: RegistryDoc,
  id: string,
  outcome: Omit<HypothesisOutcome, 'at'>,
  now: string = new Date().toISOString(),
): { doc: RegistryDoc; hypothesis: HypothesisRecord } {
  const h = getHypothesis(doc, id);
  if (!h) throw new Error(`unknown hypothesis: ${id}`);
  if (!h.preregistration && h.status === 'proposed') {
    throw new Error('refusing to record an outcome before preregistration');
  }
  if (h.status === 'retracted') throw new Error('cannot record an outcome on a retracted hypothesis');
  const full: HypothesisOutcome = { ...outcome, at: now };
  const updated: HypothesisRecord = {
    ...h,
    status: OUTCOME_TO_STATUS[outcome.verdict],
    outcomes: [...h.outcomes, full],
    updatedAt: now,
  };
  return { doc: { ...doc, hypotheses: doc.hypotheses.map((x) => (x.id === id ? updated : x)) }, hypothesis: updated };
}

export function retract(doc: RegistryDoc, id: string, reason: string, now: string = new Date().toISOString()): { doc: RegistryDoc; hypothesis: HypothesisRecord } {
  const h = getHypothesis(doc, id);
  if (!h) throw new Error(`unknown hypothesis: ${id}`);
  const updated: HypothesisRecord = { ...h, status: 'retracted', updatedAt: now, outcomes: [...h.outcomes, { verdict: 'inconclusive', detail: `retracted: ${reason}`, at: now }] };
  return { doc: { ...doc, hypotheses: doc.hypotheses.map((x) => (x.id === id ? updated : x)) }, hypothesis: updated };
}

/** Falsified and null runs are first-class records, never silently discarded. */
export function nullLedger(doc: RegistryDoc): HypothesisRecord[] {
  return doc.hypotheses.filter((h) => h.status === 'falsified' || h.status === 'null');
}
