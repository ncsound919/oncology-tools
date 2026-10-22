"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { GitCommit, Sparkles, Wrench, Database, Clock } from "lucide-react";
import { CHANGELOG, type ChangelogEntry } from "@/lib/data";

const TAG_META: Record<ChangelogEntry["tag"], { label: string; color: string; Icon: React.ComponentType<{ className?: string }> }> = {
  feature: { label: "Feature", color: "#4FD1C0", Icon: Sparkles },
  improvement: { label: "Improvement", color: "#E8A94D", Icon: Wrench },
  data: { label: "Data", color: "#9E8CF2", Icon: Database },
};

export default function ChangelogSection() {
  const [filter, setFilter] = useState<"all" | ChangelogEntry["tag"]>("all");
  const filtered = filter === "all" ? CHANGELOG : CHANGELOG.filter((c) => c.tag === filter);

  return (
    <section id="changelog" className="border-t border-[#1F262D] py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="onc-mono text-[10.5px] uppercase tracking-[0.16em] text-[#4FD1C0]">
              Platform changelog
            </div>
            <h2 className="onc-sans mt-3 max-w-2xl text-[28px] font-semibold leading-tight tracking-[-0.01em] text-[#E9E7DF] md:text-[36px]">
              What&apos;s new — a timeline of platform additions.
            </h2>
            <p className="onc-sans mt-3 max-w-2xl text-[14px] leading-relaxed text-[#8B9299]">
              The OncoSIM platform has evolved over multiple development rounds. This changelog
              tracks each feature addition, improvement, and data expansion — newest first.
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <FilterChip active={filter === "all"} onClick={() => setFilter("all")} label="All" color="#8B9299" />
            {(["feature", "improvement", "data"] as ChangelogEntry["tag"][]).map((t) => (
              <FilterChip
                key={t}
                active={filter === t}
                onClick={() => setFilter(t)}
                label={TAG_META[t].label}
                color={TAG_META[t].color}
              />
            ))}
          </div>
        </div>

        {/* timeline */}
        <div className="mt-10 relative">
          {/* vertical line */}
          <div className="absolute left-4 top-2 bottom-2 w-px bg-gradient-to-b from-[#4FD1C0]/40 via-[#262D34] to-transparent md:left-1/2 md:-translate-x-1/2" />

          <div className="space-y-4">
            {filtered.map((entry, i) => {
              const meta = TAG_META[entry.tag];
              const Icon = meta.Icon;
              const isRight = i % 2 === 1;
              return (
                <motion.div
                  key={`${entry.version}-${entry.title}-${i}`}
                  initial={{ opacity: 0, y: 8 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.3, delay: Math.min(i * 0.04, 0.4) }}
                  className={`relative flex ${isRight ? "md:justify-end" : "md:justify-start"}`}
                >
                  {/* dot on the line */}
                  <div
                    className="absolute left-4 top-4 z-10 flex h-7 w-7 -translate-x-1/2 items-center justify-center rounded-full border-2 md:left-1/2"
                    style={{ borderColor: meta.color, background: "#0D1013" }}
                  >
                    <Icon className="h-3.5 w-3.5" style={{ color: meta.color }} />
                  </div>

                  {/* card */}
                  <div className="ml-12 w-full md:ml-0 md:w-[calc(50%-2.5rem)]">
                    <div
                      className="rounded-xl border bg-[#0D1013] p-4 transition-colors"
                      style={{ borderColor: `${meta.color}30` }}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="onc-mono rounded px-1.5 py-0.5 text-[9px] uppercase tracking-[0.08em]"
                          style={{ background: `${meta.color}18`, color: meta.color }}
                        >
                          {meta.label}
                        </span>
                        <span className="onc-mono text-[11px] font-semibold text-[#E9E7DF]">{entry.version}</span>
                        <span className="onc-mono ml-auto flex items-center gap-1 text-[10px] text-[#5C646C]">
                          <Clock className="h-2.5 w-2.5" />
                          {entry.date}
                        </span>
                      </div>
                      <h3 className="onc-sans mt-2 text-[14px] font-semibold leading-snug text-[#E9E7DF]">{entry.title}</h3>
                      <p className="onc-sans mt-1.5 text-[11.5px] leading-relaxed text-[#8B9299]">{entry.body}</p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function FilterChip({ active, onClick, label, color }: { active: boolean; onClick: () => void; label: string; color: string }) {
  return (
    <button
      onClick={onClick}
      className="onc-mono rounded-md border px-3 py-1.5 text-[10.5px] uppercase tracking-[0.06em] transition-all"
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
