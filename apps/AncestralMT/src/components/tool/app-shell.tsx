"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  LayoutDashboard,
  Database,
  Dna,
  TrendingDown,
  Building2,
  FileText,
  ChevronLeft,
  ChevronRight,
  Activity,
  Search,
  RotateCcw,
  Shield,
  Brain,
  Radio,
  Grid3X3,
  Scale,
  Layers,
  Workflow,
  BarChart3,
  BookOpen,
  Microscope,
  Pill,
  FlaskConical,
  Command,
  RotateCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { CommandPalette } from "@/components/tool/command-palette";
import { NotificationPanel } from "@/components/tool/notification-panel";

export type ViewId =
  | "dashboard"
  | "datasets"
  | "variants"
  | "gap-tracker"
  | "biobank"
  | "reports"
  | "feedback-loop"
  | "structural-forces"
  | "ai-interpreter"
  | "live-stream"
  | "gene-heatmap"
  | "equity-simulator"
  | "reference-panels"
  | "frequency-explorer"
  | "annotation-pipeline"
  | "vus-classifier"
  | "methodology"
  | "pharmacogenomics"
  | "cohort-designer";

interface NavItem {
  id: ViewId;
  label: string;
  icon: React.ElementType;
  description: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

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
      { id: "gene-heatmap", label: "Gene Heatmap", icon: Grid3X3, description: "Gene-population bias matrix" },
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

const navItems = navGroups.flatMap((g) => g.items);

const SIDEBAR_KEY = "ancestralmt-sidebar-collapsed";
const RECENT_VIEWS_KEY = "ancestralmt-recent-views";
const MAX_RECENT = 3;

interface AppShellProps {
  activeView: ViewId;
  onViewChange: (view: ViewId) => void;
  children: React.ReactNode;
}

export function AppShell({ activeView, onViewChange, children }: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [cmdPaletteOpen, setCmdPaletteOpen] = useState(false);
  const [notifPanelOpen, setNotifPanelOpen] = useState(false);
  const [recentViews, setRecentViews] = useState<string[]>([]);
  const [clock, setClock] = useState("");
  const [syncTick, setSyncTick] = useState(0);

  // Sidebar collapse persistence
  useEffect(() => {
    try {
      const stored = localStorage.getItem(SIDEBAR_KEY);
      if (stored !== null) {
        setCollapsed(stored === "true");
      }
    } catch {
      // localStorage unavailable
    }
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_KEY, String(next));
      } catch {
        // localStorage unavailable
      }
      return next;
    });
  }, []);

  // Recent views tracking
  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_VIEWS_KEY);
      if (stored) {
        setRecentViews(JSON.parse(stored) as string[]);
      }
    } catch {
      // localStorage unavailable
    }
  }, []);

  useEffect(() => {
    if (!activeView) return;
    setRecentViews((prev) => {
      const filtered = prev.filter((v) => v !== activeView);
      const next = [activeView, ...filtered].slice(0, MAX_RECENT);
      try {
        localStorage.setItem(RECENT_VIEWS_KEY, JSON.stringify(next));
      } catch {
        // localStorage unavailable
      }
      return next;
    });
  }, [activeView]);

  // Real-time clock (HH:MM:SS)
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setClock(
        [now.getHours(), now.getMinutes(), now.getSeconds()]
          .map((n) => String(n).padStart(2, "0"))
          .join(":")
      );
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Data freshness indicator — updates every 60s
  useEffect(() => {
    const interval = setInterval(() => {
      setSyncTick((t) => t + 1);
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const syncMinutesAgo = Math.floor((Date.now() % 300000) / 60000) + 1;

  // Listen for sidebar toggle from command palette
  useEffect(() => {
    const handler = () => toggleCollapsed();
    window.addEventListener("ancestralmt:toggle-sidebar", handler);
    return () => window.removeEventListener("ancestralmt:toggle-sidebar", handler);
  }, [toggleCollapsed]);

  // Listen for navigation from notification panel
  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent;
      if (ce.detail) {
        onViewChange(ce.detail as ViewId);
      }
    };
    window.addEventListener("ancestralmt:navigate", handler);
    return () => window.removeEventListener("ancestralmt:navigate", handler);
  }, [onViewChange]);

  // Keyboard shortcuts: Ctrl/Cmd+1-9,0 for views 1-10; Ctrl+Shift+1-8 for views 11-18; Ctrl/Cmd+K for command palette
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Command palette toggle
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setCmdPaletteOpen((prev) => !prev);
        return;
      }

      // Notification panel: Ctrl+Shift+N
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "n" || e.key === "N")) {
        e.preventDefault();
        setNotifPanelOpen((prev) => !prev);
        return;
      }

      if (e.ctrlKey || e.metaKey) {
        let idx = -1;

        // Ctrl+Shift+1-8 for views 11-18
        if (e.shiftKey && e.key >= "1" && e.key <= "8") {
          idx = parseInt(e.key) - 1 + 10;
        } else if (!e.shiftKey) {
          // Ctrl+1-9,0 for views 1-10
          if (e.key >= "1" && e.key <= "9") {
            idx = parseInt(e.key) - 1;
          } else if (e.key === "0") {
            idx = 9;
          }
        }

        if (idx >= 0 && idx < navItems.length) {
          e.preventDefault();
          onViewChange(navItems[idx].id);
        }
      }
    },
    [onViewChange]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const allNavItems = navGroups.flatMap((g) => g.items);
  const filteredGroups = navGroups
    .map((g) => ({
      ...g,
      items: g.items.filter(
        (item) =>
          item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.description.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    }))
    .filter((g) => g.items.length > 0);

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex h-screen overflow-hidden">
        {/* Sidebar */}
        <aside
          className={cn(
            "flex flex-col border-r border-border bg-sidebar transition-all duration-300 relative",
            collapsed ? "w-16" : "w-64"
          )}
        >
          {/* Logo */}
          <div className="flex items-center gap-3 px-4 h-14 border-b border-sidebar-border shrink-0">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0 animate-breathe">
              <Dna className="w-4.5 h-4.5 text-primary" />
            </div>
            {!collapsed && (
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-semibold text-sidebar-foreground tracking-tight truncate">
                  AncestralMT
                </span>
                <span className="text-[10px] text-muted-foreground truncate">
                  Mutation Toolkit{" "}
                  <Badge
                    variant="outline"
                    className="text-[8px] px-1 py-0 ml-1 text-primary/70 border-primary/20 font-mono"
                  >
                    v3.3
                  </Badge>
                </span>
              </div>
            )}
          </div>

          {/* Search (expanded only) */}
          {!collapsed && (
            <div className="px-3 py-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search views..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-8 text-xs bg-sidebar-accent border-sidebar-border focus-visible:ring-primary/40"
                />
              </div>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto scrollbar-gradient px-2 py-1 space-y-0.5">
            {filteredGroups.map((group) => (
              <div key={group.label} className={cn("mb-1", !collapsed && "mt-2 first:mt-0")}>
                {!collapsed && searchQuery === "" && (
                  <div className="sidebar-section-label">{group.label}</div>
                )}
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeView === item.id;
                  return (
                    <Tooltip key={item.id}>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => onViewChange(item.id)}
                          className={cn(
                            "w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-150 hover-lift",
                            isActive
                              ? "bg-primary/15 text-primary font-medium nav-active-line"
                              : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent",
                            collapsed && "justify-center px-2"
                          )}
                        >
                          <Icon
                            className={cn(
                              "w-4 h-4 shrink-0",
                              isActive && "text-primary"
                            )}
                          />
                          {!collapsed && <span className="truncate">{item.label}</span>}
                        </button>
                      </TooltipTrigger>
                      {collapsed && (
                        <TooltipContent side="right" className="text-xs">
                          <div className="font-medium">{item.label}</div>
                          <div className="text-muted-foreground">{item.description}</div>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  );
                })}
              </div>
            ))}
          </nav>

          {/* System Status */}
          {!collapsed && (
            <div className="px-3 py-2 border-t border-sidebar-border">
              <div className="rounded-lg bg-sidebar-accent/60 px-3 py-2 space-y-1.5 card-subtle-glow inset-depth data-flow">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-success status-dot-pulse" />
                  <span className="text-[10px] font-medium text-sidebar-foreground">System Status</span>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-muted-foreground">Pipeline</span>
                    <span className="text-success font-medium">Active</span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-muted-foreground">Reference DB</span>
                    <span className="text-success font-medium">Synced</span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-muted-foreground">Ancestry Models</span>
                    <span className="text-warning font-medium">5/7 Pop.</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Collapse Toggle */}
          <div className="px-2 py-2 border-t border-sidebar-border shrink-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleCollapsed}
                  className="w-full h-8 text-muted-foreground hover:text-sidebar-foreground"
                >
                  {collapsed ? (
                    <ChevronRight className="w-4 h-4" />
                  ) : (
                    <>
                      <ChevronLeft className="w-4 h-4 mr-2" />
                      <span className="text-xs">Collapse</span>
                    </>
                  )}
                </Button>
              </TooltipTrigger>
              {collapsed && (
                <TooltipContent side="right" className="text-xs">
                  Expand sidebar
                </TooltipContent>
              )}
            </Tooltip>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top Bar */}
          <header className="h-14 border-b border-border bg-card/50 backdrop-blur-sm flex items-center justify-between px-6 shrink-0 neon-line header-gradient">
            <div className="flex items-center gap-3">
              <h1 className="text-sm font-semibold text-foreground">
                {navItems.find((i) => i.id === activeView)?.label || "Dashboard"}
              </h1>
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0 font-normal text-muted-foreground border-border"
              >
                {navItems.find((i) => i.id === activeView)?.description}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              {/* Keyboard shortcut hint */}
              <span className="text-[9px] text-muted-foreground/50 hidden lg:inline-flex items-center gap-1 bg-muted/50 px-1.5 py-0.5 rounded">
                <kbd className="text-[8px] font-mono bg-muted px-1 rounded">Ctrl</kbd>
                +
                <kbd className="text-[8px] font-mono bg-muted px-1 rounded">1–0</kbd>
                ,
                <kbd className="text-[8px] font-mono bg-muted px-1 rounded">Ctrl+Shift</kbd>
                +
                <kbd className="text-[8px] font-mono bg-muted px-1 rounded">1–8</kbd>
              </span>

              {/* Real-time clock */}
              <span className="text-[11px] text-muted-foreground/50 font-mono hidden md:inline-flex tabular-nums">
                {clock}
              </span>

              {/* Data freshness indicator */}
              <span className="text-[10px] text-muted-foreground/40 hidden md:inline-flex items-center gap-1.5">
                <RotateCw className="w-3 h-3 sync-spin" />
                <span>Data synced {syncMinutesAgo}m ago</span>
              </span>

              {/* Search / Command Palette trigger */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    onClick={() => setCmdPaletteOpen(true)}
                  >
                    <Search className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  <div className="flex items-center gap-2">
                    <span>Command Palette</span>
                    <kbd className="text-[9px] bg-muted/50 px-1 rounded font-mono">Ctrl+K</kbd>
                  </div>
                </TooltipContent>
              </Tooltip>

              {/* Notification Panel */}
              <NotificationPanel open={notifPanelOpen} onOpenChange={setNotifPanelOpen} />

              {/* Avatar */}
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center ring-2 ring-primary/20">
                <span className="text-xs font-semibold text-primary">AM</span>
              </div>
            </div>
          </header>

          {/* Page Content with transition animation */}
          <main className="flex-1 overflow-y-auto scientific-grid relative">
            <div key={activeView} className="view-fade-in">
              {children}
            </div>
          </main>
        </div>
      </div>

      {/* Command Palette */}
      <CommandPalette
        open={cmdPaletteOpen}
        onOpenChange={setCmdPaletteOpen}
        onViewChange={(id) => onViewChange(id as ViewId)}
        recentViews={recentViews}
      />
    </TooltipProvider>
  );
}
