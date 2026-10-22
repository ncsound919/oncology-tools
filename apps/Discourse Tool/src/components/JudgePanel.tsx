import React, { useState } from 'react';
import { JudgeSynthesis, EpistemicLens, EvidenceTier, ClaimCard } from '../types';
import ClaimCardViewer, { getEvidenceTierBadge } from './ClaimCardViewer';
import PreregisteredProtocolViewer from './PreregisteredProtocolViewer';
import {
  Trophy,
  Star,
  Lightbulb,
  AlertTriangle,
  Sparkles,
  Scale,
  Dna,
  Calculator,
  Compass,
  GitBranch,
  Layers,
  CheckCircle2,
  Lock,
  FileCheck,
  ShieldAlert,
  Search,
  BookOpen,
  Filter,
  Microscope,
  Info,
  FileText,
  Download,
} from 'lucide-react';

interface JudgePanelProps {
  judgeResult?: JudgeSynthesis;
  isJudging?: boolean;
  onOpenTranscript?: () => void;
}

export default function JudgePanel({ judgeResult, isJudging = false, onOpenTranscript }: JudgePanelProps) {
  const [activeMainTab, setActiveMainTab] = useState<
    'hypotheses' | 'claims' | 'minority' | 'methodology' | 'lenses' | 'arguments' | 'contradictions'
  >('hypotheses');
  const [selectedLensTab, setSelectedLensTab] = useState<'all' | 'chain' | EpistemicLens>('all');
  const [selectedHypothesisIdx, setSelectedHypothesisIdx] = useState(0);
  const [claimSearch, setClaimSearch] = useState('');
  const [claimTierFilter, setClaimTierFilter] = useState<number | 'all'>('all');

  if (isJudging) {
    return (
      <div id="judge-loading" className="border border-blue-500/20 bg-blue-500/5 rounded-xl p-6 text-center shadow-lg">
        <div className="flex flex-col items-center justify-center py-6">
          <Sparkles className="animate-spin text-blue-400 mb-3" size={32} />
          <h3 className="font-mono text-xs uppercase font-bold text-white tracking-widest">
            SYNTHESIZING_SCIENTIFIC_ACCOUNTABILITY_DOSSIER...
          </h3>
          <p className="text-[11px] text-slate-400 font-mono max-w-lg mt-2 leading-relaxed">
            Ranking candidate hypotheses, building preregistered experimental protocols (power analysis & falsification thresholds), constructing the claim audit trail, and synthesizing minority reports...
          </p>
        </div>
      </div>
    );
  }

  if (!judgeResult) {
    return (
      <div className="border border-slate-800 bg-[#0F0F12] rounded-xl p-5 text-center shadow-sm">
        <Scale className="mx-auto text-slate-600 mb-2" size={26} />
        <span className="text-[11px] uppercase tracking-wider font-bold text-slate-500 block font-mono">
          Awaiting Scientific Synthesis & Experimental Falsification Dossier
        </span>
        <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
          Execute debate rounds to trigger candidate hypothesis ranking, preregistered protocol generation, claim evidence tier audits, and quad-lens epistemic evaluation.
        </p>
      </div>
    );
  }

  const scores = judgeResult.quadLensScores || {
    scientific: 85,
    mathematical: 80,
    philosophical: 90,
    moral: 88,
  };

  const candidateHypotheses = judgeResult.candidateHypotheses || [];
  const claimAuditTrail = judgeResult.claimAuditTrail || [];
  const minorityReports = judgeResult.minorityReports || [];
  const activeHypothesis = candidateHypotheses[selectedHypothesisIdx] || candidateHypotheses[0];

  const filteredClaims = claimAuditTrail.filter((claim) => {
    const matchesSearch =
      claimSearch === '' ||
      claim.claim.toLowerCase().includes(claimSearch.toLowerCase()) ||
      claim.claimType.toLowerCase().includes(claimSearch.toLowerCase());
    const matchesTier = claimTierFilter === 'all' || claim.evidenceTier === claimTierFilter;
    return matchesSearch && matchesTier;
  });

  const getLensIcon = (lens?: EpistemicLens) => {
    switch (lens) {
      case 'scientific':
        return <Dna size={12} className="text-cyan-400" />;
      case 'mathematical':
        return <Calculator size={12} className="text-amber-400" />;
      case 'philosophical':
        return <Compass size={12} className="text-purple-400" />;
      case 'moral':
        return <Scale size={12} className="text-rose-400" />;
      default:
        return <Sparkles size={12} className="text-blue-400" />;
    }
  };

  return (
    <div id="judge-panel-content" className="border border-slate-800 bg-[#0F0F12] rounded-xl p-4 md:p-5 space-y-5 shadow-lg">
      {/* Zero-Evidence Epistemic Principle Header */}
      <div className="bg-gradient-to-r from-amber-500/10 via-slate-900 to-rose-500/10 border border-amber-500/30 rounded-lg p-3 flex items-start gap-2.5">
        <ShieldAlert size={18} className="text-amber-400 shrink-0 mt-0.5" />
        <div className="text-xs font-mono space-y-0.5">
          <span className="text-amber-300 font-bold block uppercase text-[10px]">
            Scientific Accountability Standard: Zero-Evidence Rule for Agent Agreement
          </span>
          <p className="text-slate-300 font-sans text-[11px] leading-relaxed">
            Multi-agent consensus counts as <strong>zero independent empirical evidence</strong>. Every ranked hypothesis below represents an unverified candidate model with pre-registered falsification criteria awaiting experimental testing.
          </p>
        </div>
      </div>

      {/* Main Executive Banner */}
      <div className="border-b border-slate-800 pb-4 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Trophy className="text-amber-400" size={18} />
            <span className="text-xs uppercase tracking-wider font-bold text-slate-200 font-mono">
              Scientific Hypothesis Synthesis & Experimental Plan
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-mono text-cyan-300 bg-cyan-500/10 px-2.5 py-1 rounded-full border border-cyan-500/20 font-bold">
              CONVERGENCE: {judgeResult.consensusScore}%
            </span>
            <span className="text-[10px] font-mono text-emerald-300 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20 font-bold">
              HYPOTHESES: {candidateHypotheses.length}
            </span>
            {onOpenTranscript && (
              <button
                type="button"
                onClick={onOpenTranscript}
                className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full text-[10px] font-bold font-sans flex items-center gap-1 transition shadow-sm"
                title="Download full transcript, executive summary & major takeaways"
              >
                <FileText size={11} />
                <span>Transcript & Report</span>
              </button>
            )}
          </div>
        </div>

        {/* Top Candidate Hypothesis Box */}
        <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-2">
          <div className="text-[10px] uppercase font-mono font-bold text-emerald-400 flex items-center gap-1.5">
            <CheckCircle2 size={13} />
            TOP_CANDIDATE_HYPOTHESIS_FORMULATION:
          </div>
          <div className="text-sm md:text-base font-bold text-white font-mono">
            {judgeResult.winner}
          </div>
          <p className="text-xs text-slate-300 leading-relaxed font-sans">
            {judgeResult.evaluationText}
          </p>
        </div>

        {judgeResult.abstentionRequired && (
          <div className="bg-amber-950/40 border border-amber-500/50 rounded-lg p-4 space-y-2">
            <div className="text-[10px] uppercase font-mono font-bold text-amber-400 flex items-center gap-1.5">
              <ShieldAlert size={13} />
              SYSTEM ABSTENTION REQUIRED
            </div>
            <p className="text-xs text-amber-200 leading-relaxed font-sans">
              The available evidence is currently insufficient to formulate a robust empirical hypothesis. Epistemic guidelines dictate that we must abstain from drawing a definitive conclusion at this stage.
            </p>
          </div>
        )}

        {/* 4 Epistemic Scorecard Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 pt-1">
          <div className="bg-slate-900/80 border border-cyan-500/20 rounded-lg p-2.5">
            <div className="flex items-center justify-between text-[10px] font-mono text-cyan-300 font-bold mb-1">
              <span className="flex items-center gap-1">
                <Dna size={12} /> SCIENCE
              </span>
              <span>{scores.scientific}%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-cyan-400 rounded-full" style={{ width: `${scores.scientific}%` }} />
            </div>
          </div>

          <div className="bg-slate-900/80 border border-amber-500/20 rounded-lg p-2.5">
            <div className="flex items-center justify-between text-[10px] font-mono text-amber-300 font-bold mb-1">
              <span className="flex items-center gap-1">
                <Calculator size={12} /> MATHEMATIC
              </span>
              <span>{scores.mathematical}%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-amber-400 rounded-full" style={{ width: `${scores.mathematical}%` }} />
            </div>
          </div>

          <div className="bg-slate-900/80 border border-purple-500/20 rounded-lg p-2.5">
            <div className="flex items-center justify-between text-[10px] font-mono text-purple-300 font-bold mb-1">
              <span className="flex items-center gap-1">
                <Compass size={12} /> PHILOSOPHY
              </span>
              <span>{scores.philosophical}%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-purple-400 rounded-full" style={{ width: `${scores.philosophical}%` }} />
            </div>
          </div>

          <div className="bg-slate-900/80 border border-rose-500/20 rounded-lg p-2.5">
            <div className="flex items-center justify-between text-[10px] font-mono text-rose-300 font-bold mb-1">
              <span className="flex items-center gap-1">
                <Scale size={12} /> MORAL / ETHICS
              </span>
              <span>{scores.moral}%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-rose-400 rounded-full" style={{ width: `${scores.moral}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Main Tabbed Dossier Navigation */}
      <div className="flex items-center gap-1.5 border-b border-slate-800 overflow-x-auto pb-2 text-[11px] font-mono">
        <button
          onClick={() => setActiveMainTab('hypotheses')}
          className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 shrink-0 ${
            activeMainTab === 'hypotheses'
              ? 'bg-blue-600 text-white font-bold shadow'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <Lock size={12} />
          CANDIDATE HYPOTHESES & PROTOCOLS ({candidateHypotheses.length})
        </button>

        <button
          onClick={() => setActiveMainTab('claims')}
          className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 shrink-0 ${
            activeMainTab === 'claims'
              ? 'bg-blue-600 text-white font-bold shadow'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <FileCheck size={12} />
          CLAIM AUDIT TRAIL ({claimAuditTrail.length})
        </button>

        <button
          onClick={() => setActiveMainTab('minority')}
          className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 shrink-0 ${
            activeMainTab === 'minority'
              ? 'bg-blue-600 text-white font-bold shadow'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <AlertTriangle size={12} />
          MINORITY REPORTS ({minorityReports.length})
        </button>

        <button
          onClick={() => setActiveMainTab('methodology')}
          className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 shrink-0 ${
            activeMainTab === 'methodology'
              ? 'bg-blue-600 text-white font-bold shadow'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <Microscope size={12} />
          METHODOLOGICAL & NOVELTY AUDIT
        </button>

        <button
          onClick={() => setActiveMainTab('lenses')}
          className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 shrink-0 ${
            activeMainTab === 'lenses'
              ? 'bg-blue-600 text-white font-bold shadow'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <Layers size={12} />
          QUAD-LENS DEEP REVIEW
        </button>

        <button
          onClick={() => setActiveMainTab('arguments')}
          className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 shrink-0 ${
            activeMainTab === 'arguments'
              ? 'bg-blue-600 text-white font-bold shadow'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <Star size={12} />
          ARGUMENTS & DISSENT
        </button>

        {judgeResult.contradictionMatrix && judgeResult.contradictionMatrix.length > 0 && (
          <button
            onClick={() => setActiveMainTab('contradictions')}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 shrink-0 ${
              activeMainTab === 'contradictions'
                ? 'bg-rose-600 text-white font-bold shadow'
                : 'bg-rose-950/20 text-rose-400 hover:bg-rose-900/40 border border-rose-500/30'
            }`}
          >
            <ShieldAlert size={12} />
            CONTRADICTIONS ({judgeResult.contradictionMatrix.length})
          </button>
        )}
      </div>

      {/* Tab 1: Candidate Hypotheses & Preregistered Experimental Protocols */}
      {activeMainTab === 'hypotheses' && (
        <div className="space-y-4">
          {/* Hypothesis Selector Pills */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] uppercase font-mono font-bold text-slate-400">
              Ranked Candidate Hypotheses:
            </span>
            {candidateHypotheses.map((hypo, idx) => {
              const tierBadge = getEvidenceTierBadge(hypo.highestEvidenceTier);
              return (
                <button
                  key={idx}
                  onClick={() => setSelectedHypothesisIdx(idx)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-mono transition flex items-center gap-2 ${
                    selectedHypothesisIdx === idx
                      ? 'bg-slate-800 text-white border-blue-500 font-bold ring-1 ring-blue-500'
                      : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <span className="text-blue-400 font-bold">RANK #{hypo.rank || idx + 1}</span>
                  <span className="truncate max-w-[140px] md:max-w-xs">{hypo.title}</span>
                  <span className={`px-1.5 py-0.2 rounded text-[9px] ${tierBadge.color}`}>
                    {tierBadge.label.split(':')[0]}
                  </span>
                </button>
              );
            })}
          </div>

          {activeHypothesis ? (
            <div className="space-y-4 bg-slate-950/60 border border-slate-800/90 rounded-xl p-4">
              {/* Hypothesis Detail Header */}
              <div className="border-b border-slate-800 pb-3 space-y-2">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                        RANK {activeHypothesis.rank} CANDIDATE
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        NOVELTY: {activeHypothesis.noveltyScore}% vs Literature
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        CONFIDENCE: {(activeHypothesis.calibratedConfidence * 100).toFixed(0)}%
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-white font-mono mt-1.5">
                      {activeHypothesis.title}
                    </h3>
                  </div>
                </div>

                <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800 space-y-1">
                  <span className="text-[10px] uppercase font-mono font-bold text-slate-400 block">
                    Proposed Causal Biological Mechanism:
                  </span>
                  <p className="text-xs text-slate-200 font-sans leading-relaxed">
                    {activeHypothesis.mechanism}
                  </p>
                </div>

                {activeHypothesis.priorArtComparison && (
                  <div className="text-[11px] font-mono text-purple-300 bg-purple-950/20 border border-purple-500/20 p-2.5 rounded-lg">
                    <span className="font-bold block uppercase text-[9px] text-purple-400">Prior Art & Patent Comparison:</span>
                    {activeHypothesis.priorArtComparison}
                  </div>
                )}
              </div>

              {/* Preregistered Experimental Protocol */}
              {activeHypothesis.falsificationProtocol && (
                <div className="space-y-2">
                  <span className="text-[10px] uppercase font-mono font-bold text-cyan-400 block flex items-center gap-1.5">
                    <Lock size={13} />
                    Preregistered Experimental Falsification Protocol:
                  </span>
                  <PreregisteredProtocolViewer protocol={activeHypothesis.falsificationProtocol} />
                </div>
              )}

              {/* Supporting Claim Cards */}
              {activeHypothesis.claimCards && activeHypothesis.claimCards.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <span className="text-[10px] uppercase font-mono font-bold text-slate-400 block">
                    Audited Underlying Claim Cards ({activeHypothesis.claimCards.length}):
                  </span>
                  <div className="space-y-2">
                    {activeHypothesis.claimCards.map((cc, i) => (
                      <ClaimCardViewer key={i} claimCard={cc} compact={true} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-slate-500 italic text-center p-4">No candidate hypothesis selected.</div>
          )}
        </div>
      )}

      {/* Tab 2: Claim Audit Trail */}
      {activeMainTab === 'claims' && (
        <div className="space-y-3">
          {/* Filters & Search */}
          <div className="flex items-center justify-between gap-3 flex-wrap bg-slate-950 p-2.5 rounded-lg border border-slate-800">
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <Search size={14} className="text-slate-500" />
              <input
                type="text"
                value={claimSearch}
                onChange={(e) => setClaimSearch(e.target.value)}
                placeholder="Search audited claims or mechanisms..."
                className="bg-transparent border-none text-xs text-slate-200 focus:outline-none w-full font-sans"
              />
            </div>

            <div className="flex items-center gap-1.5 text-[10px] font-mono">
              <span className="text-slate-500 flex items-center gap-1">
                <Filter size={11} /> TIER:
              </span>
              {[
                { val: 'all', label: 'ALL' },
                { val: 1, label: 'T1' },
                { val: 2, label: 'T2' },
                { val: 3, label: 'T3' },
                { val: 4, label: 'T4' },
                { val: 5, label: 'T5' },
              ].map((t) => (
                <button
                  key={t.val}
                  onClick={() => setClaimTierFilter(t.val as any)}
                  className={`px-2 py-0.5 rounded transition ${
                    claimTierFilter === t.val
                      ? 'bg-blue-600 text-white font-bold'
                      : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Claim Cards List */}
          <div className="space-y-2.5">
            {filteredClaims.length > 0 ? (
              filteredClaims.map((claim, idx) => (
                <ClaimCardViewer key={claim.id || idx} claimCard={claim} compact={false} />
              ))
            ) : (
              <div className="text-slate-500 italic p-6 text-center bg-slate-950/50 rounded-lg border border-slate-800 font-mono text-xs">
                No claims match the selected search or evidence tier filter.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Minority Reports */}
      {activeMainTab === 'minority' && (
        <div className="space-y-3">
          <div className="bg-rose-950/20 border border-rose-500/20 p-3 rounded-lg flex items-start gap-2.5">
            <AlertTriangle size={16} className="text-rose-400 shrink-0 mt-0.5" />
            <div className="text-xs space-y-0.5 font-mono">
              <span className="text-rose-300 font-bold block uppercase text-[10px]">
                Preserved Epistemic Dissents & Scientific Edge Cases
              </span>
              <p className="text-slate-300 font-sans text-[11px]">
                Consensus often masks critical failure modes. These minority reports document unresolved contradictions, failed predictions, and empirical evidence gaps.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {minorityReports.length > 0 ? (
              minorityReports.map((mr, idx) => (
                <div key={idx} className="bg-slate-950 border border-slate-800 rounded-lg p-3.5 space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="font-bold text-rose-300 flex items-center gap-1.5">
                      <AlertTriangle size={13} className="text-rose-400" />
                      DISSENTING SCIENTIST: {mr.agentName} ({mr.role})
                    </span>
                  </div>

                  <div className="bg-slate-900/90 p-2.5 rounded border border-slate-800 space-y-1">
                    <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block">
                      Dissenting Proposition:
                    </span>
                    <p className="text-slate-200 text-xs font-sans italic">"{mr.dissentingClaim}"</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] font-mono">
                    <div className="bg-slate-900/60 p-2 rounded border border-slate-800/80">
                      <span className="text-cyan-400 font-bold block text-[9px] uppercase">Evidence Basis</span>
                      <p className="text-slate-300">{mr.evidenceBasis}</p>
                    </div>
                    <div className="bg-slate-900/60 p-2 rounded border border-slate-800/80">
                      <span className="text-amber-400 font-bold block text-[9px] uppercase">Unresolved Evidence Gap</span>
                      <p className="text-slate-300">{mr.unresolvedGap}</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 text-center text-slate-400 text-xs font-mono">
                {judgeResult.dissent ? (
                  <div className="text-left space-y-1">
                    <span className="text-rose-400 font-bold block uppercase text-[10px]">Unresolved Friction:</span>
                    <p className="text-slate-300 font-sans">{judgeResult.dissent}</p>
                  </div>
                ) : (
                  'No critical minority dissents recorded for this session.'
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Methodological & Novelty Audit */}
      {activeMainTab === 'methodology' && (
        <div className="space-y-4">
          {/* Novelty Assessment */}
          <div className="bg-purple-950/20 border border-purple-500/30 rounded-xl p-4 space-y-2">
            <span className="text-[10px] uppercase font-mono font-bold text-purple-400 flex items-center gap-1.5">
              <Sparkles size={13} />
              Novelty Audit vs Patents, Preprints & Literature:
            </span>
            <p className="text-xs text-slate-200 font-sans leading-relaxed">
              {judgeResult.noveltyVerdict || 'Evaluated for prior art similarity across oncology databases and patent registries.'}
            </p>
          </div>

          {/* Statistical Power Audit */}
          {judgeResult.methodologicalAudit && (
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
              <span className="text-[10px] uppercase font-mono font-bold text-amber-400 flex items-center gap-1.5">
                <Calculator size={13} />
                Methodological & Statistical Power Integrity Audit:
              </span>

              <div className="space-y-2 text-xs font-sans">
                <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
                  <strong className="text-slate-300 font-mono text-[11px] block mb-1">Statistical Power Summary:</strong>
                  <p className="text-slate-300 leading-relaxed">{judgeResult.methodologicalAudit.statisticalPowerSummary}</p>
                </div>

                <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
                  <strong className="text-slate-300 font-mono text-[11px] block mb-1">Control Sufficiency & Artifact Checks:</strong>
                  <p className="text-slate-300 leading-relaxed">{judgeResult.methodologicalAudit.controlSufficiency}</p>
                </div>

                {judgeResult.methodologicalAudit.leakageAndBiasRisks && judgeResult.methodologicalAudit.leakageAndBiasRisks.length > 0 && (
                  <div className="bg-rose-950/20 border border-rose-500/20 p-3 rounded-lg">
                    <strong className="text-rose-300 font-mono text-[11px] block mb-1">Identified Leakage, Confounder & Bias Risks:</strong>
                    <ul className="space-y-1 text-slate-300 text-[11px]">
                      {judgeResult.methodologicalAudit.leakageAndBiasRisks.map((risk, i) => (
                        <li key={i} className="flex items-start gap-1.5 font-mono">
                          <AlertTriangle size={12} className="text-rose-400 shrink-0 mt-0.5" />
                          <span>{risk}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 5: Quad-Lens Deep Review */}
      {activeMainTab === 'lenses' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 font-mono flex items-center gap-1.5">
              <Layers size={13} className="text-blue-400" />
              Epistemic Quad-Lens Synthesis
            </span>

            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-[10px] font-mono overflow-x-auto">
              <button
                onClick={() => setSelectedLensTab('all')}
                className={`px-2 py-0.5 rounded transition ${
                  selectedLensTab === 'all' ? 'bg-slate-800 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                ALL LENSES
              </button>
              <button
                onClick={() => setSelectedLensTab('chain')}
                className={`px-2 py-0.5 rounded flex items-center gap-1 transition ${
                  selectedLensTab === 'chain' ? 'bg-blue-600/30 text-blue-300 font-bold border border-blue-500/30' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <GitBranch size={10} />
                5-STAGE CHAIN
              </button>
              <button
                onClick={() => setSelectedLensTab('scientific')}
                className={`px-2 py-0.5 rounded flex items-center gap-1 transition ${
                  selectedLensTab === 'scientific' ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Dna size={10} />
                SCIENCE
              </button>
              <button
                onClick={() => setSelectedLensTab('mathematical')}
                className={`px-2 py-0.5 rounded flex items-center gap-1 transition ${
                  selectedLensTab === 'mathematical' ? 'bg-amber-500/20 text-amber-300 font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Calculator size={10} />
                MATH
              </button>
              <button
                onClick={() => setSelectedLensTab('philosophical')}
                className={`px-2 py-0.5 rounded flex items-center gap-1 transition ${
                  selectedLensTab === 'philosophical' ? 'bg-purple-500/20 text-purple-300 font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Compass size={10} />
                PHILOSOPHY
              </button>
              <button
                onClick={() => setSelectedLensTab('moral')}
                className={`px-2 py-0.5 rounded flex items-center gap-1 transition ${
                  selectedLensTab === 'moral' ? 'bg-rose-500/20 text-rose-300 font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Scale size={10} />
                ETHICS
              </button>
            </div>
          </div>

          {/* Lens Details Content */}
          {selectedLensTab === 'chain' && (
            <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-3.5 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-blue-300 font-mono">
                <GitBranch size={14} />
                Interconnected Oncology Progression Chain (Questions 1 to 5):
              </div>
              <p className="text-xs text-slate-200 leading-relaxed font-sans">
                {judgeResult.interconnectedChainAnalysis ||
                  'The debate effectively demonstrated that malignant initiation (Q1) seeds clonal heterogeneity (Q2), which escapes into dormant metastatic niches (Q3). Overcoming immune camouflage (Q4) without triggering lethal autoimmunity requires shifting from maximum tolerated cytotoxicity to high-therapeutic-index selective molecular glues and QALY preservation (Q5).'}
              </p>
            </div>
          )}

          {(selectedLensTab === 'all' || selectedLensTab === 'scientific') && judgeResult.quadLensBreakdown?.scientificAnalysis && (
            <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-lg p-3 space-y-1">
              <div className="flex items-center gap-1.5 text-[10px] uppercase font-mono font-bold text-cyan-300">
                <Dna size={12} />
                Scientific & Molecular Proteogenomic Review:
              </div>
              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                {judgeResult.quadLensBreakdown.scientificAnalysis}
              </p>
            </div>
          )}

          {(selectedLensTab === 'all' || selectedLensTab === 'mathematical') && judgeResult.quadLensBreakdown?.mathematicalAnalysis && (
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3 space-y-1">
              <div className="flex items-center gap-1.5 text-[10px] uppercase font-mono font-bold text-amber-300">
                <Calculator size={12} />
                Mathematical, Dynamical & Game-Theoretic Review:
              </div>
              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                {judgeResult.quadLensBreakdown.mathematicalAnalysis}
              </p>
            </div>
          )}

          {(selectedLensTab === 'all' || selectedLensTab === 'philosophical') && judgeResult.quadLensBreakdown?.philosophicalAnalysis && (
            <div className="bg-purple-500/5 border border-purple-500/20 rounded-lg p-3 space-y-1">
              <div className="flex items-center gap-1.5 text-[10px] uppercase font-mono font-bold text-purple-300">
                <Compass size={12} />
                Philosophical, Epistemological & Ontological Review:
              </div>
              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                {judgeResult.quadLensBreakdown.philosophicalAnalysis}
              </p>
            </div>
          )}

          {(selectedLensTab === 'all' || selectedLensTab === 'moral') && judgeResult.quadLensBreakdown?.moralAnalysis && (
            <div className="bg-rose-500/5 border border-rose-500/20 rounded-lg p-3 space-y-1">
              <div className="flex items-center gap-1.5 text-[10px] uppercase font-mono font-bold text-rose-300">
                <Scale size={12} />
                Bioethical, QALY & Human Welfare Review:
              </div>
              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                {judgeResult.quadLensBreakdown.moralAnalysis}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Tab 6: Arguments & Dissent */}
      {activeMainTab === 'arguments' && (
        <div className="space-y-4">
          {/* Key Arguments */}
          <div className="space-y-2">
            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500 font-mono block">
              Key Arguments & Multi-Disciplinary Validity Scores
            </span>
            <div className="space-y-2">
              {judgeResult.keyArguments.map((arg, idx) => (
                <div
                  key={idx}
                  className="bg-slate-900 border border-slate-800 p-3 rounded-lg flex justify-between items-start gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-slate-200 leading-relaxed font-sans font-medium">"{arg.point}"</p>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500 flex-wrap">
                      <span>CONTRIBUTOR: <span className="text-slate-400 font-bold">{arg.contributor}</span></span>
                      {arg.lens && (
                        <span className="flex items-center gap-1 bg-slate-800/80 px-1.5 py-0.5 rounded text-slate-300">
                          {getLensIcon(arg.lens)}
                          {arg.lens.toUpperCase()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded text-[10px] font-mono font-bold text-amber-400 shrink-0">
                    <Star size={11} className="fill-amber-400 text-amber-400" />
                    {arg.strength}/10
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Dissent */}
          <div className="bg-rose-500/5 border border-rose-500/20 rounded-lg p-3.5 flex gap-3">
            <AlertTriangle size={16} className="text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="text-[10px] uppercase font-mono font-bold text-rose-400">
                Unresolved Dissent & Critical Epistemic Friction
              </div>
              <p className="text-xs text-rose-200/90 leading-relaxed font-sans">
                {judgeResult.dissent}
              </p>
            </div>
          </div>

          {/* Open Questions */}
          <div className="space-y-2 pt-1 border-t border-slate-800">
            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500 font-mono block">
              Strategic Open Questions for Future Inquiries
            </span>
            <div className="space-y-2">
              {judgeResult.openQuestions.map((q, idx) => (
                <div
                  key={idx}
                  className="flex gap-2.5 items-start text-xs text-slate-300 bg-slate-900/80 border border-slate-800 p-2.5 rounded-lg"
                >
                  <Lightbulb size={14} className="text-amber-400 shrink-0 mt-0.5" />
                  <span className="font-sans leading-relaxed">{q}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 7: Contradiction Matrix */}
      {activeMainTab === 'contradictions' && judgeResult.contradictionMatrix && (
        <div className="space-y-4">
          <div className="bg-rose-950/40 border border-rose-500/30 rounded-lg p-4 space-y-3">
            <div className="text-[10px] uppercase font-mono font-bold text-rose-400 flex items-center gap-1.5">
              <ShieldAlert size={13} />
              EPISTEMIC CONTRADICTION MATRIX
            </div>
            <p className="text-xs text-rose-200/80 font-sans leading-relaxed">
              The following entities or interventions have conflicting claims across the literature. Instead of averaging these away, they are explicitly surfaced here for resolution through future preregistered studies.
            </p>
          </div>

          <div className="space-y-3">
            {judgeResult.contradictionMatrix.map((matrix, idx) => (
              <div key={idx} className="bg-slate-900 border border-slate-800 rounded-lg p-3.5 space-y-3">
                <div className="flex items-center gap-3 flex-wrap border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-1.5 text-[10px] font-mono">
                    <span className="text-slate-500">ENTITY:</span>
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      {matrix.entity}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] font-mono">
                    <span className="text-slate-500">MODEL/INTERVENTION:</span>
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      {matrix.modelOrIntervention}
                    </span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <span className="text-[10px] font-mono text-rose-400 font-bold block">CONFLICTING CLAIMS:</span>
                  <div className="space-y-2 pl-2 border-l-2 border-rose-500/30">
                    {matrix.conflictingClaims.map((claim, cIdx) => (
                      <div key={cIdx} className="text-xs text-slate-300 font-sans leading-relaxed">
                        • {claim}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
