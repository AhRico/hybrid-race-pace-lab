import { useState, useEffect, useCallback, useMemo } from "react";

// ─── Constants ────────────────────────────────────────────────────────────────
const C = {
  accent: "#00E5A0", accentDim: "#00b880",
  bg: "#0A0B0E", surface: "#111318", surface2: "#181C23",
  border: "#1F2330", text: "#F0F2F8", muted: "#6B7080",
  danger: "#FF5C6A", warning: "#FFB84D", info: "#4DA6FF",
  purple: "#C084FC", pink: "#F472B6",
};

const pad = (n) => String(Math.floor(Math.abs(n))).padStart(2, "0");
const fmtTime = (s) => {
  if (!s || s < 0) return "--";
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = Math.floor(s % 60);
  return h > 0 ? `${h}h${pad(m)}m${pad(sec)}s` : `${pad(m)}m${pad(sec)}s`;
};
const paceToKmh = (p) => {
  const parts = String(p).split(":");
  if (parts.length !== 2) return null;
  const m = parseFloat(parts[0]), s = parseFloat(parts[1]);
  if (isNaN(m) || isNaN(s)) return null;
  return 60 / (m + s / 60);
};
const kmhToPace = (kmh) => {
  if (!kmh || kmh <= 0) return "--:--";
  const t = 3600 / kmh;
  return `${Math.floor(t / 60)}:${pad(t % 60)}`;
};
const splitTime = (kmh, dist) => {
  if (!kmh || kmh <= 0) return "--";
  return fmtTime((dist / kmh) * 3600);
};

// ─── LocalStorage ─────────────────────────────────────────────────────────────
const LS = "hrpl_v2";
const load = () => { try { return JSON.parse(localStorage.getItem(LS)) || {}; } catch { return {}; } };
const save = (d) => { try { localStorage.setItem(LS, JSON.stringify(d)); } catch {} };

// ─── Station data with weights ────────────────────────────────────────────────
const STATIONS = [
  { id: "skierg",   name: "SkiErg",            icon: "🎿", dist: "1000m",    weights: { mRx: null, fRx: null, mSc: null, fSc: null }, defaultTime: { mRx: 270, fRx: 300, mSc: 250, fSc: 280 } },
  { id: "sledpush", name: "Sled Push",          icon: "🏋️", dist: "50m×8",   weights: { mRx: "152kg", fRx: "102kg", mSc: "102kg", fSc: "72kg" }, defaultTime: { mRx: 240, fRx: 210, mSc: 200, fSc: 180 } },
  { id: "sledpull", name: "Sled Pull",          icon: "💪", dist: "50m×8",   weights: { mRx: "103kg", fRx: "78kg",  mSc: "78kg",  fSc: "58kg" }, defaultTime: { mRx: 210, fRx: 190, mSc: 180, fSc: 160 } },
  { id: "burpee",   name: "Burpee Broad Jumps", icon: "🏃", dist: "80m",     weights: { mRx: null, fRx: null, mSc: null, fSc: null }, defaultTime: { mRx: 240, fRx: 220, mSc: 200, fSc: 185 } },
  { id: "rowing",   name: "Rowing",             icon: "🚣", dist: "1000m",   weights: { mRx: null, fRx: null, mSc: null, fSc: null }, defaultTime: { mRx: 270, fRx: 290, mSc: 250, fSc: 265 } },
  { id: "farmer",   name: "Farmer Carry",       icon: "🧳", dist: "200m",    weights: { mRx: "2×24kg", fRx: "2×16kg", mSc: "2×20kg", fSc: "2×12kg" }, defaultTime: { mRx: 180, fRx: 165, mSc: 160, fSc: 145 } },
  { id: "sandbag",  name: "Sandbag Lunges",     icon: "⚡", dist: "100m",    weights: { mRx: "20kg", fRx: "10kg", mSc: "15kg", fSc: "10kg" }, defaultTime: { mRx: 270, fRx: 245, mSc: 240, fSc: 220 } },
  { id: "wallball", name: "Wall Balls",         icon: "🏀", dist: "100 reps",weights: { mRx: "6kg/9ft", fRx: "4kg/9ft", mSc: "6kg/7.5ft", fSc: "4kg/7.5ft" }, defaultTime: { mRx: 240, fRx: 215, mSc: 210, fSc: 190 } },
];
const STATION_COLORS = ["#4DA6FF","#00E5A0","#FFB84D","#FF5C6A","#C084FC","#F472B6","#34D399","#FBBF24"];
const CAT_KEY = { mRx: "Homme RX", fRx: "Femme RX", mSc: "Homme Scaled", fSc: "Femme Scaled" };

