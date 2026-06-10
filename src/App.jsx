import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

// ── CONFIG — replace with your keys ──────────────────────────────────────────
const SUPABASE_URL      = import.meta.env.VITE_SUPABASE_URL      || "YOUR_SUPABASE_URL";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "YOUR_SUPABASE_ANON_KEY";
const OWM_API_KEY       = import.meta.env.VITE_OWM_API_KEY       || "YOUR_OWM_API_KEY";
// ─────────────────────────────────────────────────────────────────────────────

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── ALL MUMBAI AREAS (BMC flood-prone zones + user requested) ─────────────────
const AREAS = [
  // Chronic severe zones (BMC listed)
  { name: "Andheri Subway",        zone: "Andheri West",    riskBase: 92 },
  { name: "Hindmata Junction",     zone: "Dadar",           riskBase: 90 },
  { name: "Milan Subway",          zone: "Vile Parle",      riskBase: 88 },
  { name: "Kings Circle",          zone: "Matunga",         riskBase: 82 },
  { name: "Sion Junction",         zone: "Sion",            riskBase: 80 },
  { name: "Parel Naka",            zone: "Parel",           riskBase: 78 },
  { name: "Wadala Monorail Rd",    zone: "Wadala",          riskBase: 75 },
  { name: "Kurla Station Road",    zone: "Kurla",           riskBase: 74 },
  { name: "Sakinaka Junction",     zone: "Sakinaka",        riskBase: 72 },
  { name: "Marol Naka",            zone: "Marol",           riskBase: 70 },
  { name: "Kanjurmarg Station",    zone: "Kanjurmarg",      riskBase: 68 },
  { name: "Ghatkopar Station Rd",  zone: "Ghatkopar",       riskBase: 67 },
  { name: "Kalyan Station Area",   zone: "Kalyan",          riskBase: 65 },
  { name: "Bhandup Pumping Stn",   zone: "Bhandup",         riskBase: 64 },
  { name: "Nehru Nagar",           zone: "Kurla East",      riskBase: 62 },
  { name: "Lalbaug Junction",      zone: "Lalbaug",         riskBase: 60 },
  { name: "Bandra Reclamation",    zone: "Bandra West",     riskBase: 48 },
  { name: "Malad Link Road",       zone: "Malad",           riskBase: 45 },
  { name: "Borivali West",         zone: "Borivali",        riskBase: 38 },
  { name: "Santacruz Subway",      zone: "Santacruz",       riskBase: 55 },
  { name: "Vakola Bridge",         zone: "Santacruz East",  riskBase: 52 },
  { name: "Dharavi Junction",      zone: "Dharavi",         riskBase: 72 },
  { name: "Chunabhatti",           zone: "Sion",            riskBase: 58 },
  { name: "Vikhroli Road",         zone: "Vikhroli",        riskBase: 35 },
  { name: "Powai Lake Road",       zone: "Powai",           riskBase: 12 },
  { name: "Colaba Causeway",       zone: "Colaba",          riskBase: 15 },
  { name: "Versova Beach Road",    zone: "Andheri West",    riskBase: 10 },
  { name: "Goregaon East",         zone: "Goregaon",        riskBase: 40 },
  { name: "Mulund Check Naka",     zone: "Mulund",          riskBase: 42 },
  { name: "Thane Station Area",    zone: "Thane",           riskBase: 55 },
  { name: "Ghansoli",    zone: "NaviMumbai",    riskBase: 20 },
  { name: "Vashi",    zone: "NaviMumbai",    riskBase: 20 },
  { name: "Ulwe",    zone: "Uran",    riskBase: 10 },
  { name: "Kharghar",    zone: "Panvel",    riskBase: 10 },
  ];

// ── TRAIN LINES ───────────────────────────────────────────────────────────────
const TRAIN_LINES = [
  { id: "western",   label: "Western Line",  short: "WR",  route: "Churchgate → Virar/Dahanu",    color: "#3b82f6" },
  { id: "central",   label: "Central Line",  short: "CR",  route: "CSMT → Kalyan/Kasara/Khopoli", color: "#f59e0b" },
  { id: "harbour",   label: "Harbour Line",  short: "HR",  route: "CSMT → Panvel via Vashi",      color: "#10b981" },
];

// ── TRAFFIC ROUTES ─────────────────────────────────────────────────────────────
const TRAFFIC_ROUTES = [
  { id: "ew_highway",    label: "Eastern Express Hwy",   short: "EEH" },
  { id: "ww_highway",    label: "Western Express Hwy",   short: "WEH" },
  { id: "sion_panvel",   label: "Sion–Panvel Hwy",       short: "SPH" },
  { id: "lbs_marg",      label: "LBS Marg",              short: "LBS" },
  { id: "jog_ali",       label: "Jogeshwari–Vikhroli Lnk", short: "JVL" },
  { id: "sv_road",       label: "S.V. Road",             short: "SVR" },
];

const SEV_SCORE = { moderate: 1, high: 2, severe: 3 };
const SEV_LABEL = { severe: "🚨 Severe", high: "⚠️ High", moderate: "🔵 Moderate", safe: "✅ Clear" };
const SEV_COLOR = { severe: "#ef4444", high: "#f59e0b", moderate: "#3b82f6", safe: "#10b981" };
const TRAIN_STATUS_OPTS = [
  { key: "normal",   label: "🟢 Running Normal", color: "#10b981" },
  { key: "delayed",  label: "🟡 Delayed 15-30 min", color: "#f59e0b" },
  { key: "halted",   label: "🔴 Halted / Stopped", color: "#ef4444" },
  { key: "slow",     label: "🟠 Slow / Crowded",   color: "#f97316" },
];
const TRAFFIC_OPTS = [
  { key: "clear",   label: "🟢 Moving freely",    color: "#10b981" },
  { key: "slow",    label: "🟡 Slow moving",       color: "#f59e0b" },
  { key: "heavy",   label: "🔴 Heavy traffic",     color: "#ef4444" },
  { key: "blocked", label: "⛔ Road blocked",      color: "#dc2626" },
];

