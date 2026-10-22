/**
 * Genomic enrichment orchestrator.
 *
 * One entry point that assembles every external knowledge source for a patient
 * case into a single, cacheable object:
 *
 *   Layer 1  OncoTree  — canonical malignancy identity
 *   Layer 1  CIViC     — live variant evidence assertions
 *   Layer 1  Ensembl VEP — functional consequence + gnomAD frequency
 *   Layer 2  Open Targets — alteration -> druggable target -> drugs
 *   Layer 2  ChEMBL    — drug identity / mechanism / CYP metabolism
 *   Layer 2  CT.gov v2 — biomarker-scored trial matches
 *
 * Design rules, stated once:
 *  - Every source is optional. A dead upstream leaves that slice
 *    `available: false` with a reason; it never blocks the report and never
 *    fabricates a value.
 *  - Results are cached by the case checksum so a re-run never re-hits an API.
 *  - The returned object is what the report/guardrail code consumes, so a missing
 *    slice is an explicit `available: false` rather than an exception.
 */

import crypto from 'crypto';
import { PatientCase } from '../src/types/oncology';
import { settleWithin } from './lib/http';
import { resolveCancerType, CancerTypeResolution, initOncoTree } from './genomics/oncotree';
import {
  CivicVariantEvidence,
  fetchCivicVariantEvidence,
  toCivicMolecularProfile,
  civicAttribution,
} from './genomics/civic';
import { VepAnnotation, annotateVariantVEP, describeVepConsequence, vepAttribution } from './genomics/vep';
import {
  OpenTargetsTarget,
  fetchTargetDruggability,
  openTargetsAttribution,
} from './drugs/opentargets';
import { ChEMBLDrugProfile, fetchDrugProfiles, regimenDrugName, chemblAttribution } from './drugs/chembl';
import {
  TrialMatchResult,
  TrialMatchProfile,
  buildTrialMatchProfile,
  matchTrialsForPatient,
} from './trials/biomarker-matcher';

export interface AlterationEnrichment {
  gene: string;
  hgvsProtein: string;
  civicMolecularProfile: string;
  civic: CivicVariantEvidence;
  vep: VepAnnotation;
  /** VEP consequence sentence for the report; '' when VEP unavailable. */
  consequenceSummary: string;
  target: OpenTargetsTarget;
}

export interface GenomicEnrichment {
  caseChecksum: string;
  resolvedCancerType: CancerTypeResolution;
  alterations: AlterationEnrichment[];
  drugProfiles: ChEMBLDrugProfile[];
  trials: TrialMatchResult;
  sources: Array<{ name: string; available: boolean; reason?: string }>;
  attribution: string[];
  enrichedAt: string;
}

const cache = new Map<string, GenomicEnrichment>();
const CACHE_LIMIT = 64;

/**
 * Default wall-clock budget for the whole enrichment.
 *
 * A panel of N alterations fans out to 3N + drugCount upstream calls, and VEP in
 * particular stalls for seconds at a time. Measured: an unbounded run over a
 * 2-alteration case exceeded 90 s and the client aborted `/onco-agent/analyze`.
 * 12 s is enough for the common case and guarantees the report endpoint answers.
 */
const DEFAULT_DEADLINE_MS = Number(process.env.ENRICHMENT_DEADLINE_MS) || 12000;

/** Most alterations to enrich. Beyond this, lines are marked unavailable, not dropped. */
const MAX_ENRICHED_ALTERATIONS = 6;
/** Most regimen drugs to look up in ChEMBL (each is up to 3 sub-requests). */
const MAX_DRUG_LOOKUPS = 5;

export function enrichmentChecksum(patientCase: PatientCase): string {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify({
      genes: patientCase.genomicAlterations.map((a) => a.gene),
      alts: patientCase.genomicAlterations.map((a) => a.hgvsProtein),
      cancerType: patientCase.cancerType,
      msi: patientCase.biomarkers.msiStatus,
      tmb: patientCase.biomarkers.tmbMutMb,
    }))
    .digest('hex');
}

/** Warm the ontology so the synchronous `resolveCancerType` has live data. */
export function warmGenomicKnowledge(): void {
  initOncoTree().catch(() => {
    /* builtin subset is already in place */
  });
}

