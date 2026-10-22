import React, { useState } from 'react';
import { DebatePreset, TUMOR_RESEARCH_QUESTIONS_8, CANCER_RESEARCH_CONTROVERSIES } from '../data/presets';
import { TumorResearchQuestion, StanceCard, CancerControversy } from '../types';
import {
  X,
  BookOpen,
  ExternalLink,
  Dna,
  Calculator,
  Compass,
  Scale,
  Sparkles,
  Table,
  GitBranch,
  HelpCircle,
  ArrowRight,
  Send,
  Flame,
  ShieldCheck,
  CheckCircle2,
  Filter,
  AlertTriangle,
  HeartPulse,
  Users,
  Activity,
  Search,
} from 'lucide-react';

interface EvidenceExplorerModalProps {
  preset: DebatePreset;
  isOpen: boolean;
  onClose: () => void;
  onInjectEvidence?: (summary: string) => void;
  onSelectDebateQuestion?: (questionText: string, customStances?: StanceCard[]) => void;
}

export default function EvidenceExplorerModal({
  preset,
  isOpen,
  onClose,
  onInjectEvidence,
  onSelectDebateQuestion,
}: EvidenceExplorerModalProps) {
  const controversies: CancerControversy[] = preset.controversies || CANCER_RESEARCH_CONTROVERSIES;
  const tumorQuestions: TumorResearchQuestion[] = preset.tumorQuestions || TUMOR_RESEARCH_QUESTIONS_8;
  const hardestQuestions = preset.hardestQuestions || [];
  const chain = preset.interconnectedChain || [];
  const briefs = preset.evidenceBriefs || [];
  const forecast = preset.forecastTable || [];

  const [activeTab, setActiveTab] = useState<'5controversies' | '8tumor' | '5questions' | 'chain' | 'frontiers' | 'forecast' | 'raw'>('5controversies');
  const [selectedControversyIdx, setSelectedControversyIdx] = useState<number>(0);
  const [selectedTumorIdx, setSelectedTumorIdx] = useState<number>(0);
  const [selectedQuestionIdx, setSelectedQuestionIdx] = useState<number>(0);
  const [selectedFieldIdx, setSelectedFieldIdx] = useState<number>(0);
  const [filterCategory, setFilterCategory] = useState<string>('all');

  if (!isOpen) return null;

  const currentControversy = controversies[selectedControversyIdx] || controversies[0];
  const currentTumorQ = tumorQuestions[selectedTumorIdx] || tumorQuestions[0];
  const categories = ['all', ...Array.from(new Set(tumorQuestions.map((q) => q.category)))];
  const filteredTumorQuestions = filterCategory === 'all' 
    ? tumorQuestions 
    : tumorQuestions.filter((q) => q.category === filterCategory);

  const handleLaunchControversyDebate = (c: CancerControversy) => {
    if (onSelectDebateQuestion) {
      const topic = `Debating Cancer Research Controversy #${c.number}: ${c.title}`;
      const stances: StanceCard[] = [
        {
          id: `sc-controv-${c.number}-posA`,
          title: `Thesis: ${c.proponentPosition.title}`,
          claim: c.proponentPosition.claim,
          reasoning: c.proponentPosition.keyArguments[0] || 'Supported by trial detection yield',
          confidence: 85,
          isActive: true,
          lens: 'scientific',
        },
        {
          id: `sc-controv-${c.number}-posB`,
          title: `Counter-Thesis: ${c.skepticPosition.title}`,
          claim: c.skepticPosition.claim,
          reasoning: c.skepticPosition.keyArguments[0] || 'Evidence standards require all-cause mortality benefit',
          confidence: 85,
          isActive: true,
          lens: 'mathematical',
        },
        {
          id: `sc-controv-${c.number}-method`,
          title: `Methodological & Bioethical Standard`,
          claim: `${c.methodologicalChallenge.title}: ${c.methodologicalChallenge.keyNuance}`,
          reasoning: `${c.epistemicLenses.philosophical} — ${c.epistemicLenses.moral}`,
          confidence: 90,
          isActive: true,
          lens: 'moral',
        },
      ];
      onSelectDebateQuestion(topic, stances);
      onClose();
    }
  };

  const handleLaunchDedicatedDebate = (q: TumorResearchQuestion) => {
    if (onSelectDebateQuestion) {
      const topic = `Debating Oncology Dilemma #${q.number}: ${q.question}`;
      const defaultStances: StanceCard[] = [
        {
          id: `sc-q${q.number}-posA`,
          title: `Thesis: ${q.positionA.title}`,
          claim: q.positionA.claim,
          reasoning: `Supported by evidence in ${q.citations[0] || 'primary literature'}`,
          confidence: 85,
          isActive: true,
          lens: 'scientific',
        },
        {
          id: `sc-q${q.number}-posB`,
          title: `Counter-Thesis: ${q.positionB.title}`,
          claim: q.positionB.claim,
          reasoning: `Supported by mechanistic data in ${q.citations[1] || q.citations[0]}`,
          confidence: 85,
          isActive: true,
          lens: 'mathematical',
        },
        {
          id: `sc-q${q.number}-lens`,
          title: `Epistemic & Clinical Synthesis`,
          claim: `Resolving this requires: ${q.whyItMatters}`,
          reasoning: `${q.philosophicalLens} — ${q.moralLens}`,
          confidence: 90,
          isActive: true,
          lens: 'moral',
        },
      ];
      onSelectDebateQuestion(topic, defaultStances);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-[#0F0F12] border border-slate-700 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden font-sans">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <BookOpen size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-mono text-sm font-bold text-white uppercase tracking-wider">
                  Quad-Lens Evidence Dossier & Grounding Synthesis
                </h3>
                <span className="text-[10px] font-mono text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                  {preset.badge || 'ONCOLOGY MATRIX'}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">{preset.name}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 px-6 py-2.5 bg-slate-950/70 border-b border-slate-800 font-mono text-xs overflow-x-auto">
          <button
            onClick={() => setActiveTab('5controversies')}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 shrink-0 ${
              activeTab === '5controversies'
                ? 'bg-indigo-600 text-white font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Scale size={13} className="text-indigo-400" />
            5_LIVE_CONTROVERSIES
          </button>

          <button
            onClick={() => setActiveTab('8tumor')}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 shrink-0 ${
              activeTab === '8tumor'
                ? 'bg-blue-600 text-white font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Flame size={13} className="text-amber-400" />
            8_TUMOR_RESEARCH_DILEMMAS
          </button>

          {hardestQuestions.length > 0 && (
            <button
              onClick={() => setActiveTab('5questions')}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 shrink-0 ${
                activeTab === '5questions'
                  ? 'bg-blue-600 text-white font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <HelpCircle size={13} />
              5_HARDEST_QUESTIONS_SYNTHESIS
            </button>
          )}

          {chain.length > 0 && (
            <button
              onClick={() => setActiveTab('chain')}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 shrink-0 ${
                activeTab === 'chain'
                  ? 'bg-blue-600 text-white font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <GitBranch size={13} />
              PROGRESSION_CHAIN
            </button>
          )}

          {briefs.length > 0 && (
            <button
              onClick={() => setActiveTab('frontiers')}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 shrink-0 ${
                activeTab === 'frontiers'
                  ? 'bg-blue-600 text-white font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Dna size={13} />
              RESEARCH_FRONTIERS
            </button>
          )}

          {forecast.length > 0 && (
            <button
              onClick={() => setActiveTab('forecast')}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 shrink-0 ${
                activeTab === 'forecast'
                  ? 'bg-blue-600 text-white font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Table size={13} />
              5_YEAR_FORECAST_TABLE
            </button>
          )}

          <button
            onClick={() => setActiveTab('raw')}
            className={`px-3 py-1.5 rounded-lg transition shrink-0 ${
              activeTab === 'raw'
                ? 'bg-blue-600 text-white font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            RAW_GROUNDING_TEXT
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6">
          {/* TAB: 5 LIVE CONTROVERSIES */}
          {activeTab === '5controversies' && (
            <div className="space-y-6">
              {/* Header Banner */}
              <div className="p-4 rounded-xl bg-indigo-950/30 border border-indigo-500/20 flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <h4 className="text-xs font-mono font-bold text-indigo-300 uppercase tracking-wider">
                    5 Live Controversies in Contemporary Cancer Research
                  </h4>
                  <p className="text-xs text-slate-300 mt-1">
                    Examining deep disputes where technologies outpace empirical proof of patient survival or quality of life
                  </p>
                </div>
                <button
                  onClick={() => handleLaunchControversyDebate(currentControversy)}
                  className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-mono font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-950 transition"
                >
                  <ArrowRight size={13} />
                  Launch Debate on Controversy #{currentControversy.number}
                </button>
              </div>

              {/* Two-Column Selector and Detail View */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                {/* 5 Controversies Selector */}
                <div className="md:col-span-4 space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                  {controversies.map((c, idx) => {
                    const isSelected = selectedControversyIdx === idx;
                    return (
                      <button
                        key={c.id}
                        onClick={() => setSelectedControversyIdx(idx)}
                        className={`w-full text-left p-3.5 rounded-xl border transition-all flex flex-col gap-1.5 ${
                          isSelected
                            ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-md'
                            : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:bg-slate-900'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-800 text-indigo-300 border border-slate-700">
                            CONTROVERSY #{c.number}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">
                            {c.methodologicalChallenge.bottleneckType}
                          </span>
                        </div>
                        <span className="text-xs font-bold text-slate-200 line-clamp-1">
                          {c.shortTitle}
                        </span>
                        <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                          {c.centralDebate}
                        </p>
                      </button>
                    );
                  })}
                </div>

                {/* Selected Controversy Deep Dive */}
                <div className="md:col-span-8 space-y-4">
                  <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="text-[10px] font-mono text-indigo-400 uppercase tracking-wider">
                          CONTROVERSY #{currentControversy.number} • {currentControversy.tagline}
                        </span>
                        <h3 className="text-base font-bold text-white mt-1">
                          {currentControversy.title}
                        </h3>
                      </div>
                      <button
                        onClick={() => handleLaunchControversyDebate(currentControversy)}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-mono font-bold rounded-lg flex items-center gap-1.5 transition shrink-0"
                      >
                        Launch
                      </button>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                      <span className="text-[11px] font-mono font-bold text-amber-400 block mb-1">
                        Central Debate:
                      </span>
                      <p className="text-xs text-slate-200 font-medium">
                        {currentControversy.centralDebate}
                      </p>
                      <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                        {currentControversy.keyDilemma}
                      </p>
                    </div>

                    {/* Proponent vs Skeptic Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      {/* Proponent */}
                      <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/20 space-y-2">
                        <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-mono font-bold">
                          <CheckCircle2 size={13} />
                          <span>Proponent: {currentControversy.proponentPosition.title}</span>
                        </div>
                        <p className="text-xs text-slate-300 italic">
                          "{currentControversy.proponentPosition.claim}"
                        </p>
                        <span className="text-[10px] font-mono text-emerald-300/80 block mt-1">
                          Standard: {currentControversy.proponentPosition.evidenceStandards}
                        </span>
                      </div>

                      {/* Skeptic */}
                      <div className="p-3 rounded-xl bg-rose-950/20 border border-rose-500/20 space-y-2">
                        <div className="flex items-center gap-1.5 text-rose-400 text-xs font-mono font-bold">
                          <AlertTriangle size={13} />
                          <span>Skeptic: {currentControversy.skepticPosition.title}</span>
                        </div>
                        <p className="text-xs text-slate-300 italic">
                          "{currentControversy.skepticPosition.claim}"
                        </p>
                        <span className="text-[10px] font-mono text-rose-300/80 block mt-1">
                          Standard: {currentControversy.skepticPosition.evidenceStandards}
                        </span>
                      </div>
                    </div>

                    {/* Methodological Challenge Box */}
                    <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/20 space-y-1.5">
                      <span className="text-[11px] font-mono font-bold text-amber-300 uppercase block">
                        Methodological Challenge: {currentControversy.methodologicalChallenge.title}
                      </span>
                      <p className="text-xs text-slate-300">
                        {currentControversy.methodologicalChallenge.description}
                      </p>
                      <p className="text-xs text-amber-200/90 italic font-mono pt-1">
                        Nuance: {currentControversy.methodologicalChallenge.keyNuance}
                      </p>
                    </div>

                    {/* Quad-Lens Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs">
                      <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                        <span className="text-[10px] font-mono text-blue-400 font-bold block mb-1">
                          Scientific Lens:
                        </span>
                        <p className="text-slate-300 text-[11px] leading-relaxed">
                          {currentControversy.epistemicLenses.scientific}
                        </p>
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                        <span className="text-[10px] font-mono text-amber-400 font-bold block mb-1">
                          Mathematical Lens:
                        </span>
                        <p className="text-slate-300 text-[11px] leading-relaxed">
                          {currentControversy.epistemicLenses.mathematical}
                        </p>
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                        <span className="text-[10px] font-mono text-purple-400 font-bold block mb-1">
                          Philosophical Lens:
                        </span>
                        <p className="text-slate-300 text-[11px] leading-relaxed">
                          {currentControversy.epistemicLenses.philosophical}
                        </p>
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                        <span className="text-[10px] font-mono text-rose-400 font-bold block mb-1">
                          Moral Lens:
                        </span>
                        <p className="text-slate-300 text-[11px] leading-relaxed">
                          {currentControversy.epistemicLenses.moral}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          {/* TAB 0: 8 TUMOR RESEARCH DILEMMAS */}
          {activeTab === '8tumor' && (
            <div className="space-y-6">
              {/* Category Filter Bar */}
              <div className="flex items-center justify-between gap-3 flex-wrap bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                <div className="flex items-center gap-2">
                  <Filter size={14} className="text-blue-400" />
                  <span className="text-[11px] font-mono font-bold text-slate-300 uppercase">
                    Filter by Biological Domain:
                  </span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setFilterCategory(cat)}
                      className={`text-[10px] font-mono px-2.5 py-1 rounded-lg border transition ${
                        filterCategory === cat
                          ? 'bg-blue-600 text-white border-blue-500 font-bold'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {cat === 'all' ? 'All 8 Dilemmas' : cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Two-column layout: 8 Questions list + In-depth analysis */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                {/* 8 Questions selector list */}
                <div className="md:col-span-4 space-y-2 max-h-[65vh] overflow-y-auto pr-1">
                  <span className="text-[10px] uppercase font-mono font-bold text-slate-400 block sticky top-0 bg-[#0F0F12] pb-1 z-10">
                    Tumor Research Questions ({filteredTumorQuestions.length})
                  </span>
                  {filteredTumorQuestions.map((q) => {
                    const originalIdx = tumorQuestions.findIndex((item) => item.number === q.number);
                    const isSelected = selectedTumorIdx === originalIdx;
                    return (
                      <button
                        key={q.number}
                        onClick={() => setSelectedTumorIdx(originalIdx)}
                        className={`w-full text-left p-3 rounded-xl border transition flex flex-col gap-1.5 ${
                          isSelected
                            ? 'bg-blue-500/10 border-blue-500/50 shadow-md ring-1 ring-blue-500/20'
                            : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <span className="w-5 h-5 rounded bg-slate-800 text-amber-400 font-mono text-[10px] font-bold flex items-center justify-center shrink-0 border border-slate-700 mt-0.5">
                            {q.number}
                          </span>
                          <div>
                            <span className="text-[10px] font-mono text-blue-400 uppercase block font-semibold">
                              {q.category}
                            </span>
                            <span className="font-mono text-xs font-bold text-slate-200 line-clamp-2 leading-tight">
                              {q.shortTitle}
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* In-Depth Question Quad-Lens Analysis */}
                {currentTumorQ && (
                  <div className="md:col-span-8 bg-slate-900/70 border border-slate-800 rounded-xl p-5 space-y-5">
                    {/* Header with question number and action */}
                    <div className="border-b border-slate-800 pb-3 flex items-start justify-between gap-4 flex-wrap">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-[10px] font-mono font-bold text-amber-400 uppercase">
                          <span>QUESTION #{currentTumorQ.number}</span>
                          <span>//</span>
                          <span className="text-blue-400">{currentTumorQ.category}</span>
                        </div>
                        <h4 className="text-base font-bold text-white leading-snug">
                          {currentTumorQ.question}
                        </h4>
                      </div>

                      {onSelectDebateQuestion && (
                        <button
                          onClick={() => handleLaunchDedicatedDebate(currentTumorQ)}
                          className="px-3.5 py-1.5 bg-gradient-to-r from-amber-600 to-blue-600 hover:from-amber-500 hover:to-blue-500 text-white rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 shadow-md transition shrink-0"
                        >
                          <Flame size={12} />
                          Debate This Dilemma
                        </button>
                      )}
                    </div>

                    {/* Competing Positions Breakdown */}
                    <div className="space-y-2">
                      <span className="text-[10px] uppercase font-mono font-bold text-slate-400 block tracking-wider">
                        The Competing Theoretical Positions:
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Position A */}
                        <div className="bg-slate-950/70 border border-amber-500/30 p-3.5 rounded-lg space-y-1.5 relative overflow-hidden">
                          <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-amber-400 uppercase">
                            <span className="w-4 h-4 rounded bg-amber-500/20 text-amber-300 flex items-center justify-center text-[9px]">
                              A
                            </span>
                            {currentTumorQ.positionA.title}
                          </div>
                          <p className="text-xs text-slate-300 leading-relaxed font-sans">
                            {currentTumorQ.positionA.claim}
                          </p>
                        </div>

                        {/* Position B */}
                        <div className="bg-slate-950/70 border border-cyan-500/30 p-3.5 rounded-lg space-y-1.5 relative overflow-hidden">
                          <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-cyan-400 uppercase">
                            <span className="w-4 h-4 rounded bg-cyan-500/20 text-cyan-300 flex items-center justify-center text-[9px]">
                              B
                            </span>
                            {currentTumorQ.positionB.title}
                          </div>
                          <p className="text-xs text-slate-300 leading-relaxed font-sans">
                            {currentTumorQ.positionB.claim}
                          </p>
                        </div>

                        {/* Position C if present */}
                        {currentTumorQ.positionC && (
                          <div className="sm:col-span-2 bg-slate-950/70 border border-purple-500/30 p-3.5 rounded-lg space-y-1.5">
                            <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-purple-400 uppercase">
                              <span className="w-4 h-4 rounded bg-purple-500/20 text-purple-300 flex items-center justify-center text-[9px]">
                                C
                              </span>
                              {currentTumorQ.positionC.title}
                            </div>
                            <p className="text-xs text-slate-300 leading-relaxed font-sans">
                              {currentTumorQ.positionC.claim}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Why Resolving It Matters (Clinical & Translational Impact) */}
                    <div className="bg-emerald-500/5 border border-emerald-500/25 p-3.5 rounded-lg space-y-1">
                      <div className="flex items-center gap-1.5 text-[10px] uppercase font-mono font-bold text-emerald-400">
                        <CheckCircle2 size={12} />
                        Why Resolving This Dilemma Matters:
                      </div>
                      <p className="text-xs text-slate-200 leading-relaxed font-sans font-medium">
                        {currentTumorQ.whyItMatters}
                      </p>
                    </div>

                    {/* 4 Epistemic Lenses */}
                    <div className="space-y-3 pt-1">
                      <span className="text-[10px] uppercase font-mono font-bold text-slate-400 block tracking-wider">
                        Quad-Lens Epistemic Deconstruction:
                      </span>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Scientific */}
                        <div className="bg-cyan-500/5 border border-cyan-500/20 p-3 rounded-lg space-y-1">
                          <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-cyan-300 uppercase">
                            <Dna size={12} />
                            Scientific / Molecular Lens
                          </div>
                          <p className="text-xs text-slate-300 leading-relaxed font-sans">
                            {currentTumorQ.scientificLens}
                          </p>
                        </div>

                        {/* Mathematical */}
                        <div className="bg-amber-500/5 border border-amber-500/20 p-3 rounded-lg space-y-1">
                          <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-amber-300 uppercase">
                            <Calculator size={12} />
                            Mathematical / Dynamical Models
                          </div>
                          <p className="text-xs text-slate-300 leading-relaxed font-mono font-sans">
                            {currentTumorQ.mathematicalLens}
                          </p>
                        </div>

                        {/* Philosophical */}
                        <div className="bg-purple-500/5 border border-purple-500/20 p-3 rounded-lg space-y-1">
                          <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-purple-300 uppercase">
                            <Compass size={12} />
                            Philosophical & Epistemological Lens
                          </div>
                          <p className="text-xs text-slate-300 leading-relaxed font-sans">
                            {currentTumorQ.philosophicalLens}
                          </p>
                        </div>

                        {/* Moral */}
                        <div className="bg-rose-500/5 border border-rose-500/20 p-3 rounded-lg space-y-1">
                          <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-rose-300 uppercase">
                            <Scale size={12} />
                            Moral, Bioethical & QALY Lens
                          </div>
                          <p className="text-xs text-slate-300 leading-relaxed font-sans">
                            {currentTumorQ.moralLens}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Citations & Inject Button */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-800 flex-wrap gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-mono text-slate-500 uppercase">Grounding Citations:</span>
                        {currentTumorQ.citations.map((cite, cIdx) => (
                          <span
                            key={cIdx}
                            className="text-[10px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded flex items-center gap-1 border border-slate-700"
                          >
                            <ExternalLink size={9} />
                            {cite}
                          </span>
                        ))}
                      </div>

                      {onInjectEvidence && (
                        <button
                          onClick={() => {
                            const summary = `Focusing on Dilemma #${currentTumorQ.number} ("${currentTumorQ.question}"): Position A (${currentTumorQ.positionA.title}) vs Position B (${currentTumorQ.positionB.title}). Clinical impact: ${currentTumorQ.whyItMatters}. Mathematical context: ${currentTumorQ.mathematicalLens}.`;
                            onInjectEvidence(summary);
                            onClose();
                          }}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition"
                        >
                          <Send size={12} />
                          Inject Into Debate
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 1: 5 HARDEST QUESTIONS SYNTHESIS */}
          {activeTab === '5questions' && hardestQuestions.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Question Selector List */}
              <div className="md:col-span-4 space-y-2">
                <span className="text-[10px] uppercase font-mono font-bold text-slate-400 block">
                  Select Hardest Question (1 - 5)
                </span>
                {hardestQuestions.map((q, idx) => (
                  <button
                    key={q.number}
                    onClick={() => setSelectedQuestionIdx(idx)}
                    className={`w-full text-left p-3 rounded-xl border transition flex flex-col gap-1.5 ${
                      selectedQuestionIdx === idx
                        ? 'bg-blue-500/10 border-blue-500/50 shadow-md ring-1 ring-blue-500/20'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded bg-slate-800 text-blue-400 font-mono text-[10px] font-bold flex items-center justify-center shrink-0 border border-slate-700">
                        {q.number}
                      </span>
                      <span className="font-mono text-xs font-bold text-slate-200 line-clamp-2 leading-tight">
                        {q.question}
                      </span>
                    </div>
                  </button>
                ))}
              </div>

              {/* In-Depth Question Quad-Lens Analysis */}
              {hardestQuestions[selectedQuestionIdx] && (
                <div className="md:col-span-8 bg-slate-900/70 border border-slate-800 rounded-xl p-5 space-y-5">
                  <div className="border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2 text-[10px] font-mono font-bold text-blue-400 uppercase">
                      <span>QUESTION #{hardestQuestions[selectedQuestionIdx].number}</span>
                      <span>//</span>
                      <span className="text-emerald-400">GRAND CHALLENGE</span>
                    </div>
                    <h4 className="text-base font-bold text-white mt-1 leading-snug">
                      {hardestQuestions[selectedQuestionIdx].question}
                    </h4>
                  </div>

                  {/* Why it's difficult & Why it matters */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="bg-slate-950/60 border border-slate-800/80 p-3 rounded-lg space-y-1">
                      <span className="text-[10px] uppercase font-mono font-bold text-rose-400 block">
                        Why It Is So Difficult:
                      </span>
                      <p className="text-xs text-slate-300 leading-relaxed font-sans">
                        {hardestQuestions[selectedQuestionIdx].difficultyCause}
                      </p>
                    </div>

                    <div className="bg-slate-950/60 border border-slate-800/80 p-3 rounded-lg space-y-1">
                      <span className="text-[10px] uppercase font-mono font-bold text-emerald-400 block">
                        Why An Answer Matters:
                      </span>
                      <p className="text-xs text-slate-300 leading-relaxed font-sans">
                        {hardestQuestions[selectedQuestionIdx].impactWhyItMatters}
                      </p>
                    </div>
                  </div>

                  {/* 4 LENSES BREAKDOWN */}
                  <div className="space-y-3 pt-2">
                    <span className="text-[10px] uppercase font-mono font-bold text-slate-400 block tracking-wider">
                      Quad-Lens Epistemic Deconstruction:
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Scientific */}
                      <div className="bg-cyan-500/5 border border-cyan-500/20 p-3 rounded-lg space-y-1">
                        <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-cyan-300 uppercase">
                          <Dna size={12} />
                          Scientific & Molecular Lens
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed font-sans">
                          {hardestQuestions[selectedQuestionIdx].scientificLens}
                        </p>
                      </div>

                      {/* Mathematical */}
                      <div className="bg-amber-500/5 border border-amber-500/20 p-3 rounded-lg space-y-1">
                        <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-amber-300 uppercase">
                          <Calculator size={12} />
                          Mathematical & Dynamical Lens
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed font-sans font-mono">
                          {hardestQuestions[selectedQuestionIdx].mathematicalLens}
                        </p>
                      </div>

                      {/* Philosophical */}
                      <div className="bg-purple-500/5 border border-purple-500/20 p-3 rounded-lg space-y-1">
                        <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-purple-300 uppercase">
                          <Compass size={12} />
                          Philosophical & Epistemological Lens
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed font-sans">
                          {hardestQuestions[selectedQuestionIdx].philosophicalLens}
                        </p>
                      </div>

                      {/* Moral */}
                      <div className="bg-rose-500/5 border border-rose-500/20 p-3 rounded-lg space-y-1">
                        <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-rose-300 uppercase">
                          <Scale size={12} />
                          Moral & Bioethical QALY Lens
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed font-sans">
                          {hardestQuestions[selectedQuestionIdx].moralLens}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Citations & Inject Button */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-800 flex-wrap gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-mono text-slate-500 uppercase">Grounding Citations:</span>
                      {hardestQuestions[selectedQuestionIdx].citations.map((cite, cIdx) => (
                        <span
                          key={cIdx}
                          className="text-[10px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded flex items-center gap-1 border border-slate-700"
                        >
                          <ExternalLink size={9} />
                          {cite}
                        </span>
                      ))}
                    </div>

                    {onInjectEvidence && (
                      <button
                        onClick={() => {
                          const q = hardestQuestions[selectedQuestionIdx];
                          const summary = `Focus on Question ${q.number}: "${q.question}". Consider the mathematical model (${q.mathematicalLens}) alongside the moral trade-off (${q.moralLens}).`;
                          onInjectEvidence(summary);
                          onClose();
                        }}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition"
                      >
                        <Send size={12} />
                        Inject Into Debate
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: PROGRESSION CHAIN */}
          {activeTab === 'chain' && chain.length > 0 && (
            <div className="space-y-6">
              <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4">
                <h4 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                  <GitBranch size={16} className="text-blue-400" />
                  The Oncological Progression Chain
                </h4>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  Cancer is an evolutionary continuum. The core research questions map sequentially across this causal chain, demonstrating why single-point interventions inevitably trigger resistance.
                </p>
              </div>

              <div className="space-y-3 relative">
                {chain.map((step) => (
                  <div
                    key={step.step}
                    className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-400 font-mono font-bold text-xs flex items-center justify-center shrink-0">
                        {step.step}
                      </div>
                      <div>
                        <h5 className="text-xs font-bold text-white font-mono">{step.title}</h5>
                        <p className="text-xs text-slate-300 mt-0.5">{step.description}</p>
                      </div>
                    </div>

                    <div className="bg-rose-500/5 border border-rose-500/20 px-3 py-2 rounded-lg text-[11px] font-mono text-rose-300 md:max-w-xs shrink-0">
                      <span className="text-[9px] uppercase font-bold text-rose-400 block">Critical Bottleneck:</span>
                      {step.bottleneck}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: RESEARCH FRONTIERS */}
          {activeTab === 'frontiers' && briefs.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <span className="text-[10px] uppercase font-mono font-bold text-slate-400 block">
                  Select Frontier Field
                </span>
                {briefs.map((b, idx) => (
                  <button
                    key={b.field}
                    onClick={() => setSelectedFieldIdx(idx)}
                    className={`w-full text-left p-3 rounded-xl border transition flex flex-col gap-1 ${
                      selectedFieldIdx === idx
                        ? 'bg-blue-500/10 border-blue-500/50 shadow-md ring-1 ring-blue-500/20'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <span className="text-[10px] font-mono text-blue-400 uppercase font-semibold">{b.tag}</span>
                    <span className="font-mono text-xs font-bold text-slate-200">{b.field}</span>
                  </button>
                ))}
              </div>

              {briefs[selectedFieldIdx] && (
                <div className="md:col-span-2 bg-slate-900/70 border border-slate-800 rounded-xl p-5 space-y-4">
                  <div>
                    <span className="text-[10px] font-mono text-blue-400 uppercase">
                      {briefs[selectedFieldIdx].tag}
                    </span>
                    <h4 className="text-sm font-bold text-white font-mono mt-0.5">
                      {briefs[selectedFieldIdx].field}
                    </h4>
                  </div>

                  <div className="space-y-2">
                    <span className="text-[10px] uppercase font-mono font-bold text-slate-400 block">
                      Mechanistic Synthesis:
                    </span>
                    <p className="text-xs text-slate-300 leading-relaxed font-sans">
                      {briefs[selectedFieldIdx].summary}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <span className="text-[10px] uppercase font-mono font-bold text-blue-400 block">
                      AI Status & Model Limitations:
                    </span>
                    <div className="text-xs text-blue-200 bg-blue-500/5 border border-blue-500/20 p-3 rounded-lg leading-relaxed font-mono">
                      {briefs[selectedFieldIdx].aiStatus}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800 flex-wrap gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-mono text-slate-500 uppercase">Citations:</span>
                      {briefs[selectedFieldIdx].citations.map((cite, cIdx) => (
                        <span
                          key={cIdx}
                          className="text-[10px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded flex items-center gap-1 border border-slate-700"
                        >
                          <ExternalLink size={9} />
                          {cite}
                        </span>
                      ))}
                    </div>

                    {onInjectEvidence && (
                      <button
                        onClick={() => {
                          onInjectEvidence(
                            `Injecting research on ${briefs[selectedFieldIdx].field}: ${briefs[selectedFieldIdx].summary}`
                          );
                          onClose();
                        }}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition"
                      >
                        <Send size={12} />
                        Inject To Debate
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: FORECAST TABLE */}
          {activeTab === 'forecast' && forecast.length > 0 && (
            <div className="space-y-3">
              <span className="text-[10px] uppercase font-mono font-bold text-slate-400 block">
                5-Year Clinical & Technological Horizon
              </span>
              <div className="overflow-x-auto border border-slate-800 rounded-xl">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-900 text-slate-400 border-b border-slate-800 text-[10px] uppercase">
                    <tr>
                      <th className="p-3">Field / Dimension</th>
                      <th className="p-3">Key Development & Horizon</th>
                      <th className="p-3">AI / Computational Role</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 bg-slate-950/40">
                    {forecast.map((f, i) => (
                      <tr key={i} className="hover:bg-slate-900/40">
                        <td className="p-3 font-bold text-slate-200 whitespace-nowrap">{f.field}</td>
                        <td className="p-3 text-slate-300 font-sans">{f.development}</td>
                        <td className="p-3 text-blue-400">{f.aiRole}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: RAW GROUNDING TEXT */}
          {activeTab === 'raw' && (
            <div className="space-y-3">
              <span className="text-[10px] uppercase font-mono font-bold text-slate-400 block">
                Complete Grounding Text Fed to LLM Personas
              </span>
              <pre className="text-[11px] font-mono text-slate-300 bg-slate-950 p-4 rounded-xl border border-slate-800 whitespace-pre-wrap leading-relaxed max-h-[60vh] overflow-y-auto">
                {preset.materials}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