function statusFromScore(s) {
  if (s >= 80) return "severe";
  if (s >= 55) return "high";
  if (s >= 30) return "moderate";
  return "safe";
}
function timeAgo(ts) {
  const d = Math.floor((Date.now() - new Date(ts)) / 1000);
  if (d < 60) return `${d}s ago`;
  if (d < 3600) return `${Math.floor(d/60)}m ago`;
  return `${Math.floor(d/3600)}h ago`;
}
function randomName() {
  const a = ["Andheri","Dadar","Bandra","Kurla","Powai","Worli","Sion","Malad","Borivali","Thane"];
  const b = ["Local","Bhai","Dost","Mumbai","Wala","Hero","Kaun","Yaar"];
  return a[Math.floor(Math.random()*a.length)] + b[Math.floor(Math.random()*b.length)] + Math.floor(Math.random()*99);
}

// ── Rain Canvas ───────────────────────────────────────────────────────────────
function RainCanvas() {
  const ref = useRef();
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas.getContext("2d");
    let drops = [], raf;
    function resize() {
      canvas.width = window.innerWidth; canvas.height = window.innerHeight;
      drops = Array.from({ length: 55 }, () => ({ x: Math.random()*canvas.width, y: Math.random()*canvas.height, speed: 4+Math.random()*6, len: 15+Math.random()*25, opacity: 0.04+Math.random()*0.08 }));
    }
    resize();
    window.addEventListener("resize", resize);
    function draw() {
      ctx.clearRect(0,0,canvas.width,canvas.height);
      drops.forEach(d => { ctx.beginPath(); ctx.moveTo(d.x,d.y); ctx.lineTo(d.x-1,d.y+d.len); ctx.strokeStyle=`rgba(56,189,248,${d.opacity})`; ctx.lineWidth=1; ctx.stroke(); d.y+=d.speed; if(d.y>canvas.height){d.y=-d.len;d.x=Math.random()*canvas.width;} });
      raf = requestAnimationFrame(draw);
    }
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={ref} style={{ position:"fixed", inset:0, zIndex:0, pointerEvents:"none" }} />;
}

// ── Weather Strip ─────────────────────────────────────────────────────────────
function WeatherStrip({ weather }) {
  if (!weather) return <div style={{ background:"#0d1526", border:"1px solid #1e2f4a", borderRadius:12, padding:"14px 16px", marginBottom:8, fontSize:12, color:"#6b7f99", textAlign:"center" }}>Loading weather…</div>;
  return (
    <div style={{ background:"#0d1526", border:"1px solid #1e2f4a", borderRadius:12, padding:"14px 16px", marginBottom:8, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
      <div style={{ display:"flex", alignItems:"center", gap:12 }}>
        <div style={{ fontSize:30 }}>{weather.icon}</div>
        <div>
          <div style={{ fontFamily:"'Space Mono',monospace", fontSize:22, fontWeight:700 }}>{weather.temp}°C</div>
          <div style={{ fontSize:12, color:"#6b7f99", textTransform:"capitalize" }}>{weather.desc}</div>
        </div>
      </div>
      <div style={{ textAlign:"right" }}>
        <div style={{ fontSize:12, color:"#6b7f99" }}>Humidity <strong style={{ color:"#e8edf5" }}>{weather.humidity}%</strong></div>
        <div style={{ fontSize:12, color:"#6b7f99" }}>Wind <strong style={{ color:"#e8edf5" }}>{weather.wind} km/h</strong></div>
        <div style={{ fontSize:12, color:"#6b7f99" }}>Rain <strong style={{ color:"#38bdf8" }}>{weather.rain} mm/h</strong></div>
      </div>
    </div>
  );
}

// ── Section Label ─────────────────────────────────────────────────────────────
function SectionLabel({ children }) {
  return (
    <div style={{ fontSize:10, letterSpacing:2, textTransform:"uppercase", color:"#6b7f99", margin:"20px 0 12px", fontFamily:"'Space Mono',monospace", display:"flex", alignItems:"center", gap:8 }}>
      {children}<span style={{ flex:1, height:1, background:"#1e2f4a", display:"block" }}/>
    </div>
  );
}

// ── Area Card ─────────────────────────────────────────────────────────────────
function AreaCard({ area, onClick }) {
  const c = SEV_COLOR[area.status];
  return (
    <div onClick={onClick} style={{ background:"#0d1526", border:`1px solid ${c}55`, borderRadius:12, padding:"13px 15px", display:"flex", alignItems:"center", justifyContent:"space-between", cursor:"pointer", position:"relative", overflow:"hidden", marginBottom:8 }}>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:15, fontWeight:600, marginBottom:3 }}>{area.name}</div>
        <div style={{ fontSize:12, color:"#6b7f99", display:"flex", gap:8 }}>
          <span>{area.zone}</span>
          <span style={{ fontFamily:"'Space Mono',monospace", background:"rgba(56,189,248,0.1)", border:"1px solid rgba(56,189,248,0.2)", borderRadius:20, padding:"2px 8px", color: area.reports>0?"#38bdf8":"#4a5568" }}>
  {area.reports>0 ? `👥 ${area.reports}` : "👥 0"}
</span>
        </div>
      </div>
      <div style={{ background:c+"22", color:c, border:`1px solid ${c}44`, borderRadius:20, padding:"4px 10px", fontSize:11, fontWeight:600, fontFamily:"'Space Mono',monospace", whiteSpace:"nowrap" }}>{SEV_LABEL[area.status]}</div>
      <div style={{ position:"absolute", bottom:0, left:0, height:2, width:`${area.score}%`, background:c, transition:"width 1s ease" }}/>
    </div>
  );
}

