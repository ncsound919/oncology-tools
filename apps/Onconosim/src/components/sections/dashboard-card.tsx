"use client";

import { motion } from "framer-motion";
import {
  Pin, Clock, BarChart3, ArrowRight, Layers, Trash2, ExternalLink,
} from "lucide-react";
import { ASSETS, LEGS, TIER_LADDER } from "@/lib/data";
import { usePinnedAssets } from "@/hooks/use-pinned-assets";
import { useRecentAssets } from "@/hooks/use-recent-assets";
import { openAssetDeepDive } from "@/components/asset-deep-dive";

export default function DashboardCard() {
  const { pinned, toggle: togglePin } = usePinnedAssets();
  const { recent, clear: clearRecent } = useRecentAssets();

  const pinnedAssets = ASSETS.filter((a) => pinned.includes(a.code));
  const recentAssets = ASSETS.filter((a) => recent.includes(a.code));

  // aggregate tier distribution across ALL tracked assets
  const tierCounts = TIER_LADDER.map((t) => ({
    tier: t.tier,
    name: t.name,
    count: ASSETS.filter((a) => a.tier === t.tier).length,
  }));
  const maxCount = Math.max(...tierCounts.map((t) => t.count), 1);

  // pinned tier distribution
  const pinnedTiers = TIER_LADDER.map((t) => pinnedAssets.filter((a) => a.tier === t.tier).length);
  const pinnedLegs = LEGS.map((l) => ({ leg: l, count: pinnedAssets.filter((a) => a.leg === l.id).length }));

  const hasActivity = pinnedAssets.length > 0 || recentAssets.length > 0;

  return (
    <section id="dashboard" className="border-t border-[#1F262D] bg-[#0A0D10] py-12 md:py-16">
      <div className="mx-auto max-w-7xl px-5">
        <div className="flex items-center gap-2 mb-5">
          <BarChart3 className="h-4 w-4 text-[#4FD1C0]" />
          <h2 className="onc-mono text-[11px] uppercase tracking-[0.14em] text-[#4FD1C0]">
            Your dashboard
          </h2>
          <span className="onc-mono text-[10px] text-[#5C646C] ml-2">
            {pinnedAssets.length} pinned · {recentAssets.length} recent
          </span>
        </div>

        {!hasActivity ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-xl border border-dashed border-[#1F262D] bg-[#0D1013] px-6 py-10 text-center"
          >
            <Layers className="mx-auto mb-3 h-7 w-7 text-[#3A4148]" />
            <p className="onc-sans text-[13px] text-[#8B9299]">
              Pin assets or open a deep dive to build your personalized dashboard.
            </p>
            <p className="onc-sans mt-1 text-[11.5px] text-[#5C646C]">
              Your pinned + recently-viewed assets, plus an aggregate tier distribution, will appear here.
            </p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {/* Pinned assets */}
            <DashCard
              icon={Pin}
              label="Pinned assets"
              color="#4FD1C0"
              count={pinnedAssets.length}
              emptyText="No pinned assets yet. Click the pin icon on any asset."
            >
              {pinnedAssets.length > 0 && (
                <div className="space-y-1.5">
                  {pinnedAssets.map((a) => {
                    const leg = LEGS.find((l) => l.id === a.leg)!;
                    return (
                      <div
                        key={a.code}
                        className="group flex items-center gap-2 rounded-md border border-[#1F262D] bg-[#0A0D10] px-2.5 py-1.5"
                      >
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: leg.color }} />
                        <button
                          onClick={() => openAssetDeepDive(a.code)}
                          className="onc-mono flex-1 truncate text-left text-[11.5px] font-semibold text-[#E9E7DF] transition-colors group-hover:text-[#4FD1C0]"
                          title={a.name}
                        >
                          {a.code}
                          <span className="onc-sans ml-1.5 text-[10px] font-normal text-[#8B9299]">T{a.tier}</span>
                        </button>
                        <ExternalLink className="h-3 w-3 shrink-0 text-[#5C646C] opacity-0 transition-opacity group-hover:opacity-100" />
                        <button
                          onClick={() => togglePin(a.code)}
                          className="text-[#5C646C] transition-colors hover:text-[#E8664F]"
                          aria-label={`Unpin ${a.code}`}
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    );
                  })}
                  {/* pinned leg distribution */}
                  <div className="mt-2 flex gap-1 pt-1.5 border-t border-[#1F262D]">
                    {pinnedLegs.map(({ leg, count }) => (
                      <div key={leg.id} className="flex-1 text-center" title={`${count} pinned on Leg ${leg.id}`}>
                        <div
                          className="mx-auto h-1.5 w-full rounded-sm"
                          style={{ background: count > 0 ? leg.color : "#1F262D", opacity: count > 0 ? 0.7 : 1 }}
                        />
                        <div className="onc-mono mt-1 text-[8.5px]" style={{ color: count > 0 ? leg.color : "#5C646C" }}>
                          L{leg.id}·{count}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </DashCard>

            {/* Recently viewed */}
            <DashCard
              icon={Clock}
              label="Recently viewed"
              color="#9E8CF2"
              count={recentAssets.length}
              emptyText="Open an asset deep dive to populate this list."
              action={recentAssets.length > 0 ? (
                <button
                  onClick={clearRecent}
                  className="onc-mono text-[9px] uppercase tracking-[0.06em] text-[#5C646C] transition-colors hover:text-[#E8664F]"
                >
                  Clear
                </button>
              ) : undefined}
            >
              {recentAssets.length > 0 && (
                <div className="space-y-1.5">
                  {recentAssets.map((a, i) => {
                    const leg = LEGS.find((l) => l.id === a.leg)!;
                    return (
                      <button
                        key={a.code}
                        onClick={() => openAssetDeepDive(a.code)}
                        className="group flex w-full items-center gap-2 rounded-md border border-[#1F262D] bg-[#0A0D10] px-2.5 py-1.5 text-left transition-colors hover:border-[#9E8CF2]/30"
                      >
                        <span className="onc-mono text-[9px] text-[#5C646C]">{String(i + 1).padStart(2, "0")}</span>
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: leg.color }} />
                        <span className="onc-mono flex-1 truncate text-[11.5px] font-semibold text-[#E9E7DF] group-hover:text-[#9E8CF2]">
                          {a.code}
                        </span>
                        <span className="onc-mono text-[9px] text-[#5C646C]">T{a.tier}</span>
                        <ArrowRight className="h-3 w-3 shrink-0 text-[#5C646C] opacity-0 transition-opacity group-hover:opacity-100" />
                      </button>
                    );
                  })}
                </div>
              )}
            </DashCard>

            {/* Aggregate tier distribution */}
            <DashCard
              icon={BarChart3}
              label="Evidence-tier distribution"
              color="#E8A94D"
              count={ASSETS.length}
              countLabel="total assets"
            >
              <div className="space-y-1.5">
                {tierCounts.map((t) => {
                  const isPinned = pinnedTiers[t.tier];
                  return (
                    <div key={t.tier} className="flex items-center gap-2">
                      <span className="onc-mono w-7 shrink-0 text-[10px] text-[#8B9299]">T{t.tier}</span>
                      <div className="relative flex-1 h-4 rounded-sm bg-[#0A0D10] overflow-hidden">
                        <div
                          className="absolute inset-y-0 left-0 rounded-sm transition-all"
                          style={{
                            width: `${(t.count / maxCount) * 100}%`,
                            background: ["#5C646C", "#E8664F", "#E8A94D", "#9E8CF2", "#4FD1C0", "#6EE7B7"][t.tier],
                            opacity: 0.7,
                          }}
                        />
                        {isPinned > 0 && (
                          <div
                            className="absolute inset-y-0 left-0 rounded-sm"
                            style={{
                              width: `${(isPinned / maxCount) * 100}%`,
                              background: "#4FD1C0",
                              borderRight: "1px solid #0D1013",
                            }}
                          />
                        )}
                      </div>
                      <span className="onc-mono w-12 shrink-0 text-right text-[10px] text-[#C9BFB5]">
                        {t.count}
                        {isPinned > 0 && <span className="text-[#4FD1C0]"> ({isPinned}📌)</span>}
                      </span>
                    </div>
                  );
                })}
              </div>
            </DashCard>
          </div>
        )}
      </div>
    </section>
  );
}

function DashCard({
  icon: Icon, label, color, count, countLabel, emptyText, children, action,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string; color: string; count: number; countLabel?: string;
  emptyText?: string; children?: React.ReactNode; action?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-[#1F262D] bg-[#0D1013] p-4">
      <div className="mb-3 flex items-center gap-2">
        <Icon className="h-3.5 w-3.5" style={{ color }} />
        <span className="onc-mono text-[10px] uppercase tracking-[0.1em]" style={{ color }}>
          {label}
        </span>
        <span className="onc-mono ml-auto text-[10px] text-[#5C646C]">
          {count} {countLabel || ""}
        </span>
        {action}
      </div>
      {count === 0 && emptyText ? (
        <p className="onc-sans py-4 text-center text-[11px] text-[#5C646C]">{emptyText}</p>
      ) : (
        children
      )}
    </div>
  );
}
