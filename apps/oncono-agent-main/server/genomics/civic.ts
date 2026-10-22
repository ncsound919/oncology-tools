/**
 * CIViC (Clinical Interpretation of Variants in Cancer) live variant evidence.
 *
 * Replaces the flat OncoKB gene-list cache for the question clinical users actually
 * ask: "is this exact alteration predictive of response to a drug in this disease?"
 * CIViC answers with community-curated evidence items, each with an evidence level
 * (A–E), a direction (Supports / Does Not Support), and a disease context.
 *
 * Live source: https://civicdb.org/api/graphql (public, no token — verified 200).
 * CIViC content is CC0 1.0.
 */

import { fetchWithRetry, TtlCache, upstreamUnavailable } from '../lib/http';

const CIVIC_ENDPOINT = (process.env.CIVIC_GRAPHQL || 'https://civicdb.org/api/graphql').replace(/\/+$/, '');
const CIVIC_ATTRIBUTION = 'Clinical evidence from CIViC (civicdb.org), CC0 1.0.';
const TIMEOUT_MS = 12000;

export type CivicLevel = 'A' | 'B' | 'C' | 'D' | 'E';
const LEVEL_RANK: Record<string, number> = { A: 5, B: 4, C: 3, D: 2, E: 1 };

export interface CivicEvidenceItem {
  id: number;
  level: CivicLevel;
  type: string;
  direction: string;
  significance: string | null;
  disease: string;
  therapies: string[];
  molecularProfile: string;
  description?: string;
  url: string;
}

export interface CivicVariantEvidence {
  gene: string;
  alteration: string;
  molecularProfile: string;
  available: boolean;
  reason?: string;
  source: 'civic-live';
  /** Highest evidence level observed; null when CIViC has no assertions. */
  bestLevel: CivicLevel | null;
  evidenceCount: number;
  predictiveCount: number;
  therapies: string[];
  diseases: string[];
  items: CivicEvidenceItem[];
  checkedAt: string;
}

export interface CivicQueryResult {
  available: boolean;
  reason?: string;
  source: 'civic-live';
  endpoint: string;
  total: number;
  evidence: CivicEvidenceItem[];
  attribution: string;
}

const cache = new TtlCache<CivicVariantEvidence>({ ttlMs: 60 * 60 * 1000, maxEntries: 512 });

/**
 * CIViC names molecular profiles without the `p.` prefix: "EGFR L858R", not
 * "EGFR p.L858R". Verified against the live API — the prefixed form returns
 * totalCount 0. Deletions are normalised the same way ("p.E746_A750del" ->
 * "E746_A750del").
 */
export function toCivicMolecularProfile(gene: string, hgvsProtein: string): string {
  const alt = String(hgvsProtein || '')
    .trim()
    .replace(/^p\./i, '')
    .replace(/\s+/g, '');
  const g = String(gene || '').trim().toUpperCase();
  return alt ? `${g} ${alt}` : g;
}

async function runGraphQL(query: string): Promise<any> {
  const response = await fetchWithRetry(
    CIVIC_ENDPOINT,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'User-Agent': 'OncoAgent/1.0 (bioinformatics-civic)',
      },
      body: JSON.stringify({ query }),
      timeoutMs: TIMEOUT_MS,
    }
  );
  if (!response.ok) throw new Error(`CIViC responded ${response.status}`);
  const payload = await response.json();
  if (payload?.errors) throw new Error(`CIViC GraphQL error: ${JSON.stringify(payload.errors).slice(0, 240)}`);
  return payload;
}

function mapNode(node: any): CivicEvidenceItem {
  return {
    id: Number(node.id),
    level: String(node.evidenceLevel || '').toUpperCase() as CivicLevel,
    type: node.evidenceType || 'UNKNOWN',
    direction: node.evidenceDirection || 'N/A',
    significance: node.significance ?? null,
    disease: node.disease?.name || 'Unspecified',
    therapies: (node.therapies || []).map((t: { name?: string }) => t?.name).filter(Boolean),
    molecularProfile: node.molecularProfile?.name || '',
    description: node.description || undefined,
    url: `https://civicdb.org/evidence/${node.id}`,
  };
}

