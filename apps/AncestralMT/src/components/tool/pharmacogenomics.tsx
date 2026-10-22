"use client";

import React, { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import type { ChartConfig } from "@/components/ui/chart";
import {
  Pill,
  TestTube2,
  AlertTriangle,
  Activity,
  Beaker,
  FileText,
  Stethoscope,
  Globe,
  Users,
  Shield,
  Zap,
  ArrowRight,
  CheckCircle2,
  Info,
  BarChart3,
  Eye,
  FlaskConical,
  Heart,
  Brain,
  Target,
  ChevronRight,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

// ── Types ───────────────────────────────────────────────────────────────────

type Population = "EUR" | "AFR" | "EAS" | "SAS" | "AMR" | "OTH";

interface StatCard {
  label: string;
  value: string | number;
  icon: React.ElementType;
  description: string;
  variant: "teal" | "amber" | "destructive" | "default";
}

interface DrugResponseData {
  population: string;
  tamoxifen: number;
  fluorouracil: number;
  irinotecan: number;
}

interface CYPVariant {
  gene: string;
  variant: string;
 frequencyEUR: number;
  frequencyAFR: number;
  frequencyEAS: number;
  frequencySAS: number;
  frequencyAMR: number;
  clinicalImpact: "High" | "Medium" | "Low";
  drugsAffected: string;
  ancestryNote: string;
  highlight?: boolean;
}

interface Recommendation {
  drug: string;
  gene: string;
  populationImpact: string;
  recommendation: string;
  evidenceLevel: "A" | "B" | "C";
  icon: React.ElementType;
}

type DataAvailability = "Well-studied" | "Limited data" | "No data" | "Unknown";

interface DisparityCell {
  drug: string;
  population: string;
  status: DataAvailability;
}

interface DisparityInsight {
  title: string;
  description: string;
  severity: "critical" | "warning" | "info";
  icon: React.ElementType;
}

// ── Chart Config ────────────────────────────────────────────────────────────

const chartConfig: ChartConfig = {
  tamoxifen: { label: "Tamoxifen (CYP2D6)", color: "oklch(0.7 0.15 180)" },
  fluorouracil: { label: "Fluorouracil (DPYD)", color: "oklch(0.75 0.15 80)" },
  irinotecan: { label: "Irinotecan (UGT1A1)", color: "oklch(0.65 0.2 25)" },
};

// ── Data ────────────────────────────────────────────────────────────────────

const POPULATIONS: { key: Population; label: string }[] = [
  { key: "EUR", label: "European (EUR)" },
  { key: "AFR", label: "African (AFR)" },
  { key: "EAS", label: "East Asian (EAS)" },
  { key: "SAS", label: "South Asian (SAS)" },
  { key: "AMR", label: "Admixed/AMR" },
  { key: "OTH", label: "Other (OTH)" },
];

const statCards: StatCard[] = [
  {
    label: "Pharmacogenes Tracked",
    value: 87,
    icon: TestTube2,
    description: "CPIC + PharmGKB curated genes",
    variant: "teal",
  },
  {
    label: "Population Groups",
    value: 6,
    icon: Users,
    description: "Major ancestral populations",
    variant: "amber",
  },
  {
    label: "Drug-Gene Interactions",
    value: 142,
    icon: FlaskConical,
    description: "Clinically actionable pairs",
    variant: "teal",
  },
  {
    label: "Ancestry-Specific Alerts",
    value: 23,
    icon: AlertTriangle,
    description: "Population-specific dosing warnings",
    variant: "destructive",
  },
];

const drugResponseData: DrugResponseData[] = [
  { population: "EUR", tamoxifen: 78, fluorouracil: 85, irinotecan: 72 },
  { population: "AFR", tamoxifen: 52, fluorouracil: 61, irinotecan: 48 },
  { population: "EAS", tamoxifen: 65, fluorouracil: 70, irinotecan: 58 },
  { population: "SAS", tamoxifen: 71, fluorouracil: 76, irinotecan: 63 },
  { population: "AMR", tamoxifen: 58, fluorouracil: 67, irinotecan: 54 },
  { population: "OTH", tamoxifen: 45, fluorouracil: 52, irinotecan: 40 },
];

const cypVariants: CYPVariant[] = [
  {
    gene: "CYP2D6",
    variant: "*4",
    frequencyEUR: 20.5,
    frequencyAFR: 1.5,
    frequencyEAS: 0.8,
    frequencySAS: 2.1,
    frequencyAMR: 5.2,
    clinicalImpact: "High",
    drugsAffected: "Tamoxifen, Codeine, Tramadol",
    ancestryNote: "Most common PM allele in EUR; rare in AFR/EAS",
  },
  {
    gene: "CYP2D6",
    variant: "*17",
    frequencyEUR: 0.5,
    frequencyAFR: 30.0,
    frequencyEAS: 0.2,
    frequencySAS: 0.8,
    frequencyAMR: 3.5,
    clinicalImpact: "High",
    drugsAffected: "Tamoxifen, Codeine, Aripiprazole",
    ancestryNote: "CYP2D6*17: AFR 30% vs EUR 0.5% — major disparity",
    highlight: true,
  },
  {
    gene: "CYP2D6",
    variant: "*10",
    frequencyEUR: 1.5,
    frequencyAFR: 3.0,
    frequencyEAS: 45.0,
    frequencySAS: 5.2,
    frequencyAMR: 4.0,
    clinicalImpact: "High",
    drugsAffected: "Tamoxifen, Metoprolol, Fluvoxamine",
    ancestryNote: "Dominant PM allele in EAS (45%); underrepresented in trials",
  },
  {
    gene: "CYP2C19",
    variant: "*2",
    frequencyEUR: 15.0,
    frequencyAFR: 14.0,
    frequencyEAS: 29.0,
    frequencySAS: 35.0,
    frequencyAMR: 12.0,
    clinicalImpact: "High",
    drugsAffected: "Clopidogrel, PPIs, Voriconazole",
    ancestryNote: "High LOF frequency in SAS (35%) and EAS (29%)",
  },
  {
    gene: "CYP2C19",
    variant: "*3",
    frequencyEUR: 0.5,
    frequencyAFR: 0.2,
    frequencyEAS: 8.0,
    frequencySAS: 1.2,
    frequencyAMR: 0.3,
    clinicalImpact: "Medium",
    drugsAffected: "Clopidogrel, Voriconazole",
    ancestryNote: "EAS-enriched LOF allele (8%); rare elsewhere",
  },
  {
    gene: "DPYD",
    variant: "*2A",
    frequencyEUR: 1.8,
    frequencyAFR: 0.2,
    frequencyEAS: 0.5,
    frequencySAS: 1.0,
    frequencyAMR: 0.8,
    clinicalImpact: "High",
    drugsAffected: "Fluorouracil, Capecitabine, Tegafur",
    ancestryNote: "EUR-enriched; severe toxicity risk if undetected",
  },
  {
    gene: "UGT1A1",
    variant: "*28",
    frequencyEUR: 28.0,
    frequencyAFR: 42.0,
    frequencyEAS: 12.0,
    frequencySAS: 15.0,
    frequencyAMR: 22.0,
    clinicalImpact: "High",
    drugsAffected: "Irinotecan, Atazanavir, Belinostat",
    ancestryNote: "Highest in AFR (42%); severe neutropenia risk",
  },
  {
    gene: "UGT1A1",
    variant: "*6",
    frequencyEUR: 2.0,
    frequencyAFR: 1.0,
    frequencyEAS: 20.0,
    frequencySAS: 3.5,
    frequencyAMR: 1.5,
    clinicalImpact: "Medium",
    drugsAffected: "Irinotecan, Belinostat",
    ancestryNote: "EAS-specific (20%); additive risk with *28",
  },
];

const recommendations: Recommendation[] = [
  {
    drug: "Tamoxifen",
    gene: "CYP2D6",
    populationImpact: "AFR, EAS, AMR populations at elevated risk",
    recommendation:
      "CYP2D6 poor metabolizers (PM) have 30-50% lower endoxifen levels. In AFR populations, CYP2D6*17 is prevalent (30%) vs EUR (0.5%). Consider alternative endocrine therapy (aromatase inhibitors) or therapeutic drug monitoring for AFR patients with CYP2D6 PM genotypes.",
    evidenceLevel: "A",
    icon: Pill,
  },
  {
    drug: "Fluorouracil",
    gene: "DPYD",
    populationImpact: "EUR-enriched risk, variable detection in other populations",
    recommendation:
      "DPYD*2A carriers (1.8% EUR, 0.2% AFR) require ≥50% dose reduction. DPD deficiency testing is standard in EUR but rarely performed in AFR/AMR populations, creating an equity gap in toxicity prevention. Expand pre-treatment DPYD screening to all populations.",
    evidenceLevel: "A",
    icon: Shield,
  },
  {
    drug: "Irinotecan",
    gene: "UGT1A1",
    populationImpact: "AFR (42%) and EUR (28%) at highest neutropenia risk",
    recommendation:
      "UGT1A1*28 homozygotes require irinotecan dose reduction (Grade A). AFR populations have the highest *28 frequency (42%) but are underrepresented in pharmacogenomic trials. Implement UGT1A1*28/*6 genotyping before irinotecan initiation across all populations.",
    evidenceLevel: "A",
    icon: AlertTriangle,
  },
  {
    drug: "Warfarin",
    gene: "CYP2C9",
    populationImpact: "EUR-enriched sensitivity alleles (*2, *3)",
    recommendation:
      "CYP2C9*2 (12% EUR) and *3 (7% EUR) reduce warfarin metabolism. These alleles are rare in AFR (<1%) and EAS (<2%). EUR-centric dosing algorithms may overestimate warfarin dose in non-EUR populations. Use ancestry-aware pharmacogenomic dosing calculators.",
    evidenceLevel: "B",
    icon: Heart,
  },
  {
    drug: "Clopidogrel",
    gene: "CYP2C19",
    populationImpact: "AFR, AMR, SAS, EAS with higher LOF allele frequency",
    recommendation:
      "CYP2C19 LOF alleles (*2, *3) reduce clopidogrel activation. SAS (35%) and EAS (29%) have the highest LOF burden. Consider alternative antiplatelet agents (ticagrelor, prasugrel) in CYP2C19 PM patients, especially in SAS and EAS populations.",
    evidenceLevel: "A",
    icon: Brain,
  },
  {
    drug: "Thiopurines",
    gene: "TPMT",
    populationImpact: "Variable ancestry patterns; EUR-enriched variant *3A",
    recommendation:
      "TPMT variants (*2, *3A, *3C) increase myelosuppression risk. *3A is EUR-enriched (3.5%) while *3C is more common in AFR (0.4%) and SAS (1.5%). Dose reduction or alternative agents recommended for heterozygotes; avoid in homozygous deficient patients regardless of ancestry.",
    evidenceLevel: "B",
    icon: Stethoscope,
  },
];

const DRUGS = [
  "Tamoxifen",
  "Fluorouracil",
  "Irinotecan",
  "Warfarin",
  "Clopidogrel",
  "Thiopurines",
];

const POP_KEYS: Population[] = ["EUR", "AFR", "EAS", "SAS", "AMR", "OTH"];

const disparityMatrix: DisparityCell[] = [
  // Tamoxifen
  { drug: "Tamoxifen", population: "EUR", status: "Well-studied" },
  { drug: "Tamoxifen", population: "AFR", status: "Limited data" },
  { drug: "Tamoxifen", population: "EAS", status: "Limited data" },
  { drug: "Tamoxifen", population: "SAS", status: "No data" },
  { drug: "Tamoxifen", population: "AMR", status: "No data" },
  { drug: "Tamoxifen", population: "OTH", status: "Unknown" },
  // Fluorouracil
  { drug: "Fluorouracil", population: "EUR", status: "Well-studied" },
  { drug: "Fluorouracil", population: "AFR", status: "No data" },
  { drug: "Fluorouracil", population: "EAS", status: "Limited data" },
  { drug: "Fluorouracil", population: "SAS", status: "Limited data" },
  { drug: "Fluorouracil", population: "AMR", status: "No data" },
  { drug: "Fluorouracil", population: "OTH", status: "Unknown" },
  // Irinotecan
  { drug: "Irinotecan", population: "EUR", status: "Well-studied" },
  { drug: "Irinotecan", population: "AFR", status: "Limited data" },
  { drug: "Irinotecan", population: "EAS", status: "Well-studied" },
  { drug: "Irinotecan", population: "SAS", status: "Limited data" },
  { drug: "Irinotecan", population: "AMR", status: "No data" },
  { drug: "Irinotecan", population: "OTH", status: "Unknown" },
  // Warfarin
  { drug: "Warfarin", population: "EUR", status: "Well-studied" },
  { drug: "Warfarin", population: "AFR", status: "Limited data" },
  { drug: "Warfarin", population: "EAS", status: "Well-studied" },
  { drug: "Warfarin", population: "SAS", status: "No data" },
  { drug: "Warfarin", population: "AMR", status: "Limited data" },
  { drug: "Warfarin", population: "OTH", status: "Unknown" },
  // Clopidogrel
  { drug: "Clopidogrel", population: "EUR", status: "Well-studied" },
  { drug: "Clopidogrel", population: "AFR", status: "No data" },
  { drug: "Clopidogrel", population: "EAS", status: "Limited data" },
  { drug: "Clopidogrel", population: "SAS", status: "Limited data" },
  { drug: "Clopidogrel", population: "AMR", status: "No data" },
  { drug: "Clopidogrel", population: "OTH", status: "Unknown" },
  // Thiopurines
  { drug: "Thiopurines", population: "EUR", status: "Well-studied" },
  { drug: "Thiopurines", population: "AFR", status: "No data" },
  { drug: "Thiopurines", population: "EAS", status: "Limited data" },
  { drug: "Thiopurines", population: "SAS", status: "No data" },
  { drug: "Thiopurines", population: "AMR", status: "No data" },
  { drug: "Thiopurines", population: "OTH", status: "Unknown" },
];

const disparityInsights: DisparityInsight[] = [
  {
    title: "African populations critically underrepresented",
    description:
      "AFR populations have zero well-studied pharmacogenomic datasets for any of the 6 cancer drugs analyzed. This 0/6 rate is the worst among all populations and directly impacts clinical safety.",
    severity: "critical",
    icon: AlertTriangle,
  },
  {
    title: "European bias creates dosing inequity",
    description:
      "All 6 drugs are well-studied in EUR populations, establishing the clinical evidence base. However, EU RCTs generate dosing guidelines inapplicable to non-EUR groups without population-specific validation.",
    severity: "warning",
    icon: Globe,
  },
  {
    title: "Admixed/Latino populations have no pharmacogenomic data",
    description:
      "AMR populations lack well-studied status for all 6 drugs. Given genetic admixture, ancestry-specific allele frequencies cannot be reliably inferred from EUR or AFR reference data.",
    severity: "critical",
    icon: Users,
  },
  {
    title: "South Asian population data gap for cancer drugs",
    description:
      "SAS has no well-studied pharmacogenomic data for 5 of 6 cancer drugs. With 1.9 billion people globally, this represents one of the largest pharmacogenomic blind spots in oncology.",
    severity: "warning",
    icon: Target,
  },
];

// ── Helpers ─────────────────────────────────────────────────────────────────

function getFrequencyColor(freq: number): string {
  if (freq > 10) return "text-emerald-400";
  if (freq >= 1) return "text-amber-400";
  return "text-red-400";
}

function getFrequencyBg(freq: number): string {
  if (freq > 10) return "bg-emerald-400/10";
  if (freq >= 1) return "bg-amber-400/10";
  return "bg-red-400/10";
}

function getAvailabilityStyles(status: DataAvailability) {
  switch (status) {
    case "Well-studied":
      return "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
    case "Limited data":
      return "bg-amber-500/20 text-amber-300 border-amber-500/30";
    case "No data":
      return "bg-red-500/20 text-red-300 border-red-500/30";
    case "Unknown":
      return "bg-muted/30 text-muted-foreground border-muted-foreground/20";
  }
}

function getEvidenceBadge(level: "A" | "B" | "C") {
  switch (level) {
    case "A":
      return (
        <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/30">
          <CheckCircle2 className="size-3 mr-1" />
          Level A — Strong
        </Badge>
      );
    case "B":
      return (
        <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 hover:bg-amber-500/30">
          <Info className="size-3 mr-1" />
          Level B — Moderate
        </Badge>
      );
    case "C":
      return (
        <Badge className="bg-red-500/20 text-red-300 border-red-500/30 hover:bg-red-500/30">
          <AlertTriangle className="size-3 mr-1" />
          Level C — Weak
        </Badge>
      );
  }
}

function getImpactBadge(impact: "High" | "Medium" | "Low") {
  switch (impact) {
    case "High":
      return (
        <Badge className="bg-red-500/20 text-red-300 border-red-500/30 hover:bg-red-500/30">
          High
        </Badge>
      );
    case "Medium":
      return (
        <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 hover:bg-amber-500/30">
          Medium
        </Badge>
      );
    case "Low":
      return (
        <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/30">
          Low
        </Badge>
      );
  }
}

function getStatCardVariant(
  variant: "teal" | "amber" | "destructive" | "default"
) {
  switch (variant) {
    case "teal":
      return "card-gradient-teal glow-border-teal";
    case "amber":
      return "card-gradient-amber glow-border-warning";
    case "destructive":
      return "card-gradient-destructive glow-border-destructive";
    default:
      return "";
  }
}

// ── Sub-components ──────────────────────────────────────────────────────────

function StatCardComponent({ card, index }: { card: StatCard; index: number }) {
  const Icon = card.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.4 }}
    >
      <Card
        className={cn(
          "relative overflow-hidden depth-1 hover-lift p-4",
          getStatCardVariant(card.variant)
        )}
      >
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
              {card.label}
            </p>
            <p className="text-2xl font-bold tabular-nums count-animate">
              {card.value}
            </p>
            <p className="text-xs text-muted-foreground">{card.description}</p>
          </div>
          <div
            className={cn(
              "rounded-lg p-2.5",
              card.variant === "teal" && "bg-teal-500/15 text-teal-400",
              card.variant === "amber" && "bg-amber-500/15 text-amber-400",
              card.variant === "destructive" &&
                "bg-red-500/15 text-red-400",
              card.variant === "default" && "bg-muted text-muted-foreground"
            )}
          >
            <Icon className="size-5" />
          </div>
        </div>
        {card.variant === "destructive" && (
          <div className="card-highlight-top" />
        )}
      </Card>
    </motion.div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────

export function PharmacogenomicsView() {
  const [activeTab, setActiveTab] = useState("overview");
  const [geneFilter, setGeneFilter] = useState<string>("all");
  const [impactFilter, setImpactFilter] = useState<string>("all");

  const filteredVariants = useMemo(() => {
    return cypVariants.filter((v) => {
      const geneMatch =
        geneFilter === "all" || v.gene === geneFilter;
      const impactMatch =
        impactFilter === "all" || v.clinicalImpact === impactFilter;
      return geneMatch && impactMatch;
    });
  }, [geneFilter, impactFilter]);

  const uniqueGenes = useMemo(
    () => ["all", ...Array.from(new Set(cypVariants.map((v) => v.gene)))],
    []
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="fade-up">
        <div className="flex items-center gap-3 mb-2">
          <div className="rounded-lg bg-teal-500/15 p-2">
            <Pill className="size-5 text-teal-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              Pharmacogenomics & Drug Response
            </h2>
            <p className="text-sm text-muted-foreground">
              Ancestral diversity in pharmacogenomic outcomes for cancer treatment
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="fade-up fade-up-d1"
      >
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="overview" className="gap-1.5">
            <BarChart3 className="size-4" />
            <span className="hidden sm:inline">Drug Response Overview</span>
            <span className="sm:hidden">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="cyp" className="gap-1.5">
            <TestTube2 className="size-4" />
            <span className="hidden sm:inline">CYP Variant Analysis</span>
            <span className="sm:hidden">CYP</span>
          </TabsTrigger>
          <TabsTrigger value="recommendations" className="gap-1.5">
            <Stethoscope className="size-4" />
            <span className="hidden sm:inline">Clinical Recommendations</span>
            <span className="sm:hidden">Rx</span>
          </TabsTrigger>
          <TabsTrigger value="disparity" className="gap-1.5">
            <Globe className="size-4" />
            <span className="hidden sm:inline">Population Disparity</span>
            <span className="sm:hidden">Disparity</span>
          </TabsTrigger>
        </TabsList>

        {/* ─── Tab 1: Drug Response Overview ─── */}
        <TabsContent value="overview" className="space-y-6 mt-4">
          {/* Summary stat cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map((card, i) => (
              <StatCardComponent key={card.label} card={card} index={i} />
            ))}
          </div>

          {/* Grouped Bar Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <Card className="depth-1">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Activity className="size-4 text-teal-400" />
                      Drug Response Rates by Population
                    </CardTitle>
                    <CardDescription className="mt-1">
                      Treatment response rates (%) across ancestral populations for
                      3 cancer drugs with pharmacogenomic guidelines
                    </CardDescription>
                  </div>
                  <Badge
                    variant="outline"
                    className="text-xs border-teal-500/30 text-teal-400"
                  >
                    <Eye className="size-3 mr-1" />
                    6 populations
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={chartConfig}
                  className="h-[380px] w-full"
                >
                  <BarChart
                    data={drugResponseData}
                    margin={{
                      top: 10,
                      right: 10,
                      left: 0,
                      bottom: 0,
                    }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="stroke-muted-foreground/20"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="population"
                      tick={{ fontSize: 12, fill: "oklch(0.7 0 0)" }}
                      axisLine={{ stroke: "oklch(0.5 0 0)" }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 12, fill: "oklch(0.7 0 0)" }}
                      axisLine={{ stroke: "oklch(0.5 0 0)" }}
                      tickLine={false}
                      domain={[0, 100]}
                      tickFormatter={(v) => `${v}%`}
                    />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          className="bg-popover border-border"
                          formatter={(value) => [
                            `${value}%`,
                            undefined,
                          ]}
                        />
                      }
                    />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Bar
                      dataKey="tamoxifen"
                      fill="oklch(0.7 0.15 180)"
                      radius={[4, 4, 0, 0]}
                      barSize={14}
                    />
                    <Bar
                      dataKey="fluorouracil"
                      fill="oklch(0.75 0.15 80)"
                      radius={[4, 4, 0, 0]}
                      barSize={14}
                    />
                    <Bar
                      dataKey="irinotecan"
                      fill="oklch(0.65 0.2 25)"
                      radius={[4, 4, 0, 0]}
                      barSize={14}
                    />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </motion.div>

          {/* Insight callout */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.4 }}
          >
            <Card className="border-amber-500/30 bg-amber-500/5 depth-1">
              <CardContent className="p-4 flex items-start gap-3">
                <div className="rounded-lg bg-amber-500/15 p-2 mt-0.5 shrink-0">
                  <AlertTriangle className="size-4 text-amber-400" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-amber-300">
                    Key Finding: Ancestral Response Disparity
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    European (EUR) populations consistently show the highest
                    response rates across all three drugs, reflecting both
                    population-specific pharmacogenomics and the EUR-centric
                    bias in clinical trial design. AFR populations show the
                    greatest response variation (40-61%), driven by
                    underrepresentation in pharmacogenomic studies and distinct
                    allele frequency distributions.
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* ─── Tab 2: CYP Variant Analysis ─── */}
        <TabsContent value="cyp" className="space-y-4 mt-4">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                Filter:
              </span>
              <Select value={geneFilter} onValueChange={setGeneFilter}>
                <SelectTrigger className="w-[150px] h-8 text-xs">
                  <SelectValue placeholder="All Genes" />
                </SelectTrigger>
                <SelectContent>
                  {uniqueGenes.map((g) => (
                    <SelectItem key={g} value={g} className="text-xs">
                      {g === "all" ? "All Genes" : g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Select value={impactFilter} onValueChange={setImpactFilter}>
              <SelectTrigger className="w-[150px] h-8 text-xs">
                <SelectValue placeholder="All Impact" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">
                  All Impact Levels
                </SelectItem>
                <SelectItem value="High" className="text-xs">
                  High
                </SelectItem>
                <SelectItem value="Medium" className="text-xs">
                  Medium
                </SelectItem>
                <SelectItem value="Low" className="text-xs">
                  Low
                </SelectItem>
              </SelectContent>
            </Select>
            <Badge
              variant="outline"
              className="text-xs text-muted-foreground"
            >
              {filteredVariants.length} variant{filteredVariants.length !== 1 ? "s" : ""}
            </Badge>
          </div>

          {/* Variant Table */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
          >
            <Card className="depth-1 overflow-hidden">
              <CardContent className="p-0">
                <div className="overflow-x-auto max-h-[500px] overflow-y-auto scrollbar-gradient">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 z-10">
                      <tr className="border-b border-border bg-muted/50 backdrop-blur-sm">
                        <th className="text-left p-3 font-semibold text-muted-foreground uppercase tracking-wider">
                          Gene
                        </th>
                        <th className="text-left p-3 font-semibold text-muted-foreground uppercase tracking-wider">
                          Variant
                        </th>
                        <th className="text-center p-3 font-semibold text-teal-400 uppercase tracking-wider">
                          EUR
                        </th>
                        <th className="text-center p-3 font-semibold text-red-400 uppercase tracking-wider">
                          AFR
                        </th>
                        <th className="text-center p-3 font-semibold text-amber-400 uppercase tracking-wider">
                          EAS
                        </th>
                        <th className="text-center p-3 font-semibold text-purple-400 uppercase tracking-wider">
                          SAS
                        </th>
                        <th className="text-center p-3 font-semibold text-sky-400 uppercase tracking-wider">
                          AMR
                        </th>
                        <th className="text-center p-3 font-semibold text-muted-foreground uppercase tracking-wider">
                          Impact
                        </th>
                        <th className="text-left p-3 font-semibold text-muted-foreground uppercase tracking-wider max-w-[160px]">
                          Drug(s)
                        </th>
                        <th className="text-left p-3 font-semibold text-muted-foreground uppercase tracking-wider max-w-[220px]">
                          Ancestry Note
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredVariants.map((v, idx) => (
                        <tr
                          key={`${v.gene}-${v.variant}`}
                          className={cn(
                            "border-b border-border/50 table-hover-stripe transition-colors",
                            v.highlight && "bg-amber-500/5 border-amber-500/20"
                          )}
                        >
                          <td className="p-3 font-mono font-semibold text-foreground">
                            {v.gene}
                          </td>
                          <td className="p-3 font-mono font-bold text-teal-400">
                            {v.variant}
                          </td>
                          <td className="p-3 text-center">
                            <span
                              className={cn(
                                "inline-block px-2 py-0.5 rounded text-xs font-mono font-medium",
                                getFrequencyColor(v.frequencyEUR),
                                getFrequencyBg(v.frequencyEUR)
                              )}
                            >
                              {v.frequencyEUR}%
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <span
                              className={cn(
                                "inline-block px-2 py-0.5 rounded text-xs font-mono font-bold",
                                getFrequencyColor(v.frequencyAFR),
                                getFrequencyBg(v.frequencyAFR),
                                v.highlight && v.frequencyAFR > 10 &&
                                  "ring-1 ring-amber-400/50"
                              )}
                            >
                              {v.frequencyAFR}%
                              {v.highlight && (
                                <TrendingUp className="inline size-3 ml-1" />
                              )}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <span
                              className={cn(
                                "inline-block px-2 py-0.5 rounded text-xs font-mono font-medium",
                                getFrequencyColor(v.frequencyEAS),
                                getFrequencyBg(v.frequencyEAS)
                              )}
                            >
                              {v.frequencyEAS}%
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <span
                              className={cn(
                                "inline-block px-2 py-0.5 rounded text-xs font-mono font-medium",
                                getFrequencyColor(v.frequencySAS),
                                getFrequencyBg(v.frequencySAS)
                              )}
                            >
                              {v.frequencySAS}%
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <span
                              className={cn(
                                "inline-block px-2 py-0.5 rounded text-xs font-mono font-medium",
                                getFrequencyColor(v.frequencyAMR),
                                getFrequencyBg(v.frequencyAMR)
                              )}
                            >
                              {v.frequencyAMR}%
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            {getImpactBadge(v.clinicalImpact)}
                          </td>
                          <td className="p-3 text-muted-foreground max-w-[160px]">
                            {v.drugsAffected}
                          </td>
                          <td className="p-3 text-muted-foreground max-w-[220px] leading-relaxed">
                            {v.ancestryNote}
                            {v.highlight && (
                              <span className="inline-flex items-center gap-1 ml-1 text-amber-400 font-medium">
                                <Zap className="size-3" />
                                Major disparity
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* CYP2D6*17 Disparity Highlight */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.4 }}
          >
            <Card className="border-amber-500/30 bg-amber-500/5 depth-1 glow-border-warning">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-amber-500/15 p-2 mt-0.5 shrink-0">
                    <Zap className="size-4 text-amber-400" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-amber-300">
                      CYP2D6*17: A 60× Ancestral Frequency Disparity
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      CYP2D6*17 is found in <strong className="text-amber-300">30%</strong> of
                      African (AFR) individuals but only <strong className="text-red-300">0.5%</strong> of
                      European (EUR) individuals — a 60-fold difference. This allele
                      causes reduced CYP2D6 enzyme activity, dramatically affecting
                      tamoxifen metabolism. Without ancestry-specific genotyping,
                      AFR patients with CYP2D6*17 may receive standard tamoxifen
                      dosing despite being poor metabolizers, leading to
                      subtherapeutic endoxifen levels and increased recurrence risk.
                    </p>
                    <div className="flex items-center gap-4 pt-1">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-amber-400 status-dot-pulse" />
                        <span className="text-xs text-amber-300 font-medium">
                          AFR: 30.0%
                        </span>
                      </div>
                      <div className="h-3 w-px bg-border" />
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-red-400" />
                        <span className="text-xs text-red-300 font-medium">
                          EUR: 0.5%
                        </span>
                      </div>
                      <div className="h-3 w-px bg-border" />\n                      <span className="text-xs text-muted-foreground">
                        Ratio: <strong className="text-foreground">60×</strong>
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* ─── Tab 3: Clinical Recommendations ─── */}
        <TabsContent value="recommendations" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {recommendations.map((rec, idx) => {
              const Icon = rec.icon;
              return (
                <motion.div
                  key={rec.drug}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.08, duration: 0.4 }}
                >
                  <Card
                    className={cn(
                      "depth-1 hover-lift h-full",
                      rec.evidenceLevel === "A" && "card-subtle-glow"
                    )}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="rounded-lg bg-teal-500/15 p-2 shrink-0">
                            <Icon className="size-4 text-teal-400" />
                          </div>
                          <div>
                            <CardTitle className="text-sm flex items-center gap-2">
                              {rec.drug}
                              <ChevronRight className="size-3 text-muted-foreground" />
                              <span className="font-mono text-teal-400">
                                {rec.gene}
                              </span>
                            </CardTitle>
                            <CardDescription className="text-xs mt-0.5">
                              {rec.populationImpact}
                            </CardDescription>
                          </div>
                        </div>
                        {getEvidenceBadge(rec.evidenceLevel)}
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {rec.recommendation}
                      </p>
                      <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <FileText className="size-3" />
                        <span>CPIC/PharmGKB Guideline</span>
                        <ArrowRight className="size-3" />
                        <span className="text-foreground font-medium">
                          {rec.evidenceLevel === "A"
                            ? "Required action"
                            : rec.evidenceLevel === "B"
                              ? "Recommended"
                              : "Consider"}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>

          {/* Evidence Legend */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.4 }}
          >
            <Card className="depth-2 bg-muted/20">
              <CardContent className="p-4">
                <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                  <span className="font-semibold uppercase tracking-wider text-foreground">
                    Evidence Levels:
                  </span>
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-emerald-400" />
                    <span>
                      <strong className="text-emerald-300">Level A</strong> —
                      Strong evidence, CPIC-required action
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-amber-400" />
                    <span>
                      <strong className="text-amber-300">Level B</strong> —
                      Moderate evidence, recommended
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-red-400" />
                    <span>
                      <strong className="text-red-300">Level C</strong> —
                      Weak evidence, consider
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* ─── Tab 4: Population Disparity Map ─── */}
        <TabsContent value="disparity" className="space-y-6 mt-4">
          {/* CSS Grid Matrix */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
          >
            <Card className="depth-1 morph-border">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Globe className="size-4 text-teal-400" />
                      Drug × Population Data Availability Matrix
                    </CardTitle>
                    <CardDescription className="mt-1">
                      Coverage of pharmacogenomic evidence across 6 cancer drugs and
                      6 ancestral populations
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="overflow-x-auto">
                  <div className="inline-block min-w-full">
                    {/* Header row */}
                    <div className="grid grid-cols-7 gap-1 mb-1">
                      <div className="p-2" />
                      {POP_KEYS.map((pop) => (
                        <div
                          key={pop}
                          className="p-2 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider"
                        >
                          {pop}
                        </div>
                      ))}
                    </div>
                    {/* Data rows */}
                    {DRUGS.map((drug, drugIdx) => (
                      <div
                        key={drug}
                        className="grid grid-cols-7 gap-1 mb-1"
                      >
                        <div className="p-2 flex items-center text-xs font-medium text-foreground whitespace-nowrap">
                          {drug}
                        </div>
                        {POP_KEYS.map((pop) => {
                          const cell = disparityMatrix.find(
                            (c) => c.drug === drug && c.population === pop
                          );
                          if (!cell) return null;
                          return (
                            <motion.div
                              key={`${drug}-${pop}`}
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{
                                delay: drugIdx * 0.05 + POP_KEYS.indexOf(pop) * 0.03,
                                duration: 0.3,
                              }}
                              className={cn(
                                "glass-card rounded-md p-2 text-center text-xs font-medium border",
                                getAvailabilityStyles(cell.status)
                              )}
                            >
                              {cell.status === "Well-studied" && (
                                <CheckCircle2 className="inline size-3.5 mr-1" />
                              )}
                              {cell.status === "No data" && (
                                <AlertTriangle className="inline size-3.5 mr-1" />
                              )}
                              <span className="hidden lg:inline">
                                {cell.status}
                              </span>
                            </motion.div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Legend */}
                <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-border/50 text-xs text-muted-foreground">
                  <span className="font-semibold uppercase tracking-wider text-foreground">
                    Legend:
                  </span>
                  <div className="flex items-center gap-1.5">
                    <div className="h-3 w-3 rounded-sm bg-emerald-500/20 border border-emerald-500/30" />
                    <span>Well-studied</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-3 w-3 rounded-sm bg-amber-500/20 border border-amber-500/30" />
                    <span>Limited data</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-3 w-3 rounded-sm bg-red-500/20 border border-red-500/30" />
                    <span>No data</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-3 w-3 rounded-sm bg-muted/30 border border-muted-foreground/20" />
                    <span>Unknown</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Disparity Insight Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {disparityInsights.map((insight, idx) => {
              const Icon = insight.icon;
              return (
                <motion.div
                  key={insight.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: 0.3 + idx * 0.08,
                    duration: 0.4,
                  }}
                >
                  <Card
                    className={cn(
                      "depth-1 hover-lift glass-card morph-border h-full",
                      insight.severity === "critical" &&
                        "glow-border-destructive"
                    )}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div
                          className={cn(
                            "rounded-lg p-2 mt-0.5 shrink-0",
                            insight.severity === "critical" &&
                              "bg-red-500/15",
                            insight.severity === "warning" &&
                              "bg-amber-500/15",
                            insight.severity === "info" &&
                              "bg-teal-500/15"
                          )}
                        >
                          <Icon
                            className={cn(
                              "size-4",
                              insight.severity === "critical" &&
                                "text-red-400",
                              insight.severity === "warning" &&
                                "text-amber-400",
                              insight.severity === "info" &&
                                "text-teal-400"
                            )}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-foreground">
                              {insight.title}
                            </p>
                            {insight.severity === "critical" && (
                              <Badge className="bg-red-500/20 text-red-300 border-red-500/30 text-[10px] px-1.5 py-0">
                                Critical Gap
                              </Badge>
                            )}
                            {insight.severity === "warning" && (
                              <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-[10px] px-1.5 py-0">
                                Warning
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {insight.description}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>

          {/* Summary Stats for Disparity */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.4 }}
          >
            <Card className="depth-2 bg-muted/20">
              <CardContent className="p-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-emerald-400 tabular-nums count-animate">
                      6
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Well-studied (EUR only)
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-amber-400 tabular-nums count-animate">
                      9
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Limited data cells
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-red-400 tabular-nums count-animate">
                      15
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      No data cells
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-muted-foreground tabular-nums count-animate">
                      6
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Unknown cells
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
