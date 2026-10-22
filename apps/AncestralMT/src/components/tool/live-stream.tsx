"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Radio, Pause, Play, Trash2, Activity, Dna, AlertTriangle,
  Zap, TrendingUp, Users, Globe, Wifi, WifiOff,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface LiveVariant {
  id: string;
  gene: string;
  variant: string;
  classification: string;
  populationFrequency: number;
  referenceFrequency: number;
  ancestryBiasScore: number;
  population: string;
  cancerType: string;
  timestamp: string;
}

interface StreamSummary {
  totalProcessed: number;
  highBiasDetected: number;
  criticalAlerts: number;
  populationsMonitored: number;
  activeStreams: number;
}

const classColors: Record<string, string> = {
  Pathogenic: "text-destructive bg-destructive/15 border-destructive/30",
  "Likely Pathogenic": "text-warning bg-warning/15 border-warning/30",
  VUS: "text-chart-3 bg-chart-3/15 border-chart-3/30",
  "Likely Benign": "text-success bg-success/15 border-success/30",
  Benign: "text-muted-foreground bg-muted/50 border-border/50",
};

const populationColors: Record<string, string> = {
  European: "oklch(0.65 0.15 175)",
  African: "oklch(0.6 0.18 60)",
  "Hispanic/Latino": "oklch(0.7 0.16 45)",
  "East Asian": "oklch(0.6 0.2 300)",
  "South Asian": "oklch(0.7 0.15 140)",
  "AI/AN": "oklch(0.65 0.2 25)",
  "Pacific Islander": "oklch(0.55 0.15 250)",
};

