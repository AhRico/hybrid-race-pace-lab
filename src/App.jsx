import { useState, useEffect, useCallback, useMemo, useRef } from "react";

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  accent: "#00E5A0", accentDim: "#00b880",
  bg: "#0A0B0E", surface: "#111318", surface2: "#181C23", surface3: "#1E2330",
  border: "#1F2330", text: "#F0F2F8", muted: "#6B7080",
  danger: "#FF5C6A", warning: "#FFB84D", info: "#4DA6FF",
  purple: "#C084FC", pink: "#F472B6", green: "#34D399",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const pad = (n) => String(Math.floor(Math.abs(n))).padStart(2, "0");
const fmtTime = (s) => {
  if (!s || s <= 0) return "--";
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sc = Math.floor(s % 60);
  return h > 0 ? `${h}h${pad(m)}m${pad(sc)}s` : `${pad(m)}m${pad(sc)}s`;
};
const fmtMmSs = (s) => `${pad(s / 60)}:${pad(s % 60)}`;
const parseMmSs = (str) => {
  const p = String(str).split(":");
  if (p.length === 2) { const m = parseInt(p[0]) || 0, sc = parseInt(p[1]) || 0; return m * 60 + sc; }
  return parseInt(str) || 0;
};
const paceToKmh = (p) => {
  const parts = String(p).split(":");
  if (parts.length !== 2) return null;
  const m = parseFloat(parts[0]), s = parseFloat(parts[1]);
  if (isNaN(m) || isNaN(s) || m + s / 60 <= 0) return null;
  return 60 / (m + s / 60);
};
const kmhToPace = (kmh) => {
  if (!kmh || kmh <= 0) return "--:--";
  const t = 3600 / kmh;
  return `${Math.floor(t / 60)}:${pad(t % 60)}`;
};
const splitTime = (kmh, dist) => (!kmh || kmh <= 0) ? "--" : fmtTime((dist / kmh) * 3600);

// ─── Storage ──────────────────────────────────────────────────────────────────
const LS = "hrpl_v3";
const lsLoad = () => { try { return JSON.parse(localStorage.getItem(LS)) || {}; } catch { return {}; } };
const lsSave = (d) => { try { localStorage.setItem(LS, JSON.stringify(d)); } catch {} };

// ─── Station data (poids standards compétition hybride officielle) ────────────
// mRx = Homme Pro · fRx = Femme Pro · mSc = Homme Open · fSc = Femme Open
// mxRx = Mixte Pro (RX) · mxSc = Mixte Scaled (Open)
// Règle : Open Homme = Pro Femme (mSc = fRx)
const STATIONS = [
  { id: "skierg",   name: "SkiErg",            icon: "🎿", dist: "1 000 m",
    weights: { mRx: "—", fRx: "—", mSc: "—", fSc: "—", mxRx: "—", mxSc: "—" },
    defaultTime: { mRx: 270, fRx: 300, mSc: 300, fSc: 275, mxRx: 285, mxSc: 288 },
    tip: "Ergomètre ski 1 000 m. Pas de charge — effort cardio-respiratoire intense." },
  { id: "sledpush", name: "Sled Push",          icon: "🏋️", dist: "50 m × 8",
    weights: { mRx: "202 kg", fRx: "152 kg", mSc: "152 kg", fSc: "102 kg", mxRx: "202 kg / 152 kg", mxSc: "152 kg / 102 kg" },
    defaultTime: { mRx: 260, fRx: 225, mSc: 225, fSc: 200, mxRx: 243, mxSc: 213 },
    tip: "Pousser le traîneau 50 m. Pro H : 202 kg · Pro F & Open H : 152 kg · Open F : 102 kg." },
  { id: "sledpull", name: "Sled Pull",          icon: "💪", dist: "50 m × 8",
    weights: { mRx: "153 kg", fRx: "152 kg", mSc: "152 kg", fSc: "78 kg", mxRx: "153 kg / 152 kg", mxSc: "152 kg / 78 kg" },
    defaultTime: { mRx: 215, fRx: 210, mSc: 210, fSc: 175, mxRx: 213, mxSc: 193 },
    tip: "Tirer le traîneau à la corde 50 m. Pro H : 153 kg · Pro F & Open H : 152 kg · Open F : 78 kg." },
  { id: "burpee",   name: "Burpee Broad Jumps", icon: "🏃", dist: "80 m",
    weights: { mRx: "—", fRx: "—", mSc: "—", fSc: "—", mxRx: "—", mxSc: "—" },
    defaultTime: { mRx: 240, fRx: 220, mSc: 220, fSc: 190, mxRx: 230, mxSc: 205 },
    tip: "Burpees avec saut en longueur sur 80 m. Pas de charge — station très éprouvante cardio." },
  { id: "rowing",   name: "Rowing",             icon: "🚣", dist: "1 000 m",
    weights: { mRx: "—", fRx: "—", mSc: "—", fSc: "—", mxRx: "—", mxSc: "—" },
    defaultTime: { mRx: 270, fRx: 290, mSc: 290, fSc: 268, mxRx: 280, mxSc: 279 },
    tip: "Ergomètre à rames 1 000 m. Pas de charge — technique essentielle pour maintenir l'efficacité." },
  { id: "farmer",   name: "Farmer Carry",       icon: "🧳", dist: "200 m",
    weights: { mRx: "2 × 32 kg", fRx: "2 × 24 kg", mSc: "2 × 24 kg", fSc: "2 × 16 kg", mxRx: "2 × 32 kg / 2 × 24 kg", mxSc: "2 × 24 kg / 2 × 16 kg" },
    defaultTime: { mRx: 195, fRx: 175, mSc: 175, fSc: 155, mxRx: 185, mxSc: 165 },
    tip: "Farmer Carry 200 m kettlebells. Pro H : 2×32 kg · Pro F & Open H : 2×24 kg · Open F : 2×16 kg." },
  { id: "sandbag",  name: "Sandbag Lunges",     icon: "⚡", dist: "100 m",
    weights: { mRx: "30 kg", fRx: "20 kg", mSc: "20 kg", fSc: "10 kg", mxRx: "30 kg / 20 kg", mxSc: "20 kg / 10 kg" },
    defaultTime: { mRx: 290, fRx: 255, mSc: 255, fSc: 225, mxRx: 273, mxSc: 240 },
    tip: "Fentes avec sac de sable 100 m. Pro H : 30 kg · Pro F & Open H : 20 kg · Open F : 10 kg." },
  { id: "wallball", name: "Wall Balls",         icon: "🏀", dist: "100 reps",
    weights: { mRx: "9 kg / cible 9ft", fRx: "6 kg / cible 9ft", mSc: "6 kg / cible 7,5ft", fSc: "4 kg / cible 7,5ft", mxRx: "9 kg + 6 kg / cible 9ft", mxSc: "6 kg + 4 kg / cible 7,5ft" },
    defaultTime: { mRx: 255, fRx: 230, mSc: 230, fSc: 205, mxRx: 243, mxSc: 218 },
    tip: "100 lancers medball. Pro H : 9 kg · Pro F & Open H : 6 kg · Open F : 4 kg. Pro : cible 9ft · Open : cible 7,5ft." },
];
const ST_COLORS = ["#4DA6FF","#00E5A0","#FFB84D","#FF5C6A","#C084FC","#F472B6","#34D399","#FBBF24"];
const CATS = {
  mRx:  "Homme RX (Pro)",
  fRx:  "Femme RX (Pro)",
  mSc:  "Homme Scaled (Open)",
  fSc:  "Femme Scaled (Open)",
  mxRx: "Mixte RX (Pro)",
  mxSc: "Mixte Scaled (Open)",
};

