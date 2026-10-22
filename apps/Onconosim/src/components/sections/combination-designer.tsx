"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Layers, Plus, X, Loader2, Scale, Sparkles, AlertTriangle, CheckCircle2, GitMerge, Share2, Check } from "lucide-react";
import { ASSETS, LEGS } from "@/lib/data";

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

// parse the URL hash like "#designer=PT0511,DT-9081,autogene cevumeran"
function parseHash(): string[] {
  if (typeof window === "undefined") return [];
  const m = window.location.hash.match(/designer=([^&]+)/);
  if (!m) return [];
  return decodeURIComponent(m[1])
    .split(",")
    .map((s) => s.trim())
    .filter((c) => ASSETS.some((a) => a.code === c));
}

function writeHash(codes: string[]) {
  if (typeof window === "undefined") return;
  const base = window.location.hash.replace(/designer=[^&]*/, "").replace(/^#&/, "#").replace(/&&/g, "&");
  const designer = `designer=${encodeURIComponent(codes.join(","))}`;
  const newHash = base === "#" || base === "" ? `#${designer}` : `${base}${base.includes("designer=") ? "" : (base.endsWith("&") ? "" : "&")}${designer}`;
  // simpler: just rebuild
  const clean = window.location.hash.replace(/designer=[^&]*/, "").replace(/^[#&]+|&+$/g, "");
  const finalHash = clean ? `#${clean}&${designer}` : `#${designer}`;
  if (finalHash !== window.location.hash) {
    window.history.replaceState(null, "", window.location.pathname + window.location.search + finalHash);
  }
}

export default function CombinationDesigner() {
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScoreResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // read hash on mount
  useEffect(() => {
    const codes = parseHash();
    if (codes.length > 0) setSelected(codes);
  }, []);

  const selectedAssets = ASSETS.filter((a) => selected.includes(a.code));
  const touchedLegs = Array.from(new Set(selectedAssets.map((a) => a.leg))).sort() as (1 | 2 | 3 | 4)[];

  function toggle(code: string) {
    setSelected((prev) => {
      const next = prev.includes(code) ? prev.filter((c) => c !== code) : prev.length >= 4 ? prev : [...prev, code];
      writeHash(next);
      return next;
    });
    setResult(null);
    setError(null);
  }

  async function score() {
    if (selectedAssets.length < 2) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const combo = selectedAssets
        .map((a) => `${a.code} (${a.modality}, ${a.target}, Leg ${a.leg})`)
        .join(" + ");
      const res = await fetch("/api/scoring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ combination: combo }),
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
    <section id="designer" className="border-t border-[#1F262D] py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="onc-mono text-[10.5px] uppercase tracking-[0.16em] text-[#4FD1C0]">
              Combination designer
            </div>
            <h2 className="onc-sans mt-3 max-w-2xl text-[28px] font-semibold leading-tight tracking-[-0.01em] text-[#E9E7DF] md:text-[36px]">
              Build a regimen. Score every leg it touches, independently.
            </h2>
            <p className="onc-sans mt-3 max-w-2xl text-[14px] leading-relaxed text-[#8B9299]">
              Pick 2–4 assets from the registry. The designer composes them into a regimen and
              scores each cure-framework leg the combination touches — never letting a high tier on
              one leg imply a high tier on another.
            </p>
          </div>
          <div className="onc-mono flex items-center gap-3 text-[10.5px]">
            <span className="rounded-md border border-[#1F262D] px-2.5 py-1.5 text-[#8B9299]">
              <span className="font-semibold text-[#4FD1C0]">{selected.length}</span>/4 selected
            </span>
            <span className="rounded-md border border-[#1F262D] px-2.5 py-1.5 text-[#8B9299]">
              legs touched: <span className="font-semibold text-[#E9E7DF]">{touchedLegs.length || "—"}</span>
            </span>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_400px]">
          {/* left: asset picker */}
          <div>
            <div className="onc-mono mb-3 flex items-center gap-2 text-[10.5px] uppercase tracking-[0.1em] text-[#5C646C]">
              <Layers className="h-3.5 w-3.5 text-[#4FD1C0]" />
              Asset palette · click to add (max 4)
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {ASSETS.map((a) => {
                const isSel = selected.includes(a.code);
                const leg = LEGS.find((l) => l.id === a.leg)!;
                const disabled = !isSel && selected.length >= 4;
                return (
                  <button
                    key={a.code}
                    onClick={() => toggle(a.code)}
                    disabled={disabled}
                    className="group relative flex items-start gap-3 rounded-lg border p-3 text-left transition-all disabled:opacity-30"
                    style={{
                      borderColor: isSel ? leg.color : "#1F262D",
                      background: isSel ? `${leg.color}0a` : "#0D1013",
                    }}
                  >
                    <div
                      className="onc-mono flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[11px] font-semibold"
                      style={{
                        background: isSel ? leg.color : "#161B20",
                        color: isSel ? "#0D1013" : "#8B9299",
                      }}
                    >
                      L{a.leg}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="onc-mono text-[11.5px] font-semibold text-[#E9E7DF]">{a.code}</div>
                      <div className="onc-sans mt-0.5 text-[10.5px] leading-tight text-[#C9BFB5] line-clamp-1">{a.name}</div>
                      <div className="onc-mono mt-1 flex items-center gap-2 text-[9.5px] text-[#8B9299]">
                        <span className="font-semibold" style={{ color: leg.color }}>T{a.tier}</span>
                        <span>·</span>
                        <span className="truncate">{a.modality}</span>
                      </div>
                    </div>
                    {isSel ? (
                      <X className="h-4 w-4 shrink-0" style={{ color: leg.color }} />
                    ) : (
                      <Plus className="h-4 w-4 shrink-0 text-[#5C646C] transition-colors group-hover:text-[#8B9299]" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* right: regimen + score */}
          <div className="space-y-4">
            {/* regimen builder */}
            <div className="rounded-xl border border-[#1F262D] bg-[#0D1013] p-5">
              <div className="onc-mono mb-3 flex items-center gap-2 text-[10px] uppercase tracking-[0.1em] text-[#5C646C]">
                <GitMerge className="h-3.5 w-3.5 text-[#4FD1C0]" />
                Proposed regimen
              </div>
              {selectedAssets.length === 0 ? (
                <div className="onc-sans py-6 text-center text-[12px] text-[#5C646C]">
                  Pick at least 2 assets to compose a regimen.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {selectedAssets.map((a, i) => {
                    const leg = LEGS.find((l) => l.id === a.leg)!;
                    return (
                      <div key={a.code} className="flex items-center gap-2">
                        <span className="onc-mono text-[10px] text-[#5C646C]">{String(i + 1).padStart(2, "0")}</span>
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ background: leg.color }}
                        />
                        <span className="onc-mono text-[12px] font-semibold text-[#E9E7DF]">{a.code}</span>
                        <span className="onc-sans truncate text-[10.5px] text-[#8B9299]">{a.name}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* leg coverage chips */}
              {touchedLegs.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-1.5 border-t border-[#1F262D] pt-3">
                  {LEGS.map((l) => {
                    const touched = touchedLegs.includes(l.id);
                    return (
                      <span
                        key={l.id}
                        className="onc-mono rounded-md px-2 py-1 text-[9.5px] uppercase tracking-[0.06em] transition-all"
                        style={{
                          background: touched ? `${l.color}18` : "transparent",
                          color: touched ? l.color : "#5C646C",
                          border: `1px solid ${touched ? `${l.color}40` : "#262D34"}`,
                        }}
                      >
                        Leg {l.id} · {l.short}
                      </span>
                    );
                  })}
                </div>
              )}

              <div className="mt-4 flex gap-2">
                <button
                  onClick={score}
                  disabled={selectedAssets.length < 2 || loading}
                  className="onc-mono flex flex-1 items-center justify-center gap-2 rounded-md bg-[#4FD1C0] px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#0D1013] transition-all hover:bg-[#2DD4BF] disabled:opacity-30 disabled:hover:bg-[#4FD1C0]"
                >
                  {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Scale className="h-3.5 w-3.5" />}
                  {loading ? "Scoring…" : "Score combination"}
                </button>
                {selectedAssets.length >= 2 && (
                  <button
                    onClick={async () => {
                      writeHash(selected);
                      try {
                        await navigator.clipboard.writeText(window.location.href);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      } catch {
                        /* clipboard may be blocked; hash is still updated */
                      }
                    }}
                    className="onc-mono flex items-center justify-center gap-1.5 rounded-md border border-[#262D34] px-3 py-2.5 text-[10.5px] uppercase tracking-[0.06em] text-[#8B9299] transition-all hover:border-[#4FD1C0]/40 hover:text-[#4FD1C0]"
                    title="Copy shareable permalink"
                    aria-label="Share combination"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-[#4FD1C0]" /> : <Share2 className="h-3.5 w-3.5" />}
                    {copied ? "Copied!" : "Share"}
                  </button>
                )}
              </div>
              {selectedAssets.length < 2 && (
                <p className="onc-sans mt-2 text-center text-[10.5px] text-[#5C646C]">
                  Select {2 - selectedAssets.length} more asset{2 - selectedAssets.length === 1 ? "" : "s"} to enable scoring.
                </p>
              )}
            </div>

            {/* result */}
            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2 rounded-lg border border-[#E8664F]/30 bg-[#E8664F]/08 px-3.5 py-2.5 text-[12px] text-[#E8664F]"
                >
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  {error}
                </motion.div>
              )}

              {result && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-3"
                >
                  {result.legs && result.legs.length > 0 && (
                    <div className="rounded-xl border border-[#1F262D] bg-[#0D1013] p-4">
                      <div className="onc-mono mb-3 text-[10px] uppercase tracking-[0.1em] text-[#5C646C]">
                        Independent leg scores
                      </div>
                      <div className="space-y-2.5">
                        {result.legs.map((l, i) => {
                          const leg = LEGS.find((x) => x.id === l.leg);
                          const color = leg?.color ?? "#8B9299";
                          return (
                            <div key={i} className="flex items-start gap-3">
                              <span
                                className="onc-mono mt-0.5 rounded px-1.5 py-0.5 text-[9.5px] uppercase tracking-[0.06em]"
                                style={{ background: `${color}18`, color }}
                              >
                                Leg {l.leg}
                              </span>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="onc-mono text-[13px] font-semibold text-[#E9E7DF]">T{l.tier}/5</span>
                                  <div className="flex flex-1 gap-0.5">
                                    {Array.from({ length: 6 }).map((_, j) => (
                                      <div key={j} className="h-1 flex-1 rounded-sm" style={{ background: j < l.tier ? color : "#1F262D" }} />
                                    ))}
                                  </div>
                                </div>
                                <p className="onc-sans mt-1 text-[11px] leading-snug text-[#8B9299]">{l.note}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {result.verdict && (
                    <div className="rounded-lg border border-[#4FD1C0]/25 bg-[#4FD1C0]/06 p-3.5">
                      <div className="onc-mono mb-1 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.1em] text-[#4FD1C0]">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Verdict
                      </div>
                      <p className="onc-sans text-[12px] leading-relaxed text-[#E9E7DF]">{result.verdict}</p>
                    </div>
                  )}

                  {result.highest_unmet_tier_gap && (
                    <div className="rounded-lg border border-[#9E8CF2]/25 bg-[#9E8CF2]/06 p-3.5">
                      <div className="onc-mono mb-1 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.1em] text-[#9E8CF2]">
                        <Sparkles className="h-3.5 w-3.5" />
                        Highest unmet tier gap
                      </div>
                      <p className="onc-sans text-[12px] leading-relaxed text-[#C9BFB5]">{result.highest_unmet_tier_gap}</p>
                    </div>
                  )}

                  {result.raw && !result.legs && (
                    <pre className="onc-mono overflow-x-auto rounded-lg border border-[#1F262D] bg-[#0D1013] p-3 text-[10.5px] text-[#8B9299]">
                      {result.raw}
                    </pre>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}
