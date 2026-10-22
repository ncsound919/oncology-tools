"use client";

import { useState, useRef, useEffect, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen } from "lucide-react";
import { GLOSSARY_MAP } from "@/lib/glossary";

interface GlossaryTermProps {
  /** The scientific term to wrap (must exist in GLOSSARY_MAP). */
  children: ReactNode;
  /** Override the lookup key if the displayed text differs from the glossary term. */
  term?: string;
}

/**
 * Renders a scientific term as a dotted-underlined, hoverable/clickable span
 * that opens a popover with the short definition. Click toggles; hover shows.
 */
export function GTerm({ children, term }: GlossaryTermProps) {
  const lookup = (term ?? (typeof children === "string" ? children : "")).toLowerCase();
  const entry = GLOSSARY_MAP[lookup];
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  if (!entry) {
    // graceful fallback: render as plain text if the term isn't in the glossary
    return <>{children}</>;
  }

  return (
    <span
      ref={ref}
      className="relative inline-block"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <span
        onClick={() => setOpen((v) => !v)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), setOpen((v) => !v))}
        className="cursor-help underline decoration-dotted decoration-[#4FD1C0]/60 decoration-2 underline-offset-2 text-[#E9E7DF] transition-colors hover:decoration-[#4FD1C0] hover:text-[#4FD1C0] focus:outline-none focus:ring-1 focus:ring-[#4FD1C0]/40 rounded"
        aria-label={`Glossary: ${entry.term}`}
      >
        {children}
      </span>
      <AnimatePresence>
        {open && (
          <motion.span
            initial={{ opacity: 0, y: 4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.96 }}
            transition={{ duration: 0.12 }}
            className="absolute left-1/2 top-full z-[80] mt-2 w-72 -translate-x-1/2 rounded-lg border border-[#262D34] bg-[#0D1013] p-3 shadow-2xl"
            role="tooltip"
          >
            <span className="onc-mono mb-1 flex items-center gap-1.5 text-[9.5px] uppercase tracking-[0.1em]" style={{ color: "#4FD1C0" }}>
              <BookOpen className="h-3 w-3" />
              {entry.category}
            </span>
            <span className="onc-mono block text-[11px] font-semibold text-[#E9E7DF]">{entry.term}</span>
            <span className="onc-sans mt-1 block text-[10.5px] leading-snug text-[#C9BFB5]">{entry.short}</span>
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}
