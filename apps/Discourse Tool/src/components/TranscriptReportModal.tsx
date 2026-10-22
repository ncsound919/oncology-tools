import React, { useState } from 'react';
import {
  DebateSession,
  DebateRound,
  DebateStatement,
  AgentPersona,
  JudgeSynthesis,
  ResearchBrief,
  EpistemicLens,
} from '../types';
import {
  generateTranscriptMarkdown,
  generateTranscriptPlainText,
  generateTranscriptJSON,
  downloadFileBlob,
  copyTextToClipboard,
  extractSummaryAndTakeaways,
} from '../utils/transcriptExport';
import { formatDuration } from './TimingScheduleModal';
import { getScientificRoleBadge } from './DebateForumPost';
import {
  FileText,
  Download,
  Copy,
  Printer,
  X,
  Check,
  Search,
  BookOpen,
  Scale,
  Sparkles,
  Dna,
  Calculator,
  Compass,
  AlertTriangle,
  Lightbulb,
  Layers,
  Clock,
  User,
  Quote,
  Target,
  FileCheck,
  ChevronDown,
  ChevronUp,
  Share2,
} from 'lucide-react';

interface TranscriptReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: Partial<DebateSession>;
}

export default function TranscriptReportModal({
  isOpen,
  onClose,
  session,
}: TranscriptReportModalProps) {
  const [activeSection, setActiveSection] = useState<'all' | 'transcript' | 'summary' | 'takeaways'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoundFilter, setSelectedRoundFilter] = useState<number | 'all'>('all');
  const [selectedAgentFilter, setSelectedAgentFilter] = useState<string | 'all'>('all');
  const [copiedFormat, setCopiedFormat] = useState<string | null>(null);

  if (!isOpen) return null;

  const topic = session.topic || 'Oncology Scientific Motion';
  const rounds = session.rounds || [];
  const agents = session.agents || [];
  const judge = session.judgeResult;
  const totalSeconds = session.totalElapsedSeconds || 0;

  const summaryData = extractSummaryAndTakeaways(session);

  // Filtered transcript statements
  const filteredRounds = rounds
    .filter((r) => selectedRoundFilter === 'all' || r.roundIndex === selectedRoundFilter)
    .map((r) => {
      const filteredStatements = r.statements.filter((s) => {
        const matchesAgent = selectedAgentFilter === 'all' || s.agentId === selectedAgentFilter;
        const matchesSearch =
          searchQuery === '' ||
          s.statementText.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.agentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (s.evaluatedClaim && s.evaluatedClaim.claim.toLowerCase().includes(searchQuery.toLowerCase()));
        return matchesAgent && matchesSearch;
      });
      return { ...r, statements: filteredStatements };
    });

  const totalSpeeches = rounds.reduce((acc, r) => acc + (r.statements?.length || 0), 0);

  // Export handlers
  const handleDownloadMarkdown = () => {
    const md = generateTranscriptMarkdown(session);
    const filename = `debate-transcript-${Date.now()}.md`;
    downloadFileBlob(filename, md, 'text/markdown');
  };

  const handleDownloadPlainText = () => {
    const text = generateTranscriptPlainText(session);
    const filename = `debate-transcript-${Date.now()}.txt`;
    downloadFileBlob(filename, text, 'text/plain');
  };

  const handleDownloadJSON = () => {
    const json = generateTranscriptJSON(session);
    const filename = `debate-session-${Date.now()}.json`;
    downloadFileBlob(filename, json, 'application/json');
  };

  const handleCopyMarkdown = async () => {
    const md = generateTranscriptMarkdown(session);
    const success = await copyTextToClipboard(md);
    if (success) {
      setCopiedFormat('md');
      setTimeout(() => setCopiedFormat(null), 2500);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div
        id="printable-transcript-dossier"
        className="bg-[#0b0e14] border border-slate-800 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden print:m-0 print:p-0 print:border-none print:max-h-none print:bg-white print:text-black"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-[#0f131d] flex flex-wrap items-center justify-between gap-4 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <FileText size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base md:text-lg font-bold text-white font-sans">
                  Debate Transcript, Summary & Takeaways
                </h2>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  EXPORT READY
                </span>
              </div>
              <p className="text-xs text-slate-400 font-sans">
                Comprehensive record with chronological speech logs, executive synthesis, and actionable takeaways.
              </p>
            </div>
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
            title="Close Transcript Report"
          >
            <X size={20} />
          </button>
        </div>

        {/* Action / Download Bar */}
        <div className="px-6 py-3 border-b border-slate-800/80 bg-slate-950/90 flex flex-wrap items-center justify-between gap-3 print:hidden">
          {/* Quick Filter Navigation */}
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-sans">
            <button
              onClick={() => setActiveSection('all')}
              className={`px-3 py-1.5 rounded-lg font-medium transition ${
                activeSection === 'all'
                  ? 'bg-indigo-600 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              Full Report (All)
            </button>
            <button
              onClick={() => setActiveSection('transcript')}
              className={`px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1 ${
                activeSection === 'transcript'
                  ? 'bg-indigo-600 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Quote size={13} />
              <span>1. Transcript</span>
            </button>
            <button
              onClick={() => setActiveSection('summary')}
              className={`px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1 ${
                activeSection === 'summary'
                  ? 'bg-indigo-600 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Scale size={13} />
              <span>2. Executive Summary</span>
            </button>
            <button
              onClick={() => setActiveSection('takeaways')}
              className={`px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1 ${
                activeSection === 'takeaways'
                  ? 'bg-indigo-600 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Lightbulb size={13} />
              <span>3. Major Takeaways</span>
            </button>
          </div>

          {/* Download & Copy Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Download Markdown (.md) */}
            <button
              onClick={handleDownloadMarkdown}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold font-sans flex items-center gap-1.5 transition shadow-sm"
              title="Download formatted Markdown file with frontmatter, transcript, summary and takeaways"
            >
              <Download size={13} />
              <span>Download .md</span>
            </button>

            {/* Download Plain Text (.txt) */}
            <button
              onClick={handleDownloadPlainText}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 rounded-lg text-xs font-semibold font-sans flex items-center gap-1.5 transition"
              title="Download plain text file"
            >
              <Download size={13} />
              <span>.txt</span>
            </button>

            {/* Download JSON (.json) */}
            <button
              onClick={handleDownloadJSON}
              className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 rounded-lg text-xs font-semibold font-mono transition"
              title="Download raw structured JSON dataset"
            >
              JSON
            </button>

            {/* Copy to Clipboard */}
            <button
              onClick={handleCopyMarkdown}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-sans flex items-center gap-1.5 transition border ${
                copiedFormat === 'md'
                  ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                  : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-300'
              }`}
              title="Copy entire report to clipboard"
            >
              {copiedFormat === 'md' ? <Check size={13} /> : <Copy size={13} />}
              <span>{copiedFormat === 'md' ? 'Copied!' : 'Copy'}</span>
            </button>

            {/* Print / Save PDF */}
            <button
              onClick={handlePrint}
              className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 rounded-lg transition"
              title="Print or Save as PDF"
            >
              <Printer size={15} />
            </button>
          </div>
        </div>

        {/* Filter Toolbar for Transcript View */}
        {(activeSection === 'all' || activeSection === 'transcript') && (
          <div className="px-6 py-2.5 bg-slate-900/60 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 print:hidden">
            <div className="flex items-center gap-2 flex-wrap text-xs">
              {/* Round filter */}
              <select
                value={selectedRoundFilter}
                onChange={(e) => setSelectedRoundFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-slate-300 text-xs font-sans focus:outline-none focus:border-indigo-500"
              >
                <option value="all">All Rounds ({rounds.length})</option>
                {rounds.map((r, i) => (
                  <option key={i} value={r.roundIndex}>
                    Round 0{r.roundIndex + 1} ({r.statements.length} speeches)
                  </option>
                ))}
              </select>

              {/* Debater filter */}
              <select
                value={selectedAgentFilter}
                onChange={(e) => setSelectedAgentFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-slate-300 text-xs font-sans focus:outline-none focus:border-indigo-500"
              >
                <option value="all">All Speakers ({agents.length})</option>
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.role})
                  </option>
                ))}
              </select>
            </div>

            {/* Search filter */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" size={13} />
              <input
                type="text"
                placeholder="Search speech text, claims, or keywords..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-56 sm:w-64"
              />
            </div>
          </div>
        )}

        {/* Scrollable Report Body */}
        <div className="p-6 md:p-8 overflow-y-auto flex-1 space-y-8 print:overflow-visible print:p-0">
          {/* Document Header Banner */}
          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                SCIENTIFIC DISCOURSE DOSSIER
              </span>
              <span className="text-xs font-mono text-slate-400">
                TOTAL SESSION TIME: {formatDuration(totalSeconds)} · {totalSpeeches} SPEECHES
              </span>
            </div>

            <h1 className="text-lg md:text-xl font-bold text-white font-sans">
              "{topic}"
            </h1>

            {/* Quick Metadata Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-xs font-mono">
              <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800/80">
                <span className="text-slate-500 block text-[10px]">TOTAL DEBATERS</span>
                <span className="font-bold text-slate-200">{agents.length} Personas</span>
              </div>
              <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800/80">
                <span className="text-slate-500 block text-[10px]">CONSENSUS SCORE</span>
                <span className="font-bold text-emerald-400">{summaryData.consensusScore} / 100</span>
              </div>
              <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800/80">
                <span className="text-slate-500 block text-[10px]">ROUNDS RECORDED</span>
                <span className="font-bold text-slate-200">0{rounds.length} Rounds</span>
              </div>
              <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800/80">
                <span className="text-slate-500 block text-[10px]">SYNTHESIS VERDICT</span>
                <span className="font-bold text-indigo-300 truncate block">
                  {summaryData.leadingHypothesisTitle}
                </span>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* SECTION 1: TRANSCRIPT (Chronological Speeches) */}
          {/* ========================================================================= */}
          {(activeSection === 'all' || activeSection === 'transcript') && (
            <section id="transcript-section" className="space-y-6">
              <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center text-xs font-mono font-bold">
                    1
                  </span>
                  <h2 className="text-base font-bold text-white font-sans uppercase tracking-wide">
                    Full Debate Transcript
                  </h2>
                </div>
                <span className="text-xs text-slate-400 font-mono">
                  {filteredRounds.reduce((acc, r) => acc + r.statements.length, 0)} Speeches Shown
                </span>
              </div>

              {filteredRounds.length === 0 || totalSpeeches === 0 ? (
                <div className="p-6 text-center text-slate-500 italic text-xs bg-slate-950/50 rounded-xl border border-slate-900">
                  No speeches delivered in this debate yet. Start the debate to record transcripts.
                </div>
              ) : (
                <div className="space-y-6">
                  {filteredRounds.map((round) => (
                    <div key={round.roundIndex} className="space-y-4">
                      {/* Round Banner */}
                      <div className="px-4 py-2 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between">
                        <span className="text-xs font-bold font-mono text-indigo-300">
                          {round.name}
                        </span>
                        {round.description && (
                          <span className="text-[11px] text-slate-500 font-sans hidden md:inline">
                            {round.description}
                          </span>
                        )}
                      </div>

                      {/* Statements in this round */}
                      <div className="space-y-4 pl-0 md:pl-2">
                        {round.statements.map((stmt, sIdx) => {
                          const agent = agents.find((a) => a.id === stmt.agentId);
                          const roleInfo = getScientificRoleBadge(agent?.scientificRole || stmt.scientificRole);
                          const posSign = stmt.updatedPosition > 0 ? '+' : '';

                          return (
                            <div
                              key={`${stmt.agentId}-${sIdx}`}
                              className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800/90 space-y-3 shadow-sm hover:border-slate-700 transition"
                            >
                              {/* Speaker Header */}
                              <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-slate-800/60">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-lg shadow-inner">
                                    {stmt.avatar || agent?.avatar || '🗣️'}
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-white text-xs md:text-sm font-sans">
                                        {stmt.agentName}
                                      </span>
                                      <span className={`px-2 py-0.2 rounded text-[10px] font-mono border ${roleInfo.color}`}>
                                        {roleInfo.label}
                                      </span>
                                    </div>
                                    <span className="text-[11px] text-slate-400 font-sans">
                                      {stmt.role}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 text-xs font-mono">
                                  <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
                                    Stance: <strong className={stmt.updatedPosition > 0 ? 'text-emerald-400' : 'text-rose-400'}>{posSign}{stmt.updatedPosition.toFixed(2)}</strong>
                                  </span>
                                  <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
                                    Confidence: <strong className="text-amber-400">{stmt.updatedConfidence}%</strong>
                                  </span>
                                  {stmt.timing && (
                                    <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 flex items-center gap-1 hidden sm:flex">
                                      <Clock size={11} /> {stmt.timing.durationSeconds}s
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Rebuttal Target Callout */}
                              {stmt.critiqueTarget && (
                                <div className="p-2.5 rounded-lg bg-orange-950/20 border border-orange-500/20 text-xs text-orange-200 font-sans flex items-center gap-2">
                                  <Quote size={13} className="text-orange-400 shrink-0" />
                                  <span>
                                    Rebuttal to: <strong>{stmt.critiqueTarget}</strong>
                                  </span>
                                </div>
                              )}

                              {/* Spoken Text */}
                              <div className="text-slate-200 text-xs md:text-sm leading-relaxed font-sans whitespace-pre-line">
                                {stmt.statementText}
                              </div>

                              {/* Falsification Probe if present */}
                              {stmt.falsificationAttempt && (
                                <div className="p-2.5 rounded-lg bg-amber-950/20 border border-amber-500/20 text-xs text-amber-200 flex items-start gap-2">
                                  <Target size={14} className="text-amber-400 shrink-0 mt-0.5" />
                                  <div>
                                    <strong className="text-amber-300 block text-[10px] font-mono uppercase">
                                      Falsification Test Proposed:
                                    </strong>
                                    <span className="text-slate-300">{stmt.falsificationAttempt}</span>
                                  </div>
                                </div>
                              )}

                              {/* Evaluated Claim Card */}
                              {stmt.evaluatedClaim && (
                                <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 text-xs space-y-1.5">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-mono font-bold text-indigo-400 uppercase flex items-center gap-1">
                                      <FileCheck size={12} /> Claim Card Evaluated (Tier {stmt.evaluatedClaim.evidenceTier})
                                    </span>
                                    <span className="text-[10px] font-mono text-slate-400">
                                      {stmt.evaluatedClaim.claimType}
                                    </span>
                                  </div>
                                  <p className="font-semibold text-slate-200">
                                    "{stmt.evaluatedClaim.claim}"
                                  </p>
                                  <p className="text-slate-400 text-[11px]">
                                    <strong className="text-slate-300">Prediction / Mechanism:</strong> {stmt.evaluatedClaim.testablePrediction || stmt.evaluatedClaim.confidenceRationale}
                                  </p>
                                  <p className="text-slate-400 text-[11px]">
                                    <strong className="text-slate-300">Falsifier / Warning:</strong> {stmt.evaluatedClaim.falsifier || stmt.evaluatedClaim.causalLanguageWarning || 'N/A'}
                                  </p>
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {/* User Interjection */}
                        {round.userInterjection && (
                          <div className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-500/30 text-xs text-indigo-200 space-y-1 font-sans">
                            <span className="font-mono font-bold text-[10px] text-indigo-400 uppercase block">
                              Floor Interjection / Point of Order:
                            </span>
                            <p className="italic">"{round.userInterjection}"</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* ========================================================================= */}
          {/* SECTION 2: EXECUTIVE SUMMARY (Directly Below Transcript) */}
          {/* ========================================================================= */}
          {(activeSection === 'all' || activeSection === 'summary') && (
            <section id="summary-section" className="space-y-5 pt-4">
              <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-emerald-600/20 text-emerald-400 flex items-center justify-center text-xs font-mono font-bold">
                    2
                  </span>
                  <h2 className="text-base font-bold text-white font-sans uppercase tracking-wide">
                    Executive Summary & Consensus Synthesis
                  </h2>
                </div>
                <span className="text-xs text-emerald-400 font-mono font-bold">
                  Agreement Index: {summaryData.consensusScore}%
                </span>
              </div>

              {/* Leading Model Card */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-950/30 via-slate-900 to-slate-950 border border-indigo-500/30 space-y-3 shadow-md">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 uppercase">
                    Synthesized Verdict Model
                  </span>
                  <span className="text-xs font-mono text-amber-400">
                    High Confidence Consensus
                  </span>
                </div>

                <h3 className="text-base md:text-lg font-bold text-white font-sans">
                  {summaryData.leadingHypothesisTitle}
                </h3>

                <p className="text-xs md:text-sm text-slate-300 leading-relaxed font-sans">
                  <strong className="text-indigo-300">Biophysical Rationale:</strong> {summaryData.leadingMechanism}
                </p>
              </div>

              {/* Evaluation Narrative */}
              <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
                  Comprehensive Synthesis Narrative:
                </span>
                <p className="text-xs md:text-sm text-slate-200 leading-relaxed font-sans whitespace-pre-line">
                  {summaryData.executiveSummary}
                </p>
              </div>

              {/* Quad-Lens Evaluation Score Cards */}
              {session.judgeResult?.quadLensScores && (
                <div className="space-y-2">
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
                    Quad-Lens Epistemic Rigor Scores:
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 bg-cyan-950/20 border border-cyan-500/20 rounded-xl space-y-1">
                      <div className="flex items-center justify-between text-cyan-400">
                        <Dna size={15} />
                        <span className="font-mono font-bold text-xs">
                          {session.judgeResult.quadLensScores.scientific}%
                        </span>
                      </div>
                      <span className="text-[11px] font-semibold text-slate-200 block">
                        Molecular & Sci
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Biophysical plausibility
                      </span>
                    </div>

                    <div className="p-3 bg-amber-950/20 border border-amber-500/20 rounded-xl space-y-1">
                      <div className="flex items-center justify-between text-amber-400">
                        <Calculator size={15} />
                        <span className="font-mono font-bold text-xs">
                          {session.judgeResult.quadLensScores.mathematical}%
                        </span>
                      </div>
                      <span className="text-[11px] font-semibold text-slate-200 block">
                        Mathematical
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Power & dynamical model
                      </span>
                    </div>

                    <div className="p-3 bg-purple-950/20 border border-purple-500/20 rounded-xl space-y-1">
                      <div className="flex items-center justify-between text-purple-400">
                        <Compass size={15} />
                        <span className="font-mono font-bold text-xs">
                          {session.judgeResult.quadLensScores.philosophical}%
                        </span>
                      </div>
                      <span className="text-[11px] font-semibold text-slate-200 block">
                        Epistemology
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Falsifiability & criteria
                      </span>
                    </div>

                    <div className="p-3 bg-rose-950/20 border border-rose-500/20 rounded-xl space-y-1">
                      <div className="flex items-center justify-between text-rose-400">
                        <Scale size={15} />
                        <span className="font-mono font-bold text-xs">
                          {session.judgeResult.quadLensScores.moral}%
                        </span>
                      </div>
                      <span className="text-[11px] font-semibold text-slate-200 block">
                        Bioethics & QALY
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Utility & toxicity burden
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Round by Round Progression */}
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
                  Round-by-Round Evolution Summary:
                </span>
                <ul className="space-y-1.5 text-xs text-slate-300 font-sans">
                  {summaryData.roundProgressionNarrative.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-indigo-400 font-bold font-mono">0{idx + 1}.</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}

          {/* ========================================================================= */}
          {/* SECTION 3: MAJOR TAKEAWAYS & DIRECTIVES (Directly Below Summary) */}
          {/* ========================================================================= */}
          {(activeSection === 'all' || activeSection === 'takeaways') && (
            <section id="takeaways-section" className="space-y-5 pt-4">
              <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-amber-600/20 text-amber-400 flex items-center justify-center text-xs font-mono font-bold">
                    3
                  </span>
                  <h2 className="text-base font-bold text-white font-sans uppercase tracking-wide">
                    Major Takeaways & Actionable Directives
                  </h2>
                </div>
                <span className="text-xs text-slate-400 font-mono">
                  Translational & Experimental Action Items
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Scientific Consensus Points */}
                <div className="p-5 rounded-2xl bg-emerald-950/15 border border-emerald-500/25 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-400">
                    <Check size={16} />
                    <h3 className="text-xs font-bold font-mono uppercase tracking-wider">
                      Key Consensus Agreements
                    </h3>
                  </div>
                  <ul className="space-y-2 text-xs text-slate-200 font-sans">
                    {summaryData.consensusAgreements.map((pt, i) => (
                      <li key={i} className="flex items-start gap-2 leading-relaxed">
                        <span className="text-emerald-400 font-bold font-mono text-[10px]">
                          ✓
                        </span>
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* 2. Remaining Cruxes & Unresolved Dilemmas */}
                <div className="p-5 rounded-2xl bg-rose-950/15 border border-rose-500/25 space-y-3">
                  <div className="flex items-center gap-2 text-rose-400">
                    <AlertTriangle size={16} />
                    <h3 className="text-xs font-bold font-mono uppercase tracking-wider">
                      Remaining Cruxes & Vulnerabilities
                    </h3>
                  </div>
                  <ul className="space-y-2 text-xs text-slate-200 font-sans">
                    {summaryData.remainingCruxes.map((cx, i) => (
                      <li key={i} className="flex items-start gap-2 leading-relaxed">
                        <span className="text-rose-400 font-bold font-mono text-[10px]">
                          !
                        </span>
                        <span>{cx}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* 3. Clinical & Translational Implications */}
                <div className="p-5 rounded-2xl bg-blue-950/15 border border-blue-500/25 space-y-3">
                  <div className="flex items-center gap-2 text-blue-400">
                    <Layers size={16} />
                    <h3 className="text-xs font-bold font-mono uppercase tracking-wider">
                      Clinical & Trial Implications
                    </h3>
                  </div>
                  <ul className="space-y-2 text-xs text-slate-200 font-sans">
                    {summaryData.clinicalTranslationalImplications.map((imp, i) => (
                      <li key={i} className="flex items-start gap-2 leading-relaxed">
                        <span className="text-blue-400 font-bold font-mono text-[10px]">
                          →
                        </span>
                        <span>{imp}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* 4. Evidence Tier & Statistical Power Audit */}
                <div className="p-5 rounded-2xl bg-amber-950/15 border border-amber-500/25 space-y-3">
                  <div className="flex items-center gap-2 text-amber-400">
                    <Calculator size={16} />
                    <h3 className="text-xs font-bold font-mono uppercase tracking-wider">
                      Evidence & Power Standards
                    </h3>
                  </div>
                  <div className="space-y-2 text-xs text-slate-200 font-sans">
                    <p className="leading-relaxed">
                      <strong className="text-amber-300">Tier Assessment:</strong> {summaryData.evidenceTierSummary}
                    </p>
                    <p className="leading-relaxed">
                      <strong className="text-amber-300">Sample Sizing:</strong> {summaryData.methodologicalPowerSummary}
                    </p>
                  </div>
                </div>
              </div>

              {/* 5. Pre-registered Protocols Next Steps */}
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center gap-2 text-indigo-400">
                  <Target size={16} />
                  <h3 className="text-xs font-bold font-mono uppercase tracking-wider">
                    Recommended Pre-registered Experimental Protocols
                  </h3>
                </div>
                <ul className="space-y-2 text-xs text-slate-300 font-sans">
                  {summaryData.preregisteredNextSteps.map((step, i) => (
                    <li key={i} className="flex items-start gap-2 leading-relaxed p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                      <span className="text-indigo-400 font-bold font-mono">0{i + 1}.</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="text-xs text-slate-400 font-mono">
            Format: Markdown, Text & Structured JSON supported
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadMarkdown}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold font-sans flex items-center gap-1.5 transition shadow-sm"
            >
              <Download size={14} />
              <span>Download Markdown Report</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 rounded-xl text-xs font-medium font-sans transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
