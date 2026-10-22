"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import {
  RotateCcw,
  AlertTriangle,
  Shield,
  Eye,
  Zap,
  Database,
  Users,
  FlaskConical,
  TrendingDown,
  Dna,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CycleStep {
  id: number;
  title: string;
  icon: React.ElementType;
  color: string;
  severity: string;
  description: string;
}

const cycleSteps: CycleStep[] = [
  {
    id: 1,
    title: "Underserved Populations",
    icon: Users,
    color: "text-destructive",
    severity: "Critical",
    description:
      "Less likely to be sequenced due to institutional and geographic barriers",
  },
  {
    id: 2,
    title: "Absent from Databases",
    icon: Database,
    color: "text-destructive",
    severity: "Critical",
    description:
      "Mutation profiles missing from TCGA, gnomAD, and reference panels",
  },
  {
    id: 3,
    title: "Biased Tools",
    icon: Shield,
    color: "text-warning",
    severity: "High",
    description:
      "Genomic tools trained on biased data perform worse for these populations",
  },
  {
    id: 4,
    title: "Poor Clinical Outcomes",
    icon: AlertTriangle,
    color: "text-destructive",
    severity: "Critical",
    description:
      "Clinicians have less actionable genomic data to guide treatment",
  },
  {
    id: 5,
    title: "Reduced Incentives",
    icon: Eye,
    color: "text-warning",
    severity: "High",
    description:
      "Researchers and institutions have less reason to invest in diverse sequencing",
  },
  {
    id: 6,
    title: "Entrenched Gaps",
    icon: RotateCcw,
    color: "text-destructive",
    severity: "Critical",
    description:
      "The cycle continues, deepening the original disparity",
  },
];

interface ImpactStat {
  title: string;
  description: string;
  icon: React.ElementType;
}

const impactStats: ImpactStat[] = [
  {
    title: "Precision Oncology Gap",
    description:
      "PRS models lose 40-70% accuracy in non-European populations",
    icon: Zap,
  },
  {
    title: "Drug Response Variants",
    description:
      "38% of FDA-approved cancer drugs show ancestry-dependent efficacy",
    icon: FlaskConical,
  },
  {
    title: "VUS Rate Disparity",
    description:
      "VUS classifications 2-3x higher for variants found only in underrepresented populations",
    icon: Dna,
  },
  {
    title: "Screening Disparities",
    description:
      "AI/AN populations have the poorest cancer survival outcomes partly due to genomic data gaps",
    icon: TrendingDown,
  },
];

const interventions = [
  "Deliberate biobanking investment in community and rural oncology settings",
  "Cheaper, more accessible sequencing infrastructure outside elite academic centers",
  "Genomics literacy and trust-building programs embedded directly in communities",
  "Trans-ethnic reference panel development with population-specific allele frequencies",
];

