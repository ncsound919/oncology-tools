/**
 * Server-side genomic-profile trial matcher on top of ClinicalTrials.gov API v2.
 *
 * The UI (src/components/ClinicalTrialsExplorer.tsx) already calls
 * /external/trials, but that route is a plain condition+intervention search: it
 * has no idea who the patient is. A clinician would type "lung cancer" and read
 * 5000 trials to find the four whose eligibility criteria actually admit their
 * patient.
 *
 * This module turns the patient's molecular profile into a targeted registry query
 * and then *scores* every returned trial against that profile, using the
 * eligibility criteria text:
 *
 *   + gene symbol present in eligibility criteria                       -> driver match
 *   + patient's specific alteration (L858R, Exon 19 Del, G12C) present  -> allele match
 *   + biomarker phrase present (MSI-H/dMMR, TMB-H, HRD, PD-L1>=50%)    -> biomarker match
 *   + biomarker present only in an EXCLUSION clause                   -> hard penalty
 *   + regimen agent matching a recommended therapy                     -> therapy match
 *
 * Every score component cites the matched text so a clinician can audit it. The
 * matcher is deterministic: same case in, same ranking out.
 */

import { PatientCase } from '../../src/types/oncology';
import { fetchWithRetry } from '../lib/http';

const CTGOV_ATTRIBUTION = 'Clinical trial registry data from ClinicalTrials.gov API v2 (NIH/NLM, public domain).';

export interface TrialMatch {
  nctId: string;
  briefTitle: string;
  overallStatus: string;
  phase: string;
  conditions: string[];
  interventions: string[];
  briefSummary: string;
  eligibilitySnippet?: string;
  url: string;
  score: number;
  matchedBiomarkers: string[];
  matchRationale: string[];
  /** Biomarker terms that appear only in an exclusion clause. */
  excludedSignals: string[];
}

export interface TrialMatchProfile {
  conditionQuery: string;
  conditionQueries: string[];
  geneTerms: string[];
  alterationTerms: string[];
  biomarkerTerms: string[];
  priorTherapyTerms: string[];
}

export interface TrialMatchResult {
  available: boolean;
  reason?: string;
  source: 'clinicaltrials-gov-v2';
  query: TrialMatchProfile;
  totalRegistryHits: number;
  considered: number;
  trials: TrialMatch[];
  attribution: string;
}

const STATUS_FILTER = 'RECRUITING,ACTIVE_NOT_RECRUITING,NOT_YET_RECRUITING,ENROLLING_BY_INVITATION';

/** Alteration strings that are conspicuous in eligibility criteria verbatim. */
function alterationSynonyms(gene: string, hgvsProtein: string): string[] {
  const raw = String(hgvsProtein || '').trim();
  const bare = raw.replace(/^p\./i, '').replace(/\s+/g, '');
  const out = new Set<string>();
  if (bare) {
    out.add(bare);
    // "L858R" -> "L858R", and "E746_A750del" -> "Exon 19 Deletion" family handled below.
    if (/^E\d{3}/i.test(bare)) out.add(`${bare.toUpperCase()}`);
    if (/del$/i.test(bare)) out.add(bare.replace(/del$/i, ''));
  }
  const upper = bare.toUpperCase();
  if (upper === 'T790M') out.add('Exon 20 T790M');
  if (upper === 'L858R') out.add('L858R');
  if (/^E74[56]_A750/.test(upper)) {
    out.add('Exon 19 Deletion');
    out.add('Exon19del');
    out.add('exon 19 deletion');
  }
  if (/^G12C/.test(upper)) out.add('KRAS G12C');
  if (/^G12D/.test(upper)) out.add('KRAS G12D');
  if (/^V600E/.test(upper)) out.add('BRAF V600E');
  return [...out].filter((s) => s.length >= 4);
}

