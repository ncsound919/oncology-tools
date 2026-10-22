"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import type { ChartConfig } from "@/components/ui/chart";
import {
  BarChart3,
  PieChart as PieChartIcon,
  TrendingUp,
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
  Eye,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ───────────────────────────────────────────────────────────────────

interface PopulationFrequency {
  population: string;
  abbr: string;
  datasetAF: number;
  gnomadAF: number;
}

interface VariantData {
  id: string;
  name: string;
  gene: string;
  description: string;
  populations: PopulationFrequency[];
  spectrum: SpectrumBin[];
}

interface SpectrumBin {
  bin: string;
  EUR: number;
  AFR: number;
  EAS: number;
  SAS: number;
  AMR: number;
  OTH: number;
}

type DisparityLevel = "Low" | "Moderate" | "High" | "Critical";

interface DisparityRow {
  population: string;
  abbr: string;
  datasetAF: number;
  gnomadAF: number;
  foldDifference: number;
  disparityLevel: DisparityLevel;
}

// ── Data ────────────────────────────────────────────────────────────────────

const variants: VariantData[] = [
  {
    id: "brca1-5266dup",
    name: "BRCA1 c.5266dupC",
    gene: "BRCA1",
    description: "Founder mutation in Ashkenazi Jewish population, breast/ovarian cancer risk",
    populations: [
      { population: "European (EUR)", abbr: "EUR", datasetAF: 0.0042, gnomadAF: 0.001 },
      { population: "African (AFR)", abbr: "AFR", datasetAF: 0.0012, gnomadAF: 0.0003 },
      { population: "East Asian (EAS)", abbr: "EAS", datasetAF: 0.0001, gnomadAF: 0.00005 },
      { population: "South Asian (SAS)", abbr: "SAS", datasetAF: 0.0008, gnomadAF: 0.0002 },
      { population: "Hispanic/Latino (AMR)", abbr: "AMR", datasetAF: 0.0006, gnomadAF: 0.00015 },
      { population: "Admixed/Other", abbr: "OTH", datasetAF: 0.0003, gnomadAF: 0.00008 },
    ],
    spectrum: [
      { bin: "<0.0001", EUR: 2, AFR: 5, EAS: 12, SAS: 8, AMR: 6, OTH: 9 },
      { bin: "0.0001-0.001", EUR: 8, AFR: 15, EAS: 22, SAS: 18, AMR: 20, OTH: 25 },
      { bin: "0.001-0.01", EUR: 45, AFR: 12, EAS: 6, SAS: 10, AMR: 8, OTH: 5 },
      { bin: "0.01-0.1", EUR: 3, AFR: 0, EAS: 0, SAS: 1, AMR: 0, OTH: 0 },
      { bin: ">0.1", EUR: 0, AFR: 0, EAS: 0, SAS: 0, AMR: 0, OTH: 0 },
    ],
  },
  {
    id: "brca2-6174del",
    name: "BRCA2 c.6174delT",
    gene: "BRCA2",
    description: "Icelandic founder mutation, breast/ovarian/prostate cancer risk",
    populations: [
      { population: "European (EUR)", abbr: "EUR", datasetAF: 0.0038, gnomadAF: 0.0006 },
      { population: "African (AFR)", abbr: "AFR", datasetAF: 0.0002, gnomadAF: 0.00003 },
      { population: "East Asian (EAS)", abbr: "EAS", datasetAF: 0.00005, gnomadAF: 0.00001 },
      { population: "South Asian (SAS)", abbr: "SAS", datasetAF: 0.0001, gnomadAF: 0.00002 },
      { population: "Hispanic/Latino (AMR)", abbr: "AMR", datasetAF: 0.00015, gnomadAF: 0.00002 },
      { population: "Admixed/Other", abbr: "OTH", datasetAF: 0.00008, gnomadAF: 0.00001 },
    ],
    spectrum: [
      { bin: "<0.0001", EUR: 5, AFR: 18, EAS: 25, SAS: 22, AMR: 20, OTH: 28 },
      { bin: "0.0001-0.001", EUR: 12, AFR: 8, EAS: 3, SAS: 5, AMR: 7, OTH: 4 },
      { bin: "0.001-0.01", EUR: 38, AFR: 2, EAS: 0, SAS: 1, AMR: 1, OTH: 0 },
      { bin: "0.01-0.1", EUR: 2, AFR: 0, EAS: 0, SAS: 0, AMR: 0, OTH: 0 },
      { bin: ">0.1", EUR: 0, AFR: 0, EAS: 0, SAS: 0, AMR: 0, OTH: 0 },
    ],
  },
  {
    id: "tp53-743ga",
    name: "TP53 c.743G>A",
    gene: "TP53",
    description: "Li-Fraumeni syndrome-associated, multiple cancer types",
    populations: [
      { population: "European (EUR)", abbr: "EUR", datasetAF: 0.00085, gnomadAF: 0.00021 },
      { population: "African (AFR)", abbr: "AFR", datasetAF: 0.00042, gnomadAF: 0.00018 },
      { population: "East Asian (EAS)", abbr: "EAS", datasetAF: 0.00032, gnomadAF: 0.00009 },
      { population: "South Asian (SAS)", abbr: "SAS", datasetAF: 0.00028, gnomadAF: 0.00007 },
      { population: "Hispanic/Latino (AMR)", abbr: "AMR", datasetAF: 0.00035, gnomadAF: 0.00011 },
      { population: "Admixed/Other", abbr: "OTH", datasetAF: 0.00015, gnomadAF: 0.00005 },
    ],
    spectrum: [
      { bin: "<0.0001", EUR: 3, AFR: 4, EAS: 6, SAS: 7, AMR: 5, OTH: 10 },
      { bin: "0.0001-0.001", EUR: 22, AFR: 18, EAS: 15, SAS: 14, AMR: 16, OTH: 12 },
      { bin: "0.001-0.01", EUR: 15, AFR: 8, EAS: 5, SAS: 4, AMR: 6, OTH: 3 },
      { bin: "0.01-0.1", EUR: 1, AFR: 0, EAS: 0, SAS: 0, AMR: 0, OTH: 0 },
      { bin: ">0.1", EUR: 0, AFR: 0, EAS: 0, SAS: 0, AMR: 0, OTH: 0 },
    ],
  },
  {
    id: "egfr-2573tg",
    name: "EGFR c.2573T>G (exon 20)",
    gene: "EGFR",
    description: "EGFR exon 20 insertion-like variant, NSCLC targeted therapy resistance",
    populations: [
      { population: "European (EUR)", abbr: "EUR", datasetAF: 0.00012, gnomadAF: 0.00002 },
      { population: "African (AFR)", abbr: "AFR", datasetAF: 0.00003, gnomadAF: 0.000005 },
      { population: "East Asian (EAS)", abbr: "EAS", datasetAF: 0.00095, gnomadAF: 0.00018 },
      { population: "South Asian (SAS)", abbr: "SAS", datasetAF: 0.00018, gnomadAF: 0.00004 },
      { population: "Hispanic/Latino (AMR)", abbr: "AMR", datasetAF: 0.00008, gnomadAF: 0.00001 },
      { population: "Admixed/Other", abbr: "OTH", datasetAF: 0.00005, gnomadAF: 0.000008 },
    ],
    spectrum: [
      { bin: "<0.0001", EUR: 8, AFR: 14, EAS: 3, SAS: 10, AMR: 12, OTH: 15 },
      { bin: "0.0001-0.001", EUR: 18, AFR: 6, EAS: 25, SAS: 15, AMR: 10, OTH: 8 },
      { bin: "0.001-0.01", EUR: 2, AFR: 0, EAS: 20, SAS: 1, AMR: 0, OTH: 0 },
      { bin: "0.01-0.1", EUR: 0, AFR: 0, EAS: 1, SAS: 0, AMR: 0, OTH: 0 },
      { bin: ">0.1", EUR: 0, AFR: 0, EAS: 0, SAS: 0, AMR: 0, OTH: 0 },
    ],
  },
  {
    id: "apc-3927del",
    name: "APC c.3927_3931del",
    gene: "APC",
    description: "Familial adenomatous polyposis (FAP) truncating mutation",
    populations: [
      { population: "European (EUR)", abbr: "EUR", datasetAF: 0.00055, gnomadAF: 0.00015 },
      { population: "African (AFR)", abbr: "AFR", datasetAF: 0.00008, gnomadAF: 0.00002 },
      { population: "East Asian (EAS)", abbr: "EAS", datasetAF: 0.00012, gnomadAF: 0.00003 },
      { population: "South Asian (SAS)", abbr: "SAS", datasetAF: 0.00018, gnomadAF: 0.00004 },
      { population: "Hispanic/Latino (AMR)", abbr: "AMR", datasetAF: 0.00006, gnomadAF: 0.00001 },
      { population: "Admixed/Other", abbr: "OTH", datasetAF: 0.00004, gnomadAF: 0.000008 },
    ],
    spectrum: [
      { bin: "<0.0001", EUR: 6, AFR: 16, EAS: 12, SAS: 8, AMR: 18, OTH: 22 },
      { bin: "0.0001-0.001", EUR: 28, AFR: 10, EAS: 14, SAS: 18, AMR: 8, OTH: 5 },
      { bin: "0.001-0.01", EUR: 10, AFR: 1, EAS: 2, SAS: 3, AMR: 1, OTH: 0 },
      { bin: "0.01-0.1", EUR: 0, AFR: 0, EAS: 0, SAS: 0, AMR: 0, OTH: 0 },
      { bin: ">0.1", EUR: 0, AFR: 0, EAS: 0, SAS: 0, AMR: 0, OTH: 0 },
    ],
  },
  {
    id: "mlh1-677ct",
    name: "MLH1 c.677C>T",
    gene: "MLH1",
    description: "Lynch syndrome (HNPCC) mismatch repair deficiency, colorectal cancer",
    populations: [
      { population: "European (EUR)", abbr: "EUR", datasetAF: 0.0018, gnomadAF: 0.0005 },
      { population: "African (AFR)", abbr: "AFR", datasetAF: 0.0003, gnomadAF: 0.00008 },
      { population: "East Asian (EAS)", abbr: "EAS", datasetAF: 0.00025, gnomadAF: 0.00006 },
      { population: "South Asian (SAS)", abbr: "SAS", datasetAF: 0.0004, gnomadAF: 0.0001 },
      { population: "Hispanic/Latino (AMR)", abbr: "AMR", datasetAF: 0.00035, gnomadAF: 0.00009 },
      { population: "Admixed/Other", abbr: "OTH", datasetAF: 0.00015, gnomadAF: 0.00004 },
    ],
    spectrum: [
      { bin: "<0.0001", EUR: 4, AFR: 10, EAS: 11, SAS: 7, AMR: 8, OTH: 14 },
      { bin: "0.0001-0.001", EUR: 16, AFR: 12, EAS: 14, SAS: 16, AMR: 14, OTH: 10 },
      { bin: "0.001-0.01", EUR: 22, AFR: 3, EAS: 2, SAS: 4, AMR: 3, OTH: 1 },
      { bin: "0.01-0.1", EUR: 1, AFR: 0, EAS: 0, SAS: 0, AMR: 0, OTH: 0 },
      { bin: ">0.1", EUR: 0, AFR: 0, EAS: 0, SAS: 0, AMR: 0, OTH: 0 },
    ],
  },
  {
    id: "palb2-3113ga",
    name: "PALB2 c.3113G>A",
    gene: "PALB2",
    description: "Fanconi anemia pathway, breast/pancreatic cancer risk modifier",
    populations: [
      { population: "European (EUR)", abbr: "EUR", datasetAF: 0.0022, gnomadAF: 0.00045 },
      { population: "African (AFR)", abbr: "AFR", datasetAF: 0.00015, gnomadAF: 0.00003 },
      { population: "East Asian (EAS)", abbr: "EAS", datasetAF: 0.00008, gnomadAF: 0.000015 },
      { population: "South Asian (SAS)", abbr: "SAS", datasetAF: 0.00012, gnomadAF: 0.000025 },
      { population: "Hispanic/Latino (AMR)", abbr: "AMR", datasetAF: 0.0001, gnomadAF: 0.00002 },
      { population: "Admixed/Other", abbr: "OTH", datasetAF: 0.00006, gnomadAF: 0.00001 },
    ],
    spectrum: [
      { bin: "<0.0001", EUR: 5, AFR: 20, EAS: 24, SAS: 18, AMR: 22, OTH: 26 },
      { bin: "0.0001-0.001", EUR: 14, AFR: 8, EAS: 4, SAS: 6, AMR: 6, OTH: 3 },
      { bin: "0.001-0.01", EUR: 32, AFR: 1, EAS: 0, SAS: 1, AMR: 0, OTH: 0 },
      { bin: "0.01-0.1", EUR: 3, AFR: 0, EAS: 0, SAS: 0, AMR: 0, OTH: 0 },
      { bin: ">0.1", EUR: 0, AFR: 0, EAS: 0, SAS: 0, AMR: 0, OTH: 0 },
    ],
  },
  {
    id: "chek2-1100del",
    name: "CHEK2 c.1100delC",
    gene: "CHEK2",
    description: "European founder mutation, moderate-penetrance breast/prostate cancer risk",
    populations: [
      { population: "European (EUR)", abbr: "EUR", datasetAF: 0.0055, gnomadAF: 0.0008 },
      { population: "African (AFR)", abbr: "AFR", datasetAF: 0.00005, gnomadAF: 0.000005 },
      { population: "East Asian (EAS)", abbr: "EAS", datasetAF: 0.00002, gnomadAF: 0.000002 },
      { population: "South Asian (SAS)", abbr: "SAS", datasetAF: 0.00003, gnomadAF: 0.000003 },
      { population: "Hispanic/Latino (AMR)", abbr: "AMR", datasetAF: 0.00004, gnomadAF: 0.000004 },
      { population: "Admixed/Other", abbr: "OTH", datasetAF: 0.00002, gnomadAF: 0.000002 },
    ],
    spectrum: [
      { bin: "<0.0001", EUR: 3, AFR: 25, EAS: 28, SAS: 26, AMR: 24, OTH: 30 },
      { bin: "0.0001-0.001", EUR: 10, AFR: 3, EAS: 1, SAS: 2, AMR: 2, OTH: 1 },
      { bin: "0.001-0.01", EUR: 48, AFR: 0, EAS: 0, SAS: 0, AMR: 0, OTH: 0 },
      { bin: "0.01-0.1", EUR: 5, AFR: 0, EAS: 0, SAS: 0, AMR: 0, OTH: 0 },
      { bin: ">0.1", EUR: 0, AFR: 0, EAS: 0, SAS: 0, AMR: 0, OTH: 0 },
    ],
  },
  {
    id: "brca1-68delag",
    name: "BRCA1 c.68_69delAG",
    gene: "BRCA1",
    description: "Ashkenazi Jewish founder mutation (185delAG), breast/ovarian cancer",
    populations: [
      { population: "European (EUR)", abbr: "EUR", datasetAF: 0.0065, gnomadAF: 0.0012 },
      { population: "African (AFR)", abbr: "AFR", datasetAF: 0.0008, gnomadAF: 0.00015 },
      { population: "East Asian (EAS)", abbr: "EAS", datasetAF: 0.00005, gnomadAF: 0.00001 },
      { population: "South Asian (SAS)", abbr: "SAS", datasetAF: 0.0002, gnomadAF: 0.00004 },
      { population: "Hispanic/Latino (AMR)", abbr: "AMR", datasetAF: 0.0005, gnomadAF: 0.0001 },
      { population: "Admixed/Other", abbr: "OTH", datasetAF: 0.00015, gnomadAF: 0.00003 },
    ],
    spectrum: [
      { bin: "<0.0001", EUR: 1, AFR: 5, EAS: 14, SAS: 10, AMR: 8, OTH: 12 },
      { bin: "0.0001-0.001", EUR: 6, AFR: 14, EAS: 18, SAS: 16, AMR: 18, OTH: 20 },
      { bin: "0.001-0.01", EUR: 52, AFR: 8, EAS: 2, SAS: 5, AMR: 6, OTH: 3 },
      { bin: "0.01-0.1", EUR: 8, AFR: 0, EAS: 0, SAS: 0, AMR: 0, OTH: 0 },
      { bin: ">0.1", EUR: 0, AFR: 0, EAS: 0, SAS: 0, AMR: 0, OTH: 0 },
    ],
  },
  {
    id: "msh2-942ag",
    name: "MSH2 c.942+3A>G",
    gene: "MSH2",
    description: "Lynch syndrome splice-site variant, colorectal and endometrial cancer risk",
    populations: [
      { population: "European (EUR)", abbr: "EUR", datasetAF: 0.00045, gnomadAF: 0.00012 },
      { population: "African (AFR)", abbr: "AFR", datasetAF: 0.00005, gnomadAF: 0.00001 },
      { population: "East Asian (EAS)", abbr: "EAS", datasetAF: 0.00008, gnomadAF: 0.00002 },
      { population: "South Asian (SAS)", abbr: "SAS", datasetAF: 0.00012, gnomadAF: 0.00003 },
      { population: "Hispanic/Latino (AMR)", abbr: "AMR", datasetAF: 0.00006, gnomadAF: 0.000015 },
      { population: "Admixed/Other", abbr: "OTH", datasetAF: 0.00003, gnomadAF: 0.000008 },
    ],
    spectrum: [
      { bin: "<0.0001", EUR: 7, AFR: 18, EAS: 14, SAS: 10, AMR: 16, OTH: 20 },
      { bin: "0.0001-0.001", EUR: 20, AFR: 6, EAS: 12, SAS: 16, AMR: 8, OTH: 5 },
      { bin: "0.001-0.01", EUR: 8, AFR: 1, EAS: 2, SAS: 3, AMR: 1, OTH: 0 },
      { bin: "0.01-0.1", EUR: 0, AFR: 0, EAS: 0, SAS: 0, AMR: 0, OTH: 0 },
      { bin: ">0.1", EUR: 0, AFR: 0, EAS: 0, SAS: 0, AMR: 0, OTH: 0 },
    ],
  },
  {
    id: "pten-388ct",
    name: "PTEN c.388C>T",
    gene: "PTEN",
    description: "Cowden syndrome / PTEN hamartoma tumor syndrome, multiple neoplasia",
    populations: [
      { population: "European (EUR)", abbr: "EUR", datasetAF: 0.00035, gnomadAF: 0.0001 },
      { population: "African (AFR)", abbr: "AFR", datasetAF: 0.00012, gnomadAF: 0.00004 },
      { population: "East Asian (EAS)", abbr: "EAS", datasetAF: 0.00018, gnomadAF: 0.00005 },
      { population: "South Asian (SAS)", abbr: "SAS", datasetAF: 0.00015, gnomadAF: 0.00004 },
      { population: "Hispanic/Latino (AMR)", abbr: "AMR", datasetAF: 0.0001, gnomadAF: 0.00003 },
      { population: "Admixed/Other", abbr: "OTH", datasetAF: 0.00006, gnomadAF: 0.00002 },
    ],
    spectrum: [
      { bin: "<0.0001", EUR: 8, AFR: 12, EAS: 10, SAS: 11, AMR: 12, OTH: 15 },
      { bin: "0.0001-0.001", EUR: 22, AFR: 16, EAS: 18, SAS: 17, AMR: 16, OTH: 14 },
      { bin: "0.001-0.01", EUR: 5, AFR: 2, EAS: 4, SAS: 3, AMR: 2, OTH: 1 },
      { bin: "0.01-0.1", EUR: 0, AFR: 0, EAS: 0, SAS: 0, AMR: 0, OTH: 0 },
      { bin: ">0.1", EUR: 0, AFR: 0, EAS: 0, SAS: 0, AMR: 0, OTH: 0 },
    ],
  },
  {
    id: "atm-7271tg",
    name: "ATM c.7271T>G",
    gene: "ATM",
    description: "Ataxia-telangiectasia variant, moderate breast/pancreatic cancer risk",
    populations: [
      { population: "European (EUR)", abbr: "EUR", datasetAF: 0.0012, gnomadAF: 0.00025 },
      { population: "African (AFR)", abbr: "AFR", datasetAF: 0.00008, gnomadAF: 0.00002 },
      { population: "East Asian (EAS)", abbr: "EAS", datasetAF: 0.00015, gnomadAF: 0.00004 },
      { population: "South Asian (SAS)", abbr: "SAS", datasetAF: 0.0002, gnomadAF: 0.00005 },
      { population: "Hispanic/Latino (AMR)", abbr: "AMR", datasetAF: 0.0001, gnomadAF: 0.00003 },
      { population: "Admixed/Other", abbr: "OTH", datasetAF: 0.00005, gnomadAF: 0.000015 },
    ],
    spectrum: [
      { bin: "<0.0001", EUR: 5, AFR: 15, EAS: 12, SAS: 8, AMR: 14, OTH: 18 },
      { bin: "0.0001-0.001", EUR: 18, AFR: 10, EAS: 14, SAS: 18, AMR: 12, OTH: 8 },
      { bin: "0.001-0.01", EUR: 16, AFR: 2, EAS: 3, SAS: 4, AMR: 2, OTH: 1 },
      { bin: "0.01-0.1", EUR: 1, AFR: 0, EAS: 0, SAS: 0, AMR: 0, OTH: 0 },
      { bin: ">0.1", EUR: 0, AFR: 0, EAS: 0, SAS: 0, AMR: 0, OTH: 0 },
    ],
  },
];

// ── Chart Configs ────────────────────────────────────────────────────────────

const barChartConfig = {
  datasetAF: { label: "This Dataset", color: "oklch(0.65 0.15 175)" },
  gnomadAF: { label: "Reference (gnomAD)", color: "oklch(0.7 0.16 45)" },
} satisfies ChartConfig;

const spectrumChartConfig = {
  EUR: { label: "European", color: "oklch(0.65 0.15 175)" },
  AFR: { label: "African", color: "oklch(0.65 0.18 25)" },
  EAS: { label: "East Asian", color: "oklch(0.7 0.14 300)" },
  SAS: { label: "South Asian", color: "oklch(0.7 0.16 45)" },
  AMR: { label: "Hispanic/Latino", color: "oklch(0.65 0.15 80)" },
  OTH: { label: "Admixed/Other", color: "oklch(0.6 0.04 250)" },
} satisfies ChartConfig;

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatAF(val: number): string {
  if (val >= 0.01) return val.toFixed(4);
  if (val >= 0.001) return val.toFixed(5);
  if (val >= 0.0001) return val.toFixed(6);
  return val.toExponential(2);
}

function getDisparityLevel(fold: number): DisparityLevel {
  if (fold >= 10) return "Critical";
  if (fold >= 5) return "High";
  if (fold >= 2) return "Moderate";
  return "Low";
}

function getDisparityBadgeClass(level: DisparityLevel): string {
  switch (level) {
    case "Critical":
      return "bg-[oklch(0.65_0.22_25)]/15 text-[oklch(0.65_0.22_25)] border-[oklch(0.65_0.22_25)]/30";
    case "High":
      return "bg-[oklch(0.65_0.22_25)]/10 text-[oklch(0.65_0.22_25)] border-[oklch(0.65_0.22_25)]/20";
    case "Moderate":
      return "bg-[oklch(0.7_0.16_45)]/15 text-[oklch(0.7_0.16_45)] border-[oklch(0.7_0.16_45)]/30";
    case "Low":
      return "bg-[oklch(0.65_0.15_155)]/15 text-[oklch(0.65_0.15_155)] border-[oklch(0.65_0.15_155)]/30";
  }
}

function getClinicalRisk(avgFold: number): { level: string; color: string } {
  if (avgFold >= 5) return { level: "High", color: "text-[oklch(0.65_0.22_25)]" };
  if (avgFold >= 2.5) return { level: "Medium", color: "text-[oklch(0.7_0.16_45)]" };
  return { level: "Low", color: "text-[oklch(0.65_0.15_155)]" };
}

// ── Component ───────────────────────────────────────────────────────────────

export function FrequencyExplorerView() {
  const [selectedVariant, setSelectedVariant] = useState<VariantData>(variants[0]);
  const [searchQuery, setSearchQuery] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [sortField, setSortField] = useState<"foldDifference" | "population">("foldDifference");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Filtered variant list
  const filteredVariants = useMemo(() => {
    if (!searchQuery) return variants;
    const q = searchQuery.toLowerCase();
    return variants.filter(
      (v) =>
        v.name.toLowerCase().includes(q) ||
        v.gene.toLowerCase().includes(q) ||
        v.description.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  // Bar chart data
  const chartData = useMemo(
    () =>
      selectedVariant.populations.map((p) => ({
        population: p.abbr,
        datasetAF: p.datasetAF,
        gnomadAF: p.gnomadAF,
      })),
    [selectedVariant]
  );

  // Disparity table rows
  const disparityRows: DisparityRow[] = useMemo(() => {
    const rows = selectedVariant.populations.map((p) => {
      const fold = p.gnomadAF > 0 ? p.datasetAF / p.gnomadAF : p.datasetAF > 0 ? 999 : 0;
      return {
        population: p.population,
        abbr: p.abbr,
        datasetAF: p.datasetAF,
        gnomadAF: p.gnomadAF,
        foldDifference: fold,
        disparityLevel: getDisparityLevel(fold),
      };
    });
    return rows.sort((a, b) => {
      const dir = sortDir === "desc" ? -1 : 1;
      if (sortField === "foldDifference") return (a.foldDifference - b.foldDifference) * dir;
      return a.population.localeCompare(b.population) * dir;
    });
  }, [selectedVariant, sortField, sortDir]);

  // Summary metrics
  const summaryMetrics = useMemo(() => {
    const folds = disparityRows.map((r) => r.foldDifference);
    const maxFold = Math.max(...folds);
    const maxPop = disparityRows.find((r) => r.foldDifference === maxFold);
    const above5x = folds.filter((f) => f >= 5).length;
    const avgFold = folds.reduce((a, b) => a + b, 0) / folds.length;
    const risk = getClinicalRisk(avgFold);
    return {
      highestDisparity: {
        population: maxPop?.population ?? "—",
        fold: maxFold,
      },
      above5x,
      avgFold,
      risk,
    };
  }, [disparityRows]);

  function handleSort(field: "foldDifference" | "population") {
    if (sortField === field) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="fade-up">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground tracking-tight">
              Ancestry Frequency Explorer
            </h2>
            <p className="text-sm text-muted-foreground">
              Explore and compare allele frequencies across ancestral populations for cancer-related variants
            </p>
          </div>
        </div>
      </div>

      {/* ── Gene Variant Selector ────────────────────────────────────── */}
      <Card className="bg-card border-border/50 card-highlight-top depth-1 fade-up-d1">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Search className="w-4.5 h-4.5 text-primary" />
            <CardTitle className="text-base">Gene Variant Selector</CardTitle>
          </div>
          <CardDescription>
            Search and select a cancer gene variant to explore population allele frequencies
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          {/* Selected chip */}
          {selectedVariant && (
            <div className="flex items-center gap-3 flex-wrap">
              <Badge
                variant="outline"
                className={cn(
                  "px-3 py-1.5 text-sm font-semibold badge-hover chip-interactive",
                  "bg-primary/10 border-primary/30 text-primary"
                )}
              >
                <Zap className="w-3.5 h-3.5 mr-1.5" />
                {selectedVariant.name}
              </Badge>
              <span className="text-xs text-muted-foreground max-w-md">
                {selectedVariant.description}
              </span>
            </div>
          )}

          {/* Search + Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by gene, variant, or description..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setDropdownOpen(true);
                }}
                onFocus={() => setDropdownOpen(true)}
                className="w-full pl-10 pr-10 py-2.5 h-10 text-sm bg-background border border-border/60 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/40 text-foreground placeholder:text-muted-foreground"
              />
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                onClick={() => setDropdownOpen(!dropdownOpen)}
              >
                {dropdownOpen ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </Button>
            </div>

            {/* Dropdown list */}
            {dropdownOpen && (
              <div className="absolute z-50 top-full left-0 right-0 mt-1 max-h-72 overflow-y-auto rounded-lg border border-border/60 bg-[oklch(0.17_0.015_250)] shadow-xl data-grid-bg">
                {filteredVariants.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    No variants found matching &quot;{searchQuery}&quot;
                  </div>
                ) : (
                  filteredVariants.map((v) => (
                    <button
                      key={v.id}
                      className={cn(
                        "w-full text-left px-4 py-3 border-b border-border/20 last:border-0 transition-colors",
                        "hover:bg-primary/5 focus:bg-primary/5 focus:outline-none",
                        selectedVariant.id === v.id && "bg-primary/8"
                      )}
                      onClick={() => {
                        setSelectedVariant(v);
                        setDropdownOpen(false);
                        setSearchQuery("");
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "text-sm font-semibold",
                            selectedVariant.id === v.id
                              ? "text-primary"
                              : "text-foreground"
                          )}
                        >
                          {v.name}
                        </span>
                        {selectedVariant.id === v.id && (
                          <Eye className="w-3.5 h-3.5 text-primary" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                        {v.description}
                      </p>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Population Frequency Comparison Chart ────────────────────── */}
      <Card className="bg-card border-border/50 card-highlight-top neon-line fade-up-d2">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4.5 h-4.5 text-primary" />
            <CardTitle className="text-base">Population Frequency Comparison</CardTitle>
          </div>
          <CardDescription>
            Allele frequency in this dataset vs. gnomAD reference for{" "}
            <span className="text-foreground font-medium">{selectedVariant.name}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          <div className="w-full h-[380px]">
            <ChartContainer config={barChartConfig} className="h-full w-full">
              <BarChart data={chartData} margin={{ left: 0, right: 16, top: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.3 0.015 250)" vertical={false} />
                <XAxis
                  dataKey="population"
                  tick={{ fontSize: 12, fill: "oklch(0.6 0.02 250)" }}
                  tickLine={false}
                  axisLine={{ stroke: "oklch(0.3 0.015 250)" }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "oklch(0.6 0.02 250)" }}
                  tickLine={false}
                  axisLine={{ stroke: "oklch(0.3 0.015 250)" }}
                  tickFormatter={(v: number) => v.toFixed(4)}
                  label={{
                    value: "Allele Frequency",
                    angle: -90,
                    position: "insideLeft",
                    offset: 10,
                    style: { fontSize: 11, fill: "oklch(0.6 0.02 250)" },
                  }}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar
                  dataKey="datasetAF"
                  fill="oklch(0.65 0.15 175)"
                  radius={[4, 4, 0, 0]}
                  barSize={20}
                />
                <Bar
                  dataKey="gnomadAF"
                  fill="oklch(0.7 0.16 45)"
                  radius={[4, 4, 0, 0]}
                  barSize={20}
                />
              </BarChart>
            </ChartContainer>
          </div>
        </CardContent>
      </Card>

      {/* ── Disparity Summary Cards ──────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 fade-up-d3">
        <Card className="bg-card border-border/50 stat-accent-bar hover-lift">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[oklch(0.65_0.22_25)]/15 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-[oklch(0.65_0.22_25)]" />
            </div>
            <div className="min-w-0">
              <div className="text-lg font-bold text-foreground count-animate">
                {summaryMetrics.highestDisparity.fold.toFixed(1)}×
              </div>
              <div className="text-[11px] text-muted-foreground truncate">
                Highest: {summaryMetrics.highestDisparity.population}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/50 stat-accent-bar hover-lift">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[oklch(0.7_0.16_45)]/15 flex items-center justify-center shrink-0">
              <Filter className="w-5 h-5 text-[oklch(0.7_0.16_45)]" />
            </div>
            <div className="min-w-0">
              <div className="text-lg font-bold text-foreground count-animate">
                {summaryMetrics.above5x} / 6
              </div>
              <div className="text-[11px] text-muted-foreground">
                Populations &gt;5× Disparity
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/50 stat-accent-bar hover-lift">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
              <BarChart3 className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <div className="text-lg font-bold text-foreground count-animate">
                {summaryMetrics.avgFold.toFixed(1)}×
              </div>
              <div className="text-[11px] text-muted-foreground">Average Fold Difference</div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/50 stat-accent-bar hover-lift">
          <CardContent className="p-4 flex items-center gap-3">
            <div
              className={cn(
                "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
                summaryMetrics.risk.level === "High"
                  ? "bg-[oklch(0.65_0.22_25)]/15"
                  : summaryMetrics.risk.level === "Medium"
                  ? "bg-[oklch(0.7_0.16_45)]/15"
                  : "bg-[oklch(0.65_0.15_155)]/15"
              )}
            >
              <Zap
                className={cn(
                  "w-5 h-5",
                  summaryMetrics.risk.color
                )}
              />
            </div>
            <div className="min-w-0">
              <div
                className={cn(
                  "text-lg font-bold count-animate",
                  summaryMetrics.risk.color
                )}
              >
                {summaryMetrics.risk.level}
              </div>
              <div className="text-[11px] text-muted-foreground">Clinical Impact Risk</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Frequency Disparity Table ────────────────────────────────── */}
      <Card className="bg-card border-border/50 card-highlight-top glow-border-warning fade-up-d3">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <PieChartIcon className="w-4.5 h-4.5 text-primary" />
            <CardTitle className="text-base">Frequency Disparity Analysis</CardTitle>
          </div>
          <CardDescription>
            Detailed comparison of dataset vs. gnomAD allele frequencies with disparity scoring
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          <div className="rounded-lg border border-border/40 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm table-hover-stripe">
                <thead>
                  <tr className="border-b border-border/60">
                    <th
                      className="text-left py-2.5 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors"
                      onClick={() => handleSort("population")}
                    >
                      <div className="flex items-center gap-1">
                        Population
                        {sortField === "population" &&
                          (sortDir === "desc" ? (
                            <ChevronDown className="w-3 h-3" />
                          ) : (
                            <ChevronUp className="w-3 h-3" />
                          ))}
                      </div>
                    </th>
                    <th className="text-right py-2.5 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Dataset AF
                    </th>
                    <th className="text-right py-2.5 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      gnomAD AF
                    </th>
                    <th
                      className="text-right py-2.5 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors"
                      onClick={() => handleSort("foldDifference")}
                    >
                      <div className="flex items-center justify-end gap-1">
                        Fold Difference
                        {sortField === "foldDifference" &&
                          (sortDir === "desc" ? (
                            <ChevronDown className="w-3 h-3" />
                          ) : (
                            <ChevronUp className="w-3 h-3" />
                          ))}
                      </div>
                    </th>
                    <th className="text-center py-2.5 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Disparity Level
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {disparityRows.map((row) => (
                    <tr
                      key={row.abbr}
                      className="border-b border-border/15 last:border-0"
                    >
                      <td className="py-2.5 px-3 font-medium text-foreground">
                        {row.population}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-[oklch(0.65_0.15_175)]">
                        {formatAF(row.datasetAF)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-[oklch(0.7_0.16_45)]">
                        {formatAF(row.gnomadAF)}
                      </td>
                      <td
                        className={cn(
                          "py-2.5 px-3 text-right font-mono font-bold",
                          row.foldDifference >= 10
                            ? "text-[oklch(0.65_0.22_25)]"
                            : row.foldDifference >= 5
                            ? "text-[oklch(0.65_0.22_25)]"
                            : row.foldDifference >= 2
                            ? "text-[oklch(0.7_0.16_45)]"
                            : "text-[oklch(0.65_0.15_155)]"
                        )}
                      >
                        {row.foldDifference >= 500 ? ">500" : row.foldDifference.toFixed(1)}×
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] px-2 py-0.5 badge-hover",
                            getDisparityBadgeClass(row.disparityLevel)
                          )}
                        >
                          {row.disparityLevel}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Disparity Legend */}
          <div className="flex items-center gap-4 mt-3 text-[10px] text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[oklch(0.65_0.15_155)]" />
              Low (&lt;2×)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[oklch(0.7_0.16_45)]" />
              Moderate (2–5×)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[oklch(0.65_0.22_25)]" />
              High (5–10×)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[oklch(0.65_0.22_25)] ring-2 ring-[oklch(0.65_0.22_25)]/30" />
              Critical (&gt;10×)
            </span>
          </div>
        </CardContent>
      </Card>

      {/* ── Frequency Spectrum Visualization ──────────────────────────── */}
      <Card className="bg-card border-border/50 card-highlight-top fade-up-d4">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4.5 h-4.5 text-primary" />
            <CardTitle className="text-base">Allele Frequency Spectrum</CardTitle>
          </div>
          <CardDescription>
            Distribution of variants across frequency bins for{" "}
            <span className="text-foreground font-medium">{selectedVariant.name}</span>{" "}
            by ancestral population
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <div className="w-full h-[320px]">
            <ChartContainer config={spectrumChartConfig} className="h-full w-full">
              <LineChart data={selectedVariant.spectrum} margin={{ left: 0, right: 16, top: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.3 0.015 250)" />
                <XAxis
                  dataKey="bin"
                  tick={{ fontSize: 11, fill: "oklch(0.6 0.02 250)" }}
                  tickLine={false}
                  axisLine={{ stroke: "oklch(0.3 0.015 250)" }}
                  label={{
                    value: "Allele Frequency Bin",
                    position: "insideBottom",
                    offset: -2,
                    style: { fontSize: 11, fill: "oklch(0.6 0.02 250)" },
                  }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "oklch(0.6 0.02 250)" }}
                  tickLine={false}
                  axisLine={{ stroke: "oklch(0.3 0.015 250)" }}
                  label={{
                    value: "Variant Count",
                    angle: -90,
                    position: "insideLeft",
                    offset: 10,
                    style: { fontSize: 11, fill: "oklch(0.6 0.02 250)" },
                  }}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Line
                  type="monotone"
                  dataKey="EUR"
                  stroke="oklch(0.65 0.15 175)"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "oklch(0.65 0.15 175)" }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="AFR"
                  stroke="oklch(0.65 0.18 25)"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "oklch(0.65 0.18 25)" }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="EAS"
                  stroke="oklch(0.7 0.14 300)"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "oklch(0.7 0.14 300)" }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="SAS"
                  stroke="oklch(0.7 0.16 45)"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "oklch(0.7 0.16 45)" }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="AMR"
                  stroke="oklch(0.65 0.15 80)"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "oklch(0.65 0.15 80)" }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="OTH"
                  stroke="oklch(0.6 0.04 250)"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ r: 3, fill: "oklch(0.6 0.04 250)" }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ChartContainer>
          </div>
        </CardContent>
      </Card>

      {/* ── Key Insight Callout ──────────────────────────────────────── */}
      <Card className="bg-card border-border/50 card-gradient-teal corner-accent-tl fade-up-d5 glass-layer">
        <CardContent className="p-5 flex gap-4">
          <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
            <Info className="w-5 h-5 text-primary" />
          </div>
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Zap className="w-4 h-4 text-[oklch(0.7_0.16_45)]" />
              Key Insight: Why Frequency Disparities Matter
            </h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Variants with &gt;5× frequency disparity between dataset and reference populations may
              indicate biased variant calling or genuine population-specific allele frequency differences.
              This directly impacts VUS (Variant of Uncertain Significance) reclassification accuracy.
              When reference panels lack representation for a patient&#39;s ancestry, clinicians cannot
              reliably distinguish pathogenic variants from benign population-specific polymorphisms,
              leading to over- or under-diagnosis in underrepresented populations.
            </p>
            <div className="flex items-center gap-3 pt-1">
              <Badge
                variant="outline"
                className="text-[10px] px-2 py-0.5 bg-[oklch(0.65_0.22_25)]/10 text-[oklch(0.65_0.22_25)] border-[oklch(0.65_0.22_25)]/30"
              >
                <AlertTriangle className="w-3 h-3 mr-1" />
                Critical for Clinical Reporting
              </Badge>
              <Badge
                variant="outline"
                className="text-[10px] px-2 py-0.5 bg-primary/10 text-primary border-primary/30"
              >
                <BarChart3 className="w-3 h-3 mr-1" />
                ACMG/AMP Guideline Relevance
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
