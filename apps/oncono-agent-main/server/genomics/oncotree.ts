/**
 * OncoTree (MSKCC) cancer-type ontology resolver.
 *
 * Why this module exists
 * ----------------------
 * The engine used to classify a patient's malignancy with substring tests:
 *
 *     const isLung = cancerType.includes('Lung');   // local-oncology-engine.ts:6
 *     const isColorectal = cancerType.includes('Colorectal');
 *
 * Two defects fall out of that, both clinical rather than cosmetic:
 *
 *  1. Specificity collapse. `includes('Lung')` matches "Non-Small Cell Lung Cancer"
 *     AND "Small Cell Lung Cancer" AND "Large Cell Lung Carcinoma" AND
 *     "Combined Small Cell Lung Carcinoma". NSCLC and SCLC have opposite
 *     therapies (EGFR/ALK TKI vs platinum-etoposide) and opposite immunotherapy
 *     profiles. A SCLC case therefore received NSCLC EGFR-driven commentary and
 *     the "Low Likelihood of Benefit / Contraindicated" immunotherapy verdict.
 *  2. Silent misdispatch. `includes('Colorectal')` fires on any string containing
 *     the word, so histology and primary-site context is discarded entirely.
 *
 * OncoTree gives every diagnosis a stable code with a parent chain, so identity is
 * resolved rather than pattern-matched, and an unresolved name degrades to
 * "unresolved" instead of guessing.
 *
 * Data source: https://oncotree.mskcc.org/api/tumorTypes?version=oncotree_latest_stable
 * (measured 2026: 897 nodes, ~240 KB). Cached on disk for 24h; a bundled subset
 * keeps the app working when MSKCC is unreachable. OncoTree data is free for
 * academic / non-commercial use — see `ONCOTREE_ATTRIBUTION`.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { fetchWithRetry, TtlCache } from '../lib/http';

export const ONCOTREE_ATTRIBUTION =
  'Cancer type ontology from OncoTree (oncotree.mskcc.org, MSKCC); cite Kundra et al., JCO Clin Cancer Inform 2021. Academic / non-commercial use.';

const ONCOTREE_API = (process.env.ONCOTREE_API || 'https://oncotree.mskcc.org/api').replace(/\/+$/, '');
const ONCOTREE_VERSION = process.env.ONCOTREE_VERSION || 'oncotree_latest_stable';
// The server runs as ESM (`tsx server.ts`), so `__dirname` is not defined here.
const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = path.resolve(MODULE_DIR, '../.cache');
const CACHE_FILE = path.join(CACHE_DIR, 'oncotree-index.json');
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export interface OncoTreeRecord {
  code: string;
  name: string;
  mainType: string;
  tissue: string;
  parent: string;
  level: number;
}

/** A resolved malignancy identity. `code` is the canonical OncoTree code. */
export interface CancerTypeResolution {
  input: string;
  resolved: boolean;
  code: string | null;
  name: string | null;
  mainType: string | null;
  tissue: string | null;
  parentCode: string | null;
  parentName: string | null;
  /** Code plus every ancestor, used to widen a ClinicalTrials.gov condition query. */
  lineageCodes: string[];
  /** Own code plus every descendant Code — the histologies a broad term covers. */
  specificity: 'exact-code' | 'exact-name' | 'exact-main-type' | 'alias' | 'token-overlap' | 'none';
  /**
   * True when the input matches an umbrella term whose children are biologically
   * distinct (e.g. "Ovarian Cancer" covers ~40 histologies). Callers must not
   * apply histology-specific directives on the strength of such a match alone.
   */
  broad: boolean;
  confidence: number;
  source: 'oncotree-live' | 'oncotree-cache' | 'builtin-fallback';
}

/**
 * Minimal offline subset. Covers every CancerType the app can produce, plus the
 * siblings whose confusion caused the defects above (SCLC vs NSCLC foremost).
 * Deliberately small: it is a safety net, not the dataset.
 */
