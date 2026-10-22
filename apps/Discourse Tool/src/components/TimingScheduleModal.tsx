import React from 'react';
import { TimingConfig } from '../types';
import {
  Clock,
  Timer,
  Sliders,
  ShieldCheck,
  Zap,
  Play,
  CheckCircle2,
  AlertTriangle,
  X,
  Dna,
  Calculator,
  Compass,
  Scale,
  Sparkles,
} from 'lucide-react';

interface TimingScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  timingConfig: TimingConfig;
  onChangeTimingConfig: (newConfig: TimingConfig) => void;
  totalElapsedSeconds: number;
  numRounds: number;
  currentRoundIndex: number;
}

export const DEFAULT_TIMING_CONFIG: TimingConfig = {
  turnTimeWindowSeconds: 45,
  totalDebateBudgetMinutes: 10,
  roundTimeWindows: {
    0: 180, // 3 mins for Round 1
    1: 240, // 4 mins for Round 2
    2: 180, // 3 mins for Round 3
    3: 120, // 2 mins for Round 4
  },
  pacingMode: 'fast',
  enforceLengthByTime: true,
  autoAdvanceOnTimeout: true,
};

export const PROTOCOL_PHASE_DEFINITIONS = [
  {
    phase: 1,
    name: 'PROPOSAL & CLAIM SPECIFICATION',
    defaultSec: 180,
    purpose: 'Independent thesis formulation, ClaimCard generation, and evidence tier assignment.',
    lensFocus: 'Empirical & Literature Anchoring',
    icon: <Dna size={14} className="text-cyan-400" />,
  },
  {
    phase: 2,
    name: 'CROSS-EXAMINATION & FALSIFICATION ATTEMPTS',
    defaultSec: 240,
    purpose: 'Adversarial refutation, causal DAG audits, and prospective falsification testing.',
    lensFocus: 'Dynamical Mathematics & Biophysical Modeling',
    icon: <Calculator size={14} className="text-amber-400" />,
  },
  {
    phase: 3,
    name: 'METHODOLOGICAL AUDIT & REFINEMENT',
    defaultSec: 180,
    purpose: 'Statistical power analysis, control sufficiency, and translational hazard evaluation.',
    lensFocus: 'Epistemology & Confounder Discrimination',
    icon: <Compass size={14} className="text-purple-400" />,
  },
  {
    phase: 4,
    name: 'SYNTHESIS & PREREGISTERED PROTOCOL PREPARATION',
    defaultSec: 120,
    purpose: 'Candidate hypothesis ranking, dissenting minority reports, and preregistered study protocols.',
    lensFocus: 'Bioethics & QALY Trade-Off Optimization',
    icon: <Scale size={14} className="text-rose-400" />,
  },
];

