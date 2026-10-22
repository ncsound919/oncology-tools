import { StanceCard, EpistemicLens, TumorResearchQuestion, CancerControversy } from '../types';
import { CANCER_RESEARCH_CONTROVERSIES } from './cancerControversies';

export { CANCER_RESEARCH_CONTROVERSIES };

export interface HardestQuestionDetail {
  number: number;
  question: string;
  difficultyCause: string;
  impactWhyItMatters: string;
  scientificLens: string;
  mathematicalLens: string;
  philosophicalLens: string;
  moralLens: string;
  citations: string[];
}

export interface DebatePreset {
  id: string;
  name: string;
  badge: string;
  topic: string;
  materials: string;
  stanceCards: StanceCard[];
  recommendedPersonas?: {
    role: string;
    description: string;
    primaryLens: EpistemicLens;
  }[];
  evidenceBriefs?: {
    field: string;
    tag: string;
    summary: string;
    citations: string[];
    aiStatus: string;
    lens?: EpistemicLens;
  }[];
  forecastTable?: {
    field: string;
    development: string;
    aiRole: string;
  }[];
  hardestQuestions?: HardestQuestionDetail[];
  tumorQuestions?: TumorResearchQuestion[];
  controversies?: CancerControversy[];
  interconnectedChain?: {
    step: string;
    title: string;
    description: string;
    bottleneck: string;
  }[];
}

export const TUMOR_RESEARCH_QUESTIONS_8: TumorResearchQuestion[] = [
  {
    number: 1,
    question:
      'Are tumors driven mainly by a small, stable population of cancer stem cells, or can many tumor cells regain stem-like, tumor-initiating abilities?',
    shortTitle: 'Cancer Stem Cells vs. Dynamic Cellular Plasticity',
    category: 'Stemness & Lineage Plasticity',
    competingPositionsSummary:
      'The classic cancer-stem-cell model emphasizes a hierarchy: a rare subset can self-renew and regenerate the tumor. A competing view emphasizes cellular plasticity—non-stem-like cells can change state under stress, treatment, or microenvironmental signals. The definition is contentious because marker-based identification alone may not establish functional tumor-initiating capacity.',
    positionA: {
      title: 'Hierarchical Cancer Stem Cell (CSC) Model',
      claim:
        'Tumors are organized in a strict unidirectional hierarchy driven by a rare, dedicated subpopulation of self-renewing CSCs capable of long-term clonal replenishment and therapy evasion.',
    },
    positionB: {
      title: 'Dynamic Cellular Plasticity & State Transition Model',
      claim:
        'Stemness is not an intrinsic cell type but a reversible, plastic cell state. Differentiated non-stem tumor cells readily dedifferentiate and acquire tumor-initiating capacity in response to cytotoxic stress, TGF-β, and niche signaling.',
    },
    whyItMatters:
      'If a fixed rare population drives relapse, directly eliminating it may work. If stemness is reversible, therapies must also block the cues that let surviving cells become stem-like again.',
    scientificLens:
      'Single-cell chromatin accessibility (ATAC-seq) at Oct4/Sox2/Nanog loci; dynamic asymmetric division mediated by Notch/Wnt signaling; microenvironmental TGF-β and hypoxia inducing EMT-coupled dedifferentiation.',
    mathematicalLens:
      'Multi-compartment stochastic Markov state-transition models dx_stem/dt = (r_s - δ_s)x_stem + k_plastic*x_diff; high-dimensional Waddington epigenetic energy landscapes with shallow potential barriers.',
    philosophicalLens:
      'Aristotelian Essentialism (treating "stemness" as an immutable substance or fixed identity) versus Process Ontology (stemness as a transient operational behavior of an open dynamical system).',
    moralLens:
      'Resource stewardship: avoiding massive R&D misallocation into static CSC surface-marker inhibitors (e.g. CD44/CD133) that fail in Phase III due to rapid plastic de-differentiation of surviving bulk cells.',
    citations: ['nature.com/articles/nature11288', 'Nature Reviews Cancer Stem Cell Plasticity', 'Cell Stem Cell Reversible Tumor Initiation'],
  },
  {
    number: 2,
    question:
      'Is epithelial–mesenchymal transition (EMT) necessary for metastasis, or is partial EMT/cell-state plasticity the real mechanism?',
    shortTitle: 'Classic EMT vs. Hybrid E/M & Collective Plasticity',
    category: 'Metastatic Dissemination',
    competingPositionsSummary:
      'One view treats EMT as a central program that enables invasion and dissemination. Another argues that complete EMT is not universally required and that metastasis may depend on hybrid epithelial–mesenchymal states, collective migration, or tumor-type-specific mechanisms. Researchers also disagree because "EMT" has been defined inconsistently across studies.',
    positionA: {
      title: 'Complete Binary EMT Program Requirement',
      claim:
        'Complete EMT is an obligatory transcriptional program (driven by Snail, Twist, Zeb1) required for carcinoma cells to dissolve tight junctions, undergo individual detachment, and intravasate into circulation.',
    },
    positionB: {
      title: 'Hybrid E/M States & Collective Cluster Dissemination',
      claim:
        'Complete EMT is unnecessary and even detrimental to organ colonization; metastasis is driven by hybrid E/M plastic states and collective multi-cell circulating tumor clusters (CTC clusters) possessing superior survival and colonization fitness.',
    },
    whyItMatters:
      'This determines whether therapies should block EMT itself, target hybrid states, or focus instead on migration, immune evasion, or colonization of distant organs.',
    scientificLens:
      'Co-expression of E-cadherin and Vimentin at single-cell resolution; plakoglobin-dependent CTC clusters exhibiting 50-fold higher metastatic efficiency; mesenchymal-to-epithelial transition (MET) necessity for macro-metastatic outgrowth.',
    mathematicalLens:
      'Tristable non-linear dynamical toggle switches (miR-200/ZEB and miR-34/SNAIL mutual inhibition circuits) with phenotypic hysteresis; cluster hydrodynamic percolation models.',
    philosophicalLens:
      'The Reification Fallacy—treating "Epithelial" and "Mesenchymal" as discrete binary ontological categories rather than continuous multi-dimensional phenotypic manifolds.',
    moralLens:
      'Preventing clinical harm: avoiding anti-EMT drugs that inadvertently freeze cancer cells in ultra-aggressive hybrid invasive states or inhibit protective MET at distant organs.',
    citations: ['nature.com/articles/nature16064', 'Nature Reviews Molecular Cell Biology EMT Consensus', 'Cell CTC Clusters Metastatic Fitness'],
  },
  {
    number: 3,
    question:
      'Does most intratumoral diversity arise through natural selection, or largely through neutral evolutionary drift?',
    shortTitle: 'Darwinian Selection vs. Neutral Evolutionary Drift',
    category: 'Evolutionary Dynamics',
    competingPositionsSummary:
      'In a selection-dominant model, fitter mutations and resistant clones take over. In a neutral-evolution model, many mutations accumulate by chance without improving fitness. Evidence suggests that both patterns occur, varying by cancer type and phase of disease.',
    positionA: {
      title: 'Darwinian Selection-Dominant Model',
      claim:
        'Intratumoral genetic heterogeneity is shaped primarily by continuous positive Darwinian selection, where driver mutations confer distinct fitness advantages resulting in sequential subclonal sweeps.',
    },
    positionB: {
      title: 'Neutral Evolution & Big Bang Model',
      claim:
        'Following initial transformation, vast numbers of subclonal mutations accumulate neutrally without significant selective differences (neutral tail), generating wide diversity through stochastic genetic drift and spatial expansion.',
    },
    whyItMatters:
      'The answer shapes how biopsies are interpreted and whether clinicians should predict a tumor’s next dominant clone or instead treat broad diversity before it becomes clinically important.',
    scientificLens:
      'Multi-region whole-genome sequencing (WGS); subclonal variant allele frequency (VAF) power-law distributions (1/f neutral spectrum); TRACERx longitudinal tracking across tumor stages.',
    mathematicalLens:
      'Neutral Wright-Fisher diffusion models; power-law allele frequency distributions P(f) ~ 1/f; subclonal dN/dS ratios testing departures from neutrality; stochastic branching processes.',
    philosophicalLens:
      'Adaptationism (the Panglossian assumption that every observed somatic alteration exists because it was selected for fitness) versus Kimura’s Neutral Mutation Theory applied to somatic evolution.',
    moralLens:
      'Avoiding the clinical toxicity of subjecting patients to expensive, off-target targeted agents directed against neutral passenger mutations that do not drive tumor lethality.',
    citations: ['Nature Genetics Sottoriva Neutral Evolution', 'pmc.ncbi.nlm.nih/articles/PMC4760144', 'Cancer Cell Clonal vs Neutral Dynamics'],
  },
  {
    number: 4,
    question:
      'Is the tumor microenvironment primarily a cancer accomplice—or does it contain protective components that therapy could accidentally destroy?',
    shortTitle: 'TME as Cancer Accomplice vs. Dual Protective Stroma',
    category: 'Tumor Microenvironment',
    competingPositionsSummary:
      'Immune cells, fibroblasts, blood vessels, extracellular matrix, and other local cells can nurture growth, invasion, drug resistance, and immune escape. Yet specific microenvironmental cells or states can restrain tumor growth, and the same cell category can have opposing effects depending on tumor type, stage, and location.',
    positionA: {
      title: 'TME as Universal Malignant Accomplice',
      claim:
        'The tumor microenvironment (CAFs, TAMs, MDSCs, aberrant vasculature, stiffened ECM) acts as an active accomplice that nurtures proliferation, shields against chemotherapy, and drives immune evasion.',
    },
    positionB: {
      title: 'Dual Restraining vs. Promoting Stroma Model',
      claim:
        'The stroma contains essential host-protective, tumor-restraining components (e.g. Meflin+ rCAFs, dense mechanical collagen barriers, tertiary lymphoid structures); non-selective stroma destruction accelerates metastasis.',
    },
    whyItMatters:
      'Blanket removal of stroma or immune components may backfire. A better approach may require identifying and reprogramming specific harmful cell states while preserving protective ones.',
    scientificLens:
      'Cancer-associated fibroblast heterogeneity (myCAFs, iCAFs, and tumor-restraining rCAFs); the sonic hedgehog (Shh) inhibitor clinical trial paradox where stroma depletion accelerated pancreatic cancer metastasis.',
    mathematicalLens:
      'Coupled reaction-diffusion and spatial cellular automata for matrix stiffness and interstitial fluid pressure ∇·v = φ; multi-agent predator-prey dynamics with stromal moderators.',
    philosophicalLens:
      'Ecological Mutualism versus Cartesian Dualism: rejecting the simplistic "host vs invader" dichotomy in favor of a complex ecosystem where tissue defense mechanisms can become subverted.',
    moralLens:
      'Non-maleficence (Primum non nocere): preventing clinical trials from deploying indiscriminate stroma-depleting agents that breach natural host containment capsules.',
    citations: ['Cancer Cell Sonic Hedgehog PDAC Paradox', 'pmc.ncbi.nlm.nih/articles/PMC4161952', 'Nature Reviews Cancer CAF Heterogeneity'],
  },
  {
    number: 5,
    question:
      'Is metastatic relapse caused mainly by truly dormant individual cells, by a small population in balanced growth and death, or by disease that was simply below detection?',
    shortTitle: 'True Cellular Quiescence vs. Dynamic Equilibrium vs. Sub-detection',
    category: 'Metastatic Dormancy & Relapse',
    competingPositionsSummary:
      '“Dormancy” can mean non-dividing viable cells, but it may also describe microscopic lesions whose cell division is balanced by cell death or immune control. Long disease-free intervals support a dormancy paradigm, yet the exact biology in any individual patient is difficult to observe directly.',
    positionA: {
      title: 'Solitary Cellular Quiescence (G0 Arrest)',
      claim:
        'Relapse is driven by solitary disseminated tumor cells (DTCs) that enter a reversible, metabolically adapted G0 quiescent state within protective perivascular or endosteal niches.',
    },
    positionB: {
      title: 'Micrometastatic Dynamic Equilibrium',
      claim:
        'Relapse arises from microscopic clusters of cells that continue dividing, but where net population expansion is kept at zero by balanced cell death from immune surveillance, lack of angiogenesis, or nutrient limits.',
    },
    positionC: {
      title: 'Sub-detection Continuous Kinetics',
      claim:
        'True dormancy is rare; disease was continuously proliferating at slow Gompertzian kinetics below the analytical sensitivity threshold of current imaging and ctDNA assays.',
    },
    whyItMatters:
      'Treatment choices differ sharply: should researchers kill dormant cells, keep them dormant indefinitely, strengthen immune surveillance, or improve detection of microscopic growing lesions?',
    scientificLens:
      'PERK-eIF2α mediated cholesterol biosynthesis dormancy axis; STING-dependent immune surveillance niches; bone marrow aspirate DTC tracking; angiogenic switch (VEGF upregulation); serial ctDNA doubling kinetics.',
    mathematicalLens:
      'Gompertzian growth models N(t) = N_0 exp( (A/B)(1 - e^-Bt) ); stochastic first-passage time distributions to detection threshold (10^9 cells); birth-death-predation master equations.',
    philosophicalLens:
      'Epistemic Limits of Observation: distinguishing "quiescence" (cessation of action) from "equilibrium" (dynamic balance of opposing forces) when internal micro-states are unobservable.',
    moralLens:
      'Managing the chronic toxicity and psychological burden of endless adjuvant therapies in asymptomatic patients with undetectable residual disease.',
    citations: ['Nature Metastatic Dormancy Mechanics', 'pmc.ncbi.nlm.nih/articles/PMC8900123', 'JCI PERK-eIF2a Cholesterol Dormancy'],
  },
  {
    number: 6,
    question:
      'Does a tumor’s genetic sequence usually determine treatment response, or are non-genetic cell states equally important?',
    shortTitle: 'Genomic Determinism vs. Non-Genetic Cell States',
    category: 'Therapeutic Response & Plasticity',
    competingPositionsSummary:
      'Precision oncology often prioritizes DNA mutations and druggable drivers. But cells with the same genome can differ in gene expression, metabolism, epigenetic state, location within the tumor, and interaction with neighboring cells—and may respond differently to the same drug.',
    positionA: {
      title: 'Genomic Determinism & Actionable DNA Drivers',
      claim:
        'The somatic DNA mutational landscape (oncogenic drivers, amplifications, fusions, MSI status) is the primary determinant of therapeutic vulnerability and drug response.',
    },
    positionB: {
      title: 'Non-Genetic Epigenetic & Spatial Plasticity',
      claim:
        'Isogenic cancer cells with identical genomes exhibit profound functional heterogeneity—governed by chromatin states, metabolic rewiring, and spatial microclimates—that dictates drug resistance independently of DNA changes.',
    },
    whyItMatters:
      'It decides whether single biopsies and DNA panels are sufficient, or whether routine care needs serial, spatial, RNA, protein, and microenvironment measurements.',
    scientificLens:
      'Drug-tolerant persister cells (DTPs) surviving targeted kinase inhibitors via KDM5/H3K4 demethylation without new DNA mutations; spatial transcriptomics; virtual spatial proteomics (HEX model mapping 40 markers from H&E).',
    mathematicalLens:
      'High-dimensional non-convex Waddington energy landscapes; Langevin stochastic dynamics dx = -∇U(x)dt + σ dW_t; Shannon information entropy of single-cell transcriptional distributions.',
    philosophicalLens:
      'Genetic Reductionism (DNA as the exclusive master program) versus Systems Biology (phenotype as an emergent property of non-linear regulatory networks and microenvironmental context).',
    moralLens:
      'Distributive justice: avoiding expensive off-label DNA-targeted therapies ($20k+/month) that fail due to unmeasured non-genetic microenvironmental resistance; maximizing overall clinical utility.',
    citations: ['Nature Reviews Genetics Non-genetic Heterogeneity', 'link.springer.com/article/10.1007/s00018-024-05189-x', 'Science Epigenetic Drug Tolerance'],
  },
  {
    number: 7,
    question:
      'Should early cancer detection aim to detect the smallest possible tumor signal, or should it prioritize only cancers likely to become dangerous?',
    shortTitle: 'Ultra-Sensitive Signal Minimization vs. Danger Prioritization',
    category: 'Early Detection & Screening',
    competingPositionsSummary:
      'Highly sensitive liquid-biopsy and multi-cancer detection approaches could identify disease earlier. The opposing concern is that weak signals can arise from non-tumor sources such as clonal hematopoiesis, and detection may uncover slow-growing abnormalities that lead to anxiety, invasive follow-up, or overtreatment.',
    positionA: {
      title: 'Ultra-Sensitive Signal Minimization (MCED)',
      claim:
        'Liquid biopsies and multi-cancer early detection (MCED) should push analytical sensitivity to detect the earliest detectable trace of ctDNA/methylation to intervene before local invasion or metastatic seeding.',
    },
    positionB: {
      title: 'Danger & Lethality Prioritization',
      claim:
        'Screening must selectively target aggressive, lethal malignancies; ultra-sensitive detection captures indolent abnormalities, non-cancerous somatic clones (CHIP), and self-limiting micro-tumors, causing massive overdiagnosis and overtreatment.',
    },
    whyItMatters:
      'The goal of screening is lower mortality—not simply more cancer diagnoses. Answering this requires prospective trials that measure benefits, harms, diagnostic workups, and outcomes.',
    scientificLens:
      'Cell-free DNA (cfDNA) methylation deconvolution; fragmentomics; clonal hematopoiesis of indeterminate potential (CHIP) confounding liquid biopsies; natural history of indolent thyroid and prostate lesions.',
    mathematicalLens:
      'Bayesian posterior positive predictive value PPV = (Se*P) / (Se*P + (1-Sp)*(1-P)) under low population prevalence; ROC curve optimization; lead-time and length-time bias modeling.',
    philosophicalLens:
      'The Definition of "Disease": distinguishing biological cellular deviations from clinical pathological entities that threaten human life and functioning.',
    moralLens:
      'Non-maleficence: weighing the moral balance between lives saved through early detection versus healthy lives damaged by invasive biopsies, surgical complications, and lifetime cancer anxiety.',
    citations: ['Lancet Oncology MCED Trials', 'pmc.ncbi.nlm.nih/articles/PMC8956201', 'JAMA Internal Medicine Overdiagnosis in Screening'],
  },
  {
    number: 8,
    question:
      'Is drug resistance mostly present before therapy begins, or induced/adaptively created by therapy?',
    shortTitle: 'Pre-Existing Darwinian Clones vs. Therapy-Induced Plasticity',
    category: 'Therapeutic Resistance Mechanisms',
    competingPositionsSummary:
      'One model says treatment selects pre-existing resistant clones. Another says drugs trigger reversible survival programs, altered metabolism, or phenotype switching, allowing initially sensitive cells to persist until more durable resistance emerges. In practice, both likely operate, but their relative importance differs by tumor and therapy.',
    positionA: {
      title: 'Pre-Existing Darwinian Selection Model',
      claim:
        'Resistance is overwhelmingly pre-existing due to extensive baseline intratumoral genetic and epigenetic heterogeneity; therapy acts purely as a Darwinian sieve eliminating sensitive clones.',
    },
    positionB: {
      title: 'Therapy-Induced & Lamarckian Adaptive Resistance',
      claim:
        'Therapeutic stress actively instructs cellular reprogramming, epigenetic remodeling, and drug-tolerant persister (DTP) states, enabling sensitive cells to survive and acquire de novo resistance mechanisms.',
    },
    whyItMatters:
      'If resistance is pre-existing, early combination therapy and broad sampling become central. If adaptive resistance is pivotal, timed or intermittent regimens and drugs that block state transitions may be more effective.',
    scientificLens:
      'Luria-Delbrück fluctuation analysis in solid tumors; single-cell DNA/RNA lineage barcoding (Watermelon/ClonTracer); GPX4-dependent lipid peroxidation in persisters; stress-induced error-prone polymerases.',
    mathematicalLens:
      'Luria-Delbrück variance-to-mean fluctuation equations; non-equilibrium Markov jump processes with stress-dependent transition rates k_persister(Dose); Lotka-Volterra competition in adaptive dosing.',
    philosophicalLens:
      'Darwinian Selection (passive filter acting on pre-existing diversity) versus Lamarckian Plasticity (environmental stress instructing adaptive phenotypic remodeling).',
    moralLens:
      'Optimizing patient quality of life: avoiding lethal toxicities from aggressive multi-drug maximum-tolerated-dose cocktails if pulsed adaptive schedules prevent resistance with vastly lower toxicity.',
    citations: ['Nature Luria-Delbrück in Cancer Plasticity', 'pmc.ncbi.nlm.nih/articles/PMC9347891', 'Science Drug-Tolerant Persisters'],
  },
];

