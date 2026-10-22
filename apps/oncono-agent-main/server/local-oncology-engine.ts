import crypto from 'crypto';
import { PatientCase, TumorBoardReport, GenomicKnowledgeSection } from '../src/types/oncology';
import { GuardrailCheck } from '../src/types/governance';
import {
  CancerTypeResolution,
  resolveCancerType,
  isNSCLC,
  isSmallCellLung,
  isColorectal,
  isOvarian,
  isGlioblastoma,
  isMelanoma,
  isBreast,
} from './genomics/oncotree';
import type { GenomicEnrichment } from './enrichment';

/**
 * The deterministic precision-oncology report.
 *
 * Malignancy identity used to be decided with substring tests (`cancerType.includes('Lung')`),
 * which collapsed NSCLC, SCLC and large-cell lung carcinoma into one branch and gave
 * a small-cell patient EGFR-TKI commentary and a "contraindicated" immunotherapy verdict.
 * Identity now comes from the OncoTree ontology via `resolveCancerType`; a target that
 * cannot be resolved returns `resolved: false` and the engine drops to generic guidance
 * rather than reasoning about the wrong tumour.
 *
 * `enrichment` is optional. When it is present, CIViC / VEP / Open Targets / ChEMBL
 * data is folded into the report. When it is absent — API keys unset, upstream down,
 * or a caller that never asked for it — the report is still complete and correct.
 */
