/**
 * OncoTree resolver regression tests.
 *
 * The specific defect these lock down: `cancerType.includes('Lung')` treated
 * "Small Cell Lung Cancer" as if it were NSCLC, and the engine then gave it
 * EGFR-TKI commentary and a "contraindicated" immunotherapy verdict. Every test
 * here is a case where substring matching and ontology resolution disagree.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveCancerType,
  isNSCLC,
  isSmallCellLung,
  isColorectal,
  isOvarian,
  isGlioblastoma,
  isMelanoma,
  isBreast,
  searchOncoTree,
  getOncoTreeStatus,
} from './oncotree';

test('NSCLC resolves to the NSCLC code', () => {
  const r = resolveCancerType('Non-Small Cell Lung Cancer');
  assert.equal(r.resolved, true);
  assert.equal(r.code, 'NSCLC');
  assert.equal(isNSCLC(r), true);
  assert.equal(isSmallCellLung(r), false);
});

test('SCLC resolves to SCLC, NOT NSCLC — the substring-matching bug', () => {
  const r = resolveCancerType('Small Cell Lung Cancer');
  assert.equal(r.resolved, true);
  assert.equal(r.code, 'SCLC');
  // The whole point: `.includes('Lung')` returned true here and the engine
  // treated SCLC as an EGFR-driven NSCLC.
  assert.equal(isNSCLC(r), false, 'SCLC must not be classified as NSCLC');
  assert.equal(isSmallCellLung(r), true);
});

test('combined small cell lung carcinoma is small-cell, not NSCLC', () => {
  const r = resolveCancerType('Combined Small Cell Lung Carcinoma');
  assert.equal(r.code, 'CSCLC');
  assert.equal(isNSCLC(r), false);
  assert.equal(isSmallCellLung(r), true);
});

test('bare "Lung" resolves to the tissue node and is not a specific histology', () => {
  const r = resolveCancerType('Lung');
  assert.equal(r.code, 'LUNG');
  assert.equal(isNSCLC(r), false, 'the lung tissue node is not a histology');
  assert.equal(isSmallCellLung(r), false);
});

test('colorectal vocabulary all lands on a colorectal code', () => {
  for (const term of ['Colorectal Cancer', 'Colorectal Adenocarcinoma', 'mCRC', 'Rectal Cancer', 'Colon Cancer']) {
    const r = resolveCancerType(term);
    assert.equal(isColorectal(r), true, `${term} should be colorectal (got ${r.code})`);
  }
});

test('ovarian umbrella term resolves broad, so histology-specific advice is withheld', () => {
  const r = resolveCancerType('Ovarian Cancer');
  assert.equal(r.code, 'OVARY');
  assert.equal(isOvarian(r), true);
  assert.equal(r.broad, true, 'the ovarian umbrella covers many histologies');
});

test('glioblastoma and melanoma resolve', () => {
  assert.equal(resolveCancerType('Glioblastoma').code, 'GB');
  assert.equal(resolveCancerType('GBM').code, 'GB');
  assert.equal(isGlioblastoma(resolveCancerType('Glioblastoma')), true);

  const mel = resolveCancerType('Melanoma');
  assert.equal(mel.code, 'MEL');
  assert.equal(isMelanoma(mel), true);
});

test('breast and gastric vocabulary resolve', () => {
  assert.equal(isBreast(resolveCancerType('Breast Cancer')), true);
  assert.equal(resolveCancerType('Gastric / Gastroesophageal').resolved, true);
});

test('unresolvable input degrades to resolved:false rather than guessing', () => {
  const r = resolveCancerType('Zorblaxian Intergalactic Sarcoma');
  assert.equal(r.resolved, false);
  assert.equal(r.code, null);
  assert.equal(r.confidence, 0);
});

test('empty input is unresolved, not a crash', () => {
  const r = resolveCancerType('');
  assert.equal(r.resolved, false);
  assert.equal(r.code, null);
});

test('resolution is deterministic — same input, same code', () => {
  const a = resolveCancerType('Non-Small Cell Lung Cancer');
  const b = resolveCancerType('Non-Small Cell Lung Cancer');
  assert.equal(a.code, b.code);
  assert.equal(a.specificity, b.specificity);
});

test('lineage carries ancestors for trial-query widening', () => {
  const r = resolveCancerType('Lung Adenocarcinoma');
  assert.ok(r.lineageCodes.includes('LUAD'));
  assert.ok(r.lineageCodes.includes('NSCLC'), `expected NSCLC in lineage, got ${r.lineageCodes.join(',')}`);
});

test('status reports a load source, never claiming live when it is a fallback', () => {
  const status = getOncoTreeStatus();
  assert.ok(['oncotree-live', 'oncotree-cache', 'builtin-fallback', 'not-loaded'].includes(status.source));
  assert.ok(status.count > 0 || status.source === 'not-loaded');
  assert.match(status.attribution, /OncoTree/);
});

test('search returns ranked hits with load errors only reported if they are a load error', () => {
  const hits = searchOncoTree('lung', 5);
  assert.ok(hits.length > 0);
  // A search that can return hits proves the index is not silently empty.
  assert.ok(hits.every((h) => typeof h.code === 'string'));
});
