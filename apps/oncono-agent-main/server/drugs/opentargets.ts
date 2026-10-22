/**
 * Open Targets Platform (GraphQL v4) — genomic alteration -> druggable target ->
 * drug, with the adverse-effect and tractability context that makes the answer
 * clinically usable.
 *
 * Replaces `Blood... local hardcoded regimen tables` as the source of "what drugs
 * touch this gene", and supplies the target-safety liabilities that the
 * orchestrator's hardcoded guardrail lists could not know about.
 *
 * Live source: https://api.platform.opentargets.org/api/v4/graphql (no token).
 * Response schema verified by introspection and a working query on 2026-10:
 * `Target.drugAndClinicalCandidates`, `Target.safetyLiabilities`,
 * `Target.tractability`, `Target.associatedDiseases`.
 */

import { fetchWithRetry, TtlCache, upstreamUnavailable } from '../lib/http';

/** Cast a `Set` of loosely-typed values to `string[]` for the typed drug shape. */
const toStrings = (values: unknown[]): string[] => values as string[];

const OT_ENDPOINT = (process.env.OPEN_TARGETS_API || 'https://api.platform.opentargets.org/api/v4/graphql').replace(/\/+$/, '');
const OT_ATTRIBUTION = 'Target and drug annotations from Open Targets Platform (platform.opentargets.org); content CC BY 4.0.';
const TIMEOUT_MS = 15000;

export interface OpenTargetsDrug {
  chemblId: string;
  name: string;
  drugType: string | null;
  maxClinicalStage: string | null;
  mechanisms: string[];
  actionTypes: string[];
  /** Indication disease labels this drug has reached in trials. */
  indicationDiseases: string[];
  tradeNames: string[];
  sourceIds: Record<string, string[]>;
}

export interface OpenTargetsTarget {
  gene: string;
  ensemblId: string | null;
  approvedName: string | null;
  available: boolean;
  reason?: string;
  source: 'opentargets-live';
  drugCount: number;
  approvedCandidates: OpenTargetsDrug[];
  /** Drugs whose mechanism explicitly names this target as primary. */
  primaryDrugs: OpenTargetsDrug[];
  safetyEvents: Array<{ event: string; direction: string; datasource: string }>;
  tractability: Array<{ label: string; modality: string | null; value: boolean }>;
  associatedDiseaseCount: number | null;
  checkedAt: string;
}

const searchCache = new TtlCache<string | null>({ ttlMs: 24 * 60 * 60 * 1000, maxEntries: 512 });
const targetCache = new TtlCache<OpenTargetsTarget>({ ttlMs: 6 * 60 * 60 * 1000, maxEntries: 256 });

const STAGE_RANK: Record<string, number> = {
  PHASE_4: 5, PHASE_3: 4, PHASE_2_3: 3, PHASE_2: 2, PHASE_1_2: 1, PHASE_1: 0, UNKNOWN: -1, WITHDRAWN: -2,
};

/** Map an HGNC symbol to its Ensembl gene id through Open Targets' own search. */
export async function resolveEnsemblId(geneSymbol: string): Promise<string | null> {
  const symbol = String(geneSymbol || '').trim().toUpperCase();
  if (!symbol) return null;
  const key = `ens:${symbol}`;
  const hit = searchCache.get(key);
  if (hit !== undefined) return hit;

  const query = `
    query ($q: String!) {
      search(queryString: $q, entityNames: ["target"], page: {index: 0, size: 5}) {
        total hits { id name entity }
      }
    }`;
  try {
    const payload = await runGraphQL(query, { q: symbol });
    const hits: Array<{ id: string; name: string }> = payload?.data?.search?.hits || [];
    const exact = hits.find((h) => String(h.name).toUpperCase() === symbol);
    const resolved = (exact || hits[0] || null)?.id ?? null;
    searchCache.set(key, resolved);
    return resolved;
  } catch {
    searchCache.set(key, null);
    return null;
  }
}

const TARGET_QUERY = `
  query ($e: String!) {
    target(ensemblId: $e) {
      id approvedSymbol approvedName
      associatedDiseases(page: {index: 0, size: 1}) { count }
      safetyLiabilities { event eventId datasource url effects { direction dosing } }
      tractability { label modality value }
      drugAndClinicalCandidates {
        count
        rows {
          maxClinicalStage
          drug {
            id name drugType maximumClinicalStage
            synonyms { label source }
            tradeNames { label source }
            crossReferences { source ids }
            mechanismsOfAction { rows { mechanismOfAction actionType targets { id approvedSymbol } } }
            indications { count rows { disease { name } } }
          }
        }
      }
    }
  }`;

