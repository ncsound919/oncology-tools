import SiteNav from "@/components/site-nav";
import SiteFooter from "@/components/site-footer";
import ScrollUx from "@/components/scroll-ux";
import KeyboardNav from "@/components/keyboard-nav";
import AssetDeepDive from "@/components/asset-deep-dive";
import PinnedStrip from "@/components/pinned-strip";
import GuidedTour from "@/components/guided-tour";
import Hero from "@/components/sections/hero";
import DashboardCard from "@/components/sections/dashboard-card";
import Framework from "@/components/sections/framework";
import AssetRegistry from "@/components/sections/asset-registry";
import PipelineProgression from "@/components/sections/pipeline-progression";
import AssetCompare from "@/components/sections/asset-compare";
import ExperimentLab from "@/components/sections/experiment-lab";
import ResistanceAtlas from "@/components/sections/resistance-atlas";
import Leg3Proposals from "@/components/sections/leg3-proposals";
import CombinationDesigner from "@/components/sections/combination-designer";
import Simulator from "@/components/sections/simulator";
import SavedSimulations from "@/components/sections/saved-simulations";
import GenomicExplorer from "@/components/sections/genomic-explorer";
import CohortComparison from "@/components/sections/cohort-comparison";
import TierCalculator from "@/components/sections/tier-calculator";
import AiAssistant from "@/components/sections/ai-assistant";
import CureRubric from "@/components/sections/cure-rubric";
import ChangelogSection from "@/components/sections/changelog-section";
import GlossarySection from "@/components/sections/glossary-section";

export default function Home() {
  return (
    <div className="onc-dark onc-sans flex min-h-screen flex-col">
      <ScrollUx />
      <KeyboardNav />
      <AssetDeepDive />
      <PinnedStrip />
      <GuidedTour />
      <SiteNav />
      <main className="flex-1">
        <Hero />
        <DashboardCard />
        <Framework />
        <AssetRegistry />
        <PipelineProgression />
        <AssetCompare />
        <ExperimentLab />
        <ResistanceAtlas />
        <Leg3Proposals />
        <CombinationDesigner />
        <Simulator />
        <SavedSimulations />
        <GenomicExplorer />
        <CohortComparison />
        <TierCalculator />
        <CureRubric />
        <AiAssistant />
        <ChangelogSection />
        <GlossarySection />
      </main>
      <SiteFooter />
    </div>
  );
}
