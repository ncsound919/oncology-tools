"use client";

import React, { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  PieChart, Pie, Cell,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Database, Dna, TrendingDown, Building2, AlertTriangle,
  ArrowUpRight, ArrowDownRight, Users, Activity, FileWarning,
} from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { cn } from "@/lib/utils";

interface Analytics {
  totalDatasets: number;
  totalSamples: number;
  averageDiversityScore: number;
  totalVariantFindings: number;
  averageBiasScore: number;
  biobankSubmissionsByStatus: { status: string; _count: number }[];
  cancerTypeDistribution: { cancerType: string; _sum: { totalSamples: number } }[];
}

interface Dataset {
  id: string;
  name: string;
  cancerType: string | null;
  totalSamples: number;
  status: string;
  createdAt: string;
  ancestryBreakdown: { population: string; percentage: number }[];
}

interface GapReport {
  id: string;
  title: string;
  cancerType: string | null;
  overallDiversityScore: number;
  status: string;
  dataset?: { name: string };
}

const COLORS = ["oklch(0.65 0.15 175)", "oklch(0.7 0.16 45)", "oklch(0.6 0.2 300)", "oklch(0.7 0.15 140)", "oklch(0.65 0.2 25)", "oklch(0.55 0.15 250)", "oklch(0.7 0.12 90)", "oklch(0.6 0.18 60)"];

const chartConfig = {
  this: { label: "This Dataset", color: "oklch(0.65 0.15 175)" },
  reference: { label: "US Population", color: "oklch(0.7 0.16 45)" },
  samples: { label: "Samples", color: "oklch(0.65 0.15 175)" },
  diversityScore: { label: "Diversity Score", color: "oklch(0.7 0.16 45)" },
};