/** Generic evidence search used by the proxy route. */
export async function searchCivicEvidence(args: {
  molecularProfile?: string;
  disease?: string;
  therapy?: string;
  level?: CivicLevel;
  limit?: number;
}): Promise<CivicQueryResult> {
  const limit = Math.min(Math.max(Number(args.limit) || 10, 1), 50);
  const filters: string[] = [`first: ${limit}`];
  if (args.molecularProfile) filters.push(`molecularProfileName: ${JSON.stringify(args.molecularProfile)}`);
  if (args.disease) filters.push(`diseaseName: ${JSON.stringify(args.disease)}`);
  if (args.therapy) filters.push(`therapyName: ${JSON.stringify(args.therapy)}`);
  if (args.level) filters.push(`evidenceLevel: ${args.level}`);
  const query = `
    { evidenceItems(${filters.join(', ')}) { totalCount nodes {
        id evidenceLevel evidenceType evidenceDirection significance
        disease { name } therapies { name } molecularProfile { name } description
      } } }`;

  try {
    const payload = await runGraphQL(query);
    const block = payload?.data?.evidenceItems;
    const items = (block?.nodes || []).map(mapNode);
    return {
      available: true,
      source: 'civic-live',
      endpoint: CIVIC_ENDPOINT,
      total: Number(block?.totalCount ?? items.length),
      evidence: items,
      attribution: CIVIC_ATTRIBUTION,
    };
  } catch (err) {
    const failure = upstreamUnavailable('civic', err);
    return { available: false, reason: failure.reason, source: 'civic-live', endpoint: CIVIC_ENDPOINT, total: 0, evidence: [], attribution: CIVIC_ATTRIBUTION };
  }
}

/** Highest-level live assertions for one `gene + protein change` pair. */
export async function fetchCivicVariantEvidence(
  gene: string,
  hgvsProtein: string,
  opts: { limit?: number } = {}
): Promise<CivicVariantEvidence> {
  const molecularProfile = toCivicMolecularProfile(gene, hgvsProtein);
  const base: CivicVariantEvidence = {
    gene: gene,
    alteration: hgvsProtein,
    molecularProfile,
    available: false,
    source: 'civic-live',
    bestLevel: null,
    evidenceCount: 0,
    predictiveCount: 0,
    therapies: [],
    diseases: [],
    items: [],
    checkedAt: new Date().toISOString(),
  };
  if (!molecularProfile.trim()) {
    return { ...base, reason: 'gene and alteration required' };
  }

  const cacheKey = molecularProfile.toLowerCase();
  const hit = cache.get(cacheKey);
  if (hit) return hit;

  const limit = Math.min(Math.max(opts.limit ?? 20, 1), 50);
  const query = `
    { evidenceItems(first: ${limit}, molecularProfileName: ${JSON.stringify(molecularProfile)}) {
        totalCount nodes {
          id evidenceLevel evidenceType evidenceDirection significance
          disease { name } therapies { name } molecularProfile { name } description
        } } }`;

  try {
    const payload = await runGraphQL(query);
    const block = payload?.data?.evidenceItems;
    const items: CivicEvidenceItem[] = (block?.nodes || []).map(mapNode);
    const best = items.reduce<CivicLevel | null>(
      (acc, item) =>
        item.level && LEVEL_RANK[item.level] && (!acc || LEVEL_RANK[item.level] > LEVEL_RANK[acc])
          ? item.level
          : acc,
      null
    );
    const therapies = [...new Set(items.flatMap((i) => i.therapies))].sort();
    const diseases = [...new Set(items.map((i) => i.disease))].sort();
    const out: CivicVariantEvidence = {
      ...base,
      available: true,
      bestLevel: best,
      evidenceCount: items.length,
      predictiveCount: items.filter((i) => i.type === 'PREDICTIVE').length,
      therapies: therapies.slice(0, 25),
      diseases: diseases.slice(0, 10),
      items: items.slice(0, limit),
      checkedAt: new Date().toISOString(),
    };
    cache.set(cacheKey, out);
    return out;
  } catch (err) {
    const out: CivicVariantEvidence = {
      ...base,
      available: false,
      source: 'civic-live',
      reason: err instanceof Error ? err.message : String(err),
    };
    cache.set(cacheKey, out);
    return out;
  }
}

