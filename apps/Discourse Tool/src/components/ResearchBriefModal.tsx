import React, { useState } from 'react';
import { ResearchBrief, ModelEngine } from '../types';
import { Loader2 } from 'lucide-react';
import {
  FileText,
  X,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Sparkles,
} from 'lucide-react';

interface ResearchBriefModalProps {
  topic: string;
  modelEngine: ModelEngine;
  isOpen: boolean;
  onClose: () => void;
  researchBrief?: ResearchBrief;
  onSave: (brief: ResearchBrief) => void;
}

export const DEFAULT_RESEARCH_BRIEF: ResearchBrief = {
  question: 'Is partial EMT/hybrid state plasticity necessary and sufficient for distant metastatic relapse in triple-negative breast cancer (TNBC)?',
  population_or_system: 'Human TNBC patient cohorts (METABRIC/TCGA) and patient-derived organoid/xenograft (PDX) models',
  primary_outcome: 'Distant metastasis-free survival (DMFS) and quantitative CTC cluster seeding efficiency',
  candidate_mechanism: 'miR-200/ZEB1 tristable feedback toggle driving dual E-cad+/Vim+ hybrid phenotype with Plakoglobin cluster stabilization',
  allowed_evidence: [
    'Independent prospective trial data',
    'Controlled multi-omics human cohorts (RNA-seq, scATAC-seq)',
    'In vivo humanized PDX / organoid microfluidic assays'
  ],
  excluded_evidence: [
    'Uncalibrated agent-to-agent rhetorical consensus',
    'Single 2D immortalized cell-line monocultures without in vivo validation',
    'Unreplicated computational gene-set overrepresentation heuristics'
  ],
  success_criterion: 'HR > 2.0 (p < 0.001) for hybrid E/M signature and >60% reduction in lung colonization upon ZEB1/Plakoglobin knockdown in at least 2 independent cohorts.'
};

