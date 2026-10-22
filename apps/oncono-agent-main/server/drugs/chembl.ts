/**
 * ChEMBL — drug identity, mechanism, metabolism and indication, from EMBL-EBI.
 *
 * The orchestrator's safety rules (GR-01..GR-07 in orchestrator.ts) are hand-written
 * `if` statements over thresholds. They cover the well-known cases and nothing else,
 * so the moment a regimen is recommended that is not in the if-chain, its CYP
 * substrate load, its black-box status and its QT liability are simply unknown.
 *
 * ChEMBL supplies the data-driven layer: for each drug in a recommended regimen,
 * `mechanism.json` gives the molecular target, `metabolism.json` gives the CYP
 * enzymes it is handled by, `drug_warning.json` gives label warnings, and
 * `molecule.json` gives first approval / max phase / black-box status.
 *
 * Live source: https://www.ebi.ac.uk/chembl/api/data (public, no token).
 */

import { fetchWithRetry, TtlCache, upstreamUnavailable } from '../lib/http';

/** Cast a Set of loosely-typed values to string[] for the typed drug shape. */
const toStrings = (values: unknown[]): string[] => values as string[];

const CHEMBL_BASE = (process.env.CHEMBL_API || 'https://www.ebi.ac.uk/chembl/api/data').replace(/\/+$/, '');
const CHEMBL_ATTRIBUTION = 'Drug identity, mechanism and metabolism from ChEMBL (ebi.ac.uk/chembl), EMBL-EBI; content CC BY-SA 3.0.';
const TIMEOUT_MS = 12000;

export interface ChEMBLDrugProfile {
  name: string;
  resolved: boolean;
  reason?: string;
  chemblId: string | null;
  prefName: string | null;
  parentChemblId: string | null;
  maxPhase: string | null;
  maxPhaseNumber: number | null;
  firstApproval: number | null;
  atcClassifications: string[];
  blackBoxWarning: boolean;
  mechanisms: string[];
  targetNames: string[];
  /** CYP enzymes this drug is a substrate / product of, from ChEMBL metabolism. */
  enzymes: string[];
  metaboliteNames: string[];
  warningCount: number;
  checkedAt: string;
}

const cache = new TtlCache<ChEMBLDrugProfile>({ ttlMs: 24 * 60 * 60 * 1000, maxEntries: 256 });

async function getJson(path: string): Promise<any | null> {
  const response = await fetchWithRetry(`${CHEMBL_BASE}/${path}`, {
    headers: { Accept: 'application/json', 'User-Agent': 'OncoAgent/1.0 (bioinformatics-chembl)' },
    timeoutMs: TIMEOUT_MS,
    maxRetries: 1,
  });
  if (!response.ok) return null;
  return response.json();
}

/** Best candidate from ChEMBL's name search. Drug labels carry dose/dose form. */
function candidateNames(name: string): string[] {
  const clean = name.replace(/\s*\(.*?\)\s*/g, ' ').replace(/\s+/g, ' ').trim();
  const firstWord = clean.split(' ')[0];
  return [...new Set([clean, firstWord].filter(Boolean))];
}

export async function fetchDrugProfile(drugName: string): Promise<ChEMBLDrugProfile> {
  const name = String(drugName || '').trim();
  const empty: ChEMBLDrugProfile = {
    name,
    resolved: false,
    chemblId: null,
    prefName: null,
    parentChemblId: null,
    maxPhase: null,
    maxPhaseNumber: null,
    firstApproval: null,
    atcClassifications: [],
    blackBoxWarning: false,
    mechanisms: [],
    targetNames: [],
    enzymes: [],
    metaboliteNames: [],
    warningCount: 0,
    checkedAt: new Date().toISOString(),
  };
  if (!name) return { ...empty, reason: 'drug name required' };

  const key = name.toLowerCase();
  const hit = cache.get(key);
  if (hit) return hit;

  try {
    let molecule: any = null;
    for (const candidate of candidateNames(name)) {
      const payload = await getJson(
        `molecule.json?pref_name__iexact=${encodeURIComponent(candidate)}&limit=1`
      );
      if (payload?.molecules?.length) {
        molecule = payload.molecules[0];
        break;
      }
    }
    if (!molecule) {
      const out = { ...empty, reason: `no ChEMBL record for "${name}"` };
      cache.set(key, out);
      return out;
    }

    const chemblId: string = molecule.molecule_chembl_id;
    const [mechanismPayload, metabolismPayload, warningPayload] = await Promise.all([
      getJson(`mechanism.json?molecule_chembl_id=${chemblId}`),
      getJson(`metabolism.json?molecule_chembl_id=${chemblId}`),
      getJson(`drug_warning.json?molecule_chembl_id=${chemblId}`),
    ]);

    const out: ChEMBLDrugProfile = {
      name,
      resolved: true,
      chemblId,
      prefName: molecule.pref_name || null,
      parentChemblId: molecule.molecule_hierarchy?.parent_chembl_id || null,
      maxPhase: molecule.max_phase || null,
      maxPhaseNumber: molecule.max_phase ? Number(molecule.max_phase) : null,
      firstApproval: typeof molecule.first_approval === 'number' ? molecule.first_approval : null,
      atcClassifications: Array.isArray(molecule.atc_classifications) ? molecule.atc_classifications : [],
      blackBoxWarning: Boolean(molecule.black_box_warning),
      mechanisms: toStrings((mechanismPayload?.mechanisms || []).map((m: any) => m.mechanism_of_action).filter(Boolean)),
      targetNames: [
        ...new Set<string>(
          (mechanismPayload?.mechanisms || [])
            .map((m: any) => m.target_pref_name || m.target_name || m.mechanism_of_action)
            .filter(Boolean) as string[]
        ),
      ],
      enzymes: [
        ...new Set<string>(
          (metabolismPayload?.metabolisms || [])
            .map((m: any) => m.enzyme_name)
            .filter((e: unknown) => typeof e === 'string' && e.length > 0) as string[]
        ),
      ],
      metaboliteNames: [
        ...new Set<string>(
          (metabolismPayload?.metabolisms || [])
            .map((m: any) => m.metabolite_name)
            .filter((n: unknown) => typeof n === 'string' && n.length > 0) as string[]
        ),
      ],
      warningCount: warningPayload?.drug_warnings?.length ?? 0,
      checkedAt: new Date().toISOString(),
    };
    cache.set(key, out);
    return out;
  } catch (err) {
    const failure = upstreamUnavailable('chembl', err);
    const out = { ...empty, reason: failure.reason };
    cache.set(key, out);
    return out;
  }
}

/** Resolve a batch of drug names, tolerating individual lookups failing. */
export async function fetchDrugProfiles(names: string[]): Promise<ChEMBLDrugProfile[]> {
  const unique = [...new Set(names.map((n) => n.trim()).filter(Boolean))].slice(0, 12);
  return Promise.all(unique.map((n) => fetchDrugProfile(n)));
}

/** Extract a comparable drug token from a regimen label like "Osimertinib (80 mg orally daily)". */
export function regimenDrugName(regimen: string): string {
  return String(regimen || '')
    .replace(/\s*\(.*?\)\s*/g, ' ')
    .replace(/\s*[-–]\s*/g, ' ')
    .replace(/\b(?:with|plus|and|\+)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function chemblAttribution(): string {
  return CHEMBL_ATTRIBUTION;
}