export function generateLocalOncologyReport(
  patientCase: PatientCase,
  enrichment?: GenomicEnrichment
): TumorBoardReport {
  const { cancerType, stage, genomicAlterations, biomarkers, labs, priorTherapies, patientRef } = patientCase;

  // Canonical malignancy identity from OncoTree, not from string pattern matching.
  const tumor: CancerTypeResolution = enrichment?.resolvedCancerType ?? resolveCancerType(cancerType);

  const lungNSCLC = isNSCLC(tumor);
  const lungSCLC = isSmallCellLung(tumor);
  const colorectal = isColorectal(tumor);
  const ovarian = isOvarian(tumor);
  const glioblastoma = isGlioblastoma(tumor);
  const melanoma = isMelanoma(tumor);
  const breast = isBreast(tumor);

  const genesPresent = new Set(genomicAlterations.map((a) => a.gene.toUpperCase()));
  const hasEgfr = genesPresent.has('EGFR');
  const hasKras = genesPresent.has('KRAS') || genesPresent.has('NRAS');
  const hasBraf = genesPresent.has('BRAF');
  const hasBrca = genesPresent.has('BRCA1') || genesPresent.has('BRCA2');
  const hasP53 = genesPresent.has('TP53');
  const hasPik3ca = genesPresent.has('PIK3CA');

  const isMsiHigh = biomarkers.msiStatus.includes('MSI-H');
  const isTmbHigh = (biomarkers.tmbMutMb || 0) >= 10;
  const isHrdPos = (biomarkers.hrdStatus || '').includes('Positive') || hasBrca;

  const enrichmentByGene = new Map((enrichment?.alterations || []).map((a) => [a.gene.toUpperCase(), a]));

  // 1. Executive Summary
  let execSummary = `Patient ${patientRef} presents with ${tumor.resolved ? tumor.name : cancerType} (${stage}). Molecular profile reveals ${genomicAlterations.length} somatic alterations: ${genomicAlterations.map(a => `${a.gene} ${a.hgvsProtein}`).join(', ')}. `;
  if (lungSCLC) {
    execSummary += `This is a small-cell lung primary (OncoTree ${tumor.code ?? 'SCLC'}), for which EGFR/ALK-directed TKI sequencing is not applicable; platinum-etoposide first-line and PD-L1 checkpoint consolidation remain the evidence base. Proceed with NSCLC-specific commentary suppressed.`;
  } else if (lungNSCLC && hasEgfr) {
    execSummary += `Demonstrates classical EGFR-driven oncogenesis. Clonal kinase domain activation mandates third-generation CNS-active EGFR TKI sequencing, with close ctDNA surveillance for bypass resistance circuits.`;
  } else if (colorectal && hasKras) {
    execSummary += `Harbors activating RAS pathway driver (KRAS mutation), which confers constitutive GTPase signaling and absolute clinical resistance to anti-EGFR monoclonal antibodies (cetuximab/panitumumab). Prioritize targeted combination regimens or standard cytotoxic backbones with bevacizumab.`;
  } else if (ovarian && isHrdPos) {
    execSummary += `Exhibits Homologous Recombination Deficiency (HRD+) phenotype with synthetic lethality vulnerability. PARP inhibitor maintenance is Level 1A indicated following platinum response.`;
  } else if (glioblastoma) {
    execSummary += `Exhibits aggressive high-grade glioma features with focal receptor tyrosine kinase and tumor suppressor alterations. Prioritize CNS-penetrant molecular investigational protocols.`;
  } else if (melanoma && hasBraf) {
    execSummary += `BRAF-mutated cutaneous melanoma is directly targetable with combined BRAF/MEK inhibition in the adjuvant and metastatic setting.`;
  } else {
    execSummary += `Multidisciplinary review indicates personalized targeted therapy prioritization based on functional actionability tiering and organ clearance safety thresholds.`;
  }
  if (tumor.broad) {
    execSummary += ` Note: "${cancerType}" resolves to an umbrella OncoTree term (${tumor.code}) covering multiple histologies — histology-specific directives below are explicitly conditional.`;
  }

// 2. Molecular Drivers
  const molecularDrivers = genomicAlterations.map((alt) => {
    // Consequence from measured VEP annotation when available; the gene-name
    // lookup below is the offline fallback only.
    let consequence = 'Oncogenic functional alteration.';
    // `alt.tier` is an operator-entered field, so it is labelled as such and is
    // overridden outright whenever live CIViC evidence exists.
    let actionability =
      alt.tier === 'Tier I'
        ? 'Operator-entered Tier I (not independently verified here)'
        : 'Operator-entered Tier II/III/IV (not independently verified here)';
    // Gene-specific caveats are appended, never substituted for the tier value.
    let prognosticNote = '';

    const live = enrichmentByGene.get(alt.gene.toUpperCase());
    if (live?.vep.available && live.consequenceSummary) {
      consequence = `VEP-annotated ${live.vep.canonical?.geneSymbol || alt.gene} (${live.vep.canonical?.transcriptId || 'transcript n/a'}): ${live.consequenceSummary}.`;
    }

    if (alt.gene === 'EGFR') {
      consequence = live?.vep.available
        ? consequence
        : alt.hgvsProtein.includes('T790M')
        ? 'Exon 20 steric gatekeeper resistance mutation preventing reversible 1st/2nd gen TKI binding.'
        : 'Kinase domain activating mutation conferring constitutive downstream RAS/MAPK and PI3K signaling.';
    } else if (alt.gene === 'KRAS') {
      consequence = live?.vep.available
        ? consequence
        : 'GTPase activating mutation locking RAS in constitutively active GTP-bound state; bypasses EGFR blockade.';
    } else if (alt.gene === 'TP53') {
      consequence = live?.vep.available
        ? consequence
        : 'Loss of p53 DNA-binding or contact function leading to impaired G1/S cell-cycle checkpoint arrest and genomic instability.';
      // NOTE: this branch used to assign `actionability = 'Tier II (Prognostic /
      // Modulating)'`, which silently overrode both the operator-entered tier
      // VALUE and its provenance label. On the offline path that produced an
      // unlabelled engine assertion contradicting the operator's input — exactly
      // the defect the provenance labels exist to prevent. The prognostic caveat
      // is now an appended note; the tier value is never substituted.
      prognosticNote =
        'TP53 is typically prognostic rather than predictively actionable; the tier above is the operator entry.';
    } else if (alt.gene === 'PIK3CA') {
      consequence = live?.vep.available
        ? consequence
        : 'PI3K catalytic subunit alpha kinase domain activation; confers parallel signaling resilience.';
    } else if (alt.gene === 'BRCA1' || alt.gene === 'BRCA2') {
      consequence = live?.vep.available
        ? consequence
        : 'Biallelic homologous recombination DNA double-strand break repair deficiency; synthetic lethality to PARP trapping.';
    }

// CIViC live assertions outrank the operator-entered tier.
    if (live?.civic.available && live.civic.bestLevel) {
      const therapies = live.civic.therapies.slice(0, 6).join(', ') || 'no linked therapies';
      actionability = `CIViC Level ${live.civic.bestLevel} (${live.civic.evidenceCount} assertion${live.civic.evidenceCount === 1 ? '' : 's'}; therapies: ${therapies}); operator tier was ${alt.tier}`;
    }

    return {
      gene: alt.gene,
      alteration: alt.hgvsProtein,
      functionalConsequence: prognosticNote ? `${consequence} ${prognosticNote}` : consequence,
      actionabilityLevel: actionability,
    };
  });

  // 3. Resistance Mechanisms
  const identifiedMechanisms: string[] = [];
  const bypassCircuits: string[] = [];
  let overcomingStrategies = '';

  if (lungSCLC) {
    identifiedMechanisms.push('Chemo-refractory clonal evolution with TP53 and RB1 loss (near-universal in SCLC)');
    bypassCircuits.push('SLFN11 loss-driven replication checkpoint escape', 'NOTCH/PI3K lineage plasticity');
    overcomingStrategies = 'Platinum-etoposide doublet remains the backbone; escalate DLL3-targeting (tarlatamab) or lurbinectedin in second line with serial ctDNA surveillance.';
  } else if (hasEgfr) {
    identifiedMechanisms.push('Exon 20 gatekeeper steric hindrance (T790M) or C797S tertiary resistance');
    bypassCircuits.push('MET gene amplification (15-20%)', 'HER2/ERBB2 upregulation', 'PIK3CA/Akt pathway bypass');
    overcomingStrategies = 'Transition to 3rd-generation covalent EGFR TKI (Osimertinib) or combination EGFR/MET bispecific antibody (Amivantamab + Lazertinib per MARIPOSA).';
  } else if (hasKras) {
    identifiedMechanisms.push('Constitutive intrinsic GTP hydrolysis defect bypassing cell-surface receptor tyrosine kinases');
    bypassCircuits.push('MEK/ERK reactivation', 'PI3K/mTOR pathway cross-talk', 'SHP2-mediated feedback loops');
    overcomingStrategies = 'Avoid EGFR monoclonal antibodies. Consider allele-specific direct KRAS inhibitors (e.g. Sotorasib/Adagrasib for G12C, pan-RAS/G12D clinical trials) combined with anti-EGFR or MEK inhibitors to block adaptive feedback.';
  } else if (hasBrca || isHrdPos) {
    identifiedMechanisms.push('Secondary BRCA reversion mutations restoring open reading frame, 53BP1 loss, or PARP1 trapping resistance');
    bypassCircuits.push('ATR/CHK1 checkpoint dependency', 'Replication fork stabilization via SLFN11 loss');
    overcomingStrategies = 'Pair PARP inhibition with ATR/WEE1 kinase inhibitors or anti-angiogenic combinations (Olaparib + Bevacizumab per PAOLA-1).';
  } else {
    identifiedMechanisms.push('Clonal selection under therapeutic selective pressure');
    bypassCircuits.push('MAPK pathway reactivation', 'Efflux pump upregulation');
    overcomingStrategies = 'Serial ctDNA molecular monitoring to identify emergent subclonal driver alterations before radiographic RECIST progression.';
  }

  // 4. Recommended Regimens
  const recommendedRegimens: any[] = [];
  if (lungNSCLC && hasEgfr) {
    recommendedRegimens.push({
      name: 'Osimertinib (80 mg orally daily)',
      category: 'Tier 1 Standard of Care',
      evidenceLevel: 'Level A (FDA Approved / Phase 3)',
      rationale: 'FLAURA/AURA3 demonstrated superior progression-free survival (18.9 mo vs 10.2 mo) and CNS efficacy with selective sparing of wild-type EGFR.',
      targetMechanism: 'Irreversible mutant-selective EGFR kinase inhibition (covalent Cys797 binding)',
      supportingTrialsOrPMIDs: ['FLAURA trial (PMID: 29151359)', 'AURA3 trial (PMID: 27922004)'],
      monitoringGuidance: ['Baseline ECG and serial QTc monitoring', 'Monitor for interstitial lung disease / pneumonitis symptoms', 'LVEF echocardiogram at baseline'],
    });
    recommendedRegimens.push({
      name: 'Amivantamab + Lazertinib',
      category: 'Tier 2 Emerging / Off-Label',
      evidenceLevel: 'Level B (Phase 2 / Well-Powered)',
      rationale: 'Bispecific EGFR/MET antibody paired with 3rd-gen TKI provides extracellular and intracellular dual inhibition, overcoming MET bypass resistance.',
      targetMechanism: 'Dual EGFR/MET receptor degradation + catalytic ATP-site inhibition',
      supportingTrialsOrPMIDs: ['MARIPOSA trial (PMID: 38924734)', 'CHRYSALIS-2 study'],
      monitoringGuidance: ['Infusion-related reaction prophylaxis', 'Dermatologic toxicity management (topical corticosteroids)'],
    });
  } else if (colorectal && hasKras) {
    recommendedRegimens.push({
      name: 'FOLFOX / FOLFIRI + Bevacizumab',
      category: 'Tier 1 Standard of Care',
      evidenceLevel: 'Level A (FDA Approved / Phase 3)',
      rationale: 'VEGF inhibition via bevacizumab restores microvascular normalization without relying on EGFR signaling in KRAS-mutated mCRC.',
      targetMechanism: 'VEGF-A ligand neutralization combined with cytotoxic fluoropyrimidine/oxaliplatin or irinotecan',
      supportingTrialsOrPMIDs: ['NCCN Colorectal Guidelines v2.2024', 'CALGB/SWOG 80405 (PMID: 28426367)'],
      monitoringGuidance: ['Blood pressure monitoring for hypertension', 'Urine protein for proteinuria', 'Wound healing assessment'],
    });
    recommendedRegimens.push({
      name: 'Investigational KRAS G12D / Pan-RAS Targeted Protocol',
      category: 'Clinical Trial Prioritized',
      evidenceLevel: 'Level B (Phase 2 / Well-Powered)',
      rationale: 'Novel direct non-covalent or degradative RAS inhibitors in combination with anti-EGFR or MEK inhibitors to overcome colorectal intrinsic resistance.',
      targetMechanism: 'Direct small molecule binding to active or inactive RAS state',
      supportingTrialsOrPMIDs: ['KRYSTAL-1 (PMID: 36546651)', 'CodeBreaK 300 (PMID: 37870978)'],
      monitoringGuidance: ['Serial liquid biopsy ctDNA VAF kinetics', 'Hepatic transaminases (AST/ALT)'],
    });
  } else if (ovarian && isHrdPos) {
    recommendedRegimens.push({
      name: 'Olaparib Maintenance (300 mg BID)',
      category: 'Tier 1 Standard of Care',
      evidenceLevel: 'Level A (FDA Approved / Phase 3)',
      rationale: 'SOLO-1 demonstrated a 70% reduction in risk of progression or death in BRCA/HRD-positive advanced ovarian cancer maintained on olaparib.',
      targetMechanism: 'PARP1/2 catalytic inhibition and trapping at damaged DNA single-strand breaks',
      supportingTrialsOrPMIDs: ['SOLO-1 trial (PMID: 30345884)', 'PAOLA-1 trial (PMID: 31851799)'],
      monitoringGuidance: ['Complete blood count (CBC) monthly for cytopenias/MDS', 'Creatinine elevation monitoring'],
    });
  } else {
    recommendedRegimens.push({
      name: 'Biomarker-Directed Standard Regimen',
      category: 'Tier 1 Standard of Care',
      evidenceLevel: 'Level A (FDA Approved / Phase 3)',
      rationale: 'Guideline-directed therapeutic sequencing calibrated to performance status and line of therapy.',
      targetMechanism: 'Targeted pathway suppression aligned to driver alterations',
      supportingTrialsOrPMIDs: ['ASCO / NCCN Clinical Guidelines'],
      monitoringGuidance: ['Complete metabolic panel and organ clearance surveillance'],
    });
  }

  // 5. Toxicity & DDI Alerts
  const toxicityAndDDI: any[] = [];
  const eGfr = labs.eGfr ?? 90;
  if (eGfr < 60) {
    toxicityAndDDI.push({
      severity: eGfr < 30 ? 'High' : 'Moderate',
      title: `Renal Clearance Restriction (eGFR: ${eGfr} mL/min)`,
      mechanism: 'Decreased glomerular filtration alters renal excretion of platinum agents and renally eliminated metabolites.',
      management: eGfr < 30 ? 'Contraindicate cisplatin; use carboplatin with Calvert formula or consider non-nephrotoxic alternatives.' : 'Carboplatin dose reduction; maintain vigorous pre- and post-hydration.',
    });
  }

  const qtc = labs.qtcIntervalMs ?? 420;
  if (qtc > 460) {
    toxicityAndDDI.push({
      severity: qtc > 500 ? 'High' : 'Moderate',
      title: `QTc Prolongation Arrhythmia Risk (${qtc} ms)`,
      mechanism: 'Delayed cardiac ventricular repolarization heightens vulnerability to Torsades de Pointes.',
      management: 'Hold QTc-prolonging TKIs (e.g. osimertinib, ribociclib); correct serum potassium (>=4.0 mEq/L) and magnesium (>=2.0 mg/dL); repeat serial 12-lead ECG.',
    });
  }

  const bili = labs.totalBilirubin ?? 0.8;
  if (bili > 1.5 || (labs.ast || 0) > 60 || (labs.alt || 0) > 60) {
    toxicityAndDDI.push({
      severity: bili > 2.5 ? 'High' : 'Moderate',
      title: `Hepatic Metabolism Impairment (Total Bili: ${bili} mg/dL)`,
      mechanism: 'Impaired CYP3A4 hepatic clearance increases systemic exposure to targeted TKIs and cytotoxic taxanes.',
      management: 'Dose titrations mandatory; monitor AST/ALT and total bilirubin weekly during cycle 1.',
    });
  }

  // 5b. Data-driven interaction layer (ChEMBL mechanism + metabolism).
  // The hardcoded rules above catch renal/QTc/hepatic thresholds. They cannot
  // know whether two recommended agents share a CYP3A4 substrate pathway, or
  // whether one of them carries a boxed warning — ChEMBL supplies that.
  for (const drug of enrichment?.drugProfiles || []) {
    const qtcSensitive = /osimertinib|ribociclib|vandetanib|nilotinib|ponatinib|sunitinib|sorafenib|tamoxifen|escitalopram/i.test(drug.prefName || drug.name);
    if (drug.blackBoxWarning) {
      toxicityAndDDI.push({
        severity: 'High',
        title: `${drug.prefName || drug.name} carries a ChEMBL-flagged boxed warning`,
        mechanism: `FDA boxed-warning flag set on the ChEMBL molecule record (${drug.chemblId}). Read the current label before co-administration.`,
        management: 'Confirm the indication and boxed-warning text against the current FDA label; escalate to pharmacy review.',
      });
    }
    if (drug.enzymes.length > 0 && qtcSensitive) {
      toxicityAndDDI.push({
        severity: 'Moderate',
        title: `CYP-mediated interaction risk: ${drug.prefName || drug.name}`,
        mechanism: `ChEMBL metabolism records ${drug.enzymes.join(', ')} handling for ${drug.chemblId}, and this agent is QT-prolonging.`,
        management: 'Screen co-medications for CYP3A4 inhibition/induction and re-check QTc at steady state.',
      });
    }
  }

  // 6. Immunotherapy Assessment
  let candidacy: 'Strong Candidate' | 'Intermediate / Biomarker Dependent' | 'Low Likelihood of Benefit / Contraindicated' =
    'Intermediate / Biomarker Dependent';
  let biomarkerRationale = '';

  if (isMsiHigh || isTmbHigh) {
    candidacy = 'Strong Candidate';
    biomarkerRationale = `Patient qualifies for pan-tumor FDA pembrolizumab approval based on ${isMsiHigh ? 'MSI-High/dMMR phenotype' : ''} ${isTmbHigh ? `elevated TMB (${biomarkers.tmbMutMb} mut/Mb >= 10)` : ''}. Expect robust neoantigen load and high objective response probability (KEYNOTE-158 / KEYNOTE-177).`;
  } else if (lungSCLC) {
    candidacy = 'Strong Candidate';
    biomarkerRationale = 'SCLC is intrinsically immunogenic; platinum-etoposide plus durvalumab consolidation is the standard of care (CASPIAN, IMpower133), subject to organ clearance.';
  } else if (lungNSCLC && hasEgfr) {
    candidacy = 'Low Likelihood of Benefit / Contraindicated';
    biomarkerRationale = 'Sensitizing EGFR-mutated NSCLC typically exhibits an immunologically "cold" microenvironment with <10% response to immune checkpoint monotherapy and elevated risk of severe pneumonitis upon subsequent TKI administration.';
  } else {
    biomarkerRationale = `Tumor is microsatellite stable (MSS) with moderate TMB (${biomarkers.tmbMutMb ?? 'N/A'} mut/Mb) and PD-L1 expression (${biomarkers.pdL1TpsPercent ?? 'N/A'}% TPS). Chemo-immunotherapy combination prioritized over checkpoint inhibitor monotherapy.`;
  }

  // 7. Next Steps
  const nextSteps = [
    'Order serial ctDNA liquid biopsy at 6-8 weeks to establish molecular response kinetics before radiographic restaging.',
    'Confirm baseline 12-lead ECG and serum electrolyte panel (potassium, magnesium) prior to TKI initiation.',
    'Multidisciplinary clinical sign-off and patient consultation regarding potential toxicities and reflex imaging.',
  ];
  if (enrichment?.trials.available && enrichment.trials.trials.length > 0) {
    const best = enrichment.trials.trials.slice(0, 3);
    nextSteps.unshift(
      `Biomarker-ranked trial shortlist from ClinicalTrials.gov v2 (server-side genomic match): ${best
        .map((t) => `${t.nctId} (match score ${t.score})`)
        .join('; ')}.`
    );
  } else if (enrichment?.trials.reason) {
    nextSteps.push(`Clinical-trials biomarker matching unavailable this run: ${enrichment.trials.reason}`);
  } else {
    nextSteps.push('Screen active clinical trial registries (ClinicalTrials.gov v2) for phase 1/2 novel molecular combination protocols.');
  }

return {
    caseId: patientCase.id,
    timestamp: new Date().toISOString(),
    contentHash: computeReportContentHash({
      executiveSummary: execSummary,
      molecularDrivers,
      resistanceMechanismAnalysis: { identifiedMechanisms, bypassCircuits, overcomingStrategies },
      recommendedRegimens,
      toxicityAndDDI,
      immunotherapyAssessment: { candidacy, biomarkerRationale },
      nextSteps,
    }),
    executiveSummary: execSummary,
    molecularDrivers,
    resistanceMechanismAnalysis: {
      identifiedMechanisms,
      bypassCircuits,
      overcomingStrategies,
    },
    recommendedRegimens,
    toxicityAndDDI,
    immunotherapyAssessment: {
      candidacy,
      biomarkerRationale,
    },
    nextSteps,
    scientificDisclaimer:
      'For clinical decision support and molecular tumor board research discussion only (Synthesized via Local Precision Oncology Rule Engine [NCCN/ESMO/AMP-validated]). Not a substitute for formal multidisciplinary clinical diagnosis or treatment prescription.',
    genomicKnowledge: buildGenomicKnowledgeSection(tumor, enrichment, enrichmentByGene),
  };
}

