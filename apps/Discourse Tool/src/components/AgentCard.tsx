import React, { useState } from 'react';
import { AgentPersona, DebateStatement, EpistemicLens, ScientificRoleType } from '../types';
import ClaimCardViewer, { getEvidenceTierBadge } from './ClaimCardViewer';
import {
  ChevronDown,
  ChevronUp,
  Brain,
  Sparkles,
  Target,
  Zap,
  Dna,
  Calculator,
  Compass,
  Scale,
  ShieldAlert,
  FileCheck,
  Search,
  Crosshair,
  Layers,
  AlertTriangle,
  Microscope,
  Clock,
  Timer,
} from 'lucide-react';

interface AgentCardProps {
  key?: React.Key;
  agent: AgentPersona;
  statement?: DebateStatement;
  isThinking?: boolean;
  activeCountdownSeconds?: number;
  turnTimeWindowSeconds?: number;
}

export const getScientificRoleBadge = (role?: ScientificRoleType) => {
  switch (role) {
    case 'literature_mapper':
      return {
        label: 'LITERATURE MAPPER',
        desc: 'Maps evidence, key studies, and contradictory findings. Prevents cherry-picking.',
        color: 'text-cyan-300 bg-cyan-500/10 border-cyan-500/30',
        icon: <Search size={11} />,
      };
    case 'mechanism_builder':
      return {
        label: 'MECHANISM BUILDER',
        desc: 'Builds causal signaling DAGs and biophysical rationale. Prevents correlation fallacies.',
        color: 'text-blue-300 bg-blue-500/10 border-blue-500/30',
        icon: <Dna size={11} />,
      };
    case 'adversarial_critic':
      return {
        label: 'ADVERSARIAL CRITIC',
        desc: 'Attacks weak assumptions, confounders, and failed predictions. Prevents consensus bias.',
        color: 'text-rose-300 bg-rose-500/10 border-rose-500/30',
        icon: <Crosshair size={11} />,
      };
    case 'methods_reviewer':
      return {
        label: 'METHODS REVIEWER',
        desc: 'Audits statistical power, controls, endpoints, and leakage. Prevents invalid experiments.',
        color: 'text-amber-300 bg-amber-500/10 border-amber-500/30',
        icon: <Calculator size={11} />,
      };
    case 'novelty_examiner':
      return {
        label: 'NOVELTY EXAMINER',
        desc: 'Audits similarity against published papers/patents. Prevents repackaging old findings.',
        color: 'text-purple-300 bg-purple-500/10 border-purple-500/30',
        icon: <Sparkles size={11} />,
      };
    case 'translational_reviewer':
      return {
        label: 'TRANSLATIONAL REVIEWER',
        desc: 'Evaluates model validity, cross-species translation, and toxicity. Prevents cell-line overclaiming.',
        color: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30',
        icon: <Microscope size={11} />,
      };
    case 'synthesis_editor':
      return {
        label: 'SYNTHESIS EDITOR',
        desc: 'Synthesizes ranked hypothesis cards and claim audits. Prevents unchecked rhetorical consensus.',
        color: 'text-indigo-300 bg-indigo-500/10 border-indigo-500/30',
        icon: <Layers size={11} />,
      };
    default:
      return {
        label: 'SCIENTIST',
        desc: 'Specialized scientific investigator.',
        color: 'text-slate-300 bg-slate-800 border-slate-700',
        icon: <FileCheck size={11} />,
      };
  }
};