// ─── Styles ───────────────────────────────────────────────────────────────────
const S = {
  app: { minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'DM Sans','Segoe UI',sans-serif", paddingBottom: 80 },
  topBar: { background: C.surface, borderBottom: `1px solid ${C.border}`, padding: "0 1.25rem", display: "flex", alignItems: "center", height: 52, position: "sticky", top: 0, zIndex: 100, gap: 8 },
  logo: { fontWeight: 800, fontSize: 14, letterSpacing: "-0.02em", color: C.accent, marginRight: "auto", display: "flex", alignItems: "center", gap: 6 },
  bottomNav: { position: "fixed", bottom: 0, left: 0, right: 0, background: C.surface, borderTop: `1px solid ${C.border}`, display: "flex", zIndex: 100, padding: "6px 0 8px" },
  bottomBtn: (a) => ({ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "4px 2px", background: "none", border: "none", cursor: "pointer", color: a ? C.accent : C.muted, fontSize: 9, fontWeight: a ? 700 : 400, letterSpacing: "0.06em", transition: "color 0.18s" }),
  page: { maxWidth: 900, margin: "0 auto", padding: "1.25rem 1rem 1rem" },
  card: { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "1.25rem", marginBottom: "1rem" },
  h1: { fontSize: 20, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 2, color: C.text },
  h2: { fontSize: 15, fontWeight: 700, marginBottom: "0.875rem", color: C.text, letterSpacing: "-0.01em" },
  label: { fontSize: 11, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 5, display: "block" },
  input: { width: "100%", background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 9, padding: "9px 12px", color: C.text, fontSize: 14, outline: "none", boxSizing: "border-box" },
  btn: (v = "primary") => ({ padding: "9px 18px", borderRadius: 9, border: "none", background: v === "primary" ? C.accent : v === "danger" ? `${C.danger}22` : C.surface2, color: v === "primary" ? "#000" : v === "danger" ? C.danger : C.text, fontWeight: 700, fontSize: 12, cursor: "pointer", letterSpacing: "0.04em" }),
  metric: (color = C.accent) => ({ background: C.surface2, borderRadius: 10, padding: "0.875rem 1rem", flex: 1, minWidth: 110, borderLeft: `3px solid ${color}` }),
  metricVal: { fontSize: 22, fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 1, marginBottom: 3 },
  metricLabel: { fontSize: 10, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em" },
  badge: (c = C.accent) => ({ display: "inline-block", padding: "2px 8px", borderRadius: 20, background: `${c}22`, color: c, fontSize: 11, fontWeight: 700 }),
  divider: { borderTop: `1px solid ${C.border}`, margin: "1rem 0" },
  insight: { background: `${C.accent}10`, border: `1px solid ${C.accent}28`, borderRadius: 9, padding: "0.625rem 0.875rem", fontSize: 12, color: C.text, marginBottom: 6 },
  grid2: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" },
};

// ─── Micro components ─────────────────────────────────────────────────────────
function Sparkline({ data, color = C.accent, h = 52, w = 300 }) {
  if (!data || data.length < 2) return null;
  const mn = Math.min(...data), mx = Math.max(...data), rng = mx - mn || 1;
  const pts = data.map((v, i) =>
    `${((i / (data.length - 1)) * w).toFixed(1)},${(h - ((v - mn) / rng) * (h - 8) - 4).toFixed(1)}`
  ).join(" ");
  const last = pts.split(" ").at(-1).split(",");
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{ display: "block" }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r="3" fill={color} />
    </svg>
  );
}

function Donut({ segs, size = 130 }) {
  const total = segs.reduce((a, b) => a + b.v, 0) || 1;
  let off = 0;
  const r = 42, cx = 60, cy = 60, circ = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox="0 0 120 120">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={C.border} strokeWidth="13" />
      {segs.map((seg, i) => {
        const pct = seg.v / total, dash = pct * circ, o = off * circ - circ / 4;
        off += pct;
        return <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={seg.c} strokeWidth="13"
          strokeDasharray={`${dash} ${circ - dash}`} strokeDashoffset={-o} />;
      })}
      <text x={cx} y={cy - 4} textAnchor="middle" fill={C.text} fontSize="11" fontWeight="700">{fmtTime(total)}</text>
      <text x={cx} y={cy + 10} textAnchor="middle" fill={C.muted} fontSize="8">total</text>
    </svg>
  );
}

function SectionHeader({ title, sub, icon }) {
  return (
    <div style={{ marginBottom: "1.25rem" }}>
      <h1 style={S.h1}>{icon && <span style={{ marginRight: 6 }}>{icon}</span>}{title}</h1>
      {sub && <p style={{ color: C.muted, fontSize: 13, margin: 0 }}>{sub}</p>}
    </div>
  );
}

function RangeRow({ label, val, set, min, max, step = 1, unit = "" }) {
  return (
    <div style={{ marginBottom: "1rem" }}>
      <label style={S.label}>{label}: <span style={{ color: C.text }}>{val}{unit}</span></label>
      <input type="range" min={min} max={max} step={step} value={val}
        onChange={(e) => set(parseFloat(e.target.value))}
        style={{ width: "100%", accentColor: C.accent }} />
    </div>
  );
}

function TabToggle({ options, value, onChange }) {
  return (
    <div style={{ display: "flex", gap: 6, marginBottom: "1rem" }}>
      {options.map(([k, l]) => (
        <button key={k} onClick={() => onChange(k)} style={{
          flex: 1, padding: "7px 6px", borderRadius: 8,
          border: `1px solid ${value === k ? C.accent : C.border}`,
          background: value === k ? `${C.accent}18` : "transparent",
          color: value === k ? C.accent : C.muted,
          fontSize: 12, fontWeight: value === k ? 700 : 400, cursor: "pointer",
        }}>{l}</button>
      ))}
    </div>
  );
}

