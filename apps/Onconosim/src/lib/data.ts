// Static domain data for the OncoSIM platform — derived from the four-leg cure
// framework, the five-experiment protocol set, and current asset literature.

export type Tier = 0 | 1 | 2 | 3 | 4 | 5;

export interface TierDef {
  tier: Tier;
  name: string;
  establishes: string;
  notEstablish: string;
}

export const TIER_LADDER: TierDef[] = [
  {
    tier: 0,
    name: "Target engagement",
    establishes:
      "The molecule/intervention hits its intended target in the intended cell type, in vitro.",
    notEstablish: "Whether hitting the target does anything downstream.",
  },
  {
    tier: 1,
    name: "Phenotypic effect, isogenic model",
    establishes:
      "The intended downstream biology happens (degradation, DAMP release, T-cell killing) in a clean model.",
    notEstablish:
      "Whether it happens in a real tumor microenvironment, or whether it is the dominant effect.",
  },
  {
    tier: 2,
    name: "Disease-relevant model",
    establishes:
      "Effect holds in a model with realistic heterogeneity — xenograft, organoid, syngeneic, or ex vivo.",
    notEstablish:
      "Whether it holds at tolerated systemic doses in a full organism, or whether resistance emerges.",
  },
  {
    tier: 3,
    name: "In vivo efficacy at tolerated dose",
    establishes:
      "Measurable clinical-proxy outcome (regression, metastatic burden, survival) at an acceptable TI.",
    notEstablish:
      "Whether it translates to humans, or whether the animal model's biology resembles the human problem.",
  },
  {
    tier: 4,
    name: "Human proof-of-mechanism",
    establishes:
      "Phase 1/2 data showing mechanism engages in patients (PD biomarker, imaging, ctDNA) with tolerable safety.",
    notEstablish:
      "Durable clinical benefit — PK/PD success and clinical success are different claims.",
  },
  {
    tier: 5,
    name: "Clinical benefit, appropriately timed",
    establishes:
      "Randomized or strongly controlled evidence on a timeline long enough for the leg's specific failure mode to surface.",
    notEstablish: "—",
  },
];

export interface Leg {
  id: 1 | 2 | 3 | 4;
  name: string;
  short: string;
  color: string; // hex
  thesis: string;
  tier5: string;
  endpoints: string[];
  killCriteria: string[];
  gaps: string;
}

export const LEGS: Leg[] = [
  {
    id: 1,
    name: "Eradicate bulk disease",
    short: "Debulk",
    color: "#4FD1C0",
    thesis:
      "Measurable reduction in tumor burden (primary + macrometastatic) at a systemically tolerable dose — without requiring the debulking agent to also solve dormancy or re-seeding.",
    tier5:
      "Phase 2/3 response rate or PFS benefit vs. an active comparator (not placebo alone, given most Leg-1 candidates enter in pretreated populations).",
    endpoints: [
      "Tier 0: DC50/Dmax (degraders), IC50/affinity (inhibitors), TE biomarker",
      "Tier 1: cell viability, pathway suppression (pERK, DUSP6) in 1–2 lines",
      "Tier 2: efficacy across an allele panel in xenograft/organoid incl. hypoxia",
      "Tier 3: regression in vivo at acceptable TI across multiple genotypes",
      "Tier 4: Phase-1 PK/PD + preliminary anti-tumor activity, safety",
      "Tier 5: Phase-2/3 response / PFS vs. active comparator",
    ],
    killCriteria: [
      "Fails tier 2 across more than one KRAS allele/genotype",
      "Tier 3 only achievable at a narrow / unfavorable therapeutic index",
      "Hypoxia-stratified data shows ligase choice fails in poorly oxygenated tissue (e.g. pancreatic)",
    ],
    gaps:
      "Most Leg-1 candidates are scored on single-line success — single-line success is not evidence of a platform.",
  },
  {
    id: 2,
    name: "Block re-seeding",
    short: "Anti-seed",
    color: "#E8A94D",
    thesis:
      "Reduction in metastatic recurrence specifically attributable to the perioperative / peri-treatment window, on a follow-up long enough to distinguish 'prevented seeding' from 'delayed seeding.'",
    tier5:
      "Recurrence-free survival benefit at a follow-up matched to the disease's known dormancy/recurrence tail (often 10+ years, not the 3–5 year windows most trials report).",
    endpoints: [
      "Tier 0: TE in relevant myeloid/platelet/coagulation pathway (EP4, catecholamine)",
      "Tier 1: reduced niche-promoting activity in vitro (Mφ polarization, NETs)",
      "Tier 2: reduced pre-metastatic niche in orthotopic / tail-vein, perioperative dosed",
      "Tier 3: reduced distant-organ burden attributable to perioperative window",
      "Tier 4: perioperative-window human trial with seeding biomarker",
      "Tier 5: RFS at follow-up matched to dormancy tail",
    ],
    killCriteria: [
      "Any trial claiming Leg-2 success off a window shorter than the disease's recurrence tail",
      "A perioperative intervention that only has chronic-dosing data (chronic ≠ perioperative)",
    ],
    gaps:
      "No perioperative-timed trial exists for an EP4 antagonist specifically, despite unusually strong mechanism-level rationale.",
  },
  {
    id: 3,
    name: "Anticipate resistance",
    short: "Pre-resist",
    color: "#9E8CF2",
    thesis:
      "A pre-specified resistance-mapped combination or sequencing regimen that measurably delays or prevents the specific resistance mechanism it was designed against — verified against real resistance data, not just predicted computationally.",
    tier5:
      "Randomized comparison showing anticipatory/adaptive strategy outperforms reactive (wait-for-progression-then-switch) standard of care.",
    endpoints: [
      "Tier 0: identify resistance mechanism (genomic/epigenetic/microenvironmental)",
      "Tier 1: in vitro combo prevents/reverses specific resistance in resistant line",
      "Tier 2: same, in a model with heterogeneous/evolving resistance",
      "Tier 3: in vivo delay of resistance emergence (TTP under combo vs. mono)",
      "Tier 4: ctDNA/biomarker-tracked resistance in human trial, closed-loop",
      "Tier 5: randomized anticipatory vs. reactive SOC",
    ],
    killCriteria: [
      "A 'closed-loop' / adaptive claim lacking a pre-specified switching rule (post-hoc narrative ≠ evidence)",
    ],
    gaps:
      "No asset reviewed clears tier 2 on Leg 3 — the least-populated and probably highest-value leg for new experiment proposals.",
  },
  {
    id: 4,
    name: "Immune cleanup of residual / dormant disease",
    short: "Immune",
    color: "#E8664F",
    thesis:
      "Measurable clearance of the dormant disseminated tumor cell population specifically — not just expanded circulating T cells, and not RFS at a timepoint too short to rule out delayed relapse.",
    tier5:
      "RFS at follow-up matched to the cancer's dormancy tail AND a mechanistic (not inferred) readout that dormant-cell burden dropped.",
    endpoints: [
      "Tier 0: MHC-I/II presentation of neoepitope by immunopeptidomics (Experiment 2)",
      "Tier 1: T-cell reactivity vs. presented neoepitope (killing, tetramer)",
      "Tier 2: DAMP release / DC maturation in APC co-culture (Experiment 5)",
      "Tier 3: reduced dormant (not proliferating) DTC burden in vivo",
      "Tier 4: expanded tumor-specific T-cell clones in patients",
      "Tier 5: RFS matched to dormancy tail + mechanistic dormant-cell clearance",
    ],
    killCriteria: [
      "Any durable-cure claim based on T-cell expansion data alone, without a dormancy-specific readout",
      "A neoepitope strategy untested against cathepsin-B-rich conditions",
    ],
    gaps:
      "No experiment yet directly tests dormant-cell-specific clearance (tier 3) — every current Leg-4 asset is scored on proliferating-disease proxies.",
  },
];

