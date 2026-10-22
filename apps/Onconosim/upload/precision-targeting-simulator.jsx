import { useState, useMemo } from "react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Cell
} from "recharts";

const ink = "#E9E7DF";
const dim = "#8B9299";
const panel = "#161B20";
const panelBorder = "#262D34";
const bg = "#0D1013";
const teal = "#4FD1C0";
const amber = "#E8A94D";
const coral = "#E8664F";
const violet = "#9E8CF2";

const mono = "'IBM Plex Mono', 'JetBrains Mono', ui-monospace, monospace";
const sans = "'IBM Plex Sans', 'Inter', system-ui, sans-serif";

function Readout({ label, value, unit, color }) {
  return (
    <div style={{
      background: bg, border: `1px solid ${panelBorder}`, borderRadius: 4,
      padding: "10px 14px", minWidth: 140
    }}>
      <div style={{ fontFamily: sans, fontSize: 10, letterSpacing: "0.08em", color: dim, textTransform: "uppercase" }}>
        {label}
      </div>
      <div style={{ fontFamily: mono, fontSize: 24, color: color || ink, marginTop: 2 }}>
        {value}<span style={{ fontSize: 12, color: dim, marginLeft: 4 }}>{unit}</span>
      </div>
    </div>
  );
}

function Slider({ label, value, onChange, min = 0, max = 100, step = 1, unit = "", color = teal, help }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <label style={{ fontFamily: sans, fontSize: 12, color: ink }}>{label}</label>
        <span style={{ fontFamily: mono, fontSize: 12, color }}>{value}{unit}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: "100%", accentColor: color, marginTop: 4 }}
      />
      {help && <div style={{ fontFamily: sans, fontSize: 10.5, color: dim, marginTop: 3, lineHeight: 1.4 }}>{help}</div>}
    </div>
  );
}

function TabButton({ active, onClick, children, n }) {
  return (
    <button onClick={onClick} style={{
      fontFamily: mono, fontSize: 11, letterSpacing: "0.04em",
      color: active ? bg : ink,
      background: active ? teal : "transparent",
      border: `1px solid ${active ? teal : panelBorder}`,
      borderRadius: 3, padding: "8px 14px", cursor: "pointer",
      display: "flex", alignItems: "center", gap: 8
    }}>
      <span style={{ opacity: 0.6 }}>{n}</span>{children}
    </button>
  );
}

