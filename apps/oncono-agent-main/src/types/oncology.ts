export type CancerType =
  | 'Non-Small Cell Lung Cancer'
  | 'Colorectal Cancer'
  | 'Breast Cancer'
  | 'Ovarian Cancer'
  | 'Melanoma'
  | 'Pancreatic Cancer'
  | 'Prostate Cancer'
  | 'Gastric / Gastroesophageal'
  | 'Glioblastoma'
  | 'Acute Myeloid Leukemia';

export type Stage =
  | 'Stage I'
  | 'Stage II'
  | 'Stage III'
  | 'Stage IIIA'
  | 'Stage IIIB'
  | 'Stage IIIC'
  | 'Stage IVA'
  | 'Stage IVB'
  | 'Recurrent / Metastatic';

export type LineOfTherapy =
  | '1st Line (Treatment Naive)'
  | '2nd Line (Post-Progression)'
  | '3rd Line+'
  | 'Neoadjuvant'
  | 'Adjuvant / Maintenance';

export type SomaticVariantType =
  | 'Missense'
  | 'Frameshift'
  | 'Nonsense'
  | 'In-frame Deletion'
  | 'Splice Site'
  | 'Amplification'
  | 'Deletional Loss'
  | 'Gene Fusion';

export type AMPTier = 'Tier I' | 'Tier II' | 'Tier III' | 'Tier IV';

export interface GenomicAlteration {
  id: string;
  gene: string;
  hgvsProtein: string;
  hgvsCdna?: string;
  variantType: SomaticVariantType;
  vafPercent: number; // Variant Allele Frequency e.g. 35.4%
  readDepth?: number;
  clinVarSignificance?: string;
  clinVarStars?: number;
  /**
   * OPERATOR-ENTERED, not derived. This is set by hand in EditCaseModal or
   * hard-coded in benchmark cases; nothing in the pipeline computes it from
   * evidence. Do not present it as a classification result. When CIViC evidence
   * is available the engine reports the CIViC level instead.
   */
  tier: AMPTier;
  actionabilityNote?: string;
}

export interface PatientCase {
  id: string;
  patientRef: string;
  age: number;
  sex: 'Female' | 'Male';
  cancerType: CancerType;
  histology: string;
  stage: Stage;
  ecogScore: number; // 0, 1, 2, 3, 4
  lineOfTherapy: LineOfTherapy;
  smokingStatus: 'Never' | 'Former' | 'Current';
  priorTherapies: Array<{
    regimen: string;
    setting: string;
    durationMonths: number;
    bestResponse: 'Complete Response' | 'Partial Response' | 'Stable Disease' | 'Progressive Disease';
    notes?: string;
  }>;
  genomicAlterations: GenomicAlteration[];
  biomarkers: {
    msiStatus: 'MSI-H / dMMR' | 'MSS / pMMR' | 'Equivocal' | 'Not Tested';
    tmbMutMb?: number; // Mutations per megabase
    pdL1TpsPercent?: number; // Tumor Proportion Score 0-100%
    pdL1CpsScore?: number; // Combined Positive Score
    hrdStatus?: 'Positive (HRD+)' | 'Negative (HRD-)' | 'Not Tested';
  };
  labs: {
    eGfr?: number; // mL/min/1.73m2
    totalBilirubin?: number; // mg/dL
    ast?: number; // U/L
    alt?: number; // U/L
    platelets?: number; // 10^9/L
    anc?: number; // Absolute Neutrophil Count 10^9/L
    hemoglobin?: number; // g/dL
    qtcIntervalMs?: number; // ms
  };
  clinicalNotes?: string;
}

export interface RegimenRecommendation {
  name: string;
  category: 'Tier 1 Standard of Care' | 'Tier 2 Emerging / Off-Label' | 'Clinical Trial Prioritized';
  evidenceLevel: 'Level A (FDA Approved / Phase 3)' | 'Level B (Phase 2 / Well-Powered)' | 'Level C (Preclinical / Case Series)';
  rationale: string;
  targetMechanism: string;
  supportingTrialsOrPMIDs: string[];
  monitoringGuidance: string[];
}