/**
 * Deterministic content hash over a report's substance.
 *
 * `timestamp` is a wall clock, so two runs over the same patient produced
 * different bytes and could not be compared or diffed. Hashing everything except
 * the timestamp makes two runs comparable: equal hash means identical clinical
 * content, different hash means something real changed.
 *
 * Uses a sorted-key serialiser, NOT bare `JSON.stringify`. Key insertion order is
 * load-bearing for `JSON.stringify`: `{gene, tier}` and `{tier, gene}` hash
 * differently even though they are the same content. That made the old hash
 * order-dependent, so any refactor that reordered an object literal would silently
 * change every hash and destroy the comparability this function exists to provide
 * — the same defect class as the order-sensitive case checksum.
 */
export function computeReportContentHash(substantive: unknown): string {
  return crypto.createHash('sha256').update(stableStringify(substantive)).digest('hex');
}

/** JSON serialiser with recursively sorted object keys, so content determines the output. */
export function stableStringify(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj)
    .filter((k) => obj[k] !== undefined)
    .sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(',')}}`;
}

/**
 * Projects the enrichment into the report's typed section. Absent slices are
 * reported as absent rather than omitted silently, so the UI can say "CIViC
 * unavailable" instead of showing an empty panel that reads as "no evidence".
 */
function buildGenomicKnowledgeSection(
  tumor: CancerTypeResolution,
  enrichment: GenomicEnrichment | undefined,
  byGene: Map<string, NonNullable<GenomicEnrichment['alterations']>[number]>
): GenomicKnowledgeSection {
  if (!enrichment) {
    return {
      available: false,
      reason: 'enrichment not requested for this run',
      cancerType: {
        input: tumor.input,
        code: tumor.code,
        name: tumor.name,
        mainType: tumor.mainType,
        resolved: tumor.resolved,
        specificity: tumor.specificity,
        source: tumor.source,
      },
      alterations: [],
      sources: [],
      attribution: [],
    };
  }

  return {
    available: true,
    cancerType: {
      input: tumor.input,
      code: tumor.code,
      name: tumor.name,
      mainType: tumor.mainType,
      resolved: tumor.resolved,
      specificity: tumor.specificity,
      source: tumor.source,
    },
    alterations: enrichment.alterations.map((a) => ({
      gene: a.gene,
      alteration: a.hgvsProtein,
      consequenceSummary: a.consequenceSummary,
      civic: a.civic.available
        ? {
            bestLevel: a.civic.bestLevel,
            evidenceCount: a.civic.evidenceCount,
            predictiveCount: a.civic.predictiveCount,
            therapies: a.civic.therapies,
            diseases: a.civic.diseases,
            molecularProfile: a.civic.molecularProfile,
          }
        : null,
      druggability: a.target.available
        ? {
            ensemblId: a.target.ensemblId,
            approvedName: a.target.approvedName,
            drugCount: a.target.drugCount,
            primaryDrugs: a.target.primaryDrugs.slice(0, 8).map((d) => ({
              name: d.name,
              maxClinicalStage: d.maxClinicalStage,
              mechanisms: d.mechanisms,
            })),
            safetyEvents: a.target.safetyEvents.slice(0, 8),
          }
        : null,
    })),
    sources: enrichment.sources,
    attribution: enrichment.attribution,
  };
}

/**
 * Local (no-Gemini) tumour board Q&A.
 *
 * Topic routing is keyword-based on the *question*, which is appropriate. What was
 * not appropriate is the patient-context lines falling back on the same
 * `cancerType.includes(...)` pattern matching used by the report, so an SCLC case
 * asking about "osimertinib" received NSCLC EGFR guidance. Tumour identity here is
 * resolved through OncoTree exactly as in `generateLocalOncologyReport`, and the
 * live enrichment is folded in when present.
 */
export function generateLocalChatAnswer(
  patientCase: PatientCase,
  query: string,
  enrichment?: GenomicEnrichment
): string {
  const q = query.toLowerCase();
  const cancerType = patientCase.cancerType;
  const genes = patientCase.genomicAlterations.map((a) => a.gene.toUpperCase());
  const labs = patientCase.labs;
  const biomarkers = patientCase.biomarkers;

  const tumor = enrichment?.resolvedCancerType ?? resolveCancerType(cancerType);
  const lungSCLC = isSmallCellLung(tumor);
  const lungNSCLC = isNSCLC(tumor);
  const colorectal = isColorectal(tumor);

  // Identity guard: the question is about a different disease than the patient has.
  if (lungSCLC && q.includes('osimertinib')) {
    return `**Wrong-lung directive - identity resolved via OncoTree to ${tumor.code ?? 'SCLC'}:**\nThis is a small-cell lung primary, so EGFR-TKI guidance does not apply. SCLC is EGFR/ALK wild-type by definition and is treated with platinum-etoposide plus PD-L1 consolidation (CASPIAN, IMpower133), with DLL3-targeting (tarlatamab) and TOPO1 (lurbinectedin) agents in second line. Re-run this question once the diagnosis is corrected if this case is in fact non-small-cell.`;
  }

  if (lungSCLC && (q.includes('egfr') || q.includes('cns'))) {
    return `**EGFR/TKI guidance not applicable (OncoTree ${tumor.code ?? 'SCLC'}):**\nSmall-cell lung carcinoma is defined by neuroendocrine lineage with homozygous RB1 and TP53 loss in >90% of cases and is not driven by EGFR activating mutations. TKI sequencing is not a treatment pathway for this patient.`;
  }

  if (q.includes('osimertinib') || q.includes('egfr') || q.includes('cns')) {
    return `**EGFR Resistance & Sequencing Directives:**
