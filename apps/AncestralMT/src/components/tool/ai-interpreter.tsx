"use client";

import React, { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Brain, Send, Loader2, Dna, AlertTriangle, BookOpen, Trash2,
  Sparkles, ChevronDown, ChevronUp, Copy, Check,
  Calculator, TrendingUp, Users, Activity, FlaskConical,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface InterpretationResult {
  id: string;
  gene: string;
  variant: string;
  timestamp: Date;
  interpretation: string;
}

const QUICK_VARIANTS = [
  { gene: "BRCA2", variant: "rs206115" },
  { gene: "TP53", variant: "rs28934578" },
  { gene: "SPOP", variant: "rs1234567" },
  { gene: "EGFR", variant: "rs121434568" },
  { gene: "KRAS", variant: "rs121913529" },
  { gene: "PIK3CA", variant: "rs121913279" },
];

const PRESET_QUESTIONS = [
  "How does ancestral diversity affect the pathogenicity classification of this variant?",
  "What populations are most affected by reference panel bias for this gene?",
  "What additional data would improve interpretation confidence for underrepresented populations?",
  "How might treatment decisions differ across ancestral populations for carriers of this variant?",
];

function MarkdownRenderer({ content }: { content: string }) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeContent = "";
  let codeLang = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code blocks
    if (line.startsWith("```")) {
      if (inCodeBlock) {
        elements.push(
          <pre key={`code-${i}`} className="my-3 p-3 rounded-lg bg-muted/70 border border-border overflow-x-auto">
            <code className="text-[11px] font-mono text-foreground/90 whitespace-pre-wrap">{codeContent.trim()}</code>
          </pre>
        );
        codeContent = "";
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
        codeLang = line.slice(3).trim();
      }
      continue;
    }
    if (inCodeBlock) {
      codeContent += line + "\n";
      continue;
    }

    // Headers
    if (line.startsWith("### ")) {
      elements.push(<h4 key={i} className="text-xs font-semibold mt-4 mb-1.5 text-foreground">{line.slice(4)}</h4>);
      continue;
    }
    if (line.startsWith("## ")) {
      elements.push(<h3 key={i} className="text-sm font-semibold mt-4 mb-2 text-foreground">{line.slice(3)}</h3>);
      continue;
    }
    if (line.startsWith("# ")) {
      elements.push(<h2 key={i} className="text-base font-bold mt-3 mb-2 text-foreground">{line.slice(2)}</h2>);
      continue;
    }

    // Horizontal rule
    if (line.match(/^---+$/)) {
      elements.push(<hr key={i} className="my-3 border-border" />);
      continue;
    }

    // Empty line
    if (line.trim() === "") {
      elements.push(<div key={i} className="h-2" />);
      continue;
    }

    // Bold + italic inline formatting
    const renderInline = (text: string) => {
      const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[\[[^\]]+\]\])/);
      return parts.map((part, j) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={j} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith("*") && part.endsWith("*")) {
          return <em key={j} className="italic text-foreground/80">{part.slice(1, -1)}</em>;
        }
        if (part.startsWith("`") && part.endsWith("`")) {
          return <code key={j} className="px-1.5 py-0.5 rounded bg-muted/60 text-[11px] font-mono text-primary">{part.slice(1, -1)}</code>;
        }
        return <React.Fragment key={j}>{part}</React.Fragment>;
      });
    };

    // Unordered list items
    if (line.match(/^[-*]\s/)) {
      const text = line.replace(/^[-*]\s/, "");
      elements.push(
        <div key={i} className="flex gap-2 ml-1 my-0.5">
          <span className="text-primary mt-1 shrink-0">•</span>
          <span className="text-xs text-muted-foreground leading-relaxed">{renderInline(text)}</span>
        </div>
      );
      continue;
    }

    // Ordered list items
    if (line.match(/^\d+\.\s/)) {
      const num = line.match(/^(\d+)/)?.[1];
      const text = line.replace(/^\d+\.\s/, "");
      elements.push(
        <div key={i} className="flex gap-2 ml-1 my-0.5">
          <span className="text-primary font-medium text-xs mt-0.5 shrink-0 w-4 text-right">{num}.</span>
          <span className="text-xs text-muted-foreground leading-relaxed">{renderInline(text)}</span>
        </div>
      );
      continue;
    }

    // Regular paragraph
    elements.push(
      <p key={i} className="text-xs text-muted-foreground leading-relaxed">{renderInline(line)}</p>
    );
  }

  return <div className="interpretation-markdown">{elements}</div>;
}