export const formatDuration = (totalSeconds: number): string => {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

export default function TimingScheduleModal({
  isOpen,
  onClose,
  timingConfig,
  onChangeTimingConfig,
  totalElapsedSeconds,
  numRounds,
  currentRoundIndex,
}: TimingScheduleModalProps) {
  if (!isOpen) return null;

  const totalBudgetSeconds = (timingConfig.totalDebateBudgetMinutes || 10) * 60;
  const remainingBudgetSeconds = Math.max(0, totalBudgetSeconds - totalElapsedSeconds);

  // Calculate sum of scheduled round windows
  const scheduledRoundsTotalSec: number = Array.from({ length: numRounds }).reduce<number>((acc, _, idx) => {
    return acc + (timingConfig.roundTimeWindows[idx] || 180);
  }, 0);

  const handleUpdateTurnWindow = (seconds: number) => {
    onChangeTimingConfig({
      ...timingConfig,
      turnTimeWindowSeconds: seconds,
    });
  };

  const handleUpdateBudget = (minutes: number) => {
    onChangeTimingConfig({
      ...timingConfig,
      totalDebateBudgetMinutes: minutes,
    });
  };

  const handleUpdateRoundWindow = (roundIdx: number, seconds: number) => {
    onChangeTimingConfig({
      ...timingConfig,
      roundTimeWindows: {
        ...timingConfig.roundTimeWindows,
        [roundIdx]: seconds,
      },
    });
  };

  const handleUpdatePacingMode = (mode: 'live' | 'fast' | 'turbo') => {
    onChangeTimingConfig({
      ...timingConfig,
      pacingMode: mode,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-3xl bg-[#0F0F13] border border-slate-800 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Clock size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
                  Debate Time Windows & Protocol Schedule
                </h2>
                <span className="text-[10px] font-mono text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20 font-bold">
                  STRUCTURED DISCOURSE
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                Enforce calibrated time budgets per speaker turn, round phases, and total debate limits.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 font-mono">
          {/* Top Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-xl space-y-1">
              <span className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1.5">
                <Timer size={12} className="text-blue-400" />
                Total Elapsed Time
              </span>
              <p className="text-xl font-bold text-white tracking-wider">
                {formatDuration(totalElapsedSeconds)}
              </p>
              <span className="text-[10px] text-slate-500">
                Of {timingConfig.totalDebateBudgetMinutes}m 00s budget
              </span>
            </div>

            <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-xl space-y-1">
              <span className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1.5">
                <Clock size={12} className="text-emerald-400" />
                Remaining Time Budget
              </span>
              <p className={`text-xl font-bold tracking-wider ${remainingBudgetSeconds < 120 ? 'text-amber-400' : 'text-emerald-400'}`}>
                {formatDuration(remainingBudgetSeconds)}
              </p>
              <span className="text-[10px] text-slate-500">
                {remainingBudgetSeconds > 0 ? 'Within allocated budget' : 'Overtime buffer active'}
              </span>
            </div>

            <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-xl space-y-1">
              <span className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1.5">
                <Zap size={12} className="text-purple-400" />
                Per-Turn Time Window
              </span>
              <p className="text-xl font-bold text-purple-300 tracking-wider">
                {timingConfig.turnTimeWindowSeconds}s / TURN
              </p>
              <span className="text-[10px] text-slate-500">
                ~{Math.round((timingConfig.turnTimeWindowSeconds / 60) * 150)} words calibrated
              </span>
            </div>
          </div>

          {/* Quick Presets for Debate Time Windows */}
          <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-bold text-slate-300 flex items-center gap-1.5">
                <Sliders size={13} className="text-blue-400" />
                Debate Timing Presets
              </span>
              <span className="text-[10px] text-slate-500">Calibrated for rigor vs rapid consensus</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
              <button
                onClick={() => {
                  onChangeTimingConfig({
                    ...timingConfig,
                    turnTimeWindowSeconds: 30,
                    totalDebateBudgetMinutes: 5,
                    roundTimeWindows: { 0: 90, 1: 120, 2: 90, 3: 60 },
                    pacingMode: 'fast',
                  });
                }}
                className={`p-3 rounded-xl border text-left transition flex flex-col gap-1 ${
                  timingConfig.turnTimeWindowSeconds === 30 && timingConfig.totalDebateBudgetMinutes === 5
                    ? 'bg-blue-500/15 border-blue-500/60 text-blue-200 shadow-sm'
                    : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">⚡ Rapid Sprint</span>
                  <span className="text-[9px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded font-bold">5 MIN</span>
                </div>
                <p className="text-[10px] text-slate-400 leading-snug">
                  30s turn windows, condensed ~75-word arguments for rapid falsification triage.
                </p>
              </button>

              <button
                onClick={() => {
                  onChangeTimingConfig({
                    ...timingConfig,
                    turnTimeWindowSeconds: 45,
                    totalDebateBudgetMinutes: 10,
                    roundTimeWindows: { 0: 180, 1: 240, 2: 180, 3: 120 },
                    pacingMode: 'fast',
                  });
                }}
                className={`p-3 rounded-xl border text-left transition flex flex-col gap-1 ${
                  timingConfig.turnTimeWindowSeconds === 45 && timingConfig.totalDebateBudgetMinutes === 10
                    ? 'bg-blue-500/15 border-blue-500/60 text-blue-200 shadow-sm'
                    : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">🎯 Standard Academic</span>
                  <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-bold">10 MIN</span>
                </div>
                <p className="text-[10px] text-slate-400 leading-snug">
                  45s turn windows, balanced evidence citations, and formal ClaimCard audits.
                </p>
              </button>

              <button
                onClick={() => {
                  onChangeTimingConfig({
                    ...timingConfig,
                    turnTimeWindowSeconds: 90,
                    totalDebateBudgetMinutes: 20,
                    roundTimeWindows: { 0: 300, 1: 420, 2: 300, 3: 180 },
                    pacingMode: 'live',
                  });
                }}
                className={`p-3 rounded-xl border text-left transition flex flex-col gap-1 ${
                  timingConfig.turnTimeWindowSeconds === 90 && timingConfig.totalDebateBudgetMinutes === 20
                    ? 'bg-blue-500/15 border-blue-500/60 text-blue-200 shadow-sm'
                    : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">🔬 In-Depth Mechanistic</span>
                  <span className="text-[9px] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded font-bold">20 MIN</span>
                </div>
                <p className="text-[10px] text-slate-400 leading-snug">
                  90s turn windows with exhaustive DAG proofs, power calculations, and full protocols.
                </p>
              </button>
            </div>
          </div>

          {/* Turn Window & Simulation Pacing Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Turn Window Slider */}
            <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-300 font-bold">Speaker Turn Window Limit</span>
                <span className="text-blue-400 font-bold">{timingConfig.turnTimeWindowSeconds} Seconds</span>
              </div>
              <input
                type="range"
                min="15"
                max="120"
                step="5"
                value={timingConfig.turnTimeWindowSeconds}
                onChange={(e) => handleUpdateTurnWindow(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>15s (Flash)</span>
                <span>45s (Standard)</span>
                <span>90s (Academic)</span>
                <span>120s (Exhaustive)</span>
              </div>

              <div className="pt-1 flex items-center justify-between text-[11px] text-slate-400">
                <span>Calibrated Word Density:</span>
                <span className="text-white font-bold">
                  ~{Math.round((timingConfig.turnTimeWindowSeconds / 60) * 150)} words / turn
                </span>
              </div>
            </div>

            {/* Pacing Speed Controls */}
            <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-300 font-bold">Execution Pacing Mode</span>
                <span className="text-purple-400 font-bold uppercase">{timingConfig.pacingMode}</span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleUpdatePacingMode('turbo')}
                  className={`p-2 rounded-lg border text-center text-xs transition flex flex-col items-center gap-1 ${
                    timingConfig.pacingMode === 'turbo'
                      ? 'bg-blue-600 text-white font-bold border-blue-500'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <Zap size={14} />
                  <span>Turbo</span>
                  <span className="text-[8px] opacity-70">Instant</span>
                </button>

                <button
                  onClick={() => handleUpdatePacingMode('fast')}
                  className={`p-2 rounded-lg border text-center text-xs transition flex flex-col items-center gap-1 ${
                    timingConfig.pacingMode === 'fast'
                      ? 'bg-indigo-600 text-white font-bold border-indigo-500'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <Play size={14} />
                  <span>2x Fast</span>
                  <span className="text-[8px] opacity-70">Paced</span>
                </button>

                <button
                  onClick={() => handleUpdatePacingMode('live')}
                  className={`p-2 rounded-lg border text-center text-xs transition flex flex-col items-center gap-1 ${
                    timingConfig.pacingMode === 'live'
                      ? 'bg-emerald-600 text-white font-bold border-emerald-500'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <Timer size={14} />
                  <span>Live 1x</span>
                  <span className="text-[8px] opacity-70">Real-Time</span>
                </button>
              </div>

              <div className="pt-1 flex items-center justify-between text-[11px] text-slate-400">
                <span>Total Debate Budget:</span>
                <select
                  value={timingConfig.totalDebateBudgetMinutes}
                  onChange={(e) => handleUpdateBudget(Number(e.target.value))}
                  className="bg-slate-950 border border-slate-800 rounded px-2 py-0.5 text-xs text-white"
                >
                  <option value={5}>5 Minutes</option>
                  <option value={10}>10 Minutes</option>
                  <option value={15}>15 Minutes</option>
                  <option value={20}>20 Minutes</option>
                  <option value={30}>30 Minutes</option>
                </select>
              </div>
            </div>
          </div>

          {/* Protocol Phase Time Windows Schedule */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-bold text-slate-300 flex items-center gap-1.5">
                <Clock size={13} className="text-cyan-400" />
                Structured Protocol Phase Windows ({numRounds} Rounds)
              </span>
              <span className="text-[10px] text-slate-500">
                Scheduled sum: {formatDuration(scheduledRoundsTotalSec)} / Budget:{' '}
                {formatDuration(totalBudgetSeconds)}
              </span>
            </div>

            <div className="space-y-2.5">
              {PROTOCOL_PHASE_DEFINITIONS.slice(0, numRounds).map((phase, idx) => {
                const currentWindow = timingConfig.roundTimeWindows[idx] || phase.defaultSec;
                const isCurrent = currentRoundIndex === idx;

                return (
                  <div
                    key={phase.phase}
                    className={`p-3.5 rounded-xl border transition ${
                      isCurrent
                        ? 'bg-blue-500/10 border-blue-500/40 shadow-sm'
                        : 'bg-slate-900/60 border-slate-800/80'
                    }`}
                  >
                    <div className="flex items-center justify-between flex-wrap gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-slate-950 border border-slate-800">
                          {phase.icon}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white">
                              PHASE 0{phase.phase}: {phase.name}
                            </span>
                            {isCurrent && (
                              <span className="text-[9px] bg-blue-500/20 text-blue-300 px-1.5 py-0.2 rounded border border-blue-500/30 font-bold">
                                ACTIVE_PHASE
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-cyan-400/90">{phase.lensFocus}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white bg-slate-950 px-2.5 py-1 rounded border border-slate-800">
                          {formatDuration(currentWindow)}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleUpdateRoundWindow(idx, Math.max(60, currentWindow - 30))}
                            className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs"
                          >
                            -30s
                          </button>
                          <button
                            onClick={() => handleUpdateRoundWindow(idx, currentWindow + 30)}
                            className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs"
                          >
                            +30s
                          </button>
                        </div>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-400 leading-relaxed">{phase.purpose}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-800 bg-slate-950/80 font-mono">
          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <ShieldCheck size={14} className="text-emerald-400" />
            <span>Time Windows enforce structured turn allocation and prevent rhetorical run-on.</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition shadow-sm"
          >
            CONFIRM_SCHEDULE
          </button>
        </div>
      </div>
    </div>
  );
}
