"use client";

import { motion } from "framer-motion";
import { ArrowRight, Dna, Microscope, Cpu, ShieldCheck } from "lucide-react";
import { FRAMEWORK_STATS, LEGS } from "@/lib/data";
import { GTerm } from "@/components/glossary-term";

const LEG_ICON = [Cpu, ShieldCheck, Microscope, Dna]; // leg 1..4

export default function Hero() {
  return (
    <section id="top" className="relative overflow-hidden onc-radial-teal">
      {/* generated hero image backdrop (subtle, darkened) — falls back silently if absent */}
      <div
        className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-20 mix-blend-screen"
        style={{ backgroundImage: "url(/hero-oncology.png)" }}
        aria-hidden
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#0D1013]/40 via-[#0D1013]/20 to-[#0D1013]" aria-hidden />
      {/* animated grid backdrop */}
      <div className="absolute inset-0 onc-grid-bg opacity-60 pointer-events-none" />
      <div
        className="absolute inset-x-0 top-0 h-px"
        style={{ background: "linear-gradient(90deg, transparent, rgba(79,209,192,0.6), transparent)" }}
      />

      {/* molecular network SVG (decorative) */}
      <MolecularNetwork />

      <div className="relative mx-auto max-w-7xl px-5 pt-16 pb-20 md:pt-24 md:pb-28">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="onc-mono inline-flex items-center gap-2 rounded-full border border-[#1F262D] bg-[#0D1013]/60 px-3 py-1 text-[10.5px] uppercase tracking-[0.16em] text-[#4FD1C0]"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-[#4FD1C0] onc-pulse" />
          Computational cancer systems biology · live evidence tiers
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.05 }}
          className="onc-sans mt-6 max-w-4xl text-[34px] font-semibold leading-[1.08] tracking-[-0.02em] text-[#E9E7DF] sm:text-[44px] md:text-[56px]"
        >
          Unified models of cancer behavior,{" "}
          <span style={{ background: "linear-gradient(120deg, #4FD1C0 0%, #9E8CF2 60%, #E8664F 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
            scored against the cure that actually lasts
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.12 }}
          className="onc-sans mt-6 max-w-2xl text-[15px] leading-relaxed text-[#8B9299] md:text-[16.5px]"
        >
          OncoSIM fuses genomic sequencing data and mechanistic models into a four-leg cure
          framework — debulk, block re-seeding, anticipate resistance, immune-cleanup dormant
          disease — with a strict 0-to-5 evidence ladder that refuses to round up. Scientific
          terms like <GTerm>PROTAC</GTerm>, <GTerm>neoepitope</GTerm>,{" "}
          <GTerm>ctDNA</GTerm>, and <GTerm>organotropic</GTerm> are hoverable throughout.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="mt-8 flex flex-wrap items-center gap-3"
        >
          <a
            href="#framework"
            className="onc-mono group inline-flex items-center gap-2 rounded-md bg-[#4FD1C0] px-5 py-3 text-[12px] font-semibold uppercase tracking-[0.06em] text-[#0D1013] transition-all hover:bg-[#2DD4BF] hover:shadow-[0_0_24px_rgba(79,209,192,0.4)]"
          >
            Explore the framework
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </a>
          <a
            href="#simulator"
            className="onc-mono inline-flex items-center gap-2 rounded-md border border-[#262D34] bg-[#161B20]/60 px-5 py-3 text-[12px] font-semibold uppercase tracking-[0.06em] text-[#E9E7DF] transition-all hover:border-[#4FD1C0]/50 hover:bg-[#161B20]"
          >
            Run the simulator
          </a>
          <a
            href="#assistant"
            className="onc-mono inline-flex items-center gap-2 rounded-md border border-[#262D34] bg-transparent px-5 py-3 text-[12px] font-semibold uppercase tracking-[0.06em] text-[#8B9299] transition-all hover:text-[#9E8CF2] hover:border-[#9E8CF2]/40"
          >
            Ask the assistant
          </a>
        </motion.div>

        {/* stats row */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="mt-14 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-[#1F262D] bg-[#1F262D] sm:grid-cols-4"
        >
          {FRAMEWORK_STATS.map((s, i) => (
            <div key={s.label} className="bg-[#0D1013] px-5 py-5">
              <div className="onc-mono text-[28px] font-semibold text-[#E9E7DF] sm:text-[32px]">
                {s.value}
                <span className="text-[#4FD1C0]">{s.suffix}</span>
              </div>
              <div className="onc-sans mt-1 text-[11px] uppercase tracking-[0.08em] text-[#5C646C]">
                {s.label}
              </div>
              <div
                className="mt-3 h-0.5 w-full rounded-full"
                style={{ background: ["#4FD1C0", "#E8A94D", "#9E8CF2", "#E8664F"][i % 4], opacity: 0.5 }}
              />
            </div>
          ))}
        </motion.div>

        {/* leg quick-nav */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.38 }}
          className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
        >
          {LEGS.map((leg, i) => {
            const Icon = LEG_ICON[i];
            return (
              <a
                key={leg.id}
                href="#framework"
                className="group relative overflow-hidden rounded-lg border border-[#1F262D] bg-[#0D1013]/80 p-4 transition-all hover:border-[#262D34]"
              >
                <div
                  className="absolute inset-x-0 top-0 h-0.5"
                  style={{ background: leg.color, opacity: 0.7 }}
                />
                <div className="flex items-center justify-between">
                  <span
                    className="onc-mono text-[10px] uppercase tracking-[0.12em]"
                    style={{ color: leg.color }}
                  >
                    Leg {leg.id} · {leg.short}
                  </span>
                  <Icon className="h-3.5 w-3.5" style={{ color: leg.color }} />
                </div>
                <div className="onc-sans mt-2 text-[13.5px] font-medium leading-snug text-[#E9E7DF]">
                  {leg.name}
                </div>
                <div className="onc-sans mt-1.5 text-[11.5px] leading-relaxed text-[#5C646C] line-clamp-2">
                  {leg.thesis}
                </div>
              </a>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}

function MolecularNetwork() {
  // decorative animated SVG of nodes + edges representing the unified cancer model
  const nodes = [
    { x: 12, y: 30, r: 3, c: "#4FD1C0" },
    { x: 28, y: 18, r: 4, c: "#4FD1C0" },
    { x: 44, y: 40, r: 2.5, c: "#9E8CF2" },
    { x: 62, y: 22, r: 5, c: "#E8A94D" },
    { x: 78, y: 50, r: 3, c: "#E8664F" },
    { x: 90, y: 30, r: 3.5, c: "#9E8CF2" },
    { x: 20, y: 65, r: 2.5, c: "#E8664F" },
    { x: 52, y: 70, r: 4, c: "#4FD1C0" },
    { x: 72, y: 78, r: 3, c: "#E8A94D" },
    { x: 88, y: 68, r: 2.5, c: "#9E8CF2" },
  ];
  const edges: [number, number][] = [
    [0, 1], [1, 2], [2, 3], [3, 4], [4, 5],
    [0, 6], [1, 6], [2, 7], [3, 7], [4, 8],
    [5, 9], [6, 7], [7, 8], [8, 9], [2, 6],
  ];
  return (
    <svg
      className="pointer-events-none absolute right-0 top-1/2 hidden -translate-y-1/2 opacity-40 lg:block"
      width="520"
      height="520"
      viewBox="0 0 100 100"
      fill="none"
      aria-hidden
    >
      {edges.map(([a, b], i) => (
        <line
          key={i}
          x1={nodes[a].x}
          y1={nodes[a].y}
          x2={nodes[b].x}
          y2={nodes[b].y}
          stroke="#4FD1C0"
          strokeWidth="0.15"
          strokeOpacity="0.35"
          strokeDasharray="0.6 0.6"
          className="onc-dash"
          style={{ animationDelay: `${i * 0.08}s` }}
        />
      ))}
      {nodes.map((n, i) => (
        <g key={i}>
          <circle cx={n.x} cy={n.y} r={n.r + 1.2} fill={n.c} opacity="0.12" className="onc-pulse" style={{ animationDelay: `${i * 0.3}s` }} />
          <circle cx={n.x} cy={n.y} r={n.r} fill={n.c} opacity="0.85" />
        </g>
      ))}
    </svg>
  );
}
