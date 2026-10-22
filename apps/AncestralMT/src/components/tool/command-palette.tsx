"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  Search,
  Command,
  LayoutDashboard,
  Database,
  Dna,
  TrendingDown,
  Building2,
  FileText,
  Layers,
  BarChart3,
  Workflow,
  Microscope,
  BookOpen,
  Brain,
  Radio,
  Scale,
  RotateCcw,
  Shield,
  Pill,
  FlaskConical,
  Sparkles,
  ArrowRight,
  Clock,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogOverlay,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onViewChange: (viewId: string) => void;
  recentViews: string[];
}

type NavItem = {
  id: string;
  label: string;
  icon: React.ElementType;
  description: string;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

const navGroups: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, description: "Overview & metrics" },
    ],
  },
  {
    label: "Analysis",
    items: [
      { id: "datasets", label: "Dataset Analyzer", icon: Database, description: "Analyze ancestry representation" },
      { id: "variants", label: "Variant Analysis", icon: Dna, description: "Ancestry-aware pathogenicity" },
      { id: "gap-tracker", label: "Gap Tracker", icon: TrendingDown, description: "Track representation gaps" },
      { id: "gene-heatmap", label: "Gene Heatmap", icon: BarChart3, description: "Gene-population bias matrix" },
      { id: "reference-panels", label: "Reference Panels", icon: Layers, description: "Compare ancestry reference databases" },
      { id: "frequency-explorer", label: "Frequency Explorer", icon: BarChart3, description: "Population allele frequency comparison" },
      { id: "annotation-pipeline", label: "Annotation Pipeline", icon: Workflow, description: "Ancestry-aware variant annotation" },
      { id: "vus-classifier", label: "VUS Classifier", icon: Microscope, description: "Population VUS reclassification model" },
    ],
  },
  {
    label: "Operations",
    items: [
      { id: "biobank", label: "Biobank Portal", icon: Building2, description: "Community submissions" },
      { id: "reports", label: "Reports", icon: FileText, description: "Diversity assessments" },
      { id: "methodology", label: "Methodology", icon: BookOpen, description: "ACMG/AMP framework & bias correction" },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { id: "ai-interpreter", label: "AI Interpreter", icon: Brain, description: "Ancestry-aware variant analysis" },
      { id: "live-stream", label: "Live Stream", icon: Radio, description: "Real-time mutation pipeline" },
      { id: "equity-simulator", label: "Equity Simulator", icon: Scale, description: "What-if diversity analysis" },
      { id: "pharmacogenomics", label: "Pharmacogenomics", icon: Pill, description: "Drug response by ancestry" },
    ],
  },
  {
    label: "Research",
    items: [
      { id: "feedback-loop", label: "Feedback Loop", icon: RotateCcw, description: "Diversity gap cycle" },
      { id: "structural-forces", label: "Structural Forces", icon: Shield, description: "Root causes & barriers" },
      { id: "cohort-designer", label: "Cohort Designer", icon: FlaskConical, description: "Plan diverse study cohorts" },
    ],
  },
];

const allNavItems = navGroups.flatMap((g) => g.items);

const quickActions = [
  { id: "action-dashboard", label: "Go to Dashboard", icon: LayoutDashboard, action: "dashboard" as const },
  { id: "action-datasets", label: "View All Datasets", icon: Database, action: "datasets" as const },
  { id: "action-reports", label: "Export Report", icon: FileText, action: "reports" as const },
  { id: "action-sidebar", label: "Toggle Sidebar", icon: Command, action: "toggle-sidebar" as const },
];

type FlatItem =
  | { type: "view"; id: string; label: string; icon: React.ElementType; description: string; group: string; shortcut?: string }
  | { type: "action"; id: string; label: string; icon: React.ElementType; action: string; shortcut?: string }
  | { type: "recent"; id: string; label: string; icon: React.ElementType; description: string };

function fuzzyMatch(query: string, text: string): { match: boolean; score: number } {
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  if (t.includes(q)) {
    return { match: true, score: t === q ? 100 : 50 + (t.length - q.length) * -1 };
  }
  let qi = 0;
  let score = 0;
  let lastMatchIdx = -2;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      score += ti === lastMatchIdx + 1 ? 15 : 5;
      if (ti === 0) score += 10;
      lastMatchIdx = ti;
      qi++;
    }
  }
  if (qi === q.length) return { match: true, score };
  return { match: false, score: 0 };
}

