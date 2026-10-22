"use client";

import React, { useState } from "react";
import { AppShell, ViewId } from "@/components/tool/app-shell";
import { DashboardView } from "@/components/tool/dashboard";
import { DatasetAnalyzerView } from "@/components/tool/dataset-analyzer";
import { VariantAnalysisView } from "@/components/tool/variant-analysis";
import { GapTrackerView } from "@/components/tool/gap-tracker";
import { BiobankPortalView } from "@/components/tool/biobank-portal";
import { ReportsView } from "@/components/tool/reports";
import { FeedbackLoopView } from "@/components/tool/feedback-loop";
import { StructuralForcesView } from "@/components/tool/structural-forces";
import { AIInterpreterView } from "@/components/tool/ai-interpreter";
import { LiveStreamView } from "@/components/tool/live-stream";
import { GeneHeatmapView } from "@/components/tool/gene-heatmap";
import { EquitySimulatorView } from "@/components/tool/equity-simulator";
import { ReferencePanelsView } from "@/components/tool/reference-panels";
import { FrequencyExplorerView } from "@/components/tool/frequency-explorer";
import { AnnotationPipelineView } from "@/components/tool/annotation-pipeline";
import { VusClassifierView } from "@/components/tool/vus-classifier";
import { MethodologyView } from "@/components/tool/methodology";
import { PharmacogenomicsView } from "@/components/tool/pharmacogenomics";
import { CohortDesignerView } from "@/components/tool/cohort-designer";

const views: Record<ViewId, React.ComponentType> = {
  dashboard: DashboardView,
  datasets: DatasetAnalyzerView,
  variants: VariantAnalysisView,
  "gap-tracker": GapTrackerView,
  biobank: BiobankPortalView,
  reports: ReportsView,
  "feedback-loop": FeedbackLoopView,
  "structural-forces": StructuralForcesView,
  "ai-interpreter": AIInterpreterView,
  "live-stream": LiveStreamView,
  "gene-heatmap": GeneHeatmapView,
  "equity-simulator": EquitySimulatorView,
  "reference-panels": ReferencePanelsView,
  "frequency-explorer": FrequencyExplorerView,
  "annotation-pipeline": AnnotationPipelineView,
  "vus-classifier": VusClassifierView,
  "methodology": MethodologyView,
  "pharmacogenomics": PharmacogenomicsView,
  "cohort-designer": CohortDesignerView,
};

export default function Home() {
  const [activeView, setActiveView] = useState<ViewId>("dashboard");
  const ActiveComponent = views[activeView];

  return (
    <AppShell activeView={activeView} onViewChange={setActiveView}>
      <ActiveComponent />
    </AppShell>
  );
}
