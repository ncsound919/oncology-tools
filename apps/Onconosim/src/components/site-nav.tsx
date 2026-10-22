"use client";

import { useEffect, useState } from "react";
import { Activity, Menu, X } from "lucide-react";

const LINKS = [
  { href: "#dashboard", label: "Dashboard", id: "dashboard" },
  { href: "#framework", label: "Framework", id: "framework" },
  { href: "#assets", label: "Assets", id: "assets" },
  { href: "#pipeline", label: "Pipeline", id: "pipeline" },
  { href: "#compare", label: "Compare", id: "compare" },
  { href: "#experiments", label: "Experiments", id: "experiments" },
  { href: "#resistance", label: "Resistance", id: "resistance" },
  { href: "#leg3", label: "Leg 3", id: "leg3" },
  { href: "#simulator", label: "Simulator", id: "simulator" },
  { href: "#genomic", label: "Genomics", id: "genomic-explorer" },
  { href: "#cohort", label: "Cohorts", id: "cohort" },
  { href: "#calculator", label: "Calculator", id: "calculator" },
  { href: "#designer", label: "Designer", id: "designer" },
  { href: "#rubric", label: "Rubric", id: "rubric" },
  { href: "#assistant", label: "Assistant", id: "assistant" },
  { href: "#changelog", label: "Changelog", id: "changelog" },
  { href: "#glossary", label: "Glossary", id: "glossary" },
];

export default function SiteNav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<string>("");

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 12);
      // active section detection
      const scrollPos = window.scrollY + 120;
      let current = "";
      for (const l of LINKS) {
        const el = document.getElementById(l.id);
        if (el && el.offsetTop <= scrollPos) {
          current = l.id;
        }
      }
      setActive(current);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className="sticky top-0 z-50 transition-colors duration-300"
      style={{
        background: scrolled ? "rgba(13,16,19,0.85)" : "transparent",
        backdropFilter: scrolled ? "blur(10px)" : "none",
        borderBottom: scrolled ? "1px solid #1F262D" : "1px solid transparent",
      }}
    >
      <div className="mx-auto flex max-w-[1400px] items-center justify-between px-5 py-3.5">
        <a href="#top" className="flex items-center gap-2.5 group shrink-0">
          <span
            className="relative flex h-8 w-8 items-center justify-center rounded-md onc-grad-teal"
            style={{ boxShadow: "0 0 16px rgba(79,209,192,0.35)" }}
          >
            <Activity className="h-4.5 w-4.5 text-[#0D1013]" strokeWidth={2.5} />
          </span>
          <span className="onc-mono text-[15px] font-semibold tracking-tight text-[#E9E7DF] whitespace-nowrap">
            Onco<span className="text-[#4FD1C0]">SIM</span>
          </span>
          <span className="onc-mono hidden text-[10px] uppercase tracking-[0.18em] text-[#5C646C] sm:inline ml-1 whitespace-nowrap">
            v0.6
          </span>
        </a>

        <nav className="hidden xl:flex items-center gap-px">
          {LINKS.map((l) => {
            const isActive = active === l.id;
            return (
              <a
                key={l.href}
                href={l.href}
                className="onc-mono relative px-2 py-1.5 text-[10px] uppercase tracking-[0.04em] rounded transition-colors whitespace-nowrap"
                style={{
                  color: isActive ? "#4FD1C0" : "#8B9299",
                  background: isActive ? "rgba(79,209,192,0.08)" : "transparent",
                }}
              >
                {l.label}
                {isActive && (
                  <span
                    className="absolute -bottom-0.5 left-1/2 h-0.5 w-4 -translate-x-1/2 rounded-full"
                    style={{ background: "#4FD1C0" }}
                  />
                )}
              </a>
            );
          })}
        </nav>

        <button
          onClick={() => setOpen((v) => !v)}
          className="xl:hidden p-2 text-[#8B9299] hover:text-[#E9E7DF]"
          aria-label="Toggle navigation"
          aria-expanded={open}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="xl:hidden border-t border-[#1F262D] bg-[#0D1013]">
          <nav className="mx-auto max-w-[1400px] px-5 py-3 grid grid-cols-2 gap-1 sm:grid-cols-3">
            {LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="onc-mono px-3 py-2 text-[11px] uppercase tracking-[0.06em] text-[#8B9299] hover:text-[#4FD1C0] hover:bg-[#161B20] rounded transition-colors"
              >
                {l.label}
              </a>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