export interface Asset {
  code: string;
  name: string;
  sponsor: string;
  modality: string;
  target: string;
  leg: 1 | 2 | 3 | 4;
  tier: Tier;
  status: string;
  summary: string;
}

export const ASSETS: Asset[] = [
  {
    code: "RP04340",
    name: "Pan-KRAS degrader",
    sponsor: "Risen Pharma",
    modality: "PROTAC degrader",
    target: "KRAS (pan-mutant)",
    leg: 1,
    tier: 3,
    status: "Preclinical",
    summary:
      "In vivo tumor growth inhibition across three xenograft models (Miapaca-2, PK-59, NCI-H727) with dose-response and favorable tissue distribution to lung/pancreas. Not yet in humans.",
  },
  {
    code: "PT0511",
    name: "Pan-KRAS degrader (clinical)",
    sponsor: "PAQ Therapeutics",
    modality: "PROTAC degrader",
    target: "KRAS (pan-mutant)",
    leg: 1,
    tier: 4,
    status: "Phase 1",
    summary:
      "First-in-human dosing has occurred; no efficacy or PD readout yet reported. Tier-4 claim is 'in patients, safety monitoring underway' — do not round up to clinically validated.",
  },
  {
    code: "BPI-585771",
    name: "KRAS degrader (preclinical)",
    sponsor: "Betta Pharmaceuticals",
    modality: "PROTAC degrader",
    target: "KRAS",
    leg: 1,
    tier: 1,
    status: "Preclinical",
    summary:
      "Preclinical. ApexOnco clarified Betta's only clinical KRAS asset is the pan-RAS inhibitor BPI-572270, not the degraders — correct the earlier implied momentum.",
  },
  {
    code: "DT-9081",
    name: "EP4 antagonist",
    sponsor: "Kainova",
    modality: "Small-molecule antagonist",
    target: "EP4 (PGE2 receptor)",
    leg: 2,
    tier: 4,
    status: "Phase 2",
    summary:
      "Validates EP4 antagonism as a mechanism (tier-4 PD claim) but dosed in advanced/recurrent/metastatic disease — not run as a perioperative-window trial, so it does not itself test the Leg-2 hypothesis as designed.",
  },
  {
    code: "COMPIT-2",
    name: "Etodolac + propranolol",
    sponsor: "Academic consortium",
    modality: "Perioperative combo (NSAID + β-blocker)",
    target: "PGE2 / catecholamine axis",
    leg: 2,
    tier: 4,
    status: "Phase 2/3",
    summary:
      "Explicitly designed around the perioperative window — the right design for this leg specifically. Tier 3–4 depending on latest readout.",
  },
  {
    code: "70-degrader ligase study",
    name: "CRBN/VHL/DCAF1/KLHDC2 ligase screen",
    sponsor: "Academic",
    modality: "Ligase screen",
    target: "E3 ligases",
    leg: 1,
    tier: 1,
    status: "Published",
    summary:
      "Structured negative result (DCAF1/KLHLC2 failed) that should inform ligase choice before tier-2/3 resources are spent on those ligases for this target.",
  },
  {
    code: "autogene cevumeran",
    name: "Individualized neoantigen vaccine",
    sponsor: "BioNTech / Genevant",
    modality: "mRNA neoantigen vaccine",
    target: "Patient-specific neoantigens",
    leg: 4,
    tier: 4,
    status: "Phase 2",
    summary:
      "6-year pancreatic 'recurrence-free' data is encouraging but is a tier-4-reaching-toward-5 claim — nothing in the data distinguishes 'cleared the dormant reservoir' from 'cleared fast-dividing disease while dormant cells wait on a longer fuse.'",
  },
  {
    code: "mRNA-4157",
    name: "Individualized neoantigen vaccine",
    sponsor: "Moderna / Merck",
    modality: "mRNA neoantigen vaccine",
    target: "Patient-specific neoantigens",
    leg: 4,
    tier: 4,
    status: "Phase 2/3",
    summary:
      "Paired with pembrolizumab in melanoma adjuvant setting. Tier 4: expanded tumor-specific T-cell clones, but no dormancy-specific clearance readout yet.",
  },
  {
    code: "KRAS-PROTAC-neoepitope",
    name: "Hypothetical KRAS-degrader neoepitope presentation",
    sponsor: "Open experiment",
    modality: "Mechanistic (degrader → MHC-I)",
    target: "KRAS G12D/G12C/G12V",
    leg: 4,
    tier: 0,
    status: "Untested",
    summary:
      "Exactly the gap Experiment 2 targets. As of the reviewed literature this remains an open experiment, not a result. Cathepsin B in the TME can independently degrade the G12/G13 neoepitopes before presentation.",
  },
];

