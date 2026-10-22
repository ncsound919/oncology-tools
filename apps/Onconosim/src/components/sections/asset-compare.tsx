"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Swords, GitCompare, Loader2, Sparkles, ExternalLink } from "lucide-react";
import {
  ASSETS,
  LEGS,
  RESISTANCE_MECHANISMS,
  RESISTANCE_STATUSES,
  PIPELINE_STEPS,
  ASSET_COMPARISON_PAIRS,
} from "@/lib/data";
import { openAssetDeepDive } from "@/components/asset-deep-dive";

type Status = "overcomes" | "vulnerable" | "unknown";
const STATUS_META: Record<Status, { label: string; color: string; symbol: string }> = {
  overcomes: { label: "Overcomes", color: "#4FD1C0", symbol: "✓" },
  vulnerable: { label: "Vulnerable", color: "#E8664F", symbol: "✕" },
  unknown: { label: "Unknown", color: "#8B9299", symbol: "?" },
};

export default function AssetCompare() {
  const [pair, setPair] = useState(0);
  const currentPair = ASSET_COMPARISON_PAIRS[pair];
  const assetA = ASSETS.find((a) => a.code === currentPair.a)!;
  const assetB = ASSETS.find((a) => a.code === currentPair.b)!;
  const legA = LEGS.find((l) => l.id === assetA.leg)!;
  const legB = LEGS.find((l) => l.id === assetB.leg)!;
  const pipeA = PIPELINE_STEPS.find((p) => p.assetCode === assetA.code);
  const pipeB = PIPELINE_STEPS.find((p) => p.assetCode === assetB.code);

  // resistance profiles
  const resistA = useMemo(() => {
    const m = new Map<string, Status>();
    for (const s of RESISTANCE_STATUSES) if (s.assetCode === assetA.code) m.set(s.mechanismId, s.status);
    return m;
  }, [assetA.code]);
  const resistB = useMemo(() => {
    const m = new Map<string, Status>();
    for (const s of RESISTANCE_STATUSES) if (s.assetCode === assetB.code) m.set(s.mechanismId, s.status);
    return m;
  }, [assetB.code]);

  // mechanisms that at least one asset has a status for
  const relevantMechanisms = RESISTANCE_MECHANISMS.filter(
    (m) => resistA.has(m.id) || resistB.has(m.id)
  );

  return (
    <section id="compare" className="border-t border-[#1F262D] py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="onc-mono text-[10.5px] uppercase tracking-[0.16em] text-[#E8A94D]">
              Head-to-head
            </div>
            <h2 className="onc-sans mt-3 max-w-2xl text-[28px] font-semibold leading-tight tracking-[-0.01em] text-[#E9E7DF] md:text-[36px]">
              Compare two assets side-by-side — tier, resistance, pipeline.
            </h2>
            <p className="onc-sans mt-3 max-w-2xl text-[14px] leading-relaxed text-[#8B9299]">
              Pick a pair and compare them across three dimensions: current evidence tier,
              resistance-mechanism profile, and pipeline progression. A higher tier on one
              dimension does not imply a higher tier on another.
            </p>
          </div>
          <div className="onc-mono flex items-center gap-1.5 text-[10.5px] uppercase tracking-[0.1em] text-[#5C646C]">
            <Swords className="h-3.5 w-3.5 text-[#E8A94D]" />
            {ASSET_COMPARISON_PAIRS.length} curated pairs
          </div>
        </div>

        {/* pair selector */}
        <div className="mt-8 flex flex-wrap gap-2">
          {ASSET_COMPARISON_PAIRS.map((p, i) => (
            <button
              key={i}
              onClick={() => setPair(i)}
              className="onc-mono rounded-md border px-3 py-1.5 text-[10.5px] uppercase tracking-[0.06em] transition-all"
              style={{
                borderColor: i === pair ? "#E8A94D" : "#1F262D",
                background: i === pair ? "rgba(232,169,77,0.10)" : "transparent",
                color: i === pair ? "#E8A94D" : "#8B9299",
              }}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* comparison grid */}
        <AnimatePresence mode="wait">
          <motion.div
            key={pair}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2"
          >
            {/* Asset A */}
            <AssetCard
              asset={assetA}
              leg={legA}
              pipe={pipeA}
              resistance={resistA}
              mechanisms={relevantMechanisms}
              accent="#4FD1C0"
              side="A"
            />
            {/* Asset B */}
            <AssetCard
              asset={assetB}
              leg={legB}
              pipe={pipeB}
              resistance={resistB}
              mechanisms={relevantMechanisms}
              accent="#9E8CF2"
              side="B"
            />
          </motion.div>
        </AnimatePresence>

        {/* resistance comparison matrix */}
        <div className="mt-6 overflow-hidden rounded-xl border border-[#1F262D] bg-[#0D1013]">
          <div className="onc-mono flex items-center gap-2 border-b border-[#1F262D] px-5 py-3 text-[10.5px] uppercase tracking-[0.1em] text-[#5C646C]">
            <GitCompare className="h-3.5 w-3.5 text-[#E8A94D]" />
            Resistance-mechanism comparison
          </div>
          <div className="grid grid-cols-[1fr_80px_80px] gap-2 px-5 py-3 onc-mono text-[9.5px] uppercase tracking-[0.06em] text-[#5C646C] border-b border-[#1F262D]">
            <div>Mechanism</div>
            <div className="text-center" style={{ color: legA.color }}>{assetA.code}</div>
            <div className="text-center" style={{ color: legB.color }}>{assetB.code}</div>
          </div>
          <div className="divide-y divide-[#161B20]">
            {relevantMechanisms.map((m) => {
              const sa = resistA.get(m.id);
              const sb = resistB.get(m.id);
              return (
                <div key={m.id} className="grid grid-cols-[1fr_80px_80px] gap-2 px-5 py-2.5 items-center">
                  <div className="onc-sans text-[11.5px] text-[#C9BFB5]">{m.name}</div>
                  <div className="flex justify-center">
                    {sa ? (
                      <StatusBadge status={sa} />
                    ) : (
                      <span className="onc-mono text-[12px] text-[#262D34]">·</span>
                    )}
                  </div>
                  <div className="flex justify-center">
                    {sb ? (
                      <StatusBadge status={sb} />
                    ) : (
                      <span className="onc-mono text-[12px] text-[#262D34]">·</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function AssetCard({
  asset,
  leg,
  pipe,
  resistance,
  mechanisms,
  accent,
  side,
}: {
  asset: typeof ASSETS[0];
  leg: typeof LEGS[0];
  pipe: { currentTier: number; targetTier: number; nextGap: string; eta: string } | undefined;
  resistance: Map<string, Status>;
  mechanisms: typeof RESISTANCE_MECHANISMS;
  accent: string;
  side: "A" | "B";
}) {
  const overcomeCount = Array.from(resistance.values()).filter((s) => s === "overcomes").length;
  const vulnerableCount = Array.from(resistance.values()).filter((s) => s === "vulnerable").length;
  const unknownCount = Array.from(resistance.values()).filter((s) => s === "unknown").length;

  return (
    <div
      className="rounded-xl border bg-[#0D1013] p-5"
      style={{ borderColor: `${accent}40` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="onc-mono flex h-7 w-7 items-center justify-center rounded-md text-[11px] font-semibold"
              style={{ background: accent, color: "#0D1013" }}
            >
              {side}
            </span>
            <button
              onClick={() => openAssetDeepDive(asset.code)}
              className="onc-mono group inline-flex items-center gap-1.5 text-[14px] font-semibold text-[#E9E7DF] transition-colors hover:text-[#4FD1C0]"
              title="Open deep dive"
            >
              {asset.code}
              <ExternalLink className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
            </button>
          </div>
          <div className="onc-sans mt-1.5 text-[12px] leading-snug text-[#C9BFB5]">{asset.name}</div>
        </div>
        <span
          className="onc-mono shrink-0 rounded px-1.5 py-0.5 text-[9.5px] uppercase tracking-[0.06em]"
          style={{ background: `${leg.color}18`, color: leg.color }}
        >
          Leg {leg.id} · {leg.short}
        </span>
      </div>

      {/* tier + meta */}
      <div className="mt-4 grid grid-cols-3 gap-2">
        <Metric label="Current tier" value={`T${asset.tier}/5`} color={leg.color} />
        <Metric label="Status" value={asset.status} color="#C9BFB5" small />
        <Metric label="Modality" value={asset.modality.split(" ")[0]} color="#C9BFB5" small />
      </div>

      {/* resistance summary */}
      <div className="mt-4">
        <div className="onc-mono mb-2 text-[10px] uppercase tracking-[0.1em] text-[#5C646C]">
          Resistance profile
        </div>
        <div className="grid grid-cols-3 gap-2">
          <ResistStat label="Overcomes" value={overcomeCount} color="#4FD1C0" />
          <ResistStat label="Vulnerable" value={vulnerableCount} color="#E8664F" />
          <ResistStat label="Unknown" value={unknownCount} color="#8B9299" />
        </div>
      </div>

      {/* pipeline */}
      {pipe && (
        <div className="mt-4 border-t border-[#1F262D] pt-3">
          <div className="onc-mono mb-2 text-[10px] uppercase tracking-[0.1em] text-[#5C646C]">
            Pipeline — climb T{pipe.currentTier} → T{pipe.targetTier}
          </div>
          <div className="flex gap-0.5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-1.5 flex-1 rounded-sm"
                style={{ background: i <= pipe.currentTier ? leg.color : i <= pipe.targetTier ? `${leg.color}40` : "#1F262D" }}
              />
            ))}
          </div>
          <p className="onc-sans mt-2 text-[10.5px] leading-snug text-[#8B9299]">{pipe.nextGap}</p>
          <div className="onc-mono mt-1.5 text-[10px] uppercase tracking-[0.04em] text-[#5C646C]">
            {pipe.eta}
          </div>
        </div>
      )}

      {/* summary */}
      <div className="mt-4 border-t border-[#1F262D] pt-3">
        <p className="onc-sans text-[11px] leading-relaxed text-[#8B9299]">{asset.summary}</p>
      </div>
    </div>
  );
}

function Metric({ label, value, color, small = false }: { label: string; value: string; color: string; small?: boolean }) {
  return (
    <div className="rounded-md border border-[#1F262D] bg-[#0A0D10] px-2.5 py-2">
      <div className="onc-mono text-[9px] uppercase tracking-[0.06em] text-[#5C646C]">{label}</div>
      <div className="onc-mono mt-0.5 font-semibold" style={{ color, fontSize: small ? 11 : 14 }}>
        {value}
      </div>
    </div>
  );
}

function ResistStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-md border border-[#1F262D] bg-[#0A0D10] px-2.5 py-2 text-center">
      <div className="onc-mono text-[18px] font-semibold" style={{ color }}>{value}</div>
      <div className="onc-mono mt-0.5 text-[8.5px] uppercase tracking-[0.06em] text-[#5C646C]">{label}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: Status }) {
  const m = STATUS_META[status];
  return (
    <span
      className="flex h-6 w-6 items-center justify-center rounded text-[12px] font-semibold"
      style={{ background: `${m.color}18`, color: m.color }}
      title={m.label}
    >
      {m.symbol}
    </span>
  );
}