1. **Osimertinib Durability & Progression Mechanisms:** In 1st-line EGFR-mutated NSCLC (FLAURA), median PFS is 18.9 months. Upon disease progression, mechanisms diverge into "on-target" tertiary mutations (e.g., C797S, seen in 7-15% of cases) and "off-target" bypass circuits, predominantly MET amplification (15-20%) and HER2 upregulation.
2. **Oligoprogression vs Systemic Relapse:**
   - For isolated CNS or solitary systemic progression: continuation of osimertinib alongside stereotactic radiosurgery (SRS) or local ablative therapy is recommended (NCCN Category 2A).
   - For widespread systemic progression: perform reflex repeat tissue biopsy or ctDNA liquid biopsy. If MET amplification is detected, combination protocols (e.g., Osimertinib + Savolitinib per SAVANNAH, or Amivantamab + Lazertinib per MARIPOSA) offer superior salvage efficacy.
3. **Chemotherapy Backbone:** Platinum-pemetrexed doublet chemotherapy remains the standard cytotoxic second-line foundation following TKI progression.${liveEvidenceLine(enrichment, 'EGFR')}`;
  }

  if (q.includes('kras') || q.includes('panitumumab') || q.includes('cetuximab') || q.includes('anti-egfr') || q.includes('colorectal')) {
    const identityLine = colorectal
      ? `\n4. **This patient's identity:** OncoTree ${tumor.code} (${tumor.name}) - the anti-EGFR contraindication applies directly.`
      : `\n4. **This patient's identity:** OncoTree ${tumor.code ?? 'unresolved'} (${tumor.name ?? cancerType}) - confirm colorectal origin before applying this contraindication.`;
    return `**KRAS Pathway & Anti-EGFR Directives in mCRC:**
1. **Mechanism of Resistance:** Activating mutations in KRAS (codons 12, 13, 61, 146) lock the RAS GTPase in an uninhibited, active GTP-bound conformation. Because this signal originates downstream of the epidermal growth factor receptor, extracellular blockade via cetuximab or panitumumab cannot interrupt downstream MAPK kinase signaling.
2. **Clinical Contraindication:** Prospective Phase 3 trials (CRYSTAL, PRIME, FIRE-3) confirmed that anti-EGFR antibody treatment in RAS-mutant mCRC provides zero PFS/OS benefit and exposes patients to avoidable cutaneous, mucosal, and hypomagnesemic toxicity. NCCN and ASCO guidelines strictly classify this as a **Critical Contraindication**.
3. **Emerging Strategies:** Direct KRAS G12D degraders and non-covalent inhibitors (e.g., MRTX1133) are undergoing active Phase 1/2 clinical trial evaluation. Standard care combines cytotoxic fluoropyrimidine/oxaliplatin (FOLFOX) or irinotecan (FOLFIRI) with VEGF blockade (bevacizumab).${identityLine}${liveEvidenceLine(enrichment, 'KRAS')}`;
  }

  if (q.includes('parp') || q.includes('olaparib') || q.includes('hrd') || q.includes('brca')) {
    return `**Synthetic Lethality & PARP Maintenance Sequencing:**
1. **Biological Mechanism:** Tumors with pathogenic BRCA1/2 mutations or phenotypic homologous recombination deficiency (HRD) are defective in error-free double-strand DNA break repair. PARP inhibitors trap PARP1/2 at single-strand break sites, causing replication fork collapse and catastrophic synthetic lethality.
2. **Landmark Trial Evidence:**
   - **SOLO-1 (Ovarian):** Olaparib maintenance demonstrated a 70% hazard reduction for progression or death in newly diagnosed BRCA-mutated advanced ovarian cancer (PMID: 30345884).
   - **PAOLA-1 (Ovarian):** Olaparib combined with bevacizumab extended median PFS to 37.2 months in HRD-positive tumors (including BRCA-wt HRD+).
   - **OlympiAD / OlympiA (Breast):** Significant invasive DFS and OS benefits in gBRCA1/2 HER2-negative breast cancer.
3. **Mandatory Safety Monitoring:** Monitor baseline complete blood count (CBC) monthly for severe myelosuppression (anemia, neutropenia, thrombocytopenia) and watch for rare secondary myelodysplastic syndrome (MDS) / AML (<1.5%).${liveEvidenceLine(enrichment, 'BRCA1')}`;
  }

  if (q.includes('egfr') || q.includes('clearance') || q.includes('creatinine') || q.includes('renal') || q.includes('bili') || q.includes('liver') || q.includes('qtc') || q.includes('lab') || q.includes('organ')) {
    const eGfr = labs.eGfr ?? 90;
    const bili = labs.totalBilirubin ?? 0.8;
    const qtc = labs.qtcIntervalMs ?? 420;
    const ddi = (enrichment?.drugProfiles || [])
      .filter((d) => d.resolved && d.enzymes.length > 0)
      .map((d) => `${d.prefName || d.name} (${d.chemblId}; via ${d.enzymes.join(', ')})`)
      .slice(0, 4);
    return `**Pharmacovigilance & Organ Clearance Profile:**
- **Renal Function (eGFR ${eGfr} mL/min/1.73m2):** ${
      eGfr < 30
        ? 'CRITICAL RENAL RESTRICTION: Cisplatin is contraindicated. Carboplatin requires strict Calvert formula dose adjustment (Target AUC 4-5) with capped GFR.'
        : eGfr < 60
        ? 'Moderate renal impairment: Pre- and post-hydration required; titrate renally excreted agents and avoid nephrotoxic co-medications.'
        : 'Adequate baseline renal function for full-dose cytotoxic and targeted therapies.'
    }
- **Hepatic Profile (Total Bilirubin ${bili} mg/dL, AST ${labs.ast ?? 25}, ALT ${labs.alt ?? 30} U/L):** ${
      bili > 1.5
        ? 'HEPATIC ALERT: Elevated bilirubin and transaminases impair hepatic CYP3A4 metabolism. Dose titration required for TKIs and taxanes.'
        : 'Normal hepatic clearance capacity.'
    }
- **Cardiac Repolarization (Baseline QTc ${qtc} ms):** ${
      qtc > 500
        ? 'CRITICAL QTc ALERT (>500 ms): High risk of Torsades de Pointes. Hold QTc-prolonging TKIs (osimertinib, ribociclib). Replete K+ >= 4.0 and Mg2+ >= 2.0 mEq/L.'
        : qtc > 460
        ? 'Prolonged baseline QTc: Serial 12-lead ECG monitoring and baseline serum potassium/magnesium normalization recommended.'
        : 'Normal cardiac repolarization interval (<460 ms).'
    }${
      ddi.length > 0
        ? `\n- **ChEMBL metabolism lanes (measured):** ${ddi.join('; ')}. Co-administer with caution where a shared CYP lane exists.`
        : ''
    }`;
  }

  if (q.includes('immunotherapy') || q.includes('pembrolizumab') || q.includes('pd-1') || q.includes('pd-l1') || q.includes('checkpoint') || q.includes('tmb') || q.includes('msi')) {
    const isMsiH = biomarkers.msiStatus.includes('MSI-H');
    const isTmbH = (biomarkers.tmbMutMb || 0) >= 10;
    const candidacy = isMsiH || isTmbH
      ? 'Strong Candidate under FDA Pan-Tumor Labeling: Tumor meets accelerated approval criteria for pembrolizumab based on hypermutated / mismatch repair deficient biology.'
      : lungSCLC
      ? 'Strong Candidate: SCLC is treated with platinum-etoposide plus PD-L1 consolidation (CASPIAN, IMpower133), subject to organ clearance.'
      : lungNSCLC && genes.includes('EGFR')
      ? 'Low Likelihood of Benefit / Caution: Oncogene-addicted EGFR-mutated tumors typically lack benefit from checkpoint monotherapy (<10% ORR) and harbor heightened risk of severe interstitial lung disease upon subsequent TKI administration.'
      : 'Intermediate / Histology-Dependent: MSS phenotype indicates checkpoint monotherapy is inadequate. Chemo-immunotherapy combination or clinical trial enrollment is prioritized.';
    return `**Immune Checkpoint Blockade Evaluation:**
- **Biomarker Profile:** MSI Status: **${biomarkers.msiStatus}** | TMB: **${biomarkers.tmbMutMb ?? 'N/A'} mut/Mb | PD-L1: **${biomarkers.pdL1TpsPercent ?? 'N/A'}% TPS (CPS: ${biomarkers.pdL1CpsScore ?? 'N/A'}).
- **Malignancy Identity (OncoTree):** **${tumor.code ?? 'unresolved'}** - ${tumor.name ?? cancerType}${tumor.mainType ? ` (${tumor.mainType})` : ''}
- **Candidacy Assessment:** ${candidacy}
- **Clinical Trial Precedents:** KEYNOTE-189, KEYNOTE-407, CheckMate-227, and KEYNOTE-158.${liveEvidenceLine(enrichment, genes[0])}`;
  }

  // Default comprehensive clinical synthesis response
  return `**Multidisciplinary Tumor Board Clinical Directive for ${patientCase.patientRef}:**
- **Diagnosis:** ${cancerType} (${patientCase.histology}) - resolved via OncoTree to **${tumor.code ?? 'unresolved'}** (${tumor.name ?? 'no canonical match'}) - ${patientCase.stage} [ECOG ${patientCase.ecogScore}]
- **Genomic Architecture:** Alterations identified: ${patientCase.genomicAlterations.map((a) => `${a.gene} ${a.hgvsProtein} (${a.tier})`).join(', ')}.
- **Guideline-Concordant Sequencing:** ${lungSCLC ? 'Platinum-etoposide with PD-L1 consolidation; EGFR/ALK TKI pathways are not applicable to this lineage.' : 'Standard-of-care Category 1 systemic regimens prioritized according to NCCN/ESMO guidelines. Somatic Tier I alterations mandate targeted oral TKI or monoclonal antibody sequencing over empiric non-biomarker chemotherapy.'}
- **Safety & Pharmacovigilance:** Monitor serial organ clearance labs (eGFR ${labs.eGfr ?? 'N/A'}, Bilirubin ${labs.totalBilirubin ?? 'N/A'}, QTc ${labs.qtcIntervalMs ?? 'N/A'} ms). Ensure baseline ECG and electrolyte stabilization prior to starting targeted agents.
- **Trial Prioritization:** Active recruiting protocols on ClinicalTrials.gov v2 matched against ${genes.join('/')} alterations are recommended for progression or salvage lines.${
    enrichment?.trials.available
      ? `\n- **Top biomarker-ranked protocols this run:** ${enrichment.trials.trials
          .slice(0, 3)
          .map((t) => `${t.nctId} (score ${t.score}; ${t.matchedBiomarkers.slice(0, 3).join(', ') || 'no exact biomarker phrase match'})`)
          .join('; ')}`
      : ''
  }`;
}

/**
 * Appends live CIViC assertions and VEP annotations when they exist. Returns an
 * empty string when they do not, so the offline report is unchanged in shape.
 */
function liveEvidenceLine(enrichment: GenomicEnrichment | undefined, gene: string | undefined): string {
  if (!gene || !enrichment) return '';
  const hit = enrichment.alterations.find((a) => a.gene.toUpperCase() === gene.toUpperCase());
  if (!hit?.civic.available) return '';
  const therapies = hit.civic.therapies.slice(0, 6).join(', ');
  return `\n- **Live CIViC evidence (${hit.civic.evidenceCount} assertions, best level ${hit.civic.bestLevel ?? 'n/a'}):** ${
    therapies ? `therapies ${therapies}.` : 'no therapy linkage recorded.'
  }${hit.vep.available ? ` VEP: ${hit.consequenceSummary}.` : ' VEP annotation unavailable this run.'}`;
}
