"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, CornerDownLeft, X } from "lucide-react";

interface SectionMeta {
  id: string;
  label: string;
  group: string;
}

const SECTIONS: SectionMeta[] = [
  { id: "top", label: "Hero", group: "Intro" },
  { id: "dashboard", label: "Dashboard", group: "Intro" },
  { id: "framework", label: "Framework", group: "Intro" },
  { id: "assets", label: "Asset Registry", group: "Registry" },
  { id: "pipeline", label: "Pipeline", group: "Registry" },
  { id: "compare", label: "Head-to-head", group: "Registry" },
  { id: "experiments", label: "Experiments", group: "Resistance" },
  { id: "resistance", label: "Resistance Atlas", group: "Resistance" },
  { id: "leg3", label: "Leg 3 Proposals", group: "Resistance" },
  { id: "designer", label: "Combination Designer", group: "Tools" },
  { id: "simulator", label: "Simulator", group: "Tools" },
  { id: "saved", label: "Saved Runs", group: "Tools" },
  { id: "genomic-explorer", label: "Genomic Explorer", group: "Genomics" },
  { id: "cohort", label: "Cohort Comparison", group: "Genomics" },
  { id: "calculator", label: "Tier Calculator", group: "Scoring" },
  { id: "rubric", label: "Cure Rubric", group: "Scoring" },
  { id: "assistant", label: "AI Assistant", group: "Scoring" },
  { id: "changelog", label: "Changelog", group: "Reference" },
  { id: "glossary", label: "Glossary", group: "Reference" },
];

const GROUP_COLOR: Record<string, string> = {
  Intro: "#4FD1C0",
  Registry: "#E8A94D",
  Resistance: "#9E8CF2",
  Tools: "#4FD1C0",
  Genomics: "#9E8CF2",
  Scoring: "#E8664F",
  Reference: "#6EE7B7",
};

