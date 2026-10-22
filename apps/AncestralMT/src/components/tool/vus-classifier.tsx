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
  LineChart,
  Line,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  PieChart,
  Pie,
  Cell,
  ReferenceLine,
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
  BarChart3,
  AlertTriangle,
  TrendingUp,
  Users,
  Globe,
  Microscope,
  Info,
  ChevronRight,
  Eye,
  EyeOff,
  Zap,
  Shield,
  Activity,
  Brain,
  Target,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ───────────────────────────────────────────────────────────────────

type TabId = "model" | "bias";

interface ReclassRate {
  population: string;
  short: string;
  rate: number;
}

interface ComparisonRow {
  population: string;
  short: string;
  standard: number;
  ancestryAware: number;
}

interface RadarDimension {
  dimension: string;
  short: string;
}

interface RadarRow {
  dimension: string;
  European: number;
  African: number;
  "Hispanic/Latino": number;
  "East Asian": number;
}

interface BiasTableRow {
  population: string;
  refCoverage: number;
  vusAccuracy: number;
  prsAccuracy: number;
  drugResponse: number;
  biasScore: number;
  status: "Low Bias" | "Moderate" | "High";
}

// ── Data ────────────────────────────────────────────────────────────────────

const RECLASS_DATA: ReclassRate[] = [
  { population: "European", short: "EUR", rate: 31.2 },
  { population: "East Asian", short: "EAS", rate: 28.5 },
  { population: "South Asian", short: "SAS", rate: 24.1 },
  { population: "Hispanic/Latino", short: "AMR", rate: 19.8 },
  { population: "African", short: "AFR", rate: 14.3 },
  { population: "Admixed American", short: "ADM", rate: 12.6 },
  { population: "American Indian/AN", short: "AIAN", rate: 8.7 },
  { population: "Pacific Islander", short: "PAC", rate: 6.2 },
];

const COMPARISON_DATA: ComparisonRow[] = [
  { population: "European", short: "EUR", standard: 31.2, ancestryAware: 32.8 },
  { population: "East Asian", short: "EAS", standard: 28.5, ancestryAware: 34.2 },
  { population: "South Asian", short: "SAS", standard: 24.1, ancestryAware: 31.6 },
  { population: "Hispanic/Latino", short: "AMR", standard: 19.8, ancestryAware: 30.1 },
  { population: "African", short: "AFR", standard: 14.3, ancestryAware: 28.7 },
  { population: "Admixed American", short: "ADM", standard: 12.6, ancestryAware: 26.4 },
  { population: "American Indian/AN", short: "AIAN", standard: 8.7, ancestryAware: 19.3 },
  { population: "Pacific Islander", short: "PAC", standard: 6.2, ancestryAware: 18.1 },
];

const RADAR_DIMENSIONS: RadarDimension[] = [
  { dimension: "Reference Data Coverage", short: "Ref. Coverage" },
  { dimension: "VUS Interpretation Accuracy", short: "VUS Accuracy" },
  { dimension: "Clinical Actionability", short: "Clinical Action" },
  { dimension: "Polygenic Risk Score Accuracy", short: "PRS Accuracy" },
  { dimension: "Drug Response Prediction", short: "Drug Response" },
  { dimension: "Variant Prioritization Confidence", short: "Var. Priority" },
];

const RADAR_DATA: RadarRow[] = [
  { dimension: "Ref. Coverage", European: 92, African: 38, "Hispanic/Latino": 45, "East Asian": 62 },
  { dimension: "VUS Accuracy", European: 88, African: 35, "Hispanic/Latino": 42, "East Asian": 58 },
  { dimension: "Clinical Action", European: 95, African: 42, "Hispanic/Latino": 48, "East Asian": 65 },
  { dimension: "PRS Accuracy", European: 78, African: 32, "Hispanic/Latino": 38, "East Asian": 55 },
  { dimension: "Drug Response", European: 85, African: 40, "Hispanic/Latino": 44, "East Asian": 60 },
  { dimension: "Var. Priority", European: 90, African: 36, "Hispanic/Latino": 43, "East Asian": 57 },
];