export const HARDEST_QUESTIONS_CANCER: HardestQuestionDetail[] = [
  {
    number: 1,
    question: 'Why does a normal cell become cancerous in one person, at one time, in one tissue?',
    difficultyCause:
      'Cancer-causing genetic changes can arise from copying errors during cell division, inherited variants, and exposures (tobacco, UV, HPV). But the exact same mutation or exposure does not produce cancer in every individual; tissue microenvironment context, immune surveillance, somatic mosaicism, aging, and stochastic quantum/biochemical chance all dictate the outcome.',
    impactWhyItMatters:
      'Cracking this enables ultra-precise, non-invasive primary prevention: intercepting malignant transformation before a solid lesion ever nucleates rather than waiting for radiographic detection.',
    scientificLens:
      'Epigenetic chromatin landscape accessibility, somatic mutation burden in normal tissue (sun-exposed skin has >100 driver mutations/cm² without malignancy), stem-cell niche stiffness, and tissue microenvironmental signaling (e.g. chronic inflammatory cytokine baths).',
    mathematicalLens:
      'Multi-stage Poisson arrival process; stochastic branching probability P_malignant(t) = 1 - exp(-∫ λ(s) ds); non-linear percolation thresholds in spatial cellular lattices.',
    philosophicalLens:
      'The tension between Deterministic Etiology (identifying causal carcinogens) and Fundamental Stochasticity (teleological fallacy of assuming every cancer has an assignable direct reason rather than being an emergent thermodynamic accident).',
    moralLens:
      'Distributive justice in screening: avoiding the massive ethical harms of over-diagnosis and unnecessary radical biopsies in asymptomatic individuals carrying benign clonal expansions.',
    citations: ['cancer.gov/about-cancer/causes-prevention/genetics', 'Martincorena et al. Science Somatic Mutations in Normal Tissues', 'Tomasetti & Vogelstein Science Stochastic Carcinogenesis'],
  },
  {
    number: 2,
    question: 'How can we map and outmaneuver cancer’s evolution inside a patient?',
    difficultyCause:
      'A tumor is an evolving Darwinian ecosystem, not a uniform clonal clone. Distinct spatial niches harbor different mutations, metabolic states, and drug sensitivities. Conventional maximum-tolerated-dose (MTD) chemotherapy eliminates sensitive clones while actively selecting for aggressive, resistant variants that drive fatal recurrence.',
    impactWhyItMatters:
      'Enables true "Adaptive Therapy" and evolutionary steering: steering tumor clonal composition toward stable, drug-sensitive, or benign competition states rather than causing rapid multi-drug resistance.',
    scientificLens:
      'Spatial multi-region proteogenomics, longitudinal serial liquid biopsy (ctDNA subclonal tracking), metabolic plasticity (glycolytic vs oxidative phosphorylation switching), and microenvironment niche protection.',
    mathematicalLens:
      'Evolutionary Game Theory (replicator dynamics ẋ_i = x_i [(Ax)_i - x^T Ax]), Lotka-Volterra predator-prey competitive models, and optimal control theory for pulsed drug scheduling to maintain competitive suppression.',
    philosophicalLens:
      'The "Ship of Theseus" of malignant identity: as mutations accumulate and subclones diverge, does the tumor remain a singular entity or a decentralized swarm of competing organisms within a compromised host?',
    moralLens:
      'The bioethical paradigm shift from "Total Eradication at Any Cost" (which often destroys host organ function and accelerates resistance) to "Dignified Long-Term Coexistence & Management" (QALY preservation).',
    citations: ['pmc.ncbi.nlm.nih/PMC12623568', 'Gatenby et al. Nature Reviews Cancer Adaptive Therapy', 'Nowell Science 1976 Clonal Evolution of Tumors'],
  },
  {
    number: 3,
    question: 'How can we prevent metastasis—or eliminate it once it has begun?',
    difficultyCause:
      'To metastasize, a disseminated tumor cell (DTC) must detach from the primary niche, survive shear stress in circulation, evade NK/T-cell patrolling, extravasate into a foreign organ parenchymal bed, and survive for years in a dormant state before awakening into macro-metastatic colonies.',
    impactWhyItMatters:
      'Metastatic spread accounts for >90% of all solid tumor cancer deaths. Preventing dissemination or maintaining permanent dormancy converts a fatal systemic disease into a cured or harmless localized event.',
    scientificLens:
      'PERK-eIF2α mediated cholesterol biosynthesis escape, STING agonist immune awakeners (ADU-S100), pre-metastatic niche priming by tumor-derived exosomes, and bone/liver sinusoidal endothelial barriers.',
    mathematicalLens:
      'Absorbing Markov chain models of metastatic transit; spatial escape manifolds in high-dimensional epigenetic attractor landscapes; percolation models of vascular invasion.',
    philosophicalLens:
      'The ontology of "Cure" versus "Perpetual Latency": if dormant cancer cells exist in every treated survivor’s bone marrow for decades without growing, are they cured or conditionally colonized?',
    moralLens:
      'The psychological burden and medical ethics of monitoring Minimal Residual Disease (MRD): whether to subject asymptomatic patients with trace ctDNA to chronic toxic regimens without guaranteed overall survival gains.',
    citations: ['cancer.gov/news-events/cancer-currents-blog/2025/metastasis-dormant-cancer-cells', 'Massagué & Obenauf Nature Metastatic Colonization', 'JCI 2026 PERK-eIF2α Lung Cancer Dormancy'],
  },
  {
    number: 4,
    question: 'How can we make the immune system reliably recognize and destroy every cancer, without causing dangerous autoimmunity?',
    difficultyCause:
      'Tumors originate from the host’s own tissues and share the vast majority of surface self-antigens. Cancers actively exploit peripheral tolerance mechanisms (PD-L1, CTLA-4, TGF-β, Tregs, MDSCs, HLA loss). Over-activating immune attack breaks tolerance, causing fatal immune-related adverse events (irAEs) like lethal myocarditis, colitis, and encephalitis.',
    impactWhyItMatters:
      'Achieving safe, universal immune discrimination unlocks durable, self-amplifying cures for the 80% of solid tumor patients who currently fail to respond to standard checkpoint blockade.',
    scientificLens:
      'Neoantigen peptide-MHC presentation dynamics, T-cell receptor (TCR) affinity tuning, cold-tumor microenvironment conversion (macrophage repolarization M2 to M1), and bispecific T-cell engagers (BiTEs) / logic-gated CAR-T constructs.',
    mathematicalLens:
      'Information-theoretic discrimination bounds (signal-to-noise ratio in TCR kinetic proofreading); multi-objective Pareto optimization balancing tumor kill rate k_tumor against autoimmune cross-reactivity rate k_auto.',
    philosophicalLens:
      'The epistemological boundary of the "Self": cancer is not an alien pathogen (like a virus or bacteria), but a corrupt permutation of the Self. The immune system is asked to perform an ontological contradiction: attack self-tissue as non-self while preserving the host.',
    moralLens:
      'Risk-benefit calculus under extreme uncertainty: accepting a 5–10% probability of fatal fulminant autoimmune toxicity for a 30% chance of a lifelong durable cancer cure.',
    citations: ['biospace.com/cancer-grand-challenges-toughest-questions', 'Nature Reviews Immunology Cancer Immunoediting', 'Lancet Oncology Immune-Related Adverse Events in Checkpoint Inhibitors'],
  },
  {
    number: 5,
    question: 'How can we kill every cancer cell while preserving normal tissue and quality of life?',
    difficultyCause:
      'Because malignant cells rely on fundamental cellular machinery (DNA replication, transcription, mitochondrial respiration, ribosomal biogenesis, proteostasis), therapies with high cytotoxic potency inevitably inflict collateral damage on healthy dividing organs (bone marrow, gut, hair, neurons, heart).',
    impactWhyItMatters:
      'A true cure must be tolerable enough to be completed without inducing catastrophic chronic organ failure, secondary treatment-induced malignancies, or permanent cognitive and metabolic devastation—especially in pediatric and elderly populations.',
    scientificLens:
      'Synthetic lethality (e.g. PARP inhibitors in BRCA-deficient cells), Antibody-Drug Conjugates (ADCs) with cleavable linkers, targeted protein degraders (PROTACs/molecular glues for undruggable oncogenes like MYC/KRAS), and tumor-activated prodrugs.',
    mathematicalLens:
      'Therapeutic Index maximization TI = TD_50 / ED_50; optimal control constrained by organ toxicity ceilings; pharmacodynamic modeling of localized payload release vs systemic clearance.',
    philosophicalLens:
      'The definition of healing: The ancient principle of *Primum Non Nocere* (First, do no harm) contrasted with radical oncological interventionism. Is prolonged survival meaningful if cognitive, physical, or moral quality of life is eradicated?',
    moralLens:
      'Quality-Adjusted Life Years (QALY) ethics, pediatric survivorship stewardship (preventing lifetime organ toxicity), and the moral imperative of palliative oncology alongside curative ambition.',
    citations: ['cancer.gov/about-cancer/treatment/side-effects', 'Nature Biotechnology Next-Gen Antibody-Drug Conjugates', 'New England Journal of Medicine Long-Term Toxicity in Childhood Cancer Survivors'],
  },
];