export function LiveStreamView() {
  const [streaming, setStreaming] = useState(false);
  const [paused, setPaused] = useState(false);
  const [variants, setVariants] = useState<LiveVariant[]>([]);
  const [summary, setSummary] = useState<StreamSummary | null>(null);
  const [totalSeen, setTotalSeen] = useState(0);
  const [highBiasCount, setHighBiasCount] = useState(0);
  const [activeTab, setActiveTab] = useState<"all" | "high-bias" | "pathogenic">("all");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const MAX_VARIANTS = 80;

  const startStream = useCallback(() => {
    if (streaming) return;
    setStreaming(true);
    setPaused(false);

    // Fetch immediately
    fetch("/api/live-stream")
      .then((r) => r.json())
      .then((data) => {
        setSummary(data.summary);
        const newVars = data.variants as LiveVariant[];
        setVariants((prev) => [...newVars, ...prev].slice(0, MAX_VARIANTS));
        setTotalSeen((prev) => prev + newVars.length);
        setHighBiasCount((prev) => prev + newVars.filter((v) => v.ancestryBiasScore > 0.5).length);
      })
      .catch(() => {});

    // Poll every 1.5 seconds
    intervalRef.current = setInterval(() => {
      fetch("/api/live-stream")
        .then((r) => r.json())
        .then((data) => {
          setSummary(data.summary);
          const newVars = data.variants as LiveVariant[];
          setVariants((prev) => [...newVars, ...prev].slice(0, MAX_VARIANTS));
          setTotalSeen((prev) => prev + newVars.length);
          setHighBiasCount((prev) => prev + newVars.filter((v) => v.ancestryBiasScore > 0.5).length);
        })
        .catch(() => {});
    }, 1500);
  }, [streaming]);

  const stopStream = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setStreaming(false);
    setPaused(false);
  }, []);

  const togglePause = useCallback(() => {
    if (paused) {
      // Resume: restart polling
      setPaused(false);
      intervalRef.current = setInterval(() => {
        fetch("/api/live-stream")
          .then((r) => r.json())
          .then((data) => {
            setSummary(data.summary);
            const newVars = data.variants as LiveVariant[];
            setVariants((prev) => [...newVars, ...prev].slice(0, MAX_VARIANTS));
            setTotalSeen((prev) => prev + newVars.length);
            setHighBiasCount((prev) => prev + newVars.filter((v) => v.ancestryBiasScore > 0.5).length);
          })
          .catch(() => {});
      }, 1500);
    } else {
      // Pause: stop polling
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setPaused(true);
    }
  }, [paused]);

  const clearStream = () => {
    setVariants([]);
    setTotalSeen(0);
    setHighBiasCount(0);
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const filtered = activeTab === "all"
    ? variants
    : activeTab === "high-bias"
      ? variants.filter((v) => v.ancestryBiasScore > 0.5)
      : variants.filter((v) => v.classification === "Pathogenic" || v.classification === "Likely Pathogenic");

  const biasRate = totalSeen > 0 ? ((highBiasCount / totalSeen) * 100).toFixed(1) : "0.0";

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-4">
      {/* Connection Controls */}
      <Card className="card-glow">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                streaming && !paused ? "bg-success/15" : paused ? "bg-warning/15" : "bg-muted/50"
              )}>
                {streaming && !paused ? (
                  <Wifi className="w-5 h-5 text-success" />
                ) : paused ? (
                  <Pause className="w-5 h-5 text-warning" />
                ) : (
                  <WifiOff className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
              <div>
                <p className="text-sm font-semibold flex items-center gap-2">
                  Mutation Stream
                  {streaming && !paused && (
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-success status-pulse" />
                      <span className="text-[10px] text-success font-normal">LIVE</span>
                    </span>
                  )}
                  {paused && (
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-warning status-dot-pulse" />
                      <span className="text-[10px] text-warning font-normal">PAUSED</span>
                    </span>
                  )}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  Real-time ancestry-biased variant detection pipeline (1.5s polling)
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!streaming ? (
                <Button size="sm" className="text-xs" onClick={startStream}>
                  <Radio className="w-3.5 h-3.5 mr-1.5" /> Start Stream
                </Button>
              ) : (
                <>
                  <Button size="sm" variant="outline" className="text-xs" onClick={togglePause}>
                    {paused ? <><Play className="w-3.5 h-3.5 mr-1.5" /> Resume</> : <><Pause className="w-3.5 h-3.5 mr-1.5" /> Pause</>}
                  </Button>
                  <Button size="sm" variant="destructive" className="text-xs" onClick={stopStream}>
                    <WifiOff className="w-3.5 h-3.5 mr-1.5" /> Stop
                  </Button>
                </>
              )}
              <Button size="sm" variant="ghost" className="text-xs" onClick={clearStream}>
                <Trash2 className="w-3.5 h-3.5 mr-1" /> Clear
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3 flex items-center gap-2.5">
            <Activity className="w-4 h-4 text-primary" />
            <div>
              <p className="text-lg font-bold font-mono">{totalSeen}</p>
              <p className="text-[10px] text-muted-foreground">Total Processed</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-destructive/20">
          <CardContent className="p-3 flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-destructive" />
            <div>
              <p className="text-lg font-bold font-mono text-destructive">{highBiasCount}</p>
              <p className="text-[10px] text-muted-foreground">High-Bias (&gt;50%)</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 flex items-center gap-2.5">
            <TrendingUp className="w-4 h-4 text-warning" />
            <div>
              <p className="text-lg font-bold font-mono">{biasRate}%</p>
              <p className="text-[10px] text-muted-foreground">Bias Detection Rate</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 flex items-center gap-2.5">
            <Globe className="w-4 h-4 text-primary" />
            <div>
              <p className="text-lg font-bold font-mono">7</p>
              <p className="text-[10px] text-muted-foreground">Pop. Monitored</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stream View */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
        {/* Stream Feed */}
        <div className="xl:col-span-3">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Zap className="w-4 h-4 text-primary" />
                    Variant Stream
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Showing {filtered.length} of {variants.length} variants
                  </CardDescription>
                </div>
                <div className="flex gap-1">
                  {(["all", "high-bias", "pathogenic"] as const).map((tab) => (
                    <Button
                      key={tab}
                      size="sm"
                      variant={activeTab === tab ? "default" : "ghost"}
                      className={cn("text-[10px] h-7 px-2", activeTab !== tab && "text-muted-foreground")}
                      onClick={() => setActiveTab(tab)}
                    >
                      {tab === "all" ? "All" : tab === "high-bias" ? "High Bias" : "Pathogenic"}
                    </Button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {!streaming && variants.length === 0 ? (
                <div className="py-16 text-center">
                  <Radio className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
                  <p className="text-xs text-muted-foreground">Connect to start the live variant stream</p>
                  <p className="text-[10px] text-muted-foreground/50 mt-1">Simulated pipeline generates 1-3 variants every 1.5 seconds</p>
                </div>
              ) : (
                <div className="max-h-[500px] overflow-y-auto space-y-1.5 pr-1">
                  {filtered.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-8">No variants in this category yet</p>
                  ) : (
                    filtered.map((v, i) => {
                      const isNew = i < 3 && !paused;
                      return (
                        <div
                          key={v.id}
                          className={cn(
                            "p-2.5 rounded-lg border transition-all",
                            isNew && "view-fade-in",
                            v.ancestryBiasScore > 0.7
                              ? "border-destructive/20 bg-destructive/5"
                              : v.ancestryBiasScore > 0.4
                                ? "border-warning/20 bg-warning/5"
                                : "border-border/30 bg-muted/30"
                          )}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              <div
                                className="w-1.5 h-8 rounded-full shrink-0"
                                style={{ backgroundColor: populationColors[v.population] || "oklch(0.4 0.02 250)" }}
                              />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-xs font-mono font-semibold">{v.gene}</span>
                                  <span className="text-[10px] font-mono text-muted-foreground">{v.variant}</span>
                                  <Badge
                                    variant="outline"
                                    className={cn("text-[9px] px-1.5 py-0", classColors[v.classification])}
                                  >
                                    {v.classification}
                                  </Badge>
                                  {v.ancestryBiasScore > 0.7 && (
                                    <Badge variant="destructive" className="text-[8px] px-1 py-0 animate-pulse-slow">CRITICAL</Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 mt-1">
                                  <span className="text-[9px] text-muted-foreground">{v.cancerType}</span>
                                  <span className="text-[9px]" style={{ color: populationColors[v.population] }}>
                                    {v.population}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <div className="text-right">
                                <div className="flex items-center gap-1.5">
                                  <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                                    <div
                                      className="h-full rounded-full transition-all"
                              style={{
                                width: `${v.ancestryBiasScore * 100}%`,
                                backgroundColor: v.ancestryBiasScore > 0.7 ? "oklch(0.65 0.22 25)" : v.ancestryBiasScore > 0.4 ? "oklch(0.7 0.16 45)" : "oklch(0.65 0.15 175)",
                              }}
                            />
                                  </div>
                                  <span className="text-[10px] font-mono font-bold" style={{
                                    color: v.ancestryBiasScore > 0.7 ? "oklch(0.65 0.22 25)" : v.ancestryBiasScore > 0.4 ? "oklch(0.7 0.16 45)" : "oklch(0.65 0.15 175)",
                                  }}>
                                    {(v.ancestryBiasScore * 100).toFixed(0)}%
                                  </span>
                                </div>
                                <p className="text-[8px] text-muted-foreground/60 mt-0.5">
                                  {new Date(v.timestamp).toLocaleTimeString()}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Side Panel: Population Distribution */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-primary" />
                Population Distribution
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {Object.entries(populationColors).map(([pop, color]) => {
                  const count = variants.filter((v) => v.population === pop).length;
                  const pct = variants.length > 0 ? ((count / variants.length) * 100).toFixed(0) : "0";
                  return (
                    <div key={pop} className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                      <span className="text-[10px] text-muted-foreground flex-1 truncate">{pop}</span>
                      <span className="text-[10px] font-mono font-medium">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold flex items-center gap-1.5">
                <Dna className="w-3.5 h-3.5 text-warning" />
                Classification Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {['Pathogenic', 'Likely Pathogenic', 'VUS', 'Likely Benign', 'Benign'].map((cls) => {
                  const count = variants.filter((v) => v.classification === cls).length;
                  return (
                    <div key={cls} className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground">{cls}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: variants.length > 0 ? `${(count / variants.length) * 100}%` : "0%",
                            }}
                          />
                        </div>
                        <span className="text-[10px] font-mono w-6 text-right">{count}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="border-primary/20">
            <CardContent className="p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <Dna className="w-3.5 h-3.5 text-primary" />
                <span className="text-[10px] font-semibold">Stream Info</span>
              </div>
              <div className="space-y-1.5 text-[10px] text-muted-foreground">
                <div className="flex justify-between">
                  <span>Polling interval</span>
                  <span className="font-mono">1.5s</span>
                </div>
                <div className="flex justify-between">
                  <span>Buffer size</span>
                  <span className="font-mono">{MAX_VARIANTS}</span>
                </div>
                <div className="flex justify-between">
                  <span>Genes tracked</span>
                  <span className="font-mono">35</span>
                </div>
                <div className="flex justify-between">
                  <span>Cancer types</span>
                  <span className="font-mono">9</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
