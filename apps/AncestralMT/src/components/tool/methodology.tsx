"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  BookOpen,
  AlertTriangle,
  CheckCircle2,
  Info,
  ExternalLink,
  FileText,
  Lightbulb,
  ArrowRight,
  Shield,
  Zap,
  Scale,
  Dna,
  Globe,
  Target,
  ListChecks,
  Brain,
  Layers,
  Workflow,
  BarChart3,
  Users,
  RotateCcw,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ────────────────────────────────────────────────────────────
   TypeScript Interfaces
   ──────────────────────────────────────────────────────────── */

interface Tier {
  name: string;
  badgeVariant: "destructive" | "secondary" | "outline" | "default";
  criteria: string;
  ancestryNote: string;
}

interface Method {
  title: string;
  icon: React.ElementType;
  severity: "Critical" | "High" | "Medium";
  description: string;
  strengths: string[];
  limitations: string[];
  scenarios: string[];
}

interface BiasCorrection {
  title: string;
  icon: React.ElementType;
  description: string;
  effectiveness: "High" | "Medium" | "Low";
}

interface Reference {
  authors: string;
  journal: string;
  badgeVariant: "destructive" | "secondary" | "outline" | "default";
  summary: string;
}

interface ChecklistItem {
  label: string;
  status: "done" | "in-progress" | "pending";
}

interface TabDef {
  id: string;
  label: string;
  icon: React.ElementType;
  count?: number;
}

/* ────────────────────────────────────────────────────────────
   Data: ACMG/AMP Classification Tiers
   ──────────────────────────────────────────────────────────── */

const classificationTiers: Tier[] = [
  {
    name: "Pathogenic",
    badgeVariant: "destructive",
    criteria:
      "Very strong evidence (PVS1) combined with strong (PS1–PS4) or moderate (PM1–PM6) criteria. Variant is conclusively disease-causing with >99% certainty.",
    ancestryNote:
      "PVS1 evidence is primarily derived from European-ancestry functional assays. For African or African-American patients, insufficient population-specific loss-of-function data may downgrade PVS1 to supporting-level evidence, resulting in VUS classification instead of Pathogenic.",
  },
  {
    name: "Likely Pathogenic",
    badgeVariant: "secondary",
    criteria:
      "Strong pathogenic evidence (≥1 PS criterion or ≥2 PM criteria) but falls short of the certainty threshold for Pathogenic. Represents >90% certainty of pathogenicity.",
    ancestryNote:
      "In underrepresented populations, absent case-control data means PS4 (prevalence in affected vs. unaffected) is frequently unmeetable. Clinicians serving African-American or Latino populations may encounter more VUS that should be classified as Likely Pathogenic.",
  },
  {
    name: "VUS",
    badgeVariant: "secondary",
    criteria:
      "Conflicting or insufficient evidence to classify as either pathogenic or benign. Represents a clinical uncertainty gap that disproportionately affects underrepresented populations.",
    ancestryNote:
      "VUS rates are 2–5× higher in non-European populations due to sparse population frequency data and limited case-control studies. This is the single largest contributor to health disparities in hereditary cancer risk assessment.",
  },
  {
    name: "Likely Benign",
    badgeVariant: "outline",
    criteria:
      "Strong benign evidence (≥1 standalone BS criterion or ≥2 BP criteria) with >90% certainty of non-pathogenicity. Clinically actionable as non-pathogenic.",
    ancestryNote:
      "BA1 and BS1 MAF thresholds were calibrated using European-ancestry gnomAD data. Higher-genetic-diversity populations (e.g., African) have higher baseline MAF, which may misclassify rare pathogenic variants as common benign alleles.",
  },
  {
    name: "Benign",
    badgeVariant: "default",
    criteria:
      "Stand-alone benign evidence (BA1: allele frequency >5% in all populations) or multiple independent benign lines of evidence. Clinically definitive non-pathogenic classification.",
    ancestryNote:
      "The uniform BA1 threshold (>5%) may miss population-specific pathogenic variants that are locally enriched in certain ancestries but globally rare. A variant at 1% MAF in Europeans but 6% in a specific African subpopulation could be incorrectly labeled benign.",
  },
];

