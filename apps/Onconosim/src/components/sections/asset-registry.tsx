"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { FlaskConical, Building2, ChevronDown, ChevronUp, ExternalLink, Pin } from "lucide-react";
import { ASSETS, LEGS } from "@/lib/data";
import { openAssetDeepDive } from "@/components/asset-deep-dive";
import { usePinnedAssets } from "@/hooks/use-pinned-assets";

const STATUS_COLOR: Record<string, string> = {
  Preclinical: "#8B9299",
  "Phase 1": "#4FD1C0",
  "Phase 2": "#E8A94D",
  "Phase 2/3": "#E8A94D",
  "Phase 3": "#E8664F",
  Published: "#9E8CF2",
  Untested: "#5C646C",
};

export default function AssetRegistry() {
  const [legFilter, setLegFilter] = useState<number | "all">("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const { isPinned, toggle: togglePin } = usePinnedAssets();

  const filtered = useMemo(() => {
    if (legFilter === "all") return ASSETS;
    return ASSETS.filter((a) => a.leg === legFilter);
  }, [legFilter]);

  return (
    <section id="assets" className="border-t border-[#1F262D] py-20 md:py-28 bg-[#0A0D10]">
      <div className="mx-auto max-w-7xl px-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="onc-mono text-[10.5px] uppercase tracking-[0.16em] text-[#4FD1C0]">
              Asset registry
            </div>
            <h2 className="onc-sans mt-3 max-w-2xl text-[28px] font-semibold leading-tight tracking-[-0.01em] text-[#E9E7DF] md:text-[36px]">
              Tracked assets, scored at their actual evidence tier.
            </h2>
            <p className="onc-sans mt-3 max-w-2xl text-[14px] leading-relaxed text-[#8B9299]">
              Each asset is graded at the highest tier its reviewed evidence actually clears — not the
              tier its press release implies. Tier 4 (“in patients, safety underway”) is not tier 5
              (“clinical benefit on an appropriately long timeline”).
            </p>
          </div>
        </div>

        {/* leg filter chips */}
        <div className="mt-8 flex flex-wrap gap-2">
          <FilterChip active={legFilter === "all"} onClick={() => setLegFilter("all")} label="All legs" color="#4FD1C0" />
          {LEGS.map((l) => (
            <FilterChip
              key={l.id}
              active={legFilter === l.id}
              onClick={() => setLegFilter(l.id)}
              label={`Leg ${l.id} · ${l.short}`}
              color={l.color}
            />
          ))}
        </div>

        {/* table */}
        <div className="mt-6 overflow-hidden rounded-xl border border-[#1F262D]">
          {/* header */}
          <div className="hidden grid-cols-[140px_1fr_180px_120px_60px] gap-3 border-b border-[#1F262D] bg-[#0D1013] px-5 py-3 onc-mono text-[10px] uppercase tracking-[0.1em] text-[#5C646C] md:grid">
            <div>Asset</div>
            <div>Mechanism</div>
            <div>Tier progress</div>
            <div>Status</div>
            <div></div>
          </div>

          <div className="divide-y divide-[#1F262D]">
            {filtered.map((a, i) => {
              const leg = LEGS.find((l) => l.id === a.leg)!;
              const isOpen = expanded === a.code;
              return (
                <motion.div
                  key={a.code}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2, delay: i * 0.03 }}
                >
                  <button
                    onClick={() => setExpanded(isOpen ? null : a.code)}
                    className="grid w-full grid-cols-1 gap-3 px-5 py-4 text-left transition-colors hover:bg-[#0D1013] md:grid-cols-[140px_1fr_180px_120px_60px] md:items-center"
                  >
                    <div>
                      <div className="onc-mono text-[12px] font-semibold text-[#E9E7DF]">{a.code}</div>
                      <div className="onc-sans text-[10.5px] text-[#5C646C]">{a.sponsor}</div>
                    </div>
                    <div className="min-w-0">
                      <div className="onc-sans text-[12.5px] font-medium text-[#E9E7DF]">{a.name}</div>
                      <div className="onc-sans mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10.5px] text-[#5C646C]">
                        <span className="onc-mono" style={{ color: leg.color }}>Leg {a.leg}</span>
                        <span>·</span>
                        <span>{a.modality}</span>
                        <span>·</span>
                        <span>{a.target}</span>
                      </div>
                    </div>
                    <div>
                      <TierBar tier={a.tier} color={leg.color} />
                    </div>
                    <div>
                      <span
                        className="onc-mono inline-flex rounded px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.04em]"
                        style={{
                          background: `${STATUS_COLOR[a.status] ?? "#5C646C"}1a`,
                          color: STATUS_COLOR[a.status] ?? "#5C646C",
                        }}
                      >
                        {a.status}
                      </span>
                    </div>
                    <div className="hidden justify-end md:flex">
                      {isOpen ? <ChevronUp className="h-4 w-4 text-[#5C646C]" /> : <ChevronDown className="h-4 w-4 text-[#5C646C]" />}
                    </div>
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 pt-1 md:pl-[140px+1fr]">
                      <div className="rounded-lg border border-[#1F262D] bg-[#0D1013] p-4">
                        <div className="onc-mono mb-2 flex items-center gap-2 text-[10px] uppercase tracking-[0.1em] text-[#5C646C]">
                          <FlaskConical className="h-3 w-3" />
                          Evidence summary
                        </div>
                        <p className="onc-sans text-[12.5px] leading-relaxed text-[#C9BFB5]">{a.summary}</p>
                        <div className="mt-3 flex flex-wrap items-center gap-3 text-[10.5px] onc-mono text-[#5C646C]">
                          <span className="flex items-center gap-1.5"><Building2 className="h-3 w-3" />{a.sponsor}</span>
                          <span>·</span>
                          <span>modality: {a.modality}</span>
                          <span>·</span>
                          <span>target: {a.target}</span>
                          <span>·</span>
                          <span style={{ color: leg.color }}>leg {a.leg} · tier {a.tier}/5</span>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[#1F262D] pt-3">
                          <button
                            onClick={(e) => { e.stopPropagation(); openAssetDeepDive(a.code); }}
                            className="onc-mono inline-flex items-center gap-1.5 rounded-md border border-[#262D34] px-3 py-1.5 text-[10.5px] uppercase tracking-[0.06em] text-[#8B9299] transition-all hover:border-[#4FD1C0]/40 hover:text-[#4FD1C0]"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Open deep dive
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); togglePin(a.code); }}
                            className="onc-mono inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-[10.5px] uppercase tracking-[0.06em] transition-all"
                            style={{
                              borderColor: isPinned(a.code) ? "#4FD1C0" : "#262D34",
                              background: isPinned(a.code) ? "rgba(79,209,192,0.10)" : "transparent",
                              color: isPinned(a.code) ? "#4FD1C0" : "#8B9299",
                            }}
                            aria-label={isPinned(a.code) ? `Unpin ${a.code}` : `Pin ${a.code}`}
                          >
                            <Pin className="h-3 w-3" style={{ fill: isPinned(a.code) ? "#4FD1C0" : "none" }} />
                            {isPinned(a.code) ? "Pinned" : "Pin"}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>

        <p className="onc-sans mt-4 text-[11px] leading-relaxed text-[#5C646C]">
          Tip: click any row to expand the full evidence summary. Tier progress is the highest tier
          the reviewed evidence actually clears, not the target tier.
        </p>
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

function TierBar({ tier, color }: { tier: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex flex-1 gap-0.5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-1.5 flex-1 rounded-sm"
            style={{
              background: i < tier ? color : "#1F262D",
              opacity: i < tier ? 1 : 1,
            }}
          />
        ))}
      </div>
      <span className="onc-mono text-[10.5px] font-medium text-[#E9E7DF]">{tier}/5</span>
    </div>
  );
}
