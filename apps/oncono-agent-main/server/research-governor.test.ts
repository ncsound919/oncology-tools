import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyGates,
  deriveInsights,
  planNextBatch,
  reviewRuns,
  THRESHOLDS,
  type RunFinding,
} from './research-governor';

/**
 * Governor integrity verification.
 *
 * The defect this guards: `deriveInsights` and `planNextBatch` took the gated
 * findings and returned hardcoded strings — the same takeaways, the same four
 * waves, whatever the gates had just evaluated. A run that contradicted the
 * printed findings changed nothing in the output. The module whose rule is "a
 * number is not a result until it clears its gates" was asserting its own
 * results without one.
 */

function finding(lane: string, envelope: Record<string, unknown>): RunFinding {
  return {
    lane,
    title: lane,
    datasets: [],
    ok: true,
    interpretation: `interpretation for ${lane}`,
    envelope,
  };
}

/** A lane that clears every blocking gate, so it promotes. */
const CLEAN: RunFinding[] = [
  finding('contamination-audit', { 'fracAbove0.95': 0.11 }),
  finding('canary', { canaryAuc: 0.5 }),
];

test('insights and waves are derived from the gated findings, not fixed strings', () => {
  const clean = reviewRuns(CLEAN);
  const dirty = reviewRuns([finding('cs-binary-outcome', { calibrationSlope: 0.398 })]);

  assert.notDeepEqual(clean.insights, dirty.insights);
  assert.notDeepEqual(clean.nextBatch, dirty.nextBatch);
  assert.match(clean.insights.join('\n'), /contamination-audit is promotable/);
  assert.match(dirty.insights.join('\n'), /cs-binary-outcome is not promotable/);
  assert.deepEqual(clean.nextBatch.map((w) => w.id), ['W-EXTEND']);
  assert.deepEqual(dirty.nextBatch.map((w) => w.id), ['G-BLOCKING']);
});

test('the gated findings actually decide the gates, not just the prose', () => {
  const gated = applyGates(finding('cs-binary-outcome', { calibrationSlope: 0.398 }));
  const blocking = gated.gates.filter((g) => g.blocksPromotion && !g.passed);
  assert.equal(gated.verdict, 'REFUSE');
  assert.deepEqual(blocking.map((g) => g.id), ['CALIBRATION']);
  // The refusal text carries the value that refused it, so the reason is auditable.
  assert.match(gated.takeaway, /calibrationSlope 0\.398/);
});

test('the prior batch is carried as a dated record, never as a live insight', () => {
  const review = reviewRuns(CLEAN);
  const prior = review.insights.some((t) => /35\.7% of query samples/.test(t));
  const replayed = review.insights.some((t) => /SERENA-6 pseudo-KM/.test(t));
  assert.equal(prior, false, 'a hardcoded measurement must not appear as this review\'s output');
  assert.equal(replayed, false);
  assert.equal(review.priorBatch.recordedFrom, 'overnight-2026-10-10');
  assert.ok(review.priorBatch.observations.length > 0, 'the record is kept, not deleted');
});

test('missing metrics gate as failing, so an empty scan cannot read as a clean cohort', () => {
  const empty = applyGates(finding('contamination-audit', {}));
  const leakage = empty.gates.find((g) => g.id === 'LEAKAGE');
  assert.ok(leakage, 'a contamination lane always gets a LEAKAGE gate');
  assert.equal(leakage!.passed, false);
  assert.match(leakage!.detail, /missing/);

  const bare = applyGates(finding('conformal-response', {}));
  assert.equal(bare.gates.find((g) => g.id === 'COVERAGE')!.passed, false);

  const canary = applyGates(finding('bias-canary', {}));
  assert.equal(canary.gates.find((g) => g.id === 'LEAKAGE')!.passed, false);
});

test('a missing metric is reported as missing, not as a value that passed', () => {
  const empty = applyGates(finding('contamination-audit', {}));
  const leakage = empty.gates.find((g) => g.id === 'LEAKAGE')!;
  assert.ok(!/fracAbove0.95 0$/.test(leakage.detail), 'absent must not print as 0');
});

test('a contaminated cohort produces the leakage rule only when the gate failed', () => {
  const contaminated = reviewRuns([finding('contamination-audit', { 'fracAbove0.95': 0.357 })]);
  assert.match(contaminated.insights.join('\n'), /external validation" is a re-measurement/);

  const clean = reviewRuns(CLEAN);
  assert.ok(!clean.insights.some((t) => /re-measurement/.test(t)));
});

test('an empty findings set reports nothing instead of inventing content', () => {
  const review = reviewRuns([]);
  assert.deepEqual(review.nextBatch, []);
  assert.deepEqual(review.promoted, []);
  assert.deepEqual(review.refused, []);
  assert.match(review.insights.join('\n'), /nothing to gate/);
  assert.ok(!review.insights.some((t) => /35\.7%/.test(t)));
});

test('thresholds in the gates are the pre-registered ones', () => {
  assert.equal(THRESHOLDS.calibrationSlopeMin, 0.7);
  assert.equal(THRESHOLDS.contaminationFracAbove95Max, 0.2);
  const gated = applyGates(finding('contamination-audit', { 'fracAbove0.95': 0.21 }));
  assert.equal(gated.gates.find((g) => g.id === 'LEAKAGE')!.passed, false);
  const ok = applyGates(finding('contamination-audit', { 'fracAbove0.95': 0.2 }));
  assert.equal(ok.gates.find((g) => g.id === 'LEAKAGE')!.passed, true);
});
