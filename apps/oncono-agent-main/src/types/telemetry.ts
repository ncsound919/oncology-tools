/**
 * Telemetry types.
 *
 * Every field that a human could mistake for a measurement carries an
 * `evidence` tier. This exists because the previous version of this file typed
 * nothing about provenance, so six different hard-coded literals rendered on the
 * dashboard exactly like real measurements — including a field named
 * `rfc3161Timestamp` that held `new Date().toISOString()`, and a claim-lint block
 * that asserted `allClaimsVerified: true` unconditionally.
 *
 * Tiers:
 *  - 'measured'    computed from observed events in this process
 *  - 'derived'     computed from measured values only (aggregates of the above)
 *  - 'configured'  a stated environment assumption, not observed (e.g. weekly quota)
 *  - 'unmeasured'  previously asserted, not computable here — must render as a gap
 *  - 'synthetic'   a stored/invented value with no measurement behind it at all.
 *                  Distinct from 'configured': a configured value describes the
 *                  environment; a synthetic value only occupies a field. It must
 *                  render as a gap too, never as a result.
 */
export type EvidenceTier = 'measured' | 'derived' | 'configured' | 'unmeasured' | 'synthetic';

/** Wraps a value with how it came to be known. `null` value means "not available". */
export interface Evidenced<T> {
  value: T | null;
  evidence: EvidenceTier;
  /** Present whenever the value is not 'measured'/'derived': say why. */
  reason?: string;
}

/** True when the value may be read as the result of computation. */
export function isComputed(e: Evidenced<unknown>): boolean {
  return e.evidence === 'measured' || e.evidence === 'derived';
}

/**
 * Short label for UI badges. A value is never rendered without one of these,
 * because a stored constant rendered bare is indistinguishable from a result.
 */
export function evidenceLabel(e: Evidenced<unknown>): string {
  switch (e.evidence) {
    case 'measured':
      return 'measured';
    case 'derived':
      return 'derived';
    case 'configured':
      return 'configured, not measured';
    case 'synthetic':
      return 'stored value, not measured';
    case 'unmeasured':
      return 'unmeasured';
  }
}

export interface ComputeQuotaTelemetry {
  platform: 'kaggle-remote';
  /** Stated allocation from the account, not read from the Kaggle API. */
  weeklyAllocatedHours: Evidenced<number>;
  /**
   * Compute actually settled. There is no `reservedHours`: jobs run synchronously
   * in-process and return `completed`, so no window exists in which a reservation
   * could be held. The field was always structurally 0 and has been removed rather
   * than rendered as a permanent zero.
   */
  settledHours: Evidenced<number>;
  remainingHours: Evidenced<number>;
  /** Stated session cap; the live session length is tracked separately. */
  sessionCapHours: Evidenced<number>;
  hardware: Evidenced<string>;
  weeklyResetDay: Evidenced<string>;
  hoursToReset: Evidenced<number>;
  /** Wall-clock minutes since this process started. 0 until a job runs. */
  activeSessionDurationMinutes: Evidenced<number>;
  burstPlatform: Evidenced<{
    name: string;
    hardware: string;
    vramGb: number;
    hourlyRateUsd: number;
    status: 'standby' | 'active' | 'drained';
  }>;
  /** Jobs actually observed this process — never a seeded constant. */
  observedJobCount: number;
}

export interface MultiModalModalityStat {
  name: string;
  category: 'gex' | 'cnv' | 'meth' | 'mut' | 'mirna' | 'rppa';
  featureCount: Evidenced<number>;
  normalizationMethod: Evidenced<string>;
  sparsityPercent: Evidenced<number>;
  biologicalResolution: Evidenced<string>;
}

export interface SurvBoardMultiModalDimensions {
  totalFeatures: Evidenced<number>;
  /**
   * True only when the backing volume is attached AND the matrices were actually
   * read. Previously a hard-coded `true`, which contradicted the volume resolver
   * reporting the volume absent on the same screen.
   */
  completeModalitiesAvailable: Evidenced<boolean>;
  modalities: MultiModalModalityStat[];
  activeCohortPatients: Evidenced<number>;
  clinicalSurvivalEndpoints: Evidenced<string[]>;
}

export interface AgentTelemetryRun {
  runId: string;
  agentRole: string;
  model: string;
  latencyMs: number;
  promptTokens: number;
  thoughtTokens: number;
  completionTokens: number;
  tokensPerSecond: number;
  cascadeFallbackUsed: boolean;
  timestamp: string;
  status: 'SUCCESS' | 'RETRIED' | 'FAILED';
  /**
   * True when token counts are length/4 estimates rather than provider-reported
   * usage. The local fallback path cannot know real usage, and its numbers must
   * not be summed into a "tokens processed" figure without this flag.
   */
  tokenCountsEstimated: boolean;
  /** True when the run executed the local rule engine rather than a model. */
  localFallback: boolean;
}

export interface PipelineObservabilityTelemetry {
  totalDeliberations: Evidenced<number>;
  averageLatencyMs: Evidenced<number>;
  totalTokensProcessed: {
    promptTokens: Evidenced<number>;
    thoughtTokens: Evidenced<number>;
    completionTokens: Evidenced<number>;
  };
  /** Counted from observed runs, not a constant. */
  cascadeTransitions: Evidenced<number>;
  recentRuns: AgentTelemetryRun[];
  /** Runs in the buffer that came from the local fallback rather than a model. */
  localFallbackRuns: number;
}

export interface ClaimLintResult {
  /** 'implemented' means a linter actually ran over actual artifacts. */
  status: 'implemented' | 'not-implemented';
  scannedArtifacts: Evidenced<number>;
  unscannedClaims: Evidenced<number>;
  /** Null unless status === 'implemented'. Never optimistically true. */
  allClaimsVerified: Evidenced<boolean>;
  reason?: string;
}

export interface ProvenanceAuditTelemetry {
  /** Genuine Merkle root over the observed run buffer. */
  merkleRootHash: Evidenced<string>;
  /** True when the Merkle root is over real observed runs (>=1 run seen). */
  merkleRootMeaningful: boolean;
  /**
   * Wall-clock instant the snapshot was produced. Deliberately NOT named
   * `rfc3161Timestamp`: an RFC 3161 Time-Stamp Token requires a TSA response
   * with a signature, and this is `Date.now()`. Adopting a real TSA (OpenTimestamps
   * / sigstore) is the only way this field earns the old name back.
   */
  snapshotGeneratedAt: Evidenced<string>;
  /** No trusted timestamp exists. Always null until a TSA is integrated. */
  trustedTimestampToken: Evidenced<string>;
  claimLintStatus: ClaimLintResult;
  /** Counted from the real manifest registry. */
  registeredManifestCount: Evidenced<number>;
  dataVolumeSerial: Evidenced<string>;
  volumeAttached: Evidenced<boolean>;
}

export interface EcosystemTelemetrySnapshot {
  timestamp: string;
  computeQuota: ComputeQuotaTelemetry;
  multiModalDimensions: SurvBoardMultiModalDimensions;
  pipelineObservability: PipelineObservabilityTelemetry;
  provenanceAudit: ProvenanceAuditTelemetry;
}