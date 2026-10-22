"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FileText, AlertTriangle, Lightbulb, ChevronDown, ChevronUp,
  Download, CheckCircle2, Clock, Target, FileSpreadsheet, Braces,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Report {
  id: string;
  title: string;
  cancerType: string | null;
  overallDiversityScore: number;
  underrepresentedPops: string;
  recommendations: string;
  status: string;
  createdAt: string;
  dataset?: { name: string };
}

export function ReportsView() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/gap-reports").then((r) => r.json()).then((d) => { setReports(d.data); setLoading(false); });
  }, []);

  const avgScore = reports.length > 0 ? reports.reduce((s, r) => s + r.overallDiversityScore, 0) / reports.length : 0;
  const criticalReports = reports.filter((r) => r.overallDiversityScore < 30).length;

  const exportCSV = (report: Report) => {
    const underrep: string[] = JSON.parse(report.underrepresentedPops);
    const recs: string[] = JSON.parse(report.recommendations);
    const rows = [
      ["Field", "Value"],
      ["Report Title", report.title],
      ["Cancer Type", report.cancerType || "Multiple"],
      ["Diversity Score", report.overallDiversityScore.toFixed(1)],
      ["Status", report.status],
      ["Dataset", report.dataset?.name || "N/A"],
      ["Date", new Date(report.createdAt).toLocaleDateString()],
      ["Underrepresented Populations", underrep.join(", ")],
      ["Recommendations", recs.join("; ")],
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"]`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `diversity-report-${report.id.slice(0, 8)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV report exported");
  };

  const exportJSON = (report: Report) => {
    const data = {
      ...report,
      underrepresentedPops: JSON.parse(report.underrepresentedPops),
      recommendations: JSON.parse(report.recommendations),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `diversity-report-${report.id.slice(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("JSON report exported");
  };

  const exportAllCSV = () => {
    const rows = [
      ["Title", "Cancer Type", "Diversity Score", "Status", "Dataset", "Date", "Underrepresented Populations", "Recommendations"],
      ...reports.map((r) => [
        r.title,
        r.cancerType || "Multiple",
        r.overallDiversityScore.toFixed(1),
        r.status,
        r.dataset?.name || "N/A",
        new Date(r.createdAt).toLocaleDateString(),
        JSON.parse(r.underrepresentedPops).join("; "),
        JSON.parse(r.recommendations).join("; "),
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"]`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "all-diversity-reports.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${reports.length} reports as CSV`);
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-28 bg-muted rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="card-highlight-top stat-accent-bar fade-up">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xl font-bold">{reports.length}</p>
              <p className="text-[10px] text-muted-foreground">Total Reports</p>
            </div>
          </CardContent>
        </Card>
        <Card className="card-gradient-destructive card-highlight-top stat-accent-bar fade-up fade-up-d1">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-destructive/15 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <p className="text-xl font-bold text-destructive">{criticalReports}</p>
              <p className="text-[10px] text-muted-foreground">Critical (&lt;30 score)</p>
            </div>
          </CardContent>
        </Card>
        <Card className="card-gradient-amber card-highlight-top stat-accent-bar fade-up fade-up-d2">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-warning/15 flex items-center justify-center">
              <Target className="w-5 h-5 text-warning" />
            </div>
            <div>
              <p className={"text-xl font-bold"} style={{ color: avgScore > 50 ? "oklch(0.65 0.15 175)" : "oklch(0.65 0.22 25)" }}>{avgScore.toFixed(1)}</p>
              <p className="text-[10px] text-muted-foreground">Avg. Diversity Score</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reports List Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Diversity Assessment Reports</h3>
        <Button variant="outline" size="sm" className="text-xs" onClick={exportAllCSV}>
          <FileSpreadsheet className="w-3.5 h-3.5 mr-1" /> Export All CSV
        </Button>
      </div>
      <div className="space-y-4">
        {reports.map((report) => {
          const isExpanded = expandedId === report.id;
          const underrep: string[] = JSON.parse(report.underrepresentedPops);
          const recs: string[] = JSON.parse(report.recommendations);
          const scoreColor = report.overallDiversityScore >= 60 ? "oklch(0.65 0.15 175)" : report.overallDiversityScore >= 30 ? "oklch(0.7 0.16 45)" : "oklch(0.65 0.22 25)";

          return (
            <Card key={report.id} className={cn("depth-1 hover-lift transition-all duration-200", report.overallDiversityScore < 30 && "glow-border-destructive")}>
              <CardContent className="p-0">
                <button
                  className="w-full p-4 flex items-center justify-between text-left hover:bg-muted/30 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : report.id)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: scoreColor + "20" }}>
                      <span className="text-sm font-bold" style={{ color: scoreColor }}>{report.overallDiversityScore.toFixed(0)}</span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-xs font-semibold truncate">{report.title}</h3>
                        <Badge variant={report.status === "finalized" ? "default" : "secondary"} className="text-[9px] shrink-0">
                          {report.status === "finalized" ? <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" /> : <Clock className="w-2.5 h-2.5 mr-0.5" />}
                          {report.status}
                        </Badge>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {report.dataset?.name || "Dataset removed"} · {report.cancerType || "Multiple"} · {new Date(report.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-4">
                    <div className="text-right hidden sm:block">
                      <p className="text-[9px] text-muted-foreground">Diversity Score</p>
                      <p className="text-sm font-bold" style={{ color: scoreColor }}>{report.overallDiversityScore}/100</p>
                    </div>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-border/50 pt-4 space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-muted-foreground">Overall Diversity Score</span>
                        <span className="text-xs font-bold" style={{ color: scoreColor }}>{report.overallDiversityScore.toFixed(1)} / 100</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${report.overallDiversityScore}%`, backgroundColor: scoreColor }} />
                      </div>
                      <div className="flex justify-between mt-1">
                        <span className="text-[8px] text-destructive">Critical &lt;30</span>
                        <span className="text-[8px] text-warning">Moderate 30-60</span>
                        <span className="text-[8px] text-success">Good ≥60</span>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-xs font-semibold mb-2 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-warning" />
                        Underrepresented Populations ({underrep.length})
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {underrep.map((pop) => (
                          <Badge key={pop} variant="outline" className="text-[10px] border-warning/40 text-warning badge-hover chip-interactive">{pop}</Badge>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-xs font-semibold mb-2 flex items-center gap-1.5">
                        <Lightbulb className="w-3.5 h-3.5 text-primary" />
                        Recommendations ({recs.length})
                      </h4>
                      <div className="space-y-2">
                        {recs.map((rec, i) => (
                          <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-muted/40 hover:bg-muted/60 transition-colors">
                            <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[9px] font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                            <p className="text-xs text-muted-foreground leading-relaxed">{rec}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      <Button variant="outline" size="sm" className="text-xs" onClick={() => exportCSV(report)}>
                        <FileSpreadsheet className="w-3 h-3 mr-1" /> Export CSV
                      </Button>
                      <Button variant="outline" size="sm" className="text-xs" onClick={() => exportJSON(report)}>
                        <Braces className="w-3 h-3 mr-1" /> Export JSON
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}