/**
 * VisualAnalyticsDashboard.jsx
 * ─────────────────────────────────────────────────────────────
 * Interactive visual analytics dashboard with coordinated views,
 * storytelling flow, brushing/linking, and drill-down capabilities.
 * ─────────────────────────────────────────────────────────────
 */

import React, { useEffect, useRef, useState, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  PieChart, Pie, Cell, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Brush, ComposedChart, ReferenceLine,
} from "recharts";
import {
  TrendingUp, Filter, ChevronDown, WifiOff, Eye,
  Target, Zap, BarChart2, PieChart as PieIcon, GitBranch,
  AlertTriangle, ArrowUpRight, ArrowDownRight, Minus,
} from "lucide-react";

const API_BASE = "http://localhost:3001";
const WS_URL = "ws://localhost:3001";

const ATHLETE_COLORS = ["#6366f1","#10b981","#f59e0b","#ef4444","#8b5cf6","#3b82f6"];
const METRIC_COLORS = { hr: "#ef4444", temp: "#f59e0b", motion: "#6366f1", resp: "#10b981", steps: "#3b82f6" };

function parseTs(ts) {
  if (!ts || typeof ts !== "string") return null;
  if (ts.includes("/")) {
    const [dp, tp] = ts.split(" ");
    const [dd, mm, yy] = dp.split("/");
    const d = new Date(`${yy}-${mm?.padStart(2,"0")}-${dd?.padStart(2,"0")}T${tp || "00:00:00"}`);
    return isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(ts);
  return isNaN(d.getTime()) ? null : d;
}
function motionMag(r) {
  if (!r?.motion) return 0;
  const { accel_x:ax=0, accel_y:ay=0, accel_z:az=0 } = r.motion;
  return Math.sqrt(ax*ax+ay*ay+az*az)/16384;
}
function avg(arr) { return arr.length ? arr.reduce((a,b)=>a+b,0)/arr.length : 0; }
function pearson(x,y) {
  const n=x.length; if(n<3) return 0;
  const mx=avg(x), my=avg(y);
  let num=0,dx2=0,dy2=0;
  for(let i=0;i<n;i++){const a=x[i]-mx,b=y[i]-my;num+=a*b;dx2+=a*a;dy2+=b*b;}
  const den=Math.sqrt(dx2*dy2);
  return den===0?0:num/den;
}

/* ── Shared UI components ──────────────────────────────────── */

function ChartTip({ active, payload, label, t }) {
  if (!active||!payload?.length) return null;
  return (
    <div style={{ background:t.card, border:`1px solid ${t.border}`, borderRadius:10, padding:"8px 12px", boxShadow:t.shadow, fontSize:11, fontFamily:"'DM Sans',monospace" }}>
      <p style={{ color:t.muted, marginBottom:4, fontWeight:700 }}>{label}</p>
      {payload.map((p,i)=>(
        <p key={i} style={{ color:p.color||p.stroke, fontWeight:700, marginBottom:2 }}>
          {p.name}: <span style={{color:t.text}}>{typeof p.value==="number"?p.value.toFixed(1):p.value}</span>
        </p>
      ))}
    </div>
  );
}

function Card({ title, icon:Icon, children, t, span, action }) {
  return (
    <div className="card-fadein" style={{
      background:t.card, border:`1px solid ${t.border}`, borderRadius:16,
      padding:"1.125rem 1.25rem", boxShadow:t.shadow,
      gridColumn: span ? `span ${span}` : undefined,
    }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          {Icon && <Icon size={14} color={t.accent} />}
          <p style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.10em", color:t.muted, fontFamily:"'DM Sans',monospace" }}>{title}</p>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function KPICard({ title, value, unit, change, color, icon:Icon, t }) {
  const isUp = change > 0;
  const isDown = change < 0;
  const TrendIcon = isUp ? ArrowUpRight : isDown ? ArrowDownRight : Minus;
  const trendColor = isUp ? t.success : isDown ? t.danger : t.muted;
  return (
    <div className="card-fadein" style={{
      background:t.card, border:`1px solid ${t.border}`, borderRadius:16,
      padding:"1rem 1.25rem", flex:1, minWidth:0, boxShadow:t.shadow,
      position:"relative", overflow:"hidden",
    }}>
      <div style={{ position:"absolute", top:0, left:0, right:0, height:3, background:`linear-gradient(90deg,${color},${color}40)` }}/>
      <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:8 }}>
        {Icon && <Icon size={13} color={color} strokeWidth={2.5} />}
        <p style={{ fontSize:10, fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase", color:t.muted, fontFamily:"'DM Sans',monospace" }}>{title}</p>
      </div>
      <div style={{ display:"flex", alignItems:"flex-end", gap:6 }}>
        <span style={{ fontSize:32, fontWeight:800, lineHeight:1, color, fontFamily:"'DM Sans',monospace", letterSpacing:"-1.5px" }}>{value}</span>
        <span style={{ fontSize:12, fontWeight:600, color:t.muted, marginBottom:4 }}>{unit}</span>
        {change !== undefined && (
          <div style={{ display:"flex", alignItems:"center", gap:2, marginBottom:4, marginLeft:"auto" }}>
            <TrendIcon size={12} color={trendColor} />
            <span style={{ fontSize:10, fontWeight:700, color:trendColor }}>{Math.abs(change).toFixed(1)}%</span>
          </div>
        )}
      </div>
    </div>
  );
}

function Select({ label, options, value, onChange, t }) {
  const [open, setOpen] = useState(false);
  const ref = useRef();
  useEffect(()=>{const h=e=>{if(ref.current&&!ref.current.contains(e.target))setOpen(false);};document.addEventListener("mousedown",h);return()=>document.removeEventListener("mousedown",h);},[]);
  const display = options.find(o=>o.value===value)?.label || label;
  return (
    <div ref={ref} style={{ position:"relative", minWidth:140 }}>
      <button onClick={()=>setOpen(o=>!o)} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:6, width:"100%", padding:"7px 12px", borderRadius:10, background:t.surface, border:`1px solid ${t.border}`, cursor:"pointer", fontSize:12, fontWeight:600, color:t.text, fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
        <span style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{display}</span>
        <ChevronDown size={12} color={t.muted} style={{ transform:open?"rotate(180deg)":"none", transition:"transform 0.2s" }}/>
      </button>
      {open && (
        <div style={{ position:"absolute", top:"calc(100% + 4px)", left:0, right:0, zIndex:200, background:t.card, border:`1px solid ${t.border}`, borderRadius:12, boxShadow:t.shadowHover, maxHeight:200, overflow:"auto" }}>
          {options.map(opt=>(
            <button key={opt.value} onClick={()=>{onChange(opt.value);setOpen(false);}} style={{ display:"block", width:"100%", padding:"8px 14px", background:value===opt.value?t.accentBg:"transparent", border:"none", cursor:"pointer", fontSize:12, fontWeight:value===opt.value?700:500, color:value===opt.value?t.accent:t.text, fontFamily:"'Plus Jakarta Sans',sans-serif", textAlign:"left" }}>
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function MultiSelect({ label, options, value, onChange, t }) {
  const [open, setOpen] = useState(false);
  const ref = useRef();
  useEffect(()=>{const h=e=>{if(ref.current&&!ref.current.contains(e.target))setOpen(false);};document.addEventListener("mousedown",h);return()=>document.removeEventListener("mousedown",h);},[]);
  const display = value.length===0?label:value.length===options.length?"All Athletes":`${value.length} selected`;
  return (
    <div ref={ref} style={{ position:"relative", minWidth:160 }}>
      <button onClick={()=>setOpen(o=>!o)} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:6, width:"100%", padding:"7px 12px", borderRadius:10, background:t.surface, border:`1px solid ${t.border}`, cursor:"pointer", fontSize:12, fontWeight:600, color:t.text, fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
        <span style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{display}</span>
        <ChevronDown size={12} color={t.muted} style={{ transform:open?"rotate(180deg)":"none", transition:"transform 0.2s" }}/>
      </button>
      {open && (
        <div style={{ position:"absolute", top:"calc(100% + 4px)", left:0, right:0, zIndex:200, background:t.card, border:`1px solid ${t.border}`, borderRadius:12, boxShadow:t.shadowHover, maxHeight:220, overflow:"auto" }}>
          {options.map(opt=>{
            const sel=value.includes(opt.value);
            return (
              <button key={opt.value} onClick={()=>onChange(sel?value.filter(v=>v!==opt.value):[...value,opt.value])} style={{ display:"flex", alignItems:"center", gap:8, width:"100%", padding:"8px 14px", background:sel?t.accentBg:"transparent", border:"none", cursor:"pointer", fontSize:12, fontWeight:sel?700:500, color:sel?t.accent:t.text, fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
                <div style={{ width:14, height:14, borderRadius:4, border:`2px solid ${sel?t.accent:t.border}`, background:sel?t.accent:"transparent", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  {sel && <span style={{color:"#fff",fontSize:9,fontWeight:900}}>✓</span>}
                </div>
                {opt.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Story section wrapper ─────────────────────────────────── */
function StorySection({ number, title, subtitle, children, t }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
        <div style={{
          width:28, height:28, borderRadius:8,
          background:"linear-gradient(135deg,#4f46e5,#7c3aed)",
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:12, fontWeight:800, color:"#fff", fontFamily:"'DM Sans',monospace",
        }}>{number}</div>
        <div>
          <p style={{ fontSize:14, fontWeight:800, color:t.text, fontFamily:"'Syne',sans-serif" }}>{title}</p>
          {subtitle && <p style={{ fontSize:11, color:t.muted }}>{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────── */
/* ── MAIN COMPONENT ────────────────────────────────────────── */
/* ──────────────────────────────────────────────────────────── */

export default function VisualAnalyticsDashboard({ t }) {
  const [athletes, setAthletes] = useState([]);
  const [allRecords, setAllRecords] = useState({});
  const [liveLatest, setLiveLatest] = useState({});
  const [wsConnected, setWsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const wsRef = useRef(null);

  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const myAthleteId = user?.athleteId;

  // Filters
  const [dateRange, setDateRange] = useState("all");
  const [filterAthletes, setFilterAthletes] = useState([]);
  const [focusMetric, setFocusMetric] = useState("all");
  const [brushIndex, setBrushIndex] = useState(null);

  const ATHLETE_META = {
    ATH_001:{name:"Marcus Thorne",sport:"Elite Runner"},
    ATH_002:{name:"Sarah Chen",sport:"Cyclist"},
    ATH_003:{name:"Diego Ramirez",sport:"Swimmer"},
    ATH_004:{name:"Aisha Patel",sport:"Sprinter"},
  };

  /* ── Data Fetch ──────────────────────────────────────────── */
  useEffect(()=>{
    setLoading(true);
    fetch(`${API_BASE}/api/athletes`)
      .then(r=>r.json())
      .then(async({athletes:list})=>{
        const filtered=(!isAdmin&&myAthleteId)?(list||[]).filter(a=>a.id===myAthleteId):(list||[]);
        setAthletes(filtered);
        setFilterAthletes(filtered.map(a=>a.id));
        const latMap={};
        list?.forEach(a=>{if(a.latest)latMap[a.id]=a.latest;});
        setLiveLatest(latMap);
        const hists=await Promise.all(
          (list||[]).map(a=>
            fetch(`${API_BASE}/api/athletes/${a.id}/history?limit=300`)
              .then(r=>r.json())
              .then(d=>({id:a.id,readings:(d.readings||[]).reverse()}))
              .catch(()=>({id:a.id,readings:[]}))
          )
        );
        const rec={};
        hists.forEach(h=>{rec[h.id]=h.readings;});
        setAllRecords(rec);
        setLoading(false);
      })
      .catch(()=>setLoading(false));
  },[]);

  /* ── WebSocket ───────────────────────────────────────────── */
  useEffect(()=>{
    let destroyed=false;
    function connect(){
      if(destroyed) return;
      const ws=new WebSocket(WS_URL);
      wsRef.current=ws;
      ws.onopen=()=>{if(!destroyed)setWsConnected(true);};
      ws.onclose=()=>{if(!destroyed){setWsConnected(false);setTimeout(connect,3000);}};
      ws.onerror=()=>ws.close();
      ws.onmessage=(evt)=>{
        if(destroyed)return;
        try{
          const msg=JSON.parse(evt.data);
          if(msg.type==="live_update"&&msg.athlete_id&&msg.data){
            const{athlete_id:id,data}=msg;
            setLiveLatest(p=>({...p,[id]:data}));
            setAllRecords(p=>({...p,[id]:[...(p[id]||[]),data].slice(-300)}));
          }
        }catch(e){}
      };
    }
    connect();
    return()=>{destroyed=true;wsRef.current?.close();};
  },[]);

  /* ── Computed Data ───────────────────────────────────────── */
  const activeIds = useMemo(()=>filterAthletes.length?filterAthletes:athletes.map(a=>a.id),[filterAthletes,athletes]);

  const cutoff = useMemo(()=>{
    if(dateRange==="all")return null;
    const d=new Date(); d.setDate(d.getDate()-parseInt(dateRange)); return d;
  },[dateRange]);

  const filteredRecords = useMemo(()=>{
    return activeIds.flatMap(id=>
      (allRecords[id]||[]).filter(r=>{
        if(!cutoff)return true;
        const d=parseTs(r.timestamp);
        return d&&d>=cutoff;
      }).map(r=>({...r,_id:id}))
    );
  },[allRecords,activeIds,cutoff]);

  /* ── KPI Calculations ───────────────────────────────────── */
  const kpis = useMemo(()=>{
    const hrs=[],temps=[],resps=[],steps=[],motions=[];
    filteredRecords.forEach(r=>{
      const hr=r?.heart_rate?.bpm_avg; if(hr>0) hrs.push(hr);
      const tp=r?.temperature?.celsius; if(tp>0) temps.push(tp);
      const rr=r?.respiration?.rate_avg; if(rr>0) resps.push(rr);
      const st=r?.motion?.step_count; if(st>0) steps.push(st);
      const mg=motionMag(r); if(mg>0) motions.push(mg);
    });
    const half=Math.floor(hrs.length/2);
    const hrFirst=hrs.slice(0,half), hrSecond=hrs.slice(half);
    const hrChange=avg(hrFirst)>0?((avg(hrSecond)-avg(hrFirst))/avg(hrFirst))*100:0;
    return {
      avgHR: hrs.length?Math.round(avg(hrs)):0, hrChange,
      avgTemp: temps.length?(avg(temps)).toFixed(1):"--",
      avgResp: resps.length?Math.round(avg(resps)):0,
      totalSteps: steps.length?Math.max(...steps):0,
      avgMotion: motions.length?(avg(motions)).toFixed(2):"--",
      dataPoints: filteredRecords.length,
    };
  },[filteredRecords]);

  /* ── Timeline Data ───────────────────────────────────────── */
  const timelineData = useMemo(()=>{
    const step=Math.max(1,Math.floor(filteredRecords.length/80));
    const points=[];
    for(let i=0;i<filteredRecords.length;i+=step){
      const slice=filteredRecords.slice(i,i+step);
      const d=parseTs(slice[0]?.timestamp);
      points.push({
        label: d?`${d.getMonth()+1}/${d.getDate()} ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`:`P${points.length+1}`,
        HR: Math.round(avg(slice.map(r=>r?.heart_rate?.bpm_avg||0).filter(Boolean))),
        Temp: parseFloat(avg(slice.map(r=>r?.temperature?.celsius||0).filter(Boolean)).toFixed(1)),
        Motion: parseFloat(avg(slice.map(r=>motionMag(r))).toFixed(2)),
        Resp: Math.round(avg(slice.map(r=>r?.respiration?.rate_avg||0).filter(Boolean))),
      });
    }
    return points;
  },[filteredRecords]);

  /* ── Correlation Matrix ──────────────────────────────────── */
  const correlationData = useMemo(()=>{
    const fields=["HR","Temp","Motion","Resp","Steps"];
    const arrs={HR:[],Temp:[],Motion:[],Resp:[],Steps:[]};
    filteredRecords.forEach(r=>{
      arrs.HR.push(r?.heart_rate?.bpm_avg||0);
      arrs.Temp.push(r?.temperature?.celsius||0);
      arrs.Motion.push(motionMag(r));
      arrs.Resp.push(r?.respiration?.rate_avg||0);
      arrs.Steps.push(r?.motion?.step_count||0);
    });
    const matrix=[];
    fields.forEach((f1,i)=>{
      fields.forEach((f2,j)=>{
        matrix.push({row:i,col:j,r1:f1,r2:f2,val:i===j?1:parseFloat(pearson(arrs[f1],arrs[f2]).toFixed(2))});
      });
    });
    return {matrix,fields};
  },[filteredRecords]);

  /* ── Radar Data ──────────────────────────────────────────── */
  const radarData = useMemo(()=>{
    const dims=["Cardio","Endurance","Recovery","Intensity","Consistency"];
    return activeIds.map((id,idx)=>{
      const recs=allRecords[id]||[];
      const hrs=recs.map(r=>r?.heart_rate?.bpm_avg||0).filter(Boolean);
      const mgs=recs.map(r=>motionMag(r));
      const temps=recs.map(r=>r?.temperature?.celsius||0).filter(Boolean);
      const meta=ATHLETE_META[id]||{name:id};
      const cardio=hrs.length?Math.min(100,Math.max(0,(avg(hrs)-40)*1.2)):50;
      const endurance=recs.length?Math.min(100,recs.length*2):10;
      const recovery=temps.length?Math.min(100,Math.max(0,(38-avg(temps))*40)):50;
      const intensity=mgs.length?Math.min(100,avg(mgs)*25):0;
      const stddev=hrs.length>1?Math.sqrt(hrs.reduce((s,v)=>s+(v-avg(hrs))**2,0)/hrs.length):50;
      const consistency=Math.max(0,100-stddev*2);
      return {id,name:meta.name,color:ATHLETE_COLORS[idx%ATHLETE_COLORS.length],
        data:dims.map((d,di)=>({dim:d,val:Math.round([cardio,endurance,recovery,intensity,consistency][di])}))
      };
    });
  },[allRecords,activeIds]);

  /* ── HR Zone Distribution ────────────────────────────────── */
  const zoneData = useMemo(()=>{
    const zones=[
      {name:"Rest",range:"<60",color:"#3b82f6",count:0},
      {name:"Light",range:"60-100",color:"#10b981",count:0},
      {name:"Moderate",range:"100-140",color:"#f59e0b",count:0},
      {name:"Hard",range:"140-170",color:"#f97316",count:0},
      {name:"Max",range:"170+",color:"#ef4444",count:0},
    ];
    filteredRecords.forEach(r=>{
      const hr=r?.heart_rate?.bpm_avg||0;
      if(hr<=0)return;
      if(hr<60)zones[0].count++;
      else if(hr<100)zones[1].count++;
      else if(hr<140)zones[2].count++;
      else if(hr<170)zones[3].count++;
      else zones[4].count++;
    });
    const total=zones.reduce((s,z)=>s+z.count,0);
    return zones.map(z=>({...z,pct:total?Math.round(z.count/total*100):0}));
  },[filteredRecords]);

  /* ── Anomaly Detection ───────────────────────────────────── */
  const anomalies = useMemo(()=>{
    const hrs=filteredRecords.map(r=>r?.heart_rate?.bpm_avg||0).filter(Boolean);
    const temps=filteredRecords.map(r=>r?.temperature?.celsius||0).filter(Boolean);
    const meanHR=avg(hrs), stdHR=hrs.length>1?Math.sqrt(hrs.reduce((s,v)=>s+(v-meanHR)**2,0)/hrs.length):0;
    const meanTemp=avg(temps), stdTemp=temps.length>1?Math.sqrt(temps.reduce((s,v)=>s+(v-meanTemp)**2,0)/temps.length):0;
    const flags=[];
    filteredRecords.forEach((r,i)=>{
      const hr=r?.heart_rate?.bpm_avg||0;
      const temp=r?.temperature?.celsius||0;
      const d=parseTs(r.timestamp);
      const time=d?`${d.getMonth()+1}/${d.getDate()} ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`:"--";
      const meta=ATHLETE_META[r._id]||{name:r._id};
      if(hr>0&&stdHR>0&&Math.abs(hr-meanHR)>2*stdHR){
        flags.push({type:"Heart Rate",athlete:meta.name,value:`${hr.toFixed(0)} bpm`,time,severity:Math.abs(hr-meanHR)>3*stdHR?"critical":"warning"});
      }
      if(temp>0&&stdTemp>0&&Math.abs(temp-meanTemp)>2*stdTemp){
        flags.push({type:"Temperature",athlete:meta.name,value:`${temp.toFixed(1)}°C`,time,severity:Math.abs(temp-meanTemp)>3*stdTemp?"critical":"warning"});
      }
      if(hr>185) flags.push({type:"HR Ceiling",athlete:meta.name,value:`${hr.toFixed(0)} bpm`,time,severity:"critical"});
      if(temp>38.5) flags.push({type:"Hyperthermia",athlete:meta.name,value:`${temp.toFixed(1)}°C`,time,severity:"critical"});
    });
    return flags.slice(0,20);
  },[filteredRecords]);

  /* ── Athlete Comparison Bars ─────────────────────────────── */
  const comparisonData = useMemo(()=>{
    return activeIds.map((id,idx)=>{
      const recs=allRecords[id]||[];
      const meta=ATHLETE_META[id]||{name:id};
      const hrs=recs.map(r=>r?.heart_rate?.bpm_avg||0).filter(Boolean);
      const temps=recs.map(r=>r?.temperature?.celsius||0).filter(Boolean);
      const mgs=recs.map(r=>motionMag(r));
      return {
        name:meta.name?.split(" ")[0]||id,
        "Avg HR":hrs.length?Math.round(avg(hrs)):0,
        "Avg Temp":temps.length?parseFloat(avg(temps).toFixed(1)):0,
        "Activity":mgs.length?parseFloat((avg(mgs)*10).toFixed(1)):0,
        "Sessions":recs.length,
      };
    });
  },[allRecords,activeIds]);

  /* ──────────────────────────────────────────────────────── */
  /* ── RENDER ────────────────────────────────────────────── */
  /* ──────────────────────────────────────────────────────── */

  const dateOpts=[{value:"all",label:"All Time"},{value:"7",label:"Last 7 days"},{value:"30",label:"Last 30 days"},{value:"90",label:"Last 90 days"}];
  const metricOpts=[{value:"all",label:"All Metrics"},{value:"hr",label:"Heart Rate"},{value:"temp",label:"Temperature"},{value:"motion",label:"Motion"},{value:"resp",label:"Respiration"}];
  const athleteOpts=athletes.map((a,i)=>({value:a.id,label:ATHLETE_META[a.id]?.name||a.id}));

  return (
    <main style={{ flex:1, overflow:"auto", padding:"1.25rem", display:"flex", flexDirection:"column", gap:14 }}>
      {/* ── Header ──────────────────────────────────────────── */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div>
          <h1 style={{ fontFamily:"'Syne',sans-serif", fontSize:20, fontWeight:800, color:t.text, letterSpacing:"0.02em" }}>
            Visual Analytics &amp; Insights
          </h1>
          <p style={{ fontSize:11, color:t.muted, marginTop:2 }}>
            📊 Storytelling through data · {kpis.dataPoints} data points · {activeIds.length} athlete(s)
          </p>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ display:"flex", alignItems:"center", gap:5, padding:"5px 12px", borderRadius:99, fontSize:10, fontWeight:700, fontFamily:"'DM Sans',monospace", background:wsConnected?t.successBg:t.dangerBg, color:wsConnected?t.success:t.danger, border:`1px solid ${wsConnected?t.success+"30":t.danger+"30"}` }}>
            {wsConnected?<><span style={{width:6,height:6,borderRadius:"50%",background:t.success,animation:"pulse 1.6s infinite"}}/>LIVE</>:<><WifiOff size={10}/>OFFLINE</>}
          </span>
        </div>
      </div>

      {/* ── Filters Bar ─────────────────────────────────────── */}
      <div className="card-fadein" style={{ background:t.card, border:`1px solid ${t.border}`, borderRadius:14, padding:"0.875rem 1.25rem", boxShadow:t.shadow }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
          <Filter size={13} color={t.muted} />
          <p style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.10em", color:t.muted, fontFamily:"'DM Sans',monospace" }}>Interactive Filters</p>
        </div>
        <div style={{ display:"flex", gap:10, flexWrap:"wrap", alignItems:"center" }}>
          <Select label="Date Range" options={dateOpts} value={dateRange} onChange={setDateRange} t={t} />
          <Select label="Metric Focus" options={metricOpts} value={focusMetric} onChange={setFocusMetric} t={t} />
          {isAdmin && <MultiSelect label="Athletes" options={athleteOpts} value={filterAthletes} onChange={setFilterAthletes} t={t} />}
        </div>
      </div>

      {/* ── Story 1: The Big Picture ────────────────────────── */}
      <StorySection number="1" title="The Big Picture" subtitle="Overview of key performance indicators across all selected athletes" t={t}>
        <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
          <KPICard title="Avg Heart Rate" value={kpis.avgHR} unit="bpm" change={kpis.hrChange} color={METRIC_COLORS.hr} icon={TrendingUp} t={t} />
          <KPICard title="Avg Temperature" value={kpis.avgTemp} unit="°C" color={METRIC_COLORS.temp} icon={TrendingUp} t={t} />
          <KPICard title="Avg Respiration" value={kpis.avgResp} unit="br/min" color={METRIC_COLORS.resp} icon={TrendingUp} t={t} />
          <KPICard title="Peak Steps" value={kpis.totalSteps.toLocaleString()} unit="steps" color={METRIC_COLORS.steps} icon={TrendingUp} t={t} />
          <KPICard title="Avg Motion" value={kpis.avgMotion} unit="g" color={METRIC_COLORS.motion} icon={Zap} t={t} />
          <KPICard title="Data Points" value={kpis.dataPoints} unit="records" color={t.accent} icon={BarChart2} t={t} />
        </div>
      </StorySection>

      {/* ── Story 2: Trends Over Time ───────────────────────── */}
      <StorySection number="2" title="Tracking Progress" subtitle="Multi-metric time series — brush to select a range and filter other views" t={t}>
        <Card title="Synchronized Multi-Metric Timeline" icon={TrendingUp} t={t}>
          {timelineData.length > 1 ? (
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart data={timelineData} margin={{top:5,right:10,bottom:5,left:0}}>
                <CartesianGrid stroke={t.chartGrid} strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{fontSize:9,fill:t.muted}} interval="preserveStartEnd" />
                <YAxis yAxisId="hr" tick={{fontSize:9,fill:t.muted}} domain={["auto","auto"]} />
                <YAxis yAxisId="temp" orientation="right" tick={{fontSize:9,fill:t.muted}} domain={["auto","auto"]} />
                <Tooltip content={<ChartTip t={t}/>} />
                <Legend wrapperStyle={{fontSize:10,fontFamily:"'DM Sans',monospace"}} />
                {(focusMetric==="all"||focusMetric==="hr") && <Area yAxisId="hr" type="monotone" dataKey="HR" stroke={METRIC_COLORS.hr} fill={METRIC_COLORS.hr+"20"} strokeWidth={2} name="Heart Rate" dot={false} />}
                {(focusMetric==="all"||focusMetric==="temp") && <Line yAxisId="temp" type="monotone" dataKey="Temp" stroke={METRIC_COLORS.temp} strokeWidth={2} name="Temperature" dot={false} />}
                {(focusMetric==="all"||focusMetric==="motion") && <Line yAxisId="hr" type="monotone" dataKey="Motion" stroke={METRIC_COLORS.motion} strokeWidth={1.5} name="Motion (g)" dot={false} strokeDasharray="4 2" />}
                {(focusMetric==="all"||focusMetric==="resp") && <Line yAxisId="hr" type="monotone" dataKey="Resp" stroke={METRIC_COLORS.resp} strokeWidth={1.5} name="Respiration" dot={false} />}
                <Brush dataKey="label" height={28} stroke={t.accent} fill={t.surface} travellerWidth={8} />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <p style={{fontSize:12,color:t.muted,textAlign:"center",padding:40}}>No data available for the selected filters.</p>
          )}
        </Card>
      </StorySection>

      {/* ── Story 3: Understanding Relationships ────────────── */}
      <StorySection number="3" title="Understanding Relationships" subtitle="Correlation heatmap reveals which metrics move together" t={t}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
          <Card title="Variable Correlation Matrix" icon={GitBranch} t={t}>
            <div style={{ display:"flex", justifyContent:"center" }}>
              <svg viewBox="0 0 320 320" style={{ width:"100%", maxWidth:320 }}>
                {correlationData.fields.map((f,i)=>(
                  <text key={`lx-${i}`} x={60+i*50+25} y={48} textAnchor="middle" fontSize="9" fontWeight="700" fill={t.muted} fontFamily="'DM Sans',monospace">{f}</text>
                ))}
                {correlationData.fields.map((f,i)=>(
                  <text key={`ly-${i}`} x={52} y={60+i*50+28} textAnchor="end" fontSize="9" fontWeight="700" fill={t.muted} fontFamily="'DM Sans',monospace">{f}</text>
                ))}
                {correlationData.matrix.map((cell,idx)=>{
                  const v=cell.val;
                  const absV=Math.abs(v);
                  const r=v>0?Math.round(79+176*absV):Math.round(59+0*absV);
                  const g=v>0?Math.round(70+0*absV):Math.round(130+80*absV);
                  const b=v>0?Math.round(229+0*absV):Math.round(246-10*absV);
                  const color=cell.row===cell.col?t.accent:`rgba(${r},${g},${b},${0.15+absV*0.7})`;
                  return (
                    <g key={idx}>
                      <rect x={60+cell.col*50} y={55+cell.row*50} width={46} height={46} rx={6} fill={color} opacity={cell.row===cell.col?0.15:1} />
                      <text x={60+cell.col*50+23} y={55+cell.row*50+27} textAnchor="middle" fontSize={cell.row===cell.col?"8":"10"} fontWeight="700" fill={cell.row===cell.col?t.accent:t.text} fontFamily="'DM Sans',monospace">
                        {v.toFixed(2)}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
            <p style={{ fontSize:10, color:t.muted, textAlign:"center", marginTop:8, fontStyle:"italic" }}>
              Values range from -1 (inverse) to +1 (direct correlation). Diagonal = self-correlation.
            </p>
          </Card>

          {/* Radar Chart */}
          <Card title="Athlete Performance Profile" icon={Target} t={t}>
            {radarData.length > 0 && radarData[0].data.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={260}>
                  <RadarChart data={radarData[0].data} cx="50%" cy="50%" outerRadius="70%">
                    <PolarGrid stroke={t.border} />
                    <PolarAngleAxis dataKey="dim" tick={{fontSize:9,fill:t.muted,fontWeight:700}} />
                    <PolarRadiusAxis tick={{fontSize:8,fill:t.faint}} domain={[0,100]} />
                    {radarData.map((ath,i)=>(
                      <Radar key={ath.id} name={ath.name} dataKey="val" data={ath.data} stroke={ath.color} fill={ath.color} fillOpacity={0.15} strokeWidth={2} />
                    ))}
                    <Legend wrapperStyle={{fontSize:10}} />
                  </RadarChart>
                </ResponsiveContainer>
                <p style={{ fontSize:10, color:t.muted, textAlign:"center", fontStyle:"italic" }}>
                  Multi-dimensional view: Cardio · Endurance · Recovery · Intensity · Consistency
                </p>
              </>
            ) : (
              <p style={{fontSize:12,color:t.muted,textAlign:"center",padding:40}}>No data.</p>
            )}
          </Card>
        </div>
      </StorySection>

      {/* ── Story 4: Activity Zones ─────────────────────────── */}
      <StorySection number="4" title="Activity Zones" subtitle="Heart rate zone distribution and athlete comparison" t={t}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
          <Card title="Heart Rate Zone Distribution" icon={PieIcon} t={t}>
            <div style={{ display:"flex", alignItems:"center", gap:20 }}>
              <ResponsiveContainer width="50%" height={220}>
                <PieChart>
                  <Pie data={zoneData.filter(z=>z.count>0)} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="count" paddingAngle={3}>
                    {zoneData.filter(z=>z.count>0).map((z,i)=><Cell key={i} fill={z.color} />)}
                  </Pie>
                  <Tooltip content={<ChartTip t={t}/>} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ flex:1 }}>
                {zoneData.map((z,i)=>(
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                    <div style={{ width:10, height:10, borderRadius:3, background:z.color, flexShrink:0 }} />
                    <span style={{ fontSize:11, fontWeight:600, color:t.text, flex:1 }}>{z.name}</span>
                    <span style={{ fontSize:11, fontWeight:700, color:t.muted, fontFamily:"'DM Sans',monospace" }}>{z.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <Card title="Athlete Comparison" icon={BarChart2} t={t}>
            {comparisonData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={comparisonData} margin={{top:5,right:10,bottom:5,left:0}}>
                  <CartesianGrid stroke={t.chartGrid} strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{fontSize:9,fill:t.muted}} />
                  <YAxis tick={{fontSize:9,fill:t.muted}} />
                  <Tooltip content={<ChartTip t={t}/>} />
                  <Legend wrapperStyle={{fontSize:10}} />
                  <Bar dataKey="Avg HR" fill={METRIC_COLORS.hr} radius={[4,4,0,0]} barSize={16} />
                  <Bar dataKey="Activity" fill={METRIC_COLORS.motion} radius={[4,4,0,0]} barSize={16} />
                  <Bar dataKey="Sessions" fill={METRIC_COLORS.steps} radius={[4,4,0,0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p style={{fontSize:12,color:t.muted,textAlign:"center",padding:40}}>No comparison data.</p>
            )}
          </Card>
        </div>
      </StorySection>

      {/* ── Story 5: Anomaly Detection ──────────────────────── */}
      <StorySection number="5" title="Spotting Anomalies" subtitle="Statistically unusual readings flagged for review (>2σ from mean)" t={t}>
        <Card title={`Anomaly Detection · ${anomalies.length} flagged`} icon={AlertTriangle} t={t}>
          {anomalies.length > 0 ? (
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11, fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
                <thead>
                  <tr>
                    {["Severity","Type","Athlete","Value","Time"].map(h=>(
                      <th key={h} style={{ textAlign:"left", padding:"8px 12px", borderBottom:`1px solid ${t.border}`, fontSize:9, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", color:t.muted, fontFamily:"'DM Sans',monospace" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {anomalies.map((a,i)=>(
                    <tr key={i} style={{ borderBottom:`1px solid ${t.border}` }}>
                      <td style={{ padding:"8px 12px" }}>
                        <span style={{ padding:"2px 8px", borderRadius:6, fontSize:9, fontWeight:800, background:a.severity==="critical"?t.dangerBg:t.warningBg, color:a.severity==="critical"?t.danger:t.warning }}>
                          {a.severity.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding:"8px 12px", fontWeight:600, color:t.text }}>{a.type}</td>
                      <td style={{ padding:"8px 12px", color:t.muted }}>{a.athlete}</td>
                      <td style={{ padding:"8px 12px", fontWeight:700, color:t.text, fontFamily:"'DM Sans',monospace" }}>{a.value}</td>
                      <td style={{ padding:"8px 12px", color:t.faint, fontFamily:"'DM Sans',monospace" }}>{a.time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ textAlign:"center", padding:30 }}>
              <p style={{ fontSize:12, fontWeight:600, color:t.success }}>✅ No anomalies detected</p>
              <p style={{ fontSize:11, color:t.muted, marginTop:4 }}>All readings are within expected ranges.</p>
            </div>
          )}
        </Card>
      </StorySection>

      {/* ── Story 6: Decision Support ───────────────────────── */}
      <StorySection number="6" title="Making Decisions" subtitle="Actionable insights derived from the data analysis" t={t}>
        <Card title="AI-Ready Insights Summary" icon={Eye} t={t}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12 }}>
            {[
              { title:"Training Load", desc: kpis.avgHR > 140 ? "High training intensity detected — consider recovery sessions" : kpis.avgHR > 100 ? "Moderate training load — sustainable pace" : "Light training load — room for intensity increase", color: kpis.avgHR > 140 ? t.danger : kpis.avgHR > 100 ? t.warning : t.success },
              { title:"Thermal Status", desc: parseFloat(kpis.avgTemp) > 38 ? "⚠️ Elevated temperatures — monitor hydration" : parseFloat(kpis.avgTemp) > 37 ? "Slightly warm — normal during activity" : "Temperatures within healthy range", color: parseFloat(kpis.avgTemp) > 38 ? t.danger : parseFloat(kpis.avgTemp) > 37 ? t.warning : t.success },
              { title:"Anomaly Rate", desc: anomalies.length > 5 ? "Multiple anomalies detected — deeper review recommended" : anomalies.length > 0 ? `${anomalies.length} anomaly flag(s) — see details above` : "Clean data — no statistical outliers found", color: anomalies.length > 5 ? t.danger : anomalies.length > 0 ? t.warning : t.success },
            ].map((insight,i)=>(
              <div key={i} style={{ padding:"14px 16px", borderRadius:12, background:t.surface, border:`1px solid ${t.border}` }}>
                <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:8 }}>
                  <div style={{ width:8, height:8, borderRadius:"50%", background:insight.color }} />
                  <p style={{ fontSize:11, fontWeight:700, color:t.text }}>{insight.title}</p>
                </div>
                <p style={{ fontSize:11, color:t.muted, lineHeight:1.5 }}>{insight.desc}</p>
              </div>
            ))}
          </div>
          <p style={{ fontSize:10, color:t.faint, textAlign:"center", marginTop:12, fontStyle:"italic" }}>
            💡 Use the AI Assistant (bottom-right) to ask deeper questions about any of these insights.
          </p>
        </Card>
      </StorySection>
    </main>
  );
}
