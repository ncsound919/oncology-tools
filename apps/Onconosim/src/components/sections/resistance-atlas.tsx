"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { ShieldAlert, GitBranch, Microscope, Dna, Info } from "lucide-react";
import { ASSETS, RESISTANCE_MECHANISMS, RESISTANCE_STATUSES, LEGS, LEG3_GAP } from "@/lib/data";
import { GTerm } from "@/components/glossary-term";

type Status = "overcomes" | "vulnerable" | "unknown";

const STATUS_META: Record<Status, { label: string; color: string; bg: string; symbol: string }> = {
  overcomes: { label: "Overcomes", color: "#4FD1C0", bg: "rgba(79,209,192,0.16)", symbol: "✓" },
  vulnerable: { label: "Vulnerable", color: "#E8664F", bg: "rgba(232,102,79,0.16)", symbol: "✕" },
  unknown: { label: "Unknown", color: "#8B9299", bg: "rgba(139,146,153,0.10)", symbol: "?" },
};

const CATEGORY_META: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string }> = {
  Genomic: { icon: Dna, color: "#9E8CF2" },
  Epigenetic: { icon: GitBranch, color: "#E8A94D" },
  Microenvironmental: { icon: Microscope, color: "#4FD1C0" },
};

// Only show assets that have at least one resistance-status entry
const ASSETS_WITH_RESISTANCE = ASSETS.filter((a) =>
  RESISTANCE_STATUSES.some((s) => s.assetCode === a.code)
);

