import React, { useState } from 'react';
import {
  CANCER_RESEARCH_CONTROVERSIES,
  TUMOR_RESEARCH_QUESTIONS_8,
  DEBATE_PRESETS,
  DebatePreset,
} from '../data/presets';
import { CancerControversy, TumorResearchQuestion } from '../types';
import {
  Scale,
  Flame,
  Layers,
  Stethoscope,
  FlaskConical,
  Users,
  ShieldAlert,
  Zap,
  Search,
  X,
  ArrowRight,
  CheckCircle2,
  Dna,
  Sparkles,
  HelpCircle,
} from 'lucide-react';

interface DebateTopicModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPresetId: string;
  activeControversyId: number | null;
  activeDilemmaId: number | null;
  onSelectControversy: (c: CancerControversy) => void;
  onSelectDilemma: (q: TumorResearchQuestion) => void;
  onSelectPreset: (presetId: string) => void;
}

export default function DebateTopicModal({
  isOpen,
  onClose,
  selectedPresetId,
  activeControversyId,
  activeDilemmaId,
  onSelectControversy,
  onSelectDilemma,
  onSelectPreset,
}: DebateTopicModalProps) {
  const [activeTab, setActiveTab] = useState<'scenarios' | 'controversies' | 'dilemmas' | 'presets'>('scenarios');
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const filteredControversies = CANCER_RESEARCH_CONTROVERSIES.filter(
    (c) =>
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.centralDebate.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.proponentPosition.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.skepticPosition.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredDilemmas = TUMOR_RESEARCH_QUESTIONS_8.filter(
    (q) =>
      q.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.shortTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#0e1117] border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div>
            <h2 className="text-lg font-bold text-white font-sans flex items-center gap-2">
              <Scale className="text-indigo-400" size={20} />
              Select Debate Motion & Research Topic
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Choose a motion grounded across scientific, mathematical, epistemological, and bioethical pillars.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation Tabs & Search */}
        <div className="px-6 py-3 border-b border-slate-800 bg-slate-900/50 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setActiveTab('scenarios')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition ${
                activeTab === 'scenarios'
                  ? 'bg-rose-600 text-white font-bold shadow-sm ring-1 ring-rose-400/50'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <ShieldAlert size={14} className="text-rose-300" />
              <span>High-Stakes Scenarios</span>
            </button>
            <button
              onClick={() => setActiveTab('controversies')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition ${
                activeTab === 'controversies'
                  ? 'bg-indigo-600 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Scale size={14} />
              <span>5 Live Controversies</span>
            </button>
            <button
              onClick={() => setActiveTab('dilemmas')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition ${
                activeTab === 'dilemmas'
                  ? 'bg-amber-600 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Flame size={14} />
              <span>8 Tumor Dilemmas</span>
            </button>
            <button
              onClick={() => setActiveTab('presets')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition ${
                activeTab === 'presets'
                  ? 'bg-blue-600 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Layers size={14} />
              <span>All Presets</span>
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
            <input
              type="text"
              placeholder="Search topics, claims, keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-64"
            />
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {/* Tab 0: High-Stakes Scenario Roleplays */}
          {activeTab === 'scenarios' && (
            <div className="space-y-4">
              <div className="p-3 bg-rose-950/20 border border-rose-500/20 rounded-xl flex items-center gap-3">
                <ShieldAlert className="text-rose-400 shrink-0" size={20} />
                <p className="text-xs text-rose-200/90 leading-relaxed font-sans">
                  <strong>High-Stakes Scenario Roleplay Engine:</strong> Experience intense real-world clashes—from time-pressured ER doctors deciding emergency interventions to computational vs wet-lab bioengineers and generational paradigm rivalries.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {DEBATE_PRESETS.filter((p) => p.id.startsWith('scenario-')).map((p) => {
                  const isSelected = selectedPresetId === p.id && !activeControversyId && !activeDilemmaId;
                  
                  let IconComponent = Stethoscope;
                  let colorTheme = "rose";
                  if (p.id.includes('doctors')) {
                    IconComponent = Stethoscope;
                    colorTheme = "rose";
                  } else if (p.id.includes('varying-methods')) {
                    IconComponent = FlaskConical;
                    colorTheme = "cyan";
                  } else if (p.id.includes('young-vs-veteran')) {
                    IconComponent = Users;
                    colorTheme = "amber";
                  }

                  return (
                    <div
                      key={p.id}
                      className={`p-5 rounded-2xl border transition-all flex flex-col justify-between gap-4 ${
                        isSelected
                          ? 'bg-rose-950/30 border-rose-500 ring-1 ring-rose-500/40'
                          : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <span className="px-2.5 py-1 rounded-md text-[11px] font-mono font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30 flex items-center gap-1.5">
                            <IconComponent size={14} />
                            {p.badge}
                          </span>
                          <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
                            <Zap size={12} className="text-amber-400" />
                            {p.recommendedPersonas?.length || 4} Pre-configured Debater Personas
                          </span>
                        </div>

                        <div>
                          <h3 className="text-base font-bold text-white font-sans flex items-center gap-2">
                            {p.name}
                          </h3>
                          <p className="text-xs text-slate-300 mt-1.5 font-sans leading-relaxed">
                            {p.topic}
                          </p>
                        </div>

                        {/* Personas / Debater Roles Preview */}
                        {p.recommendedPersonas && p.recommendedPersonas.length > 0 && (
                          <div className="pt-2 border-t border-slate-800/60">
                            <span className="text-[10px] uppercase font-mono font-bold text-slate-400 block mb-2">
                              Clashing Perspectives & Debater Roles:
                            </span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {p.recommendedPersonas.map((pers, idx) => (
                                <div key={idx} className="p-2 bg-slate-950/60 border border-slate-800/80 rounded-lg flex items-start gap-2">
                                  <div className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 shrink-0" />
                                  <div className="min-w-0">
                                    <span className="text-xs font-bold text-slate-200 block truncate">
                                      {pers.role}
                                    </span>
                                    <span className="text-[10px] text-slate-400 line-clamp-1">
                                      {pers.description}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-slate-800/80">
                        <span className="text-xs text-slate-400 font-mono">
                          {p.stanceCards.length} Standard Claims Loaded
                        </span>
                        <button
                          onClick={() => {
                            onSelectPreset(p.id);
                            onClose();
                          }}
                          className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold font-sans transition flex items-center gap-1.5 shadow-lg shadow-rose-900/30"
                        >
                          <span>Launch Scenario Debate</span>
                          <ArrowRight size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {/* Tab 1: 5 Live Cancer Controversies */}
          {activeTab === 'controversies' && (
            <div className="grid grid-cols-1 gap-4">
              {filteredControversies.map((c) => {
                const isSelected = activeControversyId === c.number;
                return (
                  <div
                    key={c.number}
                    className={`p-5 rounded-xl border transition-all flex flex-col justify-between gap-4 ${
                      isSelected
                        ? 'bg-indigo-950/30 border-indigo-500 ring-1 ring-indigo-500/40'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <span className="px-2.5 py-0.5 rounded-md text-[11px] font-mono font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                          CONTROVERSY #{c.number}
                        </span>
                        <span className="text-xs text-slate-500 font-mono">
                          Surrogate endpoints · Power trade-offs
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-white font-sans">
                        {c.title}
                      </h3>

                      <p className="text-xs text-slate-300 leading-relaxed font-sans">
                        <strong className="text-slate-200">Central Debate:</strong> {c.centralDebate}
                      </p>

                      {/* Stance Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                        <div className="p-3 bg-emerald-950/20 border border-emerald-500/20 rounded-lg text-xs space-y-1">
                          <span className="font-bold text-emerald-400 font-mono text-[10px] block uppercase">
                            Proponent Thesis: {c.proponentPosition.title}
                          </span>
                          <p className="text-slate-300 line-clamp-2">{c.proponentPosition.claim}</p>
                        </div>

                        <div className="p-3 bg-rose-950/20 border border-rose-500/20 rounded-lg text-xs space-y-1">
                          <span className="font-bold text-rose-400 font-mono text-[10px] block uppercase">
                            Skeptic Counter: {c.skepticPosition.title}
                          </span>
                          <p className="text-slate-300 line-clamp-2">{c.skepticPosition.claim}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-800/80">
                      <span className="text-[11px] text-slate-400 font-mono truncate max-w-md">
                        Methodological Challenge: {c.methodologicalChallenge.title}
                      </span>
                      <button
                        onClick={() => {
                          onSelectControversy(c);
                          onClose();
                        }}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold font-sans transition flex items-center gap-1.5 shadow-sm"
                      >
                        <span>Debate this Controversy</span>
                        <ArrowRight size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Tab 2: 8 Grand Dilemmas in Oncology */}
          {activeTab === 'dilemmas' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredDilemmas.map((q) => {
                const isSelected = activeDilemmaId === q.number;
                return (
                  <div
                    key={q.number}
                    className={`p-4 rounded-xl border transition-all flex flex-col justify-between gap-3 ${
                      isSelected
                        ? 'bg-amber-950/30 border-amber-500 ring-1 ring-amber-500/40'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                          DILEMMA 0{q.number} · {q.category}
                        </span>
                      </div>

                      <h4 className="text-sm font-bold text-white font-sans line-clamp-2">
                        {q.question}
                      </h4>

                      <p className="text-xs text-slate-300 line-clamp-3 leading-relaxed font-sans">
                        {q.competingPositionsSummary}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                      <span className="text-[10px] text-slate-500 font-mono truncate max-w-[180px]">
                        {q.citations[0]}
                      </span>
                      <button
                        onClick={() => {
                          onSelectDilemma(q);
                          onClose();
                        }}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1"
                      >
                        <span>Debate Motion</span>
                        <ArrowRight size={12} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Tab 3: Standard Presets */}
          {activeTab === 'presets' && (
            <div className="grid grid-cols-1 gap-3">
              {DEBATE_PRESETS.map((p) => {
                const isSelected = selectedPresetId === p.id && !activeControversyId && !activeDilemmaId;
                return (
                  <div
                    key={p.id}
                    className={`p-4 rounded-xl border transition flex items-center justify-between gap-4 ${
                      isSelected
                        ? 'bg-blue-950/30 border-blue-500 ring-1 ring-blue-500/40'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-white font-sans">{p.name}</h4>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-500/15 text-blue-300 border border-blue-500/30">
                          {p.badge}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-1 font-sans line-clamp-2">
                        {p.topic}
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        onSelectPreset(p.id);
                        onClose();
                      }}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold shrink-0 transition"
                    >
                      Load Preset
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