const BUILTIN: OncoTreeRecord[] = [
  { code: 'NSCLC', name: 'Non-Small Cell Lung Cancer', mainType: 'Non-Small Cell Lung Cancer', tissue: 'Lung', parent: 'LUNG', level: 3 },
  { code: 'SCLC', name: 'Small Cell Lung Cancer', mainType: 'Small Cell Lung Cancer', tissue: 'Lung', parent: 'LNET', level: 4 },
  { code: 'LCLC', name: 'Large Cell Lung Carcinoma', mainType: 'Non-Small Cell Lung Cancer', tissue: 'Lung', parent: 'NSCLC', level: 4 },
  { code: 'CSCLC', name: 'Combined Small Cell Lung Carcinoma', mainType: 'Small Cell Lung Cancer', tissue: 'Lung', parent: 'LUNG', level: 4 },
  { code: 'LUAD', name: 'Lung Adenocarcinoma', mainType: 'Non-Small Cell Lung Cancer', tissue: 'Lung', parent: 'NSCLC', level: 4 },
  { code: 'LUSC', name: 'Lung Squamous Cell Carcinoma', mainType: 'Non-Small Cell Lung Cancer', tissue: 'Lung', parent: 'NSCLC', level: 4 },
  { code: 'LUNG', name: 'Lung', mainType: 'Lung Cancer', tissue: 'Lung', parent: 'TISSUE', level: 1 },
  { code: 'COADREAD', name: 'Colorectal Adenocarcinoma', mainType: 'Colorectal Cancer', tissue: 'Bowel', parent: 'BOWEL', level: 3 },
  { code: 'COAD', name: 'Colon Adenocarcinoma', mainType: 'Colorectal Cancer', tissue: 'Bowel', parent: 'COADREAD', level: 4 },
  { code: 'READ', name: 'Rectal Adenocarcinoma', mainType: 'Colorectal Cancer', tissue: 'Bowel', parent: 'COADREAD', level: 4 },
  { code: 'SRCCR', name: 'Signet Ring Cell Adenocarcinoma of the Colon and Rectum', mainType: 'Colorectal Cancer', tissue: 'Bowel', parent: 'COADREAD', level: 4 },
  { code: 'BRCA', name: 'Invasive Breast Carcinoma', mainType: 'Breast Cancer', tissue: 'Breast', parent: 'BREAST', level: 3 },
  { code: 'IDC', name: 'Breast Invasive Ductal Carcinoma', mainType: 'Breast Cancer', tissue: 'Breast', parent: 'BRCA', level: 4 },
  { code: 'ILC', name: 'Breast Invasive Lobular Carcinoma', mainType: 'Breast Cancer', tissue: 'Breast', parent: 'BRCA', level: 4 },
  { code: 'BREAST', name: 'Breast', mainType: 'Breast Cancer', tissue: 'Breast', parent: 'TISSUE', level: 1 },
  { code: 'OVARY', name: 'Ovary/Fallopian Tube', mainType: 'Ovarian Cancer', tissue: 'Ovary/Fallopian Tube', parent: 'TISSUE', level: 1 },
  { code: 'HGSOC', name: 'High-Grade Serous Ovarian Cancer', mainType: 'Ovarian Cancer', tissue: 'Ovary/Fallopian Tube', parent: 'SOC', level: 5 },
  { code: 'SOC', name: 'Serous Ovarian Cancer', mainType: 'Ovarian Cancer', tissue: 'Ovary/Fallopian Tube', parent: 'OVT', level: 4 },
  { code: 'OVT', name: 'Ovarian Epithelial Tumor', mainType: 'Ovarian Cancer', tissue: 'Ovary/Fallopian Tube', parent: 'OVARY', level: 2 },
  { code: 'EOV', name: 'Endometrioid Ovarian Cancer', mainType: 'Ovarian Cancer', tissue: 'Ovary/Fallopian Tube', parent: 'OVT', level: 4 },
  { code: 'CCOV', name: 'Clear Cell Ovarian Cancer', mainType: 'Ovarian Cancer', tissue: 'Ovary/Fallopian Tube', parent: 'OVT', level: 4 },
  { code: 'MOV', name: 'Mucinous Ovarian Cancer', mainType: 'Ovarian Cancer', tissue: 'Ovary/Fallopian Tube', parent: 'OVT', level: 4 },
  { code: 'MEL', name: 'Melanoma', mainType: 'Melanoma', tissue: 'Skin', parent: 'SKIN', level: 1 },
  { code: 'SKCM', name: 'Cutaneous Melanoma', mainType: 'Melanoma', tissue: 'Skin', parent: 'MEL', level: 2 },
  { code: 'ACRM', name: 'Acral Melanoma', mainType: 'Melanoma', tissue: 'Skin', parent: 'SKCM', level: 3 },
  { code: 'UM', name: 'Uveal Melanoma', mainType: 'Melanoma', tissue: 'Eye', parent: 'OM', level: 3 },
  { code: 'OM', name: 'Ocular Melanoma', mainType: 'Melanoma', tissue: 'Eye', parent: 'EYE', level: 2 },
  { code: 'PAAD', name: 'Pancreatic Adenocarcinoma', mainType: 'Pancreatic Cancer', tissue: 'Pancreas', parent: 'PANCREAS', level: 3 },
  { code: 'PANET', name: 'Pancreatic Neuroendocrine Tumor', mainType: 'Pancreatic Cancer', tissue: 'Pancreas', parent: 'PANCREAS', level: 3 },
  { code: 'PRAD', name: 'Prostate Adenocarcinoma', mainType: 'Prostate Cancer', tissue: 'Prostate', parent: 'PROSTATE', level: 3 },
  { code: 'PROSTATE', name: 'Prostate', mainType: 'Prostate Cancer', tissue: 'Prostate', parent: 'TISSUE', level: 1 },
  { code: 'GB', name: 'Glioblastoma, IDH-Wildtype', mainType: 'Glioma', tissue: 'CNS/Brain', parent: 'ADIFG', level: 4 },
  { code: 'ASTROCYTOMA', name: 'Astrocytoma, IDH-Mutant', mainType: 'Glioma', tissue: 'CNS/Brain', parent: 'ADIFG', level: 4 },
  { code: 'STAD', name: 'Stomach Adenocarcinoma', mainType: 'Esophagogastric Cancer', tissue: 'Esophagus/Stomach', parent: 'EGC', level: 4 },
  { code: 'EGC', name: 'Esophagogastric Adenocarcinoma', mainType: 'Esophagogastric Cancer', tissue: 'Esophagus/Stomach', parent: 'STOMACH', level: 3 },
  { code: 'ESCA', name: 'Esophageal Adenocarcinoma', mainType: 'Esophagogastric Cancer', tissue: 'Esophagus/Stomach', parent: 'EGC', level: 4 },
  { code: 'GEJ', name: 'Adenocarcinoma of the Gastroesophageal Junction', mainType: 'Esophagogastric Cancer', tissue: 'Esophagus/Stomach', parent: 'EGC', level: 4 },
  { code: 'AML', name: 'Acute Myeloid Leukemia', mainType: 'Acute Myeloid Leukemia', tissue: 'Hematopoietic/Lymphoid', parent: 'AML', level: 2 },
];

