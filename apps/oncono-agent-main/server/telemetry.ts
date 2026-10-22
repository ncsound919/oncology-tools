import crypto from 'crypto';
import {
  EcosystemTelemetrySnapshot,
  AgentTelemetryRun,
  ComputeQuotaTelemetry,
  SurvBoardMultiModalDimensions,
  PipelineObservabilityTelemetry,
  ProvenanceAuditTelemetry,
  ClaimLintResult,
  Evidenced,
  EvidenceTier,
} from '../src/types/telemetry';
import { resolveDataVolume, getKaggleIngestedManifests } from './ecosystem';
import { configured, derived, measured, unmeasured } from './provenance';

/**
 * Telemetry snapshot assembly.
 *
 * History (kept because it is the whole point of the rewrite): this file seeded a
 * circular buffer with six invented agent runs (`run-init-1..6`) and then hard-coded
 * a Merkle root input, a "RFC 3161" timestamp, a claim-lint result claiming 35/35
 * artifacts verified, a manifest count, an 88,527-feature multi-modal matrix, a
 * 524-patient cohort, a 47-minute session, and a 2.5h/5.5h Kaggle balance. The
 * dashboard rendered all of it identically to real measurements.
 *
 * Rules now in force:
 *  1. The run buffer starts EMPTY. Averages are computed only from runs this
 *     process actually observed. Zero observations yields `null`, not a seed.
 *  2. Nothing is asserted without being computed. Where a real value cannot be
 *     produced here (weekly Kaggle quota, multi-modal matrices, a claim linter),
 *     the field is `null` with `evidence: 'unmeasured'` and a reason.
 *  3. Environment assumptions that are true by configuration are marked
 *     `'configured'`, never `'measured'`.
 */

/**
 * Provenance helpers now come from `./provenance` — one set for the whole app.
 * (They were defined here as module-local constants; duplicating them into
 * survival-engine.ts is how a second provenance system gets invented.)
 */

/** Observed agent runs. Intentionally starts empty — never seeded. */
const agentRunsBuffer: AgentTelemetryRun[] = [];

const PROCESS_START_MS = Date.now();

/**
 * Kaggle quota ledger.
 *
 * Only `settled` exists. The previous version also had `reservedKaggleHours`,
 * seeded at 2.5h alongside 5.5h settled, but nothing ever reserved: the only
 * writer subtracts, and `submitRecourseJob` runs synchronously and returns
 * `completed`, so there is no interval in which a reservation could be held. The
 * field was therefore structurally always 0 and has been removed rather than
 * shown as a permanent zero.
 */
let settledKaggleHours = 0;
let observedJobCount = 0;

export function recordComputeJobUsage(durationMinutes: number): void {
  const hours = Number((durationMinutes / 60).toFixed(4));
  if (!Number.isFinite(hours) || hours < 0) return;
  observedJobCount += 1;
  settledKaggleHours = Number((settledKaggleHours + hours).toFixed(2));
}

export function recordAgentRunTelemetry(
  run: Omit<AgentTelemetryRun, 'runId' | 'timestamp' | 'tokenCountsEstimated' | 'localFallback'>
): AgentTelemetryRun {
  const fullRun: AgentTelemetryRun = {
    ...run,
    tokenCountsEstimated: false,
    localFallback: false,
    runId: `run-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
    timestamp: new Date().toISOString(),
  };

  agentRunsBuffer.unshift(fullRun);
  if (agentRunsBuffer.length > 30) agentRunsBuffer.pop();
  return fullRun;
}

/**
 * Records a run the local rule engine produced instead of a model. Kept separate
 * from `recordAgentRunTelemetry` because token counts from the fallback are
 * length/4 estimates, not provider usage — summing them into a "tokens processed"
 * figure without a flag would be a fabricated metric.
 */
export function recordLocalFallbackRunTelemetry(
  run: Omit<AgentTelemetryRun, 'runId' | 'timestamp' | 'tokenCountsEstimated' | 'localFallback'>
): AgentTelemetryRun {
  const fullRun: AgentTelemetryRun = {
    ...run,
    tokenCountsEstimated: true,
    localFallback: true,
    runId: `run-local-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
    timestamp: new Date().toISOString(),
  };
  agentRunsBuffer.unshift(fullRun);
  if (agentRunsBuffer.length > 30) agentRunsBuffer.pop();
  return fullRun;
}