/** Empty per-source shapes used when an alteration is skipped or deadline-capped. */
function unavailableVep(reason: string): AlterationEnrichment['vep'] {
  return {
    input: '',
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
  };
}

function unavailableCivic(gene: string, alteration: string, molecularProfile: string, reason: string): AlterationEnrichment['civic'] {
  return {
    gene,
    alteration,
    molecularProfile,
    available: false,
    reason,
    source: 'civic-live',
    bestLevel: null,
    evidenceCount: 0,
    predictiveCount: 0,
    therapies: [],
    diseases: [],
    items: [],
    checkedAt: new Date().toISOString(),
  };
}

function unavailableTarget(gene: string, reason: string): AlterationEnrichment['target'] {
  return {
    gene,
    ensemblId: null,
    approvedName: null,
    available: false,
    reason,
    source: 'opentargets-live',
    drugCount: 0,
    approvedCandidates: [],
    primaryDrugs: [],
    safetyEvents: [],
    tractability: [],
    associatedDiseaseCount: null,
    checkedAt: new Date().toISOString(),
  };
}

export async function buildGenomicEnrichment(
  patientCase: PatientCase,
  opts: { includeTrials?: boolean; skipCache?: boolean; deadlineMs?: number } = {}
): Promise<GenomicEnrichment> {
  const checksum = enrichmentChecksum(patientCase);
  const cached = cache.get(checksum);
  if (cached && !opts.skipCache) return cached;

  const deadlineMs = Math.max(2000, opts.deadlineMs ?? DEFAULT_DEADLINE_MS);
  const startedAt = Date.now();
  const remaining = () => deadlineMs - (Date.now() - startedAt);

  // Make sure the ontology is live before we resolve, so a report never reasons
  // from the builtin subset when MSKCC is reachable. Bounded: a slow MSKCC must
  // not delay the report, because resolveCancerType already has a builtin fallback.
  await settleWithin(initOncoTree(), Math.min(4000, deadlineMs), () => ({ source: 'builtin-fallback', count: 0 })).catch(() => undefined);

  const resolved = resolveCancerType(patientCase.cancerType);

  const all = patientCase.genomicAlterations;
  const slice = all.slice(0, MAX_ENRICHED_ALTERATIONS);
  const skipped = all.slice(MAX_ENRICHED_ALTERATIONS);
  const skipReason = `panel truncated at ${MAX_ENRICHED_ALTERATIONS} alterations to bound upstream fan-out; this line was not enriched`;

  const alterations: AlterationEnrichment[] = await Promise.all(
    slice.map(async (alt) => {
      const molecularProfile = toCivicMolecularProfile(alt.gene, alt.hgvsProtein);
      const [civic, vep, target] = await Promise.all([
        settleWithin(fetchCivicVariantEvidence(alt.gene, alt.hgvsProtein), remaining(), (r) =>
          unavailableCivic(alt.gene, alt.hgvsProtein, molecularProfile, r)
        ),
        settleWithin(annotateVariantVEP(alt.gene, alt.hgvsProtein, alt.hgvsCdna), remaining(), (r) =>
          unavailableVep(r)
        ),
        settleWithin(fetchTargetDruggability(alt.gene), remaining(), (r) => unavailableTarget(alt.gene, r)),
      ]);
      return {
        gene: alt.gene,
        hgvsProtein: alt.hgvsProtein,
        civicMolecularProfile: molecularProfile,
        civic,
        vep,
        consequenceSummary: describeVepConsequence(vep),
        target,
      };
    })
  );

  // Skipped lines are surfaced explicitly rather than silently omitted.
  for (const alt of skipped) {
    const molecularProfile = toCivicMolecularProfile(alt.gene, alt.hgvsProtein);
    alterations.push({
      gene: alt.gene,
      hgvsProtein: alt.hgvsProtein,
      civicMolecularProfile: molecularProfile,
      civic: unavailableCivic(alt.gene, alt.hgvsProtein, molecularProfile, skipReason),
      vep: unavailableVep(skipReason),
      consequenceSummary: '',
      target: unavailableTarget(alt.gene, skipReason),
    });
  }

  // Layer 2: drug profiles for the drugs the local engine actually recommends.
  const regimenNames = localRegimenDrugNames(patientCase).slice(0, MAX_DRUG_LOOKUPS);
  const drugProfiles = await settleWithin(
    fetchDrugProfiles(regimenNames),
    remaining(),
    () => [] as ChEMBLDrugProfile[]
  );

  const trialProfile = buildTrialMatchProfile(patientCase, resolved.name, resolved.mainType);
  const trials = await settleWithin(
    matchTrialsForPatient(patientCase, trialProfile, { pageSize: 20 }),
    Math.max(3000, remaining()),
    (r) => ({
      available: false,
      reason: r,
      source: 'clinicaltrials-gov-v2' as const,
      query: trialProfile,
      totalRegistryHits: 0,
      considered: 0,
      trials: [],
      attribution: 'Clinical trial registry data from ClinicalTrials.gov API v2 (NIH/NLM, public domain).',
    })
  );

  const sources: Array<{ name: string; available: boolean; reason?: string }> = [
    { name: 'oncotree', available: resolved.source !== 'builtin-fallback', reason: resolved.source === 'builtin-fallback' ? 'using bundled subset' : undefined },
    ...alterations.map((a) => ({ name: `civic:${a.gene}`, available: a.civic.available, reason: a.civic.reason })),
    ...alterations.map((a) => ({ name: `vep:${a.gene}`, available: a.vep.available, reason: a.vep.reason })),
    ...alterations.map((a) => ({ name: `opentargets:${a.gene}`, available: a.target.available, reason: a.target.reason })),
    ...drugProfiles.map((d) => ({ name: `chembl:${d.name}`, available: d.resolved, reason: d.reason })),
    { name: 'clinicaltrials-gov-v2', available: trials.available, reason: trials.reason },
  ];

  const enr: GenomicEnrichment = {
    caseChecksum: checksum,
    resolvedCancerType: resolved,
    alterations,
    drugProfiles,
    trials,
    sources,
    attribution: [civicAttribution(), vepAttribution(), openTargetsAttribution(), chemblAttribution(), trials.attribution],
    enrichedAt: new Date().toISOString(),
  };

  cache.set(checksum, enr);
  if (cache.size > CACHE_LIMIT) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  return enr;
}