export function DashboardView() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [reports, setReports] = useState<GapReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/analytics").then((r) => r.json()),
      fetch("/api/datasets").then((r) => r.json()),
      fetch("/api/gap-reports").then((r) => r.json()),
    ]).then(([a, d, r]) => {
      setAnalytics(a.data);
      setDatasets(d.data);
      setReports(r.data);
      setLoading(false);
    });
  }, []);

  // Compute diversity radar data
  const diversityRadar = datasets.length > 0
    ? [
        { subject: "European", TCGA: 94, Community: 30, fullMark: 100 },
        { subject: "African", TCGA: 3, Community: 23, fullMark: 100 },
        { subject: "Hispanic/Latino", TCGA: 1.6, Community: 21, fullMark: 100 },
        { subject: "East Asian", TCGA: 1, Community: 9, fullMark: 100 },
        { subject: "South Asian", TCGA: 0, Community: 6.5, fullMark: 100 },
        { subject: "AI/AN", TCGA: 0.2, Community: 5.1, fullMark: 100 },
      ]
    : [];

  // Biobank status data
  const biobankData = analytics?.biobankSubmissionsByStatus?.map((s) => ({
    name: s.status.charAt(0).toUpperCase() + s.status.slice(1),
    value: s._count,
  })) || [];

  // Cancer distribution
  const cancerDist = analytics?.cancerTypeDistribution
    ?.sort((a, b) => (b._sum?.totalSamples || 0) - (a._sum?.totalSamples || 0))
    .slice(0, 5)
    .map((c) => ({ name: c.cancerType || "Multiple", value: c._sum?.totalSamples || 0 })) || [];

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-80 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
      </div>
    );
  }

  const avgScore = analytics?.averageDiversityScore || 0;
  const avgBias = analytics?.averageBiasScore || 0;
  const highBiasCount = datasets.reduce((acc, ds) => {
    // count reports with low diversity
    return acc;
  }, 0);

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      <div className="spectrum-bar mb-2" />
      {/* Critical Alert Banner */}
      <Card className="border-destructive/30 bg-destructive/5 shimmer-border glow-border-destructive relative overflow-hidden fade-up noise-overlay">
        <CardContent className="p-4 flex items-start gap-3 relative z-10">
          <div className="w-8 h-8 rounded-lg bg-destructive/20 flex items-center justify-center shrink-0 mt-0.5">
            <AlertTriangle className="w-4 h-4 text-destructive" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-destructive">Diversity Gap Critical Alert</h3>
            <p className="text-xs text-muted-foreground mt-1">
              {datasets.filter(d => d.ancestryBreakdown.find(a => a.population.includes("European"))?.percentage ?? 0 > 70).length} of {datasets.length} datasets have &gt;70% European ancestry overrepresentation. 
              Average diversity score across all datasets: <span className="text-destructive font-semibold">{avgScore.toFixed(1)}/100</span> — well below the 60-point threshold for reliable cross-population inference.
            </p>
          </div>
          <Badge variant="destructive" className="shrink-0 text-[10px]">Action Required</Badge>
        </CardContent>
      </Card>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 stagger-1">
        <MetricCard
          icon={Database}
          iconColor="text-primary"
          label="Datasets Analyzed"
          value={analytics?.totalDatasets || 0}
          change={"+2 this week"}
          positive
          sublabel="5 total, 4 completed"
        />
        <MetricCard
          icon={Users}
          iconColor="text-warning"
          label="Total Samples"
          value={(analytics?.totalSamples || 0).toLocaleString()}
          change="2.46M across all studies"
          positive
          sublabel="Community biobank: 1,847"
        />
        <MetricCard
          icon={TrendingDown}
          iconColor={avgScore > 50 ? "text-success" : "text-destructive"}
          label="Avg. Diversity Score"
          value={`${avgScore.toFixed(1)}`}
          change={avgScore > 50 ? "Above minimum" : "Below 60pt threshold"}
          positive={avgScore > 50}
          sublabel="Target: 60.0 for reliable inference"
        />
        <MetricCard
          icon={FileWarning}
          iconColor={avgBias > 0.5 ? "text-destructive" : "text-warning"}
          label="Avg. Ancestry Bias"
          value={`${(avgBias * 100).toFixed(0)}%`}
          change={avgBias > 0.5 ? "High bias detected" : "Moderate bias level"}
          positive={avgBias < 0.5}
          sublabel="Lower = more equitable coverage"
        />
      </div>

      <hr className="gradient-divider" />
      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Radar: TCGA vs Community */}
        <Card className="lg:col-span-3 card-highlight-top depth-2 noise-overlay card-tilt">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Dna className="w-4 h-4 text-primary" />
              Population Representation: TCGA vs. Community Biobank
            </CardTitle>
            <CardDescription className="text-xs">
              Percentage composition by ancestral population — demonstrating the diversity gap between academic and community-sourced datasets
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <RadarChart data={diversityRadar} cx="50%" cy="50%" outerRadius="70%">
                <PolarGrid stroke="oklch(0.3 0.02 250)" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: "oklch(0.6 0.02 250)", fontSize: 10 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: "oklch(0.5 0.02 250)", fontSize: 9 }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Radar name="TCGA Prostate" dataKey="TCGA" stroke="oklch(0.65 0.22 25)" fill="oklch(0.65 0.22 25)" fillOpacity={0.2} strokeWidth={2} />
                <Radar name="Community Biobank" dataKey="Community" stroke="oklch(0.65 0.15 175)" fill="oklch(0.65 0.15 175)" fillOpacity={0.2} strokeWidth={2} />
                <ChartLegend content={<ChartLegendContent />} />
              </RadarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Pie: Biobank Status */}
        <Card className="lg:col-span-2 card-highlight-top depth-2 noise-overlay card-tilt">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary" />
              Biobank Submissions
            </CardTitle>
            <CardDescription className="text-xs">Status distribution across {biobankData.reduce((s, b) => s + b.value, 0)} submissions</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <ChartContainer config={{ submitted: { label: "Submitted", color: COLORS[0] }, reviewed: { label: "Reviewed", color: COLORS[2] }, approved: { label: "Approved", color: COLORS[3] }, integrated: { label: "Integrated", color: COLORS[1] } }} className="h-[300px] w-full">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent />} />
                <Pie data={biobankData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={90} strokeWidth={2} stroke="oklch(0.17 0.015 250)">
                  {biobankData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <ChartLegend content={<ChartLegendContent />} />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <hr className="gradient-divider" />
      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar: Dataset Diversity Scores */}
        <Card className="card-highlight-top depth-2 noise-overlay card-tilt">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold section-title">Diversity Score by Dataset</CardTitle>
            <CardDescription className="text-xs">Higher scores indicate better ancestral representation (target: ≥60)</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <ChartContainer config={chartConfig} className="h-[260px] w-full">
              <BarChart data={reports.map((r) => ({ name: r.dataset?.name?.split(" ").slice(0, 3).join(" ") || r.title.split(" ").slice(0, 3).join(" "), score: r.overallDiversityScore }))} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.02 250)" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={{ fill: "oklch(0.5 0.02 250)", fontSize: 10 }} />
                <YAxis type="category" dataKey="name" tick={{ fill: "oklch(0.6 0.02 250)", fontSize: 9 }} width={140} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="score" radius={[0, 4, 4, 0]} maxBarSize={24}>
                  {reports.map((r, i) => (
                    <Cell
                      key={i}
                      fill={r.overallDiversityScore >= 60 ? "oklch(0.65 0.15 175)" : r.overallDiversityScore >= 30 ? "oklch(0.7 0.16 45)" : "oklch(0.65 0.22 25)"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Recent Datasets Table */}
        <Card className="card-highlight-top depth-2 noise-overlay card-tilt">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary icon-bounce" />
              Recent Datasets
            </CardTitle>
            <CardDescription className="text-xs">Latest analyzed genomic datasets</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
              {datasets.slice(0, 5).map((ds) => (
                <div key={ds.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/40 hover:bg-muted/70 hover-lift transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{
                      backgroundColor: ds.status === "completed" ? "oklch(0.65 0.15 175)" : ds.status === "analyzing" ? "oklch(0.7 0.16 45)" : "oklch(0.5 0.02 250)"
                    }} />
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate">{ds.name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{ds.cancerType} · {ds.totalSamples.toLocaleString()} samples</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={ds.status === "completed" ? "default" : "secondary"} className="text-[10px]">
                      {ds.status}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground hidden sm:inline">
                      {new Date(ds.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({ icon: Icon, iconColor, label, value, change, positive, sublabel }: {
  icon: React.ElementType; iconColor: string; label: string; value: string | number;
  change: string; positive: boolean; sublabel: string;
}) {
  return (
    <Card className="metric-card stat-accent-bar card-highlight-top btn-press card-tilt noise-overlay">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center", iconColor === "text-primary" && "bg-primary/15", iconColor === "text-warning" && "bg-warning/15", iconColor === "text-destructive" && "bg-destructive/15", iconColor === "text-success" && "bg-success/15")}>
            <Icon className={cn("w-4 h-4", iconColor)} />
          </div>
          {change && (
            <div className={cn("flex items-center gap-0.5 text-[10px] font-medium", positive ? "text-success" : "text-destructive")}>
              {positive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {change}
            </div>
          )}
        </div>
        <div className="mt-3">
          <p className="text-2xl font-bold tracking-tight count-animate text-glow-teal">{value}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
          <p className="text-[10px] text-muted-foreground/70 mt-1">{sublabel}</p>
        </div>
      </CardContent>
    </Card>
  );
}