// ── Area Modal ────────────────────────────────────────────────────────────────
function AreaModal({ area, reports, onClose }) {
  if (!area) return null;
  const ar = reports.filter(r => r.area_name===area.name);
  return (
    <div onClick={e=>e.target===e.currentTarget&&onClose()} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", backdropFilter:"blur(4px)", zIndex:300, display:"flex", alignItems:"flex-end", padding:16 }}>
      <div style={{ background:"#0d1526", border:"1px solid #1e2f4a", borderRadius:20, padding:24, width:"100%", maxHeight:"70vh", overflowY:"auto" }}>
        <div style={{ fontSize:18, fontWeight:700, marginBottom:4 }}>{area.name}</div>
        <div style={{ fontSize:13, color:"#6b7f99", marginBottom:16 }}>{area.zone} · {area.reports} reports · Risk: {area.score}/100</div>
        {ar.length===0
          ? <div style={{ fontSize:12, color:"#6b7f99", textAlign:"center", padding:"20px 0" }}>No reports yet for this area</div>
          : ar.map((r,i)=>(
            <div key={i} style={{ background:"#131f35", borderRadius:8, padding:"10px 12px", marginBottom:8 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div style={{ fontSize:12, fontWeight:600, color:SEV_COLOR[r.severity] }}>{SEV_LABEL[r.severity]}</div>
                <div style={{ fontSize:11, color:"#6b7f99", fontFamily:"'Space Mono',monospace" }}>{timeAgo(r.created_at)}</div>
              </div>
              {r.note&&<div style={{ fontSize:11, color:"#6b7f99", marginTop:4 }}>{r.note}</div>}
            </div>
          ))
        }
        <button onClick={onClose} style={{ width:"100%", marginTop:12, padding:12, borderRadius:10, border:"1px solid #1e2f4a", background:"transparent", color:"#6b7f99", fontFamily:"'Space Grotesk',sans-serif", fontSize:14, cursor:"pointer" }}>Close</button>
      </div>
    </div>
  );
}

// ── Train Status Card ─────────────────────────────────────────────────────────
function TrainCard({ line, status, reportCount, lastReport, onReport }) {
  const st = TRAIN_STATUS_OPTS.find(s=>s.key===status) || TRAIN_STATUS_OPTS[0];
  return (
    <div style={{ background:"#0d1526", border:`1px solid ${st.color}44`, borderRadius:12, padding:"14px 16px", marginBottom:8, position:"relative", overflow:"hidden" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:6 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ background:line.color+"22", color:line.color, border:`1px solid ${line.color}44`, borderRadius:6, padding:"3px 8px", fontSize:11, fontWeight:700, fontFamily:"'Space Mono',monospace" }}>{line.short}</div>
          <div style={{ fontSize:15, fontWeight:600 }}>{line.label}</div>
        </div>
        <div style={{ background:st.color+"22", color:st.color, borderRadius:20, padding:"4px 10px", fontSize:11, fontWeight:600, fontFamily:"'Space Mono',monospace", whiteSpace:"nowrap" }}>{st.label}</div>
      </div>
      <div style={{ fontSize:12, color:"#6b7f99", marginBottom:10 }}>{line.route}</div>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ fontSize:11, color:"#4a5568", fontFamily:"'Space Mono',monospace" }}>
          {reportCount>0 ? `${reportCount} reports · ${lastReport}` : "No reports yet"}
        </div>
        <button onClick={()=>onReport(line)} style={{ background:"rgba(56,189,248,0.1)", border:"1px solid rgba(56,189,248,0.25)", color:"#38bdf8", borderRadius:8, padding:"5px 12px", fontSize:12, fontFamily:"'Space Grotesk',sans-serif", cursor:"pointer", fontWeight:600 }}>
          Report
        </button>
      </div>
      <div style={{ position:"absolute", bottom:0, left:0, height:2, right:0, background:st.color, opacity:0.4 }}/>
    </div>
  );
}

// ── Traffic Card ──────────────────────────────────────────────────────────────
function TrafficCard({ route, status, reportCount, lastReport, onReport }) {
  const st = TRAFFIC_OPTS.find(s=>s.key===status) || TRAFFIC_OPTS[0];
  return (
    <div style={{ background:"#0d1526", border:`1px solid ${st.color}44`, borderRadius:12, padding:"13px 15px", marginBottom:8, position:"relative", overflow:"hidden" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:4 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <div style={{ background:"rgba(99,102,241,0.15)", color:"#818cf8", border:"1px solid rgba(99,102,241,0.3)", borderRadius:6, padding:"2px 7px", fontSize:10, fontWeight:700, fontFamily:"'Space Mono',monospace" }}>{route.short}</div>
          <div style={{ fontSize:14, fontWeight:600 }}>{route.label}</div>
        </div>
        <div style={{ background:st.color+"22", color:st.color, borderRadius:20, padding:"3px 9px", fontSize:11, fontWeight:600, fontFamily:"'Space Mono',monospace", whiteSpace:"nowrap" }}>{st.label}</div>
      </div>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:8 }}>
        <div style={{ fontSize:11, color:"#4a5568", fontFamily:"'Space Mono',monospace" }}>{reportCount>0?`${reportCount} reports · ${lastReport}`:"No reports yet"}</div>
        <button onClick={()=>onReport(route)} style={{ background:"rgba(56,189,248,0.1)", border:"1px solid rgba(56,189,248,0.25)", color:"#38bdf8", borderRadius:8, padding:"4px 10px", fontSize:11, fontFamily:"'Space Grotesk',sans-serif", cursor:"pointer", fontWeight:600 }}>Report</button>
      </div>
      <div style={{ position:"absolute", bottom:0, left:0, height:2, right:0, background:st.color, opacity:0.35 }}/>
    </div>
  );
}

