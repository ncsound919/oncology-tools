"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Target, GitBranch, ListChecks, ShieldQuestion, CheckCircle2, XCircle, ArrowRight, Layers } from "lucide-react";
import { LEG3_PROPOSALS, LEG3_GAP, RESISTANCE_MECHANISMS } from "@/lib/data";
import { GTerm } from "@/components/glossary-term";

export default function Leg3Proposals() {
  const [open, setOpen] = useState<string | null>(LEG3_PROPOSALS[0].id);

  return (
    <section id="leg3" className="border-t border-[#1F262D] py-20 md:py-28 bg-[#0A0D10]">
      <div className="mx-auto max-w-7xl px-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="onc-mono text-[10.5px] uppercase tracking-[0.16em] text-[#9E8CF2]">
              Leg 3 dedicated · resistance anticipation
            </div>
            <h2 className="onc-sans mt-3 max-w-2xl text-[28px] font-semibold leading-tight tracking-[-0.01em] text-[#E9E7DF] md:text-[36px]">
              Three protocols designed to fill the least-populated leg.
            </h2>
            <p className="onc-sans mt-3 max-w-2xl text-[14px] leading-relaxed text-[#8B9299]">
              No tracked asset clears <span className="text-[#9E8CF2] font-semibold">tier 2</span> on Leg 3.
              These three experiment proposals are designed specifically to fill that gap — each
              with a pre-specified switching rule (not post-hoc narrative), a resistance-evolution-
              competent model, and an explicit null-result interpretation. Terms like{" "}
              <GTerm>ctDNA</GTerm>, <GTerm>organoid</GTerm>, and <GTerm>EP4</GTerm> are hoverable.
            </p>
          </div>
          <div className="onc-mono text-[10.5px] text-[#5C646C]">
            {LEG3_PROPOSALS.length} protocols · Leg 3 gap
          </div>
        </div>

        {/* gap callout */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="mt-8 rounded-xl border border-[#9E8CF2]/30 bg-gradient-to-br from-[#9E8CF2]/08 to-transparent p-5"
        >
          <div className="flex items-start gap-3">
            <Layers className="h-5 w-5 shrink-0 text-[#9E8CF2] mt-0.5" />
            <div>
              <h3 className="onc-sans text-[15px] font-semibold text-[#E9E7DF]">{LEG3_GAP.title}</h3>
              <p className="onc-sans mt-1.5 text-[12.5px] leading-relaxed text-[#8B9299]">{LEG3_GAP.body}</p>
            </div>
          </div>
        </motion.div>

        {/* proposals */}
        <div className="mt-8 space-y-3">
          {LEG3_PROPOSALS.map((p, i) => {
            const isOpen = open === p.id;
            const addressedMechanisms = RESISTANCE_MECHANISMS.filter((m) =>
              p.resistanceMechanismsAddressed.includes(m.id)
            );
            return (
              <div
                key={p.id}
                className="overflow-hidden rounded-xl border transition-colors"
                style={{ borderColor: isOpen ? "#9E8CF2" : "#1F262D", background: "#0D1013" }}
              >
                <button
                  onClick={() => setOpen(isOpen ? null : p.id)}
                  className="flex w-full items-start gap-4 px-5 py-4 text-left transition-colors hover:bg-[#161B20]/40 md:px-6"
                >
                  <div className="onc-mono flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#9E8CF2]/30 bg-[#9E8CF2]/08 text-[14px] font-semibold text-[#9E8CF2]">
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="onc-mono rounded px-1.5 py-0.5 text-[9.5px] uppercase tracking-[0.08em] bg-[#9E8CF2]/12 text-[#9E8CF2]">
                        Leg 3
                      </span>
                      <span className="onc-mono rounded px-1.5 py-0.5 text-[9.5px] uppercase tracking-[0.08em] border border-[#262D34] text-[#8B9299]">
                        {p.tierTarget}
                      </span>
                    </div>
                    <h3 className="onc-sans mt-1.5 text-[15px] font-medium leading-snug text-[#E9E7DF] md:text-[16px]">
                      {p.name}
                    </h3>
                    <p className="onc-sans mt-0.5 text-[11.5px] italic text-[#9E8CF2]/80">{p.tagline}</p>
                  </div>
                  <div
                    className="onc-mono text-[20px] text-[#5C646C] transition-transform"
                    style={{ transform: isOpen ? "rotate(45deg)" : "none" }}
                  >
                    +
                  </div>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      <div className="grid grid-cols-1 gap-5 px-5 pb-6 md:grid-cols-2 md:px-6">
                        <Field icon={Target} label="Hypothesis" color="#9E8CF2">
                          {p.hypothesis}
                        </Field>
                        <Field icon={GitBranch} label="Design" color="#E8A94D" full>
                          <ol className="space-y-2">
                            {p.design.map((d, j) => (
                              <li key={j} className="flex gap-2">
                                <span className="onc-mono mt-0.5 text-[10px] text-[#5C646C]">{String(j + 1).padStart(2, "0")}</span>
                                <span>{d}</span>
                              </li>
                            ))}
                          </ol>
                        </Field>
                        <Field icon={ListChecks} label="Endpoints" color="#4FD1C0">
                          {p.endpoints}
                        </Field>
                        <div className="md:col-span-2">
                          <div className="onc-mono mb-2 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.1em] text-[#5C646C]">
                            <ArrowRight className="h-3.5 w-3.5" />
                            Resistance mechanisms addressed
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {addressedMechanisms.map((m) => (
                              <span
                                key={m.id}
                                className="onc-mono rounded-md border px-2 py-1 text-[10px] text-[#C9BFB5]"
                                style={{ borderColor: "#262D34", background: "#161B20" }}
                              >
                                {m.name}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="md:col-span-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <div className="rounded-lg border border-[#4FD1C0]/25 bg-[#4FD1C0]/06 p-4">
                            <div className="onc-mono mb-2 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.1em] text-[#4FD1C0]">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              What this fills
                            </div>
                            <p className="onc-sans text-[12px] leading-relaxed text-[#C9BFB5]">{p.fillsGap}</p>
                          </div>
                          <div className="rounded-lg border border-[#E8A94D]/25 bg-[#E8A94D]/06 p-4">
                            <div className="onc-mono mb-2 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.1em] text-[#E8A94D]">
                              <XCircle className="h-3.5 w-3.5" />
                              Null result means
                            </div>
                            <p className="onc-sans text-[12px] leading-relaxed text-[#C9BFB5]">{p.nullResult}</p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Field({
  icon: Icon,
  label,
  color,
  children,
  full = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  color: string;
  children: React.ReactNode;
  full?: boolean;
}) {
  return (
    <div className={full ? "md:col-span-2" : ""}>
      <div className="onc-mono mb-2 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.1em]" style={{ color }}>
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="onc-sans text-[12.5px] leading-relaxed text-[#C9BFB5]">{children}</div>
    </div>
  );
}
