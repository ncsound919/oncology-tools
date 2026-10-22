'use client';

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Activity, Loader2, Save, Target } from "lucide-react";
import { GTerm } from "@/components/glossary-term";

/* ---- OncoSIM dark palette (must match globals.css tokens exactly) ---- */
const INK = "#E9E7DF";
const DIM = "#8B9299";
const PANEL = "#161B20";
const BORDER = "#262D34";
const BG = "#0D1013";
const TEAL = "#4FD1C0";
const AMBER = "#E8A94D";
const CORAL = "#E8664F";
const VIOLET = "#9E8CF2";

/* ---- Shared chart styles (dark, mono) ---- */
const TOOLTIP_STYLE = {
  background: BG,
  border: `1px solid ${BORDER}`,
  borderRadius: 4,
  fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
  fontSize: 11,
  color: INK,
};

const LEGEND_STYLE = {
  fontFamily: "'IBM Plex Sans', system-ui, sans-serif",
  fontSize: 11,
  color: DIM,
};

const AXIS_TICK = {
  fill: DIM,
  fontSize: 10,
  fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
};

const AXIS_TICK_LG = {
  fill: DIM,
  fontSize: 10.5,
  fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
};

/* ---- Domain types ---- */
type LigaseKind = "CRBN" | "VHL" | "Novel";
type MhcStatus = "intact" | "partial" | "lost";
type ParticleType = "targeted" | "untargeted";
type TabKey = "kinetics" | "delivery";

type KineticsRow = {
  day: number;
  "Degrader — protein level": number;
  "Inhibitor — protein level": number;
  "Degrader — pathway activity": number;
  "Inhibitor — pathway activity": number;
};

type HomingRow = {
  organ: string;
  value: number;
  fill: string;
};

type SaveableKind = "kinetics" | "delivery";

/* ---- Readout --------------------------------------------------------- */
function Readout({
  label,
  value,
  unit,
  color = INK,
}: {
  label: string;
  value: number | string;
  unit?: string;
  color?: string;
}) {
  return (
    <div
      className="onc-sans rounded-[4px] px-3.5 py-2.5 min-w-[140px]"
      style={{ background: BG, border: `1px solid ${BORDER}` }}
    >
      <div
        className="uppercase"
        style={{ fontSize: 10, letterSpacing: "0.08em", color: DIM }}
      >
        {label}
      </div>
      <div
        className="onc-mono mt-0.5 tabular-nums"
        style={{ fontSize: 24, color, lineHeight: 1.1 }}
      >
        {value}
        {unit ? (
          <span className="ml-1" style={{ fontSize: 12, color: DIM }}>
            {unit}
          </span>
        ) : null}
      </div>
    </div>
  );
}

/* ---- Segmented toggle (radiogroup of buttons) ------------------------ */
type SegmentedOption<T extends string> = { value: T; label: string };

function SegmentedToggle<T extends string>({
  options,
  value,
  onChange,
  accent,
  ariaLabel,
}: {
  options: ReadonlyArray<SegmentedOption<T>>;
  value: T;
  onChange: (v: T) => void;
  accent: string;
  ariaLabel: string;
}) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className="flex gap-1.5">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            variant="ghost"
            size="sm"
            onClick={() => onChange(opt.value)}
            className="onc-mono flex-1 h-8 px-2 text-[11px] tracking-[0.04em] rounded-[3px]"
            style={
              active
                ? { background: accent, color: BG, border: `1px solid ${accent}` }
                : { background: "transparent", color: DIM, border: `1px solid ${BORDER}` }
            }
          >
            {opt.label}
          </Button>
        );
      })}
    </div>
  );
}

/* ---- Simulator slider (raw input styled via .onc-slider) ------------- *
 *  Thumb color = currentColor (see .onc-slider rule in globals.css),     *
 *  so we set `color` inline to tint each slider's accent.                */