/** Free-text synonyms seen in reports, mTBs and clinical notes. */
const ALIASES: Record<string, string> = {
  'NSCLC': 'NSCLC',
  'non small cell lung cancer': 'NSCLC',
  'non-small cell lung carcinoma': 'NSCLC',
  'non-small-cell lung cancer': 'NSCLC',
  'lung adenocarcinoma': 'LUAD',
  'lung squamous cell carcinoma': 'LUSC',
  'lung SCC': 'LUSC',
  'squamous cell lung cancer': 'LUSC',
  'SCLC': 'SCLC',
  'small cell lung cancer': 'SCLC',
  'small cell lung carcinoma': 'SCLC',
  'small cell carcinoma of the lung': 'SCLC',
  'oat cell carcinoma': 'SCLC',
  'combined small cell lung carcinoma': 'CSCLC',
  'large cell lung carcinoma': 'LCLC',
  'COADREAD': 'COADREAD',
  'colorectal adenocarcinoma': 'COADREAD',
  'colorectal cancer': 'COADREAD',
  'colon adenocarcinoma': 'COAD',
  'colon cancer': 'COAD',
  'colon carcinoma': 'COAD',
  'rectal adenocarcinoma': 'READ',
  'rectal cancer': 'READ',
  'rectum adenocarcinoma': 'READ',
  'mCRC': 'COADREAD',
  'metastatic colorectal cancer': 'COADREAD',
  'BRCA': 'BRCA',
  'invasive breast carcinoma': 'BRCA',
  'breast adenocarcinoma': 'BRCA',
  'invasive ductal carcinoma': 'IDC',
  'breast invasive ductal carcinoma': 'IDC',
  'IDC breast': 'IDC',
  'invasive lobular carcinoma': 'ILC',
  'OVARY': 'OVARY',
  'ovarian cancer': 'OVARY',
  'ovarian carcinoma': 'OVARY',
  'epithelial ovarian cancer': 'OVT',
  'high grade serous ovarian cancer': 'HGSOC',
  'high-grade serous ovarian carcinoma': 'HGSOC',
  'serous ovarian cancer': 'SOC',
  'ovarian serous carcinoma': 'SOC',
  'endometrioid ovarian cancer': 'EOV',
  'clear cell ovarian cancer': 'CCOV',
  'MEL': 'MEL',
  'cutaneous melanoma': 'SKCM',
  'skin melanoma': 'SKCM',
  'uveal melanoma': 'UM',
  'ocular melanoma': 'OM',
  'PAAD': 'PAAD',
  'pancreatic ductal adenocarcinoma': 'PAAD',
  'pancreatic adenocarcinoma': 'PAAD',
  'PRAD': 'PRAD',
  'prostate adenocarcinoma': 'PRAD',
  'GBM': 'GB',
  'glioblastoma': 'GB',
  'glioblastoma multiforme': 'GB',
  'GB IDH wildtype': 'GB',
  'STAD': 'STAD',
  'gastric adenocarcinoma': 'STAD',
  'stomach adenocarcinoma': 'STAD',
  'gastric cancer': 'STAD',
  'gastroesophageal adenocarcinoma': 'EGC',
  'GEJ adenocarcinoma': 'GEJ',
  'esophagogastric cancer': 'EGC',
  'AML': 'AML',
  'acute myeloid leukemia': 'AML',
  'acute myelogenous leukemia': 'AML',
  'gastric gastroesophageal': 'STAD',
  'gastroesophageal cancer': 'EGC',
  'gastric': 'STAD',
  'stomach cancer': 'STAD',
  'esophagogastric': 'EGC',
};

