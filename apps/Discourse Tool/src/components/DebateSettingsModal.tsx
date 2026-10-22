import React from 'react';
import { DebateFormat, TimingConfig } from '../types';
import { Sliders, Clock, RotateCcw, X, FileText, Sparkles } from 'lucide-react';
import { formatDuration } from './TimingScheduleModal';

interface DebateSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  format: DebateFormat;
  onChangeFormat: (f: DebateFormat) => void;
  numAgents: number;
  onChangeNumAgents: (n: number) => void;
  numRounds: number;
  onChangeNumRounds: (n: number) => void;
  materials: string;
  onChangeMaterials: (m: string) => void;
  timingConfig: TimingConfig;
  onOpenTimingModal: () => void;
  status: string;
  onReset: () => void;
}

export default function DebateSettingsModal({
  isOpen,
  onClose,
  format,
  onChangeFormat,
  numAgents,
  onChangeNumAgents,
  numRounds,
  onChangeNumRounds,
  materials,
  onChangeMaterials,
  timingConfig,
  onOpenTimingModal,
  status,
  onReset,
}: DebateSettingsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#0e1117] border border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-2">
            <Sliders className="text-indigo-400" size={18} />
            <h3 className="text-base font-bold text-white font-sans">
              Debate Chamber Settings
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Format Protocol */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 font-sans block">
              Debate Protocol
            </label>
            <select
              value={format}
              onChange={(e) => onChangeFormat(e.target.value as DebateFormat)}
              disabled={status !== 'configuring'}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white font-sans focus:outline-none focus:border-indigo-500 disabled:opacity-60"
            >
              <option value="roundtable">Quad-Lens Roundtable (Scientific, Math, Philosophy, Ethics)</option>
              <option value="oxford">Formal Oxford Bipolar Debate (Affirmative vs Negative)</option>
              <option value="socratic">Socratic Epistemic Deconstruction</option>
            </select>
          </div>

          {/* Number of Agents */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-sans text-slate-300">
              <span>Scientific Roles / Debaters</span>
              <span className="text-indigo-400 font-bold font-mono">0{numAgents} Debaters</span>
            </div>
            <input
              type="range"
              min="2"
              max="6"
              value={numAgents}
              onChange={(e) => onChangeNumAgents(Number(e.target.value))}
              disabled={status !== 'configuring'}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 disabled:opacity-60"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>2 (Bipolar Thesis/Counter)</span>
              <span>4 (Standard Panel)</span>
              <span>6 (Full Multi-Disciplinary)</span>
            </div>
          </div>

          {/* Number of Rounds */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-sans text-slate-300">
              <span>Debate Rounds</span>
              <span className="text-indigo-400 font-bold font-mono">0{numRounds} Rounds</span>
            </div>
            <input
              type="range"
              min="1"
              max="4"
              value={numRounds}
              onChange={(e) => onChangeNumRounds(Number(e.target.value))}
              disabled={status !== 'configuring'}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 disabled:opacity-60"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>1 (Opening Statements)</span>
              <span>2 (Rebuttals)</span>
              <span>3 (Synthesis)</span>
              <span>4 (Full Protocol)</span>
            </div>
          </div>

          {/* Time Budget Summary */}
          <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5 font-sans">
                <Clock size={14} />
                Floor Time Windows & Budget
              </span>
              <button
                onClick={() => {
                  onClose();
                  onOpenTimingModal();
                }}
                className="text-xs font-sans text-indigo-400 hover:underline font-bold"
              >
                Customize Pacing →
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="p-2 bg-slate-900/80 rounded-lg border border-slate-800">
                <span className="text-slate-500 block text-[10px]">SPEAKER TIME WINDOW</span>
                <span className="font-bold text-slate-200">{timingConfig.turnTimeWindowSeconds}s / turn</span>
              </div>
              <div className="p-2 bg-slate-900/80 rounded-lg border border-slate-800">
                <span className="text-slate-500 block text-[10px]">TOTAL SESSION BUDGET</span>
                <span className="font-bold text-slate-200">{formatDuration(timingConfig.totalDebateBudgetMinutes * 60)}</span>
              </div>
            </div>
          </div>

          {/* Context Grounding Materials */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 font-sans flex items-center gap-1.5">
              <FileText size={14} className="text-indigo-400" />
              Epistemic Grounding Text & Evidence Materials
            </label>
            <textarea
              rows={4}
              value={materials}
              onChange={(e) => onChangeMaterials(e.target.value)}
              disabled={status !== 'configuring'}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-300 font-mono focus:outline-none focus:border-indigo-500 disabled:opacity-60"
            />
          </div>
        </div>

        <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={() => {
              onReset();
              onClose();
            }}
            className="px-3 py-1.5 text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 font-sans font-medium"
          >
            <RotateCcw size={13} />
            Reset Debate Chamber
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold font-sans transition"
          >
            Apply Settings
          </button>
        </div>
      </div>
    </div>
  );
}