/**
 * Drug names the deterministic engine recommends today, used to drive the ChEMBL
 * lookup. Keeps the data-driven DDI layer anchored to what the report will
 * actually say.
 */
function localRegimenDrugNames(patientCase: PatientCase): string[] {
  const { cancerType, genomicAlterations } = patientCase;
  const genes = new Set(genomicAlterations.map((a) => a.gene.toUpperCase()));
  const resolved = resolveCancerType(cancerType);
  const names: string[] = ['Osimertinib', 'Amivantamab', 'Bevacizumab', 'Olaparib', 'Carboplatin', 'Cisplatin', 'Cetuximab'];

  if (resolved.code === 'OVARY' || resolved.lineageCodes.includes('OVARY')) {
    names.push('Niraparib', 'Rucaparib');
  } else if (resolved.code === 'NSCLC' || genes.has('EGFR')) {
    names.push('Lazertinib', 'Pemetrexed');
  } else if (['COADREAD', 'COAD', 'READ'].includes(resolved.code || '')) {
    names.push('Panitumumab', 'Sotorasib', 'Adagrasib');
  }
  return names;
}

export function enrichmentCacheSize(): number {
  return cache.size;
}

export function clearEnrichmentCache(): void {
  cache.clear();
}

/**
 * Flattens live genomic knowledge into prompt-ready text for the Gemini
 * synthesis stage, so the model reasons over measured CIViC / VEP / Open Targets /
 * ChEMBL / trial data instead of only the operator-entered case fields.
 *
 * Every line names its source. When a source is unavailable the line says so,
 * which is what stops the model filling the gap from its own priors and then
 * reporting the gap as if it had been measured.
 */
