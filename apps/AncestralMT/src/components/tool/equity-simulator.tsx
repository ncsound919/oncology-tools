"use client";

import React, { useState, useMemo, useCallback } from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import type { ChartConfig } from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import {
  Scale,
  Users,
  Activity,
  Target,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  Heart,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Lightbulb,
} from "lucide-react";
import { cn } from "@/lib/utils";

// --- Constants ---

const POPULATIONS = [
  "European",
  "African",
  "Hispanic/Latino",
  "East Asian",
  "South Asian",
  "AI/AN",
  "Pacific Islander",
] as const;

type Population = (typeof POPULATIONS)[number];

const CANCER_TYPES = [
  "Prostate",
  "Breast",
  "Colorectal",
  "Lung",
  "Pancreatic",
] as const;

// Default values reflecting current bias
const BASELINE: Record<Population, number> = {
  European: 40,
  "Hispanic/Latino": 6,
  African: 8,
  "East Asian": 7,
  "South Asian": 5,
  "AI/AN": 2,
  "Pacific Islander": 2,
};

// --- Chart Config ---

const chartConfig = {
  current: {
    label: "Current Bias",
    color: "oklch(0.65 0.22 25)",
  },
  projected: {
    label: "Projected Bias",
    color: "oklch(0.65 0.15 175)",
  },
} satisfies ChartConfig;

// --- Helper: get population short label ---

function withAlpha(color: string, alpha: number): string {
  return color.replace(")", ` / ${alpha})`);
}

function shortLabel(pop: string): string {
  return pop.split("/")[0].substring(0, 6);
}

// --- Sub-components ---

function StatCard({
  icon: Icon,
  label,
  value,
  suffix,
  color,
  className,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  suffix?: string;
  color: string;
  className?: string;
}) {
  return (
    <Card className={cn("hover-lift card-glow", className)}>
      <CardContent className="p-3 flex items-center gap-2.5">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{ backgroundColor: withAlpha(color, 0.15) }}
        >
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
        <div className="min-w-0">
          <p className="text-lg font-bold tabular-nums leading-tight">{value}</p>
          <p className="text-[10px] text-muted-foreground truncate">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function PopulationSlider({
  pop,
  value,
  onChange,
}: {
  pop: Population;
  value: number;
  onChange: (val: number) => void;
}) {
  const isOverrepresented = value > 20;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium truncate">{pop}</span>
        <span
          className={cn(
            "text-[11px] font-mono font-bold tabular-nums",
            isOverrepresented ? "text-warning" : value < 5 ? "text-destructive" : "text-success"
          )}
        >
          {value}%
        </span>
      </div>
      <Slider
        min={0}
        max={50}
        step={1}
        value={[value]}
        onValueChange={(v) => onChange(v[0])}
        className="w-full"
      />
      <div className="flex justify-between text-[9px] text-muted-foreground">
        <span>0%</span>
        <span className="text-muted-foreground/50">Equal: ~14%</span>
        <span>50%</span>
      </div>
    </div>
  );
}

