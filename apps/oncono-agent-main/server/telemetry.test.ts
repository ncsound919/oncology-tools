/**
 * Telemetry honesty regression tests.
 *
 * These lock down the removal of fabricated telemetry. Each test names the exact
 * literal it would have caught in the previous implementation, so a future
 * "helpful" re-seed of the buffer or re-hardcoding of a count fails here.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  getEcosystemTelemetrySnapshot,
  recordAgentRunTelemetry,
  recordComputeJobUsage,
  recordLocalFallbackRunTelemetry,
  observedRunCount,
} from './telemetry';

test('the run buffer starts empty — no seeded synthetic runs', () => {
  // Previously seeded with run-init-1..6, contaminating every average.
  assert.equal(observedRunCount(), 0, 'buffer must not be pre-populated');
  const snap = getEcosystemTelemetrySnapshot();
  assert.equal(snap.pipelineObservability.totalDeliberations.value, 0);
  assert.equal(snap.pipelineObservability.recentRuns.length, 0);
});

test('averages are unmeasured, not zero, when no runs exist', () => {
  const snap = getEcosystemTelemetrySnapshot();
  assert.equal(snap.pipelineObservability.averageLatencyMs.value, null);
  assert.equal(snap.pipelineObservability.averageLatencyMs.evidence, 'unmeasured');
  assert.ok(snap.pipelineObservability.averageLatencyMs.reason);
});

test('there is no RFC 3161 timestamp — the field is gone and the token is null', () => {
  const snap = getEcosystemTelemetrySnapshot();
  assert.equal('rfc3161Timestamp' in snap.provenanceAudit, false, 'the misleading field must not exist');
  assert.equal(snap.provenanceAudit.trustedTimestampToken.value, null);
  assert.equal(snap.provenanceAudit.trustedTimestampToken.evidence, 'unmeasured');
  assert.match(snap.provenanceAudit.trustedTimestampToken.reason ?? '', /TSA|timestamp/i);
  // A wall-clock string is still reported, but under an honest name.
  assert.equal(typeof snap.provenanceAudit.snapshotGeneratedAt.value, 'string');
});

test('claim-lint reports not-implemented and never claims verification', () => {
  const snap = getEcosystemTelemetrySnapshot();
  const lint = snap.provenanceAudit.claimLintStatus;
  assert.equal(lint.status, 'not-implemented');
  // Previously: { scannedArtifacts: 35, unscannedClaims: 0, allClaimsVerified: true }
  assert.equal(lint.allClaimsVerified.value, null, 'must not assert unverified claims are verified');
  assert.equal(lint.scannedArtifacts.value, null);
  assert.equal(lint.unscannedClaims.value, null);
  assert.ok(lint.reason);
});

test('Merkle root is not presented as meaningful over an empty buffer', () => {
  const snap = getEcosystemTelemetrySnapshot();
  assert.equal(snap.provenanceAudit.merkleRootMeaningful, false);
  assert.equal(snap.provenanceAudit.merkleRootHash.value, null);
  assert.equal(snap.provenanceAudit.merkleRootHash.evidence, 'unmeasured');
});

test('Kaggle quota starts at zero, not a fabricated 5.5h settled', () => {
  const snap = getEcosystemTelemetrySnapshot();
  assert.equal(snap.computeQuota.settledHours.value, 0);
  assert.equal(snap.computeQuota.observedJobCount, 0);
  // There is no reservedHours: jobs are synchronous, so a reservation could never
  // be held. Asserting its absence stops it being reintroduced as a permanent 0.
  assert.equal('reservedHours' in snap.computeQuota, false);
  // The allocation itself is an assumption, and is labelled as such.
  assert.equal(snap.computeQuota.weeklyAllocatedHours.evidence, 'configured');
});

test('multi-modal dimensions never claim to be measured', () => {
  const snap = getEcosystemTelemetrySnapshot();
  // The invariant is provenance, not attachment. Matrix counts are the documented
  // SurvBoard spec (`configured`) or absent (`unmeasured`) — never `measured`,
  // because this process does not read or verify the matrices. Previously
  // `completeModalitiesAvailable` was hard-coded `true` and the panel showed a
  // "Complete Multi-Modal Matrix" badge beside a detached volume.
  const md = snap.multiModalDimensions;
  assert.notEqual(md.totalFeatures.evidence, 'measured');
  assert.notEqual(md.completeModalitiesAvailable.evidence, 'measured');
  assert.notEqual(md.activeCohortPatients.evidence, 'measured');
  assert.ok(md.modalities.every((m) => m.featureCount.evidence !== 'measured'));
  // And completeness is never asserted true from attachment alone.
  assert.notEqual(md.completeModalitiesAvailable.value, true);
});

test('registeredManifestCount is measured, and session duration is derived', () => {
  const snap = getEcosystemTelemetrySnapshot();
  assert.equal(snap.provenanceAudit.registeredManifestCount.evidence, 'measured');
  assert.equal(typeof snap.provenanceAudit.registeredManifestCount.value, 'number');
  assert.equal(snap.computeQuota.activeSessionDurationMinutes.evidence, 'derived');
});

test('recording a run moves the counters (proves the metric bites)', () => {
  const before = observedRunCount();
  recordAgentRunTelemetry({
    agentRole: 'test-agent',
    model: 'test-model',
    latencyMs: 1000,
    promptTokens: 100,
    thoughtTokens: 10,
    completionTokens: 50,
    tokensPerSecond: 50,
    cascadeFallbackUsed: false,
    status: 'SUCCESS',
  });
  const after = observedRunCount();
  assert.equal(after, before + 1, 'a recorded run must be counted');

  const snap = getEcosystemTelemetrySnapshot();
  assert.equal(snap.pipelineObservability.totalDeliberations.value, after);
  assert.equal(snap.pipelineObservability.averageLatencyMs.value, 1000);
  assert.equal(snap.provenanceAudit.merkleRootMeaningful, true, 'a real run makes the root meaningful');
});

test('local-fallback runs are flagged and separated from measured model runs', () => {
  recordLocalFallbackRunTelemetry({
    agentRole: 'fallback-agent',
    model: 'local-precision-engine (OSS NCCN/AMP)',
    latencyMs: 5,
    promptTokens: 1,
    thoughtTokens: 0,
    completionTokens: 1,
    tokensPerSecond: 200,
    cascadeFallbackUsed: false,
    status: 'SUCCESS',
  });
  const snap = getEcosystemTelemetrySnapshot();
  assert.ok(snap.pipelineObservability.localFallbackRuns >= 1);
  const flagged = snap.pipelineObservability.recentRuns.filter((r) => r.localFallback);
  assert.ok(flagged.length >= 1);
  assert.ok(flagged.every((r) => r.tokenCountsEstimated === true), 'estimated token counts must be flagged');
});

test('a compute job moves the quota ledger and is counted', () => {
  const before = getEcosystemTelemetrySnapshot().computeQuota.observedJobCount;
  recordComputeJobUsage(60);
  const snap = getEcosystemTelemetrySnapshot();
  assert.equal(snap.computeQuota.observedJobCount, before + 1);
  assert.ok((snap.computeQuota.settledHours.value ?? 0) >= 1);
});

test('no field silently defaults a null into a plausible number', () => {
  const snap = getEcosystemTelemetrySnapshot();
  // Every unmeasured field must still carry a reason, so a caller can surface it.
  const unmeasuredFields = [
    snap.provenanceAudit.trustedTimestampToken,
    snap.provenanceAudit.claimLintStatus.scannedArtifacts,
    snap.computeQuota.burstPlatform,
  ];
  for (const f of unmeasuredFields) {
    if (f.evidence === 'unmeasured') {
      assert.ok(f.reason && f.reason.length > 0, 'an unmeasured field must explain why');
    }
  }
});