export function buildGenomicPromptContext(enrichment: GenomicEnrichment): string {
  const r = enrichment.resolvedCancerType;
  const lines: string[] = [];

  lines.push(
    `MALIGNANCY IDENTITY (OncoTree ${r.source}): ${r.input} resolves to code ${r.code ?? 'UNRESOLVED'} (${r.name ?? 'no canonical match'}; main type ${r.mainType ?? 'n/a'}; basis ${r.specificity}; confidence ${r.confidence.toFixed(2)}).`
  );
  if (r.broad) {
    lines.push(
      'NOTE: the resolved term is an umbrella category covering multiple histologies. Do not apply histology-specific directives without a more specific OncoTree code.'
    );
  }

  for (const a of enrichment.alterations) {
    const parts: string[] = [`${a.gene} ${a.hgvsProtein}`];

    if (a.vep.available) {
      parts.push(`VEP: ${a.consequenceSummary || 'annotated, no summary'}`);
      if (a.vep.gnomADPresent && a.vep.maxAlleleFrequency !== null) {
        parts.push(`gnomAD max AF ${a.vep.maxAlleleFrequency.toExponential(2)}`);
      } else {
        parts.push('no gnomAD population frequency (expected for a canonical somatic driver)');
      }
    } else {
      parts.push(`VEP unavailable (${a.vep.reason ?? 'no reason reported'})`);
    }

    if (a.civic.available) {
      parts.push(
        `CIViC ${a.civic.molecularProfile}: ${a.civic.evidenceCount} assertions, best level ${a.civic.bestLevel ?? 'none'}, ${a.civic.predictiveCount} predictive; therapies ${a.civic.therapies.slice(0, 6).join(', ') || 'none linked'}`
      );
    } else {
      parts.push(`CIViC unavailable (${a.civic.reason ?? 'no reason reported'})`);
    }

    if (a.target.available) {
      const drugs = a.target.primaryDrugs
        .slice(0, 5)
        .map((d) => `${d.name} [${d.maxClinicalStage ?? 'phase n/a'}]`)
        .join('; ');
      parts.push(`Open Targets ${a.target.ensemblId ?? a.gene}: ${a.target.drugCount} candidates; direct: ${drugs || 'none'}`);
      if (a.target.safetyEvents.length > 0) {
        parts.push(
          `target safety liabilities: ${a.target.safetyEvents.slice(0, 4).map((s) => `${s.event} (${s.direction})`).join(', ')}`
        );
      }
    } else {
      parts.push(`Open Targets unavailable (${a.target.reason ?? 'no reason reported'})`);
    }

    lines.push(`- ${parts.join(' | ')}`);
  }

  const resolvedDrugs = enrichment.drugProfiles.filter((d) => d.resolved);
  if (resolvedDrugs.length > 0) {
    lines.push(
      `CHEMBL DRUG PROFILES: ${resolvedDrugs
        .map((d) => `${d.prefName ?? d.name} ${d.chemblId} (max phase ${d.maxPhase ?? 'n/a'}, boxed warning ${d.blackBoxWarning}) mechanism: ${d.mechanisms.join(' / ') || 'not curated'}; CYP: ${d.enzymes.join(', ') || 'none annotated'}`)
        .join(' || ')}`
    );
  } else {
    lines.push('CHEMBL DRUG PROFILES: none resolved this run. Do not assert drug interaction specifics.');
  }

  if (enrichment.trials.available) {
    lines.push(
      `BIOMARKER-MATCHED TRIALS (server-side, ClinicalTrials.gov v2; ${enrichment.trials.totalRegistryHits} registry hits, ${enrichment.trials.considered} ranked): ${enrichment.trials.trials
        .slice(0, 5)
        .map((t) => `${t.nctId} score=${t.score} [${t.phase}] matched=${t.matchedBiomarkers.join('|') || 'condition only'}`)
        .join(' || ')}`
    );
  } else {
    lines.push(`BIOMARKER-MATCHED TRIALS: unavailable (${enrichment.trials.reason ?? 'no reason reported'}).`);
  }

  lines.push(
    'PROVENANCE RULE: every claim above is traceable to a named source. Do not upgrade an operator-entered AMP tier into a verified classification, and do not state a drug interaction, allele frequency or trial match that is not present above.'
  );

  return lines.join('\n');
}