"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, ChevronDown, ChevronUp, Search } from "lucide-react";
import { GLOSSARY, type GlossaryTerm } from "@/lib/glossary";

const CATEGORY_COLOR: Record<GlossaryTerm["category"], string> = {
  Target: "#4FD1C0",
  Mechanism: "#9E8CF2",
  Evidence: "#E8A94D",
  Model: "#E8664F",
  Biomarker: "#6EE7B7",
};

const CATEGORIES = ["Target", "Mechanism", "Evidence", "Model", "Biomarker"] as const;

export default function GlossarySection() {
  const [open, setOpen] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [activeCat, setActiveCat] = useState<GlossaryTerm["category"] | "all">("all");

  const filtered = GLOSSARY.filter((t) => {
    const matchCat = activeCat === "all" || t.category === activeCat;
    const q = query.toLowerCase();
    const matchQuery =
      !q ||
      t.term.toLowerCase().includes(q) ||
      t.short.toLowerCase().includes(q) ||
      t.full.toLowerCase().includes(q);
    return matchCat && matchQuery;
  });

  return (
    <section id="glossary" className="border-t border-[#1F262D] bg-[#0A0D10] py-16 md:py-20 pb-24">
      <div className="mx-auto max-w-7xl px-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="onc-mono text-[10.5px] uppercase tracking-[0.16em] text-[#4FD1C0]">
              Scientific glossary
            </div>
            <h2 className="onc-sans mt-3 text-[26px] font-semibold leading-tight tracking-[-0.01em] text-[#E9E7DF] md:text-[32px]">
              Terms, defined — so non-experts can read the framework too.
            </h2>
            <p className="onc-sans mt-3 max-w-2xl text-[13.5px] leading-relaxed text-[#8B9299]">
              Every scientific term used across OncoSIM, with a short popover definition and an
              expanded mechanistic explanation. Terms are also hoverable inline throughout the
              platform.
            </p>
          </div>
          <div className="onc-mono text-[10.5px] text-[#5C646C]">
            {GLOSSARY.length} terms · 5 categories
          </div>
        </div>

        {/* search + filters */}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1 max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#5C646C]" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search terms…"
              className="onc-sans w-full rounded-md border border-[#262D34] bg-[#0D1013] py-2 pl-9 pr-3 text-[12.5px] text-[#E9E7DF] placeholder:text-[#5C646C] focus:border-[#4FD1C0]/50 focus:outline-none"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            <CatChip active={activeCat === "all"} onClick={() => setActiveCat("all")} label="All" color="#8B9299" />
            {CATEGORIES.map((c) => (
              <CatChip
                key={c}
                active={activeCat === c}
                onClick={() => setActiveCat(c)}
                label={c}
                color={CATEGORY_COLOR[c]}
              />
            ))}
          </div>
        </div>

        {/* terms list */}
        <div className="mt-6 grid grid-cols-1 gap-2 md:grid-cols-2">
          {filtered.length === 0 ? (
            <div className="onc-sans col-span-full py-10 text-center text-[12.5px] text-[#5C646C]">
              No terms match &ldquo;{query}&rdquo;.
            </div>
          ) : (
            filtered.map((t) => {
              const isOpen = open === t.term;
              const color = CATEGORY_COLOR[t.category];
              return (
                <div
                  key={t.term}
                  className="overflow-hidden rounded-lg border border-[#1F262D] bg-[#0D1013] transition-colors hover:border-[#262D34]"
                >
                  <button
                    onClick={() => setOpen(isOpen ? null : t.term)}
                    className="flex w-full items-start gap-3 p-3.5 text-left"
                  >
                    <span
                      className="onc-mono mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[9px] uppercase tracking-[0.06em]"
                      style={{ background: `${color}18`, color }}
                    >
                      {t.category}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="onc-mono text-[13px] font-semibold text-[#E9E7DF]">{t.term}</div>
                      <div className="onc-sans mt-0.5 text-[11.5px] leading-snug text-[#C9BFB5]">{t.short}</div>
                    </div>
                    {isOpen ? (
                      <ChevronUp className="h-4 w-4 shrink-0 text-[#5C646C]" />
                    ) : (
                      <ChevronDown className="h-4 w-4 shrink-0 text-[#5C646C]" />
                    )}
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden border-t border-[#1F262D]"
                      >
                        <p className="onc-sans p-3.5 text-[11.5px] leading-relaxed text-[#C9BFB5]">{t.full}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
}

function CatChip({ active, onClick, label, color }: { active: boolean; onClick: () => void; label: string; color: string }) {
  return (
    <button
      onClick={onClick}
      className="onc-mono rounded-md border px-2.5 py-1 text-[10px] uppercase tracking-[0.06em] transition-all"
      style={{
        borderColor: active ? color : "#1F262D",
        background: active ? `${color}12` : "transparent",
        color: active ? color : "#8B9299",
      }}
    >
      {label}
    </button>
  );
}