const STOPWORDS = new Set([
  'cancer', 'carcinoma', 'tumour', 'tumor', 'neoplasm', 'malignant', 'the', 'of', 'and', 'in',
  'nos', 'idh', 'wildtype', 'mutant', 'cell', 'cells', 'primary', 'unspecified', 'other',
]);

function normalize(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function tokenize(input: string): string[] {
  return normalize(input).split(' ').filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

type IndexState = {
  records: OncoTreeRecord[];
  byCode: Map<string, OncoTreeRecord>;
  children: Map<string, string[]>;
  /** Total descendants per code, used to prefer umbrella nodes over leaf histologies. */
  descendantCount: Map<string, number>;
  tokenDocFreq: Map<string, number>;
  source: 'oncotree-live' | 'oncotree-cache' | 'builtin-fallback';
  loadedAt: number;
};

let state: IndexState | null = null;
let loading: Promise<IndexState> | null = null;
const resolveCache = new TtlCache<CancerTypeResolution>({ ttlMs: 60 * 60 * 1000, maxEntries: 512 });

function buildState(records: OncoTreeRecord[], source: IndexState['source']): IndexState {
  const byCode = new Map<string, OncoTreeRecord>();
  const children = new Map<string, string[]>();
  const tokenDocFreq = new Map<string, number>();

  for (const record of records) {
    byCode.set(record.code.toUpperCase(), record);
  }
  for (const record of records) {
    if (record.parent && byCode.has(record.parent.toUpperCase())) {
      const list = children.get(record.parent.toUpperCase()) || [];
      list.push(record.code.toUpperCase());
      children.set(record.parent.toUpperCase(), list);
    }
  }
  for (const record of records) {
    const tokens = new Set([...tokenize(record.name), ...tokenize(record.mainType), ...tokenize(record.tissue)]);
    tokens.forEach((t) => tokenDocFreq.set(t, (tokenDocFreq.get(t) || 0) + 1));
  }

  // Descendant counts, computed once. Memoised per node; the ontology is a DAG
  // with a single parent per node so a recursive walk is safe.
  const descendantCount = new Map<string, number>();
  const countDescendants = (code: string): number => {
    const cached = descendantCount.get(code);
    if (cached !== undefined) return cached;
    const kids = children.get(code) || [];
    const total = kids.reduce((sum, k) => sum + 1 + countDescendants(k), 0);
    descendantCount.set(code, total);
    return total;
  };
  for (const record of records) countDescendants(record.code.toUpperCase());

  return { records, byCode, children, descendantCount, tokenDocFreq, source, loadedAt: Date.now() };
}

function flattenTree(nodes: any[]): OncoTreeRecord[] {
  const out: OncoTreeRecord[] = [];
  const walk = (node: any) => {
    if (!node || typeof node.code !== 'string') return;
    out.push({
      code: node.code,
      name: node.name || node.code,
      mainType: node.mainType || node.name || node.code,
      tissue: node.tissue || '',
      parent: node.parent || '',
      level: typeof node.level === 'number' ? node.level : 1,
    });
    const children = node.children;
    if (children && typeof children === 'object') Object.values(children).forEach(walk);
  };
  nodes.forEach(walk);
  return out;
}

function readCacheFile(): OncoTreeRecord[] | null {
  try {
    if (!fs.existsSync(CACHE_FILE)) return null;
    const raw = fs.readFileSync(CACHE_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.records) || parsed.records.length === 0) return null;
    if (Date.now() - (parsed.cachedAt || 0) > CACHE_TTL_MS) return null;
    return parsed.records as OncoTreeRecord[];
  } catch {
    return null;
  }
}

function writeCacheFile(records: OncoTreeRecord[]): void {
  try {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    fs.writeFileSync(CACHE_FILE, JSON.stringify({ cachedAt: Date.now(), count: records.length, records }), 'utf-8');
  } catch {
    // A read-only or absent filesystem must not break resolution.
  }
}

async function fetchLive(): Promise<OncoTreeRecord[]> {
  const response = await fetchWithRetry(
    `${ONCOTREE_API}/tumorTypes?version=${encodeURIComponent(ONCOTREE_VERSION)}`,
    { headers: { Accept: 'application/json', 'User-Agent': 'OncoAgent/1.0 (bioinformatics-oncotree)' }, timeoutMs: 15000, maxRetries: 2 }
  );
  if (!response.ok) throw new Error(`OncoTree responded ${response.status}`);
  const data = await response.json();
  const records = Array.isArray(data) ? flattenTree(data) : [];
  if (records.length === 0) throw new Error('OncoTree returned an empty ontology');
  return records;
}

function ensureState(): IndexState {
  if (state && Date.now() - state.loadedAt < CACHE_TTL_MS) return state;

  const cached = readCacheFile();
  if (cached) {
    state = buildState(cached, 'oncotree-cache');
    return state;
  }

  state = buildState(BUILTIN, 'builtin-fallback');
  return state;
}

/**
 * Load the live ontology once, refresh the on-disk cache, and swap the in-memory
 * index. Safe to call on boot (fire-and-forget) and from request handlers.
 */
export async function initOncoTree(force = false): Promise<{ source: string; count: number }> {
  if (loading && !force) {
    const s = await loading;
    return { source: s.source, count: s.records.length };
  }
  loading = (async () => {
    try {
      const records = await fetchLive();
      const next = buildState(records, 'oncotree-live');
      state = next;
      writeCacheFile(records);
      return next;
    } catch (err) {
      ensureState();
      return ensureState();
    } finally {
      loading = null;
    }
  })();
  return loading.then((s) => ({ source: s.source, count: s.records.length }));
}

export function getOncoTreeStatus(): { count: number; source: string; loadedAt: string | null; attribution: string } {
  const s = state;
  return {
    count: s ? s.records.length : 0,
    source: s ? s.source : 'not-loaded',
    loadedAt: s ? new Date(s.loadedAt).toISOString() : null,
    attribution: ONCOTREE_ATTRIBUTION,
  };
}

/** Search the loaded ontology. Used by the /external/oncotree route. */
export function searchOncoTree(query: string, limit = 10): OncoTreeRecord[] {
  const s = ensureState();
  const needle = normalize(query);
  if (!needle) return [];
  const scored = s.records
    .map((record) => {
      const code = record.code.toLowerCase();
      const name = normalize(record.name);
      const main = normalize(record.mainType);
      let score = 0;
      if (code === needle) score = 100;
      else if (name === needle) score = 95;
      else if (main === needle) score = 90;
      else if (name.startsWith(needle)) score = 70;
      else if (name.includes(needle)) score = 60;
      else if (main.includes(needle)) score = 50;
      else if (needle.includes(code) && code.length >= 3) score = 40;
      return { record, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.record.level - b.record.level)
    .slice(0, limit);
  return scored.map((x) => x.record);
}

function lineageOf(record: OncoTreeRecord, byCode: Map<string, OncoTreeRecord>): string[] {
  const chain = [record.code.toUpperCase()];
  let cursor: string | undefined = record.parent;
  const seen = new Set(chain);
  while (cursor && byCode.has(cursor.toUpperCase()) && !seen.has(cursor.toUpperCase())) {
    chain.push(cursor.toUpperCase());
    seen.add(cursor.toUpperCase());
    cursor = byCode.get(cursor.toUpperCase())!.parent;
  }
  return chain;
}

/**
 * Resolve a free-text malignancy to a canonical OncoTree identity.
 * Deterministic: identical input always yields the same code, so reports and
 * guardrails never disagree about what tumour the patient has.
 */
export function resolveCancerType(input: string): CancerTypeResolution {
  const raw = String(input || '');
  const cacheKey = normalize(raw);
  const cached = resolveCache.get(cacheKey);
  if (cached) return cached;

  const s = ensureState();
  const empty = (basis: CancerTypeResolution['specificity']): CancerTypeResolution => ({
    input: raw,
    resolved: false,
    code: null,
    name: null,
    mainType: null,
    tissue: null,
    parentCode: null,
    parentName: null,
    lineageCodes: [],
    specificity: basis,
    broad: false,
    confidence: 0,
    source: s.source,
  });
  if (!cacheKey) {
    const out = empty('none');
    resolveCache.set(cacheKey, out);
    return out;
  }

  const upper = cacheKey.toUpperCase().replace(/ /g, '').replace(/-/g, '');

  // 1. Canonical code, tolerant of hyphen/case ("NSCLC", "coad-read").
  const direct = s.byCode.get(upper);
  if (direct) {
    const out = finalize(direct, s, 'exact-code', 1);
    resolveCache.set(cacheKey, out);
    return out;
  }

  // 2. Exact OncoTree name.
  const byName = s.records.find((r) => normalize(r.name) === cacheKey);
  if (byName) {
    const out = finalize(byName, s, 'exact-name', 0.98);
    resolveCache.set(cacheKey, out);
    return out;
  }

  /**
   * Rank candidates for an umbrella query.
   *
   * The naive "first node whose mainType equals the term" was wrong on the live
   * ontology: "Colorectal Cancer" resolved to CMC (Medullary Carcinoma of the
   * Colon, also mainType "Colorectal Cancer", same tree level as COADREAD) and
   * "Ovarian Cancer" resolved to OOVC, because OVARY's mainType is actually
   * "Ovarian/Fallopian Tube Cancer". Both then failed the downstream
   * colorectal/ovarian predicates.
   *
   * The correct choice for an umbrella term is the most ancestral node that
   * covers the others: lowest tree level first, then the largest descendant
   * count, then code for determinism.
   */
  const rank = (candidates: OncoTreeRecord[]): OncoTreeRecord | undefined =>
    [...candidates].sort(
      (a, b) =>
        a.level - b.level ||
        (s.descendantCount.get(b.code.toUpperCase()) || 0) - (s.descendantCount.get(a.code.toUpperCase()) || 0) ||
        a.code.localeCompare(b.code)
    )[0];

  // 3. Main-type match. The exact and token-superset candidate sets are ranked
  //    TOGETHER, because the most ancestral node often does not carry the exact
  //    term: OVARY's main type is "Ovarian/Fallopian Tube Cancer" while the
  //    exact string "Ovarian Cancer" belongs to its child OVT. Ranking exact
  //    matches in isolation therefore returned OVT, and the ovarian predicate
  //    downstream had to cope with a leaf where the umbrella was meant.
  const queryTokens = tokenize(raw);
  const mainTypeCandidates = s.records.filter((r) => {
    const main = normalize(r.mainType);
    if (main === cacheKey) return true;
    if (queryTokens.length === 0) return false;
    const mainTokens = new Set(tokenize(r.mainType));
    return mainTokens.size > 0 && queryTokens.every((t) => mainTokens.has(t));
  });
  const byMain = rank(mainTypeCandidates);
  if (byMain) {
    const out = finalize(byMain, s, 'exact-main-type', 0.9);
    resolveCache.set(cacheKey, out);
    return out;
  }

  // 4. Curated alias table.
  const aliasCode = ALIASES[cacheKey] || ALIASES[raw.trim()];
  if (aliasCode && s.byCode.has(aliasCode)) {
    const out = finalize(s.byCode.get(aliasCode)!, s, 'alias', 0.9);
    resolveCache.set(cacheKey, out);
    return out;
  }

  // 5. IDF-weighted token overlap. Deliberately conservative: a weak score
  //    returns `resolved: false` so the engine falls back to generic guidance
  //    rather than confidently reasoning about the wrong tumour.
  if (queryTokens.length === 0) {
    const out = empty('none');
    resolveCache.set(cacheKey, out);
    return out;
  }
  const total = s.records.length || 1;
  const promptWeight = (t: string) => Math.log(1 + total / (1 + (s.tokenDocFreq.get(t) || 0)));

  let best: { record: OncoTreeRecord; score: number } | null = null;
  for (const record of s.records) {
    const target = new Set([...tokenize(record.name)]);
    if (target.size === 0) continue;
    let matched = 0;
    let possible = 0;
    for (const t of queryTokens) {
      possible += promptWeight(t);
      if (target.has(t)) matched += promptWeight(t);
    }
    const score = possible > 0 ? matched / possible : 0;
    if (!best || score > best.score) best = { record, score };
  }

  if (best && best.score >= 0.75) {
    const out = finalize(best.record, s, 'token-overlap', Math.min(0.85, best.score));
    resolveCache.set(cacheKey, out);
    return out;
  }

  const out = empty('none');
  resolveCache.set(cacheKey, out);
  return out;
}

function finalize(
  record: OncoTreeRecord,
  s: IndexState,
  specificity: CancerTypeResolution['specificity'],
  confidence: number
): CancerTypeResolution {
  const parentCode = record.parent && s.byCode.has(record.parent.toUpperCase()) ? record.parent.toUpperCase() : null;
  const parent = parentCode ? s.byCode.get(parentCode)! : null;
  const childCount = (s.children.get(record.code.toUpperCase()) || []).length;
  return {
    input: record.name,
    resolved: true,
    code: record.code.toUpperCase(),
    name: record.name,
    mainType: record.mainType,
    tissue: record.tissue,
    parentCode,
    parentName: parent ? parent.name : null,
    lineageCodes: lineageOf(record, s.byCode),
    specificity,
    broad: childCount > 0 && specificity !== 'exact-code' && specificity !== 'exact-name',
    confidence,
    source: s.source,
  };
}

/** True when the resolved malignancy is a non-small-cell primary of the lung. */
export function isNSCLC(res: CancerTypeResolution | null | undefined): boolean {
  if (!res || !res.code) return false;
  return res.code === 'NSCLC' || res.code === 'LUAD' || res.code === 'LUSC' || res.code === 'LCLC' || res.code === 'LUAS';
}

/** True when it is a lung primary but NOT non-small-cell. */
export function isSmallCellLung(res: CancerTypeResolution | null | undefined): boolean {
  if (!res || !res.code) return false;
  return res.code === 'SCLC' || res.code === 'CSCLC';
}

export function isColorectal(res: CancerTypeResolution | null | undefined): boolean {
  if (!res || !res.code) return false;
  // Lineage-based so an umbrella match ("Colorectal Cancer") and any of its
  // histology children both qualify. The previous closed list missed nodes such
  // as CMC (Medullary Carcinoma of the Colon) that carry the same main type.
  return res.code === 'COADREAD' || res.lineageCodes.includes('COADREAD') || res.lineageCodes.includes('BOWEL');
}

export function isOvarian(res: CancerTypeResolution | null | undefined): boolean {
  if (!res || !res.code) return false;
  return res.code === 'OVARY' || res.lineageCodes.includes('OVARY');
}

export function isGlioblastoma(res: CancerTypeResolution | null | undefined): boolean {
  if (!res || !res.code) return false;
  return res.code === 'GB' || res.code === 'SCGBM';
}

export function isMelanoma(res: CancerTypeResolution | null | undefined): boolean {
  if (!res || !res.code) return false;
  return res.code === 'MEL' || res.lineageCodes.includes('MEL');
}

export function isBreast(res: CancerTypeResolution | null | undefined): boolean {
  if (!res || !res.code) return false;
  return res.code === 'BRCA' || res.lineageCodes.includes('BREAST');
}
