# Experiment Set — Precision Molecular Targeting × Tissue Delivery × Immuno-Oncology

Five testable experiments corresponding to the "avenues to explore" identified in the prior research threads. Each is written as a protocol sketch: objective, hypothesis, method, endpoints, controls, and what a positive/negative result would mean. These are designed to be handed to a wet-lab or computational collaborator as a starting point, not finished SOPs.

---

## Experiment 1 — Structural identity and E3-ligase mapping of pan-KRAS degraders

**Objective:** Determine which E3 ligase(s) leading pan-KRAS PROTACs recruit, since ligase choice affects tissue expression pattern, ternary complex geometry, and which KRAS mutant alleles are degraded.

**Hypothesis:** CRBN- and VHL-recruiting pan-KRAS degraders will show different tissue-specific degradation efficiency (CRBN is broadly expressed but variably active across cell types; VHL is hypoxia-regulated and may underperform in poorly oxygenated tumor cores).

**Method:**
- Computational: pull public structures/patents for ARV-806, ACBI3, and the Arvinas pan-KRAS clinical candidate; classify E3 ligase warhead (CRBN vs. VHL vs. novel ligase e.g. KEAP1/DCAF16).
- Wet-lab: ternary complex formation assay (AlphaLISA or TR-FRET) comparing degrader potency across a KRAS allele panel (G12C, G12D, G12V, G13D, Q61) in isogenic cell lines with varying baseline hypoxia (normoxic vs. 1% O2 culture) to test the VHL/hypoxia hypothesis directly.

**Endpoints:** DC50 (concentration for 50% degradation) and Dmax per allele, per O2 condition; ternary complex cooperativity coefficient.

**Controls:** Matched pan-RAS(ON) inhibitor (non-degrading) at equivalent target engagement; CRBN-null and VHL-null isogenic lines to confirm ligase dependency.

**What a result would tell you:** If VHL-based degraders underperform specifically in hypoxic culture, that predicts reduced activity in poorly vascularized tumor cores or in metastatic niches with variable oxygenation — directly relevant to whether a given degrader is suited for debulking bulky, hypoxic disease vs. micrometastatic (better-oxygenated) deposits.

---

## Experiment 2 — Direct test of degradation-induced neoepitope presentation

**Objective:** Confirm (or refute) that KRAS G12D degradation by PROTAC increases MHC-I presentation of KRAS-derived peptides relative to inhibition, in a KRAS G12D-mutant cell line.

**Hypothesis:** Following the precedent already shown for BET-family PROTACs and dTAG systems (acute pharmacologic degradation increases direct MHC-I presentation, with peptide presentation rate tracking degradation rate), KRAS PROTAC treatment will generate a measurably higher density of KRAS-derived MHC-I peptides than an equipotent RAS(ON) inhibitor.

**Method:**
- Treat matched KRAS G12D+ cell lines (e.g., a pancreatic or colorectal line) in parallel with (a) a KRAS G12D PROTAC, (b) an equipotent non-degrading RAS(ON) inhibitor, (c) DMSO control.
- Immunopurify MHC-I complexes at 6h, 24h, 48h post-treatment; elute and identify peptides by LC-MS/MS immunopeptidomics.
- Quantify KRAS-derived peptide abundance (label-free MS) across conditions and timepoints; correlate with bulk KRAS protein degradation kinetics (western blot / degradation ELISA run in parallel).

**Endpoints:** Fold-change in KRAS-derived MHC-I peptide abundance (degrader vs. inhibitor vs. control); correlation coefficient between degradation rate and peptide presentation rate.

**Controls:** Non-KRAS-mutant cell line (should show no KRAS-derived peptides in any condition, ruling out assay artifact); dTAG-degradable GFP reporter line as a positive control for the general degradation→presentation phenomenon.

**What a result would tell you:** A positive correlation would be direct mechanistic confirmation of the "two legs, one drug" hypothesis (debulk + immune-prime via the same molecule) rather than an inference from the separate cytokine/immune-pathway signature Arvinas reported. A null result would suggest the immune activation seen in the AACR 2026 data comes through a different route (e.g., cGAS-STING from proteotoxic stress, not direct antigen presentation) — which would still be useful, just a different mechanism to design around.

---

## Experiment 3 — Computational HLA-binding prediction for KRAS mutant-derived peptides

**Objective:** Predict which KRAS G12D/G12C/G12V-derived peptides are likely to bind common HLA class I alleles, to identify which patients (by HLA type) would plausibly benefit most from the immune-priming effect of a KRAS degrader.

**Hypothesis:** A meaningful fraction of the most common HLA-A/B/C alleles in the general population will bind at least one mutant KRAS-derived 8–11mer peptide with sub-500nM predicted affinity, but binding will be allele-specific enough that HLA typing should be a stratification variable in degrader trials.

**Method:**
- Generate all possible 8–11mer peptides spanning the KRAS mutation hotspot (codons 12/13/61) for each common mutant allele.
- Run through validated HLA-binding prediction tools (NetMHCpan-class algorithms) against the ~20 most common HLA-A/B/C alleles by population frequency.
- Cross-reference any high-affinity predicted binders against existing published KRAS neoantigen T-cell reactivity data (there is already some literature on KRAS G12D/G12V neoantigen-reactive TCRs) to sanity-check the predictions against real immune reactivity, not just binding affinity.

**Endpoints:** List of predicted strong-binder peptide-HLA pairs; population coverage estimate (% of patients with at least one qualifying HLA-peptide pair).

