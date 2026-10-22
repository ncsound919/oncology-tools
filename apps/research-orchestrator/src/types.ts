export type SystemId =
  | 'overlay-oncology'
  | 'oncograph'
  | 'oncoforesight'
  | 'decon'
  | 'daraxonrasib'
  | 'biocomposable'
  | 'tum'
  | 'use'
  | 'metamap'
  | 'discourse'
  | 'umoe'
  | 'attec'
  | 'biosim'
  | 'helixforge'
  | 'chemlab'
  | 'sciforge'
  | 'planetary'
  | 'stirling-pdf'
  | 'open-notebook'
  | 'scrapling';

export interface FleetSystem {
  id: SystemId;
  name: string;
  root: string; // absolute or repo-relative path
  baseUrl: string | null; // null = CLI-only, no HTTP
  healthPath: string | null;
  domains: string[]; // routing tags
  runHint: string;
  kind: 'primary' | 'new-tool';
}

export interface IngestionControls {
  sources: string[]; // ['europepmc','curemind','gdc','pubtator','cbioportal']
  pageSize: number; // 1-100
  dateFrom?: string | null; // YYYY-MM-DD
  dateTo?: string | null;
  confidenceThreshold: number; // 0-1
  dedup: boolean;
  maxPapers: number;
  includePreprints: boolean;
  evidenceFilter?: string | null; // e.g. 'clinical-trial' | 'preclinical' | null
}

export interface Study {
  id: string;
  title: string;
  query: string; // literature search query feeding ingestion
  domain: string;
  priority: 'low' | 'normal' | 'high';
  systems?: SystemId[];
  directive: ResearchDirective;
  ingestion: IngestionControls;
  // Stage B simulation inputs, keyed by SystemId. REQUIRED for Stage B systems
  // whose upstream APIs demand structured inputs (see stageb.ts REQUIRED_INPUTS).
  // Never invented by the orchestrator — missing inputs fail that system's Stage B.
  stageBInputs?: Record<string, Record<string, unknown>>;
  // Stage C synthesis inputs, keyed by SystemId (see stagec.ts REQUIRED_INPUTS).
  stageCInputs?: Record<string, Record<string, unknown>>;
  createdAt: string;
  schedule?: string | null;
  status: 'queued' | 'running' | 'done' | 'failed';
}

// ── Stages ───────────────────────────────────────────────────────────────────
// A complete study runs as a staged pipeline: A literature → B simulation →
// C synthesis. Every dispatch is tagged with the stage that produced it.

export type StudyStage = 'literature' | 'simulation' | 'synthesis' | 'probe';

// Provenance class of a claim's evidence — computed outputs come from real
// math on real inputs; narrated outputs are LLM-generated narratives and must
// never be presented as simulation results.
export type EvidenceClass = 'computed' | 'narrated' | 'literature' | 'mixed';

export const DEFAULT_INGESTION: IngestionControls = {
  sources: ['europepmc','curemind'],
  pageSize: 10,
  dateFrom: null,
  dateTo: null,
  confidenceThreshold: 0,
  dedup: true,
  maxPapers: 50,
  includePreprints: true,
  evidenceFilter: null,
};

// ── Commander layer ──────────────────────────────────────────────────────────
// The orchestrator is a research commander, not a per-system knob panel. It takes a
// ResearchDirective (direction of the work), fans it to the fleet, harvests each
// system's output as a Contribution, and synthesizes ONE research spec.

export type ResearchDirection =
  | 'exploratory'        // map the landscape, find what's new
  | 'confirmatory'       // test a standing hypothesis against evidence
  | 'therapeutic-design' // converge on a therapeutic strategy
  | 'mechanism-mapping'  // resolve a biological mechanism
  | 'evidence-review';   // systematic review of what exists

export interface ResearchDirective {
  objective: string;          // what the research must establish
  hypothesis?: string | null; // standing hypothesis, if any
  questions: string[];        // sub-questions each system should address
  direction: ResearchDirection;
  contextNotes?: string | null; // commander's context/constraints
}