// ── Quick Report Modal (trains + traffic) ─────────────────────────────────────
function QuickReportModal({ type, target, username, onClose, onSubmit }) {
  const [selected, setSelected] = useState(null);
  const [sending, setSending]   = useState(false);
  const opts = type==="train" ? TRAIN_STATUS_OPTS : TRAFFIC_OPTS;

  async function submit() {
    if (!selected) return;
    setSending(true);
    const table = type==="train" ? "train_reports" : "traffic_reports";
    const payload = type==="train"
      ? { line_id: target.id, line_label: target.label, status: selected, username }
      : { route_id: target.id, route_label: target.label, status: selected, username };
    await supabase.from(table).insert(payload);
    setSending(false);
    onSubmit();
    onClose();
  }

  return (
    <div onClick={e=>e.target===e.currentTarget&&onClose()} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", backdropFilter:"blur(4px)", zIndex:300, display:"flex", alignItems:"flex-end", padding:16 }}>
      <div style={{ background:"#0d1526", border:"1px solid #1e2f4a", borderRadius:20, padding:24, width:"100%" }}>
        <div style={{ fontSize:16, fontWeight:700, marginBottom:4 }}>Report {type==="train"?target.label:target.label}</div>
        <div style={{ fontSize:13, color:"#6b7f99", marginBottom:16 }}>What's the current status?</div>
        <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:16 }}>
          {opts.map(o=>(
            <button key={o.key} onClick={()=>setSelected(o.key)} style={{ padding:"12px 16px", borderRadius:10, border:`1px solid ${selected===o.key?o.color:"#1e2f4a"}`, background:selected===o.key?o.color+"18":"#131f35", color:selected===o.key?o.color:"#6b7f99", fontFamily:"'Space Grotesk',sans-serif", fontSize:14, fontWeight:600, cursor:"pointer", textAlign:"left" }}>
              {o.label}
            </button>
          ))}
        </div>
        <button onClick={submit} disabled={!selected||sending} style={{ width:"100%", padding:13, borderRadius:12, border:"none", background:selected?"linear-gradient(135deg,#2563eb,#0ea5e9)":"#1e2f4a", color:selected?"#fff":"#4a5568", fontSize:15, fontWeight:600, fontFamily:"'Space Grotesk',sans-serif", cursor:selected?"pointer":"not-allowed" }}>
          {sending?"Submitting…":"Submit Report"}
        </button>
        <button onClick={onClose} style={{ width:"100%", marginTop:8, padding:11, borderRadius:10, border:"1px solid #1e2f4a", background:"transparent", color:"#6b7f99", fontFamily:"'Space Grotesk',sans-serif", fontSize:13, cursor:"pointer" }}>Cancel</button>
      </div>
    </div>
  );
}

// ── Trains & Traffic Tab ──────────────────────────────────────────────────────
function CommuteTab({ username }) {
  const [trainReports,   setTrainReports]   = useState([]);
  const [trafficReports, setTrafficReports] = useState([]);
  const [modal, setModal] = useState(null); // { type, target }
  const [toast, setToast] = useState("");

  const fetchAll = useCallback(async () => {
    const since = new Date(Date.now()-2*3600*1000).toISOString();
    const [tr, tfr] = await Promise.all([
      supabase.from("train_reports").select("*").gte("created_at",since).order("created_at",{ascending:false}),
      supabase.from("traffic_reports").select("*").gte("created_at",since).order("created_at",{ascending:false}),
    ]);
    if (tr.data)  setTrainReports(tr.data);
    if (tfr.data) setTrafficReports(tfr.data);
  }, []);

  useEffect(() => {
    fetchAll();
    const ch1 = supabase.channel("train_r").on("postgres_changes",{event:"INSERT",schema:"public",table:"train_reports"},fetchAll).subscribe();
    const ch2 = supabase.channel("traffic_r").on("postgres_changes",{event:"INSERT",schema:"public",table:"traffic_reports"},fetchAll).subscribe();
    return () => { supabase.removeChannel(ch1); supabase.removeChannel(ch2); };
  }, [fetchAll]);

  function getTrainStatus(lineId) {
    const reports = trainReports.filter(r=>r.line_id===lineId);
    if (reports.length===0) return "normal";
    return reports[0].status;
  }
  function getTrafficStatus(routeId) {
    const reports = trafficReports.filter(r=>r.route_id===routeId);
    if (reports.length===0) return "clear";
    return reports[0].status;
  }
  function getReportCount(arr, keyField, keyVal) {
    return arr.filter(r=>r[keyField]===keyVal).length;
  }
  function getLastReport(arr, keyField, keyVal) {
    const r = arr.find(r=>r[keyField]===keyVal);
    return r ? timeAgo(r.created_at) : "";
  }

  return (
    <div style={{ paddingTop:8 }}>
      {toast && <div style={{ position:"fixed", bottom:90, left:"50%", transform:"translateX(-50%)", background:"#10b981", color:"#fff", padding:"12px 20px", borderRadius:12, fontSize:13, fontWeight:600, zIndex:999, whiteSpace:"nowrap" }}>{toast}</div>}

      <SectionLabel>🚆 Local Train Status</SectionLabel>
      <div style={{ background:"rgba(56,189,248,0.06)", border:"1px solid rgba(56,189,248,0.15)", borderRadius:10, padding:"10px 14px", marginBottom:12, fontSize:12, color:"#6b7f99", lineHeight:1.5 }}>
        No official API available — status is crowdsourced by commuters like you. Tap <strong style={{ color:"#38bdf8" }}>Report</strong> to update your line.
      </div>
      {TRAIN_LINES.map(line => (
        <TrainCard key={line.id} line={line}
          status={getTrainStatus(line.id)}
          reportCount={getReportCount(trainReports,"line_id",line.id)}
          lastReport={getLastReport(trainReports,"line_id",line.id)}
          onReport={l=>setModal({type:"train",target:l})}
        />
      ))}

      <SectionLabel>🚗 Traffic Status</SectionLabel>
      <div style={{ background:"rgba(56,189,248,0.06)", border:"1px solid rgba(56,189,248,0.15)", borderRadius:10, padding:"10px 14px", marginBottom:12, fontSize:12, color:"#6b7f99", lineHeight:1.5 }}>
        Real-time traffic reports from Mumbaikars on the road. Tap <strong style={{ color:"#38bdf8" }}>Report</strong> to update a route.
      </div>
      {TRAFFIC_ROUTES.map(route => (
        <TrafficCard key={route.id} route={route}
          status={getTrafficStatus(route.id)}
          reportCount={getReportCount(trafficReports,"route_id",route.id)}
          lastReport={getLastReport(trafficReports,"route_id",route.id)}
          onReport={r=>setModal({type:"traffic",target:r})}
        />
      ))}

      {modal && (
        <QuickReportModal
          type={modal.type} target={modal.target} username={username}
          onClose={() => setModal(null)}
          onSubmit={() => { setToast("✅ Thanks! Status updated."); fetchAll(); setTimeout(()=>setToast(""),3000); }}
        />
      )}
    </div>
  );
}