export interface ToxicityAlert {
  severity: 'High' | 'Moderate' | 'Low';
  title: string;
  mechanism: string;
  management: string;
}

export interface TumorBoardReport {
  timestamp: string;
  /**
   * SHA-256 over the report's substantive content, excluding `timestamp`.
   * `timestamp` is a wall clock, so two runs over the same case produced
   * different bytes and were not comparable. Two reports with the same
   * `contentHash` are byte-identical apart from generation time.
   */
  contentHash: string;
  caseId: string;
  executiveSummary: string;
  molecularDrivers: Array<{
    gene: string;
    alteration: string;
    functionalConsequence: string;
    actionabilityLevel: string;
  }>;
  resistanceMechanismAnalysis: {
    identifiedMechanisms: string[];
    bypassCircuits: string[];
    overcomingStrategies: string;
  };
  recommendedRegimens: RegimenRecommendation[];
  toxicityAndDDI: ToxicityAlert[];
  immunotherapyAssessment: {
    candidacy: 'Strong Candidate' | 'Intermediate / Biomarker Dependent' | 'Low Likelihood of Benefit / Contraindicated';
    biomarkerRationale: string;
  };
  nextSteps: string[];
  scientificDisclaimer: string;
  /**
   * Live genomic knowledge (OncoTree identity, CIViC evidence, VEP consequence,
   * Open Targets druggability). Absent when the caller passes no enrichment.
   */
  genomicKnowledge?: GenomicKnowledgeSection;
}

/** Live variant evidence + functional annotation, one entry per alteration. */
export interface GenomicKnowledgeSection {
  available: boolean;
  reason?: string;
  cancerType: {
    input: string;
    code: string | null;
    name: string | null;
    mainType: string | null;
    resolved: boolean;
    specificity: string;
    source: string;
  } | null;
  alterations: Array<{
    gene: string;
    alteration: string;
    consequenceSummary: string;
    civic: null | {
      bestLevel: string | null;
      evidenceCount: number;
      predictiveCount: number;
      therapies: string[];
      diseases: string[];
      molecularProfile: string;
    };
    druggability: null | {
      ensemblId: string | null;
      approvedName: string | null;
      drugCount: number;
      primaryDrugs: Array<{ name: string; maxClinicalStage: string | null; mechanisms: string[] }>;
      safetyEvents: Array<{ event: string; direction: string; datasource: string }>;
    };
  }>;
  sources: Array<{ name: string; available: boolean; reason?: string }>;
  attribution: string[];
}

export interface ClinVarApiVariant {
  variationId: string;
  title: string;
  gene: string;
  clinicalSignificance: string;
  reviewStatus: string;
  stars: number;
  conditions: string[];
  lastEvaluated?: string;
  accession?: string;
  ncbiUrl: string;
}

export interface ClinicalTrialItem {
  nctId: string;
  briefTitle: string;
  overallStatus: string;
  phase: string;
  conditions: string[];
  interventions: string[];
  briefSummary: string;
  eligibilitySnippet?: string;
  studyType?: string;
  url: string;
}

export interface PubMedArticle {
  pmid: string;
  title: string;
  journal: string;
  pubDate: string;
  authors: string[];
  doi?: string;
  url: string;
}

export interface OncoKBRecord {
  found: boolean;
  gene: string;
  geneType?: string;
  entrezGeneId?: number;
  oncokbAnnotated?: boolean;
  grch37Isoform?: string;
  grch37RefSeq?: string;
  grch38Isoform?: string;
  grch38RefSeq?: string;
  mSKImpact?: boolean;
  mSKHeme?: boolean;
  foundation?: boolean;
  vogelstein?: boolean;
  sangerCGC?: boolean;
  aliases?: string[];
}

export interface LandmarkTrialPublication {
  trial: string;
  publicationType: string;
  title: string;
  firstAuthor: string;
  journal: string;
  year: string;
  pmid: string;
  pmcid?: string;
  doi?: string;
  biomarkersAnalyzed: string;
  keyFinding: string;
}