// ─── Quick presets ────────────────────────────────────────────────────────────
const PRESETS = {
  debutant: { label: "🟢 Débutant", pace: "6:30", fat: 1.20, cat: "mSc", trans: 25,
    times: { skierg:330,sledpush:300,sledpull:270,burpee:300,rowing:340,farmer:220,sandbag:330,wallball:300 } },
  intermediaire: { label: "🟡 Intermédiaire", pace: "5:30", fat: 1.12, cat: "mRx", trans: 18,
    times: { skierg:280,sledpush:245,sledpull:215,burpee:250,rowing:285,farmer:185,sandbag:275,wallball:245 } },
  competiteur: { label: "🔴 Compétiteur RX", pace: "4:30", fat: 1.05, cat: "mRx", trans: 12,
    times: { skierg:240,sledpush:200,sledpull:180,burpee:210,rowing:245,farmer:155,sandbag:235,wallball:205 } },
  obj120: { label: "🏁 Objectif 1h20", pace: "4:50", fat: 1.07, cat: "mRx", trans: 14,
    times: { skierg:250,sledpush:210,sledpull:190,burpee:220,rowing:255,farmer:165,sandbag:245,wallball:215 } },
  obj130: { label: "🏁 Objectif 1h30", pace: "5:10", fat: 1.10, cat: "mRx", trans: 16,
    times: { skierg:265,sledpush:225,sledpull:200,burpee:235,rowing:270,farmer:175,sandbag:260,wallball:230 } },
  obj145: { label: "🏁 Objectif 1h45", pace: "5:50", fat: 1.15, cat: "mRx", trans: 20,
    times: { skierg:295,sledpush:260,sledpull:230,burpee:265,rowing:305,farmer:200,sandbag:290,wallball:265 } },
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const S = {
  app: { minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'DM Sans','Segoe UI',sans-serif", paddingBottom: 80 },
  topBar: { background: C.surface, borderBottom: `1px solid ${C.border}`, padding: "0 1.25rem", display: "flex", alignItems: "center", height: 52, position: "sticky", top: 0, zIndex: 100 },
  logo: { fontWeight: 800, fontSize: 14, letterSpacing: "-0.02em", color: C.accent, display: "flex", alignItems: "center", gap: 6 },
  bottomNav: { position: "fixed", bottom: 0, left: 0, right: 0, background: C.surface, borderTop: `1px solid ${C.border}`, display: "flex", zIndex: 100, padding: "6px 0 8px" },
  navBtn: (a) => ({ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "4px 2px", background: "none", border: "none", cursor: "pointer", color: a ? C.accent : C.muted, fontSize: 9, fontWeight: a ? 700 : 400, letterSpacing: "0.05em", transition: "color 0.15s" }),
  page: { maxWidth: 900, margin: "0 auto", padding: "1.25rem 1rem 1rem" },
  card: { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "1.25rem", marginBottom: "1rem" },
  h1: { fontSize: 20, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 2, color: C.text, margin: 0 },
  h2: { fontSize: 15, fontWeight: 700, marginBottom: "0.875rem", color: C.text, letterSpacing: "-0.01em", margin: "0 0 0.875rem" },
  label: { fontSize: 11, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 5, display: "block" },
  input: { width: "100%", background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 9, padding: "9px 12px", color: C.text, fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "inherit" },
  btn: (v = "p") => ({
    padding: "9px 16px", borderRadius: 9, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 12, letterSpacing: "0.04em", fontFamily: "inherit",
    background: v === "p" ? C.accent : v === "d" ? `${C.danger}22` : C.surface2,
    color: v === "p" ? "#000" : v === "d" ? C.danger : C.text,
  }),
  metric: (color = C.accent) => ({ background: C.surface2, borderRadius: 10, padding: "0.875rem 1rem", flex: 1, minWidth: 110, borderLeft: `3px solid ${color}` }),
  mv: { fontSize: 22, fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 1, marginBottom: 3 },
  ml: { fontSize: 10, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em" },
  badge: (c = C.accent) => ({ display: "inline-block", padding: "2px 8px", borderRadius: 20, background: `${c}22`, color: c, fontSize: 11, fontWeight: 700 }),
  divider: { borderTop: `1px solid ${C.border}`, margin: "1rem 0" },
  insight: (c = C.accent) => ({ background: `${c}10`, border: `1px solid ${c}28`, borderRadius: 9, padding: "0.625rem 0.875rem", fontSize: 12, color: C.text, marginBottom: 6, lineHeight: 1.5 }),
  grid2: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" },
  coachBox: { background: `${C.purple}12`, border: `1px solid ${C.purple}30`, borderRadius: 10, padding: "0.75rem 1rem", fontSize: 13, color: C.text, marginTop: "0.75rem", lineHeight: 1.6 },
  raceInsight: { borderRadius: 12, overflow: "hidden", marginBottom: "1rem" },
};

// ─── Tooltip ──────────────────────────────────────────────────────────────────
function Tip({ text, children }) {
  const [show, setShow] = useState(false);
  return (
    <span style={{ position: "relative", display: "inline-flex", alignItems: "center", gap: 4 }}>
      {children}
      <span
        onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}
        onClick={() => setShow(v => !v)}
        style={{ cursor: "help", fontSize: 11, color: C.muted, lineHeight: 1, border: `1px solid ${C.muted}44`, borderRadius: "50%", width: 14, height: 14, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>?</span>
      {show && (
        <span style={{ position: "absolute", bottom: "calc(100% + 6px)", left: 0, background: C.surface3, border: `1px solid ${C.border}`, borderRadius: 8, padding: "7px 10px", fontSize: 11, color: C.muted, width: 220, zIndex: 999, lineHeight: 1.5, boxShadow: "0 4px 20px #00000088" }}>
          {text}
        </span>
      )}
    </span>
  );
}

// ─── Reusable atoms ───────────────────────────────────────────────────────────
function TabToggle({ options, value, onChange }) {
  return (
    <div style={{ display: "flex", gap: 5, marginBottom: "1rem" }}>
      {options.map(([k, l]) => (
        <button key={k} onClick={() => onChange(k)} style={{ flex: 1, padding: "7px 5px", borderRadius: 8, border: `1px solid ${value === k ? C.accent : C.border}`, background: value === k ? `${C.accent}18` : "transparent", color: value === k ? C.accent : C.muted, fontSize: 12, fontWeight: value === k ? 700 : 400, cursor: "pointer", fontFamily: "inherit" }}>{l}</button>
      ))}
    </div>
  );
}

function RangeRow({ label, tip, val, set, min, max, step = 1, unit = "" }) {
  return (
    <div style={{ marginBottom: "1rem" }}>
      <label style={S.label}>
        <Tip text={tip}>{label}: <span style={{ color: C.text }}>{val}{unit}</span></Tip>
      </label>
      <input type="range" min={min} max={max} step={step} value={val}
        onChange={(e) => set(parseFloat(e.target.value))}
        style={{ width: "100%", accentColor: C.accent }} />
    </div>
  );
}

function MmSsInput({ label, tip, value, onChange, style: extraStyle }) {
  const [raw, setRaw] = useState(fmtMmSs(value));
  useEffect(() => { setRaw(fmtMmSs(value)); }, [value]);
  const commit = () => { const s = parseMmSs(raw); if (s > 0) onChange(s); };
  return (
    <div>
      {label && <label style={S.label}>{tip ? <Tip text={tip}>{label}</Tip> : label}</label>}
      <input style={{ ...S.input, ...extraStyle }} value={raw}
        onChange={(e) => setRaw(e.target.value)}
        onBlur={commit} onKeyDown={(e) => e.key === "Enter" && commit()}
        placeholder="mm:ss" />
    </div>
  );
}

function SectionHeader({ title, sub, icon }) {
  return (
    <div style={{ marginBottom: "1.25rem" }}>
      <h1 style={S.h1}>{icon && <span style={{ marginRight: 6 }}>{icon}</span>}{title}</h1>
      {sub && <p style={{ color: C.muted, fontSize: 13, margin: "4px 0 0" }}>{sub}</p>}
    </div>
  );
}

// ─── Sparkline ────────────────────────────────────────────────────────────────
function Sparkline({ data, color = C.accent, h = 52, w = 500 }) {
  if (!data || data.length < 2) return null;
  const mn = Math.min(...data), mx = Math.max(...data), rng = mx - mn || 1;
  const pts = data.map((v, i) =>
    `${((i / (data.length - 1)) * w).toFixed(1)},${(h - ((v - mn) / rng) * (h - 8) - 4).toFixed(1)}`
  ).join(" ");
  const last = pts.split(" ").at(-1).split(",");
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ display: "block" }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r="3" fill={color} />
    </svg>
  );
}

// ─── Donut ────────────────────────────────────────────────────────────────────
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
      <text x={cx} y={cy - 3} textAnchor="middle" fill={C.text} fontSize="11" fontWeight="700">{fmtTime(total)}</text>
      <text x={cx} y={cy + 10} textAnchor="middle" fill={C.muted} fontSize="8">total estimé</text>
    </svg>
  );
}