// ── Report Tab ────────────────────────────────────────────────────────────────
function ReportTab({ username, onReportSubmit }) {
  const [area, setArea]   = useState("");
  const [sev, setSev]     = useState(null);
  const [note, setNote]   = useState("");
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState("");
  const [search, setSearch] = useState("");

  const filtered = AREAS.filter(a =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.zone.toLowerCase().includes(search.toLowerCase())
  );

  async function submit() {
    if (!area||!sev) return;
    setSending(true);
    const { error } = await supabase.from("flood_reports").insert({ area_name:area, severity:sev, note:note.trim()||null, username });
    setSending(false);
    if (!error) {
      setArea(""); setSev(null); setNote(""); setSearch("");
      setToast("✅ Report submitted. Thank you, Mumbai!");
      onReportSubmit();
      setTimeout(()=>setToast(""),3000);
    }
  }

  const sevs = [
    { key:"moderate", label:"🌊 Ankle deep",  sub:"Walkable but wet" },
    { key:"high",     label:"🚗 Knee deep",   sub:"Cars affected" },
    { key:"severe",   label:"🚨 Impassable",  sub:"Road blocked" },
  ];

  return (
    <div style={{ paddingTop:8 }}>
      {toast && <div style={{ position:"fixed", bottom:90, left:"50%", transform:"translateX(-50%)", background:"#10b981", color:"#fff", padding:"12px 20px", borderRadius:12, fontSize:13, fontWeight:600, zIndex:999, whiteSpace:"nowrap" }}>{toast}</div>}
      <SectionLabel>📍 Report Waterlogging</SectionLabel>
      <div style={{ background:"linear-gradient(135deg,rgba(56,189,248,0.08),rgba(59,130,246,0.05))", border:"1px solid rgba(56,189,248,0.2)", borderRadius:16, padding:20 }}>
        <div style={{ fontSize:16, fontWeight:600, marginBottom:4 }}>Seen flooding near you?</div>
        <div style={{ fontSize:13, color:"#6b7f99", marginBottom:16, lineHeight:1.5 }}>Helps thousands of Mumbaikars avoid flooded routes. Takes 5 seconds.</div>

        <input value={search} onChange={e=>{setSearch(e.target.value);setArea("");}} placeholder="🔍 Search area or zone…" style={{ width:"100%", background:"#131f35", border:"1px solid #1e2f4a", color:"#e8edf5", fontFamily:"'Space Grotesk',sans-serif", fontSize:13, padding:"10px 14px", borderRadius:10, marginBottom:6, outline:"none" }}/>

        {search && (
          <div style={{ background:"#131f35", border:"1px solid #1e2f4a", borderRadius:10, marginBottom:10, maxHeight:180, overflowY:"auto" }}>
            {filtered.length===0
              ? <div style={{ padding:"12px 14px", fontSize:13, color:"#6b7f99" }}>No areas found</div>
              : filtered.map(a=>(
                <div key={a.name} onClick={()=>{setArea(a.name);setSearch(a.name+" — "+a.zone);}} style={{ padding:"10px 14px", fontSize:13, cursor:"pointer", borderBottom:"1px solid #1e2f4a", color:area===a.name?"#38bdf8":"#e8edf5", background:area===a.name?"rgba(56,189,248,0.08)":"transparent" }}>
                  {a.name} <span style={{ color:"#6b7f99", fontSize:11 }}>— {a.zone}</span>
                </div>
              ))
            }
          </div>
        )}

        <div style={{ fontSize:12, color:"#6b7f99", marginBottom:8 }}>How bad is it?</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, marginBottom:12 }}>
          {sevs.map(s=>(
            <button key={s.key} onClick={()=>setSev(s.key)} style={{ padding:"10px 6px", borderRadius:10, border:`1px solid ${sev===s.key?SEV_COLOR[s.key]:"#1e2f4a"}`, background:sev===s.key?SEV_COLOR[s.key]+"18":"#131f35", color:sev===s.key?SEV_COLOR[s.key]:"#6b7f99", fontSize:12, fontFamily:"'Space Grotesk',sans-serif", fontWeight:500, cursor:"pointer", textAlign:"center", lineHeight:1.4 }}>
              {s.label}<br/><span style={{ fontSize:10 }}>{s.sub}</span>
            </button>
          ))}
        </div>

        <input value={note} onChange={e=>setNote(e.target.value)} placeholder="Add a note (optional)" maxLength={120} style={{ width:"100%", background:"#131f35", border:"1px solid #1e2f4a", color:"#e8edf5", fontFamily:"'Space Grotesk',sans-serif", fontSize:13, padding:"11px 14px", borderRadius:10, marginBottom:12, outline:"none" }}/>

        <button onClick={submit} disabled={!area||!sev||sending} style={{ width:"100%", padding:14, borderRadius:12, border:"none", background:(!area||!sev)?"#1e2f4a":"linear-gradient(135deg,#2563eb,#0ea5e9)", color:(!area||!sev)?"#6b7f99":"#fff", fontSize:15, fontWeight:600, fontFamily:"'Space Grotesk',sans-serif", cursor:(!area||!sev)?"not-allowed":"pointer" }}>
          {sending?"Submitting…":"📍 Submit Report"}
        </button>
      </div>
    </div>
  );
}