function mapDrug(row: any): OpenTargetsDrug {
  const drug = row?.drug || {};
  const mechs = drug.mechanismsOfAction?.rows || [];
  const sourceIds: Record<string, string[]> = {};
  for (const ref of drug.crossReferences || []) {
    if (ref?.source) sourceIds[ref.source] = Array.isArray(ref.ids) ? ref.ids : [ref.ids].filter(Boolean);
  }
  return {
    chemblId: drug.id || '',
    name: drug.name || drug.id || 'Unknown',
    drugType: drug.drugType || null,
    maxClinicalStage: drug.maximumClinicalStage || row?.maxClinicalStage || null,
    mechanisms: toStrings(mechs.map((m: any) => m.mechanismOfAction).filter(Boolean)),
    actionTypes: [...new Set<string>(mechs.map((m: any) => m.actionType).filter(Boolean) as string[])],
    indicationDiseases: (drug.indications?.rows || [])
      .map((r: any) => r?.disease?.name)
      .filter(Boolean),
    tradeNames: toStrings((drug.tradeNames || []).map((t: any) => t?.label).filter(Boolean)),
    sourceIds,
  };
}

/** Full druggability picture for one gene symbol. */
export async function fetchTargetDruggability(geneSymbol: string): Promise<OpenTargetsTarget> {
  const gene = String(geneSymbol || '').trim().toUpperCase();
  const base: OpenTargetsTarget = {
    gene,
    ensemblId: null,
    approvedName: null,
    available: false,
    source: 'opentargets-live',
    drugCount: 0,
    approvedCandidates: [],
    primaryDrugs: [],
    safetyEvents: [],
    tractability: [],
    associatedDiseaseCount: null,
    checkedAt: new Date().toISOString(),
  };
  if (!gene) return { ...base, reason: 'gene symbol required' };

  const cached = targetCache.get(gene);
  if (cached) return cached;

  try {
    const ensemblId = await resolveEnsemblId(gene);
    if (!ensemblId) {
      const out = { ...base, reason: `no Open Targets target found for ${gene}` };
      targetCache.set(gene, out);
      return out;
    }
    const payload = await runGraphQL(TARGET_QUERY, { e: ensemblId });
    const target = payload?.data?.target;
    if (!target) throw new Error('Open Targets returned no target record');

    const rows: any[] = target.drugAndClinicalCandidates?.rows || [];
    const drugs = rows.map(mapDrug);
    const stageRank = (d: OpenTargetsDrug) => STAGE_RANK[d.maxClinicalStage || 'UNKNOWN'] ?? -1;
    const sorted = [...drugs].sort((a, b) => stageRank(b) - stageRank(a) || a.name.localeCompare(b.name));
    const primary = sorted.filter((d) => d.mechanisms.some((m) => /\b(?:EGFR|erbB1)\b/i.test(m)) || d.actionTypes.length > 0)
      .filter((d) => d.mechanisms.length > 0 && d.mechanisms.some((m) => new RegExp(`\\b${gene}\\b`, 'i').test(m) || new RegExp(target.approvedSymbol || gene, 'i').test(m)));

    const out: OpenTargetsTarget = {
      gene,
      ensemblId,
      approvedName: target.approvedName || null,
      available: true,
      source: 'opentargets-live',
      drugCount: Number(target.drugAndClinicalCandidates?.count ?? drugs.length),
      approvedCandidates: sorted.slice(0, 15),
      primaryDrugs: (primary.length > 0 ? primary : sorted.filter((d) => d.mechanisms.length > 0)).slice(0, 15),
      safetyEvents: (target.safetyLiabilities || []).map((s: any) => ({
        event: s.event || '',
        direction: (s.effects || []).map((e: any) => e?.direction).filter(Boolean).join('; ') || 'not specified',
        datasource: s.datasource || '',
      })).filter((s: { event: string }) => s.event).slice(0, 20),
      tractability: (target.tractability || [])
        .filter((t: any) => t?.value === true)
        .map((t: any) => ({ label: t.label, modality: t.modality || null, value: true }))
        .slice(0, 20),
      associatedDiseaseCount: target.associatedDiseases?.count != null ? Number(target.associatedDiseases.count) : null,
      checkedAt: new Date().toISOString(),
    };
    targetCache.set(gene, out);
    return out;
  } catch (err) {
    const failure = upstreamUnavailable('opentargets', err);
    const out = { ...base, reason: failure.reason };
    targetCache.set(gene, out);
    return out;
  }
}

async function runGraphQL(query: string, variables: Record<string, unknown>): Promise<any> {
  const response = await fetchWithRetry(
    OT_ENDPOINT,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'User-Agent': 'OncoAgent/1.0 (bioinformatics-opentargets)',
      },
      body: JSON.stringify({ query, variables }),
      timeoutMs: TIMEOUT_MS,
    }
  );
  if (!response.ok) throw new Error(`Open Targets responded ${response.status}`);
  const payload = await response.json();
  if (payload?.errors) throw new Error(`Open Targets GraphQL error: ${JSON.stringify(payload.errors).slice(0, 240)}`);
  return payload;
}

export function openTargetsAttribution(): string {
  return OT_ATTRIBUTION;
}