/* ────────────────────────────────────────────────────────────
   Data: Ancestry-Aware Adjustment Methods
   ──────────────────────────────────────────────────────────── */

const adjustmentMethods: Method[] = [
  {
    title: "Population-Specific MAF Filtering",
    icon: Target,
    severity: "Critical",
    description:
      "Replace the generic MAF threshold of 0.01 with population-matched thresholds calibrated per ancestry group. Prevents over-filtering of real variants in high-diversity populations and under-filtering of common polymorphisms in low-diversity populations.",
    strengths: [
      "Directly addresses the root cause of MAF-based misclassification",
      "Simple to implement in existing pipelines",
      "Immediate improvement in classification accuracy for non-European populations",
    ],
    limitations: [
      "Requires accurate ancestry assignment for each sample",
      "Thresholds not yet standardized across all populations",
      "May require per-gene calibration for high-variability genes like BRCA2",
    ],
    scenarios: ["Non-European cohort analysis", "Multi-ancestry clinical reporting", "BRCA1/BRCA2 variant interpretation in African or Latino patients"],
  },
  {
    title: "Ancestry-Stratified Reference Panels",
    icon: Layers,
    severity: "High",
    description:
      "Cross-reference variants against 1000 Genomes subpopulations, gnomAD ancestry groups, and TOPMed to obtain population-specific reference frequencies rather than aggregate global frequencies.",
    strengths: [
      "Comprehensive population coverage across major ancestry groups",
      "Higher specificity for ancestry-specific rare variants",
      "Enables detection of population-enriched pathogenic variants",
    ],
    limitations: [
      "TOPMed access may be restricted for some institutions",
      "gnomAD subpopulations are incomplete for AI/AN and Pacific Islander groups",
      "Requires integrating multiple data sources with different formats",
    ],
    scenarios: ["Multi-panel variant interpretation", "Cross-reference analysis for ambiguous variants", "Clinical-grade reporting for diverse patient populations"],
  },
  {
    title: "Functional Annotation Transfer",
    icon: Brain,
    severity: "High",
    description:
      "Apply functional evidence from well-studied populations cautiously to underrepresented ones, with confidence reduction. Functional annotations serve as supporting evidence for pathogenicity when population-specific data is absent.",
    strengths: [
      "Leverages existing functional evidence from well-characterized variants",
      "Can upgrade VUS to higher classification tiers in data-poor populations",
      "Complements frequency-based approaches",
    ],
    limitations: [
      "Functional studies predominantly conducted in European-ancestry cell lines",
      "Allelic effects may differ across genetic backgrounds",
      "May not transfer reliably to all variant types or mechanisms",
    ],
    scenarios: ["Pathogenicity assessment for rare variants in underrepresented groups", "Supporting evidence generation for diverse cohorts", "Bridging evidence gaps when population data is sparse"],
  },
  {
    title: "Local Ancestry Estimation",
    icon: Globe,
    severity: "High",
    description:
      "Use PCA or ADMIXTURE-based local ancestry estimation to weight variant evidence appropriately. Patients with admixed ancestry benefit from a weighted approach combining multiple reference populations.",
    strengths: [
      "Accurately captures admixed-ancestry patients who do not fit single-population models",
      "Enables personalized, locus-specific risk assessment",
      "Can reveal ancestry-specific haplotypes carrying pathogenic variants",
    ],
    limitations: [
      "Requires high-density genotype or sequencing data",
      "Complex interpretation for clinical decision-making",
      "Computational overhead for whole-genome local ancestry inference",
    ],
    scenarios: ["Admixed-ancestry patients (e.g., African American, Latino)", "Multi-ethnic variant interpretation", "Pharmacogenomic allele detection in admixed populations"],
  },
  {
    title: "Iterative Re-evaluation",
    icon: RotateCcw,
    severity: "Medium",
    description:
      "Flag variants for systematic reclassification as more diverse reference data becomes available. Especially important for populations where current evidence is insufficient but growing rapidly.",
    strengths: [
      "Future-proof approach that adapts to expanding reference datasets",
      "Reduces permanent VUS burden over time",
      "Aligns with ACMG recommendations for periodic reclassification",
    ],
    limitations: [
      "Requires ongoing monitoring infrastructure and automated pipelines",
      "Defers clinical action which may cause patient anxiety",
      "Needs clear criteria for triggering re-evaluation",
    ],
    scenarios: ["Ongoing cohort studies with longitudinal data", "Growing reference panels (TOPMed, All of Us)", "Clinical laboratories with high VUS rates in diverse populations"],
  },
];

