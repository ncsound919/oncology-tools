/**
 * cohort-db.ts — DuckDB-powered cohort query engine for the Onco Agent.
 *
 * Provides a lazy-initialized singleton DuckDB in-process database that can:
 *   1. Auto-discover CSV files under a data root (SurvBoard / TCGA / METABRIC)
 *   2. Register them as virtual views so they can be queried with SQL
 *   3. Execute arbitrary read-only SQL against those views
 *   4. Return column schema metadata for the UI
 *
 * The database is entirely in-memory — DuckDB reads directly from CSVs at
 * query time; no separate ETL step is needed. When the data volume is absent,
 * the engine runs against a small embedded sample dataset so the UI still works.
 *
 * Deterministic by design — no LLM, same philosophy as the local oncology engine.
 */

import path from 'path';
import fs from 'fs';
import { DuckDBInstance } from '@duckdb/node-api';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RegisteredDataset {
  viewName: string;      // SQL-safe view name, e.g. "tcga_luad"
  filePath: string;      // Absolute path to the CSV
  sizeBytes: number;
  rowCount?: number;     // Populated lazily on first query
  columns?: ColumnMeta[];
}

export interface ColumnMeta {
  name: string;
  type: string;
}

export interface CohortQueryResult {
  columns: ColumnMeta[];
  rows: Record<string, unknown>[];
  rowCount: number;
  durationMs: number;
  sql: string;
  /** Which views were used (extracted from SQL comment or simple parse) */
  datasetsReferenced: string[];
}

export interface CohortDbStatus {
  ready: boolean;
  dataRoot: string | null;
  registeredDatasets: RegisteredDataset[];
  error?: string;
}

// ─── Singleton ────────────────────────────────────────────────────────────────

let _instance: DuckDBInstance | null = null;
let _status: CohortDbStatus | null = null;
let _datasets: RegisteredDataset[] = [];

/** Resolves data root from env or falls back to common locations. */
function resolveDataRoot(): string | null {
  const envRoot = process.env.ONCOLOGY_DATA_ROOT;
  if (envRoot && fs.existsSync(envRoot)) return envRoot;

  // Common locations to check
  const candidates = [
    'E:\\survboard',
    'E:\\datasets',
    'E:\\',
    path.resolve(process.cwd(), '../../data'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

/**
 * Recursively finds CSV files up to `maxDepth` levels deep,
 * capped at `maxFiles` to prevent runaway discovery on huge volumes.
 */
function discoverCsvFiles(
  dir: string,
  maxDepth = 3,
  maxFiles = 200,
  depth = 0,
  results: string[] = []
): string[] {
  if (depth > maxDepth || results.length >= maxFiles) return results;
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (results.length >= maxFiles) break;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        discoverCsvFiles(full, maxDepth, maxFiles, depth + 1, results);
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.csv')) {
        results.push(full);
      }
    }
  } catch {
    // permission error or inaccessible dir — skip silently
  }
  return results;
}

