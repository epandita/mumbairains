import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL      = import.meta.env.VITE_SUPABASE_URL      || "YOUR_SUPABASE_URL";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "YOUR_SUPABASE_ANON_KEY";
const OWM_API_KEY       = import.meta.env.VITE_OWM_API_KEY       || "YOUR_OWM_API_KEY";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const AREAS = [
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
];

const TRAIN_LINES = [
  { id: "western", label: "Western Line", short: "WR", route: "Churchgate → Virar/Dahanu",    color: "#3b82f6" },
  { id: "central", label: "Central Line", short: "CR", route: "CSMT → Kalyan/Kasara/Khopoli", color: "#f59e0b" },
  { id: "harbour", label: "Harbour Line", short: "HR", route: "CSMT → Panvel via Vashi",      color: "#10b981" },
];

const TRAFFIC_ROUTES = [
  { id: "ew_highway",  label: "Eastern Express Hwy",     short: "EEH" },
  { id: "ww_highway",  label: "Western Express Hwy",     short: "WEH" },
  { id: "sion_panvel", label: "Sion–Panvel Hwy",         short: "SPH" },
  { id: "lbs_marg",    label: "LBS Marg",                short: "LBS" },
  { id: "jog_ali",     label: "Jogeshwari–Vikhroli Lnk", short: "JVL" },
  { id: "sv_road",     label: "S.V. Road",               short: "SVR" },
];

const SEV_SCORE = { moderate: 1, high: 2, severe: 3 };
const SEV_LABEL = { severe: "🚨 Severe", high: "⚠️ High", moderate: "🔵 Moderate", safe: "✅ Clear", unknown: "⚪ Unconfirmed" };
const SEV_COLOR = { severe: "#ef4444", high: "#f59e0b", moderate: "#3b82f6", safe: "#10b981", unknown: "#6b7f99" };

const TRAIN_STATUS_OPTS = [
  { key: "normal",  label: "🟢 Running Normal",    color: "#10b981" },
  { key: "delayed", label: "🟡 Delayed 15-30 min", color: "#f59e0b" },
  { key: "halted",  label: "🔴 Halted / Stopped",  color: "#ef4444" },
  { key: "slow",    label: "🟠 Slow / Crowded",    color: "#f97316" },
];

const TRAFFIC_OPTS = [
  { key: "clear",   label: "🟢 Moving freely",  color: "#10b981" },
  { key: "slow",    label: "🟡 Slow moving",     color: "#f59e0b" },
  { key: "heavy",   label: "🔴 Heavy traffic",   color: "#ef4444" },
  { key: "blocked", label: "⛔ Road blocked",    color: "#dc2626" },
];

// ── Alert level computation ───────────────────────────────────────────────────
function computeAlertLevel(weather, areaData, trainReports, trafficReports) {
  const rain = weather?.rain || 0;
  const severeAreas = areaData.filter(a => a.status === "severe").length;
  const highAreas   = areaData.filter(a => a.status === "high").length;
  const trainHalted = trainReports.filter(r => r.status === "halted").length;
  const trainDelayed= trainReports.filter(r => r.status === "delayed" || r.status === "slow").length;
  const roadBlocked = trafficReports.filter(r => r.status === "blocked" || r.status === "heavy").length;

  let score = 0;
  score += rain > 20 ? 40 : rain > 10 ? 25 : rain > 5 ? 15 : rain > 1 ? 5 : 0;
  score += severeAreas * 8;
  score += highAreas * 4;
  score += trainHalted * 10;
  score += trainDelayed * 4;
  score += roadBlocked * 5;

  if (score >= 60) return "red";
  if (score >= 30) return "orange";
  if (score >= 10) return "yellow";
  return "green";
}

function getDecision(alertLevel, weather, userArea) {
  const rain = weather?.rain || 0;
  const area = userArea ? `Your area (${userArea})` : "Mumbai";
  const decisions = {
    red: {
      verdict: "❌ Do NOT go out now",
      advice: `${area} is experiencing severe flooding conditions. Wait at least 2 hours.`,
      travelRisk: "VERY HIGH", floodRisk: "SEVERE", trainRisk: "LIKELY HALTED", commuteRisk: "AVOID",
      travelColor: "#ef4444", floodColor: "#ef4444", trainColor: "#ef4444", commuteColor: "#ef4444",
      bg: "linear-gradient(135deg,rgba(239,68,68,0.15),rgba(220,38,38,0.08))",
      border: "rgba(239,68,68,0.4)", labelColor: "#ef4444", label: "🔴 RED ALERT",
    },
    orange: {
      verdict: "⚠️ Go out only if urgent",
      advice: `${area} has active waterlogging. Use elevated routes, avoid subways and underpasses.`,
      travelRisk: "HIGH", floodRisk: "HIGH", trainRisk: "LIKELY DELAYED", commuteRisk: "RISKY",
      travelColor: "#f97316", floodColor: "#f59e0b", trainColor: "#f59e0b", commuteColor: "#f97316",
      bg: "linear-gradient(135deg,rgba(249,115,22,0.15),rgba(245,158,11,0.08))",
      border: "rgba(249,115,22,0.4)", labelColor: "#f97316", label: "🟠 ORANGE ALERT",
    },
    yellow: {
      verdict: "🟡 Proceed with caution",
      advice: `Light rain in ${area}. Check your specific route before leaving. Carry an umbrella.`,
      travelRisk: "MODERATE", floodRisk: "MODERATE", trainRisk: "MINOR DELAYS", commuteRisk: "CAUTION",
      travelColor: "#f59e0b", floodColor: "#f59e0b", trainColor: "#f59e0b", commuteColor: "#f59e0b",
      bg: "linear-gradient(135deg,rgba(245,158,11,0.12),rgba(234,179,8,0.06))",
      border: "rgba(245,158,11,0.35)", labelColor: "#f59e0b", label: "🟡 YELLOW ALERT",
    },
    green: {
      verdict: "✅ Safe to go out",
      advice: `${area} is clear right now. No active flooding reported. Normal commute expected.`,
      travelRisk: "LOW", floodRisk: "LOW", trainRisk: "RUNNING NORMAL", commuteRisk: "NORMAL",
      travelColor: "#10b981", floodColor: "#10b981", trainColor: "#10b981", commuteColor: "#10b981",
      bg: "linear-gradient(135deg,rgba(16,185,129,0.1),rgba(5,150,105,0.05))",
      border: "rgba(16,185,129,0.3)", labelColor: "#10b981", label: "🟢 GREEN — ALL CLEAR",
    },
  };
  return decisions[alertLevel];
}

