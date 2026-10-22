import React, { useState } from 'react';
import { DebateSession } from '../types';
import {
  extractSummaryAndTakeaways,
  generateTranscriptMarkdown,
  generateTranscriptPlainText,
  downloadFileBlob,
  copyTextToClipboard,
} from '../utils/transcriptExport';
import {
  FileText,
  Download,
  Copy,
  Check,
  Scale,
  Lightbulb,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Layers,
  Sparkles,
  Target,
  ExternalLink,
} from 'lucide-react';

interface DebateSummaryTakeawaysCardProps {
  session: Partial<DebateSession>;
  onOpenFullTranscript: () => void;
}

export default function DebateSummaryTakeawaysCard({
  session,
  onOpenFullTranscript,
}: DebateSummaryTakeawaysCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [copied, setCopied] = useState(false);

  const rounds = session.rounds || [];
  const totalStatements = rounds.reduce((acc, r) => acc + (r.statements?.length || 0), 0);

  if (totalStatements === 0) return null;

  const summaryData = extractSummaryAndTakeaways(session);

  const handleDownloadMarkdown = () => {
    const md = generateTranscriptMarkdown(session);
    const filename = `debate-transcript-and-summary-${Date.now()}.md`;
    downloadFileBlob(filename, md, 'text/markdown');
  };

  const handleDownloadPlainText = () => {
    const txt = generateTranscriptPlainText(session);
    const filename = `debate-transcript-and-summary-${Date.now()}.txt`;
    downloadFileBlob(filename, txt, 'text/plain');
  };

  const handleCopy = async () => {
    const md = generateTranscriptMarkdown(session);
    const success = await copyTextToClipboard(md);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      id="debate-summary-takeaways-card"
      className="mt-6 rounded-2xl bg-gradient-to-br from-[#101420] via-[#0d1017] to-[#090b10] border border-indigo-500/30 p-5 md:p-6 shadow-xl space-y-4 transition-all"
    >
      {/* Header with expand toggle & download actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
            <Scale size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm md:text-base font-bold text-white font-sans">
                Debate Executive Summary & Major Takeaways
              </h3>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                LIVE SYNTHESIS
              </span>
            </div>
            <p className="text-xs text-slate-400 font-sans">
              Consensus metrics, core takeaways, evidence power standards, and downloadable transcripts.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Download Markdown */}
          <button
            onClick={handleDownloadMarkdown}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold font-sans flex items-center gap-1.5 transition shadow-sm"
            title="Download full transcript + summary + takeaways in Markdown (.md)"
          >
            <Download size={13} />
            <span>Download Transcript (.md)</span>
          </button>

          {/* Download Text */}
          <button
            onClick={handleDownloadPlainText}
            className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 rounded-lg text-xs font-medium font-sans flex items-center gap-1 transition"
            title="Download plain text transcript"
          >
            <Download size={12} />
            <span>.txt</span>
          </button>

          {/* Copy Report */}
          <button
            onClick={handleCopy}
            className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 rounded-lg transition"
            title="Copy full transcript and takeaways to clipboard"
          >
            {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
          </button>

          {/* View in Full Modal */}
          <button
            onClick={onOpenFullTranscript}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 rounded-lg text-xs font-semibold font-sans flex items-center gap-1 transition"
            title="Open comprehensive transcript dossier"
          >
            <ExternalLink size={13} />
            <span className="hidden sm:inline">Open Full Report</span>
          </button>

          {/* Expand/Collapse */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition ml-1"
          >
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="space-y-5 pt-1 animate-fadeIn">
          {/* Top Synthesis Box */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/90 space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
              <span className="font-mono font-bold text-emerald-400 text-[10px] uppercase tracking-wider flex items-center gap-1">
                <Sparkles size={12} /> Synthesized Consensus Outcome
              </span>
              <span className="font-mono font-bold text-amber-400">
                Agreement Index: {summaryData.consensusScore}%
              </span>
            </div>

            <h4 className="text-sm md:text-base font-bold text-white font-sans">
              {summaryData.leadingHypothesisTitle}
            </h4>

            <p className="text-xs text-slate-300 leading-relaxed font-sans">
              <strong className="text-indigo-300">Biophysical Rationale:</strong> {summaryData.leadingMechanism}
            </p>
          </div>

          {/* Major Takeaways 3-Column Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            {/* Column 1: Key Consensus Agreements */}
            <div className="p-4 rounded-xl bg-emerald-950/15 border border-emerald-500/20 space-y-2">
              <div className="flex items-center gap-1.5 text-emerald-400 font-mono font-bold text-[10px] uppercase tracking-wider">
                <Check size={13} />
                <span>1. Core Consensus Points</span>
              </div>
              <ul className="space-y-1.5 text-slate-200 font-sans text-[11px]">
                {summaryData.consensusAgreements.slice(0, 3).map((item, idx) => (
                  <li key={idx} className="flex items-start gap-1.5 leading-relaxed">
                    <span className="text-emerald-400 font-bold">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 2: Remaining Cruxes & Vulnerabilities */}
            <div className="p-4 rounded-xl bg-rose-950/15 border border-rose-500/20 space-y-2">
              <div className="flex items-center gap-1.5 text-rose-400 font-mono font-bold text-[10px] uppercase tracking-wider">
                <AlertTriangle size={13} />
                <span>2. Remaining Cruxes</span>
              </div>
              <ul className="space-y-1.5 text-slate-200 font-sans text-[11px]">
                {summaryData.remainingCruxes.slice(0, 3).map((item, idx) => (
                  <li key={idx} className="flex items-start gap-1.5 leading-relaxed">
                    <span className="text-rose-400 font-bold">!</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 3: Clinical Directives & Protocols */}
            <div className="p-4 rounded-xl bg-blue-950/15 border border-blue-500/20 space-y-2">
              <div className="flex items-center gap-1.5 text-blue-400 font-mono font-bold text-[10px] uppercase tracking-wider">
                <Target size={13} />
                <span>3. Experimental Next Steps</span>
              </div>
              <ul className="space-y-1.5 text-slate-200 font-sans text-[11px]">
                {summaryData.preregisteredNextSteps.slice(0, 2).map((item, idx) => (
                  <li key={idx} className="flex items-start gap-1.5 leading-relaxed">
                    <span className="text-blue-400 font-bold font-mono">0{idx + 1}.</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Quick Footer with Evidence Tier standard and Full Report Link */}
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
            <span className="text-slate-400 text-[11px]">
              {summaryData.evidenceTierSummary}
            </span>

            <button
              onClick={onOpenFullTranscript}
              className="text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1 transition"
            >
              <span>View Full Chronological Transcript ({totalStatements} speeches)</span>
              <ExternalLink size={12} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
