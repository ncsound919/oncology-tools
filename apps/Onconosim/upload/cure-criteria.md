# Cure Criteria — Evidence Standards for the Four-Leg Framework

**Purpose:** a rubric for designing and scoring experiments/sims against the [cure framework](metastasis-cure-framework-aug2026.md). Every proposed experiment, sim, or asset should be gradeable on two things: (1) which leg it serves, and (2) what evidence tier it actually reaches — not just what it's aimed at. "Interesting mechanism" and "criteria met" are different claims, and it's easy to conflate them when reading a preprint or a press release optimistically.

**How to use this doc:**
- Designing a new experiment → pick the leg, find the tier you're targeting, use that tier's required endpoints as your endpoint list.
- Grading an existing experiment or a real-world asset (e.g. PT0511, DT-9081) → find the highest tier it *actually* clears, not the tier its press release implies.
- Grading a combination strategy (two legs at once, e.g. "debulk + immune-prime in one molecule") → score each leg independently. A molecule doesn't get Leg 4 credit just because Leg 1 data looks good and a mechanism paper suggests it *should* also do Leg 4 — that's exactly the gap Experiment 2 in the experiment set exists to close.

---

## The tier ladder (applies within each leg)

| Tier | Name | What it establishes | What it does NOT establish |
|---|---|---|---|
| 0 | Target engagement | The molecule/intervention hits its intended target in the intended cell type, in vitro | Whether hitting the target does anything downstream |
| 1 | Phenotypic effect, isogenic/simple model | The intended downstream biology happens (degradation, DAMP release, T-cell killing, etc.) in a clean model | Whether it happens in a real tumor microenvironment, or whether it's the dominant effect vs. a minor one |
| 2 | Effect in a disease-relevant model | The effect holds up in a model with realistic heterogeneity — xenograft, organoid, syngeneic immunocompetent model, or human tissue ex vivo | Whether it holds at tolerated systemic doses in a full organism, or whether resistance emerges |
| 3 | In vivo efficacy at tolerated dose | The effect produces a measurable clinical-proxy outcome (tumor regression, reduced metastatic burden, survival) in an animal model at a dose that doesn't require unacceptable toxicity | Whether it translates to humans, or whether the animal model's biology (e.g. mouse myeloid compartment) actually resembles the human problem |
| 4 | Human proof-of-mechanism | Phase 1/2 data showing the mechanism engages in patients (PD biomarker, imaging, ctDNA) with tolerable safety | Durable clinical benefit — PK/PD success and clinical success are different, and the framework should not treat them as the same claim |
| 5 | Clinical benefit, appropriately timed | Randomized or strongly controlled evidence of the actual endpoint the leg cares about (see per-leg definitions below), measured on a timeline long enough for that leg's specific failure mode to show up | — |

**A rule that follows directly from the hidden-insights doc:** for Legs 2 and 4 specifically, tier 5 requires a *long* follow-up window by design, because both legs' failure modes are slow (re-seeding can surface years later; dormant-cell clearance failure can surface after a decade-plus fuse, per the pancreatic vaccine 6-year data problem). A tier-5 claim on a 6-year follow-up for a disease with a 15-year dormancy tail is a tier-4 claim wearing tier-5 clothes. Flag this explicitly whenever a source claims "cure" or "durable" language off a short window.

---

## Leg 1 — Eradicate bulk disease

