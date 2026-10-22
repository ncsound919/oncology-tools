// Scientific glossary — terms used across the OncoSIM platform. Each term has a
// short (popover) and full (expanded) definition. Terms are matched case-insensitively
// against text in the UI and rendered as hoverable popovers.

export interface GlossaryTerm {
  term: string;
  short: string;
  full: string;
  category: "Target" | "Mechanism" | "Evidence" | "Model" | "Biomarker";
}

export const GLOSSARY: GlossaryTerm[] = [
  {
    term: "PROTAC",
    short: "PROteolysis TArgeting Chimera — a bifunctional molecule that recruits an E3 ligase to a target protein to degrade it.",
    full: "A PROTAC (PROteolysis TArgeting Chimera) is a bifunctional small molecule with two ends: one binds a target protein of interest, the other recruits an E3 ubiquitin ligase. Bringing the two together polyubiquitinates the target, flagging it for destruction by the proteasome. Unlike an inhibitor (which blocks activity while leaving the protein present), a degrader removes the protein entirely.",
    category: "Mechanism",
  },
  {
    term: "DC50",
    short: "Concentration for 50% degradation — the PROTAC equivalent of an IC50.",
    full: "DC50 (concentration for 50% degradation) is the degrader equivalent of an inhibitor's IC50: the concentration at which half of the target protein is degraded. Dmax is the maximum degradation achievable at saturating dose. A potent degrader has a low DC50 and a high Dmax.",
    category: "Evidence",
  },
  {
    term: "Dmax",
    short: "Maximum degradation achievable at saturating dose.",
    full: "Dmax is the maximum fraction of target protein a degrader can eliminate at any concentration. A degrader with DC50 = 1 nM but Dmax = 60% still leaves 40% of the target present — which matters if the residual activity is enough to sustain the oncogenic pathway.",
    category: "Evidence",
  },
  {
    term: "DTC",
    short: "Disseminated tumor cell — a cancer cell found outside the primary tumor, often dormant.",
    full: "A disseminated tumor cell (DTC) is a cancer cell that has left the primary tumor and established at a distant site, often in a dormant (non-proliferating) state. DTCs are the reservoir that drives late metastatic recurrence — sometimes 10+ years after primary treatment. Standard tumor-burden readouts are blind to dormant DTCs by construction.",
    category: "Model",
  },
  {
    term: "MHC-I",
    short: "Major Histocompatibility Complex class I — displays intracellular peptides to T cells.",
    full: "MHC class I molecules are on the surface of nearly every nucleated cell and display peptides derived from intracellular proteins. CD8+ T cells survey these peptide-MHC complexes; a foreign or mutant peptide (a neoepitope) can trigger T-cell killing. ~17% of tumors lose MHC-I heterozygosity, which collapses the presenting repertoire and blunts any presentation-based immune priming.",
    category: "Biomarker",
  },
  {
    term: "neoepitope",
    short: "A mutant-derived peptide presented on MHC that the immune system sees as foreign.",
    full: "A neoepitope is a peptide derived from a tumor-specific mutation, presented on MHC-I/II, that the immune system has not seen before (because it's not in the healthy self repertoire). Neoepitopes are the targets of T-cell-based immunotherapy and individualized neoantigen vaccines. Cathepsin B in the TME can destroy G12/G13 KRAS neoepitopes before they're presented.",
    category: "Biomarker",
  },
  {
    term: "HLA",
    short: "Human Leukocyte Antigen — the human MHC; determines which peptides a person can present.",
    full: "HLA (Human Leukocyte Antigen) is the human version of MHC. HLA type is highly polymorphic across the population, and which HLA alleles a patient carries determines which neoepitopes their T cells can be presented. HLA typing should be a stratification variable in any presentation-based therapy trial.",
    category: "Biomarker",
  },
  {
    term: "E3 ligase",
    short: "An enzyme that tags proteins with ubiquitin for proteasomal destruction.",
    full: "E3 ubiquitin ligases are the ~600 human enzymes that confer specificity to ubiquitin tagging. PROTACs hijack an E3 ligase (commonly CRBN or VHL) to degrade a target of interest. Ligase choice matters: CRBN is broadly expressed but variably active; VHL is hypoxia-regulated and underperforms in poorly oxygenated tumor cores.",
    category: "Mechanism",
  },
  {
    term: "CRBN",
    short: "Cereblon — the E3 ligase most commonly recruited by clinical degraders.",
    full: "Cereblon (CRBN) is the E3 ligase substrate receptor hijacked by immunomodulatory imide drugs (IMiDs) and most clinical PROTACs. It is broadly expressed across tissues, making it a workhorse ligase — but its activity varies across cell types, and resistance mutations in CRBN are known.",
    category: "Target",
  },
  {
    term: "VHL",
    short: "Von Hippel-Lindau — an E3 ligase substrate receptor that is hypoxia-regulated.",
    full: "Von Hippel-Lindau protein (pVHL) is the substrate-recognition component of a Cullin-2 E3 ligase. It targets HIF-1α for degradation under normoxia. VHL-recruiting PROTACs inherit this oxygen sensitivity: in hypoxic tumor cores, VHL's activity drops, and so does the degrader's potency. This is the hypothesis Experiment 1 tests directly.",
    category: "Target",
  },
  {
    term: "ctDNA",
    short: "Circulating tumor DNA — tumor-derived DNA fragments in the blood.",
    full: "Circulating tumor DNA (ctDNA) is fragments of tumor DNA shed into the bloodstream. Tracking ctDNA variant allele frequencies over time gives a real-time, minimally invasive readout of tumor burden and clonal evolution — the basis for closed-loop adaptive therapy designs (Leg 3).",
    category: "Biomarker",
  },
  {
    term: "ICD",
    short: "Immunogenic cell death — death that primes an immune response, not just clears a cell.",
    full: "Immunogenic cell death (ICD) is a form of cell death that releases damage-associated molecular patterns (DAMPs — calreticulin surface exposure, HMGB1 release, ATP secretion), which recruit and mature dendritic cells. ICD-inducing therapies convert a tumor into an in-situ vaccine. Experiment 5 tests whether a KRAS degrader + ADC combination is synergistic for ICD.",
    category: "Mechanism",
  },
  {
    term: "DAMP",
    short: "Damage-Associated Molecular Pattern — a 'eat me' signal released by stressed/dying cells.",
    full: "DAMPs (Damage-Associated Molecular Patterns) are intracellular molecules released or surface-exposed when a cell dies stressfully. Calreticulin on the surface, HMGB1 in the extracellular space, and secreted ATP are canonical DAMPs that recruit antigen-presenting cells and prime anti-tumor immunity.",
    category: "Mechanism",
  },
  {
    term: "ADC",
    short: "Antibody-Drug Conjugate — a tumor-cell-surface antibody linked to a cytotoxic payload.",
    full: "An Antibody-Drug Conjugate (ADC) pairs a monoclonal antibody targeting a tumor-cell-surface antigen (e.g. TROP2, CEACAM5) with a cytotoxic payload. The antibody delivers the payload selectively to antigen-positive tumor cells, reducing systemic toxicity. Experiment 5 tests ADC + KRAS degrader combinations for immunogenic cell death synergy.",
    category: "Mechanism",
  },
  {
    term: "EP4",
    short: "A prostaglandin E2 receptor — drives myeloid suppression and pre-metastatic niche formation.",
    full: "EP4 is one of four G-protein-coupled receptors for prostaglandin E2 (PGE2). PGE2-EP4 signaling drives myeloid suppressor cell mobilization, M2 macrophage polarization, and pre-metastatic niche formation. Blocking EP4 (e.g. DT-9081) reprograms the niche — directly relevant to Leg 2 (block re-seeding).",
    category: "Target",
  },
  {
    term: "VAF",
    short: "Variant Allele Frequency — the fraction of sequencing reads carrying a mutation.",
    full: "Variant Allele Frequency (VAF) is the proportion of sequencing reads at a locus that carry the variant allele. In a pure diploid sample, a clonal heterozygous mutation has VAF ≈ 0.5; lower VAFs reflect subclonality, copy-number changes, or normal-cell contamination. VAF trajectories over time (in ctDNA) reveal clonal dynamics and resistance emergence.",
    category: "Biomarker",
  },
  {
    term: "TME",
    short: "Tumor Microenvironment — the non-cancer cells and matrix surrounding a tumor.",
    full: "The Tumor Microenvironment (TME) includes cancer-associated fibroblasts, tumor-associated macrophages, vasculature, extracellular matrix, and infiltrating immune cells. TME composition determines whether a drug reaches its target, whether resistance mechanisms are already present, and whether an immune response is suppressed or permitted.",
    category: "Model",
  },
  {
    term: "organotropic",
    short: "Tending to metastasize to a specific organ (e.g. lung-tropic, liver-tropic).",
    full: "Organotropism is the tendency of certain tumors to metastasize preferentially to specific organs, guided by integrin 'zip codes' (e.g. α6β4/α6β1 for lung, αvβ5 for liver) and the pre-metastatic niche. Experiment 4 tests integrin-displaying nanoparticles to exploit organotropism for targeted delivery.",
    category: "Model",
  },
  {
    term: "xenograft",
    short: "A tumor grown in a host animal from implanted human cancer cells.",
    full: "A xenograft is a tumor model where human cancer cells are implanted into an immunodeficient mouse. It preserves human tumor genetics but lacks an intact immune system. Cell-line-derived xenografts are fast but clonal; patient-derived xenografts (PDX) retain more heterogeneity. Tier 2–3 evidence typically relies on xenograft or organoid models.",
    category: "Model",
  },
  {
    term: "organoid",
    short: "A 3D in-vitro culture of patient tumor cells that retains heterogeneity.",
    full: "An organoid is a 3D self-organizing culture of primary cells that retains much of the original tissue's architecture and cellular heterogeneity. Tumor organoids are a tier-2 model that bridges cell-line work (too clonal) and xenografts (too slow / no immune compartment). They are increasingly used for resistance-evolution studies (Leg 3).",
    category: "Model",
  },
];

// Quick lookup map (lowercase key)
export const GLOSSARY_MAP: Record<string, GlossaryTerm> = Object.fromEntries(
  GLOSSARY.map((t) => [t.term.toLowerCase(), t])
);