export const DEBATE_PRESETS: DebatePreset[] = [
  {
    id: 'cancer-research-live-controversies',
    name: '5 Live Controversies in Cancer Research (Screening, MCED, Precision Complexity, Endpoints & Disparities)',
    badge: '5 LIVE CONTROVERSIES',
    topic:
      'Resolving Major Cancer Research Controversies: Balancing Uncertain Benefits, Downstream Harms, Biological Complexity, Evidence Standards, and Biosocial Priorities',
    materials: `SYNTHESIS REPORT: MAJOR LIVE CONTROVERSIES IN CONTEMPORARY CANCER RESEARCH
Examining How Disagreements Arise from Differing Weightings of Benefits, Harms, Biology, Evidence Standards, and Fairness

1. SCREENING AND OVERDIAGNOSIS
- The Debate: Does detecting cancer earlier always help, or can screening find indolent abnormalities that would never have caused symptoms or death?
- Overdiagnosis: Detecting a cancer that would not have harmed a person during their lifetime. Leads to anxiety, biopsies, surgery, radiation, or drug treatment without net benefit.
- Domains: PSA prostate screening (Gleason 6), mammography, low-dose CT lung screening, thyroid ultrasound, and MCED blood tests.
- Methodological Challenge: Once a screen-detected cancer is treated, researchers cannot observe whether that particular untreated cancer would have become harmful (Counterfactual Unobservability). Estimated using population data and excess incidence modeling.
- Core Dispute: Which populations, ages, and intervals are justified; whether evidence demonstrates fewer cancer/all-cause deaths rather than merely more cancers found earlier.

2. NEW BLOOD TESTS AND BIOPIES (LIQUID BIOPSIES & MCED)
- The Debate: Should liquid biopsies and multi-cancer early-detection (MCED) tests be widely offered before randomized trials show that they reduce cancer mortality?
- Supporters: Tumor-derived DNA/RNA/methylation detects cancers before symptoms, including cancers lacking standard screening (pancreas, ovary, esophagus).
- Skeptics: Finding a cancer signal is not the same as proving earlier action helps. Positive results send people into costly, invasive diagnostic cascades with no cancer found (the false-positive pathway highlighted by NCI). Early-stage sensitivity limitations produce false reassurance.
- Equity & Localization: Affordability gaps, diverse trial representation, and organ-of-origin localization errors.
- Core Research Standard: High analytic accuracy/detection yield vs proven lower mortality and acceptable downstream harm.

3. PRECISION MEDICINE VERSUS COMPLEXITY
- The Debate: How far can cancer care be guided by individual tumor mutations and molecular profiles?
- Promise vs Critique: Successes in single actionable drivers (EGFR, BRAF, BCR-ABL), but tumors have multiple alterations, vary across metastatic sites (spatial heterogeneity), evolve under treatment pressure, and are shaped by immune, stromal, and metabolic contexts. A single biopsy is incomplete.
- "Actionable" Mutation Semantics: A mutation can be targetable in principle without evidence that targeting it improves outcomes for a specific cancer type/setting; basket trials grouping by mutation vs tissue context altering drug response.
- Somatic Mutation Theory (SMT, cell-autonomous genetic disease) vs Tissue Organization Field Theory (TOFT, disrupted tissue architecture and cell-cell signaling).

4. IMMUNOTHERAPY EVIDENCE AND SURROGATE ENDPOINTS
- The Debate: When should a drug be considered beneficial—when tumors shrink, when scans stay stable longer, or when patients demonstrably live longer or feel better?
- Surrogates: PFS, ORR, MRD, and ctDNA accelerate research and access, but do not automatically establish patient-important benefit.
- Disconnect & Regulatory Dilemma: In checkpoint inhibitor trials, PFS-OS relationships diverge markedly between monotherapy and chemo-combinations. 2024 review found many accelerated approval drugs failed to show OS or QoL benefit in confirmatory trials.
- Dynamic Biomarkers: PD-L1, TMB, MSI, and TME immune contexture are dynamic, context-dependent, and lack universal predictive fidelity.

5. BIOLOGY, DISPARITIES, AND PRIORITIES
- The Debate: How should researchers explain cancer disparities without mistakenly reducing social categories such as race to biology?
- Biosocial Intertwining: Access to prevention/screening, insurance, treatment quality, environmental exposures, structural inequities, comorbidities, ancestry, tumor biology, and genetics (NCI biosocial model).
- Avoiding Genetic Reductionism: Investigating real mechanisms without overstating biological differences or ignoring remediable social/access barriers.
- Ethical Priority-Setting: Research investment allocation—driven by mortality burden, years of life lost (DALYs/YLL), scientific tractability, commercial incentives, rarity, inequities, or patient priorities.`,
    stanceCards: [
      {
        id: 'sc-controv-1',
        title: 'Screening: Mortality Threshold over Stage-Shift',
        claim:
          'Cancer screening programs and guidelines must be governed strictly by demonstrated reductions in disease-specific and all-cause mortality, rather than stage-shift metrics or survival rates inflated by lead-time and length-time bias.',
        reasoning:
          'Overdiagnosis creates an illusion of efficacy while subjecting thousands of healthy individuals with indolent clones to life-altering surgical and radiation morbidity.',
        confidence: 90,
        isActive: true,
        lens: 'mathematical',
      },
      {
        id: 'sc-controv-2',
        title: 'MCED: Mandatory RCT Mortality & Diagnostic Audit',
        claim:
          'Multi-cancer early detection (MCED) liquid biopsies must not be deployed into asymptomatic population screening until randomized trials prove mortality reduction and quantify false-positive diagnostic cascades.',
        reasoning:
          'Low prevalence in asymptomatic populations drives high false-discovery rates, risking invasive biopsy complications, radiation exposure, and severe psychological distress.',
        confidence: 90,
        isActive: true,
        lens: 'scientific',
      },
      {
        id: 'sc-controv-3',
        title: 'Precision: Tissue-Context Superiority over Single Drivers',
        claim:
          'Oncogenic mutations cannot be deemed "actionable" independent of their tissue of origin and tumor microenvironment, requiring basket trials to report tissue-stratified outcomes.',
        reasoning:
          'BRAF V600E inhibitors succeed in melanoma but fail in colorectal cancer without EGFR blockade; single-panel genomics ignores spatial clonal evolution and stromal buffering.',
        confidence: 85,
        isActive: true,
        lens: 'philosophical',
      },
      {
        id: 'sc-controv-4',
        title: 'Endpoints: Overall Survival & QoL Primacy in Approvals',
        claim:
          'Regulatory agencies must enforce strict, time-bound sunset clauses on accelerated approvals that fail to demonstrate Overall Survival or Health-Related Quality of Life improvements in confirmatory trials.',
        reasoning:
          'Radiographic surrogate endpoints (PFS/ORR) frequently decouple from true survival in immuno-oncology, leaving ineffective, toxic, and expensive drugs on the market.',
        confidence: 95,
        isActive: true,
        lens: 'moral',
      },
      {
        id: 'sc-controv-5',
        title: 'Disparities: Biosocial Causal Mediation over Genetic Reductionism',
        claim:
          'Cancer disparities research must use multilevel causal mediation to disentangle social determinants, healthcare access, and environmental exposures from biological mechanisms, avoiding racial essentialism.',
        reasoning:
          'Equal-access health systems demonstrate that survival disparities shrink or invert when stage-matched treatment is delivered, proving social determinants dominate outcome gaps.',
        confidence: 95,
        isActive: true,
        lens: 'moral',
      },
    ],
    recommendedPersonas: [
      {
        role: 'Screening Epidemiologist & Overdiagnosis Lead',
        description: 'Evaluates population excess incidence models, lead-time deconvolution, and all-cause mortality endpoints.',
        primaryLens: 'mathematical',
      },
      {
        role: 'Liquid Biopsy & Diagnostic Cascade Reviewer',
        description: 'Analyzes cfDNA methylation sensitivity, tissue-of-origin accuracy, and false-positive diagnostic harms.',
        primaryLens: 'scientific',
      },
      {
        role: 'Systems Biologist & Tissue Context Specialist',
        description: 'Deconstructs Somatic Mutation Theory vs TOFT, feedback signaling loops, and clonal heterogeneity.',
        primaryLens: 'philosophical',
      },
      {
        role: 'Regulatory Trialist & Surrogate Meta-Analyst',
        description: 'Audits trial-level surrogate-OS validation (R²_trial), accelerated approvals, and patient-reported outcomes.',
        primaryLens: 'moral',
      },
      {
        role: 'Biosocial Oncologist & R&D Priority Ethicist',
        description: 'Investigates structural determinants of disparities and moral frameworks for research funding allocation.',
        primaryLens: 'moral',
      },
    ],
    controversies: CANCER_RESEARCH_CONTROVERSIES,
    tumorQuestions: TUMOR_RESEARCH_QUESTIONS_8,
    hardestQuestions: HARDEST_QUESTIONS_CANCER,
    interconnectedChain: [
      {
        step: '01',
        title: 'Screening & Overdiagnosis (Controversy 1)',
        description: 'Population screening balances early intervention against indolent detection and counterfactual unobservability.',
        bottleneck: 'Distinguishing lethal progressive malignancies from indolent pseudodisease.',
      },
      {
        step: '02',
        title: 'Liquid Biopsies & MCED Tests (Controversy 2)',
        description: 'cfDNA early detection introduces false-positive diagnostic cascades and early-stage sensitivity hurdles.',
        bottleneck: 'Proving mortality reduction before triggering invasive diagnostic odysseys.',
      },
      {
        step: '03',
        title: 'Precision vs. Tissue Complexity (Controversy 3)',
        description: 'Genomic alterations interact with spatial heterogeneity, clonal evolution, and tissue-of-origin feedbacks.',
        bottleneck: 'Overcoming the disconnect between targetable DNA mutations and tissue-context drug resistance.',
      },
      {
        step: '04',
        title: 'Surrogate Endpoints vs. True Survival (Controversy 4)',
        description: 'Accelerated approvals rely on surrogates (PFS/ORR) that frequently decouple from Overall Survival in immunotherapy.',
        bottleneck: 'Validating that radiographic response translates to patient survival and quality of life.',
      },
      {
        step: '05',
        title: 'Biosocial Disparities & R&D Priorities (Controversy 5)',
        description: 'Ethical oncology integrates social determinants with biology and aligns R&D funding with global burden of disease.',
        bottleneck: 'Preventing genetic reductionism while directing capital toward highest mortality burdens.',
      },
    ],
    evidenceBriefs: [
      {
        field: 'Screening & Overdiagnosis',
        tag: 'COUNTERFACTUAL UNOBSERVABILITY',
        summary:
          'Overdiagnosis detection of indolent abnormalities is estimated via population excess incidence models (CISNET). Mammography overdiagnosis ranges 15–30%; thyroid ultrasound screening in South Korea showed a 15-fold surge in diagnoses with zero mortality benefit.',
        citations: ['Welch & Black JNCI Overdiagnosis in Cancer', 'Esserman et al. JAMA Rethinking Screening', 'CISNET Breast Modeling Consortium'],
        aiStatus: 'AI improves radiographic sensitivity but risks exacerbating overdiagnosis unless trained on natural history lethality.',
        lens: 'mathematical',
      },
      {
        field: 'Liquid Biopsies & MCED Tests',
        tag: 'DIAGNOSTIC CASCADE & PPV',
        summary:
          'MCED blood tests detect tumor cfDNA methylation across 50+ cancers. In low-prevalence general cohorts (~1%), 99% specificity still implies a ~50% false discovery rate, triggering invasive imaging/biopsy workups highlighted by the NCI Vanguard trials.',
        citations: ['Lancet NHS-Galleri Screening Trial', 'NCI Multi-Cancer Detection Trial Protocol', 'Klein et al. Annals of Oncology PATHFINDER'],
        aiStatus: 'Machine learning classifiers achieve >85% tissue-of-origin accuracy, but Stage I analytical sensitivity remains <30%.',
        lens: 'scientific',
      },
      {
        field: 'Precision Medicine vs. Complexity',
        tag: 'TISSUE CONTEXT & SMT vs TOFT',
        summary:
          'BRAF V600E inhibitors yield 80% response in melanoma but fail in colorectal cancer (<5%) due to rapid EGFR feedback. Basket trials (NCI-MATCH, SHIVA) reveal that genomic targets are profoundly modulated by tissue of origin, stroma, and spatial subclonal evolution.',
        citations: ['Prahallad et al. Nature EGFR Feedback in BRAF Colon', 'SHIVA Randomized Precision Trial Lancet Oncol', 'Sonnenschein & Soto TOFT Framework'],
        aiStatus: 'Computational biology maps network feedbacks, but spatial single-cell heterogeneity limits single-biopsy predictions.',
        lens: 'philosophical',
      },
      {
        field: 'Immunotherapy Endpoints',
        tag: 'SURROGATE-OS DECOUPLING',
        summary:
          '2024 JAMA Internal Medicine review found that over 10 years, the majority of cancer drugs approved on surrogate endpoints (PFS/ORR) failed to demonstrate Overall Survival or QoL improvements in confirmatory trials. Checkpoint inhibitors exhibit non-proportional hazards.',
        citations: ['JAMA Intern Med 2024 Accelerated Approval Review', 'Prasad et al. BMJ Surrogate Endpoints in Oncology', 'FDA Oncology Center of Excellence Project Confirm'],
        aiStatus: 'Deep learning models predict response radiographically but cannot forecast post-progression survival or immune toxicity.',
        lens: 'moral',
      },
      {
        field: 'Biology, Disparities & Priorities',
        tag: 'BIOSOCIAL CAUSAL MEDIATION',
        summary:
          'NCI biosocial framework establishes disparities as intertwined social, behavioral, and biological factors. Equal-access VA health system data confirms racial survival gaps equalize when stage-matched treatment is provided, refuting genetic reductionism.',
        citations: ['NCI Cancer Disparities Framework 2024', 'Zavala et al. Cancer Disparities Biosocial Model', 'JAMA Oncology VA Equal-Access Disparity Studies'],
        aiStatus: 'Causal inference algorithms assist mediation analysis to partition social determinants from ancestral genomic signals.',
        lens: 'moral',
      },
    ],
    forecastTable: [
      {
        field: 'Screening & Indolence (Controversy 1)',
        development: 'Molecular lethality classifiers differentiate non-progressive indolent lesions from lethal invasive cancers at biopsy.',
        aiRole: 'Clonal Lethality & Natural History Prediction',
      },
      {
        field: 'MCED & Liquid Biopsy (Controversy 2)',
        development: 'NHS-Galleri and NCI randomized trials report definitive late-stage reduction and mortality endpoints (~2026–2028).',
        aiRole: 'Multi-Modal Fragmentomics & Tissue Deconvolution',
      },
      {
        field: 'Tissue Context in Precision (Controversy 3)',
        development: 'Spatial transcriptomics and organoid feedback panels replace single-gene sequencing for targeted therapy selection.',
        aiRole: 'Ecosystem & Network Feedback Simulation',
      },
      {
        field: 'Surrogate Endpoint Reform (Controversy 4)',
        development: 'Regulatory adoption of Restricted Mean Survival Time (RMST) and mandatory 36-month confirmatory trial sunset triggers.',
        aiRole: 'Non-Proportional Survival Curve Analysis',
      },
      {
        field: 'Biosocial Disparities (Controversy 5)',
        development: 'Multilevel causal mediation models guide public health investments, closing diagnostic delay gaps across underserved communities.',
        aiRole: 'Causal DAG & Admixture Multi-Omics Mapping',
      },
    ],
  },
  {
    id: 'eight-tumor-research-questions',
    name: '8 Grand Tumor Research Dilemmas (Competing Positions & Clinical Impact)',
    badge: '8 GRAND DILEMMAS',
    topic:
      'Resolving the 8 Fundamental Tumor Dilemmas: Reconciling Competing Mechanistic Theories with Clinical & Bioethical Impact',
    materials: `SYNTHESIS MATRIX: THE 8 FUNDAMENTAL TUMOR-FOCUSED RESEARCH QUESTIONS
Deconstructed Across Competing Mechanistic Positions, Clinical Impact, and Quad-Lens Epistemology

1. CANCER STEM CELLS VS CELLULAR PLASTICITY (Q1):
- Competing Positions: Hierarchical unidirectional CSC model vs. dynamic cell-state plasticity where non-stem cells dedifferentiate under stress.
- Why Resolving Matters: Determines whether to directly eliminate a rare fixed population or block environmental cues triggering reversible stemness.
- Epistemic Grounding: ATAC-seq chromatin dynamics at pluripotency loci; stochastic Markov jump processes; Process Ontology over Essentialism.

2. EMT NECESSITY VS HYBRID PLASTICITY IN METASTASIS (Q2):
- Competing Positions: Complete binary EMT master switch vs. hybrid E/M states & collective CTC clusters possessing superior metastatic fitness.
- Why Resolving Matters: Directs whether therapies should block EMT, target hybrid plasticity, or focus on colonization / MET.
- Epistemic Grounding: Tristable miR-200/ZEB feedback switches; CTC cluster percolation; avoiding the reification fallacy of static phenotypes.

3. DARWINIAN SELECTION VS NEUTRAL EVOLUTIONARY DRIFT (Q3):
- Competing Positions: Selection-dominant clonal sweeps vs. neutral "Big Bang" accumulation of passenger mutations without selective advantage.
- Why Resolving Matters: Governs biopsy interpretation and whether to predict dominant subclones vs treating baseline diversity.
- Epistemic Grounding: Variant allele frequency (VAF) 1/f power-law spectra; Kimura neutral somatic evolution; Panglossian adaptationism critique.

4. TUMOR MICROENVIRONMENT: ACCOMPLICE VS DUAL PROTECTIVE STROMA (Q4):
- Competing Positions: TME as universal cancer accomplice vs containing protective elements (e.g. Meflin+ CAFs, mechanical collagen capsules).
- Why Resolving Matters: Blanket stroma destruction backfires (e.g. Shh inhibitor trials accelerating PDAC); requires reprogramming bad states.
- Epistemic Grounding: CAF functional heterogeneity (myCAFs vs rCAFs); coupled reaction-diffusion models; ecological mutualism.

5. METASTASIS RELAPSE: QUIESCENCE VS DYNAMIC EQUILIBRIUM VS SUB-DETECTION (Q5):
- Competing Positions: True solitary G0 cellular quiescence vs. micrometastatic balanced growth/death equilibrium vs. continuous sub-detection growth.
- Why Resolving Matters: Radical divergence: kill dormant cells, lock dormancy indefinitely, boost immune surveillance, or refine liquid biopsy.
- Epistemic Grounding: PERK-eIF2α cholesterol axis; Gompertzian growth kinetics; first-passage time distributions; observational limits.

6. GENETIC SEQUENCING VS NON-GENETIC CELL STATES (Q6):
- Competing Positions: Genomic determinism (actionable DNA drivers) vs. isogenic epigenetic/metabolic/spatial state heterogeneity.
- Why Resolving Matters: Determines if single DNA panels suffice or clinical practice requires serial spatial single-cell proteogenomics.
- Epistemic Grounding: Drug-tolerant persister (DTP) chromatin states; high-dimensional Waddington energy landscapes; genetic reductionism critique.

7. EARLY DETECTION: SIGNAL MINIMIZATION VS DANGER PRIORITIZATION (Q7):
- Competing Positions: Detecting the smallest possible ctDNA/methylation signal vs. selectively prioritizing lethal malignancies to prevent overdiagnosis.
- Why Resolving Matters: Screening goal is lowering mortality, not inflating diagnosis count; prevents invasive iatrogenic harms.
- Epistemic Grounding: Bayesian PPV in low-prevalence cohorts; CHIP somatic confounders; Non-maleficence (Primum non nocere).

8. DRUG RESISTANCE ORIGIN: PRE-EXISTING CLONES VS THERAPY-INDUCED PLASTICITY (Q8):
- Competing Positions: Darwinian selection of rare pre-existing mutant clones vs. therapy-induced phenotype switching & persister states.
- Why Resolving Matters: If pre-existing: upfront combination therapy. If adaptive: timed intermittent/adaptive regimens and state-transition blockers.
- Epistemic Grounding: Luria-Delbrück fluctuation analysis; non-equilibrium Markov jump processes; Darwinian vs Lamarckian philosophy.`,
    stanceCards: [
      {
        id: 'sc-8q-1',
        title: 'Stemness as Reversible Plastic State (Q1)',
        claim:
          'Stemness is a reversible, microenvironment-instructed cell state rather than an immutable cell hierarchy, requiring combination therapies that block plastic dedifferentiation.',
        reasoning:
          'ATAC-seq and single-cell barcoding demonstrate that surviving non-stem cancer cells readily re-acquire tumor-initiating capacity under cytotoxic stress.',
        confidence: 85,
        isActive: true,
        lens: 'scientific',
      },
      {
        id: 'sc-8q-2',
        title: 'Hybrid E/M & Cluster Superiority (Q2)',
        claim:
          'Metastatic colonization is driven by hybrid epithelial-mesenchymal states and collective CTC clusters rather than complete binary EMT.',
        reasoning:
          'Non-linear tristable toggle switches and clinical CTC cluster profiling reveal 50x higher metastatic fitness in hybrid clusters.',
        confidence: 90,
        isActive: true,
        lens: 'mathematical',
      },
      {
        id: 'sc-8q-3',
        title: 'Neutral Somatic Drift (Q3)',
        claim:
          'A substantial fraction of subclonal intratumoral diversity arises via neutral genetic drift, meaning not every detected mutation represents an actionable fitness advantage.',
        reasoning:
          'Whole-genome sequencing across multiple tumor regions frequently fits 1/f power-law neutral allele frequency distributions.',
        confidence: 80,
        isActive: true,
        lens: 'philosophical',
      },
      {
        id: 'sc-8q-4',
        title: 'Dual Stroma Preservation (Q4)',
        claim:
          'Therapeutic strategies must selectively reprogram pro-tumor stromal states while preserving tumor-restraining stromal capsules to prevent rapid metastatic release.',
        reasoning:
          'Clinical trial terminations in pancreatic cancer (Sonic Hedgehog inhibitors) prove that blanket stroma depletion accelerates malignancy.',
        confidence: 90,
        isActive: true,
        lens: 'moral',
      },
      {
        id: 'sc-8q-5',
        title: 'Non-Genetic Persister Tolerance (Q6/Q8)',
        claim:
          'Initial drug resistance is primarily an adaptive, non-genetic persister state that can be targeted via epigenetic locks before genetic mutations cement resistance.',
        reasoning:
          'Isogenic single-cell line tracing shows reversible chromatin remodeling (H3K4 demethylation) precedes genetic mutation emergence.',
        confidence: 85,
        isActive: true,
        lens: 'scientific',
      },
    ],
    recommendedPersonas: [
      {
        role: 'Evolutionary Systems Biologist & Game Theorist',
        description: 'Models clonal selection, neutral drift, and adaptive pulsed therapy scheduling.',
        primaryLens: 'mathematical',
      },
      {
        role: 'Translational Epigeneticist & Plasticity Specialist',
        description: 'Focuses on chromatin accessibility, reversible stemness, and drug-tolerant persister states.',
        primaryLens: 'scientific',
      },
      {
        role: 'Philosopher of Medicine & Decision Scientist',
        description: 'Deconstructs reductionist dogmas, definition of disease, and overdiagnosis ethics.',
        primaryLens: 'philosophical',
      },
      {
        role: 'Clinical Bioethicist & QALY Lead',
        description: 'Assesses overdiagnosis trade-offs, screening harms, and patient quality of life.',
        primaryLens: 'moral',
      },
    ],
    tumorQuestions: TUMOR_RESEARCH_QUESTIONS_8,
    hardestQuestions: HARDEST_QUESTIONS_CANCER,
    interconnectedChain: [
      {
        step: '01',
        title: 'Reversible Stemness & Epigenetic Priming (Q1 / Q6)',
        description: 'Cell state transitions and chromatin remodeling prime tumor-initiating capacity.',
        bottleneck: 'Distinguishing intrinsic hierarchical CSCs from microenvironment-driven plastic dedifferentiation.',
      },
      {
        step: '02',
        title: 'Intratumoral Heterogeneity: Selection vs Drift (Q3)',
        description: 'Tumor diversifies through a mixture of Darwinian selection and neutral drift.',
        bottleneck: 'Over-interpreting neutral passenger mutations as actionable therapeutic targets.',
      },
      {
        step: '03',
        title: 'Microenvironmental Niche Dynamics (Q4)',
        description: 'Stroma acts as both mechanical barrier and immunosuppressive collaborator.',
        bottleneck: 'Indiscriminate stroma depletion accidentally destroying protective host restraint capsules.',
      },
      {
        step: '04',
        title: 'Hybrid Dissemination & Dormant Seeding (Q2 / Q5)',
        description: 'Hybrid E/M CTC clusters seed foreign organs and enter metabolic dormancy.',
        bottleneck: 'Differentiating true cellular quiescence from dynamic immune-mediated equilibrium.',
      },
      {
        step: '05',
        title: 'Early Interception & Adaptive Resistance (Q7 / Q8)',
        description: 'Screening dilemmas and therapy-induced persister states dictate patient survival.',
        bottleneck: 'Balancing ultra-early detection against overdiagnosis while preventing adaptive resistance.',
      },
    ],
  },
  {
    id: 'five-hardest-questions-oncology',
    name: 'Intractable Oncology: The 5 Hardest Questions (Quad-Lens Synthesis)',
    badge: 'QUAD-LENS FOUNDATIONAL',
    topic:
      'Intractable Oncology: Resolving the 5 Hardest Questions of Cancer Across Philosophical, Moral, Mathematical, and Empirical Frontiers',
    materials: `FOUNDATIONAL SYNTHESIS: THE FIVE HARDEST QUESTIONS OF ONCOLOGY
Across Scientific, Mathematical, Philosophical, and Moral/Ethical Dimensions

OVERVIEW & THE CENTRAL PARADOX:
Cancer is not a single disease entity, but an emergent evolutionary phenomenon of multicellular life. A single "cure" is a categorical error. Resolving cancer requires deconstructing the 5 hardest interconnected questions:

1. THE INITIATION QUESTION (Why normal cells turn cancerous at one time, in one person, in one tissue):
- Scientific: Driver mutations alone are insufficient. Normal skin and esophagus contain massive clone expansions harboring NOTCH1/TP53 mutations without cancer. Microenvironment stiffness, chronic inflammation, and immune tolerance are co-requisite.
- Mathematical: Multi-stage Poisson arrival process; non-linear percolation thresholds.
- Philosophical: Tension between deterministic causality and irreducible thermodynamic/quantum copying stochasticity.
- Moral: Avoiding catastrophic population-wide over-diagnosis and toxic intervention in benign clonal hematopoiesis/somatic expansions.

2. THE EVOLUTIONARY QUESTION (Mapping and outmaneuvering tumor evolution):
- Scientific: Intratumoral heterogeneity and spatial microclimates. Maximum Tolerated Dose (MTD) creates a selective bottleneck, eradicating sensitive cells and selecting for pan-resistant clones.
- Mathematical: Evolutionary Game Theory (replicator dynamics), Lotka-Volterra competition, and adaptive therapy cycling.
- Philosophical: The tumor as a decentralized ecological swarm rather than an integrated organism.
- Moral: Shifting oncology from "Total War / Host Poisoning" to "Evolutionary Containment & Chronic Coexistence."

3. THE METASTASIS & DORMANCY QUESTION (Preventing or eliminating disseminated cells):
- Scientific: Disseminated tumor cells (DTCs) enter quiescent dormancy via PERK-eIF2α and cholesterol biosynthesis. STING agonists (ADU-S100) failed pharmacokinetically.
- Mathematical: Absorbing Markov chains and high-dimensional attractor landscape escape times.
- Philosophical: The ontological ambiguity of the "dormant state"—cured vs perpetually colonized.
- Moral: The ethics of treating asymptomatic Minimal Residual Disease (MRD) with toxic therapies without proven overall survival benefit.

4. THE IMMUNOLOGICAL BOUNDARY QUESTION (Destroying cancer without fatal autoimmunity):
- Scientific: Tumors are altered self. High-affinity TCRs risk fatal irAEs (myocarditis, encephalitis); low-affinity TCRs allow tumor escape.
- Mathematical: Information-theoretic signal-to-noise ratio in kinetic proofreading; multi-objective Pareto optimization.
- Philosophical: The immunological boundary of the "Self"—asking the immune system to violate its own foundational tolerance.
- Moral: The risk-benefit threshold of accepting a 10% fatal autoimmune toxicity risk for a 30% durable curative potential.

5. THE SELECTIVITY & QUALITY OF LIFE QUESTION (Killing cancer while preserving the host):
- Scientific: Shared dependency on core biological machinery. Breakthroughs in ADCs, PROTACs, synthetic lethality (PARP/BRCA), and CLDN18.2 targeting.
- Mathematical: Maximizing the Therapeutic Index (TI) under multidimensional organ toxicity constraints.
- Philosophical: The definition of medical healing—Primum Non Nocere vs radical curative toxicity.
- Moral: Preserving Quality-Adjusted Life Years (QALY) and protecting pediatric/elderly cohorts from lifelong debilitating toxic sequelae.

THE INTERCONNECTED PROGRESSION CHAIN:
Somatic Transformation (Q1) → Subclonal Heterogeneity & Evolutionary Selection (Q2) → Circulating Dissemination & Dormant Seeding (Q3) → Immune Tolerance & Microenvironment Evasion (Q4) → Systemic Therapy Bottleneck & Collateral Toxicity (Q5).`,
    stanceCards: [
      {
        id: 'sc-5hq-1',
        title: 'H1: Stochasticity & Niche Priming (Q1)',
        claim:
          'Malignant transformation is an emergent microenvironmental niche transition governed by stochastic Poisson dynamics, not a deterministic single-gene event.',
        reasoning:
          'Normal human tissue harbors thousands of oncogenic driver mutations (TP53, NOTCH1) without forming tumors until tissue architecture and immune checkpoints fail.',
        confidence: 90,
        isActive: true,
        lens: 'scientific',
      },
      {
        id: 'sc-5hq-2',
        title: 'H2: Evolutionary Game Theory & Adaptive Dosing (Q2)',
        claim:
          'Maximum-tolerated-dose chemotherapy is counter-productive; adaptive game-theoretic dosing that preserves a pool of drug-sensitive competitor cells yields superior long-term survival.',
        reasoning:
          'Lotka-Volterra modeling and clinical adaptive trials in prostate cancer show that competitive suppression prevents resistant clones from expanding exponentially.',
        confidence: 85,
        isActive: true,
        lens: 'mathematical',
      },
      {
        id: 'sc-5hq-3',
        title: 'H3: Epigenetic Metabolic Dormancy Lock (Q3)',
        claim:
          'Permanent metastatic dormancy via targeted metabolic locking (e.g. inhibiting PERK-eIF2α reactivation) is clinically superior to attempting total eradication of disseminated cells.',
        reasoning:
          'Disseminated cells in bone marrow and liver are shielded by specialized niches; forcing them to stay dormant prevents 90% of lethal macro-metastases.',
        confidence: 85,
        isActive: true,
        lens: 'philosophical',
      },
      {
        id: 'sc-5hq-4',
        title: 'H4: Pareto Immune Discrimination Bound (Q4)',
        claim:
          'The fundamental barrier to immunotherapy is the information-theoretic limit of self/non-self TCR discrimination, which imposes a mathematical upper bound on tumor kill without irAE autoimmunity.',
        reasoning:
          'Tumor antigens are 99.9% identical to normal proteome; breaking tolerance inevitably triggers low-frequency catastrophic organ attack.',
        confidence: 80,
        isActive: true,
        lens: 'mathematical',
      },
      {
        id: 'sc-5hq-5',
        title: 'H5: QALY Stewardship & Synthetic Lethality (Q5)',
        claim:
          'Ethical oncology must prioritize high-therapeutic-index synthetic lethality and ADCs over broad cytotoxic escalation to safeguard patient Quality of Life and dignity.',
        reasoning:
          'Survival duration without organ integrity or cognitive function violates non-maleficence; precision molecular glues spare healthy tissue.',
        confidence: 90,
        isActive: true,
        lens: 'moral',
      },
    ],
    recommendedPersonas: [
      {
        role: 'Mathematical Oncologist & Game Theorist',
        description: 'Specializes in evolutionary dynamics, Lotka-Volterra competition, and adaptive therapy scheduling.',
        primaryLens: 'mathematical',
      },
      {
        role: 'Bioethicist & QALY Stewardship Lead',
        description: 'Evaluates quality-of-life trade-offs, over-diagnosis ethics, and distributive justice in oncology.',
        primaryLens: 'moral',
      },
      {
        role: 'Philosopher of Biology & Systems Epistemologist',
        description: 'Deconstructs the self/non-self immunological paradigm, teleological fallacies, and emergence.',
        primaryLens: 'philosophical',
      },
      {
        role: 'Translational Immuno-Proteomicist',
        description: 'Grounds discourse in single-cell ATAC-seq, virtual proteomics (HEX), and clinical trial endpoints.',
        primaryLens: 'scientific',
      },
    ],
    tumorQuestions: TUMOR_RESEARCH_QUESTIONS_8,
    hardestQuestions: HARDEST_QUESTIONS_CANCER,
    interconnectedChain: [
      {
        step: '01',
        title: 'Malignant Initiation & Stochastic Hit',
        description: 'A cell acquires somatic driver mutations in a permissive, aging tissue niche.',
        bottleneck: 'Distinguishing pathogenic nucleation from benign somatic mosaicism.',
      },
      {
        step: '02',
        title: 'Subclonal Diversification & Evolutionary Drift',
        description: 'The tumor develops dense spatial heterogeneity and competing Darwinian sub-lineages.',
        bottleneck: 'Standard cytotoxic therapy inadvertently selects for aggressive pan-resistant clones.',
      },
      {
        step: '03',
        title: 'Vascular Dissemination & Epigenetic Dormancy',
        description: 'Micrometastases intravasate and seed distant organs, entering years-long quiescent sleep.',
        bottleneck: 'Quiescent cells are metabolically silent and impervious to standard cell-cycle therapies.',
      },
      {
        step: '04',
        title: 'Immune Tolerance Evasion & Microenvironment Camouflage',
        description: 'Tumor alters HLA presentation, builds fibrous stroma, and recruits immunosuppressive Tregs/MDSCs.',
        bottleneck: 'Over-activating T-cells breaks peripheral tolerance, inducing fatal autoimmune toxicity.',
      },
      {
        step: '05',
        title: 'Therapeutic Collateral Toxicity & Quality of Life Ceiling',
        description: 'Systemic treatments poison host organ reserves, limiting curative dose and duration.',
        bottleneck: 'Narrow therapeutic window between malignant eradication and patient organ failure.',
      },
    ],
    evidenceBriefs: [
      {
        field: 'Question 1: Malignant Initiation & Stochasticity',
        tag: 'POISSON STOCHASTICITY',
        summary:
          'Driver mutations exist extensively in normal human skin and esophagus without malignancy. Cancer requires the convergence of somatic hits, tissue stiffness, chronic inflammatory signaling, and immune evasion.',
        citations: ['cancer.gov/about-cancer/causes-prevention/genetics', 'Science Somatic Mutations in Normal Tissues', 'Tomasetti & Vogelstein Science 2015'],
        aiStatus: 'Foundation models predict mutational impact but fail to model whole-tissue microenvironment permissiveness.',
        lens: 'scientific',
      },
      {
        field: 'Question 2: Evolutionary Maneuvers & Heterogeneity',
        tag: 'GAME THEORY & ADAPTIVE DOSING',
        summary:
          'Tumors are evolving ecosystems. Maximum Tolerated Dose (MTD) creates fierce selective pressure, wiping out drug-sensitive competitors and fueling rapid resistant relapse. Adaptive therapy uses pulsed dosing to maintain competitive suppression.',
        citations: ['pmc.ncbi.nlm.nih/PMC12623568', 'Nature Reviews Cancer Adaptive Therapy', 'Gatenby et al. Nature 2009'],
        aiStatus: 'Reinforcement learning and evolutionary game simulation actively optimize patient-specific dosing schedules.',
        lens: 'mathematical',
      },
      {
        field: 'Question 3: Metastatic Dormancy & Colonization',
        tag: 'EPIGENETIC DORMANCY LOCK',
        summary:
          'Metastatic disseminated tumor cells (DTCs) utilize the PERK-eIF2α cholesterol biosynthesis axis to escape drug pressure and remain dormant for decades. STING agonism translation is held back by pharmacokinetic stability.',
        citations: ['cancer.gov/metastasis-dormant-cancer-cells', 'JCI 2026 PERK-eIF2α Dormancy', 'Massagué Nature 2023'],
        aiStatus: 'Single-cell foundation models (AlphaGenome, CIMA-CLM) lack dormancy-specific state transition training.',
        lens: 'philosophical',
      },
      {
        field: 'Question 4: Immune Discrimination & Autoimmunity',
        tag: 'SELF/NON-SELF DISCRIMINATION',
        summary:
          'Because cancer is altered self, high-affinity immune activation risks lethal myocarditis and encephalitis (irAEs). Bispecifics (BiTEs) and logic-gated CAR-Ts (AND/NOT gates) represent the forefront of precision discrimination.',
        citations: ['biospace.com/cancer-grand-challenges', 'Nature Reviews Immunology Immunoediting', 'Lancet Oncology irAEs'],
        aiStatus: 'Deep learning models predict neoantigen presentation but struggle with off-target autoimmune cross-reactivity.',
        lens: 'moral',
      },
      {
        field: 'Question 5: Therapeutic Selectivity & Quality of Life',
        tag: 'SYNTHETIC LETHALITY & QALY',
        summary:
          'Synthetic lethality (PARP inhibitors in BRCA-null cells), Antibody-Drug Conjugates (ADCs), and molecular glues spare healthy dividing tissues. True cure requires preserving long-term cognitive and organ function.',
        citations: ['cancer.gov/side-effects', 'Nature Biotechnology ADCs 2026', 'NEJM Childhood Cancer Long-Term Toxicity'],
        aiStatus: 'Structure-guided AI generates potent binders, but in vivo toxicological biodistribution remains empirical.',
        lens: 'moral',
      },
    ],
    forecastTable: [
      {
        field: 'Prevention & Early Interception (Q1)',
        development: 'Multi-cancer liquid biopsy + tissue-mechanics imaging intercepts pre-malignant clonal shifts.',
        aiRole: 'Anomaly Detection & Spatial Pattern Matching',
      },
      {
        field: 'Adaptive Evolutionary Oncology (Q2)',
        development: 'Phase III clinical trials validate game-theoretic pulsed dosing over continuous MTD chemotherapy.',
        aiRole: 'Dynamic Controller & Clonal Trajectory Forecaster',
      },
      {
        field: 'Metastatic Dormancy Interception (Q3)',
        development: 'First-in-class metabolic dormancy locks prevent disseminated micrometastases from awakening.',
        aiRole: 'Epigenetic Attractor Simulation',
      },
      {
        field: 'Logic-Gated Immunotherapy (Q4)',
        development: 'Synthetic AND/NOT gated CAR-Ts achieve zero lethal autoimmune toxicity across solid tumors.',
        aiRole: 'Combinatorial Surface Antigen Optimization',
      },
      {
        field: 'High-Selectivity Molecular Glues (Q5)',
        development: 'Degradation of previously "undruggable" drivers (MYC, oncogenic RAS) with minimal organ damage.',
        aiRole: 'Ternary Complex & PROTAC Structure Prediction',
      },
    ],
  },
  {
    id: 'underfunded-cancer-research',
    name: 'Underfunded Cancer Research: Epigenetic & Proteomic Frontiers',
    badge: 'FEATURED RESEARCH',
    topic:
      'Underfunded Cancer Research: Resolving Metastatic Dormancy, Functional Proteomics, and AI Drug Discovery Bottlenecks',
    materials: `COMPREHENSIVE RESEARCH SYNTHESIS: UNDERFUNDED CANCER RESEARCH

1. METASTATIC DORMANCY: THE EPIGENETIC FRONTIER
- STING Agonist Translation: 2023 MSK discovery proved STING suppresses dormant metastasis reactivation, but all ADU-S100 trials terminated due to pharmacokinetic failure (low serum stability, enzymatic degradation), not target invalidity.
- 2026 Mechanism: Targeted therapies in lung cancer (EGFR, KRAS, ALK inhibitors) induce cholesterol biosynthesis via PERK-eIF2α axis, actively pushing cancer cells into dormancy as a drug-escape mechanism (confirmed by ATAC-seq chromatin accessibility at cholesterol gene promoters).
- AI Landscape & Gaps: AlphaGenome (DeepMind, Nature Jan 2026) predicts chromatin accessibility at single-base resolution but is trained on bulk tissue/cell-lines (cannot model cell-state transitions or dormant single cells). CIMA-CLM (Science Jan 2026) integrates chromatin sequences with scRNA-seq (AUROC 0.9560) but was trained on immune cells. Crucial gap: No foundation model trained on single-cell epigenomics of dormant cancer cells to predict reawakening timing.

2. CANCER NEUROSCIENCE: BENCH TO PHASE II
- Clinical Pipeline: Phase II propranolol in gastric/esophageal/bladder cancers; Botulinum toxin A in prostate cancer (NCT01520441; denervation reduced mitochondrial load near nerve bundles); Tanezumab (anti-NGF) in bone metastases (NCT02609828).
- Stage-Dependent Denervation (2025-2026): In colorectal models, sympathetic/parasympathetic denervation works in early carcinogenesis, whereas parasympathetic denervation is superior in advanced tumors.
- Adrenergic Biology Context: Beta-blockers show HR 0.91 when combined with immunotherapy in melanoma/breast, but potential harm in pancreatic/HNSCC. AI's role is trial stage-stratification and cross-cancer adrenergic literature integration.

3. CANCER CACHEXIA: TARGET DIVERSIFICATION
- Pipeline: Ponsegromab (Phase 3 underway; Phase 2 showed +1.22 kg median weight gain over placebo for 64 weeks); Visugromab (CatalYm Phase 2 in NSCLC/HCC/bladder); GFS202A (GenFleet world's first GDF-15/IL-6 bispecific); TCMCB07 (prophylactic Phase 2 in stage IV CRC); HIF2 inhibitors (belzutifan, NKT2152 rapidly ameliorated cachexia in RCC without tumor shrinkage).
- Landscape: 44 unique GDF-15 drug programs. Refutes the claim that cachexia is a solved single-mechanism pathway.

4. FUNCTIONAL PROTEOMICS: AI AS ESSENTIAL INFRASTRUCTURE
- HEX Virtual Spatial Proteomics (Nature Medicine, Jan 2026): Generates 40 virtual spatial biomarkers directly from routine H&E histopathology slides (trained on 819,000 tiles; mean Pearson r ≈ 0.79). Combined with MICA fusion model, improved NSCLC prognosis by 22% and immunotherapy prediction by 24-39% across 2,298 patients. Democratizes proteomics for underfunded cancers without expensive mass spectrometry hardware.
- Hardware & MS: ASMS 2026 Thermo Fisher Orbitraps, Seer deep plasma proteomics (60 samples/day, 10,000+ proteins). CPTAC proteogenomic dataset provides 1,000+ harmonized tumor profiles. Missing: End-to-end orchestration AI turning raw MS into target nominations.

5. UNDERFUNDED CANCERS: AI EQUALIZER VS FUNDING REALITIES
- CDK20 validation (Insilico 30-day hit, 210 nM affinity); Rentosertib (INS018_055) Phase 3; Isomorphic Labs first oncology trials 2026.
- Translation Reality: ~175 AI-originated programs entered clinic; zero FDA approvals to date. Validated targets driving actual breakthroughs: Zolbetuximab (CLDN18.2), MYC inhibitors (Omomyc, IDB-003, ARK-175876 >75% reduction), oral RAS(ON).`,
    stanceCards: [
      {
        id: 'sc-cancer-1',
        title: 'H1: Virtual Proteomics as Hardware Equalizer',
        claim:
          'Virtual spatial proteomics (such as the HEX model mapping 40 markers from routine H&E slides) democratizes target discovery for underfunded cancers without needing multi-million dollar MS platforms.',
        reasoning:
          'HEX achieved Pearson r=0.79 across 40 markers and boosted NSCLC prognostic accuracy by 22% directly from standard hospital histology.',
        confidence: 90,
        isActive: true,
        lens: 'scientific',
      },
      {
        id: 'sc-cancer-2',
        title: 'H2: Active Epigenetic/Metabolic Dormancy',
        claim:
          'Dormancy is an active, therapeutically inducible metabolic program (via the PERK-eIF2α cholesterol biosynthesis axis), requiring metabolic disruption rather than cytotoxic escalation.',
        reasoning:
          'ATAC-seq confirms targeted therapies in lung cancer push cells into dormancy through active chromatin accessibility changes.',
        confidence: 85,
        isActive: true,
        lens: 'scientific',
      },
      {
        id: 'sc-cancer-3',
        title: 'H3: Multi-Target Cachexia Diversification',
        claim:
          'Cachexia is not a single-target problem; multi-pathway bispecifics (e.g. GDF-15 + IL-6 dual antagonism) and tissue-specific drivers (HIF2) are necessary for clinical reversal.',
        reasoning:
          '44 clinical programs and HIF2 inhibitor efficacy in RCC without tumor shrinkage prove distinct molecular drivers per cancer type.',
        confidence: 85,
        isActive: true,
        lens: 'moral',
      },
      {
        id: 'sc-cancer-4',
        title: 'H4: Stage-Dependent Cancer Neuroscience',
        claim:
          'Neuro-oncology interventions (denervation, beta-blockers) are strictly stage-dependent and context-specific, requiring AI-driven trial stratification to succeed.',
        reasoning:
          'Sympathetic denervation functions in early carcinogenesis while parasympathetic is effective in advanced tumors; beta-blockers show opposite effects across tumor types.',
        confidence: 80,
        isActive: true,
        lens: 'mathematical',
      },
      {
        id: 'sc-cancer-5',
        title: 'H5: AI Drug Discovery Translation Bottleneck',
        claim:
          'The zero FDA approval rate among 175+ clinical AI drug programs proves that clinical translation is bottlenecked by PK/PD and in vivo disease biology, not in silico hit generation.',
        reasoning:
          'Structure prediction is solved and fast, but target validation and drug delivery (like STING agonist PK failures) remain the true gating bottlenecks.',
        confidence: 85,
        isActive: true,
        lens: 'philosophical',
      },
    ],
    recommendedPersonas: [
      {
        role: 'Translational Epigeneticist',
        description: 'Focuses on chromatin remodeling, single-cell dormancy dynamics, and PERK-eIF2α metabolic escape.',
        primaryLens: 'scientific',
      },
      {
        role: 'Clinical Proteomics & High-Throughput MS Lead',
        description: 'Champions virtual spatial proteomics (HEX) and high-throughput Orbitrap proteogenomics.',
        primaryLens: 'scientific',
      },
      {
        role: 'Mathematical Neuro-Oncologist',
        description: 'Specializes in stage-dependent autonomic innervation and adrenergic receptor modeling.',
        primaryLens: 'mathematical',
      },
      {
        role: 'Oncology Pharma VC & Bioethicist',
        description: 'Evaluates PK/PD roadblocks, zero FDA approval rates for AI molecules, and capital allocation ethics.',
        primaryLens: 'moral',
      },
    ],
    tumorQuestions: TUMOR_RESEARCH_QUESTIONS_8,
    hardestQuestions: HARDEST_QUESTIONS_CANCER,
    evidenceBriefs: [
      {
        field: 'Metastatic Dormancy',
        tag: 'EPIGENETIC FRONTIER',
        summary:
          'Targeted therapies induce cholesterol biosynthesis via PERK-eIF2α to push cells into dormancy. STING agonism halted by PK failures. Critical need for dormancy-specific single-cell epigenomic foundation models.',
        citations: ['pmc.ncbi.nlm.nih/12470042', 'jci.org/articles/191735', 'Nature (AlphaGenome Jan 2026)', 'Science (CIMA-CLM Jan 2026)'],
        aiStatus: 'Models exist (AlphaGenome, CIMA-CLM) but lack dormant single-cell training and state-transition logic.',
        lens: 'scientific',
      },
      {
        field: 'Cancer Neuroscience',
        tag: 'STAGE-STRATIFIED TRIAL DESIGN',
        summary:
          'Phase II beta-blockers, Botox in prostate cancer, and Tanezumab. Denervation efficacy is stage-dependent (sympathetic early vs. parasympathetic advanced). Beta-blockers benefit melanoma (HR 0.91) but may harm pancreatic.',
        citations: ['NCT01520441 (Prostate Botox)', 'NCT02609828 (Tanezumab)', 'nature.com/articles/s41392-025-02364-y'],
        aiStatus: 'Immediate utility in cross-cancer adrenergic literature synthesis and Phase II patient stratification.',
        lens: 'mathematical',
      },
      {
        field: 'Cancer Cachexia',
        tag: '44 DRUG PROGRAMS',
        summary:
          'Ponsegromab in Phase 3 (+1.22 kg gain over 64 weeks). Emergence of GFS202A (GDF-15 + IL-6 bispecific) and HIF2 inhibitors (belzutifan). Proves cachexia is multifaceted, not single-mechanism.',
        citations: ['eureka.patsnap.com GDF15 2026', 'delveinsight.com Cachexia Trials', 'pmc.ncbi.nlm.nih/12823431'],
        aiStatus: 'Tactical accelerator for antibody engineering and multi-target combinatorial discovery.',
        lens: 'moral',
      },
      {
        field: 'Functional Proteomics',
        tag: 'HEX VIRTUAL PROTEOMICS',
        summary:
          'HEX generates 40 spatial protein markers from standard H&E histology slides (Pearson r=0.79, NSCLC prognosis +22%). High-throughput MS reaches 60 samples/day with 10k proteins quantified.',
        citations: ['Nature Medicine (HEX Jan 2026)', 'ASMS 2026 Orbitraps', 'CPTAC Consortium'],
        aiStatus: 'Essential infrastructure. Missing link is an automated orchestration AI turning raw MS to target nominations.',
        lens: 'scientific',
      },
      {
        field: 'Underfunded Cancers',
        tag: 'AI REALITY CHECK',
        summary:
          '175 AI programs in human trials with zero FDA approvals. Major clinical wins coming from validated biology: Zolbetuximab (CLDN18.2), MYC degraders (>75% reduction), oral RAS(ON).',
        citations: ['Nature Medicine (Rentosertib Ph 2a)', 'Isomorphic Labs 2026', 'nature.com/articles/s41392-026-02606-7'],
        aiStatus: 'Hits and structure predictions are fast, but downstream pharmacology and in vivo assays remain the gating step.',
        lens: 'philosophical',
      },
    ],
    forecastTable: [
      {
        field: 'Functional Proteomics',
        development: '"Proteomics in a box" enables any university lab to map druggable proteome in 6 months.',
        aiRole: 'Essential Infrastructure',
      },
      {
        field: 'Metastatic Dormancy',
        development: 'Single-cell epigenomic atlases → First dormancy-specific foundation models → ctDNA-methylation predictors.',
        aiRole: 'Potentially Massive (Needs New Models)',
      },
      {
        field: 'Cancer Cachexia',
        development: 'First FDA approval (ponsegromab ~2027–2028) → Multi-target precision combinations.',
        aiRole: 'Tactical Accelerator',
      },
      {
        field: 'Cancer Neuroscience',
        development: 'Phase III of beta-blocker + checkpoint inhibitor in selected cancer types.',
        aiRole: 'Literature Integrator & Trial Stratifier',
      },
      {
        field: 'Underfunded Cancers',
        development: 'First AlphaFold-to-Phase 1 molecules report clinical efficacy data.',
        aiRole: 'Timeline Compressor (Funding-Constrained)',
      },
    ],
  },
  {
    id: 'survivorship-accountability',
    name: 'Survivorship Care Accountability & Closed-Loop Verification',
    badge: 'CLINICAL WORKFLOW',
    topic:
      'Survivorship Accountability System: Replacing static care plan PDFs with longitudinal, closed-loop tracking to verify guideline-concordant surveillance',
    materials: `Scientific Basis & Clinical Trial Findings:
- Over 20 years of RCTs demonstrate that static Survivorship Care Plans (SCPs) fail to improve outcomes, primarily due to catastrophic information loss during patient handoffs between oncology and primary care.
- Guideline-concordant surveillance (e.g. NCCN surveillance intervals for recurrence and secondary malignancies) falls off precipitously after 12 months.
- Core mechanism: Closed-loop deterministic verification with automated escalation (Patient -> PCP -> Nurse Navigator) vs. passive portal delivery.
- Low-complexity rules engine vs. generative/ML algorithms to minimize regulatory/liability burden.`,
    stanceCards: [
      {
        id: 'sc-surv-1',
        title: 'H1: Information Loss at Handoff',
        claim:
          'The dominant failure mode is loss of information at the handoff, not patient non-compliance or poor plan quality.',
        reasoning: '20 years of RCTs tested format; closed-loop tracking was never the intervention.',
        confidence: 90,
        isActive: true,
        lens: 'scientific',
      },
      {
        id: 'sc-surv-2',
        title: 'H2: Closed-Loop Escalation',
        claim:
          'An escalation mechanism (patient -> PCP -> navigator) recovers a meaningful fraction of missed surveillance events.',
        reasoning: 'This is the active recovery mechanism preventing late-stage missed recurrences.',
        confidence: 85,
        isActive: true,
        lens: 'mathematical',
      },
      {
        id: 'sc-surv-3',
        title: 'H3: Deterministic Rules Engine',
        claim:
          'A deterministic NCCN rules engine is sufficient — no ML/AI is required to generate correct schedules.',
        reasoning: 'Keeps liability, FDA regulatory burden, and developer complexity minimal for solo execution.',
        confidence: 95,
        isActive: true,
        lens: 'philosophical',
      },
      {
        id: 'sc-surv-4',
        title: 'H4: Integration Friction Bottleneck',
        claim:
          'Integration friction into clinician workflow is a bigger adoption barrier than tracking logic.',
        reasoning: 'Determines direct-to-patient vs. B2B enterprise EHR go-to-market strategy.',
        confidence: 80,
        isActive: true,
        lens: 'moral',
      },
    ],
  },
  {
    id: 'scenario-doctors-under-pressure',
    name: 'Doctors Under Pressure: Emergency Oncological Resection vs. Palliative Stenting',
    badge: 'HIGH-STAKES CLINICAL ER',
    topic: 'High-Stakes ICU/ER Emergency Procedure: Immediate Surgical Cytoreduction & Decompression vs. Endovascular Stenting & Targeted Stabilization in Acute Metastatic Superior Vena Cava (SVC) Syndrome with Impending Airway Collapse',
    materials: `HIGH-STAKES ER/ICU CLINICAL CASE & DECISION BRIEF:
Patient: 58-year-old presenting to the Emergency Department in acute respiratory distress with severe stridor, facial edema, hemodynamic instability (BP 85/50), and massive mediastinal/pulmonary malignancy causing 95% Superior Vena Cava (SVC) compression and impending tracheal collapse.

CLINICAL DILEMMA & TIME PRESSURE:
- Time window to execute primary procedure: < 45 minutes before complete airway obstruction.
- Tissue status: Uncharacterized tumor, no prior histological biopsy available.

PROCEDURAL OPTION A: Emergent Surgical Resection / Decompression (Open Thoracotomy)
- Rationale: Provides immediate open airway decompression, tumor debulking, and yields ample tissue for rapid frozen section, RNA-seq, and targeted therapy selection.
- Risk: High perioperative mortality (25-30%) under acute hemodynamic instability and anesthesia induction.

PROCEDURAL OPTION B: Endovascular Stenting + High-Dose Intravenous Dexamethasone
- Rationale: Minimally invasive, rapid symptomatic SVC relief within 2-4 hours, low procedure mortality (<3%).
- Risk: Leaves primary tumor untreated, risks stent migration/occlusion, high risk of tumor erosion into pulmonary artery, and delays definitive histological biopsy.

CLINICAL TEAM TENSION:
Emergency Trauma Surgeon demands immediate operating room transfer. Interventional Radiologist insists on emergency stent placement in angiosuite. Medical Oncologist refuses open surgery without biomarker profiling. Palliative ICU Director demands clarity on patient advance directives before catastrophic surgical mortality.`,
    stanceCards: [
      {
        id: 'sc-doc-1',
        title: 'Emergent Surgical Decompression',
        claim: 'Immediate open surgical decompression and debulking is mandatory to prevent fatal tracheal collapse and secure adequate tumor tissue for diagnostic profiling.',
        reasoning: 'Mechanical compression of the trachea cannot be safely relieved by stents alone when mediastinal mass effect threatens airway patency.',
        confidence: 85,
        isActive: true,
        lens: 'scientific',
      },
      {
        id: 'sc-doc-2',
        title: 'Endovascular Stenting First',
        claim: 'Immediate endovascular SVC stenting with high-dose steroids is the safest first-line intervention to stabilize hemodynamics and avoid perioperative death.',
        reasoning: 'Operative mortality of open thoracotomy in an unstable patient exceeds 25%; endovascular stenting achieves >90% rapid symptomatic relief with <3% complication rates.',
        confidence: 90,
        isActive: true,
        lens: 'mathematical',
      },
      {
        id: 'sc-doc-3',
        title: 'Diagnostic Biopsy Primacy',
        claim: 'No major irreversible surgical resection should proceed without immediate core needle biopsy to differentiate chemo-sensitive small cell carcinoma or lymphoma from non-small cell cancer.',
        reasoning: 'If the tumor is small-cell lung cancer or lymphoma, emergency chemotherapy and radiation will shrink the mass within 24 hours without surgical trauma.',
        confidence: 95,
        isActive: true,
        lens: 'philosophical',
      },
      {
        id: 'sc-doc-4',
        title: 'Palliative Goal Alignment',
        claim: 'In acute metastatic crisis with high surgical risk, procedure decisions must immediately align with patient-stated goals of care, avoiding heroic interventions that lead to ICU mortality.',
        reasoning: 'Heroic open surgery risks post-operative ventilator dependence and ICU death without patient consent.',
        confidence: 90,
        isActive: true,
        lens: 'moral',
      },
    ],
    recommendedPersonas: [
      {
        role: 'Trauma & Surgical Oncologist (Dr. Marcus Vance)',
        description: 'Decisive, high-pressure surgeon advocating immediate open decompression in the operating room.',
        primaryLens: 'scientific',
      },
      {
        role: 'Interventional Radiologist (Dr. Priya Sharma)',
        description: 'Pragmatic, minimally invasive specialist pushing immediate endovascular stenting in the angiosuite.',
        primaryLens: 'mathematical',
      },
      {
        role: 'Medical Oncologist & ICU Attending (Dr. Julian Thorne)',
        description: 'Evidence-driven oncologist insisting on urgent histological/genomic biopsy before irreversible surgery.',
        primaryLens: 'philosophical',
      },
      {
        role: 'Palliative Care & Bioethics Lead (Dr. Sarah Jenkins)',
        description: 'Patient advocate focusing on advance directives, perioperative mortality risks, and quality of life.',
        primaryLens: 'moral',
      },
    ],
  },
  {
    id: 'scenario-scientists-varying-methods',
    name: 'Methodological Clash: In-Silico AI Models vs. Wet-Lab Organoids vs. Human Epidemiology',
    badge: 'METHODOLOGICAL WAR',
    topic: 'Epistemic Validity in Oncological Discovery: Evaluating In-Silico AI Generative Simulation vs. Patient-Derived Wet-Lab Organoid Assays vs. Human Population Causal Inference for Target Discovery',
    materials: `TRI-METHODOLOGICAL EPISTEMIC WAR IN CANCER RESEARCH:
How should modern cancer research establish causal target validity before clinical trial deployment?

1. IN-SILICO GENERATIVE AI & COMPUTATIONAL BIOLOGY
- Capabilities: Graph neural networks, transformer-based protein modeling (AlphaFold3, ESM), and single-cell RNA-seq foundation models predict complex synthetic lethality and drug-target interactions in seconds.
- Critique: Suffers from "hallucinated biology", lack of biomechanical/spatial tumor microenvironment modeling, and overfitting on biased public databases (TCGA/GEO).

2. PATIENT-DERIVED WET-LAB ORGANOIDS & MICROFLUIDICS
- Capabilities: 3D patient-derived organoid (PDO) co-cultures with autologous immune cells and stromal matrices reproduce patient-specific drug response and histological architecture.
- Critique: High batch-to-batch variability, lack of systemic endocrine/vascular circulation, high expense, and slow 4-6 week culture timelines that limit high-throughput screening.

3. HUMAN POPULATION EPIDEMIOLOGY & MENDELIAN RANDOMIZATION
- Capabilities: Biobanks (UK Biobank, Million Veteran Program) and genetic instrumental variables (Mendelian Randomization) test true lifelong human genetic causality in vivo.
- Critique: Confounded by pleiotropy, population stratification, linkage disequilibrium, and unable to isolate intracellular enzymatic kinetics or acute state transitions.`,
    stanceCards: [
      {
        id: 'sc-meth-1',
        title: 'In-Silico Computation First',
        claim: 'Generative AI and structural foundation models must lead target discovery to bypass high-cost wet-lab screening and navigate vast biological search spaces.',
        reasoning: 'In-silico screens evaluate billions of molecular configurations in hours, preventing wasted capital on unviable empirical targets.',
        confidence: 85,
        isActive: true,
        lens: 'mathematical',
      },
      {
        id: 'sc-meth-2',
        title: 'Wet-Lab Organoid Primacy',
        claim: 'No computational prediction can be trusted for clinical trial translation without empirical validation in patient-derived 3D tumor organoids with stromal feedback.',
        reasoning: 'In-silico models fail to predict spatial drug penetration, microenvironmental pH/hypoxia gradients, and immune evasion.',
        confidence: 90,
        isActive: true,
        lens: 'scientific',
      },
      {
        id: 'sc-meth-3',
        title: 'Human Population Genetics Gold Standard',
        claim: 'Target validation must be anchored in Mendelian Randomization and biobank population genetics; targets lacking human genetic causality consistently fail in Phase III.',
        reasoning: 'Over 80% of targets validated solely in vitro or in silico fail in humans because model systems do not capture human systemic physiology.',
        confidence: 95,
        isActive: true,
        lens: 'philosophical',
      },
      {
        id: 'sc-meth-4',
        title: 'Closed-Loop Tri-Brid Pipeline',
        claim: 'Epistemic validity requires an integrated closed-loop pipeline where AI predicts hypotheses, organoids test mechanics, and Mendelian Randomization verifies human causality.',
        reasoning: 'Relying on any single methodology creates blind spots that drive the multi-billion-dollar clinical trial failure rate.',
        confidence: 90,
        isActive: true,
        lens: 'moral',
      },
    ],
    recommendedPersonas: [
      {
        role: 'Computational Systems Biologist (Dr. Alexander Chen)',
        description: 'Champion of neural network simulations, structural docking, and AI foundation models; skeptical of slow wet-lab throughput.',
        primaryLens: 'mathematical',
      },
      {
        role: 'Organoid & Tissue Bioengineer (Dr. Claire Sterling)',
        description: 'Pioneer in 3D patient-derived organoid microfluidics; exposes the flaws of simplified computational assumptions.',
        primaryLens: 'scientific',
      },
      {
        role: 'Population Geneticist & Epidemiologist (Dr. Isaac Osei)',
        description: 'Expert in Mendelian Randomization and biobank causality; insists that targets without human genetic validation are illusions.',
        primaryLens: 'philosophical',
      },
      {
        role: 'Epistemologist & Meta-Science Auditor (Dr. Hannah Croft)',
        description: 'Evaluates cross-scale translation pitfalls, bias in data pipelines, and criteria for scientific proof.',
        primaryLens: 'moral',
      },
    ],
  },
  {
    id: 'scenario-young-vs-veteran-scientist',
    name: 'Generational Paradigm Clash: Maverick CRISPR Gene-Circuit Reprogramming vs. Canonical Signaling Rigor',
    badge: 'PARADIGM CLASH',
    topic: 'Revolutionary vs. Evolutionary Oncology: Should Cancer Research Pivot to Multiplex CRISPR Synthetic Gene-Circuit Reprogramming or Double Down on Canonical Signal Transduction & Targeted Kinase Inhibition?',
    materials: `GENERATIONAL PARADIGM DEBATE IN ONCOLOGY:
The Conflict Between Radical Synthetic Biology and Empirical Signal Transduction.

THE REVOLUTIONARY PARADIGM (Young Ambitious Postdoc / Assistant Professor):
- Core Argument: 30 years of targeting single oncogenic driver kinases (EGFR, KRAS, BRAF) with small-molecule inhibitors has hit a wall of adaptive subclonal resistance and toxic side effects.
- Proposed Pivot: Multiplex CRISPR/Cas12a epigenome editing, synthetic logic-gated CAR-T circuits (AND/OR/NOT logic), and whole-genome spatial chromatin reprogramming to force malignant cells into terminal senescence or immune clearance.
- Mentality: "Science advances through paradigm shifts, not incremental modifications of failing frameworks."

THE EVOLUTIONARY PARADIGM (Veteran Department Chair / Nobel Laureate):
- Core Argument: 95% of flashy, hype-driven synthetic biology constructs fail in clinical trials due to catastrophic off-target CRISPR cutting, immunogenicity, delivery failure, and unpredicted systemic toxicity.
- Proposed Continuation: Deep, rigorous dissection of canonical signal transduction pathways (Ras/Raf/MEK, PI3K/Akt/mTOR, p53/ATM), rational multi-targeted small-molecule combinations, and rigorous pharmacokinetic/pharmacodynamic optimization.
- Mentality: "Bold claims require extraordinary empirical proof. Patient lives are saved by reproducible pharmacology, not speculative genetic engineering."`,
    stanceCards: [
      {
        id: 'sc-yv-1',
        title: 'Radical Synthetic Gene-Circuit Pivot',
        claim: 'Small-molecule targeted inhibitors are fundamentally limited by evolutionary resistance; research funding must pivot to multiplex CRISPR synthetic cell reprogramming.',
        reasoning: 'Cancer is an evolvability disease; single pathway blocks inevitably select for bypass mutations, whereas synthetic logic gates can eliminate escape routes.',
        confidence: 85,
        isActive: true,
        lens: 'scientific',
      },
      {
        id: 'sc-yv-2',
        title: 'Canonical Signaling Pathway Mastery',
        claim: 'Canonical signal transduction mechanisms remain the most validated targets; speculative gene-editing constructs are clinically unproven and toxic.',
        reasoning: 'Decades of clinical success with imatinib, osimertinib, and sotorasib prove that precise kinase inhibition saves lives when grounded in pathway biology.',
        confidence: 90,
        isActive: true,
        lens: 'mathematical',
      },
      {
        id: 'sc-yv-3',
        title: 'Preclinical Reproducibility & Off-Target Safety',
        claim: 'High-risk synthetic biology proposals must undergo rigorous third-party reproducibility audits for off-target double-strand breaks before receiving major grants.',
        reasoning: 'The reproducibility crisis is exacerbated by flashy synthetic biology papers that fail to replicate in independent laboratories or large animal models.',
        confidence: 95,
        isActive: true,
        lens: 'philosophical',
      },
      {
        id: 'sc-yv-4',
        title: 'Translational Synergistic Integration',
        claim: 'The optimal translational strategy uses small-molecule inhibitors to transiently sensitize tumors, creating a temporal window for targeted synthetic cell therapies.',
        reasoning: 'Binary polarization between old and new delays progress; combining targeted pharmacology with cellular engineering bridges the generational gap.',
        confidence: 90,
        isActive: true,
        lens: 'moral',
      },
    ],
    recommendedPersonas: [
      {
        role: 'Dr. Maya Lin (Ambitious Postdoc & Synthetic Bio Innovator)',
        description: 'Visionary, disruptive young researcher pushing multiplex CRISPR gene circuits and chromatin editing.',
        primaryLens: 'scientific',
      },
      {
        role: 'Dr. Arthur Vance (Veteran Department Chair & Kinase Pioneer)',
        description: 'Pioneer of targeted kinase inhibitors with 40 years of empirical oncology experience; demands clinical trial rigor.',
        primaryLens: 'mathematical',
      },
      {
        role: 'Dr. Elena Rostova (Preclinical Safety & Meta-Science Auditor)',
        description: 'Rigorous auditor focused on the reproducibility crisis, off-target CRISPR safety, and preclinical rigor.',
        primaryLens: 'philosophical',
      },
      {
        role: 'Dr. Julian Mercer (Translational Clinical Trialist)',
        description: 'Pragmatic oncologist focused on bridging cutting-edge innovation with FDA regulatory approvals and patient safety.',
        primaryLens: 'moral',
      },
    ],
  },
];