/**
 * Inverse of `toCivicMolecularProfile`: CIViC names a profile "<GENE> <ALTERATION>"
 * ("EGFR L858R", "KRAS G12C", "EGFR Exon 19 Deletion"). Split on the FIRST run of
 * whitespace, so an alteration that contains spaces keeps them ("Exon 19 Deletion").
 *
 * Returns null only for an empty name. A gene-level bucket ("TP53 Mutation") is a
 * real CIViC profile, so it is returned with an alteration rather than dropped;
 * gene-only names yield an empty alteration and the consumer decides whether a
 * bucket is scorable. Do NOT merge this knowledge into another module — the naming
 * convention is CIViC's and lives with the rest of the CIViC schema knowledge.
 */
export function fromCivicMolecularProfile(name: string): { gene: string; alteration: string } | null {
  const s = String(name ?? '').trim();
  if (!s) return null;
  const m = s.match(/^(\S+)\s*(.*)$/);
  if (!m) return null;
  return { gene: m[1].toUpperCase(), alteration: m[2].replace(/\s+/g, ' ').trim() };
}

export function civicAttribution(): string {
  return CIVIC_ATTRIBUTION;
}

export function civicCacheSize(): number {
  return cache.size;
}

/* ---------------------------------------------------------------------------
 * AMP/ASCO-CAP assertion tiers — CIViC's OWN curated tier.
 * ------------------------------------------------------------------------- */

/**
 * CIViC's Assertion object carries its own curated AMP/ASCO-CAP tier in the
 * `ampLevel` field. That matters: it means the tier is *published by CIViC*, not
 * derived by any mapping of ours. An earlier plan proposed building a
 * CIViC-evidence-level -> AMP-tier mapper; inventing it would have bounded the
 * "external" comparator by our own heuristic, so the mapper is CIViC's field and
 * this is a read.
 *
 * Verified against the live API (2026-10-13, HTTP 200): type `Assertion` exposes
 * `ampLevel`, and it is non-null exactly for PREDICTIVE / PROGNOSTIC / DIAGNOSTIC
 * assertions. ONCOGENIC and PREDISPOSING assertions are classified under a
 * different guideline (ClinGen/CGC/VICC oncogenicity, ACMG-AMP) and carry
 * `ampLevel: null` — an absent tier means "not AMP-tiered", never "tier 0".
 * Values observed: TIER_I_LEVEL_A, TIER_II_LEVEL_C, TIER_II_LEVEL_D, TIER_III.
 */
export type AmpTierAxis = 'I' | 'II' | 'III' | 'IV';

/** Assertion types whose AMP-ASCO-CAP tier CIViC stores in `ampLevel`. */
export const AMP_TIERED_ASSERTION_TYPES: readonly string[] = ['PREDICTIVE', 'PROGNOSTIC', 'DIAGNOSTIC'];

export interface CivicAssertionEvidenceItem {
  id: number;
  /** CIViC evidence level (A–E). Kept raw; validated by the consumer's schema. */
  level: string;
  direction: string;
  type: string;
  significance: string | null;
  disease: string;
  therapies: string[];
  molecularProfile: string;
  /** Canonical profile id — the join key, so matching is an id comparison. */
  molecularProfileId: number | null;
}

