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
import { Input } from "@/components/ui/input";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import type { ChartConfig } from "@/components/ui/chart";
import { PieChart, Pie, Cell } from "recharts";
import {
  PieChart as PieChartIcon,
  Users,
  Calculator,
  BarChart3,
  Lightbulb,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Target,
  RotateCcw,
  Info,
  Zap,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Constants ───────────────────────────────────────────────

const POPULATIONS = [
  "European",
  "African",
  "Hispanic/Latino",
  "East Asian",
  "South Asian",
  "American Indian/Alaska Native",
  "Other/Mixed",
] as const;

type Population = (typeof POPULATIONS)[number];

const POP_COLORS: Record<Population, string> = {
  European: "oklch(0.65 0.15 175)",
  African: "oklch(0.7 0.16 45)",
  "Hispanic/Latino": "oklch(0.6 0.2 300)",
  "East Asian": "oklch(0.7 0.15 140)",
  "South Asian": "oklch(0.65 0.2 25)",
  "American Indian/Alaska Native": "oklch(0.55 0.15 250)",
  "Other/Mixed": "oklch(0.7 0.12 90)",
};

const DEFAULT_ALLOCATION: Record<Population, number> = {
  European: 50,
  African: 8,
  "Hispanic/Latino": 6,
  "East Asian": 5,
  "South Asian": 3,
  "American Indian/Alaska Native": 2,
  "Other/Mixed": 1,
};

const TARGET_RECOMMENDATIONS: Record<Population, number> = {
  European: 28,
  African: 18,
  "Hispanic/Latino": 22,
  "East Asian": 8,
  "South Asian": 6,
  "American Indian/Alaska Native": 4,
  "Other/Mixed": 14,
};

const REAL_DATASETS: Record<string, Record<Population, number>> = {
  "TCGA PRAD": {
    European: 82.3,
    African: 7.1,
    "Hispanic/Latino": 3.2,
    "East Asian": 3.8,
    "South Asian": 1.5,
    "American Indian/Alaska Native": 0.4,
    "Other/Mixed": 1.7,
  },
  "TCGA COAD": {
    European: 78.5,
    African: 9.8,
    "Hispanic/Latino": 4.1,
    "East Asian": 4.2,
    "South Asian": 1.2,
    "American Indian/Alaska Native": 0.5,
    "Other/Mixed": 1.7,
  },
  "Community Biobank": {
    European: 45.2,
    African: 19.3,
    "Hispanic/Latino": 18.1,
    "East Asian": 6.5,
    "South Asian": 4.2,
    "American Indian/Alaska Native": 3.1,
    "Other/Mixed": 3.6,
  },
};

const chartConfig = {
  European: { label: "European", color: POP_COLORS.European },
  African: { label: "African", color: POP_COLORS.African },
  "Hispanic/Latino": { label: "Hisp/Lat", color: POP_COLORS["Hispanic/Latino"] },
  "East Asian": { label: "E. Asian", color: POP_COLORS["East Asian"] },
  "South Asian": { label: "S. Asian", color: POP_COLORS["South Asian"] },
  "American Indian/Alaska Native": { label: "AI/AN", color: POP_COLORS["American Indian/Alaska Native"] },
  "Other/Mixed": { label: "Other", color: POP_COLORS["Other/Mixed"] },
} satisfies ChartConfig;

// ─── Helpers ──────────────────────────────────────────────────

/** Approximate inverse normal CDF (Abramowitz & Stegun rational approximation) */
function normalInv(p: number): number {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  if (p === 0.5) return 0;

  const a1 = -3.969683028665376e1;
  const a2 = 2.209460984245205e2;
  const a3 = -2.759285104469687e2;
  const a4 = 1.38357751867269e2;
  const a5 = -3.066479806614716e1;
  const a6 = 2.506628277459239e0;

  const b1 = -5.447609879822406e1;
  const b2 = 1.615858368580409e2;
  const b3 = -1.556989798598866e2;
  const b4 = 6.680131188771972e1;
  const b5 = -1.328068155288572e1;

  const c1 = -7.784894002430293e-3;
  const c2 = -3.223964580411365e-1;
  const c3 = -2.400758277161838e0;
  const c4 = -2.549732539343734e0;
  const c5 = 4.374664141464968e0;
  const c6 = 2.938163982698783e0;

  const d1 = 7.784695709041462e-3;
  const d2 = 3.224671290700398e-1;
  const d3 = 2.445134137142996e0;
  const d4 = 3.754408661907416e0;

  const pLow = 0.02425;
  const pHigh = 1 - pLow;

  const q = p < pLow ? Math.sqrt(-2 * Math.log(p))
    : p <= pHigh ? 0
    : Math.sqrt(-2 * Math.log(1 - p));

  if (p < pLow) {
    return (((((c1*q+c2)*q+c3)*q+c4)*q+c5)*q+c6)/
           ((((d1*q+d2)*q+d3)*q+d4)*q+1);
  } else if (p <= pHigh) {
    const r = (p - 0.5) * (p - 0.5);
    return (((((a1*r+a2)*r+a3)*r+a4)*r+a5)*r+a6)*(p-0.5)/
           (((((b1*r+b2)*r+b3)*r+b4)*r+b5)*r+1);
  } else {
    return -(((((c1*q+c2)*q+c3)*q+c4)*q+c5)*q+c6)/
            ((((d1*q+d2)*q+d3)*q+d4)*q+1);
  }
}

function shortPopLabel(pop: string): string {
  if (pop === "American Indian/Alaska Native") return "AI/AN";
  if (pop === "Hispanic/Latino") return "H/Lat";
  if (pop === "Other/Mixed") return "Other";
  return pop;
}

// ─── Sub-components ───────────────────────────────────────────

function SectionHeader({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description: string }) {
  return (
    <div className="section-title">
      <Icon className="w-4.5 h-4.5 text-primary" />
      <div className="min-w-0">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────

export function CohortDesignerView() {
  const [allocation, setAllocation] = useState<Record<Population, number>>(DEFAULT_ALLOCATION);
  const [effectSize, setEffectSize] = useState(0.5);
  const [alpha, setAlpha] = useState(0.05);
  const [power, setPower] = useState(0.8);

  // Derived: totals
  const totalN = useMemo(() => Object.values(allocation).reduce((s, v) => s + v, 0), [allocation]);

  const proportions = useMemo(() => {
    if (totalN === 0) return POPULATIONS.map((p) => ({ pop: p, count: 0, pct: 0 }));
    return POPULATIONS.map((p) => ({
      pop: p,
      count: allocation[p],
      pct: (allocation[p] / totalN) * 100,
    }));
  }, [allocation, totalN]);

  const pieData = useMemo(
    () => POPULATIONS.map((p) => ({ name: p, value: allocation[p], fill: POP_COLORS[p] })),
    [allocation]
  );

  // Derived: statistical power
  const minSamplePerGroup = useMemo(() => {
    const d = Math.max(effectSize, 0.01);
    const zAlpha = normalInv(1 - alpha / 2);
    const zBeta = normalInv(power);
    return Math.ceil(2 * Math.pow((zAlpha + zBeta) / d, 2));
  }, [effectSize, alpha, power]);

  const totalPowerRequired = minSamplePerGroup * 2;

  // Derived: diversity scores
  const diversityMetrics = useMemo(() => {
    if (totalN === 0) return { shannonEntropy: 0, simpsonIndex: 0, maxEntropy: 0, normalizedDiversity: 0, activePopulations: 0 };
    const activePops = POPULATIONS.filter((p) => allocation[p] > 0);
    const k = activePops.length;
    let shannon = 0;
    for (const p of POPULATIONS) {
      const pi = allocation[p] / totalN;
      if (pi > 0) shannon -= pi * Math.log(pi);
    }
    let simpsonSum = 0;
    for (const p of POPULATIONS) { const pi = allocation[p] / totalN; simpsonSum += pi * pi; }
    const simpson = 1 - simpsonSum;
    const maxEnt = k > 1 ? Math.log(k) : 0;
    const normalized = maxEnt > 0 ? (shannon / maxEnt) * 100 : 0;
    return { shannonEntropy: shannon, simpsonIndex: simpson, maxEntropy: maxEnt, normalizedDiversity: normalized, activePopulations: k };
  }, [allocation, totalN]);

  // Derived: recommendations
  const recommendations = useMemo(() => {
    const recs: { type: "warning" | "success" | "info"; title: string; description: string }[] = [];
    if (totalN === 0) {
      recs.push({ type: "info", title: "No Allocation", description: "Adjust the population sliders to begin designing your cohort." });
      return recs;
    }
    for (const p of POPULATIONS) {
      const pct = (allocation[p] / totalN) * 100;
      if (pct > 50) {
        recs.push({ type: "warning", title: `${p} Overrepresented`, description: `At ${pct.toFixed(1)}%, ${p} dominates the cohort. Consider redistributing to improve generalizability.` });
      }
    }
    if (totalN < totalPowerRequired) {
      recs.push({ type: "warning", title: "Insufficient Total Sample Size", description: `Current N=${totalN} is below the recommended N=${totalPowerRequired} (2 groups × ${minSamplePerGroup}/group) for the specified power parameters.` });
    } else {
      recs.push({ type: "success", title: "Adequate Total Sample Size", description: `Total N=${totalN} meets the minimum requirement of N=${totalPowerRequired} for the specified power parameters.` });
    }
    const underpoweredGroups = POPULATIONS.filter((p) => allocation[p] > 0 && allocation[p] < minSamplePerGroup);
    if (underpoweredGroups.length > 0) {
      recs.push({ type: "warning", title: `${underpoweredGroups.length} Group(s) Underpowered`, description: `${underpoweredGroups.map(shortPopLabel).join(", ")} have fewer than ${minSamplePerGroup} samples needed per group.` });
    }
    if (diversityMetrics.normalizedDiversity >= 80) {
      recs.push({ type: "success", title: "Excellent Diversity Score", description: `Normalized diversity is ${diversityMetrics.normalizedDiversity.toFixed(1)}%, indicating a well-balanced cohort.` });
    } else if (diversityMetrics.normalizedDiversity >= 50) {
      recs.push({ type: "info", title: "Moderate Diversity Score", description: `Normalized diversity is ${diversityMetrics.normalizedDiversity.toFixed(1)}%. Consider adding to underrepresented populations.` });
    } else {
      recs.push({ type: "warning", title: "Low Diversity Score", description: `Normalized diversity is only ${diversityMetrics.normalizedDiversity.toFixed(1)}%. The cohort is heavily skewed.` });
    }
    const zeroPops = POPULATIONS.filter((p) => allocation[p] === 0);
    if (zeroPops.length > 0) {
      recs.push({ type: "info", title: `${zeroPops.length} Population(s) Unrepresented`, description: `${zeroPops.join(", ")} have 0 allocation. Even small numbers improve generalizability.` });
    }
    const eurPct = (allocation.European / totalN) * 100;
    if (eurPct < 70) {
      recs.push({ type: "success", title: "Improved Over TCGA Baseline", description: `Your European representation (${eurPct.toFixed(1)}%) is significantly lower than TCGA PRAD (82.3%) and TCGA COAD (78.5%).` });
    }
    return recs;
  }, [allocation, totalN, totalPowerRequired, minSamplePerGroup, diversityMetrics.normalizedDiversity]);

  // Handlers
  const handleSliderChange = useCallback((pop: Population, value: number) => {
    setAllocation((prev) => ({ ...prev, [pop]: value }));
  }, []);

  const handleReset = useCallback(() => {
    setAllocation(DEFAULT_ALLOCATION);
    setEffectSize(0.5);
    setAlpha(0.05);
    setPower(0.8);
  }, []);

  const handleDistributeEqually = useCallback(() => {
    const n = Math.floor(totalN / POPULATIONS.length);
    const remainder = totalN % POPULATIONS.length;
    const eq = {} as Record<Population, number>;
    POPULATIONS.forEach((p, i) => { eq[p] = n + (i < remainder ? 1 : 0); });
    setAllocation(eq);
  }, [totalN]);

  const handleMatchUS = useCallback(() => {
    const us = {} as Record<Population, number>;
    POPULATIONS.forEach((p) => { us[p] = Math.round(totalN * (TARGET_RECOMMENDATIONS[p] / 100)); });
    setAllocation(us);
  }, [totalN]);

  return (
    <div className="p-6 space-y-6 view-fade-in">
      {/* ─── Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Cohort Designer</h2>
          <p className="text-xs text-muted-foreground mt-1">Plan ancestrally diverse cancer genomics study cohorts with statistical rigor</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleDistributeEqually} className="text-xs h-8">
            <BarChart3 className="w-3.5 h-3.5 mr-1.5" />Equal Split
          </Button>
          <Button variant="outline" size="sm" onClick={handleMatchUS} className="text-xs h-8">
            <Target className="w-3.5 h-3.5 mr-1.5" />Match US Pop.
          </Button>
          <Button variant="outline" size="sm" onClick={handleReset} className="text-xs h-8">
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" />Reset
          </Button>
        </div>
      </div>

      {/* ─── Section 1: Population Allocation + PieChart ─── */}
      <Card className="card-glow">
        <CardHeader className="pb-3">
          <SectionHeader icon={Users} title="Population Allocation" description="Set sample counts for each ancestral population group" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-3">
              {POPULATIONS.map((pop, idx) => {
                const count = allocation[pop];
                const pct = totalN > 0 ? ((count / totalN) * 100).toFixed(1) : "0.0";
                const target = TARGET_RECOMMENDATIONS[pop];
                const color = POP_COLORS[pop];
                return (
                  <div key={pop} className={cn("rounded-lg border border-border/50 bg-card/50 p-3 transition-colors hover:bg-accent/30", `stagger-${Math.min(idx + 1, 6)}`)}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
                        <span className="text-xs font-medium text-foreground">{pop}</span>
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 text-muted-foreground border-border font-normal">Target: {target}%</Badge>
                      </div>
                      <div className="flex items-center gap-3 tabular-nums">
                        <span className="text-sm font-bold" style={{ color }}>{count}</span>
                        <span className="text-xs text-muted-foreground w-12 text-right">{pct}%</span>
                      </div>
                    </div>
                    <input
                      type="range" min={0} max={200} value={count}
                      onChange={(e) => handleSliderChange(pop, parseInt(e.target.value))}
                      className="w-full h-1.5 rounded-full cursor-pointer cohort-slider"
                      style={{ background: `linear-gradient(to right, ${color} 0%, ${color} ${(count / 200) * 100}%, oklch(0.25 0.02 250) ${(count / 200) * 100}%, oklch(0.25 0.02 250) 100%)` }}
                    />
                  </div>
                );
              })}
              <div className="flex items-center justify-between pt-3 border-t border-border/50">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Cohort Size</span>
                <span className="text-xl font-bold text-foreground tabular-nums text-glow-teal">{totalN}</span>
              </div>
            </div>
            <div className="flex flex-col items-center justify-center">
              <div className="w-full max-w-[280px]">
                <ChartContainer config={chartConfig} className="mx-auto aspect-square">
                  <PieChart>
                    <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={90} strokeWidth={1} stroke="oklch(0.17 0.015 250)">
                      {pieData.map((entry, idx) => <Cell key={idx} fill={entry.fill} />)}
                    </Pie>
                    <ChartLegend content={<ChartLegendContent nameKey="name" />} className="flex-wrap gap-x-3 gap-y-1" />
                  </PieChart>
                </ChartContainer>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── Section 2 & 3: Power Calculator + Diversity Score ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Statistical Power Calculator */}
        <Card className="card-glow">
          <CardHeader className="pb-3">
            <SectionHeader icon={Calculator} title="Statistical Power Calculator" description="Two-sample t-test minimum sample size estimation" />
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Effect Size (Cohen&apos;s d)</label>
                <Input type="number" step={0.05} min={0.01} max={3} value={effectSize} onChange={(e) => setEffectSize(Math.max(0.01, parseFloat(e.target.value) || 0.5))} className="h-9 text-sm tabular-nums" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Significance Level (α)</label>
                <Input type="number" step={0.01} min={0.001} max={0.2} value={alpha} onChange={(e) => setAlpha(Math.max(0.001, parseFloat(e.target.value) || 0.05))} className="h-9 text-sm tabular-nums" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Power (1 − β)</label>
                <Input type="number" step={0.05} min={0.1} max={0.99} value={power} onChange={(e) => setPower(Math.min(0.99, parseFloat(e.target.value) || 0.8))} className="h-9 text-sm tabular-nums" />
              </div>
            </div>
            <div className="gradient-divider" />
            <div className="rounded-lg bg-muted/30 border border-border/50 p-3 text-center">
              <p className="text-[10px] text-muted-foreground mb-1.5 uppercase tracking-wider font-medium">Formula</p>
              <p className="text-xs font-mono text-foreground/80">n/group = 2 × ((Z<sub>1-α/2</sub> + Z<sub>1-β</sub>) / d)²</p>
            </div>
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-6 text-center glow-teal">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-2">Minimum Sample Size per Group</p>
              <p className="text-4xl font-black tabular-nums text-glow-teal">{minSamplePerGroup}</p>
              <p className="text-xs text-muted-foreground mt-2">Total for 2 groups: <span className="text-foreground font-semibold">{totalPowerRequired}</span></p>
            </div>
            <div className="flex items-start gap-2 rounded-lg bg-muted/20 border border-border/30 p-3">
              <Info className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                This assumes a two-sided two-sample t-test with equal variance. For multi-group ANOVA, increase the per-group estimate by ~20–30%. Adjust for multiple testing if applicable.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Diversity Score Estimation */}
        <Card className="card-glow">
          <CardHeader className="pb-3">
            <SectionHeader icon={BarChart3} title="Diversity Score Estimation" description="Quantify cohort diversity using ecological indices" />
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Shannon Entropy */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5 text-primary" />
                  <span className="text-xs font-medium text-foreground">Shannon Entropy (H)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold tabular-nums text-foreground">{diversityMetrics.shannonEntropy.toFixed(3)}</span>
                  <span className="text-[10px] text-muted-foreground">/ {diversityMetrics.maxEntropy.toFixed(3)} max</span>
                </div>
              </div>
              <div className="progress-glow">
                <div className="progress-glow-fill" style={{ width: `${totalN > 0 ? (diversityMetrics.shannonEntropy / Math.max(diversityMetrics.maxEntropy, 0.01)) * 100 : 0}%` }} />
              </div>
              <p className="text-[10px] text-muted-foreground">H = −Σ(pᵢ × ln(pᵢ)) — measures information content of the population distribution</p>
            </div>

            <div className="gradient-divider" />

            {/* Simpson's Diversity */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5" style={{ color: "oklch(0.7 0.16 45)" }} />
                  <span className="text-xs font-medium text-foreground">Simpson&apos;s Diversity Index</span>
                </div>
                <span className="text-sm font-bold tabular-nums text-foreground">{(diversityMetrics.simpsonIndex * 100).toFixed(1)}%</span>
              </div>
              <div className="progress-glow">
                <div className="progress-glow-fill progress-glow-fill-amber" style={{ width: `${diversityMetrics.simpsonIndex * 100}%` }} />
              </div>
              <p className="text-[10px] text-muted-foreground">1 − Σ(pᵢ²) — probability two random samples are from different populations</p>
            </div>

            <div className="gradient-divider" />

            {/* Normalized Diversity Score */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-3.5 h-3.5" style={{ color: "oklch(0.6 0.2 300)" }} />
                  <span className="text-xs font-medium text-foreground">Normalized Diversity Score</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn("text-lg font-black tabular-nums",
                    diversityMetrics.normalizedDiversity >= 80 ? "text-glow-teal" :
                    diversityMetrics.normalizedDiversity >= 50 ? "text-glow-amber" : "text-glow-destructive"
                  )}>
                    {diversityMetrics.normalizedDiversity.toFixed(1)}%
                  </span>
                </div>
              </div>
              <div className="progress-glow">
                <div className={cn("progress-glow-fill",
                  diversityMetrics.normalizedDiversity >= 80 ? "" :
                  diversityMetrics.normalizedDiversity >= 50 ? "progress-glow-fill-amber" : "progress-glow-fill-destructive"
                )} style={{ width: `${diversityMetrics.normalizedDiversity}%` }} />
              </div>
              <p className="text-[10px] text-muted-foreground">(H / ln(k)) × 100 where k = {diversityMetrics.activePopulations} active populations</p>
            </div>

            <div className="flex items-start gap-2 rounded-lg bg-muted/20 border border-border/30 p-3">
              <Info className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                A normalized score above 80% indicates excellent diversity. Most TCGA studies score below 40% due to European dominance. Community biobanks typically score 60–75%.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── Section 4: Comparison Table ─── */}
      <Card className="card-glow">
        <CardHeader className="pb-3">
          <SectionHeader icon={PieChartIcon} title="Comparison with Real Datasets" description="Your design vs established cancer genomics datasets" />
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border border-border/50">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/50 bg-muted/30">
                  <th className="text-left py-2.5 px-3 font-medium text-muted-foreground">Population</th>
                  <th className="text-right py-2.5 px-3 font-medium text-primary">Your Design</th>
                  {Object.keys(REAL_DATASETS).map((ds) => (
                    <th key={ds} className="text-right py-2.5 px-3 font-medium text-muted-foreground">{ds}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {POPULATIONS.map((pop) => {
                  const userPct = totalN > 0 ? (allocation[pop] / totalN) * 100 : 0;
                  return (
                    <tr key={pop} className="border-b border-border/20 data-table-row">
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ background: POP_COLORS[pop] }} />
                          <span className="font-medium text-foreground">{pop}</span>
                        </div>
                      </td>
                      <td className="text-right py-2 px-3 tabular-nums font-semibold text-primary">{userPct.toFixed(1)}%</td>
                      {Object.keys(REAL_DATASETS).map((ds) => {
                        const dsPct = REAL_DATASETS[ds][pop];
                        const exceeds = userPct > dsPct;
                        return (
                          <td key={ds} className={cn("text-right py-2 px-3 tabular-nums", exceeds ? "text-success font-medium" : "text-muted-foreground")}>
                            {dsPct.toFixed(1)}%
                            {exceeds && (
                              <TrendingUp className="w-3 h-3 inline-block ml-1 text-success" />
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex items-center gap-4 mt-3 text-[10px] text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="w-3 h-3 text-success" />
              <span>Your design exceeds dataset</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── Section 5: Recommendations ─── */}
      <Card className="card-glow">
        <CardHeader className="pb-3">
          <SectionHeader icon={Lightbulb} title="Recommendations" description="Dynamic guidance based on your current allocation design" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recommendations.map((rec, idx) => {
              const config = {
                warning: { icon: AlertTriangle, bg: "bg-destructive/5", border: "border-destructive/20", iconColor: "text-destructive", titleColor: "text-destructive" },
                success: { icon: CheckCircle2, bg: "bg-success/5", border: "border-success/20", iconColor: "text-success", titleColor: "text-success" },
                info: { icon: Info, bg: "bg-primary/5", border: "border-primary/20", iconColor: "text-primary", titleColor: "text-primary" },
              }[rec.type];
              const RecIcon = config.icon;
              return (
                <div key={idx} className={cn("rounded-lg border p-4 flex items-start gap-3", config.bg, config.border)}>
                  <RecIcon className={cn("w-4 h-4 shrink-0 mt-0.5", config.iconColor)} />
                  <div className="min-w-0">
                    <p className={cn("text-xs font-semibold", config.titleColor)}>{rec.title}</p>
                    <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{rec.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