function statusFromScore(s) {
  if (s >= 80) return "severe";
  if (s >= 55) return "high";
  if (s >= 30) return "moderate";
  return "safe";
}

function mostRecentTime(reportsArr) {
  if (reportsArr.length === 0) return null;
  return reportsArr.reduce((latest, r) =>
    new Date(r.created_at) > new Date(latest.created_at) ? r : latest
  ).created_at;
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


// ── Push Notification Hook ────────────────────────────────────────────────────
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || "";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

function usePushNotifications(username) {
  const [permission, setPermission] = useState(Notification.permission);
  const [subscribed, setSubscribed] = useState(false);

  async function subscribe() {
    try {
      // Register service worker
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      // Request permission
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") return;

      // Subscribe to push
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      // Save to server
      const key  = sub.getKey("p256dh");
      const auth = sub.getKey("auth");
      await fetch("/api/save-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: sub.endpoint,
          p256dh:   btoa(String.fromCharCode(...new Uint8Array(key))),
          auth:     btoa(String.fromCharCode(...new Uint8Array(auth))),
          username,
        }),
      });

      setSubscribed(true);
      localStorage.setItem("mr_push_subscribed", "true");
    } catch (err) {
      console.error("Push subscription failed:", err);
    }
  }

  async function unsubscribe() {
    const reg = await navigator.serviceWorker.getRegistration();
    if (reg) {
      const sub = await reg.pushManager.getSubscription();
      if (sub) await sub.unsubscribe();
    }
    setSubscribed(false);
    localStorage.removeItem("mr_push_subscribed");
  }

  useEffect(() => {
    if (localStorage.getItem("mr_push_subscribed") === "true") setSubscribed(true);
  }, []);

  return { permission, subscribed, subscribe, unsubscribe };
}

// ── Notification Bell Button ──────────────────────────────────────────────────
function NotificationBell({ permission, subscribed, subscribe, unsubscribe }) {
  const [loading, setLoading] = useState(false);
  const [toast, setToast]     = useState("");

  async function toggle() {
    setLoading(true);
    if (subscribed) {
      await unsubscribe();
      setToast("🔕 Notifications turned off");
    } else {
      await subscribe();
      setToast("🔔 You will get alerts for Red & Orange alerts!");
    }
    setLoading(false);
    setTimeout(() => setToast(""), 3500);
  }

  if (!("Notification" in window) || !("serviceWorker" in navigator)) return null;

  return (
    <>
      {toast && (
        <div style={{ position:"fixed", bottom:90, left:"50%", transform:"translateX(-50%)", background:"#1e3a5f", color:"#e8edf5", padding:"12px 20px", borderRadius:12, fontSize:13, fontWeight:600, zIndex:999, whiteSpace:"nowrap", border:"1px solid rgba(56,189,248,0.3)" }}>
          {toast}
        </div>
      )}
      <button onClick={toggle} disabled={loading} style={{
        display:"flex", alignItems:"center", gap:6,
        background: subscribed ? "rgba(56,189,248,0.15)" : "rgba(255,255,255,0.05)",
        border: subscribed ? "1px solid rgba(56,189,248,0.4)" : "1px solid #1e2f4a",
        borderRadius:20, padding:"5px 12px",
        color: subscribed ? "#38bdf8" : "#6b7f99",
        fontSize:12, fontWeight:600,
        fontFamily:"'Space Grotesk',sans-serif",
        cursor:"pointer"
      }}>
        <span style={{ fontSize:14 }}>{subscribed ? "🔔" : "🔕"}</span>
        {loading ? "..." : subscribed ? "Alerts ON" : "Get Alerts"}
      </button>
    </>
  );
}


// ── Scrolling Ticker Banner ───────────────────────────────────────────────────
function TickerBanner() {
  const [messages, setMessages] = useState([]);

  const fetchTicker = useCallback(async () => {
    const { data } = await supabase
      .from("site_ticker")
      .select("*")
      .eq("active", true)
      .order("priority", { ascending: true });
    if (data) setMessages(data.map(d => d.message));
  }, []);

  useEffect(() => {
    fetchTicker();
    const ch = supabase.channel("ticker_live")
      .on("postgres_changes", { event: "*", schema: "public", table: "site_ticker" }, () => fetchTicker())
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [fetchTicker]);

  if (messages.length === 0) return null;

  const combined = messages.join("   •   ");
  // Duration scales with text length so long combined messages don't scroll too fast
  const duration = Math.max(18, combined.length * 0.13);

  return (
    <div style={{
      background: "linear-gradient(90deg, rgba(56,189,248,0.12), rgba(37,99,235,0.08))",
      border: "1px solid rgba(56,189,248,0.25)",
      borderRadius: 10, padding: "8px 0", marginBottom: 12,
      overflow: "hidden", position: "relative", whiteSpace: "nowrap"
    }}>
      <div style={{
        display: "inline-block",
        paddingLeft: "100%",
        animation: `ticker-scroll ${duration}s linear infinite`,
        fontSize: 12.5, fontWeight: 600, color: "#38bdf8",
        fontFamily: "'Space Grotesk',sans-serif"
      }}>
        {combined}
      </div>
    </div>
  );
}

// ── Rain Canvas ───────────────────────────────────────────────────────────────
function RainCanvas({ intensity = 1 }) {
  const ref = useRef();
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas.getContext("2d");
    let drops = [], raf;
    const count = Math.round(30 + 70 * intensity);
    function resize() {
      canvas.width = window.innerWidth; canvas.height = window.innerHeight;
      drops = Array.from({ length: count }, () => ({
        x: Math.random()*canvas.width, y: Math.random()*canvas.height,
        speed: 4+Math.random()*6*intensity, len: 15+Math.random()*25,
        opacity: 0.03+Math.random()*0.1*intensity,
      }));
    }
    resize();
    window.addEventListener("resize", resize);
    function draw() {
      ctx.clearRect(0,0,canvas.width,canvas.height);
      drops.forEach(d => {
        ctx.beginPath(); ctx.moveTo(d.x,d.y); ctx.lineTo(d.x-1,d.y+d.len);
        ctx.strokeStyle=`rgba(56,189,248,${d.opacity})`; ctx.lineWidth=1; ctx.stroke();
        d.y+=d.speed; if(d.y>canvas.height){d.y=-d.len;d.x=Math.random()*canvas.width;}
      });
      raf = requestAnimationFrame(draw);
    }
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, [intensity]);
  return <canvas ref={ref} style={{ position:"fixed", inset:0, zIndex:0, pointerEvents:"none" }} />;
}


