"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Calculator, GitCommit, ArrowRight, CheckCircle2, Circle, AlertTriangle } from "lucide-react";
import { ASSETS, LEGS, TIER_LADDER, PIPELINE_STEPS } from "@/lib/data";
import { GTerm } from "@/components/glossary-term";

export default function TierCalculator() {
  const [assetCode, setAssetCode] = useState<string>(ASSETS[0].code);
  const [claimedTiers, setClaimedTiers] = useState<Set<number>>(new Set());

  const asset = ASSETS.find((a) => a.code === assetCode)!;
  const leg = LEGS.find((l) => l.id === asset.leg)!;
  const pipe = PIPELINE_STEPS.find((p) => p.assetCode === asset.code);

  // the asset's actual reviewed tier (the "known" ceiling)
  const reviewedTier = asset.tier;

  // current computed tier = highest consecutive tier the user has claimed, capped at the reviewed tier
  const computedTier = useMemo(() => {
    let t = 0;
    for (let i = 0; i <= 5; i++) {
      if (claimedTiers.has(i) && i <= reviewedTier) t = i;
      else break;
    }
    return t;
  }, [claimedTiers, reviewedTier]);

  const nextTier = Math.min(5, computedTier + 1);
  const nextTierDef = TIER_LADDER[nextTier];
  const canAdvance = computedTier < reviewedTier;
  const atCeiling = computedTier === reviewedTier && computedTier < 5;

  function toggle(tier: number) {
    setClaimedTiers((prev) => {
      const next = new Set(prev);
      // must claim consecutively: can only toggle a tier if the one below is claimed (or it's 0)
      if (next.has(tier)) {
        // unclaiming removes this tier and all above
        for (let i = tier; i <= 5; i++) next.delete(i);
      } else {
        // claiming requires the tier below to be claimed (or tier 0)
        if (tier === 0 || next.has(tier - 1)) next.add(tier);
      }
      return next;
    });
  }

  // when asset changes, reset claims to the reviewed tier's consecutive set
  function selectAsset(code: string) {
    setAssetCode(code);
    const a = ASSETS.find((x) => x.code === code)!;
    // pre-fill claims up to the asset's actual reviewed tier (so the calculator starts at "known")
    const filled = new Set<number>();
    for (let i = 0; i <= a.tier; i++) filled.add(i);
    setClaimedTiers(filled);
  }

  return (
    <section id="calculator" className="border-t border-[#1F262D] py-20 md:py-28 bg-[#0A0D10]">
      <div className="mx-auto max-w-7xl px-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="onc-mono text-[10.5px] uppercase tracking-[0.16em] text-[#E8A94D]">
              Tier calculator
            </div>
            <h2 className="onc-sans mt-3 max-w-2xl text-[28px] font-semibold leading-tight tracking-[-0.01em] text-[#E9E7DF] md:text-[36px]">
              Pick an asset, claim your evidence — see the tier you sit at.
            </h2>
            <p className="onc-sans mt-3 max-w-2xl text-[14px] leading-relaxed text-[#8B9299]">
              An interactive ladder: toggle which evidence tiers you have for an asset, and the
              calculator shows the tier you&apos;ve cleared (consecutively), the next rung, and the
              specific gap to climb it. The reviewed ceiling is the asset&apos;s actual tier — you
              can&apos;t claim above it. Terms like <GTerm>DC50</GTerm>, <GTerm>xenograft</GTerm>,{" "}
              <GTerm>ctDNA</GTerm> are hoverable.
            </p>
          </div>
          <div className="onc-mono text-[10.5px] text-[#5C646C]">
            evidence ladder · 0 → 5
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_420px]">
          {/* left: asset picker + tier ladder */}
          <div>
            {/* asset picker */}
            <div className="mb-4">
              <label className="onc-mono mb-2 block text-[10px] uppercase tracking-[0.1em] text-[#5C646C]">
                Asset
              </label>
              <div className="flex flex-wrap gap-1.5">
                {ASSETS.map((a) => {
                  const al = LEGS.find((l) => l.id === a.leg)!;
                  const isSel = a.code === assetCode;
                  return (
                    <button
                      key={a.code}
                      onClick={() => selectAsset(a.code)}
                      className="onc-mono flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[10.5px] font-semibold transition-all"
                      style={{
                        borderColor: isSel ? al.color : "#1F262D",
                        background: isSel ? `${al.color}12` : "transparent",
                        color: isSel ? al.color : "#8B9299",
                      }}
                    >
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: al.color }} />
                      {a.code}
                      <span className="text-[9px] font-normal opacity-70">T{a.tier}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* tier ladder — interactive */}
            <div className="rounded-xl border border-[#1F262D] bg-[#0D1013] p-5">
              <div className="onc-mono mb-3 flex items-center gap-2 text-[10.5px] uppercase tracking-[0.1em] text-[#5C646C]">
                <Calculator className="h-3.5 w-3.5 text-[#E8A94D]" />
                Claimed evidence tiers (click to toggle — must be consecutive)
              </div>
              <div className="space-y-1.5">
                {TIER_LADDER.map((t) => {
                  const claimed = claimedTiers.has(t.tier);
                  const isCurrent = claimed && (t.tier === 5 || !claimedTiers.has(t.tier + 1));
                  const isCeiling = t.tier === reviewedTier;
                  const isAboveCeiling = t.tier > reviewedTier;
                  const canClaim = t.tier === 0 || claimedTiers.has(t.tier - 1);
                  return (
                    <button
                      key={t.tier}
                      onClick={() => !isAboveCeiling && toggle(t.tier)}
                      disabled={isAboveCeiling || (!claimed && !canClaim)}
                      className="group flex w-full items-start gap-3 rounded-md border p-3 text-left transition-all"
                      style={{
                        borderColor: isCurrent ? leg.color : claimed ? `${leg.color}40` : "#1F262D",
                        background: claimed ? `${leg.color}0a` : "transparent",
                        opacity: isAboveCeiling ? 0.35 : 1,
                        cursor: isAboveCeiling ? "not-allowed" : "pointer",
                      }}
                    >
                      <div
                        className="onc-mono mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded text-[11px] font-semibold"
                        style={{
                          background: claimed ? leg.color : "#161B20",
                          color: claimed ? "#0D1013" : "#8B9299",
                        }}
                      >
                        {t.tier}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="onc-sans text-[13px] font-medium text-[#E9E7DF]">{t.name}</span>
                          <div className="flex items-center gap-1.5">
                            {isCeiling && (
                              <span className="onc-mono text-[8.5px] uppercase tracking-[0.06em] text-[#E8A94D]">
                                reviewed ceiling
                              </span>
                            )}
                            {isCurrent && (
                              <span className="onc-mono text-[8.5px] uppercase tracking-[0.06em]" style={{ color: leg.color }}>
                                you are here
                              </span>
                            )}
                          </div>
                        </div>
                        <p className="onc-sans mt-0.5 text-[11px] leading-snug text-[#8B9299]">{t.establishes}</p>
                      </div>
                      {claimed ? (
                        <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: leg.color }} />
                      ) : isAboveCeiling ? (
                        <AlertTriangle className="h-4 w-4 shrink-0 text-[#5C646C]" />
                      ) : (
                        <Circle className="h-4 w-4 shrink-0 text-[#3A4148]" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* right: computed tier + next rung */}
          <div className="space-y-4">
            {/* current tier readout */}
            <div
              className="rounded-xl border p-5"
              style={{ borderColor: `${leg.color}40`, background: `${leg.color}08` }}
            >
              <div className="onc-mono mb-2 text-[10px] uppercase tracking-[0.1em]" style={{ color: leg.color }}>
                Computed tier
              </div>
              <div className="flex items-baseline gap-2">
                <span className="onc-mono text-[44px] font-semibold leading-none text-[#E9E7DF]">
                  T{computedTier}
                </span>
                <span className="onc-mono text-[16px] text-[#5C646C]">/ 5</span>
              </div>
              <div className="onc-sans mt-2 text-[12px] text-[#8B9299]">
                {computedTier === 0
                  ? "No evidence claimed yet."
                  : `Highest consecutive tier cleared for ${asset.code}.`}
              </div>
              <div className="mt-3 flex gap-0.5">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-1.5 flex-1 rounded-sm"
                    style={{ background: i <= computedTier ? leg.color : "#1F262D" }}
                  />
                ))}
              </div>
            </div>

            {/* next rung gap */}
            {computedTier < 5 && (
              <div className="rounded-xl border border-[#1F262D] bg-[#0D1013] p-5">
                <div className="onc-mono mb-2 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.1em] text-[#5C646C]">
                  <GitCommit className="h-3.5 w-3.5 text-[#E8A94D]" />
                  Next rung — T{computedTier} → T{nextTier}
                </div>
                {canAdvance ? (
                  <>
                    <p className="onc-sans text-[12.5px] leading-relaxed text-[#C9BFB5]">
                      <span className="onc-mono text-[10px] uppercase tracking-[0.06em] text-[#5C646C]">to claim T{nextTier}: </span>
                      {nextTierDef.establishes}
                    </p>
                    {pipe && pipe.currentTier === computedTier && (
                      <div className="mt-3 rounded-lg border border-[#9E8CF2]/25 bg-[#9E8CF2]/06 p-3">
                        <div className="onc-mono mb-1 text-[9.5px] uppercase tracking-[0.08em] text-[#9E8CF2]">
                          {asset.code} pipeline gap
                        </div>
                        <p className="onc-sans text-[11.5px] leading-relaxed text-[#C9BFB5]">{pipe.nextGap}</p>
                        <div className="onc-mono mt-1.5 text-[10px] uppercase tracking-[0.04em] text-[#5C646C]">
                          {pipe.eta}
                        </div>
                      </div>
                    )}
                  </>
                ) : atCeiling ? (
                  <div className="rounded-lg border border-[#E8A94D]/25 bg-[#E8A94D]/06 p-3">
                    <div className="onc-mono mb-1 flex items-center gap-1.5 text-[9.5px] uppercase tracking-[0.08em] text-[#E8A94D]">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      At the reviewed ceiling
                    </div>
                    <p className="onc-sans text-[11.5px] leading-relaxed text-[#C9BFB5]">
                      You&apos;ve claimed every tier the reviewed evidence supports for {asset.code}. To
                      reach T{nextTier}, new evidence must be generated — {pipe?.nextGap || "see the pipeline section."}
                    </p>
                  </div>
                ) : null}
              </div>
            )}

            {/* asset summary line */}
            <div className="rounded-xl border border-[#1F262D] bg-[#0D1013] p-4">
              <div className="flex items-center gap-2">
                <span className="onc-mono text-[12px] font-semibold text-[#E9E7DF]">{asset.code}</span>
                <span className="onc-mono rounded px-1.5 py-0.5 text-[9px] uppercase tracking-[0.06em]" style={{ background: `${leg.color}18`, color: leg.color }}>
                  Leg {leg.id} · {leg.short}
                </span>
              </div>
              <p className="onc-sans mt-2 text-[11px] leading-relaxed text-[#8B9299]">{asset.summary}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