**What tier 5 actually means here:** measurable reduction in tumor burden (primary + macrometastatic) that holds at a systemically tolerable dose, without requiring the debulking agent to also solve dormancy or re-seeding (those are Legs 2 and 4's job).

**Tier-specific endpoints:**
- Tier 0: DC50/Dmax (degraders), IC50/binding affinity (inhibitors), target engagement biomarker
- Tier 1: cell viability, downstream pathway suppression (pERK, DUSP6 for KRAS) in 1–2 cell lines
- Tier 2: efficacy across an allele panel / mutation panel in xenograft or organoid, including at least one hypoxic or otherwise microenvironment-stressed condition (see Experiment 1's hypoxia design)
- Tier 3: tumor regression in vivo at a dose with an acceptable therapeutic index; ideally tested across multiple tumor genotypes/models, not one favorable line
- Tier 4: Phase 1 PK/PD + preliminary anti-tumor activity signal, tolerable safety
- Tier 5: Phase 2/3 response rate or PFS benefit vs. standard of care or an active comparator (not placebo alone, given most Leg 1 candidates enter in pretreated populations)

**Where current assets sit (per the verified search):**
- **RP04340** (Risen Pharma) — Tier 3. In vivo tumor growth inhibition across three xenograft models (Miapaca-2, PK-59, NCI-H727) with dose-response, plus favorable tissue distribution to lung/pancreas. Not yet in humans.
- **PT0511** (PAQ Therapeutics) — Tier 4. First-in-human dosing has occurred; no efficacy or PD readout yet reported. Do not round this up to "clinically validated" — the tier-4 claim is "in patients, safety monitoring underway," nothing more yet.
- **BPI-585771** (Betta) — Tier 0–1. Preclinical, per ApexOnco's explicit clarification that Betta's only clinical KRAS asset is the pan-RAS inhibitor BPI-572270, not the degraders. Correct the earlier draft's implied momentum here.
- **The 70-degrader ligase study (CRBN/VHL/DCAF1/KLHDC2)** — Tier 1, and valuable specifically *as* a tier-1 result: it's a structured negative result (DCAF1/KLHDC2 failed) that should inform ligase choice before anyone spends tier-2/3 resources on those ligases for this target.

**Kill criteria (when a Leg 1 candidate should be deprioritized, not just noted as early-stage):**
- Fails to clear tier 2 across more than one KRAS allele/genotype (single-line success is not evidence of a platform)
- Tier 3 only achievable at a dose with a narrow or unfavorable therapeutic index
- Hypoxia-stratified data (Experiment 1 design) shows the degrader's ligase choice fails in poorly oxygenated tissue and the tumor type of interest is bulky/hypoxic (e.g. pancreatic)

---

## Leg 2 — Block re-seeding

**What tier 5 actually means here:** reduction in metastatic recurrence specifically attributable to the perioperative/peri-treatment window, on a follow-up long enough to distinguish "prevented seeding" from "delayed seeding." This is the leg most vulnerable to false tier-5 claims because recurrence-free survival at any fixed timepoint looks identical whether seeding was prevented or just hasn't surfaced yet.

**Tier-specific endpoints:**
- Tier 0: target engagement in the relevant myeloid/platelet/coagulation pathway (e.g. EP4 occupancy, catecholamine pathway blockade)
- Tier 1: reduced niche-promoting activity in vitro (macrophage polarization markers, NET formation, vascular permeability assay)
- Tier 2: reduced pre-metastatic niche formation in an orthotopic or tail-vein model, dosed specifically in the perioperative window (not chronically) to test the actual claim
- Tier 3: reduced metastatic burden at a *distant* organ site in vivo, attributable to the perioperative window specifically (requires a design that separates perioperative dosing from primary tumor debulking effect)
- Tier 4: perioperative-window human trial (like COMPIT-2) with a biomarker or imaging surrogate for reduced seeding
- Tier 5: recurrence-free survival benefit at a follow-up window matched to the disease's known dormancy/recurrence tail (per the tier-ladder rule above — this is often 10+ years, not the 3–5 year windows most trials report)

**Where current assets sit:**
- **DT-9081** (Kainova) — Tier 4, but importantly *not* run as a perioperative-window trial; it's dosed in advanced/recurrent/metastatic disease. It validates EP4 antagonism as a mechanism (tier-4 PD claim) but does not itself test the Leg 2 hypothesis as designed — that requires the COMPIT-2-style perioperative timing the immunotherapy-insights doc flags as untested. Score DT-9081 as strong Leg-4 mechanism support that has not yet been run as a Leg-2 experiment.
- **COMPIT-2** (etodolac/propranolol) — Tier 3–4 depending on latest readout; explicitly designed around the perioperative window, which is the right design for this leg specifically.

**Kill criteria:**
- Any trial or sim claiming Leg 2 success based on a follow-up window shorter than the disease's known recurrence tail
- A perioperative intervention that only has chronic-dosing data (chronic ≠ perioperative for this leg's mechanism)

---

## Leg 3 — Anticipate resistance

**What tier 5 actually means here:** a pre-specified resistance-mapped combination or sequencing regimen that measurably delays or prevents the specific resistance mechanism it was designed against, verified against real resistance data (not just resistance predicted computationally).

**Tier-specific endpoints:**
- Tier 0: identification of the resistance mechanism (genomic, epigenetic, or microenvironmental) in resistant patient/model samples
- Tier 1: in vitro demonstration that a combination/sequencing strategy prevents or reverses the specific resistance mechanism in a resistant cell line
- Tier 2: same, in a model with heterogeneous/evolving resistance (serial passage under drug pressure, or organoid with mixed clonal populations)
- Tier 3: in vivo delay of resistance emergence (time-to-progression under combination vs. monotherapy, matched dose)
- Tier 4: ctDNA- or biomarker-tracked resistance emergence in a human trial, ideally with the "closed-loop" adaptive design referenced in the deep-dive doc (Personalis-style real-time variant tracking)
- Tier 5: randomized comparison showing the anticipatory/adaptive strategy outperforms reactive (wait-for-progression-then-switch) standard of care

**Where current assets sit:**
- No asset in the reviewed documents currently clears tier 2 for this leg specifically — this is the least-populated leg of the four, and probably the highest-value place to generate new experiment proposals if the goal is filling gaps rather than validating what already exists.

**Kill criteria:**
- A "closed-loop" or adaptive-therapy claim that lacks a pre-specified switching rule (post-hoc explanation of why therapy was changed is not evidence the loop worked, it's narrative)

---

## Leg 4 — Immune cleanup of residual/dormant disease

**What tier 5 actually means here:** measurable clearance of the dormant disseminated tumor cell population specifically — not just an increase in circulating tumor-specific T cells, and not just recurrence-free survival at a timepoint too short to rule out delayed relapse. This is the leg the hidden-insights doc identifies as having the biggest gap between reported success and actual mechanistic evidence.

**Tier-specific endpoints:**
- Tier 0: MHC-I/II presentation of the relevant neoepitope confirmed by immunopeptidomics (this is exactly what Experiment 2 is designed to establish, and it doesn't yet exist for KRAS degraders specifically)
- Tier 1: T-cell reactivity against the presented neoepitope (in vitro killing assay, tetramer staining)
- Tier 2: DAMP release / DC maturation from combination treatment (Experiment 5's design) in a model with antigen-presenting cell co-culture
- Tier 3: reduced *dormant* (not just proliferating) DTC burden in an in vivo model — this requires a dormancy-specific readout (e.g. label-retaining cell assays, DTC-specific markers), not just tumor volume, because standard tumor-burden readouts are blind to the dormant population by construction
- Tier 4: human trial showing expanded tumor-specific T-cell clones (autogene cevumeran/mRNA-4157-style) — but explicitly tier 4, not tier 5, until paired with evidence the expanded clones actually encounter and clear dormant cells specifically
- Tier 5: recurrence-free survival at a follow-up matched to the specific cancer's dormancy tail, *and* a mechanistic readout (not inferred) that dormant-cell burden dropped, not just that fast-dividing micrometastatic disease was cleared

**Where current assets sit:**
- **Neoantigen vaccines (autogene cevumeran, mRNA-4157)** — Tier 4. The 6-year pancreatic cancer "recurrence-free" data is genuinely encouraging but is a tier-4-reaching-toward-5 claim, not a tier-5 claim, per the hidden-insights doc's own analysis: nothing in the published data distinguishes "cleared the dormant reservoir" from "cleared fast-dividing disease while dormant cells wait on a longer fuse." Do not round this up.
- **KRAS PROTAC neoepitope presentation** — Tier 0 and untested; this is exactly the gap Experiment 2 targets, and as of the literature reviewed it remains an open experiment, not a result.
- **Cathepsin B neoepitope destruction finding** — this is a tier-0 *negative* modifier: any Leg-4 KRAS neoepitope strategy needs to be scored net of this finding, since cathepsin B activity in the TME can independently degrade the G12/G13 neoepitopes before presentation regardless of how well the degrader itself works.

**Kill criteria:**
- Any claim of durable cure based on T-cell expansion data alone, without a dormancy-specific clearance readout
- A neoepitope strategy that hasn't been tested against cathepsin B-rich conditions, given the documented destruction mechanism

---

## Cross-leg combination scoring

When an asset or sim is proposed as serving two legs at once (the recurring "two legs, one drug" pattern across your docs — KRAS degrader as Leg 1 + Leg 4, EP4 antagonist as Leg 2 + Leg 4), score each leg's tier independently and report both. Do not let a high tier on one leg imply a high tier on the other. Concretely:

- **KRAS degrader debulk+immune-prime:** Leg 1 tier (per asset, e.g. PT0511 = tier 4) and Leg 4 tier (currently tier 0 — Experiment 2 hasn't been run) are reported separately. The "two legs, one drug" framing is a *hypothesis about a combination score*, not yet an achieved combination score.
- **EP4 antagonist perioperative + checkpoint-priming:** DT-9081 = Leg 4 tier 4 (mechanism validated in the wrong trial design for Leg 2), Leg 2 tier ≈ 1–2 (mechanistically plausible per the checkpoint-resistance paper's PGE2/EP4 finding, but no perioperative-timed trial exists yet). The immunotherapy-insights doc's "no current trial tests this directly" line is itself the tier-2→3 gap to design an experiment against.

---

## Quick-reference: scoring a new experiment proposal

Before writing a new protocol, answer four questions — this doubles as the experiment-set template going forward:

1. **Which leg(s)?** If more than one, will endpoints be measured for each independently, or does the design conflate them (e.g. using tumor volume as a proxy for both debulking *and* immune priming)?
2. **What tier is the *current* best evidence at for this specific claim** (not the target, not adjacent literature)?
3. **What's the next tier up, and what's the minimum endpoint set to get there?** (Use the tables above.)
4. **What would a null result mean, and does it rule out the mechanism or just this implementation?** (Every experiment in the existing experiment set already does this well — keep it as a required field, not optional.)

---

## Open scoring gaps (worth generating experiments/sims against)

- No asset reviewed clears tier 2 on Leg 3 (resistance anticipation) — most underserved leg by current evidence.
- No experiment yet directly tests dormant-cell-specific clearance (Leg 4, tier 3) — every current Leg 4 asset is scored on proliferating-disease proxies.
- No perioperative-timed trial exists for an EP4 antagonist specifically (Leg 2, tier 3–4 gap) despite mechanism-level rationale being unusually strong.
- No trial combines a myeloid-reprogramming agent with a mevalonate-pathway drug (statin), despite three independent mechanisms converging on that combination per the hidden-insights doc — this would be a Leg 1+2+4 combination candidate if it existed.
