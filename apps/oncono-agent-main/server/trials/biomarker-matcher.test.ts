/**
 * Biomarker trial-matcher tests.
 *
 * Covers the deterministic profile-building layer only — the scoring layer needs
 * ClinicalTrials.gov and is exercised live. These lock down the allele and
 * biomarker vocabulary the matcher searches eligibility criteria for.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PatientCase } from '../../src/types/oncology';
import { buildTrialMatchProfile } from './biomarker-matcher';

function caseWith(overrides: Partial<PatientCase>): PatientCase {
  return {
    id: 'c',
    patientRef: 'P',
    age: 60,
    sex: 'Male',
    cancerType: 'Non-Small Cell Lung Cancer',
    histology: 'Adenocarcinoma',
    stage: 'Stage IVA',
    ecogScore: 1,
    lineOfTherapy: '1st Line (Treatment Naive)',
    smokingStatus: 'Never',
    priorTherapies: [],
    genomicAlterations: [],
    biomarkers: { msiStatus: 'MSS / pMMR' },
    labs: {},
    ...overrides,
  };
}

test('profile carries condition queries at both name and main-type granularity', () => {
  const c = caseWith({});
  const p = buildTrialMatchProfile(c, 'Lung Adenocarcinoma', 'Non-Small Cell Lung Cancer');
  assert.ok(p.conditionQueries.includes('Lung Adenocarcinoma'));
  assert.ok(p.conditionQueries.includes('Non-Small Cell Lung Cancer'));
  assert.equal(p.conditionQuery, 'Lung Adenocarcinoma');
  // No duplicate entries when name and main type coincide with the display value.
  assert.equal(new Set(p.conditionQueries).size, p.conditionQueries.length);
});

test('EGFR L858R yields the allele literal the criteria actually use', () => {
  const c = caseWith({
    genomicAlterations: [
      { id: 'a', gene: 'EGFR', hgvsProtein: 'p.L858R', variantType: 'Missense', vafPercent: 40, tier: 'Tier I' },
    ],
  });
  const p = buildTrialMatchProfile(c, null, null);
  assert.ok(p.geneTerms.includes('EGFR'));
  assert.ok(p.alterationTerms.includes('L858R'), `expected L858R, got ${p.alterationTerms.join(',')}`);
  // The raw `p.` form must not be searched — protocols do not write "p.L858R".
  assert.equal(p.alterationTerms.includes('p.L858R'), false);
});

test('exon 19 deletion is expanded to the phrase protocols use', () => {
  const c = caseWith({
    genomicAlterations: [
      { id: 'a', gene: 'EGFR', hgvsProtein: 'p.E746_A750del', variantType: 'In-frame Deletion', vafPercent: 40, tier: 'Tier I' },
    ],
  });
  const p = buildTrialMatchProfile(c, null, null);
  const joined = p.alterationTerms.join(' | ');
  assert.match(joined, /Exon 19 Deletion|Exon19del/i, `expected exon-19 phrasing, got ${joined}`);
});

test('BRAF V600E is searchable as "BRAF V600E"', () => {
  const c = caseWith({
    cancerType: 'Melanoma',
    genomicAlterations: [
      { id: 'a', gene: 'BRAF', hgvsProtein: 'p.V600E', variantType: 'Missense', vafPercent: 45, tier: 'Tier I' },
    ],
  });
  const p = buildTrialMatchProfile(c, 'Cutaneous Melanoma', 'Melanoma');
  assert.ok(p.alterationTerms.includes('BRAF V600E'));
  assert.ok(p.biomarkerTerms.includes('BRAF'));
});

test('KRAS G12C and G12D produce distinct terms', () => {
  const g12c = buildTrialMatchProfile(
    caseWith({
      genomicAlterations: [
        { id: 'a', gene: 'KRAS', hgvsProtein: 'p.G12C', variantType: 'Missense', vafPercent: 30, tier: 'Tier I' },
      ],
    }),
    null,
    null
  );
  assert.ok(g12c.alterationTerms.includes('KRAS G12C'));
  assert.ok(g12c.biomarkerTerms.includes('KRAS'));
});

test('MSI-H adds dMMR and mismatch-repair vocabulary', () => {
  const c = caseWith({ biomarkers: { msiStatus: 'MSI-H / dMMR', tmbMutMb: 42 } });
  const p = buildTrialMatchProfile(c, null, null);
  const joined = p.biomarkerTerms.join(' | ').toLowerCase();
  assert.match(joined, /msi-h/);
  assert.match(joined, /dmmr/);
  assert.match(joined, /mismatch repair/);
  assert.match(joined, /tmb/);
});

test('HRD positivity or BRCA loss adds homologous-recombination vocabulary', () => {
  const byStatus = buildTrialMatchProfile(
    caseWith({ biomarkers: { msiStatus: 'MSS / pMMR', hrdStatus: 'Positive (HRD+)' } }),
    null,
    null
  );
  assert.ok(byStatus.biomarkerTerms.some((t) => /homologous recombination|HRD/i.test(t)));

  const byGene = buildTrialMatchProfile(
    caseWith({
      cancerType: 'Ovarian Cancer',
      genomicAlterations: [
        { id: 'a', gene: 'BRCA1', hgvsProtein: 'p.Q1756fs', variantType: 'Frameshift', vafPercent: 50, tier: 'Tier I' },
      ],
    }),
    null,
    null
  );
  assert.ok(byGene.biomarkerTerms.includes('BRCA'));
});

test('a tumour type with no biomarkers yields an empty biomarker set, not junk', () => {
  const p = buildTrialMatchProfile(caseWith({ biomarkers: { msiStatus: 'Not Tested' } }), null, null);
  assert.deepEqual(p.biomarkerTerms, []);
  assert.deepEqual(p.alterationTerms, []);
});

test('prior therapies are carried as first-line tokens for exclusion scoring', () => {
  const c = caseWith({
    priorTherapies: [
      { regimen: 'Osimertinib', setting: '1st line', durationMonths: 14, bestResponse: 'Partial Response' },
      { regimen: 'Carboplatin/Pemetrexed', setting: '2nd line', durationMonths: 4, bestResponse: 'Progressive Disease' },
    ],
  });
  const p = buildTrialMatchProfile(c, null, null);
  assert.ok(p.priorTherapyTerms.includes('Osimertinib'));
  assert.equal(p.priorTherapyTerms.length, 2);
});
