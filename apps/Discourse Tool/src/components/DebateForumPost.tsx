import React, { useState } from 'react';
import { AgentPersona, DebateStatement, EpistemicLens, ScientificRoleType } from '../types';
import ClaimCardViewer from './ClaimCardViewer';
import {
  MessageSquare,
  ThumbsUp,
  Brain,
  Sparkles,
  Target,
  Zap,
  Dna,
  Calculator,
  Compass,
  Scale,
  FileCheck,
  Search,
  Crosshair,
  Layers,
  Microscope,
  Clock,
  Quote,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from 'lucide-react';

interface DebateForumPostProps {
  key?: React.Key;
  agent: AgentPersona;
  statement?: DebateStatement;
  isThinking?: boolean;
  activeCountdownSeconds?: number;
  turnTimeWindowSeconds?: number;
  postNumber: number;
  roundName?: string;
  onQuote?: (quoteText: string, authorName: string) => void;
  onEndorse?: (agentId: string) => void;
}

export const getScientificRoleBadge = (role?: ScientificRoleType) => {
  switch (role) {
    case 'literature_mapper':
      return {
        label: 'Literature Mapper',
        desc: 'Maps evidence, key studies, and contradictory findings.',
        color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
        icon: <Search size={12} />,
      };
    case 'mechanism_builder':
      return {
        label: 'Mechanism Builder',
        desc: 'Builds causal signaling DAGs and biophysical rationale.',
        color: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
        icon: <Dna size={12} />,
      };
    case 'adversarial_critic':
      return {
        label: 'Adversarial Critic',
        desc: 'Attacks weak assumptions, confounders, and failed predictions.',
        color: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
        icon: <Crosshair size={12} />,
      };
    case 'methods_reviewer':
      return {
        label: 'Methods Reviewer',
        desc: 'Audits statistical power, controls, endpoints, and leakage.',
        color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
        icon: <Calculator size={12} />,
      };
    case 'novelty_examiner':
      return {
        label: 'Novelty Examiner',
        desc: 'Audits similarity against published papers/patents.',
        color: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
        icon: <Sparkles size={12} />,
      };
    case 'translational_reviewer':
      return {
        label: 'Translational Reviewer',
        desc: 'Evaluates model validity, cross-species translation, and toxicity.',
        color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
        icon: <Microscope size={12} />,
      };
    case 'synthesis_editor':
      return {
        label: 'Synthesis Editor',
        desc: 'Synthesizes ranked hypothesis cards and claim audits.',
        color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30',
        icon: <Layers size={12} />,
      };
    default:
      return {
        label: 'Debater',
        desc: 'Specialized scientific debater.',
        color: 'text-slate-300 bg-slate-800 border-slate-700',
        icon: <FileCheck size={12} />,
      };
  }
};

export default function DebateForumPost({
  agent,
  statement,
  isThinking = false,
  activeCountdownSeconds,
  turnTimeWindowSeconds = 45,
  postNumber,
  roundName,
  onQuote,
  onEndorse,
}: DebateForumPostProps) {
  const [showBio, setShowBio] = useState(false);
  const [showPillars, setShowPillars] = useState(false);
  const [activePillarTab, setActivePillarTab] = useState<'claim' | 'math' | 'philosophy' | 'moral' | 'empirical'>('claim');
  const [endorseCount, setEndorseCount] = useState<number>(0);
  const [hasEndorsed, setHasEndorsed] = useState(false);

  const currentPosition = statement ? statement.updatedPosition : agent.initialPosition;
  const currentConfidence = statement ? statement.updatedConfidence : agent.initialConfidence;
  const roleInfo = getScientificRoleBadge(agent.scientificRole);

  const handleEndorseClick = () => {
    if (!hasEndorsed) {
      setEndorseCount((c) => c + 1);
      setHasEndorsed(true);
      if (onEndorse) onEndorse(agent.id);
    }
  };

  const getPositionTag = (pos: number) => {
    if (pos >= 0.5) return { text: 'AFFIRMATIVE (STRONG)', color: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30', barColor: 'bg-emerald-500' };
    if (pos >= 0.15) return { text: 'AFFIRMATIVE (LEAN)', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', barColor: 'bg-emerald-400' };
    if (pos > -0.15) return { text: 'NEUTRAL / AUDITOR', color: 'bg-slate-800 text-slate-300 border-slate-700', barColor: 'bg-slate-500' };
    if (pos > -0.5) return { text: 'OPPOSITION (LEAN)', color: 'bg-rose-500/10 text-rose-400 border-rose-500/20', barColor: 'bg-rose-400' };
    return { text: 'OPPOSITION (STRONG)', color: 'bg-rose-500/15 text-rose-300 border-rose-500/30', barColor: 'bg-rose-500' };
  };

  const posStyle = getPositionTag(currentPosition);

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
        return null;
    }
  };

  return (
    <article
      id={`forum-post-${agent.id}-${postNumber}`}
      className={`rounded-2xl border transition-all duration-300 overflow-hidden bg-slate-900/70 ${
        isThinking
          ? 'border-indigo-500 ring-2 ring-indigo-500/30 bg-indigo-950/20 shadow-xl'
          : 'border-slate-800/90 hover:border-slate-700/80 shadow-md'
      }`}
    >
      {/* Forum Post Header */}
      <div className="px-5 py-3.5 bg-slate-950/70 border-b border-slate-800/80 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-xl shrink-0 shadow-inner">
            {agent.avatar}
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-white text-sm font-sans tracking-tight">
                {agent.name}
              </h3>
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold border ${posStyle.color}`}>
                {posStyle.text} ({currentPosition > 0 ? '+' : ''}{currentPosition.toFixed(2)})
              </span>
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-medium border flex items-center gap-1 ${roleInfo.color}`}>
                {roleInfo.icon}
                {roleInfo.label}
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5 font-sans">
              <span className="text-slate-300 font-medium">{agent.role}</span>
              {agent.primaryLens && (
                <span className="flex items-center gap-1 text-[11px] text-slate-400">
                  • {getLensIcon(agent.primaryLens)}
                  <span className="capitalize">{agent.primaryLens} Lens</span>
                </span>
              )}
              {roundName && <span className="text-slate-400 hidden sm:inline">• {roundName}</span>}
            </div>
          </div>
        </div>

        {/* Post Metadata & Quick Actions */}
        <div className="flex items-center gap-2">
          {statement?.timing && (
            <span className="text-[11px] font-mono text-slate-400 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-lg flex items-center gap-1">
              <Clock size={11} className="text-slate-400" />
              {statement.timing.durationSeconds}s floor
            </span>
          )}
          <span className="text-[11px] font-mono text-slate-400 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-lg font-bold">
            #{postNumber}
          </span>
          <button
            onClick={() => setShowBio(!showBio)}
            className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition"
            title="Toggle Speaker Credentials & Objectives"
          >
            {showBio ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {/* Expanded Persona Credentials */}
      {showBio && (
        <div className="px-5 py-3 bg-slate-950/90 border-b border-slate-800/80 text-xs text-slate-300 space-y-2 font-sans animate-fadeIn">
          <p className="italic text-slate-300 leading-relaxed">{agent.bio}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono pt-1">
            {agent.conflictingObjective && (
              <div className="p-2 rounded bg-indigo-950/30 border border-indigo-500/20 text-indigo-200">
                <span className="text-indigo-400 font-bold block text-[10px]">INCENTIVE TARGET:</span>
                {agent.conflictingObjective}
              </div>
            )}
            {agent.failureModeGuarded && (
              <div className="p-2 rounded bg-rose-950/30 border border-rose-500/20 text-rose-200">
                <span className="text-rose-400 font-bold block text-[10px]">GUARDS AGAINST BIAS:</span>
                {agent.failureModeGuarded}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Active Thinking State */}
      {isThinking && (
        <div className="p-5 space-y-3">
          <div className="flex items-center justify-between gap-3 text-xs font-mono text-indigo-300">
            <div className="flex items-center gap-2">
              <Sparkles className="animate-spin text-indigo-400" size={16} />
              <span className="font-bold">Delivering floor argument & formal cross-examination...</span>
            </div>
            {activeCountdownSeconds !== undefined && (
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-500/30 font-bold">
                ⏱ {activeCountdownSeconds}s remaining
              </span>
            )}
          </div>
          {activeCountdownSeconds !== undefined && (
            <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 transition-all duration-300"
                style={{
                  width: `${Math.max(0, Math.min(100, (activeCountdownSeconds / turnTimeWindowSeconds) * 100))}%`,
                }}
              />
            </div>
          )}
        </div>
      )}

      {/* Spoken Forum Statement */}
      {!isThinking && statement && (
        <div className="p-5 space-y-4">
          {/* Rebuttal Target Callout if Applicable */}
          {statement.critiqueTarget && (
            <div className="p-3 rounded-xl bg-orange-950/20 border border-orange-500/20 flex items-start gap-2.5 text-xs text-orange-200 font-sans">
              <Quote size={15} className="text-orange-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold font-mono text-[10px] text-orange-400 uppercase tracking-wider block">
                  Rebuttal & Cross-Examination:
                </span>
                <span>Responding to and challenging arguments from <strong>{statement.critiqueTarget}</strong></span>
              </div>
            </div>
          )}

          {/* Statement Speech Text */}
          <div className="prose prose-invert max-w-none text-slate-100 font-sans text-sm md:text-[15px] leading-relaxed">
            <p className="whitespace-pre-line">{statement.statementText}</p>
          </div>

          {/* Adversarial Falsifier / Test Condition Callout */}
          {statement.falsificationAttempt && (
            <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/25 flex items-start gap-2.5 text-xs text-amber-200">
              <Target size={15} className="text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold font-mono text-[10px] text-amber-400 uppercase tracking-wider block">
                  Proposed Falsification Test & Confounder Probe:
                </span>
                <p className="text-slate-200 mt-0.5 leading-relaxed">{statement.falsificationAttempt}</p>
              </div>
            </div>
          )}

          {/* Collapsible Quad-Lens & Evidence Grounding Drawer */}
          <div className="pt-2 border-t border-slate-800/80">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-1 text-xs font-mono">
                <button
                  onClick={() => {
                    setShowPillars(!showPillars);
                    if (!showPillars) setActivePillarTab('claim');
                  }}
                  className={`px-3 py-1 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition ${
                    showPillars
                      ? 'bg-slate-800 text-white border-slate-700'
                      : 'bg-slate-950/80 text-slate-400 hover:text-slate-200 border-slate-800'
                  }`}
                >
                  <Layers size={13} className="text-indigo-400" />
                  <span>{showPillars ? 'Hide Detailed Evidence & Models' : 'Inspect Evidence & Quad-Lens Grounding'}</span>
                  {showPillars ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                </button>
              </div>

              <div className="flex items-center gap-2">
                {/* Confidence Meter */}
                <span className="text-[11px] font-mono text-slate-400 bg-slate-950 px-2 py-1 rounded-md border border-slate-800 flex items-center gap-1">
                  <Zap size={11} className="text-amber-400" />
                  Confidence: <strong className="text-slate-200">{currentConfidence}%</strong>
                </span>

                {/* Endorse Button */}
                <button
                  onClick={handleEndorseClick}
                  className={`px-2.5 py-1 rounded-lg text-xs font-sans font-medium flex items-center gap-1.5 transition border ${
                    hasEndorsed
                      ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                  title="Endorse this debater's position and evidence"
                >
                  <ThumbsUp size={12} className={hasEndorsed ? 'fill-emerald-400' : ''} />
                  <span>{endorseCount > 0 ? `Endorsed (${endorseCount})` : 'Endorse'}</span>
                </button>

                {/* Quote Button */}
                {onQuote && (
                  <button
                    onClick={() => onQuote(statement.statementText.slice(0, 160) + '...', agent.name)}
                    className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700 text-xs font-sans font-medium flex items-center gap-1.5 transition"
                    title="Quote this statement in your interjection"
                  >
                    <MessageSquare size={12} />
                    <span>Quote</span>
                  </button>
                )}
              </div>
            </div>

            {/* Pillar Drawer Content */}
            {showPillars && (
              <div className="mt-3 p-4 bg-slate-950/90 rounded-xl border border-slate-800 space-y-3 animate-fadeIn">
                {/* Sub-tabs */}
                <div className="flex items-center gap-1 border-b border-slate-800 pb-2 overflow-x-auto text-xs font-mono">
                  {statement.evaluatedClaim && (
                    <button
                      onClick={() => setActivePillarTab('claim')}
                      className={`px-2.5 py-1 rounded-lg transition flex items-center gap-1 ${
                        activePillarTab === 'claim'
                          ? 'bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 font-bold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <FileCheck size={12} /> Claim Card
                    </button>
                  )}
                  {statement.mathematicalGrounding && (
                    <button
                      onClick={() => setActivePillarTab('math')}
                      className={`px-2.5 py-1 rounded-lg transition flex items-center gap-1 ${
                        activePillarTab === 'math'
                          ? 'bg-amber-600/30 border border-amber-500/40 text-amber-300 font-bold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Calculator size={12} /> Mathematical Rigor
                    </button>
                  )}
                  {statement.philosophicalPrinciple && (
                    <button
                      onClick={() => setActivePillarTab('philosophy')}
                      className={`px-2.5 py-1 rounded-lg transition flex items-center gap-1 ${
                        activePillarTab === 'philosophy'
                          ? 'bg-purple-600/30 border border-purple-500/40 text-purple-300 font-bold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Compass size={12} /> Epistemology
                    </button>
                  )}
                  {statement.moralTradeoff && (
                    <button
                      onClick={() => setActivePillarTab('moral')}
                      className={`px-2.5 py-1 rounded-lg transition flex items-center gap-1 ${
                        activePillarTab === 'moral'
                          ? 'bg-rose-600/30 border border-rose-500/40 text-rose-300 font-bold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Scale size={12} /> Bioethics & QALY
                    </button>
                  )}
                  {statement.empiricalEvidence && (
                    <button
                      onClick={() => setActivePillarTab('empirical')}
                      className={`px-2.5 py-1 rounded-lg transition flex items-center gap-1 ${
                        activePillarTab === 'empirical'
                          ? 'bg-cyan-600/30 border border-cyan-500/40 text-cyan-300 font-bold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Dna size={12} /> Empirical Studies
                    </button>
                  )}
                </div>

                {/* Sub-tab view */}
                <div className="text-xs">
                  {activePillarTab === 'claim' && statement.evaluatedClaim && (
                    <ClaimCardViewer claimCard={statement.evaluatedClaim} />
                  )}

                  {activePillarTab === 'math' && (
                    <div className="p-3 bg-amber-950/20 border border-amber-500/20 rounded-lg text-amber-200/90 leading-relaxed font-mono">
                      <span className="text-[10px] font-bold text-amber-400 block mb-1 uppercase">Mathematical & Power Rationale:</span>
                      {statement.mathematicalGrounding}
                    </div>
                  )}

                  {activePillarTab === 'philosophy' && (
                    <div className="p-3 bg-purple-950/20 border border-purple-500/20 rounded-lg text-purple-200/90 leading-relaxed font-sans">
                      <span className="text-[10px] font-bold font-mono text-purple-400 block mb-1 uppercase">Epistemological Framing:</span>
                      {statement.philosophicalPrinciple}
                    </div>
                  )}

                  {activePillarTab === 'moral' && (
                    <div className="p-3 bg-rose-950/20 border border-rose-500/20 rounded-lg text-rose-200/90 leading-relaxed font-sans">
                      <span className="text-[10px] font-bold font-mono text-rose-400 block mb-1 uppercase">Bioethics & Patient Quality-of-Life:</span>
                      {statement.moralTradeoff}
                    </div>
                  )}

                  {activePillarTab === 'empirical' && (
                    <div className="p-3 bg-cyan-950/20 border border-cyan-500/20 rounded-lg text-cyan-200/90 leading-relaxed font-sans">
                      <span className="text-[10px] font-bold font-mono text-cyan-400 block mb-1 uppercase">Empirical Trials & Cohorts:</span>
                      {statement.empiricalEvidence}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Unstarted / Initial State */}
      {!isThinking && !statement && (
        <div className="p-5 text-slate-400 italic text-xs font-sans">
          Speaker has not delivered their argument for this round yet. Initial stance: "{agent.stanceBrief}"
        </div>
      )}
    </article>
  );
}