export default function ResistanceAtlas() {
  const [filter, setFilter] = useState<"all" | Status>("all");
  const [hovered, setHovered] = useState<{ asset: string; mech: string } | null>(null);

  const statusMap = useMemo(() => {
    const m = new Map<string, Status>();
    for (const s of RESISTANCE_STATUSES) m.set(`${s.assetCode}|${s.mechanismId}`, s.status);
    return m;
  }, []);

  const counts = useMemo(() => {
    const c = { overcomes: 0, vulnerable: 0, unknown: 0 };
    for (const s of RESISTANCE_STATUSES) c[s.status]++;
    return c;
  }, []);

  return (
    <section id="resistance" className="border-t border-[#1F262D] py-20 md:py-28 bg-[#0A0D10]">
      <div className="mx-auto max-w-7xl px-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="onc-mono text-[10.5px] uppercase tracking-[0.16em] text-[#9E8CF2]">
              Resistance atlas · Leg 3 focus
            </div>
            <h2 className="onc-sans mt-3 max-w-2xl text-[28px] font-semibold leading-tight tracking-[-0.01em] text-[#E9E7DF] md:text-[36px]">
              Which mechanisms does each asset overcome — or fall to?
            </h2>
            <p className="onc-sans mt-3 max-w-2xl text-[14px] leading-relaxed text-[#8B9299]">
              A vulnerability map across the tracked assets. Leg 3 (anticipate resistance) is the
              least-populated leg — no asset clears tier 2. This atlas makes the gaps concrete:
              which resistance mechanisms each asset is designed to counter, vulnerable to, or
              hasn&apos;t been tested against. Terms like <GTerm>PROTAC</GTerm>,{" "}
              <GTerm>ctDNA</GTerm>, <GTerm>TME</GTerm>, and <GTerm>EP4</GTerm> are hoverable.
            </p>
          </div>
          <div className="flex items-center gap-3 onc-mono text-[10.5px]">
            <Stat label="Overcomes" value={counts.overcomes} color="#4FD1C0" />
            <Stat label="Vulnerable" value={counts.vulnerable} color="#E8664F" />
            <Stat label="Unknown" value={counts.unknown} color="#8B9299" />
          </div>
        </div>

        {/* legend / filter */}
        <div className="mt-8 flex flex-wrap items-center gap-2">
          <FilterChip active={filter === "all"} onClick={() => setFilter("all")} label="All" color="#8B9299" />
          {(["overcomes", "vulnerable", "unknown"] as Status[]).map((s) => (
            <FilterChip
              key={s}
              active={filter === s}
              onClick={() => setFilter(s)}
              label={`${STATUS_META[s].symbol} ${STATUS_META[s].label}`}
              color={STATUS_META[s].color}
            />
          ))}
        </div>

        {/* heatmap */}
        <div className="mt-6 overflow-x-auto onc-scroll rounded-xl border border-[#1F262D] bg-[#0D1013]">
          <div className="min-w-[1180px]">
            {/* column headers (mechanisms) */}
            <div className="sticky top-0 z-10 flex border-b border-[#1F262D] bg-[#0D1013]">
              <div className="w-[200px] shrink-0 p-3 onc-mono text-[10px] uppercase tracking-[0.1em] text-[#5C646C]">
                Asset ↓ / Mechanism →
              </div>
              {RESISTANCE_MECHANISMS.map((m) => {
                const cat = CATEGORY_META[m.category];
                const Icon = cat.icon;
                return (
                  <div
                    key={m.id}
                    className="flex-1 min-w-[120px] px-2 py-3 text-center"
                    title={m.description}
                  >
                    <Icon className="mx-auto mb-1 h-3.5 w-3.5" style={{ color: cat.color }} />
                    <div className="onc-sans text-[10px] leading-tight text-[#E9E7DF] break-words">{m.name}</div>
                    <div className="onc-mono mt-0.5 text-[9.5px] font-semibold uppercase tracking-[0.06em] text-[#C9BFB5]">
                      T{m.evidenceTier}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* rows (assets) */}
            {ASSETS_WITH_RESISTANCE.map((asset, i) => {
              const leg = LEGS.find((l) => l.id === asset.leg)!;
              return (
                <motion.div
                  key={asset.code}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2, delay: i * 0.04 }}
                  className="flex border-b border-[#161B20] last:border-0"
                >
                  <div className="w-[200px] shrink-0 p-3 border-r border-[#1F262D]">
                    <div className="onc-mono text-[11px] font-semibold text-[#E9E7DF]">{asset.code}</div>
                    <div className="onc-sans mt-0.5 text-[10px] leading-tight text-[#5C646C]">{asset.name}</div>
                    <div className="onc-mono mt-1 inline-flex rounded px-1.5 py-0.5 text-[9px] uppercase tracking-[0.06em]" style={{ background: `${leg.color}18`, color: leg.color }}>
                      Leg {asset.leg}
                    </div>
                  </div>
                  {RESISTANCE_MECHANISMS.map((m) => {
                    const status = statusMap.get(`${asset.code}|${m.id}`);
                    const dim = filter !== "all" && status !== filter;
                    const isHovered = hovered?.asset === asset.code && hovered?.mech === m.id;
                    const note = RESISTANCE_STATUSES.find((s) => s.assetCode === asset.code && s.mechanismId === m.id)?.note;
                    return (
                      <div
                        key={m.id}
                        className="relative flex-1 min-w-[120px] flex items-center justify-center p-2 border-r border-[#161B20] last:border-0"
                        onMouseEnter={() => status && setHovered({ asset: asset.code, mech: m.id })}
                        onMouseLeave={() => setHovered(null)}
                      >
                        {status ? (
                          <button
                            className="flex h-9 w-9 items-center justify-center rounded-md text-[13px] font-semibold transition-all hover:scale-110"
                            style={{
                              background: STATUS_META[status].bg,
                              color: STATUS_META[status].color,
                              opacity: dim ? 0.25 : 1,
                              boxShadow: isHovered ? `0 0 0 1.5px ${STATUS_META[status].color}` : "none",
                            }}
                            aria-label={`${asset.code} ${STATUS_META[status].label} ${m.name}`}
                          >
                            {STATUS_META[status].symbol}
                          </button>
                        ) : (
                          <span className="onc-mono text-[12px] text-[#262D34]">·</span>
                        )}
                        {isHovered && note && (
                          <div className="absolute bottom-full left-1/2 z-20 mb-2 w-48 -translate-x-1/2 rounded-md border border-[#262D34] bg-[#0D1013] p-2.5 onc-sans text-[10.5px] leading-snug text-[#C9BFB5] shadow-xl">
                            {note}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* legend */}
        <div className="mt-4 flex flex-wrap items-center gap-4 onc-mono text-[10.5px] text-[#8B9299]">
          <span className="flex items-center gap-1.5"><Info className="h-3 w-3" />Hover any cell for the rationale. T = evidence tier at which the mechanism is demonstrated in patients.</span>
        </div>

        {/* Leg 3 gap callout */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="mt-8 overflow-hidden rounded-xl border border-[#9E8CF2]/30 bg-gradient-to-br from-[#9E8CF2]/08 to-transparent p-6"
        >
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg onc-grad-violet">
              <ShieldAlert className="h-5 w-5 text-[#0D1013]" strokeWidth={2.2} />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="onc-sans text-[16px] font-semibold text-[#E9E7DF]">{LEG3_GAP.title}</h3>
              <p className="onc-sans mt-1.5 text-[12.5px] leading-relaxed text-[#8B9299]">{LEG3_GAP.body}</p>
              <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
                {LEG3_GAP.candidates.map((c, i) => (
                  <div key={i} className="rounded-lg border border-[#1F262D] bg-[#0D1013]/60 p-3.5 break-words">
                    <div className="onc-mono text-[10px] font-semibold text-[#9E8CF2]">CANDIDATE {String(i + 1).padStart(2, "0")}</div>
                    <p className="onc-sans mt-1.5 text-[11.5px] leading-snug text-[#E9E7DF]">{c}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-1.5 rounded-md border border-[#1F262D] px-2.5 py-1.5">
      <span className="h-2 w-2 rounded-full" style={{ background: color }} />
      <span className="onc-mono text-[13px] font-semibold text-[#E9E7DF]">{value}</span>
      <span className="text-[#5C646C] uppercase tracking-[0.06em] text-[9.5px]">{label}</span>
    </div>
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