// ─── Fatigue curve (SVG) ──────────────────────────────────────────────────────
function FatigueCurve({ fatigue, stationTimes, runPace }) {
  const W = 500, H = 120;
  // 8 running segments + 8 stations, model performance decay
  const points = [];
  let t = 0, perf = 1.0;
  const runSec = 3600 / (paceToKmh(runPace) || 10.9);
  for (let i = 0; i < 8; i++) {
    const segLen = i === 0 ? 1 : 1; // each run seg = 1km
    t += runSec * segLen;
    perf = 1 / fatigue ** (i * 0.12);
    points.push({ t, perf, type: "run", label: `Run ${i + 1}` });
    const stTime = stationTimes[i] || 220;
    t += stTime;
    perf = 1 / fatigue ** ((i + 1) * 0.15);
    points.push({ t, perf, type: "station", label: `St ${i + 1}` });
  }
  const maxT = points.at(-1)?.t || 1;
  const toX = (tt) => (tt / maxT) * W;
  const toY = (p) => H - p * (H - 12) - 6;
  const pts = points.map((p) => `${toX(p.t).toFixed(1)},${toY(p.perf).toFixed(1)}`).join(" ");

  return (
    <div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ display: "block" }}>
        {/* Grid lines */}
        {[0.25, 0.5, 0.75, 1].map((g) => (
          <line key={g} x1="0" y1={toY(g)} x2={W} y2={toY(g)} stroke={C.border} strokeDasharray="4,4" />
        ))}
        {/* Station markers */}
        {points.filter(p => p.type === "station").map((p, i) => (
          <rect key={i} x={toX(p.t) - 3} y={0} width={6} height={H} fill={`${ST_COLORS[i]}18`} />
        ))}
        {/* Curve */}
        <polyline points={pts} fill="none" stroke={C.accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => (
          <circle key={i} cx={toX(p.t)} cy={toY(p.perf)} r={p.type === "station" ? 4 : 3}
            fill={p.type === "station" ? C.warning : C.accent} />
        ))}
        {/* Labels */}
        <text x={4} y={toY(1) + 4} fill={C.muted} fontSize="9">100%</text>
        <text x={4} y={toY(0.5) + 4} fill={C.muted} fontSize="9">50%</text>
      </svg>
      <div style={{ display: "flex", gap: 10, fontSize: 10, color: C.muted, marginTop: 4 }}>
        <span>● <span style={{ color: C.accent }}>Course</span></span>
        <span>● <span style={{ color: C.warning }}>Station</span></span>
        <span style={{ marginLeft: "auto" }}>Performance relative au fil des stations</span>
      </div>
    </div>
  );
}

// ─── Race Insight block ───────────────────────────────────────────────────────
function RaceInsight({ force, risk, optim }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {[
        { emoji: "💪", label: "Force", text: force, c: C.accent },
        { emoji: "⚠️", label: "Risque", text: risk, c: C.warning },
        { emoji: "🎯", label: "Optimisation", text: optim, c: C.info },
      ].map(({ emoji, label, text, c }) => (
        <div key={label} style={{ background: C.surface2, borderRadius: 9, padding: "0.625rem 0.875rem", borderLeft: `3px solid ${c}`, fontSize: 12, lineHeight: 1.5 }}>
          <span style={{ fontWeight: 700, color: c, marginRight: 6 }}>{emoji} {label}</span>{text}
        </div>
      ))}
    </div>
  );
}