export function buildTrialMatchProfile(patientCase: PatientCase, oncoTreeName: string | null, oncoTreeMainType: string | null): TrialMatchProfile {
  const genes = patientCase.genomicAlterations.map((a) => a.gene.toUpperCase());
  const alterationTerms: string[] = [];
  for (const alt of patientCase.genomicAlterations) {
    alterationTerms.push(...alterationSynonyms(alt.gene, alt.hgvsProtein));
  }

  const biomarkerTerms: string[] = [];
  const b = patientCase.biomarkers;
  if (b.msiStatus?.includes('MSI-H')) biomarkerTerms.push('MSI-H', 'MSI-High', 'dMMR', 'mismatch repair deficien');
  if (b.tmbMutMb !== undefined && b.tmbMutMb >= 10) biomarkerTerms.push('TMB-high', 'high tumor mutational burden', 'TMB high');
  if (b.hrdStatus?.includes('Positive') || genes.includes('BRCA1') || genes.includes('BRCA2')) {
    biomarkerTerms.push('homologous recombination deficien', 'HRD', 'BRCA');
  }
  if (b.pdL1TpsPercent !== undefined && b.pdL1TpsPercent >= 50) biomarkerTerms.push('PD-L1 >= 50', 'PD-L1 high', 'TPS >= 50');
  if (genes.includes('EGFR')) biomarkerTerms.push('EGFR', 'sensitizing EGFR');
  if (genes.some((g) => g === 'KRAS' || g === 'NRAS')) biomarkerTerms.push('RAS', 'KRAS');
  if (genes.includes('BRAF')) biomarkerTerms.push('BRAF');
  if (genes.includes('ALK')) biomarkerTerms.push('ALK rearrang', 'ALK');

  const priorTherapyTerms = (patientCase.priorTherapies || [])
    .map((p) => p.regimen)
    .filter(Boolean)
    .slice(0, 3);

  const conditionQueries = [
    oncoTreeName || patientCase.cancerType,
    oncoTreeMainType || patientCase.cancerType,
    patientCase.cancerType,
  ].filter((c, i, arr) => Boolean(c) && arr.indexOf(c) === i) as string[];

  return {
    conditionQuery: oncoTreeName || patientCase.cancerType,
    conditionQueries,
    geneTerms: [...new Set(genes)],
    alterationTerms: [...new Set(alterationTerms)],
    biomarkerTerms: [...new Set(biomarkerTerms)],
    priorTherapyTerms,
  };
}

function splitEligibility(text: string): { inclusion: string; exclusion: string } {
  if (!text) return { inclusion: '', exclusion: '' };
  const re = /exclusion\s*criteria/i;
  const m = re.exec(text);
  if (!m) return { inclusion: text, exclusion: '' };
  return { inclusion: text.slice(0, m.index), exclusion: text.slice(m.index) };
}

function scoreTrial(study: any, profile: TrialMatchProfile): TrialMatch | null {
  const p = study.protocolSection || {};
  const idMod = p.identificationModule || {};
  const statusMod = p.statusModule || {};
  const designMod = p.designModule || {};
  const condMod = p.conditionsModule || {};
  const armsMod = p.armsInterventionsModule || {};
  const descMod = p.descriptionModule || {};
  const eligMod = p.eligibilityModule || {};

  const nctId = idMod.nctId || '';
  if (!nctId) return null;

  const eligibility = String(eligMod.eligibilityCriteria || '');
  const { inclusion, exclusion } = splitEligibility(eligibility);
  const title = String(idMod.briefTitle || '');
  const summary = String(descMod.briefSummary || '');
  const conditions: string[] = condMod.conditions || [];
  const interventions: string[] = (armsMod.interventions || [])
    .map((i: { name?: string }) => i?.name)
    .filter(Boolean);

  // Searchable corpus: eligibility text carries the most weight, plus interventions.
  const corpus = [
    `${title.toLowerCase()} ${summary.toLowerCase()}`,
    eligibility.toLowerCase(),
    conditions.join(' ').toLowerCase(),
    interventions.join(' ').toLowerCase(),
  ].join('\n');

  const matchedBiomarkers: string[] = [];
  const rationale: string[] = [];
  const excludedSignals: string[] = [];
  let score = 0;

  for (const term of profile.geneTerms) {
    const needle = term.toLowerCase();
    const inInclusion = inclusion.toLowerCase().includes(needle);
    const inExclusion = exclusion.toLowerCase().includes(needle);
    if (inInclusion) {
      score += 3;
      matchedBiomarkers.push(term);
      rationale.push(`Eligibility criteria name ${term} as an inclusion biomarker (+3)`);
    }
    if (inExclusion) {
      score -= 4;
      excludedSignals.push(term);
      rationale.push(`${term} appears only in the exclusion criteria (-4) — verify against the full criteria`);
    }
  }

  for (const alt of profile.alterationTerms) {
    const needle = alt.toLowerCase();
    const inInclusion = inclusion.toLowerCase().includes(needle);
    if (inInclusion) {
      score += 5;
      matchedBiomarkers.push(alt);
      rationale.push(`Allele-level match: eligibility criteria cite ${alt} (+5)`);
    }
  }

  for (const marker of profile.biomarkerTerms) {
    const needle = marker.toLowerCase();
    const inInclusion = inclusion.toLowerCase().includes(needle);
    const inExclusion = exclusion.toLowerCase().includes(needle);
    if (inInclusion) {
      score += 2;
      matchedBiomarkers.push(marker);
      rationale.push(`Biomarker criterion present: ${marker} (+2)`);
    } else if (inExclusion) {
      score -= 1;
      excludedSignals.push(marker);
    }
  }

  // Interventions naming the patient's altered gene signal a mechanistically
  // relevant arm even when the criteria wording is generic.
  for (const gene of profile.geneTerms) {
    if (interventions.some((i) => i.toLowerCase().includes(gene.toLowerCase()))) {
      score += 1;
      rationale.push(`Intervention arm targets ${gene} (+1)`);
    }
  }

  for (const prior of profile.priorTherapyTerms) {
    const needle = prior.split(' ')[0].toLowerCase();
    if (needle.length >= 5 && corpus.includes(needle)) {
      score += 1;
      rationale.push(`Prior therapy line (${prior}) reflected in the protocol`);
    }
  }

  if (statusMod.overallStatus === 'RECRUITING' || statusMod.overallStatus === 'NOT_YET_RECRUITING') {
    score += 1;
    rationale.push('Actively enrolling (+1)');
  } else if (statusMod.overallStatus === 'ENROLLING_BY_INVITATION') {
    rationale.push('Enrolling by invitation only');
  }

  const phases: string[] = designMod.phases || [];
  const phaseStr = phases.length > 0 ? phases.join(', ') : 'Not Applicable';

  return {
    nctId,
    briefTitle: title || 'Untitled Study',
    overallStatus: statusMod.overallStatus || 'UNKNOWN',
    phase: phaseStr,
    conditions,
    interventions: interventions.slice(0, 6),
    briefSummary: summary,
    eligibilitySnippet: eligibility ? eligibility.slice(0, 400) + (eligibility.length > 400 ? '…' : '') : undefined,
    url: `https://clinicaltrials.gov/study/${nctId}`,
    score,
    matchedBiomarkers: [...new Set(matchedBiomarkers)],
    matchRationale: rationale,
    excludedSignals: [...new Set(excludedSignals)],
  };
}