export default function AgentCard({
  agent,
  statement,
  isThinking = false,
  activeCountdownSeconds,
  turnTimeWindowSeconds = 45,
}: AgentCardProps) {
  const [showBio, setShowBio] = useState(false);
  const [activeTab, setActiveTab] = useState<'statement' | 'claim' | 'math' | 'philosophy' | 'moral' | 'empirical'>('statement');

  const currentPosition = statement ? statement.updatedPosition : agent.initialPosition;
  const currentConfidence = statement ? statement.updatedConfidence : agent.initialConfidence;
  const internalMonologue = statement
    ? statement.reasonForUpdate
    : 'Auditing empirical evidence tiers, causal DAGs, and prospective falsifiers.';

  const positionPercent = ((currentPosition + 1) / 2) * 100;

  const getPositionLabel = (pos: number) => {
    if (pos >= 0.6) return { text: 'STRONGLY SUPPORTS', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' };
    if (pos >= 0.15) return { text: 'LEANS SUPPORTIVE', color: 'text-emerald-300 bg-emerald-500/5 border-emerald-500/20' };
    if (pos > -0.15) return { text: 'NEUTRAL / UNDECIDED', color: 'text-slate-400 bg-slate-800/50 border-slate-700' };
    if (pos > -0.6) return { text: 'LEANS OPPOSED', color: 'text-rose-300 bg-rose-500/5 border-rose-500/20' };
    return { text: 'STRONGLY OPPOSES', color: 'text-rose-400 bg-rose-500/10 border-rose-500/30' };
  };

  const posStyle = getPositionLabel(currentPosition);

  // Border accent color based on position
  const getAccentColor = (pos: number) => {
    if (pos > 0.2) return 'border-emerald-500';
    if (pos < -0.2) return 'border-rose-500';
    return 'border-blue-500';
  };

  const roleInfo = getScientificRoleBadge(agent.scientificRole);

  // Format timing badge styling
  const getTimingBadge = (timing: any) => {
    if (!timing) return null;
    let badgeColor = 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30';
    if (timing.timeStatus === 'budget_exceeded') {
      badgeColor = 'text-rose-300 bg-rose-500/10 border-rose-500/30';
    } else if (timing.timeStatus === 'warning_extended') {
      badgeColor = 'text-amber-300 bg-amber-500/10 border-amber-500/30';
    }

    return (
      <span
        className={`flex items-center gap-1 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${badgeColor}`}
        title={`Spoken delivery: ${timing.durationSeconds}s in ${timing.allocatedSeconds}s window (${timing.speakingPaceWpm || 150} wpm)`}
      >
        <Clock size={10} />
        {timing.timestamp || 'T+00:00'} · {timing.durationSeconds}s/{timing.allocatedSeconds}s
      </span>
    );
  };

  const getLensBadge = (lens: EpistemicLens) => {
    switch (lens) {
      case 'scientific':
        return (
          <span className="flex items-center gap-1 text-[9px] font-mono font-bold text-cyan-300 bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20">
            <Dna size={10} />
            SCIENTIFIC
          </span>
        );
      case 'mathematical':
        return (
          <span className="flex items-center gap-1 text-[9px] font-mono font-bold text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
            <Calculator size={10} />
            MATHEMATIC
          </span>
        );
      case 'philosophical':
        return (
          <span className="flex items-center gap-1 text-[9px] font-mono font-bold text-purple-300 bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20">
            <Compass size={10} />
            PHILOSOPHY
          </span>
        );
      case 'moral':
        return (
          <span className="flex items-center gap-1 text-[9px] font-mono font-bold text-rose-300 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">
            <Scale size={10} />
            MORAL / ETHICS
          </span>
        );
    }
  };

  return (
    <div
      id={`agent-card-${agent.id}`}
      className={`border rounded-xl p-4 bg-[#0F0F12] border-slate-800 transition-all duration-300 relative overflow-hidden border-l-4 ${getAccentColor(
        currentPosition
      )} ${
        isThinking
          ? 'ring-1 ring-blue-500 shadow-[0_0_25px_rgba(59,130,246,0.2)] bg-[#121218]'
          : 'hover:border-slate-700 shadow-md'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-2xl shrink-0 shadow-inner">
            {agent.avatar}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-white text-xs md:text-sm font-mono tracking-tight">
                {agent.name}
              </h3>
              <span
                className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold border ${posStyle.color}`}
              >
                {posStyle.text}
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold border flex items-center gap-1 ${roleInfo.color}`} title={roleInfo.desc}>
                {roleInfo.icon}
                {roleInfo.label}
              </span>
              <p className="text-[11px] text-slate-300 font-mono font-semibold">{agent.role}</p>
              {agent.primaryLens && getLensBadge(agent.primaryLens)}
            </div>
            {agent.formalDiscipline && (
              <p className="text-[10px] text-slate-500 font-mono italic mt-0.5">
                // {agent.formalDiscipline}
              </p>
            )}
          </div>
        </div>

        <button
          onClick={() => setShowBio(!showBio)}
          className="text-slate-500 hover:text-slate-300 p-1.5 rounded hover:bg-slate-800 transition shrink-0"
          title="Inspect Persona Stack & Conflicting Objectives"
        >
          {showBio ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </button>
      </div>

      {/* Expanded Persona Details & Conflicting Incentive */}
      {showBio && (
        <div className="mt-3 p-3 bg-slate-900/90 rounded-lg border border-slate-800 text-[11px] text-slate-300 font-mono space-y-2 animate-fadeIn">
          {agent.conflictingObjective && (
            <div className="bg-blue-950/30 border border-blue-500/20 p-2 rounded text-blue-200">
              <span className="text-blue-400 font-bold uppercase text-[9px] block">Conflicting Incentive / Optimization Target:</span>
              {agent.conflictingObjective}
            </div>
          )}
          {agent.failureModeGuarded && (
            <div className="bg-rose-950/30 border border-rose-500/20 p-2 rounded text-rose-200">
              <span className="text-rose-400 font-bold uppercase text-[9px] block">Guards Against Epistemic Failure Mode:</span>
              {agent.failureModeGuarded}
            </div>
          )}
          <div>
            <span className="text-slate-500 font-semibold uppercase">Academic Bio:</span> {agent.bio}
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            <div>
              <span className="text-slate-500 font-semibold uppercase">Reasoning:</span>{' '}
              <span className="text-blue-400 font-bold">{agent.reasoningStyle}</span>
            </div>
            {agent.secondaryLens && (
              <div className="flex items-center gap-1">
                <span className="text-slate-500 font-semibold uppercase">Secondary:</span>
                {getLensBadge(agent.secondaryLens)}
              </div>
            )}
          </div>
          <div>
            <span className="text-slate-500 font-semibold uppercase">Initial Stance:</span>{' '}
            <span className="italic text-slate-400">"{agent.stanceBrief}"</span>
          </div>
        </div>
      )}

      {/* Stance Slider Track */}
      <div className="mt-3.5 pt-2 border-t border-slate-800/80">
        <div className="flex justify-between text-[9px] font-mono text-slate-500 mb-1">
          <span className="text-rose-400 font-bold">-1.0 OPP</span>
          <span className="text-slate-400">
            STANCE_VAL:{' '}
            <span className="text-white font-bold">
              {currentPosition > 0 ? '+' : ''}
              {currentPosition.toFixed(2)}
            </span>
          </span>
          <span className="text-emerald-400 font-bold">+1.0 SUP</span>
        </div>

        <div className="relative h-1.5 bg-slate-900 border border-slate-800 rounded-full overflow-hidden">
          <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-slate-700 -translate-x-1/2" />
          {currentPosition > 0 && (
            <div
              className="absolute h-full bg-emerald-500 left-1/2"
              style={{ width: `${(currentPosition / 2) * 100}%` }}
            />
          )}
          {currentPosition < 0 && (
            <div
              className="absolute h-full bg-rose-500"
              style={{
                left: `${positionPercent}%`,
                right: '50%',
              }}
            />
          )}
        </div>
      </div>

      {/* Spoken Statement & Quad-Lens Anchors */}
      <div className="mt-3">
        {isThinking ? (
          <div className="py-3 px-3 bg-blue-950/20 rounded-lg border border-blue-500/30 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-mono text-cyan-300">
                <Sparkles className="animate-spin text-cyan-400" size={14} />
                <span>On Floor: Formulating claim card & falsification probe...</span>
              </div>
              {activeCountdownSeconds !== undefined && (
                <div className="px-2 py-0.5 rounded bg-blue-500/20 border border-blue-500/30 text-[10px] font-mono font-bold text-cyan-300">
                  ⏱ {activeCountdownSeconds}s / {turnTimeWindowSeconds}s
                </div>
              )}
            </div>
            {activeCountdownSeconds !== undefined && (
              <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-400 transition-all duration-300"
                  style={{
                    width: `${Math.max(0, Math.min(100, (activeCountdownSeconds / turnTimeWindowSeconds) * 100))}%`,
                  }}
                />
              </div>
            )}
          </div>
        ) : statement ? (
          <div className="bg-slate-900/70 border border-slate-800/90 rounded-lg overflow-hidden">
            {/* Epistemic Sub-Tabs */}
            <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/60 px-2 pt-1 gap-1 text-[10px] font-mono overflow-x-auto">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setActiveTab('statement')}
                  className={`px-2.5 py-1 rounded-t transition ${
                    activeTab === 'statement'
                      ? 'bg-slate-800 text-white font-bold border-t border-x border-slate-700'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  STATEMENT
                </button>

                {statement.evaluatedClaim && (
                  <button
                    onClick={() => setActiveTab('claim')}
                    className={`px-2 py-1 rounded-t flex items-center gap-1 transition ${
                      activeTab === 'claim'
                        ? 'bg-cyan-500/20 text-cyan-300 font-bold border-t border-x border-cyan-500/30'
                        : 'text-cyan-400/80 hover:text-cyan-300'
                    }`}
                  >
                    <FileCheck size={10} />
                    CLAIM CARD
                  </button>
                )}

                {statement.mathematicalGrounding && (
                  <button
                    onClick={() => setActiveTab('math')}
                    className={`px-2 py-1 rounded-t flex items-center gap-1 transition ${
                      activeTab === 'math'
                        ? 'bg-amber-500/20 text-amber-300 font-bold border-t border-x border-amber-500/30'
                        : 'text-amber-400/70 hover:text-amber-300'
                    }`}
                  >
                    <Calculator size={10} />
                    MATH
                  </button>
                )}
                {statement.philosophicalPrinciple && (
                  <button
                    onClick={() => setActiveTab('philosophy')}
                    className={`px-2 py-1 rounded-t flex items-center gap-1 transition ${
                      activeTab === 'philosophy'
                        ? 'bg-purple-500/20 text-purple-300 font-bold border-t border-x border-purple-500/30'
                        : 'text-purple-400/70 hover:text-purple-300'
                    }`}
                  >
                    <Compass size={10} />
                    PHILOSOPHY
                  </button>
                )}
                {statement.moralTradeoff && (
                  <button
                    onClick={() => setActiveTab('moral')}
                    className={`px-2 py-1 rounded-t flex items-center gap-1 transition ${
                      activeTab === 'moral'
                        ? 'bg-rose-500/20 text-rose-300 font-bold border-t border-x border-rose-500/30'
                        : 'text-rose-400/70 hover:text-rose-300'
                    }`}
                  >
                    <Scale size={10} />
                    ETHICS
                  </button>
                )}
                {statement.empiricalEvidence && (
                  <button
                    onClick={() => setActiveTab('empirical')}
                    className={`px-2 py-1 rounded-t flex items-center gap-1 transition ${
                      activeTab === 'empirical'
                        ? 'bg-cyan-500/20 text-cyan-300 font-bold border-t border-x border-cyan-500/30'
                        : 'text-cyan-400/70 hover:text-cyan-300'
                    }`}
                  >
                    <Dna size={10} />
                    EMPIRICAL
                  </button>
                )}
              </div>

              {statement.timing && (
                <div className="ml-auto pl-2 py-0.5 shrink-0">
                  {getTimingBadge(statement.timing)}
                </div>
              )}
            </div>

            {/* Tab Body */}
            <div className="p-3 text-xs leading-relaxed">
              {activeTab === 'statement' && (
                <div className="space-y-2">
                  <p className="italic text-slate-200 font-sans">"{statement.statementText}"</p>
                  
                  {statement.falsificationAttempt && (
                    <div className="bg-amber-950/20 border border-amber-500/20 p-2 rounded text-[11px] font-mono text-amber-300 space-y-0.5">
                      <span className="text-[9px] uppercase font-bold text-amber-400 flex items-center gap-1">
                        <Target size={11} />
                        Adversarial Falsification Attack / Confounder Probe:
                      </span>
                      <p>{statement.falsificationAttempt}</p>
                    </div>
                  )}

                  {statement.critiqueTarget && (
                    <div className="flex items-center gap-1.5 text-[10px] font-mono text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded w-max">
                      <Target size={12} />
                      <span>REFUTING: {statement.critiqueTarget}</span>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'claim' && statement.evaluatedClaim && (
                <div className="space-y-2">
                  <ClaimCardViewer claimCard={statement.evaluatedClaim} compact={false} />
                </div>
              )}

              {activeTab === 'math' && (
                <div className="space-y-1 font-mono text-[11px] text-amber-200/90 bg-amber-500/5 p-2 rounded border border-amber-500/20">
                  <span className="text-[9px] uppercase font-bold text-amber-400 block flex items-center gap-1">
                    <Calculator size={10} />
                    Mathematical Grounding & Dynamical Equations:
                  </span>
                  <p className="leading-relaxed">{statement.mathematicalGrounding}</p>
                </div>
              )}

              {activeTab === 'philosophy' && (
                <div className="space-y-1 font-mono text-[11px] text-purple-200/90 bg-purple-500/5 p-2 rounded border border-purple-500/20">
                  <span className="text-[9px] uppercase font-bold text-purple-400 block flex items-center gap-1">
                    <Compass size={10} />
                    Epistemological & Philosophical Axiom:
                  </span>
                  <p className="leading-relaxed">{statement.philosophicalPrinciple}</p>
                </div>
              )}

              {activeTab === 'moral' && (
                <div className="space-y-1 font-mono text-[11px] text-rose-200/90 bg-rose-500/5 p-2 rounded border border-rose-500/20">
                  <span className="text-[9px] uppercase font-bold text-rose-400 block flex items-center gap-1">
                    <Scale size={10} />
                    Bioethical & QALY Quality-of-Life Trade-Off:
                  </span>
                  <p className="leading-relaxed">{statement.moralTradeoff}</p>
                </div>
              )}

              {activeTab === 'empirical' && (
                <div className="space-y-1 font-mono text-[11px] text-cyan-200/90 bg-cyan-500/5 p-2 rounded border border-cyan-500/20">
                  <span className="text-[9px] uppercase font-bold text-cyan-400 block flex items-center gap-1">
                    <Dna size={10} />
                    Empirical Evidence & Clinical Registry Data:
                  </span>
                  <p className="leading-relaxed">{statement.empiricalEvidence}</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-3 text-slate-500 italic text-[11px]">
            Awaiting round initiation. Initial starting stance: "{agent.stanceBrief}"
          </div>
        )}
      </div>

      {/* Footer / Cognitive Monologue */}
      {!isThinking && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-slate-800/60 text-[10px] font-mono">
          <div className="flex items-center gap-1.5 text-slate-400 flex-1 min-w-[180px]">
            <Brain size={12} className="text-purple-400 shrink-0" />
            <span className="text-slate-500">AUDIT_LOG:</span>
            <span
              className="text-slate-300 truncate max-w-[180px] md:max-w-xs block"
              title={internalMonologue}
            >
              "{internalMonologue}"
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
            <Zap size={11} className="text-blue-400" />
            <span className="text-slate-500">CONF:</span>
            <span className="text-blue-400 font-bold">{currentConfidence}%</span>
          </div>
        </div>
      )}
    </div>
  );
}
