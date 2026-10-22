"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import {
  Database, Plus, Search, ChevronRight, AlertTriangle, CheckCircle2,
  Eye, Trash2, PieChart as PieIcon, BarChart3, Loader2, GitCompareArrows, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface AncestryBreakdown {
  population: string;
  count: number;
  percentage: number;
}

interface VariantFinding {
  id: string;
  gene: string;
  variant: string;
  classification: string;
  ancestryBiasScore: number;
  populationFrequency: number;
  referenceFrequency: number;
  notes: string;
}

interface Dataset {
  id: string;
  name: string;
  description: string | null;
  source: string;
  cancerType: string | null;
  totalSamples: number;
  status: string;
  createdAt: string;
  ancestryBreakdown: AncestryBreakdown[];
  variantFindings: VariantFinding[];
}

const classificationColors: Record<string, string> = {
  Pathogenic: "oklch(0.65 0.22 25)",
  "Likely Pathogenic": "oklch(0.7 0.16 45)",
  VUS: "oklch(0.6 0.15 250)",
  "Likely Benign": "oklch(0.65 0.15 175)",
  Benign: "oklch(0.5 0.02 250)",
  "Risk Allele": "oklch(0.6 0.2 300)",
};

export function DatasetAnalyzerView() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [compareA, setCompareA] = useState<string>("");
  const [compareB, setCompareB] = useState<string>("");

  useEffect(() => {
    fetch("/api/datasets")
      .then((r) => r.json())
      .then((d) => { setDatasets(d.data); setLoading(false); });
  }, []);

  const filtered = datasets.filter((d) =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    (d.cancerType || "").toLowerCase().includes(search.toLowerCase()) ||
    d.source.toLowerCase().includes(search.toLowerCase())
  );

  const getDiversityScore = (ds: Dataset) => {
    if (!ds.ancestryBreakdown.length) return 0;
    // Shannon diversity index scaled to 0-100
    const total = ds.ancestryBreakdown.reduce((s, a) => s + a.count, 0);
    const proportions = ds.ancestryBreakdown.map((a) => a.count / total);
    const shannon = -proportions.reduce((s, p) => s + (p > 0 ? p * Math.log(p) : 0), 0);
    const maxShannon = Math.log(ds.ancestryBreakdown.length);
    return maxShannon > 0 ? (shannon / maxShannon) * 100 : 0;
  };

  const getHighBiasCount = (ds: Dataset) =>
    ds.variantFindings.filter((v) => v.ancestryBiasScore > 0.6).length;

  const deleteDataset = async (id: string, name: string) => {
    const res = await fetch(`/api/datasets/${id}`, { method: "DELETE" });
    if (res.ok) {
      setDatasets((prev) => prev.filter((d) => d.id !== id));
      if (selectedDataset?.id === id) setSelectedDataset(null);
      toast.success(`Dataset "${name}" removed`);
    } else {
      toast.error("Failed to delete dataset");
    }
  };

  if (loading) {
    return <div className="p-6"><div className="animate-pulse space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-muted rounded-xl" />)}</div></div>;
  }

  // Compare view
  if (compareMode) {
    const dsA = datasets.find((d) => d.id === compareA);
    const dsB = datasets.find((d) => d.id === compareB);
    const allPops = Array.from(
      new Set([
        ...(dsA?.ancestryBreakdown.map((a) => a.population) || []),
        ...(dsB?.ancestryBreakdown.map((a) => a.population) || []),
      ])
    );
    const comparisonData = allPops.map((pop) => ({
      population: pop.split(" (")[0].trim(),
      pctA: dsA?.ancestryBreakdown.find((a) => a.population === pop)?.percentage || 0,
      pctB: dsB?.ancestryBreakdown.find((a) => a.population === pop)?.percentage || 0,
    }));
    const scoreA = dsA ? getDiversityScore(dsA) : 0;
    const scoreB = dsB ? getDiversityScore(dsB) : 0;
    const highBiasA = dsA ? getHighBiasCount(dsA) : 0;
    const highBiasB = dsB ? getHighBiasCount(dsB) : 0;

    return (
      <div className="p-6 max-w-[1600px] mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => { setCompareMode(false); setCompareA(""); setCompareB(""); }} className="text-xs">
              ← Back to datasets
            </Button>
            <h2 className="text-sm font-semibold">Dataset Comparison</h2>
          </div>
        </div>

        {/* Dataset selectors */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className={cn("border-2", "border-primary/30")}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-full bg-primary" />
                <span className="text-xs font-semibold">Dataset A</span>
              </div>
              <select
                className="w-full h-8 text-xs bg-muted/50 border border-border rounded-md px-2 text-foreground"
                value={compareA}
                onChange={(e) => setCompareA(e.target.value)}
              >
                <option value="">Select dataset...</option>
                {datasets.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              {dsA && (
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <div className="text-center p-1.5 rounded bg-muted/40">
                    <p className="text-sm font-bold">{dsA.totalSamples.toLocaleString()}</p>
                    <p className="text-[9px] text-muted-foreground">Samples</p>
                  </div>
                  <div className="text-center p-1.5 rounded bg-muted/40">
                    <p className="text-sm font-bold" style={{ color: scoreA >= 60 ? "oklch(0.65 0.15 175)" : scoreA >= 30 ? "oklch(0.7 0.16 45)" : "oklch(0.65 0.22 25)" }}>{scoreA.toFixed(0)}</p>
                    <p className="text-[9px] text-muted-foreground">Div. Score</p>
                  </div>
                  <div className="text-center p-1.5 rounded bg-muted/40">
                    <p className="text-sm font-bold" style={{ color: highBiasA > 0 ? "oklch(0.65 0.22 25)" : "oklch(0.65 0.15 175)" }}>{highBiasA}</p>
                    <p className="text-[9px] text-muted-foreground">High Bias</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          <Card className="border-2 border-warning/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-full bg-warning" />
                <span className="text-xs font-semibold">Dataset B</span>
              </div>
              <select
                className="w-full h-8 text-xs bg-muted/50 border border-border rounded-md px-2 text-foreground"
                value={compareB}
                onChange={(e) => setCompareB(e.target.value)}
              >
                <option value="">Select dataset...</option>
                {datasets.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              {dsB && (
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <div className="text-center p-1.5 rounded bg-muted/40">
                    <p className="text-sm font-bold">{dsB.totalSamples.toLocaleString()}</p>
                    <p className="text-[9px] text-muted-foreground">Samples</p>
                  </div>
                  <div className="text-center p-1.5 rounded bg-muted/40">
                    <p className="text-sm font-bold" style={{ color: scoreB >= 60 ? "oklch(0.65 0.15 175)" : scoreB >= 30 ? "oklch(0.7 0.16 45)" : "oklch(0.65 0.22 25)" }}>{scoreB.toFixed(0)}</p>
                    <p className="text-[9px] text-muted-foreground">Div. Score</p>
                  </div>
                  <div className="text-center p-1.5 rounded bg-muted/40">
                    <p className="text-sm font-bold" style={{ color: highBiasB > 0 ? "oklch(0.65 0.22 25)" : "oklch(0.65 0.15 175)" }}>{highBiasB}</p>
                    <p className="text-[9px] text-muted-foreground">High Bias</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Comparison table */}
        {dsA && dsB && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Ancestry Breakdown Comparison</CardTitle>
              <CardDescription className="text-xs">
                Side-by-side population percentages. Delta shows the difference (A − B). Positive = Dataset A has more.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <ChartContainer
                config={{
                  pctA: { label: dsA.name.split(" ").slice(0, 2).join(" "), color: "oklch(0.65 0.15 175)" },
                  pctB: { label: dsB.name.split(" ").slice(0, 2).join(" "), color: "oklch(0.7 0.16 45)" },
                }}
                className="h-[350px] w-full"
              >
                <BarChart data={comparisonData} layout="vertical" margin={{ left: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.02 250)" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} tick={{ fill: "oklch(0.5 0.02 250)", fontSize: 10 }} />
                  <YAxis type="category" dataKey="population" tick={{ fill: "oklch(0.6 0.02 250)", fontSize: 10 }} width={120} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="pctA" fill="oklch(0.65 0.15 175)" radius={[0, 3, 3, 0]} maxBarSize={16} name={dsA.name.split(" ").slice(0, 2).join(" ")} />
                  <Bar dataKey="pctB" fill="oklch(0.7 0.16 45)" radius={[0, 3, 3, 0]} maxBarSize={16} name={dsB.name.split(" ").slice(0, 2).join(" ")} />
                </BarChart>
              </ChartContainer>

              {/* Numeric comparison table */}
              <div className="mt-4 rounded-lg border border-border overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-muted/40">
                      <th className="text-[10px] font-semibold text-left px-3 py-2">Population</th>
                      <th className="text-[10px] font-semibold text-right px-3 py-2">{dsA.name.split(" ").slice(0, 3).join(" ")}</th>
                      <th className="text-[10px] font-semibold text-right px-3 py-2">{dsB.name.split(" ").slice(0, 3).join(" ")}</th>
                      <th className="text-[10px] font-semibold text-right px-3 py-2">Delta</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonData.map((row) => {
                      const delta = row.pctA - row.pctB;
                      return (
                        <tr key={row.population} className="data-table-row border-t border-border/30">
                          <td className="text-xs px-3 py-2 font-medium">{row.population}</td>
                          <td className="text-xs px-3 py-2 text-right font-mono">{row.pctA.toFixed(1)}%</td>
                          <td className="text-xs px-3 py-2 text-right font-mono">{row.pctB.toFixed(1)}%</td>
                          <td className="text-xs px-3 py-2 text-right font-mono font-bold" style={{ color: Math.abs(delta) < 2 ? "oklch(0.6 0.02 250)" : delta > 0 ? "oklch(0.65 0.15 175)" : "oklch(0.7 0.16 45)" }}>
                            {delta > 0 ? "+" : ""}{delta.toFixed(1)}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // Detail view
  if (selectedDataset) {
    const ds = selectedDataset;
    const diversityScore = getDiversityScore(ds);
    const chartData = ds.ancestryBreakdown.map((a) => ({ name: a.population.split("(")[0].trim(), value: a.percentage }));
    const biasData = ds.variantFindings.map((v) => ({ gene: v.gene, bias: v.ancestryBiasScore * 100, class: v.classification }));

    return (
      <div className="p-6 max-w-[1600px] mx-auto space-y-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setSelectedDataset(null)} className="text-xs">
            ← Back to datasets
          </Button>
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">{ds.name}</h2>
              <Badge variant={ds.status === "completed" ? "default" : "secondary"} className="text-[10px]">{ds.status}</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{ds.description}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Source: {ds.source} · Cancer Type: {ds.cancerType || "Multiple"} · {ds.totalSamples.toLocaleString()} samples</p>
          </div>
          <Button variant="destructive" size="sm" className="text-xs" onClick={() => deleteDataset(ds.id, ds.name)}>
            <Trash2 className="w-3 h-3 mr-1" /> Remove Dataset
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center">
                <PieIcon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xl font-bold" style={{ color: diversityScore >= 60 ? "oklch(0.65 0.15 175)" : diversityScore >= 30 ? "oklch(0.7 0.16 45)" : "oklch(0.65 0.22 25)" }}>{diversityScore.toFixed(1)}</p>
                <p className="text-[10px] text-muted-foreground">Diversity Score</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-warning/15 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-xl font-bold">{getHighBiasCount(ds)}</p>
                <p className="text-[10px] text-muted-foreground">High-Bias Variants (&gt;60%)</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-success/15 flex items-center justify-center">
                <Database className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-xl font-bold">{ds.ancestryBreakdown.length}</p>
                <p className="text-[10px] text-muted-foreground">Population Groups</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Ancestral Population Breakdown</CardTitle>
              <CardDescription className="text-xs">Percentage representation within this dataset</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <ChartContainer config={{ value: { label: "%", color: "oklch(0.65 0.15 175)" } }} className="h-[300px] w-full">
                <BarChart data={chartData} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.02 250)" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} tick={{ fill: "oklch(0.5 0.02 250)", fontSize: 10 }} />
                  <YAxis type="category" dataKey="name" tick={{ fill: "oklch(0.6 0.02 250)", fontSize: 9 }} width={100} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={20} name="% Representation">
                    {chartData.map((entry, i) => (
                      <Cell key={i} fill={entry.value > 50 ? "oklch(0.65 0.22 25)" : entry.value > 20 ? "oklch(0.7 0.16 45)" : "oklch(0.65 0.15 175)"} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Ancestry Bias Score by Variant</CardTitle>
              <CardDescription className="text-xs">Higher bias = variant interpretation less reliable for underrepresented populations</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <ChartContainer config={{ bias: { label: "Bias %", color: "oklch(0.7 0.16 45)" } }} className="h-[300px] w-full">
                <BarChart data={biasData} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.02 250)" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} tick={{ fill: "oklch(0.5 0.02 250)", fontSize: 10 }} />
                  <YAxis type="category" dataKey="gene" tick={{ fill: "oklch(0.6 0.02 250)", fontSize: 9 }} width={70} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="bias" radius={[0, 4, 4, 0]} maxBarSize={20} name="Bias Score">
                    {biasData.map((entry, i) => (
                      <Cell key={i} fill={entry.bias > 70 ? "oklch(0.65 0.22 25)" : entry.bias > 40 ? "oklch(0.7 0.16 45)" : "oklch(0.65 0.15 175)"} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>

        {/* Variant Table */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Variant Findings ({ds.variantFindings.length})</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="rounded-lg border border-border overflow-hidden max-h-[360px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="text-[10px] font-semibold">Gene</TableHead>
                    <TableHead className="text-[10px] font-semibold">Variant</TableHead>
                    <TableHead className="text-[10px] font-semibold">Classification</TableHead>
                    <TableHead className="text-[10px] font-semibold">Dataset Freq.</TableHead>
                    <TableHead className="text-[10px] font-semibold">Reference Freq.</TableHead>
                    <TableHead className="text-[10px] font-semibold">Bias Score</TableHead>
                    <TableHead className="text-[10px] font-semibold">Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ds.variantFindings.map((v) => (
                    <TableRow key={v.id} className="data-table-row">
                      <TableCell className="text-xs font-mono font-medium">{v.gene}</TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">{v.variant}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] font-normal" style={{ borderColor: classificationColors[v.classification] || "oklch(0.4 0.02 250)", color: classificationColors[v.classification] || "oklch(0.6 0.02 250)" }}>{v.classification}</Badge>
                      </TableCell>
                      <TableCell className="text-xs font-mono">{v.populationFrequency.toFixed(3)}</TableCell>
                      <TableCell className="text-xs font-mono">{v.referenceFrequency.toFixed(3)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${v.ancestryBiasScore * 100}%`, backgroundColor: v.ancestryBiasScore > 0.7 ? "oklch(0.65 0.22 25)" : v.ancestryBiasScore > 0.4 ? "oklch(0.7 0.16 45)" : "oklch(0.65 0.15 175)" }} />
                          </div>
                          <span className="text-xs font-mono">{(v.ancestryBiasScore * 100).toFixed(0)}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-[10px] text-muted-foreground max-w-[200px] truncate">{v.notes}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // List view
  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Search datasets by name, cancer type, or source..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-9 text-xs" />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="text-xs" onClick={() => setCompareMode(true)}>
            <GitCompareArrows className="w-3.5 h-3.5 mr-1" /> Compare
          </Button>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button size="sm" className="text-xs"><Plus className="w-3.5 h-3.5 mr-1" /> Add Dataset</Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader>
                <DialogTitle className="text-sm">Register New Dataset</DialogTitle>
                <DialogDescription className="text-xs">Add a new genomic dataset for ancestry diversity analysis.</DialogDescription>
              </DialogHeader>
              <form onSubmit={async (e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                const res = await fetch("/api/datasets", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    name: fd.get("name"),
                    description: fd.get("description"),
                    source: fd.get("source"),
                    cancerType: fd.get("cancerType"),
                    totalSamples: parseInt(fd.get("totalSamples") as string),
                  }),
                });
                if (res.ok) {
                  const d = await res.json();
                  setDatasets((prev) => [d.data, ...prev]);
                  setShowAddDialog(false);
                }
              }}>
                <div className="space-y-3">
                  <div><Label className="text-xs">Dataset Name *</Label><Input name="name" required className="h-8 text-xs mt-1" /></div>
                  <div><Label className="text-xs">Description</Label><Textarea name="description" className="text-xs mt-1 min-h-[60px]" /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label className="text-xs">Source *</Label><Input name="source" required className="h-8 text-xs mt-1" placeholder="e.g. TCGA, Local" /></div>
                    <div><Label className="text-xs">Cancer Type</Label><Input name="cancerType" className="h-8 text-xs mt-1" /></div>
                  </div>
                  <div><Label className="text-xs">Total Samples *</Label><Input name="totalSamples" type="number" required className="h-8 text-xs mt-1" /></div>
                </div>
                <DialogFooter className="mt-4">
                  <Button type="submit" size="sm" className="text-xs">Register Dataset</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Dataset Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((ds) => {
          const score = getDiversityScore(ds);
          const highBias = getHighBiasCount(ds);
          return (
            <Card key={ds.id} className="metric-card cursor-pointer group" onClick={() => setSelectedDataset(ds)}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                      <Database className="w-4 h-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold truncate">{ds.name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{ds.source}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <p className="text-[10px] text-muted-foreground mb-3 line-clamp-2">{ds.description}</p>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="text-center p-1.5 rounded bg-muted/40">
                    <p className="text-sm font-bold">{ds.totalSamples > 1000 ? `${(ds.totalSamples / 1000).toFixed(1)}K` : ds.totalSamples}</p>
                    <p className="text-[9px] text-muted-foreground">Samples</p>
                  </div>
                  <div className="text-center p-1.5 rounded bg-muted/40">
                    <p className="text-sm font-bold" style={{ color: score >= 60 ? "oklch(0.65 0.15 175)" : score >= 30 ? "oklch(0.7 0.16 45)" : "oklch(0.65 0.22 25)" }}>{score.toFixed(0)}</p>
                    <p className="text-[9px] text-muted-foreground">Div. Score</p>
                  </div>
                  <div className="text-center p-1.5 rounded bg-muted/40">
                    <p className="text-sm font-bold" style={{ color: highBias > 0 ? "oklch(0.65 0.22 25)" : "oklch(0.65 0.15 175)" }}>{highBias}</p>
                    <p className="text-[9px] text-muted-foreground">High Bias</p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Badge variant="outline" className="text-[10px] font-normal px-1.5 py-0">{ds.cancerType || "Multiple"}</Badge>
                    <Badge variant={ds.status === "completed" ? "default" : "secondary"} className="text-[10px] px-1.5 py-0">
                      {ds.status === "completed" && <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" />}
                      {ds.status === "analyzing" && <Loader2 className="w-2.5 h-2.5 mr-0.5 animate-spin" />}
                      {ds.status}
                    </Badge>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); setSelectedDataset(ds); }}>
                    <Eye className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Database className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No datasets match your search</p>
        </div>
      )}
    </div>
  );
}