export interface Experiment {
  number: number;
  title: string;
  legs: string;
  objective: string;
  hypothesis: string;
  method: string[];
  endpoints: string;
  controls: string;
  positive: string;
  negative: string;
}

export const EXPERIMENTS: Experiment[] = [
  {
    number: 1,
    title: "Structural identity and E3-ligase mapping of pan-KRAS degraders",
    legs: "1",
    objective:
      "Determine which E3 ligase(s) leading pan-KRAS PROTACs recruit, since ligase choice affects tissue expression pattern, ternary complex geometry, and which KRAS mutant alleles are degraded.",
    hypothesis:
      "CRBN- and VHL-recruiting pan-KRAS degraders will show different tissue-specific degradation efficiency (CRBN broadly expressed but variably active; VHL hypoxia-regulated and may underperform in poorly oxygenated tumor cores).",
    method: [
      "Computational: pull public structures/patents for ARV-806, ACBI3, Arvinas pan-KRAS candidate; classify E3 warhead (CRBN / VHL / KEAP1 / DCAF16).",
      "Wet-lab: ternary complex formation assay (AlphaLISA / TR-FRET) across KRAS allele panel (G12C, G12D, G12V, G13D, Q61) in isogenic lines under normoxia vs. 1% O2.",
      "Compare DC50 / Dmax per allele, per O2 condition; derive ternary complex cooperativity coefficient.",
    ],
    endpoints:
      "DC50 and Dmax per allele per O2 condition; ternary complex cooperativity coefficient.",
    controls:
      "Matched pan-RAS(ON) inhibitor (non-degrading) at equivalent target engagement; CRBN-null and VHL-null isogenic lines to confirm ligase dependency.",
    positive:
      "VHL-based degraders underperform specifically in hypoxic culture → predicts reduced activity in poorly vascularized tumor cores / metastatic niches with variable oxygenation.",
    negative:
      "No O2-dependent difference → ligase choice is not hypoxia-stratified for this target; tissue selection can be driven by other factors (expression, cooperativity).",
  },
  {
    number: 2,
    title: "Direct test of degradation-induced neoepitope presentation",
    legs: "1,4",
    objective:
      "Confirm (or refute) that KRAS G12D degradation by PROTAC increases MHC-I presentation of KRAS-derived peptides relative to inhibition, in a KRAS G12D-mutant cell line.",
    hypothesis:
      "Following the BET-family / dTAG precedent (acute pharmacologic degradation increases direct MHC-I presentation, presentation rate tracking degradation rate), KRAS PROTAC treatment will generate a measurably higher density of KRAS-derived MHC-I peptides than an equipotent RAS(ON) inhibitor.",
    method: [
      "Treat matched KRAS G12D+ lines in parallel: (a) KRAS G12D PROTAC, (b) equipotent non-degrading RAS(ON) inhibitor, (c) DMSO.",
      "Immunopurify MHC-I complexes at 6h / 24h / 48h; elute and identify peptides by LC-MS/MS immunopeptidomics.",
      "Quantify KRAS-derived peptide abundance (label-free MS); correlate with bulk KRAS protein degradation kinetics (western blot / degradation ELISA).",
    ],
    endpoints:
      "Fold-change in KRAS-derived MHC-I peptide abundance (degrader vs. inhibitor vs. control); correlation coefficient between degradation rate and presentation rate.",
    controls:
      "Non-KRAS-mutant line (should show no KRAS-derived peptides in any condition); dTAG-degradable GFP reporter line as positive control for the general degradation → presentation phenomenon.",
    positive:
      "Positive correlation is direct mechanistic confirmation of the 'two legs, one drug' hypothesis (debulk + immune-prime via the same molecule).",
    negative:
      "A null result suggests immune activation comes through a different route (e.g. cGAS-STING from proteotoxic stress, not direct antigen presentation) — still useful, different mechanism to design around.",
  },
  {
    number: 3,
    title: "Computational HLA-binding prediction for KRAS mutant-derived peptides",
    legs: "4",
    objective:
      "Predict which KRAS G12D/G12C/G12V-derived peptides are likely to bind common HLA class I alleles, to identify which patients (by HLA type) would plausibly benefit most from the immune-priming effect of a KRAS degrader.",
    hypothesis:
      "A meaningful fraction of the most common HLA-A/B/C alleles will bind at least one mutant KRAS-derived 8–11mer with sub-500nM predicted affinity, but binding will be allele-specific enough that HLA typing should be a stratification variable in degrader trials.",
    method: [
      "Generate all 8–11mer peptides spanning the KRAS mutation hotspot (codons 12 / 13 / 61) for each common mutant allele.",
      "Run validated HLA-binding prediction (NetMHCpan-class) against the ~20 most common HLA-A/B/C alleles by population frequency.",
      "Cross-reference high-affinity predicted binders against published KRAS neoantigen TCR reactivity data.",
    ],
    endpoints:
      "List of predicted strong-binder peptide-HLA pairs; population coverage estimate (% of patients with at least one qualifying HLA-peptide pair).",
    controls:
      "Wild-type KRAS peptides spanning the same region, as a negative comparator (self peptides, may still bind HLA without being immunogenic).",
    positive:
      "High population coverage with allele stratification → HLA typing becomes a patient-selection biomarker for degrader-plus-vaccine or degrader-plus-checkpoint trials.",
    negative:
      "Low predicted coverage → patient selection needs a different biomarker (e.g. baseline TCR repertoire, TME myeloid composition).",
  },
  {
    number: 4,
    title: "Integrin-targeted nanoparticle delivery of a PROTAC payload",
    legs: "2",
    objective:
      "Test whether an integrin-displaying nanoparticle (lung α6β4/α6β1 or liver αvβ5 'zip code') can improve organ-specific delivery of a KRAS PROTAC payload compared to untargeted systemic dosing — directly addressing PROTACs' known poor oral bioavailability / permeability.",
    hypothesis:
      "Surface-functionalized nanoparticles with the organ-matched integrin ligand will show higher payload accumulation and target-protein degradation in the matched organ's tumor tissue, with reduced off-target accumulation, relative to an untargeted LNP carrying the same PROTAC.",
    method: [
      "Formulate PROTAC-loaded lipid / polymeric nanoparticles with surface-conjugated integrin ligands (α6β4/α6β1 for lung; αvβ5 / cyclic RGD for liver).",
      "Dose in an orthotopic or tail-vein metastasis model with organ-specific tropism (e.g. lung-tropic breast cancer line).",
      "Measure biodistribution (fluorescent / radiolabeled tracking) at 2h / 24h / 72h; target-protein degradation by organ via western blot; tumor burden by organ at endpoint.",
      "Test a dual-targeted particle (integrin + anti-TFRC) against single-ligand and untargeted particles.",
    ],
    endpoints:
      "Organ-specific accumulation ratio (target vs. clearance organs); degree of target protein degradation per organ at matched systemic dose; whether dual-targeting beats single-ligand targeting.",
    controls:
      "Untargeted nanoparticle (same PROTAC payload, no integrin ligand); free (unencapsulated) PROTAC at the same dose — the baseline the targeted formulation needs to beat.",
    positive:
      "Dual-targeting outperforms single-ligand → direct evidence for the 'combined address system'; allows lower systemic PROTAC doses (reducing off-target liability) while maintaining on-target potency.",
    negative:
      "Dual-targeting ≈ single-ligand → integrin tissue-code alone is sufficient; the TFRC/FABP4 co-address layer adds complexity without benefit at this payload size.",
  },
  {
    number: 5,
    title: "KRAS degrader/inhibitor combined with an ADC to test immunogenic cell death synergy",
    legs: "1,4",
    objective:
      "Test whether combining a KRAS-targeted agent (degrader or inhibitor) with a cell-surface-targeted ADC (anti-TROP2 or anti-CEACAM5) produces more immunogenic cell death (ICD) than either agent alone.",
    hypothesis:
      "ADC payload-driven cytotoxicity will release more DAMPs (calreticulin surface, HMGB1 release, ATP secretion) when combined with KRAS pathway disruption than with either agent alone — simultaneous oncogene disruption and cytotoxic payload delivery compounds cellular stress.",
    method: [
      "Treat KRAS-mutant, ADC-target-positive lines with: (a) KRAS degrader alone, (b) KRAS inhibitor alone, (c) ADC alone, (d) degrader+ADC, (e) inhibitor+ADC.",
      "Quantify ICD markers: surface calreticulin (flow), extracellular HMGB1 (ELISA), extracellular ATP (luciferase) at 24h / 48h.",
      "Co-culture treated tumor cells with HLA-matched dendritic cells; measure DC maturation (CD80 / CD86 / CD83 upregulation) as a functional APC readout.",
    ],
    endpoints:
      "Fold-change in each DAMP marker per condition vs. control; DC maturation marker upregulation per condition.",
    controls:
      "Non-immunogenic cytotoxic control (DNA-damaging agent known not to induce strong ICD) to calibrate 'low ICD'; ADC with non-binding isotype to confirm ADC contribution is target-dependent.",
    positive:
      "Synergistic (not merely additive) ICD induction + DC maturation → direct support for sequencing a KRAS degrader alongside an ADC as 'in situ vaccination' ahead of, or alongside, a checkpoint inhibitor or neoantigen vaccine.",
    negative:
      "Additive but not synergistic → combination is tolerable but not mechanistically compounding; value is dose-sparing rather than immuno-priming.",
  },
];