function calculateHoursUntilSundayUtc(): number {
  const now = new Date();
  const dayOfWeek = now.getUTCDay();
  const hour = now.getUTCHours();
  const minute = now.getUTCMinutes();

  let daysUntilSunday = (7 - dayOfWeek) % 7;
  if (daysUntilSunday === 0 && (hour > 0 || minute > 0)) daysUntilSunday = 7;

  const hoursRemaining = daysUntilSunday * 24 - hour - minute / 60;
  return Number(Math.max(0, hoursRemaining).toFixed(1));
}

function computeSessionMerkleRoot(): { hash: string; meaningful: boolean } {
  if (agentRunsBuffer.length === 0) {
    return {
      hash: crypto.createHash('sha256').update('EMPTY_MERKLE_TREE').digest('hex'),
      meaningful: false,
    };
  }
  const leafHashes = agentRunsBuffer.map((r) =>
    crypto
      .createHash('sha256')
      .update(`${r.runId}|${r.latencyMs}|${r.completionTokens}|${r.timestamp}`)
      .digest('hex')
  );

  let currentLevel = leafHashes;
  while (currentLevel.length > 1) {
    const nextLevel: string[] = [];
    for (let i = 0; i < currentLevel.length; i += 2) {
      const left = currentLevel[i];
      const right = i + 1 < currentLevel.length ? currentLevel[i + 1] : left;
      nextLevel.push(crypto.createHash('sha256').update(left + right).digest('hex'));
    }
    currentLevel = nextLevel;
  }

  // Meaningful only once at least one real run anchors it. A root over zero
  // observations is a constant, and presenting it as a provenance artefact is
  // the same class of defect as the RFC 3161 field it replaced.
  return { hash: currentLevel[0], meaningful: agentRunsBuffer.length > 0 };
}

/**
 * Claim linter.
 *
 * There is no claim linter in this codebase. The previous value —
 * `{ scannedArtifacts: 35, unscannedClaims: 0, allClaimsVerified: true }` — was
 * three literals asserting a verification that never ran, and the dashboard
 * rendered it as a passing "Clean" gate.
 *
 * Until a linter exists, this reports `not-implemented` and nulls every count.
 * The honest empty state is the deliverable, not a stub that reads as a pass.
 */
function runClaimLint(): ClaimLintResult {
  return {
    status: 'not-implemented',
    scannedArtifacts: unmeasured('no claim linter is implemented in this codebase'),
    unscannedClaims: unmeasured('no claim linter is implemented in this codebase'),
    allClaimsVerified: unmeasured('no claim linter is implemented in this codebase'),
    reason:
      'No claim linter exists. An earlier version of this snapshot asserted scannedArtifacts=35, unscannedClaims=0 and allClaimsVerified=true as hard-coded literals, which the UI rendered as a passing "Clean" gate. Those counts are not computable here and are reported null until a linter is implemented.',
  };
}

