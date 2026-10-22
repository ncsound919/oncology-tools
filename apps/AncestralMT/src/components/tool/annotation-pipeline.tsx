"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
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
  Workflow,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  ArrowRight,
  Play,
  RotateCcw,
  FileCheck,
  Dna,
  Globe,
  FlaskConical,
  Zap,
  Info,
  Settings,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

// ── Types ───────────────────────────────────────────────────────────────────

type StepStatus = "pending" | "active" | "completed" | "error";

type StepId = 0 | 1 | 2 | 3 | 4 | 5;

interface PipelineStep {
  id: StepId;
  label: string;
  icon: React.ElementType;
  description: string;
}

interface ClassificationResult {
  variant: string;
  gene: string;
  standardClass: string;
  ancestryAwareClass: string;
  change: "upgraded" | "unchanged" | "downgraded";
  populationEvidence: string;
}

interface PopFrequency {
  variant: string;
  EUR: string;
  AFR: string;
  EAS: string;
  SAS: string;
}

// ── Data ────────────────────────────────────────────────────────────────────

const PIPELINE_STEPS: PipelineStep[] = [
  { id: 0, label: "Variant Input", icon: Dna, description: "Upload or paste variants" },
  { id: 1, label: "Quality Control", icon: Settings, description: "QC filters & validation" },
  { id: 2, label: "Population Frequency", icon: Globe, description: "AF lookup across populations" },
  { id: 3, label: "Ancestry Estimation", icon: FlaskConical, description: "Infer ancestral background" },
  { id: 4, label: "Pathogenicity Assessment", icon: Zap, description: "Ancestry-aware classification" },
  { id: 5, label: "Clinical Report", icon: FileCheck, description: "Output annotated variant" },
];

const CLASSIFICATION_RESULTS: ClassificationResult[] = [
  {
    variant: "BRCA2 c.6174delT",
    gene: "BRCA2",
    standardClass: "Pathogenic",
    ancestryAwareClass: "Pathogenic",
    change: "unchanged",
    populationEvidence: "Well-established across EUR, SAS; AF > 1% in AFR",
  },
  {
    variant: "EGFR c.2573T>G",
    gene: "EGFR",
    standardClass: "VUS",
    ancestryAwareClass: "Likely Pathogenic",
    change: "upgraded",
    populationEvidence: "Enriched in AFR cohorts (AF 2.3%); functional data supports pathogenicity",
  },
  {
    variant: "CHEK2 c.1100delC",
    gene: "CHEK2",
    standardClass: "VUS",
    ancestryAwareClass: "VUS",
    change: "unchanged",
    populationEvidence: "Rare in non-EUR populations; insufficient AFR/EAS data for reclassification",
  },
];

const POP_FREQUENCY_DATA: PopFrequency[] = [
  { variant: "BRCA2 c.6174delT", EUR: "0.12%", AFR: "1.45%", EAS: "0.03%", SAS: "0.28%" },
  { variant: "EGFR c.2573T>G", EUR: "0.01%", AFR: "2.31%", EAS: "0.05%", SAS: "0.08%" },
  { variant: "CHEK2 c.1100delC", EUR: "0.48%", AFR: "<0.01%", EAS: "<0.01%", SAS: "0.02%" },
];

const PIE_DATA = [
  { name: "Pathogenic", value: 1, fill: "oklch(0.65 0.22 25)" },
  { name: "Likely Pathogenic", value: 1, fill: "oklch(0.7 0.16 45)" },
  { name: "VUS", value: 1, fill: "oklch(0.6 0.02 250)" },
];

const pieChartConfig: ChartConfig = {
  Pathogenic: { label: "Pathogenic", color: "oklch(0.65 0.22 25)" },
  "Likely Pathogenic": { label: "Likely Pathogenic", color: "oklch(0.7 0.16 45)" },
  VUS: { label: "VUS", color: "oklch(0.6 0.02 250)" },
};