// ─── PDF Export ───────────────────────────────────────────────────────────────
function exportPDF(title, rows) {
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title>
<style>body{font-family:Arial,sans-serif;padding:28px;color:#111;max-width:720px;margin:0 auto}
h1{font-size:19px;border-bottom:2px solid #00b880;padding-bottom:6px;color:#0a0b0e}
h2{font-size:13px;color:#444;margin:18px 0 6px}
table{width:100%;border-collapse:collapse;margin:8px 0}
th{background:#f0f2f0;padding:6px 10px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.05em}
td{padding:6px 10px;border-bottom:1px solid #eee;font-size:12px}
.foot{margin-top:32px;font-size:10px;color:#999;border-top:1px solid #eee;padding-top:10px}
@media print{body{padding:12px}}</style></head><body>
<h1>⚡ Hybrid Race Pace Lab — ${title}</h1>
<p style="color:#666;font-size:11px">Généré le ${new Date().toLocaleDateString("fr-FR")} à ${new Date().toLocaleTimeString("fr-FR")}</p>
${rows.map(([sec, data]) => `<h2>${sec}</h2><table>
<thead><tr>${Object.keys(data[0]).map(k => `<th>${k}</th>`).join("")}</tr></thead>
<tbody>${data.map(r => `<tr>${Object.values(r).map(v => `<td>${v}</td>`).join("")}</tr>`).join("")}</tbody>
</table>`).join("")}
<div class="foot">Hybrid Race Pace Lab — Outil open source non affilié à une organisation officielle</div>
<script>window.onload=()=>window.print()</script></body></html>`);
  w.document.close();
}

// ─── Feedback modal ───────────────────────────────────────────────────────────
function FeedbackModal({ onClose }) {
  const [rating, setRating] = useState(0);
  const [msg, setMsg] = useState("");
  const [status, setStatus] = useState("idle"); // idle | sending | done | error

  const submit = async () => {
    if (rating === 0) return;
    setStatus("sending");
    try {
      const res = await fetch("https://formspree.io/f/meenbeyk", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ rating, message: msg }),
      });
      setStatus(res.ok ? "done" : "error");
    } catch {
      setStatus("error");
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "#000c", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: "1.5rem", maxWidth: 360, width: "100%", boxShadow: "0 16px 48px #000c" }}>
        {status === "done" ? (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: "0.75rem" }}>🎉</div>
            <div style={{ fontWeight: 700, fontSize: 16, color: C.accent, marginBottom: 6 }}>Merci pour ton avis !</div>
            <div style={{ fontSize: 13, color: C.muted, marginBottom: "1.25rem" }}>Ton retour aide à améliorer l'outil.</div>
            <button style={S.btn()} onClick={onClose}>Fermer</button>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h2 style={{ ...S.h2, margin: 0 }}>⭐ Donner un avis</h2>
              <button onClick={onClose} style={{ background: "none", border: "none", color: C.muted, fontSize: 20, cursor: "pointer", lineHeight: 1 }}>×</button>
            </div>
            <div style={{ fontSize: 12, color: C.muted, marginBottom: "0.875rem" }}>
              Ton avis est envoyé via <strong style={{ color: C.text }}>Formspree</strong> (service tiers). Il n'est pas lié à ton profil et ne contient aucune donnée personnelle identifiante.
            </div>
            <label style={S.label}>Note globale</label>
            <div style={{ display: "flex", gap: 6, marginBottom: "1rem" }}>
              {[1,2,3,4,5].map(n => (
                <button key={n} onClick={() => setRating(n)}
                  style={{ flex: 1, fontSize: 22, background: n <= rating ? `${C.accent}22` : C.surface2, border: `1px solid ${n <= rating ? C.accent : C.border}`, borderRadius: 8, padding: "6px 0", cursor: "pointer", transition: "all 0.15s" }}>
                  {n <= rating ? "⭐" : "☆"}
                </button>
              ))}
            </div>
            <label style={S.label}>Commentaire (optionnel)</label>
            <textarea
              value={msg}
              onChange={e => setMsg(e.target.value)}
              placeholder="Dis-nous ce que tu en penses…"
              rows={3}
              style={{ ...S.input, resize: "vertical", marginBottom: "1rem", lineHeight: 1.5 }}
            />
            {status === "error" && (
              <div style={{ fontSize: 12, color: C.danger, marginBottom: "0.75rem" }}>Une erreur s'est produite. Réessaie.</div>
            )}
            <div style={{ display: "flex", gap: 8 }}>
              <button style={{ ...S.btn("p"), flex: 1, opacity: rating === 0 || status === "sending" ? 0.5 : 1 }}
                onClick={submit} disabled={rating === 0 || status === "sending"}>
                {status === "sending" ? "Envoi…" : "Envoyer"}
              </button>
              <button style={S.btn()} onClick={onClose}>Annuler</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Cookie banner ────────────────────────────────────────────────────────────
function CookieBanner() {
  const [on, setOn] = useState(() => !localStorage.getItem("hrpl_ck"));
  if (!on) return null;
  return (
    <div style={{ position: "fixed", bottom: 74, left: 10, right: 10, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "0.875rem 1rem", zIndex: 300, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", boxShadow: "0 8px 32px #000a" }}>
      <span style={{ flex: 1, fontSize: 12, color: C.muted, minWidth: 200 }}>
        🍪 Cette app utilise le <strong style={{ color: C.text }}>localStorage</strong> pour sauvegarder tes préférences (aucune donnée envoyée à nos serveurs). Si tu laisses un avis ou manifestes ton intérêt en tant que coach, ces données sont transmises à <strong style={{ color: C.text }}>Formspree</strong>, un service tiers sécurisé.
      </span>
      <div style={{ display: "flex", gap: 8 }}>
        <button style={S.btn("p")} onClick={() => { localStorage.setItem("hrpl_ck", "1"); setOn(false); }}>Accepter</button>
        <button style={S.btn()} onClick={() => setOn(false)}>Fermer</button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 1. PACE CONVERTER
// ══════════════════════════════════════════════════════════════════════════════
function PaceConverter() {
  const [mode, setMode] = useState("pace");
  const [paceIn, setPaceIn] = useState("5:00");
  const [kmhIn, setKmhIn] = useState("");

  const kmh = useMemo(() =>
    mode === "pace" ? paceToKmh(paceIn) : (parseFloat(kmhIn) || null),
    [mode, paceIn, kmhIn]
  );
  const pace = kmh ? kmhToPace(kmh) : "--:--";

  const splits = [
    { l: "400 m", km: 0.4 }, { l: "600 m", km: 0.6 }, { l: "800 m", km: 0.8 },
    { l: "1 km", km: 1 }, { l: "5 km", km: 5 }, { l: "10 km", km: 10 },
    { l: "Semi (21,1 km)", km: 21.0975 }, { l: "Marathon (42,2 km)", km: 42.195 },
    { l: "8 km hybride", km: 8, hi: true },
  ];

  // Coach interpretation
  const coachMsg = useMemo(() => {
    if (!kmh) return null;
    if (kmh >= 15) return "💨 Allure élite — niveau sub-4:00/km. Très rare en hybride complet.";
    if (kmh >= 12) return "🔥 Allure compétitrice solide. Vise un top 10-20% en hybride RX.";
    if (kmh >= 10) return "✅ Bonne allure intermédiaire. Cohérente avec un finish entre 1h20 et 1h45.";
    if (kmh >= 8)  return "🟡 Allure modérée. Économise de l'énergie pour les stations — stratégie valide.";
    return "🟢 Allure prudente. Idéal pour découvrir le format sans s'épuiser en course.";
  }, [kmh]);

  return (
    <div>
      <SectionHeader icon="⚡" title="Convertisseur Allure & Vitesse" sub="Conversion instantanée · splits · zones d'entraînement" />
      <div style={S.grid2}>
        <div style={S.card}>
          <TabToggle options={[["pace","Allure min/km"],["speed","Vitesse km/h"]]} value={mode} onChange={setMode} />
          {mode === "pace"
            ? <><label style={S.label}>Allure (ex : 5:30)</label><input style={S.input} value={paceIn} onChange={e => setPaceIn(e.target.value)} placeholder="5:00" /></>
            : <><label style={S.label}>Vitesse (km/h)</label><input style={S.input} type="number" value={kmhIn} onChange={e => setKmhIn(e.target.value)} placeholder="12" /></>
          }
          <div style={{ display: "flex", gap: "0.625rem", marginTop: "1rem", flexWrap: "wrap" }}>
            <div style={S.metric(C.accent)}><div style={{ ...S.mv, color: C.accent }}>{pace}</div><div style={S.ml}>min/km</div></div>
            <div style={S.metric(C.info)}><div style={{ ...S.mv, color: C.info }}>{kmh ? kmh.toFixed(2) : "--"}</div><div style={S.ml}>km/h</div></div>
            <div style={S.metric(C.muted)}><div style={{ ...S.mv, color: C.muted, fontSize: 17 }}>{kmh ? kmhToPace(kmh / 1.60934) : "--:--"}</div><div style={S.ml}>min/mile</div></div>
          </div>
          {coachMsg && <div style={S.coachBox}>🧠 <strong>Coach :</strong> {coachMsg}</div>}
        </div>

        <div style={S.card}>
          <h2 style={S.h2}>Temps au split</h2>
          {splits.map(s => (
            <div key={s.l} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: `1px solid ${C.border}`, fontSize: 13 }}>
              <span style={{ color: s.hi ? C.accent : C.muted, fontWeight: s.hi ? 700 : 400 }}>{s.l}</span>
              <span style={{ fontWeight: 700, color: s.hi ? C.accent : C.text, fontFamily: "monospace" }}>{splitTime(kmh, s.km)}</span>
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
            { z: "Z3 Tempo", mult: 1.06, c: C.green },
            { z: "Z4 Seuil", mult: 0.97, c: C.warning },
            { z: "Z5 VO2max", mult: 0.90, c: C.danger },
          ].map(z => (
            <div key={z.z} style={{ ...S.metric(z.c), flex: "1 1 110px" }}>
              <div style={{ ...S.mv, fontSize: 17, color: z.c }}>{kmh ? kmhToPace(kmh * (1 / z.mult)) : "--:--"}</div>
              <div style={S.ml}>{z.z}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 2. HYBRID RACE SIMULATOR
// ══════════════════════════════════════════════════════════════════════════════
function RaceSimulator() {
  const [pace, setPace] = useState("5:30");
  const [cat, setCat] = useState("fSc");
  const [format, setFormat] = useState("solo");
  const [transition, setTransition] = useState(15);
  const [fatigue, setFatigue] = useState(1.08);

  const [times, setTimes] = useState(() =>
    Object.fromEntries(STATIONS.map(s => [s.id, s.defaultTime?.fSc ?? 60]))
  );

  const isMixed = cat === "mxRx" || cat === "mxSc";

  // Force format constraints for mixed categories
  useEffect(() => {
    if (isMixed && format === "solo") {
      setFormat("doubles");
    }
  }, [cat]);

  // Reset station times when category changes
  useEffect(() => {
    setTimes(
      Object.fromEntries(
        STATIONS.map(s => [
          s.id,
          s.defaultTime?.[cat] ??
          s.defaultTime?.fSc ??
          60
        ])
      )
    );
  }, [cat]);

  const applyPreset = (key) => {
    const p = PRESETS[key];
    setPace(p.pace);
    setFatigue(p.fat);
    setCat(p.cat);
    setTransition(p.trans);
    setTimes(p.times);
  };

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

  const worstStation = STATIONS.reduce((a, b) =>
    times[b.id] > times[a.id] ? b : a
  );

  const runPct = ((runTime / total) * 100).toFixed(0);
  const trPct = ((trTime / total) * 100).toFixed(0);

  const coachMsg = useMemo(() => {
    const totalMin = total / 60;
    if (totalMin < 75) return "🔥 Niveau élite. Résultat très compétitif en catégorie RX.";
    if (totalMin < 90) return "✅ Excellent résultat. Tu vises le top 10-15%.";
    if (totalMin < 105) return "🟡 Bon niveau intermédiaire. Progression possible.";
    if (totalMin < 120) return "🟢 Bon finish pour un format hybride.";
    return "🎯 Finish OK. Priorité : stations.";
  }, [total]);

  const force =
    kmh >= 13
      ? "🔥 Excellent profil coureur."
      : kmh >= 11.5
        ? "💪 Bon profil coureur."
        : kmh >= 10
          ? "⚠️ Profil équilibré."
          : "🏃 Axe majeur : course à pied.";

  const risk =
    fatigue > 1.15
      ? `Fatigue élevée — ralentissement probable fin de course.`
      : trTime > 150
        ? `Transitions lentes — gain facile.`
        : `Station ${worstStation.name} prioritaire.`;

  const optim =
    trTime > 150
      ? `Transitions à 10s = gros gain chrono.`
      : `Améliorer ${worstStation.name} de 20%.`;

  const handleExportPDF = () => {
    const catLabel = CATS[cat] ?? cat;
    const formatLabel = format === "solo" ? "Solo" : format === "doubles" ? "Doubles" : "Relais";
    const avgKmh = kmh.toFixed(2);
    const avgPace = kmhToPace(kmh);
    exportPDF(
      `Plan de course — ${catLabel} — ${formatLabel} — ${fmtTime(total)}`,
      [
        ["Résumé course (8 km)", [
          { Segment: "Course (8 km)", Durée: fmtTime(runTime), "%": `${runPct}%`, "Allure moy.": `${avgPace}/km`, "Vitesse moy.": `${avgKmh} km/h` },
          { Segment: "Stations", Durée: fmtTime(stTime), "%": `${((stTime / total) * 100).toFixed(0)}%`, "Allure moy.": "—", "Vitesse moy.": "—" },
          { Segment: "Transitions", Durée: fmtTime(trTime), "%": `${trPct}%`, "Allure moy.": "—", "Vitesse moy.": "—" },
          { Segment: "TOTAL", Durée: fmtTime(total), "%": "100%", "Allure moy.": "—", "Vitesse moy.": "—" },
        ]],
        ["Stations fonctionnelles", STATIONS.map(s => ({
          Station: s.name,
          Distance: s.dist.replace(" × 8", "").replace("× 8", "").replace("×8", ""),
          Charge: s.weights?.[cat] ?? "—",
          "Temps estimé": fmtMmSs(times[s.id]),
          "Avec fatigue": fmtMmSs(Math.round(times[s.id] * fatigue)),
        }))],
        ["Analyse coach", [
          { Axe: "Force", Analyse: force },
          { Axe: "Risque", Analyse: risk },
          { Axe: "Optimisation", Analyse: optim },
          { Axe: "Global", Analyse: coachMsg },
        ]],
      ]
    );
  };

  return (
    <div>
      <SectionHeader
        icon="🏁"
        title="Simulateur Course Hybride"
        sub="8 km course + 8 stations fonctionnelles"
      />

      {/* Presets */}
      <div style={S.card}>
        <h2 style={S.h2}>⚡ Scénarios rapides</h2>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {Object.entries(PRESETS).map(([k, p]) => (
            <button
              key={k}
              onClick={() => applyPreset(k)}
              style={{ ...S.btn(), fontSize: 11, padding: "7px 12px" }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Config */}
      <div style={S.card}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "0.75rem" }}>
          
          <div>
            <label style={S.label}>Catégorie</label>
            <select
              style={S.input}
              value={cat}
              onChange={e => setCat(e.target.value)}
            >
              <option value="fSc">Femme Scaled (Open)</option>
              <option value="mSc">Homme Scaled (Open)</option>
              <option value="fRx">Femme RX (Pro)</option>
              <option value="mRx">Homme RX (Pro)</option>
              <option value="mxSc">Mixte Scaled (Open)</option>
              <option value="mxRx">Mixte RX (Pro)</option>
            </select>
          </div>

          <div>
            <label style={S.label}>Format</label>
            <select
              style={S.input}
              value={format}
              onChange={e => setFormat(e.target.value)}
            >
              <option value="solo" disabled={isMixed}>Solo{isMixed ? " (non disponible en mixte)" : ""}</option>
              <option value="doubles">Doubles</option>
              <option value="relay">Relais</option>
            </select>
          </div>

          <div>
            <label style={S.label}>Allure course</label>
            <input
              style={S.input}
              value={pace}
              onChange={e => setPace(e.target.value)}
              placeholder="5:30"
            />
          </div>

          <MmSsInput
            label="Transition"
            value={transition}
            onChange={setTransition}
          />
        </div>

        <RangeRow
          label="Fatigue"
          val={fatigue}
          set={setFatigue}
          min={1}
          max={1.3}
          step={0.01}
          unit={` ×`}
        />
      </div>

      {/* Résultats & Insight — au-dessus des stations */}
      <div style={S.grid2}>
        <div style={S.card}>
          <h2 style={S.h2}>Résultat</h2>

          <Donut segs={donutSegs} size={130} />

          <div style={S.coachBox}>
            🧠 {coachMsg}
          </div>

          <button style={S.btn()} onClick={handleExportPDF}>
            📄 Export PDF
          </button>
        </div>

        <div style={S.card}>
          <h2 style={S.h2}>Insight</h2>
          <RaceInsight force={force} risk={risk} optim={optim} />
        </div>
      </div>

      {/* Stations */}
      <div style={S.card}>
        <h2 style={S.h2}>Stations Fonctionnelles</h2>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "0.6rem" }}>
          {STATIONS.map((s, i) => {
            const weight = s.weights?.[cat] ?? "—";

            return (
              <div key={s.id} style={{ background: C.surface2, padding: 12, borderRadius: 10 }}>
                
                <div style={{ fontSize: 11, color: C.muted }}>
                  {s.icon} {s.name}
                </div>

                <div style={{ fontSize: 12, marginTop: 4 }}>
                  🎯 {weight}
                </div>

                <MmSsInput
                  value={times[s.id]}
                  onChange={v =>
                    setTimes(prev => ({ ...prev, [s.id]: v }))
                  }
                />

                <div style={{ fontSize: 11, color: C.muted }}>
                  avec fatigue : {fmtMmSs(Math.round(times[s.id] * fatigue))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 3. RUN SIMULATOR (10k, semi, marathon)
// ══════════════════════════════════════════════════════════════════════════════
function RunSimulator() {
  const [dist, setDist] = useState("semi");
  const [pace, setPace] = useState("5:10");
  const [splitMode, setSplitMode] = useState("pos"); // pos = positive (slow down) | neg = negative (speed up)
  const [driftPct, setDriftPct] = useState(3);

  const KM = dist === "10k" ? 10 : dist === "semi" ? 21.0975 : 42.195;
  const kmh = paceToKmh(pace) || 11.6;

  const checkpoints = dist === "10k"
    ? [1,2,3,4,5,6,7,8,9,10]
    : dist === "semi"
    ? [5,10,15,21.0975]
    : [5,10,15,20,25,30,35,40,42.195];

  const getTimeAt = (km) => {
    const drift = splitMode === "pos"
  ? 1 - (km / KM) * (driftPct / 100) // slow down
  : 1 + (km / KM) * (driftPct / 100);  // speeds up
    return (km / (kmh * drift)) * 3600;
  };

  const totalTime = getTimeAt(KM);
  const wallKm = dist === "marathon" && splitMode === "pos" && driftPct > 8 ? Math.round(28 + (15 - driftPct) * 0.8) : null;

  const splits = checkpoints.map(km => ({
    km, time: getTimeAt(km),
    pace: kmhToPace(km / (getTimeAt(km) / 3600)),
  }));

  // Coach
  const coachMsg = useMemo(() => {
    if (splitMode === "neg" && driftPct > 3) return "💪 Split négatif avec accélération marquée — stratégie exigeante, assure-toi d'avoir les jambes pour finir fort.";
    if (splitMode === "neg") return "✅ Légère accélération en fin de course — stratégie classique de course bien gérée.";
    if (driftPct > 8) return "⚠️ Ralentissement fort prévu — surveille le mur. Départ trop agressif ?";
    if (driftPct > 4) return "🟡 Ralentissement modéré — pacing réaliste pour un effort soutenu.";
    return "✅ Pacing quasi-constant — excellent indicateur de maîtrise de l'allure.";
  }, [splitMode, driftPct]);

  const refs = dist === "10k"
    ? [["Élite H", "~27 min"], ["Élite F", "~30 min"], ["Sub 40 min", "4:00/km"], ["Sub 50 min", "5:00/km"]]
    : dist === "semi"
    ? [["Élite H", "~1h00"], ["Élite F", "~1h05"], ["Sub 1h30", "4:16/km"], ["Sub 2h00", "5:41/km"]]
    : [["Élite H", "~2h00"], ["Élite F", "~2h14"], ["Sub 3h00", "4:16/km"], ["Sub 4h00", "5:41/km"]];

  const handleExportPDF = () => {
    const distLabel = dist === "10k" ? "10 km" : dist === "semi" ? "Semi-marathon" : "Marathon";
    const stratLabel = splitMode === "pos" ? `Split positif — ralentissement ${driftPct}%` : `Split négatif — accélération ${driftPct}%`;
    exportPDF(`${distLabel} — ${fmtTime(totalTime)} — ${stratLabel}`, [
      ["Splits prévisionnels", splits.map(s => ({
        "Distance": `${s.km % 1 === 0 ? s.km : s.km.toFixed(1)} km`,
        "Temps cumulé": fmtTime(s.time),
        "Allure": s.pace + "/km",
      }))],
      ["Analyse coach", [
        { Axe: "Stratégie", Analyse: stratLabel },
        { Axe: "Temps estimé", Analyse: fmtTime(totalTime) },
        { Axe: "Allure moyenne", Analyse: kmhToPace(KM / (totalTime / 3600)) + "/km" },
        { Axe: "🧠 Conseil", Analyse: coachMsg.replace(/[💪✅🟡⚠️]/g, "").trim() },
        ...(wallKm ? [{ Axe: "⚠️ Risque", Analyse: `Mur possible vers le km ${wallKm} — départ conservateur recommandé.` }] : []),
      ]],
    ]);
  };

  return (
    <div>
      <SectionHeader icon="🏃" title="Simulateur Course à Pied" sub="10 km · semi-marathon · marathon — splits et stratégie de pacing" />
      <div style={S.grid2}>
        <div style={S.card}>
          <TabToggle options={[["10k","10 km"],["semi","Semi"],["marathon","Marathon"]]} value={dist} onChange={setDist} />
          <label style={S.label}>Allure cible (min/km)</label>
          <input style={{ ...S.input, marginBottom: "1rem" }} value={pace} onChange={e => setPace(e.target.value)} placeholder="5:10" />

          <label style={S.label}>
            <Tip text="Split positif = tu ralentis progressivement. Split négatif = tu accélères progressivement (plus difficile mais souvent plus efficace).">
              Stratégie de pacing
            </Tip>
          </label>
          <div style={{ display: "flex", gap: 5, marginBottom: "1rem" }}>
            {[["pos","Split positif (ralentissement)"],["neg","Split négatif (accélération)"]].map(([k,l]) => (
              <button key={k} onClick={() => setSplitMode(k)} style={{ flex:1, padding:"7px 5px", borderRadius:8, border:`1px solid ${splitMode===k?C.accent:C.border}`, background:splitMode===k?`${C.accent}18`:"transparent", color:splitMode===k?C.accent:C.muted, fontSize:11, fontWeight:splitMode===k?700:400, cursor:"pointer", fontFamily:"inherit" }}>{l}</button>
            ))}
          </div>

          <RangeRow
            label={splitMode === "pos" ? "Ralentissement progressif" : "Accélération progressive"}
            tip={splitMode === "pos" ? "% de ralentissement entre le premier et le dernier km." : "% d'accélération entre le premier et le dernier km."}
            val={driftPct} set={setDriftPct} min={0} max={20} unit="%" />

          <div style={{ display: "flex", gap: "0.625rem", flexWrap: "wrap" }}>
            <div style={S.metric(C.accent)}><div style={{ ...S.mv, color: C.accent, fontSize: 19 }}>{fmtTime(totalTime)}</div><div style={S.ml}>Temps estimé</div></div>
            <div style={S.metric(C.info)}><div style={{ ...S.mv, color: C.info, fontSize: 17 }}>{kmhToPace(KM / (totalTime / 3600))}</div><div style={S.ml}>Allure moy.</div></div>
          </div>

          {wallKm && <div style={{ ...S.insight(C.danger), marginTop: "0.75rem" }}>⚠️ Risque de mur vers le km {wallKm}. Partez 5 à 10 s/km plus lentement.</div>}
          <div style={S.coachBox}>🧠 <strong>Coach :</strong> {coachMsg}</div>
          <div style={{ marginTop: "0.875rem", display: "flex", gap: 8 }}>
            <button style={S.btn()} onClick={handleExportPDF}>📄 Exporter PDF</button>
          </div>
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
          <div style={S.divider} />
          <h2 style={S.h2}>Références</h2>
          {refs.map(([l, v]) => (
            <div key={l} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "4px 0", color: C.muted }}>
              <span>{l}</span><span style={{ fontWeight: 600, color: C.text }}>{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 4. STRATEGY ANALYZER
// ══════════════════════════════════════════════════════════════════════════════
function StrategyAnalyzer() {
  const [basePace, setBasePace] = useState("5:30");
  const [baseSt, setBaseSt] = useState(230);   // seconds
  const [baseTr, setBaseTr] = useState(20);    // seconds
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
  const maxG = Math.max(...scenarios.map(s => s.gain), 1);
  const best = [...scenarios].sort((a, b) => b.gain - a.gain)[0];

  const coachMsg = best.l === "Réduire transitions"
    ? "Les transitions sont ton levier n°1. C'est un gain quasi gratuit — pas besoin d'entraînement supplémentaire."
    : best.l === "Efficacité stations"
    ? "Tes stations sont le point d'amélioration principal. Intègre-les en circuit training à l'entraînement."
    : "La course est ton principal frein. Un travail de fond (VMA, seuil) te fera gagner le plus de temps.";

  return (
    <div>
      <SectionHeader icon="📊" title="Analyseur de Stratégie" sub="Comparez les scénarios et identifiez votre levier de progression n°1" />
      <div style={S.grid2}>
        <div style={S.card}>
          <h2 style={S.h2}>Base actuelle</h2>
          <label style={S.label}>Allure course</label>
          <input style={{ ...S.input, marginBottom: "0.875rem" }} value={basePace} onChange={e => setBasePace(e.target.value)} placeholder="5:30" />
          <MmSsInput label={<Tip text="Durée moyenne passée sur chaque station. Entrez en mm:ss (ex: 04:00).">Temps station moyen</Tip>}
            value={baseSt} onChange={setBaseSt} />
          <div style={{ marginTop: "0.875rem" }}>
            <MmSsInput label={<Tip text="Durée moyenne de transition entre course et station. Vise &lt; 15 s.">Temps transition moyen</Tip>}
              value={baseTr} onChange={setBaseTr} />
          </div>
          <div style={{ ...S.metric(), marginTop: "0.875rem" }}>
            <div style={S.mv}>{fmtTime(baseTotal)}</div>
            <div style={S.ml}>Temps total de base</div>
          </div>
        </div>
        <div style={S.card}>
          <h2 style={S.h2}>Hypothèses d'amélioration</h2>
          <RangeRow label="Gain allure" tip="Réduction en % du temps de course total." val={paceG} set={setPaceG} min={1} max={30} unit="%" />
          <RangeRow label="Gain stations" tip="Réduction en % du temps total sur les stations." val={stG} set={setStG} min={1} max={40} unit="%" />
          <RangeRow label="Gain transitions" tip="Réduction en % du temps de transition cumulé." val={trG} set={setTrG} min={0} max={100} unit="%" />
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
              Nouveau total : {fmtTime(baseTotal - s.gain)} · gain de {((s.gain / baseTotal) * 100).toFixed(1)}%
            </div>
          </div>
        ))}
        <div style={S.coachBox}>🧠 <strong>Coach :</strong> {coachMsg}</div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 5. NUTRITION
// ══════════════════════════════════════════════════════════════════════════════
function NutritionCalc() {
  const [weight, setWeight] = useState(72);
  const [duration, setDuration] = useState(90);
  const [intensity, setIntensity] = useState("modere");
  const [temp, setTemp] = useState(20);
  const [sex, setSex] = useState("m");
  const [hydLevel, setHydLevel] = useState("normal");
  const [nutrStrat, setNutrStrat] = useState("standard");

  const mult = { leger: 0.7, modere: 1.0, intense: 1.3, max: 1.6 }[intensity];
  const hydMult = { leger: 0.8, normal: 1.0, eleve: 1.25 }[hydLevel];
  const nutrMult = { aucune: 0.7, standard: 1.0, optimisee: 1.2 }[nutrStrat];
  const sexMult = sex === "f" ? 0.88 : 1;

  const carbPerH = Math.round((40 + (weight - 70) * 0.3) * mult * sexMult * nutrMult);
  const hydPerH  = Math.round((500 + (temp - 15) * 25) * mult * hydMult);
  const sodium   = Math.round(600 * mult * hydMult * (duration / 60));
  const gels     = Math.ceil(carbPerH * (duration / 60) / 22);

  const timeline = [];
  for (let t = 20; t <= duration; t += 20)
    timeline.push({ t, carbs: Math.round(carbPerH * 20 / 60), water: Math.round(hydPerH * 20 / 60) });

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
          <div style={{ display: "flex", gap: 5, marginBottom: "1rem" }}>
            {[["leger","Léger"],["modere","Modéré"],["intense","Intense"],["max","Max"]].map(([k,l]) => (
              <button key={k} onClick={() => setIntensity(k)} style={{ flex:1, padding:"6px 4px", borderRadius:7, border:`1px solid ${intensity===k?C.accent:C.border}`, background:intensity===k?`${C.accent}18`:"transparent", color:intensity===k?C.accent:C.muted, fontSize:11, fontWeight:intensity===k?700:400, cursor:"pointer", fontFamily:"inherit" }}>{l}</button>
            ))}
          </div>

          {/* Optional params */}
          <div style={{ background: C.surface2, borderRadius: 10, padding: "0.875rem", border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: "0.625rem", textTransform: "uppercase", letterSpacing: "0.08em" }}>Paramètres optionnels</div>
            <label style={S.label}><Tip text="Léger = peu de sueur, Normal = standard, Élevé = grande transpiration ou chaleur.">Niveau d'hydratation</Tip></label>
            <div style={{ display: "flex", gap: 5, marginBottom: "0.75rem" }}>
              {[["leger","Léger"],["normal","Normal"],["eleve","Élevé"]].map(([k,l]) => (
                <button key={k} onClick={() => setHydLevel(k)} style={{ flex:1, padding:"6px 4px", borderRadius:7, border:`1px solid ${hydLevel===k?C.info:C.border}`, background:hydLevel===k?`${C.info}18`:"transparent", color:hydLevel===k?C.info:C.muted, fontSize:11, fontWeight:hydLevel===k?700:400, cursor:"pointer", fontFamily:"inherit" }}>{l}</button>
              ))}
            </div>
            <label style={S.label}><Tip text="Aucune = eau seule. Standard = gels + eau. Optimisée = gels + boisson iso + électrolytes.">Stratégie nutrition</Tip></label>
            <div style={{ display: "flex", gap: 5 }}>
              {[["aucune","Aucune"],["standard","Standard"],["optimisee","Optimisée"]].map(([k,l]) => (
                <button key={k} onClick={() => setNutrStrat(k)} style={{ flex:1, padding:"6px 4px", borderRadius:7, border:`1px solid ${nutrStrat===k?C.purple:C.border}`, background:nutrStrat===k?`${C.purple}18`:"transparent", color:nutrStrat===k?C.purple:C.muted, fontSize:11, fontWeight:nutrStrat===k?700:400, cursor:"pointer", fontFamily:"inherit" }}>{l}</button>
              ))}
            </div>
          </div>
        </div>

        <div style={S.card}>
          <h2 style={S.h2}>Recommandations</h2>
          <div style={{ display: "flex", gap: "0.625rem", flexWrap: "wrap", marginBottom: "1rem" }}>
            <div style={S.metric(C.accent)}><div style={{ ...S.mv, color: C.accent }}>{carbPerH}g</div><div style={S.ml}>glucides/h</div></div>
            <div style={S.metric(C.info)}><div style={{ ...S.mv, color: C.info }}>{hydPerH}ml</div><div style={S.ml}>eau/h</div></div>
            <div style={S.metric(C.warning)}><div style={{ ...S.mv, color: C.warning, fontSize: 17 }}>{sodium}mg</div><div style={S.ml}>sodium total</div></div>
            <div style={S.metric(C.purple)}><div style={{ ...S.mv, color: C.purple }}>{gels}</div><div style={S.ml}>gels ~22g</div></div>
          </div>
          <div style={S.divider} />
          <h2 style={S.h2}>Timeline ravitaillement</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {timeline.length === 0
              ? <div style={{ color: C.muted, fontSize: 12 }}>Durée trop courte pour un ravitaillement planifié.</div>
              : timeline.map((t, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 10px", background: C.surface2, borderRadius: 7, fontSize: 12 }}>
                  <span style={S.badge(C.muted)}>T+{t.t}min</span>
                  <span style={{ color: C.accent }}>🍬 {t.carbs}g</span>
                  <span style={{ color: C.info }}>💧 {t.water}ml</span>
                </div>
              ))
            }
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 6. DASHBOARD
// ══════════════════════════════════════════════════════════════════════════════
function Dashboard({ records, onClear }) {
  const bestTime = records.length ? Math.min(...records.map(r => r.totalTime)) : null;
  const bestPace = records.length ? records.reduce((a, b) => (paceToKmh(a.pace)||0) > (paceToKmh(b.pace)||0) ? a : b).pace : null;
  const avgTime  = records.length ? records.reduce((a, b) => a + b.totalTime, 0) / records.length : null;
  const trend    = records.slice(-12).map(r => r.totalTime);

  const handleExportPDF = () => {
    if (!records.length) return;
    exportPDF("Historique des sessions", [
      ["Sessions", records.map((r, i) => ({
        "#": i + 1,
        Date: new Date(r.date).toLocaleDateString("fr-FR"),
        Format: r.format,
        Catégorie: r.cat ? CATS[r.cat] : "—",
        Allure: r.pace + "/km",
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
                <div style={{ ...S.mv, color: m.c, fontSize: 19 }}>{m.v}</div>
                <div style={S.ml}>{m.l}</div>
              </div>
            ))}
          </div>

          {trend.length > 1 && (
            <div style={S.card}>
              <h2 style={S.h2}>Évolution du temps total</h2>
              <Sparkline data={trend} color={C.accent} h={56} w={700} />
              <div style={{ fontSize: 11, color: C.muted, marginTop: 5 }}>{trend.length} sessions · tendance {trend.at(-1) < trend[0] ? "↗ progression" : "→ stable"}</div>
            </div>
          )}

          <div style={S.card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.875rem" }}>
              <h2 style={{ ...S.h2, marginBottom: 0 }}>Sessions récentes</h2>
              <div style={{ display: "flex", gap: 8 }}>
                <button style={S.btn()} onClick={handleExportPDF}>📄 PDF</button>
                <button style={S.btn("d")} onClick={onClear}>🗑 Effacer</button>
              </div>
            </div>
            {[...records].reverse().slice(0, 15).map((r, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: `1px solid ${C.border}`, fontSize: 13 }}>
                <div>
                  <span style={{ fontWeight: 600 }}>{new Date(r.date).toLocaleDateString("fr-FR")}</span>
                  <span style={{ ...S.badge(C.muted), marginLeft: 8 }}>{r.format}</span>
                  {r.cat && <span style={{ ...S.badge(C.info), marginLeft: 4 }}>{CATS[r.cat]}</span>}
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

// ══════════════════════════════════════════════════════════════════════════════
// 7. PERFORMANCE METRICS
// ══════════════════════════════════════════════════════════════════════════════
function PerformanceMetrics() {
  const [pace, setPace]     = useState("5:00");
  const [hrRest, setHrRest] = useState(55);
  const [hrMax, setHrMax]   = useState(190);
  const [hrNow, setHrNow]   = useState(165);
  const [age, setAge]       = useState(32);
  const [sex, setSex]       = useState("m");
  const [weight, setWeight] = useState(72);

  const kmh = paceToKmh(pace) || 12;
  const hrR = hrMax - hrRest;

  const zones = [
    { z: "Z1 Récupération",      lo: 0.50, hi: 0.60, c: C.info },
    { z: "Z2 Endurance",         lo: 0.60, hi: 0.70, c: C.accent },
    { z: "Z3 Aérobie modéré",    lo: 0.70, hi: 0.80, c: C.green },
    { z: "Z4 Seuil anaérobique", lo: 0.80, hi: 0.90, c: C.warning },
    { z: "Z5 VO2max",            lo: 0.90, hi: 1.00, c: C.danger },
  ].map(z => ({
    ...z,
    loHr: Math.round(hrRest + hrR * z.lo),
    hiHr: Math.round(hrRest + hrR * z.hi),
    inZone: hrNow >= Math.round(hrRest + hrR * z.lo) && hrNow < Math.round(hrRest + hrR * z.hi),
  }));

  const vo2raw = Math.round(15 * (hrMax / Math.max(hrRest, 1)));
  const vo2adj = Math.round(vo2raw * (sex === "f" ? 0.92 : 1) * Math.max(0.7, 1 - (age - 25) * 0.006));
  const economyScore = Math.min(100, Math.round((kmh / (hrNow / 100)) * 4));
  const fatigueIdx = Math.round(Math.max(0, (hrNow / hrMax) * 100 - 70));

  const currentZone = zones.find(z => z.inZone);

  return (
    <div>
      <SectionHeader icon="🔬" title="Métriques de Performance" sub="Zones FC Karvonen personnalisées · VO2max estimé · économie de course" />
      <div style={S.grid2}>
        <div style={S.card}>
          <h2 style={S.h2}>Profil athlète</h2>
          <TabToggle options={[["m","Homme"],["f","Femme"]]} value={sex} onChange={setSex} />
          <RangeRow label="Âge" tip="L'âge ajuste l'estimation du VO2max." val={age} set={setAge} min={15} max={80} unit=" ans" />
          <RangeRow label="Poids" tip="Utilisé pour les calculs de VO2max et nutrition." val={weight} set={setWeight} min={40} max={130} unit=" kg" />
          <label style={S.label}>Allure de référence</label>
          <input style={{ ...S.input, marginBottom: "1rem" }} value={pace} onChange={e => setPace(e.target.value)} placeholder="5:00" />
          <RangeRow label="FC repos" tip="Mesurée le matin au réveil, au calme." val={hrRest} set={setHrRest} min={35} max={90} unit=" bpm" />
          <RangeRow label="FC max" tip="FC maximale constatée à l'effort. Peut différer de la formule 220 − âge." val={hrMax} set={setHrMax} min={150} max={220} unit=" bpm" />
          <RangeRow label="FC effort actuel" tip="FC mesurée pendant l'entraînement ou la course." val={hrNow} set={setHrNow} min={hrRest} max={hrMax} unit=" bpm" />
        </div>

        <div style={S.card}>
          <h2 style={S.h2}>Indicateurs</h2>
          <div style={{ display: "flex", gap: "0.625rem", flexWrap: "wrap", marginBottom: "1rem" }}>
            <div style={{ ...S.metric(C.accent), flex: "1 1 100px" }}>
              <div style={{ ...S.mv, color: C.accent }}>{vo2adj}</div>
              <div style={S.ml}>VO2max estimé</div>
              <div style={{ fontSize: 9, color: C.muted, marginTop: 2 }}>ml/kg/min</div>
            </div>
            <div style={{ ...S.metric(C.info), flex: "1 1 100px" }}>
              <div style={{ ...S.mv, color: C.info }}>{economyScore}</div>
              <div style={S.ml}>Économie course</div>
              <div style={{ fontSize: 9, color: C.muted, marginTop: 2 }}>/100</div>
            </div>
            <div style={{ ...S.metric(C.danger), flex: "1 1 100px" }}>
              <div style={{ ...S.mv, color: C.danger }}>{fatigueIdx}</div>
              <div style={S.ml}>Index fatigue</div>
              <div style={{ fontSize: 9, color: C.muted, marginTop: 2 }}>/100</div>
            </div>
          </div>

          {currentZone && (
            <div style={{ ...S.insight(currentZone.c), marginBottom: "0.875rem" }}>
              Vous êtes en <strong>{currentZone.z}</strong> — {
                currentZone.lo < 0.6 ? "zone de récupération active, idéale pour sortie légère." :
                currentZone.lo < 0.7 ? "endurance fondamentale, base de tout entraînement." :
                currentZone.lo < 0.8 ? "aérobie modéré, améliore la puissance aérobie." :
                currentZone.lo < 0.9 ? "seuil — zone clé pour progresser en compétition." :
                "VO2max — effort maximal, court et intense."
              }
            </div>
          )}

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

// ══════════════════════════════════════════════════════════════════════════════
// COACH INTEREST MODAL
// ══════════════════════════════════════════════════════════════════════════════
function CoachModal({ onClose }) {
  const [form, setForm] = useState({ name: "", city: "", speciality: "", contact: "" });
  const [status, setStatus] = useState("idle");

  const set = (k) => (e) => setForm(prev => ({ ...prev, [k]: e.target.value }));

  const submit = async () => {
    if (!form.name || !form.contact) return;
    setStatus("sending");
    try {
      const res = await fetch("https://formspree.io/f/meenbeyk", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ type: "coach", ...form }),
      });
      setStatus(res.ok ? "done" : "error");
    } catch {
      setStatus("error");
    }
  };

  const ready = form.name.trim() && form.contact.trim();

  return (
    <div style={{ position: "fixed", inset: 0, background: "#000c", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: "1.5rem", maxWidth: 380, width: "100%", boxShadow: "0 16px 48px #000c" }}>
        {status === "done" ? (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: "0.75rem" }}>🎉</div>
            <div style={{ fontWeight: 700, fontSize: 16, color: C.purple, marginBottom: 6 }}>Demande reçue !</div>
            <div style={{ fontSize: 13, color: C.muted, marginBottom: "1.25rem", lineHeight: 1.5 }}>On te recontacte dès que l'annuaire ouvre. Merci de ta confiance !</div>
            <button style={S.btn()} onClick={onClose}>Fermer</button>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h2 style={{ ...S.h2, margin: 0, color: C.purple }}>💼 Rejoindre l'annuaire</h2>
              <button onClick={onClose} style={{ background: "none", border: "none", color: C.muted, fontSize: 20, cursor: "pointer", lineHeight: 1 }}>×</button>
            </div>
            <div style={{ fontSize: 12, color: C.muted, marginBottom: "1rem", lineHeight: 1.5 }}>
              Tes informations sont envoyées via <strong style={{ color: C.text }}>Formspree</strong> (service tiers sécurisé). Elles ne seront utilisées que pour te recontacter au lancement.
            </div>

            {[
              { key: "name",       label: "Nom / Prénom *",          placeholder: "Jean Dupont" },
              { key: "city",       label: "Ville",                    placeholder: "Lyon" },
              { key: "speciality", label: "Spécialité / niveau coaché", placeholder: "RX, Open, débutants…" },
              { key: "contact",    label: "Email ou Instagram *",     placeholder: "jean@coach.fr ou @jean_coach" },
            ].map(f => (
              <div key={f.key} style={{ marginBottom: "0.75rem" }}>
                <label style={S.label}>{f.label}</label>
                <input
                  style={S.input}
                  value={form[f.key]}
                  onChange={set(f.key)}
                  placeholder={f.placeholder}
                />
              </div>
            ))}

            {status === "error" && (
              <div style={{ fontSize: 12, color: C.danger, marginBottom: "0.75rem" }}>Une erreur s'est produite. Réessaie.</div>
            )}
            <div style={{ display: "flex", gap: 8 }}>
              <button
                style={{ ...S.btn("p"), flex: 1, background: C.purple, opacity: !ready || status === "sending" ? 0.5 : 1 }}
                onClick={submit}
                disabled={!ready || status === "sending"}
              >
                {status === "sending" ? "Envoi…" : "Envoyer"}
              </button>
              <button style={S.btn()} onClick={onClose}>Annuler</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// COACH DIRECTORY (coming soon)
// ══════════════════════════════════════════════════════════════════════════════
function CoachDirectory() {
  const [showCoach, setShowCoach] = useState(false);
  const cookieAccepted = !!localStorage.getItem("hrpl_ck");
  return (
    <div>
      <SectionHeader icon="🎓" title="Annuaire des Coachs" sub="Des experts hybride à ta disposition" />

      {/* Coming soon hero */}
      <div style={{ ...S.card, textAlign: "center", padding: "2.5rem 1.5rem", background: `linear-gradient(135deg, ${C.surface} 0%, ${C.surface3} 100%)`, border: `1px solid ${C.accent}30`, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -40, right: -40, fontSize: 120, opacity: 0.04, lineHeight: 1 }}>🎓</div>
        <div style={{ fontSize: 48, marginBottom: "0.75rem" }}>🚧</div>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: C.accent, margin: "0 0 0.5rem", letterSpacing: "-0.03em" }}>Bientôt disponible</h2>
        <p style={{ color: C.muted, fontSize: 14, maxWidth: 400, margin: "0 auto 1.5rem", lineHeight: 1.6 }}>
          L'annuaire des coachs spécialisés en course hybride arrive prochainement. Trouve le coach qui correspond à ton niveau et tes objectifs.
        </p>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: `${C.accent}15`, border: `1px solid ${C.accent}40`, borderRadius: 20, padding: "6px 16px", fontSize: 12, color: C.accent, fontWeight: 600 }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: C.accent, display: "inline-block", animation: "pulse 1.5s infinite" }} />
          Lancement prévu prochainement
        </div>
      </div>

      {/* Ce que tu trouveras */}
      <div style={S.card}>
        <h2 style={S.h2}>Ce que tu trouveras ici</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.75rem" }}>
          {[
            { icon: "🏅", title: "Coachs certifiés", desc: "Experts course hybride, running et force fonctionnelle." },
            { icon: "📍", title: "Localisation", desc: "Trouve un coach près de chez toi ou en ligne." },
            { icon: "📋", title: "Spécialités", desc: "RX, Open, préparation compétition, débutants…" },
            { icon: "📞", title: "Contact direct", desc: "Accède aux coordonnées et prise de RDV simplifiée." },
          ].map(f => (
            <div key={f.title} style={{ background: C.surface2, borderRadius: 10, padding: "1rem" }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>{f.icon}</div>
              <div style={{ fontWeight: 700, fontSize: 13, color: C.text, marginBottom: 4 }}>{f.title}</div>
              <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA coach */}
      <div style={{ ...S.card, background: `${C.purple}10`, border: `1px solid ${C.purple}30` }}>
        <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start", flexWrap: "wrap" }}>
          <div style={{ fontSize: 36 }}>💼</div>
          <div style={{ flex: 1 }}>
            <h2 style={{ ...S.h2, color: C.purple, margin: "0 0 0.4rem" }}>Tu es coach ?</h2>
            <p style={{ fontSize: 13, color: C.muted, margin: "0 0 1rem", lineHeight: 1.6 }}>
              Rejoins l'annuaire et mets-toi en avant auprès d'une communauté d'athlètes hybrides motivés. Des places limitées sont disponibles pour les coachs pionniers.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-start" }}>
              <button
                onClick={() => cookieAccepted && setShowCoach(true)}
                style={{ ...S.btn("p"), background: cookieAccepted ? C.purple : C.surface3, color: cookieAccepted ? "#fff" : C.muted, cursor: cookieAccepted ? "pointer" : "not-allowed", opacity: cookieAccepted ? 1 : 0.6 }}
              >
                📩 Manifester mon intérêt
              </button>
              {!cookieAccepted && (
                <span style={{ fontSize: 11, color: C.warning }}>
                  ⚠️ Accepte les cookies pour continuer
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
      {showCoach && <CoachModal onClose={() => setShowCoach(false)} />}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TABS & APP
// ══════════════════════════════════════════════════════════════════════════════
const TABS = [
  { id: "hybrid",    label: "Hybride",   icon: "🏁" },
  { id: "running",   label: "Course",    icon: "🏃" },
  { id: "converter", label: "Allure",    icon: "⚡" },
  { id: "strategy",  label: "Stratégie", icon: "📊" },
  { id: "nutrition", label: "Nutrition", icon: "🍬" },
  { id: "coaches",   label: "Coachs",    icon: "🎓" },
];

export default function App() {
  const [tab, setTab] = useState("hybrid");
  const [showFeedback, setShowFeedback] = useState(false);

  const renderPage = () => {
    switch (tab) {
      case "converter":  return <PaceConverter />;
      case "hybrid":     return <RaceSimulator />;
      case "running":    return <RunSimulator />;
      case "strategy":   return <StrategyAnalyzer />;
      case "nutrition":  return <NutritionCalc />;
      case "coaches":    return <CoachDirectory />;
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
        <button
          onClick={() => setShowFeedback(true)}
          style={{ marginLeft: "auto", ...S.btn(), fontSize: 11, padding: "5px 12px" }}
        >
          ⭐ Avis
        </button>
      </nav>

      <main style={S.page}>{renderPage()}</main>

      <footer style={{ textAlign: "center", padding: "1.25rem 1rem 5rem", color: C.muted, fontSize: 11, letterSpacing: "0.06em", borderTop: `1px solid ${C.border}` }}>
        <div style={{ fontWeight: 700, color: `${C.accent}88`, letterSpacing: "0.14em", marginBottom: 3 }}>HYBRID RACE PACE LAB</div>
        <div>Outil open source · Non affilié à une organisation officielle</div>
      </footer>

      <nav style={S.bottomNav}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={S.navBtn(tab === t.id)}>
            <span style={{ fontSize: 18 }}>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </nav>

      <CookieBanner />
      {showFeedback && <FeedbackModal onClose={() => setShowFeedback(false)} />}
    </div>
  );
}
