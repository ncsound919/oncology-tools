"use client";

import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Activity, ShieldAlert, GitBranch, Clock, FlaskConical, Layers,
  CheckCircle2, XCircle, HelpCircle, TrendingUp, Pin,
} from "lucide-react";
import {
  ASSETS, LEGS, RESISTANCE_MECHANISMS, RESISTANCE_STATUSES,
  PIPELINE_STEPS, EXPERIMENTS, COMBINATIONS,
} from "@/lib/data";
import { usePinnedAssets } from "@/hooks/use-pinned-assets";
import { useRecentAssets } from "@/hooks/use-recent-assets";
import { GTerm } from "@/components/glossary-term";

type Status = "overcomes" | "vulnerable" | "unknown";
const STATUS_META: Record<Status, { label: string; color: string; symbol: string; Icon: React.ComponentType<{ className?: string }> }> = {
  overcomes: { label: "Overcomes", color: "#4FD1C0", symbol: "✓", Icon: CheckCircle2 },
  vulnerable: { label: "Vulnerable", color: "#E8664F", symbol: "✕", Icon: XCircle },
  unknown: { label: "Unknown", color: "#8B9299", symbol: "?", Icon: HelpCircle },
};

let openSetter: ((code: string | null) => void) | null = null;

export function openAssetDeepDive(code: string) {
  openSetter?.(code);
}

