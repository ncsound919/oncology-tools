import React, { useState, useEffect } from 'react';
import { EcosystemTelemetrySnapshot, Evidenced, EvidenceTier } from '../types/telemetry';
import { fetchEcosystemTelemetry } from '../services/apiClient';
import {
  Activity,
  Cpu,
  Clock,
  Layers,
  RefreshCw,
  Zap,
  Fingerprint,
  FileCheck2,
  ShieldAlert,
} from 'lucide-react';

/**
 * Deep telemetry dashboard.
 *
 * This component used to be the delivery mechanism for a set of fabricated
 * numbers. Concretely, it rendered:
 *   - `scannedArtifacts / scannedArtifacts` — a tautology that always read 35/35
 *   - a hard-coded "Clean" badge next to it, independent of the payload
 *   - a hard-coded `0` for unscourced claims and the literal text "(RFC-3161 anchor)"
 *   - a hard-coded "Complete Multi-Modal Matrix" badge while `resolveDataVolume()`
 *     reported the benchmark volume detached on the same screen
 *   - a hard-coded "Quota healthy (no starve risk)" verdict
 *
 * So fixing the server alone would have left the UI still lying. Every value here
 * now goes through `<E />`, which renders `null` as an explicit "not measured"
 * state carrying the reason, and labels assumed-vs-measured values distinctly.
 */

const TIER_STYLE: Record<EvidenceTier, { label: string; className: string }> = {
  measured: { label: 'measured', className: 'text-slate-400' },
  derived: { label: 'derived', className: 'text-slate-400' },
  configured: { label: 'assumed', className: 'text-amber-600' },
  synthetic: { label: 'stored value, not measured', className: 'text-rose-600' },
  unmeasured: { label: 'no data', className: 'text-rose-600' },
};

function formatValue(value: unknown): string {
  if (typeof value === 'number') return value.toLocaleString();
  if (typeof value === 'boolean') return value ? 'yes' : 'no';
  if (Array.isArray(value)) return value.join(', ');
  return String(value);
}

/** Renders an `Evidenced<T>` honestly: real value, or an explicit gap with its reason. */
function E<T>({
  e,
  format,
  className = 'text-slate-900',
  fallback,
}: {
  e: Evidenced<T> | undefined;
  format?: (v: T) => string;
  className?: string;
  fallback?: string;
}): React.ReactElement {
  if (!e) {
    return (
      <span className="text-rose-600 font-semibold" title="Field absent from snapshot">
        {fallback ?? 'not reported'}
      </span>
    );
  }
  if (e.value === null) {
    return (
      <span
        className="text-rose-600 font-semibold"
        title={e.reason ?? 'This value cannot be computed in the current process.'}
      >
        {fallback ?? 'not measured'}
      </span>
    );
  }
  return (
    <span className={className} title={e.reason ?? undefined}>
      {format ? format(e.value) : formatValue(e.value)}
    </span>
  );
}

/** Small badge stating how a number came to be known. */
function TierBadge({ e }: { e: Evidenced<unknown> | undefined }): React.ReactElement | null {
  if (!e) return null;
  const style = TIER_STYLE[e.evidence];
  if (e.evidence === 'measured' || e.evidence === 'derived') return null;
  return (
    <span
      className={`px-1 py-0.5 rounded border text-[9px] font-bold uppercase ${style.className} ${
        e.evidence === 'unmeasured'
          ? 'border-rose-300 bg-rose-50'
          : 'border-amber-300 bg-amber-50'
      }`}
      title={e.reason}
    >
      {style.label}
    </span>
  );
}

