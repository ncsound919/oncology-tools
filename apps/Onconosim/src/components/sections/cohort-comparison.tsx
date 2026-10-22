"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { GitCompareArrows, Layers } from "lucide-react";
import { VARIANTS } from "@/lib/data";

const COHORTS = ["PDAC", "NSCLC", "CRC", "HCC", "MEL", "BRCA"] as const;
const COHORT_COLOR: Record<string, string> = {
  PDAC: "#4FD1C0",
  NSCLC: "#9E8CF2",
  CRC: "#E8A94D",
  HCC: "#E8664F",
  MEL: "#6EE7B7",
  BRCA: "#9F7AEA",
};

// Metrics derived from the variant set, per cohort:
//  - mutationDensity: number of distinct variants observed
//  - meanVAF: mean variant allele frequency
//  - maxVAF: highest VAF (dominant clone)
//  - hlaCoverage: fraction of variants with a predicted HLA binder (≤500nM)
//  - tierDiversity: number of distinct evidence tiers represented
//  - meanTier: average evidence tier (clinical maturity)
function computeMetrics() {
  const byCohort: Record<string, typeof VARIANTS> = {};
  for (const v of VARIANTS) {
    (byCohort[v.cohort] ??= []).push(v);
  }
  return COHORTS.map((c) => {
    const vs = byCohort[c] ?? [];
    const mutationDensity = vs.length;
    const meanVAF = vs.length ? vs.reduce((s, v) => s + v.alleleFreq, 0) / vs.length : 0;
    const maxVAF = vs.length ? Math.max(...vs.map((v) => v.alleleFreq)) : 0;
    const withBinder = vs.filter((v) => v.hlaBinding != null && v.hlaBinding <= 500);
    const hlaCoverage = vs.length ? withBinder.length / vs.length : 0;
    const tiers = new Set(vs.map((v) => v.tier));
    const tierDiversity = tiers.size;
    const meanTier = vs.length ? vs.reduce((s, v) => s + v.tier, 0) / vs.length : 0;
    return {
      cohort: c,
      color: COHORT_COLOR[c],
      raw: { mutationDensity, meanVAF, maxVAF, hlaCoverage, tierDiversity, meanTier },
    };
  });
}

const METRIC_LABELS: { key: keyof ReturnType<typeof computeMetrics>[0]["raw"]; label: string; invert?: boolean }[] = [
  { key: "mutationDensity", label: "Mutation density" },
  { key: "meanVAF", label: "Mean VAF" },
  { key: "maxVAF", label: "Max VAF (dominant clone)" },
  { key: "hlaCoverage", label: "HLA binder coverage" },
  { key: "tierDiversity", label: "Tier diversity" },
  { key: "meanTier", label: "Mean evidence tier" },
];

