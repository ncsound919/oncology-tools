/**
 * Ensembl VEP (Variant Effect Predictor) annotator.
 *
 * The engine stored `hgvsProtein` strings and described their consequence with a
 * hand-maintained if/else chain over gene names (`if (alt.gene === 'EGFR') ...`,
 * local-oncology-engine.ts:43). Consequences are a property of the *variant*, not
 * the gene, and VEP computes them from the actual transcript: consequence term,
 * impact, SIFT/PolyPhen calls, exon position, and gnomAD population frequency.
 *
 * Live source: https://rest.ensembl.org/vep/homo_sapiens/hgvs/{HGVS}
 * Preferentially submits `GENE:p.Ala123Val` or `GENE:c.123A>T`; both were
 * verified to resolve (EGFR:p.L858R returns ENST00001134423:c.3031A>C).
 *
 * Notes drawn from live probes:
 *  - `?gnomAD=1` only populates `colocated_variants[].frequencies` for variants
 *    that exist in population data. For canonical somatic drivers (EGFR L858R,
 *    KRAS G12C) there is no population frequency at all — absence is correct
 *    here, and we report `gnomADPresent: false` rather than inventing a value.
 *  - Ensembl REST is genuinely flaky (observed 500s and timeouts under load).
 *    Every call is timeout-bounded and failure returns `available: false`.
 */

import { fetchWithRetry, TtlCache, upstreamUnavailable } from '../lib/http';

const VEP_BASE = (process.env.ENSEMBL_REST || 'https://rest.ensembl.org').replace(/\/+$/, '');
const TIMEOUT_MS = 15000;

export interface VepTranscriptConsequence {
  transcriptId: string;
  geneSymbol: string;
  biotype: string;
  consequenceTerms: string[];
  impact: string | null;
  aminoAcids: string | null;
  proteinPosition: string | null;
  cdsPosition: string | null;
  exon: string | null;
  siftPrediction: string | null;
  siftScore: number | null;
  polyphenPrediction: string | null;
  polyphenScore: number | null;
}

export interface VepAnnotation {
  input: string;
  available: boolean;
  reason?: string;
  source: 'ensembl-vep';
  assembly: string | null;
  mostSevereConsequence: string | null;
  /** The transcript consequence for the gene of interest, best-effort chosen. */
  canonical: VepTranscriptConsequence | null;
  allConsequences: VepTranscriptConsequence[];
  /** Allele frequency keys found in colocated population data (gnomAD etc). */
  populationFrequencies: Record<string, number>;
  gnomADPresent: boolean;
  maxAlleleFrequency: number | null;
  checkedAt: string;
}

const cache = new TtlCache<VepAnnotation>({ ttlMs: 24 * 60 * 60 * 1000, maxEntries: 256 });

/** Deletion/inframeshift notations VEP cannot take as c./p. HGVS without a reference. */
function buildCandidates(gene: string, hgvsProtein: string, hgvsCdna?: string): string[] {
  const g = String(gene || '').trim().toUpperCase();
  const p = String(hgvsProtein || '').trim();
  const c = String(hgvsCdna || '').trim();
  const out: string[] = [];
  if (g && c) out.push(`${g}:${c}`);
  if (g && p) out.push(`${g}:${p}`);
  if (c.startsWith('c.')) out.push(c);
  return out.filter(Boolean);
}

function mapConsequence(tc: any): VepTranscriptConsequence {
  return {
    transcriptId: tc.transcript_id || 'unknown',
    geneSymbol: tc.gene_symbol || '',
    biotype: tc.biotype || '',
    consequenceTerms: Array.isArray(tc.consequence_terms) ? tc.consequence_terms : [],
    impact: tc.impact ?? null,
    aminoAcids: tc.amino_acids ?? null,
    proteinPosition: tc.protein_start != null ? String(tc.protein_start) : null,
    cdsPosition: tc.cds_start != null ? String(tc.cds_start) : null,
    exon: tc.exon ?? null,
    siftPrediction: tc.sift_prediction ?? null,
    siftScore: typeof tc.sift_score === 'number' ? tc.sift_score : null,
    polyphenPrediction: tc.polyphen_prediction ?? null,
    polyphenScore: typeof tc.polyphen_score === 'number' ? tc.polyphen_score : null,
  };
}

const IMPACT_RANK: Record<string, number> = { HIGH: 4, MODERATE: 3, LOW: 2, MODIFIER: 1 };

function pickCanonical(consequences: VepTranscriptConsequence[], gene: string): VepTranscriptConsequence | null {
  if (consequences.length === 0) return null;
  const g = gene.toUpperCase();
  const sameGene = consequences.filter((c) => c.geneSymbol.toUpperCase() === g);
  const pool = sameGene.length > 0 ? sameGene : consequences;
  const coding = pool.filter((c) => c.biotype === 'protein_coding');
  const chosen = (coding.length > 0 ? coding : pool).sort((a, b) => {
    const impactA = IMPACT_RANK[a.impact || ''] || 0;
    const impactB = IMPACT_RANK[b.impact || ''] || 0;
    return impactB - impactA;
  })[0];
  return chosen;
}

