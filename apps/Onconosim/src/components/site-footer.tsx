import { Activity, Github, Mail, FileText } from "lucide-react";
import { FooterTourButton } from "@/components/guided-tour";

export default function SiteFooter() {
  return (
    <footer
      className="mt-auto border-t border-[#1F262D] bg-[#0A0D10]"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto max-w-7xl px-5 py-10">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-md onc-grad-teal">
                <Activity className="h-4 w-4 text-[#0D1013]" strokeWidth={2.5} />
              </span>
              <span className="onc-mono text-[14px] font-semibold text-[#E9E7DF]">
                Onco<span className="text-[#4FD1C0]">SIM</span>
              </span>
            </div>
            <p className="onc-sans mt-3 max-w-md text-[12.5px] leading-relaxed text-[#8B9299]">
              A computational biology platform fusing genomic sequencing data and mechanistic models
              into a unified four-leg cure framework — driving precision-medicine decisions across
              debulking, anti-reseeding, resistance anticipation, and immune cleanup of dormant disease.
            </p>
            <p className="onc-mono mt-4 text-[10.5px] leading-relaxed text-[#5C646C]">
              Illustrative parameter models, not validated PK/PD. Tier scores reflect the reviewed
              evidence base as of the source documents — do not round up.
            </p>
          </div>

          <div>
            <h4 className="onc-mono text-[10px] uppercase tracking-[0.14em] text-[#5C646C] mb-3">
              Framework
            </h4>
            <ul className="space-y-2 onc-sans text-[12.5px] text-[#8B9299]">
              <li><a href="#framework" className="hover:text-[#4FD1C0]">Four-leg cure framework</a></li>
              <li><a href="#assets" className="hover:text-[#4FD1C0]">Asset registry</a></li>
              <li><a href="#pipeline" className="hover:text-[#4FD1C0]">Pipeline progression</a></li>
              <li><a href="#compare" className="hover:text-[#4FD1C0]">Head-to-head compare</a></li>
              <li><a href="#experiments" className="hover:text-[#4FD1C0]">Experiment set</a></li>
              <li><a href="#resistance" className="hover:text-[#4FD1C0]">Resistance atlas</a></li>
              <li><a href="#leg3" className="hover:text-[#4FD1C0]">Leg 3 proposals</a></li>
              <li><a href="#designer" className="hover:text-[#4FD1C0]">Combination designer</a></li>
              <li><a href="#rubric" className="hover:text-[#4FD1C0]">Cure criteria rubric</a></li>
              <li><a href="#glossary" className="hover:text-[#4FD1C0]">Scientific glossary</a></li>
            </ul>
          </div>

          <div>
            <h4 className="onc-mono text-[10px] uppercase tracking-[0.14em] text-[#5C646C] mb-3">
              Tools
            </h4>
            <ul className="space-y-2 onc-sans text-[12.5px] text-[#8B9299]">
              <li><a href="#simulator" className="hover:text-[#4FD1C0]">Precision targeting simulator</a></li>
              <li><a href="#genomic" className="hover:text-[#4FD1C0]">Genomic variant explorer</a></li>
              <li><a href="#cohort" className="hover:text-[#4FD1C0]">Cohort comparison</a></li>
              <li><a href="#calculator" className="hover:text-[#4FD1C0]">Tier calculator</a></li>
              <li><a href="#assistant" className="hover:text-[#4FD1C0]">AI research assistant</a></li>
              <li><a href="#changelog" className="hover:text-[#4FD1C0]">Platform changelog</a></li>
              <li><a href="#glossary" className="hover:text-[#4FD1C0]">Scientific glossary</a></li>
            </ul>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-start justify-between gap-3 border-t border-[#1F262D] pt-6 sm:flex-row sm:items-center">
          <p className="onc-mono text-[10.5px] text-[#5C646C]">
            © {new Date().getFullYear()} OncoSIM Lab · computational cancer systems biology
          </p>
          <div className="flex items-center gap-4 text-[#5C646C]">
            <FooterTourButton />
            <a href="#assistant" aria-label="Contact" className="hover:text-[#4FD1C0]"><Mail className="h-4 w-4" /></a>
            <a href="#experiments" aria-label="Protocols" className="hover:text-[#4FD1C0]"><FileText className="h-4 w-4" /></a>
            <a href="#top" aria-label="Source" className="hover:text-[#4FD1C0]"><Github className="h-4 w-4" /></a>
          </div>
        </div>
      </div>
    </footer>
  );
}
