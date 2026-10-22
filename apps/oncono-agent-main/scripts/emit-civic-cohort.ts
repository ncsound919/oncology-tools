/**
 * emit-civic-cohort.ts — freeze the CIViC AMP/ASCO/CAP assertion cohort to disk as
 * a locked, hash-addressed input.
 *
 *   npx tsx scripts/emit-civic-cohort.ts
 *
 * v2 (2026-10-13): the join key is now CANONICAL, not a parsed name. Each assertion
 * carries its `molecularProfile.id` and its constituent `variants { name feature }`
 * (a composite MP decomposes into its genes+alterations), and each supporting
 * evidence item carries its own `molecularProfile.id`. So "did this evidence belong
 * to the asserted profile?" is an id comparison, not a string split — which is what
 * was dropping 165/808 items.
 *
 * The assertion's guideline/approval signals are frozen too, because CIViC's own
 * docs state the top tiers incorporate them ("consideration of practice guidelines
 * as well as regulatory approvals"), and the tier rule needs them to be reproducible.
 *
 * Output is an INPUT, not a finding.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import {
  fetchCivicAssertionTiers,
  tierAxisFromAmpLevel,
  AMP_TIERED_ASSERTION_TYPES,
  type CivicAssertion,
} from '../server/genomics/civic.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(HERE, '..', '..', '..', 'platform', 'data');
const OUT_FILE = join(OUT_DIR, 'civic-tier-cohort.json');
const LIMIT = Number(process.env.COHORT_LIMIT || 1000);

function main() {
  return (async () => {
    const fetchedAt = new Date().toISOString();
    const res = await fetchCivicAssertionTiers({ limit: LIMIT, useCache: false });
    if (!res.available) {
      console.error(`[cohort] CIViC unavailable: ${res.reason}`);
      process.exit(1);
    }

    const kept: unknown[] = [];
    let droppedNonAmpType = 0;
    let droppedNoTierAxis = 0;
    let droppedNoCanonicalKey = 0;
    let composite = 0;

    for (const a of res.assertions as CivicAssertion[]) {
      if (!AMP_TIERED_ASSERTION_TYPES.includes(a.assertionType)) {
        droppedNonAmpType += 1;
        continue;
      }
      const tierAxis = tierAxisFromAmpLevel(a.ampLevel);
      if (tierAxis === null) {
        droppedNoTierAxis += 1;
        continue;
      }
      // Canonical identity from the profile's own variants, not a name split.
      if (!a.molecularProfileId || a.variants.length === 0) {
        droppedNoCanonicalKey += 1;
        continue;
      }
      if (a.variants.length > 1) composite += 1;

      kept.push({
        assertionId: a.id,
        assertionName: a.name,
        assertionType: a.assertionType,
        civicAmpLevel: a.ampLevel,
        civicTierAxis: tierAxis,
        significance: a.significance,
        assertionMolecularProfileId: a.molecularProfileId,
        molecularProfile: a.molecularProfile,
        variants: a.variants.map((v) => ({ gene: v.gene, alteration: v.name })),
        isComplex: a.variants.length > 1,
        disease: a.disease,
        therapies: a.therapies,
        // The declarable inputs a level-only rule cannot see (CIViC docs).
        nccnGuideline: a.nccnGuideline,
        regulatoryApproval: a.regulatoryApproval,
        fdaCompanionTest: a.fdaCompanionTest,
        evidence: a.evidence.map((e) => ({
          id: e.id,
          level: e.level,
          direction: e.direction,
          significance: e.significance,
          disease: e.disease,
          therapies: e.therapies,
          molecularProfileId: e.molecularProfileId,
        })),
        url: a.url,
      });
    }

    const cohortHash = crypto.createHash('sha256').update(JSON.stringify(kept)).digest('hex');
    const doc = {
      cohortId: `civic-tier-cohort-${cohortHash.slice(0, 12)}`,
      cohortHash,
      schemaVersion: 2,
      fetchedAt,
      source: { name: 'CIViC', url: 'https://civicdb.org', endpoint: res.endpoint, license: 'CC0 1.0' },
      tierCriterion: {
        standard: 'AMP/ASCO/CAP 2017',
        citation: 'PMID 27993330',
        levelTier: { A: 'I', B: 'I', C: 'II', D: 'II', E: 'III' },
        ampTieredAssertionTypes: [...AMP_TIERED_ASSERTION_TYPES],
      },
      counts: {
        upstreamTotal: res.total,
        collected: res.assertions.length,
        pagesFetched: res.pages,
        truncated: res.truncated,
        droppedNonAmpType,
        droppedNoTierAxis,
        droppedNoCanonicalKey,
        compositeKept: composite,
        kept: kept.length,
      },
      assertions: kept,
    };

    mkdirSync(OUT_DIR, { recursive: true });
    writeFileSync(OUT_FILE, `${JSON.stringify(doc, null, 2)}\n`);

    console.log(`[cohort] upstream total       : ${doc.counts.upstreamTotal}`);
    console.log(`[cohort] collected            : ${doc.counts.collected} (${doc.counts.pagesFetched} page(s), truncated=${doc.counts.truncated})`);
    console.log(`[cohort] dropped non-AMP type : ${doc.counts.droppedNonAmpType}`);
    console.log(`[cohort] dropped no tier axis : ${doc.counts.droppedNoTierAxis}`);
    console.log(`[cohort] dropped no canon key : ${doc.counts.droppedNoCanonicalKey}`);
    console.log(`[cohort] composite kept       : ${doc.counts.compositeKept}`);
    console.log(`[cohort] KEPT                 : ${doc.counts.kept}`);
    console.log(`[cohort] cohortHash           : ${cohortHash}`);
    console.log(`[cohort] wrote                : ${OUT_FILE}`);
  })();
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
