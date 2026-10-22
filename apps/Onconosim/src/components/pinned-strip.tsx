"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Pin, X, ExternalLink } from "lucide-react";
import { usePinnedAssets } from "@/hooks/use-pinned-assets";
import { ASSETS, LEGS } from "@/lib/data";
import { openAssetDeepDive } from "@/components/asset-deep-dive";

export default function PinnedStrip() {
  const { pinned, toggle } = usePinnedAssets();
  const pinnedAssets = ASSETS.filter((a) => pinned.includes(a.code));

  if (pinnedAssets.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 12 }}
        className="fixed bottom-20 left-1/2 z-40 -translate-x-1/2 xl:left-6 xl:translate-x-0 xl:bottom-6"
      >
        <div className="flex items-center gap-2 rounded-xl border border-[#262D34] bg-[#0D1013]/95 px-3 py-2.5 shadow-2xl backdrop-blur-md">
          <div className="onc-mono hidden items-center gap-1.5 border-r border-[#1F262D] pr-2 text-[10px] uppercase tracking-[0.08em] text-[#4FD1C0] sm:flex">
            <Pin className="h-3 w-3" />
            Pinned
          </div>
          <div className="flex max-w-[60vw] items-center gap-1.5 overflow-x-auto onc-scroll xl:max-w-[420px]">
            {pinnedAssets.map((a) => {
              const leg = LEGS.find((l) => l.id === a.leg)!;
              return (
                <div
                  key={a.code}
                  className="group flex shrink-0 items-center gap-1.5 rounded-md border px-2 py-1"
                  style={{ borderColor: `${leg.color}30`, background: `${leg.color}08` }}
                >
                  <button
                    onClick={() => openAssetDeepDive(a.code)}
                    className="onc-mono flex items-center gap-1 text-[11px] font-semibold text-[#E9E7DF] transition-colors hover:text-[#4FD1C0]"
                    title={`${a.code} — ${a.name}`}
                  >
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: leg.color }} />
                    {a.code}
                    <ExternalLink className="h-2.5 w-2.5 opacity-0 transition-opacity group-hover:opacity-100" />
                  </button>
                  <button
                    onClick={() => toggle(a.code)}
                    className="text-[#5C646C] transition-colors hover:text-[#E8664F]"
                    aria-label={`Unpin ${a.code}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