const BIAS_TABLE_DATA: BiasTableRow[] = [
  { population: "European", refCoverage: 92, vusAccuracy: 88, prsAccuracy: 78, drugResponse: 85, biasScore: 0.12, status: "Low Bias" },
  { population: "East Asian", refCoverage: 62, vusAccuracy: 58, prsAccuracy: 55, drugResponse: 60, biasScore: 0.34, status: "Moderate" },
  { population: "South Asian", refCoverage: 48, vusAccuracy: 45, prsAccuracy: 42, drugResponse: 44, biasScore: 0.42, status: "Moderate" },
  { population: "Hispanic/Latino", refCoverage: 45, vusAccuracy: 42, prsAccuracy: 38, drugResponse: 44, biasScore: 0.48, status: "Moderate" },
  { population: "African", refCoverage: 38, vusAccuracy: 35, prsAccuracy: 32, drugResponse: 40, biasScore: 0.62, status: "High" },
  { population: "Admixed American", refCoverage: 28, vusAccuracy: 26, prsAccuracy: 22, drugResponse: 30, biasScore: 0.72, status: "High" },
  { population: "American Indian/AN", refCoverage: 15, vusAccuracy: 14, prsAccuracy: 12, drugResponse: 18, biasScore: 0.84, status: "High" },
  { population: "Pacific Islander", refCoverage: 8, vusAccuracy: 7, prsAccuracy: 6, drugResponse: 10, biasScore: 0.91, status: "High" },
];

const EQUITY_PIE_DATA = [
  { name: "Adequate (Low Bias)", value: 1, fill: "oklch(0.65 0.15 155)" },
  { name: "Moderate Bias", value: 3, fill: "oklch(0.7 0.16 45)" },
  { name: "High Bias", value: 4, fill: "oklch(0.65 0.22 25)" },
];

// ── Chart Configs ───────────────────────────────────────────────────────────

const reclassChartConfig = {
  rate: { label: "Reclassification Rate", color: "oklch(0.65 0.15 175)" },
} satisfies ChartConfig;

const comparisonChartConfig = {
  standard: { label: "Standard Tool", color: "oklch(0.5 0.04 200)" },
  ancestryAware: { label: "Ancestry-Aware Tool", color: "oklch(0.65 0.15 175)" },
} satisfies ChartConfig;

const radarChartConfig = {
  European: { label: "European", color: "oklch(0.65 0.15 175)" },
  African: { label: "African", color: "oklch(0.65 0.22 25)" },
  "Hispanic/Latino": { label: "Hispanic/Latino", color: "oklch(0.7 0.16 45)" },
  "East Asian": { label: "East Asian", color: "oklch(0.65 0.15 155)" },
} satisfies ChartConfig;

const equityPieConfig = {
  "Adequate (Low Bias)": { label: "Adequate (Low Bias)", color: "oklch(0.65 0.15 155)" },
  "Moderate Bias": { label: "Moderate Bias", color: "oklch(0.7 0.16 45)" },
  "High Bias": { label: "High Bias", color: "oklch(0.65 0.22 25)" },
} satisfies ChartConfig;

// ── Helpers ─────────────────────────────────────────────────────────────────

function getBarColor(rate: number): string {
  if (rate >= 25) return "oklch(0.65 0.15 175)";
  if (rate >= 15) return "oklch(0.7 0.16 45)";
  return "oklch(0.65 0.22 25)";
}

function getStatusBadge(status: "Low Bias" | "Moderate" | "High") {
  switch (status) {
    case "Low Bias":
      return (
        <Badge className="bg-[oklch(0.65_0.15_155)]/15 text-[oklch(0.65_0.15_155)] border-[oklch(0.65_0.15_155)]/30 badge-hover">
          <Shield className="w-3 h-3 mr-1" />
          Low Bias
        </Badge>
      );
    case "Moderate":
      return (
        <Badge className="bg-[oklch(0.7_0.16_45)]/15 text-[oklch(0.7_0.16_45)] border-[oklch(0.7_0.16_45)]/30 badge-hover">
          <AlertTriangle className="w-3 h-3 mr-1" />
          Moderate
        </Badge>
      );
    case "High":
      return (
        <Badge className="bg-[oklch(0.65_0.22_25)]/15 text-[oklch(0.65_0.22_25)] border-[oklch(0.65_0.22_25)]/30 badge-hover">
          <AlertTriangle className="w-3 h-3 mr-1" />
          High
        </Badge>
      );
  }
}