**Controls:** Wild-type KRAS peptides spanning the same region, as a negative comparator (should not be presented as neoantigens since they're self peptides, though some may still bind HLA without being immunogenic).

**What a result would tell you:** This is the analysis needed before Experiment 2's wet-lab presentation data can be turned into a patient-selection biomarker — it tells you which HLA types to prioritize for immunopeptidomics validation, and later, which patients a KRAS-degrader-plus-vaccine or degrader-plus-checkpoint-inhibitor combination trial should enroll.

---

## Experiment 4 — Integrin-targeted nanoparticle delivery of a PROTAC payload

**Objective:** Test whether an integrin-displaying nanoparticle (using the lung α6β4/α6β1 or liver αvβ5 "zip code" from the organotropism literature) can improve organ-specific delivery of a KRAS PROTAC payload compared to untargeted systemic dosing — directly addressing PROTACs' known poor oral bioavailability/permeability problem.

**Hypothesis:** Nanoparticles surface-functionalized with the organ-matched integrin ligand will show higher payload accumulation and target-protein degradation in the matched organ's tumor tissue, with reduced off-target (e.g., liver, for a lung-targeted particle) accumulation, relative to an untargeted lipid nanoparticle carrying the same PROTAC.

**Method:**
- Formulate PROTAC-loaded lipid or polymeric nanoparticles with surface-conjugated integrin ligands (α6β4/α6β1-targeting peptide for lung; αvβ5-targeting peptide/cyclic RGD-derivative for liver).
- Dose in an orthotopic or tail-vein metastasis mouse model with organ-specific tropism (e.g., a lung-tropic breast cancer line).
- Measure: (a) biodistribution via fluorescent/radiolabeled nanoparticle tracking across organs at 2h/24h/72h, (b) target-protein (KRAS) degradation by organ via western blot on harvested tissue, (c) tumor burden by organ at study endpoint.
- Test a dual-targeted particle (integrin ligand + anti-TFRC fragment, per the "combined address system" hypothesis) against single-ligand and untargeted particles.

**Endpoints:** Organ-specific accumulation ratio (target organ vs. liver/spleen clearance organs); degree of target protein degradation achieved per organ at matched systemic dose; whether dual-targeting improves the accumulation ratio over single-ligand targeting.

**Controls:** Untargeted nanoparticle (same PROTAC payload, no integrin ligand); free (unencapsulated) PROTAC at the same dose, to establish the baseline the targeted formulation needs to beat.

**What a result would tell you:** A positive dual-targeting result would be direct evidence for the "combined address system" idea — that layering a tissue-tropism ligand with a receptor-specific ligand (TFRC, FABP4-pathway) achieves more selective delivery than either alone, which matters because it could allow lower systemic PROTAC doses (reducing toxicity from a molecule class already known for off-target liability) while maintaining on-target potency.

---

## Experiment 5 — KRAS degrader/inhibitor combined with an ADC to test immunogenic cell death synergy

**Objective:** Test whether combining a KRAS-targeted agent (degrader or inhibitor) with a cell-surface-targeted ADC (e.g., anti-TROP2 or anti-CEACAM5, both reported as overexpressed on RAS-mutant tumors) produces more immunogenic cell death (ICD) than either agent alone.

**Hypothesis:** The ADC payload-driven cytotoxicity will release more DAMPs (calreticulin surface exposure, HMGB1 release, ATP secretion) when combined with KRAS pathway disruption than with either agent alone, because simultaneous oncogene disruption and cytotoxic payload delivery compounds cellular stress beyond what either single mechanism produces.

**Method:**
- Treat KRAS-mutant, ADC-target-positive cell lines with: (a) KRAS degrader alone, (b) KRAS inhibitor alone, (c) ADC alone, (d) degrader+ADC, (e) inhibitor+ADC.
- Quantify canonical ICD markers: surface calreticulin (flow cytometry), extracellular HMGB1 (ELISA), extracellular ATP (luciferase assay), at 24h/48h.
- Co-culture treated tumor cells with autologous or HLA-matched dendritic cells; measure DC maturation markers (CD80/CD86/CD83 upregulation) as a functional readout of whether the ICD signal actually primes an antigen-presenting cell response, not just biochemical markers in isolation.

**Endpoints:** Fold-change in each DAMP marker per condition relative to control; DC maturation marker upregulation per condition.

**Controls:** Non-immunogenic cytotoxic control (e.g., a DNA-damaging agent known not to induce strong ICD) to calibrate what a "low ICD" result looks like; ADC with a non-binding isotype control to confirm the ADC's own contribution is target-dependent.

**What a result would tell you:** If the degrader+ADC combination shows synergistic (not merely additive) ICD induction and DC maturation, that's direct support for sequencing a KRAS degrader alongside an ADC as an "in situ vaccination" strategy ahead of, or alongside, a checkpoint inhibitor or neoantigen vaccine — extending the "two legs, one combination" logic to a specific, testable regimen rather than a conceptual one.

---

## How these five connect back to the cure framework

| Experiment | Cure-framework leg(s) addressed |
|---|---|
| 1 — E3 ligase/hypoxia mapping | Leg 1 (debulking reliability across tumor microenvironments) |
| 2 — Neoepitope presentation | Leg 1 + Leg 4 (debulk-and-immunize in one molecule) |
| 3 — HLA binding prediction | Leg 4 (patient stratification for immune-priming strategies) |
| 4 — Integrin-targeted delivery | Leg 2 (precision delivery could double as re-seeding prevention if the same particle carries a niche-blocking payload) |
| 5 — ADC + degrader ICD synergy | Leg 1 + Leg 4 (in situ vaccination) |

Running all five would generate the evidence base needed to move the "two legs, one drug" hypothesis from a pattern noticed across independent papers to a deliberately designed, testable combination regimen.