// ── Share Button ──────────────────────────────────────────────────────────────
function ShareButton({ alertLevel, weather, areaData }) {
  const [shared, setShared] = useState(false);

  function share() {
    const severeAreas = areaData
      .filter(a => a.status === "severe")
      .slice(0, 3)
      .map(a => a.name)
      .join(", ");

    const highAreas = areaData
      .filter(a => a.status === "high")
      .slice(0, 2)
      .map(a => a.name)
      .join(", ");

    const messages = {
      red:    `🔴 *MUMBAI RED ALERT* 🔴\n\nSevere flooding right now!\n📍 ${severeAreas || "Multiple areas"}\n\nDo NOT step out. Roads blocked.\n\n🌧️ Check live: https://mumbairainwatch.com`,
      orange: `🟠 *MUMBAI ORANGE ALERT* 🟠\n\nActive waterlogging in multiple areas.\n📍 ${severeAreas || highAreas || "Multiple areas"}\n\nAvoid subways and low-lying roads.\n\n🌧️ Check live: https://mumbairainwatch.com`,
      yellow: `🟡 *MUMBAI YELLOW ALERT* 🟡\n\nLight rain — proceed with caution.\nCheck your route before stepping out.\n\n🌧️ Check live: https://mumbairainwatch.com`,
      green:  `🟢 *MUMBAI IS CLEAR* ✅\n\nNo active flooding right now.\nSafe to commute!\n\n🌧️ Check live: https://mumbairainwatch.com`,
    };

    const text = messages[alertLevel];

    if (navigator.share) {
      navigator.share({
        title: "MumbaiRainWatch Alert",
        text,
        url: "https://mumbairainwatch.com"
      }).catch(() => {});
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
    }

    setShared(true);
    setTimeout(() => setShared(false), 3000);
  }

  const colors = {
    red: "#ef4444", orange: "#f97316",
    yellow: "#f59e0b", green: "#10b981"
  };
  const c = colors[alertLevel];

  return (
    <button onClick={share} style={{
      width: "100%", marginTop: 12, padding: "12px 16px",
      borderRadius: 12, border: `1px solid ${c}44`,
      background: shared ? c+"25" : c+"12",
      color: c, fontSize: 14, fontWeight: 600,
      fontFamily: "'Space Grotesk', sans-serif",
      cursor: "pointer", display: "flex",
      alignItems: "center", justifyContent: "center", gap: 8,
      transition: "all 0.2s"
    }}>
      {shared ? "✅ Shared! Stay safe Mumbai 🙏" : "📤 Share this alert on WhatsApp"}
    </button>
  );
}

