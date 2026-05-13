import { useState, useEffect, useCallback, useMemo } from "react";

// ─── Utility helpers ──────────────────────────────────────────────────────────
const pad = (n) => String(Math.floor(n)).padStart(2, "0");
const fmtTime = (totalSec) => {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = Math.floor(totalSec % 60);
  return h > 0 ? `${h}h${pad(m)}m${pad(s)}s` : `${pad(m)}m${pad(s)}s`;
};
const paceToKmh = (paceStr) => {
  const parts = paceStr.split(":");
  if (parts.length !== 2) return null;
  const min = parseFloat(parts[0]);
  const sec = parseFloat(parts[1]);
  if (isNaN(min) || isNaN(sec)) return null;
  const totalMin = min + sec / 60;
  return 60 / totalMin;
};
const kmhToPace = (kmh) => {
  if (!kmh || kmh <= 0) return "--:--";
  const secPerKm = 3600 / kmh;
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}:${pad(s)}`;
};
const splitTime = (kmh, distKm) => {
  if (!kmh || kmh <= 0) return "--";
  const sec = (distKm / kmh) * 3600;
  return fmtTime(sec);
};

// ─── Local storage helpers ────────────────────────────────────────────────────
const LS_KEY = "hrpl_data";
const loadData = () => {
  try { return JSON.parse(localStorage.getItem(LS_KEY)) || {}; } catch { return {}; }
};
const saveData = (d) => { try { localStorage.setItem(LS_KEY, JSON.stringify(d)); } catch {} };

// ─── Default station times (seconds) for hybrid simulation ───────────────────
const DEFAULT_STATIONS = [
  { id: "skierg", name: "SkiErg", icon: "🎿", defaultTime: 270, dist: "1000m" },
  { id: "sledpush", name: "Sled Push", icon: "🏋️", defaultTime: 210, dist: "50m×8" },
  { id: "sledpull", name: "Sled Pull", icon: "💪", defaultTime: 210, dist: "50m×8" },
  { id: "burpee", name: "Burpee Broad Jumps", icon: "🏃", defaultTime: 240, dist: "80m" },
  { id: "rowing", name: "Rowing", icon: "🚣", defaultTime: 270, dist: "1000m" },
  { id: "farmer", name: "Farmer Carry", icon: "🧳", defaultTime: 180, dist: "200m" },
  { id: "sandbag", name: "Sandbag Lunges", icon: "⚡", defaultTime: 270, dist: "100m" },
  { id: "wallballs", name: "Wall Balls", icon: "🏀", defaultTime: 240, dist: "100 reps" },
];
const RUNNING_SEGMENTS = 8; // total km of running

// ─── Color palette ────────────────────────────────────────────────────────────
const C = {
  accent: "#00E5A0",
  accentDim: "#00b880",
  bg: "#0A0B0E",
  surface: "#111318",
  surface2: "#181C23",
  border: "#1F2330",
  text: "#F0F2F8",
  muted: "#6B7080",
  danger: "#FF5C6A",
  warning: "#FFB84D",
  info: "#4DA6FF",
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const S = {
  app: {
    minHeight: "100vh",
    background: C.bg,
    color: C.text,
    fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
    position: "relative",
  },
  nav: {
    background: C.surface,
    borderBottom: `1px solid ${C.border}`,
    padding: "0 1.5rem",
    display: "flex",
    alignItems: "center",
    height: 56,
    position: "sticky",
    top: 0,
    zIndex: 100,
    gap: "1.5rem",
  },
  logo: {
    fontWeight: 800,
    fontSize: 15,
    letterSpacing: "-0.02em",
    color: C.accent,
    marginRight: "auto",
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  navBtn: (active) => ({
    padding: "6px 14px",
    borderRadius: 8,
    border: "none",
    background: active ? `${C.accent}18` : "transparent",
    color: active ? C.accent : C.muted,
    fontSize: 13,
    fontWeight: active ? 600 : 400,
    cursor: "pointer",
    whiteSpace: "nowrap",
    transition: "all 0.18s",
    letterSpacing: "0.01em",
  }),
  page: {
    maxWidth: 1100,
    margin: "0 auto",
    padding: "2rem 1.5rem",
  },
  card: {
    background: C.surface,
    border: `1px solid ${C.border}`,
    borderRadius: 16,
    padding: "1.5rem",
    marginBottom: "1.25rem",
  },
  h1: {
    fontSize: 24,
    fontWeight: 800,
    letterSpacing: "-0.03em",
    marginBottom: 4,
    color: C.text,
  },
  h2: {
    fontSize: 17,
    fontWeight: 700,
    marginBottom: "1rem",
    color: C.text,
    letterSpacing: "-0.01em",
  },
  label: {
    fontSize: 12,
    fontWeight: 600,
    color: C.muted,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    marginBottom: 6,
    display: "block",
  },
  input: {
    width: "100%",
    background: C.surface2,
    border: `1px solid ${C.border}`,
    borderRadius: 10,
    padding: "10px 14px",
    color: C.text,
    fontSize: 15,
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color 0.18s",
  },
  btn: (variant = "primary") => ({
    padding: "10px 22px",
    borderRadius: 10,
    border: "none",
    background: variant === "primary" ? C.accent : C.surface2,
    color: variant === "primary" ? "#000" : C.text,
    fontWeight: 700,
    fontSize: 13,
    cursor: "pointer",
    letterSpacing: "0.02em",
    transition: "opacity 0.18s, transform 0.12s",
  }),
  metric: (color = C.accent) => ({
    background: C.surface2,
    borderRadius: 12,
    padding: "1rem 1.25rem",
    flex: 1,
    minWidth: 120,
    borderLeft: `3px solid ${color}`,
  }),
  metricVal: {
    fontSize: 26,
    fontWeight: 800,
    letterSpacing: "-0.04em",
    lineHeight: 1,
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: C.muted,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  },
  grid: (cols = 2) => ({
    display: "grid",
    gridTemplateColumns: `repeat(${cols}, 1fr)`,
    gap: "1rem",
  }),
  badge: (color = C.accent) => ({
    display: "inline-block",
    padding: "3px 10px",
    borderRadius: 20,
    background: `${color}22`,
    color: color,
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: "0.04em",
  }),
  row: {
    display: "flex",
    gap: "1rem",
    flexWrap: "wrap",
    alignItems: "flex-end",
  },
  divider: {
    borderTop: `1px solid ${C.border}`,
    margin: "1.25rem 0",
  },
  insightBox: {
    background: `${C.accent}10`,
    border: `1px solid ${C.accent}30`,
    borderRadius: 10,
    padding: "0.75rem 1rem",
    fontSize: 13,
    color: C.text,
    marginBottom: 8,
    display: "flex",
    gap: 8,
    alignItems: "flex-start",
  },
  footer: {
    textAlign: "center",
    padding: "2.5rem 1rem",
    color: C.muted,
    fontSize: 12,
    letterSpacing: "0.08em",
    borderTop: `1px solid ${C.border}`,
  },
};

// ─── Inline sparkline (SVG) ───────────────────────────────────────────────────
function Sparkline({ data, color = C.accent, height = 48, width = 160 }) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 8) - 4;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: "block" }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts.split(" ").at(-1).split(",")[0]} cy={pts.split(" ").at(-1).split(",")[1]} r="3" fill={color} />
    </svg>
  );
}

// ─── Bar chart ────────────────────────────────────────────────────────────────
function BarChart({ data, maxVal, colors, height = 140 }) {
  const mx = maxVal || Math.max(...data.map((d) => d.value), 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <span style={{ fontSize: 10, color: C.muted, fontWeight: 600 }}>{fmtTime(d.value)}</span>
          <div style={{
            width: "100%",
            height: Math.max(4, (d.value / mx) * (height - 32)),
            background: colors?.[i] || C.accent,
            borderRadius: "6px 6px 0 0",
            opacity: 0.85,
            transition: "height 0.5s cubic-bezier(.4,0,.2,1)",
          }} />
          <span style={{ fontSize: 9, color: C.muted, textAlign: "center", lineHeight: 1.2 }}>{d.label}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Donut chart (pure SVG) ───────────────────────────────────────────────────
function Donut({ segments, size = 120 }) {
  const total = segments.reduce((a, b) => a + b.value, 0) || 1;
  let offset = 0;
  const r = 44, cx = 60, cy = 60, circ = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox="0 0 120 120">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={C.border} strokeWidth="14" />
      {segments.map((seg, i) => {
        const pct = seg.value / total;
        const dash = pct * circ;
        const o = offset * circ - circ / 4;
        offset += pct;
        return (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none"
            stroke={seg.color} strokeWidth="14"
            strokeDasharray={`${dash} ${circ - dash}`}
            strokeDashoffset={-o}
            strokeLinecap="butt"
            style={{ transition: "stroke-dasharray 0.6s cubic-bezier(.4,0,.2,1)" }}
          />
        );
      })}
      <text x={cx} y={cy + 6} textAnchor="middle" fill={C.text} fontSize="13" fontWeight="700">
        {fmtTime(total)}
      </text>
    </svg>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────
function SectionHeader({ title, subtitle }) {
  return (
    <div style={{ marginBottom: "1.75rem" }}>
      <h1 style={S.h1}>{title}</h1>
      {subtitle && <p style={{ color: C.muted, fontSize: 14, margin: 0 }}>{subtitle}</p>}
    </div>
  );
}

// ─── 1. PACE CONVERTER ───────────────────────────────────────────────────────
function PaceConverter() {
  const [paceInput, setPaceInput] = useState("5:00");
  const [kmhInput, setKmhInput] = useState("");
  const [mode, setMode] = useState("pace"); // pace | speed

  const kmh = useMemo(() => {
    if (mode === "pace") return paceToKmh(paceInput);
    const v = parseFloat(kmhInput);
    return isNaN(v) ? null : v;
  }, [mode, paceInput, kmhInput]);

  const pace = kmh ? kmhToPace(kmh) : "--:--";

  const paceToMile = kmh ? kmhToPace(kmh / 1.60934) : "--:--";

  const splits = [
    { label: "400m", km: 0.4 },
    { label: "600m", km: 0.6 },
    { label: "800m", km: 0.8 },
    { label: "1 km", km: 1 },
    { label: "5 km", km: 5 },
    { label: "10 km", km: 10 },
    { label: "8 km (hybrid)", km: 8 },
  ];

  return (
    <div>
      <SectionHeader title="Convertisseur Allure & Vitesse"
        subtitle="Convertissez instantanément entre allure, vitesse et temps par distance" />
      <div style={{ ...S.grid(2), marginBottom: "1.25rem" }}>
        <div style={S.card}>
          <div style={{ display: "flex", gap: 8, marginBottom: "1rem" }}>
            {["pace", "speed"].map((m) => (
              <button key={m} onClick={() => setMode(m)} style={{
                ...S.navBtn(mode === m),
                borderRadius: 8, border: `1px solid ${C.border}`,
              }}>
                {m === "pace" ? "Allure (min/km)" : "Vitesse (km/h)"}
              </button>
            ))}
          </div>
          {mode === "pace" ? (
            <div>
              <label style={S.label}>Allure (ex: 5:30)</label>
              <input style={S.input} value={paceInput}
                onChange={(e) => setPaceInput(e.target.value)}
                placeholder="5:00" />
            </div>
          ) : (
            <div>
              <label style={S.label}>Vitesse (km/h)</label>
              <input style={S.input} type="number" value={kmhInput}
                onChange={(e) => setKmhInput(e.target.value)}
                placeholder="12" />
            </div>
          )}
          <div style={{ ...S.divider }} />
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <div style={S.metric(C.accent)}>
              <div style={{ ...S.metricVal, color: C.accent }}>{pace}</div>
              <div style={S.metricLabel}>min/km</div>
            </div>
            <div style={S.metric(C.info)}>
              <div style={{ ...S.metricVal, color: C.info }}>{kmh ? kmh.toFixed(2) : "--"}</div>
              <div style={S.metricLabel}>km/h</div>
            </div>
            <div style={S.metric(C.muted)}>
              <div style={{ ...S.metricVal, color: C.muted, fontSize: 20 }}>{paceToMile}</div>
              <div style={S.metricLabel}>min/mile</div>
            </div>
          </div>
        </div>

        <div style={S.card}>
          <h2 style={S.h2}>Temps au split</h2>
          {splits.map((s) => (
            <div key={s.label} style={{
              display: "flex", justifyContent: "space-between",
              padding: "8px 0", borderBottom: `1px solid ${C.border}`,
              fontSize: 14,
            }}>
              <span style={{ color: C.muted, fontWeight: 500 }}>{s.label}</span>
              <span style={{
                fontWeight: 700, color: s.label === "8 km (hybrid)" ? C.accent : C.text,
                fontFamily: "monospace",
              }}>
                {splitTime(kmh, s.km)}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div style={S.card}>
        <h2 style={S.h2}>Zones d'allure recommandées</h2>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          {[
            { zone: "Z1 – Récupération", mult: 1.35, color: "#4DA6FF" },
            { zone: "Z2 – Endurance", mult: 1.18, color: "#00E5A0" },
            { zone: "Z3 – Tempo", mult: 1.06, color: "#FFB84D" },
            { zone: "Z4 – Seuil", mult: 0.97, color: "#FF7A40" },
            { zone: "Z5 – VO2max", mult: 0.90, color: "#FF5C6A" },
          ].map((z) => (
            <div key={z.zone} style={{
              ...S.metric(z.color), minWidth: 140, flex: "1 1 140px",
            }}>
              <div style={{ ...S.metricVal, fontSize: 18, color: z.color }}>
                {kmh ? kmhToPace(kmh * (1 / z.mult)) : "--:--"}
              </div>
              <div style={S.metricLabel}>{z.zone}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── 2. HYBRID RACE SIMULATOR ─────────────────────────────────────────────────
function RaceSimulator({ onSave }) {
  const [pace, setPace] = useState("5:30");
  const [stations, setStations] = useState(
    DEFAULT_STATIONS.map((s) => ({ ...s, time: s.defaultTime }))
  );
  const [transition, setTransition] = useState(15);
  const [fatigueMultiplier, setFatigueMultiplier] = useState(1.08);
  const [format, setFormat] = useState("solo");
  const [level, setLevel] = useState("rx");

  const kmh = paceToKmh(pace) || 10.9;

  const runTimePerKm = 3600 / kmh;
  const runTotalTime = runTimePerKm * RUNNING_SEGMENTS * fatigueMultiplier;
  const stationTotal = stations.reduce((a, s) => a + s.time * fatigueMultiplier, 0);
  const transitionTotal = transition * 8;
  const totalTime = runTotalTime + stationTotal + transitionTotal;

  const stationColors = [
    "#4DA6FF", "#00E5A0", "#FFB84D", "#FF5C6A",
    "#C084FC", "#F472B6", "#34D399", "#FBBF24",
  ];

  const donutSegs = [
    { label: "Course", value: runTotalTime, color: C.accent },
    { label: "Stations", value: stationTotal, color: C.info },
    { label: "Transitions", value: transitionTotal, color: C.warning },
  ];

  const barData = stations.map((s, i) => ({
    label: s.name.split(" ")[0],
    value: s.time * fatigueMultiplier,
  }));

  const updateStation = (id, val) =>
    setStations((prev) => prev.map((s) => s.id === id ? { ...s, time: parseInt(val) || 0 } : s));

  // insights
  const insights = useMemo(() => {
    const worst = [...stations].sort((a, b) => b.time - a.time)[0];
    const runPct = (runTotalTime / totalTime * 100).toFixed(0);
    const transPct = (transitionTotal / totalTime * 100).toFixed(0);
    const res = [];
    res.push(`🏃 La course représente ${runPct}% du temps total (${fmtTime(runTotalTime)}).`);
    res.push(`⚡ Station la plus longue : ${worst.name} (${fmtTime(worst.time * fatigueMultiplier)}). C'est votre priorité d'amélioration.`);
    if (transitionTotal > 150) res.push(`⏱ Les transitions représentent ${transPct}% — réduire à 10s/transition vous ferait gagner ${fmtTime(transitionTotal - 10 * 8)}.`);
    if (fatigueMultiplier > 1.1) res.push(`💡 Votre indice de fatigue est élevé. Travaillez l'endurance spécifique hybride pour le réduire.`);
    return res;
  }, [stations, runTotalTime, totalTime, transitionTotal, fatigueMultiplier]);

  const handleSave = () => {
    onSave?.({ pace, totalTime, format, level, date: new Date().toISOString() });
  };

  return (
    <div>
      <SectionHeader title="Simulateur Course Hybride"
        subtitle="Simulez votre performance sur un format hybride de type endurance fonctionnelle" />

      <div style={{ ...S.card, marginBottom: "1rem" }}>
        <div style={S.row}>
          <div style={{ flex: 1, minWidth: 160 }}>
            <label style={S.label}>Format</label>
            <select style={{ ...S.input }} value={format} onChange={(e) => setFormat(e.target.value)}>
              <option value="solo">Solo</option>
              <option value="doubles">Doubles</option>
              <option value="relay">Relais</option>
            </select>
          </div>
          <div style={{ flex: 1, minWidth: 160 }}>
            <label style={S.label}>Niveau</label>
            <select style={{ ...S.input }} value={level} onChange={(e) => setLevel(e.target.value)}>
              <option value="rx">RX</option>
              <option value="scaled">Scaled</option>
              <option value="pro">Pro</option>
            </select>
          </div>
          <div style={{ flex: 1, minWidth: 160 }}>
            <label style={S.label}>Allure course (min/km)</label>
            <input style={S.input} value={pace} onChange={(e) => setPace(e.target.value)} placeholder="5:30" />
          </div>
          <div style={{ flex: 1, minWidth: 160 }}>
            <label style={S.label}>Transition (sec)</label>
            <input style={S.input} type="number" value={transition}
              onChange={(e) => setTransition(parseInt(e.target.value) || 0)} />
          </div>
          <div style={{ flex: 1, minWidth: 180 }}>
            <label style={S.label}>Multiplicateur fatigue: {fatigueMultiplier.toFixed(2)}×</label>
            <input type="range" min="1" max="1.3" step="0.01"
              value={fatigueMultiplier}
              onChange={(e) => setFatigueMultiplier(parseFloat(e.target.value))}
              style={{ width: "100%", accentColor: C.accent }} />
          </div>
        </div>
      </div>

      {/* Stations */}
      <div style={S.card}>
        <h2 style={S.h2}>Temps par station (secondes)</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "0.75rem" }}>
          {stations.map((s, i) => (
            <div key={s.id} style={{
              background: C.surface2, borderRadius: 10, padding: "0.75rem 1rem",
              borderLeft: `3px solid ${stationColors[i]}`,
              display: "flex", alignItems: "center", gap: 12,
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: C.muted, marginBottom: 4 }}>
                  {s.icon} {s.name}
                  <span style={{ ...S.badge(stationColors[i]), marginLeft: 6 }}>{s.dist}</span>
                </div>
                <input style={{ ...S.input, padding: "6px 10px", fontSize: 14 }}
                  type="number" value={s.time}
                  onChange={(e) => updateStation(s.id, e.target.value)} />
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: stationColors[i] }}>
                  {fmtTime(s.time * fatigueMultiplier)}
                </div>
                <div style={{ fontSize: 10, color: C.muted }}>avec fatigue</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Results */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        <div style={S.card}>
          <h2 style={S.h2}>Résultat estimé</h2>
          <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", flexWrap: "wrap" }}>
            <Donut segments={donutSegs} size={140} />
            <div style={{ flex: 1 }}>
              {donutSegs.map((seg, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${C.border}`, fontSize: 13 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 6, color: C.muted }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: seg.color, display: "inline-block" }} />
                    {seg.label}
                  </span>
                  <span style={{ fontWeight: 700, color: seg.color }}>{fmtTime(seg.value)}</span>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", fontSize: 15 }}>
                <span style={{ fontWeight: 700 }}>Total</span>
                <span style={{ fontWeight: 800, color: C.accent, fontFamily: "monospace", fontSize: 18 }}>{fmtTime(totalTime)}</span>
              </div>
            </div>
          </div>
          <button style={S.btn("primary")} onClick={handleSave}>
            💾 Sauvegarder ce résultat
          </button>
        </div>

        <div style={S.card}>
          <h2 style={S.h2}>Stations (avec fatigue)</h2>
          <BarChart data={barData} colors={stationColors} height={160} />
        </div>
      </div>

      {/* Insights */}
      <div style={S.card}>
        <h2 style={S.h2}>💡 Insights intelligents</h2>
        {insights.map((ins, i) => (
          <div key={i} style={S.insightBox}>{ins}</div>
        ))}
      </div>
    </div>
  );
}

// ─── 3. STRATEGY ANALYZER ────────────────────────────────────────────────────
function StrategyAnalyzer() {
  const [basePace, setBasePace] = useState("5:30");
  const [baseStation, setBaseStation] = useState(230);
  const [baseTransition, setBaseTransition] = useState(20);
  const [paceGain, setPaceGain] = useState(15);
  const [stationGain, setStationGain] = useState(10);
  const [transGain, setTransGain] = useState(50);

  const kmh = paceToKmh(basePace) || 10.9;
  const BASE_RUN = (3600 / kmh) * 8;
  const BASE_ST = baseStation * 8;
  const BASE_TR = baseTransition * 8;
  const baseTotal = BASE_RUN + BASE_ST + BASE_TR;

  const scenarios = [
    {
      label: "Améliorer l'allure",
      gain: (BASE_RUN - (BASE_RUN * (1 - paceGain / 100))),
      color: C.accent,
      icon: "🏃",
      desc: `−${paceGain}% temps course`,
    },
    {
      label: "Efficacité stations",
      gain: (BASE_ST * stationGain / 100),
      color: C.info,
      icon: "💪",
      desc: `−${stationGain}% stations`,
    },
    {
      label: "Réduire transitions",
      gain: (BASE_TR * transGain / 100),
      color: C.warning,
      icon: "⏱",
      desc: `−${transGain}% transitions`,
    },
  ];

  const maxGain = Math.max(...scenarios.map((s) => s.gain), 1);

  return (
    <div>
      <SectionHeader title="Analyseur de Stratégie"
        subtitle="Identifiez où vous pouvez gagner le plus de temps et comparez vos scénarios" />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        <div style={S.card}>
          <h2 style={S.h2}>Paramètres de base</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {[
              { label: "Allure course", val: basePace, set: setBasePace, type: "text", placeholder: "5:30" },
              { label: "Temps station moyen (sec)", val: baseStation, set: (v) => setBaseStation(parseInt(v) || 0), type: "number" },
              { label: "Temps transition moyen (sec)", val: baseTransition, set: (v) => setBaseTransition(parseInt(v) || 0), type: "number" },
            ].map((f) => (
              <div key={f.label}>
                <label style={S.label}>{f.label}</label>
                <input style={S.input} type={f.type} value={f.val}
                  onChange={(e) => f.set(e.target.value)} placeholder={f.placeholder} />
              </div>
            ))}
            <div style={{ ...S.metric(), marginTop: 8 }}>
              <div style={{ ...S.metricVal }}>{fmtTime(baseTotal)}</div>
              <div style={S.metricLabel}>Temps total de base</div>
            </div>
          </div>
        </div>

        <div style={S.card}>
          <h2 style={S.h2}>Hypothèses d'amélioration</h2>
          {[
            { label: `Gain allure (${paceGain}%)`, val: paceGain, set: setPaceGain, min: 1, max: 30 },
            { label: `Gain stations (${stationGain}%)`, val: stationGain, set: setStationGain, min: 1, max: 40 },
            { label: `Gain transitions (${transGain}%)`, val: transGain, set: setTransGain, min: 0, max: 100 },
          ].map((f) => (
            <div key={f.label} style={{ marginBottom: "1rem" }}>
              <label style={S.label}>{f.label}</label>
              <input type="range" min={f.min} max={f.max} step="1"
                value={f.val} onChange={(e) => f.set(parseInt(e.target.value))}
                style={{ width: "100%", accentColor: C.accent }} />
            </div>
          ))}
        </div>
      </div>

      <div style={S.card}>
        <h2 style={S.h2}>Impact comparatif</h2>
        {scenarios.map((s, i) => (
          <div key={i} style={{ marginBottom: "1.25rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>{s.icon} {s.label}</span>
              <div style={{ textAlign: "right" }}>
                <span style={{ ...S.badge(s.color) }}>−{fmtTime(s.gain)}</span>
                <span style={{ fontSize: 11, color: C.muted, marginLeft: 8 }}>{s.desc}</span>
              </div>
            </div>
            <div style={{ height: 8, background: C.border, borderRadius: 8, overflow: "hidden" }}>
              <div style={{
                height: "100%",
                width: `${(s.gain / maxGain) * 100}%`,
                background: s.color,
                borderRadius: 8,
                transition: "width 0.5s cubic-bezier(.4,0,.2,1)",
              }} />
            </div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>
              Nouveau total : {fmtTime(baseTotal - s.gain)} ({((s.gain / baseTotal) * 100).toFixed(1)}% de gain)
            </div>
          </div>
        ))}

        <div style={{ ...S.divider }} />
        <div style={S.insightBox}>
          💡 {scenarios.sort((a, b) => b.gain - a.gain)[0].label} vous apporte le gain le plus important.
          Priorisez cet axe dans votre entraînement.
        </div>
      </div>
    </div>
  );
}

// ─── 4. NUTRITION CALCULATOR ──────────────────────────────────────────────────
function NutritionCalc() {
  const [weight, setWeight] = useState(72);
  const [duration, setDuration] = useState(90);
  const [intensity, setIntensity] = useState("modere");
  const [temp, setTemp] = useState(20);

  const intMap = { leger: 0.7, modere: 1.0, intense: 1.3, max: 1.6 };
  const mult = intMap[intensity];

  const carbPerHour = Math.round(40 * mult + (weight - 70) * 0.3);
  const totalCarbs = Math.round(carbPerHour * (duration / 60));
  const hydration = Math.round((500 + (temp - 15) * 25) * mult * (duration / 60));
  const sodium = Math.round(600 * mult * (duration / 60));

  const timeline = [];
  for (let t = 0; t <= duration; t += 20) {
    timeline.push({
      time: t,
      carbs: t === 0 ? 0 : Math.round((carbPerHour / 3) * mult),
      water: Math.round(hydration / (duration / 20)),
    });
  }

  return (
    <div>
      <SectionHeader title="Calculateur Nutrition & Hydratation"
        subtitle="Optimisez votre stratégie nutritionnelle pour maximiser vos performances" />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        <div style={S.card}>
          <h2 style={S.h2}>Paramètres</h2>
          {[
            { label: `Poids corporel: ${weight} kg`, val: weight, set: setWeight, min: 40, max: 120, type: "range" },
            { label: `Durée estimée: ${duration} min`, val: duration, set: setDuration, min: 30, max: 240, type: "range" },
            { label: `Température: ${temp}°C`, val: temp, set: setTemp, min: 5, max: 40, type: "range" },
          ].map((f) => (
            <div key={f.label} style={{ marginBottom: "1.25rem" }}>
              <label style={S.label}>{f.label}</label>
              <input type="range" min={f.min} max={f.max}
                value={f.val} onChange={(e) => f.set(parseFloat(e.target.value))}
                style={{ width: "100%", accentColor: C.accent }} />
            </div>
          ))}
          <div>
            <label style={S.label}>Intensité</label>
            <div style={{ display: "flex", gap: 6 }}>
              {["leger", "modere", "intense", "max"].map((i) => (
                <button key={i} onClick={() => setIntensity(i)} style={{
                  ...S.navBtn(intensity === i), flex: 1, border: `1px solid ${C.border}`, borderRadius: 8,
                }}>
                  {i === "leger" ? "Léger" : i === "modere" ? "Modéré" : i === "intense" ? "Intense" : "Max"}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={S.card}>
          <h2 style={S.h2}>Recommandations</h2>
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "1rem" }}>
            <div style={S.metric(C.accent)}>
              <div style={{ ...S.metricVal, color: C.accent }}>{carbPerHour}g</div>
              <div style={S.metricLabel}>glucides/heure</div>
            </div>
            <div style={S.metric(C.info)}>
              <div style={{ ...S.metricVal, color: C.info }}>{Math.round(hydration / (duration / 60))}ml</div>
              <div style={S.metricLabel}>eau/heure</div>
            </div>
            <div style={S.metric(C.warning)}>
              <div style={{ ...S.metricVal, color: C.warning, fontSize: 18 }}>{sodium}mg</div>
              <div style={S.metricLabel}>sodium total</div>
            </div>
          </div>

          <div style={{ ...S.divider }} />
          <h2 style={S.h2}>Timeline de ravitaillement</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {timeline.slice(1).map((t, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "8px 12px", background: C.surface2, borderRadius: 8,
                fontSize: 13,
              }}>
                <span style={{ ...S.badge(C.muted), minWidth: 40 }}>T+{t.time}m</span>
                <span style={{ color: C.accent }}>🍬 {t.carbs}g glucides</span>
                <span style={{ color: C.info }}>💧 {t.water}ml</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── 5. DASHBOARD ─────────────────────────────────────────────────────────────
function Dashboard({ records }) {
  const bestPace = records.length
    ? records.reduce((a, b) => paceToKmh(a.pace) > paceToKmh(b.pace) ? a : b).pace
    : null;
  const bestTime = records.length
    ? records.reduce((a, b) => a.totalTime < b.totalTime ? a : b).totalTime
    : null;
  const avgTime = records.length
    ? records.reduce((a, b) => a + b.totalTime, 0) / records.length
    : null;

  const trend = records.slice(-8).map((r) => r.totalTime);

  return (
    <div>
      <SectionHeader title="Tableau de Bord Performance"
        subtitle="Suivez vos progrès et analysez vos tendances d'entraînement hybride" />

      {records.length === 0 ? (
        <div style={{ ...S.card, textAlign: "center", padding: "3rem" }}>
          <div style={{ fontSize: 48, marginBottom: "1rem" }}>🏁</div>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Aucune session enregistrée</div>
          <div style={{ color: C.muted, fontSize: 14 }}>
            Simulez une course et sauvegardez les résultats pour les voir apparaître ici.
          </div>
        </div>
      ) : (
        <>
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "1.25rem" }}>
            <div style={{ ...S.metric(C.accent), flex: 1, minWidth: 140 }}>
              <div style={{ ...S.metricVal, color: C.accent }}>{bestPace || "--"}</div>
              <div style={S.metricLabel}>Meilleure allure</div>
            </div>
            <div style={{ ...S.metric(C.info), flex: 1, minWidth: 140 }}>
              <div style={{ ...S.metricVal, color: C.info, fontSize: 20 }}>{bestTime ? fmtTime(bestTime) : "--"}</div>
              <div style={S.metricLabel}>Meilleur temps</div>
            </div>
            <div style={{ ...S.metric(C.warning), flex: 1, minWidth: 140 }}>
              <div style={{ ...S.metricVal, color: C.warning, fontSize: 20 }}>{avgTime ? fmtTime(avgTime) : "--"}</div>
              <div style={S.metricLabel}>Temps moyen</div>
            </div>
            <div style={{ ...S.metric(C.muted), flex: 1, minWidth: 140 }}>
              <div style={{ ...S.metricVal }}>{records.length}</div>
              <div style={S.metricLabel}>Sessions</div>
            </div>
          </div>

          {trend.length > 1 && (
            <div style={S.card}>
              <h2 style={S.h2}>Évolution du temps total</h2>
              <Sparkline data={trend} color={C.accent} height={64} width={600} />
              <div style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>
                {trend.length} sessions récentes
              </div>
            </div>
          )}

          <div style={S.card}>
            <h2 style={S.h2}>Sessions récentes</h2>
            {[...records].reverse().slice(0, 10).map((r, i) => (
              <div key={i} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "10px 0", borderBottom: `1px solid ${C.border}`, fontSize: 14,
              }}>
                <div>
                  <span style={{ fontWeight: 600 }}>{new Date(r.date).toLocaleDateString("fr-FR")}</span>
                  <span style={{ ...S.badge(C.muted), marginLeft: 8 }}>{r.format} · {r.level}</span>
                </div>
                <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                  <span style={{ color: C.muted }}>{r.pace} min/km</span>
                  <span style={{ fontWeight: 700, color: C.accent, fontFamily: "monospace" }}>{fmtTime(r.totalTime)}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── 6. PERFORMANCE METRICS ───────────────────────────────────────────────────
function PerformanceMetrics() {
  const [pace, setPace] = useState("5:00");
  const [weight, setWeight] = useState(72);
  const [hr, setHr] = useState(165);
  const [maxHr, setMaxHr] = useState(190);

  const kmh = paceToKmh(pace) || 12;
  const hrPct = Math.round((hr / maxHr) * 100);
  const vo2 = Math.round(15 * (maxHr / (hr || 1)));
  const economyScore = Math.min(100, Math.round((kmh / (hr / 100)) * 4));
  const gripScore = Math.round(65 + (weight - 70) * 0.3 + Math.random() * 5);
  const sledEff = Math.round(55 + kmh * 2);
  const paceConsistency = Math.round(82 - Math.abs(hrPct - 80) * 0.5);
  const fatigueIdx = Math.round(hrPct - 75 + (100 - paceConsistency) * 0.3);

  const metrics = [
    { label: "Estimation VO2max", val: vo2, unit: "ml/kg/min", color: C.accent, max: 80 },
    { label: "Économie de course", val: economyScore, unit: "/100", color: C.info, max: 100 },
    { label: "Efficacité sled", val: Math.min(100, sledEff), unit: "/100", color: C.warning, max: 100 },
    { label: "Consistance allure", val: paceConsistency, unit: "/100", color: "#C084FC", max: 100 },
    { label: "Score endurance grip", val: Math.min(100, gripScore), unit: "/100", color: "#F472B6", max: 100 },
    { label: "Index de fatigue", val: fatigueIdx, unit: "/100", color: C.danger, max: 100 },
  ];

  return (
    <div>
      <SectionHeader title="Métriques de Performance Hybride"
        subtitle="Indicateurs avancés pour analyser votre profil d'athlète hybride" />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
        <div style={S.card}>
          <h2 style={S.h2}>Paramètres</h2>
          {[
            { label: "Allure (min/km)", val: pace, set: setPace, type: "text", placeholder: "5:00" },
            { label: `Poids: ${weight} kg`, val: weight, set: setWeight, type: "range", min: 40, max: 120 },
            { label: `FC actuelle: ${hr} bpm`, val: hr, set: setHr, type: "range", min: 100, max: 210 },
            { label: `FC max: ${maxHr} bpm`, val: maxHr, set: setMaxHr, type: "range", min: 150, max: 220 },
          ].map((f) => (
            <div key={f.label} style={{ marginBottom: "1rem" }}>
              <label style={S.label}>{f.label}</label>
              {f.type === "text" ? (
                <input style={S.input} value={f.val}
                  onChange={(e) => f.set(e.target.value)} placeholder={f.placeholder} />
              ) : (
                <input type="range" min={f.min} max={f.max}
                  value={f.val} onChange={(e) => f.set(parseFloat(e.target.value))}
                  style={{ width: "100%", accentColor: C.accent }} />
              )}
            </div>
          ))}
        </div>

        <div style={S.card}>
          <h2 style={S.h2}>Profil athlète</h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
            {metrics.map((m, i) => (
              <div key={i} style={{ flex: "1 1 140px" }}>
                <div style={{ ...S.metric(m.color) }}>
                  <div style={{ ...S.metricVal, color: m.color, fontSize: 22 }}>{m.val}</div>
                  <div style={S.metricLabel}>{m.unit}</div>
                  <div style={{ height: 4, background: C.border, borderRadius: 4, marginTop: 8, overflow: "hidden" }}>
                    <div style={{
                      height: "100%", width: `${(m.val / m.max) * 100}%`,
                      background: m.color, borderRadius: 4,
                      transition: "width 0.5s cubic-bezier(.4,0,.2,1)",
                    }} />
                  </div>
                  <div style={{ fontSize: 10, color: C.muted, marginTop: 4 }}>{m.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={S.card}>
        <h2 style={S.h2}>Analyse des zones de fréquence cardiaque</h2>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          {[
            { zone: "Z1", range: "50–60%", label: "Récupération active", pct: [50, 60] },
            { zone: "Z2", range: "60–70%", label: "Endurance de base", pct: [60, 70] },
            { zone: "Z3", range: "70–80%", label: "Aerobic modéré", pct: [70, 80] },
            { zone: "Z4", range: "80–90%", label: "Seuil anaérobique", pct: [80, 90] },
            { zone: "Z5", range: "90–100%", label: "VO2max", pct: [90, 100] },
          ].map((z, i) => {
            const inZone = hrPct >= z.pct[0] && hrPct < z.pct[1];
            const colors = [C.info, C.accent, C.warning, "#FF7A40", C.danger];
            return (
              <div key={i} style={{
                flex: "1 1 140px", padding: "0.75rem 1rem",
                background: inZone ? `${colors[i]}18` : C.surface2,
                border: `1px solid ${inZone ? colors[i] : C.border}`,
                borderRadius: 10,
              }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: colors[i] }}>{z.zone}</div>
                <div style={{ fontSize: 12, color: C.muted }}>{z.range} FCmax</div>
                <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{z.label}</div>
                {inZone && <div style={{ ...S.badge(colors[i]), marginTop: 6 }}>Actuelle</div>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── TABS config ─────────────────────────────────────────────────────────────
const TABS = [
  { id: "converter", label: "Allure & Vitesse" },
  { id: "simulator", label: "Simulateur Hybride" },
  { id: "strategy", label: "Stratégie" },
  { id: "nutrition", label: "Nutrition" },
  { id: "dashboard", label: "Tableau de Bord" },
  { id: "metrics", label: "Métriques" },
];

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("converter");
  const [records, setRecords] = useState(() => loadData().records || []);

  useEffect(() => {
    saveData({ records });
  }, [records]);

  const handleSave = useCallback((record) => {
    setRecords((prev) => [...prev, record]);
    setTab("dashboard");
  }, []);

  const renderPage = () => {
    switch (tab) {
      case "converter": return <PaceConverter />;
      case "simulator": return <RaceSimulator onSave={handleSave} />;
      case "strategy": return <StrategyAnalyzer />;
      case "nutrition": return <NutritionCalc />;
      case "dashboard": return <Dashboard records={records} />;
      case "metrics": return <PerformanceMetrics />;
      default: return null;
    }
  };

  return (
    <div style={S.app}>
      {/* Navigation */}
      <nav style={S.nav}>
        <div style={S.logo}>
          <span style={{ fontSize: 20 }}>⚡</span>
          <span>Hybrid Race Pace Lab</span>
        </div>
        <div style={{ display: "flex", gap: 4, overflowX: "auto" }}>
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} style={S.navBtn(tab === t.id)}>
              {t.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Page content */}
      <main style={S.page}>
        {renderPage()}
      </main>

      {/* Footer */}
      <footer style={S.footer}>
        <div style={{ marginBottom: 4, fontWeight: 600, letterSpacing: "0.12em", color: C.accent }}>
          HYBRID RACE PACE LAB
        </div>
        <div>Outil personnel de performance hybride · Non affilié à une organisation officielle</div>
        <div style={{ marginTop: 6, color: C.muted }}>Créé par <span style={{ color: C.text, fontWeight: 600 }}>Marck Roger</span></div>
      </footer>
    </div>
  );
}
