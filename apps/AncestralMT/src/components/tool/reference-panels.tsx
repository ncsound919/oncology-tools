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
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart';
import {
  Layers,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Info,
  ChevronRight,
  Database,
  BarChart3,
  Globe,
  Lock,
  Unlock,
  ExternalLink,
  Filter,
  Search,
  Eye,
  EyeOff,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ───────────────────────────────────────────────────────────────────

interface Panel {
  id: string;
  name: string;
  version: string;
  totalSamples: number;
  variantCount: string;
  releaseYear: number;
  accessType: "Open" | "Restricted" | "Controlled";
  populations: PopulationSample[];
  description: string;
  qualityMetrics: QualityMetric[];
  knownLimitations: string[];
}

interface PopulationSample {
  population: string;
  count: number;
  variantCount?: string;
  qualityScore?: number;
}

interface QualityMetric {
  label: string;
  value: string;
}

// ── Data ────────────────────────────────────────────────────────────────────

const POPULATIONS = [
  "European",
  "African",
  "East Asian",
  "South Asian",
  "Hispanic/Latino",
  "AI/AN",
  "Pacific Islander",
  "Middle Eastern",
  "Admixed American",
];

const panels: Panel[] = [
  {
    id: "1000g",
    name: "1000 Genomes Project",
    version: "Phase 3",
    totalSamples: 3202,
    variantCount: "~84.7M",
    releaseYear: 2015,
    accessType: "Open",
    description:
      "The most widely used reference panel for human genetic variation, providing a comprehensive catalog of human genetic variation from 26 populations across 5 continental groups.",
    populations: [
      { population: "European", count: 661, variantCount: "~41.2M", qualityScore: 98 },
      { population: "African", count: 1322, variantCount: "~62.8M", qualityScore: 97 },
      { population: "East Asian", count: 604, variantCount: "~38.4M", qualityScore: 97 },
      { population: "South Asian", count: 489, variantCount: "~35.1M", qualityScore: 95 },
      { population: "Hispanic/Latino", count: 107, variantCount: "~29.6M", qualityScore: 90 },
      { population: "AI/AN", count: 0, variantCount: "N/A", qualityScore: 0 },
      { population: "Pacific Islander", count: 0, variantCount: "N/A", qualityScore: 0 },
      { population: "Middle Eastern", count: 19, variantCount: "~22.1M", qualityScore: 72 },
      { population: "Admixed American", count: 0, variantCount: "N/A", qualityScore: 0 },
    ],
    qualityMetrics: [
      { label: "Variant Call Rate", value: "99.3%" },
      { label: "Genotype Concordance", value: "99.8%" },
      { label: "Imputation Accuracy (R²)", value: "0.92 avg" },
      { label: "Hardy-Weinberg P", value: "> 1e-6" },
    ],
    knownLimitations: [
      "No American Indian / Alaska Native representation",
      "Small Hispanic/Latino cohort (n=107)",
      "No Pacific Islander samples",
      "Limited Middle Eastern coverage",
      "Exome-only for some populations",
    ],
  },
  {
    id: "gnomad",
    name: "gnomAD v4",
    version: "v4.1.0",
    totalSamples: 807162,
    variantCount: "~916M",
    releaseYear: 2024,
    accessType: "Open",
    description:
      "The largest open-access population genetics reference panel, aggregating exome and genome data from over 200 studies. Critical for clinical variant interpretation and allele frequency filtering.",
    populations: [
      { population: "European", count: 527834, variantCount: "~784M", qualityScore: 99 },
      { population: "African", count: 92036, variantCount: "~412M", qualityScore: 97 },
      { population: "East Asian", count: 80846, variantCount: "~387M", qualityScore: 98 },
      { population: "South Asian", count: 48028, variantCount: "~341M", qualityScore: 96 },
      { population: "Hispanic/Latino", count: 39614, variantCount: "~318M", qualityScore: 94 },
      { population: "AI/AN", count: 2734, variantCount: "~89M", qualityScore: 78 },
      { population: "Pacific Islander", count: 0, variantCount: "N/A", qualityScore: 0 },
      { population: "Middle Eastern", count: 4872, variantCount: "~201M", qualityScore: 85 },
      { population: "Admixed American", count: 11198, variantCount: "~267M", qualityScore: 88 },
    ],
    qualityMetrics: [
      { label: "Variant Call Rate", value: "99.7%" },
      { label: "Genotype Concordance", value: "99.9%" },
      { label: "Imputation Accuracy (R²)", value: "0.96 avg" },
      { label: "Sample QC Pass Rate", value: "94.2%" },
    ],
    knownLimitations: [
      "No Pacific Islander samples",
      "AI/AN representation remains small (n=2,734)",
      "Heavy European bias (65.4% of samples)",
      "Aggregated from studies with different QC pipelines",
      "Some populations lack genome-wide data (exome-only)",
    ],
  },
  {
    id: "topmed",
    name: "TOPMed",
    version: "Freeze 8",
    totalSamples: 194758,
    variantCount: "~1.2B",
    releaseYear: 2023,
    accessType: "Controlled",
    description:
      "The Trans-Omics for Precision Medicine program generates whole-genome sequencing data with deep coverage (30x). Focuses on underrepresented populations in heart, lung, blood, and sleep disorders research.",
    populations: [
      { population: "European", count: 80142, variantCount: "~892M", qualityScore: 99 },
      { population: "African", count: 58234, variantCount: "~741M", qualityScore: 98 },
      { population: "East Asian", count: 12847, variantCount: "~398M", qualityScore: 96 },
      { population: "South Asian", count: 6412, variantCount: "~287M", qualityScore: 93 },
      { population: "Hispanic/Latino", count: 26418, variantCount: "~512M", qualityScore: 95 },
      { population: "AI/AN", count: 8421, variantCount: "~198M", qualityScore: 88 },
      { population: "Pacific Islander", count: 0, variantCount: "N/A", qualityScore: 0 },
      { population: "Middle Eastern", count: 1284, variantCount: "~142M", qualityScore: 79 },
      { population: "Admixed American", count: 1000, variantCount: "~178M", qualityScore: 82 },
    ],
    qualityMetrics: [
      { label: "Mean Sequencing Depth", value: "30x" },
      { label: "Variant Call Rate", value: "99.8%" },
      { label: "Imputation Accuracy (R²)", value: "0.97 avg" },
      { label: "Genotype Concordance", value: "99.9%" },
    ],
    knownLimitations: [
      "No Pacific Islander samples",
      "Disease-focused cohorts (not population-general)",
      "Controlled access limits clinical adoption speed",
      "Middle Eastern representation limited",
      "Admixed American subgroups not well characterized",
    ],
  },
  {
    id: "hrc",
    name: "HRC",
    version: "r1.1",
    totalSamples: 64876,
    variantCount: "~96M",
    releaseYear: 2016,
    accessType: "Restricted",
    description:
      "The Haplotype Reference Consortium provides a large reference panel optimized for genotype imputation, constructed from whole-genome sequencing of predominantly European-ancestry individuals.",
    populations: [
      { population: "European", count: 60248, variantCount: "~88M", qualityScore: 99 },
      { population: "African", count: 1328, variantCount: "~42M", qualityScore: 82 },
      { population: "East Asian", count: 1024, variantCount: "~31M", qualityScore: 80 },
      { population: "South Asian", count: 612, variantCount: "~27M", qualityScore: 76 },
      { population: "Hispanic/Latino", count: 824, variantCount: "~24M", qualityScore: 74 },
      { population: "AI/AN", count: 0, variantCount: "N/A", qualityScore: 0 },
      { population: "Pacific Islander", count: 0, variantCount: "N/A", qualityScore: 0 },
      { population: "Middle Eastern", count: 840, variantCount: "~28M", qualityScore: 77 },
      { population: "Admixed American", count: 0, variantCount: "N/A", qualityScore: 0 },
    ],
    qualityMetrics: [
      { label: "Imputation Accuracy (R²)", value: "0.99 (EUR)" },
      { label: "Variant Call Rate", value: "99.6%" },
      { label: "Haplotype Accuracy", value: "99.4%" },
      { label: "European Imputation R²", value: "0.99" },
    ],
    knownLimitations: [
      "Severely European-biased (92.9% of samples)",
      "No AI/AN, Pacific Islander, or Admixed American samples",
      "Non-European imputation accuracy drops significantly",
      "Last updated in 2016 (no new releases)",
      "Small African and Latino cohorts limit utility",
    ],
  },
  {
    id: "allofus",
    name: "All of Us Research Program",
    version: "v7.2",
    totalSamples: 413468,
    variantCount: "~1.0B",
    releaseYear: 2024,
    accessType: "Controlled",
    description:
      "NIH's flagship precision medicine initiative with unprecedented diversity. Intentionally recruits from historically underrepresented populations. Whole-genome sequencing with linked electronic health records.",
    populations: [
      { population: "European", count: 178412, variantCount: "~823M", qualityScore: 98 },
      { population: "African", count: 97234, variantCount: "~612M", qualityScore: 97 },
      { population: "East Asian", count: 24618, variantCount: "~401M", qualityScore: 96 },
      { population: "South Asian", count: 12847, variantCount: "~324M", qualityScore: 94 },
      { population: "Hispanic/Latino", count: 56234, variantCount: "~478M", qualityScore: 95 },
      { population: "AI/AN", count: 14128, variantCount: "~218M", qualityScore: 89 },
      { population: "Pacific Islander", count: 3412, variantCount: "~124M", qualityScore: 78 },
      { population: "Middle Eastern", count: 6284, variantCount: "~287M", qualityScore: 86 },
      { population: "Admixed American", count: 20299, variantCount: "~312M", qualityScore: 90 },
    ],
    qualityMetrics: [
      { label: "Mean Sequencing Depth", value: "30x" },
      { label: "Variant Call Rate", value: "99.5%" },
      { label: "Imputation Accuracy (R²)", value: "0.95 avg" },
      { label: "Linked EHR Coverage", value: "89.3%" },
    ],
    knownLimitations: [
      "Controlled access requires IRB and data use agreement",
      "Relatively new panel (clinical validation ongoing)",
      "Pacific Islander still underrepresented relative to global proportion",
      "Some cohorts have clinical bias (recruited through healthcare)",
      "Genome data release is still incremental",
    ],
  },
];

// ── Helpers ─────────────────────────────────────────────────────────────────

function getAccessIcon(type: "Open" | "Restricted" | "Controlled") {
  if (type === "Open") return <Unlock className="w-3.5 h-3.5 text-[oklch(0.65_0.15_155)]" />;
  if (type === "Restricted") return <Lock className="w-3.5 h-3.5 text-[oklch(0.7_0.16_45)]" />;
  return <Lock className="w-3.5 h-3.5 text-[oklch(0.65_0.22_25)]" />;
}

function getAccessColor(type: "Open" | "Restricted" | "Controlled") {
  if (type === "Open") return "bg-[oklch(0.65_0.15_155)]/15 text-[oklch(0.65_0.15_155)] border-[oklch(0.65_0.15_155)]/25";
  if (type === "Restricted") return "bg-[oklch(0.7_0.16_45)]/15 text-[oklch(0.7_0.16_45)] border-[oklch(0.7_0.16_45)]/25";
  return "bg-[oklch(0.65_0.22_25)]/15 text-[oklch(0.65_0.22_25)] border-[oklch(0.65_0.22_25)]/25";
}

function getHeatmapColor(count: number, maxCount: number): string {
  if (count === 0) return "oklch(0.65 0.22 25 / 0.6)";
  const ratio = count / maxCount;
  if (ratio > 0.5) {
    const intensity = 0.15 + ratio * 0.15;
    return `oklch(0.55 ${intensity} 175 / 0.85)`;
  }
  if (ratio > 0.1) {
    const intensity = 0.1 + ratio * 0.2;
    return `oklch(0.7 ${intensity} 45 / 0.8)`;
  }
  return `oklch(0.65 0.18 25 / 0.75)`;
}

function getHeatmapTextColor(count: number, maxCount: number): string {
  if (count === 0) return "text-[oklch(0.65_0.22_25)]";
  const ratio = count / maxCount;
  if (ratio > 0.1) return "text-white";
  return "text-[oklch(0.13_0.015_250)]";
}

function formatNumber(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return n.toString();
}

// ── VUS Reclassification Chart Data ─────────────────────────────────────────

const vusData = [
  { population: "European", currentRate: 8.2, improvedRate: 3.1 },
  { population: "African", currentRate: 28.4, improvedRate: 11.7 },
  { population: "East Asian", currentRate: 22.1, improvedRate: 9.8 },
  { population: "South Asian", currentRate: 25.6, improvedRate: 12.4 },
  { population: "Hispanic/Latino", currentRate: 31.2, improvedRate: 14.6 },
  { population: "AI/AN", currentRate: 42.8, improvedRate: 24.1 },
  { population: "Pacific Islander", currentRate: 48.3, improvedRate: 29.7 },
  { population: "Middle Eastern", currentRate: 26.9, improvedRate: 13.2 },
  { population: "Admixed American", currentRate: 34.5, improvedRate: 18.3 },
];

const vusChartConfig = {
  currentRate: { label: "Current VUS Rate (%)", color: "oklch(0.65 0.22 25)" },
  improvedRate: { label: "With Better Ref Panels (%)", color: "oklch(0.65 0.15 175)" },
};

// ── Coverage Gap Data ───────────────────────────────────────────────────────

const coverageGaps = panels.flatMap((panel) =>
  panel.populations
    .filter((p) => p.count === 0)
    .map((p) => ({
      panelId: panel.id,
      panelName: panel.name,
      population: p.population,
      severity: "critical" as const,
    }))
);

const moderateGaps = panels.flatMap((panel) =>
  panel.populations
    .filter((p) => p.count > 0 && p.count < 2000)
    .map((p) => ({
      panelId: panel.id,
      panelName: panel.name,
      population: p.population,
      count: p.count,
      severity: "warning" as const,
    }))
);

// ── Component ───────────────────────────────────────────────────────────────

export function ReferencePanelsView() {
  const [selectedPanel, setSelectedPanel] = useState<Panel | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAllGaps, setShowAllGaps] = useState(false);

  const maxSampleCount = useMemo(
    () => Math.max(...panels.flatMap((p) => p.populations.map((pop) => pop.count))),
    []
  );

  const filteredGaps = useMemo(() => {
    const all = [...coverageGaps, ...moderateGaps];
    if (!searchQuery) return showAllGaps ? all : all.slice(0, 6);
    return all.filter(
      (g) =>
        g.panelName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        g.population.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, showAllGaps]);

  const totalGapCount = coverageGaps.length + moderateGaps.length;
  const criticalCount = coverageGaps.length;

  return (
    <div className="max-w-[1600px] mx-auto p-6 space-y-6">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="fade-up">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center">
            <Layers className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground tracking-tight">
              Reference Panel Comparator
            </h2>
            <p className="text-sm text-muted-foreground">
              Side-by-side comparison of major ancestry reference databases for variant interpretation
            </p>
          </div>
        </div>
      </div>

      {/* ── Summary Stats ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 fade-up-d1">
        {[
          { label: "Panels Compared", value: "5", icon: Database, color: "text-primary" },
          { label: "Total Samples", value: "1.48M", icon: Globe, color: "text-primary" },
          { label: "Coverage Gaps", value: totalGapCount.toString(), icon: AlertTriangle, color: "text-[oklch(0.7_0.16_45)]" },
          { label: "Critical (0 Samples)", value: criticalCount.toString(), icon: XCircle, color: "text-[oklch(0.65_0.22_25)]" },
        ].map((stat) => (
          <Card key={stat.label} className="bg-card border-border/50 stat-accent-bar hover-lift">
            <CardContent className="p-4 flex items-center gap-3">
              <stat.icon className={cn("w-5 h-5 shrink-0", stat.color)} />
              <div>
                <div className="text-lg font-bold text-foreground count-animate">{stat.value}</div>
                <div className="text-[11px] text-muted-foreground">{stat.label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Panel Overview Table ────────────────────────────────────── */}
      <Card className="bg-card border-border/50 card-highlight-top fade-up-d2">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4.5 h-4.5 text-primary" />
            <CardTitle className="text-base">Panel Overview</CardTitle>
          </div>
          <CardDescription>
            Key characteristics of major ancestry reference panels used in clinical genomics
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm table-hover-stripe">
              <thead>
                <tr className="border-b border-border/60">
                  <th className="text-left py-2.5 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Panel
                  </th>
                  <th className="text-left py-2.5 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Version
                  </th>
                  <th className="text-right py-2.5 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Samples
                  </th>
                  <th className="text-left py-2.5 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Variants
                  </th>
                  <th className="text-right py-2.5 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Year
                  </th>
                  <th className="text-center py-2.5 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Access
                  </th>
                </tr>
              </thead>
              <tbody>
                {panels.map((panel) => (
                  <tr
                    key={panel.id}
                    className="border-b border-border/30 cursor-pointer transition-colors hover:bg-primary/5"
                    onClick={() => setSelectedPanel(selectedPanel?.id === panel.id ? null : panel)}
                  >
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">{panel.name}</span>
                        <ChevronRight
                          className={cn(
                            "w-3.5 h-3.5 text-muted-foreground transition-transform",
                            selectedPanel?.id === panel.id && "rotate-90 text-primary"
                          )}
                        />
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-muted-foreground font-mono text-xs">
                      {panel.version}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-foreground">
                      {formatNumber(panel.totalSamples)}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-foreground text-xs">{panel.variantCount}</td>
                    <td className="py-2.5 px-3 text-right text-muted-foreground">{panel.releaseYear}</td>
                    <td className="py-2.5 px-3 text-center">
                      <Badge
                        variant="outline"
                        className={cn("text-[10px] px-2 py-0.5 gap-1", getAccessColor(panel.accessType))}
                      >
                        {getAccessIcon(panel.accessType)}
                        {panel.accessType}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ── Population Coverage Heatmap Grid ────────────────────────── */}
      <Card className="bg-card border-border/50 card-highlight-top fade-up-d3">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Globe className="w-4.5 h-4.5 text-primary" />
            <CardTitle className="text-base">Population Coverage Heatmap</CardTitle>
          </div>
          <CardDescription>
            Sample count per population for each reference panel. Color intensity reflects coverage depth.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          {/* Legend */}
          <div className="flex items-center gap-4 mb-4 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: "oklch(0.55 0.3 175 / 0.85)" }} />
              High (&gt;50K)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: "oklch(0.7 0.2 45 / 0.8)" }} />
              Moderate (2K–50K)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: "oklch(0.65 0.18 25 / 0.75)" }} />
              Low (&lt;2K)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: "oklch(0.65 0.22 25 / 0.6)" }} />
              None (0)
            </span>
          </div>

          {/* Heatmap Grid */}
          <div className="overflow-x-auto">
            <div
              className="grid gap-px min-w-[700px]"
              style={{
                gridTemplateColumns: `140px repeat(${panels.length}, 1fr)`,
              }}
            >
              {/* Header Row */}
              <div className="p-2 text-[10px] font-medium text-muted-foreground uppercase tracking-wider" />
              {panels.map((panel) => (
                <button
                  key={panel.id}
                  onClick={() =>
                    setSelectedPanel(selectedPanel?.id === panel.id ? null : panel)
                  }
                  className={cn(
                    "p-2 text-[10px] font-medium text-center transition-colors rounded-sm cursor-pointer",
                    selectedPanel?.id === panel.id
                      ? "text-primary bg-primary/10"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                  )}
                >
                  {panel.name.split(" ").slice(0, 2).join(" ")}
                </button>
              ))}

              {/* Population Rows */}
              {POPULATIONS.map((pop) => (
                <React.Fragment key={pop}>
                  <div className="p-2 text-xs text-muted-foreground flex items-center truncate">
                    {pop}
                  </div>
                  {panels.map((panel) => {
                    const popData = panel.populations.find(
                      (p) => p.population === pop
                    );
                    const count = popData?.count ?? 0;
                    return (
                      <div
                        key={`${panel.id}-${pop}`}
                        className={cn(
                          "p-2 rounded-sm flex flex-col items-center justify-center min-h-[48px] transition-all cursor-pointer hover:scale-[1.03]",
                          "border border-transparent",
                          selectedPanel?.id === panel.id
                            ? "border-primary/40 ring-1 ring-primary/20"
                            : "hover:border-border/60"
                        )}
                        style={{ backgroundColor: getHeatmapColor(count, maxSampleCount) }}
                        onClick={() =>
                          setSelectedPanel(
                            selectedPanel?.id === panel.id ? null : panel
                          )
                        }
                        title={`${panel.name} — ${pop}: ${formatNumber(count)} samples`}
                      >
                        <span
                          className={cn(
                            "text-xs font-bold leading-tight",
                            getHeatmapTextColor(count, maxSampleCount)
                          )}
                        >
                          {count === 0 ? "—" : formatNumber(count)}
                        </span>
                        {count > 0 && (
                          <span
                            className={cn(
                              "text-[9px] opacity-75 leading-tight",
                              getHeatmapTextColor(count, maxSampleCount)
                            )}
                          >
                            samples
                          </span>
                        )}
                      </div>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Selected Panel Detail ───────────────────────────────────── */}
      {selectedPanel && (
        <Card className="bg-card border-primary/30 card-glow glow-border-warning fade-up-d2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
                  <Database className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">{selectedPanel.name}</CardTitle>
                  <CardDescription>{selectedPanel.description}</CardDescription>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground"
                onClick={() => setSelectedPanel(null)}
              >
                <EyeOff className="w-4 h-4 mr-1" />
                Close
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-4">
            {/* Quick Stats Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-lg bg-background/50 p-3 border border-border/40">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                  Version
                </div>
                <div className="text-sm font-mono font-bold text-foreground">
                  {selectedPanel.version}
                </div>
              </div>
              <div className="rounded-lg bg-background/50 p-3 border border-border/40">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                  Total Samples
                </div>
                <div className="text-sm font-mono font-bold text-foreground">
                  {formatNumber(selectedPanel.totalSamples)}
                </div>
              </div>
              <div className="rounded-lg bg-background/50 p-3 border border-border/40">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                  Variants
                </div>
                <div className="text-sm font-mono font-bold text-foreground">
                  {selectedPanel.variantCount}
                </div>
              </div>
              <div className="rounded-lg bg-background/50 p-3 border border-border/40">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                  Access
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {getAccessIcon(selectedPanel.accessType)}
                  <span className="text-sm font-medium text-foreground">
                    {selectedPanel.accessType}
                  </span>
                </div>
              </div>
            </div>

            {/* Population Breakdown Table */}
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Population Breakdown
              </h4>
              <div className="rounded-lg border border-border/40 overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-background/60 border-b border-border/40">
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">
                        Population
                      </th>
                      <th className="text-right py-2 px-3 font-medium text-muted-foreground">
                        Samples
                      </th>
                      <th className="text-right py-2 px-3 font-medium text-muted-foreground">
                        Variants
                      </th>
                      <th className="text-right py-2 px-3 font-medium text-muted-foreground">
                        Quality
                      </th>
                      <th className="text-center py-2 px-3 font-medium text-muted-foreground">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedPanel.populations.map((pop) => (
                      <tr
                        key={pop.population}
                        className="border-b border-border/20 last:border-0"
                      >
                        <td className="py-2 px-3 text-foreground font-medium">
                          {pop.population}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-foreground">
                          {formatNumber(pop.count)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-muted-foreground">
                          {pop.variantCount || "N/A"}
                        </td>
                        <td className="py-2 px-3 text-right">
                          {(pop.qualityScore ?? 0) > 0 ? (
                            <span
                              className={cn(
                                "font-mono",
                                (pop.qualityScore ?? 0) >= 90
                                  ? "text-[oklch(0.65_0.15_155)]"
                                  : (pop.qualityScore ?? 0) >= 70
                                  ? "text-[oklch(0.7_0.16_45)]"
                                  : "text-[oklch(0.65_0.22_25)]"
                              )}
                            >
                              {(pop.qualityScore ?? 0)}/100
                            </span>
                          ) : (
                            <span className="text-muted-foreground">N/A</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-center">
                          {pop.count === 0 ? (
                            <XCircle className="w-4 h-4 text-[oklch(0.65_0.22_25)] mx-auto" />
                          ) : (pop.qualityScore ?? 0) >= 90 ? (
                            <CheckCircle2 className="w-4 h-4 text-[oklch(0.65_0.15_155)] mx-auto" />
                          ) : (
                            <AlertTriangle className="w-4 h-4 text-[oklch(0.7_0.16_45)] mx-auto" />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Quality Metrics & Limitations Grid */}
            <div className="grid md:grid-cols-2 gap-4">
              {/* Quality Metrics */}
              <div className="rounded-lg border border-border/40 bg-background/30 p-4">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[oklch(0.65_0.15_155)]" />
                  Quality Metrics
                </h4>
                <div className="space-y-2">
                  {selectedPanel.qualityMetrics.map((metric) => (
                    <div
                      key={metric.label}
                      className="flex items-center justify-between py-1.5 border-b border-border/20 last:border-0"
                    >
                      <span className="text-xs text-muted-foreground">
                        {metric.label}
                      </span>
                      <span className="text-xs font-mono font-bold text-foreground">
                        {metric.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Known Limitations */}
              <div className="rounded-lg border border-[oklch(0.65_0.22_25)]/30 bg-[oklch(0.65_0.22_25)]/5 p-4">
                <h4 className="text-xs font-semibold text-[oklch(0.65_0.22_25)] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Known Limitations
                </h4>
                <ul className="space-y-1.5">
                  {selectedPanel.knownLimitations.map((lim) => (
                    <li
                      key={lim}
                      className="text-xs text-muted-foreground flex items-start gap-2"
                    >
                      <XCircle className="w-3 h-3 text-[oklch(0.65_0.22_25)]/60 shrink-0 mt-0.5" />
                      {lim}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Coverage Gap Analysis ────────────────────────────────────── */}
      <Card className="bg-card border-border/50 card-highlight-top fade-up-d4">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4.5 h-4.5 text-[oklch(0.7_0.16_45)]" />
              <CardTitle className="text-base">Coverage Gap Analysis</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Filter gaps..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 h-8 text-xs bg-background border border-border/60 rounded-md focus:outline-none focus:ring-1 focus:ring-primary/40 text-foreground placeholder:text-muted-foreground"
                />
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground hover:text-foreground h-8"
                onClick={() => setShowAllGaps(!showAllGaps)}
              >
                {showAllGaps ? (
                  <>
                    <EyeOff className="w-3.5 h-3.5 mr-1" />
                    Show Less
                  </>
                ) : (
                  <>
                    <Eye className="w-3.5 h-3.5 mr-1" />
                    Show All ({totalGapCount})
                  </>
                )}
              </Button>
            </div>
          </div>
          <CardDescription>
            Populations missing or severely underrepresented in each reference panel
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredGaps.map((gap, idx) => (
              <div
                key={`${gap.panelId}-${gap.population}-${idx}`}
                className={cn(
                  "rounded-lg border p-3 transition-all hover-lift",
                  gap.severity === "critical"
                    ? "border-[oklch(0.65_0.22_25)]/30 bg-[oklch(0.65_0.22_25)]/5"
                    : "border-[oklch(0.7_0.16_45)]/30 bg-[oklch(0.7_0.16_45)]/5"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      {gap.severity === "critical" ? (
                        <XCircle className="w-3.5 h-3.5 text-[oklch(0.65_0.22_25)] shrink-0" />
                      ) : (
                        <AlertTriangle className="w-3.5 h-3.5 text-[oklch(0.7_0.16_45)] shrink-0" />
                      )}
                      <span className="text-xs font-semibold text-foreground truncate">
                        {gap.population}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      {gap.severity === "critical"
                        ? `${gap.panelName} has 0 ${gap.population} samples — variants in this population cannot be assessed.`
                        : `${gap.panelName} has only ${formatNumber(gap.count!)} ${gap.population} samples — limited statistical power for variant filtering.`}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[9px] px-1.5 py-0 shrink-0",
                      gap.severity === "critical"
                        ? "border-[oklch(0.65_0.22_25)]/40 text-[oklch(0.65_0.22_25)]"
                        : "border-[oklch(0.7_0.16_45)]/40 text-[oklch(0.7_0.16_45)]"
                    )}
                  >
                    {gap.severity === "critical" ? "No Data" : "Low"}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
          {filteredGaps.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-[oklch(0.65_0.15_155)]" />
              No gaps matching your filter.
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Implications for Variant Interpretation ──────────────────── */}
      <Card className="bg-card border-border/50 card-highlight-top fade-up-d5">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Info className="w-4.5 h-4.5 text-primary" />
            <CardTitle className="text-base">
              Implications for Variant Interpretation
            </CardTitle>
          </div>
          <CardDescription>
            How reference panel gaps affect VUS (Variant of Uncertain Significance) reclassification rates by ancestry.
            Simulated data based on published literature.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          {/* VUS Chart */}
          <div className="w-full h-[320px]">
            <ChartContainer config={vusChartConfig} className="h-full w-full">
              <BarChart data={vusData} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.3 0.015 250)" horizontal={false} />
                <XAxis
                  type="number"
                  domain={[0, 55]}
                  tick={{ fontSize: 11, fill: "oklch(0.6 0.02 250)" }}
                  tickLine={false}
                  axisLine={{ stroke: "oklch(0.3 0.015 250)" }}
                  label={{
                    value: "VUS Rate (%)",
                    position: "insideBottom",
                    offset: -2,
                    style: { fontSize: 11, fill: "oklch(0.6 0.02 250)" },
                  }}
                />
                <YAxis
                  type="category"
                  dataKey="population"
                  width={120}
                  tick={{ fontSize: 11, fill: "oklch(0.6 0.02 250)" }}
                  tickLine={false}
                  axisLine={{ stroke: "oklch(0.3 0.015 250)" }}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar
                  dataKey="currentRate"
                  fill="oklch(0.65 0.22 25)"
                  radius={[0, 3, 3, 0]}
                  barSize={12}
                />
                <Bar
                  dataKey="improvedRate"
                  fill="oklch(0.65 0.15 175)"
                  radius={[0, 3, 3, 0]}
                  barSize={12}
                />
              </BarChart>
            </ChartContainer>
          </div>

          {/* Insight Cards */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="rounded-lg border border-[oklch(0.65_0.22_25)]/20 bg-[oklch(0.65_0.22_25)]/5 p-4 space-y-2">
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-[oklch(0.65_0.22_25)]" />
                <span className="text-xs font-semibold text-[oklch(0.65_0.22_25)]">
                  Highest VUS Burden
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Pacific Islander patients face a <span className="text-foreground font-semibold">48.3% VUS rate</span> —
                nearly 6× higher than European patients. Only All of Us includes any
                Pacific Islander samples.
              </p>
            </div>

            <div className="rounded-lg border border-[oklch(0.7_0.16_45)]/20 bg-[oklch(0.7_0.16_45)]/5 p-4 space-y-2">
              <div className="flex items-center gap-1.5">
                <Info className="w-4 h-4 text-[oklch(0.7_0.16_45)]" />
                <span className="text-xs font-semibold text-[oklch(0.7_0.16_45)]">
                  AI/AN Representation
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                American Indian / Alaska Native populations are absent from 1000G and HRC,
                and only TOPMed and All of Us have meaningful sample sizes ({"<"}15K).
              </p>
            </div>

            <div className="rounded-lg border border-[oklch(0.65_0.15_175)]/20 bg-[oklch(0.65_0.15_175)]/5 p-4 space-y-2">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[oklch(0.65_0.15_175)]" />
                <span className="text-xs font-semibold text-[oklch(0.65_0.15_175)]">
                  Improvement Potential
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                With improved reference panels, VUS rates could be reduced by an average
                of <span className="text-foreground font-semibold">14.2 percentage points</span> across
                underrepresented populations.
              </p>
            </div>
          </div>

          {/* Disparity Ratio Table */}
          <div className="rounded-lg border border-border/40 overflow-hidden">
            <div className="p-3 bg-background/40 border-b border-border/40">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5 text-primary" />
                VUS Disparity Ratio (vs. European Baseline)
              </h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-background/30 border-b border-border/30">
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground">
                      Population
                    </th>
                    <th className="text-right py-2 px-3 font-medium text-muted-foreground">
                      Current VUS %
                    </th>
                    <th className="text-right py-2 px-3 font-medium text-muted-foreground">
                      Disparity Ratio
                    </th>
                    <th className="text-right py-2 px-3 font-medium text-muted-foreground">
                      Improved VUS %
                    </th>
                    <th className="text-right py-2 px-3 font-medium text-muted-foreground">
                      Residual Gap
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {vusData.map((row) => {
                    const disparity = (row.currentRate / 8.2).toFixed(1);
                    const residualGap = (row.improvedRate - 3.1).toFixed(1);
                    const isHighDisparity = parseFloat(disparity) >= 3.0;
                    return (
                      <tr
                        key={row.population}
                        className="border-b border-border/15 last:border-0"
                      >
                        <td className="py-2 px-3 text-foreground font-medium">
                          {row.population}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-foreground">
                          {row.currentRate}%
                        </td>
                        <td
                          className={cn(
                            "py-2 px-3 text-right font-mono font-bold",
                            isHighDisparity
                              ? "text-[oklch(0.65_0.22_25)]"
                              : parseFloat(disparity) >= 2.0
                              ? "text-[oklch(0.7_0.16_45)]"
                              : "text-[oklch(0.65_0.15_155)]"
                          )}
                        >
                          {disparity}×
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-[oklch(0.65_0.15_175)]">
                          {row.improvedRate}%
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-muted-foreground">
                          {residualGap}pp
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Key Takeaway */}
          <div className="rounded-lg bg-primary/5 border border-primary/15 p-4 flex items-start gap-3">
            <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              <span className="text-foreground font-semibold">Key Takeaway:</span>{" "}
              Even with improved reference panels, residual VUS disparities persist for populations
              with the smallest sample sizes (AI/AN, Pacific Islander). Closing these gaps requires
              dedicated recruitment efforts beyond what existing panel infrastructures provide. All of Us
              is the only panel currently making progress toward equitable coverage across all 9 populations.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
