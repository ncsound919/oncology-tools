"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Beaker, Target, Microscope, ListChecks, ShieldQuestion, FlaskRound, CheckCircle2, XCircle } from "lucide-react";
import { EXPERIMENTS, LEGS } from "@/lib/data";
import { GTerm } from "@/components/glossary-term";

export default function ExperimentLab() {
  const [open, setOpen] = useState<number | null>(1);

  return (
    <section id="experiments" className="border-t border-[#1F262D] py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="onc-mono text-[10.5px] uppercase tracking-[0.16em] text-[#4FD1C0]">
              Protocol experiment set
            </div>
            <h2 className="onc-sans mt-3 max-w-2xl text-[28px] font-semibold leading-tight tracking-[-0.01em] text-[#E9E7DF] md:text-[36px]">
              Five testable experiments, anchored to a leg and a tier.
            </h2>
            <p className="onc-sans mt-3 max-w-2xl text-[14px] leading-relaxed text-[#8B9299]">
              Each protocol is written as a starting sketch for a wet-lab or computational
              collaborator: objective, hypothesis, method, endpoints, controls, and what a
              positive vs. negative result would mean — including the null result that does not
              rule out the mechanism, only this implementation. Terms like{" "}
              <GTerm>PROTAC</GTerm>, <GTerm>HLA</GTerm>, <GTerm>ADC</GTerm>,{" "}
              <GTerm>ICD</GTerm>, and <GTerm>organotropic</GTerm> are hoverable for definitions.
            </p>
          </div>
          <div className="onc-mono text-right text-[10.5px] uppercase tracking-[0.1em] text-[#5C646C]">
            5 protocols · 4 legs
          </div>
        </div>

        <div className="mt-10 space-y-3">
          {EXPERIMENTS.map((exp) => {
            const isOpen = open === exp.number;
            const legIds = exp.legs.split(",").map((n) => Number(n.trim())) as (1 | 2 | 3 | 4)[];
            return (
              <div
                key={exp.number}
                className="overflow-hidden rounded-xl border transition-colors"
                style={{ borderColor: isOpen ? "#262D34" : "#1F262D", background: "#0D1013" }}
              >
                <button
                  onClick={() => setOpen(isOpen ? null : exp.number)}
                  className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-[#161B20]/40 md:px-6"
                >
                  <div className="onc-mono flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#262D34] bg-[#161B20] text-[14px] font-semibold text-[#4FD1C0]">
                    {String(exp.number).padStart(2, "0")}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {legIds.map((lid) => {
                        const leg = LEGS.find((l) => l.id === lid)!;
                        return (
                          <span
                            key={lid}
                            className="onc-mono rounded px-1.5 py-0.5 text-[9.5px] uppercase tracking-[0.08em]"
                            style={{ background: `${leg.color}18`, color: leg.color }}
                          >
                            Leg {lid}
                          </span>
                        );
                      })}
                    </div>
                    <h3 className="onc-sans mt-1.5 text-[14.5px] font-medium leading-snug text-[#E9E7DF] md:text-[15.5px]">
                      {exp.title}
                    </h3>
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
                        <Field icon={Target} label="Objective" color="#4FD1C0">
                          {exp.objective}
                        </Field>
                        <Field icon={Beaker} label="Hypothesis" color="#9E8CF2">
                          {exp.hypothesis}
                        </Field>
                        <Field icon={Microscope} label="Method" color="#E8A94D" full>
                          <ul className="space-y-2">
                            {exp.method.map((m, i) => (
                              <li key={i} className="flex gap-2">
                                <span className="onc-mono mt-0.5 text-[10px] text-[#5C646C]">{String(i + 1).padStart(2, "0")}</span>
                                <span>{m}</span>
                              </li>
                            ))}
                          </ul>
                        </Field>
                        <Field icon={ListChecks} label="Endpoints" color="#4FD1C0">
                          {exp.endpoints}
                        </Field>
                        <Field icon={ShieldQuestion} label="Controls" color="#8B9299">
                          {exp.controls}
                        </Field>
                        <div className="md:col-span-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <div className="rounded-lg border border-[#4FD1C0]/25 bg-[#4FD1C0]/06 p-4">
                            <div className="onc-mono mb-2 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.1em] text-[#4FD1C0]">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Positive result
                            </div>
                            <p className="onc-sans text-[12px] leading-relaxed text-[#C9BFB5]">{exp.positive}</p>
                          </div>
                          <div className="rounded-lg border border-[#E8A94D]/25 bg-[#E8A94D]/06 p-4">
                            <div className="onc-mono mb-2 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.1em] text-[#E8A94D]">
                              <XCircle className="h-3.5 w-3.5" />
                              Negative result
                            </div>
                            <p className="onc-sans text-[12px] leading-relaxed text-[#C9BFB5]">{exp.negative}</p>
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