/* ────────────────────────────────────────────────────────────
   Data: Bias Correction Approaches
   ──────────────────────────────────────────────────────────── */

const biasCorrections: BiasCorrection[] = [
  {
    title: "Statistical Resampling",
    icon: BarChart3,
    description:
      "Bootstrap and stratified resampling techniques to rebalance training data, ensuring that minority-ancestry samples are adequately represented in model development and validation sets.",
    effectiveness: "High",
  },
  {
    title: "Transfer Learning Models",
    icon: Brain,
    description:
      "Pre-train variant effect predictors on large European-ancestry datasets, then fine-tune on smaller but diverse cohorts. Leverages domain adaptation to bridge the representation gap.",
    effectiveness: "High",
  },
  {
    title: "Bayesian Priors",
    icon: Scale,
    description:
      "Incorporate ancestry-informed prior probabilities into variant classification frameworks. Adjusts posterior pathogenicity estimates based on population-specific disease prevalence and variant frequency.",
    effectiveness: "Medium",
  },
  {
    title: "Ensemble Methods",
    icon: Workflow,
    description:
      "Combine predictions from multiple ancestry-aware models (frequency-based, functional, computational) using weighted voting or stacking to produce more robust, bias-resistant classifications.",
    effectiveness: "Medium",
  },
];

/* ────────────────────────────────────────────────────────────
   Data: Key References
   ──────────────────────────────────────────────────────────── */

const references: Reference[] = [
  {
    authors: "Richards et al., 2015",
    journal: "Genetics in Medicine",
    badgeVariant: "default",
    summary:
      "Standards and guidelines for the interpretation of sequence variants. The foundational ACMG/AMP framework establishing the 5-tier classification system based on population frequency, computational predictions, functional data, and segregation evidence — the system whose reliance on population data underlies ancestry-dependent VUS disparities.",
  },
  {
    authors: "Karczewski et al., 2020",
    journal: "Nature",
    badgeVariant: "default",
    summary:
      "The mutational constraint spectrum quantified from variation in 141,456 humans via gnomAD. The largest multi-ethnic reference database aggregating exome and genome data from 200,000+ individuals across 6 major ancestry groups, yet still underrepresenting AI/AN and Pacific Islander populations.",
  },
  {
    authors: "Landry et al., 2018",
    journal: "Nature Reviews Genetics",
    badgeVariant: "secondary",
    summary:
      "Underrepresentation of non-European populations in clinical genomics research. Demonstrated that 86% of GWAS participants are of European descent, systematically excluding diverse populations from the genomic studies and databases that inform clinical variant interpretation.",
  },
  {
    authors: "Manrai et al., 2016",
    journal: "American Journal of Human Genetics",
    badgeVariant: "destructive",
    summary:
      "Genetic misdiagnoses and the potential for health disparities in the ACMG guidelines. Showed that population-specific allele frequency differences can cause pathogenic variants in one ancestry to be misclassified as benign in another, with VUS reclassification rates 2–5× higher for non-European populations.",
  },
  {
    authors: "Mills et al., 2023",
    journal: "Cell",
    badgeVariant: "default",
    summary:
      "TOPMed: The most ancestrally diverse genomic dataset with deep sequencing coverage of over 180,000 individuals. Provides the broadest reference for underrepresented populations including African American, Hispanic/Latino, and indigenous groups, enabling more accurate population-specific variant interpretation.",
  },
  {
    authors: "Milbury et al., 2022",
    journal: "Cancer Cell",
    badgeVariant: "secondary",
    summary:
      "Diversity in cancer genomics: moving beyond token diversity metrics. Advocates for structural changes in study design, recruitment, and analysis pipelines to address representation gaps, proposing frameworks for meaningful inclusion rather than surface-level diversity counting.",
  },
];

