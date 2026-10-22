"use client";

import React, { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ZAxis, Cell,
} from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import {
  Dna, Search, Filter, ArrowUpDown, AlertTriangle, Shield, Zap, GitCompareArrows,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Variant {
  id: string;
  gene: string;
  variant: string;
  classification: string;
  populationFrequency: number;
  referenceFrequency: number;
  ancestryBiasScore: number;
  notes: string;
  dataset: { name: string; cancerType: string | null };
}

const classificationColors: Record<string, string> = {
  Pathogenic: "oklch(0.65 0.22 25)",
  "Likely Pathogenic": "oklch(0.7 0.16 45)",
  VUS: "oklch(0.6 0.2 300)",
  "Likely Benign": "oklch(0.65 0.15 175)",
  Benign: "oklch(0.5 0.02 250)",
  "Risk Allele": "oklch(0.6 0.15 60)",
};

const classificationOrder = ["Pathogenic", "Likely Pathogenic", "Risk Allele", "VUS", "Likely Benign", "Benign"];

export function VariantAnalysisView() {
  const [variants, setVariants] = useState<Variant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [geneFilter, setGeneFilter] = useState<string>("all");
  const [classFilter, setClassFilter] = useState<string>("all");
  const [biasFilter, setBiasFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<string>("ancestryBiasScore");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    const params = new URLSearchParams();
    if (classFilter !== "all") params.set("classification", classFilter);
    if (biasFilter !== "all") params.set("minBias", biasFilter);
    fetch(`/api/variants?${params}`)
      .then((r) => r.json())
      .then((d) => { setVariants(d.data); setLoading(false); });
  }, [classFilter, biasFilter]);

  const genes = useMemo(() => [...new Set(variants.map((v) => v.gene))].sort(), [variants]);
  const classifications = useMemo(() => [...new Set(variants.map((v) => v.classification))], [variants]);

  const filtered = useMemo(() => {
    let result = variants;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((v) =>
        v.gene.toLowerCase().includes(q) ||
        v.variant.toLowerCase().includes(q) ||
        v.notes.toLowerCase().includes(q) ||
        (v.dataset?.name || "").toLowerCase().includes(q)
      );
    }
    if (geneFilter !== "all") {
      result = result.filter((v) => v.gene === geneFilter);
    }
    result = [...result].sort((a, b) => {
      const aVal = a[sortField as keyof Variant] as number | string;
      const bVal = b[sortField as keyof Variant] as number | string;
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDir === "asc" ? aVal - bVal : bVal - aVal;
      }
      return sortDir === "asc" ? String(aVal).localeCompare(String(bVal)) : String(bVal).localeCompare(String(aVal));
    });
    return result;
  }, [variants, search, geneFilter, classFilter, biasFilter, sortField, sortDir]);

  // Scatter data
  const scatterData = filtered.map((v) => ({
    x: v.populationFrequency * 100,
    y: v.referenceFrequency * 100,
    z: v.ancestryBiasScore * 100,
    name: v.gene,
    class: v.classification,
  }));

  const toggleSort = (field: string) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("desc"); }
  };

  // Stats
  const stats = useMemo(() => {
    const total = variants.length;
    const highBias = variants.filter((v) => v.ancestryBiasScore > 0.6).length;
    const avgBias = total > 0 ? variants.reduce((s, v) => s + v.ancestryBiasScore, 0) / total : 0;
    const pathogenic = variants.filter((v) => v.classification === "Pathogenic" || v.classification === "Likely Pathogenic").length;
    const vus = variants.filter((v) => v.classification === "VUS").length;
    return { total, highBias, avgBias, pathogenic, vus };
  }, [variants]);

  if (loading) {
    return <div className="p-6"><div className="animate-pulse space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-muted rounded-xl" />)}</div></div>;
  }

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <MiniStat label="Total Variants" value={stats.total} icon={Dna} color="text-primary" />
        <MiniStat label="Pathogenic / LP" value={stats.pathogenic} icon={Zap} color="text-destructive" />
        <MiniStat label="VUS" value={stats.vus} icon={AlertTriangle} color="text-warning" />
        <MiniStat label="High-Bias (&gt;60%)" value={stats.highBias} icon={Shield} color="text-destructive" />
        <MiniStat label="Avg. Bias Score" value={`${(stats.avgBias * 100).toFixed(1)}%`} icon={Filter} color={stats.avgBias < 0.5 ? "text-success" : "text-warning"} />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
              <Input placeholder="Search gene, variant, notes..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-8 text-xs" />
            </div>
            <Select value={geneFilter} onValueChange={(val) => { setGeneFilter(val); }}>
              <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue placeholder="All Genes" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Genes</SelectItem>
                {genes.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={classFilter} onValueChange={setClassFilter}>
              <SelectTrigger className="w-[160px] h-8 text-xs"><SelectValue placeholder="Classification" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classifications</SelectItem>
                {classifications.sort((a, b) => classificationOrder.indexOf(a) - classificationOrder.indexOf(b)).map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={biasFilter} onValueChange={setBiasFilter}>
              <SelectTrigger className="w-[150px] h-8 text-xs"><SelectValue placeholder="Bias Threshold" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Bias Levels</SelectItem>
                <SelectItem value="0.3">&gt; 30% Bias</SelectItem>
                <SelectItem value="0.5">&gt; 50% Bias</SelectItem>
                <SelectItem value="0.7">&gt; 70% Bias</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* ClinVar Cross-Reference */}
      <Card className="card-highlight-top depth-1 fade-up glow-border-warning">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <GitCompareArrows className="w-4 h-4 text-primary" />
            ClinVar Cross-Reference
          </CardTitle>
          <CardDescription className="text-xs">
            Cross-reference variant clinical significance across major databases — highlighting discrepancies in ancestry-aware interpretation
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="max-h-72 overflow-y-auto rounded-lg border border-border table-hover-stripe">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="text-[10px]">Gene</TableHead>
                  <TableHead className="text-[10px]">Variant</TableHead>
                  <TableHead className="text-[10px]">ClinVar Significance</TableHead>
                  <TableHead className="text-[10px]">gnomAD AF</TableHead>
                  <TableHead className="text-[10px]">Ancestry-Specific Notes</TableHead>
                  <TableHead className="text-[10px]">Data Quality</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <ClinVarRow gene="BRCA1" variant="c.5266dupC" significance="Pathogenic" gnomadAF="0.0001" notes="AF 3x higher in African populations; may be misclassified as pathogenic in underrepresented cohorts" quality="High" />
                <ClinVarRow gene="BRCA2" variant="c.6174delT" significance="Pathogenic" gnomadAF="0.0012" notes="Founder variant in Ashkenazi Jewish; under-detected in East Asian and African clinical datasets" quality="High" />
                <ClinVarRow gene="TP53" variant="c.743G>A" significance="Likely Pathogenic" gnomadAF="0.0003" notes="VUS in European cohorts; pathogenic in East Asian studies with functional validation" quality="Moderate" />
                <ClinVarRow gene="EGFR" variant="c.2573T>G" significance="VUS" gnomadAF="0.0032" notes="Conflicting: pathogenic in TCGA (94% European), benign in gnomAD African — suggests ancestry-dependent effect" quality="Low" />
                <ClinVarRow gene="APC" variant="c.3927_3931delAAAGA" significance="Pathogenic" gnomadAF="0.0002" notes="Significantly enriched in South Asian clinical registries; absent from European reference panels" quality="High" />
                <ClinVarRow gene="MLH1" variant="c.677C>T" significance="Conflicting" gnomadAF="0.0041" notes="High AF in Finnish population (0.0085) classified benign; pathogenic in Hispanic cohorts at lower AF" quality="Moderate" />
                <ClinVarRow gene="PALB2" variant="c.3113G>A" significance="Likely Pathogenic" gnomadAF="0.0006" notes="3x enrichment in African American breast cancer cases vs. controls; rare in European cohorts" quality="Moderate" />
                <ClinVarRow gene="CHEK2" variant="c.1100delC" significance="VUS" gnomadAF="0.0011" notes="Well-established in Northern European populations; VUS in admixed American and African populations" quality="Low" />
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Scatter + Table */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* Scatter Plot */}
        <Card className="xl:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Frequency Gap Analysis</CardTitle>
            <CardDescription className="text-xs">Dataset frequency vs. reference frequency. Bubble size = bias score. Points above line indicate under-detection.</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <ChartContainer config={{ x: { label: "Dataset Freq %" }, y: { label: "Reference Freq %" } }} className="h-[380px] w-full">
              <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.02 250)" />
                <XAxis dataKey="x" type="number" name="Dataset %" tick={{ fill: "oklch(0.5 0.02 250)", fontSize: 9 }} label={{ value: "Dataset %", position: "bottom", fill: "oklch(0.5 0.02 250)", fontSize: 9 }} />
                <YAxis dataKey="y" type="number" name="Reference %" tick={{ fill: "oklch(0.5 0.02 250)", fontSize: 9 }} label={{ value: "Reference %", angle: -90, position: "insideLeft", fill: "oklch(0.5 0.02 250)", fontSize: 9 }} />
                <ZAxis dataKey="z" range={[40, 400]} name="Bias" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Scatter data={scatterData}>
                  {scatterData.map((entry, i) => (
                    <Cell key={i} fill={classificationColors[entry.class] || "oklch(0.6 0.02 250)"} opacity={0.8} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="xl:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Variant Registry ({filtered.length} results)</CardTitle>
            <CardDescription className="text-xs">Ancestry-aware pathogenicity scoring with bias assessment</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="rounded-lg border border-border overflow-hidden max-h-[400px] overflow-y-auto table-sticky-head">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="text-[10px] cursor-pointer select-none" onClick={() => toggleSort("gene")}>Gene <ArrowUpDown className="w-2.5 h-2.5 inline ml-0.5" /></TableHead>
                    <TableHead className="text-[10px]">Variant</TableHead>
                    <TableHead className="text-[10px]">Classification</TableHead>
                    <TableHead className="text-[10px] cursor-pointer select-none" onClick={() => toggleSort("populationFrequency")}>Dataset <ArrowUpDown className="w-2.5 h-2.5 inline ml-0.5" /></TableHead>
                    <TableHead className="text-[10px] cursor-pointer select-none" onClick={() => toggleSort("referenceFrequency")}>Reference <ArrowUpDown className="w-2.5 h-2.5 inline ml-0.5" /></TableHead>
                    <TableHead className="text-[10px] cursor-pointer select-none" onClick={() => toggleSort("ancestryBiasScore")}>Bias <ArrowUpDown className="w-2.5 h-2.5 inline ml-0.5" /></TableHead>
                    <TableHead className="text-[10px]">Dataset</TableHead>
                    <TableHead className="text-[10px]">Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((v) => (
                    <TableRow key={v.id} className="data-table-row">
                      <TableCell className="text-xs font-mono font-semibold">{v.gene}</TableCell>
                      <TableCell className="text-[10px] font-mono text-muted-foreground max-w-[100px] truncate">{v.variant}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[9px] font-normal whitespace-nowrap" style={{ borderColor: classificationColors[v.classification], color: classificationColors[v.classification] }}>{v.classification}</Badge>
                      </TableCell>
                      <TableCell className="text-xs font-mono">{v.populationFrequency.toFixed(3)}</TableCell>
                      <TableCell className="text-xs font-mono">{v.referenceFrequency.toFixed(3)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <div className="w-14 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{ width: `${v.ancestryBiasScore * 100}%`, backgroundColor: v.ancestryBiasScore > 0.7 ? "oklch(0.65 0.22 25)" : v.ancestryBiasScore > 0.4 ? "oklch(0.7 0.16 45)" : "oklch(0.65 0.15 175)" }} />
                          </div>
                          <span className={cn("text-[10px] font-mono font-medium", v.ancestryBiasScore > 0.7 ? "text-destructive" : v.ancestryBiasScore > 0.4 ? "text-warning" : "text-success")}>{(v.ancestryBiasScore * 100).toFixed(0)}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-[10px] text-muted-foreground max-w-[120px] truncate" title={v.dataset?.name}>{v.dataset?.name}</TableCell>
                      <TableCell className="text-[10px] text-muted-foreground max-w-[180px] truncate" title={v.notes}>{v.notes}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MiniStat({ label, value, icon: Icon, color }: { label: string; value: number | string; icon: React.ElementType; color: string }) {
  return (
    <Card>
      <CardContent className="p-3 flex items-center gap-2.5">
        <Icon className={cn("w-4 h-4", color)} />
        <div>
          <p className="text-sm font-bold">{value}</p>
          <p className="text-[10px] text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function ClinVarRow({ gene, variant, significance, gnomadAF, notes, quality }: {
  gene: string;
  variant: string;
  significance: "Pathogenic" | "Likely Pathogenic" | "VUS" | "Conflicting";
  gnomadAF: string;
  notes: string;
  quality: "High" | "Moderate" | "Low";
}) {
  const sigBadge = (() => {
    switch (significance) {
      case "Pathogenic":
        return <Badge variant="destructive" className="text-[9px] font-normal whitespace-nowrap badge-hover">Pathogenic</Badge>;
      case "Likely Pathogenic":
        return (
          <Badge variant="outline" className="text-[9px] font-normal whitespace-nowrap badge-hover" style={{ borderColor: "oklch(0.7 0.16 45)", color: "oklch(0.8 0.16 65)", backgroundColor: "oklch(0.7 0.16 45 / 0.15)" }}>
            Likely Pathogenic
          </Badge>
        );
      case "VUS":
        return <Badge variant="secondary" className="text-[9px] font-normal whitespace-nowrap badge-hover">VUS</Badge>;
      case "Conflicting":
        return (
          <Badge variant="outline" className="text-[9px] font-normal whitespace-nowrap badge-hover animate-pulse" style={{ borderColor: "oklch(0.65 0.22 25)", color: "oklch(0.7 0.18 25)" }}>
            Conflicting
          </Badge>
        );
    }
  })();

  const qualityBadge = (() => {
    switch (quality) {
      case "High":
        return <Badge variant="secondary" className="text-[9px] font-normal chip-interactive bg-success/15 text-success border-success/30">High</Badge>;
      case "Moderate":
        return <Badge variant="secondary" className="text-[9px] font-normal chip-interactive bg-warning/15 text-warning border-warning/30">Moderate</Badge>;
      case "Low":
        return <Badge variant="secondary" className="text-[9px] font-normal chip-interactive bg-destructive/15 text-destructive border-destructive/30">Low</Badge>;
    }
  })();

  return (
    <TableRow>
      <TableCell className="text-xs font-mono font-semibold">{gene}</TableCell>
      <TableCell className="text-[10px] font-mono text-muted-foreground whitespace-nowrap">{variant}</TableCell>
      <TableCell>{sigBadge}</TableCell>
      <TableCell className="text-xs font-mono">{gnomadAF}</TableCell>
      <TableCell className="text-[10px] text-muted-foreground max-w-[260px]" title={notes}>{notes}</TableCell>
      <TableCell>{qualityBadge}</TableCell>
    </TableRow>
  );
}