export default function ResearchBriefModal({
  topic,
  modelEngine,
  isOpen,
  onClose,
  researchBrief,
  onSave,
}: ResearchBriefModalProps) {
  const [brief, setBrief] = useState<ResearchBrief>(researchBrief || DEFAULT_RESEARCH_BRIEF);
  const [newAllowedEvidence, setNewAllowedEvidence] = useState('');
  const [newExcludedEvidence, setNewExcludedEvidence] = useState('');

  
  const [isGenerating, setIsGenerating] = useState(false);

  const handleAutoGenerate = async () => {
    try {
      setIsGenerating(true);
      const res = await fetch('/api/debate/generate-brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, modelEngine }),
      });
      if (!res.ok) throw new Error('Failed to generate brief');
      const data = await res.json();
      setBrief(data);
    } catch (err) {
      console.error(err);
      alert('Failed to auto-generate brief');
    } finally {
      setIsGenerating(false);
    }
  };


  if (!isOpen) return null;

  const handleAddAllowed = () => {
    if (!newAllowedEvidence.trim()) return;
    setBrief({
      ...brief,
      allowed_evidence: [...brief.allowed_evidence, newAllowedEvidence.trim()],
    });
    setNewAllowedEvidence('');
  };

  const handleRemoveAllowed = (idx: number) => {
    setBrief({
      ...brief,
      allowed_evidence: brief.allowed_evidence.filter((_, i) => i !== idx),
    });
  };

  const handleAddExcluded = () => {
    if (!newExcludedEvidence.trim()) return;
    setBrief({
      ...brief,
      excluded_evidence: [...brief.excluded_evidence, newExcludedEvidence.trim()],
    });
    setNewExcludedEvidence('');
  };

  const handleRemoveExcluded = (idx: number) => {
    setBrief({
      ...brief,
      excluded_evidence: brief.excluded_evidence.filter((_, i) => i !== idx),
    });
  };

  const handleSave = () => {
    onSave(brief);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0F0F12] border border-slate-800 rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <FileText size={18} />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm font-mono tracking-tight">
                STRUCTURED RESEARCH BRIEF (MACHINE-READABLE SPECIFICATION)
              </h3>
              <p className="text-[11px] text-slate-400 font-mono">
                Prevents topic drift and establishes strict scientific falsification boundaries
              </p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Auto Generate Strip */}
        <div className="bg-indigo-500/10 border-b border-indigo-500/20 p-3 px-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-indigo-300 text-xs font-mono">
            <Sparkles size={14} />
            <span>AI Research Protocol Drafter</span>
          </div>
          <button
            onClick={handleAutoGenerate}
            disabled={isGenerating}
            className="bg-indigo-500 hover:bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50"
          >
            {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            {isGenerating ? 'Drafting...' : 'Auto-Generate Constraints'}
          </button>
        </div>


        {/* Form Body */}
        <div className="p-4 overflow-y-auto space-y-4 text-xs font-mono">
          {/* Question */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-slate-400 block">
              Core Scientific / Oncological Question:
            </label>
            <textarea
              value={brief.question}
              onChange={(e) => setBrief({ ...brief, question: e.target.value })}
              rows={2}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:border-blue-500 focus:outline-none font-sans text-xs"
            />
          </div>

          {/* Model System & Primary Outcome */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-400 block">
                Target Population / Model System:
              </label>
              <input
                type="text"
                value={brief.population_or_system}
                onChange={(e) => setBrief({ ...brief, population_or_system: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-200 focus:border-blue-500 focus:outline-none"
                placeholder="e.g. Human TNBC PDX, GEMMs, TCGA cohorts"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-400 block">
                Primary Endpoint Outcome:
              </label>
              <input
                type="text"
                value={brief.primary_outcome}
                onChange={(e) => setBrief({ ...brief, primary_outcome: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-200 focus:border-blue-500 focus:outline-none"
                placeholder="e.g. Distant metastasis-free survival (DMFS)"
              />
            </div>
          </div>

          {/* Mechanism */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-slate-400 block">
              Candidate Biological Mechanism:
            </label>
            <input
              type="text"
              value={brief.candidate_mechanism}
              onChange={(e) => setBrief({ ...brief, candidate_mechanism: e.target.value })}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-200 focus:border-blue-500 focus:outline-none"
              placeholder="e.g. miR-200/ZEB1 toggle driving hybrid E/M CTC clusters"
            />
          </div>

          {/* Allowed Evidence */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold text-emerald-400 block flex items-center justify-between">
              <span>Allowed Evidence Types (Hierarchy Constraints):</span>
            </label>
            <div className="space-y-1">
              {brief.allowed_evidence.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between bg-emerald-950/20 border border-emerald-500/20 px-2.5 py-1.5 rounded text-slate-300">
                  <span className="text-emerald-200 text-[11px]">✓ {item}</span>
                  <button onClick={() => handleRemoveAllowed(idx)} className="text-slate-500 hover:text-rose-400">
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newAllowedEvidence}
                onChange={(e) => setNewAllowedEvidence(e.target.value)}
                placeholder="Add allowed evidence constraint..."
                className="flex-1 bg-slate-900 border border-slate-800 rounded p-1.5 text-xs text-slate-200 focus:outline-none"
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddAllowed())}
              />
              <button onClick={handleAddAllowed} className="px-2.5 py-1 bg-emerald-600/20 border border-emerald-500/30 text-emerald-300 rounded hover:bg-emerald-600/30">
                <Plus size={14} />
              </button>
            </div>
          </div>

          {/* Excluded Evidence */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold text-rose-400 block flex items-center justify-between">
              <span>Excluded / Disallowed Evidence (Prevents Hallucinations & Cherry-Picking):</span>
            </label>
            <div className="space-y-1">
              {brief.excluded_evidence.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between bg-rose-950/20 border border-rose-500/20 px-2.5 py-1.5 rounded text-slate-300">
                  <span className="text-rose-200 text-[11px]">✗ {item}</span>
                  <button onClick={() => handleRemoveExcluded(idx)} className="text-slate-500 hover:text-rose-400">
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newExcludedEvidence}
                onChange={(e) => setNewExcludedEvidence(e.target.value)}
                placeholder="Add excluded evidence rule..."
                className="flex-1 bg-slate-900 border border-slate-800 rounded p-1.5 text-xs text-slate-200 focus:outline-none"
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddExcluded())}
              />
              <button onClick={handleAddExcluded} className="px-2.5 py-1 bg-rose-600/20 border border-rose-500/30 text-rose-300 rounded hover:bg-rose-600/30">
                <Plus size={14} />
              </button>
            </div>
          </div>

          {/* Success Criterion */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-blue-400 block">
              Preregistered Success / Replication Criterion:
            </label>
            <textarea
              value={brief.success_criterion}
              onChange={(e) => setBrief({ ...brief, success_criterion: e.target.value })}
              rows={2}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:border-blue-500 focus:outline-none font-sans text-xs"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={() => setBrief(DEFAULT_RESEARCH_BRIEF)}
            className="text-[11px] text-slate-400 hover:text-slate-200 font-mono underline"
          >
            Reset to Oncology Benchmark Preset
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg border border-slate-800 text-slate-400 hover:text-white font-mono text-xs"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-mono font-bold text-xs flex items-center gap-1.5 shadow"
            >
              <CheckCircle2 size={14} />
              Save Research Brief
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