// ── Chat Tab ──────────────────────────────────────────────────────────────────
function ChatTab({ username }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput]       = useState("");
  const [sending, setSending]   = useState(false);
  const bottomRef = useRef();

  const fetchMessages = useCallback(async () => {
    const { data } = await supabase.from("chat_messages").select("*").order("created_at",{ascending:true}).limit(100);
    if (data) setMessages(data);
  }, []);

  useEffect(() => {
    fetchMessages();
    const ch = supabase.channel("chat").on("postgres_changes",{event:"INSERT",schema:"public",table:"chat_messages"},payload=>{
      setMessages(prev=>[...prev,payload.new]);
    }).subscribe();
    return () => supabase.removeChannel(ch);
  }, [fetchMessages]);

  useEffect(() => { bottomRef.current?.scrollIntoView({behavior:"smooth"}); }, [messages]);

  async function send() {
    const text = input.trim();
    if (!text) return;
    setSending(true); setInput("");
    await supabase.from("chat_messages").insert({ username, message:text });
    setSending(false);
  }

  const SYS = [{ id:"sys1", username:"🌧️ MumbaiRains", message:"Welcome to the Mumbai Rains community! Share live updates, ask about your route, help your fellow Mumbaikars.", created_at:new Date(Date.now()-3600000).toISOString(), isSystem:true }];
  const all = [...SYS, ...messages];

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"calc(100vh - 160px)", paddingTop:8 }}>
      <SectionLabel>💬 Community Chat</SectionLabel>
      <div style={{ flex:1, overflowY:"auto", display:"flex", flexDirection:"column", gap:10, paddingBottom:8 }}>
        {all.map((m,i) => {
          const isMe = m.username===username && !m.isSystem;
          return (
            <div key={m.id||i} style={{ display:"flex", flexDirection:isMe?"row-reverse":"row", alignItems:"flex-end", gap:8 }}>
              {!isMe && <div style={{ width:28, height:28, borderRadius:"50%", background:m.isSystem?"rgba(56,189,248,0.2)":"rgba(99,102,241,0.2)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, flexShrink:0 }}>{m.isSystem?"🌧️":m.username?.charAt(0)?.toUpperCase()}</div>}
              <div style={{ maxWidth:"78%" }}>
                {!isMe && <div style={{ fontSize:10, color:m.isSystem?"#38bdf8":"#6b7f99", marginBottom:3, fontFamily:"'Space Mono',monospace" }}>{m.username}</div>}
                <div style={{ background:isMe?"linear-gradient(135deg,#2563eb,#0ea5e9)":m.isSystem?"rgba(56,189,248,0.1)":"#131f35", border:`1px solid ${isMe?"transparent":m.isSystem?"rgba(56,189,248,0.2)":"#1e2f4a"}`, borderRadius:isMe?"16px 16px 4px 16px":"16px 16px 16px 4px", padding:"10px 14px", fontSize:13, lineHeight:1.5, color:"#e8edf5" }}>{m.message}</div>
                <div style={{ fontSize:10, color:"#4a5568", marginTop:3, textAlign:isMe?"right":"left", fontFamily:"'Space Mono',monospace" }}>{timeAgo(m.created_at)}</div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef}/>
      </div>
      <div style={{ display:"flex", gap:8, paddingTop:10, borderTop:"1px solid #1e2f4a" }}>
        <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&(e.preventDefault(),send())} placeholder="Share an update, ask about your route…" maxLength={300} style={{ flex:1, background:"#131f35", border:"1px solid #1e2f4a", color:"#e8edf5", fontFamily:"'Space Grotesk',sans-serif", fontSize:13, padding:"11px 14px", borderRadius:12, outline:"none" }}/>
        <button onClick={send} disabled={!input.trim()||sending} style={{ padding:"11px 16px", borderRadius:12, border:"none", background:input.trim()?"linear-gradient(135deg,#2563eb,#0ea5e9)":"#1e2f4a", color:input.trim()?"#fff":"#4a5568", cursor:input.trim()?"pointer":"not-allowed", fontSize:18 }}>➤</button>
      </div>
    </div>
  );
}

// ── About Tab ─────────────────────────────────────────────────────────────────
function AboutTab() {
  return (
    <div style={{ paddingTop:8 }}>
      <div style={{ background:"#0d1526", border:"1px solid #1e2f4a", borderRadius:16, padding:20, marginBottom:12 }}>
        <div style={{ fontSize:17, fontWeight:700, marginBottom:8 }}>About MumbaiRains.com</div>
        <div style={{ fontSize:13, color:"#6b7f99", lineHeight:1.7 }}>Mumbai's first hyperlocal, crowdsourced flood, traffic and train alert platform. Real reports from real Mumbaikars — updated every minute during monsoon.</div>
      </div>
      <div style={{ background:"#0d1526", border:"1px solid #1e2f4a", borderRadius:16, padding:20, marginBottom:12 }}>
        <div style={{ fontSize:14, fontWeight:600, marginBottom:14 }}>How it works</div>
        {[
          { icon:"🌧️", t:"Live rain data",       b:"OpenWeatherMap rainfall updated every 15 minutes" },
          { icon:"👥", t:"Crowdsourced reports",  b:"Mumbaikars report waterlogging, train delays and traffic in real time" },
          { icon:"🚆", t:"Train line status",     b:"Western, Central and Harbour line status from commuters" },
          { icon:"🚗", t:"Traffic updates",       b:"Major highway and route status from drivers on the road" },
          { icon:"💬", t:"Community chat",        b:"Talk to fellow Mumbaikars live — ask about routes, share updates" },
        ].map((h,i)=>(
          <div key={i} style={{ display:"flex", gap:12, alignItems:"flex-start", marginBottom:14 }}>
            <div style={{ fontSize:20 }}>{h.icon}</div>
            <div><div style={{ fontSize:13, fontWeight:600 }}>{h.t}</div><div style={{ fontSize:12, color:"#6b7f99" }}>{h.b}</div></div>
          </div>
        ))}
      </div>
      <div style={{ background:"#0d1526", border:"1px solid #1e2f4a", borderRadius:16, padding:20 }}>
        <div style={{ fontSize:14, fontWeight:600, marginBottom:8 }}>For housing societies & businesses</div>
        <div style={{ fontSize:13, color:"#6b7f99", lineHeight:1.6, marginBottom:14 }}>Dedicated area dashboard + WhatsApp alerts for your pincode. Starting ₹199/month.</div>
        <div style={{ background:"rgba(56,189,248,0.08)", border:"1px solid rgba(56,189,248,0.2)", borderRadius:10, padding:12, fontSize:12, color:"#38bdf8", textAlign:"center", fontWeight:600 }}>📩 hello@mumbairains.com</div>
      </div>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab]         = useState("home");
  const [weather, setWeather] = useState(null);
  const [reports, setReports] = useState([]);
  const [modalArea, setModalArea] = useState(null);
  const [lastUpdated, setLastUpdated] = useState("");
  const [username] = useState(()=>localStorage.getItem("mr_username")||(()=>{const n=randomName();localStorage.setItem("mr_username",n);return n;})());

  const rainFactor = weather
    ? weather.rain > 20 ? 0.85
    : weather.rain > 10 ? 0.6
    : weather.rain > 5  ? 0.35
    : weather.rain > 1  ? 0.15
    : 0
    : 0;

  const areaData = AREAS.map(a => {
    const ar = reports.filter(r=>r.area_name===a.name);
    const userScore = ar.reduce((acc,r)=>acc+SEV_SCORE[r.severity]*15,0);
    const rainScore = Math.round(a.riskBase * rainFactor);
    const score = Math.min(100, rainScore + userScore);
    return { ...a, reports:ar.length, score, status:statusFromScore(score) };
  }).sort((a,b)=>b.score-a.score);

  const severeCount = areaData.filter(a=>a.status==="severe").length;
  const safeCount   = areaData.filter(a=>a.status==="safe").length;

  async function fetchWeather() {
    try {
      const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=Mumbai,IN&appid=${OWM_API_KEY}&units=metric`);
      const d = await res.json();
      const rain = d.rain?.["1h"]??d.rain?.["3h"]??0;
      const icons = { Thunderstorm:"⛈️", Drizzle:"🌦️", Rain:"🌧️", Clouds:"☁️", Clear:"☀️", Mist:"🌫️", Fog:"🌫️" };
      setWeather({ temp:Math.round(d.main.temp), desc:d.weather[0].description, humidity:d.main.humidity, wind:Math.round(d.wind.speed*3.6), rain:rain.toFixed(1), icon:icons[d.weather[0].main]||"🌧️" });
    } catch {}
  }

  async function fetchReports() {
    const since = new Date(Date.now()-6*3600*1000).toISOString();
    const { data } = await supabase.from("flood_reports").select("*").gte("created_at",since).order("created_at",{ascending:false});
    if (data) setReports(data);
    const now = new Date();
    setLastUpdated(`${now.getHours().toString().padStart(2,"0")}:${now.getMinutes().toString().padStart(2,"0")} IST`);
  }

  useEffect(() => {
    fetchWeather(); fetchReports();
    const interval = setInterval(()=>{ fetchWeather(); fetchReports(); }, 5*60*1000);
    const ch = supabase.channel("reports_rt").on("postgres_changes",{event:"INSERT",schema:"public",table:"flood_reports"},()=>fetchReports()).subscribe();
    return () => { clearInterval(interval); supabase.removeChannel(ch); };
  }, []);

  const navItems = [
    { key:"home",    icon:"🌊", label:"Status"  },
    { key:"commute", icon:"🚆", label:"Commute" },
    { key:"report",  icon:"📍", label:"Report"  },
    { key:"chat",    icon:"💬", label:"Chat"    },
    { key:"about",   icon:"ℹ️",  label:"About"  },
  ];

  return (
    <div style={{ background:"#060c1a", color:"#e8edf5", fontFamily:"'Space Grotesk',sans-serif", minHeight:"100vh" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap');*{box-sizing:border-box;margin:0;padding:0;}body{background:#060c1a;overflow-x:hidden;}::-webkit-scrollbar{width:4px;}::-webkit-scrollbar-track{background:#0d1526;}::-webkit-scrollbar-thumb{background:#1e2f4a;border-radius:2px;}select option{background:#131f35;color:#e8edf5;}input::placeholder{color:#4a5568;}@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}@keyframes scan{0%,100%{opacity:0.3}50%{opacity:1}}`}</style>
      <RainCanvas/>
      <div style={{ maxWidth:480, margin:"0 auto", padding:"0 14px 88px", position:"relative", zIndex:1 }}>

        {/* Header */}
        <div style={{ padding:"18px 0 12px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ fontSize:24 }}>🌧️</span>
            <div>
              <div style={{ fontFamily:"'Space Mono',monospace", fontSize:15, fontWeight:700, color:"#38bdf8", letterSpacing:-0.5 }}>MumbaiRains.com</div>
              <div style={{ fontSize:10, color:"#6b7f99", letterSpacing:1, textTransform:"uppercase" }}>Know before you go</div>
            </div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:6, background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.3)", padding:"4px 10px", borderRadius:20, fontSize:11, color:"#f87171", fontFamily:"'Space Mono',monospace" }}>
            <div style={{ width:6, height:6, borderRadius:"50%", background:"#ef4444", animation:"pulse 1.5s infinite" }}/>LIVE
          </div>
        </div>

        {/* Home Tab */}
        {tab==="home" && <>
          <div style={{ background:"linear-gradient(135deg,rgba(239,68,68,0.12),rgba(220,38,38,0.06))", border:"1px solid rgba(239,68,68,0.25)", borderRadius:16, padding:20, marginBottom:16, position:"relative", overflow:"hidden" }}>
            <div style={{ position:"absolute", top:0, left:0, right:0, height:2, background:"linear-gradient(90deg,transparent,#ef4444,transparent)", animation:"scan 3s ease-in-out infinite" }}/>
            <div style={{ fontSize:10, letterSpacing:2, textTransform:"uppercase", color:"#f87171", marginBottom:8, fontFamily:"'Space Mono',monospace" }}>⚠ Active Weather Alert</div>
            <div style={{ fontSize:26, fontWeight:700, lineHeight:1.1, marginBottom:6 }}>
              {weather ? (weather.rain > 5 ? "Heavy Rain" : weather.rain > 0 ? "Light Rain" : "Mostly Clear") : "Loading…"}
              <br/>
              <span style={{ color: weather && weather.rain > 5 ? "#ef4444" : weather && weather.rain > 0 ? "#f59e0b" : "#10b981" }}>Mumbai Today</span>
            </div>
            <div style={{ fontSize:13, color:"#6b7f99", lineHeight:1.5 }}>
              {weather
                ? weather.rain > 5
                  ? `IMD alert active. ${severeCount} areas reporting waterlogging. Avoid low-lying roads.`
                  : weather.rain > 0
                  ? `Light rain detected. ${severeCount} areas on watch. Check before stepping out.`
                  : `No active rain right now. ${severeCount} areas still recovering. Roads mostly clear.`
                : "Loading weather data…"
              }
            </div>
            <div style={{ display:"flex", gap:8, marginTop:14, alignItems:"center" }}>
              <div style={{ flex:1, height:4, borderRadius:2, background:"#1e2f4a", overflow:"hidden" }}>
                <div style={{ height:"100%", borderRadius:2, background:"linear-gradient(90deg,#f59e0b,#ef4444)", width:`${weather?.rain?Math.min(100,weather.rain*10):65}%`, transition:"width 1s ease" }}/>
              </div>
              <div style={{ fontSize:11, color:"#6b7f99", fontFamily:"'Space Mono',monospace", whiteSpace:"nowrap" }}>{weather?`${weather.rain}mm · ${weather.desc}`:"Loading…"}</div>
            </div>
          </div>

          <WeatherStrip weather={weather}/>

          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, marginBottom:8 }}>
            {[{num:reports.length,label:"Reports today"},{num:severeCount,label:"Severe zones"},{num:safeCount,label:"Areas clear"}].map((s,i)=>(
              <div key={i} style={{ background:"#0d1526", border:"1px solid #1e2f4a", borderRadius:12, padding:"14px 12px", textAlign:"center" }}>
                <div style={{ fontFamily:"'Space Mono',monospace", fontSize:22, fontWeight:700, color:"#38bdf8" }}>{s.num}</div>
                <div style={{ fontSize:11, color:"#6b7f99", marginTop:3 }}>{s.label}</div>
              </div>
            ))}
          </div>

          <SectionLabel>Area Status — {areaData.length} zones</SectionLabel>
          {areaData.map(a=><AreaCard key={a.name} area={a} onClick={()=>setModalArea(a)}/>)}
          <div style={{ textAlign:"center", fontSize:11, color:"#4a5568", marginTop:16, fontFamily:"'Space Mono',monospace" }}>Last updated: {lastUpdated||"—"}</div>
        </>}

        {tab==="commute" && <CommuteTab username={username}/>}
        {tab==="report"  && <ReportTab username={username} onReportSubmit={fetchReports}/>}
        {tab==="chat"    && <ChatTab username={username}/>}
        {tab==="about"   && <AboutTab/>}
      </div>

      {modalArea && <AreaModal area={modalArea} reports={reports} onClose={()=>setModalArea(null)}/>}

      {/* Bottom Nav */}
      <div style={{ position:"fixed", bottom:0, left:0, right:0, background:"rgba(6,12,26,0.96)", backdropFilter:"blur(12px)", borderTop:"1px solid #1e2f4a", display:"flex", justifyContent:"space-around", padding:"10px 0 16px", zIndex:100 }}>
        {navItems.map(n=>(
          <div key={n.key} onClick={()=>setTab(n.key)} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4, color:tab===n.key?"#38bdf8":"#6b7f99", fontSize:10, cursor:"pointer", padding:"4px 10px", transition:"color 0.15s" }}>
            <span style={{ fontSize:20 }}>{n.icon}</span>{n.label}
          </div>
        ))}
      </div>
    </div>
  );
}
