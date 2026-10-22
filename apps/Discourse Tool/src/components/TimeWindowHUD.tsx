import React from 'react';
import { TimingConfig, AgentPersona } from '../types';
import {
  Clock,
  Timer,
  Play,
  Pause,
  PlusCircle,
  SkipForward,
  Sliders,
  Sparkles,
  Zap,
  AlertCircle,
} from 'lucide-react';
import { formatDuration } from './TimingScheduleModal';

interface TimeWindowHUDProps {
  timingConfig: TimingConfig;
  totalElapsedSeconds: number;
  activeRoundIndex: number;
  activeRoundName: string;
  roundElapsedSeconds: number;
  activeAgent?: AgentPersona | null;
  activeTurnRemainingSeconds?: number;
  activeTurnTotalSeconds?: number;
  isPaused: boolean;
  onTogglePause: () => void;
  onExtendFloor: (seconds: number) => void;
  onYieldFloor: () => void;
  onOpenScheduleModal: () => void;
  onChangePacingMode: (mode: 'live' | 'fast' | 'turbo') => void;
}

export default function TimeWindowHUD({
  timingConfig,
  totalElapsedSeconds,
  activeRoundIndex,
  activeRoundName,
  roundElapsedSeconds,
  activeAgent,
  activeTurnRemainingSeconds,
  activeTurnTotalSeconds,
  isPaused,
  onTogglePause,
  onExtendFloor,
  onYieldFloor,
  onOpenScheduleModal,
  onChangePacingMode,
}: TimeWindowHUDProps) {
  const totalBudgetSeconds = (timingConfig.totalDebateBudgetMinutes || 10) * 60;
  const roundAllocatedSeconds = timingConfig.roundTimeWindows[activeRoundIndex] || 180;
  const debatePercent = Math.min(100, (totalElapsedSeconds / Math.max(1, totalBudgetSeconds)) * 100);
  const roundPercent = Math.min(100, (roundElapsedSeconds / Math.max(1, roundAllocatedSeconds)) * 100);

  const turnSeconds = activeTurnTotalSeconds || timingConfig.turnTimeWindowSeconds || 45;
  const turnRemaining = activeTurnRemainingSeconds !== undefined ? activeTurnRemainingSeconds : turnSeconds;
  const turnProgressPercent = Math.max(0, Math.min(100, (turnRemaining / turnSeconds) * 100));

  // Determine turn countdown color
  let turnColor = 'text-cyan-400 border-cyan-500/40 bg-cyan-500/10';
  let turnBarColor = 'bg-cyan-500';
  if (turnRemaining <= 10) {
    turnColor = 'text-rose-400 border-rose-500/40 bg-rose-500/20 animate-pulse';
    turnBarColor = 'bg-rose-500';
  } else if (turnRemaining <= 20) {
    turnColor = 'text-amber-400 border-amber-500/40 bg-amber-500/15';
    turnBarColor = 'bg-amber-500';
  }

  return (
    <div
      id="time-window-hud"
      className="bg-[#0D0E12] border border-slate-800 rounded-xl p-3 shadow-lg font-mono text-xs transition-all"
    >
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Left Section: Total Debate Budget & Round Window Progress */}
        <div className="flex items-center gap-4 flex-wrap md:flex-nowrap">
          {/* Total Budget Tracker */}
          <div className="flex items-center gap-2.5 bg-slate-900/90 border border-slate-800 px-3 py-2 rounded-lg">
            <div className="p-1.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400 shrink-0">
              <Clock size={14} />
            </div>
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[9px] uppercase font-bold text-slate-400">Debate Budget</span>
                <span className="text-[10px] font-bold text-white">
                  {formatDuration(totalElapsedSeconds)} / {formatDuration(totalBudgetSeconds)}
                </span>
              </div>
              <div className="w-28 md:w-32 h-1.5 bg-slate-800 rounded-full overflow-hidden mt-1">
                <div
                  className={`h-full transition-all duration-300 ${
                    debatePercent > 90 ? 'bg-rose-500' : debatePercent > 70 ? 'bg-amber-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${debatePercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Current Round Window */}
          <div className="flex items-center gap-2.5 bg-slate-900/90 border border-slate-800 px-3 py-2 rounded-lg">
            <div className="p-1.5 rounded bg-purple-500/10 border border-purple-500/20 text-purple-400 shrink-0">
              <Timer size={14} />
            </div>
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[9px] uppercase font-bold text-slate-400">
                  Round 0{activeRoundIndex + 1} Window
                </span>
                <span className="text-[10px] font-bold text-white">
                  {formatDuration(roundElapsedSeconds)} / {formatDuration(roundAllocatedSeconds)}
                </span>
              </div>
              <div className="w-28 md:w-32 h-1.5 bg-slate-800 rounded-full overflow-hidden mt-1">
                <div
                  className="h-full bg-purple-500 transition-all duration-300"
                  style={{ width: `${roundPercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Center Section: Active Speaker Floor Countdown (if active) */}
        {activeAgent ? (
          <div className="flex-1 max-w-md bg-slate-950 border border-slate-800 rounded-lg p-2.5 flex items-center justify-between gap-3 shadow-inner">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center text-sm shrink-0">
                {activeAgent.avatar}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] bg-cyan-500/20 text-cyan-300 font-bold px-1 rounded uppercase">
                    ON_FLOOR
                  </span>
                  <p className="text-xs font-bold text-white truncate font-sans">{activeAgent.name}</p>
                </div>
                <p className="text-[10px] text-slate-400 truncate">{activeAgent.role}</p>
              </div>
            </div>

            {/* Live Turn Countdown Display */}
            <div className="flex items-center gap-2 shrink-0">
              <div className={`px-2.5 py-1 rounded-lg border flex items-center gap-1.5 ${turnColor}`}>
                <span className="text-xs font-bold font-mono">
                  {String(turnRemaining).padStart(2, '0')}s
                </span>
                <span className="text-[9px] opacity-75 font-semibold">/ {turnSeconds}s</span>
              </div>

              {/* Floor Controls */}
              <div className="flex items-center gap-1">
                <button
                  onClick={onTogglePause}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                  title={isPaused ? 'Resume Turn Timer' : 'Pause Turn Timer'}
                >
                  {isPaused ? <Play size={13} className="text-emerald-400" /> : <Pause size={13} />}
                </button>
                <button
                  onClick={() => onExtendFloor(30)}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-cyan-300 transition"
                  title="Grant +30s Floor Extension"
                >
                  <PlusCircle size={13} />
                </button>
                <button
                  onClick={onYieldFloor}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-amber-300 transition"
                  title="Yield Floor / Conclude Statement"
                >
                  <SkipForward size={13} />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="hidden lg:flex items-center gap-2 text-slate-500 text-[11px] italic">
            <Sparkles size={13} className="text-slate-600" />
            <span>Standing by for floor assignment · Time window discipline active</span>
          </div>
        )}

        {/* Right Section: Pacing Selector & Timing Schedule Modal Button */}
        <div className="flex items-center gap-2 shrink-0 justify-end">
          {/* Pacing Speed Chips */}
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5">
            <button
              onClick={() => onChangePacingMode('turbo')}
              className={`px-2 py-1 rounded text-[10px] font-bold transition ${
                timingConfig.pacingMode === 'turbo'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Turbo Mode: Instant turn generation"
            >
              ⚡ Turbo
            </button>
            <button
              onClick={() => onChangePacingMode('fast')}
              className={`px-2 py-1 rounded text-[10px] font-bold transition ${
                timingConfig.pacingMode === 'fast'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="2x Fast Mode: Accelerated spoken timers"
            >
              ⏩ 2x
            </button>
            <button
              onClick={() => onChangePacingMode('live')}
              className={`px-2 py-1 rounded text-[10px] font-bold transition ${
                timingConfig.pacingMode === 'live'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Live Mode: Real-time speaking countdown"
            >
              ⏱ 1x
            </button>
          </div>

          {/* Schedule Config Button */}
          <button
            onClick={onOpenScheduleModal}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition"
            title="Inspect & Adjust Protocol Phase Time Windows"
          >
            <Sliders size={13} className="text-cyan-400" />
            <span className="text-[11px] font-bold">TIMING_SCHEDULE</span>
          </button>
        </div>
      </div>
    </div>
  );
}