export interface Contribution {
  systemId: SystemId;
  kind: 'literature' | 'insight' | 'data' | 'capability' | 'offline';
  title: string;
  detail: string;
  papers?: Array<{ id: string; title: string; source: string; published: string; url: string }>;
}

export interface ResearchSpec {
  directive: ResearchDirective;
  contributions: Contribution[];
  systemsOffline: SystemId[];
  spec: string;              // the ONE synthesized master document (markdown)
  synthesizedBy: 'phoenix' | 'deterministic';
  synthesizedAt: string;
}

// ── Claims (Phase 2) ─────────────────────────────────────────────────────────
// Conclusions are first-class objects. Every claim carries evidence refs that a
// DETERMINISTIC verifier resolves — unresolvable refs quarantine the claim.

export interface EvidenceRef {
  type: 'paper' | 'system-output' | 'prior-claim';
  id: string; // paper:<pmid> | system-output:<systemId> | claim:<claimId>
}

export interface Claim {
  claimId: string;           // c_<runId>_<n>
  runId: string;
  text: string;
  kind: 'background' | 'finding' | 'hypothesis' | 'method-note' | 'gap';
  evidenceRefs: EvidenceRef[];
  evidenceDepth: 'metadata' | 'abstract' | 'fulltext' | 'derived';
  evidenceClass: EvidenceClass; // computed | narrated | literature | mixed
  stage?: StudyStage;          // which pipeline stage produced the evidence
  systemId?: SystemId;         // per-system extraction provenance
  confidence: number;        // model self-assessed 0-1, always shown beside refs
  verified: boolean;         // deterministic verifier result
  unresolvableRefs: EvidenceRef[];
  // Credibility class of the SOURCE system (from validity.ts audit) — the
  // orthogonal "how much should I trust this computed result" axis.
  validationStatus?: ValidationClass;
  createdAt: string;
}

export type ValidationClass = 'real' | 'self_consistent' | 'theater' | 'unvalidated';

// ── Ledger (Phase 1) ─────────────────────────────────────────────────────────
// Every run becomes a fully-defined, tamper-evident object. Manifests are
// append-only JSONL; corrections supersede, never rewrite.

export interface PayloadRef {
  systemId: SystemId | string;
  sha256: string;
  file: string; // path relative to data/ledger/
}

export interface ArtifactRef {
  kind: 'spec' | 'dispatch' | 'report' | 'paper';
  sha256: string;
  file: string;
}

export interface ModelUse {
  purpose: 'synthesis' | 'extraction';
  provider: string;
  model: string;
}

export interface RunManifest {
  runId: string;
  createdAt: string;
  title: string;
  directive: ResearchDirective;
  ingestion: IngestionControls;
  domain: string;
  fleet: Array<{ systemId: string; baseUrl: string | null; kind: string; ok: boolean; latencyMs: number }>;
  models: ModelUse[];
  envHash: string;            // fingerprint of non-secret LLM config (never the key)
  contributions: Contribution[];
  rawPayloadRefs: PayloadRef[];
  artifactRefs: ArtifactRef[];
  claimIds: string[];         // filled by Phase 2
  stages?: StageRunSummary[]; // stage-tagged dispatch summary (schema v2)
  parentRunIds?: string[];
  supersedes?: string;        // correction chain
  schema: 'run-manifest.v1' | 'run-manifest.v2';
}

export interface DispatchResult {
  systemId: SystemId;
  ok: boolean;
  latencyMs: number;
  httpStatus?: number;
  body?: unknown;
  error?: string;
  stage?: StudyStage;
  evidenceClass?: EvidenceClass;
  validationError?: string; // Stage B input gate failure — no network call was made
}

export interface StageRunSummary {
  stage: StudyStage;
  systemId: string;
  ok: boolean;
  evidenceClass?: EvidenceClass;
  validationError?: string;
}

export interface StudyReport {
  studyId: string;
  title: string;
  domain: string;
  query: string;
  directive: ResearchDirective;
  startedAt: string;
  finishedAt: string;
  systemsDispatched: SystemId[];
  results: DispatchResult[];
  researchSpec: ResearchSpec;
  summary: string; // dispatch log (markdown) — subordinate to the spec
}
