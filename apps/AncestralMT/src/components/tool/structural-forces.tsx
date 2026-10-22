"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";
import {
  Building2, MapPin, Shield, Heart, Users, BookOpen,
  AlertTriangle, TrendingDown, Globe, Lock, Handshake, GraduationCap,
  Microscope, ArrowRight, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ForceItem {
  title: string;
  icon: React.ElementType;
  severity: "critical" | "high" | "moderate";
  description: string;
  dataPoints: { label: string; value: string }[];
  impact: string;
}

const structuralForces: ForceItem[] = [
  {
    title: "Institutional Concentration",
    icon: Building2,
    severity: "critical",
    description:
      "Cancer genomic sequencing is concentrated in elite academic medical centers, which disproportionately serve White, urban, and insured populations. Community hospitals, safety-net facilities, and rural oncology centers—which serve the most diverse patient populations—lack the infrastructure for comprehensive genomic profiling.",
    dataPoints: [
      { label: "Academic center sequencing capacity", value: "85% of NGS panels" },
      { label: "Community hospital genomic access", value: "<15%" },
      { label: "Rural oncology centers with profiling", value: "<5%" },
    ],
    impact:
      "Patients at non-academic centers are systematically excluded from genomic research pipelines, creating a structural filter that removes diverse populations before data collection begins.",
  },
  {
    title: "Geographic & Access Barriers",
    icon: MapPin,
    severity: "critical",
    description:
      "Physical distance to sequencing centers, lack of transportation, and geographic isolation prevent participation in genomic studies. Rural communities, particularly in the South and Appalachia, face compounding barriers of distance and healthcare deserts.",
    dataPoints: [
      { label: "Rural residents in cancer genomic studies", value: "<3%" },
      { label: "Average travel distance to NGS center", value: "127 miles" },
      { label: "Cancer patients in rural oncology deserts", value: "~20M" },
    ],
    impact:
      "Geographic barriers create a spatial filter that removes rural, Southern, and economically disadvantaged populations from genomic datasets.",
  },
  {
    title: "Trust & Historical Barriers",
    icon: Shield,
    severity: "critical",
    description:
      "Historical research abuses—including the Tuskegee Syphilis Study, Henrietta Lacks, and unauthorized use of tribal genetic data—have created deep, intergenerational mistrust of medical research in African American, Indigenous, and Latino communities.",
    dataPoints: [
      { label: "African Americans expressing research mistrust", value: "62%" },
      { label: "Decline in clinical trial participation", value: "-30% since 2001" },
      { label: "Tuskegee impact duration", value: "3+ generations" },
    ],
    impact:
      "Even when geographic and institutional barriers are addressed, trust barriers prevent voluntary participation in genomic studies.",
  },
  {
    title: "Tribal & Indigenous Underrepresentation",
    icon: Heart,
    severity: "critical",
    description:
      "American Indian and Alaska Native (AI/AN) populations face unique barriers including tribal sovereignty concerns over genetic data, the Native American Graves Protection and Repatriation Act (NAGPRA) implications for DNA, and the history of genetic research conducted without tribal consent.",
    dataPoints: [
      { label: "AI/AN in cancer genomic databases", value: "<0.2%" },
      { label: "Tribes with genomic data policies", value: "~15 of 574" },
      { label: "AI/AN cancer mortality disparity", value: "+18% vs. White" },
    ],
    impact:
      "AI/AN populations have the poorest cancer outcomes partly because genomic data gaps mean clinicians have less actionable information for treatment decisions.",
  },
  {
    title: "Sequencing Infrastructure Costs",
    icon: Microscope,
    severity: "high",
    description:
      "Despite declining costs of sequencing technology, comprehensive genomic profiling including clinical interpretation remains expensive and is rarely covered by insurance for non-White patients at the same rates.",
    dataPoints: [
      { label: "Insurance coverage gap for NGS", value: "2.3x higher for minorities" },
      { label: "Out-of-pocket cost barrier threshold", value: "$500+" },
      { label: "Clinical sequencing adoption in underserved areas", value: "<8%" },
    ],
    impact:
      "Economic barriers interact with racial and geographic disparities to create a compounding effect on who gets sequenced and included in research databases.",
  },
  {
    title: "Genomics Literacy & Workforce",
    icon: GraduationCap,
    severity: "moderate",
    description:
      "Limited genomics literacy among patients and providers in underserved communities reduces both the demand for and the quality of genomic testing. The genomics workforce itself lacks diversity, creating cultural and communication barriers.",
    dataPoints: [
      { label: "Genetic counselors per 100K (underserved)", value: "0.3" },
      { label: "Genetic counselors per 100K (affluent)", value: "4.2" },
      { label: "Underrepresented minorities in genomics PhDs", value: "<12%" },
    ],
    impact:
      "Without culturally competent genetic counseling and diverse research leadership, communities cannot effectively advocate for or participate in genomic research.",
  },
];

const barriers: {
  from: string; to: string; label: string; icon: React.ElementType; description: string;
}[] = [
  { from: "Patient Population", to: "Sequencing Event", label: "Access Filter", icon: Lock, description: "Institutional, geographic, and economic barriers" },
  { from: "Sequencing Event", to: "Research Database", label: "Inclusion Filter", icon: ArrowRight, description: "Study design, consent, and data sharing policies" },
  { from: "Research Database", to: "Clinical Tool", label: "Representation Filter", icon: TrendingDown, description: "Reference panel composition and algorithmic training data" },
  { from: "Clinical Tool", to: "Patient Outcome", label: "Performance Filter", icon: AlertTriangle, description: "Reduced accuracy for underrepresented populations" },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

function SeverityBadge({ severity }: { severity: string }) {
  return (
    <Badge
      variant={severity === "critical" ? "destructive" : severity === "high" ? "outline" : "secondary"}
      className={cn(
        "text-[9px] px-1.5 py-0",
        severity === "high" && "border-warning/40 text-warning"
      )}
    >
      {severity === "critical" ? "Critical" : severity === "high" ? "High" : "Moderate"}
    </Badge>
  );
}

export function StructuralForcesView() {
  return (
    <div className={cn("view-fade-in p-6 max-w-[1600px] mx-auto space-y-8")}>
      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h2 className="text-xl font-bold tracking-tight">
          Structural Forces Driving the Gap
        </h2>
        <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
          The ancestral diversity gap in cancer genomics is not accidental—it is
          the product of overlapping structural, institutional, and socioeconomic
          forces that systematically filter out underrepresented populations at
          every stage of the research pipeline.
        </p>
      </motion.div>

      {/* ── Barrier Cascade Visualization ── */}
      <section>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          The Barrier Cascade
        </h3>
        <Card className="card-glow overflow-hidden">
          <CardContent className="p-5">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-center">
              {/* Source */}
              <div className="flex flex-col items-center p-3 rounded-xl bg-primary/10 border border-primary/20">
                <Users className="w-5 h-5 text-primary mb-1.5" />
                <span className="text-xs font-semibold text-primary">Patient</span>
                <span className="text-[9px] text-muted-foreground">Population</span>
              </div>

              {barriers.map((b, i) => {
                const BarrierIcon = b.icon;
                return (
                  <React.Fragment key={i}>
                    {/* Arrow + filter */}
                    <div className="flex flex-col items-center gap-1.5">
                      <motion.div
                        animate={{ x: [0, 3, 0], opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: i * 0.3 }}
                        className="text-destructive/60 text-lg font-bold hidden md:block"
                      >
                        →
                      </motion.div>
                      <motion.div
                        animate={{ y: [0, 3, 0], opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: i * 0.3 }}
                        className="text-destructive/60 text-lg font-bold md:hidden"
                      >
                        ↓
                      </motion.div>
                      <div className="text-center">
                        <div className="w-7 h-7 rounded-lg bg-destructive/15 flex items-center justify-center mx-auto mb-1">
                          <BarrierIcon className="w-3.5 h-3.5 text-destructive" />
                        </div>
                        <p className="text-[9px] font-semibold text-destructive">{b.label}</p>
                        <p className="text-[8px] text-muted-foreground max-w-[80px]">{b.description}</p>
                      </div>
                      <motion.div
                        animate={{ x: [0, 3, 0], opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: i * 0.3 + 0.5 }}
                        className="text-destructive/60 text-lg font-bold hidden md:block"
                      >
                        →
                      </motion.div>
                      <motion.div
                        animate={{ y: [0, 3, 0], opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: i * 0.3 + 0.5 }}
                        className="text-destructive/60 text-lg font-bold md:hidden"
                      >
                        ↓
                      </motion.div>
                    </div>
                    {/* Stage */}
                    <div className="flex flex-col items-center p-3 rounded-xl bg-muted/60 border border-border/50">
                      {i === 0 && <><Microscope className="w-5 h-5 text-warning mb-1.5" /><span className="text-xs font-semibold">Sequencing</span><span className="text-[9px] text-muted-foreground">Event</span></>}
                      {i === 1 && <><Globe className="w-5 h-5 text-warning mb-1.5" /><span className="text-xs font-semibold">Research</span><span className="text-[9px] text-muted-foreground">Database</span></>}
                      {i === 2 && <><BookOpen className="w-5 h-5 text-warning mb-1.5" /><span className="text-xs font-semibold">Clinical</span><span className="text-[9px] text-muted-foreground">Tool</span></>}
                      {i === 3 && <><Handshake className="w-5 h-5 text-destructive mb-1.5" /><span className="text-xs font-semibold">Patient</span><span className="text-[9px] text-muted-foreground">Outcome</span></>}
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* ── Structural Forces Detail Cards ── */}
      <section>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          Identified Structural Forces
        </h3>
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 lg:grid-cols-2 gap-5"
        >
          {structuralForces.map((force) => {
            const Icon = force.icon;
            const severityPct = force.severity === "critical" ? 95 : force.severity === "high" ? 70 : 45;
            const severityColor = force.severity === "critical" ? "oklch(0.65 0.22 25)" : force.severity === "high" ? "oklch(0.7 0.16 45)" : "oklch(0.6 0.02 250)";

            return (
              <motion.div key={force.title} variants={itemVariants}>
                <Card className="h-full flex flex-col card-glow card-highlight-top depth-1 corner-accent-tl">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: severityColor + "18" }}>
                          <Icon className="w-4 h-4" style={{ color: severityColor }} />
                        </div>
                        <CardTitle className="text-sm font-semibold">{force.title}</CardTitle>
                      </div>
                      <SeverityBadge severity={force.severity} />
                    </div>
                    <CardDescription className="text-xs leading-relaxed mt-2">
                      {force.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0 flex-1 flex flex-col gap-3">
                    {/* Data points */}
                    <div className="space-y-2">
                      {force.dataPoints.map((dp, i) => (
                        <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors">
                          <span className="text-[11px] text-muted-foreground">{dp.label}</span>
                          <span className="text-xs font-bold font-mono" style={{ color: severityColor }}>{dp.value}</span>
                        </div>
                      ))}
                    </div>

                    {/* Impact section */}
                    <div className="mt-auto p-3 rounded-lg bg-muted/30 border border-border/30 card-inner-shadow">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                        Downstream Impact
                      </p>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {force.impact}
                      </p>
                    </div>

                    {/* Severity bar */}
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] text-muted-foreground w-12">Severity</span>
                      <Progress value={severityPct} className="h-1.5 flex-1" />
                      <span className="text-[9px] font-medium" style={{ color: severityColor }}>
                        {force.severity}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      </section>

      {/* ── Interconnection Summary ── */}
      <section>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card className="border-destructive/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <ChevronRight className="w-4 h-4 text-destructive" />
                How These Forces Interconnect
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-3 rounded-lg bg-muted/40">
                  <p className="text-xs font-semibold mb-1.5">Compounding Effect</p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    These barriers do not operate independently. A rural African American patient faces institutional concentration (no local NGS), geographic barriers (127-mile average travel), trust barriers (historical abuses), and economic barriers (insurance gaps) simultaneously.
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-muted/40">
                  <p className="text-xs font-semibold mb-1.5">Amplification Loop</p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Each force amplifies the others. Lack of diverse data makes tools less accurate, which reduces clinical utility, which diminishes institutional investment in serving diverse populations, which further reduces data collection.
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-muted/40">
                  <p className="text-xs font-semibold mb-1.5">Targeted Intervention Points</p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Effective solutions must address multiple forces simultaneously: community biobanking (institutional), mobile sequencing units (geographic), tribal data sovereignty agreements (trust), and equitable insurance coverage (economic).
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </section>
    </div>
  );
}