export interface CivicAssertion {
  id: number;
  name: string;
  assertionType: string;
  /** CIViC's curated AMP-ASCO-CAP tier, raw upstream string. Null when not AMP-tiered. */
  ampLevel: string | null;
  significance: string | null;
  molecularProfile: string;
  molecularProfileId: number | null;
  /** Constituent variants (gene + alteration). A composite MP has more than one. */
  variants: { gene: string; name: string }[];
  disease: string;
  therapies: string[];
  /** Declarable guideline/approval inputs a level-only rule cannot see. */
  nccnGuideline: string | null;
  regulatoryApproval: boolean | null;
  fdaCompanionTest: boolean | null;
  evidence: CivicAssertionEvidenceItem[];
  url: string;
}

export interface CivicAssertionTiersResult {
  available: boolean;
  reason?: string;
  source: 'civic-live';
  endpoint: string;
  total: number;
  /** Pages actually fetched — CIViC caps a single page at 100 rows. */
  pages: number;
  /** Assertions dropped because the request hit `limit` rather than the upstream total. */
  truncated: boolean;
  assertions: CivicAssertion[];
  attribution: string;
}

const AMP_ASSERTION_CACHE_KEY = '__civic_assertion_tiers__';
const AMP_PAGE_SIZE = 100;
const AMP_MAX_PAGES = 8;

const ampCache = new TtlCache<CivicAssertionTiersResult>({ ttlMs: 60 * 60 * 1000, maxEntries: 64 });

/**
 * Project CIViC's tier string onto the coarse tier axis (I–IV), dropping the
 * Level qualifier (I-A, II-C, ...). The level is dropped because the local
 * policy arm yields a tier with no level, so a finer axis has nothing to compare
 * against; dropping it is a stated collapse, not a precision.
 *
 * Returns null for anything unrecognised. An unknown CIViC tier must land as
 * unscoreable — guessing here would silently mis-tier the external arm, which is
 * the same defect class as coercing a `rawCategory`.
 */
export function tierAxisFromAmpLevel(ampLevel: string | null | undefined): AmpTierAxis | null {
  const s = String(ampLevel ?? '').trim().toUpperCase();
  if (!s) return null;
  // SEGMENT match, not prefix match. Prefixes collide: 'TIER_III' starts with
  // both 'TIER_I' and 'TIER_II' ('TIER_II' is its first 7 characters), so any
  // startsWith ordering maps every TIER_III and TIER_IV onto II — a one-tier
  // error applied to the whole external arm, silently. The tier is the token
  // that follows 'TIER_'.
  const parts = s.split('_');
  if (parts.length < 2 || parts[0] !== 'TIER') return null;
  const axis = parts[1];
  if (axis === 'I' || axis === 'II' || axis === 'III' || axis === 'IV') return axis;
  return null;
}

function mapAssertionEvidence(node: any): CivicAssertionEvidenceItem {
  return {
    id: Number(node.id),
    level: String(node.evidenceLevel || '').toUpperCase(),
    direction: node.evidenceDirection || 'N/A',
    type: node.evidenceType || 'UNKNOWN',
    significance: node.significance ?? null,
    disease: node.disease?.name || 'Unspecified',
    therapies: (node.therapies || []).map((t: { name?: string }) => t?.name).filter(Boolean),
    molecularProfile: node.molecularProfile?.name || '',
    molecularProfileId: node.molecularProfile?.id != null ? Number(node.molecularProfile.id) : null,
  };
}

