import React, { useState, useEffect } from 'react';
import { PatientCase, ClinicalTrialItem, LandmarkTrialPublication } from '../types/oncology';
import {
  fetchClinicalTrials,
  fetchLandmarkTrials,
  matchTrialsForCase,
  type TrialMatchResult,
} from '../services/apiClient';
import {
  Search,
  ExternalLink,
  Filter,
  CheckCircle2,
  Clock,
  Sparkles,
  RefreshCw,
  AlertCircle,
  FileText,
  BookOpen,
  Award,
  Layers,
  Dna,
} from 'lucide-react';

interface ClinicalTrialsExplorerProps {
  patientCase: PatientCase;
  preselectedIntervention?: string;
}

export const ClinicalTrialsExplorer: React.FC<ClinicalTrialsExplorerProps> = ({
  patientCase,
  preselectedIntervention,
}) => {
  const [activeTab, setActiveTab] = useState<'registry' | 'landmark' | 'genomic'>('registry');
  const [condition, setCondition] = useState<string>(patientCase.cancerType);
  const [intervention, setIntervention] = useState(preselectedIntervention || '');
  const [status, setStatus] = useState('RECRUITING,ACTIVE_NOT_RECRUITING');
  const [studies, setStudies] = useState<ClinicalTrialItem[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedNctId, setExpandedNctId] = useState<string | null>(null);

  // Landmark Trial Publications State
  const [landmarkTrials, setLandmarkTrials] = useState<LandmarkTrialPublication[]>([]);
  const [landmarkQuery, setLandmarkQuery] = useState<string>('');
  const [isLoadingLandmark, setIsLoadingLandmark] = useState<boolean>(false);
  const [landmarkError, setLandmarkError] = useState<string | null>(null);

  // Server-side genomic-profile match state
  const [matchResult, setMatchResult] = useState<TrialMatchResult | null>(null);
  const [isMatching, setIsMatching] = useState<boolean>(false);
  const [matchError, setMatchError] = useState<string | null>(null);
  const [expandedMatchNct, setExpandedMatchNct] = useState<string | null>(null);

  // Sync default condition when case changes
  useEffect(() => {
    setCondition(patientCase.cancerType);
    if (preselectedIntervention) {
      setIntervention(preselectedIntervention);
    }
  }, [patientCase.cancerType, preselectedIntervention]);

  const runQuery = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchClinicalTrials(condition, intervention, status, 12);
      setStudies(data.studies);
      setTotalCount(data.totalCount);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error fetching clinical trials');
    } finally {
      setIsLoading(false);
    }
  };

  const loadLandmarks = async (queryTerm = landmarkQuery) => {
    setIsLoadingLandmark(true);
    setLandmarkError(null);
    try {
      const res = await fetchLandmarkTrials(queryTerm);
      setLandmarkTrials(res.trials);
    } catch (err: unknown) {
      setLandmarkError(err instanceof Error ? err.message : 'Error loading landmark trials');
    } finally {
      setIsLoadingLandmark(false);
    }
  };

  // Initial load for clinical trials
  useEffect(() => {
    runQuery();
  }, [condition, intervention, status]);

  // Load landmark trials on mount or tab switch
  useEffect(() => {
    if (activeTab === 'landmark' && landmarkTrials.length === 0) {
      loadLandmarks('');
    }
  }, [activeTab]);

  const runGenomicMatch = async () => {
    setIsMatching(true);
    setMatchError(null);
    try {
      const { result } = await matchTrialsForCase(patientCase, { pageSize: 20 });
      setMatchResult(result);
      if (!result.available) {
        setMatchError(result.reason || 'Server-side trial match unavailable');
      }
    } catch (err: unknown) {
      setMatchError(err instanceof Error ? err.message : 'Error running genomic trial match');
    } finally {
      setIsMatching(false);
    }
  };

  // Run the server-side match when the tab is opened.
  useEffect(() => {
    if (activeTab === 'genomic' && !matchResult && !isMatching) {
      runGenomicMatch();
    }
  }, [activeTab]);

  // Suggested keywords based on patient case alterations
  const suggestedInterventions = [
    ...patientCase.genomicAlterations.map((a) => a.gene),
    ...(patientCase.cancerType.includes('Lung') ? ['osimertinib', 'amivantamab', 'lazertinib'] : []),
    ...(patientCase.cancerType.includes('Colorectal') ? ['sotorasib', 'adagrasib', 'cetuximab', 'trifluridine'] : []),
    ...(patientCase.cancerType.includes('Ovarian') ? ['olaparib', 'rucaparib', 'mirvetuximab'] : []),
    ...(patientCase.cancerType.includes('Melanoma') ? ['encorafenib', 'binimetinib', 'nivolumab', 'ipilimumab'] : []),
    ...(patientCase.cancerType.includes('Pancreatic') ? ['nab-paclitaxel', 'FOLFIRINOX', 'KRAS G12D'] : []),
  ];
  const uniqueSuggestions = Array.from(new Set(suggestedInterventions)).slice(0, 6);

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-xs divide-y divide-slate-100 font-sans">
      {/* Navigation Tabs */}
      <div className="px-4 sm:px-5 pt-3 pb-0 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
        <div className="flex space-x-1 sm:space-x-3">
          <button
            type="button"
            onClick={() => setActiveTab('registry')}
            className={`py-2 px-3 text-xs font-mono font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'registry'
                ? 'border-teal-600 text-teal-700 bg-white rounded-t'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>Active Trials Registry (Live API)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('landmark');
              if (landmarkTrials.length === 0) loadLandmarks('');
            }}
            className={`py-2 px-3 text-xs font-mono font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'landmark'
                ? 'border-teal-600 text-teal-700 bg-white rounded-t'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Award className="w-3.5 h-3.5 text-amber-500" />
            <span>Landmark Phase 3 Evidence (OSS Corpus)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('genomic');
              if (!matchResult && !isMatching) runGenomicMatch();
            }}
            className={`py-2 px-3 text-xs font-mono font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'genomic'
                ? 'border-teal-600 text-teal-700 bg-white rounded-t'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Dna className="w-3.5 h-3.5 text-indigo-500" />
            <span>Genomic Profile Match (Server-Side)</span>
          </button>
        </div>

        <span className="hidden sm:inline-block text-[11px] font-mono text-slate-500">
          {activeTab === 'registry'
            ? totalCount > 0 ? `${totalCount} Registered Studies` : 'ClinicalTrials.gov v2'
            : activeTab === 'landmark'
            ? `${landmarkTrials.length} Landmark Phase 3 Publications`
            : matchResult
            ? `${matchResult.considered} of ${matchResult.totalRegistryHits} ranked`
            : 'Ranking trials against the patient profile'}
        </span>
      </div>

      {activeTab === 'registry' ? (
        <>
          {/* Header & Query Bar */}
          <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-50 to-white">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div className="flex items-center space-x-2">
                <Search className="w-4 h-4 text-teal-600" />
                <h3 className="text-xs font-bold font-mono tracking-wider text-slate-900 uppercase">
                  ClinicalTrials.gov Protocol Explorer
                </h3>
              </div>
              <span className="text-[11px] font-mono text-slate-500">
                {totalCount > 0 ? `${totalCount} actively registered trials` : 'Searching trials...'}
              </span>
            </div>

            {/* Search Input Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 text-xs">
              <div className="sm:col-span-5">
                <label className="block text-[10px] font-mono text-slate-500 mb-1 uppercase font-semibold">
                  Condition / Malignancy
                </label>
                <input
                  type="text"
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                  placeholder="e.g. Non-Small Cell Lung Cancer"
                  className="w-full px-2.5 py-1.5 rounded border border-slate-300 font-sans text-xs focus:ring-1 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-4">
                <label className="block text-[10px] font-mono text-slate-500 mb-1 uppercase font-semibold">
                  Intervention / Target
                </label>
                <input
                  type="text"
                  value={intervention}
                  onChange={(e) => setIntervention(e.target.value)}
                  placeholder="e.g. osimertinib, KRAS, PARP"
                  className="w-full px-2.5 py-1.5 rounded border border-slate-300 font-sans text-xs focus:ring-1 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-3 flex items-end">
                <button
                  type="button"
                  onClick={runQuery}
                  disabled={isLoading}
                  className="w-full py-1.5 px-3 rounded bg-teal-600 hover:bg-teal-700 text-white font-mono font-semibold text-xs flex items-center justify-center space-x-1.5 transition cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                  <span>{isLoading ? 'Searching...' : 'Refresh Trials'}</span>
                </button>
              </div>
            </div>

            {/* Suggested Target Chips */}
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[11px] font-mono text-slate-500">
              <span className="text-[10px] uppercase font-semibold text-slate-400">Quick Filters:</span>
              {uniqueSuggestions.map((sug) => (
                <button
                  type="button"
                  key={sug}
                  onClick={() => setIntervention(sug)}
                  className={`px-2 py-0.5 rounded text-[10px] transition border cursor-pointer ${
                    intervention === sug
                      ? 'bg-teal-100 text-teal-800 border-teal-300 font-semibold'
                      : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  {sug}
                </button>
              ))}
              {intervention && (
                <button
                  type="button"
                  onClick={() => setIntervention('')}
                  className="text-[10px] text-slate-400 hover:text-slate-600 underline ml-1"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Results Container */}
          <div className="p-4 sm:p-5">
            {error && (
              <div className="p-3 mb-4 rounded bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {isLoading ? (
              <div className="py-8 text-center text-xs text-slate-500 space-y-2">
                <RefreshCw className="w-5 h-5 mx-auto animate-spin text-teal-600" />
                <p>Querying ClinicalTrials.gov API v2 for active protocols...</p>
              </div>
            ) : studies.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500 font-mono">
                No matching active clinical trials found for &quot;{condition}&quot; {intervention ? `with &quot;${intervention}&quot;` : ''}.
              </div>
            ) : (
              <div className="space-y-3">
                {studies.map((study) => {
                  const isExpanded = expandedNctId === study.nctId;

                  return (
                    <div
                      key={study.nctId}
                      className="p-3.5 rounded border border-slate-200 hover:border-slate-300 bg-white transition text-xs space-y-2"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2 font-mono">
                            <a
                              href={study.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-bold text-teal-700 hover:text-teal-900 underline inline-flex items-center gap-1"
                            >
                              <span>{study.nctId}</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                            <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 text-[10px] font-semibold border border-slate-200">
                              {study.phase}
                            </span>
                            <span
                              className={`px-1.5 py-0.2 rounded text-[10px] font-bold uppercase ${
                                study.overallStatus === 'RECRUITING'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}
                            >
                              {study.overallStatus.replace(/_/g, ' ')}
                            </span>
                          </div>

                          <h4 className="font-semibold text-slate-900 leading-snug">
                            {study.briefTitle}
                          </h4>
                        </div>

                        <button
                          type="button"
                          onClick={() => setExpandedNctId(isExpanded ? null : study.nctId)}
                          className="text-[11px] font-mono text-teal-700 hover:text-teal-900 underline flex items-center gap-1 cursor-pointer"
                        >
                          <span>{isExpanded ? 'Hide Criteria' : 'Eligibility Criteria'}</span>
                        </button>
                      </div>

                      {study.interventions.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1 text-[11px] font-mono text-slate-600">
                          <span className="font-semibold text-slate-700">Interventions:</span>
                          {study.interventions.map((intr, i) => (
                            <span
                              key={i}
                              className="px-1.5 py-0.2 rounded bg-slate-100 border border-slate-200 text-slate-800 text-[10px]"
                            >
                              {intr}
                            </span>
                          ))}
                        </div>
                      )}

                      {study.briefSummary && (
                        <p className="text-[11px] text-slate-600 leading-relaxed font-sans line-clamp-2">
                          {study.briefSummary}
                        </p>
                      )}

                      {isExpanded && study.eligibilitySnippet && (
                        <div className="p-3 mt-2 rounded bg-slate-50 border border-slate-200 text-[11px] font-mono text-slate-700 space-y-1">
                          <div className="font-bold text-slate-900 uppercase text-[10px]">
                            Eligibility Criteria Extract:
                          </div>
                          <p className="whitespace-pre-line leading-relaxed font-sans text-xs">
                            {study.eligibilitySnippet}
                          </p>
                          <div className="pt-1 text-[10px] text-slate-400">
                            View complete inclusion/exclusion criteria on ClinicalTrials.gov via link above.
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      ) : activeTab === 'landmark' ? (
        /* Landmark Phase 3 Evidence View */
        <>
          <div className="p-4 sm:p-5 bg-gradient-to-r from-amber-50/50 to-white">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div className="flex items-center space-x-2">
                <BookOpen className="w-4 h-4 text-amber-600" />
                <h3 className="text-xs font-bold font-mono tracking-wider text-slate-900 uppercase">
                  Curated Landmark Phase 3 Clinical Evidence
                </h3>
              </div>
              <span className="text-[11px] font-mono text-slate-500">
                Peer-reviewed literature corpus (NEJM, Lancet Oncol, JCO)
              </span>
            </div>

            {/* Landmark Search Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 text-xs">
              <div className="sm:col-span-9">
                <input
                  type="text"
                  value={landmarkQuery}
                  onChange={(e) => {
                    setLandmarkQuery(e.target.value);
                    loadLandmarks(e.target.value);
                  }}
                  placeholder="Filter by trial (e.g. KEYNOTE-407, PAOLA-1, SOLO-1), tumor type, or biomarker..."
                  className="w-full px-2.5 py-1.5 rounded border border-slate-300 font-sans text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-3 flex items-end">
                <button
                  type="button"
                  onClick={() => loadLandmarks(landmarkQuery)}
                  disabled={isLoadingLandmark}
                  className="w-full py-1.5 px-3 rounded bg-amber-600 hover:bg-amber-700 text-white font-mono font-semibold text-xs flex items-center justify-center space-x-1.5 transition cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingLandmark ? 'animate-spin' : ''}`} />
                  <span>{isLoadingLandmark ? 'Loading...' : 'Filter Evidence'}</span>
                </button>
              </div>
            </div>

            {/* Landmark Quick Chips */}
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[11px] font-mono text-slate-500">
              <span className="text-[10px] uppercase font-semibold text-slate-400">Quick Filters:</span>
              {[
                { label: 'All Phase 3', query: '' },
                { label: 'Lung (KEYNOTE/CheckMate)', query: 'lung' },
                { label: 'PARP / HRD (OlympiAD/PAOLA)', query: 'parp' },
                { label: 'Ovarian (SOLO/PRIMA)', query: 'ovarian' },
                { label: 'Immunotherapy', query: 'pembrolizumab' },
              ].map((chip) => (
                <button
                  type="button"
                  key={chip.label}
                  onClick={() => {
                    setLandmarkQuery(chip.query);
                    loadLandmarks(chip.query);
                  }}
                  className={`px-2 py-0.5 rounded text-[10px] transition border cursor-pointer ${
                    landmarkQuery === chip.query
                      ? 'bg-amber-100 text-amber-900 border-amber-300 font-semibold'
                      : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>

          {/* Landmark Results List */}
          <div className="p-4 sm:p-5">
            {landmarkError && (
              <div className="p-3 mb-4 rounded bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{landmarkError}</span>
              </div>
            )}

            {isLoadingLandmark ? (
              <div className="py-8 text-center text-xs text-slate-500 space-y-2">
                <RefreshCw className="w-5 h-5 mx-auto animate-spin text-amber-600" />
                <p>Loading curated landmark publications...</p>
              </div>
            ) : landmarkTrials.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500 font-mono">
                No curated landmark publications found matching &quot;{landmarkQuery}&quot;.
              </div>
            ) : (
              <div className="space-y-3">
                {landmarkTrials.map((t, idx) => (
                  <div
                    key={`${t.trial}-${idx}`}
                    className="p-3.5 rounded border border-slate-200 hover:border-slate-300 bg-white transition text-xs space-y-2.5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2 font-mono">
                          <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-900 font-bold text-xs border border-blue-200">
                            {t.trial}
                          </span>
                          {t.publicationType && (
                            <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 text-[10px] font-semibold border border-amber-200">
                              {t.publicationType}
                            </span>
                          )}
                        </div>
                        {t.title && (
                          <h4 className="font-semibold text-slate-900 text-xs mt-1 leading-snug">
                            {t.title}
                          </h4>
                        )}
                      </div>

                      <div className="flex items-center gap-3 font-mono text-[11px]">
                        {t.pmid && t.pmid !== 'N/A' && (
                          <a
                            href={`https://pubmed.ncbi.nlm.nih.gov/${t.pmid}/`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 underline inline-flex items-center gap-0.5"
                          >
                            <span>PMID: {t.pmid}</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}
                        {t.doi && (
                          <a
                            href={`https://doi.org/${t.doi}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-slate-600 hover:text-slate-800 underline inline-flex items-center gap-0.5"
                          >
                            <span>DOI</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Citation details & Biomarker */}
                    <div className="p-2.5 rounded bg-slate-50 border border-slate-100 text-[11px] font-mono space-y-1">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-slate-600">
                        <span>
                          <strong className="text-slate-800">{t.firstAuthor}</strong> et al.,{' '}
                          <em>{t.journal}</em> ({t.year})
                        </span>
                        {t.biomarkersAnalyzed && (
                          <span className="px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px]">
                            Biomarker: {t.biomarkersAnalyzed}
                          </span>
                        )}
                      </div>
                      {t.keyFinding && (
                        <p className="text-slate-700 font-sans text-xs pt-1 leading-relaxed">
                          {t.keyFinding}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        /* ==== Genomic Profile Match (server-side) ==== */
        <>
          <div className="p-4 sm:p-5 bg-gradient-to-r from-indigo-50/60 to-white">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div className="flex items-center space-x-2">
                <Dna className="w-4 h-4 text-indigo-600" />
                <h3 className="text-xs font-bold font-mono tracking-wider text-slate-900 uppercase">
                  Biomarker-Ranked Trial Match
                </h3>
              </div>
              <button
                type="button"
                onClick={runGenomicMatch}
                disabled={isMatching}
                className="py-1.5 px-3 rounded bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-mono font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isMatching ? 'animate-spin' : ''}`} />
                <span>{isMatching ? 'Matching…' : 'Re-run match'}</span>
              </button>
            </div>

            <p className="text-[11px] text-slate-600 leading-relaxed">
              The server queries ClinicalTrials.gov v2 for the patient&apos;s resolved OncoTree
              condition and driver genes, then scores every returned protocol against its eligibility
              criteria — allele-level phrasing, biomarker terms, and exclusion clauses. Each score
              component is itemised so it can be audited.
            </p>

            {matchResult && matchResult.available && (
              <div className="mt-3 flex flex-wrap gap-1.5 text-[10px] font-mono">
                <span className="px-2 py-1 rounded bg-slate-100 border border-slate-200 text-slate-700">
                  condition: {matchResult.query.conditionQuery}
                </span>
                {matchResult.query.geneTerms.map((g) => (
                  <span key={g} className="px-2 py-1 rounded bg-indigo-100 border border-indigo-200 text-indigo-800 font-semibold">
                    {g}
                  </span>
                ))}
                {matchResult.query.alterationTerms.map((a) => (
                  <span key={a} className="px-2 py-1 rounded bg-teal-100 border border-teal-200 text-teal-800">
                    {a}
                  </span>
                ))}
                {matchResult.query.biomarkerTerms.map((b) => (
                  <span key={b} className="px-2 py-1 rounded bg-amber-100 border border-amber-200 text-amber-800">
                    {b}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="p-4 sm:p-5">
            {matchError && (
              <div className="p-3 mb-4 rounded bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-px" />
                <span>{matchError}</span>
              </div>
            )}

            {isMatching ? (
              <div className="py-8 text-center text-xs text-slate-500 space-y-2">
                <RefreshCw className="w-5 h-5 mx-auto animate-spin text-indigo-600" />
                <p>Building the registry query from the patient profile and ranking protocols…</p>
              </div>
            ) : !matchResult || matchResult.trials.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500 font-mono">
                {matchResult?.available
                  ? 'No protocols returned for this profile. This is an absence of matches, not a failed search.'
                  : 'Server-side match unavailable — see the message above.'}
              </div>
            ) : (
              <div className="space-y-3">
                {matchResult.trials.map((t) => {
                  const isExpanded = expandedMatchNct === t.nctId;
                  return (
                    <div
                      key={t.nctId}
                      className="p-3.5 rounded border border-slate-200 hover:border-indigo-300 bg-white transition text-xs space-y-2"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 font-mono">
                            <a
                              href={t.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-bold text-indigo-700 hover:text-indigo-900 underline inline-flex items-center gap-1"
                            >
                              <span>{t.nctId}</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                            <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 text-[10px] font-semibold border border-slate-200">
                              {t.phase}
                            </span>
                            <span
                              className={`px-1.5 py-0.2 rounded text-[10px] font-bold uppercase ${
                                t.overallStatus === 'RECRUITING'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}
                            >
                              {t.overallStatus.replace(/_/g, ' ')}
                            </span>
                            <span className="px-1.5 py-0.2 rounded bg-indigo-600 text-white text-[10px] font-bold">
                              score {t.score}
                            </span>
                          </div>
                          <h4 className="font-semibold text-slate-900 leading-snug">{t.briefTitle}</h4>
                        </div>
                        <button
                          type="button"
                          onClick={() => setExpandedMatchNct(isExpanded ? null : t.nctId)}
                          className="text-[11px] font-mono text-indigo-700 hover:text-indigo-900 underline cursor-pointer"
                        >
                          {isExpanded ? 'Hide match reasons' : 'Why this matched'}
                        </button>
                      </div>

                      {t.matchedBiomarkers.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1 text-[11px] font-mono">
                          <span className="font-semibold text-slate-700">Matched:</span>
                          {t.matchedBiomarkers.map((m) => (
                            <span key={m} className="px-1.5 py-0.2 rounded bg-teal-50 border border-teal-200 text-teal-800 text-[10px]">
                              {m}
                            </span>
                          ))}
                        </div>
                      )}

                      {t.excludedSignals.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1 text-[11px] font-mono">
                          <span className="font-semibold text-rose-700">Also in exclusions:</span>
                          {t.excludedSignals.map((m) => (
                            <span key={m} className="px-1.5 py-0.2 rounded bg-rose-50 border border-rose-200 text-rose-800 text-[10px]">
                              {m}
                            </span>
                          ))}
                        </div>
                      )}

                      {isExpanded && (
                        <ul className="p-3 rounded bg-slate-50 border border-slate-200 text-[11px] font-mono text-slate-700 space-y-1 list-disc list-inside">
                          {t.matchRationale.map((r, i) => (
                            <li key={i}>{r}</li>
                          ))}
                        </ul>
                      )}

                      {isExpanded && t.eligibilitySnippet && (
                        <div className="p-3 rounded bg-slate-50 border border-slate-200 text-[11px] text-slate-700">
                          <div className="font-bold text-slate-900 uppercase text-[10px] mb-1 font-mono">
                            Eligibility extract
                          </div>
                          <p className="whitespace-pre-line leading-relaxed">{t.eligibilitySnippet}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
                {matchResult.attribution && (
                  <p className="text-[10px] text-slate-400 font-mono pt-1">{matchResult.attribution}</p>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