export default function AssetDeepDive() {
  const [code, setCode] = useState<string | null>(null);
  const { isPinned, toggle: togglePin } = usePinnedAssets();
  const { push: pushRecent } = useRecentAssets();
  useEffect(() => {
    openSetter = setCode;
    return () => { openSetter = null; };
  }, []);

  // record recently-viewed when a deep dive opens
  useEffect(() => {
    if (code) pushRecent(code);
  }, [code, pushRecent]);

  const asset = useMemo(() => ASSETS.find((a) => a.code === code) || null, [code]);
  const leg = useMemo(() => (asset ? LEGS.find((l) => l.id === asset.leg)! : null), [asset]);
  const pipe = useMemo(() => (asset ? PIPELINE_STEPS.find((p) => p.assetCode === asset.code) : undefined), [asset]);
  const resistance = useMemo(() => {
    if (!asset) return [];
    return RESISTANCE_STATUSES.filter((s) => s.assetCode === asset.code);
  }, [asset]);
  const combos = useMemo(() => {
    if (!asset) return [];
    return COMBINATIONS.filter((c) =>
      c.legs.some((l) => l.note.toLowerCase().includes(asset.code.toLowerCase())) ||
      c.asset.toLowerCase().includes(asset.code.toLowerCase())
    );
  }, [asset]);

  // close on Escape
  useEffect(() => {
    if (!code) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setCode(null);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [code]);

  return (
    <AnimatePresence>
      {asset && leg && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto bg-[#0D1013]/80 px-4 py-8 backdrop-blur-sm sm:py-12"
          onClick={() => setCode(null)}
        >
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="relative w-full max-w-3xl overflow-hidden rounded-2xl border border-[#262D34] bg-[#0D1013] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* header */}
            <div className="relative border-b border-[#1F262D] p-6" style={{ background: `linear-gradient(135deg, ${leg.color}10, transparent)` }}>
              <div className="absolute right-4 top-4 flex items-center gap-1.5">
                <button
                  onClick={() => togglePin(asset.code)}
                  className="flex h-8 w-8 items-center justify-center rounded-md border transition-colors"
                  style={{
                    borderColor: isPinned(asset.code) ? leg.color : "#262D34",
                    background: isPinned(asset.code) ? `${leg.color}18` : "transparent",
                    color: isPinned(asset.code) ? leg.color : "#8B9299",
                  }}
                  aria-label={isPinned(asset.code) ? `Unpin ${asset.code}` : `Pin ${asset.code}`}
                  title={isPinned(asset.code) ? "Unpin" : "Pin to strip"}
                >
                  <Pin className="h-4 w-4" style={{ fill: isPinned(asset.code) ? leg.color : "none" }} />
                </button>
                <button
                  onClick={() => setCode(null)}
                  className="flex h-8 w-8 items-center justify-center rounded-md border border-[#262D34] text-[#8B9299] transition-colors hover:border-[#E8664F]/40 hover:text-[#E8664F]"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="onc-mono rounded px-2 py-0.5 text-[10px] uppercase tracking-[0.1em]"
                  style={{ background: `${leg.color}18`, color: leg.color }}
                >
                  Leg {leg.id} · {leg.short}
                </span>
                <span
                  className="onc-mono rounded px-2 py-0.5 text-[10px] uppercase tracking-[0.1em] border"
                  style={{ borderColor: "#262D34", color: "#C9BFB5" }}
                >
                  Tier {asset.tier}/5
                </span>
                <span
                  className="onc-mono rounded px-2 py-0.5 text-[10px] uppercase tracking-[0.1em] border"
                  style={{ borderColor: "#262D34", color: "#C9BFB5" }}
                >
                  {asset.status}
                </span>
              </div>
              <h2 className="onc-mono mt-3 text-[20px] font-semibold text-[#E9E7DF]">{asset.code}</h2>
              <p className="onc-sans mt-1 text-[14px] text-[#C9BFB5]">{asset.name}</p>
              <div className="onc-mono mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10.5px] text-[#8B9299]">
                <span>sponsor: <span className="text-[#C9BFB5]">{asset.sponsor}</span></span>
                <span>·</span>
                <span>modality: <span className="text-[#C9BFB5]">{asset.modality}</span></span>
                <span>·</span>
                <span>target: <span className="text-[#C9BFB5]">{asset.target}</span></span>
              </div>
            </div>

            {/* body */}
            <div className="onc-scroll max-h-[calc(100vh-220px)] overflow-y-auto p-6">
              {/* summary */}
              <Section icon={Activity} label="Evidence summary" color={leg.color}>
                <p className="onc-sans text-[12.5px] leading-relaxed text-[#C9BFB5]">{asset.summary}</p>
              </Section>

              {/* tier ladder */}
              <Section icon={TrendingUp} label="Evidence tier" color={leg.color}>
                <div className="flex items-center gap-1">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="flex-1">
                      <div
                        className="h-2 rounded-sm"
                        style={{ background: i <= asset.tier ? leg.color : "#1F262D" }}
                      />
                      <div className="onc-mono mt-1 text-center text-[9px]" style={{ color: i <= asset.tier ? leg.color : "#5C646C" }}>T{i}</div>
                    </div>
                  ))}
                </div>
                <p className="onc-sans mt-2 text-[11.5px] text-[#8B9299]">
                  Currently at <span className="onc-mono font-semibold" style={{ color: leg.color }}>tier {asset.tier}/5</span>. {pipe ? `Next rung: tier ${pipe.targetTier}.` : ""}
                </p>
              </Section>

              {/* pipeline */}
              {pipe && (
                <Section icon={Clock} label="Pipeline — next rung gap" color={leg.color}>
                  <div className="rounded-lg border border-[#1F262D] bg-[#0A0D10] p-3.5">
                    <div className="flex items-center justify-between">
                      <span className="onc-mono text-[11px]" style={{ color: leg.color }}>
                        T{pipe.currentTier} → T{pipe.targetTier}
                      </span>
                      <span className="onc-mono text-[10px] uppercase tracking-[0.04em] text-[#5C646C]">{pipe.eta}</span>
                    </div>
                    <p className="onc-sans mt-2 text-[12px] leading-relaxed text-[#C9BFB5]">{pipe.nextGap}</p>
                  </div>
                </Section>
              )}

              {/* resistance profile */}
              {resistance.length > 0 && (
                <Section icon={ShieldAlert} label="Resistance profile" color="#9E8CF2">
                  <div className="space-y-2">
                    {resistance.map((r) => {
                      const mech = RESISTANCE_MECHANISMS.find((m) => m.id === r.mechanismId);
                      if (!mech) return null;
                      const meta = STATUS_META[r.status];
                      const Icon = meta.Icon;
                      return (
                        <div key={r.mechanismId} className="flex items-start gap-3 rounded-lg border border-[#1F262D] bg-[#0A0D10] p-3">
                          <div
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
                            style={{ background: `${meta.color}18` }}
                          >
                            <Icon className="h-3.5 w-3.5" style={{ color: meta.color }} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="onc-sans text-[12px] font-medium text-[#E9E7DF]">{mech.name}</span>
                              <span className="onc-mono text-[9px] uppercase tracking-[0.06em] text-[#5C646C]">{mech.category}</span>
                            </div>
                            <p className="onc-sans mt-0.5 text-[11px] leading-snug text-[#8B9299]">{r.note}</p>
                          </div>
                          <span className="onc-mono shrink-0 text-[10px] uppercase tracking-[0.06em] font-semibold" style={{ color: meta.color }}>
                            {meta.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </Section>
              )}

              {/* related experiments */}
              {(() => {
                const related = EXPERIMENTS.filter((e) =>
                  e.legs.split(",").map((n) => Number(n.trim())).includes(asset.leg) ||
                  e.objective.toLowerCase().includes(asset.target.toLowerCase().split(" ")[0]) ||
                  e.hypothesis.toLowerCase().includes(asset.modality.toLowerCase().split(" ")[0])
                ).slice(0, 3);
                if (related.length === 0) return null;
                return (
                  <Section icon={FlaskConical} label="Related experiments" color={leg.color}>
                    <div className="space-y-2">
                      {related.map((e) => (
                        <div key={e.number} className="flex items-start gap-3 rounded-lg border border-[#1F262D] bg-[#0A0D10] p-3">
                          <span className="onc-mono flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-[#262D34] bg-[#161B20] text-[11px] font-semibold text-[#4FD1C0]">
                            {String(e.number).padStart(2, "0")}
                          </span>
                          <div className="min-w-0">
                            <div className="onc-sans text-[12px] font-medium text-[#E9E7DF]">{e.title}</div>
                            <p className="onc-sans mt-0.5 text-[10.5px] leading-snug text-[#8B9299] line-clamp-2">{e.objective}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Section>
                );
              })()}

              {/* combination scores */}
              {combos.length > 0 && (
                <Section icon={Layers} label="Combination scores" color="#E8A94D">
                  <div className="space-y-2">
                    {combos.map((c, i) => (
                      <div key={i} className="rounded-lg border border-[#1F262D] bg-[#0A0D10] p-3.5">
                        <div className="onc-sans text-[12px] font-medium text-[#E9E7DF]">{c.asset}</div>
                        <p className="onc-sans mt-1.5 text-[11px] italic leading-snug text-[#8B9299]">{c.verdict}</p>
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              {/* glossary nudge */}
              <div className="mt-6 rounded-lg border border-[#1F262D] bg-[#0A0D10] p-4">
                <p className="onc-sans text-[11.5px] leading-relaxed text-[#5C646C]">
                  Terms in this view — like <GTerm>PROTAC</GTerm>, <GTerm>ctDNA</GTerm>,{" "}
                  <GTerm>organoid</GTerm>, and <GTerm>xenograft</GTerm> — are hoverable for definitions.
                  See the <a href="#glossary" onClick={() => setCode(null)} className="text-[#4FD1C0] hover:underline">full glossary</a>.
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Section({
  icon: Icon, label, color, children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string; color: string; children: React.ReactNode;
}) {
  return (
    <div className="mb-5">
      <div className="onc-mono mb-2 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.1em]" style={{ color }}>
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      {children}
    </div>
  );
}