const REFERENCE_PANELS = ["1000 Genomes", "gnomAD", "TOPMed"];
const ANCESTRY_MODELS = ["PCA-based", "ADMIXTURE", "Self-reported"];

// ── Helpers ─────────────────────────────────────────────────────────────────

function getChangeBadge(change: "upgraded" | "unchanged" | "downgraded") {
  switch (change) {
    case "upgraded":
      return (
        <Badge className="bg-[oklch(0.65_0.15_155)]/15 text-[oklch(0.65_0.15_155)] border-[oklch(0.65_0.15_155)]/30 badge-hover">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Upgraded
        </Badge>
      );
    case "unchanged":
      return (
        <Badge className="bg-[oklch(0.7_0.16_45)]/15 text-[oklch(0.7_0.16_45)] border-[oklch(0.7_0.16_45)]/30 badge-hover">
          <Clock className="w-3 h-3 mr-1" />
          Unchanged
        </Badge>
      );
    case "downgraded":
      return (
        <Badge className="bg-[oklch(0.65_0.22_25)]/15 text-[oklch(0.65_0.22_25)] border-[oklch(0.65_0.22_25)]/30 badge-hover">
          <XCircle className="w-3 h-3 mr-1" />
          Downgraded
        </Badge>
      );
  }
}

function getClassBadge(cls: string) {
  const colors: Record<string, string> = {
    Pathogenic: "bg-[oklch(0.65_0.22_25)]/15 text-[oklch(0.65_0.22_25)] border-[oklch(0.65_0.22_25)]/30",
    "Likely Pathogenic": "bg-[oklch(0.7_0.16_45)]/15 text-[oklch(0.7_0.16_45)] border-[oklch(0.7_0.16_45)]/30",
    VUS: "bg-[oklch(0.6_0.02_250)]/15 text-[oklch(0.6_0.02_250)] border-[oklch(0.6_0.02_250)]/30",
  };
  return (
    <Badge variant="outline" className={cn("font-mono text-[11px]", colors[cls] ?? "")}>
      {cls}
    </Badge>
  );
}

// ── Component ───────────────────────────────────────────────────────────────