export default function CohortComparison() {
  const allMetrics = useMemo(() => computeMetrics(), []);
  const [selected, setSelected] = useState<string[]>(["PDAC", "NSCLC", "CRC"]);

  const selectedMetrics = allMetrics.filter((m) => selected.includes(m.cohort));

  // normalize each metric to 0..100 across all cohorts for the radar
  const maxima = useMemo(() => {
    const m: Record<string, number> = {};
    for (const { raw } of allMetrics) {
      for (const k of Object.keys(raw) as (keyof typeof raw)[]) {
        m[k] = Math.max(m[k] ?? 0, raw[k] as number);
      }
    }
    return m;
  }, [allMetrics]);

  const radarData = useMemo(() => {
    return METRIC_LABELS.map((metric) => {
      const row: Record<string, number | string> = { metric: metric.label };
      for (const m of selectedMetrics) {
        const val = m.raw[metric.key] as number;
        const max = maxima[metric.key] ?? 1;
        row[m.cohort] = max > 0 ? Math.round((val / max) * 100) : 0;
      }
      return row;
    });
  }, [selectedMetrics, maxima]);

  function toggle(c: string) {
    setSelected((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : prev.length >= 4 ? prev : [...prev, c]
    );
  }

  return (
    <section id="cohort" className="border-t border-[#1F262D] py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="onc-mono text-[10.5px] uppercase tracking-[0.16em] text-[#9E8CF2]">
              Cohort comparison
            </div>
            <h2 className="onc-sans mt-3 max-w-2xl text-[28px] font-semibold leading-tight tracking-[-0.01em] text-[#E9E7DF] md:text-[36px]">
              Side-by-side mutation-landscape comparison across cohorts.
            </h2>
            <p className="onc-sans mt-3 max-w-2xl text-[14px] leading-relaxed text-[#8B9299]">
              Pick up to 4 cohorts and compare them across six mutation-landscape metrics:
              mutation density, mean and max VAF, HLA-binder coverage, tier diversity, and mean
              clinical-maturity tier. Radar axes are normalized to the cohort with the maximum
              value per metric.
            </p>
          </div>
          <div className="onc-mono flex items-center gap-3 text-[10.5px] text-[#5C646C]">
            <Layers className="h-3.5 w-3.5 text-[#9E8CF2]" />
            {selected.length}/4 cohorts selected
          </div>
        </div>

        {/* cohort chips */}
        <div className="mt-8 flex flex-wrap gap-2">
          {COHORTS.map((c) => {
            const isSel = selected.includes(c);
            const color = COHORT_COLOR[c];
            return (
              <button
                key={c}
                onClick={() => toggle(c)}
                disabled={!isSel && selected.length >= 4}
                className="onc-mono flex items-center gap-2 rounded-md border px-3 py-1.5 text-[10.5px] uppercase tracking-[0.06em] transition-all disabled:opacity-30"
                style={{
                  borderColor: isSel ? color : "#1F262D",
                  background: isSel ? `${color}12` : "transparent",
                  color: isSel ? color : "#8B9299",
                }}
              >
                <span className="h-2 w-2 rounded-full" style={{ background: color }} />
                {c}
              </button>
            );
          })}
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_380px]">
          {/* radar chart */}
          <div className="rounded-xl border border-[#1F262D] bg-[#0D1013] p-5">
            <div className="onc-mono mb-3 text-[10.5px] uppercase tracking-[0.1em] text-[#5C646C]">
              Normalized mutation-landscape radar
            </div>
            {selectedMetrics.length === 0 ? (
              <div className="flex h-[420px] items-center justify-center onc-sans text-[12.5px] text-[#5C646C]">
                Select at least one cohort.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={440}>
                <RadarChart data={radarData} margin={{ top: 24, right: 40, left: 40, bottom: 24 }}>
                  <PolarGrid stroke="#262D34" />
                  <PolarAngleAxis
                    dataKey="metric"
                    tick={{ fill: "#C9BFB5", fontSize: 11, fontFamily: "'IBM Plex Mono', monospace" }}
                  />
                  <PolarRadiusAxis
                    domain={[0, 100]}
                    tick={{ fill: "#8B9299", fontSize: 9.5 }}
                    stroke="#262D34"
                    angle={90}
                  />
                  {selectedMetrics.map((m) => (
                    <Radar
                      key={m.cohort}
                      name={m.cohort}
                      dataKey={m.cohort}
                      stroke={m.color}
                      fill={m.color}
                      fillOpacity={0.12}
                      strokeWidth={2}
                    />
                  ))}
                  <Tooltip
                    contentStyle={{
                      background: "#0D1013",
                      border: "1px solid #262D34",
                      borderRadius: 4,
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: 11,
                      color: "#E9E7DF",
                    }}
                  />
                  <Legend
                    wrapperStyle={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 11, color: "#C9BFB5" }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* metric table */}
          <div className="rounded-xl border border-[#1F262D] bg-[#0D1013] p-5">
            <div className="onc-mono mb-3 flex items-center gap-2 text-[10.5px] uppercase tracking-[0.1em] text-[#5C646C]">
              <GitCompareArrows className="h-3.5 w-3.5 text-[#9E8CF2]" />
              Raw metric values
            </div>
            {selectedMetrics.length === 0 ? (
              <div className="onc-sans py-8 text-center text-[12px] text-[#5C646C]">—</div>
            ) : (
              <div className="onc-scroll max-h-[440px] space-y-4 overflow-y-auto pr-1">
                {selectedMetrics.map((m) => (
                  <motion.div
                    key={m.cohort}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="rounded-lg border border-[#1F262D] bg-[#0A0D10] p-3"
                  >
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: m.color }} />
                      <span className="onc-mono text-[12px] font-semibold text-[#E9E7DF]">{m.cohort}</span>
                    </div>
                    <div className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-1.5">
                      {METRIC_LABELS.map((metric) => (
                        <div key={metric.key} className="flex items-baseline justify-between gap-1">
                          <span className="onc-sans text-[10px] text-[#8B9299]">{metric.label}</span>
                          <span className="onc-mono text-[11px] font-semibold text-[#E9E7DF]">
                            {formatVal(m.raw[metric.key] as number, metric.key)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function formatVal(v: number, key: string): string {
  if (key === "mutationDensity" || key === "tierDiversity") return String(v);
  if (key === "meanTier") return v.toFixed(1);
  if (key === "hlaCoverage") return `${Math.round(v * 100)}%`;
  return `${Math.round(v * 100)}%`;
}
