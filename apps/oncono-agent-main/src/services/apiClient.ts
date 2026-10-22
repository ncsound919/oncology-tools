import {
  PatientCase,
  TumorBoardReport,
  ClinVarApiVariant,
  ClinicalTrialItem,
  PubMedArticle,
  OncoKBRecord,
  LandmarkTrialPublication,
} from '../types/oncology';
import {
  OrchestrationResult,
  GuardrailCheck,
  GovernanceSignOff,
} from '../types/governance';
import {
  DataVolumeStatus,
  RecourseComputePlatform,
  ExternalSourceStatus,
  KaggleDatasetManifest,
  SurvboardCohortSample,
  RecourseJobSubmission,
} from '../types/ecosystem';
import { EcosystemTelemetrySnapshot } from '../types/telemetry';

export async function fetchHealth(): Promise<{ status: string; geminiKeyConfigured: boolean }> {
  const res = await fetch('/api/health');
  if (!res.ok) throw new Error('Health check failed');
  return res.json();
}

export async function fetchClinVar(
  gene: string,
  variant: string
): Promise<{ results: ClinVarApiVariant[]; total: number }> {
  const params = new URLSearchParams({ gene, variant });
  const res = await fetch(`/api/external/clinvar?${params.toString()}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch ClinVar records');
  }
  return res.json();
}

export async function fetchClinicalTrials(
  condition: string,
  intervention?: string,
  status = 'RECRUITING,ACTIVE_NOT_RECRUITING',
  pageSize = 12
): Promise<{ totalCount: number; studies: ClinicalTrialItem[] }> {
  const params = new URLSearchParams({
    condition,
    ...(intervention ? { intervention } : {}),
    status,
    pageSize: String(pageSize),
  });
  const res = await fetch(`/api/external/trials?${params.toString()}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to query ClinicalTrials.gov');
  }
  return res.json();
}

export async function fetchPubMed(
  term: string
): Promise<{ articles: PubMedArticle[]; total: number }> {
  const params = new URLSearchParams({ term });
  const res = await fetch(`/api/external/pubmed?${params.toString()}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to query PubMed');
  }
  return res.json();
}

export async function fetchEnsembl(gene: string): Promise<{
  gene: string;
  id: string;
  biotype: string;
  chromosome: string;
  start: number;
  end: number;
  strand: string;
  canonicalTranscript?: string;
  description?: string;
}> {
  const params = new URLSearchParams({ gene });
  const res = await fetch(`/api/external/ensembl?${params.toString()}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to query Ensembl');
  }
  return res.json();
}

export async function fetchOncoKBGene(gene: string): Promise<OncoKBRecord> {
  const params = new URLSearchParams({ gene });
  const res = await fetch(`/api/external/oncokb?${params.toString()}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to query OncoKB curated gene repository');
  }
  return res.json();
}

export async function fetchLandmarkTrials(term?: string): Promise<{
  total: number;
  trials: LandmarkTrialPublication[];
}> {
  const params = new URLSearchParams(term ? { term } : {});
  const res = await fetch(`/api/external/landmark-trials?${params.toString()}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to query Landmark Trial publications');
  }
  return res.json();
}

export interface CivicEvidenceItem {
  id: number;
  evidenceLevel: string;
  evidenceType: string;
  evidenceDirection: string;
  significance: string;
  disease?: { name: string };
  therapies?: Array<{ name: string }>;
  molecularProfile?: { name: string };
  description?: string;
}

/**
 * CIViC somatic-variant clinical evidence (via the agent's /external/civic proxy).
 * `query` is a molecular-profile name, e.g. "BRAF V600E". Fail-soft upstream:
 * a reachable-but-empty or unavailable response returns `available` accordingly.
 */
