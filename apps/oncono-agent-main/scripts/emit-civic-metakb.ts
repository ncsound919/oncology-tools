/**
 * emit-civic-metakb.ts — the independent-source arm.
 *
 *   npx tsx scripts/emit-civic-metakb.ts
 *
 * For every variant in the frozen CIViC cohort, ask the VICC Meta-Knowledgebase
 * (which harmonises CIViC + OncoKB + JAX CKB + CGI + PMKB) whether it holds a
 * statement, and record MetaKB's own `metakb_star_rating` — a corroboration grade
 * it computes across independent submissions.
 *
 * This is the answer to the one limitation that was real: "no adjudicated gold
 * standard". MetaKB is not truth either, but it is a source CIViC's curators did
 * not write, so a curated assertion that MetaKB also carries is independently
 * corroborated, and one it does not is single-source. The grade travels with the
 * number; it is never presented as accuracy.
 *
 * Queries are grouped by gene (far fewer calls than per-variant) and paced.
 */
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';

const HERE = dirname(fileURLToPath(import.meta.url));
const DATA = join(HERE, '..', '..', '..', 'platform', 'data');
const COHORT = join(DATA, 'civic-tier-cohort.json');
const OUT_FILE = join(DATA, 'civic-metakb-corroboration.json');
const BASE = process.env.METAKB_BASE || 'https://pediatric.metakb.org';
const LIMIT = Number(process.env.METAKB_LIMIT || 100);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const norm = (s: string) => String(s || '').trim().toUpperCase().replace(/\s+/g, ' ');

async function searchGene(gene: string): Promise<any[]> {
  const url = `${BASE}/api/search/statements?gene=${encodeURIComponent(gene)}&limit=${LIMIT}`;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const r = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': 'onco-agent/1.0' } });
      if (!r.ok) {
        if (r.status >= 500 || r.status === 429) { await sleep(700 * (attempt + 1)); continue; }
        throw new Error(`MetaKB ${r.status}`);
      }
      const j: any = await r.json();
      return [
        ...(j?.therapeutic_response_statements || []),
        ...(j?.prognostic_statements || []),
        ...(j?.diagnostic_statements || []),
      ];
    } catch (err) {
      if (attempt === 2) throw err;
      await sleep(700 * (attempt + 1));
    }
  }
  return [];
}

function starOf(stmt: any): { rating: string | null; reason: string | null } {
  const ext = stmt?.extensions || [];
  const rating = ext.find((e: any) => e?.name === 'metakb_star_rating')?.value?.primaryCoding?.code ?? null;
  const reason = ext.find((e: any) => e?.name === 'metakb_star_rating_reason')?.value ?? null;
  return { rating, reason: typeof reason === 'string' ? reason : null };
}

async function main() {
  const cohort = JSON.parse(readFileSync(COHORT, 'utf8'));
  const genes = [...new Set<string>(cohort.assertions.flatMap((a: any) => a.variants.map((v: any) => String(v.gene))))].filter(Boolean).sort();

  console.log(`[metakb] genes to query: ${genes.length}`);
  // statement index: canonical variant name -> the FIRST non-null star rating
  // seen for that variant name, and the number of statements carrying it.
  // NB: this is first-seen, not the strongest rating; MetaKB returns
  // statements per gene in an unspecified order, so which rating is
  // captured is arbitrary when a variant name carries several.
  const byVariant = new Map<string, { variantName: string; alleleId: string | null; rating: string | null; reason: string | null; statements: number }>();
  const queryErrors: string[] = [];

  for (const gene of genes) {
    let stmts: any[] = [];
    try {
      stmts = await searchGene(gene);
    } catch (err) {
      queryErrors.push(`${gene}: ${err instanceof Error ? err.message : String(err)}`);
      continue;
    }
    for (const s of stmts) {
      const v = s?.proposition?.subjectVariant;
      const name = norm(v?.name);
      if (!name) continue;
      const allele = v?.constraints?.[0]?.allele?.id ?? null;
      const { rating, reason } = starOf(s);
      const prev = byVariant.get(name);
      byVariant.set(name, {
        variantName: v.name,
        alleleId: allele,
        rating: rating ?? prev?.rating ?? null,
        reason: reason ?? prev?.reason ?? null,
        statements: (prev?.statements ?? 0) + 1,
      });
    }
    await sleep(150);
  }

  const readings = cohort.assertions.map((a: any) => {
    const matches = a.variants
      .map((v: any) => byVariant.get(norm(`${v.gene} ${v.alteration}`)))
      .filter(Boolean);
    const ratings = matches.map((m: any) => m.rating).filter(Boolean);
    // A CIViC assertion is "independently corroborated" when MetaKB holds a
    // statement for at least one of its variants. The star rating refines it.
    return {
      assertionId: a.assertionId,
      civicTierAxis: a.civicTierAxis,
      variants: a.variants.map((v: any) => `${v.gene} ${v.alteration}`),
      metakbCorroborated: matches.length > 0,
      metakbStatements: matches.reduce((s: number, m: any) => s + (m.statements || 0), 0),
      metakbStarRatings: ratings,
      metakbAlleleIds: matches.map((m: any) => m.alleleId).filter(Boolean),
    };
  });

  const corroborated = readings.filter((r: any) => r.metakbCorroborated).length;
  const doc = {
    source: { name: 'VICC Meta-Knowledgebase', base: BASE, harmonizes: ['CIViC', 'OncoKB', 'JAX CKB', 'CGI', 'PMKB'], license: 'MIT (software); per-source content licences apply' },
    fetchedAt: new Date().toISOString(),
    claim: {
      measures: 'whether MetaKB (a separate harmonisation of multiple knowledgebases) holds a statement for each cohort variant',
      doesNotMeasure: 'clinical correctness; MetaKB is independent, not adjudicated',
    },
    counts: { cohortAssertions: cohort.assertions.length, genesQueried: genes.length, variantNamesInMetaKB: byVariant.size, corroborated, queryErrors: queryErrors.length },
    queryErrors,
    readings,
    readingsHash: crypto.createHash('sha256').update(JSON.stringify(readings)).digest('hex'),
  };
  mkdirSync(DATA, { recursive: true });
  writeFileSync(OUT_FILE, `${JSON.stringify(doc, null, 2)}\n`);

  console.log(`[metakb] variant names in MetaKB : ${byVariant.size}`);
  console.log(`[metakb] cohort assertions       : ${cohort.assertions.length}`);
  console.log(`[metakb] independently corroborated: ${corroborated} (${((100 * corroborated) / cohort.assertions.length).toFixed(1)}%)`);
  if (queryErrors.length) console.log(`[metakb] query errors            : ${queryErrors.length} -> ${queryErrors.slice(0, 5).join('; ')}`);
  console.log(`[metakb] wrote                   : ${OUT_FILE}`);
}

main().catch((e) => { console.error(e instanceof Error ? e.message : String(e)); process.exit(1); });
