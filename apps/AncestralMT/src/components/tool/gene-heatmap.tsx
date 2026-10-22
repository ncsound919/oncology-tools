"use client";

import React, { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Grid3X3, ArrowUpDown, Filter, TrendingUp, AlertTriangle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

const POPULATIONS = ["European", "African", "Hispanic/Latino", "East Asian", "South Asian", "AI/AN", "Pacific Islander"] as const;

const GENES = [
  "BRCA1", "BRCA2", "TP53", "EGFR", "KRAS", "PIK3CA", "SPOP",
  "ATM", "PTEN", "CDH1", "PALB2", "CHEK2", "RAD51C",
  "RAD51D", "BARD1", "MLH1", "MSH2",
] as const;

const HEATMAP_DATA: Record<string, Record<string, number>> = {
  "BRCA1":  { "European": 18, "African": 72, "Hispanic/Latino": 65, "East Asian": 58, "South Asian": 55, "AI/AN": 88, "Pacific Islander": 82 },
  "BRCA2":  { "European": 12, "African": 68, "Hispanic/Latino": 60, "East Asian": 52, "South Asian": 48, "AI/AN": 85, "Pacific Islander": 78 },
  "TP53":   { "European": 8,  "African": 45, "Hispanic/Latino": 42, "East Asian": 38, "South Asian": 35, "AI/AN": 62, "Pacific Islander": 55 },
  "EGFR":   { "European": 22, "African": 75, "Hispanic/Latino": 68, "East Asian": 60, "South Asian": 58, "AI/AN": 90, "Pacific Islander": 85 },
  "KRAS":   { "European": 15, "African": 55, "Hispanic/Latino": 50, "East Asian": 45, "South Asian": 42, "AI/AN": 70, "Pacific Islander": 65 },
  "PIK3CA": { "European": 10, "African": 60, "Hispanic/Latino": 55, "East Asian": 48, "South Asian": 45, "AI/AN": 75, "Pacific Islander": 70 },
  "SPOP":   { "European": 20, "African": 70, "Hispanic/Latino": 62, "East Asian": 55, "South Asian": 52, "AI/AN": 82, "Pacific Islander": 78 },
  "ATM":    { "European": 14, "African": 58, "Hispanic/Latino": 52, "East Asian": 48, "South Asian": 45, "AI/AN": 72, "Pacific Islander": 65 },
  "PTEN":   { "European": 18, "African": 62, "Hispanic/Latino": 58, "East Asian": 50, "South Asian": 48, "AI/AN": 78, "Pacific Islander": 72 },
  "CDH1":   { "European": 25, "African": 78, "Hispanic/Latino": 72, "East Asian": 65, "South Asian": 60, "AI/AN": 88, "Pacific Islander": 82 },
  "PALB2":  { "European": 16, "African": 65, "Hispanic/Latino": 60, "East Asian": 55, "South Asian": 50, "AI/AN": 80, "Pacific Islander": 75 },
  "CHEK2":  { "European": 12, "African": 55, "Hispanic/Latino": 50, "East Asian": 45, "South Asian": 42, "AI/AN": 68, "Pacific Islander": 60 },
  "RAD51C": { "European": 28, "African": 80, "Hispanic/Latino": 75, "East Asian": 68, "South Asian": 65, "AI/AN": 92, "Pacific Islander": 88 },
  "RAD51D": { "European": 30, "African": 82, "Hispanic/Latino": 78, "East Asian": 70, "South Asian": 68, "AI/AN": 95, "Pacific Islander": 90 },
  "BARD1":  { "European": 20, "African": 72, "Hispanic/Latino": 65, "East Asian": 60, "South Asian": 55, "AI/AN": 85, "Pacific Islander": 80 },
  "MLH1":   { "European": 22, "African": 68, "Hispanic/Latino": 62, "East Asian": 55, "South Asian": 52, "AI/AN": 80, "Pacific Islander": 75 },
  "MSH2":   { "European": 18, "African": 65, "Hispanic/Latino": 58, "East Asian": 52, "South Asian": 48, "AI/AN": 78, "Pacific Islander": 72 },
};

function getCellColor(value: number): string {
  if (value >= 70) return "oklch(0.65 0.22 25 / 0.85)";
  if (value >= 50) return "oklch(0.7 0.16 45 / 0.7)";
  if (value >= 30) return "oklch(0.7 0.16 45 / 0.4)";
  return "oklch(0.65 0.15 175 / 0.3)";
}

function getCellTextColor(value: number): string {
  return value >= 50 ? "oklch(0.95 0.01 250)" : "oklch(0.7 0.02 250)";
}

function getInterpretation(gene: string, pop: string, value: number): string {
  if (value >= 70) return `Critical gap: ${gene} variant interpretation for ${pop} populations is highly unreliable due to severe underrepresentation in reference panels.`;
  if (value >= 50) return `Significant bias: ${gene} pathogenicity calls for ${pop} ancestry may be misclassified. Additional population-specific data needed.`;
  if (value >= 30) return `Moderate uncertainty: Limited ${pop} reference data may affect ${gene} variant classification confidence.`;
  return `Low bias: Adequate ${pop} representation in reference panels for ${gene} variant interpretation.`;
}

function getBadgeVariant(value: number): "destructive" | "outline" | "secondary" {
  if (value >= 70) return "destructive";
  if (value >= 50) return "outline";
  return "secondary";
}

function getBadgeLabel(value: number): string {
  if (value >= 70) return "Critical";
  if (value >= 50) return "High";
  return "Low";
}

type SortMode = "name" | "avgBias" | "maxBias";

interface GeneStats {
  gene: string;
  avg: number;
  max: number;
  min: number;
}

interface HeatmapCellProps {
  gene: string;
  pop: string;
  value: number;
  isFiltered: boolean;
}

function HeatmapCell({ gene, pop, value, isFiltered }: HeatmapCellProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            "h-8 rounded text-[10px] font-mono font-medium flex items-center justify-center transition-all duration-150 hover:scale-110 hover:brightness-125 cursor-default",
            isFiltered && "opacity-20"
          )}
          style={{ backgroundColor: getCellColor(value), color: getCellTextColor(value) }}
        >
          {value}%
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[260px]">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold">{gene}</span>
            <Badge variant={getBadgeVariant(value)} className="text-[9px]">
              {getBadgeLabel(value)}
            </Badge>
          </div>
          <p className="text-[10px] font-medium">{pop}</p>
          <p className="text-[10px] text-muted-foreground leading-relaxed">{getInterpretation(gene, pop, value)}</p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