export default function App() {
  const [tab, setTab] = useState(1);

  // --- Tab 1 state: degrader kinetics ---
  const [halfLife, setHalfLife] = useState(18); // hours
  const [ligase, setLigase] = useState("CRBN");
  const [dose, setDose] = useState(70); // relative target engagement %
  const [mhcStatus, setMhcStatus] = useState("intact"); // intact / partial / lost

  const ligaseFactor = ligase === "CRBN" ? 1.0 : ligase === "VHL" ? 0.8 : 0.65; // illustrative only
  const mhcFactor = mhcStatus === "intact" ? 1.0 : mhcStatus === "partial" ? 0.5 : 0.05;

  const kineticsData = useMemo(() => {
    const days = [0, 0.5, 1, 2, 3, 4, 5, 6, 7];
    const k = Math.log(2) / (halfLife / 24); // per day
    return days.map((d) => {
      const engagement = dose / 100;
      const degraderLevel = 100 * Math.exp(-k * d * ligaseFactor * engagement) ;
      const inhibitorLevel = 100; // protein stays present, only activity blocked
      const inhibitorActivity = 100 * Math.max(0, 1 - engagement * Math.min(1, d / 0.5));
      const degraderActivity = degraderLevel; // activity tracks protein level once degraded
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
  const clearedFraction = (100 - day3["Degrader — protein level"]) / 100;
  const neoepitopeScore = Math.round(clearedFraction * 100 * mhcFactor);
  const primingIndex = Math.round(neoepitopeScore * (0.6 + 0.4 * (dose / 100)));

  // --- Tab 2 state: organotropic delivery ---
  const [lungAddr, setLungAddr] = useState(60); // α6β4 / α6β1
  const [liverAddr, setLiverAddr] = useState(30); // αvβ5
  const [coTarget, setCoTarget] = useState(true); // TFRC / FABP4 co-address boost
  const [particleType, setParticleType] = useState("targeted");

  const homingData = useMemo(() => {
    const boost = coTarget ? 1.35 : 1.0;
    const baseSystemic = particleType === "untargeted" ? 100 : 20;
    let lung = particleType === "untargeted" ? 0 : lungAddr * boost * 0.9;
    let liver = particleType === "untargeted" ? 0 : liverAddr * boost * 0.9;
    let omentum = particleType === "untargeted" ? 0 : (coTarget ? 18 : 6);
    const rawOff = Math.max(5, baseSystemic - (lung + liver + omentum) * 0.4);
    const total = lung + liver + omentum + rawOff;
    const norm = (v) => Number(((v / total) * 100).toFixed(1));
    return [
      { organ: "Lung", value: norm(lung), fill: teal },
      { organ: "Liver", value: norm(liver), fill: amber },
      { organ: "Omentum", value: norm(omentum), fill: violet },
      { organ: "Off-target / clearance", value: norm(rawOff), fill: coral },
    ];
  }, [lungAddr, liverAddr, coTarget, particleType]);

  const onTargetTotal = (homingData[0].value + homingData[1].value + homingData[2].value).toFixed(1);

  return (
    <div style={{
      background: bg, color: ink, fontFamily: sans, minHeight: "100%",
      padding: "22px 20px 40px", borderRadius: 8
    }}>
      <style>{`
        input[type=range]{ -webkit-appearance:none; height:3px; background:${panelBorder}; border-radius:2px; }
        input[type=range]::-webkit-slider-thumb{ -webkit-appearance:none; width:13px; height:13px; border-radius:50%; background:currentColor; cursor:pointer; border:2px solid ${bg}; }
        select, button { font-family: inherit; }
      `}</style>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 18, flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ fontFamily: mono, fontSize: 10.5, color: teal, letterSpacing: "0.12em" }}>SIMULATION SET · PRECISION TARGETING LAB</div>
          <div style={{ fontFamily: sans, fontSize: 20, fontWeight: 600, marginTop: 4 }}>Degrader immunogenicity &amp; organotropic delivery</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <TabButton n="01" active={tab === 1} onClick={() => setTab(1)}>Degrader kinetics</TabButton>
          <TabButton n="02" active={tab === 2} onClick={() => setTab(2)}>Organotropic delivery</TabButton>
        </div>
      </div>

      <div style={{
        background: "#1A1410", border: `1px solid #3A2A18`, borderRadius: 4,
        padding: "9px 12px", fontFamily: sans, fontSize: 11, color: "#D9B27C", marginBottom: 20, lineHeight: 1.5
      }}>
        Illustrative parameter model for hypothesis generation, not a fitted or validated PK/PD model. Use it to build
        intuition about which variables matter and what a wet-lab dose-response curve should be checked against —
        see Experiments 1–5 in the companion protocol document.
      </div>

      {tab === 1 && (
        <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 22 }}>
          <div style={{ background: panel, border: `1px solid ${panelBorder}`, borderRadius: 6, padding: 18 }}>
            <div style={{ fontFamily: mono, fontSize: 11, color: dim, marginBottom: 14, letterSpacing: "0.06em" }}>PARAMETERS</div>

            <Slider label="Target engagement (dose)" value={dose} onChange={setDose} unit="%" color={teal}
              help="Relative fraction of target protein bound/engaged at steady dosing." />
            <Slider label="Degradation half-life" value={halfLife} onChange={setHalfLife} min={2} max={72} unit="h" color={teal}
              help="Time to clear 50% of target protein once degrader engages it." />

            <div style={{ marginBottom: 18 }}>
              <label style={{ fontFamily: sans, fontSize: 12, color: ink, display: "block", marginBottom: 6 }}>E3 ligase recruited</label>
              <div style={{ display: "flex", gap: 6 }}>
                {["CRBN", "VHL", "Novel"].map((l) => (
                  <button key={l} onClick={() => setLigase(l)} style={{
                    flex: 1, padding: "6px 0", fontFamily: mono, fontSize: 11,
                    background: ligase === l ? teal : "transparent",
                    color: ligase === l ? bg : dim,
                    border: `1px solid ${ligase === l ? teal : panelBorder}`,
                    borderRadius: 3, cursor: "pointer"
                  }}>{l}</button>
                ))}
              </div>
              <div style={{ fontFamily: sans, fontSize: 10.5, color: dim, marginTop: 5, lineHeight: 1.4 }}>
                CRBN is broadly expressed; VHL is hypoxia-sensitive; novel ligases (KEAP1/DCAF16) are less validated clinically. See Experiment 1.
              </div>
            </div>

            <div>
              <label style={{ fontFamily: sans, fontSize: 12, color: ink, display: "block", marginBottom: 6 }}>Tumor MHC-I status</label>
              <div style={{ display: "flex", gap: 6 }}>
                {[["intact", "Intact"], ["partial", "Partial loss"], ["lost", "Lost"]].map(([k, l]) => (
                  <button key={k} onClick={() => setMhcStatus(k)} style={{
                    flex: 1, padding: "6px 4px", fontFamily: mono, fontSize: 10.5,
                    background: mhcStatus === k ? amber : "transparent",
                    color: mhcStatus === k ? bg : dim,
                    border: `1px solid ${mhcStatus === k ? amber : panelBorder}`,
                    borderRadius: 3, cursor: "pointer"
                  }}>{l}</button>
                ))}
              </div>
              <div style={{ fontFamily: sans, fontSize: 10.5, color: dim, marginTop: 5, lineHeight: 1.4 }}>
                ~17% of tumors show MHC-I heterozygosity loss — presentation-based priming has little effect on these regardless of degradation rate.
              </div>
            </div>
          </div>

          <div>
            <div style={{ display: "flex", gap: 14, marginBottom: 16, flexWrap: "wrap" }}>
              <Readout label="Protein cleared, day 3" value={Math.round(clearedFraction * 100)} unit="%" color={teal} />
              <Readout label="Neoepitope score" value={neoepitopeScore} unit="/ 100" color={amber} />
              <Readout label="Immune priming index" value={primingIndex} unit="/ 100" color={violet} />
            </div>

            <div style={{ background: panel, border: `1px solid ${panelBorder}`, borderRadius: 6, padding: "16px 10px 6px" }}>
              <div style={{ fontFamily: mono, fontSize: 11, color: dim, marginBottom: 8, paddingLeft: 8 }}>TARGET PROTEIN LEVEL, DEGRADER VS. INHIBITOR (7-DAY)</div>
              <ResponsiveContainer width="100%" height={230}>
                <LineChart data={kineticsData} margin={{ top: 4, right: 18, left: -14, bottom: 0 }}>
                  <CartesianGrid stroke={panelBorder} strokeDasharray="3 3" />
                  <XAxis dataKey="day" stroke={dim} tick={{ fill: dim, fontSize: 10, fontFamily: mono }} label={{ value: "days", position: "insideBottomRight", offset: -2, fill: dim, fontSize: 10 }} />
                  <YAxis stroke={dim} tick={{ fill: dim, fontSize: 10, fontFamily: mono }} domain={[0, 100]} />
                  <Tooltip contentStyle={{ background: bg, border: `1px solid ${panelBorder}`, fontFamily: mono, fontSize: 11 }} />
                  <Legend wrapperStyle={{ fontFamily: sans, fontSize: 11 }} />
                  <Line type="monotone" dataKey="Degrader — protein level" stroke={teal} strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="Inhibitor — protein level" stroke={dim} strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
                  <Line type="monotone" dataKey="Degrader — pathway activity" stroke={amber} strokeWidth={1.5} dot={false} />
                  <Line type="monotone" dataKey="Inhibitor — pathway activity" stroke={coral} strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div style={{ fontFamily: sans, fontSize: 11, color: dim, marginTop: 10, lineHeight: 1.5 }}>
              An inhibitor blocks activity while leaving the protein present (flat protein-level line); a degrader removes the protein
              itself, which is the step hypothesized to drive MHC-I peptide presentation (Experiment 2). The neoepitope score above
              scales with cleared fraction and ligase efficiency; the priming index further discounts for tumor MHC-I status.
            </div>
          </div>
        </div>
      )}

      {tab === 2 && (
        <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 22 }}>
          <div style={{ background: panel, border: `1px solid ${panelBorder}`, borderRadius: 6, padding: 18 }}>
            <div style={{ fontFamily: mono, fontSize: 11, color: dim, marginBottom: 14, letterSpacing: "0.06em" }}>PARAMETERS</div>

            <div style={{ marginBottom: 18 }}>
              <label style={{ fontFamily: sans, fontSize: 12, color: ink, display: "block", marginBottom: 6 }}>Particle design</label>
              <div style={{ display: "flex", gap: 6 }}>
                {["targeted", "untargeted"].map((p) => (
                  <button key={p} onClick={() => setParticleType(p)} style={{
                    flex: 1, padding: "6px 0", fontFamily: mono, fontSize: 11, textTransform: "capitalize",
                    background: particleType === p ? teal : "transparent",
                    color: particleType === p ? bg : dim,
                    border: `1px solid ${particleType === p ? teal : panelBorder}`,
                    borderRadius: 3, cursor: "pointer"
                  }}>{p}</button>
                ))}
              </div>
            </div>

            <Slider label="Lung address strength (α6β4 / α6β1)" value={lungAddr} onChange={setLungAddr} color={teal}
              help="Integrin ligand density steering the particle toward lung fibroblasts/epithelium." />
            <Slider label="Liver address strength (αvβ5)" value={liverAddr} onChange={setLiverAddr} color={amber}
              help="Integrin ligand density steering the particle toward Kupffer cells." />

            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
              <input type="checkbox" checked={coTarget} onChange={(e) => setCoTarget(e.target.checked)} style={{ accentColor: violet }} />
              <label style={{ fontFamily: sans, fontSize: 12, color: ink }}>Dual-address (add TFRC / FABP4-endothelial ligand)</label>
            </div>
            <div style={{ fontFamily: sans, fontSize: 10.5, color: dim, marginTop: 5, lineHeight: 1.4 }}>
              Layers a receptor-specific ligand on top of the integrin tissue code — the "combined address system" tested in Experiment 4.
            </div>
          </div>

          <div>
            <div style={{ display: "flex", gap: 14, marginBottom: 16, flexWrap: "wrap" }}>
              <Readout label="On-target delivery" value={onTargetTotal} unit="%" color={teal} />
              <Readout label="Off-target / clearance" value={homingData[3].value} unit="%" color={coral} />
            </div>

            <div style={{ background: panel, border: `1px solid ${panelBorder}`, borderRadius: 6, padding: "16px 10px 6px" }}>
              <div style={{ fontFamily: mono, fontSize: 11, color: dim, marginBottom: 8, paddingLeft: 8 }}>PREDICTED BIODISTRIBUTION BY ORGAN</div>
              <ResponsiveContainer width="100%" height={230}>
                <BarChart data={homingData} margin={{ top: 4, right: 18, left: -14, bottom: 0 }}>
                  <CartesianGrid stroke={panelBorder} strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="organ" stroke={dim} tick={{ fill: dim, fontSize: 10.5, fontFamily: mono }} />
                  <YAxis stroke={dim} tick={{ fill: dim, fontSize: 10, fontFamily: mono }} domain={[0, 100]} />
                  <Tooltip contentStyle={{ background: bg, border: `1px solid ${panelBorder}`, fontFamily: mono, fontSize: 11 }} />
                  <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                    {homingData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div style={{ fontFamily: sans, fontSize: 11, color: dim, marginTop: 10, lineHeight: 1.5 }}>
              Untargeted particles distribute mostly to systemic clearance organs (liver/spleen by default reticuloendothelial uptake,
              modeled here as "off-target"). Dual-addressing is modeled as a multiplicative boost on top of single-integrin targeting —
              the biodistribution study in Experiment 4 is what would confirm whether that boost is real in vivo.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