function SimulatorSlider({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  unit = "",
  accent = TEAL,
  help,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  accent?: string;
  help?: React.ReactNode;
}) {
  const id = `sim-slider-${label.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`;
  return (
    <div style={{ marginBottom: 18 }}>
      <div className="flex items-baseline justify-between">
        <label htmlFor={id} className="onc-sans" style={{ fontSize: 12, color: INK }}>
          {label}
        </label>
        <span className="onc-mono tabular-nums" style={{ fontSize: 12, color: accent }}>
          {value}
          {unit}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
        aria-valuenow={value}
        aria-valuemin={min}
        aria-valuemax={max}
        className="onc-slider mt-1.5"
        style={{ color: accent }}
      />
      {help ? (
        <div className="onc-sans mt-1" style={{ fontSize: 10.5, color: DIM, lineHeight: 1.4 }}>
          {help}
        </div>
      ) : null}
    </div>
  );
}

/* ---- Main simulator --------------------------------------------------- */
export function Simulator() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<TabKey>("kinetics");
  const [saving, setSaving] = useState<boolean>(false);

  /* ----- Tab 1 state: degrader kinetics ----- */
  const [halfLife, setHalfLife] = useState<number>(18); // hours
  const [ligase, setLigase] = useState<LigaseKind>("CRBN");
  const [dose, setDose] = useState<number>(70); // % target engagement
  const [mhcStatus, setMhcStatus] = useState<MhcStatus>("intact");

  const ligaseFactor: number =
    ligase === "CRBN" ? 1.0 : ligase === "VHL" ? 0.8 : 0.65;
  const mhcFactor: number =
    mhcStatus === "intact" ? 1.0 : mhcStatus === "partial" ? 0.5 : 0.05;

  const kineticsData = useMemo<KineticsRow[]>(() => {
    const days = [0, 0.5, 1, 2, 3, 4, 5, 6, 7];
    const k = Math.log(2) / (halfLife / 24); // per day
    return days.map((d) => {
      const engagement = dose / 100;
      const degraderLevel = 100 * Math.exp(-k * d * ligaseFactor * engagement);
      const inhibitorLevel = 100;
      const inhibitorActivity =
        100 * Math.max(0, 1 - engagement * Math.min(1, d / 0.5));
      const degraderActivity = degraderLevel;
      return {
        day: d,
        "Degrader — protein level": Number(degraderLevel.toFixed(1)),
        "Inhibitor — protein level": inhibitorLevel,
        "Degrader — pathway activity": Number(degraderActivity.toFixed(1)),
        "Inhibitor — pathway activity": Number(inhibitorActivity.toFixed(1)),
      };
    });
  }, [halfLife, dose, ligaseFactor]);

  const day3 = kineticsData.find((r) => r.day === 3);
  const day3Level = day3 ? day3["Degrader — protein level"] : 100;
  const clearedFraction = (100 - day3Level) / 100;
  const clearedFractionPct = Math.round(clearedFraction * 100);
  const neoepitopeScore = Math.round(clearedFraction * 100 * mhcFactor);
  const primingIndex = Math.round(
    neoepitopeScore * (0.6 + 0.4 * (dose / 100)),
  );

  /* ----- Tab 2 state: organotropic delivery ----- */
  const [lungAddr, setLungAddr] = useState<number>(60); // α6β4 / α6β1
  const [liverAddr, setLiverAddr] = useState<number>(30); // αvβ5
  const [coTarget, setCoTarget] = useState<boolean>(true); // TFRC / FABP4
  const [particleType, setParticleType] = useState<ParticleType>("targeted");

  const homingData = useMemo<HomingRow[]>(() => {
    const boost = coTarget ? 1.35 : 1.0;
    const baseSystemic = particleType === "untargeted" ? 100 : 20;
    const lung = particleType === "untargeted" ? 0 : lungAddr * boost * 0.9;
    const liver = particleType === "untargeted" ? 0 : liverAddr * boost * 0.9;
    const omentum =
      particleType === "untargeted" ? 0 : coTarget ? 18 : 6;
    const rawOff = Math.max(5, baseSystemic - (lung + liver + omentum) * 0.4);
    const total = lung + liver + omentum + rawOff;
    const norm = (v: number) => Number(((v / total) * 100).toFixed(1));
    return [
      { organ: "Lung", value: norm(lung), fill: TEAL },
      { organ: "Liver", value: norm(liver), fill: AMBER },
      { organ: "Omentum", value: norm(omentum), fill: VIOLET },
      { organ: "Off-target / clearance", value: norm(rawOff), fill: CORAL },
    ];
  }, [lungAddr, liverAddr, coTarget, particleType]);

  const onTargetTotal = Number(
    (homingData[0].value + homingData[1].value + homingData[2].value).toFixed(1),
  );
  const offTargetTotal = homingData[3].value;
  const dualAddressBoostPct = coTarget ? 35 : 0;

  /* ----- Save run -> POST /api/simulations ----- */
  async function handleSave(): Promise<void> {
    setSaving(true);
    try {
      const isKinetics = activeTab === "kinetics";
      const kind: SaveableKind = isKinetics ? "kinetics" : "delivery";
      const payload = isKinetics
        ? {
            kind,
            params: { halfLife, ligase, dose, mhcStatus },
            results: {
              clearedFractionPct,
              neoepitopeScore,
              primingIndex,
              ligaseFactor,
              mhcFactor,
              series: kineticsData,
            },
            assetCode: "KRAS-PROTAC-neoepitope",
          }
        : {
            kind,
            params: { lungAddr, liverAddr, coTarget, particleType },
            results: {
              onTargetPct: onTargetTotal,
              offTargetPct: offTargetTotal,
              dualAddressBoostPct,
              distribution: homingData,
            },
            assetCode: "KRAS-PROTAC-neoepitope",
          };

      const res = await fetch("/api/simulations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errBody = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(errBody.error || `HTTP ${res.status}`);
      }
      toast({
        title: "Simulation saved",
        description: `${
          isKinetics ? "Degrader kinetics" : "Organotropic delivery"
        } run persisted to the lab log.`,
      });
    } catch (e) {
      toast({
        title: "Could not save run",
        description: (e as Error).message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section
      id="simulator"
      className="onc-dark onc-sans rounded-lg"
      style={{ background: BG, color: INK, padding: "22px 20px 40px" }}
    >
      {/* Section header */}
      <div className="flex justify-between items-end flex-wrap gap-2.5 mb-[18px]">
        <div>
          <div
            className="onc-mono"
            style={{ fontSize: 10.5, color: TEAL, letterSpacing: "0.12em" }}
          >
            SIMULATION SET · PRECISION TARGETING LAB
          </div>
          <h3
            className="onc-sans mt-1"
            style={{ fontSize: 20, fontWeight: 600, color: INK }}
          >
            Degrader immunogenicity &amp; organotropic delivery
          </h3>
        </div>
        <Button
          type="button"
          onClick={handleSave}
          disabled={saving}
          variant="outline"
          size="sm"
          className="onc-mono h-8 text-[11px] tracking-[0.04em] rounded-[3px]"
          aria-label="Save current simulation run to the lab log"
          style={{
            background: "transparent",
            color: TEAL,
            border: `1px solid ${TEAL}`,
          }}
        >
          {saving ? (
            <Loader2 className="animate-spin" aria-hidden />
          ) : (
            <Save aria-hidden />
          )}
          {saving ? "Saving…" : "Save run"}
        </Button>
      </div>

      {/* Amber disclaimer banner */}
      <div
        className="onc-sans mb-5 rounded-[4px] px-3 py-2"
        style={{
          background: "#1A1410",
          border: "1px solid #3A2A18",
          color: "#D9B27C",
          fontSize: 11,
          lineHeight: 1.5,
        }}
      >
        Illustrative parameter model for hypothesis generation, not a fitted or
        validated PK/PD model. Use it to build intuition about which variables
        matter and what a wet-lab dose-response curve should be checked against —
        see Experiments 1–5 in the companion protocol document.
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as TabKey)}
      >
        <TabsList className="bg-transparent h-auto p-0 gap-2 border-0 rounded-none">
          <TabsTrigger
            value="kinetics"
            className="onc-mono flex-none w-auto gap-2 h-auto px-3.5 py-2 text-[11px] tracking-[0.04em] rounded-[3px] text-[#E9E7DF] border border-[#262D34] data-[state=active]:!bg-[#4FD1C0] data-[state=active]:!text-[#0D1013] data-[state=active]:!border-[#4FD1C0] data-[state=active]:!shadow-none"
          >
            <Activity className="size-3.5" aria-hidden />
            <span className="opacity-60">01</span>
            Degrader kinetics
          </TabsTrigger>
          <TabsTrigger
            value="delivery"
            className="onc-mono flex-none w-auto gap-2 h-auto px-3.5 py-2 text-[11px] tracking-[0.04em] rounded-[3px] text-[#E9E7DF] border border-[#262D34] data-[state=active]:!bg-[#4FD1C0] data-[state=active]:!text-[#0D1013] data-[state=active]:!border-[#4FD1C0] data-[state=active]:!shadow-none"
          >
            <Target className="size-3.5" aria-hidden />
            <span className="opacity-60">02</span>
            Organotropic delivery
          </TabsTrigger>
        </TabsList>

        {/* ===== Tab 1: Degrader kinetics ===== */}
        <TabsContent value="kinetics" className="mt-5">
          <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-5">
            <Card
              className="onc-sans"
              style={{
                background: PANEL,
                border: `1px solid ${BORDER}`,
                borderRadius: 6,
                padding: 18,
                gap: 0,
                boxShadow: "none",
              }}
            >
              <div
                className="onc-mono mb-3.5"
                style={{ fontSize: 11, color: DIM, letterSpacing: "0.06em" }}
              >
                PARAMETERS
              </div>

              <SimulatorSlider
                label="Target engagement (dose)"
                value={dose}
                onChange={setDose}
                unit="%"
                accent={TEAL}
                help={<>Relative fraction of <GTerm term="PROTAC">target protein</GTerm> bound/engaged at steady dosing.</>}
              />
              <SimulatorSlider
                label="Degradation half-life"
                value={halfLife}
                onChange={setHalfLife}
                min={2}
                max={72}
                unit="h"
                accent={TEAL}
                help={<>Time to clear 50% of target protein — the <GTerm>DC50</GTerm> inverse — once the degrader engages it.</>}
              />

              <div style={{ marginBottom: 18 }}>
                <label
                  className="onc-sans block mb-1.5"
                  style={{ fontSize: 12, color: INK }}
                >
                  E3 ligase recruited
                </label>
                <SegmentedToggle<LigaseKind>
                  ariaLabel="E3 ligase recruited"
                  options={[
                    { value: "CRBN", label: "CRBN" },
                    { value: "VHL", label: "VHL" },
                    { value: "Novel", label: "Novel" },
                  ]}
                  value={ligase}
                  onChange={setLigase}
                  accent={TEAL}
                />
                <div
                  className="onc-sans mt-1.5"
                  style={{ fontSize: 10.5, color: DIM, lineHeight: 1.4 }}
                >
                  CRBN is broadly expressed; VHL is hypoxia-sensitive; novel
                  ligases (KEAP1/DCAF16) are less validated clinically. See
                  Experiment 1.
                </div>
              </div>

              <div>
                <label
                  className="onc-sans block mb-1.5"
                  style={{ fontSize: 12, color: INK }}
                >
                  Tumor MHC-I status
                </label>
                <SegmentedToggle<MhcStatus>
                  ariaLabel="Tumor MHC-I status"
                  options={[
                    { value: "intact", label: "Intact" },
                    { value: "partial", label: "Partial loss" },
                    { value: "lost", label: "Lost" },
                  ]}
                  value={mhcStatus}
                  onChange={setMhcStatus}
                  accent={AMBER}
                />
                <div
                  className="onc-sans mt-1.5"
                  style={{ fontSize: 10.5, color: DIM, lineHeight: 1.4 }}
                >
                  ~17% of tumors show <GTerm>MHC-I</GTerm> heterozygosity loss —
                  presentation-based priming has little effect on these
                  regardless of degradation rate.
                </div>
              </div>
            </Card>

            <div>
              <div className="flex gap-3.5 mb-4 flex-wrap">
                <Readout
                  label="Protein cleared, day 3"
                  value={clearedFractionPct}
                  unit="%"
                  color={TEAL}
                />
                <Readout
                  label="Neoepitope score"
                  value={neoepitopeScore}
                  unit="/ 100"
                  color={AMBER}
                />
                <Readout
                  label="Immune priming index"
                  value={primingIndex}
                  unit="/ 100"
                  color={VIOLET}
                />
              </div>

              <Card
                className="onc-sans"
                style={{
                  background: PANEL,
                  border: `1px solid ${BORDER}`,
                  borderRadius: 6,
                  padding: "16px 10px 6px",
                  gap: 0,
                  boxShadow: "none",
                }}
              >
                <div
                  className="onc-mono mb-2 pl-2"
                  style={{ fontSize: 11, color: DIM }}
                >
                  TARGET PROTEIN LEVEL, DEGRADER VS. INHIBITOR (7-DAY)
                </div>
                <ResponsiveContainer width="100%" height={230}>
                  <LineChart
                    data={kineticsData}
                    margin={{ top: 4, right: 18, left: -14, bottom: 0 }}
                  >
                    <CartesianGrid stroke={BORDER} strokeDasharray="3 3" />
                    <XAxis
                      dataKey="day"
                      stroke={DIM}
                      tick={AXIS_TICK}
                      label={{
                        value: "days",
                        position: "insideBottomRight",
                        offset: -2,
                        fill: DIM,
                        fontSize: 10,
                      }}
                    />
                    <YAxis stroke={DIM} tick={AXIS_TICK} domain={[0, 100]} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Legend wrapperStyle={LEGEND_STYLE} />
                    <Line
                      type="monotone"
                      dataKey="Degrader — protein level"
                      stroke={TEAL}
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="Inhibitor — protein level"
                      stroke={DIM}
                      strokeWidth={1.5}
                      strokeDasharray="4 3"
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="Degrader — pathway activity"
                      stroke={AMBER}
                      strokeWidth={1.5}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="Inhibitor — pathway activity"
                      stroke={CORAL}
                      strokeWidth={1.5}
                      strokeDasharray="4 3"
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Card>
              <div
                className="onc-sans mt-2.5"
                style={{ fontSize: 11, color: DIM, lineHeight: 1.5 }}
              >
                An inhibitor blocks activity while leaving the protein present
                (flat protein-level line); a degrader removes the protein
                itself, which is the step hypothesized to drive MHC-I peptide
                presentation (Experiment 2). The neoepitope score above scales
                with cleared fraction and ligase efficiency; the priming index
                further discounts for tumor MHC-I status.
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ===== Tab 2: Organotropic delivery ===== */}
        <TabsContent value="delivery" className="mt-5">
          <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-5">
            <Card
              className="onc-sans"
              style={{
                background: PANEL,
                border: `1px solid ${BORDER}`,
                borderRadius: 6,
                padding: 18,
                gap: 0,
                boxShadow: "none",
              }}
            >
              <div
                className="onc-mono mb-3.5"
                style={{ fontSize: 11, color: DIM, letterSpacing: "0.06em" }}
              >
                PARAMETERS
              </div>

              <div style={{ marginBottom: 18 }}>
                <label
                  className="onc-sans block mb-1.5"
                  style={{ fontSize: 12, color: INK }}
                >
                  Particle design
                </label>
                <SegmentedToggle<ParticleType>
                  ariaLabel="Particle design"
                  options={[
                    { value: "targeted", label: "targeted" },
                    { value: "untargeted", label: "untargeted" },
                  ]}
                  value={particleType}
                  onChange={setParticleType}
                  accent={TEAL}
                />
              </div>

              <SimulatorSlider
                label="Lung address strength (α6β4 / α6β1)"
                value={lungAddr}
                onChange={setLungAddr}
                accent={TEAL}
                help="Integrin ligand density steering the particle toward lung fibroblasts/epithelium."
              />
              <SimulatorSlider
                label="Liver address strength (αvβ5)"
                value={liverAddr}
                onChange={setLiverAddr}
                accent={AMBER}
                help="Integrin ligand density steering the particle toward Kupffer cells."
              />

              <div className="flex items-center gap-2 mt-1.5">
                <Switch
                  id="sim-co-target"
                  checked={coTarget}
                  onCheckedChange={setCoTarget}
                  className="data-[state=checked]:bg-[#9E8CF2]"
                  aria-label="Toggle dual-address (TFRC / FABP4) co-targeting"
                />
                <label
                  htmlFor="sim-co-target"
                  className="onc-sans"
                  style={{ fontSize: 12, color: INK }}
                >
                  Dual-address (add TFRC / FABP4-endothelial ligand)
                </label>
              </div>
              <div
                className="onc-sans mt-1.5"
                style={{ fontSize: 10.5, color: DIM, lineHeight: 1.4 }}
              >
                Layers a receptor-specific ligand on top of the integrin tissue
                code — the &quot;combined address system&quot; tested in
                Experiment 4.
              </div>
            </Card>

            <div>
              <div className="flex gap-3.5 mb-4 flex-wrap">
                <Readout
                  label="On-target delivery"
                  value={onTargetTotal}
                  unit="%"
                  color={TEAL}
                />
                <Readout
                  label="Off-target / clearance"
                  value={offTargetTotal}
                  unit="%"
                  color={CORAL}
                />
                <Readout
                  label="Dual-address boost"
                  value={`+${dualAddressBoostPct}`}
                  unit="%"
                  color={VIOLET}
                />
              </div>

              <Card
                className="onc-sans"
                style={{
                  background: PANEL,
                  border: `1px solid ${BORDER}`,
                  borderRadius: 6,
                  padding: "16px 10px 6px",
                  gap: 0,
                  boxShadow: "none",
                }}
              >
                <div
                  className="onc-mono mb-2 pl-2"
                  style={{ fontSize: 11, color: DIM }}
                >
                  PREDICTED BIODISTRIBUTION BY ORGAN
                </div>
                <ResponsiveContainer width="100%" height={230}>
                  <BarChart
                    data={homingData}
                    margin={{ top: 4, right: 18, left: -14, bottom: 0 }}
                  >
                    <CartesianGrid
                      stroke={BORDER}
                      strokeDasharray="3 3"
                      vertical={false}
                    />
                    <XAxis dataKey="organ" stroke={DIM} tick={AXIS_TICK_LG} />
                    <YAxis stroke={DIM} tick={AXIS_TICK} domain={[0, 100]} />
                    <Tooltip
                      contentStyle={TOOLTIP_STYLE}
                      cursor={{ fill: "#1A212855" }}
                    />
                    <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                      {homingData.map((d, i) => (
                        <Cell key={`cell-${i}`} fill={d.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Card>
              <div
                className="onc-sans mt-2.5"
                style={{ fontSize: 11, color: DIM, lineHeight: 1.5 }}
              >
                Untargeted particles distribute mostly to systemic clearance
                organs (liver/spleen by default reticuloendothelial uptake,
                modeled here as &quot;off-target&quot;). Dual-addressing is
                modeled as a multiplicative boost on top of single-integrin
                targeting — the biodistribution study in Experiment 4 is what
                would confirm whether that boost is real in vivo.
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </section>
  );
}

export default Simulator;