function mapAssertion(node: any): CivicAssertion {
  return {
    id: Number(node.id),
    name: node.name || '',
    assertionType: node.assertionType || 'UNKNOWN',
    ampLevel: node.ampLevel ? String(node.ampLevel) : null,
    significance: node.significance ?? null,
    molecularProfile: node.molecularProfile?.name || '',
    molecularProfileId: node.molecularProfile?.id != null ? Number(node.molecularProfile.id) : null,
    variants: (node.molecularProfile?.variants || []).map((v: any) => ({
      gene: String(v?.feature?.name || '').toUpperCase(),
      name: String(v?.name || ''),
    })),
    disease: node.disease?.name || 'Unspecified',
    therapies: (node.therapies || []).map((t: { name?: string }) => t?.name).filter(Boolean),
    nccnGuideline: node.nccnGuideline?.name ?? node.nccnGuidelineVersion ?? null,
    regulatoryApproval: typeof node.regulatoryApproval === 'boolean' ? node.regulatoryApproval : null,
    fdaCompanionTest: typeof node.fdaCompanionTest === 'boolean' ? node.fdaCompanionTest : null,
    evidence: (node.evidenceItems || []).map(mapAssertionEvidence),
    url: `https://civicdb.org/assertion/${node.id}`,
  };
}

const ASSERTION_FIELDS = `
  id name assertionType ampLevel significance
  nccnGuideline { name } nccnGuidelineVersion regulatoryApproval fdaCompanionTest
  molecularProfile { id name variants { name feature { name } } }
  disease { name } therapies { name }
  evidenceItems {
    id evidenceLevel evidenceType evidenceDirection significance
    disease { name } therapies { name } molecularProfile { id name }
  }`;

/**
 * CIViC's AMP/ASCO/CAP assertion tiers, paginated.
 *
 * CIViC caps a single page at 100 rows (asking for 200 returns 100), so a full
 * cohort needs the `after` cursor. `limit` bounds how many assertions are
 * collected; `truncated` reports honestly when the collected set is short of the
 * upstream total, so a short cohort is never read as "CIViC has few tiers".
 */
export async function fetchCivicAssertionTiers(args: {
  molecularProfile?: string;
  limit?: number;
  useCache?: boolean;
} = {}): Promise<CivicAssertionTiersResult> {
  const limit = Math.min(Math.max(Number(args.limit) || 500, 1), 1000);
  const mp = String(args.molecularProfile ?? '').trim();
  const cacheKey = mp ? `assertion:${mp.toLowerCase()}` : AMP_ASSERTION_CACHE_KEY;

  const empty: CivicAssertionTiersResult = {
    available: false,
    reason: undefined,
    source: 'civic-live',
    endpoint: CIVIC_ENDPOINT,
    total: 0,
    pages: 0,
    truncated: false,
    assertions: [],
    attribution: CIVIC_ATTRIBUTION,
  };

  if (args.useCache !== false) {
    const hit = ampCache.get(cacheKey);
    if (hit) return hit;
  }

  const collected: CivicAssertion[] = [];
  let after: string | null = null;
  let total = 0;
  let pages = 0;

  try {
    do {
      const filters = [`first: ${AMP_PAGE_SIZE}`];
      if (after) filters.push(`after: ${JSON.stringify(after)}`);
      if (mp) filters.push(`molecularProfileName: ${JSON.stringify(mp)}`);
      const query = `{ assertions(${filters.join(', ')}) {
        totalCount pageInfo { hasNextPage endCursor } nodes {${ASSERTION_FIELDS}}
      } }`;

      const payload = await runGraphQL(query);
      const block = payload?.data?.assertions;
      const nodes: any[] = block?.nodes || [];
      total = Number(block?.totalCount ?? 0);
      for (const node of nodes) collected.push(mapAssertion(node));
      pages += 1;

      const page = block?.pageInfo;
      if (!page?.hasNextPage || !page.endCursor || nodes.length === 0 || collected.length >= limit) break;
      after = String(page.endCursor);
    } while (pages < AMP_MAX_PAGES);

    const out: CivicAssertionTiersResult = {
      ...empty,
      available: true,
      total,
      pages,
      truncated: collected.length < total,
      assertions: collected.slice(0, limit),
    };
    ampCache.set(cacheKey, out);
    return out;
  } catch (err) {
    const out: CivicAssertionTiersResult = {
      ...empty,
      reason: err instanceof Error ? err.message : String(err),
    };
    return out;
  }
}
