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
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Building2, Plus, MapPin, Package, CheckCircle2, Clock, FileCheck, Link2,
} from "lucide-react";
import { toast } from "sonner";

interface Submission {
  id: string;
  institutionName: string;
  location: string;
  sampleCount: number;
  cancerTypes: string;
  ancestries: string;
  status: string;
  contactEmail: string | null;
  notes: string | null;
  createdAt: string;
}

const statusIcons: Record<string, React.ElementType> = {
  submitted: Clock,
  reviewed: FileCheck,
  approved: CheckCircle2,
  integrated: Link2,
};

const statusColors: Record<string, string> = {
  submitted: "oklch(0.7 0.16 45)",
  reviewed: "oklch(0.6 0.2 300)",
  approved: "oklch(0.65 0.15 175)",
  integrated: "oklch(0.65 0.15 155)",
};

export function BiobankPortalView() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    fetch("/api/biobank").then((r) => r.json()).then((d) => { setSubmissions(d.data); setLoading(false); });
  }, []);

  const statusCounts = { submitted: 0, reviewed: 0, approved: 0, integrated: 0 };
  submissions.forEach((s) => { if (statusCounts[s.status as keyof typeof statusCounts] !== undefined) statusCounts[s.status as keyof typeof statusCounts]++; });

  const totalSamples = submissions.reduce((s, b) => s + b.sampleCount, 0);

  const updateStatus = async (id: string, status: string) => {
    const res = await fetch("/api/biobank", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    if (res.ok) {
      setSubmissions((prev) => prev.map((s) => (s.id === id ? { ...s, status } : s)));
      toast.success(`Submission advanced to "${status}"`);
    } else {
      toast.error("Failed to update submission status");
    }
  };

  const addSubmission = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const cancerTypes = (fd.get("cancerTypes") as string || "").split(",").map((s) => s.trim()).filter(Boolean);
    const ancestries = (fd.get("ancestries") as string || "").split(",").map((s) => s.trim()).filter(Boolean);
    const res = await fetch("/api/biobank", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        institutionName: fd.get("institutionName"),
        location: fd.get("location"),
        sampleCount: parseInt(fd.get("sampleCount") as string),
        cancerTypes,
        ancestries,
        contactEmail: fd.get("contactEmail"),
        notes: fd.get("notes"),
      }),
    });
    if (res.ok) {
      const d = await res.json();
      setSubmissions((prev) => [d.data, ...prev]);
      setShowAdd(false);
      toast.success(`New submission from "${fd.get("institutionName")}" registered`);
    } else {
      toast.error("Failed to create submission");
    }
  };

  if (loading) {
    return <div className="p-6"><div className="animate-pulse space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-muted rounded-xl" />)}</div></div>;
  }

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      {/* Pipeline Overview */}
      <Card className="card-glow">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold">Submission Pipeline</h3>
            </div>
            <Badge variant="outline" className="text-[10px]">{submissions.length} institutions</Badge>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {(["submitted", "reviewed", "approved", "integrated"] as const).map((status, i) => {
              const Icon = statusIcons[status];
              return (
                <React.Fragment key={status}>
                  <div className="flex flex-col items-center p-3 rounded-lg bg-muted/40">
                    <Icon className="w-5 h-5 mb-1.5" style={{ color: statusColors[status] }} />
                    <p className="text-lg font-bold">{statusCounts[status]}</p>
                    <p className="text-[10px] text-muted-foreground capitalize">{status}</p>
                  </div>
                  {i < 3 && <div className="flex items-center justify-center text-muted-foreground/40">→</div>}
                </React.Fragment>
              );
            })}
          </div>
          <p className="text-[10px] text-muted-foreground mt-3">Total samples across all submissions: <span className="font-medium text-foreground">{totalSamples.toLocaleString()}</span></p>
        </CardContent>
      </Card>

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Institution Submissions</h3>
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild>
            <Button size="sm" className="text-xs"><Plus className="w-3.5 h-3.5 mr-1" /> New Submission</Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-sm">Submit Biobank Data</DialogTitle>
              <DialogDescription className="text-xs">Register a new community or institutional biobank for integration into the diversity analysis pipeline.</DialogDescription>
            </DialogHeader>
            <form onSubmit={addSubmission} className="space-y-3">
              <div><Label className="text-xs">Institution Name *</Label><Input name="institutionName" required className="h-8 text-xs mt-1" /></div>
              <div><Label className="text-xs">Location *</Label><Input name="location" required className="h-8 text-xs mt-1" placeholder="City, State" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">Sample Count *</Label><Input name="sampleCount" type="number" required className="h-8 text-xs mt-1" /></div>
                <div><Label className="text-xs">Contact Email</Label><Input name="contactEmail" type="email" className="h-8 text-xs mt-1" /></div>
              </div>
              <div><Label className="text-xs">Cancer Types (comma-separated)</Label><Input name="cancerTypes" className="h-8 text-xs mt-1" placeholder="Breast, Lung, Colorectal" /></div>
              <div><Label className="text-xs">Ancestries Represented (comma-separated)</Label><Input name="ancestries" className="h-8 text-xs mt-1" placeholder="African, Hispanic/Latino, European" /></div>
              <div><Label className="text-xs">Notes</Label><Textarea name="notes" className="text-xs mt-1 min-h-[50px]" /></div>
              <DialogFooter><Button type="submit" size="sm" className="text-xs">Submit</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="rounded-lg overflow-hidden max-h-[500px] overflow-y-auto table-sticky-head">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="text-[10px] font-semibold">Institution</TableHead>
                  <TableHead className="text-[10px] font-semibold">Location</TableHead>
                  <TableHead className="text-[10px] font-semibold">Samples</TableHead>
                  <TableHead className="text-[10px] font-semibold">Cancer Types</TableHead>
                  <TableHead className="text-[10px] font-semibold">Ancestries</TableHead>
                  <TableHead className="text-[10px] font-semibold">Status</TableHead>
                  <TableHead className="text-[10px] font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {submissions.map((s) => {
                  const cancerTypes: string[] = JSON.parse(s.cancerTypes);
                  const ancestries: string[] = JSON.parse(s.ancestries);
                  return (
                    <TableRow key={s.id} className="data-table-row">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <div>
                            <p className="text-xs font-medium">{s.institutionName}</p>
                            {s.contactEmail && <p className="text-[9px] text-muted-foreground">{s.contactEmail}</p>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs"><div className="flex items-center gap-1"><MapPin className="w-3 h-3 text-muted-foreground" />{s.location}</div></TableCell>
                      <TableCell className="text-xs font-mono font-medium">{s.sampleCount.toLocaleString()}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1 max-w-[160px]">
                          {cancerTypes.slice(0, 3).map((ct) => <Badge key={ct} variant="secondary" className="text-[9px] px-1 py-0">{ct}</Badge>)}
                          {cancerTypes.length > 3 && <Badge variant="secondary" className="text-[9px] px-1 py-0">+{cancerTypes.length - 3}</Badge>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1 max-w-[160px]">
                          {ancestries.slice(0, 2).map((a) => <Badge key={a} variant="outline" className="text-[9px] px-1 py-0">{a}</Badge>)}
                          {ancestries.length > 2 && <Badge variant="outline" className="text-[9px] px-1 py-0">+{ancestries.length - 2}</Badge>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className="text-[9px]" style={{ backgroundColor: statusColors[s.status] + "20", color: statusColors[s.status], border: `1px solid ${statusColors[s.status]}40` }}>
                          {s.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {s.status !== "integrated" && (
                          <Button variant="ghost" size="sm" className="text-[10px] h-6" onClick={() => {
                            const nextStatus = s.status === "submitted" ? "reviewed" : s.status === "reviewed" ? "approved" : "integrated";
                            updateStatus(s.id, nextStatus);
                          }}>
                            Advance →
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