/* Inner component that re-mounts on each open, avoiding setState-in-effect */
function CommandPaletteInner({
  onViewChange,
  onOpenChange,
  recentViews,
}: {
  onViewChange: (viewId: string) => void;
  onOpenChange: (open: boolean) => void;
  recentViews: string[];
}) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const recentItems = useMemo<FlatItem[]>(() => {
    return recentViews
      .filter((id) => id !== undefined)
      .map((id) => {
        const item = allNavItems.find((n) => n.id === id);
        if (!item) return null;
        return { type: "recent" as const, id: item.id, label: item.label, icon: item.icon, description: item.description };
      })
      .filter(Boolean) as FlatItem[];
  }, [recentViews]);

  const flatItems = useMemo<FlatItem[]>(() => {
    if (!query.trim()) {
      const items: FlatItem[] = [];
      if (recentItems.length > 0) {
        items.push(...recentItems);
      }
      navGroups.forEach((group) => {
        group.items.forEach((item) => {
          const globalIdx = allNavItems.findIndex((n) => n.id === item.id);
          const shortcut = globalIdx >= 0 && globalIdx < 10
            ? globalIdx === 9 ? "\u23180" : `\u2318${globalIdx + 1}`
            : undefined;
          items.push({
            type: "view",
            id: item.id,
            label: item.label,
            icon: item.icon,
            description: item.description,
            group: group.label,
            shortcut,
          });
        });
      });
      return items;
    }

    const scored: { item: FlatItem; score: number }[] = [];

    allNavItems.forEach((item) => {
      const nameMatch = fuzzyMatch(query, item.label);
      const descMatch = fuzzyMatch(query, item.description);
      const bestScore = Math.max(nameMatch.score, descMatch.score);
      if (nameMatch.match || descMatch.match) {
        const globalIdx = allNavItems.findIndex((n) => n.id === item.id);
        const group = navGroups.find((g) => g.items.some((i) => i.id === item.id));
        const shortcut = globalIdx >= 0 && globalIdx < 10
          ? globalIdx === 9 ? "\u23180" : `\u2318${globalIdx + 1}`
          : undefined;
        scored.push({
          score: bestScore,
          item: {
            type: "view",
            id: item.id,
            label: item.label,
            icon: item.icon,
            description: item.description,
            group: group?.label || "",
            shortcut,
          },
        });
      }
    });

    quickActions.forEach((action) => {
      const match = fuzzyMatch(query, action.label);
      if (match.match) {
        scored.push({ score: match.score - 1, item: { type: "action", id: action.id, label: action.label, icon: action.icon, action: action.action } });
      }
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.map((s) => s.item);
  }, [query, recentItems]);

  const handleSelect = useCallback(
    (item: FlatItem) => {
      if (item.type === "view" || item.type === "recent") {
        onViewChange(item.id);
      } else if (item.type === "action") {
        if (item.action === "toggle-sidebar") {
          window.dispatchEvent(new CustomEvent("ancestralmt:toggle-sidebar"));
        } else {
          onViewChange(item.action);
        }
      }
      onOpenChange(false);
    },
    [onViewChange, onOpenChange]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % flatItems.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + flatItems.length) % flatItems.length);
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (flatItems[selectedIndex]) {
          handleSelect(flatItems[selectedIndex]);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        onOpenChange(false);
      }
    },
    [flatItems, selectedIndex, handleSelect, onOpenChange]
  );

  // Focus input on mount
  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(timer);
  }, []);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const selected = listRef.current.querySelector(`[data-index="${selectedIndex}"]`);
      if (selected) {
        selected.scrollIntoView({ block: "nearest" });
      }
    }
  }, [selectedIndex]);

  const renderSectionHeader = (label: string) => (
    <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
      {label}
    </div>
  );

  let lastGroup = "";
  const isNoQuery = !query.trim();
  let recentSectionDone = false;

  return (
    <DialogContent
      className="cmd-palette-panel depth-4 p-0 gap-0 max-w-lg mx-auto top-[15%] translate-y-0 overflow-hidden rounded-xl"
      onOpenAutoFocus={(e) => {
        e.preventDefault();
        inputRef.current?.focus();
      }}
      onKeyDown={handleKeyDown}
    >
      {/* Search Input */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50">
        <Search className="w-4 h-4 text-muted-foreground shrink-0" />
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
          placeholder="Search views, actions..."
          className="border-0 bg-transparent shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/50 h-7 text-sm"
        />
        <kbd className="hidden sm:inline-flex items-center gap-0.5 text-[10px] text-muted-foreground/50 bg-muted/30 px-1.5 py-0.5 rounded">
          <span className="text-[9px]">⎸</span> esc
        </kbd>
      </div>

      {/* Results List */}
      <ScrollArea className="max-h-80 cmd-scrollbar" ref={listRef as React.RefObject<HTMLDivElement>}>
        <div className="py-2 px-2">
          {flatItems.map((item, idx) => {
            const isSelected = idx === selectedIndex;

            if (isNoQuery && item.type === "recent" && !recentSectionDone) {
              recentSectionDone = true;
              return (
                <React.Fragment key={`recent-header-${item.id}`}>
                  {renderSectionHeader("Recent")}
                  <button
                    data-index={idx}
                    data-selected={isSelected}
                    onClick={() => handleSelect(item)}
                    className={cn(
                      "cmd-item w-full flex items-center gap-3 px-3 py-2 text-left",
                      isSelected && "bg-primary/15 text-primary"
                    )}
                  >
                    <item.icon className={cn("w-4 h-4 shrink-0", isSelected ? "text-primary" : "text-muted-foreground")} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm truncate">{item.label}</div>
                      <div className="text-[11px] text-muted-foreground truncate">{item.description}</div>
                    </div>
                    <Clock className="w-3 h-3 text-muted-foreground/50 shrink-0" />
                  </button>
                </React.Fragment>
              );
            }

            if (isNoQuery && item.type === "view") {
              if ("group" in item && item.group !== lastGroup) {
                lastGroup = item.group;
                return (
                  <React.Fragment key={`group-header-${item.id}`}>
                    {renderSectionHeader(item.group)}
                    <button
                      data-index={idx}
                      data-selected={isSelected}
                      onClick={() => handleSelect(item)}
                      className={cn(
                        "cmd-item w-full flex items-center gap-3 px-3 py-2 text-left",
                        isSelected && "bg-primary/15 text-primary"
                      )}
                    >
                      <item.icon className={cn("w-4 h-4 shrink-0", isSelected ? "text-primary" : "text-muted-foreground")} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm truncate">{item.label}</div>
                        <div className="text-[11px] text-muted-foreground truncate">{item.description}</div>
                      </div>
                      {"shortcut" in item && item.shortcut && (
                        <kbd className="text-[10px] text-muted-foreground/40 bg-muted/20 px-1.5 py-0.5 rounded font-mono shrink-0">
                          {item.shortcut}
                        </kbd>
                      )}
                    </button>
                  </React.Fragment>
                );
              }
              return (
                <button
                  key={item.id}
                  data-index={idx}
                  data-selected={isSelected}
                  onClick={() => handleSelect(item)}
                  className={cn(
                    "cmd-item w-full flex items-center gap-3 px-3 py-2 text-left",
                    isSelected && "bg-primary/15 text-primary"
                  )}
                >
                  <item.icon className={cn("w-4 h-4 shrink-0", isSelected ? "text-primary" : "text-muted-foreground")} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate">{item.label}</div>
                    <div className="text-[11px] text-muted-foreground truncate">{item.description}</div>
                  </div>
                  {"shortcut" in item && item.shortcut && (
                    <kbd className="text-[10px] text-muted-foreground/40 bg-muted/20 px-1.5 py-0.5 rounded font-mono shrink-0">
                      {item.shortcut}
                    </kbd>
                  )}
                </button>
              );
            }

            if (!isNoQuery && item.type === "action") {
              return (
                <button
                  key={item.id}
                  data-index={idx}
                  data-selected={isSelected}
                  onClick={() => handleSelect(item)}
                  className={cn(
                    "cmd-item w-full flex items-center gap-3 px-3 py-2 text-left",
                    isSelected && "bg-primary/15 text-primary"
                  )}
                >
                  <Sparkles className={cn("w-4 h-4 shrink-0", isSelected ? "text-primary" : "text-muted-foreground")} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate">{item.label}</div>
                  </div>
                  <ArrowRight className="w-3 h-3 text-muted-foreground/40 shrink-0" />
                </button>
              );
            }

            if (!isNoQuery && item.type === "view") {
              return (
                <button
                  key={item.id}
                  data-index={idx}
                  data-selected={isSelected}
                  onClick={() => handleSelect(item)}
                  className={cn(
                    "cmd-item w-full flex items-center gap-3 px-3 py-2 text-left",
                    isSelected && "bg-primary/15 text-primary"
                  )}
                >
                  <item.icon className={cn("w-4 h-4 shrink-0", isSelected ? "text-primary" : "text-muted-foreground")} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate">{item.label}</div>
                    <div className="text-[11px] text-muted-foreground truncate">{"group" in item ? item.group : ""}</div>
                  </div>
                  {"shortcut" in item && item.shortcut && (
                    <kbd className="text-[10px] text-muted-foreground/40 bg-muted/20 px-1.5 py-0.5 rounded font-mono shrink-0">
                      {item.shortcut}
                    </kbd>
                  )}
                </button>
              );
            }

            return null;
          })}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-border/30 text-[10px] text-muted-foreground/40">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <kbd className="bg-muted/20 px-1 rounded font-mono">↑↓</kbd> navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="bg-muted/20 px-1 rounded font-mono">↵</kbd> select
          </span>
          <span className="flex items-center gap-1">
            <kbd className="bg-muted/20 px-1 rounded font-mono">esc</kbd> close
          </span>
        </div>
        <span>{flatItems.length} results</span>
      </div>
    </DialogContent>
  );
}

export function CommandPalette({ open, onOpenChange, onViewChange, recentViews }: CommandPaletteProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogOverlay className="cmd-palette-overlay" />
      {open && (
        <CommandPaletteInner
          key={String(open)}
          onViewChange={onViewChange}
          onOpenChange={onOpenChange}
          recentViews={recentViews}
        />
      )}
    </Dialog>
  );
}