function ImpactCard({
  icon: Icon,
  label,
  value,
  unit,
  color,
  desc,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  unit: string;
  color: string;
  desc: string;
}) {
  return (
    <Card className="hover-lift inset-depth">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
            style={{ backgroundColor: withAlpha(color, 0.15) }}
          >
            <Icon className="w-4.5 h-4.5" style={{ color }} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] text-muted-foreground mb-1">{label}</p>
            <div className="flex items-baseline gap-1">
              <span
                className="text-2xl font-bold tabular-nums leading-none"
                style={{ color }}
              >
                {value}
              </span>
              <span className="text-xs text-muted-foreground">{unit}</span>
            </div>
            <p className="text-[10px] text-muted-foreground/70 mt-1.5 leading-relaxed">
              {desc}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// --- Recommendations Logic ---

function getRecommendations(
  populations: Record<Population, number>,
  equityIndex: number,
  cancerType: string
): { text: string; priority: "high" | "medium" | "low" }[] {
  const recs: { text: string; priority: "high" | "medium" | "low" }[] = [];

  const sorted = [...POPULATIONS].sort(
    (a, b) => populations[a] - populations[b]
  );

  const lowest = sorted[0];
  const lowestVal = populations[lowest];
  const highest = sorted[sorted.length - 1];
  const highestVal = populations[highest];

  if (lowestVal < 5) {
    recs.push({
      text: `Prioritize ${lowest} recruitment: At ${lowestVal}% representation, clinical utility for this population is severely compromised. Target ≥10% enrollment in ${cancerType} studies within 2 years.`,
      priority: "high",
    });
  }

  if (highestVal > 25) {
    recs.push({
      text: `Rebalance ${highest} overrepresentation: Current ${highestVal}% skews PRS models and variant databases. Cap at 20% to allow underrepresented populations proportional inclusion.`,
      priority: "high",
    });
  }

  const under5 = POPULATIONS.filter((p) => populations[p] < 5);
  if (under5.length >= 3) {
    recs.push({
      text: `Establish multi-site ${cancerType} sequencing partnerships in underrepresented regions (${under5.slice(0, 3).join(", ")}) to build reference cohorts from scratch.`,
      priority: "high",
    });
  }

  if (equityIndex < 40) {
    recs.push({
      text: `Deploy ancestry-aware variant classifiers trained on diverse synthetic data to mitigate VUS rates for underrepresented groups until real data catches up.`,
      priority: "medium",
    });
  }

  if (equityIndex >= 40 && equityIndex < 70) {
    recs.push({
      text: `Implement prospective clinical validation of ${cancerType} PRS models across all populations with ≥5% panel representation to verify equitable predictive performance.`,
      priority: "medium",
    });
  }

  if (equityIndex >= 70) {
    recs.push({
      text: `Establish continuous equity monitoring dashboards for ${cancerType} reference panels with automated alerts when any population drops below 10% representation.`,
      priority: "low",
    });
  }

  recs.push({
    text: `Fund community-engaged research programs with trusted local organizations in underserved areas to improve recruitment consent rates and long-term retention.`,
    priority: "medium",
  });

  return recs.slice(0, 5);
}

// --- Main Component ---

export function EquitySimulatorView() {
  const [cancerType, setCancerType] = useState<string>("Prostate");
  const [populations, setPopulations] =
    useState<Record<Population, number>>({ ...BASELINE });

  const handleSliderChange = useCallback(
    (pop: Population, val: number) => {
      setPopulations((prev) => ({ ...prev, [pop]: val }));
    },
    []
  );

  const handleReset = useCallback(() => {
    setPopulations({ ...BASELINE });
  }, []);

  const handleEquityTargets = useCallback(() => {
    const equal = 14;
    const updated = { ...BASELINE };
    for (const pop of POPULATIONS) {
      updated[pop] = equal;
    }
    setPopulations(updated);
  }, []);

  // --- Calculations ---

  const equityIndex = useMemo(() => {
    const vals = POPULATIONS.map((p) => populations[p]);
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    const variance =
      vals.reduce((sum, v) => sum + (v - mean) ** 2, 0) / vals.length;
    const stddev = Math.sqrt(variance);
    const idx = 100 - stddev * 2.5;
    return Math.max(0, Math.min(100, Math.round(idx)));
  }, [populations]);

  const vusRate = useMemo(
    () => 12 + (equityIndex / 100) * 35,
    [equityIndex]
  );

  const prsAccuracy = useMemo(
    () => 62 + (equityIndex / 100) * 28,
    [equityIndex]
  );

  const clinicalUtility = useMemo(
    () => Math.round(equityIndex * 0.85 + 15),
    [equityIndex]
  );

  const patientsAffected = useMemo(
    () => Math.round((equityIndex / 100) * 2_400_000),
    [equityIndex]
  );

  const falseNegativeReduction = useMemo(
    () => (equityIndex / 100) * 42,
    [equityIndex]
  );

  const drugResponse = useMemo(
    () => 55 + (equityIndex / 100) * 30,
    [equityIndex]
  );

  // --- Chart data ---

  const chartData = useMemo(() => {
    const ideal = Math.round(
      POPULATIONS.reduce((s) => s + 14.3, 0) / POPULATIONS.length
    );
    return POPULATIONS.map((pop) => {
      const current = BASELINE[pop];
      const projected = populations[pop];
      const currentBias = Math.abs(current - ideal);
      const projectedBias = Math.abs(projected - ideal);
      return {
        population: shortLabel(pop),
        current: Math.round(currentBias * 10) / 10,
        projected: Math.round(projectedBias * 10) / 10,
      };
    });
  }, [populations]);

  // --- Recommendations ---

  const recommendations = useMemo(
    () => getRecommendations(populations, equityIndex, cancerType),
    [populations, equityIndex, cancerType]
  );

  // --- Equity color helper ---

  const equityColor = useMemo(() => {
    if (equityIndex >= 70) return "oklch(0.65 0.15 155)";
    if (equityIndex >= 40) return "oklch(0.7 0.16 45)";
    return "oklch(0.65 0.22 25)";
  }, [equityIndex]);

  const equityLabel = useMemo(() => {
    if (equityIndex >= 70) return "Good";
    if (equityIndex >= 40) return "Moderate";
    return "Low";
  }, [equityIndex]);

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight gradient-text-teal">
            Population Equity Simulator
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            What-if analysis tool: simulate the impact of increasing ancestral
            diversity in {cancerType} cancer reference panels.
          </p>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 stagger-1">
        <StatCard
          icon={Activity}
          label="VUS Reclassification Rate"
          value={vusRate.toFixed(1)}
          suffix="%"
          color="oklch(0.65 0.15 175)"
        />
        <StatCard
          icon={Target}
          label="PRS Accuracy Improvement"
          value={prsAccuracy.toFixed(1)}
          suffix="%"
          color="oklch(0.65 0.15 155)"
        />
        <StatCard
          icon={ShieldCheck}
          label="Clinical Utility Score"
          value={String(clinicalUtility)}
          suffix="/100"
          color="oklch(0.7 0.16 45)"
        />
        <StatCard
          icon={Scale}
          label="Equity Index"
          value={String(equityIndex)}
          suffix="/100"
          color={equityColor}
        />
      </div>

      {/* Cancer Type + Action Buttons */}
      <Card className="stagger-2">
        <CardContent className="p-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground font-medium">
                Cancer Type:
              </span>
              <Select value={cancerType} onValueChange={setCancerType}>
                <SelectTrigger className="w-[160px] h-7 text-[11px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CANCER_TYPES.map((ct) => (
                    <SelectItem key={ct} value={ct} className="text-xs">
                      {ct}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2 sm:ml-auto">
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px] badge-hover",
                  equityIndex >= 70
                    ? "border-success/40 text-success"
                    : equityIndex >= 40
                    ? "border-warning/40 text-warning"
                    : "border-destructive/40 text-destructive"
                )}
              >
                Equity: {equityLabel} ({equityIndex}/100)
              </Badge>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-[10px] gap-1.5"
                onClick={handleReset}
              >
                <RotateCcw className="w-3 h-3" />
                Reset to Current
              </Button>
              <Button
                size="sm"
                className="h-7 text-[10px] gap-1.5"
                onClick={handleEquityTargets}
              >
                <Sparkles className="w-3 h-3" />
                Apply Equity Targets
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Population Sliders */}
      <Card className="stagger-3 glass-layer">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            Population Representation Targets
          </CardTitle>
          <CardDescription className="text-[11px]">
            Adjust target representation for each population (0–50%). Current
            reference panels are heavily biased toward European ancestry.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
            {POPULATIONS.map((pop) => (
              <PopulationSlider
                key={pop}
                pop={pop}
                value={populations[pop]}
                onChange={(val) => handleSliderChange(pop, val)}
              />
            ))}
          </div>
          <div className="section-divider mt-5" />
          <div className="flex items-center gap-4 mt-3 text-[10px] text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-sm bg-destructive" />
              <span>&lt;5% (Severely underrepresented)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-sm bg-success" />
              <span>5–20% (Adequate)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-sm bg-warning" />
              <span>&gt;20% (Overrepresented)</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Before / After Chart */}
      <Card className="stagger-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-primary" />
            Before/After Bias Comparison
          </CardTitle>
          <CardDescription className="text-[11px]">
            Current vs. projected representation bias per population (deviation
            from equal ~14.3% target). Lower is better.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <ChartContainer config={chartConfig} className="h-[280px] w-full">
            <BarChart data={chartData} barGap={2} barCategoryGap="20%">
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="oklch(0.28 0.02 250)"
              />
              <XAxis
                dataKey="population"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 10, fill: "oklch(0.6 0.02 250)" }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 10, fill: "oklch(0.6 0.02 250)" }}
                tickFormatter={(v: number) => `${v}%`}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar
                dataKey="current"
                fill="oklch(0.65 0.22 25)"
                radius={[3, 3, 0, 0]}
                maxBarSize={28}
              />
              <Bar
                dataKey="projected"
                fill="oklch(0.65 0.15 175)"
                radius={[3, 3, 0, 0]}
                maxBarSize={28}
              />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Impact Projections */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 stagger-5">
        <ImpactCard
          icon={Heart}
          label="Patients Affected Annually"
          value={patientsAffected.toLocaleString()}
          unit="patients"
          color="oklch(0.65 0.15 175)"
          desc={`Estimated ${cancerType} cancer patients who would receive improved clinical decisions with equitable reference panels.`}
        />
        <ImpactCard
          icon={AlertTriangle}
          label="False Negative Reduction"
          value={falseNegativeReduction.toFixed(1)}
          unit="%"
          color="oklch(0.7 0.16 45)"
          desc={`Reduction in missed pathogenic variant calls for underrepresented populations in ${cancerType} screening.`}
        />
        <ImpactCard
          icon={CheckCircle2}
          label="Drug Response Prediction"
          value={drugResponse.toFixed(1)}
          unit="%"
          color="oklch(0.65 0.15 155)"
          desc={`Projected accuracy of pharmacogenomic predictions for ${cancerType} treatments across all populations.`}
        />
      </div>

      {/* Recommended Actions */}
      <Card className="stagger-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-warning" />
            Recommended Actions
          </CardTitle>
          <CardDescription className="text-[11px]">
            Context-specific recommendations based on current slider settings
            for {cancerType} cancer.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recommendations.map((rec, i) => (
              <div
                key={i}
                className={cn(
                  "flex gap-3 p-3 rounded-lg border transition-colors hover:bg-muted/30",
                  rec.priority === "high"
                    ? "border-destructive/25 bg-destructive/5"
                    : rec.priority === "medium"
                    ? "border-warning/20 bg-warning/5"
                    : "border-success/20 bg-success/5"
                )}
              >
                <div
                  className={cn(
                    "w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold mt-0.5",
                    rec.priority === "high"
                      ? "bg-destructive/20 text-destructive"
                      : rec.priority === "medium"
                      ? "bg-warning/20 text-warning"
                      : "bg-success/20 text-success"
                  )}
                >
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[9px] px-1.5 py-0 badge-hover",
                        rec.priority === "high"
                          ? "border-destructive/40 text-destructive"
                          : rec.priority === "medium"
                          ? "border-warning/40 text-warning"
                          : "border-success/40 text-success"
                      )}
                    >
                      {rec.priority === "high"
                        ? "High Priority"
                        : rec.priority === "medium"
                        ? "Medium Priority"
                        : "Low Priority"}
                    </Badge>
                  </div>
                  <p className="text-[11px] leading-relaxed text-foreground/90">
                    {rec.text}
                  </p>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-1" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}