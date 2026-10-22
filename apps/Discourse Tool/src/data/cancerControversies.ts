import { CancerControversy, StanceCard, ResearchBrief } from '../types';

export const CANCER_RESEARCH_CONTROVERSIES: CancerControversy[] = [
  {
    id: 'screening-and-overdiagnosis',
    number: 1,
    title: 'Screening and Overdiagnosis',
    shortTitle: 'Screening & Overdiagnosis',
    tagline: 'Indolent Detection, Lead-Time Bias & All-Cause Mortality vs. Early Intervention',
    centralDebate:
      'Does detecting cancer earlier always help, or can screening find indolent abnormalities that would never have caused symptoms or death?',
    keyDilemma:
      'Overdiagnosis means detecting a cancer that would not have harmed a person during their lifetime, triggering anxiety, biopsies, surgery, radiation, or drug therapy without net benefit. Because an untreated screen-detected cancer cannot be ethically observed in an individual once treated, overdiagnosis must be estimated using population modeling and excess incidence rather than measured directly.',
    proponentPosition: {
      title: 'Broad Population Early Detection & Stage-Shift Paradigm',
      claim:
        'Population-level early screening detects localized tumors before systemic dissemination or lymph node invasion, enabling curative surgical/local therapy and reducing stage-specific cancer-specific mortality.',
      keyArguments: [
        'Finding cancer at Stage I/II dramatically improves 5-year relative survival rates compared to Stage IV diagnosis across solid tumors.',
        'Radical local excision or ablation at early localized stages avoids the need for toxic systemic poly-chemotherapies.',
        'Advances in imaging resolution and risk-stratified intervals (e.g. low-dose CT in high-risk smokers) demonstrate proven mortality reductions in randomized trials like NLST and NELSON.',
      ],
      evidenceStandards:
        'Randomized controlled trials demonstrating cancer-specific mortality reduction; population stage-shift metrics; long-term survival statistics.',
    },
    skepticPosition: {
      title: 'Overdiagnosis & Iatrogenic Harm Minimization Paradigm',
      claim:
        'Screening detects an ocean of indolent, non-progressive pseudodisease and slow-growing lesions that would never cause clinical harm. The resulting overtreatment inflicts irreversible physical toxicity, surgical complications, and psychological morbidity without improving all-cause mortality.',
      keyArguments: [
        'Overdiagnosis creates an illusion of screening success: artificial inflation of 5-year survival statistics driven purely by lead-time bias and length-time bias.',
        'Once a lesion is labeled malignant, the untreated counterfactual is lost, driving mandatory treatment cascades (prostatectomy, mastectomy, radiation, thyroidectomy) for benign biological clones.',
        'In breast mammography, prostate PSA, and thyroid ultrasound, multiple independent population models indicate overdiagnosis rates between 15% and 50% of screen-detected lesions.',
      ],
      evidenceStandards:
        'All-cause mortality endpoints in RCTs; long-term excess incidence modeling post-screening cessation; quality-adjusted life years (QALY) net balance.',
    },
    methodologicalChallenge: {
      title: 'The Counterfactual Unobservability Dilemma in Overdiagnosis',
      description:
        'Once a screen-detected cancer is treated, researchers generally cannot observe whether that particular untreated cancer would have progressed or remained harmless. Therefore, overdiagnosis is estimated using population data and statistical modeling rather than measured directly in individuals.',
      bottleneckType: 'Counterfactual Unobservability',
      keyNuance:
        'The disagreement is not "screening versus no screening." It is about which populations should be screened, at what ages and intervals, which follow-up procedures are justified, and whether the evidence demonstrates fewer cancer deaths rather than merely more cancers found earlier.',
    },
    clinicalSettings: [
      'PSA-based prostate cancer screening (Gleason 6 / Grade Group 1 lesions)',
      'Digital screening mammography & tomosynthesis in average-risk women',
      'Low-dose CT (LDCT) lung cancer screening and incidental pulmonary nodules',
      'Thyroid ultrasonography and fine-needle aspiration of microcarcinomas',
      'Multi-cancer early-detection (MCED) blood testing in asymptomatic cohorts',
    ],
    specificExamples: [
      'Breast Cancer: Estimates of mammography overdiagnosis vary from 10% to over 30% depending on whether models adjust for underlying incidence trends and lead-time duration.',
      'Thyroid Cancer: South Korea ultrasound screening epidemic showed a 15-fold surge in papillary thyroid cancer diagnoses with zero change in thyroid cancer mortality.',
      'Prostate Cancer: The pivot from mandatory radical prostatectomy for low-risk Gleason 6 disease to Active Surveillance to avoid iatrogenic incontinence and impotence.',
    ],
    epistemicLenses: {
      scientific:
        'Biological heterogeneity of malignant trajectories: evolutionary "turtles, birds, and bears" (Welch/Black model); histological malignancy does not guarantee clinical lethality.',
      mathematical:
        'Excess incidence modeling: E(t) = I_screen(t) - I_control(t); Bayesian lead-time deconvolution; length-time sampling probability proportional to tumor transit duration L.',
      philosophical:
        'Disease Ontology: Distinguishing abnormal cellular morphology (histological cancer) from a teleologically harmful pathological state that truncates human life.',
      moral:
        'Non-maleficence (Primum non nocere): The ethical duty to avoid transforming healthy asymptomatic individuals into damaged surgical and oncology patients.',
    },
    defaultStanceCards: [
      {
        id: 'sc-screen-1',
        title: 'Mortality Reduction as Sole Justification',
        claim:
          'Screening programs must be justified strictly by demonstrated reductions in disease-specific and all-cause mortality in randomized trials, not by stage-shift metrics or 5-year survival statistics.',
        reasoning:
          '5-year survival rates are structurally distorted by lead-time and length-time biases, creating a false impression of benefit even when mortality is unchanged.',
        confidence: 90,
        isActive: true,
        lens: 'mathematical',
      },
      {
        id: 'sc-screen-2',
        title: 'Counterfactual Modeling Imperative',
        claim:
          'Because individual overdiagnosis cannot be observed post-treatment, clinical guidelines must explicitly integrate peer-reviewed population excess incidence models with uncertainty intervals.',
        reasoning:
          'Without explicit modeling of overdiagnosis, shared decision-making tools systematically overestimate screening net benefit to patients.',
        confidence: 85,
        isActive: true,
        lens: 'scientific',
      },
      {
        id: 'sc-screen-3',
        title: 'Active Surveillance Default for Indolent Clones',
        claim:
          'Screen-detected low-risk malignancies (e.g. Gleason 6 prostate, DCIS, micropapillary thyroid) should default to structured Active Surveillance rather than immediate radical ablation.',
        reasoning:
          'Safeguards patient quality of life and avoids irreversible surgical morbidity while reserving curative intervention for molecularly progressing disease.',
        confidence: 95,
        isActive: true,
        lens: 'moral',
      },
    ],
    researchBriefTemplate: {
      question:
        'What is the true population-level magnitude of overdiagnosis in screening mammography, and how do differing lead-time distribution assumptions alter net mortality benefit calculations?',
      population_or_system:
        'Asymptomatic women aged 40–74 in randomized screening trials (e.g., Canadian National Breast Screening Study, UK Age trial, Swedish trials) and longitudinal registry cohorts (SEER, NordCAN).',
      primary_outcome:
        'Net breast-cancer-specific mortality reduction vs. cumulative lifetime probability of overdiagnosis (excess incidence persisting ≥10 years post-screening cessation).',
      candidate_mechanism:
        'Variable tumor growth kinetics (exponential, Gompertzian, vs. spontaneous regression/arrest) combined with non-linear length-time bias favoring detection of indolent lesions.',
      allowed_evidence: [
        'Preregistered RCTs with ≥15-year follow-up',
        'Validated population microsimulation models (CISNET consortium)',
        'Registry studies tracking post-screening cessation compensatory drops in incidence',
      ],
      excluded_evidence: [
        'Unadjusted 5-year relative survival comparisons between screen-detected and clinically detected cases',
        'Single-institution retrospective case series lacking unscreened control cohorts',
        'Simulated health-economic models that assume uniform linear tumor growth across all histological subtypes',
      ],
      success_criterion:
        'Quantify overdiagnosis rate with Bayesian 95% credible intervals across 3 competing lead-time models, establishing the precise threshold where QALY losses from overtreatment offset mortality gains.',
    },
    recommendedPersonas: [
      {
        role: 'Biostatistician & Screening Epidemiologist',
        description: 'Deconstructs lead-time bias, length-time bias, and excess incidence population models.',
        primaryLens: 'mathematical',
      },
      {
        role: 'Preventive Medicine Physician & Shared-Decision Lead',
        description: 'Evaluates absolute vs relative risk reduction and clinical communication of overdiagnosis.',
        primaryLens: 'moral',
      },
      {
        role: 'Tumor Biologist & Natural History Specialist',
        description: 'Examines histological indolence, spontaneous regression mechanisms, and non-progressive clonal dynamics.',
        primaryLens: 'scientific',
      },
      {
        role: 'Philosopher of Medical Taxonomy & Disease Ontology',
        description: 'Analyzes the concept of "pseudodisease" and the boundary between biological variation and clinical pathology.',
        primaryLens: 'philosophical',
      },
    ],
  },
  {
    id: 'new-blood-tests-and-biopsies',
    number: 2,
    title: 'New Blood Tests and Biopsies (MCED & Liquid Biopsies)',
    shortTitle: 'Liquid Biopsies & MCED Tests',
    tagline: 'Multi-Cancer Early Detection, False-Positive Cascades & Clinical Utility Thresholds',
    centralDebate:
      'Should liquid biopsies and multi-cancer early-detection (MCED) tests be widely offered before randomized trials show that they reduce cancer mortality?',
    keyDilemma:
      'Supporters argue that tumor-derived cfDNA/methylation can detect cancers before symptoms, including cancers lacking screening programs. Skeptics emphasize that finding a cancer signal is not the same as proving earlier action helps. Positive results can trigger costly, invasive diagnostic workups with no cancer found (the false-positive pathway highlighted by NCI), while low early-stage sensitivity risks false reassurance.',
    proponentPosition: {
      title: 'Proactive Pan-Cancer Interception & Detection Yield',
      claim:
        'MCED blood tests detect aggressive, lethal malignancies (pancreatic, ovarian, esophageal) at resectable stages where no standard screening exists, transforming cancer from late symptomatic crisis to early surgical cure.',
      keyArguments: [
        'Over 70% of cancer deaths occur in cancer types that lack any routine guideline-recommended screening modalities.',
        'High specificity (>99%) and machine-learning tissue-of-origin (TOO) algorithms minimize false positives across large asymptomatic populations.',
        'Detecting circulating tumor DNA methylation or fragmentomic patterns reflects biologically active, shedding tumors rather than benign anatomical noise.',
      ],
      evidenceStandards:
        'High positive predictive value (PPV); tissue-of-origin accuracy >85%; prospective detection yield in observational cohorts (e.g. PATHFINDER, STRIVE).',
    },
    skepticPosition: {
      title: 'Prerequisite RCT Mortality & Diagnostic Harm Audit',
      claim:
        'MCED tests must not be rolled out into general asymptomatic clinical practice until large-scale randomized trials (e.g. NHS-Galleri trial) rigorously prove a reduction in late-stage cancer incidence and all-cause/cancer-specific mortality.',
      keyArguments: [
        'A positive "cancer signal" with negative imaging sends healthy people into exhausting, invasive diagnostic cascades (full-body PET-CT, endoscopies, tissue biopsies) creating severe iatrogenic risk.',
        'Sensitivity for Stage I disease is notoriously poor (<20–40% in many solid cancers), generating dangerous false reassurance in symptomatic or high-risk patients.',
        'Non-cancer somatic mutations (Clonal Hematopoiesis of Indeterminate Potential, CHIP) and benign tissue shedding create biological confounding.',
        'Commercial direct-to-consumer access exacerbates healthcare inequities and strains health-system diagnostic infrastructure.',
      ],
      evidenceStandards:
        'Large-scale prospective RCTs demonstrating reduction in Stage IV diagnoses and mortality; comprehensive accounting of diagnostic workup adverse events; health equity audits.',
    },
    methodologicalChallenge: {
      title: 'The Diagnostic Workup Cascade & Low Prevalence PPV Bottleneck',
      description:
        'In asymptomatic populations with low overall cancer prevalence (~1–2%), even a test with 99% specificity yields a substantial proportion of false-positive results. Furthermore, early-stage tumors shed minute fractions of cfDNA (often <0.01% tumor fraction), challenging the physical limits of sequencing detection.',
      bottleneckType: 'False-Positive Diagnostic Cascades',
      keyNuance:
        'The core research standard being contested is whether high analytic accuracy or detection yield is enough for implementation, or whether evidence of lower mortality and acceptable downstream harm must come first.',
    },
    clinicalSettings: [
      'Multi-cancer early detection (MCED) methylation assays (e.g. Galleri, Cancerguard, DELFI)',
      'Minimal Residual Disease (MRD) monitoring post-resection via personalized tumor-informed ctDNA',
      'Diagnostic workup pathways for "Cancer Signal Detected, Origin Indeterminate"',
      'High-risk hereditary cancer screening (BRCA1/2, Lynch Syndrome, Li-Fraumeni)',
      'Direct-to-consumer liquid biopsy marketing and health-system adoption',
    ],
    specificExamples: [
      'NCI Vanguard Study: The National Cancer Institute initiated trials specifically to evaluate the feasibility, diagnostic odyssey risks, and psychological burden of MCED testing.',
      'NHS-Galleri Trial: 140,000-participant randomized trial testing whether annual blood screening reduces late-stage (Stage III/IV) cancer presentations.',
      'CHIP Confounding: Clonal hematopoiesis mutations in DNMT3A, TET2, and TP53 in circulating white blood cells generating false-positive liquid biopsy signals in solid-tumor assays.',
    ],
    epistemicLenses: {
      scientific:
        'Analytical sensitivity vs biological shedding limits: Poisson sampling limits of cfDNA copies per 10mL blood draw for micro-tumors (<1cm³).',
      mathematical:
        'Bayesian PPV Theorem: PPV = (Sensitivity × Prevalence) / [ (Sensitivity × Prevalence) + (1 - Specificity) × (1 - Prevalence) ]; under 1% prevalence, 99% specificity still implies ~50% false discovery.',
      philosophical:
        'Epistemology of "Cancer Signals": An algorithm declaring a statistical pattern of hypermethylation is not an empirical observation of an anatomical tumor.',
      moral:
        'Distributive Justice & Primum Non Nocere: Preventing commercialization from routing finite healthcare diagnostic bandwidth away from sick patients to resolve ambiguous blood signals in affluent asymptomatic individuals.',
    },
    defaultStanceCards: [
      {
        id: 'sc-mced-1',
        title: 'Mortality RCT Prerequisite for MCED',
        claim:
          'MCED liquid biopsy screening must not receive broad clinical guideline endorsement or insurance coverage without completed Phase III RCT data demonstrating a statistically significant reduction in late-stage incidence and cancer mortality.',
        reasoning:
          'High detection yield does not equate to clinical utility; without mortality evidence, MCED risks triggering nationwide diagnostic cascades with net negative benefit.',
        confidence: 90,
        isActive: true,
        lens: 'scientific',
      },
      {
        id: 'sc-mced-2',
        title: 'Diagnostic Cascade Risk Quantification',
        claim:
          'Every MCED implementation trial must preregister and quantify the full diagnostic workup cascade, including imaging radiation, invasive endoscopy/biopsy complications, and healthcare costs per true cancer identified.',
        reasoning:
          'The downstream harm of evaluating false-positive signals is a primary clinical endpoint that cannot be treated as an incidental byproduct.',
        confidence: 95,
        isActive: true,
        lens: 'moral',
      },
      {
        id: 'sc-mced-3',
        title: 'Physical Poisson Sampling Bounds',
        claim:
          'Liquid biopsy sensitivity for Stage I solid tumors is fundamentally constrained by the biophysical Poisson limit of circulating genome equivalents in a standard 10 mL blood draw.',
        reasoning:
          'A 1 mm³ tumor sheds approximately 1 genome copy per 100 mL of plasma, making single-draw Stage I sensitivity mathematically capped regardless of sequencing depth.',
        confidence: 85,
        isActive: true,
        lens: 'mathematical',
      },
    ],
    researchBriefTemplate: {
      question:
        'Does the addition of an annual multi-cancer early detection (MCED) cfDNA methylation blood test to standard-of-care screening reduce the incidence of Stage IV cancer diagnoses and cancer-specific mortality in adults aged 50–79?',
      population_or_system:
        'Asymptomatic screening-eligible general population cohort (n ≥ 100,000, 1:1 randomized to MCED + standard care vs. standard care alone).',
      primary_outcome:
        'Incidence of combined Stage IV cancers at 3 years and all-cause/cancer-specific mortality at 5 years.',
      candidate_mechanism:
        'Targeted bisulfite-free cfDNA methylation deconvolution and fragmentomics identifying tumor-derived epigenetic signatures prior to clinical symptom onset.',
      allowed_evidence: [
        'Preregistered multicenter randomized controlled trials (e.g. NHS-Galleri, NCI MCED trials)',
        'Standardized diagnostic cascade tracking logs documenting all follow-up procedures (PET, CT, MRI, biopsy)',
        'Independent blinded biobank validation with pre-analytic standardization',
      ],
      excluded_evidence: [
        'Non-randomized single-arm detection yield studies without unscreened control comparator',
        'In silico synthetic mixing models simulating sensitivity without in vivo plasma validation',
        'Studies failing to filter white blood cell DNA to exclude Clonal Hematopoiesis (CHIP)',
      ],
      success_criterion:
        'Statistically significant (p < 0.01) ≥20% reduction in Stage IV cancer incidence in the intervention arm, accompanied by a PPV ≥ 40% and a diagnostic workup complication rate < 1% among test-positives.',
    },
    recommendedPersonas: [
      {
        role: 'Liquid Biopsy Technologist & cfDNA Geneticist',
        description: 'Evaluates methylation deconvolution, fragmentomics, and biological limits of cfDNA shedding.',
        primaryLens: 'scientific',
      },
      {
        role: 'Health Economist & Diagnostic Cascade Reviewer',
        description: 'Models false-positive workup costs, invasive biopsy complications, and health system capacity.',
        primaryLens: 'moral',
      },
      {
        role: 'Clinical Trialist & RCT Methodology Lead',
        description: 'Designs Phase III screening trials with mortality endpoints and enforces pre-registration standards.',
        primaryLens: 'mathematical',
      },
      {
        role: 'Health Equity & Disparities Investigator',
        description: 'Audits trial demographic representation, financial toxicity, and equitable follow-up access.',
        primaryLens: 'moral',
      },
    ],
  },
  {
    id: 'precision-medicine-vs-complexity',
    number: 3,
    title: 'Precision Medicine versus Complexity',
    shortTitle: 'Precision Oncology vs. Complexity',
    tagline: 'Somatic Mutation Theory, Basket Trials & Tissue Context vs. Dynamic Tumor Ecosystems',
    centralDebate:
      'How far can cancer care be guided by individual tumor mutations and molecular profiles?',
    keyDilemma:
      'Precision oncology has yielded major successes where a single molecular alteration reliably predicts benefit from targeted therapy. The broader critique is that many tumors have multiple alterations, vary across metastatic sites, evolve under treatment pressure, and are shaped by immune, stromal, metabolic, and environmental contexts. A single DNA panel is therefore fundamentally incomplete.',
    proponentPosition: {
      title: 'Genomic Target Matching & Tissue-Agnostic Precision Paradigm',
      claim:
        'Cancer is fundamentally a genetic disease driven by specific oncogenic mutations, amplifications, and fusions. Systematically sequencing every tumor to match patients with molecularly targeted therapies and basket trials represents the most rational path to personalized cures.',
      keyArguments: [
        'Transformational single-driver successes: EGFR/ALK in lung cancer, BRAF V600E in melanoma, HER2 in breast cancer, BCR-ABL in CML, TRK fusions across solid tumors.',
        'Basket trials (e.g. NCI-MATCH, TAPUR) demonstrate that tissue-agnostic molecular targets can be targeted effectively across diverse histological tumor types.',
        'Comprehensive genomic profiling (CGP) identifies unexpected actionable alterations in 30–40% of refractory cancer patients.',
      ],
      evidenceStandards:
        'Objective response rates in molecularly matched basket trials; progression-free survival ratios (PFS2/PFS1 > 1.3); companion diagnostic genomic sequencing.',
    },
    skepticPosition: {
      title: 'Ecosystem Complexity, Spatial Heterogeneity & Tissue-Context Paradigm',
      claim:
        'Tumors are dynamic, multi-clonal evolving ecosystems embedded in complex tissue microenvironments. A mutation is not universally "actionable"; response depends heavily on tissue of origin, epigenetic state, stromal barriers, and clonal evolution.',
      keyArguments: [
        'Tissue context dictates drug response: BRAF V600E inhibitors achieve 80% response in melanoma but fail completely (<5% response) as monotherapy in colorectal cancer due to rapid feedback EGFR activation.',
        'Extensive spatial and subclonal heterogeneity means a single needle biopsy captures only a fraction of relevant clonal alterations across metastatic sites.',
        'The vast majority of advanced cancer patients sequenced in large-scale precision trials (e.g. SHIVA, NCI-MATCH) derive no meaningful overall survival benefit from genomic matching.',
        'Tissue Organization Field Theory (TOFT) highlights that disrupted tissue architecture, mechanical stiffness, and cell-cell communication drive malignancy independently of single-gene hits.',
      ],
      evidenceStandards:
        'Randomized trials comparing targeted precision algorithms against physician choice; multi-region spatial sequencing data; overall survival and quality-of-life endpoints.',
    },
    methodologicalChallenge: {
      title: 'The "Actionable" Mutation Semantics vs Tissue-Context Dependency',
      description:
        'A mutation can be biologically interesting or targetable in principle without evidence that targeting it improves outcomes for a specific cancer type and treatment setting. Grouping cancers by mutation in basket trials frequently obscures critical tissue-specific regulatory feedbacks.',
      bottleneckType: 'Clonal Heterogeneity & Context-Dependency',
      keyNuance:
        'Relatedly, a longstanding theoretical controversy asks whether cancer is best understood primarily as a cell-autonomous genetic disease (Somatic Mutation Theory) or as a disease of disrupted tissue organization and microenvironment (TOFT). Most contemporary work treats these as interacting mechanisms.',
    },
    clinicalSettings: [
      'Comprehensive Genomic Profiling (CGP) next-generation sequencing panels (500+ genes)',
      'Basket trials and umbrella trials (NCI-MATCH, TAPUR, TARGET, SHIVA)',
      'Spatial transcriptomics and multi-region biopsy sequencing across metastatic lesions',
      'Targeted kinase inhibitor monotherapy vs rational feedback-blocking combinations',
      'Molecular Tumor Boards evaluating off-label targeted drug recommendations',
    ],
    specificExamples: [
      'BRAF V600E in Colon vs Melanoma: Vemurafenib produces high response in melanoma but requires triple combination (encorafenib + cetuximab + binimetinib) in colorectal cancer due to EGFR feedback loops.',
      'KRAS G12C Inhibitors: Sotorasib and adagrasib show rapid emergence of polyclonal resistance mechanisms (secondary KRAS mutations, MET amplification, bypass kinase activation) within months.',
      'The SHIVA Trial: First randomized controlled trial of off-label targeted therapy based on molecular profiling, showing no improvement in progression-free survival over conventional chemotherapy.',
    ],
    epistemicLenses: {
      scientific:
        'Feedback signaling networks and non-genetic plasticity: MAPK rebound, epigenetic drug-tolerant persister (DTP) states, and stroma-mediated resistance (HGF secretion by CAFs).',
      mathematical:
        'High-dimensional gene regulatory network attractors; branch-and-bound evolutionary trees; spatial game theory between drug-sensitive and resistant subclones.',
      philosophical:
        'Reductionism vs Holism: Somatic Mutation Theory (SMT, Cartesian reductionism to DNA sequences) versus Tissue Organization Field Theory (TOFT, emergent systems biology of tissue ecology).',
      moral:
        'Resource Allocation & Financial Toxicity: The ethics of marketing multi-thousand-dollar genomic panels and off-label targeted drugs ($20k+/month) when median survival benefit across broad cohorts is measured in weeks.',
    },
    defaultStanceCards: [
      {
        id: 'sc-prec-1',
        title: 'Tissue-Context Superiority over Pure Genomics',
        claim:
          'Genomic alterations cannot be classified as "actionable" without prospective randomized evidence in the specific histological tissue context and clinical line of therapy.',
        reasoning:
          'BRAF, KRAS, and PIK3CA targeted agents demonstrate vastly discordant clinical efficacy across different tissue origins due to lineage-specific feedback pathways.',
        confidence: 90,
        isActive: true,
        lens: 'scientific',
      },
      {
        id: 'sc-prec-2',
        title: 'Multi-Region Spatial & Multi-Omics Requirement',
        claim:
          'A single-site DNA biopsy is fundamentally inadequate for therapeutic guidance in metastatic disease; clinical oncology must transition to spatial multi-omics and serial ctDNA tracking.',
        reasoning:
          'TRACERx and autopsy studies confirm that distinct metastatic lesions harbor divergent private mutations and microenvironmental resistance programs.',
        confidence: 85,
        isActive: true,
        lens: 'philosophical',
      },
      {
        id: 'sc-prec-3',
        title: 'Rigorous Basket Trial Outcome Standards',
        claim:
          'Basket trials must preregister overall survival and patient-reported outcomes alongside response rates to prevent accelerated approval of ineffective targeted therapies.',
        reasoning:
          'Transitory radiographic tumor shrinkage in single-arm basket cohorts frequently fails to translate into survival gains in randomized confirmatory trials.',
        confidence: 90,
        isActive: true,
        lens: 'moral',
      },
    ],
    researchBriefTemplate: {
      question:
        'To what extent does tissue of origin and tumor microenvironment context modulate therapeutic response to molecularly matched targeted therapies in basket trial cohorts?',
      population_or_system:
        'Adult patients with solid tumors harboring verified oncogenic alterations (e.g. BRAF V600E, KRAS G12C, HER2 amp, FGFR fusions) across ≥5 distinct histological organ origins.',
      primary_outcome:
        'Objective response rate (RECIST 1.1), progression-free survival (PFS), and overall survival (OS) stratified by tissue of origin and baseline stromal/immune gene expression signature.',
      candidate_mechanism:
        'Tissue-specific RTK feedback phosphorylation (e.g. EGFR/MET upregulation) and cancer-associated fibroblast secretome buffering targeted kinase inhibition.',
      allowed_evidence: [
        'Prospective basket trial datasets with mandatory pre-treatment and on-treatment paired biopsies',
        'Spatial transcriptomic and single-cell RNA-seq validation of feedback loops',
        'Preclinical patient-derived organoid panels comparing identical mutations in different tissue backgrounds',
      ],
      excluded_evidence: [
        'Single-cancer retrospective case series without cross-cancer comparison',
        'In vitro kinase binding affinity assays lacking cellular and microenvironmental context',
        'Uncontrolled real-world data without standardized genomic variant curation',
      ],
      success_criterion:
        'Demonstrate with statistical significance (interaction p < 0.005) that tissue-of-origin context and stromal signature account for >50% of the variance in response rate to identical molecularly targeted agents.',
    },
    recommendedPersonas: [
      {
        role: 'Precision Oncologist & Basket Trialist',
        description: 'Champions molecular biomarker matching, companion diagnostics, and tissue-agnostic drug approvals.',
        primaryLens: 'scientific',
      },
      {
        role: 'Systems Biologist & Tissue Field Theorist',
        description: 'Analyzes TOFT, tissue architecture, feedback signaling loops, and non-genetic plasticity.',
        primaryLens: 'philosophical',
      },
      {
        role: 'Evolutionary Cancer Geneticist',
        description: 'Models spatial clonal heterogeneity, branching phylogenies, and subclonal selection dynamics.',
        primaryLens: 'mathematical',
      },
      {
        role: 'Oncology Health Policy & Financial Toxicity Lead',
        description: 'Evaluates cost-effectiveness of next-gen sequencing and value frameworks for targeted therapies.',
        primaryLens: 'moral',
      },
    ],
  },
  {
    id: 'immunotherapy-evidence-and-endpoints',
    number: 4,
    title: 'Immunotherapy Evidence and Endpoints',
    shortTitle: 'Immunotherapy & Surrogate Endpoints',
    tagline: 'Overall Survival vs. PFS/ORR, Accelerated Approvals & Dynamic Biomarker Heterogeneity',
    centralDebate:
      'When should a drug be considered beneficial—when tumors shrink, when scans stay stable longer, or when patients demonstrably live longer or feel better?',
    keyDilemma:
      'Overall survival (OS) is the gold standard endpoint, but can take years to measure and is complicated by post-progression crossover. Trials therefore rely on surrogate endpoints (PFS, ORR, MRD, ctDNA) to accelerate access. However, surrogates do not automatically guarantee patient benefit. A 2024 review revealed that many cancer drugs granted accelerated approval on surrogates failed to show OS or QoL improvements in confirmatory trials.',
    proponentPosition: {
      title: 'Accelerated Access & Surrogate Endpoint Innovation Paradigm',
      claim:
        'Surrogate endpoints (PFS, ORR, complete response, ctDNA clearance) are essential to accelerate patient access to life-saving immunotherapies and avoid withholding effective treatments during decades-long survival trials.',
      keyArguments: [
        'Awaiting mature overall survival data delays drug availability for patients with rapidly fatal malignancies who have exhausted all standard therapies.',
        'Effective subsequent post-progression therapies and trial crossover dilute and confound overall survival differences in modern oncology trials.',
        'Novel immunotherapy dynamics (e.g. durable "tail of the curve" survival, pseudoprogression) require adapted surrogate endpoints like iRECIST and milestone PFS.',
      ],
      evidenceStandards:
        'Progression-free survival hazard ratios (HR < 0.70); objective response rate (ORR); surrogate validation meta-analyses; early patient access metrics.',
    },
    skepticPosition: {
      title: 'Patient-Centered Gold Standard (OS & QoL) & Regulatory Accountability Paradigm',
      claim:
        'Approval must require demonstrable proof that patients live longer (Overall Survival) or live better (Health-Related Quality of Life). Relying on unvalidated surrogates allows toxic, ineffective, and astronomical-cost drugs to remain on the market indefinitely.',
      keyArguments: [
        'The surrogate-OS disconnect: In many immune checkpoint inhibitor trials (especially monotherapy vs chemo combinations), PFS improvements fail to translate into overall survival gains.',
        'Regulatory capture and "dangling approvals": Confirmatory trials often take years or fail completely to demonstrate survival, yet drugs rarely get withdrawn in a timely manner.',
        'Tumor shrinkage (ORR) does not equal symptom relief if accompanied by severe, chronic immune-related adverse events (colitis, hypophysitis, pneumonitis, neuropathy).',
        'Biomarker volatility: PD-L1 IHC scoring, Tumor Mutational Burden (TMB), and MSI-H are dynamic, assay-dependent, and fail as universal predictive gates.',
      ],
      evidenceStandards:
        'Statistically significant Overall Survival improvement in randomized trials; validated Patient-Reported Outcome (PRO) QoL instruments; strict enforcement of confirmatory trial withdrawal triggers.',
    },
    methodologicalChallenge: {
      title: 'The Surrogate-to-Survival Disconnect & Post-Progression Confounding',
      description:
        'In immuno-oncology, delayed treatment effects, non-proportional hazards, and trial crossover violate standard statistical assumptions (e.g. log-rank tests). A surrogate may show statistical significance without biological fidelity to true survival extension.',
      bottleneckType: 'Surrogate-OS Disconnect',
      keyNuance:
        'Immunotherapy also intensifies the biomarker debate: PD-L1, tumor mutational burden, microsatellite instability, circulating markers, and features of the tumor microenvironment can be informative, but none consistently predicts response across every cancer and treatment regimen.',
    },
    clinicalSettings: [
      'FDA Accelerated Approval Pathway and confirmatory Phase III post-marketing trials',
      'Immune checkpoint inhibitors (anti-PD-1/PD-L1, anti-CTLA-4, LAG-3, TIGIT)',
      'Surrogate endpoint validation in first-line vs refractory metastatic solid tumors',
      'PD-L1 Combined Positive Score (CPS) vs Tumor Proportion Score (TPS) cutoffs',
      'Patient-Reported Outcomes (PROs) and Quality of Life (EORTC QLQ-C30) measurements',
    ],
    specificExamples: [
      '2024 JAMA Internal Medicine Review: Found that over a 10-year period, fewer than half of cancer drugs granted accelerated approval based on surrogate measures showed proven OS or QoL improvements in confirmatory trials.',
      'Atezolizumab in Triple-Negative Breast Cancer: Accelerated approval granted on PFS in IMpassion130 was voluntarily withdrawn after confirmatory IMpassion131 failed to show PFS or OS benefit.',
      'PD-L1 Biomarker Discordance: Substantial discordance between 22C3, SP142, SP263, and 28-8 antibody clones in non-small cell lung cancer and bladder cancer.',
    ],
    epistemicLenses: {
      scientific:
        'Immuno-biology of durable response: The "tail of the curve" plateau where a minority of patients achieve multi-year disease control despite initial stable scan radiographics.',
      mathematical:
        'Meta-analytic surrogate validation coefficient (R²_trial > 0.80); non-proportional hazards modeling (Restricted Mean Survival Time, RMST) over standard Cox models.',
      philosophical:
        'Proxy Fallacy: Treating the measurement proxy (radiographic scan shadow shrinkage) as equivalent to the foundational normative goal of medicine (human life and well-being).',
      moral:
        'Beneficence vs Non-Maleficence: Balancing the compassionate urge for rapid drug access against the moral harm of subjecting dying patients to false hope, toxicity, and bankruptcy for non-beneficial therapies.',
    },
    defaultStanceCards: [
      {
        id: 'sc-imm-1',
        title: 'Overall Survival / QoL Supremacy Standard',
        claim:
          'Accelerated approvals must include automatic, legally binding sunset clauses requiring market withdrawal if randomized confirmatory trials fail to demonstrate Overall Survival or Quality of Life benefits within 36 months.',
        reasoning:
          'Without automatic sunset enforcement, unproven oncological agents remain commercialized indefinitely based on flawed surrogate endpoints.',
        confidence: 95,
        isActive: true,
        lens: 'moral',
      },
      {
        id: 'sc-imm-2',
        title: 'Restricted Mean Survival Time (RMST) over Cox Hazards',
        claim:
          'Immunotherapy clinical trials must replace traditional Cox proportional hazards ratios with Restricted Mean Survival Time (RMST) to accurately evaluate non-proportional survival tails.',
        reasoning:
          'Delayed immune activation and durable long-term survivor plateaus violate the proportional hazards assumption, skewing conventional hazard ratio calculations.',
        confidence: 90,
        isActive: true,
        lens: 'mathematical',
      },
      {
        id: 'sc-imm-3',
        title: 'Dynamic Multi-Biomarker Composite Panels',
        claim:
          'Static single-marker testing (e.g. PD-L1 alone) is clinically inadequate; immunotherapy selection must integrate dynamic composite panels (TMB + T-cell inflamed GEP + spatial CD8 infiltration).',
        reasoning:
          'Meta-analyses across 15+ solid tumor types prove that single-analyte PD-L1 testing misclassifies up to 40% of clinical responders and non-responders.',
        confidence: 85,
        isActive: true,
        lens: 'scientific',
      },
    ],
    researchBriefTemplate: {
      question:
        'What is the meta-analytic trial-level correlation (R²_trial) between progression-free survival (PFS) and overall survival (OS) in randomized clinical trials of immune checkpoint inhibitor regimens across solid tumors?',
      population_or_system:
        'All Phase III randomized controlled trials of PD-1/PD-L1 inhibitors (monotherapy or combined with chemotherapy/CTLA-4) published between 2014 and 2026 (n ≥ 80 trials).',
      primary_outcome:
        'Trial-level determination coefficient (R²_trial) and individual-level surrogate correlation (Copula ρ) between PFS hazard ratio and OS hazard ratio.',
      candidate_mechanism:
        'Differential post-progression survival kinetics, delayed anti-tumor immune activation, and cross-over salvage therapy masking true primary treatment effect on OS.',
      allowed_evidence: [
        'Preregistered Phase III RCTs with full intention-to-treat (ITT) survival and progression data',
        'Patient-level reconstructed survival curve data with RMST calculations',
        'FDA/EMA regulatory review summary documents and post-marketing confirmatory reports',
      ],
      excluded_evidence: [
        'Single-arm Phase I/II trials without randomized comparator',
        'Trials where >50% of patients were lost to follow-up before median survival was reached',
        'Editorials or opinion pieces lacking quantitative meta-regression analysis',
      ],
      success_criterion:
        'Determine whether R²_trial meets the rigorous Institute for Quality and Efficiency in Health Care (IQWiG) validation threshold (R² > 0.70) overall and within monotherapy vs. combination strata.',
    },
    recommendedPersonas: [
      {
        role: 'Clinical Immuno-Oncologist & Trial Lead',
        description: 'Evaluates checkpoint inhibitor biology, pseudoprogression, and durable survivor curve tails.',
        primaryLens: 'scientific',
      },
      {
        role: 'Regulatory Statistician & Meta-Analyst',
        description: 'Specializes in trial-level surrogate validation metrics (R²_trial), RMST, and non-proportional hazards.',
        primaryLens: 'mathematical',
      },
      {
        role: 'Patient-Reported Outcomes (PRO) & QoL Methodologist',
        description: 'Assesses symptom burden, functional status metrics, and immune-related chronic toxicity.',
        primaryLens: 'moral',
      },
      {
        role: 'Bioethics & FDA Policy Reform Lead',
        description: 'Examines accelerated approval ethics, dangling approvals, and commercial incentive distortions.',
        primaryLens: 'philosophical',
      },
    ],
  },
  {
    id: 'biology-disparities-and-priorities',
    number: 5,
    title: 'Biology, Disparities, and Priorities',
    shortTitle: 'Disparities, Biosocial Oncology & Priorities',
    tagline: 'Biosocial Modeling, Genetic Reductionism vs. Structural Inequities & Research Investment Ethics',
    centralDebate:
      'How should researchers explain cancer disparities without mistakenly reducing social categories such as race to biology?',
    keyDilemma:
      'Cancer outcomes reflect intertwined factors: access to prevention and screening, insurance, treatment quality, environmental exposures, structural inequities, comorbidities, ancestry, tumor biology, and genetics. The controversy emerges when studies report biological differences between groups: such findings may identify real mechanisms worth studying, but can be overstated if researchers ignore unequal exposures, delayed diagnosis, access barriers, or the fact that racial categories are social rather than simple genetic groupings. Finally, an ethical priority-setting debate asks whether cancer research investment should be driven mainly by mortality burden, years of life lost, scientific tractability, commercial incentives, rarity, or inequities.',
    proponentPosition: {
      title: 'Ancestry-Informed Molecular Stratification Paradigm',
      claim:
        'Rigorous exploration of genetic ancestry, germline polymorphisms, and tumor biological differences across diverse ancestral backgrounds is crucial to discover population-specific drivers and deliver equitable precision therapies.',
      keyArguments: [
        'Disproportionate biological aggressiveness in specific subgroups (e.g. higher frequency of triple-negative breast cancer in women of West African ancestry, distinct EGFR mutation prevalence in East Asian non-smokers) reveals distinct biological pathways.',
        'Historically, genomics datasets (TCGA) have been >80% European ancestry, creating critical genomic blind spots that must be rectified through targeted molecular characterization.',
        'Identifying ancestry-associated germline variants (e.g. APOL1, DPYD alleles) prevents fatal pharmacogenomic toxicities and enables targeted interventions.',
      ],
      evidenceStandards:
        'Continuous genetic ancestry admixture mapping; multi-omics characterization of underrepresented cohorts; pharmacogenomic allele frequency audits.',
    },
    skepticPosition: {
      title: 'Biosocial Synthesis & Structural Determinants Paradigm',
      claim:
        'Racial disparities in cancer are overwhelmingly driven by social determinants of health, delayed diagnosis, unequal insurance coverage, hospital quality gaps, and toxic environmental exposures. Attributing disparities to innate biology risks genetic reductionism, race-essentialism, and deflecting attention from remediable structural injustices.',
      keyArguments: [
        'Race is a social construct, not a biological or genetic taxon; self-reported racial categories exhibit wide genetic heterogeneity and continuous admixture.',
        'When clinical trials and equal-access healthcare systems (e.g. Veteran Affairs health system) provide identical stage-matched treatment, racial survival gaps frequently disappear or invert.',
        'The "biologization of inequality": Searching for genetic explanations for outcome gaps that are demonstrably caused by residential segregation, uninsurance, and systemic diagnostic delays.',
        'Research priorities are currently distorted by commercial market size and lucrative biopharma incentives rather than global mortality burden or years of life lost (DALYs).',
      ],
      evidenceStandards:
        'Multilevel epidemiological mediation analyses; equal-access health system comparisons; structural racism and environmental exposure indices.',
    },
    methodologicalChallenge: {
      title: 'The Biosocial Confounding & Priority Ethics Dilemma',
      description:
        'Disentangling the causal contribution of genetic ancestry from social determinants of health requires complex multilevel modeling. Furthermore, ethical priority-setting in research funding constantly struggles between commercial profitability and global burden of disease.',
      bottleneckType: 'Biosocial Confounding & Priority Ethics',
      keyNuance:
        'A more productive position is biosocial: investigate tumor and host biology rigorously while also measuring the social and health-system conditions that shape risk, diagnosis, treatment, and survival. Research on disparities increasingly frames these influences as interacting rather than competing explanations.',
    },
    clinicalSettings: [
      'Multilevel epidemiological disparities research and population health analytics',
      'Clinical trial diversity mandates (FDA Diversity Action Plans)',
      'Pharmacogenomics and ancestral drug metabolism screening',
      'Cancer Research Funding Allocation: NCI grant portfolios vs disease burden (DALYs/YLL)',
      'Community oncology vs academic comprehensive cancer center outcome benchmarking',
    ],
    specificExamples: [
      'Triple-Negative Breast Cancer (TNBC): Disproportionate mortality in Black women is driven by a combination of higher baseline TNBC incidence, neighborhood deprivation, diagnostic delay, and lower rates of guideline-adherent chemotherapy delivery.',
      'Equal-Access Systems (VA Studies): Extensive prostate and colon cancer studies in the Veterans Health Administration show that Black patients achieve equal or superior overall survival compared to White patients when receiving identical stage-matched standard-of-care.',
      'Funding Allocation Disconnect: Diseases like lung cancer (leading cancer killer globally) receive significantly less research funding per life-year lost compared to other malignancies, partly driven by patient stigma and commercial market dynamics.',
    ],
    epistemicLenses: {
      scientific:
        'Embodied biological stress pathways: Allostatic load, chronic glucocorticoid signaling, telomere shortening, and tumor-infiltrating immune phenotype remodeling driven by chronic systemic stress.',
      mathematical:
        'Multilevel Structural Equation Modeling (SEM) and causal mediation analysis: decomposing total disparities effect into direct biological vs indirect social-structural mediation paths.',
      philosophical:
        'Anti-Essentialism in Human Genetics: Refuting biological determinism while maintaining scientific rigor regarding ancestral genomic variation.',
      moral:
        'Distributive Justice & Research Priority Ethics: Allocating global R&D resources based on utilitarian Disability-Adjusted Life Years (DALYs) and raw burden of suffering rather than commercial drug pricing potential.',
    },
    defaultStanceCards: [
      {
        id: 'sc-disp-1',
        title: 'Biosocial Causal Mediation Standard',
        claim:
          'Cancer disparity studies reporting biological or molecular differences must be methodologically required to measure and control for structural social determinants, stage at diagnosis, and treatment delivery quality.',
        reasoning:
          'Reporting isolated molecular differences without adjusting for structural determinants reinforces genetic reductionism and misidentifies the primary drivers of survival gaps.',
        confidence: 95,
        isActive: true,
        lens: 'philosophical',
      },
      {
        id: 'sc-disp-2',
        title: 'Global Burden & DALYs Funding Alignment',
        claim:
          'Public oncology research funding allocations should be calibrated against global Years of Life Lost (YLL) and disease burden rather than pharmaceutical market size or commercial profitability.',
        reasoning:
          'Underfunded high-mortality malignancies (e.g. lung, pancreatic, stomach cancers) suffer from massive underinvestment relative to their societal burden of disease.',
        confidence: 90,
        isActive: true,
        lens: 'moral',
      },
      {
        id: 'sc-disp-3',
        title: 'Continuous Ancestry over Discrete Racial Categorization',
        claim:
          'Translational oncology must replace discrete sociopolitical racial categories with continuous biogeographical genetic ancestry proportions in multi-omics discovery.',
        reasoning:
          'Discrete racial bins obscure complex admixture gradients and conflate social exposure variables with biological mechanisms.',
        confidence: 90,
        isActive: true,
        lens: 'scientific',
      },
    ],
    researchBriefTemplate: {
      question:
        'What proportion of the racial disparity in 5-year overall survival among patients with triple-negative breast cancer (TNBC) is mediated by structural healthcare access/treatment delay versus distinct tumor somatic mutational/immune signatures?',
      population_or_system:
        'Nationally representative multi-institutional registry-linked cohort (n ≥ 10,000) with linked genomic profiling (whole-exome/RNA-seq), census-tract social vulnerability index (SVI), insurance status, and time-to-treatment records.',
      primary_outcome:
        '5-year overall survival disparity, decomposed via causal mediation analysis into percentage mediated by (a) treatment delay/guideline divergence, (b) neighborhood deprivation/SVI, and (c) tumor immune contexture/somatic alterations.',
      candidate_mechanism:
        'Chronic allostatic load and microenvironmental immune suppression interacting with delayed diagnostic workup and unequal access to clinical trial experimental therapies.',
      allowed_evidence: [
        'Multilevel causal mediation epidemiological studies with validated structural equation modeling',
        'Equal-access health system matched cohort data (e.g. VHA, Department of Defense datasets)',
        'Multi-omics profiling with continuous genetic ancestry estimation (ADMIXTURE/PCA)',
      ],
      excluded_evidence: [
        'Studies utilizing unadjusted univariable comparisons between discrete racial categories',
        'Analyses lacking documentation of insurance status, income, or hospital quality',
        'Preclinical animal studies claiming racial modeling without human population data',
      ],
      success_criterion:
        'Successfully partition the hazard ratio disparity with 95% confidence intervals, defining the quantitative impact of equalizing treatment timing and access relative to tumor-intrinsic biological targets.',
    },
    recommendedPersonas: [
      {
        role: 'Biosocial Oncologist & Health Inequities Lead',
        description: 'Specializes in causal mediation analysis, social determinants of health, and equal-access system studies.',
        primaryLens: 'moral',
      },
      {
        role: 'Population Geneticist & Ancestry Admixture Specialist',
        description: 'Deconstructs continuous biogeographical genetic ancestry, germline variants, and genomic blind spots.',
        primaryLens: 'scientific',
      },
      {
        role: 'Epidemiological Causal Modeler',
        description: 'Constructs structural equation models and counterfactual DAGs to disentangle complex confounding.',
        primaryLens: 'mathematical',
      },
      {
        role: 'Philosopher of Science & Bioethicist',
        description: 'Critiques genetic reductionism, race reification, and analyzes R&D priority-setting frameworks.',
        primaryLens: 'philosophical',
      },
    ],
  },
];