// Mock genomic-variant observations (sequencing-style)
export interface Variant {
  gene: string;
  hgvs: string; // c.35G>A
  protein: string; // p.G12D
  alleleFreq: number; // 0..1
  cohort: string; // PDAC / NSCLC / CRC
  hlaBinding: number | null; // predicted nM, null = not computed
  tier: Tier; // the framework tier this variant's evidence sits at
}

export const VARIANTS: Variant[] = [
  { gene: "KRAS", hgvs: "c.35G>A", protein: "p.G12D", alleleFreq: 0.42, cohort: "PDAC", hlaBinding: 124, tier: 4 },
  { gene: "KRAS", hgvs: "c.34G>T", protein: "p.G12C", alleleFreq: 0.14, cohort: "NSCLC", hlaBinding: 86, tier: 4 },
  { gene: "KRAS", hgvs: "c.35G>T", protein: "p.G12V", alleleFreq: 0.27, cohort: "PDAC", hlaBinding: 312, tier: 3 },
  { gene: "KRAS", hgvs: "c.38G>A", protein: "p.G13D", alleleFreq: 0.18, cohort: "CRC", hlaBinding: 540, tier: 2 },
  { gene: "KRAS", hgvs: "c.183A>T", protein: "p.Q61H", alleleFreq: 0.09, cohort: "PDAC", hlaBinding: 720, tier: 1 },
  { gene: "TP53", hgvs: "c.524G>A", protein: "p.R175H", alleleFreq: 0.61, cohort: "PDAC", hlaBinding: 48, tier: 3 },
  { gene: "TP53", hgvs: "c.747G>T", protein: "p.R249S", alleleFreq: 0.22, cohort: "HCC", hlaBinding: 92, tier: 2 },
  { gene: "EGFR", hgvs: "c.2573T>G", protein: "p.L858R", alleleFreq: 0.34, cohort: "NSCLC", hlaBinding: 156, tier: 4 },
  { gene: "EGFR", hgvs: "c.2237_2255del", protein: "p.E746_A750del", alleleFreq: 0.41, cohort: "NSCLC", hlaBinding: 210, tier: 4 },
  { gene: "BRAF", hgvs: "c.1799T>A", protein: "p.V600E", alleleFreq: 0.38, cohort: "MEL", hlaBinding: 67, tier: 4 },
  { gene: "PIK3CA", hgvs: "c.1633G>A", protein: "p.E545K", alleleFreq: 0.26, cohort: "BRCA", hlaBinding: 380, tier: 2 },
  { gene: "STK11", hgvs: "c.406C>T", protein: "p.Q136*", alleleFreq: 0.19, cohort: "NSCLC", hlaBinding: null, tier: 1 },
];