export const DeepTelemetryDashboard: React.FC = () => {
  const [telemetry, setTelemetry] = useState<EcosystemTelemetrySnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeModality, setActiveModality] = useState<string>('gex');

  const loadTelemetry = async () => {
    setIsLoading(true);
    try {
      const { snapshot } = await fetchEcosystemTelemetry();
      setTelemetry(snapshot);
    } catch (err) {
      console.error('Failed to load telemetry:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTelemetry();
    const interval = setInterval(loadTelemetry, 15000);
    return () => clearInterval(interval);
  }, []);

  if (!telemetry) {
    return (
      <div className="p-8 text-center text-xs text-slate-500 font-mono flex items-center justify-center gap-2">
        <RefreshCw className="w-4 h-4 animate-spin text-teal-600" />
        <span>Polling deep ecosystem telemetry...</span>
      </div>
    );
  }

  const { computeQuota, multiModalDimensions, pipelineObservability, provenanceAudit } = telemetry;
  const currentModality =
    multiModalDimensions.modalities.find((m) => m.category === activeModality) ||
    multiModalDimensions.modalities[0];

  const usedHours = computeQuota.settledHours.value ?? 0;
  const allocatedHours = computeQuota.weeklyAllocatedHours.value;
  const totalTokensSum =
    (pipelineObservability.totalTokensProcessed.promptTokens.value ?? 0) +
    (pipelineObservability.totalTokensProcessed.thoughtTokens.value ?? 0) +
    (pipelineObservability.totalTokensProcessed.completionTokens.value ?? 0);

  const claimLint = provenanceAudit.claimLintStatus;
  const volumesMeasured = multiModalDimensions.completeModalitiesAvailable.value === true;

  return (
    <div className="space-y-4 font-sans text-xs">
      {/* Honest-empty banner */}
      {pipelineObservability.totalDeliberations.value === 0 && (
        <div className="p-3 rounded-lg border border-amber-300 bg-amber-50 text-amber-900 text-[11px] flex items-start gap-2">
          <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-px" />
          <span>
            No agent runs have been observed in this process yet, so throughput figures below are
            empty rather than seeded. A previous version of this dashboard pre-populated six
            synthetic runs, which contaminated every average and token total shown here until
            enough real runs pushed them out of the buffer.
          </span>
        </div>
      )}

      {/* 1. KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono">
        {/* Kaggle Quota */}
        <div className="p-3 rounded-lg border border-slate-200 bg-white shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-[10px] mb-1">
            <span className="flex items-center gap-1 font-semibold uppercase">
              <Cpu className="w-3.5 h-3.5 text-indigo-600" />
              Kaggle GPU Quota
            </span>
            <TierBadge e={computeQuota.weeklyAllocatedHours} />
          </div>
          <div className="text-lg font-bold text-slate-900 leading-tight">
            {usedHours.toFixed(1)} / <E e={computeQuota.weeklyAllocatedHours} format={(v) => `${v}h`} />
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className="bg-indigo-600 h-1.5 rounded-full"
              style={{ width: `${allocatedHours ? (usedHours / allocatedHours) * 100 : 0}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-slate-400 mt-1.5">
            <span>
              Settled: <E e={computeQuota.settledHours} format={(v) => `${v}h`} />
            </span>
            <span>
              Remaining: <E e={computeQuota.remainingHours} format={(v) => `${v}h`} />
            </span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            Jobs observed: <strong className="text-slate-700">{computeQuota.observedJobCount}</strong>
          </div>
        </div>

        {/* Reset timer */}
        <div className="p-3 rounded-lg border border-slate-200 bg-white shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-[10px] mb-1">
            <span className="flex items-center gap-1 font-semibold uppercase">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              Weekly Reset
            </span>
            <TierBadge e={computeQuota.weeklyResetDay} />
          </div>
          <div className="text-lg font-bold text-slate-900 leading-tight">
            <E e={computeQuota.hoursToReset} format={(v) => `${v}h`} />
          </div>
          <p className="text-[10px] text-slate-500 mt-1 truncate">
            Session cap: <E e={computeQuota.sessionCapHours} format={(v) => `${v.toFixed(1)}h`} /> / session
          </p>
          <p className="text-[10px] text-slate-500 mt-1 truncate">
            Uptime this process:{' '}
            <E e={computeQuota.activeSessionDurationMinutes} format={(v) => `${v.toFixed(1)} min`} />
          </p>
        </div>

        {/* Agent latency */}
        <div className="p-3 rounded-lg border border-slate-200 bg-white shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-[10px] mb-1">
            <span className="flex items-center gap-1 font-semibold uppercase">
              <Zap className="w-3.5 h-3.5 text-teal-600" />
              Agent Throughput
            </span>
            <span className="text-teal-700 font-bold">
              {pipelineObservability.totalDeliberations.value ?? 0} runs
            </span>
          </div>
          <div className="text-lg font-bold text-slate-900 leading-tight">
            <E
              e={pipelineObservability.averageLatencyMs}
              format={(v) => `${(v / 1000).toFixed(2)}s`}
              fallback="—"
            />
          </div>
          <p className="text-[10px] text-slate-500 mt-1">
            Processed: <strong>{totalTokensSum.toLocaleString()}</strong> tokens (estimated)
          </p>
          <div className="text-[10px] text-slate-400 mt-1">
            Cascade fallbacks:{' '}
            <strong className="text-slate-700">
              {pipelineObservability.cascadeTransitions.value ?? 0}
            </strong>{' '}
            &middot; local fallback:{' '}
            <strong className="text-slate-700">{pipelineObservability.localFallbackRuns}</strong>
          </div>
        </div>

        {/* Claim lint — real status, no tautology */}
        <div
          className={`p-3 rounded-lg border shadow-2xs ${
            claimLint.status === 'implemented' ? 'border-slate-200 bg-white' : 'border-rose-300 bg-rose-50'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 text-[10px] mb-1">
            <span className="flex items-center gap-1 font-semibold uppercase">
              <FileCheck2 className="w-3.5 h-3.5 text-rose-600" />
              Claim-Lint Gate
            </span>
            <span className={claimLint.status === 'implemented' ? 'text-emerald-700 font-bold' : 'text-rose-700 font-bold'}>
              {claimLint.status === 'implemented' ? 'ran' : 'not implemented'}
            </span>
          </div>
          <div className="text-lg font-bold text-slate-900 leading-tight">
            <E e={claimLint.scannedArtifacts} format={(v) => `${v} artifacts`} fallback="no data" />
          </div>
          <p className="text-[10px] text-rose-700 mt-1 leading-snug">{claimLint.reason}</p>
        </div>
      </div>

      {/* 2. Multi-modal dimensions */}
      <div className="p-4 rounded-lg border border-slate-200 bg-white shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <Layers className="w-4 h-4 text-teal-600" />
            <h3 className="text-xs font-bold font-mono tracking-wider text-slate-900 uppercase">
              Multi-Modal Matrix Inspector
            </h3>
          </div>
          <span
            className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
              volumesMeasured
                ? 'bg-teal-100 text-teal-800 border border-teal-200'
                : 'bg-rose-100 text-rose-800 border border-rose-300'
            }`}
          >
            {volumesMeasured ? 'volume attached' : 'volume not attached — nothing measured'}
          </span>
        </div>

        <div className="text-[11px] text-slate-600">
          Total feature space:{' '}
          <E e={multiModalDimensions.totalFeatures} fallback="not measured" />
          <TierBadge e={multiModalDimensions.totalFeatures} />
        </div>

        <div className="flex flex-wrap gap-1.5 font-mono text-[11px]">
          {multiModalDimensions.modalities.map((mod) => (
            <button
              type="button"
              key={mod.category}
              onClick={() => setActiveModality(mod.category)}
              className={`px-3 py-1.5 rounded transition cursor-pointer border ${
                activeModality === mod.category
                  ? 'bg-teal-700 text-white font-bold border-teal-800 shadow-xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              <span>{mod.name.split(' ')[0]}</span>
              <span className="opacity-75 ml-1">
                ({mod.featureCount.value !== null ? mod.featureCount.value.toLocaleString() : '—'})
              </span>
            </button>
          ))}
        </div>

        {currentModality && (
          <div className="p-3.5 rounded bg-slate-50 border border-slate-200 grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-[10px] font-mono uppercase text-slate-400 block mb-0.5">
                Modality Dimension
              </span>
              <strong className="text-sm font-bold text-slate-900">
                <E e={currentModality.featureCount} fallback="not measured" /> columns
              </strong>
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase text-slate-400 block mb-0.5">
                Normalization Method
              </span>
              <div className="font-mono font-semibold text-[11px]">
                <E e={currentModality.normalizationMethod} fallback="not measured" />
              </div>
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase text-slate-400 block mb-0.5">
                Matrix Sparsity
              </span>
              <div className="font-bold font-mono text-sm">
                <E e={currentModality.sparsityPercent} format={(v) => `${v}%`} fallback="not measured" />
              </div>
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase text-slate-400 block mb-0.5">
                Biological Resolution
              </span>
              <p className="text-slate-700 text-[11px] leading-tight">
                <E e={currentModality.biologicalResolution} fallback="not measured" />
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 3. Observability stream */}
      <div className="p-4 rounded-lg border border-slate-200 bg-white shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <Activity className="w-4 h-4 text-indigo-600" />
            <h3 className="text-xs font-bold font-mono tracking-wider text-slate-900 uppercase">
              Observed Agent Runs
            </h3>
          </div>
          <div className="flex items-center space-x-3 text-[11px] font-mono text-slate-500">
            <span>
              Prompt:{' '}
              <strong className="text-slate-800">
                <E e={pipelineObservability.totalTokensProcessed.promptTokens} fallback="—" />
              </strong>
            </span>
            <span>
              Thought:{' '}
              <strong className="text-indigo-600">
                <E e={pipelineObservability.totalTokensProcessed.thoughtTokens} fallback="—" />
              </strong>
            </span>
            <span>
              Completion:{' '}
              <strong className="text-teal-600">
                <E e={pipelineObservability.totalTokensProcessed.completionTokens} fallback="—" />
              </strong>
            </span>
          </div>
        </div>

        <p className="text-[10px] text-slate-500 font-mono">
          Token counts are length/4 estimates, not provider-reported usage.
        </p>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-xs font-mono">
            <thead className="bg-slate-50 text-[10px] text-slate-500 uppercase">
              <tr>
                <th scope="col" className="px-3 py-2 text-left">Sub-Agent Stage</th>
                <th scope="col" className="px-3 py-2 text-left">Model Invoked</th>
                <th scope="col" className="px-3 py-2 text-right">Latency</th>
                <th scope="col" className="px-3 py-2 text-right">Prompt</th>
                <th scope="col" className="px-3 py-2 text-right">Thought</th>
                <th scope="col" className="px-3 py-2 text-right">Completion</th>
                <th scope="col" className="px-3 py-2 text-right">Throughput</th>
                <th scope="col" className="px-3 py-2 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {pipelineObservability.recentRuns.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-6 text-center text-slate-400">
                    No runs observed in this process yet.
                  </td>
                </tr>
              ) : (
                pipelineObservability.recentRuns.map((run) => (
                  <tr key={run.runId} className="hover:bg-slate-50/70">
                    <td className="px-3 py-2 font-bold text-slate-900">
                      {run.agentRole}
                      {run.localFallback && (
                        <span className="ml-1 px-1 rounded bg-amber-100 text-amber-800 text-[9px] font-bold uppercase">
                          local
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <span className="px-1.5 py-0.2 rounded bg-slate-100 border border-slate-200 text-slate-700 text-[10px]">
                        {run.model}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">{(run.latencyMs / 1000).toFixed(2)}s</td>
                    <td className="px-3 py-2 text-right text-slate-500">{run.promptTokens}</td>
                    <td className="px-3 py-2 text-right text-indigo-600 font-semibold">{run.thoughtTokens}</td>
                    <td className="px-3 py-2 text-right text-teal-700 font-semibold">{run.completionTokens}</td>
                    <td className="px-3 py-2 text-right text-slate-600">{run.tokensPerSecond} t/s</td>
                    <td className="px-3 py-2 text-center">
                      <span
                        className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                          run.status === 'SUCCESS'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {run.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Session provenance ledger */}
      <div className="p-4 rounded-lg border border-slate-200 bg-slate-900 text-white font-mono text-xs space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
          <div className="flex items-center space-x-2 text-teal-400">
            <Fingerprint className="w-4 h-4" />
            <span className="font-bold uppercase tracking-wider">Session Provenance Ledger</span>
          </div>
          <span className="text-[10px] text-slate-400">
            Target Volume: <code>{provenanceAudit.dataVolumeSerial.value ?? 'unknown'}</code> (
            {provenanceAudit.volumeAttached.value === true ? 'ATTACHED' : 'DETACHED_SKIPPED'})
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 text-[11px]">
          <div className="space-y-1">
            <div className="text-slate-400">
              Session Merkle Root:{' '}
              {provenanceAudit.merkleRootHash.value ? (
                <code className="text-teal-300 break-all">{provenanceAudit.merkleRootHash.value}</code>
              ) : (
                <span className="text-rose-400">
                  not meaningful — {provenanceAudit.merkleRootHash.reason}
                </span>
              )}
            </div>
            <div className="text-slate-400">
              Snapshot generated at:{' '}
              <span className="text-slate-200">{provenanceAudit.snapshotGeneratedAt.value ?? '—'}</span>
            </div>
            <div className="text-slate-400">
              Trusted timestamp (RFC 3161):{' '}
              <span className="text-rose-400">{provenanceAudit.trustedTimestampToken.reason}</span>
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-slate-400">
              Registered Kaggle manifests:{' '}
              <span className="text-slate-200">
                <E e={provenanceAudit.registeredManifestCount} fallback="—" />
              </span>
            </div>
            <div className="text-slate-400">
              Primary GPU Tier: <E e={computeQuota.hardware} fallback="not reported" /> (
              <E e={computeQuota.weeklyAllocatedHours} format={(v) => `${v} h/wk`} />)
            </div>
            <div className="text-slate-400">
              Burst GPU Fallback:{' '}
              <span className="text-rose-400">{computeQuota.burstPlatform.reason}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};