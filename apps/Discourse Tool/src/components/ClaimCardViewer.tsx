import React, { useState } from 'react';
import { ClaimCard, EvidenceTier } from '../types';
import {
  FileCheck,
  AlertOctagon,
  HelpCircle,
  FlaskConical,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  ExternalLink,
  Target,
  BarChart2,
  Layers,
  ArrowRight,
} from 'lucide-react';

interface ClaimCardViewerProps {
  key?: React.Key;
  claimCard: ClaimCard;
  compact?: boolean;
}

export const getEvidenceTierBadge = (tier: EvidenceTier) => {
  switch (tier) {
    case 1:
      return {
        label: 'TIER 1: REPLICATION',
        desc: 'Independent replication with prespecified analysis (different labs/cohorts)',
        color: 'text-emerald-300 bg-emerald-500/15 border-emerald-500/30',
        dot: 'bg-emerald-400',
      };
    case 2:
      return {
        label: 'TIER 2: PROSPECTIVE TRIAL',
        desc: 'Prospective experimental or randomized clinical trials',
        color: 'text-cyan-300 bg-cyan-500/15 border-cyan-500/30',
        dot: 'bg-cyan-400',
      };
    case 3:
      return {
        label: 'TIER 3: MULTI-OMICS COHORT',
        desc: 'Well-controlled observational or clinical multi-omics cohorts',
        color: 'text-blue-300 bg-blue-500/15 border-blue-500/30',
        dot: 'bg-blue-400',
      };
    case 4:
      return {
        label: 'TIER 4: PRECLINICAL MODEL',
        desc: 'Animal models, patient-derived organoids, PDX, and cell lines',
        color: 'text-amber-300 bg-amber-500/15 border-amber-500/30',
        dot: 'bg-amber-400',
      };
    case 5:
      return {
        label: 'TIER 5: COMPUTATIONAL / PLAUSIBILITY',
        desc: 'Computational prediction, dynamical simulation, biological plausibility',
        color: 'text-purple-300 bg-purple-500/15 border-purple-500/30',
        dot: 'bg-purple-400',
      };
    case 0:
    default:
      return {
        label: 'TIER 0: AGENT CONSENSUS (ZERO EVIDENCE)',
        desc: 'Agent agreement only — counts as zero independent empirical evidence',
        color: 'text-rose-300 bg-rose-500/15 border-rose-500/30',
        dot: 'bg-rose-400',
      };
  }
};