function getBiasScoreColor(score: number): string {
  if (score < 0.3) return "text-[oklch(0.65_0.15_155)]";
  if (score < 0.5) return "text-[oklch(0.7_0.16_45)]";
  return "text-[oklch(0.65_0.22_25)]";
}

function getBiasScoreBg(score: number): string {
  if (score < 0.3) return "bg-[oklch(0.65_0.15_155)]/10";
  if (score < 0.5) return "bg-[oklch(0.7_0.16_45)]/10";
  return "bg-[oklch(0.65_0.22_25)]/10";
}

// ── Custom Tooltip for Bar Chart (color-coded bars) ─────────────────────────

function ReclassTooltipContent({ active, payload }: { active?: boolean; payload?: Array<{ payload: ReclassRate }> }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border border-border/60 bg-[oklch(0.17_0.015_250)] p-3 shadow-xl">
      <p className="text-xs font-semibold text-foreground mb-1">{d.population}</p>
      <p className="text-[11px] text-muted-foreground">
        Reclassification Rate: <span className={cn("font-bold", getBiasScoreColor(d.rate >= 25 ? 0.12 : d.rate >= 15 ? 0.42 : 0.72))}>{d.rate}%</span>
      </p>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────

export function VusClassifierView() {
  const [activeTab, setActiveTab] = useState<TabId>("model");
  const [showBenchmarks, setShowBenchmarks] = useState(true);

  // Colored bar data for reclassification chart
  const coloredReclassData = useMemo(
    () => RECLASS_DATA.map((d) => ({ ...d, fill: getBarColor(d.rate) })),
    []
  );

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight gradient-text-teal">
            Population VUS Classifier
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Model and visualize how VUS reclassification rates differ across ancestral populations.
            Ancestry-unaware tools perform worse for underrepresented populations.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-primary/40 text-primary text-[10px] badge-hover">
            <Microscope className="w-3 h-3 mr-1" />
            8 Populations
          </Badge>
          <Badge variant="outline" className="border-[oklch(0.7_0.16_45)]/40 text-[oklch(0.7_0.16_45)] text-[10px] badge-hover">
            <Activity className="w-3 h-3 mr-1" />
            Live Model
          </Badge>
        </div>
      </div>

      {/* ── Tab Switcher ────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/30 border border-border/50 w-fit">
        <button
          onClick={() => setActiveTab("model")}
          className={cn(
            "px-4 py-2 text-xs font-medium rounded-md transition-all btn-press",
            activeTab === "model"
              ? "bg-[oklch(0.65_0.15_175)]/15 text-primary tab-active-bar"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          )}
        >
          <Brain className="w-3.5 h-3.5 inline mr-1.5" />
          Population VUS Model
        </button>
        <button
          onClick={() => setActiveTab("bias")}
          className={cn(
            "px-4 py-2 text-xs font-medium rounded-md transition-all btn-press",
            activeTab === "bias"
              ? "bg-[oklch(0.65_0.15_175)]/15 text-primary tab-active-bar"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          )}
        >
          <Target className="w-3.5 h-3.5 inline mr-1.5" />
          Bias Impact Analysis
        </button>
      </div>

      {/* ═══ TAB 1: POPULATION VUS MODEL ═══ */}
      {activeTab === "model" && (
        <div className="space-y-6">
          {/* ── Overview Stat Cards ─────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                icon: Microscope,
                label: "Total VUS Analyzed",
                value: "12,847",
                sub: "Across 8 ancestral populations",
                color: "oklch(0.65 0.15 175)",
                delay: "fade-up",
              },
              {
                icon: TrendingUp,
                label: "Avg Reclassification Rate",
                value: "23.4%",
                sub: "Weighted by population size",
                color: "oklch(0.65 0.15 155)",
                delay: "fade-up fade-up-d1",
              },
              {
                icon: Zap,
                label: "Ancestry-Aware Improvement",
                value: "+18.7%",
                sub: "Average uplift for non-European pops",
                color: "oklch(0.7 0.16 45)",
                delay: "fade-up fade-up-d2",
              },
              {
                icon: Shield,
                label: "Clinical Actionability Rate",
                value: "61.2%",
                sub: "Reclassified to actionable categories",
                color: "oklch(0.65 0.15 175)",
                delay: "fade-up fade-up-d3",
              },
            ].map((stat) => (
              <Card
                key={stat.label}
                className={cn(
                  "relative overflow-hidden depth-1 hover-lift btn-press card-highlight-top",
                  stat.delay
                )}
              >
                <div className="stat-accent-bar" style={{ backgroundColor: stat.color }} />
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${stat.color} / 0.12` }}>
                      <stat.icon className="w-4.5 h-4.5" style={{ color: stat.color }} />
                    </div>
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-border/40 text-muted-foreground">
                      <Eye className="w-2.5 h-2.5 mr-0.5" />
                      Live
                    </Badge>
                  </div>
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mt-3">
                    {stat.label}
                  </p>
                  <p className="text-xl font-bold tabular-nums mt-1" style={{ color: stat.color }}>
                    {stat.value}
                  </p>
                  <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                    {stat.sub}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* ── Reclassification Rate by Population ─────────────────────── */}
          <Card className="depth-1 fade-up">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-primary" />
                    Reclassification Rate by Population
                  </CardTitle>
                  <CardDescription className="text-[11px] mt-1">
                    VUS reclassification rates vary dramatically across populations. Well-studied groups (European) benefit from abundant reference data, while underrepresented populations lack the frequency and functional data needed for confident reclassification.
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-[10px] gap-1.5 btn-press"
                  onClick={() => setShowBenchmarks(!showBenchmarks)}
                >
                  {showBenchmarks ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  {showBenchmarks ? "Hide Benchmark" : "Show Benchmark"}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <ChartContainer config={reclassChartConfig} className="h-[320px] w-full">
                <BarChart data={coloredReclassData} barCategoryGap="20%" margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="oklch(0.28 0.02 250)" />
                  <XAxis
                    dataKey="short"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 10, fill: "oklch(0.6 0.02 250)" }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 10, fill: "oklch(0.6 0.02 250)" }}
                    tickFormatter={(v: number) => `${v}%`}
                    domain={[0, 40]}
                  />
                  <ChartTooltip content={<ReclassTooltipContent />} />
                  {showBenchmarks && (
                    <ReferenceLine
                      y={25}
                      stroke="oklch(0.65 0.15 175)"
                      strokeDasharray="6 4"
                      strokeWidth={1.5}
                      label={{
                        value: "ACMG Benchmark (25%)",
                        position: "right",
                        fill: "oklch(0.65 0.15 175)",
                        fontSize: 10,
                      }}
                    />
                  )}
                  <Bar dataKey="rate" radius={[4, 4, 0, 0]} maxBarSize={48}>
                    {coloredReclassData.map((entry, idx) => (
                      <Cell key={`cell-${idx}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
              {/* Legend for bar colors */}
              <div className="flex items-center gap-4 mt-3 text-[10px] text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: "oklch(0.65 0.15 175)" }} />
                  <span>≥ 25% (Above benchmark)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: "oklch(0.7 0.16 45)" }} />
                  <span>15–25% (Moderate)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: "oklch(0.65 0.22 25)" }} />
                  <span>&lt; 15% (Below benchmark)</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── Standard vs Ancestry-Aware Comparison ───────────────────── */}
          <Card className="depth-2 fade-up fade-up-d1">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                Standard vs Ancestry-Aware Comparison
              </CardTitle>
              <CardDescription className="text-[11px]">
                Population-specific models that incorporate ancestry-aware frequency data, functional annotations, and local reference panels significantly close the reclassification gap for non-European populations. Improvement ranges from +5% to +18%.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <ChartContainer config={comparisonChartConfig} className="h-[320px] w-full">
                <BarChart data={COMPARISON_DATA} barGap={3} barCategoryGap="20%" margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="oklch(0.28 0.02 250)" />
                  <XAxis
                    dataKey="short"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 10, fill: "oklch(0.6 0.02 250)" }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 10, fill: "oklch(0.6 0.02 250)" }}
                    tickFormatter={(v: number) => `${v}%`}
                    domain={[0, 40]}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar
                    dataKey="standard"
                    fill="oklch(0.5 0.04 200)"
                    radius={[3, 3, 0, 0]}
                    maxBarSize={28}
                  />
                  <Bar
                    dataKey="ancestryAware"
                    fill="oklch(0.65 0.15 175)"
                    radius={[3, 3, 0, 0]}
                    maxBarSize={28}
                  />
                </BarChart>
              </ChartContainer>
              {/* Improvement callout */}
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  {
                    pop: "Pacific Islander",
                    improvement: "+11.9%",
                    color: "oklch(0.65 0.15 175)",
                    desc: "Largest absolute improvement — from 6.2% to 18.1%",
                  },
                  {
                    pop: "African",
                    improvement: "+14.4%",
                    color: "oklch(0.65 0.15 155)",
                    desc: "Second largest — proximity to European gap narrows significantly",
                  },
                  {
                    pop: "American Indian/AN",
                    improvement: "+10.6%",
                    color: "oklch(0.7 0.16 45)",
                    desc: "More than doubles reclassification rate with ancestry-aware model",
                  },
                ].map((item) => (
                  <div
                    key={item.pop}
                    className={cn(
                      "rounded-lg border border-border/50 p-3 transition-colors hover:bg-muted/20",
                      "data-grid-bg"
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-medium text-foreground">{item.pop}</span>
                      <span className="text-sm font-bold tabular-nums" style={{ color: item.color }}>
                        {item.improvement}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ═══ TAB 2: BIAS IMPACT ANALYSIS ═══ */}
      {activeTab === "bias" && (
        <div className="space-y-6">
          {/* ── Bias Impact Radar Chart ─────────────────────────────────── */}
          <Card className="depth-1 fade-up">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Globe className="w-4 h-4 text-primary" />
                Bias Impact Radar Chart
              </CardTitle>
              <CardDescription className="text-[11px]">
                Multi-dimensional comparison of genomic tool performance across 4 populations. European populations show consistently high scores (70–95) while underrepresented groups score significantly lower (30–60) across all clinical dimensions.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <ChartContainer config={radarChartConfig} className="h-[400px] w-full">
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={RADAR_DATA}>
                  <PolarGrid stroke="oklch(0.28 0.02 250)" />
                  <PolarAngleAxis
                    dataKey="dimension"
                    tick={{ fontSize: 9, fill: "oklch(0.6 0.02 250)" }}
                  />
                  <PolarRadiusAxis
                    angle={30}
                    domain={[0, 100]}
                    tick={{ fontSize: 8, fill: "oklch(0.5 0.02 250)" }}
                    tickCount={5}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Radar
                    name="European"
                    dataKey="European"
                    stroke="oklch(0.65 0.15 175)"
                    fill="oklch(0.65 0.15 175)"
                    fillOpacity={0.15}
                    strokeWidth={2}
                  />
                  <Radar
                    name="African"
                    dataKey="African"
                    stroke="oklch(0.65 0.22 25)"
                    fill="oklch(0.65 0.22 25)"
                    fillOpacity={0.1}
                    strokeWidth={2}
                  />
                  <Radar
                    name="Hispanic/Latino"
                    dataKey="Hispanic/Latino"
                    stroke="oklch(0.7 0.16 45)"
                    fill="oklch(0.7 0.16 45)"
                    fillOpacity={0.1}
                    strokeWidth={2}
                  />
                  <Radar
                    name="East Asian"
                    dataKey="East Asian"
                    stroke="oklch(0.65 0.15 155)"
                    fill="oklch(0.65 0.15 155)"
                    fillOpacity={0.1}
                    strokeWidth={2}
                  />
                </RadarChart>
              </ChartContainer>
              {/* Dimension descriptions */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-4">
                {RADAR_DIMENSIONS.map((dim) => (
                  <div key={dim.dimension} className="flex items-start gap-2 p-2 rounded-md bg-muted/15">
                    <ChevronRight className="w-3 h-3 text-primary mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[10px] font-medium text-foreground">{dim.short}</p>
                      <p className="text-[9px] text-muted-foreground/60">{dim.dimension}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* ── Bias Impact Detail Table ────────────────────────────────── */}
          <Card className="depth-2 fade-up fade-up-d1">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                Bias Impact Detail Table
              </CardTitle>
              <CardDescription className="text-[11px]">
                Quantitative bias assessment across 8 populations. The Overall Bias Score (0–1) aggregates all metrics — populations scoring above 0.5 face significant clinical reporting disparities.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="rounded-lg border border-border/50 overflow-hidden">
                <div className="max-h-[400px] overflow-y-auto">
                  <table className="w-full text-[11px]">
                    <thead className="sticky top-0 bg-[oklch(0.17_0.015_250)] z-10">
                      <tr className="border-b border-border/60">
                        <th className="text-left px-4 py-3 font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">
                          Population
                        </th>
                        <th className="text-center px-3 py-3 font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">
                          Ref. Coverage
                        </th>
                        <th className="text-center px-3 py-3 font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">
                          VUS Accuracy
                        </th>
                        <th className="text-center px-3 py-3 font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">
                          PRS Accuracy
                        </th>
                        <th className="text-center px-3 py-3 font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">
                          Drug Response
                        </th>
                        <th className="text-center px-3 py-3 font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">
                          Bias Score
                        </th>
                        <th className="text-center px-3 py-3 font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {BIAS_TABLE_DATA.map((row, idx) => (
                        <tr
                          key={row.population}
                          className={cn(
                            "border-b border-border/30 last:border-b-0 table-hover-stripe transition-colors",
                            idx % 2 === 1 && "bg-muted/10"
                          )}
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-1.5 h-6 rounded-full"
                                style={{
                                  backgroundColor:
                                    row.biasScore < 0.3
                                      ? "oklch(0.65 0.15 155)"
                                      : row.biasScore < 0.5
                                      ? "oklch(0.7 0.16 45)"
                                      : "oklch(0.65 0.22 25)",
                                }}
                              />
                              <span className="font-medium text-foreground">{row.population}</span>
                            </div>
                          </td>
                          <td className="text-center px-3 py-3 tabular-nums">{row.refCoverage}%</td>
                          <td className="text-center px-3 py-3 tabular-nums">{row.vusAccuracy}%</td>
                          <td className="text-center px-3 py-3 tabular-nums">{row.prsAccuracy}%</td>
                          <td className="text-center px-3 py-3 tabular-nums">{row.drugResponse}%</td>
                          <td className="text-center px-3 py-3">
                            <span
                              className={cn(
                                "inline-flex items-center justify-center px-2 py-0.5 rounded-md text-[11px] font-bold tabular-nums",
                                getBiasScoreBg(row.biasScore),
                                getBiasScoreColor(row.biasScore)
                              )}
                            >
                              {row.biasScore.toFixed(2)}
                            </span>
                          </td>
                          <td className="text-center px-3 py-3">{getStatusBadge(row.status)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              {/* Table footer note */}
              <div className="flex items-center gap-4 mt-3 text-[10px] text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-sm bg-[oklch(0.65_0.15_155)]" />
                  <span>Low Bias (&lt;0.3)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-sm bg-[oklch(0.7_0.16_45)]" />
                  <span>Moderate (0.3–0.5)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-sm bg-[oklch(0.65_0.22_25)]" />
                  <span>High (&gt;0.5)</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── Key Insight Callout ──────────────────────────────────────── */}
          <Card className={cn(
            "depth-1 glow-border-warning fade-up fade-up-d2",
            "glass-layer morph-border"
          )}>
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-[oklch(0.7_0.16_45)]/15 flex items-center justify-center shrink-0 mt-0.5">
                  <Info className="w-5 h-5 text-[oklch(0.7_0.16_45)]" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[oklch(0.7_0.16_45)] mb-2 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Key Finding: VUS Disparity Impact
                  </p>
                  <p className="text-[12px] leading-relaxed text-foreground/85">
                    VUS variants in underrepresented populations are <span className="font-bold text-[oklch(0.65_0.22_25)]">2.5x more likely</span> to remain
                    unclassified compared to European populations. This creates a <span className="font-semibold">clinical reporting gap</span> that
                    directly affects patient care for non-European patients. Ancestry-aware tools that incorporate
                    population-specific frequency data and functional annotations can <span className="font-bold text-[oklch(0.65_0.15_155)]">reduce this gap by up to 40%</span>.
                  </p>
                  <div className="flex items-center gap-3 mt-3">
                    <Badge className="bg-[oklch(0.65_0.22_25)]/15 text-[oklch(0.65_0.22_25)] border-[oklch(0.65_0.22_25)]/30 badge-hover chip-interactive">
                      2.5× Disparity
                    </Badge>
                    <Badge className="bg-[oklch(0.65_0.15_155)]/15 text-[oklch(0.65_0.15_155)] border-[oklch(0.65_0.15_155)]/30 badge-hover chip-interactive">
                      Up to 40% Reduction
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── Bottom Row: Equity Donut + Summary ──────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Population Coverage Equity Donut */}
            <Card className="lg:col-span-5 depth-2 fade-up fade-up-d3 corner-accent-tl">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5 text-primary" />
                  Population Coverage Equity Score
                </CardTitle>
                <CardDescription className="text-[10px]">
                  Distribution of populations by bias severity level
                </CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-center">
                <ChartContainer config={equityPieConfig} className="w-full h-[240px]">
                  <PieChart>
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Pie
                      data={EQUITY_PIE_DATA}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                      nameKey="name"
                      animationBegin={0}
                      animationDuration={800}
                    >
                      {EQUITY_PIE_DATA.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <ChartLegend content={<ChartLegendContent nameKey="name" />} />
                  </PieChart>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Summary cards */}
            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card className="depth-1 hover-lift card-gradient-teal fade-up fade-up-d3">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-[oklch(0.65_0.15_175)]/15 flex items-center justify-center shrink-0">
                      <Brain className="w-4.5 h-4.5 text-primary" />
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Model Gap (EUR vs PAC)</p>
                      <p className="text-2xl font-bold tabular-nums mt-1 text-primary">25.0%</p>
                      <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                        Reclassification rate differential between best and worst populations
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="depth-1 hover-lift fade-up fade-up-d4">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-[oklch(0.65_0.22_25)]/15 flex items-center justify-center shrink-0">
                      <AlertTriangle className="w-4.5 h-4.5 text-[oklch(0.65_0.22_25)]" />
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Populations Below Benchmark</p>
                      <p className="text-2xl font-bold tabular-nums mt-1 text-[oklch(0.65_0.22_25)]">5 / 8</p>
                      <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                        62.5% of populations fail to meet ACMG 25% reclassification benchmark
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="depth-1 hover-lift fade-up fade-up-d4">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-[oklch(0.65_0.15_155)]/15 flex items-center justify-center shrink-0">
                      <Target className="w-4.5 h-4.5 text-[oklch(0.65_0.15_155)]" />
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Avg Ancestry-Aware Gain</p>
                      <p className="text-2xl font-bold tabular-nums mt-1 text-[oklch(0.65_0.15_155)]">+12.8%</p>
                      <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                        Mean improvement across all 8 populations with ancestry-aware models
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="depth-1 hover-lift card-inner-shadow fade-up fade-up-d4">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-[oklch(0.7_0.16_45)]/15 flex items-center justify-center shrink-0">
                      <Activity className="w-4.5 h-4.5 text-[oklch(0.7_0.16_45)]" />
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Gap Closure Rate</p>
                      <p className="text-2xl font-bold tabular-nums mt-1 text-[oklch(0.7_0.16_45)]">51.2%</p>
                      <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                        Ancestry-aware tools close over half the EUR–PAC reclassification gap
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