// HLA alleles most common in the general population (for Experiment 3 demo)
export interface HlaAllele {
  allele: string;
  freq: number; // population frequency
  bestBinder: string | null; // KRAS peptide that binds it best
  bestAffinity: number | null; // nM
}

export const HLA_ALLELES: HlaAllele[] = [
  { allele: "HLA-A*02:01", freq: 0.27, bestBinder: "G12C 8mer", bestAffinity: 86 },
  { allele: "HLA-A*11:01", freq: 0.13, bestBinder: "G12D 9mer", bestAffinity: 124 },
  { allele: "HLA-A*24:02", freq: 0.11, bestBinder: "G12V 10mer", bestAffinity: 312 },
  { allele: "HLA-A*03:01", freq: 0.10, bestBinder: "Q61H 9mer", bestAffinity: 720 },
  { allele: "HLA-B*07:02", freq: 0.09, bestBinder: "G13D 11mer", bestAffinity: 540 },
  { allele: "HLA-B*44:02", freq: 0.08, bestBinder: "G12D 9mer", bestAffinity: 210 },
  { allele: "HLA-C*07:01", freq: 0.10, bestBinder: "G12C 8mer", bestAffinity: 156 },
  { allele: "HLA-C*04:01", freq: 0.07, bestBinder: "G12V 10mer", bestAffinity: 280 },
];

// Cross-leg combination scoring examples
export interface CombinationScore {
  asset: string;
  legs: { leg: 1 | 2 | 3 | 4; tier: Tier; note: string }[];
  verdict: string;
}

export const COMBINATIONS: CombinationScore[] = [
  {
    asset: "KRAS degrader — debulk + immune-prime",
    legs: [
      { leg: 1, tier: 4, note: "PT0511 first-in-human dosing; no efficacy readout yet" },
      { leg: 4, tier: 0, note: "Experiment 2 untested; neoepitope presentation not yet demonstrated" },
    ],
    verdict:
      "The 'two legs, one drug' framing is a hypothesis about a combination score, not yet an achieved combination score. Report tiers separately.",
  },
  {
    asset: "EP4 antagonist — perioperative + checkpoint-priming",
    legs: [
      { leg: 2, tier: 2, note: "Mechanistically plausible per PGE2/EP4 finding; no perioperative-timed trial exists yet" },
      { leg: 4, tier: 4, note: "DT-9081 mechanism validated — but in the wrong trial design for Leg 2" },
    ],
    verdict:
      "DT-9081 = strong Leg-4 mechanism support that has not yet been run as a Leg-2 experiment. The 'no current trial tests this directly' line is itself the tier-2→3 gap to design against.",
  },
];

export const FRAMEWORK_STATS = [
  { label: "Cure-framework legs", value: 4, suffix: "" },
  { label: "Evidence tiers per leg", value: 6, suffix: "" },
  { label: "Tracked assets", value: 9, suffix: "" },
  { label: "Resistance mechanisms mapped", value: 8, suffix: "" },
];

// ─────────────────────────────────────────────────────────────────────────────
// Resistance Atlas — Leg 3 is the least-populated leg (no asset clears tier 2).
// This data models the known resistance mechanisms that assets either overcome
// (✓), are vulnerable to (✕), or have unknown status against (?).
// ─────────────────────────────────────────────────────────────────────────────
export interface ResistanceMechanism {
  id: string;
  name: string;
  category: "Genomic" | "Epigenetic" | "Microenvironmental";
  description: string;
  evidenceTier: Tier; // tier at which this mechanism is *demonstrated* in patients
}

export interface ResistanceStatus {
  assetCode: string;
  mechanismId: string;
  status: "overcomes" | "vulnerable" | "unknown";
  note: string;
}

export const RESISTANCE_MECHANISMS: ResistanceMechanism[] = [
  {
    id: "kras-amplification",
    name: "KRAS locus amplification",
    category: "Genomic",
    description: "Copy-number gain of the mutant KRAS allele under selective pressure, restoring pathway flux above the inhibitor's IC50.",
    evidenceTier: 3,
  },
  {
    id: "switch-allele",
    name: "Second-site KRAS mutation",
    category: "Genomic",
    description: "Emergence of a new KRAS mutation (e.g. Y96D, H95Q) that sterically blocks covalent inhibitor binding or reshapes the degrader ternary complex.",
    evidenceTier: 4,
  },
  {
    id: "rtk-reactivation",
    name: "RTK bypass reactivation",
    category: "Genomic",
    description: "Upregulation of EGFR / HER2 / FGFR / MET reactivates downstream MAPK and PI3K signaling downstream of the inhibited node.",
    evidenceTier: 4,
  },
  {
    id: "epigenetic-emt",
    name: "EMT / chromatin remodeling",
    category: "Epigenetic",
    description: "Epithelial-to-mesenchymal transition with SWI/SNF-mediated chromatin remodeling reduces drug sensitivity and increases antigen masking.",
    evidenceTier: 3,
  },
  {
    id: "myeloid-shield",
    name: "Myeloid TME shielding",
    category: "Microenvironmental",
    description: "Tumor-associated macrophages and MDSCs secrete IL-6 / TGFβ that suppress T-cell infiltration, blunting the immune-priming effect of a degrader.",
    evidenceTier: 2,
  },
  {
    id: "cathepsin-b",
    name: "Cathepsin B neoepitope destruction",
    category: "Microenvironmental",
    description: "Cathepsin B in the tumor microenvironment independently degrades the G12/G13 neoepitopes before MHC-I presentation — a Leg-4-specific resistance mechanism.",
    evidenceTier: 2,
  },
  {
    id: "mhc-loss",
    name: "MHC-I heterozygosity loss",
    category: "Genomic",
    description: "LOH at the HLA locus (~17% of tumors) collapses presenting repertoire; presentation-based priming has little effect regardless of degradation rate.",
    evidenceTier: 4,
  },
  {
    id: "hypoxia-vhl",
    name: "Hypoxia-driven VHL failure",
    category: "Microenvironmental",
    description: "VHL-recruiting degraders underperform in poorly oxygenated tumor cores — directly relevant to bulky hypoxic pancreatic disease.",
    evidenceTier: 2,
  },
];