export function AnnotationPipelineView() {
  const [stepStatuses, setStepStatuses] = useState<StepStatus[]>(["pending", "pending", "pending", "pending", "pending", "pending"]);
  const [currentStep, setCurrentStep] = useState<number>(-1);
  const [isRunning, setIsRunning] = useState(false);
  const [referencePanel, setReferencePanel] = useState("gnomAD");
  const [ancestryModel, setAncestryModel] = useState("PCA-based");
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.8);
  const [includeVUS, setIncludeVUS] = useState(true);
  const [showResults, setShowResults] = useState(false);
  const [showFreqTable, setShowFreqTable] = useState(false);
  const [showClassification, setShowClassification] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [variantsLoaded, setVariantsLoaded] = useState(false);
  const timeoutsRef = useRef<NodeJS.Timeout[]>([]);

  const resetPipeline = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
    setStepStatuses(["pending", "pending", "pending", "pending", "pending", "pending"]);
    setCurrentStep(-1);
    setIsRunning(false);
    setShowResults(false);
    setShowFreqTable(false);
    setShowClassification(false);
    setShowStats(false);
    setVariantsLoaded(false);
  }, []);

  const runPipeline = useCallback(() => {
    resetPipeline();
    setIsRunning(true);

    const delays = [600, 1000, 1400, 1800, 2200, 2600];

    delays.forEach((delay, idx) => {
      const t = setTimeout(() => {
        // Mark previous steps as completed
        setStepStatuses((prev) => {
          const next = [...prev];
          for (let i = 0; i < idx; i++) {
            if (next[i] !== "completed") next[i] = "completed";
          }
          next[idx] = "active";
          return next;
        });
        setCurrentStep(idx);

        // Show results at specific steps
        if (idx === 0) setVariantsLoaded(true);
        if (idx === 2) setShowFreqTable(true);
        if (idx === 4) setShowClassification(true);
        if (idx === 5) {
          // Final step — mark everything complete
          const t2 = setTimeout(() => {
            setStepStatuses(["completed", "completed", "completed", "completed", "completed", "completed"]);
            setCurrentStep(-1);
            setIsRunning(false);
            setShowResults(true);
            setShowStats(true);
          }, 800);
          timeoutsRef.current.push(t2);
        }
      }, delay);
      timeoutsRef.current.push(t);
    });
  }, [resetPipeline]);

  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach(clearTimeout);
    };
  }, []);

  const pipelineProgress = stepStatuses.filter((s) => s === "completed").length / 6;

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 fade-up">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Workflow className="w-5 h-5 text-primary" />
            Variant Annotation Pipeline
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Multi-step variant annotation workflow demonstrating how ancestry context improves clinical variant interpretation.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={resetPipeline}
            className="btn-press hover-lift text-xs"
            disabled={isRunning}
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
            Reset
          </Button>
          <Button
            size="sm"
            onClick={runPipeline}
            disabled={isRunning}
            className={cn("btn-press text-xs", !isRunning && "hover-lift")}
          >
            {isRunning ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 mr-1.5" />
                Run Pipeline
              </>
            )}
          </Button>
        </div>
      </div>

      {/* ── Pipeline Flow ───────────────────────────────────────────── */}
      <Card className={cn("depth-1 fade-up fade-up-d1")}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary indicator-ring" />
              Pipeline Steps
            </CardTitle>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{stepStatuses.filter((s) => s === "completed").length}/6 completed</span>
              <Progress value={pipelineProgress * 100} className="w-24 h-1.5" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="pb-4">
          <div className="flex items-center gap-1 overflow-x-auto pb-2">
            {PIPELINE_STEPS.map((step, idx) => {
              const Icon = step.icon;
              const status = stepStatuses[idx];
              const isActive = status === "active";
              const isCompleted = status === "completed";
              const isPending = status === "pending";

              return (
                <React.Fragment key={step.id}>
                  <motion.div
                    initial={{ opacity: 0.4, scale: 0.95 }}
                    animate={{
                      opacity: isPending && !isRunning && currentStep < 0 ? 0.4 : 1,
                      scale: isActive ? 1.04 : 1,
                    }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    className={cn(
                      "flex-shrink-0 w-[140px] rounded-lg border p-3 transition-all duration-300 relative",
                      isActive && "glow-border-primary border-primary/50 bg-primary/5",
                      isCompleted && "border-[oklch(0.65_0.15_155)]/40 bg-[oklch(0.65_0.15_155)]/5",
                      isPending && "border-border/60 bg-card/40 opacity-50",
                      !isActive && !isCompleted && !isPending && "border-border bg-card"
                    )}
                  >
                    {/* Pulsing ring for active step */}
                    {isActive && (
                      <motion.div
                        className="absolute inset-0 rounded-lg border-2 border-primary/30"
                        animate={{ opacity: [0.3, 0.7, 0.3], scale: [1, 1.02, 1] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                      />
                    )}
                    {/* Step number badge */}
                    <div className="flex items-center justify-between mb-2">
                      <span className={cn(
                        "text-[10px] font-mono font-bold px-1.5 py-0.5 rounded",
                        isActive && "bg-primary/20 text-primary",
                        isCompleted && "bg-[oklch(0.65_0.15_155)]/20 text-[oklch(0.65_0.15_155)]",
                        isPending && "bg-muted/30 text-muted-foreground"
                      )}>
                        {isCompleted ? "✓" : `0${idx + 1}`}
                      </span>
                      {isCompleted && <CheckCircle2 className="w-3.5 h-3.5 text-[oklch(0.65_0.15_155)]" />}
                      {isActive && <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />}
                      {isPending && <Clock className="w-3.5 h-3.5 text-muted-foreground/40" />}
                    </div>
                    {/* Icon */}
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center mb-2",
                      isActive && "bg-primary/15",
                      isCompleted && "bg-[oklch(0.65_0.15_155)]/15",
                      isPending && "bg-muted/20"
                    )}>
                      <Icon className={cn(
                        "w-4 h-4",
                        isActive && "text-primary",
                        isCompleted && "text-[oklch(0.65_0.15_155)]",
                      )} />
                    </div>
                    {/* Label */}
                    <p className={cn(
                      "text-xs font-medium leading-tight",
                      isActive && "text-primary",
                      isCompleted && "text-foreground",
                      isPending && "text-muted-foreground"
                    )}>
                      {step.label}
                    </p>
                    <p className="text-[10px] text-muted-foreground/60 mt-0.5 leading-tight truncate">
                      {step.description}
                    </p>
                  </motion.div>
                  {/* Arrow connector */}
                  {idx < PIPELINE_STEPS.length - 1 && (
                    <div className="flex-shrink-0 flex items-center px-0.5">
                      <ArrowRight className={cn(
                        "w-3.5 h-3.5",
                        stepStatuses[idx] === "completed" ? "text-primary" : "text-muted-foreground/30"
                      )} />
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ── Config + Live Results ───────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ── Configuration Panel ─────────────────────────────────── */}
        <div className="lg:col-span-3">
          <Card className={cn("depth-1 fade-up fade-up-d2 h-fit")}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Settings className="w-3.5 h-3.5 text-primary" />
                Pipeline Configuration
              </CardTitle>
              <CardDescription className="text-[11px]">
                Configure annotation parameters
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Reference Panel */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  Reference Panel
                </label>
                <div className="space-y-1">
                  {REFERENCE_PANELS.map((panel) => (
                    <button
                      key={panel}
                      onClick={() => setReferencePanel(panel)}
                      disabled={isRunning}
                      className={cn(
                        "w-full text-left text-xs px-3 py-2 rounded-md border transition-all chip-interactive",
                        referencePanel === panel
                          ? "border-primary/50 bg-primary/10 text-primary font-medium"
                          : "border-border bg-card/50 text-muted-foreground hover:border-border hover:bg-muted/30"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span>{panel}</span>
                        {referencePanel === panel && (
                          <CheckCircle2 className="w-3 h-3 text-primary" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Ancestry Model */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  Ancestry Model
                </label>
                <div className="space-y-1">
                  {ANCESTRY_MODELS.map((model) => (
                    <button
                      key={model}
                      onClick={() => setAncestryModel(model)}
                      disabled={isRunning}
                      className={cn(
                        "w-full text-left text-xs px-3 py-2 rounded-md border transition-all chip-interactive",
                        ancestryModel === model
                          ? "border-primary/50 bg-primary/10 text-primary font-medium"
                          : "border-border bg-card/50 text-muted-foreground hover:border-border hover:bg-muted/30"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span>{model}</span>
                        {ancestryModel === model && (
                          <CheckCircle2 className="w-3 h-3 text-primary" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Confidence Threshold Slider */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                    Confidence Threshold
                  </label>
                  <span className="text-xs font-mono text-primary font-semibold">
                    {confidenceThreshold.toFixed(2)}
                  </span>
                </div>
                <input
                  type="range"
                  min={0.5}
                  max={1.0}
                  step={0.01}
                  value={confidenceThreshold}
                  onChange={(e) => setConfidenceThreshold(parseFloat(e.target.value))}
                  disabled={isRunning}
                  className="w-full h-1.5 rounded-full appearance-none bg-border accent-primary cursor-pointer disabled:opacity-50"
                />
                <div className="flex justify-between text-[9px] text-muted-foreground/50">
                  <span>0.50</span>
                  <span>1.00</span>
                </div>
              </div>

              {/* Include VUS Toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                    Include VUS
                  </label>
                  <p className="text-[10px] text-muted-foreground/50">Process variants of uncertain significance</p>
                </div>
                <button
                  role="switch"
                  aria-checked={includeVUS}
                  onClick={() => setIncludeVUS(!includeVUS)}
                  disabled={isRunning}
                  className={cn(
                    "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors",
                    includeVUS ? "bg-primary" : "bg-muted",
                    isRunning && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <span
                    className={cn(
                      "pointer-events-none block h-4 w-4 rounded-full bg-white shadow-lg transition-transform",
                      includeVUS ? "translate-x-4" : "translate-x-0"
                    )}
                  />
                </button>
              </div>

              {/* Divider */}
              <div className="border-t border-border" />

              {/* Active Config Summary */}
              <div className="space-y-2 rounded-md bg-muted/20 p-3 border border-border/50">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <Info className="w-3 h-3" />
                  Active Configuration
                </p>
                <div className="space-y-1 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Panel</span>
                    <span className="font-mono text-foreground">{referencePanel}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Model</span>
                    <span className="font-mono text-foreground">{ancestryModel}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Threshold</span>
                    <span className="font-mono text-primary">{confidenceThreshold.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">VUS</span>
                    <span className={includeVUS ? "text-[oklch(0.65_0.15_155)]" : "text-muted-foreground"}>
                      {includeVUS ? "Included" : "Excluded"}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Live Results Panel ───────────────────────────────────── */}
        <div className="lg:col-span-9 space-y-6">
          {/* Variants Loaded Badge (appears after step 1) */}
          <AnimatePresence>
            {variantsLoaded && !showResults && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.4 }}
              >
                <Card className="depth-2 card-gradient-teal border-[oklch(0.65_0.15_175)]/20">
                  <CardContent className="py-3 px-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
                        <Dna className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-foreground">Variants Loaded</p>
                        <p className="text-[10px] text-muted-foreground">3 variants queued for annotation</p>
                      </div>
                    </div>
                    <Badge className="bg-primary/15 text-primary border-primary/30 font-mono">
                      3 variants
                    </Badge>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Population Frequency Table (appears after step 3) */}
          <AnimatePresence>
            {showFreqTable && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                <Card className={cn("depth-1 card-highlight-top")}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Globe className="w-4 h-4 text-primary" />
                      Population Allele Frequencies
                    </CardTitle>
                    <CardDescription className="text-[11px]">
                      Cross-population allele frequency lookup from {referencePanel}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-md border border-border overflow-hidden data-grid-bg">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-border bg-muted/30">
                            <th className="text-left px-3 py-2 font-medium text-muted-foreground">Variant</th>
                            <th className="text-center px-3 py-2 font-medium text-muted-foreground">EUR</th>
                            <th className="text-center px-3 py-2 font-medium text-muted-foreground">AFR</th>
                            <th className="text-center px-3 py-2 font-medium text-muted-foreground">EAS</th>
                            <th className="text-center px-3 py-2 font-medium text-muted-foreground">SAS</th>
                          </tr>
                        </thead>
                        <tbody>
                          {POP_FREQUENCY_DATA.map((row, idx) => (
                            <tr
                              key={row.variant}
                              className={cn(
                                "border-b border-border/50 last:border-b-0 table-hover-stripe transition-colors",
                                idx % 2 === 1 && "bg-muted/10"
                              )}
                            >
                              <td className="px-3 py-2 font-mono font-medium text-foreground">{row.variant}</td>
                              <td className="text-center px-3 py-2 font-mono text-muted-foreground">{row.EUR}</td>
                              <td className="text-center px-3 py-2 font-mono">
                                <span className={cn(
                                  row.AFR !== "<0.01%" && parseFloat(row.AFR) > 1
                                    ? "text-[oklch(0.7_0.16_45)] font-semibold"
                                    : "text-muted-foreground"
                                )}>
                                  {row.AFR}
                                </span>
                              </td>
                              <td className="text-center px-3 py-2 font-mono text-muted-foreground">{row.EAS}</td>
                              <td className="text-center px-3 py-2 font-mono text-muted-foreground">{row.SAS}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="text-[10px] text-muted-foreground/60 mt-2 flex items-center gap-1">
                      <Info className="w-3 h-3" />
                      Elevated AFR frequencies highlighted in amber. EGFR variant shows significant African enrichment (2.31% vs 0.01% EUR).
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Classification Results (appears after step 5) */}
          <AnimatePresence>
            {showClassification && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                <Card className={cn("depth-1 card-highlight-top")}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Zap className="w-4 h-4 text-[oklch(0.7_0.16_45)]" />
                      Ancestry-Aware Classification Results
                    </CardTitle>
                    <CardDescription className="text-[11px]">
                      Comparison of standard vs ancestry-informed pathogenicity assessment
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Comparison Table */}
                    <div className="rounded-md border border-border overflow-hidden data-grid-bg">
                      <div className="overflow-x-auto max-h-96 overflow-y-auto">
                        <table className="w-full text-xs">
                          <thead className="sticky top-0 z-10">
                            <tr className="border-b border-border bg-muted/40 backdrop-blur-sm">
                              <th className="text-left px-3 py-2.5 font-medium text-muted-foreground min-w-[150px]">Variant</th>
                              <th className="text-center px-3 py-2.5 font-medium text-muted-foreground min-w-[130px]">Standard</th>
                              <th className="text-center px-3 py-2.5 font-medium text-muted-foreground min-w-[150px]">Ancestry-Aware</th>
                              <th className="text-center px-3 py-2.5 font-medium text-muted-foreground min-w-[110px]">Change</th>
                              <th className="text-left px-3 py-2.5 font-medium text-muted-foreground min-w-[250px]">Population Evidence</th>
                            </tr>
                          </thead>
                          <tbody>
                            {CLASSIFICATION_RESULTS.map((row, idx) => (
                              <motion.tr
                                key={row.variant}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.3, delay: idx * 0.15 }}
                                className={cn(
                                  "border-b border-border/50 last:border-b-0 table-hover-stripe transition-colors",
                                  idx % 2 === 1 && "bg-muted/10"
                                )}
                              >
                                <td className="px-3 py-2.5">
                                  <div className="font-mono font-medium text-foreground">{row.variant}</div>
                                  <div className="text-[10px] text-muted-foreground">{row.gene}</div>
                                </td>
                                <td className="text-center px-3 py-2.5">
                                  {getClassBadge(row.standardClass)}
                                </td>
                                <td className="text-center px-3 py-2.5">
                                  {getClassBadge(row.ancestryAwareClass)}
                                </td>
                                <td className="text-center px-3 py-2.5">
                                  {getChangeBadge(row.change)}
                                </td>
                                <td className="px-3 py-2.5 text-[11px] text-muted-foreground leading-relaxed">
                                  {row.populationEvidence}
                                </td>
                              </motion.tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Key Insight */}
                    <div className="rounded-md bg-[oklch(0.7_0.16_45)]/10 border border-[oklch(0.7_0.16_45)]/20 p-3 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-[oklch(0.7_0.16_45)] mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs font-medium text-[oklch(0.7_0.16_45)]">
                          1 of 3 variants reclassified (33%)
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          EGFR c.2573T&gt;G upgraded from VUS to Likely Pathogenic based on African population frequency enrichment and supporting functional evidence.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Final Results (appears after step 6 complete) */}
          <AnimatePresence>
            {showResults && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="space-y-6"
              >
                {/* Summary Row: Stats + Pie Chart */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                  {/* Stats Cards */}
                  {showStats && (
                    <div className="md:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {[
                        { label: "Variants Processed", value: "3", sub: "All passed QC", accent: "primary" },
                        { label: "Classification Changes", value: "1 (33%)", sub: "1 upgraded, 0 downgraded", accent: "warning" },
                        { label: "Avg Confidence", value: "0.87", sub: "Above threshold (0.80)", accent: "success" },
                        { label: "Populations Referenced", value: "4", sub: "EUR, AFR, EAS, SAS", accent: "primary" },
                      ].map((stat, idx) => (
                        <motion.div
                          key={stat.label}
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.4, delay: idx * 0.1 }}
                        >
                          <Card className={cn("depth-2 relative overflow-hidden", idx === 0 && "corner-accent-tl")}>
                            <div className={cn(
                              "stat-accent-bar",
                              stat.accent === "primary" && "bg-primary",
                              stat.accent === "warning" && "bg-[oklch(0.7_0.16_45)]",
                              stat.accent === "success" && "bg-[oklch(0.65_0.15_155)]"
                            )} />
                            <CardContent className="p-4">
                              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                                {stat.label}
                              </p>
                              <p className={cn(
                                "text-lg font-bold font-mono mt-1",
                                stat.accent === "primary" && "text-primary",
                                stat.accent === "warning" && "text-[oklch(0.7_0.16_45)]",
                                stat.accent === "success" && "text-[oklch(0.65_0.15_155)]"
                              )}>
                                {stat.value}
                              </p>
                              <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                                {stat.sub}
                              </p>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))}
                    </div>
                  )}

                  {/* Pie Chart */}
                  {showStats && (
                    <motion.div
                      className="md:col-span-4"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.5, delay: 0.4 }}
                    >
                      <Card className={cn("depth-2 h-full")}>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-xs font-semibold flex items-center gap-1.5">
                            Classification Distribution
                          </CardTitle>
                          <CardDescription className="text-[10px]">
                            Ancestry-aware results
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="flex items-center justify-center">
                          <ChartContainer config={pieChartConfig} className="w-full h-[180px]">
                            <PieChart>
                              <ChartTooltip content={<ChartTooltipContent />} />
                              <Pie
                                data={PIE_DATA}
                                cx="50%"
                                cy="50%"
                                innerRadius={45}
                                outerRadius={70}
                                paddingAngle={3}
                                dataKey="value"
                                nameKey="name"
                                animationBegin={0}
                                animationDuration={800}
                              >
                                {PIE_DATA.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.fill} />
                                ))}
                              </Pie>
                              <ChartLegend content={<ChartLegendContent nameKey="name" />} />
                            </PieChart>
                          </ChartContainer>
                        </CardContent>
                      </Card>
                    </motion.div>
                  )}
                </div>

                {/* Download Report Button */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                >
                  <Card className={cn("depth-1 card-inner-shadow container-glow")}>
                    <CardContent className="py-4 px-5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-[oklch(0.65_0.15_155)]/15 flex items-center justify-center">
                          <FileCheck className="w-5 h-5 text-[oklch(0.65_0.15_155)]" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">Pipeline Complete</p>
                          <p className="text-[11px] text-muted-foreground">
                            Annotated 3 variants with ancestry-aware classification. 1 variant reclassified.
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="btn-press hover-lift text-xs"
                        onClick={() => {}}
                      >
                        <FileCheck className="w-3.5 h-3.5 mr-1.5" />
                        Download Report
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Empty state when nothing is running and no results */}
          {!isRunning && !showResults && !showFreqTable && !showClassification && currentStep < 0 && (
            <Card className={cn("depth-1 border-dashed border-border/60")}>
              <CardContent className="py-12 flex flex-col items-center justify-center text-center">
                <div className="w-14 h-14 rounded-2xl bg-muted/20 flex items-center justify-center mb-4">
                  <Workflow className="w-7 h-7 text-muted-foreground/40" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">
                  Configure parameters and run the pipeline
                </p>
                <p className="text-[11px] text-muted-foreground/50 mt-1 max-w-md">
                  The annotation pipeline will process 3 sample variants through quality control, population frequency lookup, ancestry estimation, and pathogenicity assessment.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}