export default function ClaimCardViewer({ claimCard, compact = false }: ClaimCardViewerProps) {
  const [expanded, setExpanded] = useState(!compact);
  const [activeSubTab, setActiveSubTab] = useState<'evidence' | 'counter' | 'falsifier' | 'alternatives'>('evidence');

  const tierInfo = getEvidenceTierBadge(claimCard.evidenceTier);

  const getStatusBadge = (status: ClaimCard['status']) => {
    switch (status) {
      case 'supported':
        return <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">SUPPORTED</span>;
      case 'contested':
        return <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">CONTESTED</span>;
      case 'falsified':
        return <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30">FALSIFIED</span>;
      case 'candidate':
      default:
        return <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-blue-500/15 text-blue-300 border border-blue-500/30">CANDIDATE</span>;
    }
  };

  return (
    <div className="border border-slate-800 bg-slate-900/90 rounded-lg overflow-hidden text-xs">
      {/* Header */}
      <div className="p-3 bg-slate-950/80 border-b border-slate-800 flex items-start justify-between gap-2">
        <div className="space-y-1 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold border flex items-center gap-1.5 ${tierInfo.color}`} title={tierInfo.desc}>
              <span className={`w-1.5 h-1.5 rounded-full ${tierInfo.dot}`} />
              {tierInfo.label}
            </span>
            <span className="px-2 py-0.5 rounded text-[9px] font-mono text-slate-400 bg-slate-800 border border-slate-700">
              {claimCard.claimType}
            </span>
            {getStatusBadge(claimCard.status)}
            <span className="text-[10px] font-mono text-slate-500">ID: {claimCard.id}</span>
          </div>

          <h4 className="font-sans font-semibold text-slate-100 text-xs md:text-sm leading-snug">
            "{claimCard.claim}"
          </h4>
        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          className="text-slate-400 hover:text-slate-200 p-1 rounded hover:bg-slate-800 transition shrink-0"
        >
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {/* Confidence Bar */}
      <div className="px-3 py-1.5 bg-slate-900/60 border-b border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-slate-400">
        <div className="flex items-center gap-2 flex-1 max-w-xs">
          <span>CALIBRATED PROBABILITY:</span>
          <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-400 rounded-full"
              style={{ width: `${Math.min(100, Math.round(claimCard.confidence * 100))}%` }}
            />
          </div>
          <span className="text-blue-300 font-bold">{(claimCard.confidence * 100).toFixed(0)}%</span>
        </div>

        {claimCard.confidenceRationale && (
          <span className="truncate max-w-sm text-slate-500 italic hidden md:inline" title={claimCard.confidenceRationale}>
            // {claimCard.confidenceRationale}
          </span>
        )}
      </div>

      {/* Epistemic Rigor Flags */}
      {(claimCard.causalLanguageWarning || claimCard.abstentionFlag || claimCard.entityDisambiguation?.length || claimCard.numericalFidelity) && (
        <div className="px-3 py-2 bg-slate-900 border-b border-slate-800/80 space-y-1.5">
          {claimCard.abstentionFlag && (
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded">
              <ShieldAlert size={12} />
              <span>ABSTENTION: Insufficient evidence to formulate a robust empirical claim.</span>
            </div>
          )}
          {claimCard.causalLanguageWarning && (
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-rose-300 bg-rose-500/10 border border-rose-500/20 px-2 py-1 rounded">
              <AlertOctagon size={12} />
              <span>CAUSAL LANGUAGE WARNING: {claimCard.causalLanguageWarning}</span>
            </div>
          )}
          {claimCard.entityDisambiguation && claimCard.entityDisambiguation.length > 0 && (
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-300">
              <span className="text-slate-500">DISAMBIGUATION:</span>
              <div className="flex gap-1 flex-wrap">
                {claimCard.entityDisambiguation.map((entity, i) => (
                  <span key={i} className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700">{entity}</span>
                ))}
              </div>
            </div>
          )}
          {claimCard.numericalFidelity && (
            <div className="flex items-center gap-2 flex-wrap text-[10px] font-mono text-cyan-300">
              <span className="text-slate-500">NUMERICAL FIDELITY:</span>
              {claimCard.numericalFidelity.sampleSize && <span>N={claimCard.numericalFidelity.sampleSize}</span>}
              {claimCard.numericalFidelity.effectDirection && <span>Effect: {claimCard.numericalFidelity.effectDirection}</span>}
              {claimCard.numericalFidelity.pValue && <span>p-value: {claimCard.numericalFidelity.pValue}</span>}
              {claimCard.numericalFidelity.confidenceInterval && <span>95% CI: {claimCard.numericalFidelity.confidenceInterval}</span>}
              {claimCard.numericalFidelity.doseOrTimepoint && <span>Dose/Time: {claimCard.numericalFidelity.doseOrTimepoint}</span>}
            </div>
          )}
          {claimCard.sourceCitations && claimCard.sourceCitations.length > 0 && (
            <div className="flex items-start gap-1.5 text-[10px] font-mono text-slate-400">
              <span className="text-slate-500 shrink-0">CITATIONS:</span>
              <span className="truncate" title={claimCard.sourceCitations.join(', ')}>
                {claimCard.sourceCitations.join(', ')}
              </span>
            </div>
          )}
        </div>
      )}

      {expanded && (
        <div className="p-3 space-y-3">
          {/* Subtabs */}
          <div className="flex items-center gap-1 border-b border-slate-800 pb-1 text-[10px] font-mono">
            <button
              onClick={() => setActiveSubTab('evidence')}
              className={`px-2.5 py-1 rounded transition flex items-center gap-1 ${
                activeSubTab === 'evidence'
                  ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileCheck size={11} />
              SUPPORTING EVIDENCE ({claimCard.evidence?.length || 0})
            </button>
            <button
              onClick={() => setActiveSubTab('counter')}
              className={`px-2.5 py-1 rounded transition flex items-center gap-1 ${
                activeSubTab === 'counter'
                  ? 'bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <AlertOctagon size={11} />
              COUNTEREVIDENCE ({claimCard.counterevidence?.length || 0})
            </button>
            <button
              onClick={() => setActiveSubTab('falsifier')}
              className={`px-2.5 py-1 rounded transition flex items-center gap-1 ${
                activeSubTab === 'falsifier'
                  ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Target size={11} />
              FALSIFICATION CRITERION
            </button>
            <button
              onClick={() => setActiveSubTab('alternatives')}
              className={`px-2.5 py-1 rounded transition flex items-center gap-1 ${
                activeSubTab === 'alternatives'
                  ? 'bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers size={11} />
              ALTERNATIVE EXPLANATIONS ({claimCard.alternativeExplanations?.length || 0})
            </button>
          </div>

          {/* Subtab Contents */}
          {activeSubTab === 'evidence' && (
            <div className="space-y-2">
              {claimCard.evidence && claimCard.evidence.length > 0 ? (
                claimCard.evidence.map((ev, idx) => {
                  const evTier = getEvidenceTierBadge(ev.tier);
                  return (
                    <div key={idx} className="bg-slate-950/60 border border-slate-800/80 rounded p-2.5 space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-mono">
                        <span className="font-bold text-cyan-300 flex items-center gap-1">
                          <FileCheck size={11} />
                          {ev.studyId}
                        </span>
                        <span className={`px-1.5 py-0.2 rounded border text-[9px] ${evTier.color}`}>
                          {evTier.label.split(':')[0]}
                        </span>
                      </div>
                      <p className="text-slate-300 font-sans text-xs italic">
                        "{ev.passageOrFinding}"
                      </p>
                      <div className="flex items-center gap-3 text-[10px] font-mono text-slate-400 flex-wrap pt-1 border-t border-slate-900">
                        <span>MODEL: <strong className="text-slate-200">{ev.experimentalSystem}</strong></span>
                        {ev.effectSize && <span>EFFECT: <strong className="text-emerald-400">{ev.effectSize}</strong></span>}
                        {ev.uncertaintyInterval && <span>95% CI: <strong className="text-slate-200">{ev.uncertaintyInterval}</strong></span>}
                        {ev.sampleSize && <span>N: <strong className="text-slate-200">{ev.sampleSize}</strong></span>}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-slate-500 italic p-2 text-center">No primary evidence entries registered.</div>
              )}
            </div>
          )}

          {activeSubTab === 'counter' && (
            <div className="space-y-2">
              {claimCard.counterevidence && claimCard.counterevidence.length > 0 ? (
                claimCard.counterevidence.map((cev, idx) => (
                  <div key={idx} className="bg-rose-950/20 border border-rose-500/20 rounded p-2.5 space-y-1">
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <span className="font-bold text-rose-300 flex items-center gap-1">
                        <AlertOctagon size={11} />
                        CONFLICTING STUDY: {cev.studyId}
                      </span>
                    </div>
                    <p className="text-rose-200/90 text-xs font-sans">
                      {cev.conflictingFinding}
                    </p>
                    <p className="text-[10px] font-mono text-slate-400">
                      CONTEXT DIFFERENCES: {cev.contextDifferences}
                    </p>
                  </div>
                ))
              ) : (
                <div className="text-slate-500 italic p-2 text-center">No conflicting findings recorded yet.</div>
              )}
            </div>
          )}

          {activeSubTab === 'falsifier' && (
            <div className="bg-amber-950/20 border border-amber-500/20 rounded p-3 space-y-2 font-mono">
              <div>
                <span className="text-[10px] uppercase font-bold text-amber-400 flex items-center gap-1">
                  <Target size={12} />
                  Testable Prospective Prediction:
                </span>
                <p className="text-xs text-slate-200 font-sans mt-0.5">{claimCard.testablePrediction}</p>
              </div>
              <div className="pt-2 border-t border-amber-500/20">
                <span className="text-[10px] uppercase font-bold text-rose-400 flex items-center gap-1">
                  <ShieldAlert size={12} />
                  Decisive Falsification Criterion:
                </span>
                <p className="text-xs text-rose-200/90 font-sans mt-0.5">{claimCard.falsifier}</p>
              </div>
            </div>
          )}

          {activeSubTab === 'alternatives' && (
            <div className="space-y-1.5">
              {claimCard.alternativeExplanations && claimCard.alternativeExplanations.length > 0 ? (
                claimCard.alternativeExplanations.map((alt, idx) => (
                  <div key={idx} className="bg-purple-950/20 border border-purple-500/20 rounded p-2 text-slate-300 font-sans text-xs flex items-start gap-2">
                    <ArrowRight size={13} className="text-purple-400 shrink-0 mt-0.5" />
                    <span>{alt}</span>
                  </div>
                ))
              ) : (
                <div className="text-slate-500 italic p-2 text-center">No alternative confounders registered.</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