export const RESISTANCE_STATUSES: ResistanceStatus[] = [
  // RP04340 (pan-KRAS degrader, Leg 1, Tier 3)
  { assetCode: "RP04340", mechanismId: "kras-amplification", status: "vulnerable", note: "Amplification restores target protein faster than the degrader can clear it." },
  { assetCode: "RP04340", mechanismId: "switch-allele", status: "overcomes", note: "Pan-allele degrader design tolerates most second-site mutations." },
  { assetCode: "RP04340", mechanismId: "rtk-reactivation", status: "vulnerable", note: "Bypass restores downstream signaling even with KRAS degraded." },
  { assetCode: "RP04340", mechanismId: "hypoxia-vhl", status: "unknown", note: "Ligase identity not yet disclosed; if VHL-based, hypoxic cores are a risk." },
  // PT0511 (pan-KRAS degrader, Leg 1, Tier 4)
  { assetCode: "PT0511", mechanismId: "kras-amplification", status: "vulnerable", note: "Same class risk; no clinical resistance data yet." },
  { assetCode: "PT0511", mechanismId: "switch-allele", status: "overcomes", note: "Pan-mutant design in principle; untested in patients." },
  { assetCode: "PT0511", mechanismId: "rtk-reactivation", status: "vulnerable", note: "Anticipated class effect; no adaptive switch trial yet." },
  { assetCode: "PT0511", mechanismId: "mhc-loss", status: "vulnerable", note: "If Leg-4 priming is claimed, ~17% HLA-LOH patients won't benefit." },
  // DT-9081 (EP4 antagonist, Leg 2/4, Tier 4)
  { assetCode: "DT-9081", mechanismId: "myeloid-shield", status: "overcomes", note: "EP4 blockade reprograms M2→M1 macrophage polarization — directly counters the shield." },
  { assetCode: "DT-9081", mechanismId: "rtk-reactivation", status: "unknown", note: "Independent mechanism; not tested in combo." },
  // autogene cevumeran (neoantigen vaccine, Leg 4, Tier 4)
  { assetCode: "autogene cevumeran", mechanismId: "mhc-loss", status: "vulnerable", note: "HLA restriction is per-allele; LOH narrows the presented repertoire." },
  { assetCode: "autogene cevumeran", mechanismId: "cathepsin-b", status: "vulnerable", note: "For KRAS-derived neoepitopes specifically — TME cathepsin B can destroy them pre-presentation." },
  { assetCode: "autogene cevumeran", mechanismId: "epigenetic-emt", status: "unknown", note: "EMT-driven antigen masking not measured in the pancreatic readout." },
  // mRNA-4157 (neoantigen vaccine, Leg 4, Tier 4)
  { assetCode: "mRNA-4157", mechanismId: "mhc-loss", status: "vulnerable", note: "Same HLA-restriction risk as autogene." },
  { assetCode: "mRNA-4157", mechanismId: "myeloid-shield", status: "unknown", note: "Combo with pembrolizumab may partially counter the shield; not stratified." },
  // COMPIT-2 (perioperative combo, Leg 2, Tier 4)
  { assetCode: "COMPIT-2", mechanismId: "myeloid-shield", status: "overcomes", note: "NSAID + β-blocker directly targets perioperative myeloid mobilization." },
  { assetCode: "COMPIT-2", mechanismId: "rtk-reactivation", status: "unknown", note: "Not a Leg-1 mechanism; combo not designed to counter it." },
];

// ─────────────────────────────────────────────────────────────────────────────
// Pipeline Progression — where each asset sits on its leg's tier ladder,
// plus the next-tier gap (what's needed to climb one rung).
// ─────────────────────────────────────────────────────────────────────────────
export interface PipelineStep {
  assetCode: string;
  leg: 1 | 2 | 3 | 4;
  currentTier: Tier;
  targetTier: Tier; // the next rung being pursued
  nextGap: string; // what's needed to climb
  eta: string; // rough timeline label
}

export const PIPELINE_STEPS: PipelineStep[] = [
  { assetCode: "RP04340", leg: 1, currentTier: 3, targetTier: 4, nextGap: "Phase-1 entry; PK/PD + preliminary anti-tumor activity signal", eta: "IND-enabling" },
  { assetCode: "PT0511", leg: 1, currentTier: 4, targetTier: 5, nextGap: "Phase-2 response-rate / PFS vs. active comparator", eta: "Phase 2 ongoing" },
  { assetCode: "BPI-585771", leg: 1, currentTier: 1, targetTier: 2, nextGap: "Allele-panel xenograft incl. hypoxia condition", eta: "Preclinical" },
  { assetCode: "70-degrader ligase study", leg: 1, currentTier: 1, targetTier: 2, nextGap: "Move validated ligases into allele-panel xenograft", eta: "Structural" },
  { assetCode: "DT-9081", leg: 2, currentTier: 4, targetTier: 5, nextGap: "Perioperative-window trial with seeding biomarker; 10+ yr follow-up", eta: "Needs redesign" },
  { assetCode: "COMPIT-2", leg: 2, currentTier: 4, targetTier: 5, nextGap: "RFS at follow-up matched to dormancy tail", eta: "Follow-up" },
  { assetCode: "autogene cevumeran", leg: 4, currentTier: 4, targetTier: 5, nextGap: "Mechanistic dormant-cell clearance readout, not just RFS", eta: "Long follow-up" },
  { assetCode: "mRNA-4157", leg: 4, currentTier: 4, targetTier: 5, nextGap: "Dormant-DTC-specific burden readout in adjuvant trial", eta: "Phase 2/3" },
  { assetCode: "KRAS-PROTAC-neoepitope", leg: 4, currentTier: 0, targetTier: 1, nextGap: "Experiment 2: immunopeptidomics on degrader-treated KRAS-mutant line", eta: "Open experiment" },
];

