/**
 * Tests for CIViC's AMP/ASCO-CAP assertion tiers.
 *
 * The load-bearing behaviours these pin down:
 *  - an unrecognised `ampLevel` becomes null (unscoreable), never a guessed tier;
 *  - ONCOGENIC / PREDISPOSING assertions carry no AMP tier, so they are
 *    unscoreable rather than "tier 0";
 *  - CIViC caps a page at 100 rows, so pagination is what makes the cohort
 *    complete — and a short cohort reports `truncated: true` instead of looking
 *    like "CIViC has few tiers";
 *  - a dead upstream fails open with a reason and never fabricates tiers.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  tierAxisFromAmpLevel,
  AMP_TIERED_ASSERTION_TYPES,
  fetchCivicAssertionTiers,
  fromCivicMolecularProfile,
} from './civic';

function fakeFetch(responses: Array<{ status?: number; body?: unknown }>) {
  let i = 0;
  const calls: unknown[] = [];
  const fn = async (url: string, init?: RequestInit) => {
    calls.push(JSON.parse(String(init?.body ?? '{}')).query);
    const r = responses[Math.min(i, responses.length - 1)];
    i += 1;
    return {
      ok: (r.status ?? 200) < 400,
      status: r.status ?? 200,
      headers: { get: () => null },
      json: async () => r.body,
    } as unknown as Response;
  };
  return { fn, calls };
}

function node(id: number, over: Record<string, unknown> = {}) {
  return {
    id,
    name: `A${id}`,
    assertionType: 'PREDICTIVE',
    ampLevel: 'TIER_I_LEVEL_A',
    significance: 'SENSITIVITYRESPONSE',
    molecularProfile: { name: 'EGFR L858R' },
    disease: { name: 'Lung Non-small Cell Carcinoma' },
    therapies: [{ name: 'Osimertinib' }],
    evidenceItems: [
      {
        id: id * 10,
        evidenceLevel: 'A',
        evidenceType: 'PREDICTIVE',
        evidenceDirection: 'Supports Sensitivity',
        significance: 'SENSITIVITYRESPONSE',
        disease: { name: 'Lung Non-small Cell Carcinoma' },
        therapies: [{ name: 'Osimertinib' }],
        molecularProfile: { name: 'EGFR L858R' },
      },
    ],
    ...over,
  };
}

test('tier axis maps every CIViC tier string we have observed', () => {
  assert.equal(tierAxisFromAmpLevel('TIER_I_LEVEL_A'), 'I');
  assert.equal(tierAxisFromAmpLevel('TIER_I_LEVEL_B'), 'I');
  assert.equal(tierAxisFromAmpLevel('TIER_II_LEVEL_C'), 'II');
  assert.equal(tierAxisFromAmpLevel('TIER_II_LEVEL_D'), 'II');
  assert.equal(tierAxisFromAmpLevel('TIER_III'), 'III');
  assert.equal(tierAxisFromAmpLevel('TIER_IV'), 'IV');
  // Casing/whitespace tolerance — the upstream value is an enum, but the read
  // should not depend on it being perfectly cased.
  assert.equal(tierAxisFromAmpLevel(' tier_i_level_a '), 'I');
});

test('tier parsing is by SEGMENT, not prefix — the colliding-prefix bug', () => {
  // 'TIER_III' and 'TIER_IV' both begin with 'TIER_I', and 'TIER_III' also
  // begins with 'TIER_II' (its first 7 characters). Prefix matching therefore
  // maps TIER_III -> II and TIER_IV -> II: a one-tier error over the whole
  // external arm, with no test to catch it. Locked here so it cannot return.
  assert.equal('TIER_III'.startsWith('TIER_II'), true, 'the collision is real');
  assert.equal('TIER_IV'.startsWith('TIER_I'), true);
  assert.equal(tierAxisFromAmpLevel('TIER_III'), 'III', 'TIER_III must not collapse onto II');
  assert.equal(tierAxisFromAmpLevel('TIER_IV'), 'IV', 'TIER_IV must not collapse onto II');
  // Non-tier values are null, and a trailing-level string is not a bare tier.
  assert.equal(tierAxisFromAmpLevel('TIER'), null);
  assert.equal(tierAxisFromAmpLevel('LEVEL_A'), null);
  assert.equal(tierAxisFromAmpLevel('TIER_C_LEVEL_A'), null);
});

test('an unrecognised tier is null, never a guessed tier', () => {
  assert.equal(tierAxisFromAmpLevel(null), null);
  assert.equal(tierAxisFromAmpLevel(undefined), null);
  assert.equal(tierAxisFromAmpLevel(''), null);
  assert.equal(tierAxisFromAmpLevel('TIER_0'), null);
  assert.equal(tierAxisFromAmpLevel('LEVEL_A'), null);
  // The whole point: a new CIViC tier must be unscoreable, not silently I.
  assert.equal(tierAxisFromAmpLevel('TIER_V'), null);
});

test('ONCOGENIC and PREDISPOSING assertions carry no AMP tier and are unscoreable', () => {
  assert.deepEqual([...AMP_TIERED_ASSERTION_TYPES].sort(), ['DIAGNOSTIC', 'PREDICTIVE', 'PROGNOSTIC']);
  // CIViC returns ampLevel: null for these, so the tier axis is null: the case is
  // unscoreable, not tier 0. This is the "absence is not a decision" rule.
  assert.equal(tierAxisFromAmpLevel(null), null);
});

test('pagination walks the cursor: CIViC caps a page at 100', async () => {
  const page1 = Array.from({ length: 100 }, (_, k) => node(k + 1));
  const page2 = Array.from({ length: 36 }, (_, k) => node(101 + k));
  const stub = fakeFetch([
    { body: { data: { assertions: { totalCount: 136, pageInfo: { hasNextPage: true, endCursor: 'CURSOR-1' }, nodes: page1 } } } },
    { body: { data: { assertions: { totalCount: 136, pageInfo: { hasNextPage: false, endCursor: 'CURSOR-2' }, nodes: page2 } } } },
  ]);
  globalThis.fetch = stub.fn as typeof fetch;

  const r = await fetchCivicAssertionTiers({ limit: 500, useCache: false });
  assert.equal(r.available, true);
  assert.equal(r.total, 136);
  assert.equal(r.pages, 2, 'two pages must have been fetched');
  assert.equal(r.assertions.length, 136);
  assert.equal(r.truncated, false);

  // The second request must carry the cursor, which is the only reason the
  // cohort is complete rather than a 100-row sample.
  const secondQuery = String(stub.calls[1]);
  assert.match(secondQuery, /after: "CURSOR-1"/);
  // Nested supporting evidence is fetched in the same round trip.
  assert.match(String(stub.calls[0]), /evidenceItems/);
});

test('a cohort short of the upstream total reports truncated, not complete', async () => {
  const stub = fakeFetch([
    {
      body: {
        data: {
          assertions: {
            totalCount: 316,
            pageInfo: { hasNextPage: true, endCursor: 'CURSOR-LONG' },
            nodes: Array.from({ length: 100 }, (_, k) => node(k + 1)),
          },
        },
      },
    },
  ]);
  globalThis.fetch = stub.fn as typeof fetch;

  const r = await fetchCivicAssertionTiers({ limit: 100, useCache: false });
  assert.equal(r.available, true);
  assert.equal(r.assertions.length, 100);
  assert.equal(r.truncated, true, 'a 100-row slice of 316 must not read as the whole cohort');
  assert.equal(r.total, 316);
});

test('evidence is mapped with level, direction, therapy and disease', async () => {
  const stub = fakeFetch([
    {
      body: {
        data: {
          assertions: {
            totalCount: 1,
            pageInfo: { hasNextPage: false, endCursor: null },
            nodes: [
              node(275, {
                assertionType: 'PREDICTIVE',
                ampLevel: 'TIER_I_LEVEL_A',
                evidenceItems: [
                  {
                    id: 877,
                    evidenceLevel: 'A',
                    evidenceType: 'PREDICTIVE',
                    evidenceDirection: 'Supports Sensitivity',
                    significance: 'SENSITIVITYRESPONSE',
                    disease: { name: 'Lung Non-small Cell Carcinoma' },
                    therapies: [{ name: 'Osimertinib' }, { name: 'Gefitinib' }],
                    molecularProfile: { name: 'EGFR L858R' },
                  },
                ],
              }),
            ],
          },
        },
      },
    },
  ]);
  globalThis.fetch = stub.fn as typeof fetch;

  const r = await fetchCivicAssertionTiers({ useCache: false });
  const a = r.assertions[0];
  assert.equal(a.ampLevel, 'TIER_I_LEVEL_A');
  assert.equal(tierAxisFromAmpLevel(a.ampLevel), 'I');
  assert.equal(a.evidence.length, 1);
  assert.equal(a.evidence[0].level, 'A');
  assert.equal(a.evidence[0].direction, 'Supports Sensitivity');
  assert.equal(a.evidence[0].disease, 'Lung Non-small Cell Carcinoma');
  assert.deepEqual(a.evidence[0].therapies, ['Osimertinib', 'Gefitinib']);
});

test('a dead upstream fails open with a reason and never fabricates tiers', async () => {
  const stub = fakeFetch([{ status: 404, body: {} }]);
  globalThis.fetch = stub.fn as typeof fetch;

  const r = await fetchCivicAssertionTiers({ useCache: false });
  assert.equal(r.available, false);
  assert.equal(r.assertions.length, 0, 'no data may be invented on failure');
  assert.equal(r.truncated, false);
  assert.match(String(r.reason), /404/);
});

test('a GraphQL error payload fails open rather than yielding tiers', async () => {
  const stub = fakeFetch([{ body: { errors: [{ message: 'bad field ampLevel' }] } }]);
  globalThis.fetch = stub.fn as typeof fetch;

  const r = await fetchCivicAssertionTiers({ useCache: false });
  assert.equal(r.available, false);
  assert.equal(r.assertions.length, 0);
  assert.match(String(r.reason), /CIViC GraphQL error/);
});

test('CIViC profile names split into gene + alteration on the FIRST space', () => {
  assert.deepEqual(fromCivicMolecularProfile('EGFR L858R'), { gene: 'EGFR', alteration: 'L858R' });
  assert.deepEqual(fromCivicMolecularProfile('KRAS G12C'), { gene: 'KRAS', alteration: 'G12C' });
  // An alteration containing spaces must keep them — splitting on every space
  // would leave "19 Deletion" as the alteration of a phantom gene "19".
  assert.deepEqual(fromCivicMolecularProfile('EGFR Exon 19 Deletion'), {
    gene: 'EGFR',
    alteration: 'Exon 19 Deletion',
  });
  // A gene-level bucket is a real CIViC profile: keep it, alteration empty.
  assert.deepEqual(fromCivicMolecularProfile('TP53 Mutation'), { gene: 'TP53', alteration: 'Mutation' });
  assert.equal(fromCivicMolecularProfile(''), null);
  assert.equal(fromCivicMolecularProfile('   '), null);
});