/* ────────────────────────────────────────────────────────────
   Data: Implementation Checklist
   ──────────────────────────────────────────────────────────── */

const checklistData: ChecklistItem[] = [
  { label: "Reference panel ancestry composition verified", status: "done" },
  { label: "Population-specific MAF thresholds configured", status: "done" },
  { label: "Ancestry estimation model selected and validated", status: "done" },
  { label: "Functional annotation sources cross-referenced", status: "in-progress" },
  { label: "Community variant databases consulted", status: "in-progress" },
  { label: "Ancestry-aware confidence thresholds set", status: "in-progress" },
  { label: "Clinical reporting bias audit completed", status: "pending" },
  { label: "Variant flagging workflow implemented", status: "pending" },
  { label: "Community feedback loop established", status: "pending" },
  { label: "Regulatory compliance check performed", status: "pending" },
  { label: "Longitudinal re-evaluation pipeline built", status: "pending" },
  { label: "Publication-ready gap report generated", status: "pending" },
];

/* ────────────────────────────────────────────────────────────
   Tab Definitions
   ──────────────────────────────────────────────────────────── */

const tabs: TabDef[] = [
  { id: "acmg", label: "ACMG/AMP Framework", icon: BookOpen, count: 5 },
  { id: "methods", label: "Adjustment Methods", icon: Shield, count: 5 },
  { id: "bias", label: "Bias Correction", icon: Zap, count: 4 },
  { id: "references", label: "Key References", icon: FileText, count: 6 },
  { id: "checklist", label: "Implementation Checklist", icon: ListChecks, count: 12 },
];

/* ────────────────────────────────────────────────────────────
   Helper: severity → Badge variant
   ──────────────────────────────────────────────────────────── */

function severityBadge(
  severity: string,
): { variant: "destructive" | "secondary" | "outline" | "default"; cls: string } {
  switch (severity) {
    case "Critical":
      return { variant: "destructive", cls: "" };
    case "High":
      return {
        variant: "secondary",
        cls: "bg-[oklch(0.85_0.12_45)] text-[oklch(0.45_0.18_45)] border-[oklch(0.75_0.1_45)]",
      };
    case "Medium":
      return { variant: "outline", cls: "" };
    default:
      return { variant: "outline", cls: "" };
  }
}

function effectivenessStars(eff: string) {
  const level = eff === "High" ? 3 : eff === "Medium" ? 2 : 1;
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "w-2 h-2 rounded-full",
            i < level
              ? "bg-[oklch(0.65_0.15_175)]"
              : "bg-muted",
          )}
        />
      ))}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   Section: ACMG/AMP Classification Framework
   ──────────────────────────────────────────────────────────── */