/**
 * Annotate one variant. Returns `available: false` with a reason when VEP cannot
 * take the notation we hold (e.g. a deletion lacking a reference base) — it never
 * fabricates a consequence.
 */
export async function annotateVariantVEP(
  gene: string,
  hgvsProtein: string,
  hgvsCdna?: string
): Promise<VepAnnotation> {
  const candidates = buildCandidates(gene, hgvsProtein, hgvsCdna);
  const empty = (input: string, reason: string): VepAnnotation => ({
    input,
    available: false,
    reason,
    source: 'ensembl-vep',
    assembly: null,
    mostSevereConsequence: null,
    canonical: null,
    allConsequences: [],
    populationFrequencies: {},
    gnomADPresent: false,
    maxAlleleFrequency: null,
    checkedAt: new Date().toISOString(),
  });

  if (candidates.length === 0) {
    return empty(`${gene} ${hgvsProtein}`, 'no HGVS notation available for VEP');
  }

  const cacheKey = candidates[0];
  const hit = cache.get(cacheKey);
  if (hit) return hit;

  let lastReason = '';
  for (const notation of candidates) {
    try {
      const response = await fetchWithRetry(
        `${VEP_BASE}/vep/homo_sapiens/hgvs/${encodeURIComponent(notation)}?content-type=application/json&gnomAD=1&numbers=1`,
        {
          headers: { Accept: 'application/json', 'User-Agent': 'OncoAgent/1.0 (bioinformatics-vep)' },
          timeoutMs: TIMEOUT_MS,
          maxRetries: 1,
        }
      );
      if (!response.ok) {
        lastReason = `VEP responded ${response.status} for ${notation}`;
        continue;
      }
      const data = await response.json();
      const block = Array.isArray(data) ? data.find((d: any) => Array.isArray(d?.transcript_consequences) && d.transcript_consequences.length > 0) : null;
      if (!block) {
        lastReason = `VEP returned no transcript consequence for ${notation}`;
        continue;
      }

      const allConsequences: VepTranscriptConsequence[] = block.transcript_consequences.map(mapConsequence);
      const frequencies: Record<string, number> = {};
      for (const cv of Array.isArray(block.colocated_variants) ? block.colocated_variants : []) {
        const freq = cv?.frequencies;
        if (!freq) continue;
        Object.entries(freq).forEach(([k, v]) => {
          if (typeof v === 'number' && v > 0) frequencies[k] = v;
        });
      }
      const values = Object.values(frequencies);
      const out: VepAnnotation = {
        input: notation,
        available: true,
        source: 'ensembl-vep',
        assembly: block.assembly_name || null,
        mostSevereConsequence: block.most_severe_consequence || null,
        canonical: pickCanonical(allConsequences, gene),
        allConsequences: allConsequences.slice(0, 8),
        populationFrequencies: frequencies,
        gnomADPresent: Object.keys(frequencies).some((k) => k.toLowerCase().includes('gnomad')),
        maxAlleleFrequency: values.length > 0 ? Math.max(...values) : null,
        checkedAt: new Date().toISOString(),
      };
      cache.set(cacheKey, out);
      return out;
    } catch (err) {
      lastReason =
        err instanceof Error && err.name === 'AbortError'
          ? `VEP request for ${notation} exceeded the ${TIMEOUT_MS}ms timeout (rest.ensembl.org is intermittently unavailable)`
          : err instanceof Error
          ? err.message
          : String(err);
    }
  }

  const out = empty(candidates[0], lastReason || 'VEP annotation unavailable');
  cache.set(cacheKey, out);
  return out;
}

/**
 * A compact human-readable consequence string for the tumour board report, built
 * from measured VEP fields rather than from a gene-name lookup.
 */
export function describeVepConsequence(annotation: VepAnnotation): string {
  if (!annotation.available) return '';
  const c = annotation.canonical;
  if (!c) return '';
  const parts: string[] = [];
  const terms = c.consequenceTerms.filter((t) => t !== 'sequence_variant');
  if (terms.length > 0) parts.push(terms.join('/').replace(/_/g, ' '));
  if (c.impact) parts.push(`${c.impact.toLowerCase()} impact`);
  if (c.siftPrediction) parts.push(`SIFT ${c.siftPrediction.replace(/_/g, ' ')}`);
  if (c.polyphenPrediction) parts.push(`PolyPhen-2 ${c.polyphenPrediction.replace(/_/g, ' ')}`);
  if (c.exon) parts.push(`exon ${c.exon}`);
  if (annotation.maxAlleleFrequency !== null) {
    parts.push(`gnomAD max AF ${annotation.maxAlleleFrequency.toExponential(2)}`);
  }
  return parts.join('; ');
}

export function vepAttribution(): string {
  return 'Functional annotation computed by Ensembl VEP (rest.ensembl.org), EMBL-EBI; gnomAD population frequencies where present.';
}