interface GeneRowProps {
  g: GeneStats;
  isHighlighted: boolean;
  biasThreshold: string;
  onToggleHighlight: (gene: string) => void;
}

function GeneRow({ g, isHighlighted, biasThreshold, onToggleHighlight }: GeneRowProps) {
  const pops = HEATMAP_DATA[g.gene];
  const minVal = parseInt(biasThreshold);

  return (
    <div
      className="grid gap-[2px] group"
      style={{ gridTemplateColumns: "100px repeat(7, 1fr) 80px" }}
    >
      <button
        className={cn(
          "text-[10px] font-mono font-semibold p-1 rounded text-left truncate transition-colors hover:bg-muted/60",
          isHighlighted && "bg-primary/10 text-primary"
        )}
        onClick={() => onToggleHighlight(g.gene)}
      >
        {g.gene}
      </button>
      {POPULATIONS.map((pop) => (
        <HeatmapCell
          key={pop}
          gene={g.gene}
          pop={pop}
          value={pops[pop]}
          isFiltered={minVal > 0 && pops[pop] < minVal}
        />
      ))}
      <div
        className="h-8 rounded flex items-center justify-center text-[10px] font-mono font-semibold transition-colors hover:bg-muted/60"
        style={{
          backgroundColor: getCellColor(g.avg),
          color: getCellTextColor(g.avg),
        }}
      >
        {g.avg}%
      </div>
    </div>
  );
}

