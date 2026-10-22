/**
 * Local engine + guardrail regression tests for the string-matching defects.
 *
 * The two clinical bugs these lock down:
 *  1. SCLC receives NSCLC EGFR-TKI regimens (because `.includes('Lung')`).
 *  2. Guardrail GR-02 (EGFR checkpoint-monotherapy warning) fires for SCLC.
 * Plus the provenance defects: the report asserting a verification it never
 * performed, and a wall-clock timestamp making reports non-comparable.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PatientCase } from '../src/types/oncology';
import { generateLocalOncologyReport, computeReportContentHash, stableStringify } from './local-oncology-engine';
import { evaluateGuardrailTripwires } from './orchestrator';

function baseCase(overrides: Partial<PatientCase>): PatientCase {
  return {
    id: 'case-test',
    patientRef: 'TEST-001',
    age: 62,
    sex: 'Female',
    cancerType: 'Non-Small Cell Lung Cancer',
    histology: 'Adenocarcinoma',
    stage: 'Stage IVA',
    ecogScore: 1,
    lineOfTherapy: '1st Line (Treatment Naive)',
    smokingStatus: 'Never',
    priorTherapies: [],
    genomicAlterations: [
      {
        id: 'alt-1',
        gene: 'EGFR',
        hgvsProtein: 'p.L858R',
        variantType: 'Missense',
        vafPercent: 38.2,
        tier: 'Tier I',
      },
    ],
    biomarkers: { msiStatus: 'MSS / pMMR', tmbMutMb: 3, pdL1TpsPercent: 10 },
    labs: { eGfr: 90, totalBilirubin: 0.8, ast: 25, alt: 30, qtcIntervalMs: 410 },
    ...overrides,
  };
}

const sclcCase = (overrides: Partial<PatientCase> = {}) =>
  baseCase({
    // Deliberately out-of-union. `CancerType` is a closed 10-value set that does
    // not include SCLC, but the API accepts `patientCase` from the request body
    // and validates only that `cancerType` is truthy — so any string can reach
    // the engine. That is precisely how the substring bug was reachable, and the
    // engine must classify this correctly rather than by pattern match.
    cancerType: 'Small Cell Lung Cancer' as PatientCase['cancerType'],
    histology: 'Small cell carcinoma',
    smokingStatus: 'Former',
    ...overrides,
  });

const nsclcEgfrCase = (overrides: Partial<PatientCase> = {}) => baseCase({ ...overrides });

test('SCLC does NOT get an EGFR-TKI regimen — the string-matching bug', () => {
  const report = generateLocalOncologyReport(sclcCase());
  const names = report.recommendedRegimens.map((r) => r.name.toLowerCase()).join(' | ');
  assert.equal(
    /osimertinib|amivantamab|lazertinib/.test(names),
    false,
    `SCLC must not receive EGFR-TKI regimens; got: ${names}`
  );
  // And the summary must say so explicitly.
  assert.match(report.executiveSummary, /small.cell/i);
  assert.match(report.executiveSummary, /not applicable|suppressed/i);
});

test('NSCLC with EGFR still gets osimertinib', () => {
  const report = generateLocalOncologyReport(nsclcEgfrCase());
  const names = report.recommendedRegimens.map((r) => r.name.toLowerCase()).join(' | ');
  assert.match(names, /osimertinib/);
});

test('SCLC immunotherapy is a candidate, not "contraindicated"', () => {
  const report = generateLocalOncologyReport(sclcCase());
  assert.notEqual(report.immunotherapyAssessment.candidacy, 'Low Likelihood of Benefit / Contraindicated');
  assert.match(report.immunotherapyAssessment.biomarkerRationale, /SCLC|small-cell|CASPIAN/i);
});

test('GR-02 checkpoint warning does NOT fire for SCLC', () => {
  const checks = evaluateGuardrailTripwires(sclcCase());
  const gr02 = checks.find((c) => c.id === 'GR-02-EGFR-IO-MONOTHERAPY');
  assert.ok(gr02);
  assert.equal(gr02.triggered, false, 'SCLC must not trip the NSCLC EGFR/IO rule');
  assert.match(gr02.message, /small-cell|SCLC/i);
});

test('GR-02 does fire for NSCLC with EGFR', () => {
  const checks = evaluateGuardrailTripwires(nsclcEgfrCase());
  const gr02 = checks.find((c) => c.id === 'GR-02-EGFR-IO-MONOTHERAPY');
  assert.equal(gr02?.triggered, true);
});

test('GR-01 anti-EGFR contraindication fires for KRAS colorectal only', () => {
  const crc = baseCase({
    cancerType: 'Colorectal Cancer',
    genomicAlterations: [
      { id: 'a', gene: 'KRAS', hgvsProtein: 'p.G12C', variantType: 'Missense', vafPercent: 40, tier: 'Tier I' },
    ],
  });
  const crcChecks = evaluateGuardrailTripwires(crc);
  assert.equal(crcChecks.find((c) => c.id === 'GR-01-RAS-ANTI-EGFR')?.triggered, true);

  // Same KRAS variant in a lung primary must NOT fire the colorectal rule.
  const lung = baseCase({
    genomicAlterations: [
      { id: 'a', gene: 'KRAS', hgvsProtein: 'p.G12C', variantType: 'Missense', vafPercent: 40, tier: 'Tier I' },
    ],
  });
  assert.equal(
    evaluateGuardrailTripwires(lung).find((c) => c.id === 'GR-01-RAS-ANTI-EGFR')?.triggered,
    false
  );
});

test('report does not assert AMP/ASCO/CAP verification it did not perform', () => {
  const report = generateLocalOncologyReport(nsclcEgfrCase());
  const allText = JSON.stringify(report);
  assert.equal(
    /verified under AMP\/ASCO\/CAP/i.test(allText),
    false,
    'the report must not claim independent AMP/ASCO/CAP verification'
  );
});

test('operator-entered tier is labelled as operator-entered', () => {
  const report = generateLocalOncologyReport(nsclcEgfrCase());
  const driver = report.molecularDrivers.find((d) => d.gene === 'EGFR');
  assert.ok(driver);
  assert.match(driver.actionabilityLevel, /operator-entered/i);
});

test('contentHash is stable across runs — reports are comparable', () => {
  const a = generateLocalOncologyReport(nsclcEgfrCase());
  const b = generateLocalOncologyReport(nsclcEgfrCase());
  assert.equal(a.contentHash, b.contentHash, 'identical clinical content must hash identically');
});

test('contentHash changes when clinical content changes', () => {
  const a = generateLocalOncologyReport(nsclcEgfrCase());
  const b = generateLocalOncologyReport(
    nsclcEgfrCase({ biomarkers: { msiStatus: 'MSI-H / dMMR', tmbMutMb: 45 } })
  );
  assert.notEqual(a.contentHash, b.contentHash);
});

test('computeReportContentHash ignores timestamp', () => {
  const h1 = computeReportContentHash({ a: 1, timestamp: '2020-01-01T00:00:00Z' });
  const h2 = computeReportContentHash({ a: 1, timestamp: '2026-01-01T00:00:00Z' });
  // Note: timestamp is included here deliberately to show the helper hashes what it is given;
  // callers exclude it. The report path excludes it (tested above).
  assert.notEqual(h1, h2);
});

test('contentHash is order-independent — key insertion order must not change the hash', () => {
  // The original implementation was a bare JSON.stringify, so {gene, tier} and
  // {tier, gene} hashed differently. The test named "stable across runs" passed
  // without testing this, because the same builder ran twice.
  const a = computeReportContentHash({ gene: 'EGFR', tier: 'I' });
  const b = computeReportContentHash({ tier: 'I', gene: 'EGFR' });
  assert.equal(a, b, 'shallow key order must not change the content hash');

  const c = computeReportContentHash({ nested: { z: 1, a: [{ y: 2, x: 1 }] } });
  const d = computeReportContentHash({ nested: { a: [{ x: 1, y: 2 }], z: 1 } });
  assert.equal(c, d, 'nested and array element key order must not change the content hash');

  assert.notEqual(computeReportContentHash({ a: 1 }), computeReportContentHash({ a: 2 }));
});

test('stableStringify ignores undefined-valued keys but keeps null', () => {
  const withUndef = stableStringify({ a: 1, b: undefined });
  const withoutUndef = stableStringify({ a: 1 });
  assert.equal(withUndef, withoutUndef);
  assert.notEqual(stableStringify({ a: null }), stableStringify({}));
});

test('TP53 does not substitute a different tier or drop the provenance label', () => {
  const c = baseCase({
    genomicAlterations: [
      { id: 'a', gene: 'TP53', hgvsProtein: 'p.R273H', variantType: 'Missense', vafPercent: 55, tier: 'Tier I' },
    ],
  });
  const report = generateLocalOncologyReport(c);
  const driver = report.molecularDrivers.find((d) => d.gene === 'TP53');
  assert.ok(driver);
  // The operator said Tier I. The engine must not rewrite that to "Tier II ...".
  assert.equal(
    /Tier II \(Prognostic/i.test(driver.actionabilityLevel),
    false,
    `TP53 must not overwrite the operator tier; got: ${driver.actionabilityLevel}`
  );
  assert.match(driver.actionabilityLevel, /Operator-entered Tier I/);
  // The prognostic caveat belongs in the consequence, not in the tier field.
  assert.match(driver.functionalConsequence, /prognostic rather than predictively actionable/i);
});

test('no mojibake in clinical output (m² / degree signs must be clean)', () => {
  const report = generateLocalOncologyReport(
    baseCase({ labs: { eGfr: 25, totalBilirubin: 0.8, ast: 25, alt: 30, qtcIntervalMs: 505 } })
  );
  const text = JSON.stringify(report);
  assert.equal(text.includes('\u00C2'), false, 'no Â mojibake sequences');
  assert.equal(text.includes('\u00E2'), false, 'no â mojibake sequences');
});