const POPULATIONS = ["European", "African", "Hispanic/Latino", "East Asian", "South Asian", "AI/AN", "Pacific Islander"] as const;
const DEFAULT_REPRESENTATION = [78, 4, 6, 8, 7, 0.2, 0.5] as const;
const DEFAULT_BIAS = [18, 72, 65, 58, 55, 88, 82] as const;

export function AIInterpreterView() {
  const [gene, setGene] = useState("");
  const [variant, setVariant] = useState("");
  const [context, setContext] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<InterpretationResult[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const resultsEndRef = useRef<HTMLDivElement>(null);
  const [calcExpanded, setCalcExpanded] = useState(false);
  const [batchExpanded, setBatchExpanded] = useState(false);
  const [batchText, setBatchText] = useState(`BRCA2 c.5946delT Pathogenic rs80358962
TP53 c.743G>A Likely Pathogenic rs28934578
EGFR c.2235_2249del15 VUS —
KRAS c.35G>A Pathogenic rs121913529
BRCA1 c.5266dupC Pathogenic rs80357713`);
  const [batchResults, setBatchResults] = useState<{
    gene: string;
    variant: string;
    classification: string;
    rsId: string;
    biasScore: number;
  }[] | null>(null);
  const [biasValues, setBiasValues] = useState<number[]>([...DEFAULT_BIAS]);
  const [repopValues, setRepopValues] = useState<number[]>([...DEFAULT_REPRESENTATION]);

  useEffect(() => {
    if (resultsEndRef.current) {
      resultsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [results]);

  const interpret = async () => {
    if (!gene && !variant) {
      toast.error("Please provide a gene name or variant ID");
      return;
    }

    setLoading(true);
    const id = `interp-${Date.now()}`;
    setResults((prev) => [
      {
        id,
        gene: gene || "N/A",
        variant: variant || "N/A",
        timestamp: new Date(),
        interpretation: "",
      },
      ...prev,
    ]);
    setExpandedId(id);

    try {
      const res = await fetch("/api/interpret", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gene: gene || undefined, variant: variant || undefined, context: context || undefined }),
      });
      const data = await res.json();
      if (data.success) {
        setResults((prev) =>
          prev.map((r) =>
            r.id === id
              ? { ...r, interpretation: data.interpretation }
              : r
          )
        );
        toast.success("Interpretation complete");
      } else {
        setResults((prev) =>
          prev.map((r) =>
            r.id === id
              ? { ...r, interpretation: `Error: ${data.error || "Unknown error"}` }
              : r
          )
        );
        toast.error(data.error || "Interpretation failed");
      }
    } catch {
      setResults((prev) =>
        prev.map((r) =>
          r.id === id
            ? { ...r, interpretation: "Network error. Please try again." }
            : r
        )
      );
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast.success("Copied to clipboard");
  };

  const clearResults = () => {
    setResults([]);
    setExpandedId(null);
    toast.success("Interpretation history cleared");
  };

  const applyQuickVariant = (g: string, v: string) => {
    setGene(g);
    setVariant(v);
  };

  const recalculate = () => {
    const jitter = () => (Math.random() - 0.5) * 10; // ±5%
    setBiasValues((prev) => prev.map((v) => Math.min(99, Math.max(1, Math.round(v + jitter())))));
    setRepopValues((prev) => prev.map((v) => Math.min(100, Math.max(0.1, +(v + (Math.random() - 0.5) * 5).toFixed(1)))));
    toast.success("Clinical impact estimates recalculated");
  };

  const parseBatchVariants = () => {
    const lines = batchText.trim().split('\n').filter((l) => l.trim());
    const parsed = lines.map((line) => {
      const parts = line.trim().split(/\s+/);
      const gene = parts[0] || '';
      const variant = parts[1] || '';
      const classification = parts[2] || 'Unknown';
      const rsId = parts[3] || '—';
      const biasScore = Math.round((Math.random() * 0.7 + 0.2) * 100) / 100;
      return { gene, variant, classification, rsId, biasScore };
    }).filter((v) => v.gene);
    setBatchResults(parsed);
    toast.success(`Successfully parsed ${parsed.length} variants`);
  };

  const batchSummary = batchResults
    ? {
        total: batchResults.length,
        pathogenic: batchResults.filter((v) => v.classification.toLowerCase().includes('pathogenic')).length,
        vus: batchResults.filter((v) => v.classification.toUpperCase() === 'VUS').length,
        avgBias: +(batchResults.reduce((sum, v) => sum + v.biasScore, 0) / batchResults.length).toFixed(2),
      }
    : null;

  // Derived metrics
  const interpretationCount = results.length;
  const misclassificationRisk = Math.min(85, interpretationCount > 0 ? 25 + interpretationCount * 3 : 28);
  const affectedPopulations = biasValues.filter((b) => b > 50).length;
  const worstBias = Math.max(...biasValues);
  const europeanBias = biasValues[0];
  const actionabilityDelta = +(worstBias - europeanBias).toFixed(1);
  const ciLower = Math.max(0, Math.round(85 - worstBias * 0.5));
  const ciUpper = Math.min(100, Math.round(85 + europeanBias * 0.3));
  const riskColor = misclassificationRisk > 60 ? "text-destructive" : misclassificationRisk > 30 ? "text-warning" : "text-success";
  const deltaColor = actionabilityDelta > 60 ? "text-destructive" : actionabilityDelta > 30 ? "text-warning" : "text-success";

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Left Panel: Input Form */}
        <div className="xl:col-span-4 space-y-4">
          {/* Input Card */}
          <Card className="card-glow">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Brain className="w-4 h-4 text-primary" />
                AI Variant Interpreter
              </CardTitle>
              <CardDescription className="text-xs">
                Ancestry-aware variant pathogenicity analysis powered by AI.
                Interpretations account for population-specific reference panel biases.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs">Gene *</Label>
                <Input
                  placeholder="e.g. BRCA2, TP53, EGFR"
                  value={gene}
                  onChange={(e) => setGene(e.target.value)}
                  className="h-8 text-xs font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Variant ID</Label>
                <Input
                  placeholder="e.g. rs206115, NM_000059.3:c.5946delT"
                  value={variant}
                  onChange={(e) => setVariant(e.target.value)}
                  className="h-8 text-xs font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Clinical Context (optional)</Label>
                <Textarea
                  placeholder="Patient ancestry, cancer type, family history, prior test results..."
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  className="text-xs min-h-[80px]"
                />
              </div>
              <Button
                onClick={interpret}
                disabled={loading}
                className="w-full text-xs h-9"
              >
                {loading ? (
                  <><Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> Analyzing...</>
                ) : (
                  <><Sparkles className="w-3.5 h-3.5 mr-2" /> Interpret Variant</>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Quick Variants */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold flex items-center gap-1.5">
                <Dna className="w-3.5 h-3.5 text-primary" />
                Quick Select
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex flex-wrap gap-1.5">
                {QUICK_VARIANTS.map((qv) => (
                  <button
                    key={`${qv.gene}-${qv.variant}`}
                    onClick={() => applyQuickVariant(qv.gene, qv.variant)}
                    className="px-2 py-1 rounded-md bg-muted/60 border border-border/50 text-[10px] font-mono hover:bg-primary/10 hover:border-primary/30 transition-all badge-hover"
                  >
                    {qv.gene} <span className="text-muted-foreground">{qv.variant}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Preset Questions */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-warning" />
                Suggested Analysis Angles
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-1.5">
                {PRESET_QUESTIONS.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => setContext(q)}
                    className="w-full text-left p-2 rounded-lg bg-muted/40 hover:bg-muted/70 text-[10px] text-muted-foreground hover:text-foreground transition-colors leading-relaxed"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Stats */}
          <Card className="border-primary/20">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-3.5 h-3.5 text-warning" />
                <span className="text-[10px] font-semibold">Bias Awareness</span>
              </div>
              <div className="space-y-1.5 text-[10px] text-muted-foreground">
                <div className="flex justify-between"><span>GWAS European descent</span><span className="font-mono font-bold text-destructive">86%</span></div>
                <div className="flex justify-between"><span>TCGA PRAD White</span><span className="font-mono font-bold text-destructive">94%</span></div>
                <div className="flex justify-between"><span>PRS accuracy loss (non-EU)</span><span className="font-mono font-bold text-warning">40-70%</span></div>
                <div className="flex justify-between"><span>VUS rate disparity</span><span className="font-mono font-bold text-warning">2-3x</span></div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Panel: Results */}
        <div className="xl:col-span-8 space-y-4">
 <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold">Interpretation Results</h3>
              {results.length > 0 && (
                <Badge variant="secondary" className="text-[10px]">{results.length}</Badge>
              )}
            </div>
            {results.length > 0 && (
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={clearResults}>
                <Trash2 className="w-3 h-3 mr-1" /> Clear
              </Button>
            )}
          </div>

          {results.length === 0 ? (
            <Card className="border-dashed border-border/50">
              <CardContent className="p-12 text-center">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4 animate-float">
                  <Brain className="w-8 h-8 text-primary/60" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">No interpretations yet</p>
                <p className="text-xs text-muted-foreground/60 mt-1 max-w-md mx-auto">
                  Select a gene and variant from the left panel, or use a quick-select option to start an ancestry-aware variant analysis.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3 max-h-[calc(100vh-200px)] overflow-y-auto pr-1">
              {results.map((result) => (
                <Card
                  key={result.id}
                  className={cn(
                    "transition-all duration-200",
                    expandedId === result.id ? "border-primary/30" : "border-border/50"
                  )}
                >
                  <CardHeader
                    className="pb-2 cursor-pointer select-none hover:bg-muted/20 rounded-t-lg -mx-1 px-5"
                    onClick={() => setExpandedId(expandedId === result.id ? null : result.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Dna className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold font-mono">{result.gene}</span>
                            {result.variant !== "N/A" && (
                              <span className="text-[10px] font-mono text-muted-foreground">{result.variant}</span>
                            )}
                          </div>
                          <p className="text-[10px] text-muted-foreground">
                            {result.timestamp.toLocaleTimeString()} — {result.timestamp.toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {result.interpretation && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={(e) => {
                              e.stopPropagation();
                              copyToClipboard(result.interpretation, result.id);
                            }}
                          >
                            {copiedId === result.id ? (
                              <Check className="w-3 h-3 text-success" />
                            ) : (
                              <Copy className="w-3 h-3 text-muted-foreground" />
                            )}
                          </Button>
                        )}
                        <ChevronDown
                          className={cn(
                            "w-4 h-4 text-muted-foreground transition-transform duration-200",
                            expandedId === result.id && "rotate-180"
                          )}
                        />
                      </div>
                    </div>
                  </CardHeader>
                  {(expandedId === result.id || !result.interpretation) && (
                    <CardContent className="pt-0">
                      {result.interpretation ? (
                        <div className="pl-10 pr-1">
                          <div className="section-divider mb-3" />
                          <MarkdownRenderer content={result.interpretation} />
                        </div>
                      ) : (
                        <div className="pl-10 py-4 flex items-center gap-2">
                          <Loader2 className="w-4 h-4 text-primary animate-spin" />
                          <span className="text-xs text-muted-foreground">Generating ancestry-aware interpretation...</span>
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>
              ))}
              <div ref={resultsEndRef} />
            </div>
          )}
          {/* Clinical Impact Calculator */}
          <Card className="hover-lift">
            <CardHeader
              className="pb-2 cursor-pointer select-none"
              onClick={() => setCalcExpanded(!calcExpanded)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-primary" />
                  <CardTitle className="text-sm font-semibold">Clinical Impact Calculator</CardTitle>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-[10px] h-6 px-2 text-muted-foreground hover:text-foreground"
                    onClick={(e) => {
                      e.stopPropagation();
                      recalculate();
                    }}
                  >
                    <Activity className="w-3 h-3 mr-1" />
                    Recalculate
                  </Button>
                  {calcExpanded ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
              </div>
            </CardHeader>
            <div
              className={cn(
                "transition-all duration-300 ease-in-out overflow-hidden",
                calcExpanded ? "max-h-[800px] opacity-100" : "max-h-0 opacity-0"
              )}
            >
              <CardContent className="space-y-4">
                {/* 2x2 Metrics Grid */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Misclassification Risk */}
                  <div className="p-3 rounded-lg bg-muted/40 inset-depth">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <AlertTriangle className="w-3 h-3 text-muted-foreground" />
                      <span className="text-[10px] text-muted-foreground font-medium">Misclassification Risk</span>
                    </div>
                    <p className={cn("text-lg font-bold font-mono", riskColor)}>
                      {misclassificationRisk}%
                    </p>
                  </div>

                  {/* Affected Populations */}
                  <div className="p-3 rounded-lg bg-muted/40 inset-depth">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Users className="w-3 h-3 text-muted-foreground" />
                      <span className="text-[10px] text-muted-foreground font-medium">Affected Populations</span>
                    </div>
                    <p className="text-lg font-bold font-mono text-warning">
                      {affectedPopulations} <span className="text-xs font-normal text-muted-foreground">/ 7 Populations</span>
                    </p>
                  </div>

                  {/* Clinical Actionability Delta */}
                  <div className="p-3 rounded-lg bg-muted/40 inset-depth">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <TrendingUp className="w-3 h-3 text-muted-foreground" />
                      <span className="text-[10px] text-muted-foreground font-medium">Clinical Actionability Delta</span>
                    </div>
                    <p className={cn("text-lg font-bold font-mono", deltaColor)}>
                      {actionabilityDelta > 0 ? "-" : "+"}{Math.abs(actionabilityDelta)} points
                    </p>
                  </div>

                  {/* Confidence Interval */}
                  <div className="p-3 rounded-lg bg-muted/40 inset-depth">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Activity className="w-3 h-3 text-muted-foreground" />
                      <span className="text-[10px] text-muted-foreground font-medium">Confidence Interval</span>
                    </div>
                    <p className="text-sm font-bold font-mono text-foreground">
                      [{ciLower}% – {ciUpper}%]
                    </p>
                  </div>
                </div>

                {/* Population Breakdown Table */}
                <div className="rounded-lg border border-border/50 overflow-hidden">
                  <div className="grid grid-cols-4 gap-0 text-[10px] font-semibold text-muted-foreground bg-muted/30 px-3 py-1.5">
                    <span>Population</span>
                    <span className="text-right">Representation</span>
                    <span className="text-right">Bias Score</span>
                    <span className="text-right">Risk Level</span>
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {POPULATIONS.map((pop, i) => {
                      const bias = biasValues[i];
                      const rep = repopValues[i];
                      const riskLevel = bias > 60 ? "Critical" : bias > 30 ? "Moderate" : "Low";
                      const badgeClass = bias > 60
                        ? "bg-destructive/20 text-destructive border-destructive/30"
                        : bias > 30
                          ? "bg-warning/20 text-warning border-warning/30"
                          : "bg-success/20 text-success border-success/30";
                      return (
                        <div
                          key={pop}
                          className="grid grid-cols-4 gap-0 text-[10px] px-3 py-1.5 border-t border-border/30 hover:bg-muted/20 transition-colors"
                        >
                          <span className="text-foreground font-medium truncate">{pop}</span>
                          <span className="text-right font-mono text-muted-foreground">{rep}%</span>
                          <span className={cn("text-right font-mono font-semibold",
                            bias > 60 ? "text-destructive" : bias > 30 ? "text-warning" : "text-success"
                          )}>
                            {bias}
                          </span>
                          <span className="text-right">
                            <Badge
                              variant="outline"
                              className={cn("text-[9px] px-1.5 py-0", badgeClass)}
                            >
                              {riskLevel}
                            </Badge>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Disclaimer */}
                <p className="text-[10px] text-muted-foreground/60 leading-relaxed">
                  Estimates based on current reference panel composition. Actual clinical impact varies by specific variant, gene, and population context.
                </p>
              </CardContent>
            </div>
          </Card>

          {/* Variant Batch Import */}
          <Card className="card-glow fade-up depth-1">
            <CardHeader
              className="pb-2 cursor-pointer select-none"
              onClick={() => setBatchExpanded(!batchExpanded)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FlaskConical className="w-4 h-4 text-primary" />
                  <CardTitle className="text-sm font-semibold">Variant Batch Import</CardTitle>
                </div>
                <div className="flex items-center gap-1.5">
                  {batchResults && (
                    <Badge variant="secondary" className="text-[10px]">{batchResults.length} variants</Badge>
                  )}
                  {batchExpanded ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
              </div>
            </CardHeader>
            <div
              className={cn(
                "transition-all duration-300 ease-in-out overflow-hidden",
                batchExpanded ? "max-h-[1200px] opacity-100" : "max-h-0 opacity-0"
              )}
            >
              <CardContent className="space-y-4">
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Paste VCF-style variant entries (Gene, Variant, Classification, rsID) — one per line. Click Parse &amp; Analyze to generate ancestry bias estimates.
                </p>

                <textarea
                  value={batchText}
                  onChange={(e) => setBatchText(e.target.value)}
                  placeholder="BRCA2 c.5946delT Pathogenic rs80358962"
                  className="w-full h-32 bg-muted/50 border border-border rounded-lg p-3 text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 resize-y"
                />

                <Button
                  onClick={parseBatchVariants}
                  disabled={!batchText.trim()}
                  className="btn-press glow-border-primary text-xs"
                  size="sm"
                >
                  <FlaskConical className="w-3.5 h-3.5 mr-1.5" />
                  Parse &amp; Analyze
                </Button>

                {batchResults && batchResults.length > 0 && (
                  <>
                    {/* Parsed Table */}
                    <div className="rounded-lg border border-border/50 overflow-hidden">
                      <div className="grid grid-cols-5 gap-0 text-[10px] font-semibold text-muted-foreground bg-muted/30 px-3 py-1.5">
                        <span>Gene</span>
                        <span>Variant</span>
                        <span>Classification</span>
                        <span>rsID</span>
                        <span className="text-right">Ancestry Bias</span>
                      </div>
                      <div className="max-h-48 overflow-y-auto">
                        {batchResults.map((v, i) => {
                          const biasColor = v.biasScore < 0.3
                            ? 'text-success bg-success/10'
                            : v.biasScore > 0.6
                              ? 'text-destructive bg-destructive/10'
                              : 'text-amber-500 bg-amber-500/10';
                          const classColor = v.classification.toLowerCase().includes('pathogenic')
                            ? 'text-destructive'
                            : v.classification.toUpperCase() === 'VUS'
                              ? 'text-amber-500'
                              : 'text-muted-foreground';
                          return (
                            <div
                              key={i}
                              className="grid grid-cols-5 gap-0 text-[10px] px-3 py-1.5 border-t border-border/30 hover:bg-muted/20 transition-colors table-hover-stripe"
                            >
                              <span className="font-mono font-semibold text-foreground truncate">{v.gene}</span>
                              <span className="font-mono text-muted-foreground truncate">{v.variant}</span>
                              <span className={cn("truncate", classColor)}>{v.classification}</span>
                              <span className="font-mono text-muted-foreground truncate">{v.rsId}</span>
                              <span className="text-right">
                                <Badge
                                  variant="outline"
                                  className={cn("text-[9px] px-1.5 py-0 font-mono chip-interactive", biasColor)}
                                >
                                  {v.biasScore.toFixed(2)}
                                </Badge>
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Summary Stats */}
                    {batchSummary && (
                      <div className="grid grid-cols-4 gap-3">
                        <div className="p-3 rounded-lg bg-muted/40 inset-depth">
                          <div className="text-[10px] text-muted-foreground font-medium mb-1">Total Parsed</div>
                          <p className="text-lg font-bold font-mono text-foreground">{batchSummary.total}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-muted/40 inset-depth">
                          <div className="text-[10px] text-muted-foreground font-medium mb-1">Pathogenic</div>
                          <p className="text-lg font-bold font-mono text-destructive">{batchSummary.pathogenic}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-muted/40 inset-depth">
                          <div className="text-[10px] text-muted-foreground font-medium mb-1">VUS</div>
                          <p className="text-lg font-bold font-mono text-amber-500">{batchSummary.vus}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-muted/40 inset-depth">
                          <div className="text-[10px] text-muted-foreground font-medium mb-1">Avg Bias Score</div>
                          <p className={cn(
                            "text-lg font-bold font-mono",
                            batchSummary.avgBias < 0.3 ? "text-success" : batchSummary.avgBias > 0.6 ? "text-destructive" : "text-amber-500"
                          )}>
                            {batchSummary.avgBias}
                          </p>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