export async function fetchCivicEvidence(
  query: string,
  opts: { disease?: string; therapy?: string; level?: 'A' | 'B' | 'C' | 'D' | 'E'; limit?: number } = {},
): Promise<{ available: boolean; total: number; evidence: CivicEvidenceItem[]; attribution?: string }> {
  const params = new URLSearchParams({
    query,
    ...(opts.disease ? { disease: opts.disease } : {}),
    ...(opts.therapy ? { therapy: opts.therapy } : {}),
    ...(opts.level ? { level: opts.level } : {}),
    ...(opts.limit ? { limit: String(opts.limit) } : {}),
  });
  const res = await fetch(`/api/external/civic?${params.toString()}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to query CIViC clinical evidence');
  }
  return res.json();
}

/**
 * Server-side genomic-profile trial match. The server builds the registry query
 * from the patient's OncoTree identity + driver genes, then scores every returned
 * trial against the eligibility criteria text. This is the unlock the client-side
 * condition/intervention search could not provide.
 */
export interface MatchedTrial {
  nctId: string;
  briefTitle: string;
  overallStatus: string;
  phase: string;
  conditions: string[];
  interventions: string[];
  briefSummary: string;
  eligibilitySnippet?: string;
  url: string;
  score: number;
  matchedBiomarkers: string[];
  matchRationale: string[];
  excludedSignals: string[];
}

export interface TrialMatchResult {
  available: boolean;
  reason?: string;
  source: string;
  query: {
    conditionQuery: string;
    conditionQueries: string[];
    geneTerms: string[];
    alterationTerms: string[];
    biomarkerTerms: string[];
    priorTherapyTerms: string[];
  };
  totalRegistryHits: number;
  considered: number;
  trials: MatchedTrial[];
  attribution: string;
}

export async function matchTrialsForCase(
  patientCase: PatientCase,
  opts: { pageSize?: number; requireGeneMatch?: boolean } = {}
): Promise<{ result: TrialMatchResult; resolvedCancerType?: unknown }> {
  const res = await fetch('/api/onco-agent/trials/match', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ patientCase, ...opts }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to run biomarker trial matching');
  }
  return res.json();
}

/** OncoTree resolution + search for a malignancy term. */
export async function fetchOncoTree(term: string): Promise<{
  available: boolean;
  query: string;
  totalHits: number;
  hits: Array<{ code: string; name: string; mainType: string; tissue: string; parent: string; level: number }>;
  resolution: {
    resolved: boolean;
    code: string | null;
    name: string | null;
    mainType: string | null;
    specificity: string;
    broad: boolean;
    confidence: number;
    source: string;
  };
  attribution: string;
}> {
  const params = new URLSearchParams({ q: term });
  const res = await fetch(`/api/external/oncotree?${params.toString()}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to query OncoTree');
  }
  return res.json();
}

/** Live CIViC evidence for one gene + protein change. */
export async function fetchCivicVariantEvidence(
  gene: string,
  alteration: string
): Promise<{
  available: boolean;
  reason?: string;
  molecularProfile: string;
  bestLevel: string | null;
  evidenceCount: number;
  predictiveCount: number;
  therapies: string[];
  diseases: string[];
  attribution: string;
}> {
  const params = new URLSearchParams({ gene, alteration });
  const res = await fetch(`/api/external/civic/evidence?${params.toString()}`);
  const body = await res.json().catch(() => ({}));
  if (!res.ok && !body.available) {
    return { available: false, reason: body.reason || body.error, molecularProfile: '', bestLevel: null, evidenceCount: 0, predictiveCount: 0, therapies: [], diseases: [], attribution: '' };
  }
  return body;
}

export async function generateTumorBoardAnalysis(
  patientCase: PatientCase
): Promise<{ report: TumorBoardReport }> {
  const res = await fetch('/api/onco-agent/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ patientCase }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to generate Tumor Board synthesis');
  }
  return res.json();
}

export async function askTumorBoardAgent(
  patientCase: PatientCase,
  query: string,
  history: Array<{ role: 'user' | 'model'; content: string }>
): Promise<{ answer: string }> {
  const res = await fetch('/api/onco-agent/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ patientCase, query, history }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to generate tumor board response');
  }
  return res.json();
}

export async function runOrchestration(
  patientCase: PatientCase
): Promise<{ result: OrchestrationResult }> {
  const res = await fetch('/api/onco-agent/orchestrate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ patientCase }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to run orchestration pipeline');
  }
  return res.json();
}

export async function fetchPreFlightGuardrails(
  patientCase: PatientCase
): Promise<{ checksum: string; checks: GuardrailCheck[] }> {
  const res = await fetch('/api/onco-agent/governance/pre-flight', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ patientCase }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to evaluate pre-flight guardrails');
  }
  return res.json();
}

export async function submitGovernanceSignOff(
  signOffData: Partial<GovernanceSignOff> & { patientCase: PatientCase }
): Promise<{ success: boolean; record: GovernanceSignOff }> {
  const res = await fetch('/api/onco-agent/governance/sign-off', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(signOffData),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to register clinical sign-off');
  }
  return res.json();
}