function AcmgSection() {
  return (
    <div className="space-y-5 fade-up">
      <div className="flex items-center gap-3 mb-1">
        <div className="w-9 h-9 rounded-xl bg-[oklch(0.2_0.06_175)] flex items-center justify-center">
          <BookOpen className="w-5 h-5 text-[oklch(0.7_0.15_175)]" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-foreground">
            ACMG/AMP Classification Framework
          </h3>
          <p className="text-xs text-muted-foreground">
            The 5-tier variant classification system — each tier has population-specific implications
            that directly affect clinical care for diverse patient populations.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {classificationTiers.map((tier, idx) => (
          <Card
            key={tier.name}
            className={cn(
              "hover-lift transition-all duration-200 depth-1 fade-up",
              idx < 3 && "fade-up-d1",
              idx >= 3 && idx < 5 && "fade-up-d2",
              tier.badgeVariant === "destructive" && "glow-border-destructive",
            )}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <span
                    className={cn(
                      "w-2 h-2 rounded-full",
                      tier.badgeVariant === "destructive"
                        ? "bg-destructive status-dot-pulse"
                        : tier.badgeVariant === "secondary"
                          ? "bg-[oklch(0.7_0.16_45)]"
                          : tier.badgeVariant === "outline"
                            ? "bg-muted-foreground"
                            : "bg-[oklch(0.65_0.18_145)]",
                    )}
                  />
                  {tier.name}
                </CardTitle>
                <Badge variant={tier.badgeVariant} className="badge-hover text-[10px]">
                  {tier.name === "Pathogenic"
                    ? "PVS1"
                    : tier.name === "Likely Pathogenic"
                      ? "PS / PM"
                      : tier.name === "VUS"
                        ? "Uncertain"
                        : tier.name === "Likely Benign"
                          ? "BS / BP"
                          : "BA1"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              <p className="text-xs leading-relaxed text-muted-foreground">
                {tier.criteria}
              </p>
              <div className="p-3 rounded-lg bg-[oklch(0.2_0.06_45)] border border-[oklch(0.5_0.08_45)]/40 inset-depth">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-[oklch(0.7_0.16_45)] shrink-0" />
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[oklch(0.7_0.16_45)]">
                    Ancestry Consideration
                  </p>
                </div>
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  {tier.ancestryNote}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   Section: Ancestry-Aware Adjustment Methods
   ──────────────────────────────────────────────────────────── */

function MethodsSection() {
  return (
    <div className="space-y-5 fade-up">
      <div className="flex items-center gap-3 mb-1">
        <div className="w-9 h-9 rounded-xl bg-[oklch(0.2_0.06_45)] flex items-center justify-center">
          <Shield className="w-5 h-5 text-[oklch(0.7_0.16_45)]" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-foreground">
            Ancestry-Aware Adjustment Methods
          </h3>
          <p className="text-xs text-muted-foreground">
            Systematic methods to improve variant interpretation accuracy across diverse
            populations. Each method addresses a specific gap in the current classification
            framework.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {adjustmentMethods.map((method, idx) => {
          const sb = severityBadge(method.severity);
          const Icon = method.icon;
          return (
            <Card
              key={method.title}
              className={cn(
                "hover-lift transition-all duration-200 depth-1 fade-up",
                idx === 0 && "glow-border-destructive",
                idx < 3 && "fade-up-d1",
                idx >= 3 && "fade-up-d2",
              )}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center",
                        method.severity === "Critical"
                          ? "bg-destructive/15"
                          : method.severity === "High"
                            ? "bg-[oklch(0.25_0.06_45)]"
                            : "bg-muted",
                      )}
                    >
                      <Icon
                        className={cn(
                          "w-4 h-4",
                          method.severity === "Critical"
                            ? "text-destructive"
                            : method.severity === "High"
                              ? "text-[oklch(0.7_0.16_45)]"
                              : "text-muted-foreground",
                        )}
                      />
                    </div>
                    <CardTitle className="text-sm font-semibold leading-tight">
                      {method.title}
                    </CardTitle>
                  </div>
                  <Badge
                    variant={sb.variant}
                    className={cn("badge-hover text-[10px]", sb.cls)}
                  >
                    {method.severity}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {method.description}
                </p>

                {/* Strengths */}
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[oklch(0.65_0.15_145)]">
                    Strengths
                  </p>
                  {method.strengths.map((s, i) => (
                    <div key={i} className="flex items-start gap-1.5">
                      <CheckCircle2 className="w-3 h-3 text-[oklch(0.65_0.15_145)] shrink-0 mt-0.5" />
                      <span className="text-[11px] text-muted-foreground leading-relaxed">
                        {s}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Limitations */}
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[oklch(0.7_0.16_45)]">
                    Limitations
                  </p>
                  {method.limitations.map((l, i) => (
                    <div key={i} className="flex items-start gap-1.5">
                      <XCircle className="w-3 h-3 text-[oklch(0.7_0.16_45)] shrink-0 mt-0.5" />
                      <span className="text-[11px] text-muted-foreground leading-relaxed">
                        {l}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Scenarios */}
                <div className="p-2.5 rounded-lg bg-primary/5 border border-primary/15">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Lightbulb className="w-3 h-3 text-primary shrink-0" />
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">
                      Applicable Scenarios
                    </p>
                  </div>
                  {method.scenarios.map((s, i) => (
                    <div key={i} className="flex items-start gap-1.5">
                      <ArrowRight className="w-3 h-3 text-primary shrink-0 mt-0.5" />
                      <span className="text-[11px] text-muted-foreground leading-relaxed">
                        {s}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   Section: Bias Correction Approaches
   ──────────────────────────────────────────────────────────── */

function BiasSection() {
  return (
    <div className="space-y-5 fade-up">
      <div className="flex items-center gap-3 mb-1">
        <div className="w-9 h-9 rounded-xl bg-[oklch(0.2_0.06_175)] flex items-center justify-center">
          <Zap className="w-5 h-5 text-[oklch(0.7_0.15_175)]" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-foreground">
            Bias Correction Approaches
          </h3>
          <p className="text-xs text-muted-foreground">
            Statistical and computational methods to correct for ancestry bias in variant
            interpretation pipelines and clinical reporting systems.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {biasCorrections.map((corr, idx) => {
          const Icon = corr.icon;
          const sb = severityBadge(corr.effectiveness);
          return (
            <Card
              key={corr.title}
              className={cn(
                "hover-lift transition-all duration-200 depth-1 fade-up",
                idx === 0 && "card-gradient-teal",
                idx === 1 && "card-gradient-amber",
                idx < 2 && "fade-up-d1",
                idx >= 2 && "fade-up-d2",
              )}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Icon className="w-4 h-4 text-primary" />
                    </div>
                    <CardTitle className="text-sm font-semibold">
                      {corr.title}
                    </CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    {effectivenessStars(corr.effectiveness)}
                    <Badge
                      variant={sb.variant}
                      className={cn("badge-hover text-[10px]", sb.cls)}
                    >
                      {corr.effectiveness}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {corr.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   Section: Key References
   ──────────────────────────────────────────────────────────── */

function ReferencesSection() {
  return (
    <div className="space-y-5 fade-up">
      <div className="flex items-center gap-3 mb-1">
        <div className="w-9 h-9 rounded-xl bg-[oklch(0.15_0.04_280)] flex items-center justify-center">
          <FileText className="w-5 h-5 text-[oklch(0.7_0.12_280)]" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-foreground">
            Key References
          </h3>
          <p className="text-xs text-muted-foreground">
            Foundational papers underpinning the ancestry bias problem and supporting the
            methodology described above.
          </p>
        </div>
        <Badge variant="default" className="text-[10px] ml-auto">
          {references.length} Papers
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {references.map((ref, idx) => (
          <Card
            key={ref.authors}
            className={cn(
              "hover-lift transition-all duration-200 depth-1 fade-up",
              idx < 3 && "fade-up-d1",
              idx >= 3 && "fade-up-d2",
              ref.badgeVariant === "destructive" && "glow-border-destructive",
            )}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ExternalLink className="w-3.5 h-3.5 text-primary" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">
                    {ref.journal}
                  </span>
                </div>
                <Badge variant={ref.badgeVariant} className="badge-hover text-[9px]">
                  {ref.journal === "Nature"
                    ? "High Impact"
                    : ref.journal === "Cell"
                      ? "Database"
                      : ref.journal === "American Journal of Human Genetics"
                        ? "Landmark"
                        : ref.journal === "Cancer Cell"
                          ? "Review"
                          : ref.journal === "Genetics in Medicine"
                            ? "Guideline"
                            : "Study"}
                </Badge>
              </div>
              <CardTitle className="text-xs font-semibold text-foreground mt-1">
                {ref.authors}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                {ref.summary}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   Section: Implementation Checklist
   ──────────────────────────────────────────────────────────── */

function ChecklistSection() {
  const doneCount = checklistData.filter((c) => c.status === "done").length;
  const inProgressCount = checklistData.filter((c) => c.status === "in-progress").length;
  const totalCount = checklistData.length;
  const pct = Math.round((doneCount / totalCount) * 100);

  return (
    <div className="space-y-5 fade-up">
      <div className="flex items-center gap-3 mb-1">
        <div className="w-9 h-9 rounded-xl bg-[oklch(0.2_0.06_175)] flex items-center justify-center">
          <ListChecks className="w-5 h-5 text-[oklch(0.7_0.15_175)]" />
        </div>
        <div className="flex-1">
          <h3 className="text-base font-semibold text-foreground">
            Implementation Checklist
          </h3>
          <p className="text-xs text-muted-foreground">
            Track progress on deploying ancestry-aware variant interpretation in your pipeline.
          </p>
        </div>
      </div>

      {/* Progress summary card */}
      <Card className="depth-2 card-gradient-teal neon-line">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-foreground">
              Overall Progress
            </span>
            <span className="text-sm font-bold tabular-nums text-primary">
              {doneCount}/{totalCount} complete
            </span>
          </div>
          <Progress value={pct} className="h-2.5 mb-3" />
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-[oklch(0.65_0.15_145)]" />
              <span>{doneCount} Done</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Dna className="w-3.5 h-3.5 text-[oklch(0.7_0.16_45)]" />
              <span>{inProgressCount} In Progress</span>
            </div>
            <div className="flex items-center gap-1.5">
              <XCircle className="w-3.5 h-3.5 text-muted-foreground" />
              <span>{totalCount - doneCount - inProgressCount} Pending</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Checklist items */}
      <Card className="depth-1">
        <CardContent className="p-4 space-y-1">
          {checklistData.map((item, idx) => {
            const isDone = item.status === "done";
            const isInProgress = item.status === "in-progress";
            return (
              <div
                key={idx}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                  isDone && "bg-[oklch(0.65_0.08_145)]/10",
                  isInProgress && "bg-[oklch(0.7_0.08_45)]/10",
                  !isDone && !isInProgress && "bg-muted/30",
                )}
              >
                {isDone ? (
                  <CheckCircle2 className="w-4 h-4 text-[oklch(0.65_0.15_145)] shrink-0" />
                ) : isInProgress ? (
                  <Dna className="w-4 h-4 text-[oklch(0.7_0.16_45)] shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 text-muted-foreground/50 shrink-0" />
                )}
                <span
                  className={cn(
                    "text-xs flex-1",
                    isDone
                      ? "text-foreground line-through decoration-muted-foreground"
                      : isInProgress
                        ? "text-foreground font-medium"
                        : "text-muted-foreground",
                  )}
                >
                  {item.label}
                </span>
                <Badge
                  variant={
                    isDone
                      ? "default"
                      : isInProgress
                        ? "secondary"
                        : "outline"
                  }
                  className={cn(
                    "text-[9px]",
                    isDone &&
                      "bg-[oklch(0.65_0.08_145)] text-[oklch(0.3_0.05_145)]",
                    isInProgress &&
                      "bg-[oklch(0.85_0.1_45)] text-[oklch(0.4_0.12_45)]",
                  )}
                >
                  {isDone ? "Done" : isInProgress ? "In Progress" : "Pending"}
                </Badge>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   Main Exported Component
   ──────────────────────────────────────────────────────────── */

export function MethodologyView() {
  const [activeTab, setActiveTab] = useState("acmg");

  return (
    <div className="space-y-6 fade-up">
      {/* Page header */}
      <div className="flex items-start gap-4 mb-2">
        <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center card-inner-shadow">
          <BookOpen className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground tracking-tight">
            VUS Reclassification Methodology
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Educational reference for ancestry-aware variant interpretation and bias
            correction in clinical genomics.
          </p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex flex-wrap gap-1.5 p-1.5 rounded-xl bg-muted/40 depth-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all duration-200 btn-press",
                isActive
                  ? "bg-background text-foreground shadow-sm tab-active-bar"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
              )}
            >
              <Icon className={cn("w-3.5 h-3.5", isActive && "text-primary")} />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <Badge
                  variant={isActive ? "default" : "outline"}
                  className="text-[9px] px-1.5 py-0"
                >
                  {tab.count}
                </Badge>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="min-h-[400px]">
        {activeTab === "acmg" && <AcmgSection />}
        {activeTab === "methods" && <MethodsSection />}
        {activeTab === "bias" && <BiasSection />}
        {activeTab === "references" && <ReferencesSection />}
        {activeTab === "checklist" && <ChecklistSection />}
      </div>
    </div>
  );
}