export default function KeyboardNav() {
  const [activeId, setActiveId] = useState<string>("top");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hoveredIdx, setHoveredIdx] = useState(0);

  // track active section
  useEffect(() => {
    const onScroll = () => {
      const scrollPos = window.scrollY + 140;
      let current = SECTIONS[0].id;
      for (const s of SECTIONS) {
        const el = document.getElementById(s.id);
        if (el && el.offsetTop <= scrollPos) current = s.id;
      }
      setActiveId(current);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const goTo = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  // keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isTyping =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      // / opens palette (unless typing)
      if (e.key === "/" && !isTyping) {
        e.preventDefault();
        setPaletteOpen(true);
        return;
      }
      // Escape closes palette
      if (e.key === "Escape" && paletteOpen) {
        setPaletteOpen(false);
        setQuery("");
        return;
      }
      // j / k navigate sections (unless typing or palette open)
      if (!paletteOpen && !isTyping) {
        if (e.key === "j" || e.key === "ArrowDown") {
          e.preventDefault();
          const idx = SECTIONS.findIndex((s) => s.id === activeId);
          const next = SECTIONS[Math.min(SECTIONS.length - 1, idx + 1)];
          if (next) goTo(next.id);
        } else if (e.key === "k" || e.key === "ArrowUp") {
          e.preventDefault();
          const idx = SECTIONS.findIndex((s) => s.id === activeId);
          const prev = SECTIONS[Math.max(0, idx - 1)];
          if (prev) goTo(prev.id);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeId, paletteOpen, goTo]);

  // palette search results
  const results = useMemo(() => {
    const q = query.toLowerCase();
    if (!q) return SECTIONS;
    return SECTIONS.filter(
      (s) => s.label.toLowerCase().includes(q) || s.group.toLowerCase().includes(q) || s.id.toLowerCase().includes(q)
    );
  }, [query]);

  const activeIdxInResults = Math.max(0, results.findIndex((r) => r.id === activeId));

  return (
    <>
      {/* vertical mini-map rail (desktop only) */}
      <nav
        aria-label="Section mini-map"
        className="fixed right-4 top-1/2 z-40 hidden -translate-y-1/2 flex-col gap-1.5 xl:flex"
      >
        {SECTIONS.map((s) => {
          const isActive = activeId === s.id;
          const color = GROUP_COLOR[s.group];
          return (
            <a
              key={s.id}
              href={`#${s.id}`}
              onClick={(e) => {
                e.preventDefault();
                goTo(s.id);
              }}
              className="group flex items-center justify-end gap-2"
              title={s.label}
              aria-label={s.label}
            >
              <span
                className="onc-mono text-[9px] uppercase tracking-[0.06em] opacity-0 transition-opacity group-hover:opacity-100"
                style={{ color }}
              >
                {s.label}
              </span>
              <span
                className="rounded-full transition-all"
                style={{
                  width: isActive ? 10 : 6,
                  height: isActive ? 10 : 6,
                  background: isActive ? color : "#262D34",
                  boxShadow: isActive ? `0 0 8px ${color}80` : "none",
                }}
              />
            </a>
          );
        })}
        <div className="mt-2 border-t border-[#1F262D] pt-2">
          <button
            onClick={() => setPaletteOpen(true)}
            className="onc-mono flex w-full items-center justify-end gap-1.5 text-[9px] uppercase tracking-[0.06em] text-[#5C646C] transition-colors hover:text-[#4FD1C0]"
            title="Open command palette (/)"
          >
            <kbd className="rounded border border-[#262D34] px-1 py-0.5 text-[8px]">/</kbd>
            search
          </button>
        </div>
      </nav>

      {/* keyboard hint (bottom-left, dismissible) */}
      <KeyboardHint />

      {/* command palette */}
      <AnimatePresence>
        {paletteOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-start justify-center bg-[#0D1013]/80 backdrop-blur-sm pt-[15vh] px-5"
            onClick={() => setPaletteOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className="w-full max-w-lg overflow-hidden rounded-xl border border-[#262D34] bg-[#0D1013] shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 border-b border-[#1F262D] px-4 py-3">
                <Search className="h-4 w-4 text-[#5C646C]" />
                <input
                  autoFocus
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowDown") {
                      e.preventDefault();
                      setHoveredIdx((i) => Math.min(results.length - 1, i + 1));
                    } else if (e.key === "ArrowUp") {
                      e.preventDefault();
                      setHoveredIdx((i) => Math.max(0, i - 1));
                    } else if (e.key === "Enter") {
                      e.preventDefault();
                      const target = results[hoveredIdx];
                      if (target) {
                        goTo(target.id);
                        setPaletteOpen(false);
                        setQuery("");
                      }
                    }
                  }}
                  placeholder="Jump to section… (type to filter, ↑↓ to navigate, ↵ to select)"
                  className="onc-sans flex-1 bg-transparent text-[13.5px] text-[#E9E7DF] placeholder:text-[#5C646C] focus:outline-none"
                />
                <kbd className="onc-mono rounded border border-[#262D34] px-1.5 py-0.5 text-[9px] text-[#5C646C]">ESC</kbd>
              </div>
              <div className="max-h-80 overflow-y-auto onc-scroll p-2">
                {results.length === 0 ? (
                  <div className="onc-sans py-8 text-center text-[12.5px] text-[#5C646C]">
                    No sections match &ldquo;{query}&rdquo;.
                  </div>
                ) : (
                  results.map((s, i) => {
                    const color = GROUP_COLOR[s.group];
                    const isHover = i === hoveredIdx || (i === 0 && hoveredIdx >= results.length);
                    return (
                      <button
                        key={s.id}
                        onMouseEnter={() => setHoveredIdx(i)}
                        onClick={() => {
                          goTo(s.id);
                          setPaletteOpen(false);
                          setQuery("");
                        }}
                        className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors"
                        style={{ background: isHover ? "#161B20" : "transparent" }}
                      >
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: color }} />
                        <span className="onc-sans flex-1 text-[13px] text-[#E9E7DF]">{s.label}</span>
                        <span className="onc-mono text-[9px] uppercase tracking-[0.06em] text-[#5C646C]">{s.group}</span>
                        {isHover && <CornerDownLeft className="h-3.5 w-3.5 text-[#4FD1C0]" />}
                      </button>
                    );
                  })
                )}
              </div>
              <div className="flex items-center justify-between border-t border-[#1F262D] px-4 py-2 onc-mono text-[9px] uppercase tracking-[0.06em] text-[#5C646C]">
                <span className="flex items-center gap-2">
                  <kbd className="rounded border border-[#262D34] px-1 py-0.5">j</kbd>
                  <kbd className="rounded border border-[#262D34] px-1 py-0.5">k</kbd>
                  navigate sections
                </span>
                <span>{results.length} sections</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function KeyboardHint() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.5 }}
      className="fixed bottom-6 left-6 z-40 hidden items-center gap-2 rounded-lg border border-[#262D34] bg-[#0D1013]/90 backdrop-blur-md px-3 py-2 xl:flex"
    >
      <kbd className="onc-mono rounded border border-[#262D34] bg-[#161B20] px-1.5 py-0.5 text-[9px] text-[#C9BFB5]">j</kbd>
      <kbd className="onc-mono rounded border border-[#262D34] bg-[#161B20] px-1.5 py-0.5 text-[9px] text-[#C9BFB5]">k</kbd>
      <span className="onc-mono text-[9px] uppercase tracking-[0.06em] text-[#5C646C]">jump sections</span>
      <span className="mx-1 h-3 w-px bg-[#262D34]" />
      <kbd className="onc-mono rounded border border-[#262D34] bg-[#161B20] px-1.5 py-0.5 text-[9px] text-[#C9BFB5]">/</kbd>
      <span className="onc-mono text-[9px] uppercase tracking-[0.06em] text-[#5C646C]">search</span>
      <button
        onClick={() => setDismissed(true)}
        className="ml-1 text-[#5C646C] hover:text-[#E8664F]"
        aria-label="Dismiss hint"
      >
        <X className="h-3 w-3" />
      </button>
    </motion.div>
  );
}