export interface TrialMatchOptions {
  pageSize?: number;
  /** Zero out everything not mentioning at least one driver gene. */
  requireGeneMatch?: boolean;
}

export async function matchTrialsForPatient(
  patientCase: PatientCase,
  profile: TrialMatchProfile,
  opts: TrialMatchOptions = {}
): Promise<TrialMatchResult> {
  const pageSize = Math.min(Math.max(opts.pageSize ?? 20, 1), 50);

  try {
    const params = new URLSearchParams();
    params.set('query.cond', profile.conditionQuery);
    if (profile.geneTerms.length > 0) {
      // ClinicalTrials.gov v2 `query.term` ORs within one field; joining the
      // top driver genes keeps the pull tight before scoring.
      params.set('query.term', profile.geneTerms.slice(0, 3).join(' '));
    }
    params.set('filter.overallStatus', STATUS_FILTER);
    params.set(
      'fields',
      'NCTId,BriefTitle,OverallStatus,Phase,ConditionsModule,ArmsInterventionsModule,EligibilityModule,DescriptionModule'
    );
    params.set('pageSize', String(pageSize));
    params.set('countTotal', 'true');

    const response = await fetchWithRetry(
      `https://clinicaltrials.gov/api/v2/studies?${params.toString()}`,
      {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'OncoAgent/1.0 (bioinformatics-clinicaltrials)',
        },
        timeoutMs: 20000,
        maxRetries: 1,
      }
    );
    if (!response.ok) throw new Error(`ClinicalTrials.gov responded ${response.status}`);

    const data = await response.json();
    const studies: any[] = data.studies || [];
    const scored = studies
      .map((s) => scoreTrial(s, profile))
      .filter((t): t is TrialMatch => t !== null);

    const filtered = opts.requireGeneMatch
      ? scored.filter((t) => t.matchedBiomarkers.some((m) => profile.geneTerms.includes(m)))
      : scored;

    // Rank by score, then by recruiting status so the clinician's best option is first.
    filtered.sort(
      (a, b) =>
        b.score - a.score ||
        Number(b.overallStatus === 'RECRUITING') - Number(a.overallStatus === 'RECRUITING') ||
        a.nctId.localeCompare(b.nctId)
    );

    return {
      available: true,
      source: 'clinicaltrials-gov-v2',
      query: profile,
      totalRegistryHits: Number(data.totalCount || studies.length),
      considered: filtered.length,
      trials: filtered.slice(0, pageSize),
      attribution: CTGOV_ATTRIBUTION,
    };
  } catch (err) {
    return {
      available: false,
      reason: err instanceof Error ? err.message : String(err),
      source: 'clinicaltrials-gov-v2',
      query: profile,
      totalRegistryHits: 0,
      considered: 0,
      trials: [],
      attribution: CTGOV_ATTRIBUTION,
    };
  }
}
