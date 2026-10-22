import React from 'react';
import { ExperimentalProtocol } from '../types';
import {
  FlaskConical,
  ShieldCheck,
  Target,
  BarChart3,
  Calendar,
  AlertTriangle,
  FileSpreadsheet,
  CheckCircle2,
  Lock,
} from 'lucide-react';

interface PreregisteredProtocolViewerProps {
  protocol: ExperimentalProtocol;
}

export default function PreregisteredProtocolViewer({ protocol }: PreregisteredProtocolViewerProps) {
  return (
    <div className="border border-slate-800 bg-[#0B0C10] rounded-xl p-4 md:p-5 space-y-4 text-xs font-sans">
      {/* Protocol Banner */}
      <div className="border-b border-slate-800 pb-3 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
              <Lock size={10} />
              PREREGISTERED STUDY PROTOCOL
            </span>
            <span className="text-[10px] font-mono text-slate-500">ID: {protocol.hypothesisId}</span>
          </div>
          <h3 className="font-bold text-slate-100 text-sm md:text-base mt-1 font-mono">
            {protocol.hypothesisTitle}
          </h3>
          <p className="text-slate-400 text-xs mt-0.5">
            Target Mechanism: <strong className="text-slate-200">{protocol.targetMechanism}</strong>
          </p>
        </div>

        <div className="bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800 text-[10px] font-mono text-slate-300 flex items-center gap-2">
          <Calendar size={13} className="text-blue-400" />
          <span>Feasibility: {protocol.timelineAndFeasibility || '6-9 months'}</span>
        </div>
      </div>

      {/* Experimental Design & Perturbation */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="bg-slate-950/70 border border-slate-800/90 rounded-lg p-3 space-y-1.5">
          <span className="text-[10px] uppercase font-mono font-bold text-cyan-400 flex items-center gap-1.5">
            <FlaskConical size={12} />
            Proposed Molecular / Chemical Perturbation:
          </span>
          <p className="text-slate-200 leading-relaxed font-mono text-[11px] bg-slate-900/80 p-2 rounded border border-slate-800">
            {protocol.proposedPerturbation}
          </p>
        </div>

        <div className="bg-slate-950/70 border border-slate-800/90 rounded-lg p-3 space-y-1.5">
          <span className="text-[10px] uppercase font-mono font-bold text-purple-400 flex items-center gap-1.5">
            <Target size={12} />
            Biological Model System & Setting:
          </span>
          <p className="text-slate-200 leading-relaxed font-mono text-[11px] bg-slate-900/80 p-2 rounded border border-slate-800">
            {protocol.biologicalModelSystem}
          </p>
        </div>
      </div>

      {/* Control Design Rigor */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-3.5 space-y-2">
        <span className="text-[10px] uppercase font-mono font-bold text-emerald-400 flex items-center gap-1.5">
          <ShieldCheck size={13} />
          Validated Laboratory Controls (Pre-specified):
        </span>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-[11px] font-mono">
          <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
            <span className="text-emerald-400 font-bold block mb-1 text-[9px] uppercase">Positive Control</span>
            <p className="text-slate-300">{protocol.positiveControl}</p>
          </div>
          <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
            <span className="text-rose-400 font-bold block mb-1 text-[9px] uppercase">Negative Control</span>
            <p className="text-slate-300">{protocol.negativeControl}</p>
          </div>
          <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
            <span className="text-amber-400 font-bold block mb-1 text-[9px] uppercase">Vehicle / Scrambled</span>
            <p className="text-slate-300">{protocol.vehicleOrScrambledControl}</p>
          </div>
        </div>
      </div>

      {/* Statistical Power & Sample Size */}
      <div className="bg-slate-950/70 border border-slate-800/90 rounded-lg p-3.5 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase font-mono font-bold text-amber-400 flex items-center gap-1.5">
            <BarChart3 size={13} />
            Statistical Power Analysis (Pre-registration):
          </span>
          <span className="text-[10px] font-mono text-slate-400">
            N={protocol.powerAnalysis.requiredSampleSize}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center text-[11px] font-mono">
          <div className="bg-slate-900 p-2 rounded border border-slate-800">
            <span className="text-slate-500 text-[9px] block">POWER (1-β)</span>
            <strong className="text-emerald-400 text-sm">{(protocol.powerAnalysis.statisticalPower * 100).toFixed(0)}%</strong>
          </div>
          <div className="bg-slate-900 p-2 rounded border border-slate-800">
            <span className="text-slate-500 text-[9px] block">ALPHA (α)</span>
            <strong className="text-cyan-400 text-sm">{protocol.powerAnalysis.alpha}</strong>
          </div>
          <div className="bg-slate-900 p-2 rounded border border-slate-800">
            <span className="text-slate-500 text-[9px] block">ESTIMATED EFFECT</span>
            <strong className="text-amber-300 text-xs truncate block">{protocol.powerAnalysis.effectSizeEstimate}</strong>
          </div>
          <div className="bg-slate-900 p-2 rounded border border-slate-800">
            <span className="text-slate-500 text-[9px] block">REQUIRED N / ARM</span>
            <strong className="text-white text-xs truncate block">{protocol.powerAnalysis.requiredSampleSize}</strong>
          </div>
        </div>
      </div>

      {/* Primary Endpoints & Falsification Cutoff */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="bg-slate-950/70 border border-slate-800/90 rounded-lg p-3 space-y-2">
          <span className="text-[10px] uppercase font-mono font-bold text-blue-400 flex items-center gap-1">
            <FileSpreadsheet size={12} />
            Primary & Secondary Endpoints:
          </span>
          <ul className="space-y-1 text-slate-300 text-[11px]">
            {protocol.primaryEndpoints?.map((ep, i) => (
              <li key={i} className="flex items-start gap-1.5 font-mono">
                <CheckCircle2 size={12} className="text-cyan-400 shrink-0 mt-0.5" />
                <span>Primary: {ep}</span>
              </li>
            ))}
            {protocol.secondaryEndpoints?.map((sep, i) => (
              <li key={i} className="flex items-start gap-1.5 font-mono text-slate-400">
                <span className="text-slate-600 shrink-0">•</span>
                <span>Secondary: {sep}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-rose-950/20 border border-rose-500/30 rounded-lg p-3 space-y-2">
          <span className="text-[10px] uppercase font-mono font-bold text-rose-400 flex items-center gap-1.5">
            <AlertTriangle size={13} />
            Pre-specified Falsification Threshold:
          </span>
          <p className="text-rose-200 text-xs font-mono leading-relaxed bg-rose-950/40 p-2.5 rounded border border-rose-500/20">
            "{protocol.prespecifiedFalsificationThreshold}"
          </p>
        </div>
      </div>

      {/* Leakage & Confounder Audit */}
      {protocol.leakageAndConfounderChecks && protocol.leakageAndConfounderChecks.length > 0 && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-3 space-y-1.5">
          <span className="text-[10px] uppercase font-mono font-bold text-slate-400">
            Leakage, Batch Effect & Confounder Checks:
          </span>
          <div className="flex flex-wrap gap-2">
            {protocol.leakageAndConfounderChecks.map((chk, i) => (
              <span key={i} className="px-2 py-1 rounded bg-slate-950 border border-slate-800 text-[10px] font-mono text-slate-300">
                ✓ {chk}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Protocol Completeness Flags */}
      {(protocol.replicates || protocol.blindingAndRandomization || protocol.sampleAndReagentProvenance || protocol.strictAcceptanceCriteria) && (
        <div className="bg-slate-950/70 border border-slate-800/90 rounded-lg p-3.5 space-y-2">
          <span className="text-[10px] uppercase font-mono font-bold text-indigo-400 flex items-center gap-1.5">
            <CheckCircle2 size={13} />
            Protocol Completeness & Epistemic Controls:
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] font-mono text-slate-300">
            {protocol.replicates && (
              <div className="bg-slate-900 p-2 rounded border border-slate-800">
                <span className="text-slate-500 block mb-0.5">REPLICATES</span>
                {protocol.replicates}
              </div>
            )}
            {protocol.blindingAndRandomization && (
              <div className="bg-slate-900 p-2 rounded border border-slate-800">
                <span className="text-slate-500 block mb-0.5">BLINDING/RANDOMIZATION</span>
                {protocol.blindingAndRandomization}
              </div>
            )}
            {protocol.sampleAndReagentProvenance && (
              <div className="bg-slate-900 p-2 rounded border border-slate-800">
                <span className="text-slate-500 block mb-0.5">PROVENANCE</span>
                {protocol.sampleAndReagentProvenance}
              </div>
            )}
            {protocol.strictAcceptanceCriteria && (
              <div className="bg-slate-900 p-2 rounded border border-slate-800">
                <span className="text-slate-500 block mb-0.5">ACCEPTANCE CRITERIA</span>
                {protocol.strictAcceptanceCriteria}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