// Leg-3 gap (the underserved leg) — explicitly highlighted in the UI
export const LEG3_GAP = {
  title: "Leg 3 is the least-populated leg",
  body: "No asset reviewed clears tier 2 on Leg 3 (resistance anticipation). Every other leg has at least one tier-4 asset; Leg 3's highest is tier 1 (in vitro). This is the highest-value place to generate new experiment proposals if the goal is filling gaps rather than validating what already exists.",
  candidates: [
    "ctDNA-tracked adaptive KRAS-degrader ↔ RAS(ON)-inhibitor switching rule (pre-specified, not post-hoc)",
    "Anticipatory RTK-bypass combo: degrader + EGFR/HER2 inhibitor, started at first ctDNA signal not at progression",
    "Closed-loop organoid platform: serial passage under drug pressure with weekly variant calling to map resistance emergence",
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// Leg-3 dedicated experiment proposals — full protocols designed to fill the
// gap that no current asset clears tier 2 on resistance anticipation.
// ─────────────────────────────────────────────────────────────────────────────
export interface Leg3Proposal {
  id: string;
  name: string;
  tagline: string;
  tierTarget: string; // e.g. "Tier 1 → Tier 2"
  hypothesis: string;
  design: string[];
  endpoints: string;
  fillsGap: string;
  nullResult: string;
  resistanceMechanismsAddressed: string[]; // mechanism ids from RESISTANCE_MECHANISMS
}

export const LEG3_PROPOSALS: Leg3Proposal[] = [
  {
    id: "closed-loop-ctdna",
    name: "Closed-loop ctDNA adaptive switching trial",
    tagline: "Pre-specified switching rule, not post-hoc narrative",
    tierTarget: "Tier 1 → Tier 2",
    hypothesis:
      "A pre-specified, ctDNA-tracked rule that switches between a KRAS degrader and a RAS(ON) inhibitor at the first detectable resistance signal will delay time-to-progression versus a reactive (wait-for-progression-then-switch) standard, in a model with heterogeneous evolving resistance.",
    design: [
      "Arm A (anticipatory): ctDNA sampled weekly; switch degrader → inhibitor when a pre-specified ctDNA variant (e.g. second-site KRAS mutation or RTK-bypass amplification) crosses a detection threshold — before radiographic progression.",
      "Arm B (reactive / SOC): continue degrader until RECIST progression, then switch.",
      "Model: serial-passage organoids with mixed KRAS-mutant clonal populations + matched ctDNA capture; matched-dose backbones; pre-registered switching rule lodged before unblinding.",
      "Primary readout: time-to-progression under the anticipatory rule vs. reactive, in a model where resistance is allowed to evolve (not a single-line model).",
    ],
    endpoints:
      "Time-to-progression (TTP) under anticipatory vs. reactive switching; concordance between ctDNA-detected resistance and emergence of the matched mechanism in harvested tissue; proportion of switches that were 'correct' (matched the actual resistance driver).",
    fillsGap:
      "Directly fills the Leg-3 tier-2→3 gap: this is the first design that tests a pre-specified adaptive rule (not a post-hoc narrative) against reactive SOC in a resistance-evolution-competent model.",
    nullResult:
      "If TTP is no different, the rule's pre-specification was wrong (the ctDNA threshold or the switch target was mismatched) — not that adaptive therapy as a concept failed. Re-design the rule, don't abandon the loop.",
    resistanceMechanismsAddressed: ["kras-amplification", "switch-allele", "rtk-reactivation"],
  },
  {
    id: "anticipatory-rtk-combo",
    name: "Anticipatory RTK-bypass combination",
    tagline: "Start the bypass blocker at first ctDNA signal, not at progression",
    tierTarget: "Tier 0 → Tier 2",
    hypothesis:
      "Adding an EGFR/HER2 inhibitor to a KRAS degrader at the first ctDNA evidence of RTK-bypass reactivation (rather than waiting for radiographic progression) will prevent the bypass from becoming the dominant resistance driver, extending degrader durability.",
    design: [
      "Phase 1: dose-finding for the degrader + EGFR/HER2 inhibitor combination in KRAS-mutant patients (safety + PK).",
      "Phase 2: randomize degrader + EGFR/HER2 inhibitor (anticipatory, started at first ctDNA RTK signal) vs. degrader + EGFR/HER2 inhibitor (reactive, started at progression).",
      "ctDNA panel: weekly EGFR/HER2/MET/FGFR amp tracking + KRAS second-site variant calling.",
      "Pre-specify: the ctDNA threshold for 'RTK-bypass signal', the switching window, and the primary endpoint (PFS).",
    ],
    endpoints:
      "Progression-free survival (PFS) anticipatory vs. reactive; time to RTK-bypass dominance in ctDNA; frequency of the combo being started at the right ctDNA window.",
    fillsGap:
      "Fills the Leg-3 tier-0→2 gap for RTK-bypass specifically: currently no trial tests an anticipatory combo started at a molecular signal rather than at progression — this is the design the cure-criteria rubric's 'kill criteria' for Leg 3 (no pre-specified switching rule) is meant to catch.",
    nullResult:
      "If PFS is equal, the anticipatory timing is not the lever (the bypass blocker works equally well reactive) — still useful, because it means the simpler reactive design is sufficient and anticipatory adds cost without benefit.",
    resistanceMechanismsAddressed: ["rtk-reactivation", "switch-allele"],
  },
  {
    id: "organoid-resistance-atlas",
    name: "Closed-loop organoid resistance-atlas platform",
    tagline: "Map resistance emergence mechanistically before the clinic",
    tierTarget: "Tier 0 → Tier 1 (platform)",
    hypothesis:
      "Serial passage of KRAS-mutant organoids under degrader pressure, with weekly variant calling + single-cell transcriptomics, will reveal the full resistance-mechanism landscape (genomic + epigenetic + microenvironmental) before any clinical resistance emerges — enabling pre-specified adaptive rules.",
    design: [
      "Establish 6–8 KRAS-mutant patient-derived organoids (PDOs) spanning G12C/D/V/Q61.",
      "Serial-passage each under escalating degrader pressure; sample weekly for: (a) bulk + single-cell DNA-seq, (b) scRNA-seq, (c) phospho-proteomics (RTK/MAPK/PI3K).",
      "Build a per-organoid resistance timeline: which mechanism emerges, when, and in what clonal fraction.",
      "Cross-reference against the resistance-atlas mechanism list to flag mechanisms the current assets are untested against.",
    ],
    endpoints:
      "Catalog of resistance mechanisms per genotype; time-to-emergence per mechanism; concordance with the resistance-atlas prediction; number of 'unknown' cells in the atlas that this platform resolves to 'overcomes' or 'vulnerable'.",
    fillsGap:
      "Fills the Leg-3 tier-0→1 platform gap: the resistance atlas currently has many 'unknown' cells because resistance hasn't been measured systematically. This platform converts unknowns to knowns before any clinical trial spends money on the wrong combination.",
    nullResult:
      "A null result (no reproducible resistance emerges) suggests the organoid model lacks the selective-pressure fidelity of in-vivo resistance — the platform needs an in-vivo arm, not the concept of pre-mapping resistance.",
    resistanceMechanismsAddressed: ["kras-amplification", "switch-allele", "rtk-reactivation", "epigenetic-emt", "hypoxia-vhl"],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Head-to-head asset comparison — pre-picked pairs that highlight interesting
// trade-offs, plus the comparison logic lives in the component.
// ─────────────────────────────────────────────────────────────────────────────
export const ASSET_COMPARISON_PAIRS: { a: string; b: string; label: string }[] = [
  { a: "PT0511", b: "RP04340", label: "Clinical vs. preclinical pan-KRAS degrader" },
  { a: "DT-9081", b: "COMPIT-2", label: "EP4 antagonist vs. perioperative combo (Leg 2)" },
  { a: "autogene cevumeran", b: "mRNA-4157", label: "Two neoantigen vaccines (Leg 4)" },
];

// ─────────────────────────────────────────────────────────────────────────────
// Platform changelog — recent feature additions, newest first.
// ─────────────────────────────────────────────────────────────────────────────
export interface ChangelogEntry {
  version: string;
  date: string; // ISO-ish label
  tag: "feature" | "improvement" | "data";
  title: string;
  body: string;
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: "v0.6",
    date: "Round 8",
    tag: "feature",
    title: "Personalized dashboard",
    body: "A dashboard card right after the hero showing pinned assets, recently-viewed assets, and an aggregate evidence-tier distribution across the registry.",
  },
  {
    version: "v0.6",
    date: "Round 8",
    tag: "feature",
    title: "Recently-viewed tracking",
    body: "Opening any asset deep dive now records it in localStorage; the dashboard surfaces the 6 most-recent.",
  },
  {
    version: "v0.6",
    date: "Round 7",
    tag: "feature",
    title: "ASR voice input for the AI assistant",
    body: "A microphone button in the chat input records your spoken question, transcribes it via the z-ai ASR service, and auto-sends — hands-free Q&A.",
  },
  {
    version: "v0.6",
    date: "Round 7",
    tag: "feature",
    title: "Favorites / pin system",
    body: "Pin any asset from the registry, the deep-dive modal, or the dashboard. A glassmorphic pinned strip floats above the back-to-top button for quick access.",
  },
  {
    version: "v0.6",
    date: "Round 6",
    tag: "feature",
    title: "Asset deep-dive modal",
    body: "Click any asset to open a full-detail modal: evidence summary, tier ladder, pipeline gap, resistance profile, related experiments, combination scores.",
  },
  {
    version: "v0.6",
    date: "Round 5",
    tag: "feature",
    title: "TTS audio narration + keyboard navigation",
    body: "Narrate buttons on the framework tiers (z-ai TTS). j/k jump between sections, / opens a command palette, mini-map rail on the right edge.",
  },
  {
    version: "v0.6",
    date: "Round 4",
    tag: "feature",
    title: "Leg-3 dedicated proposals + head-to-head compare",
    body: "Three full experiment protocols filling the Leg-3 gap, plus a side-by-side asset comparison with a resistance-mechanism matrix.",
  },
  {
    version: "v0.5",
    date: "Round 3",
    tag: "feature",
    title: "Scientific glossary + cohort comparison",
    body: "20 scientific terms with hoverable inline popovers + a full reference section. A radar-chart cohort comparison across 6 mutation-landscape metrics.",
  },
  {
    version: "v0.5",
    date: "Round 2",
    tag: "feature",
    title: "Combination designer + saved simulations + scroll UX",
    body: "Interactive regimen builder scoring each leg independently. Saved-runs persistence. Scroll-progress bar, active-section nav, back-to-top button.",
  },
  {
    version: "v0.4",
    date: "Round 1",
    tag: "feature",
    title: "Initial platform",
    body: "Hero, four-leg cure framework, asset registry, pipeline progression, experiment lab, resistance atlas, precision-targeting simulator, genomic variant explorer, cure-rubric combination scorer, AI research assistant.",
  },
  {
    version: "v0.6",
    date: "Round 8",
    tag: "data",
    title: "19 inline glossary terms",
    body: "Glossary popovers integrated into the hero, framework, experiments, leg-3, and simulator sections.",
  },
];
