import React, { useState } from 'react';
import { StanceCard } from '../types';
import { Plus, Trash2, CheckCircle2, Circle, Layers } from 'lucide-react';

interface StanceManagerProps {
  stanceCards: StanceCard[];
  onToggleCard: (id: string) => void;
  onAddCard: (card: Omit<StanceCard, 'id' | 'isActive'>) => void;
  onDeleteCard: (id: string) => void;
}

export default function StanceManager({
  stanceCards,
  onToggleCard,
  onAddCard,
  onDeleteCard,
}: StanceManagerProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [claim, setClaim] = useState('');
  const [reasoning, setReasoning] = useState('');
  const [confidence, setConfidence] = useState(80);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !claim.trim()) return;
    onAddCard({
      title,
      claim,
      reasoning,
      confidence,
    });
    setTitle('');
    setClaim('');
    setReasoning('');
    setConfidence(80);
    setIsAdding(false);
  };

  return (
    <div id="stance-manager-container" className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500 font-mono flex items-center gap-1.5">
          <Layers size={13} className="text-blue-400" />
          Testable Hypotheses & Stance Cards
        </span>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="text-[10px] font-mono font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1"
        >
          <Plus size={12} />
          {isAdding ? 'CANCEL' : 'ADD_HYPOTHESIS'}
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-700 p-3 rounded space-y-2 animate-fadeIn">
          <div>
            <label className="text-[10px] font-mono text-slate-400 block mb-1">HYPOTHESIS_ID / TITLE</label>
            <input
              type="text"
              placeholder="e.g. H1: Information loss at handoff"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-[#0A0A0B] border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
              required
            />
          </div>
          <div>
            <label className="text-[10px] font-mono text-slate-400 block mb-1">CORE CLAIM</label>
            <textarea
              placeholder="State the testable claim..."
              value={claim}
              onChange={(e) => setClaim(e.target.value)}
              rows={2}
              className="w-full bg-[#0A0A0B] border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
              required
            />
          </div>
          <div>
            <label className="text-[10px] font-mono text-slate-400 block mb-1">RATIONALE / WHY IT MATTERS</label>
            <input
              type="text"
              placeholder="Why this matters in clinical/system design..."
              value={reasoning}
              onChange={(e) => setReasoning(e.target.value)}
              className="w-full bg-[#0A0A0B] border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-1">
              <span>PRIOR CONFIDENCE:</span>
              <span className="text-blue-400 font-bold">{confidence}%</span>
            </div>
            <input
              type="range"
              min="10"
              max="100"
              value={confidence}
              onChange={(e) => setConfidence(Number(e.target.value))}
              className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
          </div>
          <button
            type="submit"
            className="w-full py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-mono font-bold transition"
          >
            INJECT_CARD_INTO_ORCHESTRATOR
          </button>
        </form>
      )}

      <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
        {stanceCards.map((card) => (
          <div
            key={card.id}
            className={`p-2.5 rounded border transition cursor-pointer ${
              card.isActive
                ? 'bg-blue-500/5 border-blue-500/30'
                : 'bg-slate-900/40 border-slate-800/80 opacity-60 hover:opacity-100'
            }`}
            onClick={() => onToggleCard(card.id)}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                {card.isActive ? (
                  <CheckCircle2 size={13} className="text-blue-400 shrink-0" />
                ) : (
                  <Circle size={13} className="text-slate-600 shrink-0" />
                )}
                <span className="text-xs font-bold font-mono text-slate-200">{card.title}</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20">
                  {card.confidence}%
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteCard(card.id);
                  }}
                  className="text-slate-600 hover:text-rose-400 p-0.5"
                  title="Remove Card"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>

            <p className="text-[11px] text-slate-300 mt-1 leading-snug line-clamp-2">
              {card.claim}
            </p>
            {card.reasoning && (
              <p className="text-[10px] text-slate-500 italic mt-0.5 line-clamp-1">
                Context: {card.reasoning}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
