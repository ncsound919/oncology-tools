"use client";

import React, { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingDown, AlertTriangle, CheckCircle2, Minus, Globe, BarChart3 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import type { ChartConfig } from "@/components/ui/chart";
import { cn } from "@/lib/utils";

interface AncestryItem {
  population: string;
  count: number;
  percentage: number;
  id?: string;
  datasetId?: string;
  createdAt?: string;
}

interface Dataset {
  id: string;
  name: string;
  cancerType: string | null;
  totalSamples: number;
  ancestryBreakdown: AncestryItem[];
}

const usCancerPopRef: Record<string, number> = {
  "European (Non-Hispanic White)": 62,
  "African (Non-Hispanic Black)": 13,
  "Hispanic/Latino": 10,
  "East Asian": 6,
  "South Asian": 4,
  "American Indian/Alaska Native": 3,
  "Pacific Islander": 1,
  "Other/Mixed": 1,
};

const gapChartConfig = {
  actual: { label: "Actual %", color: "oklch(0.65 0.15 175)" },
  reference: { label: "Expected %", color: "oklch(0.7 0.16 45)" },
} satisfies ChartConfig;

export function GapTrackerView() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDataset, setSelectedDataset] = useState<string>("all");
  const [showChart, setShowChart] = useState(true);

  useEffect(() => {
    fetch("/api/datasets")
      .then((r) => r.json())
      .then((d) => {
        setDatasets(d.data || []);
        setLoading(false);
      });
  }, []);

  const activeDs = selectedDataset === "all"
    ? datasets
    : datasets.filter((d) => d.id === selectedDataset);

  const populationGaps = useMemo(() => {
    const totals: Record<string, { count: number; total: number }> = {};
    for (const ds of activeDs) {
      const breakdown = ds.ancestryBreakdown || [];
      for (const a of breakdown) {
        if (!totals[a.population]) totals[a.population] = { count: 0, total: 0 };
        totals[a.population].count += a.count;
        totals[a.population].total += ds.totalSamples;
      }
    }

    return Object.entries(totals)
      .map(([pop, { count, total }]) => {
        const actualPct = total > 0 ? (count / total) * 100 : 0;
        const refPct = usCancerPopRef[pop] || 2;
        const gap = refPct - actualPct;
        return {
          population: pop.split(" (")[0].trim(),
          populationFull: pop,
          actualPct: Math.round(actualPct * 10) / 10,
          refPct,
          gap: Math.round(gap * 10) / 10,
          status: gap > 5 ? "critical" : gap > 2 ? "warning" : gap > -2 ? "adequate" : "overrepresented",
          sampleCount: count,
        };
      })
      .sort((a, b) => b.gap - a.gap);
  }, [activeDs]);

  const chartData = useMemo(() =>
    populationGaps.map((g) => ({
      name: g.population.length > 8 ? g.population.slice(0, 8) + "…" : g.population,
      actual: g.actualPct,
      reference: g.refPct,
      gap: Math.abs(g.gap),
    })),
  [populationGaps]
  );

  const criticalCount = populationGaps.filter((g) => g.status === "critical").length;
  const warningCount = populationGaps.filter((g) => g.status === "warning").length;
  const adequateCount = populationGaps.filter((g) => g.status === "adequate").length;

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-muted rounded-xl shimmer" />
          ))}
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "critical": return <Badge variant="destructive" className="text-[9px] badge-hover">Critical</Badge>;
      case "warning": return <Badge variant="outline" className="text-[9px] border-warning/40 text-warning badge-hover">Warning</Badge>;
      case "adequate": return <Badge variant="secondary" className="text-[9px] badge-hover">Adequate</Badge>;
      default: return <Badge variant="secondary" className="text-[9px] badge-hover">Over-rep.</Badge>;
    }
  };

  const getGapColor = (gap: number) => {
    if (gap > 5) return "oklch(0.65 0.22 25)";
    if (gap > 2) return "oklch(0.7 0.16 45)";
    return "oklch(0.65 0.15 175)";
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      {/* Insight Callout */}
      {criticalCount > 0 && (
        <div className="callout-destructive fade-up rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-3.5 h-3.5 text-destructive" />
            <span className="text-xs font-semibold text-destructive">Representation Gap Summary</span>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            {criticalCount} population{criticalCount > 1 ? "s" : ""} critically underrepresented (&gt;5pt below expected). {warningCount} additional population{warningCount > 1 ? "s" : ""} at warning level. These gaps may lead to biased variant pathogenicity assessments and inequitable clinical outcomes.
          </p>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 card-group-stagger">
        <Card className="card-gradient-destructive glow-border-destructive card-highlight-top stat-accent-bar card-hover-glow fade-up noise-overlay">
          <CardContent className="p-3 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-destructive/15 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-destructive icon-bounce" />
            </div>
            <div>
              <p className="text-lg font-bold text-destructive count-animate tabular-nums text-glow-destructive text-shadow-soft">{criticalCount}</p>
              <p className="text-[10px] text-muted-foreground">Critical Gaps</p>
            </div>
          </CardContent>
        </Card>
        <Card className="card-gradient-amber glow-border-warning card-highlight-top stat-accent-bar card-hover-glow fade-up fade-up-d1 noise-overlay">
          <CardContent className="p-3 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-warning/15 flex items-center justify-center">
              <Minus className="w-4 h-4 text-warning icon-bounce" />
            </div>
            <div>
              <p className="text-lg font-bold text-warning count-animate tabular-nums text-glow-amber text-shadow-soft">{warningCount}</p>
              <p className="text-[10px] text-muted-foreground">Warning Gaps</p>
            </div>
          </CardContent>
        </Card>
        <Card className="card-highlight-top stat-accent-bar card-hover-glow fade-up fade-up-d2 noise-overlay">
          <CardContent className="p-3 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-success/15 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-success icon-bounce" />
            </div>
            <div>
              <p className="text-lg font-bold text-success count-animate tabular-nums text-shadow-soft">{adequateCount}</p>
              <p className="text-[10px] text-muted-foreground">Adequately Represented</p>
            </div>
          </CardContent>
        </Card>
        <Card className="card-gradient-teal card-highlight-top stat-accent-bar card-hover-glow fade-up fade-up-d3 noise-overlay">
          <CardContent className="p-3 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
              <Globe className="w-4 h-4 text-primary icon-bounce" />
            </div>
            <div>
              <p className="text-lg font-bold count-animate tabular-nums text-glow-teal text-shadow-soft">{populationGaps.length}</p>
              <p className="text-[10px] text-muted-foreground">Populations Tracked</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs text-muted-foreground">Analyzing:</span>
        <Select value={selectedDataset} onValueChange={setSelectedDataset}>
          <SelectTrigger className="w-[280px] h-8 text-xs focus-glow">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Datasets (Aggregated)</SelectItem>
            {datasets.map((d) => (
              <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Badge
          variant={showChart ? "default" : "outline"}
          className="text-[10px] cursor-pointer chip-interactive"
          onClick={() => setShowChart(!showChart)}
        >
          <BarChart3 className="w-3 h-3 mr-1" />
          {showChart ? "Chart View" : "List View"}
        </Badge>
      </div>

      <hr className="gradient-divider" />
      {/* Bar Chart View */}
      {showChart && (
        <Card className="card-highlight-top depth-2 card-hover-glow fade-up noise-overlay">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              Population Representation: Actual vs Expected
            </CardTitle>
            <CardDescription className="text-xs">
              Grouped bar chart comparing actual dataset composition against US cancer patient population reference
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <ChartContainer config={gapChartConfig} className="h-[320px] w-full">
              <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.02 250)" horizontal={false} />
                <XAxis type="number" tick={{ fill: "oklch(0.5 0.02 250)", fontSize: 10 }} />
                <YAxis type="category" dataKey="name" tick={{ fill: "oklch(0.6 0.02 250)", fontSize: 10 }} width={100} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey="reference" fill="oklch(0.7 0.16 45)" radius={[0, 4, 4, 0]} maxBarSize={16} fillOpacity={0.7} />
                <Bar dataKey="actual" radius={[0, 4, 4, 0]} maxBarSize={16}>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={getGapColor(populationGaps[i]?.gap ?? 0)} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      <hr className="gradient-divider" />
      {/* Detail List View */}
      <Card className="card-highlight-top depth-2 card-hover-glow fade-up fade-up-d1 noise-overlay">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-primary" />
            Representation Gap Detail
          </CardTitle>
          <CardDescription className="text-xs">
            Positive gap = underrepresented vs. US cancer patient population.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-2 max-h-[400px] overflow-y-auto scrollbar-gradient">
            {populationGaps.map((g) => {
              const repPct = Math.min(g.actualPct, g.refPct) > 0
                ? Math.min(Math.round((g.actualPct / g.refPct) * 100), 200)
                : 0;
              const progressVal = Math.min(
                Math.round((g.actualPct / Math.max(g.refPct, 0.1)) * 100),
                100
              );
              return (
                <div key={g.populationFull} className="p-3 rounded-lg bg-muted/40 hover:bg-muted/60 transition-colors hover-lift">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "w-2 h-2 rounded-full",
                        g.status === "critical" && "bg-destructive status-dot-pulse",
                        g.status === "warning" && "bg-warning",
                        g.status === "adequate" && "bg-success",
                        g.status === "overrepresented" && "bg-primary"
                      )} />
                      <span className="text-xs font-semibold">{g.populationFull}</span>
                    </div>
                    {getStatusBadge(g.status)}
                  </div>
                  <div className="grid grid-cols-3 gap-4 mb-2">
                    <div>
                      <p className="text-[9px] text-muted-foreground">Actual</p>
                      <p className="text-sm font-bold tabular-nums">{g.actualPct}%</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-muted-foreground">Expected</p>
                      <p className="text-sm font-bold tabular-nums">{g.refPct}%</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-muted-foreground">Gap</p>
                      <p className={cn("text-sm font-bold tabular-nums", g.gap > 0 ? "text-destructive" : "text-success")}>
                        {g.gap > 0 ? "+" : ""}{g.gap}%
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 progress-glow">
                      <div className={cn(
                        "progress-glow-fill h-full rounded-full",
                        g.status === "critical" && "progress-glow-fill-destructive",
                        g.status === "warning" && "progress-glow-fill-amber"
                      )} style={{ width: `${progressVal}%` }} />
                    </div>
                    <span className="text-[9px] text-muted-foreground tabular-nums sci-number">{repPct}% of target</span>
                  </div>
                  <p className="text-[9px] text-muted-foreground mt-1 sci-number">{g.sampleCount.toLocaleString()} samples</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