// ─── PDF Export ───────────────────────────────────────────────────────────────
function exportPDF(title, rows) {
  const w = window.open("", "_blank");
  if (!w) return;
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title>
  <style>body{font-family:Arial,sans-serif;padding:32px;color:#111;max-width:700px;margin:0 auto}
  h1{font-size:20px;border-bottom:2px solid #00b880;padding-bottom:8px}
  h2{font-size:14px;color:#444;margin-top:20px}
  table{width:100%;border-collapse:collapse;margin:10px 0}
  th{background:#f0f0f0;padding:7px 10px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.05em}
  td{padding:7px 10px;border-bottom:1px solid #eee;font-size:12px}
  .footer{margin-top:36px;font-size:10px;color:#999;border-top:1px solid #eee;padding-top:10px}
  @media print{body{padding:16px}}</style></head><body>
  <h1>⚡ Hybrid Race Pace Lab — ${title}</h1>
  <p style="color:#666;font-size:11px">Généré le ${new Date().toLocaleDateString("fr-FR")} à ${new Date().toLocaleTimeString("fr-FR")}</p>
  ${rows.map(([section, data]) => `<h2>${section}</h2>
  <table><thead><tr>${Object.keys(data[0]).map(k => `<th>${k}</th>`).join("")}</tr></thead>
  <tbody>${data.map(row => `<tr>${Object.values(row).map(v => `<td>${v}</td>`).join("")}</tr>`).join("")}</tbody></table>`).join("")}
  <div class="footer">Créé par <strong>Marck Roger</strong> · Hybrid Race Pace Lab · Outil personnel non affilié</div>
  <script>window.onload=()=>{window.print()}</script></body></html>`;
  w.document.write(html); w.document.close();
}

// ─── Cookie Banner ────────────────────────────────────────────────────────────
function CookieBanner() {
  const [visible, setVisible] = useState(() => !localStorage.getItem("hrpl_cookies"));
  if (!visible) return null;
  const accept = () => { localStorage.setItem("hrpl_cookies", "1"); setVisible(false); };
  return (
    <div style={{ position: "fixed", bottom: 72, left: 12, right: 12, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "0.875rem 1rem", zIndex: 200, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", boxShadow: "0 8px 32px #00000088" }}>
      <span style={{ fontSize: 12, color: C.muted, flex: 1, minWidth: 200 }}>
        🍪 Cette app utilise uniquement le <strong style={{ color: C.text }}>localStorage</strong> de votre navigateur pour sauvegarder vos données localement. Aucune donnée n'est transmise à un serveur.
      </span>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={accept} style={S.btn("primary")}>Accepter</button>
        <button onClick={() => setVisible(false)} style={S.btn("secondary")}>Fermer</button>
      </div>
    </div>
  );
}

// ─── 1. PACE CONVERTER ───────────────────────────────────────────────────────
function PaceConverter() {
  const [mode, setMode] = useState("pace");
  const [paceIn, setPaceIn] = useState("5:00");
  const [kmhIn, setKmhIn] = useState("");

  const kmh = useMemo(() =>
    mode === "pace" ? paceToKmh(paceIn) : (parseFloat(kmhIn) || null),
    [mode, paceIn, kmhIn]
  );
  const pace = kmh ? kmhToPace(kmh) : "--:--";
  const pacePerMile = kmh ? kmhToPace(kmh / 1.60934) : "--:--";

  const splits = [
    { l: "400m", km: 0.4 }, { l: "600m", km: 0.6 }, { l: "800m", km: 0.8 },
    { l: "1 km", km: 1 }, { l: "5 km", km: 5 }, { l: "10 km", km: 10 },
    { l: "Semi (21,1 km)", km: 21.0975 }, { l: "Marathon (42,2 km)", km: 42.195 },
    { l: "8 km hybride", km: 8, highlight: true },
  ];

  return (
    <div>
      <SectionHeader icon="⚡" title="Convertisseur Allure & Vitesse" sub="Conversion instantanée · splits · zones d'entraînement" />
      <div style={S.grid2}>
        <div style={S.card}>
          <TabToggle options={[["pace","Allure min/km"],["speed","Vitesse km/h"]]} value={mode} onChange={setMode} />
          {mode === "pace"
            ? <><label style={S.label}>Allure (ex: 5:30)</label><input style={S.input} value={paceIn} onChange={(e) => setPaceIn(e.target.value)} placeholder="5:00" /></>
            : <><label style={S.label}>Vitesse (km/h)</label><input style={S.input} type="number" value={kmhIn} onChange={(e) => setKmhIn(e.target.value)} placeholder="12" /></>
          }
          <div style={{ display: "flex", gap: "0.625rem", marginTop: "1rem", flexWrap: "wrap" }}>
            <div style={S.metric(C.accent)}>
              <div style={{ ...S.metricVal, color: C.accent }}>{pace}</div>
              <div style={S.metricLabel}>min/km</div>
            </div>
            <div style={S.metric(C.info)}>
              <div style={{ ...S.metricVal, color: C.info }}>{kmh ? kmh.toFixed(2) : "--"}</div>
              <div style={S.metricLabel}>km/h</div>
            </div>
            <div style={S.metric(C.muted)}>
              <div style={{ ...S.metricVal, color: C.muted, fontSize: 17 }}>{pacePerMile}</div>
              <div style={S.metricLabel}>min/mile</div>
            </div>
          </div>
        </div>

        <div style={S.card}>
          <h2 style={S.h2}>Temps au split</h2>
          {splits.map((s) => (
            <div key={s.l} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: `1px solid ${C.border}`, fontSize: 13 }}>
              <span style={{ color: s.highlight ? C.accent : C.muted, fontWeight: s.highlight ? 700 : 400 }}>{s.l}</span>
              <span style={{ fontWeight: 700, color: s.highlight ? C.accent : C.text, fontFamily: "monospace" }}>{splitTime(kmh, s.km)}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={S.card}>
        <h2 style={S.h2}>Zones d'entraînement</h2>
        <div style={{ display: "flex", gap: "0.625rem", flexWrap: "wrap" }}>
          {[
            { z: "Z1 Récup", mult: 1.35, c: C.info },
            { z: "Z2 Endurance", mult: 1.18, c: C.accent },
            { z: "Z3 Tempo", mult: 1.06, c: "#90EE90" },
            { z: "Z4 Seuil", mult: 0.97, c: C.warning },
            { z: "Z5 VO2max", mult: 0.90, c: C.danger },
          ].map((z) => (
            <div key={z.z} style={{ ...S.metric(z.c), flex: "1 1 110px" }}>
              <div style={{ ...S.metricVal, fontSize: 17, color: z.c }}>{kmh ? kmhToPace(kmh * (1 / z.mult)) : "--:--"}</div>
              <div style={S.metricLabel}>{z.z}</div>
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
  const [cat, setCat] = useState("mRx");
  const [format, setFormat] = useState("solo");
  const [transition, setTransition] = useState(15);
  const [fatigue, setFatigue] = useState(1.08);
  const [times, setTimes] = useState(() =>
    Object.fromEntries(STATIONS.map((s) => [s.id, s.defaultTime.mRx]))
  );

  useEffect(() => {
    setTimes(Object.fromEntries(STATIONS.map((s) => [s.id, s.defaultTime[cat]])));
  }, [cat]);

  const kmh = paceToKmh(pace) || 10.9;
  const runTime = (3600 / kmh) * 8 * fatigue;
  const stTime = Object.values(times).reduce((a, b) => a + b * fatigue, 0);
  const trTime = transition * 8;
  const total = runTime + stTime + trTime;

  const donutSegs = [
    { v: runTime, c: C.accent, l: "Course" },
    { v: stTime, c: C.info, l: "Stations" },
    { v: trTime, c: C.warning, l: "Transitions" },
  ];

  const insights = useMemo(() => {
    const worst = STATIONS.reduce((a, b) => (times[b.id] > times[a.id] ? b : a));
    const runPct = (runTime / total * 100).toFixed(0);
    const trPct = (trTime / total * 100).toFixed(0);
    return [
      `🏃 La course représente ${runPct}% du temps total (${fmtTime(runTime)}).`,
      `⚡ Station la plus longue : ${worst.name} (${fmtTime(times[worst.id] * fatigue)}). Priorité n°1.`,
      trTime > 120
        ? `⏱ Transitions : ${trPct}% du total. Chaque seconde gagnée × 8 stations = gain réel.`
        : `✅ Transitions efficaces (${fmtTime(trTime)} total).`,
      fatigue > 1.1
        ? `💡 Multiplicateur de fatigue élevé (${fatigue.toFixed(2)}×) — travaillez l'endurance spécifique hybride.`
        : `✅ Bonne résistance à la fatigue simulée (${fatigue.toFixed(2)}×).`,
    ];
  }, [times, runTime, total, trTime, fatigue]);

  const handleExportPDF = () => {
    exportPDF(`Simulation ${CAT_KEY[cat]} — ${format} — ${fmtTime(total)}`, [
      ["Résumé", [
        { Segment: "Course (8 km)", Durée: fmtTime(runTime), "%": `${(runTime/total*100).toFixed(0)}%` },
        { Segment: "Stations (×8)", Durée: fmtTime(stTime), "%": `${(stTime/total*100).toFixed(0)}%` },
        { Segment: "Transitions", Durée: fmtTime(trTime), "%": `${(trTime/total*100).toFixed(0)}%` },
        { Segment: "TOTAL", Durée: fmtTime(total), "%": "100%" },
      ]],
      ["Détail stations", STATIONS.map((s) => ({
        Station: s.name, Distance: s.dist,
        Poids: s.weights[cat] || "—",
        "Temps base": fmtTime(times[s.id]),
        "Avec fatigue": fmtTime(times[s.id] * fatigue),
      }))],
    ]);
  };

  return (
    <div>
      <SectionHeader icon="🏁" title="Simulateur Course Hybride" sub="Simulation complète avec poids officiels par catégorie" />

      <div style={S.card}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "0.75rem", marginBottom: "0.875rem" }}>
          <div>
            <label style={S.label}>Catégorie</label>
            <select style={S.input} value={cat} onChange={(e) => setCat(e.target.value)}>
              {Object.entries(CAT_KEY).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label style={S.label}>Format</label>
            <select style={S.input} value={format} onChange={(e) => setFormat(e.target.value)}>
              <option value="solo">Solo</option>
              <option value="doubles">Doubles</option>
              <option value="relay">Relais</option>
            </select>
          </div>
          <div>
            <label style={S.label}>Allure course</label>
            <input style={S.input} value={pace} onChange={(e) => setPace(e.target.value)} placeholder="5:30" />
          </div>
          <div>
            <label style={S.label}>Transition (sec)</label>
            <input style={S.input} type="number" value={transition} onChange={(e) => setTransition(parseInt(e.target.value)||0)} />
          </div>
        </div>
        <RangeRow label="Multiplicateur fatigue" val={fatigue} set={setFatigue} min={1} max={1.3} step={0.01} />
      </div>

      <div style={S.card}>
        <h2 style={S.h2}>Temps par station</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "0.625rem" }}>
          {STATIONS.map((s, i) => {
            const w = s.weights[cat];
            return (
              <div key={s.id} style={{ background: C.surface2, borderRadius: 9, padding: "0.75rem", borderLeft: `3px solid ${STATION_COLORS[i]}` }}>
                <div style={{ fontSize: 11, color: C.muted, marginBottom: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>{s.icon} {s.name}</span>
                  {w && <span style={S.badge(STATION_COLORS[i])}>{w}</span>}
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input style={{ ...S.input, flex: 1, padding: "6px 10px", fontSize: 13 }} type="number"
                    value={times[s.id]} onChange={(e) => setTimes(prev => ({ ...prev, [s.id]: parseInt(e.target.value)||0 }))} />
                  <div style={{ textAlign: "right", minWidth: 54 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: STATION_COLORS[i] }}>{fmtTime(times[s.id] * fatigue)}</div>
                    <div style={{ fontSize: 9, color: C.muted }}>avec fatigue</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={S.grid2}>
        <div style={S.card}>
          <h2 style={S.h2}>Résultat estimé</h2>
          <div style={{ display: "flex", alignItems: "center", gap: "1.25rem", flexWrap: "wrap" }}>
            <Donut segs={donutSegs} size={130} />
            <div style={{ flex: 1 }}>
              {donutSegs.map((seg, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: `1px solid ${C.border}`, fontSize: 12 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 5, color: C.muted }}>
                    <span style={{ width: 7, height: 7, borderRadius: 2, background: seg.c, display: "inline-block" }} />{seg.l}
                  </span>
                  <span style={{ fontWeight: 700, color: seg.c }}>{fmtTime(seg.v)}</span>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", fontSize: 14 }}>
                <span style={{ fontWeight: 700 }}>Total</span>
                <span style={{ fontWeight: 800, color: C.accent, fontFamily: "monospace", fontSize: 17 }}>{fmtTime(total)}</span>
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: "0.75rem", flexWrap: "wrap" }}>
            <button style={S.btn("primary")} onClick={() => onSave?.({ pace, totalTime: total, format, cat, date: new Date().toISOString() })}>💾 Sauvegarder</button>
            <button style={S.btn("secondary")} onClick={handleExportPDF}>📄 Exporter PDF</button>
          </div>
        </div>

        <div style={S.card}>
          <h2 style={S.h2}>💡 Insights</h2>
          {insights.map((ins, i) => <div key={i} style={S.insight}>{ins}</div>)}
        </div>
      </div>
    </div>
  );
}

// ─── 3. SEMI / MARATHON SIMULATOR ────────────────────────────────────────────
function RunSimulator() {
  const [dist, setDist] = useState("semi");
  const [pace, setPace] = useState("5:10");
  const [fatiguePct, setFatiguePct] = useState(3);

  const KM = dist === "semi" ? 21.0975 : 42.195;
  const kmh = paceToKmh(pace) || 11.6;

  const checkpoints = dist === "semi"
    ? [5, 10, 15, 21.0975]
    : [5, 10, 15, 20, 25, 30, 35, 40, 42.195];

  const getTimeAt = (km) => {
    const fatFactor = 1 + (km / KM) * (fatiguePct / 100);
    return (km / (kmh * fatFactor)) * 3600;
  };

  const totalTime = getTimeAt(KM);
  const wallKm = dist === "marathon" && fatiguePct > 8 ? Math.round(28 + (15 - fatiguePct) * 0.8) : null;

  const splits = checkpoints.map((km) => ({
    km, time: getTimeAt(km),
    pace: kmhToPace(km / (getTimeAt(km) / 3600)),
  }));

  const refs = dist === "semi"
    ? [["Élite hommes", "~1h00"], ["Élite femmes", "~1h05"], ["Sub 1h30", "4:16/km"], ["Sub 2h00", "5:41/km"]]
    : [["Élite hommes", "~2h00"], ["Élite femmes", "~2h14"], ["Sub 3h00", "4:16/km"], ["Sub 4h00", "5:41/km"]];

  const handleExportPDF = () => {
    exportPDF(`${dist === "semi" ? "Semi-marathon" : "Marathon"} — ${fmtTime(totalTime)}`, [
      ["Splits prévisionnels", splits.map((s) => ({
        "Distance": `${s.km % 1 === 0 ? s.km : s.km.toFixed(1)} km`,
        "Temps": fmtTime(s.time),
        "Allure": s.pace + "/km",
      }))],
    ]);
  };

  return (
    <div>
      <SectionHeader icon="🏃" title="Simulateur Course à Pied" sub="Semi-marathon · marathon · splits prévisionnels · risque de mur" />
      <div style={S.grid2}>
        <div style={S.card}>
          <TabToggle options={[["semi","Semi-marathon"],["marathon","Marathon"]]} value={dist} onChange={setDist} />
          <label style={S.label}>Allure cible (min/km)</label>
          <input style={{ ...S.input, marginBottom: "1rem" }} value={pace} onChange={(e) => setPace(e.target.value)} placeholder="5:10" />
          <RangeRow label="Ralentissement progressif" val={fatiguePct} set={setFatiguePct} min={0} max={20} unit="%" />

          <div style={{ display: "flex", gap: "0.625rem", flexWrap: "wrap", marginTop: "0.5rem" }}>
            <div style={S.metric(C.accent)}>
              <div style={{ ...S.metricVal, color: C.accent, fontSize: 19 }}>{fmtTime(totalTime)}</div>
              <div style={S.metricLabel}>Temps estimé</div>
            </div>
            <div style={S.metric(C.info)}>
              <div style={{ ...S.metricVal, color: C.info, fontSize: 17 }}>{kmhToPace(KM / (totalTime / 3600))}</div>
              <div style={S.metricLabel}>Allure moyenne</div>
            </div>
          </div>

          {wallKm && (
            <div style={{ ...S.insight, marginTop: "0.75rem", borderColor: `${C.danger}44`, background: `${C.danger}10`, color: C.danger }}>
              ⚠️ Risque de mur vers le km {wallKm}. Adoptez un départ conservateur.
            </div>
          )}

          <div style={{ ...S.divider }} />
          <h2 style={S.h2}>Références</h2>
          {refs.map(([l, v]) => (
            <div key={l} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "4px 0", color: C.muted }}>
              <span>{l}</span><span style={{ fontWeight: 600, color: C.text }}>{v}</span>
            </div>
          ))}
          <button style={{ ...S.btn("secondary"), marginTop: "0.75rem" }} onClick={handleExportPDF}>📄 Exporter PDF</button>
        </div>

        <div style={S.card}>
          <h2 style={S.h2}>Splits prévisionnels</h2>
          {splits.map((s, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: `1px solid ${C.border}`, fontSize: 13 }}>
              <span style={{ color: C.muted, minWidth: 70 }}>km {s.km % 1 === 0 ? s.km : s.km.toFixed(1)}</span>
              <span style={{ fontFamily: "monospace", fontWeight: 700 }}>{fmtTime(s.time)}</span>
              <span style={S.badge(C.muted)}>{s.pace}/km</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── 4. STRATEGY ANALYZER ────────────────────────────────────────────────────
function StrategyAnalyzer() {
  const [basePace, setBasePace] = useState("5:30");
  const [baseSt, setBaseSt] = useState(230);
  const [baseTr, setBaseTr] = useState(20);
  const [paceG, setPaceG] = useState(15);
  const [stG, setStG] = useState(10);
  const [trG, setTrG] = useState(50);

  const kmh = paceToKmh(basePace) || 10.9;
  const BASE_RUN = (3600 / kmh) * 8;
  const BASE_ST = baseSt * 8;
  const BASE_TR = baseTr * 8;
  const baseTotal = BASE_RUN + BASE_ST + BASE_TR;

  const scenarios = [
    { l: "Améliorer l'allure", gain: BASE_RUN * paceG / 100, c: C.accent, icon: "🏃", desc: `−${paceG}% course` },
    { l: "Efficacité stations", gain: BASE_ST * stG / 100, c: C.info, icon: "💪", desc: `−${stG}% stations` },
    { l: "Réduire transitions", gain: BASE_TR * trG / 100, c: C.warning, icon: "⏱", desc: `−${trG}% transitions` },
  ];
  const maxG = Math.max(...scenarios.map((s) => s.gain), 1);
  const best = [...scenarios].sort((a, b) => b.gain - a.gain)[0];

  return (
    <div>
      <SectionHeader icon="📊" title="Analyseur de Stratégie" sub="Comparez les scénarios d'amélioration et priorisez vos efforts" />
      <div style={S.grid2}>
        <div style={S.card}>
          <h2 style={S.h2}>Base actuelle</h2>
          <label style={S.label}>Allure course</label>
          <input style={{ ...S.input, marginBottom: "0.875rem" }} value={basePace} onChange={(e) => setBasePace(e.target.value)} placeholder="5:30" />
          <label style={S.label}>Temps station moyen (sec)</label>
          <input style={{ ...S.input, marginBottom: "0.875rem" }} type="number" value={baseSt} onChange={(e) => setBaseSt(parseInt(e.target.value)||0)} />
          <label style={S.label}>Temps transition moyen (sec)</label>
          <input style={{ ...S.input, marginBottom: "1rem" }} type="number" value={baseTr} onChange={(e) => setBaseTr(parseInt(e.target.value)||0)} />
          <div style={S.metric()}>
            <div style={{ ...S.metricVal }}>{fmtTime(baseTotal)}</div>
            <div style={S.metricLabel}>Temps total de base</div>
          </div>
        </div>
        <div style={S.card}>
          <h2 style={S.h2}>Hypothèses d'amélioration</h2>
          <RangeRow label="Gain allure" val={paceG} set={setPaceG} min={1} max={30} unit="%" />
          <RangeRow label="Gain stations" val={stG} set={setStG} min={1} max={40} unit="%" />
          <RangeRow label="Gain transitions" val={trG} set={setTrG} min={0} max={100} unit="%" />
        </div>
      </div>

      <div style={S.card}>
        <h2 style={S.h2}>Impact comparatif</h2>
        {scenarios.map((s, i) => (
          <div key={i} style={{ marginBottom: "1.125rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{s.icon} {s.l}</span>
              <div>
                <span style={S.badge(s.c)}>−{fmtTime(s.gain)}</span>
                <span style={{ fontSize: 10, color: C.muted, marginLeft: 6 }}>{s.desc}</span>
              </div>
            </div>
            <div style={{ height: 7, background: C.border, borderRadius: 7, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${(s.gain / maxG) * 100}%`, background: s.c, borderRadius: 7, transition: "width 0.5s ease" }} />
            </div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>
              Nouveau total : {fmtTime(baseTotal - s.gain)} ({((s.gain / baseTotal) * 100).toFixed(1)}% de gain)
            </div>
          </div>
        ))}
        <div style={S.divider} />
        <div style={S.insight}>
          💡 <strong>{best.l}</strong> vous apporte le gain le plus important (−{fmtTime(best.gain)}). Priorisez cet axe.
        </div>
      </div>
    </div>
  );
}

// ─── 5. NUTRITION ─────────────────────────────────────────────────────────────
function NutritionCalc() {
  const [weight, setWeight] = useState(72);
  const [duration, setDuration] = useState(90);
  const [intensity, setIntensity] = useState("modere");
  const [temp, setTemp] = useState(20);
  const [sex, setSex] = useState("m");

  const mult = { leger: 0.7, modere: 1.0, intense: 1.3, max: 1.6 }[intensity];
  const sexMult = sex === "f" ? 0.88 : 1;
  const carbPerH = Math.round((40 + (weight - 70) * 0.3) * mult * sexMult);
  const hydPerH = Math.round((500 + (temp - 15) * 25) * mult);
  const sodium = Math.round(600 * mult * (duration / 60));
  const gels = Math.ceil(carbPerH * (duration / 60) / 22);

  const timeline = [];
  for (let t = 20; t <= duration; t += 20) {
    timeline.push({ t, carbs: Math.round(carbPerH * 20 / 60), water: Math.round(hydPerH * 20 / 60) });
  }

  return (
    <div>
      <SectionHeader icon="🍬" title="Nutrition & Hydratation" sub="Stratégie de ravitaillement personnalisée pour la compétition" />
      <div style={S.grid2}>
        <div style={S.card}>
          <TabToggle options={[["m","Homme"],["f","Femme"]]} value={sex} onChange={setSex} />
          <RangeRow label="Poids corporel" val={weight} set={setWeight} min={40} max={120} unit=" kg" />
          <RangeRow label="Durée estimée" val={duration} set={setDuration} min={30} max={240} unit=" min" />
          <RangeRow label="Température" val={temp} set={setTemp} min={5} max={42} unit="°C" />
          <label style={S.label}>Intensité</label>
          <div style={{ display: "flex", gap: 5 }}>
            {[["leger","Léger"],["modere","Modéré"],["intense","Intense"],["max","Max"]].map(([k, l]) => (
              <button key={k} onClick={() => setIntensity(k)} style={{ flex: 1, padding: "6px 4px", borderRadius: 7, border: `1px solid ${intensity === k ? C.accent : C.border}`, background: intensity === k ? `${C.accent}18` : "transparent", color: intensity === k ? C.accent : C.muted, fontSize: 11, fontWeight: intensity === k ? 700 : 400, cursor: "pointer" }}>{l}</button>
            ))}
          </div>
        </div>

        <div style={S.card}>
          <h2 style={S.h2}>Recommandations</h2>
          <div style={{ display: "flex", gap: "0.625rem", flexWrap: "wrap", marginBottom: "1rem" }}>
            <div style={S.metric(C.accent)}>
              <div style={{ ...S.metricVal, color: C.accent }}>{carbPerH}g</div>
              <div style={S.metricLabel}>glucides/h</div>
            </div>
            <div style={S.metric(C.info)}>
              <div style={{ ...S.metricVal, color: C.info }}>{hydPerH}ml</div>
              <div style={S.metricLabel}>eau/h</div>
            </div>
            <div style={S.metric(C.warning)}>
              <div style={{ ...S.metricVal, color: C.warning, fontSize: 17 }}>{sodium}mg</div>
              <div style={S.metricLabel}>sodium total</div>
            </div>
            <div style={S.metric(C.purple)}>
              <div style={{ ...S.metricVal, color: C.purple }}>{gels}</div>
              <div style={S.metricLabel}>gels ~22g</div>
            </div>
          </div>
          <div style={S.divider} />
          <h2 style={S.h2}>Timeline ravitaillement</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {timeline.map((t, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 10px", background: C.surface2, borderRadius: 7, fontSize: 12 }}>
                <span style={S.badge(C.muted)}>T+{t.t}m</span>
                <span style={{ color: C.accent }}>🍬 {t.carbs}g</span>
                <span style={{ color: C.info }}>💧 {t.water}ml</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── 6. DASHBOARD ─────────────────────────────────────────────────────────────
function Dashboard({ records, onClear }) {
  const bestTime = records.length ? Math.min(...records.map(r => r.totalTime)) : null;
  const bestPace = records.length ? records.reduce((a, b) => (paceToKmh(a.pace)||0) > (paceToKmh(b.pace)||0) ? a : b).pace : null;
  const avgTime = records.length ? records.reduce((a, b) => a + b.totalTime, 0) / records.length : null;
  const trend = records.slice(-10).map(r => r.totalTime);

  const handleExportPDF = () => {
    if (!records.length) return;
    exportPDF("Historique des sessions", [
      ["Sessions", records.map((r, i) => ({
        "#": i + 1,
        Date: new Date(r.date).toLocaleDateString("fr-FR"),
        Format: r.format,
        Catégorie: r.cat ? CAT_KEY[r.cat] : "—",
        "Allure": r.pace + "/km",
        Total: fmtTime(r.totalTime),
      }))],
    ]);
  };

  return (
    <div>
      <SectionHeader icon="📈" title="Tableau de Bord" sub="Historique de vos simulations et tendances de performance" />

      {records.length === 0 ? (
        <div style={{ ...S.card, textAlign: "center", padding: "3rem" }}>
          <div style={{ fontSize: 42, marginBottom: "0.875rem" }}>🏁</div>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Aucune session enregistrée</div>
          <div style={{ color: C.muted, fontSize: 13 }}>Simulez une course hybride et sauvegardez le résultat.</div>
        </div>
      ) : (
        <>
          <div style={{ display: "flex", gap: "0.625rem", flexWrap: "wrap", marginBottom: "1rem" }}>
            {[
              { v: bestPace || "--", l: "Meilleure allure", c: C.accent },
              { v: bestTime ? fmtTime(bestTime) : "--", l: "Meilleur temps", c: C.info },
              { v: avgTime ? fmtTime(avgTime) : "--", l: "Temps moyen", c: C.warning },
              { v: records.length, l: "Sessions", c: C.muted },
            ].map((m, i) => (
              <div key={i} style={{ ...S.metric(m.c), flex: "1 1 110px" }}>
                <div style={{ ...S.metricVal, color: m.c, fontSize: 19 }}>{m.v}</div>
                <div style={S.metricLabel}>{m.l}</div>
              </div>
            ))}
          </div>

          {trend.length > 1 && (
            <div style={S.card}>
              <h2 style={S.h2}>Évolution du temps total</h2>
              <Sparkline data={trend} color={C.accent} h={56} w={700} />
              <div style={{ fontSize: 11, color: C.muted, marginTop: 5 }}>{trend.length} sessions récentes</div>
            </div>
          )}

          <div style={S.card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.875rem" }}>
              <h2 style={{ ...S.h2, marginBottom: 0 }}>Sessions récentes</h2>
              <div style={{ display: "flex", gap: 8 }}>
                <button style={S.btn("secondary")} onClick={handleExportPDF}>📄 PDF</button>
                <button style={S.btn("danger")} onClick={onClear}>🗑 Effacer</button>
              </div>
            </div>
            {[...records].reverse().slice(0, 15).map((r, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: `1px solid ${C.border}`, fontSize: 13 }}>
                <div>
                  <span style={{ fontWeight: 600 }}>{new Date(r.date).toLocaleDateString("fr-FR")}</span>
                  <span style={{ ...S.badge(C.muted), marginLeft: 8 }}>{r.format}</span>
                  {r.cat && <span style={{ ...S.badge(C.info), marginLeft: 4 }}>{CAT_KEY[r.cat]}</span>}
                </div>
                <div style={{ display: "flex", gap: "0.875rem", alignItems: "center" }}>
                  <span style={{ color: C.muted }}>{r.pace}/km</span>
                  <span style={{ fontWeight: 800, color: C.accent, fontFamily: "monospace" }}>{fmtTime(r.totalTime)}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── 7. PERFORMANCE METRICS ───────────────────────────────────────────────────
function PerformanceMetrics() {
  const [pace, setPace] = useState("5:00");
  const [weight, setWeight] = useState(72);
  const [hrRest, setHrRest] = useState(55);
  const [hrMax, setHrMax] = useState(190);
  const [hrCurrent, setHrCurrent] = useState(165);
  const [age, setAge] = useState(32);
  const [sex, setSex] = useState("m");

  const kmh = paceToKmh(pace) || 12;
  const hrR = hrMax - hrRest;

  const zones = [
    { z: "Z1 Récupération", lo: 0.50, hi: 0.60, c: C.info },
    { z: "Z2 Endurance", lo: 0.60, hi: 0.70, c: C.accent },
    { z: "Z3 Aérobie modéré", lo: 0.70, hi: 0.80, c: "#90EE90" },
    { z: "Z4 Seuil anaérobique", lo: 0.80, hi: 0.90, c: C.warning },
    { z: "Z5 VO2max", lo: 0.90, hi: 1.00, c: C.danger },
  ].map((z) => ({
    ...z,
    loHr: Math.round(hrRest + hrR * z.lo),
    hiHr: Math.round(hrRest + hrR * z.hi),
    inZone: hrCurrent >= Math.round(hrRest + hrR * z.lo) && hrCurrent < Math.round(hrRest + hrR * z.hi),
  }));

  // VO2max — formule Uth-Sorensen
  const vo2raw = Math.round(15 * (hrMax / Math.max(hrRest, 1)));
  const vo2adj = Math.round(vo2raw * (sex === "f" ? 0.92 : 1) * Math.max(0.7, 1 - (age - 25) * 0.006));
  const economyScore = Math.min(100, Math.round((kmh / (hrCurrent / 100)) * 4));
  const fatigueIdx = Math.round(Math.max(0, (hrCurrent / hrMax) * 100 - 70));

  return (
    <div>
      <SectionHeader icon="🔬" title="Métriques de Performance" sub="Zones FC Karvonen personnalisées · VO2max estimé · économie de course" />
      <div style={S.grid2}>
        <div style={S.card}>
          <h2 style={S.h2}>Profil athlète</h2>
          <TabToggle options={[["m","Homme"],["f","Femme"]]} value={sex} onChange={setSex} />
          <RangeRow label="Âge" val={age} set={setAge} min={15} max={80} unit=" ans" />
          <RangeRow label="Poids" val={weight} set={setWeight} min={40} max={130} unit=" kg" />
          <label style={S.label}>Allure de référence</label>
          <input style={{ ...S.input, marginBottom: "1rem" }} value={pace} onChange={(e) => setPace(e.target.value)} placeholder="5:00" />
          <RangeRow label="FC repos" val={hrRest} set={setHrRest} min={35} max={90} unit=" bpm" />
          <RangeRow label="FC max" val={hrMax} set={setHrMax} min={150} max={220} unit=" bpm" />
          <RangeRow label="FC actuelle / effort" val={hrCurrent} set={setHrCurrent} min={hrRest} max={hrMax} unit=" bpm" />
        </div>

        <div style={S.card}>
          <h2 style={S.h2}>Indicateurs calculés</h2>
          <div style={{ display: "flex", gap: "0.625rem", flexWrap: "wrap", marginBottom: "1rem" }}>
            <div style={{ ...S.metric(C.accent), flex: "1 1 100px" }}>
              <div style={{ ...S.metricVal, color: C.accent }}>{vo2adj}</div>
              <div style={S.metricLabel}>VO2max estimé</div>
              <div style={{ fontSize: 9, color: C.muted, marginTop: 2 }}>ml/kg/min</div>
            </div>
            <div style={{ ...S.metric(C.info), flex: "1 1 100px" }}>
              <div style={{ ...S.metricVal, color: C.info }}>{economyScore}</div>
              <div style={S.metricLabel}>Économie course</div>
              <div style={{ fontSize: 9, color: C.muted, marginTop: 2 }}>/100</div>
            </div>
            <div style={{ ...S.metric(C.danger), flex: "1 1 100px" }}>
              <div style={{ ...S.metricVal, color: C.danger }}>{fatigueIdx}</div>
              <div style={S.metricLabel}>Index fatigue</div>
              <div style={{ fontSize: 9, color: C.muted, marginTop: 2 }}>/100</div>
            </div>
          </div>

          <div style={S.divider} />
          <h2 style={S.h2}>Zones FC — méthode Karvonen</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {zones.map((z, i) => (
              <div key={i} style={{ padding: "8px 10px", background: z.inZone ? `${z.c}18` : C.surface2, border: `1px solid ${z.inZone ? z.c : C.border}`, borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: z.c }}>{z.z}</span>
                  {z.inZone && <span style={{ ...S.badge(z.c), marginLeft: 6, fontSize: 9 }}>ACTUELLE</span>}
                </div>
                <span style={{ fontSize: 12, fontFamily: "monospace", color: C.text }}>{z.loHr}–{z.hiHr} bpm</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── TABS ─────────────────────────────────────────────────────────────────────
const TABS = [
  { id: "converter", label: "Allure",    icon: "⚡" },
  { id: "hybrid",    label: "Hybride",   icon: "🏁" },
  { id: "running",   label: "Course",    icon: "🏃" },
  { id: "strategy",  label: "Stratégie", icon: "📊" },
  { id: "nutrition", label: "Nutrition", icon: "🍬" },
  { id: "dashboard", label: "Bord",      icon: "📈" },
  { id: "metrics",   label: "Métriques", icon: "🔬" },
];

// ─── APP ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("converter");
  const [records, setRecords] = useState(() => load().records || []);

  useEffect(() => { save({ records }); }, [records]);

  const handleSave = useCallback((r) => {
    setRecords((prev) => [...prev, r]);
    setTab("dashboard");
  }, []);

  const handleClear = useCallback(() => {
    if (window.confirm("Effacer tout l'historique des sessions ?")) setRecords([]);
  }, []);

  const renderPage = () => {
    switch (tab) {
      case "converter":  return <PaceConverter />;
      case "hybrid":     return <RaceSimulator onSave={handleSave} />;
      case "running":    return <RunSimulator />;
      case "strategy":   return <StrategyAnalyzer />;
      case "nutrition":  return <NutritionCalc />;
      case "dashboard":  return <Dashboard records={records} onClear={handleClear} />;
      case "metrics":    return <PerformanceMetrics />;
      default:           return null;
    }
  };

  return (
    <div style={S.app}>
      <nav style={S.topBar}>
        <div style={S.logo}>
          <span>⚡</span>
          <span>Hybrid Race Pace Lab</span>
        </div>
        <span style={{ fontSize: 11, color: C.muted }}>by Marck Roger</span>
      </nav>

      <main style={S.page}>{renderPage()}</main>

      <footer style={{ textAlign: "center", padding: "1.5rem 1rem 5.5rem", color: C.muted, fontSize: 11, letterSpacing: "0.06em", borderTop: `1px solid ${C.border}` }}>
        <div style={{ fontWeight: 700, color: C.accent, letterSpacing: "0.12em", marginBottom: 3 }}>HYBRID RACE PACE LAB</div>
        <div>Outil personnel · Non affilié à une organisation officielle</div>
        <div style={{ marginTop: 4 }}>Créé par <span style={{ color: C.text, fontWeight: 600 }}>Marck Roger</span></div>
      </footer>

      <nav style={S.bottomNav}>
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} style={S.bottomBtn(tab === t.id)}>
            <span style={{ fontSize: 18 }}>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </nav>

      <CookieBanner />
    </div>
  );
}