export function GeneHeatmapView() {
  const [sortMode, setSortMode] = useState<SortMode>("avgBias");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [biasThreshold, setBiasThreshold] = useState<string>("0");
  const [highlightGene, setHighlightGene] = useState<string | null>(null);

  // Always-sorted-by-bias list for insight cards (independent of table sort)
  const byAvgBias = useMemo(() => {
    return [...GENES.map((gene) => {
      const pops = HEATMAP_DATA[gene];
      const values = POPULATIONS.map((p) => pops[p]);
      return { gene, avg: Math.round(values.reduce((a, b) => a + b, 0) / values.length) };
    })].sort((a, b) => b.avg - a.avg);
  }, []);

  const sortedGenes = useMemo(() => {
    const geneStats: GeneStats[] = GENES.map((gene) => {
      const pops = HEATMAP_DATA[gene];
      const values = POPULATIONS.map((p) => pops[p]);
      return {
        gene,
        avg: Math.round(values.reduce((a, b) => a + b, 0) / values.length),
        max: Math.max(...values),
        min: Math.min(...values),
      };
    });

    return [...geneStats].sort((a, b) => {
      const aVal = sortMode === "name" ? 0 : sortMode === "avgBias" ? a.avg : a.max;
      const bVal = sortMode === "name" ? 0 : sortMode === "avgBias" ? b.avg : b.max;
      if (sortMode === "name") {
        return sortDir === "asc" ? a.gene.localeCompare(b.gene) : b.gene.localeCompare(a.gene);
      }
      return sortDir === "asc" ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });
  }, [sortMode, sortDir]);

  const filteredGenes = useMemo(() => {
    const minVal = parseInt(biasThreshold);
    if (minVal <= 0) return sortedGenes;
    return sortedGenes.filter((g) => g.max >= minVal);
  }, [sortedGenes, biasThreshold]);

  const popAvgs = useMemo(() => {
    return POPULATIONS.map((pop) => {
      const vals = GENES.map((g) => HEATMAP_DATA[g][pop]);
      return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
    });
  }, []);

  const overallAvg = Math.round(popAvgs.reduce((a, b) => a + b, 0) / popAvgs.length);

  const criticalCells = useMemo(() => {
    let count = 0;
    for (const gene of GENES) {
      for (const pop of POPULATIONS) {
        if (HEATMAP_DATA[gene][pop] >= 70) count++;
      }
    }
    return count;
  }, []);

  const toggleSort = () => {
    setSortDir((d) => (d === "asc" ? "desc" : "asc"));
  };

  const handleToggleHighlight = (gene: string) => {
    setHighlightGene(highlightGene === gene ? null : gene);
  };

  return (
    <TooltipProvider delayDuration={0}>
      <div className="p-6 max-w-[1600px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold tracking-tight">Gene-Population Bias Heatmap</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Ancestry bias scores across {GENES.length} clinically actionable genes and {POPULATIONS.length} populations.
              Higher scores indicate greater uncertainty in variant interpretation.
            </p>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="border-primary/20 hover-lift">
            <CardContent className="p-3 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
                <Grid3X3 className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-lg font-bold">{GENES.length} x {POPULATIONS.length}</p>
                <p className="text-[10px] text-muted-foreground">Matrix Cells</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-destructive/20 hover-lift">
            <CardContent className="p-3 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-destructive/15 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-destructive" />
              </div>
              <div>
                <p className="text-lg font-bold text-destructive">{criticalCells}</p>
                <p className="text-[10px] text-muted-foreground">Critical Cells (&gt;70%)</p>
              </div>
            </CardContent>
          </Card>
          <Card className="hover-lift">
            <CardContent className="p-3 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-warning/15 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-warning" />
              </div>
              <div>
                <p className="text-lg font-bold text-warning">{overallAvg}%</p>
                <p className="text-[10px] text-muted-foreground">Overall Avg. Bias</p>
              </div>
            </CardContent>
          </Card>
          <Card className="hover-lift">
            <CardContent className="p-3 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center">
                <Info className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-lg font-bold">{popAvgs.filter((v) => v >= 50).length}/{POPULATIONS.length}</p>
                <p className="text-[10px] text-muted-foreground">Pops &gt;50% Avg</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Controls */}
        <Card>
          <CardContent className="p-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground">Filter by Max Bias:</span>
                <Select value={biasThreshold} onValueChange={setBiasThreshold}>
                  <SelectTrigger className="w-[120px] h-7 text-[10px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">All</SelectItem>
                    <SelectItem value="30">&gt; 30%</SelectItem>
                    <SelectItem value="50">&gt; 50%</SelectItem>
                    <SelectItem value="70">&gt; 70%</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground">Sort by:</span>
                <Select value={sortMode} onValueChange={(v) => setSortMode(v as SortMode)}>
                  <SelectTrigger className="w-[140px] h-7 text-[10px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="avgBias">Avg. Bias</SelectItem>
                    <SelectItem value="maxBias">Max Bias</SelectItem>
                    <SelectItem value="name">Gene Name</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button variant="ghost" size="sm" className="h-7 text-[10px]" onClick={toggleSort}>
                <ArrowUpDown className="w-3 h-3 mr-1" /> {sortDir === "desc" ? "Descending" : "Ascending"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Heatmap */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Bias Score Matrix</CardTitle>
            <CardDescription className="text-xs">
              Showing {filteredGenes.length} of {GENES.length} genes {parseInt(biasThreshold) > 0 ? `(filtered: max bias &gt; ${biasThreshold}%)` : ""}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="overflow-x-auto">
              <div className="min-w-[700px]">
                {/* Column Headers */}
                <div className="grid gap-[2px] mb-[2px]" style={{ gridTemplateColumns: "100px repeat(7, 1fr) 80px" }}>
                  <div className="text-[9px] font-semibold text-muted-foreground p-1">Gene</div>
                  {POPULATIONS.map((pop, idx) => (
                    <div key={pop} className="text-[9px] font-semibold text-center p-1 truncate" title={pop}>
                      <span className="block">{pop.split("/")[0]}</span>
                      <span className="text-[8px] font-normal text-muted-foreground">avg {popAvgs[idx]}%</span>
                    </div>
                  ))}
                  <div className="text-[9px] font-semibold text-muted-foreground p-1 text-center">Gene Avg</div>
                </div>

                <div className="space-y-[2px]">
                  {filteredGenes.map((g) => (
                    <GeneRow
                      key={g.gene}
                      g={g}
                      isHighlighted={highlightGene === g.gene}
                      biasThreshold={biasThreshold}
                      onToggleHighlight={handleToggleHighlight}
                    />
                  ))}
                </div>

                {/* Population Average Row */}
                <div className="grid gap-[2px] mt-[2px]" style={{ gridTemplateColumns: "100px repeat(7, 1fr) 80px" }}>
                  <div className="text-[9px] font-semibold text-muted-foreground p-1">Pop. Avg</div>
                  {popAvgs.map((avg, i) => (
                    <div
                      key={POPULATIONS[i]}
                      className="h-8 rounded flex items-center justify-center text-[10px] font-mono font-semibold"
                      style={{ backgroundColor: getCellColor(avg), color: getCellTextColor(avg) }}
                    >
                      {avg}%
                    </div>
                  ))}
                  <div
                    className="h-8 rounded flex items-center justify-center text-[10px] font-mono font-bold"
                    style={{ backgroundColor: getCellColor(overallAvg), color: getCellTextColor(overallAvg) }}
                  >
                    {overallAvg}%
                  </div>
                </div>

                {/* Legend */}
                <div className="flex items-center gap-4 mt-4 pt-3 border-t border-border/50">
                  <span className="text-[10px] text-muted-foreground font-medium">Bias Scale:</span>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-32 rounded-full" style={{ background: "linear-gradient(90deg, oklch(0.65 0.15 175 / 0.3), oklch(0.7 0.16 45 / 0.4), oklch(0.7 0.16 45 / 0.7), oklch(0.65 0.22 25 / 0.85))" }} />
                    <div className="flex items-center gap-3 text-[9px] text-muted-foreground">
                      <span>0% (Adequate)</span>
                      <span>50%</span>
                      <span>100% (Critical)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Insights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-destructive/20 hover-lift">
            <CardContent className="p-3">
              <p className="text-[10px] font-semibold text-destructive mb-1">Highest Risk Genes</p>
              <div className="space-y-1">
                {byAvgBias.slice(0, 5).map((g) => (
                  <div key={g.gene} className="flex items-center justify-between text-[10px]">
                    <span className="font-mono font-medium">{g.gene}</span>
                    <span className="text-destructive font-bold">{g.avg}% avg</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card className="border-success/20 hover-lift">
            <CardContent className="p-3">
              <p className="text-[10px] font-semibold text-success mb-1">Best Covered Genes</p>
              <div className="space-y-1">
                {[...byAvgBias].reverse().slice(0, 5).map((g) => (
                  <div key={g.gene} className="flex items-center justify-between text-[10px]">
                    <span className="font-mono font-medium">{g.gene}</span>
                    <span className="text-success font-bold">{g.avg}% avg</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card className="hover-lift">
            <CardContent className="p-3">
              <p className="text-[10px] font-semibold text-warning mb-1">Most Affected Populations</p>
              <div className="space-y-1">
                {POPULATIONS.map((pop, i) => (
                  <div key={pop} className="flex items-center justify-between text-[10px]">
                    <span className="truncate mr-2">{pop}</span>
                    <span className={cn("font-bold font-mono", popAvgs[i] >= 70 ? "text-destructive" : popAvgs[i] >= 50 ? "text-warning" : "text-success")}>{popAvgs[i]}%</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </TooltipProvider>
  );
}