export async function fetchAuditTrail(
  caseId?: string
): Promise<{ auditTrail: GovernanceSignOff[] }> {
  const url = caseId
    ? `/api/onco-agent/governance/audit-trail?caseId=${encodeURIComponent(caseId)}`
    : '/api/onco-agent/governance/audit-trail';
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch governance audit trail');
  }
  return res.json();
}

// Ecosystem Bridge Endpoints
export async function fetchEcosystemStatus(): Promise<{
  timestamp: string;
  dataVolume: DataVolumeStatus;
  computePlatforms: RecourseComputePlatform[];
  wetLabSources: ExternalSourceStatus[];
}> {
  const res = await fetch('/api/ecosystem/status');
  if (!res.ok) throw new Error('Failed to fetch ecosystem status');
  return res.json();
}

export async function fetchKaggleManifests(): Promise<{ manifests: KaggleDatasetManifest[] }> {
  const res = await fetch('/api/ecosystem/kaggle-manifests');
  if (!res.ok) throw new Error('Failed to fetch Kaggle manifests');
  return res.json();
}

export async function fetchSurvboardCohorts(): Promise<{ cohorts: SurvboardCohortSample[] }> {
  const res = await fetch('/api/ecosystem/survboard/cohorts');
  if (!res.ok) throw new Error('Failed to fetch SurvBoard cohorts');
  return res.json();
}

export async function submitRecourseExperiment(
  experimentId: string,
  hardware: 'cpu' | 'gpu' | 'tpu' = 'cpu'
): Promise<{ submission: RecourseJobSubmission }> {
  const res = await fetch('/api/ecosystem/recourse/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ experimentId, hardware }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to submit Recourse experiment');
  }
  return res.json();
}

export async function fetchEcosystemTelemetry(): Promise<{
  snapshot: EcosystemTelemetrySnapshot;
}> {
  const res = await fetch('/api/ecosystem/telemetry');
  if (!res.ok) throw new Error('Failed to fetch ecosystem telemetry');
  return res.json();
}

export async function fetchHarmonizedPriors(): Promise<{
  priors: Record<string, any>;
}> {
  const res = await fetch('/api/ecosystem/harmonized-priors');
  if (!res.ok) throw new Error('Failed to fetch harmonized priors');
  return res.json();
}

export async function scorePatientAnomaly(
  patientCase: PatientCase
): Promise<{
  result: any;
}> {
  const res = await fetch('/api/ecosystem/detection/score', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ patientCase }),
  });
  if (!res.ok) throw new Error('Failed to score patient anomaly');
  return res.json();
}

// ─────────────────────────────────────────────────────────────────────────────
// DuckDB Cohort API Client
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchCohortStatus(): Promise<{
  ready: boolean;
  dataRoot: string | null;
  registeredDatasets: Array<{
    viewName: string;
    filePath: string;
    sizeBytes: number;
    rowCount?: number;
  }>;
  error?: string;
}> {
  const res = await fetch('/api/cohort/status');
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch CohortDB status');
  }
  return res.json();
}

export async function fetchCohortSchema(viewName?: string): Promise<{
  viewName?: string;
  columns?: Array<{ name: string; type: string }>;
  datasets?: Array<{ viewName: string; filePath: string; sizeBytes: number }>;
}> {
  const url = viewName ? `/api/cohort/schema?view=${encodeURIComponent(viewName)}` : '/api/cohort/schema';
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch cohort schema');
  }
  return res.json();
}

export async function fetchCohortSummary(viewName: string): Promise<{
  viewName: string;
  rowCount: number;
  sample: Record<string, unknown>[];
  columns: Array<{ name: string; type: string }>;
}> {
  const res = await fetch(`/api/cohort/summary?view=${encodeURIComponent(viewName)}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch cohort summary');
  }
  return res.json();
}

export async function runCohortQuery(sql: string): Promise<{
  columns: Array<{ name: string; type: string }>;
  rows: Record<string, unknown>[];
  rowCount: number;
  durationMs: number;
  sql: string;
  datasetsReferenced: string[];
}> {
  const res = await fetch('/api/cohort/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sql }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'DuckDB cohort query failed');
  }
  return res.json();
}
