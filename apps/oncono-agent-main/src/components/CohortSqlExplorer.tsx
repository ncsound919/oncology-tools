import React, { useState, useEffect } from 'react';
import {
  Database,
  Play,
  RefreshCw,
  Table,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  Copy,
  Download,
  Info,
} from 'lucide-react';
import {
  fetchCohortStatus,
  fetchCohortSchema,
  fetchCohortSummary,
  runCohortQuery,
} from '../services/apiClient';

interface ColumnMeta {
  name: string;
  type: string;
}

interface RegisteredDataset {
  viewName: string;
  filePath: string;
  sizeBytes: number;
}

export const CohortSqlExplorer: React.FC = () => {
  const [dbStatus, setDbStatus] = useState<{
    ready: boolean;
    dataRoot: string | null;
    registeredDatasets: RegisteredDataset[];
    error?: string;
  } | null>(null);

  const [isLoadingStatus, setIsLoadingStatus] = useState(false);
  const [selectedView, setSelectedView] = useState<string>('');
  const [viewSchema, setViewSchema] = useState<ColumnMeta[]>([]);
  const [viewSummary, setViewSummary] = useState<{
    rowCount: number;
    sample: Record<string, unknown>[];
  } | null>(null);

  const [sqlQuery, setSqlQuery] = useState<string>('SELECT * FROM "onco_sample" LIMIT 10;');
  const [isExecuting, setIsExecuting] = useState(false);
  const [queryResult, setQueryResult] = useState<{
    columns: ColumnMeta[];
    rows: Record<string, unknown>[];
    rowCount: number;
    durationMs: number;
    sql: string;
    datasetsReferenced: string[];
  } | null>(null);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [copiedNotification, setCopiedNotification] = useState(false);

  const loadStatus = async () => {
    setIsLoadingStatus(true);
    try {
      const status = await fetchCohortStatus();
      setDbStatus(status);
      if (status.registeredDatasets.length > 0 && !selectedView) {
        const first = status.registeredDatasets[0].viewName;
        setSelectedView(first);
        loadViewDetails(first);
      }
    } catch (err: unknown) {
      console.error('Failed to load CohortDB status:', err);
    } finally {
      setIsLoadingStatus(false);
    }
  };

  const loadViewDetails = async (viewName: string) => {
    try {
      const [schemaRes, summaryRes] = await Promise.all([
        fetchCohortSchema(viewName),
        fetchCohortSummary(viewName),
      ]);
      setViewSchema(schemaRes.columns || []);
      setViewSummary({ rowCount: summaryRes.rowCount, sample: summaryRes.sample });
    } catch (err: unknown) {
      console.error('Failed to load view details:', err);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const handleExecute = async () => {
    if (!sqlQuery.trim()) return;
    setIsExecuting(true);
    setQueryError(null);
    try {
      const res = await runCohortQuery(sqlQuery);
      setQueryResult(res);
    } catch (err: unknown) {
      setQueryError(err instanceof Error ? err.message : 'Query execution error');
      setQueryResult(null);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleExecute();
    }
  };

  const setQueryPreset = (sql: string) => {
    setSqlQuery(sql);
    setQueryError(null);
  };

  const copyResultsAsJson = () => {
    if (!queryResult) return;
    navigator.clipboard.writeText(JSON.stringify(queryResult.rows, null, 2));
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2500);
  };

  const downloadResultsAsCsv = () => {
    if (!queryResult || queryResult.rows.length === 0) return;
    const cols = queryResult.columns.map((c) => c.name);
    const header = cols.join(',');
    const lines = queryResult.rows.map((row) =>
      cols
        .map((c) => {
          const val = row[c] ?? '';
          const str = String(val).replace(/"/g, '""');
          return `"${str}"`;
        })
        .join(',')
    );
    const csvContent = [header, ...lines].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `cohort-query-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* 1. Header & Engine Status Banner */}
      <div className="p-4 rounded-lg bg-slate-900 border border-slate-800 text-white flex flex-wrap items-center justify-between gap-3 font-mono">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded bg-teal-500/20 text-teal-300 border border-teal-500/40">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-100">
                DuckDB In-Process Cohort Engine
              </h3>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                  dbStatus?.ready
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/80'
                    : 'bg-amber-950 text-amber-300 border border-amber-700/80'
                }`}
              >
                {dbStatus?.ready ? 'Ready (Zero-Copy)' : 'Initializing...'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-sans mt-0.5">
              High-performance analytical SQL over TCGA / SurvBoard multi-modal CSV corpora without ETL.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3 text-xs">
          <div className="text-right">
            <span className="text-[10px] text-slate-400 uppercase block">Registered Views</span>
            <span className="font-bold text-teal-300">
              {dbStatus?.registeredDatasets.length ?? 0} Views
            </span>
          </div>
          <button
            type="button"
            onClick={loadStatus}
            disabled={isLoadingStatus}
            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
            title="Reload views"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingStatus ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. Registered Views & Quick Schema Inspector */}
      <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/70 font-sans">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2 font-mono">
          <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-800 uppercase">
            <Table className="w-3.5 h-3.5 text-teal-600" />
            <span>Virtual Tables / Views Available for SQL Query</span>
          </div>
          <span className="text-[10px] text-slate-500">
            Root: <code className="text-slate-700">{dbStatus?.dataRoot || 'Embedded fallback mode'}</code>
          </span>
        </div>

        {/* View Selection Badges */}
        <div className="flex flex-wrap gap-1.5 mb-3 font-mono">
          {dbStatus?.registeredDatasets.map((ds) => (
            <button
              key={ds.viewName}
              type="button"
              onClick={() => {
                setSelectedView(ds.viewName);
                loadViewDetails(ds.viewName);
                setSqlQuery(`SELECT * FROM "${ds.viewName}" LIMIT 10;`);
              }}
              className={`px-2.5 py-1 rounded text-xs transition cursor-pointer flex items-center space-x-1.5 ${
                selectedView === ds.viewName
                  ? 'bg-teal-600 text-white font-bold shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <span>{ds.viewName}</span>
              <span className="text-[10px] opacity-75">
                ({(ds.sizeBytes / 1024).toFixed(0)} KB)
              </span>
            </button>
          ))}
        </div>

        {/* Selected View Metadata Strip */}
        {selectedView && (
          <div className="p-2.5 rounded bg-white border border-slate-200 text-xs font-mono space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-1.5">
              <div className="flex items-center space-x-2">
                <span className="text-[10px] uppercase font-bold text-slate-400">Inspecting:</span>
                <span className="font-bold text-teal-700">{selectedView}</span>
                {viewSummary && (
                  <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                    {viewSummary.rowCount.toLocaleString()} total rows
                  </span>
                )}
              </div>
              <div className="text-[10px] text-slate-400">
                Columns: <strong>{viewSchema.length}</strong>
              </div>
            </div>

            {/* Column badges */}
            <div className="flex flex-wrap gap-1">
              {viewSchema.map((col) => (
                <span
                  key={col.name}
                  className="px-1.5 py-0.5 rounded bg-slate-50 border border-slate-200 text-[10px] text-slate-700"
                >
                  <strong className="text-slate-900">{col.name}</strong>{' '}
                  <span className="text-slate-400 text-[9px]">{col.type}</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 3. SQL Query Editor */}
      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden font-mono shadow-xs">
        <div className="p-2.5 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center space-x-2 text-slate-300">
            <Layers className="w-3.5 h-3.5 text-teal-400" />
            <span className="font-bold text-white uppercase text-[11px]">SQL Query Input</span>
            <span className="text-[10px] text-slate-400 font-sans">(Press Ctrl+Enter to execute)</span>
          </div>

          {/* Preset Buttons */}
          <div className="flex flex-wrap gap-1 text-[10px]">
            <button
              type="button"
              onClick={() =>
                setQueryPreset(
                  `SELECT cohort, stage, count(*) AS patient_count, round(avg(os_days), 1) AS avg_os_days FROM "${selectedView || 'onco_sample'}" GROUP BY cohort, stage ORDER BY avg_os_days DESC;`
                )
              }
              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
            >
              Group by Cohort & Stage
            </button>
            <button
              type="button"
              onClick={() =>
                setQueryPreset(
                  `SELECT * FROM "${selectedView || 'onco_sample'}" WHERE vital_status = 'Alive' ORDER BY os_days DESC;`
                )
              }
              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
            >
              Filter Alive Patients
            </button>
            <button
              type="button"
              onClick={() => setQueryPreset(`DESCRIBE "${selectedView || 'onco_sample'}";`)}
              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
            >
              DESCRIBE Schema
            </button>
          </div>
        </div>

        <div className="p-3 bg-slate-950">
          <textarea
            value={sqlQuery}
            onChange={(e) => setSqlQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={4}
            className="w-full bg-slate-950 text-emerald-400 font-mono text-xs focus:outline-none resize-y selection:bg-teal-700 selection:text-white"
            placeholder="SELECT * FROM onco_sample LIMIT 10;"
            spellCheck={false}
          />
        </div>

        <div className="p-2.5 bg-slate-100 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center space-x-2 text-[11px] text-slate-500 font-sans">
            <Info className="w-3.5 h-3.5 text-slate-400" />
            <span>Read-only queries. Automatic 500-row cap for browser stability.</span>
          </div>

          <button
            type="button"
            onClick={handleExecute}
            disabled={isExecuting || !sqlQuery.trim()}
            className="px-4 py-1.5 rounded bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center space-x-1.5 transition cursor-pointer disabled:opacity-50 shadow-2xs"
          >
            <Play className={`w-3.5 h-3.5 ${isExecuting ? 'animate-spin' : ''}`} />
            <span>{isExecuting ? 'Executing in DuckDB...' : 'Run Query'}</span>
          </button>
        </div>
      </div>

      {/* 4. Query Error Banner */}
      {queryError && (
        <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start space-x-2 font-mono">
          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <strong>DuckDB Query Error:</strong>
            <p className="text-[11px] text-rose-700 break-all">{queryError}</p>
          </div>
        </div>
      )}

      {/* 5. Query Results Table */}
      {queryResult && (
        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden font-mono shadow-xs">
          {/* Results Bar */}
          <div className="p-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center space-x-3">
              <span className="flex items-center space-x-1 text-emerald-700 font-bold">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>{queryResult.rowCount} rows returned</span>
              </span>
              <span className="flex items-center space-x-1 text-slate-500 text-[11px]">
                <Clock className="w-3 h-3 text-slate-400" />
                <span>{queryResult.durationMs}ms</span>
              </span>
              {queryResult.datasetsReferenced.length > 0 && (
                <span className="text-[10px] bg-slate-200/70 text-slate-700 px-1.5 py-0.2 rounded">
                  Views: {queryResult.datasetsReferenced.join(', ')}
                </span>
              )}
            </div>

            <div className="flex items-center space-x-1.5">
              <button
                type="button"
                onClick={copyResultsAsJson}
                className="px-2 py-1 rounded bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition cursor-pointer flex items-center space-x-1 text-[11px]"
                title="Copy rows as JSON"
              >
                <Copy className="w-3 h-3" />
                <span>{copiedNotification ? 'Copied!' : 'Copy JSON'}</span>
              </button>
              <button
                type="button"
                onClick={downloadResultsAsCsv}
                className="px-2 py-1 rounded bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition cursor-pointer flex items-center space-x-1 text-[11px]"
                title="Download CSV"
              >
                <Download className="w-3 h-3" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto max-h-96">
            <table className="min-w-full divide-y divide-slate-200 text-xs">
              <thead className="bg-slate-100 text-slate-600 sticky top-0 uppercase text-[10px]">
                <tr>
                  <th scope="col" className="px-3 py-2 text-left font-bold text-slate-400 w-10">
                    #
                  </th>
                  {queryResult.columns.map((col) => (
                    <th scope="col" key={col.name} className="px-3 py-2 text-left font-bold">
                      <div className="truncate">{col.name}</div>
                      <div className="text-[8px] font-normal text-slate-400 lowercase">{col.type}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800 bg-white">
                {queryResult.rows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-teal-50/40 transition">
                    <td className="px-3 py-2 text-slate-400 text-[10px]">{idx + 1}</td>
                    {queryResult.columns.map((col) => {
                      const val = row[col.name];
                      const display =
                        val === null || val === undefined
                          ? '—'
                          : typeof val === 'object'
                          ? JSON.stringify(val)
                          : String(val);
                      return (
                        <td
                          key={col.name}
                          className="px-3 py-2 whitespace-nowrap max-w-xs truncate"
                          title={display}
                        >
                          {display}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
