"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Database, RefreshCw, Trash2, ChevronDown, ChevronUp, Activity, Clock, Beaker } from "lucide-react";

interface SimRow {
  id: string;
  kind: string;
  params: string;
  results: string;
  createdAt: string;
  asset?: { code: string; name: string } | null;
}

interface ParsedSim extends SimRow {
  parsedParams: Record<string, unknown>;
  parsedResults: Record<string, unknown>;
}

export default function SavedSimulations() {
  const [sims, setSims] = useState<ParsedSim[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/simulations");
      const data = await res.json();
      const rows: ParsedSim[] = (data.simulations || []).map((s: SimRow) => ({
        ...s,
        parsedParams: safeParse(s.params),
        parsedResults: safeParse(s.results),
      }));
      setSims(rows);
    } catch {
      setSims([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open && sims.length === 0) load();
  }, [open, sims.length, load]);

  return (
    <section id="saved" className="border-t border-[#1F262D] bg-[#0A0D10] py-16 md:py-20">
      <div className="mx-auto max-w-7xl px-5">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center justify-between gap-4 text-left"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#1F262D] bg-[#0D1013]">
              <Database className="h-4.5 w-4.5 text-[#4FD1C0]" />
            </div>
            <div>
              <div className="onc-mono text-[10.5px] uppercase tracking-[0.16em] text-[#4FD1C0]">
                Persistence layer
              </div>
              <h2 className="onc-sans text-[20px] font-semibold tracking-[-0.01em] text-[#E9E7DF] md:text-[24px]">
                Saved simulation runs
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="onc-mono hidden text-[10.5px] text-[#5C646C] sm:inline">
              {sims.length} run{sims.length === 1 ? "" : "s"} stored
            </span>
            {open ? (
              <ChevronUp className="h-5 w-5 text-[#8B9299]" />
            ) : (
              <ChevronDown className="h-5 w-5 text-[#8B9299]" />
            )}
          </div>
        </button>

        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="mt-6">
                <div className="mb-4 flex items-center justify-between">
                  <p className="onc-sans max-w-2xl text-[13px] leading-relaxed text-[#8B9299]">
                    Every &ldquo;Save run&rdquo; from the precision-targeting simulator is persisted to
                    SQLite via <code className="onc-mono text-[11px] text-[#4FD1C0]">/api/simulations</code>.
                    Expand a run to inspect its full parameter set and computed results.
                  </p>
                  <button
                    onClick={load}
                    disabled={loading}
                    className="onc-mono flex items-center gap-1.5 rounded-md border border-[#262D34] px-3 py-1.5 text-[10.5px] uppercase tracking-[0.06em] text-[#8B9299] transition-colors hover:border-[#4FD1C0]/40 hover:text-[#4FD1C0] disabled:opacity-50"
                  >
                    <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
                    Refresh
                  </button>
                </div>

                {sims.length === 0 && !loading ? (
                  <div className="rounded-xl border border-dashed border-[#1F262D] bg-[#0D1013] py-12 text-center">
                    <Beaker className="mx-auto mb-2 h-6 w-6 text-[#3A4148]" />
                    <p className="onc-sans text-[12.5px] text-[#5C646C]">
                      No saved runs yet. Use the &ldquo;Save run&rdquo; button in the simulator above.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {sims.map((sim) => {
                      const isOpen = expanded === sim.id;
                      const isKinetics = sim.kind === "kinetics";
                      const accent = isKinetics ? "#4FD1C0" : "#E8A94D";
                      return (
                        <motion.div
                          key={sim.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="overflow-hidden rounded-lg border border-[#1F262D] bg-[#0D1013]"
                        >
                          <button
                            onClick={() => setExpanded(isOpen ? null : sim.id)}
                            className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[#161B20]/40"
                          >
                            <div
                              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md"
                              style={{ background: `${accent}18` }}
                            >
                              <Activity className="h-3.5 w-3.5" style={{ color: accent }} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="onc-mono text-[11.5px] font-semibold capitalize text-[#E9E7DF]">
                                  {sim.kind}
                                </span>
                                <span
                                  className="onc-mono rounded px-1.5 py-0.5 text-[9px] uppercase tracking-[0.06em]"
                                  style={{ background: `${accent}18`, color: accent }}
                                >
                                  {isKinetics ? "degrader" : "delivery"}
                                </span>
                                {sim.asset && (
                                  <span className="onc-mono truncate text-[10px] text-[#5C646C]">
                                    · asset: {sim.asset.code}
                                  </span>
                                )}
                              </div>
                              <div className="onc-mono mt-0.5 flex items-center gap-1.5 text-[10px] text-[#5C646C]">
                                <Clock className="h-2.5 w-2.5" />
                                {new Date(sim.createdAt).toLocaleString()}
                              </div>
                            </div>
                            {isOpen ? (
                              <ChevronUp className="h-4 w-4 shrink-0 text-[#5C646C]" />
                            ) : (
                              <ChevronDown className="h-4 w-4 shrink-0 text-[#5C646C]" />
                            )}
                          </button>
                          <AnimatePresence initial={false}>
                            {isOpen && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden border-t border-[#1F262D]"
                              >
                                <div className="grid grid-cols-1 gap-3 p-4 md:grid-cols-2">
                                  <div>
                                    <div className="onc-mono mb-2 text-[9.5px] uppercase tracking-[0.1em] text-[#5C646C]">
                                      Parameters
                                    </div>
                                    <pre className="onc-mono onc-scroll overflow-x-auto rounded-md border border-[#1F262D] bg-[#0A0D10] p-3 text-[10.5px] leading-relaxed text-[#C9BFB5]">
                                      {JSON.stringify(sim.parsedParams, null, 2)}
                                    </pre>
                                  </div>
                                  <div>
                                    <div className="onc-mono mb-2 text-[9.5px] uppercase tracking-[0.1em] text-[#5C646C]">
                                      Results
                                    </div>
                                    <pre className="onc-mono onc-scroll overflow-x-auto rounded-md border border-[#1F262D] bg-[#0A0D10] p-3 text-[10.5px] leading-relaxed text-[#C9BFB5]">
                                      {JSON.stringify(sim.parsedResults, null, 2)}
                                    </pre>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}

function safeParse(s: string): Record<string, unknown> {
  try {
    return JSON.parse(s);
  } catch {
    return { raw: s };
  }
}
