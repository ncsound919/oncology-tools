"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Scale, Loader2, Sparkles, AlertTriangle } from "lucide-react";
import { COMBINATIONS, LEGS } from "@/lib/data";

interface ScoredLeg {
  leg: number;
  tier: number;
  note: string;
}
interface ScoreResult {
  legs?: ScoredLeg[];
  verdict?: string;
  highest_unmet_tier_gap?: string;
  raw?: string;
}

export default function CureRubric() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScoreResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function score(combination?: string) {
    const text = (combination ?? input).trim();
    if (!text) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/scoring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ combination: text }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data.score as ScoreResult);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section id="rubric" className="border-t border-[#1F262D] py-20 md:py-28">
      <div className="mx-auto max-w-5xl px-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="onc-mono text-[10.5px] uppercase tracking-[0.16em] text-[#E8A94D]">
              Cure criteria rubric
            </div>
            <h2 className="onc-sans mt-3 max-w-2xl text-[28px] font-semibold leading-tight tracking-[-0.01em] text-[#E9E7DF] md:text-[36px]">
              Cross-leg combination scoring — each leg, independently.
            </h2>
            <p className="onc-sans mt-3 max-w-2xl text-[14px] leading-relaxed text-[#8B9299]">
              When an asset is proposed as serving two legs at once (the recurring “two legs, one
              drug” pattern), score each leg independently. A high tier on one leg does not imply a
              high tier on the other.
            </p>
          </div>
        </div>

        {/* interactive scorer */}
        <div className="mt-8 rounded-xl border border-[#1F262D] bg-[#0D1013] p-5 md:p-6">
          <label className="onc-mono block text-[10.5px] uppercase tracking-[0.1em] text-[#5C646C]">
            Combination to score
          </label>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") score();
              }}
              placeholder="e.g. KRAS degrader + anti-TROP2 ADC + pembrolizumab"
              className="onc-sans flex-1 rounded-md border border-[#262D34] bg-[#0D1013] px-3.5 py-2.5 text-[13px] text-[#E9E7DF] placeholder:text-[#5C646C] focus:border-[#E8A94D]/50 focus:outline-none"
            />
            <button
              onClick={() => score()}
              disabled={loading || !input.trim()}
              className="onc-mono flex items-center justify-center gap-1.5 rounded-md bg-[#E8A94D] px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#0D1013] transition-all hover:bg-[#D97706] disabled:opacity-40"
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Scale className="h-3.5 w-3.5" />}
              {loading ? "Scoring…" : "Score"}
            </button>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {COMBINATIONS.map((c) => (
              <button
                key={c.asset}
                onClick={() => {
                  setInput(c.asset);
                  score(c.asset);
                }}
                disabled={loading}
                className="onc-mono rounded-md border border-[#1F262D] px-2.5 py-1 text-[10px] uppercase tracking-[0.04em] text-[#5C646C] transition-colors hover:border-[#E8A94D]/40 hover:text-[#E8A94D] disabled:opacity-40"
              >
                {c.asset.split("—")[0].trim()}
              </button>
            ))}
          </div>

          {/* result */}
          {error && (
            <div className="mt-4 flex items-center gap-2 rounded-md border border-[#E8664F]/30 bg-[#E8664F]/08 px-3.5 py-2.5 text-[12px] text-[#E8664F]">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {result && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-5 space-y-4"
            >
              {result.legs && result.legs.length > 0 ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {result.legs.map((l, i) => {
                    const leg = LEGS.find((x) => x.id === l.leg);
                    const color = leg?.color ?? "#8B9299";
                    return (
                      <div key={i} className="rounded-lg border border-[#1F262D] bg-[#161B20]/40 p-4">
                        <div className="flex items-center justify-between">
                          <span className="onc-mono text-[10px] uppercase tracking-[0.1em]" style={{ color }}>
                            {leg ? `Leg ${l.leg} · ${leg.short}` : `Leg ${l.leg}`}
                          </span>
                          <span className="onc-mono text-[14px] font-semibold text-[#E9E7DF]">
                            tier <span style={{ color }}>{l.tier}</span>/5
                          </span>
                        </div>
                        <div className="mt-2 flex gap-0.5">
                          {Array.from({ length: 6 }).map((_, j) => (
                            <div
                              key={j}
                              className="h-1 flex-1 rounded-sm"
                              style={{ background: j < (l.tier ?? 0) ? color : "#1F262D" }}
                            />
                          ))}
                        </div>
                        <p className="onc-sans mt-2.5 text-[12px] leading-relaxed text-[#C9BFB5]">{l.note}</p>
                      </div>
                    );
                  })}
                </div>
              ) : null}

              {result.verdict && (
                <div className="rounded-lg border border-[#E8A94D]/25 bg-[#E8A94D]/06 p-4">
                  <div className="onc-mono mb-1.5 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.1em] text-[#E8A94D]">
                    <Sparkles className="h-3.5 w-3.5" />
                    Verdict
                  </div>
                  <p className="onc-sans text-[12.5px] leading-relaxed text-[#E9E7DF]">{result.verdict}</p>
                </div>
              )}

              {result.highest_unmet_tier_gap && (
                <div className="rounded-lg border border-[#9E8CF2]/25 bg-[#9E8CF2]/06 p-4">
                  <div className="onc-mono mb-1.5 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.1em] text-[#9E8CF2]">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Highest unmet tier gap
                  </div>
                  <p className="onc-sans text-[12.5px] leading-relaxed text-[#C9BFB5]">{result.highest_unmet_tier_gap}</p>
                </div>
              )}

              {result.raw && !result.legs && (
                <pre className="onc-mono overflow-x-auto rounded-lg border border-[#1F262D] bg-[#0D1013] p-4 text-[11px] leading-relaxed text-[#8B9299]">
                  {result.raw}
                </pre>
              )}
            </motion.div>
          )}
        </div>

        {/* static reference combinations */}
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          {COMBINATIONS.map((c) => (
            <div key={c.asset} className="rounded-xl border border-[#1F262D] bg-[#0D1013] p-5">
              <div className="onc-sans text-[13.5px] font-medium text-[#E9E7DF]">{c.asset}</div>
              <div className="mt-3 space-y-2">
                {c.legs.map((l, i) => {
                  const leg = LEGS.find((x) => x.id === l.leg)!;
                  return (
                    <div key={i} className="flex items-start gap-2.5">
                      <span
                        className="onc-mono mt-0.5 rounded px-1.5 py-0.5 text-[9.5px] uppercase tracking-[0.08em]"
                        style={{ background: `${leg.color}18`, color: leg.color }}
                      >
                        Leg {l.leg} · T{l.tier}
                      </span>
                      <span className="onc-sans text-[11.5px] leading-relaxed text-[#8B9299]">{l.note}</span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 border-t border-[#1F262D] pt-3">
                <p className="onc-sans text-[11.5px] italic leading-relaxed text-[#5C646C]">{c.verdict}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