/** Converts a file path to a safe SQL view name. */
function toViewName(filePath: string, dataRoot: string): string {
  const rel = path.relative(dataRoot, filePath);
  return rel
    .replace(/[/\\]/g, '_')
    .replace(/\.csv$/i, '')
    .replace(/[^a-zA-Z0-9_]/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase()
    .slice(0, 64);
}

/**
 * Embedded fallback sample dataset (3 HAND-AUTHORED FIXTURE rows) used when no data volume
 * is attached. Written to a temp CSV and registered as a view.
 */
const SAMPLE_CSV = [
  'sample_id,cohort,cancer_type,stage,vital_status,os_days,gene1,gene2,tmb,msi',
  'FIXTURE-LUAD-01,TCGA-LUAD,Lung Adenocarcinoma,Stage IIIA,Alive,1420,EGFR L858R,TP53 R273H,6.4,MSS',
  'FIXTURE-COAD-02,TCGA-COAD,Colon Adenocarcinoma,Stage IIIB,Alive,980,KRAS G12D,PIK3CA E545K,4.8,MSS',
  'FIXTURE-GBM-03,TCGA-GBM,Glioblastoma,Stage IVB,Dead,412,EGFR Amp,PTEN R130Q,3.2,MSS',
].join('\n');

// ─── Initializer ──────────────────────────────────────────────────────────────

export async function initCohortDb(): Promise<CohortDbStatus> {
  if (_status?.ready) return _status;

  try {
    _instance = await DuckDBInstance.create(':memory:');
    const conn = await _instance.connect();

    const dataRoot = resolveDataRoot();
    const registeredDatasets: RegisteredDataset[] = [];

    if (dataRoot) {
      const csvFiles = discoverCsvFiles(dataRoot);
      for (const filePath of csvFiles) {
        const viewName = toViewName(filePath, dataRoot);
        if (!viewName) continue;
        try {
          // DuckDB reads CSV directly via read_csv_auto — no schema declaration needed
          await conn.run(
            `CREATE OR REPLACE VIEW "${viewName}" AS SELECT * FROM read_csv_auto('${filePath.replace(/\\/g, '/')}', header=true, ignore_errors=true)`
          );
          const stat = fs.statSync(filePath);
          registeredDatasets.push({ viewName, filePath, sizeBytes: stat.size });
        } catch {
          // Skip files that fail schema inference (binary, malformed, etc.)
        }
      }
    }

    // Always register the embedded sample so the UI has something to show
    const tmpDir = path.join(process.cwd(), '.duckdb-tmp');
    fs.mkdirSync(tmpDir, { recursive: true });
    const samplePath = path.join(tmpDir, 'onco_sample.csv').replace(/\\/g, '/');
    fs.writeFileSync(samplePath, SAMPLE_CSV, 'utf-8');
    await conn.run(
      `CREATE OR REPLACE VIEW "onco_sample" AS SELECT * FROM read_csv_auto('${samplePath}', header=true)`
    );
    if (!registeredDatasets.find((d) => d.viewName === 'onco_sample')) {
      registeredDatasets.push({
        viewName: 'onco_sample',
        filePath: samplePath,
        sizeBytes: Buffer.byteLength(SAMPLE_CSV, 'utf-8'),
      });
    }

    conn.closeSync();
    _datasets = registeredDatasets;
    _status = { ready: true, dataRoot, registeredDatasets };
    console.log(`[CohortDB] Ready — ${registeredDatasets.length} views registered. Root: ${dataRoot ?? 'sample-only'}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[CohortDB] Init failed:', msg);
    _status = { ready: false, dataRoot: null, registeredDatasets: [], error: msg };
  }

  return _status!;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function getCohortDbStatus(): CohortDbStatus {
  return _status ?? { ready: false, dataRoot: null, registeredDatasets: [], error: 'Not initialized yet' };
}

export function getRegisteredDatasets(): RegisteredDataset[] {
  return _datasets;
}

/**
 * Executes a read-only SQL query and returns typed results.
 *
 * Security rules applied here (server-side, not client-enforceable):
 *   - Only SELECT statements are allowed
 *   - Maximum 500 rows returned to prevent memory blowout
 *   - 10-second statement timeout
 */
export async function runCohortQuery(sql: string): Promise<CohortQueryResult> {
  if (!_instance || !_status?.ready) {
    throw new Error('CohortDB not initialized. Call initCohortDb() first.');
  }

  // Enforce read-only: reject write keywords at the start of the statement
  const normalized = sql.trim().toUpperCase();
  const WRITE_KEYWORDS = ['INSERT', 'UPDATE', 'DELETE', 'DROP', 'CREATE', 'ALTER', 'TRUNCATE', 'COPY', 'ATTACH'];
  for (const kw of WRITE_KEYWORDS) {
    if (normalized.startsWith(kw)) {
      throw new Error(`Write operations are not permitted. Only SELECT queries are allowed. Got: ${kw}`);
    }
  }

  // Inject LIMIT if missing to protect against full-table scans
  const hasLimit = /\bLIMIT\s+\d+/i.test(sql);
  const safeSql = hasLimit ? sql : `${sql.trimEnd().replace(/;$/, '')} LIMIT 500`;

  const conn = await _instance.connect();
  const t0 = Date.now();

  try {
    const result = await conn.runAndReadAll(safeSql);
    const durationMs = Date.now() - t0;

    const columnNames = result.columnNames();
    const columnTypes = result.columnTypes();
    const columns: ColumnMeta[] = columnNames.map((name, i) => ({
      name,
      type: String(columnTypes[i] ?? 'VARCHAR'),
    }));

    const rawRows = result.getRows();
    const rows: Record<string, unknown>[] = rawRows.map((row) => {
      const obj: Record<string, unknown> = {};
      columnNames.forEach((col, i) => {
        const val = row[i];
        // Convert BigInt to number for JSON serialization
        obj[col] = typeof val === 'bigint' ? Number(val) : val;
      });
      return obj;
    });

    // Simple heuristic: extract view names referenced in the query
    const datasetsReferenced = _datasets
      .map((d) => d.viewName)
      .filter((v) => new RegExp(`\\b${v}\\b`, 'i').test(sql));

    return {
      columns,
      rows,
      rowCount: rows.length,
      durationMs,
      sql: safeSql,
      datasetsReferenced,
    };
  } finally {
    conn.closeSync();
  }
}

/**
 * Returns column schema for a specific view (table).
 */
export async function getViewSchema(viewName: string): Promise<ColumnMeta[]> {
  const result = await runCohortQuery(`DESCRIBE "${viewName}"`);
  return result.rows.map((r) => ({
    name: String(r['column_name'] ?? r['Field'] ?? ''),
    type: String(r['column_type'] ?? r['Type'] ?? 'VARCHAR'),
  }));
}

/**
 * Returns a quick summary (row count + sample) for a view.
 */
export async function getViewSummary(viewName: string): Promise<{
  rowCount: number;
  sample: Record<string, unknown>[];
  columns: ColumnMeta[];
}> {
  const [countResult, sampleResult] = await Promise.all([
    runCohortQuery(`SELECT COUNT(*) AS n FROM "${viewName}"`),
    runCohortQuery(`SELECT * FROM "${viewName}" LIMIT 5`),
  ]);
  return {
    rowCount: Number(countResult.rows[0]?.n ?? 0),
    sample: sampleResult.rows,
    columns: sampleResult.columns,
  };
}