// ── Decision Hero Card ────────────────────────────────────────────────────────
function DecisionHero({ alertLevel, weather, userArea, areaData }) {
  const d = getDecision(alertLevel, weather, userArea);
  const pulse = alertLevel === "red" || alertLevel === "orange";

  return (
    <div style={{ background:d.bg, border:`1px solid ${d.border}`, borderRadius:20, padding:20, marginBottom:16, position:"relative", overflow:"hidden" }}>
      {pulse && <div style={{ position:"absolute", top:0, left:0, right:0, height:2, background:`linear-gradient(90deg,transparent,${d.labelColor},transparent)`, animation:"scan 2s ease-in-out infinite" }}/>}

      {/* Alert label + timestamp */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
        <div style={{ fontSize:11, fontWeight:700, color:d.labelColor, fontFamily:"'Space Mono',monospace", letterSpacing:1 }}>{d.label}</div>
        <div style={{ fontSize:10, color:"#4a5568", fontFamily:"'Space Mono',monospace" }}>{new Date().toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"})} IST</div>
      </div>

      {/* Main verdict */}
      <div style={{ fontSize:24, fontWeight:700, marginBottom:6, lineHeight:1.2 }}>{d.verdict}</div>
      <div style={{ fontSize:13, color:"#9ca3af", lineHeight:1.5, marginBottom:16 }}>{d.advice}</div>

      {/* Impact layer grid */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
        {[
          { icon:"🚦", label:"Travel Risk",   value:d.travelRisk,   color:d.travelColor },
          { icon:"🌊", label:"Flood Risk",    value:d.floodRisk,    color:d.floodColor  },
          { icon:"🚆", label:"Train Status",  value:d.trainRisk,    color:d.trainColor  },
          { icon:"🛵", label:"Commute",       value:d.commuteRisk,  color:d.commuteColor},
        ].map((item,i) => (
          <div key={i} style={{ background:"rgba(0,0,0,0.25)", borderRadius:12, padding:"10px 12px" }}>
            <div style={{ fontSize:11, color:"#6b7f99", marginBottom:4 }}>{item.icon} {item.label}</div>
            <div style={{ fontSize:13, fontWeight:700, color:item.color, fontFamily:"'Space Mono',monospace" }}>{item.value}</div>
          </div>
        ))}
      </div>

      {/* Rain intensity bar */}
      {weather && (
        <div style={{ marginTop:14 }}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
            <div style={{ fontSize:10, color:"#6b7f99" }}>Rain intensity</div>
            <div style={{ fontSize:10, color:"#38bdf8", fontFamily:"'Space Mono',monospace" }}>{weather.rain} mm/h · {weather.desc}</div>
          </div>
          <div style={{ height:4, borderRadius:2, background:"#1e2f4a", overflow:"hidden" }}>
            <div style={{ height:"100%", borderRadius:2, background:`linear-gradient(90deg,#f59e0b,${d.labelColor})`, width:`${Math.min(100,weather.rain*5+5)}%`, transition:"width 1.5s ease" }}/>
          </div>
        </div>
      )}
      <ShareButton alertLevel={alertLevel} weather={weather} areaData={areaData}/>
    </div>
  );
}

// ── Location Banner ───────────────────────────────────────────────────────────
function LocationBanner({ userArea, onDetect, detecting }) {
  return (
    <div style={{ background:"rgba(56,189,248,0.06)", border:"1px solid rgba(56,189,248,0.15)", borderRadius:12, padding:"12px 14px", marginBottom:12, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
      <div>
        <div style={{ fontSize:12, color:"#38bdf8", fontWeight:600 }}>📍 {userArea || "Location not set"}</div>
        <div style={{ fontSize:11, color:"#6b7f99", marginTop:2 }}>Used for personalised alerts</div>
      </div>
      <button onClick={onDetect} disabled={detecting} style={{ background:"rgba(56,189,248,0.15)", border:"1px solid rgba(56,189,248,0.3)", color:"#38bdf8", borderRadius:8, padding:"6px 12px", fontSize:11, fontWeight:600, fontFamily:"'Space Grotesk',sans-serif", cursor:"pointer" }}>
        {detecting ? "Detecting…" : userArea ? "Update" : "Detect"}
      </button>
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

// ── Weather Strip ─────────────────────────────────────────────────────────────
function WeatherStrip({ weather }) {
  if (!weather) return <div style={{ background:"#0d1526", border:"1px solid #1e2f4a", borderRadius:12, padding:"14px 16px", marginBottom:8, fontSize:12, color:"#6b7f99", textAlign:"center" }}>Loading weather…</div>;
  return (
    <div style={{ background:"#0d1526", border:"1px solid #1e2f4a", borderRadius:12, padding:"14px 16px", marginBottom:8, display:"flex", alignItems:"center", justifyContent:"space-between", position:"relative" }}>
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
        <div style={{ fontSize:12, color:"#6b7f99" }}>Rain <strong style={{ color:"#38bdf8" }}>{weather.rain} mm/h{weather.isEstimated ? "*" : ""}</strong></div>
      </div>
      {weather.isEstimated && (
        <div style={{ position:"absolute", bottom:2, right:8, fontSize:9, color:"#4a5568" }}>*estimated from conditions</div>
      )}
    </div>
  );
}

// ── Area Card ─────────────────────────────────────────────────────────────────
function AreaCard({ area, onClick, onQuickReport, username }) {
  const c = SEV_COLOR[area.status];
  const [quickOpen, setQuickOpen] = useState(false);
  const [sending, setSending] = useState(false);

  const freshnessText = area.lastReportAt
    ? `Last report ${timeAgo(area.lastReportAt)}`
    : "No reports yet — be first";

  async function quickSubmit(e, severity) {
    e.stopPropagation();
    setSending(true);
    await onQuickReport(area.name, severity);
    setSending(false);
    setQuickOpen(false);
  }

  return (
    <div style={{ background:"#0d1526", border:`1px solid ${c}55`, borderRadius:12, padding:"13px 15px", position:"relative", overflow:"hidden", marginBottom:8 }}>
      <div onClick={onClick} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", cursor:"pointer" }}>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:15, fontWeight:600, marginBottom:3 }}>{area.name}</div>
          <div style={{ fontSize:12, color:"#6b7f99", display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
            <span>{area.zone}</span>
            <span style={{ background:"rgba(56,189,248,0.1)", border:"1px solid rgba(56,189,248,0.2)", borderRadius:20, padding:"2px 8px", color:area.reports>0?"#38bdf8":"#4a5568", fontFamily:"'Space Mono',monospace", fontSize:11 }}>
              👥 {area.reports}
            </span>
          </div>
          <div style={{ fontSize:10, color: area.status==="unknown" ? "#f59e0b" : "#4a5568", marginTop:4, fontFamily:"'Space Mono',monospace" }}>
            {area.status === "unknown" && "⚠️ "}{freshnessText}
          </div>
        </div>
        <div style={{ background:c+"22", color:c, border:`1px solid ${c}44`, borderRadius:20, padding:"4px 10px", fontSize:11, fontWeight:600, fontFamily:"'Space Mono',monospace", whiteSpace:"nowrap" }}>{SEV_LABEL[area.status]}</div>
      </div>

      {/* Quick report toggle */}
      <div onClick={e=>{e.stopPropagation(); setQuickOpen(o=>!o);}} style={{ marginTop:10, display:"flex", alignItems:"center", justifyContent:"center", gap:6, padding:"6px", borderRadius:8, background:"rgba(56,189,248,0.06)", border:"1px dashed rgba(56,189,248,0.25)", cursor:"pointer" }}>
        <span style={{ fontSize:11, color:"#38bdf8", fontWeight:600 }}>{quickOpen ? "Cancel" : "📍 Quick Report — is this still accurate?"}</span>
      </div>

      {quickOpen && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:6, marginTop:8 }}>
          {[
            { key:"moderate", label:"🌊 Ankle", color:SEV_COLOR.moderate },
            { key:"high",     label:"🚗 Knee",  color:SEV_COLOR.high },
            { key:"severe",   label:"🚨 Blocked", color:SEV_COLOR.severe },
          ].map(s=>(
            <button key={s.key} disabled={sending} onClick={e=>quickSubmit(e,s.key)} style={{ padding:"8px 4px", borderRadius:8, border:`1px solid ${s.color}44`, background:s.color+"15", color:s.color, fontSize:11, fontWeight:600, fontFamily:"'Space Grotesk',sans-serif", cursor:"pointer" }}>
              {s.label}
            </button>
          ))}
        </div>
      )}

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

// ── Train Card ────────────────────────────────────────────────────────────────
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
        <div style={{ fontSize:11, color:"#4a5568", fontFamily:"'Space Mono',monospace" }}>{reportCount>0?`${reportCount} reports · ${lastReport}`:"No reports yet"}</div>
        <button onClick={()=>onReport(line)} style={{ background:"rgba(56,189,248,0.1)", border:"1px solid rgba(56,189,248,0.25)", color:"#38bdf8", borderRadius:8, padding:"5px 12px", fontSize:12, fontFamily:"'Space Grotesk',sans-serif", cursor:"pointer", fontWeight:600 }}>Report</button>
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

// ── Quick Report Modal ────────────────────────────────────────────────────────
function QuickReportModal({ type, target, username, onClose, onSubmit }) {
  const [selected, setSelected] = useState(null);
  const [sending, setSending]   = useState(false);
  const opts = type==="train" ? TRAIN_STATUS_OPTS : TRAFFIC_OPTS;

  async function submit() {
    if (!selected) return;
    setSending(true);
    const table   = type==="train" ? "train_reports" : "traffic_reports";
    const payload = type==="train"
      ? { line_id:target.id, line_label:target.label, status:selected, username }
      : { route_id:target.id, route_label:target.label, status:selected, username };
    await supabase.from(table).insert(payload);
    setSending(false);
    onSubmit(); onClose();
  }

  return (
    <div onClick={e=>e.target===e.currentTarget&&onClose()} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", backdropFilter:"blur(4px)", zIndex:300, display:"flex", alignItems:"flex-end", padding:16 }}>
      <div style={{ background:"#0d1526", border:"1px solid #1e2f4a", borderRadius:20, padding:24, width:"100%" }}>
        <div style={{ fontSize:16, fontWeight:700, marginBottom:4 }}>Report {target.label}</div>
        <div style={{ fontSize:13, color:"#6b7f99", marginBottom:16 }}>What is the current status?</div>
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

// ── Commute Tab ───────────────────────────────────────────────────────────────
function CommuteTab({ username }) {
  const [trainReports,   setTrainReports]   = useState([]);
  const [trafficReports, setTrafficReports] = useState([]);
  const [modal, setModal] = useState(null);
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
    const c1 = supabase.channel("train_r").on("postgres_changes",{event:"INSERT",schema:"public",table:"train_reports"},fetchAll).subscribe();
    const c2 = supabase.channel("traffic_r").on("postgres_changes",{event:"INSERT",schema:"public",table:"traffic_reports"},fetchAll).subscribe();
    return () => { supabase.removeChannel(c1); supabase.removeChannel(c2); };
  }, [fetchAll]);

  const getTrainStatus  = id => trainReports.find(r=>r.line_id===id)?.status || "normal";
  const getTrafficStatus= id => trafficReports.find(r=>r.route_id===id)?.status || "clear";
  const getCount = (arr,k,v) => arr.filter(r=>r[k]===v).length;
  const getLast  = (arr,k,v) => { const r=arr.find(r=>r[k]===v); return r?timeAgo(r.created_at):""; };

  return (
    <div style={{ paddingTop:8 }}>
      {toast && <div style={{ position:"fixed", bottom:90, left:"50%", transform:"translateX(-50%)", background:"#10b981", color:"#fff", padding:"12px 20px", borderRadius:12, fontSize:13, fontWeight:600, zIndex:999, whiteSpace:"nowrap" }}>{toast}</div>}
      <SectionLabel>🚆 Local Train Status</SectionLabel>
      <div style={{ background:"rgba(56,189,248,0.06)", border:"1px solid rgba(56,189,248,0.15)", borderRadius:10, padding:"10px 14px", marginBottom:12, fontSize:12, color:"#6b7f99", lineHeight:1.5 }}>
        Crowdsourced by commuters. Tap <strong style={{ color:"#38bdf8" }}>Report</strong> to update your line.
      </div>
      {TRAIN_LINES.map(line=>(
        <TrainCard key={line.id} line={line}
          status={getTrainStatus(line.id)}
          reportCount={getCount(trainReports,"line_id",line.id)}
          lastReport={getLast(trainReports,"line_id",line.id)}
          onReport={l=>setModal({type:"train",target:l})}
        />
      ))}
      <SectionLabel>🚗 Traffic Status</SectionLabel>
      {TRAFFIC_ROUTES.map(route=>(
        <TrafficCard key={route.id} route={route}
          status={getTrafficStatus(route.id)}
          reportCount={getCount(trafficReports,"route_id",route.id)}
          lastReport={getLast(trafficReports,"route_id",route.id)}
          onReport={r=>setModal({type:"traffic",target:r})}
        />
      ))}
      {modal && (
        <QuickReportModal type={modal.type} target={modal.target} username={username}
          onClose={()=>setModal(null)}
          onSubmit={()=>{ setToast("✅ Status updated. Thanks!"); fetchAll(); setTimeout(()=>setToast(""),3000); }}
        />
      )}
    </div>
  );
}

// ── Report Tab ────────────────────────────────────────────────────────────────
function ReportTab({ username, onReportSubmit }) {
  const [area, setArea]     = useState("");
  const [sev, setSev]       = useState(null);
  const [note, setNote]     = useState("");
  const [sending, setSending] = useState(false);
  const [toast, setToast]   = useState("");
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
    { key:"high",     label:"🚗 Knee deep",   sub:"Cars affected"    },
    { key:"severe",   label:"🚨 Impassable",  sub:"Road blocked"     },
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
    const ch = supabase.channel("chat_live").on("postgres_changes",{event:"INSERT",schema:"public",table:"chat_messages"},payload=>{
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

  const SYS = [{ id:"sys1", username:"🌧️ MumbaiRainWatch", message:"Welcome! Share live updates, ask about your route, help fellow Mumbaikars stay safe. 🙏", created_at:new Date(Date.now()-3600000).toISOString(), isSystem:true }];
  const all  = [...SYS, ...messages];

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"calc(100vh - 160px)", paddingTop:8 }}>
      <SectionLabel>💬 Community Chat</SectionLabel>
      <div style={{ flex:1, overflowY:"auto", display:"flex", flexDirection:"column", gap:10, paddingBottom:8 }}>
        {all.map((m,i)=>{
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
        <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&(e.preventDefault(),send())} placeholder="Share an update or ask about a route…" maxLength={300} style={{ flex:1, background:"#131f35", border:"1px solid #1e2f4a", color:"#e8edf5", fontFamily:"'Space Grotesk',sans-serif", fontSize:13, padding:"11px 14px", borderRadius:12, outline:"none" }}/>
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
        <div style={{ fontSize:17, fontWeight:700, marginBottom:8 }}>About MumbaiRainWatch.com</div>
        <div style={{ fontSize:13, color:"#6b7f99", lineHeight:1.7 }}>Mumbai's first decision-first flood alert platform. We don't just show data — we tell you what to do. Real reports from real Mumbaikars, updated every minute during monsoon.</div>
      </div>
      <div style={{ background:"#0d1526", border:"1px solid #1e2f4a", borderRadius:16, padding:20, marginBottom:12 }}>
        <div style={{ fontSize:14, fontWeight:600, marginBottom:14 }}>How it works</div>
        {[
          { icon:"🚦", t:"Decision Engine",      b:"Combines rain data + crowd reports + train status into one clear verdict: Go / Caution / Stay Home" },
          { icon:"🌧️", t:"Live rain data",        b:"OpenWeatherMap rainfall updated every 15 minutes for Mumbai" },
          { icon:"👥", t:"Crowdsourced reports",  b:"Mumbaikars report waterlogging, train delays and traffic in real time" },
          { icon:"📍", t:"Location aware",        b:"Detects your area and personalises the alert and commute advice for you" },
          { icon:"💬", t:"Community chat",        b:"Talk to fellow Mumbaikars live — ask about routes, share updates" },
        ].map((h,i)=>(
          <div key={i} style={{ display:"flex", gap:12, alignItems:"flex-start", marginBottom:14 }}>
            <div style={{ fontSize:20 }}>{h.icon}</div>
            <div><div style={{ fontSize:13, fontWeight:600 }}>{h.t}</div><div style={{ fontSize:12, color:"#6b7f99" }}>{h.b}</div></div>
          </div>
        ))}
      </div>
      <div style={{ background:"#0d1526", border:"1px solid #1e2f4a", borderRadius:16, padding:20, marginBottom:12 }}>
        <div style={{ fontSize:14, fontWeight:600, marginBottom:8 }}>For housing societies & businesses</div>
        <div style={{ fontSize:13, color:"#6b7f99", lineHeight:1.6, marginBottom:14 }}>Dedicated area dashboard + WhatsApp alerts for your pincode. Starting ₹199/month.</div>
        <div style={{ background:"rgba(56,189,248,0.08)", border:"1px solid rgba(56,189,248,0.2)", borderRadius:10, padding:12, fontSize:12, color:"#38bdf8", textAlign:"center", fontWeight:600 }}>📩 Please contact for any suggestions to eternalep35@gmail.com</div>
      </div>
      <div style={{ background:"#0d1526", border:"1px solid #1e2f4a", borderRadius:16, padding:20 }}>
        <div style={{ fontSize:14, fontWeight:600, marginBottom:10 }}>Privacy Policy</div>
        <div style={{ fontSize:12, color:"#6b7f99", lineHeight:1.7 }}>
          MumbaiRainWatch collects location data (only when you tap Detect) and crowd-submitted reports to provide flood, train and traffic alerts. We do not sell personal data to third parties. We use cookies and similar technologies, including Google AdSense, to serve relevant ads — Google may use cookies to personalise ads based on your visits to this and other sites. You can opt out of personalised advertising through Google Ads Settings. Reports submitted are anonymous unless you choose a display name. Location data is stored only in your browser (localStorage) and is not sent to our servers except when submitting a report tagged to an area. By using this site you consent to this policy. Contact eternalep35@gmail.com for any privacy concerns.
        </div>
      </div>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab]             = useState("home");
  const [weather, setWeather]     = useState(null);
  const [reports, setReports]     = useState([]);
  const [trainReports, setTrainReports]     = useState([]);
  const [trafficReports, setTrafficReports] = useState([]);
  const [modalArea, setModalArea] = useState(null);
  const [lastUpdated, setLastUpdated] = useState("");
  const [userArea, setUserArea]   = useState(() => localStorage.getItem("mr_area") || "");
  const [userCoords, setUserCoords] = useState(() => {
    const saved = localStorage.getItem("mr_coords");
    return saved ? JSON.parse(saved) : null;
  });
  const [detecting, setDetecting] = useState(false);
  const [username] = useState(()=>localStorage.getItem("mr_username")||(()=>{const n=randomName();localStorage.setItem("mr_username",n);return n;})());
  const { permission, subscribed, subscribe, unsubscribe } = usePushNotifications(username);

  const rainFactor = weather
    ? weather.rain > 20 ? 0.85
    : weather.rain > 10 ? 0.6
    : weather.rain > 5  ? 0.35
    : weather.rain > 1  ? 0.15
    : 0 : 0;

  const areaData = AREAS.map(a => {
    const ar = reports.filter(r=>r.area_name===a.name);
    const userScore = ar.reduce((acc,r)=>acc+SEV_SCORE[r.severity]*15,0);
    const rainScore = Math.round(a.riskBase * rainFactor);
    const score = Math.min(100, rainScore + userScore);
    const lastReportAt = mostRecentTime(ar);
    const hoursSinceReport = lastReportAt ? (Date.now() - new Date(lastReportAt)) / 3600000 : Infinity;
    // If it's actively raining but no fresh report (< 3hrs) for this area, we don't know the real status
    const isStale = hoursSinceReport > 3;
    const isRaining = weather && weather.rain > 1;
    const status = (isRaining && isStale) ? "unknown" : statusFromScore(score);
    return { ...a, reports:ar.length, score, status, lastReportAt, hoursSinceReport };
  }).sort((a,b) => {
    // Sort: severe/high first, then unknowns during rain, then rest by score
    const order = { severe:0, high:1, unknown:2, moderate:3, safe:4 };
    return (order[a.status] ?? 5) - (order[b.status] ?? 5) || b.score - a.score;
  });

  const alertLevel = computeAlertLevel(weather, areaData, trainReports, trafficReports);
  const severeCount = areaData.filter(a=>a.status==="severe").length;
  const safeCount   = areaData.filter(a=>a.status==="safe").length;

  // Location detection
  async function detectLocation() {
    setDetecting(true);
    if (!navigator.geolocation) { setDetecting(false); return; }
    navigator.geolocation.getCurrentPosition(async pos => {
      try {
        const { latitude: lat, longitude: lon } = pos.coords;
        const coords = { lat, lon };
        setUserCoords(coords);
        localStorage.setItem("mr_coords", JSON.stringify(coords));

        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=16&addressdetails=1`, {
          headers: { "Accept-Language": "en" }
        });
        const data = await res.json();
        const addr = data.address || {};
        const name = addr.suburb || addr.neighbourhood || addr.residential
                   || addr.quarter || addr.city_district || addr.town
                   || addr.city || "Mumbai";
        setUserArea(name);
        localStorage.setItem("mr_area", name);
        fetchWeather(coords); // refresh weather using precise coords immediately
      } catch { setUserArea("Mumbai"); }
      setDetecting(false);
    }, () => { setDetecting(false); }, { enableHighAccuracy: true, timeout: 10000 });
  }

  // Estimate rain intensity (mm/h) from condition text when OWM's raw mm field is missing/zero.
  // OWM's rain.1h field is frequently empty for Indian stations even during real heavy rain.
  function estimateRainFromCondition(main, description) {
    const desc = (description || "").toLowerCase();
    if (main === "Thunderstorm") return desc.includes("light") ? 8 : desc.includes("heavy") ? 30 : 18;
    if (main === "Rain") {
      if (desc.includes("extreme") || desc.includes("very heavy")) return 35;
      if (desc.includes("heavy")) return 22;
      if (desc.includes("moderate")) return 10;
      if (desc.includes("light")) return 3;
      return 12; // generic "rain"
    }
    if (main === "Drizzle") return desc.includes("heavy") ? 4 : 1.5;
    return 0;
  }

  async function fetchWeather(coords) {
    try {
      const useCoords = coords || userCoords;
      const url = useCoords
        ? `https://api.openweathermap.org/data/2.5/weather?lat=${useCoords.lat}&lon=${useCoords.lon}&appid=${OWM_API_KEY}&units=metric`
        : `https://api.openweathermap.org/data/2.5/weather?q=Mumbai,IN&appid=${OWM_API_KEY}&units=metric`;
      const res = await fetch(url);
      const d   = await res.json();
      const main = d.weather[0].main;
      const description = d.weather[0].description;
      const rawRain = d.rain?.["1h"] ?? d.rain?.["3h"] ?? 0;
      // If OWM didn't give us a real mm value but the condition says it's actively raining, estimate it
      const rain = rawRain > 0 ? rawRain : estimateRainFromCondition(main, description);
      const icons = { Thunderstorm:"⛈️", Drizzle:"🌦️", Rain:"🌧️", Clouds:"☁️", Clear:"☀️", Mist:"🌫️", Fog:"🌫️" };
      setWeather({ temp:Math.round(d.main.temp), desc:description, humidity:d.main.humidity, wind:Math.round(d.wind.speed*3.6), rain:parseFloat(rain.toFixed(1)), icon:icons[main]||"🌧️", isEstimated: rawRain === 0 && rain > 0 });
    } catch {}
  }

  async function fetchReports() {
    const since = new Date(Date.now()-6*3600*1000).toISOString();
    const [fr, tr, tfr] = await Promise.all([
      supabase.from("flood_reports").select("*").gte("created_at",since).order("created_at",{ascending:false}),
      supabase.from("train_reports").select("*").gte("created_at",new Date(Date.now()-2*3600*1000).toISOString()).order("created_at",{ascending:false}),
      supabase.from("traffic_reports").select("*").gte("created_at",new Date(Date.now()-2*3600*1000).toISOString()).order("created_at",{ascending:false}),
    ]);
    if (fr.data)  setReports(fr.data);
    if (tr.data)  setTrainReports(tr.data);
    if (tfr.data) setTrafficReports(tfr.data);
    const now = new Date();
    setLastUpdated(`${now.getHours().toString().padStart(2,"0")}:${now.getMinutes().toString().padStart(2,"0")} IST`);
  }

  async function handleQuickReport(areaName, severity) {
    await supabase.from("flood_reports").insert({ area_name: areaName, severity, username });
    await fetchReports();
  }

  const prevAlertRef = useRef(null);

  useEffect(() => {
    if (prevAlertRef.current && prevAlertRef.current !== alertLevel) {
      if ((alertLevel === "red" || alertLevel === "orange") && subscribed) {
        const messages = {
          red:    { title:"🔴 Mumbai RED ALERT", body:"Severe flooding active. Do NOT step out now." },
          orange: { title:"🟠 Mumbai ORANGE ALERT", body:"Active waterlogging. Avoid subways and low-lying roads." },
        };
        const msg = messages[alertLevel];
        fetch("/api/send-push", {
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body: JSON.stringify({
            secret: import.meta.env.VITE_PUSH_SECRET,
            alertLevel,
            title: msg.title,
            body:  msg.body,
          })
        }).catch(()=>{});
      }
    }
    prevAlertRef.current = alertLevel;
  }, [alertLevel]);

  useEffect(() => {
    fetchWeather(); fetchReports();
    const interval = setInterval(()=>{ fetchWeather(); fetchReports(); }, 5*60*1000);
    const ch = supabase.channel("all_reports")
      .on("postgres_changes",{event:"INSERT",schema:"public",table:"flood_reports"},()=>fetchReports())
      .on("postgres_changes",{event:"INSERT",schema:"public",table:"train_reports"},()=>fetchReports())
      .on("postgres_changes",{event:"INSERT",schema:"public",table:"traffic_reports"},()=>fetchReports())
      .subscribe();
    return () => { clearInterval(interval); supabase.removeChannel(ch); };
  }, [userCoords]);

  const rainIntensity = weather ? Math.min(1, weather.rain / 20) : 0;

  const navItems = [
    { key:"home",    icon:"🚦", label:"Alert"   },
    { key:"commute", icon:"🚆", label:"Commute" },
    { key:"report",  icon:"📍", label:"Report"  },
    { key:"chat",    icon:"💬", label:"Chat"    },
    { key:"about",   icon:"ℹ️",  label:"About"  },
  ];

  return (
    <div style={{ background:"#060c1a", color:"#e8edf5", fontFamily:"'Space Grotesk',sans-serif", minHeight:"100vh" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        body{background:#060c1a;overflow-x:hidden;}
        ::-webkit-scrollbar{width:4px;}::-webkit-scrollbar-track{background:#0d1526;}::-webkit-scrollbar-thumb{background:#1e2f4a;border-radius:2px;}
        select option{background:#131f35;color:#e8edf5;}
        input::placeholder{color:#4a5568;}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}
        @keyframes scan{0%,100%{opacity:0.3}50%{opacity:1}}
        @keyframes ticker-scroll{0%{transform:translateX(0)}100%{transform:translateX(-100%)}}
      `}</style>

      <RainCanvas intensity={rainIntensity}/>

      <div style={{ maxWidth:480, margin:"0 auto", padding:"0 14px 88px", position:"relative", zIndex:1 }}>

        {/* Header */}
        <div style={{ padding:"18px 0 12px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ fontSize:24 }}>🌧️</span>
            <div>
              <div style={{ fontFamily:"'Space Mono',monospace", fontSize:14, fontWeight:700, color:"#38bdf8", letterSpacing:-0.5 }}>MumbaiRainWatch.com</div>
              <div style={{ fontSize:10, color:"#6b7f99", letterSpacing:1, textTransform:"uppercase" }}>Know before you go</div>
            </div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <NotificationBell permission={permission} subscribed={subscribed} subscribe={subscribe} unsubscribe={unsubscribe}/>
            <div style={{ display:"flex", alignItems:"center", gap:6, background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.3)", padding:"4px 10px", borderRadius:20, fontSize:11, color:"#f87171", fontFamily:"'Space Mono',monospace" }}>
              <div style={{ width:6, height:6, borderRadius:"50%", background:"#ef4444", animation:"pulse 1.5s infinite" }}/>LIVE
            </div>
          </div>
        </div>

        <TickerBanner/>

        {/* HOME TAB */}
        {tab==="home" && <>
          <LocationBanner userArea={userArea} onDetect={detectLocation} detecting={detecting}/>
          <DecisionHero alertLevel={alertLevel} weather={weather} userArea={userArea} areaData={areaData}/>
          <WeatherStrip weather={weather}/>

          {/* Stats */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, marginBottom:8 }}>
            {[
              { num:reports.length,  label:"Reports today" },
              { num:severeCount,     label:"Severe zones"  },
              { num:safeCount,       label:"Areas clear"   },
            ].map((s,i)=>(
              <div key={i} style={{ background:"#0d1526", border:"1px solid #1e2f4a", borderRadius:12, padding:"14px 12px", textAlign:"center" }}>
                <div style={{ fontFamily:"'Space Mono',monospace", fontSize:22, fontWeight:700, color:"#38bdf8" }}>{s.num}</div>
                <div style={{ fontSize:11, color:"#6b7f99", marginTop:3 }}>{s.label}</div>
              </div>
            ))}
          </div>

          <SectionLabel>Area Status — {areaData.length} zones</SectionLabel>
          {weather && weather.rain > 1 && areaData.some(a=>a.status==="unknown") && (
            <div style={{ background:"rgba(245,158,11,0.08)", border:"1px solid rgba(245,158,11,0.25)", borderRadius:10, padding:"10px 14px", marginBottom:10, fontSize:12, color:"#fbbf24", lineHeight:1.5 }}>
              ⚪ Areas marked <strong>Unconfirmed</strong> have no recent reports — status unknown. Tap Quick Report if you're nearby.
            </div>
          )}
          {areaData.map(a=><AreaCard key={a.name} area={a} onClick={()=>setModalArea(a)} onQuickReport={handleQuickReport} username={username}/>)}
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
          <div key={n.key} onClick={()=>setTab(n.key)} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4, color:tab===n.key?"#38bdf8":"#6b7f99", fontSize:10, cursor:"pointer", padding:"4px 8px", transition:"color 0.15s" }}>
            <span style={{ fontSize:20 }}>{n.icon}</span>{n.label}
          </div>
        ))}
      </div>
    </div>
  );
}
