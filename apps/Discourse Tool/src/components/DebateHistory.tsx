import React from 'react';
import { SavedDebateSummary } from '../types';
import { History, Trash2, ArrowRight, Clock, Award, FileText } from 'lucide-react';

interface DebateHistoryProps {
  history: SavedDebateSummary[];
  onLoadDebate: (id: string) => void;
  onDeleteDebate: (id: string) => void;
  onDownloadDebate?: (id: string) => void;
  currentDebateId: string;
}

export default function DebateHistory({
  history,
  onLoadDebate,
  onDeleteDebate,
  onDownloadDebate,
  currentDebateId,
}: DebateHistoryProps) {
  if (history.length === 0) {
    return (
      <div className="p-3 bg-slate-900/50 border border-slate-800 rounded text-center">
        <p className="text-[11px] font-mono text-slate-500">
          NO_PERSISTED_DEBATES_IN_MEMORY
        </p>
      </div>
    );
  }

  return (
    <div id="debate-history-container" className="space-y-2">
      <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500 font-mono flex items-center gap-1.5 mb-2">
        <History size={13} className="text-blue-400" />
        Persisted Debate Memory Stack
      </span>

      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
        {history.map((item) => (
          <div
            key={item.id}
            onClick={() => onLoadDebate(item.id)}
            className={`p-3 rounded-xl border transition cursor-pointer flex flex-col justify-between gap-2 ${
              currentDebateId === item.id
                ? 'bg-blue-500/10 border-blue-500/40 shadow-sm'
                : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <h5 className="text-xs font-bold text-slate-200 line-clamp-1 font-mono">
                {item.topic}
              </h5>
              <div className="flex items-center gap-1">
                {onDownloadDebate && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDownloadDebate(item.id);
                    }}
                    className="text-slate-500 hover:text-indigo-400 p-1 rounded hover:bg-slate-800 transition"
                    title="Download Transcript Dossier"
                  >
                    <FileText size={13} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteDebate(item.id);
                  }}
                  className="text-slate-600 hover:text-rose-400 p-1 rounded hover:bg-slate-800 transition"
                  title="Purge from Memory"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pt-1.5 border-t border-slate-800/80">
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1">
                  <Clock size={10} />
                  {new Date(item.timestamp).toLocaleDateString()}
                </span>
                <span className="text-blue-400">
                  {item.agentCount} AGENTS
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <Award size={11} className="text-emerald-400" />
                <span className="text-emerald-400 font-bold">{item.consensusScore}%</span>
                <ArrowRight size={11} className="text-slate-400" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