const dataCallouts = [
  {
    value: "94%",
    label: "of TCGA prostate cancer samples from European ancestry",
    footnote: "only 21% of actual patients",
  },
  {
    value: "86%",
    label: "of GWAS samples are European descent",
    footnote: "global cancer genomics",
  },
  {
    value: "85%",
    label: "of US cancer patients diagnosed outside academic centers",
    footnote: "systematically excluded",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export function FeedbackLoopView() {
  return (
    <div className={cn("view-fade-in space-y-8")}>
      {/* ── Title Section ── */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h2 className="text-xl font-bold tracking-tight">
          The Diversity Feedback Loop
        </h2>
        <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
          Underrepresentation in cancer genomics is not a static problem—it is
          a self-reinforcing cycle. Each stage of the research pipeline amplifies
          the gaps created by the last, creating a feedback loop that
          systematically disadvantages underserved populations and degrades the
          quality of genomic medicine for everyone.
        </p>
      </motion.div>

      {/* ── Central Cycle Diagram ── */}
      <section>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          The Self-Reinforcing Cycle
        </h3>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {cycleSteps.map((step, index) => {
            const Icon = step.icon;
            const isLast = index === cycleSteps.length - 1;
            const showArrow = !isLast || index === 5;

            return (
              <React.Fragment key={step.id}>
                <motion.div variants={itemVariants}>
                  <Card className="p-4 h-full flex flex-col gap-2 relative">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className={cn("h-4 w-4", step.color)} />
                        <span className="text-sm font-semibold">{step.title}</span>
                      </div>
                      <Badge
                        variant={
                          step.severity === "Critical" ? "destructive" : "secondary"
                        }
                        className={cn(
                          "text-[10px] px-1.5 py-0",
                          step.severity !== "Critical" && "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20"
                        )}
                      >
                        {step.severity}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {step.description}
                    </p>
                    <div className="absolute top-1/2 -right-3 -translate-y-1/2 hidden lg:block">
                      {index < 2 && (
                        <motion.span
                          animate={{ x: [0, 4, 0], opacity: [0.5, 1, 0.5] }}
                          transition={{
                            duration: 1.5,
                            repeat: Infinity,
                            ease: "easeInOut",
                          }}
                          className="text-destructive text-lg font-bold"
                        >
                          →
                        </motion.span>
                      )}
                      {index === 2 && (
                        <motion.span
                          animate={{ y: [0, 4, 0], opacity: [0.5, 1, 0.5] }}
                          transition={{
                            duration: 1.5,
                            repeat: Infinity,
                            ease: "easeInOut",
                            delay: 0.3,
                          }}
                          className="text-destructive text-lg font-bold block"
                        >
                          ↓
                        </motion.span>
                      )}
                    </div>
                    {/* Arrows for tablet (md) layout — show below cards */}
                    {index % 2 === 0 && index < 4 && (
                      <div className="lg:hidden flex justify-end pr-2">
                        <motion.span
                          animate={{ x: [0, 4, 0], opacity: [0.5, 1, 0.5] }}
                          transition={{
                            duration: 1.5,
                            repeat: Infinity,
                            ease: "easeInOut",
                          }}
                          className="text-destructive text-lg font-bold"
                        >
                          →
                        </motion.span>
                      </div>
                    )}
                    {index === 1 && (
                      <div className="lg:hidden flex justify-center">
                        <motion.span
                          animate={{ y: [0, 4, 0], opacity: [0.5, 1, 0.5] }}
                          transition={{
                            duration: 1.5,
                            repeat: Infinity,
                            ease: "easeInOut",
                            delay: 0.2,
                          }}
                          className="text-destructive text-lg font-bold"
                        >
                          ↓
                        </motion.span>
                      </div>
                    )}
                    {index === 3 && (
                      <div className="lg:hidden flex justify-center">
                        <motion.span
                          animate={{ y: [0, 4, 0], opacity: [0.5, 1, 0.5] }}
                          transition={{
                            duration: 1.5,
                            repeat: Infinity,
                            ease: "easeInOut",
                            delay: 0.4,
                          }}
                          className="text-destructive text-lg font-bold"
                        >
                          ↓
                        </motion.span>
                      </div>
                    )}
                  </Card>
                </motion.div>

                {/* Loop-back arrow from step 6 to step 1 on desktop */}
                {step.id === 6 && (
                  <motion.div
                    variants={itemVariants}
                    className="hidden lg:flex items-center justify-center"
                  >
                    <svg
                      width="100%"
                      height="32"
                      viewBox="0 0 200 32"
                      preserveAspectRatio="xMidYMid meet"
                      className="overflow-visible"
                    >
                      <path
                        d="M0,16 Q100,-24 200,16"
                        fill="none"
                        stroke="hsl(var(--destructive))"
                        strokeWidth="1.5"
                        strokeDasharray="6 4"
                        opacity="0.5"
                      />
                      <motion.circle
                        cx="0"
                        cy="16"
                        r="3"
                        fill="hsl(var(--destructive))"
                        animate={{
                          cx: [0, 100, 200],
                          cy: [16, -8, 16],
                          opacity: [0, 1, 0],
                        }}
                        transition={{
                          duration: 2.5,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                      />
                    </svg>
                    <span className="absolute text-[10px] text-destructive/60 font-medium">
                      cycle repeats
                    </span>
                  </motion.div>
                )}
              </React.Fragment>
            );
          })}
        </motion.div>
      </section>

      {/* ── Impact Statistics Section ── */}
      <section>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          Impact of the Feedback Loop
        </h3>
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 sm:grid-cols-2 gap-4"
        >
          {impactStats.map((stat) => {
            const Icon = stat.icon;
            return (
              <motion.div key={stat.title} variants={itemVariants}>
                <Card className="card-glow p-4 h-full">
                  <div className="flex items-start gap-3">
                    <div className="rounded-md bg-muted/40 p-2 shrink-0">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{stat.title}</p>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        {stat.description}
                      </p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      </section>

      {/* ── Key Data Callouts ── */}
      <section>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          Key Data Points
        </h3>
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 sm:grid-cols-3 gap-4"
        >
          {dataCallouts.map((callout) => (
            <motion.div key={callout.value} variants={itemVariants}>
              <Card className="p-5 text-center">
                <p className="text-4xl font-bold bg-gradient-to-r from-teal-500 to-teal-400 bg-clip-text text-transparent">
                  {callout.value}
                </p>
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                  {callout.label}
                </p>
                <p className="text-[10px] text-muted-foreground/60 mt-1">
                  ({callout.footnote})
                </p>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ── Breaking the Cycle Section ── */}
      <section>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card className="border-primary/30 p-5">
            <CardHeader className="p-0 pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                Breaking the Cycle
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Targeted interventions at each stage of the feedback loop can
                disrupt the self-reinforcing pattern and begin to close ancestral
                diversity gaps.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ul className="space-y-3 mt-2">
                {interventions.map((item, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: -12 }}
                    animate={
                      { opacity: 1, x: 0 }
                    }
                    transition={{ duration: 0.4, delay: 0.4 + i * 0.1 }}
                    className="flex items-start gap-3"
                  >
                    <span
                      className={cn(
                        "flex items-center justify-center h-6 w-6 rounded-full shrink-0 text-xs font-semibold",
                        "bg-primary/15 text-primary"
                      )}
                    >
                      {i + 1}
                    </span>
                    <span className="text-xs text-muted-foreground leading-relaxed pt-0.5">
                      {item}
                    </span>
                  </motion.li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </motion.div>
      </section>
    </div>
  );
}
