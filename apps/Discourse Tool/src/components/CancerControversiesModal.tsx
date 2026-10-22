import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Scale,
  Activity,
  AlertTriangle,
  FileText,
  Play,
  CheckCircle2,
  ChevronRight,
  Sparkles,
  Search,
  Dna,
  ShieldAlert,
  Layers,
  HeartPulse,
  Users,
  Copy,
  ExternalLink,
} from 'lucide-react';
import { CancerControversy, EpistemicLens, StanceCard, ResearchBrief } from '../types';
import { CANCER_RESEARCH_CONTROVERSIES } from '../data/cancerControversies';

interface CancerControversiesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectControversy: (controversy: CancerControversy) => void;
  onApplyResearchBrief: (brief: ResearchBrief) => void;
}

export const CancerControversiesModal: React.FC<CancerControversiesModalProps> = ({
  isOpen,
  onClose,
  onSelectControversy,
  onApplyResearchBrief,
}) => {
  const [selectedControversyId, setSelectedControversyId] = useState<string>(
    CANCER_RESEARCH_CONTROVERSIES[0].id
  );
  const [copiedStatus, setCopiedStatus] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentControversy =
    CANCER_RESEARCH_CONTROVERSIES.find((c) => c.id === selectedControversyId) ||
    CANCER_RESEARCH_CONTROVERSIES[0];

  const getLensBadgeColor = (lens: EpistemicLens) => {
    switch (lens) {
      case 'scientific':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'mathematical':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'philosophical':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'moral':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  const getControversyIcon = (id: string) => {
    switch (id) {
      case 'screening-and-overdiagnosis':
        return <Search className="w-4 h-4 text-emerald-400" />;
      case 'new-blood-tests-and-biopsies':
        return <Activity className="w-4 h-4 text-cyan-400" />;
      case 'precision-medicine-vs-complexity':
        return <Dna className="w-4 h-4 text-purple-400" />;
      case 'immunotherapy-evidence-and-endpoints':
        return <HeartPulse className="w-4 h-4 text-amber-400" />;
      case 'biology-disparities-and-priorities':
        return <Users className="w-4 h-4 text-rose-400" />;
      default:
        return <Scale className="w-4 h-4 text-indigo-400" />;
    }
  };

  const handleCopySynthesis = () => {
    const text = `CANER RESEARCH CONTROVERSY #${currentControversy.number}: ${currentControversy.title}
Central Debate: ${currentControversy.centralDebate}
Key Dilemma: ${currentControversy.keyDilemma}

PROPONENT POSITION: ${currentControversy.proponentPosition.title}
Claim: ${currentControversy.proponentPosition.claim}
Key Arguments:
${currentControversy.proponentPosition.keyArguments.map((a) => `- ${a}`).join('\n')}
Evidence Standard: ${currentControversy.proponentPosition.evidenceStandards}

SKEPTIC POSITION: ${currentControversy.skepticPosition.title}
Claim: ${currentControversy.skepticPosition.claim}
Key Arguments:
${currentControversy.skepticPosition.keyArguments.map((a) => `- ${a}`).join('\n')}
Evidence Standard: ${currentControversy.skepticPosition.evidenceStandards}

METHODOLOGICAL CHALLENGE: ${currentControversy.methodologicalChallenge.title}
${currentControversy.methodologicalChallenge.description}
Nuance: ${currentControversy.methodologicalChallenge.keyNuance}`;

    navigator.clipboard.writeText(text);
    setCopiedStatus('Copied to clipboard!');
    setTimeout(() => setCopiedStatus(null), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-6xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center">
              <Scale className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-slate-100">
                  5 Live Controversies in Cancer Research
                </h2>
                <span className="px-2 py-0.5 text-xs font-mono rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  EPISTEMIC ARENA
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Investigating how researchers weigh uncertain benefits, downstream harms, biological complexity, evidence standards, and fairness
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Controversy Selector Pills / Tabs */}
        <div className="px-6 py-3 bg-slate-950/40 border-b border-slate-800/80 flex items-center gap-2 overflow-x-auto no-scrollbar flex-shrink-0">
          {CANCER_RESEARCH_CONTROVERSIES.map((item) => {
            const isSelected = item.id === currentControversy.id;
            return (
              <button
                key={item.id}
                onClick={() => setSelectedControversyId(item.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all border ${
                  isSelected
                    ? 'bg-indigo-600/20 text-indigo-200 border-indigo-500/40 shadow-sm shadow-indigo-950'
                    : 'bg-slate-800/40 text-slate-400 border-slate-800 hover:text-slate-200 hover:bg-slate-800/70'
                }`}
              >
                <span className="w-4 h-4 flex items-center justify-center rounded-full bg-slate-800 text-[10px] font-mono text-slate-300">
                  {item.number}
                </span>
                {getControversyIcon(item.id)}
                <span>{item.shortTitle}</span>
              </button>
            );
          })}
        </div>

        {/* Main Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Main Title & Key Dilemma Banner */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-slate-800 relative overflow-hidden">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2 max-w-4xl">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    CONTROVERSY #{currentControversy.number}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    {currentControversy.tagline}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-slate-100">
                  {currentControversy.title}
                </h3>
                <div className="p-3.5 rounded-xl bg-indigo-950/30 border border-indigo-500/20">
                  <p className="text-sm font-semibold text-indigo-200">
                    {currentControversy.centralDebate}
                  </p>
                  <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                    {currentControversy.keyDilemma}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2 flex-shrink-0">
                <button
                  onClick={() => {
                    onSelectControversy(currentControversy);
                    onClose();
                  }}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg shadow-indigo-900/30 transition-all hover:scale-[1.02]"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Launch Live Debate</span>
                </button>
                <button
                  onClick={() => {
                    onApplyResearchBrief(currentControversy.researchBriefTemplate);
                    setCopiedStatus('Applied Research Brief!');
                    setTimeout(() => setCopiedStatus(null), 2500);
                  }}
                  className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
                >
                  <FileText className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Load Research Brief</span>
                </button>
                <button
                  onClick={handleCopySynthesis}
                  className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-medium bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedStatus || 'Copy Synthesis'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Proponent vs Skeptic Side-by-Side Arena */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Proponent Position Card */}
            <div className="p-5 rounded-2xl bg-slate-950/70 border border-emerald-500/20 hover:border-emerald-500/30 transition-all flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-emerald-500/20">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50" />
                    <span className="text-xs font-mono uppercase tracking-wider text-emerald-400 font-semibold">
                      Proponent / Implementation Thesis
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">Position A</span>
                </div>
                <h4 className="text-sm font-bold text-slate-100 mt-3">
                  {currentControversy.proponentPosition.title}
                </h4>
                <p className="text-xs text-slate-300 mt-2 leading-relaxed bg-slate-900/80 p-3 rounded-xl border border-slate-800/80">
                  "{currentControversy.proponentPosition.claim}"
                </p>
                <div className="mt-3 space-y-2">
                  <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                    Key Supporting Arguments:
                  </span>
                  <ul className="space-y-1.5 text-xs text-slate-300">
                    {currentControversy.proponentPosition.keyArguments.map((arg, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 flex-shrink-0" />
                        <span>{arg}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800/80">
                <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
                  Required Evidence Standard:
                </span>
                <p className="text-xs text-emerald-300/90 italic">
                  {currentControversy.proponentPosition.evidenceStandards}
                </p>
              </div>
            </div>

            {/* Skeptic Position Card */}
            <div className="p-5 rounded-2xl bg-slate-950/70 border border-rose-500/20 hover:border-rose-500/30 transition-all flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-rose-500/20">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-400 shadow-sm shadow-rose-400/50" />
                    <span className="text-xs font-mono uppercase tracking-wider text-rose-400 font-semibold">
                      Skeptic / Harm-Reduction Paradigm
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">Position B</span>
                </div>
                <h4 className="text-sm font-bold text-slate-100 mt-3">
                  {currentControversy.skepticPosition.title}
                </h4>
                <p className="text-xs text-slate-300 mt-2 leading-relaxed bg-slate-900/80 p-3 rounded-xl border border-slate-800/80">
                  "{currentControversy.skepticPosition.claim}"
                </p>
                <div className="mt-3 space-y-2">
                  <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                    Key Critical Arguments:
                  </span>
                  <ul className="space-y-1.5 text-xs text-slate-300">
                    {currentControversy.skepticPosition.keyArguments.map((arg, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-400 mt-0.5 flex-shrink-0" />
                        <span>{arg}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800/80">
                <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
                  Required Evidence Standard:
                </span>
                <p className="text-xs text-rose-300/90 italic">
                  {currentControversy.skepticPosition.evidenceStandards}
                </p>
              </div>
            </div>
          </div>

          {/* Methodological Challenge Deep Dive Card */}
          <div className="p-5 rounded-2xl bg-amber-950/20 border border-amber-500/20 space-y-3">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <h4 className="text-xs font-mono uppercase tracking-wider text-amber-300 font-semibold">
                Methodological Bottleneck: {currentControversy.methodologicalChallenge.title}
              </h4>
              <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 ml-auto">
                {currentControversy.methodologicalChallenge.bottleneckType}
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {currentControversy.methodologicalChallenge.description}
            </p>
            <div className="p-3 rounded-xl bg-slate-900/90 border border-amber-500/10">
              <span className="text-[11px] font-mono text-amber-400 font-semibold block mb-1">
                Crucial Analytical Nuance:
              </span>
              <p className="text-xs text-slate-300 italic">
                {currentControversy.methodologicalChallenge.keyNuance}
              </p>
            </div>
          </div>

          {/* Clinical Settings & Real-World Examples */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-400" />
                <h4 className="text-xs font-mono uppercase tracking-wider text-slate-300 font-semibold">
                  Key Clinical Settings Under Debate
                </h4>
              </div>
              <ul className="space-y-1.5 text-xs text-slate-300">
                {currentControversy.clinicalSettings.map((setting, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <ChevronRight className="w-3.5 h-3.5 text-indigo-400 mt-0.5 flex-shrink-0" />
                    <span>{setting}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <h4 className="text-xs font-mono uppercase tracking-wider text-slate-300 font-semibold">
                  Empirical Case Studies & Historical Precedents
                </h4>
              </div>
              <ul className="space-y-2 text-xs text-slate-300">
                {currentControversy.specificExamples.map((example, idx) => (
                  <li key={idx} className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 leading-relaxed">
                    {example}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Quad-Lens Epistemic Grounding Matrix */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold">
                Quad-Lens Epistemic Deconstruction
              </h4>
              <span className="text-[11px] font-mono text-indigo-400">
                Scientific • Mathematical • Philosophical • Moral
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {/* Scientific Lens */}
              <div className="p-4 rounded-2xl bg-blue-950/20 border border-blue-500/20 space-y-2">
                <div className="flex items-center gap-1.5 text-blue-400">
                  <Dna className="w-3.5 h-3.5" />
                  <span className="text-xs font-mono uppercase font-semibold">Scientific Lens</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {currentControversy.epistemicLenses.scientific}
                </p>
              </div>

              {/* Mathematical Lens */}
              <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-500/20 space-y-2">
                <div className="flex items-center gap-1.5 text-amber-400">
                  <Activity className="w-3.5 h-3.5" />
                  <span className="text-xs font-mono uppercase font-semibold">Mathematical Lens</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {currentControversy.epistemicLenses.mathematical}
                </p>
              </div>

              {/* Philosophical Lens */}
              <div className="p-4 rounded-2xl bg-purple-950/20 border border-purple-500/20 space-y-2">
                <div className="flex items-center gap-1.5 text-purple-400">
                  <Scale className="w-3.5 h-3.5" />
                  <span className="text-xs font-mono uppercase font-semibold">Philosophical Lens</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {currentControversy.epistemicLenses.philosophical}
                </p>
              </div>

              {/* Moral Lens */}
              <div className="p-4 rounded-2xl bg-rose-950/20 border border-rose-500/20 space-y-2">
                <div className="flex items-center gap-1.5 text-rose-400">
                  <HeartPulse className="w-3.5 h-3.5" />
                  <span className="text-xs font-mono uppercase font-semibold">Moral Lens</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {currentControversy.epistemicLenses.moral}
                </p>
              </div>
            </div>
          </div>

          {/* Recommended Personas for This Controversy */}
          <div className="space-y-3">
            <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold">
              Calibrated Multi-Agent Personas for this Controversy
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {currentControversy.recommendedPersonas.map((p, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200">{p.role}</span>
                    <span
                      className={`px-2 py-0.5 text-[10px] font-mono rounded border ${getLensBadgeColor(
                        p.primaryLens
                      )}`}
                    >
                      {p.primaryLens}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    {p.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Pre-Registered Research Brief Preview */}
          <div className="p-5 rounded-2xl bg-slate-950/90 border border-indigo-500/20 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-400" />
                <h4 className="text-xs font-mono uppercase tracking-wider text-indigo-300 font-semibold">
                  Pre-Registered Research Brief Specification
                </h4>
              </div>
              <span className="text-xs font-mono text-slate-400">
                Preregistered Empirical Standard
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
                  Target Population / Biological System:
                </span>
                <p className="text-slate-300">
                  {currentControversy.researchBriefTemplate.population_or_system}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
                  Primary Outcome Metric:
                </span>
                <p className="text-slate-300">
                  {currentControversy.researchBriefTemplate.primary_outcome}
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
                Falsifiable Success Criterion:
              </span>
              <p className="text-xs text-indigo-200 font-mono">
                {currentControversy.researchBriefTemplate.success_criterion}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Scale className="w-4 h-4 text-indigo-400" />
            <span>Select any of the 5 controversies to load calibrated hypotheses and stance cards.</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              Close Explorer
            </button>
            <button
              onClick={() => {
                onSelectControversy(currentControversy);
                onClose();
              }}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-900/40 transition-all hover:scale-[1.02]"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Launch Debate on Controversy #{currentControversy.number}</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