export function getEcosystemTelemetrySnapshot(): EcosystemTelemetrySnapshot {
  const volume = resolveDataVolume();
  const manifests = getKaggleIngestedManifests();
  const volumeAttached = volume.isAttached === true;

  const allocated = 30.0;
  const remaining = Number((allocated - settledKaggleHours).toFixed(2));

  const computeQuota: ComputeQuotaTelemetry = {
    platform: 'kaggle-remote',
    weeklyAllocatedHours: configured(
      allocated,
      'account allocation is not read from the Kaggle API; this is a stated environment assumption'
    ),
    settledHours: measured(settledKaggleHours),
    remainingHours: derived(remaining),
    sessionCapHours: configured(12.0, 'session cap is a stated policy value, not an observed measurement'),
    hardware: configured('NVIDIA T4 16GB / P100 16GB', 'hardware preference is configuration, not a probe of running instances'),
    weeklyResetDay: configured('Sunday 00:00 UTC', 'reset day is a platform policy, not measured'),
    hoursToReset: derived(calculateHoursUntilSundayUtc()),
    activeSessionDurationMinutes: derived(
      Number(((Date.now() - PROCESS_START_MS) / 60000).toFixed(1))
    ),
    burstPlatform: unmeasured(
      'no burst-platform probe exists; no Hugging Face Spaces or Colab instance is contacted from this process'
    ),
    observedJobCount,
  };

  // Multi-modal dimensions describe the SurvBoard matrices on the removable
  // volume. Attachment is NOT completeness: the volume resolver checks that a
  // path exists; it does not read or verify the 88,527-column matrices. So the
  // feature total is reported as `configured` (the documented specification, not
  // a measurement) when the volume is present, and `unmeasured` when it is not.
  // Completeness is never asserted from attachment alone.
  const matrixReason = volumeAttached
    ? 'the benchmark volume is attached, but this process does not read or verify the matrices; this figure is the documented SurvBoard specification, not a measurement'
    : `benchmark volume ${volume.serial} is not attached (${volume.reasonIfAbsent ?? 'no reason reported'}); no matrices were read`;

  const multiModalDimensions: SurvBoardMultiModalDimensions = {
    totalFeatures: volumeAttached ? configured(88527, matrixReason) : unmeasured(matrixReason),
    completeModalitiesAvailable: unmeasured(
      volumeAttached
        ? 'volume is attached but matrix completeness is not verified by this process; attachment alone is not completeness'
        : matrixReason
    ),
    modalities: ([
      { name: 'Gene Expression (GEX)', category: 'gex' },
      { name: 'Copy Number Variation (CNV)', category: 'cnv' },
      { name: 'DNA Methylation', category: 'meth' },
      { name: 'Somatic Mutations (MUT)', category: 'mut' },
      { name: 'microRNA (miRNA)', category: 'mirna' },
      { name: 'Reverse Phase Protein Array (RPPA)', category: 'rppa' },
    ] as Array<{ name: string; category: 'gex' | 'cnv' | 'meth' | 'mut' | 'mirna' | 'rppa' }>).map((m) => ({
      ...m,
      featureCount: unmeasured(matrixReason),
      normalizationMethod: unmeasured(matrixReason),
      sparsityPercent: unmeasured(matrixReason),
      biologicalResolution: unmeasured(matrixReason),
    })),
    activeCohortPatients: unmeasured(matrixReason),
    clinicalSurvivalEndpoints: unmeasured(matrixReason),
  };

  const observedRuns = agentRunsBuffer.length;
  const totalPromptTokens = agentRunsBuffer.reduce((a, r) => a + r.promptTokens, 0);
  const totalThoughtTokens = agentRunsBuffer.reduce((a, r) => a + r.thoughtTokens, 0);
  const totalCompletionTokens = agentRunsBuffer.reduce((a, r) => a + r.completionTokens, 0);
  const avgLatency =
    observedRuns > 0 ? Math.round(agentRunsBuffer.reduce((a, r) => a + r.latencyMs, 0) / observedRuns) : 0;
  const cascadeFallbackCount = agentRunsBuffer.filter((r) => r.cascadeFallbackUsed).length;

  const pipelineObservability: PipelineObservabilityTelemetry = {
    totalDeliberations: measured(observedRuns),
    averageLatencyMs: observedRuns > 0 ? derived(avgLatency) : unmeasured('no agent runs observed in this process yet'),
    totalTokensProcessed: {
      promptTokens: observedRuns > 0 ? derived(totalPromptTokens) : unmeasured('no agent runs observed in this process yet'),
      thoughtTokens: observedRuns > 0 ? derived(totalThoughtTokens) : unmeasured('no agent runs observed in this process yet'),
      completionTokens: observedRuns > 0 ? derived(totalCompletionTokens) : unmeasured('no agent runs observed in this process yet'),
    },
    cascadeTransitions: measured(cascadeFallbackCount),
    recentRuns: agentRunsBuffer.slice(0, 10),
    localFallbackRuns: agentRunsBuffer.filter((r) => r.localFallback).length,
  };

  const merkle = computeSessionMerkleRoot();

  const provenanceAudit: ProvenanceAuditTelemetry = {
    merkleRootHash: merkle.meaningful ? measured(merkle.hash) : unmeasured('no agent runs observed, so the Merkle root is a constant over an empty set'),
    merkleRootMeaningful: merkle.meaningful,
    snapshotGeneratedAt: measured(new Date().toISOString()),
    trustedTimestampToken: unmeasured(
      'no RFC 3161 TSA, OpenTimestamps or sigstore integration exists; a trusted timestamp requires a signed TSA response'
    ),
    claimLintStatus: runClaimLint(),
    registeredManifestCount: measured(manifests.length),
    dataVolumeSerial: measured(volume.serial),
    volumeAttached: measured(volumeAttached),
  };

  return {
    timestamp: new Date().toISOString(),
    computeQuota,
    multiModalDimensions,
    pipelineObservability,
    provenanceAudit,
  };
}

/** Test/diagnostic helper: how many real runs are currently anchored. */
export function observedRunCount(): number {
  return agentRunsBuffer.length;
}