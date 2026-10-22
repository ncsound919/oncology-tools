import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  runOssSurvivalAnalysis,
  type SurvivalEngineResult,
} from './survival-engine';
import type { SurvboardCohortSample } from '../src/types/ecosystem';
import { evidenceLabel, isComputed } from '../src/types/telemetry';

/**
 * Workstream A verification.
 *
 * The defect this guards: `runOssSurvivalAnalysis` returned a flat metrics object
 * in which hardcoded constants (hazard ratio 2.45, conformal coverage 0.90,
 * embedding cosine 0.842) and a hardware-derived runtime sat beside genuinely
 * computed statistics, all stamped by one provenance hash — so nothing on the
 * response said which numbers were results.
 */

type Sample = SurvboardCohortSample;

/** The engine reads sampleId/stage/vitalStatus/osDays/keyMutations/tmb only. */
function sample(over: Partial<Sample>): Sample {
  return {
    sampleId: 'S',
    cohort: 'TCGA-TEST',
    primaryDiagnosis: 'Test',
    stage: 'Stage I',
    vitalStatus: 'Dead',
    osDays: 100,
    keyMutations: [{ gene: 'TP53', alteration: 'p.R273H' }],
    tmb: 5,
    msi: 'MSS / pMMR',
    // The engine never reads this; the type requires it.
    patientCaseEquivalent: {} as Sample['patientCaseEquivalent'],
    ...over,
  } as Sample;
}

/**
 * Risk score in the engine is stageWeight*1.2 + mutations*0.45*tmbWeight, with
 * stageWeight 2.5 (IV) / 1.8 (III) / 1.0 and tmbWeight 0.8 above TMB 10.
 * A cohort ordered earliest-death/highest-risk therefore has C-index 1.
 */
const ORDERED_HIGH_TO_LOW = [
  sample({ sampleId: 'A', stage: 'Stage IV', tmb: 20, osDays: 100, keyMutations: [{ gene: 'TP53', alteration: 'x' }, { gene: 'EGFR', alteration: 'y' }] }),
  sample({ sampleId: 'B', stage: 'Stage IIIB', tmb: 15, osDays: 200 }),
  sample({ sampleId: 'C', stage: 'Stage I', tmb: 5, osDays: 300 }),
];

/** Same risks, inverted times — every comparable pair is discordant. */
const ORDERED_LOW_TO_HIGH = [
  sample({ sampleId: 'A2', stage: 'Stage IV', tmb: 20, osDays: 300, keyMutations: [{ gene: 'TP53', alteration: 'x' }, { gene: 'EGFR', alteration: 'y' }] }),
  sample({ sampleId: 'B2', stage: 'Stage IIIB', tmb: 15, osDays: 200 }),
  sample({ sampleId: 'C2', stage: 'Stage I', tmb: 5, osDays: 100 }),
];

/** Every returned metric carries a provenance tier, and a reason unless computed. */
test('every metric field carries a provenance tier', () => {
  const r = runOssSurvivalAnalysis('survival-cox', 'cpu', ORDERED_HIGH_TO_LOW);
  assert.ok(r.metrics.c_index, 'c_index present');
  for (const [key, field] of Object.entries(r.metrics)) {
    assert.ok(field, `${key} present`);
    assert.ok(
      ['measured', 'derived', 'configured', 'synthetic', 'unmeasured'].includes(field.evidence),
      `${key} has a tier, got ${field.evidence}`,
    );
    if (!isComputed(field)) {
      assert.ok(
        typeof field.reason === 'string' && field.reason.length > 0,
        `${key} is ${field.evidence} and must explain itself`,
      );
    }
  }
});

/** The computed statistics are real math, not placeholders. */
test('c-index is genuinely computed: perfect and inverted orderings', () => {
  const perfect = runOssSurvivalAnalysis('survival-cox', 'cpu', ORDERED_HIGH_TO_LOW);
  assert.equal(perfect.metrics.c_index.value, 1);

  const inverted = runOssSurvivalAnalysis('survival-cox', 'cpu', ORDERED_LOW_TO_HIGH);
  assert.equal(inverted.metrics.c_index.value, 0);

  assert.equal(perfect.metrics.total_evaluable_pairs.value, 3);
  assert.equal(perfect.metrics.concordant_pairs.value, 3);
  assert.equal(inverted.metrics.discordant_pairs.value, 3);
});

/** No stored constant may be presented as a measurement. */
test('stored constants are labelled as not measured', () => {
  const r = runOssSurvivalAnalysis('survival-cox', 'cpu', ORDERED_HIGH_TO_LOW);
  assert.equal(r.metrics.hazard_ratio_primary.evidence, 'configured');
  assert.equal(r.metrics.epochs_completed.evidence, 'synthetic');
  assert.equal(r.metrics.wall_clock_seconds.evidence, 'synthetic');
  assert.ok(r.metrics.hazard_ratio_primary.reason?.includes('no Cox'));

  const embed = runOssSurvivalAnalysis('fm-embed', 'cpu', ORDERED_HIGH_TO_LOW);
  assert.equal(embed.metrics.embedding_cosine_similarity!.evidence, 'synthetic');
  assert.equal(embed.metrics.embedding_cosine_similarity!.value, 0.842);

  const conformal = runOssSurvivalAnalysis('conformal-response', 'cpu', ORDERED_HIGH_TO_LOW);
  assert.equal(conformal.metrics.conformal_coverage_guarantee!.evidence, 'configured');
});

/** The result is reproducible, and the provenance hash covers the classification. */
test('deterministic and provenance-stamped', () => {
  const a = runOssSurvivalAnalysis('survival-cox', 'cpu', ORDERED_HIGH_TO_LOW);
  const b = runOssSurvivalAnalysis('survival-cox', 'cpu', ORDERED_HIGH_TO_LOW);
  assert.equal(a.metrics.c_index.value, b.metrics.c_index.value);
  assert.equal(a.details.provenanceHash, b.details.provenanceHash);
  assert.match(a.details.provenanceHash, /^[0-9a-f]{64}$/);
});

/** The algorithm name must not describe a method that did not run. */
test('algorithm names describe what actually ran', () => {
  const dflt = runOssSurvivalAnalysis('anything', 'cpu', ORDERED_HIGH_TO_LOW);
  assert.ok(!/Cox Proportional/i.test(dflt.algorithm), `was: ${dflt.algorithm}`);
  assert.ok(/no model fitted/i.test(dflt.algorithm));

  // Each per-experiment name must state what ran, not imply a method that did not.
  assert.match(
    runOssSurvivalAnalysis('tumor-immune-ensemble', 'cpu', ORDERED_HIGH_TO_LOW).algorithm,
    /TMB-threshold heuristic/i,
  );
  assert.match(
    runOssSurvivalAnalysis('conformal-response', 'cpu', ORDERED_HIGH_TO_LOW).algorithm,
    /no conformal prediction runs/i,
  );
  assert.match(
    runOssSurvivalAnalysis('fm-embed', 'cpu', ORDERED_HIGH_TO_LOW).algorithm,
    /stored reference cosine/i,
  );
});

/** The input provenance is stated, so a fixture is never read as a benchmark. */
test('details state what the metrics were computed over', () => {
  const r: SurvivalEngineResult = runOssSurvivalAnalysis('survival-cox', 'cpu', ORDERED_HIGH_TO_LOW);
  assert.match(r.details.cohortProvenance, /hand-transcribed fixture/);
  assert.ok(r.details.cohortEvaluated.length > 0);
  assert.equal(evidenceLabel(r.metrics.c_index), 'measured');
});
