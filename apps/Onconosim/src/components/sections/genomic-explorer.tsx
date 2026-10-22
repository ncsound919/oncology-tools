'use client';

import { useMemo, useState } from "react";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from "recharts";
import { Dna, Filter, Microscope, Users } from "lucide-react";
import { VARIANTS, HLA_ALLELES, type Variant, type HlaAllele } from "@/lib/data";

/* ---------- theme tokens (read from .onc-dark CSS variables) ---------- */
const TEAL = "#4FD1C0";
const AMBER = "#E8A94D";
const CORAL = "#E8664F";
const VIOLET = "#9E8CF2";
const GREEN = "#6EE7B7";
const PURPLE = "#9F7AEA";
const DIM = "#8B9299";
const INK = "#E9E7DF";
const BORDER = "#262D34";
const PANEL_2 = "#1A2128";

/* ---------- static maps ---------- */
const COHORTS = ["All", "PDAC", "NSCLC", "CRC", "HCC", "MEL", "BRCA"] as const;
const GENES = ["All", "KRAS", "TP53", "EGFR", "BRAF", "PIK3CA", "STK11"] as const;

const GENE_COLORS: Record<string, string> = {
  KRAS: TEAL,
  TP53: CORAL,
  EGFR: VIOLET,
  BRAF: AMBER,
  PIK3CA: GREEN,
  STK11: PURPLE,
};

// tier -> "leg color" gradient (early evidence coral → mature teal/green)
function tierColor(tier: number): string {
  if (tier <= 1) return CORAL;
  if (tier === 2) return AMBER;
  if (tier === 3) return VIOLET;
  if (tier === 4) return TEAL;
  return GREEN;
}

function tierLabel(tier: number): string {
  return `T${tier}`;
}

// HLA binding tier — color is never the only signal (always paired with text/number)
function hlaBindingStyle(nM: number | null): { color: string; label: string } {
  if (nM == null) return { color: DIM, label: "—" };
  if (nM <= 100) return { color: GREEN, label: `${nM} strong` };
  if (nM <= 300) return { color: TEAL, label: `${nM} mod` };
  if (nM <= 500) return { color: AMBER, label: `${nM} weak` };
  return { color: CORAL, label: `${nM} poor` };
}

function hlaBarColor(nM: number | null): string {
  if (nM == null) return DIM;
  if (nM <= 100) return GREEN;
  if (nM <= 300) return TEAL;
  if (nM <= 500) return AMBER;
  return CORAL;
}

/* ---------- fetcher ---------- */
type GenomicResponse = {
  variants: Variant[];
  hlaAlleles: HlaAllele[];
  error?: string;
};

async function fetchGenomic(): Promise<GenomicResponse> {
  const res = await fetch("/api/genomic", { cache: "no-store" });
  if (!res.ok) throw new Error(`genomic fetch failed (${res.status})`);
  return res.json();
}

/* ---------- small atoms ---------- */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="onc-mono text-[11px] font-medium uppercase tracking-[0.18em]"
      style={{ color: TEAL }}
    >
      {children}
    </span>
  );
}

function PanelCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={
        "rounded-xl border p-5 " + (className ?? "")
      }
      style={{
        background: "var(--onc-panel)",
        borderColor: BORDER,
      }}
    >
      {children}
    </div>
  );
}

/* ---------- variant table ---------- */
function VariantTable({ variants }: { variants: Variant[] }) {
  return (
    <div
      className="onc-scroll max-h-96 overflow-y-auto rounded-lg border"
      style={{ borderColor: BORDER, background: PANEL_2 }}
      role="region"
      aria-label="Variant calls table"
    >
      <table className="w-full text-sm">
        <thead
          className="sticky top-0 z-10"
          style={{ background: PANEL_2, borderBottom: `1px solid ${BORDER}` }}
        >
          <tr>
            {["Gene", "Protein change", "Cohort", "VAF (%)", "HLA binding (nM)", "Tier"].map(
              (h) => (
                <th
                  key={h}
                  scope="col"
                  className="onc-mono px-3 py-2 text-left text-[10px] font-medium uppercase tracking-[0.14em]"
                  style={{ color: DIM }}
                >
                  {h}
                </th>
              )
            )}
          </tr>
        </thead>
        <tbody>
          {variants.map((v, i) => {
            const hla = hlaBindingStyle(v.hlaBinding);
            const tColor = tierColor(v.tier);
            return (
              <tr
                key={`${v.gene}-${v.protein}-${i}`}
                className="onc-sans border-b transition-colors hover:bg-white/[0.02]"
                style={{ borderBottomColor: BORDER }}
              >
                <td className="px-3 py-2.5">
                  <span
                    className="onc-mono text-[13px] font-medium"
                    style={{ color: GENE_COLORS[v.gene] ?? INK }}
                  >
                    {v.gene}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  <span className="onc-mono text-[12px]" style={{ color: INK }}>
                    {v.protein}
                  </span>
                  <div
                    className="onc-mono text-[10px]"
                    style={{ color: DIM }}
                  >
                    {v.hgvs}
                  </div>
                </td>
                <td className="px-3 py-2.5">
                  <span className="onc-mono text-[12px]" style={{ color: INK }}>
                    {v.cohort}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <span
                      className="onc-mono w-10 text-[12px] tabular-nums"
                      style={{ color: INK }}
                    >
                      {(v.alleleFreq * 100).toFixed(0)}%
                    </span>
                    <div
                      className="h-1.5 w-16 overflow-hidden rounded-full"
                      style={{ background: "rgba(255,255,255,0.05)" }}
                      aria-hidden="true"
                    >
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min(100, v.alleleFreq * 100)}%`,
                          background: GENE_COLORS[v.gene] ?? TEAL,
                        }}
                      />
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2.5">
                  <span
                    className="onc-mono text-[12px] tabular-nums"
                    style={{ color: hla.color }}
                    title={
                      v.hlaBinding == null
                        ? "Not computed"
                        : `${v.hlaBinding} nM predicted affinity`
                    }
                  >
                    {hla.label}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  <Badge
                    variant="outline"
                    className="border-0 px-1.5 py-0 text-[10px] font-semibold onc-mono"
                    style={{
                      color: tColor,
                      background: `${tColor}1A`,
                      borderColor: "transparent",
                    }}
                    title={`Evidence tier ${v.tier}`}
                  >
                    {tierLabel(v.tier)}
                  </Badge>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ---------- skeleton rows ---------- */
function SkeletonTable() {
  return (
    <div
      className="onc-scroll max-h-96 overflow-y-auto rounded-lg border"
      style={{ borderColor: BORDER, background: PANEL_2 }}
      aria-busy="true"
      aria-label="Loading variant calls"
    >
      <table className="w-full text-sm">
        <thead
          className="sticky top-0"
          style={{ background: PANEL_2, borderBottom: `1px solid ${BORDER}` }}
        >
          <tr>
            {["Gene", "Protein change", "Cohort", "VAF (%)", "HLA binding (nM)", "Tier"].map(
              (h) => (
                <th
                  key={h}
                  className="onc-mono px-3 py-2 text-left text-[10px] font-medium uppercase tracking-[0.14em]"
                  style={{ color: DIM }}
                >
                  {h}
                </th>
              )
            )}
          </tr>
        </thead>
        <tbody>
          {[0, 1, 2].map((i) => (
            <tr key={i} style={{ borderBottom: `1px solid ${BORDER}` }}>
              {[0, 1, 2, 3, 4, 5].map((c) => (
                <td key={c} className="px-3 py-3">
                  <Skeleton
                    className="h-3"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      width: `${40 + ((i + c) % 4) * 14}%`,
                    }}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ---------- VAF distribution stacked bar chart ---------- */
function VafByCohortChart({ variants }: { variants: Variant[] }) {
  const data = useMemo(() => {
    const cohorts = Array.from(new Set(variants.map((v) => v.cohort)));
    return cohorts.map((cohort) => {
      const row: Record<string, number | string> = { cohort };
      for (const g of GENES) {
        if (g === "All") continue;
        row[g] = 0;
      }
      for (const v of variants) {
        if (v.cohort !== cohort) continue;
        row[v.gene] = ((row[v.gene] as number) || 0) + v.alleleFreq;
      }
      return row;
    });
  }, [variants]);

  const stackedGenes = GENES.filter((g) => g !== "All");

  return (
    <div
      className="rounded-lg border p-4"
      style={{ borderColor: BORDER, background: PANEL_2 }}
      aria-label="VAF distribution by cohort"
      role="figure"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <h4
          className="onc-sans text-[13px] font-medium"
          style={{ color: INK }}
        >
          VAF distribution by cohort
        </h4>
        <span
          className="onc-mono text-[10px] uppercase tracking-[0.12em]"
          style={{ color: DIM }}
        >
          stacked · colored by gene
        </span>
      </div>
      <div style={{ width: "100%", height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 4, right: 8, left: -16, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="2 4"
              stroke={BORDER}
              vertical={false}
            />
            <XAxis
              dataKey="cohort"
              stroke={DIM}
              tick={{ fill: DIM, fontSize: 11, fontFamily: "var(--font-geist-mono), monospace" }}
              tickLine={false}
              axisLine={{ stroke: BORDER }}
            />
            <YAxis
              stroke={DIM}
              tick={{ fill: DIM, fontSize: 11, fontFamily: "var(--font-geist-mono), monospace" }}
              tickLine={false}
              axisLine={{ stroke: BORDER }}
              tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
            />
            <Tooltip
              cursor={{ fill: "rgba(255,255,255,0.04)" }}
              contentStyle={{
                background: PANEL_2,
                border: `1px solid ${BORDER}`,
                borderRadius: 8,
                color: INK,
                fontSize: 12,
              }}
              labelStyle={{ color: TEAL, fontFamily: "var(--font-geist-mono), monospace" }}
              formatter={(value: number, name: string) => [
                `${(value * 100).toFixed(0)}%`,
                name,
              ]}
            />
            {stackedGenes.map((g) => (
              <Bar
                key={g}
                dataKey={g}
                stackId="vaf"
                fill={GENE_COLORS[g] ?? DIM}
                radius={g === stackedGenes[stackedGenes.length - 1] ? [3, 3, 0, 0] : [0, 0, 0, 0]}
                maxBarSize={48}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
        {stackedGenes.map((g) => (
          <span
            key={g}
            className="onc-mono inline-flex items-center gap-1.5 text-[10px]"
            style={{ color: DIM }}
          >
            <span
              className="inline-block h-2 w-2 rounded-sm"
              style={{ background: GENE_COLORS[g] ?? DIM }}
              aria-hidden="true"
            />
            {g}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ---------- HLA binding horizontal bar chart ---------- */
function HlaBindingChart({ hlaAlleles }: { hlaAlleles: HlaAllele[] }) {
  // Reference maximum for inversion: strong binders (low nM) appear as longer bars.
  const MAX_REF = 800;
  const data = useMemo(
    () =>
      hlaAlleles
        .filter((a) => a.bestAffinity != null)
        .map((a) => ({
          allele: a.allele,
          affinity: a.bestAffinity as number,
          // visual length: lower nM → longer bar
          strength: Math.max(0, MAX_REF - (a.bestAffinity as number)),
          binder: a.bestBinder,
        }))
        .sort((a, b) => a.affinity - b.affinity),
    [hlaAlleles]
  );

  return (
    <div
      style={{ width: "100%", height: Math.max(180, data.length * 28 + 24) }}
      aria-label="HLA binding prediction chart"
      role="figure"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          layout="vertical"
          data={data}
          margin={{ top: 0, right: 28, left: 8, bottom: 0 }}
          barCategoryGap={6}
        >
          <CartesianGrid
            strokeDasharray="2 4"
            stroke={BORDER}
            horizontal={false}
          />
          <XAxis
            type="number"
            domain={[0, MAX_REF]}
            hide
          />
          <YAxis
            type="category"
            dataKey="allele"
            stroke={DIM}
            tick={{ fill: INK, fontSize: 10, fontFamily: "var(--font-geist-mono), monospace" }}
            tickLine={false}
            axisLine={{ stroke: BORDER }}
            width={92}
          />
          <Tooltip
            cursor={{ fill: "rgba(255,255,255,0.04)" }}
            contentStyle={{
              background: PANEL_2,
              border: `1px solid ${BORDER}`,
              borderRadius: 8,
              color: INK,
              fontSize: 12,
            }}
            labelStyle={{ color: TEAL, fontFamily: "var(--font-geist-mono), monospace" }}
            formatter={(_value: number, _name: string, payload) => {
              const p = payload?.payload as {
                affinity: number;
                binder: string | null;
              } | undefined;
              if (!p) return ["", ""];
              return [`${p.affinity} nM · ${p.binder ?? "—"}`, "Predicted affinity"];
            }}
          />
          <Bar dataKey="strength" radius={[0, 3, 3, 0]} maxBarSize={18}>
            {data.map((d, i) => (
              <Cell key={i} fill={hlaBarColor(d.affinity)} />
            ))}
            <LabelList
              dataKey="affinity"
              position="right"
              formatter={(v: number) => `${v}nM`}
              style={{
                fill: INK,
                fontSize: 10,
                fontFamily: "var(--font-geist-mono), monospace",
              }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ---------- main component ---------- */
function GenomicExplorerInner() {
  const [cohort, setCohort] = useState<string>("All");
  const [gene, setGene] = useState<string>("All");

  const { data, isLoading, isError } = useQuery<GenomicResponse>({
    queryKey: ["genomic"],
    queryFn: fetchGenomic,
    staleTime: 60_000,
  });

  const variants = data?.variants ?? (isError ? VARIANTS : []);
  const hlaAlleles = data?.hlaAlleles ?? (isError ? HLA_ALLELES : []);

  const filteredVariants = useMemo(() => {
    return variants.filter((v) => {
      if (cohort !== "All" && v.cohort !== cohort) return false;
      if (gene !== "All" && v.gene !== gene) return false;
      return true;
    });
  }, [variants, cohort, gene]);

  const eligibleCoverage = useMemo(() => {
    const sum = hlaAlleles
      .filter((a) => a.bestAffinity != null && a.bestAffinity <= 500)
      .reduce((acc, a) => acc + a.freq, 0);
    return Math.min(100, sum * 100);
  }, [hlaAlleles]);

  const usingFallback = isError || (!isLoading && (!data || !data.variants?.length));

  return (
    <section
      id="genomic-explorer"
      className="onc-dark onc-sans w-full px-4 py-10 sm:px-6 lg:px-10"
      style={{ background: "var(--onc-bg)" }}
      aria-labelledby="genomic-heading"
    >
      <div className="mx-auto max-w-7xl">
        {/* section header */}
        <div className="mb-6 flex items-center gap-3">
          <span
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg"
            style={{ background: "rgba(79,209,192,0.10)", color: TEAL }}
            aria-hidden="true"
          >
            <Dna className="h-4 w-4" />
          </span>
          <div>
            <SectionLabel>GENOMIC SEQUENCING · VARIANT CALLS</SectionLabel>
            <h2
              id="genomic-heading"
              className="onc-sans mt-1 text-xl font-semibold sm:text-2xl"
              style={{ color: INK }}
            >
              Cohort variant landscape
            </h2>
          </div>
        </div>

        {usingFallback && (
          <div
            className="mb-4 rounded-md border px-3 py-2 text-xs"
            style={{
              borderColor: "rgba(232, 105, 79, 0.3)",
              background: "rgba(232, 105, 79, 0.06)",
              color: DIM,
            }}
            role="status"
          >
            Sequencing data unavailable — showing fallback.
          </div>
        )}

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_320px]">
          {/* ---------------- left column ---------------- */}
          <div className="flex flex-col gap-5">
            <PanelCard>
              {/* filters */}
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <span
                  className="onc-mono inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.14em]"
                  style={{ color: DIM }}
                >
                  <Filter className="h-3 w-3" />
                  Filter
                </span>
                <div className="flex items-center gap-2">
                  <label
                    htmlFor="cohort-filter"
                    className="onc-mono text-[10px] uppercase tracking-[0.12em]"
                    style={{ color: DIM }}
                  >
                    Cohort
                  </label>
                  <Select value={cohort} onValueChange={setCohort}>
                    <SelectTrigger
                      id="cohort-filter"
                      size="sm"
                      className="onc-mono h-8 w-[110px] border text-[12px]"
                      style={{
                        borderColor: BORDER,
                        background: PANEL_2,
                        color: INK,
                      }}
                      aria-label="Filter by cohort"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent
                      style={{ background: PANEL_2, borderColor: BORDER, color: INK }}
                    >
                      {COHORTS.map((c) => (
                        <SelectItem key={c} value={c} className="onc-mono text-[12px]">
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <label
                    htmlFor="gene-filter"
                    className="onc-mono text-[10px] uppercase tracking-[0.12em]"
                    style={{ color: DIM }}
                  >
                    Gene
                  </label>
                  <Select value={gene} onValueChange={setGene}>
                    <SelectTrigger
                      id="gene-filter"
                      size="sm"
                      className="onc-mono h-8 w-[120px] border text-[12px]"
                      style={{
                        borderColor: BORDER,
                        background: PANEL_2,
                        color: INK,
                      }}
                      aria-label="Filter by gene"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent
                      style={{ background: PANEL_2, borderColor: BORDER, color: INK }}
                    >
                      {GENES.map((g) => (
                        <SelectItem key={g} value={g} className="onc-mono text-[12px]">
                          {g}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <span
                  className="onc-mono ml-auto text-[10px] uppercase tracking-[0.12em]"
                  style={{ color: DIM }}
                >
                  {filteredVariants.length} / {variants.length} variants
                </span>
              </div>

              {isLoading ? (
                <SkeletonTable />
              ) : filteredVariants.length === 0 ? (
                <div
                  className="rounded-lg border p-8 text-center text-sm"
                  style={{ borderColor: BORDER, background: PANEL_2, color: DIM }}
                >
                  No variants match the current filters.
                </div>
              ) : (
                <VariantTable variants={filteredVariants} />
              )}

              {/* HLA binding color legend */}
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
                <span
                  className="onc-mono text-[10px] uppercase tracking-[0.12em]"
                  style={{ color: DIM }}
                >
                  HLA binding:
                </span>
                {[
                  { c: GREEN, l: "≤100 strong" },
                  { c: TEAL, l: "100–300 mod" },
                  { c: AMBER, l: "300–500 weak" },
                  { c: CORAL, l: ">500 poor" },
                  { c: DIM, l: "—" },
                ].map((x) => (
                  <span
                    key={x.l}
                    className="onc-mono inline-flex items-center gap-1.5 text-[10px]"
                    style={{ color: DIM }}
                  >
                    <span
                      className="inline-block h-2 w-2 rounded-sm"
                      style={{ background: x.c }}
                      aria-hidden="true"
                    />
                    {x.l}
                  </span>
                ))}
              </div>
            </PanelCard>

            <VafByCohortChart variants={variants.length ? variants : VARIANTS} />
          </div>

          {/* ---------------- right column ---------------- */}
          <PanelCard className="flex flex-col gap-4">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <span
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md"
                  style={{ background: "rgba(79,209,192,0.10)", color: TEAL }}
                  aria-hidden="true"
                >
                  <Microscope className="h-3.5 w-3.5" />
                </span>
                <SectionLabel>HLA-BINDING PREDICTION</SectionLabel>
              </div>
              <h3
                className="onc-sans text-base font-semibold"
                style={{ color: INK }}
              >
                NetMHCpan-class stratification
              </h3>
            </div>

            <p
              className="onc-sans text-[12px] leading-relaxed"
              style={{ color: DIM }}
            >
              Predicted affinity (nM) of the best-binding KRAS mutant peptide for each
              common HLA allele. Lower = stronger binding. Used to stratify which patients
              would benefit most from a KRAS-degrader immune-priming effect — Experiment 3.
            </p>

            {/* chart */}
            <div
              className="rounded-lg border p-3"
              style={{ borderColor: BORDER, background: PANEL_2 }}
            >
              <div className="mb-2 flex items-center justify-between">
                <span
                  className="onc-mono text-[10px] uppercase tracking-[0.12em]"
                  style={{ color: DIM }}
                >
                  Best KRAS peptide affinity
                </span>
                <span
                  className="onc-mono text-[10px]"
                  style={{ color: DIM }}
                >
                  longer = stronger
                </span>
              </div>
              <HlaBindingChart
                hlaAlleles={hlaAlleles.length ? hlaAlleles : HLA_ALLELES}
              />
            </div>

            {/* population coverage stat */}
            <div
              className="rounded-lg border p-4"
              style={{
                borderColor: "rgba(110, 231, 183, 0.25)",
                background:
                  "linear-gradient(135deg, rgba(110, 231, 183, 0.08), rgba(79, 209, 192, 0.04))",
              }}
            >
              <div className="flex items-center gap-2">
                <span
                  className="inline-flex h-6 w-6 items-center justify-center rounded-md"
                  style={{ background: "rgba(110, 231, 183, 0.15)", color: GREEN }}
                  aria-hidden="true"
                >
                  <Users className="h-3 w-3" />
                </span>
                <span
                  className="onc-mono text-[10px] uppercase tracking-[0.14em]"
                  style={{ color: DIM }}
                >
                  Population coverage
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <span
                  className="onc-mono text-3xl font-semibold tabular-nums"
                  style={{ color: GREEN }}
                >
                  {eligibleCoverage.toFixed(0)}
                </span>
                <span
                  className="onc-mono text-base font-medium"
                  style={{ color: GREEN }}
                >
                  %
                </span>
              </div>
              <div
                className="onc-sans mt-1 text-[11px] leading-snug"
                style={{ color: DIM }}
              >
                Eligible population (predicted sub-500nM binder)
              </div>
            </div>
          </PanelCard>
        </div>
      </div>
    </section>
  );
}

/* ---------- exported with local QueryClient provider ---------- */
export default function GenomicExplorer() {
  const [client] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={client}>
      <GenomicExplorerInner />
    </QueryClientProvider>
  );
}
