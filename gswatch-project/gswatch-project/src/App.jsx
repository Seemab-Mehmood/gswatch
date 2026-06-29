import { useState, useEffect, useCallback } from "react";
import {
  BarChart, Bar, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis,
  Tooltip, CartesianGrid, LineChart, Line, Legend
} from "recharts";

// ─── Theme System ──────────────────────────────────────────────────────────
const DARK = {
  bg:        "#0B1F35",
  bgMid:     "#112840",
  card:      "#162F47",
  border:    "#1E3D56",
  text:      "#FFFFFF",
  textSub:   "#C8D8E4",
  muted:     "#6B8FA8",
  teal:      "#00AFBE",
  tealDim:   "#007F8C",
  tealGlow:  "rgba(0,175,190,0.15)",
  amber:     "#F5A623",
  green:     "#3DDC84",
  red:       "#E05C5C",
  headerBg:  "#112840",
  shadow:    "none",
  isDark:    true,
};
const LIGHT = {
  bg:        "#EEF7F9",
  bgMid:     "#FFFFFF",
  card:      "#FFFFFF",
  border:    "#C6DFE5",
  text:      "#0B1F35",
  textSub:   "#2A4A60",
  muted:     "#5A7A8E",
  teal:      "#007F8C",
  tealDim:   "#005F6A",
  tealGlow:  "rgba(0,127,140,0.10)",
  amber:     "#D4890E",
  green:     "#1D9A50",
  red:       "#C0392B",
  headerBg:  "#FFFFFF",
  shadow:    "0 1px 4px rgba(0,0,0,0.08)",
  isDark:    false,
};

// ─── InciSioN Countries by WHO Region ─────────────────────────────────────
const INCISION_COUNTRIES = {
  AFRO: ["Angola","Benin","Botswana","Burkina Faso","Burundi","Cameroon","Cape Verde",
    "Central African Republic","Chad","Comoros","Congo","Côte d'Ivoire",
    "Democratic Republic of Congo","Equatorial Guinea","Eritrea","Eswatini","Ethiopia",
    "Gabon","Gambia","Ghana","Guinea","Guinea-Bissau","Kenya","Lesotho","Liberia",
    "Madagascar","Malawi","Mali","Mauritania","Mauritius","Mozambique","Namibia",
    "Niger","Nigeria","Rwanda","São Tomé and Príncipe","Senegal","Sierra Leone",
    "Somalia","South Africa","South Sudan","Sudan","Tanzania","Togo","Uganda","Zambia","Zimbabwe"],
  EMRO: ["Afghanistan","Bahrain","Djibouti","Egypt","Iran","Iraq","Jordan","Kuwait",
    "Lebanon","Libya","Morocco","Oman","Pakistan","Palestine","Qatar",
    "Saudi Arabia","Syria","Tunisia","United Arab Emirates","Yemen"],
  EURO: ["Albania","Armenia","Austria","Azerbaijan","Belarus","Belgium",
    "Bosnia and Herzegovina","Bulgaria","Croatia","Cyprus","Czech Republic",
    "Denmark","Estonia","Finland","France","Georgia","Germany","Greece",
    "Hungary","Iceland","Ireland","Israel","Italy","Kazakhstan","Kosovo",
    "Kyrgyzstan","Latvia","Lithuania","Luxembourg","Malta","Moldova",
    "Montenegro","Netherlands","North Macedonia","Norway","Poland","Portugal",
    "Romania","Russia","Serbia","Slovakia","Slovenia","Spain","Sweden",
    "Switzerland","Tajikistan","Turkey","Turkmenistan","Ukraine","United Kingdom","Uzbekistan"],
  AMRO: ["Antigua and Barbuda","Argentina","Bahamas","Barbados","Belize","Bolivia",
    "Brazil","Canada","Chile","Colombia","Costa Rica","Cuba","Dominican Republic",
    "Ecuador","El Salvador","Grenada","Guatemala","Guyana","Haiti","Honduras",
    "Jamaica","Mexico","Nicaragua","Panama","Paraguay","Peru","Suriname",
    "Trinidad and Tobago","United States","Uruguay","Venezuela"],
  SEARO: ["Bangladesh","Bhutan","India","Indonesia","Maldives","Myanmar",
    "Nepal","North Korea","Sri Lanka","Thailand","Timor-Leste"],
  WPRO: ["Australia","Brunei","Cambodia","China","Cook Islands","Fiji","Japan",
    "Kiribati","Laos","Malaysia","Marshall Islands","Micronesia","Mongolia",
    "Nauru","New Zealand","Niue","Palau","Papua New Guinea","Philippines",
    "Samoa","Singapore","Solomon Islands","South Korea","Tonga","Tuvalu",
    "Vanuatu","Vietnam"],
};

const ALL_COUNTRIES_FLAT = Object.entries(INCISION_COUNTRIES)
  .flatMap(([region, countries]) => countries.map(c => ({ country: c, region })))
  .sort((a, b) => a.country.localeCompare(b.country));

const REGION_COLORS = {
  AFRO:"#00AFBE", EMRO:"#F5A623", EURO:"#3DDC84",
  AMRO:"#7B68EE", SEARO:"#E05C5C", WPRO:"#00B4D8"
};

// ─── API Storage (Neon via Express) ────────────────────────────────────────
async function loadSubmissions() {
  try {
    const res = await fetch('/api/submissions');
    if (!res.ok) return [];
    return await res.json();
  } catch { return []; }
}

async function postSubmission(payload) {
  try {
    await fetch('/api/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (e) { console.error('Submit failed', e); }
}

async function deleteSubmission(id, reason) {
  try {
    await fetch(`/api/submissions/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });
  } catch (e) { console.error('Delete failed', e); }
}

// ─── Aggregation ───────────────────────────────────────────────────────────
function aggregate(subs) {
  const n = subs.length;
  if (n === 0) return null;
  const count = (f, v) => subs.filter(s => s[f] === v).length;
  const pct   = (f, v) => Math.round(count(f,v)/n*100);

  const regionMap = {};
  subs.forEach(s => { if (s.region) regionMap[s.region] = (regionMap[s.region]||0)+1; });

  const avgWF = subs.reduce((a,s)=>a+(parseInt(s.t1q3)||0),0)/n;

  return {
    n,
    countries: [...new Set(subs.map(s=>s.country).filter(Boolean))],
    regions:   Object.keys(regionMap).length,
    regionData: Object.entries(regionMap).map(([name,value])=>({name,value,color:REGION_COLORS[name]||"#888"})),
    avgWF,
    supplyData: [
      {label:"Never",      value:count("t1q1","Never")},
      {label:"Rarely",     value:count("t1q1","Rarely (1–2 days)")},
      {label:"Sometimes",  value:count("t1q1","Sometimes (Weekly)")},
      {label:"Frequently", value:count("t1q1","Frequently (Daily)")},
    ],
    waitData: [
      {label:"< 2 wks", value:count("t1q2","< 2 weeks")},
      {label:"2–6 wks", value:count("t1q2","2–6 weeks")},
      {label:"1–6 mos", value:count("t1q2","1–6 months")},
      {label:"> 6 mos", value:count("t1q2","> 6 months")},
    ],
    travelData: [
      {label:"< 2 hrs", value:count("t2q1","< 2 hours (within Lancet target)"), col:"#3DDC84"},
      {label:"2–4 hrs", value:count("t2q1","2–4 hours"),  col:"#F5A623"},
      {label:"4–8 hrs", value:count("t2q1","4–8 hours"),  col:"#F5A623"},
      {label:"> 8 hrs", value:count("t2q1","> 8 hours"),  col:"#E05C5C"},
    ],
    radarData: [
      {subject:"Digital Infra",  A:pct("t2q4","Fully digital (EHR, broadband)")},
      {subject:"SSI Tracking",   A:pct("t2q3","Yes, systematic follow-ups")},
      {subject:"Curriculum",     A:pct("t3q1","Yes, mandatory course")},
      {subject:"Advocacy Voice", A:pct("t3q2","High (advisory panels/committees)")},
      {subject:"AI Openness",    A:Math.round((count("d2","Very open")+count("d2","Somewhat open"))/n*100)},
      {subject:"Awareness",      A:pct("t3q3","Yes")},
    ],
    facilities: {
      tertiary:  count("facility","Tertiary/Academic Referral Hospital"),
      district:  count("facility","District/Rural Hospital"),
      community: count("facility","Community Health Center"),
    },
  };
}

// ─── Reusable UI atoms ─────────────────────────────────────────────────────
const SC = ({ children, T, style={} }) => (
  <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:10,
    padding:20, boxShadow:T.shadow, ...style }}>
    {children}
  </div>
);

const SecTitle = ({ T, sub, children }) => (
  <div style={{marginBottom:14}}>
    <div style={{fontSize:10,color:T.teal,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:3}}>{sub}</div>
    <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:17,fontWeight:700,color:T.text}}>{children}</div>
  </div>
);

const KpiCard = ({ T, label, value, unit, color, sub }) => (
  <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:10,
    padding:"15px 18px",flex:1,minWidth:120,boxShadow:T.shadow}}>
    <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:24,fontWeight:700,
      color:color||T.teal,letterSpacing:-1}}>
      {value}<span style={{fontSize:11,color:T.muted,marginLeft:3}}>{unit}</span>
    </div>
    <div style={{fontSize:10,color:T.muted,marginTop:3,textTransform:"uppercase",letterSpacing:"0.08em"}}>{label}</div>
    {sub && <div style={{fontSize:10,color:T.teal,marginTop:3}}>{sub}</div>}
  </div>
);

// ─── CountrySelect ─────────────────────────────────────────────────────────
function CountrySelect({ T, value, onChange }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const filtered = q.length > 0
    ? ALL_COUNTRIES_FLAT.filter(c => c.country.toLowerCase().includes(q.toLowerCase()))
    : ALL_COUNTRIES_FLAT;

  const select = (e) => { onChange(e); setQ(e.country); setOpen(false); };

  return (
    <div style={{position:"relative"}}>
      <input
        value={open ? q : (value?.country || q)}
        onChange={e => { setQ(e.target.value); setOpen(true); onChange(null); }}
        onFocus={() => setOpen(true)}
        placeholder="Search from 80+ InciSioN member countries..."
        style={{width:"100%",padding:"10px 14px",borderRadius:6,
          background:T.bg,border:`1px solid ${open?T.teal:T.border}`,
          color:T.text,fontSize:13,outline:"none",boxSizing:"border-box"}}
      />
      {open && filtered.length > 0 && (
        <div style={{position:"absolute",zIndex:200,top:"100%",left:0,right:0,
          background:T.card,border:`1px solid ${T.border}`,borderRadius:6,
          maxHeight:200,overflowY:"auto",marginTop:2,boxShadow:"0 4px 16px rgba(0,0,0,0.2)"}}>
          {filtered.slice(0,40).map(entry => (
            <div key={entry.country+entry.region} onClick={() => select(entry)}
              style={{padding:"8px 14px",cursor:"pointer",display:"flex",
                justifyContent:"space-between",borderBottom:`1px solid ${T.border}`,
                transition:"background 0.1s"}}
              onMouseEnter={e=>e.currentTarget.style.background=T.tealGlow}
              onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              <span style={{color:T.text,fontSize:13}}>{entry.country}</span>
              <span style={{color:REGION_COLORS[entry.region]||T.muted,fontSize:10,fontWeight:600}}>{entry.region}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Year-by-Year Analysis ─────────────────────────────────────────────────
function YearlyAnalysis({ T, submissions }) {
  const years = [...new Set(submissions.map(s => s.year || new Date(s.timestamp||Date.now()).getFullYear()))]
    .sort();
  if (years.length === 0) return (
    <div style={{textAlign:"center",padding:"40px 0",color:T.muted,fontSize:13}}>
      No multi-year data yet. Annual trends will appear as years progress.
    </div>
  );

  const byYear = years.map(yr => {
    const yrSubs = submissions.filter(s => (s.year || new Date(s.timestamp||Date.now()).getFullYear()) === yr);
    const agg = aggregate(yrSubs);
    return {
      year: yr,
      submissions: yrSubs.length,
      countries: agg?.countries.length || 0,
      regions: agg?.regions || 0,
      avgWF: agg ? agg.avgWF.toFixed(1) : "—",
      supplyFreq: agg ? Math.round((
        (agg.supplyData[2]?.value||0) + (agg.supplyData[3]?.value||0)
      ) / yrSubs.length * 100) : 0,
    };
  });

  return (
    <div style={{display:"flex",flexDirection:"column",gap:20}}>
      <SC T={T}>
        <SecTitle T={T} sub="Multi-Year Trend">Submissions Per Year</SecTitle>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={byYear}>
            <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
            <XAxis dataKey="year" tick={{fill:T.muted,fontSize:12}} />
            <YAxis tick={{fill:T.muted,fontSize:12}} />
            <Tooltip contentStyle={{background:T.card,border:`1px solid ${T.teal}`,borderRadius:6,color:T.text}} />
            <Bar dataKey="submissions" fill={T.teal} radius={[4,4,0,0]} name="Centers Reporting" />
          </BarChart>
        </ResponsiveContainer>
      </SC>

      <SC T={T}>
        <SecTitle T={T} sub="Year-by-Year">Annual Surveillance Summary</SecTitle>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
            <thead>
              <tr style={{borderBottom:`2px solid ${T.border}`}}>
                {["Year","Reports","Countries","WHO Regions","Avg Workforce Score","Supply Crisis %"].map(h=>(
                  <th key={h} style={{textAlign:"left",padding:"8px 12px",color:T.muted,
                    fontWeight:700,fontSize:10,textTransform:"uppercase"}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {byYear.map((row,i) => (
                <tr key={row.year} style={{borderBottom:`1px solid ${T.border}`,
                  background: i%2===0 ? "transparent" : T.tealGlow}}>
                  <td style={{padding:"10px 12px",fontFamily:"'JetBrains Mono',monospace",
                    fontWeight:700,color:T.teal,fontSize:14}}>{row.year}</td>
                  <td style={{padding:"10px 12px",color:T.text,fontWeight:600}}>{row.submissions}</td>
                  <td style={{padding:"10px 12px",color:T.text}}>{row.countries}</td>
                  <td style={{padding:"10px 12px",color:T.text}}>{row.regions} / 6</td>
                  <td style={{padding:"10px 12px",color:row.avgWF>=3?T.red:T.green}}>{row.avgWF}</td>
                  <td style={{padding:"10px 12px"}}>
                    <span style={{color:row.supplyFreq>50?T.red:T.amber,fontFamily:"'JetBrains Mono',monospace"}}>
                      {row.supplyFreq}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SC>

      {byYear.length >= 2 && (
        <SC T={T}>
          <SecTitle T={T} sub="Longitudinal">Country Coverage Growth</SecTitle>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={byYear}>
              <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
              <XAxis dataKey="year" tick={{fill:T.muted,fontSize:12}} />
              <YAxis tick={{fill:T.muted,fontSize:12}} />
              <Tooltip contentStyle={{background:T.card,border:`1px solid ${T.teal}`,borderRadius:6,color:T.text}} />
              <Line type="monotone" dataKey="countries" stroke={T.teal} strokeWidth={2.5}
                dot={{fill:T.teal,r:5}} name="Countries" />
              <Line type="monotone" dataKey="submissions" stroke={T.amber} strokeWidth={2.5}
                dot={{fill:T.amber,r:5}} name="Submissions" />
              <Legend />
            </LineChart>
          </ResponsiveContainer>
        </SC>
      )}
    </div>
  );
}

// ─── Dashboard ─────────────────────────────────────────────────────────────
function Dashboard({ T, submissions, onGoToForm }) {
  const years = [...new Set(submissions.map(s => s.year || new Date(s.timestamp||Date.now()).getFullYear()))].sort();
  const [selYear, setSelYear] = useState("all");

  const filtered = selYear === "all" ? submissions
    : submissions.filter(s => (s.year || new Date(s.timestamp||Date.now()).getFullYear()) === parseInt(selYear));

  const agg = aggregate(filtered);

  if (submissions.length === 0) return (
    <div style={{textAlign:"center",padding:"80px 20px"}}>
      <div style={{width:68,height:68,borderRadius:"50%",
        border:`2px dashed ${T.border}`,
        display:"flex",alignItems:"center",justifyContent:"center",
        fontSize:28,margin:"0 auto 18px"}}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{color:T.muted}}>
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
        </svg>
      </div>
      <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:20,fontWeight:700,
        color:T.text,marginBottom:8}}>Awaiting First Transmission</div>
      <div style={{fontSize:13,color:T.muted,maxWidth:380,margin:"0 auto 26px",lineHeight:1.7}}>
        The GS Watch dashboard populates exclusively from verified center submissions.
        No hypothetical data is shown. Submit the first report to begin multi-year surveillance.
      </div>
      <button onClick={onGoToForm} style={{padding:"11px 26px",background:T.teal,
        color:"#fff",border:"none",borderRadius:6,fontWeight:700,cursor:"pointer",fontSize:14}}>
        Submit First Report
      </button>
    </div>
  );

  return (
    <div style={{display:"flex",flexDirection:"column",gap:22}}>
      {/* Year filter */}
      <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
        <span style={{fontSize:11,color:T.muted,marginRight:4}}>FILTER BY YEAR:</span>
        {["all",...years].map(yr => (
          <button key={yr} onClick={()=>setSelYear(String(yr))}
            style={{padding:"5px 14px",borderRadius:20,border:`1px solid ${selYear===String(yr)?T.teal:T.border}`,
              background:selYear===String(yr)?T.tealGlow:"transparent",
              color:selYear===String(yr)?T.teal:T.muted,
              cursor:"pointer",fontSize:12,fontWeight:selYear===String(yr)?700:400}}>
            {yr === "all" ? "All Years" : yr}
          </button>
        ))}
      </div>

      <div style={{background:T.tealGlow,border:`1px solid ${T.teal}`,
        borderRadius:8,padding:"9px 14px",fontSize:11,color:T.teal,
        display:"flex",alignItems:"center",gap:7}}>
        <div style={{width:5,height:5,borderRadius:"50%",background:T.teal}}/> 
        All data sourced exclusively from verified GS Watch submissions · {filtered.length} report{filtered.length!==1?"s":""} {selYear!=="all"?`for ${selYear}`:"across all years"}
      </div>

      {!agg ? (
        <div style={{textAlign:"center",padding:40,color:T.muted,fontSize:13}}>
          No submissions found for {selYear}. Try another year or submit a new report.
        </div>
      ) : (
        <>
          <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
            <KpiCard T={T} label="Reports" value={agg.n} unit="centers" color={T.teal}/>
            <KpiCard T={T} label="Countries" value={agg.countries.length} unit="/ 80+" color={T.amber} sub="InciSioN network"/>
            <KpiCard T={T} label="WHO Regions" value={agg.regions} unit="/ 6" color={T.green}/>
            <KpiCard T={T} label="Workforce Score" value={agg.avgWF.toFixed(1)} unit="/ 5" color={T.red} sub="avg across centers"/>
          </div>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:18}}>
            <SC T={T}>
              <SecTitle T={T} sub="Theme 1">Supply Shortage Frequency</SecTitle>
              <ResponsiveContainer width="100%" height={170}>
                <BarChart data={agg.supplyData} layout="vertical" barSize={11}>
                  <CartesianGrid strokeDasharray="3 3" stroke={T.border}/>
                  <XAxis type="number" tick={{fill:T.muted,fontSize:10}}/>
                  <YAxis dataKey="label" type="category" tick={{fill:T.textSub,fontSize:10}} width={80}/>
                  <Tooltip contentStyle={{background:T.card,border:`1px solid ${T.teal}`,borderRadius:6,color:T.text,fontSize:11}}
                    formatter={v=>[`${v} centers`,""]}/>
                  <Bar dataKey="value" fill={T.teal} radius={[0,4,4,0]}/>
                </BarChart>
              </ResponsiveContainer>
            </SC>

            <SC T={T}>
              <SecTitle T={T} sub="Theme 1">Elective Wait Times</SecTitle>
              <ResponsiveContainer width="100%" height={170}>
                <BarChart data={agg.waitData} barSize={22}>
                  <CartesianGrid strokeDasharray="3 3" stroke={T.border}/>
                  <XAxis dataKey="label" tick={{fill:T.textSub,fontSize:10}}/>
                  <YAxis tick={{fill:T.muted,fontSize:10}}/>
                  <Tooltip contentStyle={{background:T.card,border:`1px solid ${T.teal}`,borderRadius:6,color:T.text,fontSize:11}}
                    formatter={v=>[`${v} centers`,""]}/>
                  <Bar dataKey="value" fill={T.amber} radius={[4,4,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            </SC>
          </div>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:18}}>
            <SC T={T}>
              <SecTitle T={T} sub="Composite">System Readiness Radar</SecTitle>
              <ResponsiveContainer width="100%" height={210}>
                <RadarChart data={agg.radarData}>
                  <PolarGrid stroke={T.border}/>
                  <PolarAngleAxis dataKey="subject" tick={{fill:T.textSub,fontSize:9}}/>
                  <Radar dataKey="A" stroke={T.teal} fill={T.teal} fillOpacity={0.22}/>
                  <Tooltip contentStyle={{background:T.card,border:`1px solid ${T.teal}`,borderRadius:6,color:T.text,fontSize:11}}
                    formatter={v=>[`${v}%`,""]}/>
                </RadarChart>
              </ResponsiveContainer>
            </SC>

            <SC T={T}>
              <SecTitle T={T} sub="Coverage">WHO Regional Distribution</SecTitle>
              <ResponsiveContainer width="100%" height={170}>
                <PieChart>
                  <Pie data={agg.regionData} dataKey="value" cx="50%" cy="50%" outerRadius={66}
                    label={({name,value})=>`${name}(${value})`} labelLine={false}>
                    {agg.regionData.map((r,i)=><Cell key={i} fill={r.color}/>)}
                  </Pie>
                  <Tooltip contentStyle={{background:T.card,border:`1px solid ${T.teal}`,borderRadius:6,color:T.text,fontSize:11}}/>
                </PieChart>
              </ResponsiveContainer>
              <div style={{display:"flex",flexWrap:"wrap",gap:8,marginTop:6}}>
                {agg.regionData.map(r=>(
                  <div key={r.name} style={{display:"flex",alignItems:"center",gap:4,fontSize:10,color:T.textSub}}>
                    <div style={{width:7,height:7,borderRadius:"50%",background:r.color}}/>{r.name}
                  </div>
                ))}
              </div>
            </SC>
          </div>

          <SC T={T}>
            <SecTitle T={T} sub="Theme 2 — Access">Patient Travel Distance to Surgical Facility</SecTitle>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {agg.travelData.map(d=>{
                const p=agg.n>0?Math.round(d.value/agg.n*100):0;
                return (
                  <div key={d.label}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                      <span style={{fontSize:12,color:T.textSub}}>{d.label}</span>
                      <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:12,color:d.col}}>
                        {d.value} center{d.value!==1?"s":""} · {p}%
                      </span>
                    </div>
                    <div style={{height:8,borderRadius:4,background:T.border}}>
                      <div style={{height:"100%",width:`${p}%`,borderRadius:4,background:d.col,transition:"width 0.8s ease"}}/>
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{marginTop:10,fontSize:10,color:T.muted}}>
              Lancet Commission target: patient access within 2 hours of a surgical facility.
            </div>
          </SC>

          <SC T={T}>
            <SecTitle T={T} sub="Submissions Log">Recent Reporting Centers</SecTitle>
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                <thead>
                  <tr style={{borderBottom:`1px solid ${T.border}`}}>
                    {["#","Country","Region","Facility Type","Role","Year"].map(h=>(
                      <th key={h} style={{textAlign:"left",padding:"6px 10px",color:T.muted,
                        fontSize:9,textTransform:"uppercase",fontWeight:600}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.slice().reverse().slice(0,12).map((s,i)=>(
                    <tr key={i} style={{borderBottom:`1px solid ${T.border}`}}>
                      <td style={{padding:"7px 10px",color:T.muted,fontFamily:"'JetBrains Mono',monospace",fontSize:11}}>
                        {filtered.length-i}
                      </td>
                      <td style={{padding:"7px 10px",color:T.text,fontWeight:500}}>{s.country||"—"}</td>
                      <td style={{padding:"7px 10px"}}>
                        <span style={{color:REGION_COLORS[s.region]||T.muted,fontSize:10,fontWeight:700}}>{s.region||"—"}</span>
                      </td>
                      <td style={{padding:"7px 10px",color:T.textSub,maxWidth:150,overflow:"hidden",
                        textOverflow:"ellipsis",whiteSpace:"nowrap",fontSize:11}}>
                        {s.facility||"—"}
                      </td>
                      <td style={{padding:"7px 10px",color:T.textSub,fontSize:11}}>{s.role||"—"}</td>
                      <td style={{padding:"7px 10px",fontFamily:"'JetBrains Mono',monospace",
                        color:T.teal,fontSize:11}}>
                        {s.year || new Date(s.timestamp||Date.now()).getFullYear()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SC>
        </>
      )}
    </div>
  );
}

// ─── Questionnaire ─────────────────────────────────────────────────────────
const THEMES = [
  { id:"meta",   label:"Center Metadata",           icon:"", fields:[
    {id:"name",    type:"text",    label:"Person Name *"},
    {id:"email",   type:"email",   label:"Email Address *"},
    {id:"nwg",     type:"text",    label:"NWG / Affiliated Center Name *"},
    {id:"country", type:"country", label:"Country & Region *"},
    {id:"facility",type:"radio",   label:"Facility Type *",
      options:["Tertiary/Academic Referral Hospital","District/Rural Hospital","Community Health Center"]},
    {id:"role",    type:"radio",   label:"Informant Role *",
      options:["Student Representative","Surgical Trainee/Resident","Consultant/Attending","Allied Health Professional"]},
    {id:"gdpr",    type:"gdpr",   label:"Data Processing Consent (GDPR) *"},
  ]},
  { id:"theme1", label:"Theme 1 — Infrastructure",    icon:"", fields:[
    {id:"t1q1",type:"radio",label:"Surgical consumable shortages in past 30 days",
      options:["Never","Rarely (1–2 days)","Sometimes (Weekly)","Frequently (Daily)"]},
    {id:"t1q2",type:"radio",label:"Average elective surgical waiting time",
      options:["< 2 weeks","2–6 weeks","1–6 months","> 6 months"]},
    {id:"t1q3",type:"scale",label:"Patient workforce deficit (1 = Fully staffed → 5 = Critical shortage)",min:1,max:5},
    {id:"t1q4",type:"textarea",label:"Greatest structural bottleneck preventing 100% surgical capacity"},
  ]},
  { id:"theme2", label:"Theme 2 — Patient Access",    icon:"", fields:[
    {id:"t2q1",type:"radio",label:"Average patient travel time from rural perimeter to your facility",
      options:["< 2 hours (within Lancet target)","2–4 hours","4–8 hours","> 8 hours"]},
    {id:"t2q2",type:"radio",label:"Do patients purchase surgical supplies out-of-pocket before surgery?",
      options:["Yes, completely","Yes, partially","No — facility/state covers it"]},
    {id:"t2q3",type:"radio",label:"Post-operative SSI / complication surveillance protocol",
      options:["Yes, systematic follow-ups","Yes, only if patient returns","No follow-up mechanism"]},
    {id:"t2q4",type:"radio",label:"Facility digital infrastructure",
      options:["Fully digital (EHR, broadband)","Hybrid (paper + internet available)","Entirely paper / no reliable internet"]},
  ]},
  { id:"theme3", label:"Theme 3 — Advocacy",          icon:"", fields:[
    {id:"t3q1",type:"radio",label:"Global Surgery in undergraduate medical curriculum",
      options:["Yes, mandatory course","Yes, optional elective","No formal representation"]},
    {id:"t3q2",type:"radio",label:"Early-career voice in hospital/MoH policy decisions",
      options:["High (advisory panels/committees)","Moderate (occasionally consulted)","None / top-down management"]},
    {id:"t3q3",type:"radio",label:"Surgical awareness campaign hosted in last 6 months",
      options:["Yes","No"]},
    {id:"t3q3b",type:"text",label:"If yes — topic and audience (optional)"},
  ]},
  { id:"digital", label:"Digital Readiness",          icon:"", fields:[
    {id:"d1",type:"radio",label:"Current use of automated / algorithmic triage at your facility",
      options:["Yes, actively used","Piloting / testing","Not yet but interested","No"]},
    {id:"d2",type:"radio",label:"Clinician openness to smartphone-based post-op tracking",
      options:["Very open","Somewhat open","Neutral","Resistant"]},
  ]},
];

function QuestionnaireForm({ T, onSubmit }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [countryEntry, setCountryEntry] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [selYear] = useState(new Date().getFullYear());

  const setA = (id,val) => setAnswers(a=>({...a,[id]:val}));
  const theme = THEMES[step];

  const handleSubmit = () => {
    const payload = {
      ...answers,
      country: countryEntry?.country || answers.country || "",
      region:  countryEntry?.region || "",
      year:    selYear,
      timestamp: new Date().toISOString(),
    };
    setSubmitted(true);
    onSubmit(payload);
  };

  if (submitted) return (
    <div style={{textAlign:"center",padding:"60px 20px"}}>
      <div style={{width:60,height:60,borderRadius:"50%",background:"rgba(61,220,132,0.15)",
        border:`2px solid #3DDC84`,display:"flex",alignItems:"center",justifyContent:"center",
        margin:"0 auto 14px"}}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#3DDC84" strokeWidth="2.5">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      </div>
      <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:19,fontWeight:700,
        color:T.green,marginBottom:8}}>Intelligence Filed Successfully</div>
      <div style={{fontSize:13,color:T.muted,maxWidth:420,margin:"0 auto 24px",lineHeight:1.7}}>
        Your GS Watch {selYear} submission is now live in the surveillance dashboard.
        Contributors who successfully complete data collection will be acknowledged in all publications derived from this dataset.
      </div>
      <button onClick={()=>{setSubmitted(false);setStep(0);setAnswers({});setCountryEntry(null);}}
        style={{padding:"10px 24px",background:T.teal,color:"#fff",border:"none",
          borderRadius:6,fontWeight:700,cursor:"pointer",fontSize:13}}>
        Submit Another Center
      </button>
    </div>
  );

  return (
    <div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
        <div style={{display:"flex",gap:5,flex:1,marginRight:16}}>
          {THEMES.map((t,i)=>(
            <div key={t.id} onClick={()=>setStep(i)} title={t.label} style={{
              flex:1,height:4,borderRadius:2,cursor:"pointer",
              background:i<=step?T.teal:T.border,transition:"background 0.25s"}}/>
          ))}
        </div>
        <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:T.teal,
          background:T.tealGlow,padding:"3px 10px",borderRadius:20,border:`1px solid ${T.teal}`}}>
          {selYear}
        </span>
      </div>

      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:20}}>
        <div>
          <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:16,fontWeight:700,color:T.text}}>{theme.label}</div>
          <div style={{fontSize:10,color:T.muted}}>Step {step+1} of {THEMES.length}</div>
        </div>
      </div>

      <div style={{display:"flex",flexDirection:"column",gap:18}}>
        {theme.fields.map(f=>(
          <div key={f.id}>
            <label style={{display:"block",fontSize:13,color:T.textSub,marginBottom:6,lineHeight:1.5}}>{f.label}</label>

            {(f.type==="text"||f.type==="email") && (
              <input type={f.type} value={answers[f.id]||""} onChange={e=>setA(f.id,e.target.value)}
                style={{width:"100%",padding:"10px 14px",borderRadius:6,
                  background:T.bg,border:`1px solid ${T.border}`,
                  color:T.text,fontSize:13,outline:"none",boxSizing:"border-box"}}/>
            )}

            {f.type==="country" && (
              <CountrySelect T={T} value={countryEntry}
                onChange={e=>{setCountryEntry(e);if(e)setA("country",e.country);}}/>
            )}

            {f.type==="textarea" && (
              <textarea value={answers[f.id]||""} onChange={e=>setA(f.id,e.target.value)}
                rows={4} placeholder="Your response..."
                style={{width:"100%",padding:"10px 14px",borderRadius:6,
                  background:T.bg,border:`1px solid ${T.border}`,
                  color:T.text,fontSize:13,outline:"none",resize:"vertical",
                  boxSizing:"border-box",fontFamily:"inherit"}}/>
            )}

            {f.type==="radio" && (
              <div style={{display:"flex",flexDirection:"column",gap:7}}>
                {f.options.map(opt=>{
                  const sel=answers[f.id]===opt;
                  return (
                    <div key={opt} onClick={()=>setA(f.id,opt)} style={{
                      display:"flex",alignItems:"center",gap:10,padding:"9px 14px",
                      borderRadius:6,cursor:"pointer",
                      background:sel?T.tealGlow:"transparent",
                      border:`1px solid ${sel?T.teal:T.border}`,transition:"all 0.18s"}}>
                      <div style={{width:12,height:12,borderRadius:"50%",flexShrink:0,
                        border:`2px solid ${sel?T.teal:T.muted}`,
                        background:sel?T.teal:"transparent"}}/>
                      <span style={{fontSize:13,color:sel?T.text:T.textSub}}>{opt}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {f.type==="gdpr" && (
              <div style={{border:`1px solid ${answers[f.id]?"#3DDC84":T.border}`,borderRadius:8,
                padding:"14px 16px",background:answers[f.id]?"rgba(61,220,132,0.06)":"transparent",
                transition:"all 0.2s"}}>
                <div style={{fontSize:12,color:T.textSub,lineHeight:1.7,marginBottom:12}}>
                  In accordance with the <strong style={{color:T.text}}>General Data Protection Regulation (GDPR)</strong>, 
                  we inform you that your personal data (name, email, institutional affiliation, and survey responses) 
                  will be collected and processed by InciSioN GS Watch for the purpose of global surgery surveillance, 
                  research, and advocacy. Data will be stored securely, shared only in anonymised/aggregated form in 
                  publications, and never sold to third parties. You have the right to access, rectify, or request 
                  deletion of your data at any time by contacting the GS Watch team.
                </div>
                <div onClick={()=>setA(f.id, !answers[f.id])}
                  style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer"}}>
                  <div style={{width:18,height:18,borderRadius:4,border:`2px solid ${answers[f.id]?"#3DDC84":T.muted}`,
                    background:answers[f.id]?"#3DDC84":"transparent",display:"flex",alignItems:"center",
                    justifyContent:"center",transition:"all 0.2s",flexShrink:0}}>
                    {answers[f.id] && <span style={{color:"#fff",fontSize:12,lineHeight:1}}>✓</span>}
                  </div>
                  <span style={{fontSize:13,color:answers[f.id]?T.text:T.textSub,lineHeight:1.5}}>
                    I have read and consent to the processing of my personal data as described above, 
                    in accordance with GDPR. <span style={{color:T.red}}>*</span>
                  </span>
                </div>
              </div>
            )}

            {f.type==="scale" && (
              <div>
                <div style={{display:"flex",gap:8}}>
                  {[1,2,3,4,5].map(n=>{
                    const sel=answers[f.id]===n;
                    return (
                      <div key={n} onClick={()=>setA(f.id,n)} style={{
                        width:42,height:42,borderRadius:6,display:"flex",
                        alignItems:"center",justifyContent:"center",
                        background:sel?T.teal:"transparent",
                        border:`1px solid ${sel?T.teal:T.border}`,
                        color:sel?"#fff":T.textSub,fontWeight:700,
                        cursor:"pointer",fontSize:15,transition:"all 0.18s"}}>
                        {n}
                      </div>
                    );
                  })}
                </div>
                <div style={{display:"flex",justifyContent:"space-between",
                  marginTop:5,fontSize:10,color:T.muted}}>
                  <span>Fully staffed</span><span>Critical shortage</span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={{display:"flex",justifyContent:"space-between",marginTop:28}}>
        <button onClick={()=>setStep(s=>Math.max(0,s-1))} disabled={step===0}
          style={{padding:"10px 20px",borderRadius:6,border:`1px solid ${T.border}`,
            background:"transparent",color:step===0?T.muted:T.text,
            cursor:step===0?"default":"pointer",fontSize:13}}>
          ← Back
        </button>
        {step<THEMES.length-1?(
          <button onClick={()=>setStep(s=>s+1)}
            style={{padding:"10px 22px",borderRadius:6,border:"none",
              background:T.teal,color:"#fff",fontWeight:700,cursor:"pointer",fontSize:13}}>
            Next →
          </button>
        ):(
          <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:6}}>
            {!answers.gdpr && (
              <div style={{fontSize:11,color:T.red}}>⚠ GDPR consent is required before submitting</div>
            )}
            <button onClick={handleSubmit} disabled={!answers.gdpr}
              style={{padding:"10px 22px",borderRadius:6,border:"none",
                background:answers.gdpr?T.green:T.muted,color:"#fff",fontWeight:700,
                cursor:answers.gdpr?"pointer":"not-allowed",fontSize:13,opacity:answers.gdpr?1:0.6}}>
              Submit to GS Watch
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── AI Analyst ────────────────────────────────────────────────────────────
function AIAnalyst({ T, submissions }) {
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const n = submissions.length;
  const agg = aggregate(submissions);

  const systemPrompt = `You are the GSAI Intelligence Analyst for InciSioN GS Watch, a longitudinal global surgery surveillance initiative. 
You have deep expertise in global surgery, health systems strengthening, and surgical equity policy.
${n === 0 
  ? "No center submissions have been received yet. Answer questions about global surgery, InciSioN's mission, and the GS Watch framework using your expert knowledge."
  : `You have access to ${n} real verified reports from centers in: ${[...new Set(submissions.map(s=>s.country))].join(", ")}.
Key data summary: ${JSON.stringify(agg)}.
Ground your analysis in both the submitted data and your broader global surgery expertise.`}
Keep responses concise (under 220 words), evidence-based, and actionable.`;

  const presets = [
    "What are the most critical global surgery priorities based on the data?",
    "Which regions need most urgent AI triage deployment?",
    "What should Phase III advocacy focus on?",
    "Explain what the Bellwether procedures are and why they matter",
    "How does GS Watch fit into the Lancet Commission framework?",
  ];

  const ask = async () => {
    if (!query.trim()) return;
    setLoading(true); setResponse("");
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          model:"claude-sonnet-4-6", max_tokens:1000,
          system: systemPrompt,
          messages:[{role:"user",content:query}]
        })
      });
      const data = await res.json();
      setResponse(data.content?.[0]?.text || "No response received.");
    } catch { setResponse("Connection error. Please retry."); }
    setLoading(false);
  };

  return (
    <div style={{display:"flex",flexDirection:"column",gap:18}}>
      <SC T={T}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
          <div style={{width:7,height:7,borderRadius:"50%",background:T.green,
            boxShadow:`0 0 8px ${T.green}`}}/>
          <span style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:14,fontWeight:700,color:T.text}}>
            GSAI Intelligence Analyst
          </span>
          <span style={{fontSize:10,color:T.muted,marginLeft:"auto"}}>
            Always active · {n > 0 ? `${n} real submissions` : "General expertise mode"}
          </span>
        </div>
        <div style={{background:T.tealGlow,border:`1px solid ${T.teal}`,borderRadius:7,
          padding:"9px 13px",marginBottom:14,fontSize:11,color:T.textSub,lineHeight:1.6}}>
          {n === 0
            ? "No submissions yet — operating in general global surgery expertise mode. Ask anything about surgical systems, InciSioN, the Lancet Commission, or GS Watch methodology."
            : `Grounded in ${n} real GS Watch submission${n!==1?"s":""} plus global surgery expertise. Ask for data-driven intelligence or policy analysis.`
          }
        </div>
        <div style={{display:"flex",flexWrap:"wrap",gap:7,marginBottom:14}}>
          {presets.map(p=>(
            <button key={p} onClick={()=>setQuery(p)} style={{
              fontSize:11,padding:"5px 10px",borderRadius:20,
              border:`1px solid ${T.border}`,background:"transparent",
              color:T.textSub,cursor:"pointer"}}>
              {p}
            </button>
          ))}
        </div>
        <div style={{display:"flex",gap:10}}>
          <input value={query} onChange={e=>setQuery(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&ask()}
            placeholder="Ask the GSAI analyst..."
            style={{flex:1,padding:"10px 14px",borderRadius:6,
              background:T.bg,border:`1px solid ${T.border}`,
              color:T.text,fontSize:13,outline:"none"}}/>
          <button onClick={ask} disabled={loading}
            style={{padding:"10px 16px",borderRadius:6,border:"none",
              background:T.teal,color:"#fff",fontWeight:700,
              cursor:loading?"wait":"pointer",fontSize:13,minWidth:80}}>
            {loading?"…":"Analyze"}
          </button>
        </div>
      </SC>

      {(loading||response) && (
        <SC T={T}>
          <div style={{fontSize:10,color:T.teal,marginBottom:8,letterSpacing:"0.08em"}}>INTELLIGENCE REPORT</div>
          {loading
            ? <div style={{color:T.muted,fontSize:13}}>Analyzing…</div>
            : <div style={{fontSize:13,color:T.textSub,lineHeight:1.75,whiteSpace:"pre-wrap"}}>{response}</div>
          }
        </SC>
      )}
    </div>
  );
}

// ─── Project Concept ───────────────────────────────────────────────────────
function ProjectConcept({ T }) {
  const phases = [
    {phase:"Phase I",  time:"GSW 2026",    phaseNum:"I",   color:T.teal,
      title:"The Launch",
      desc:"Deployment of GS Watch across all affiliated NWGs and regional collaborating centers. Standardized rollout of the online questionnaire initiates the first longitudinal dataset in global surgery intelligence."},
    {phase:"Phase II", time:"Late 2026",   phaseNum:"II",  color:T.amber,
      title:"The Monitor",
      desc:"Student-led teams manage data pipelines, perform data cleaning and auditing — learning the fundamentals of data hygiene that are essential for training equitable clinical AI models."},
    {phase:"Phase III",time:"Early 2027",  phaseNum:"III", color:T.green,
      title:"The Action",
      desc:"Early-career professionals synthesize surveillance data to advocate for targeted, AI-driven triage and telehealth interventions in vulnerable surgical ecosystems. Peer-reviewed publications and policy briefs are submitted."},
  ];

  const arms = [
    {label:"I",title:"Data Arm — System Surveillance",color:T.teal,points:[
      "Collection: Real-time metrics on local surgical backlogs, infrastructure deficits, and resource distribution across NWGs.",
      "Monitor: Tracking ground-level readiness of health systems to absorb digital and AI technologies.",
      "Surveillance: Acting as an early-warning network for surgical inequities — mapping exactly where AI triage or tele-mentorship is most critically needed.",
    ]},
    {label:"II",title:"Advocacy Arm — Evidence-Based Interventions",color:T.amber,points:[
      "Research Output: Translating questionnaire data into high-impact, peer-reviewed publications led by early-career researchers.",
      "Awareness: Utilizing concrete metrics to fuel targeted webinars, community outreach campaigns, and institutional briefings.",
      "Increased Representation: Using hard data from underrepresented regions to demand seats at international policy-making tables, ensuring HIC-centric AI models do not ignore LMIC realities.",
    ]},
  ];

  const principles = [
    {label:"Decentralized Intelligence",desc:"Real-time data collected simultaneously from NWGs across 80+ countries — no single point of failure, no institutional lag."},
    {label:"Youth as Primary Architects",desc:"Medical students and early-career professionals are not observers but the primary collectors, monitors, and advocates."},
    {label:"Data → Policy Pipeline",desc:"Every data point is designed from day one to feed directly into advocacy outputs, AI training sets, and peer-reviewed evidence."},
    {label:"Longitudinal by Design",desc:"Annual cycles ensure trend data builds year over year, creating the first student-led longitudinal global surgery surveillance dataset."},
  ];

  return (
    <div style={{display:"flex",flexDirection:"column",gap:24}}>
      {/* Hero */}
      <div style={{background:`linear-gradient(135deg, ${T.tealGlow}, transparent)`,
        border:`1px solid ${T.teal}`,borderRadius:12,padding:28}}>
        <div style={{fontSize:11,color:T.teal,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:8}}>
          Concept Note · InciSioN GS Watch
        </div>
        <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:22,fontWeight:700,
          color:T.text,marginBottom:12,lineHeight:1.3}}>
          The GSAI Paradigm Shift
        </div>
        <div style={{fontSize:14,color:T.textSub,lineHeight:1.8,maxWidth:680}}>
          The future of surgical advocacy cannot rely on anecdotal struggle — it must be built on 
          <strong style={{color:T.teal}}> real-time, evidence-based intelligence</strong>. 
          GS Watch marks the transition from passive observation to an era of Global Surgery Intelligence (GSAI): 
          a decentralized digital surveillance framework empowering students and early-career professionals 
          to be the primary collectors, monitors, and architects of the data that will train tomorrow's 
          healthcare AI systems.
        </div>
        <div style={{marginTop:16,padding:"10px 16px",background:T.tealGlow,borderRadius:8,
          fontSize:13,color:T.textSub,fontStyle:"italic",borderLeft:`3px solid ${T.teal}`}}>
          "Local Data Surveillance + Youth-Led Advocacy = Smarter Healthcare Systems"
        </div>
      </div>

      {/* Two Arms */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:18}}>
        {arms.map(arm=>(
          <SC key={arm.title} T={T}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
              <div style={{width:24,height:24,borderRadius:4,background:`${arm.color}22`,
                border:`1px solid ${arm.color}`,display:"flex",alignItems:"center",
                justifyContent:"center",fontFamily:"'JetBrains Mono',monospace",
                fontSize:10,fontWeight:700,color:arm.color,flexShrink:0}}>{arm.label}</div>
              <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:14,
                fontWeight:700,color:arm.color}}>{arm.title}</div>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {arm.points.map((p,i)=>(
                <div key={i} style={{display:"flex",gap:8,alignItems:"flex-start"}}>
                  <div style={{width:6,height:6,borderRadius:"50%",background:arm.color,
                    marginTop:6,flexShrink:0}}/>
                  <div style={{fontSize:12,color:T.textSub,lineHeight:1.6}}>{p}</div>
                </div>
              ))}
            </div>
          </SC>
        ))}
      </div>

      {/* Timeline */}
      <SC T={T}>
        <SecTitle T={T} sub="Implementation">Three-Phase Rollout</SecTitle>
        <div style={{display:"flex",flexDirection:"column",gap:0}}>
          {phases.map((ph,i)=>(
            <div key={ph.phase} style={{display:"flex",gap:0}}>
              <div style={{display:"flex",flexDirection:"column",alignItems:"center",width:40}}>
                <div style={{width:32,height:32,borderRadius:"50%",background:ph.color,
                  display:"flex",alignItems:"center",justifyContent:"center",
                  fontFamily:"'JetBrains Mono',monospace",fontSize:11,fontWeight:700,
                  color:"#fff",flexShrink:0}}>{ph.phaseNum}</div>
                {i<phases.length-1 && <div style={{width:2,flex:1,background:T.border,minHeight:24}}/>}
              </div>
              <div style={{flex:1,paddingLeft:14,paddingBottom:i<phases.length-1?24:0,paddingTop:4}}>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:4}}>
                  <span style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,
                    color:ph.color,fontSize:13}}>{ph.phase}: {ph.title}</span>
                  <span style={{fontSize:10,color:T.muted,background:T.tealGlow,
                    padding:"2px 8px",borderRadius:10}}>{ph.time}</span>
                </div>
                <div style={{fontSize:12,color:T.textSub,lineHeight:1.65}}>{ph.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </SC>

      {/* Principles */}
      <SC T={T}>
        <SecTitle T={T} sub="Design Principles">What Makes GS Watch Different</SecTitle>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
          {principles.map(p=>(
            <div key={p.label} style={{padding:"14px 16px",borderRadius:8,
              border:`1px solid ${T.border}`,background:T.tealGlow}}>
              <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:13,fontWeight:700,
                color:T.teal,marginBottom:6}}>{p.label}</div>
              <div style={{fontSize:12,color:T.textSub,lineHeight:1.6}}>{p.desc}</div>
            </div>
          ))}
        </div>
      </SC>

      {/* GS Commission — Data Integrity */}
      <SC T={T}>
        <SecTitle T={T} sub="Data Integrity & Quality Control">InciSioN GS Commission Review Process</SecTitle>
        <div style={{fontSize:13,color:T.textSub,lineHeight:1.8,marginBottom:16}}>
          To uphold the scientific integrity of the GS Watch dataset, the <strong style={{color:T.text}}>InciSioN GS Commission</strong> — 
          a dedicated sub-committee of the GS Watch leadership team — conducts a structured 
          <strong style={{color:T.teal}}> monthly review of all incoming submissions</strong>. 
          This process ensures that the world's first student-led longitudinal global surgery surveillance dataset 
          remains free from fabrication, duplication, and reporting error.
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:16}}>
          {[
            {tag:"01",color:"#7B68EE",title:"Duplicate Detection",desc:"Submissions from the same center, email, or NWG within the same surveillance window are flagged and cross-referenced before inclusion."},
            {tag:"02",color:"#E05C5C",title:"Fraudulent Data Removal",desc:"Responses that fail plausibility checks, contain conflicting data patterns, or cannot be verified against institutional affiliation are excluded and logged."},
            {tag:"03",color:T.amber,title:"Improper Submissions",desc:"Incomplete responses, test entries, and submissions that do not meet the minimum data quality threshold are rejected and the contributor notified."},
          ].map(card=>(
            <div key={card.title} style={{padding:"14px 16px",borderRadius:8,
              border:`1px solid ${card.color}44`,background:`${card.color}0d`}}>
              <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,fontWeight:700,
                color:card.color,marginBottom:8,letterSpacing:"0.08em"}}>{card.tag}</div>
              <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:12,fontWeight:700,
                color:card.color,marginBottom:6}}>{card.title}</div>
              <div style={{fontSize:11,color:T.textSub,lineHeight:1.65}}>{card.desc}</div>
            </div>
          ))}
        </div>
        <div style={{padding:"12px 16px",borderRadius:8,
          border:`1px solid ${T.teal}`,background:T.tealGlow,
          display:"flex",gap:12,alignItems:"flex-start"}}>
          <div style={{width:36,height:36,borderRadius:8,background:T.tealGlow,
            border:`1px solid ${T.teal}`,display:"flex",alignItems:"center",justifyContent:"center",
            fontFamily:"'JetBrains Mono',monospace",fontSize:10,fontWeight:700,
            color:T.teal,flexShrink:0}}>Mo</div>
          <div>
            <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:12,fontWeight:700,
              color:T.teal,marginBottom:4}}>Monthly Review Cycle</div>
            <div style={{fontSize:12,color:T.textSub,lineHeight:1.7}}>
              On the first week of each month, the GS Commission convenes to audit all submissions received 
              in the preceding 30 days. Removed submissions are permanently deleted from the live dataset 
              and do not contribute to any aggregate statistics, publications, or policy briefs. 
              Contributors whose entries are flagged are contacted directly with an opportunity to 
              resubmit with verified data. This check-and-balance mechanism protects the credibility 
              of every data point displayed on the GS Watch platform.
            </div>
          </div>
        </div>
      </SC>

      {/* Acknowledgement */}
      <SC T={T}>
        <SecTitle T={T} sub="Recognition Policy">Acknowledgement of Contributors</SecTitle>
        <div style={{fontSize:13,color:T.textSub,lineHeight:1.8}}>
          Contributors who successfully complete the GS Watch data collection cycle will be formally 
          <strong style={{color:T.text}}> acknowledged in all publications, policy briefs, and whitepapers</strong> derived 
          from this dataset. Acknowledgement will be issued to the named individual and their affiliated NWG/center, 
          recognizing their role in building the world's first decentralized student-led global surgery intelligence dataset.
        </div>
        <div style={{marginTop:14,padding:"12px 16px",borderRadius:8,
          border:`1px solid ${T.amber}`,background:`rgba(245,166,35,0.07)`}}>
          <div style={{fontSize:12,color:T.amber,fontWeight:700,marginBottom:4}}>
            Eligibility for Acknowledgement
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            {["Complete all five themes of the GS Watch questionnaire in full",
              "Provide verifiable institutional affiliation and contact details",
              "Submit within the active surveillance window for that year",
              "Respond to any data verification queries from the GS Watch team"].map((item,i)=>(
              <div key={i} style={{display:"flex",gap:8,alignItems:"flex-start"}}>
                <span style={{color:T.amber,fontSize:11}}>✓</span>
                <span style={{fontSize:12,color:T.textSub}}>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </SC>

      {/* Founder & Developer */}
      <SC T={T}>
        <SecTitle T={T} sub="Platform Leadership">Founder & Developer</SecTitle>
        <div style={{display:"flex",gap:20,alignItems:"flex-start"}}>
          <img
            src="data:image/jpeg;base64,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"
            alt="Seemab Mehmood"
            style={{width:80,height:80,borderRadius:"50%",flexShrink:0,
              objectFit:"cover",objectPosition:"center 20%",
              border:`2px solid ${T.teal}`,
              boxShadow:`0 0 0 3px ${T.tealGlow}`}}
          />
          <div style={{flex:1}}>
            <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:17,fontWeight:700,
              color:T.text,marginBottom:2}}>Seemab Mehmood</div>
            <div style={{fontSize:12,color:T.teal,fontWeight:600,marginBottom:10,
              letterSpacing:"0.03em"}}>Global Chair, InciSioN · 2026–27</div>
            <div style={{fontSize:13,color:T.textSub,lineHeight:1.8}}>
              Seemab Mehmood is the Founder and Developer of InciSioN GS Watch — the world's first 
              student-led longitudinal global surgery surveillance platform. As Global Chair of InciSioN 
              for 2026–27, Seemab conceptualised the GS Watch framework to transform anecdotal advocacy 
              into evidence-based global surgery intelligence, empowering early-career professionals 
              across 80+ countries to drive real policy change through data.
            </div>
          </div>
        </div>
      </SC>
    </div>
  );
}

// ─── Admin Password Modal ──────────────────────────────────────────────────
const ADMIN_PASSWORD = "gswatch2026admin";

function AdminModal({ T, onSuccess, onClose }) {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState(false);
  const attempt = () => {
    if (pw === ADMIN_PASSWORD) { onSuccess(); }
    else { setErr(true); setPw(""); setTimeout(()=>setErr(false),2000); }
  };
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.65)",zIndex:999,
      display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:12,
        padding:32,width:360,boxShadow:"0 8px 40px rgba(0,0,0,0.4)"}}>
        <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:17,fontWeight:700,
          color:T.text,marginBottom:6}}>Admin Access</div>
        <div style={{fontSize:12,color:T.muted,marginBottom:20}}>
          Enter the GS Watch administrator password to access the Control Room.
        </div>
        <input type="password" value={pw} onChange={e=>setPw(e.target.value)}
          onKeyDown={e=>e.key==="Enter"&&attempt()}
          placeholder="Password"
          style={{width:"100%",padding:"10px 14px",borderRadius:6,boxSizing:"border-box",
            background:T.bg,border:`1px solid ${err?"#E05C5C":T.border}`,
            color:T.text,fontSize:13,outline:"none",marginBottom:err?6:14}}/>
        {err && <div style={{fontSize:11,color:"#E05C5C",marginBottom:10}}>⚠ Incorrect password</div>}
        <div style={{display:"flex",gap:10}}>
          <button onClick={attempt}
            style={{flex:1,padding:"10px 0",background:T.teal,color:"#fff",border:"none",
              borderRadius:6,fontWeight:700,cursor:"pointer",fontSize:13}}>Unlock</button>
          <button onClick={onClose}
            style={{padding:"10px 18px",background:"transparent",color:T.muted,
              border:`1px solid ${T.border}`,borderRadius:6,cursor:"pointer",fontSize:13}}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ─── Control Room (Admin Only) ─────────────────────────────────────────────
function ControlRoom({ T, submissions, onDownloadExcel, onDownloadPDF, onRemove }) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("timestamp");
  const [sortDir, setSortDir] = useState("desc");
  const [confirmIdx, setConfirmIdx] = useState(null); // index in original submissions array to confirm delete
  const [removeReason, setRemoveReason] = useState("");

  const filtered = submissions
    .map((s, origIdx) => ({...s, _origIdx: origIdx}))
    .filter(s => {
      const q = search.toLowerCase();
      return !q || (s.country||"").toLowerCase().includes(q) ||
        (s.name||"").toLowerCase().includes(q) ||
        (s.email||"").toLowerCase().includes(q) ||
        (s.region||"").toLowerCase().includes(q);
    })
    .sort((a,b) => {
      const av = a[sortKey]||""; const bv = b[sortKey]||"";
      return sortDir==="asc" ? String(av).localeCompare(String(bv))
                             : String(bv).localeCompare(String(av));
    });

  const cols = [
    {key:"timestamp",   label:"Submitted"},
    {key:"name",        label:"Name"},
    {key:"email",       label:"Email"},
    {key:"country",     label:"Country"},
    {key:"region",      label:"Region"},
    {key:"facility",    label:"Facility"},
    {key:"role",        label:"Role"},
    {key:"gdpr",        label:"GDPR"},
    {key:"t1q1",        label:"Supply Crisis"},
    {key:"t1q2",        label:"Wait Time"},
    {key:"t1q3",        label:"WF Score"},
    {key:"t2q1",        label:"Travel Time"},
    {key:"t2q4",        label:"Digital Infra"},
    {key:"d2",          label:"AI Openness"},
  ];

  const toggle = (k) => {
    if (sortKey===k) setSortDir(d=>d==="asc"?"desc":"asc");
    else { setSortKey(k); setSortDir("asc"); }
  };

  return (
    <div style={{display:"flex",flexDirection:"column",gap:18}}>
      {/* Header bar */}
      <div style={{background:`linear-gradient(135deg,rgba(224,92,92,0.15),transparent)`,
        border:`1px solid #E05C5C`,borderRadius:10,padding:"14px 18px",
        display:"flex",alignItems:"center",gap:10}}>
        <span style={{width:20,height:20,borderRadius:4,background:"rgba(224,92,92,0.2)",
          border:"1px solid #E05C5C",display:"inline-flex",alignItems:"center",
          justifyContent:"center",fontFamily:"'JetBrains Mono',monospace",
          fontSize:9,fontWeight:700,color:"#E05C5C",flexShrink:0}}>CR</span>
        <div>
          <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:14,fontWeight:700,color:"#E05C5C"}}>
            Admin Control Room
          </div>
          <div style={{fontSize:11,color:T.muted}}>
            Full access to all raw submission data · {submissions.length} records · Restricted — Authorised Personnel Only
          </div>
        </div>
        <div style={{marginLeft:"auto",display:"flex",gap:10}}>
          <button onClick={onDownloadExcel}
            style={{padding:"8px 16px",background:"#1D9A50",color:"#fff",border:"none",
              borderRadius:6,fontWeight:700,cursor:"pointer",fontSize:12,display:"flex",
              alignItems:"center",gap:6}}>
            ↓ Excel (.xlsx)
          </button>
          <button onClick={onDownloadPDF}
            style={{padding:"8px 16px",background:"#E05C5C",color:"#fff",border:"none",
              borderRadius:6,fontWeight:700,cursor:"pointer",fontSize:12,display:"flex",
              alignItems:"center",gap:6}}>
            ↓ PDF Report
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
        {[
          {label:"Total Records",   val:submissions.length,           color:T.teal},
          {label:"Countries",       val:[...new Set(submissions.map(s=>s.country).filter(Boolean))].length, color:T.amber},
          {label:"GDPR Consented",  val:submissions.filter(s=>s.gdpr).length, color:"#3DDC84"},
          {label:"This Year",       val:submissions.filter(s=>(s.year||new Date(s.timestamp||Date.now()).getFullYear())===new Date().getFullYear()).length, color:"#7B68EE"},
        ].map(k=>(
          <div key={k.label} style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:8,
            padding:"12px 16px",flex:1,minWidth:120}}>
            <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:22,fontWeight:700,color:k.color}}>{k.val}</div>
            <div style={{fontSize:10,color:T.muted,textTransform:"uppercase",marginTop:2}}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <input value={search} onChange={e=>setSearch(e.target.value)}
        placeholder="Search by name, email, country, region..."
        style={{padding:"10px 14px",borderRadius:6,background:T.bg,
          border:`1px solid ${T.border}`,color:T.text,fontSize:13,
          outline:"none",width:"100%",boxSizing:"border-box"}}/>

      {/* Data table */}
      {submissions.length === 0 ? (
        <div style={{textAlign:"center",padding:40,color:T.muted,fontSize:13}}>
          No submissions yet. Data will appear here once centers report.
        </div>
      ) : (
        <div style={{overflowX:"auto",borderRadius:8,border:`1px solid ${T.border}`}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11,minWidth:900}}>
            <thead>
              <tr style={{background:T.bgMid}}>
                <th style={{padding:"9px 10px",color:T.muted,fontSize:9,textTransform:"uppercase",
                  fontWeight:700,textAlign:"left",borderBottom:`1px solid ${T.border}`,whiteSpace:"nowrap"}}>#</th>
                {cols.map(c=>(
                  <th key={c.key} onClick={()=>toggle(c.key)}
                    style={{padding:"9px 10px",color:sortKey===c.key?T.teal:T.muted,fontSize:9,
                      textTransform:"uppercase",fontWeight:700,textAlign:"left",
                      borderBottom:`1px solid ${T.border}`,cursor:"pointer",whiteSpace:"nowrap",
                      userSelect:"none"}}>
                    {c.label} {sortKey===c.key?(sortDir==="asc"?"↑":"↓"):""}
                  </th>
                ))}
                <th style={{padding:"9px 10px",color:"#E05C5C",fontSize:9,textTransform:"uppercase",
                  fontWeight:700,textAlign:"center",borderBottom:`1px solid ${T.border}`,whiteSpace:"nowrap"}}>
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s,i)=>(
                <tr key={i} style={{borderBottom:`1px solid ${T.border}`,
                  background:i%2===0?"transparent":T.tealGlow}}
                  onMouseEnter={e=>e.currentTarget.style.background=`rgba(0,175,190,0.08)`}
                  onMouseLeave={e=>e.currentTarget.style.background=i%2===0?"transparent":T.tealGlow}>
                  <td style={{padding:"8px 10px",color:T.muted,fontFamily:"'JetBrains Mono',monospace"}}>{filtered.length-i}</td>
                  <td style={{padding:"8px 10px",color:T.muted,fontSize:10,fontFamily:"'JetBrains Mono',monospace",whiteSpace:"nowrap"}}>
                    {s.timestamp?new Date(s.timestamp).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"}):"—"}
                  </td>
                  <td style={{padding:"8px 10px",color:T.text,fontWeight:600,whiteSpace:"nowrap"}}>{s.name||"—"}</td>
                  <td style={{padding:"8px 10px",color:T.textSub,maxWidth:150,overflow:"hidden",textOverflow:"ellipsis"}}>{s.email||"—"}</td>
                  <td style={{padding:"8px 10px",color:T.text,whiteSpace:"nowrap"}}>{s.country||"—"}</td>
                  <td style={{padding:"8px 10px"}}>
                    <span style={{color:REGION_COLORS[s.region]||T.muted,fontWeight:700,fontSize:10}}>{s.region||"—"}</span>
                  </td>
                  <td style={{padding:"8px 10px",color:T.textSub,maxWidth:160,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontSize:10}}>{s.facility||"—"}</td>
                  <td style={{padding:"8px 10px",color:T.textSub,fontSize:10,whiteSpace:"nowrap"}}>{s.role||"—"}</td>
                  <td style={{padding:"8px 10px",textAlign:"center"}}>
                    <span style={{color:s.gdpr?"#3DDC84":"#E05C5C",fontSize:13}}>{s.gdpr?"✓":"✗"}</span>
                  </td>
                  <td style={{padding:"8px 10px",color:T.textSub,fontSize:10,whiteSpace:"nowrap"}}>{s.t1q1||"—"}</td>
                  <td style={{padding:"8px 10px",color:T.textSub,fontSize:10,whiteSpace:"nowrap"}}>{s.t1q2||"—"}</td>
                  <td style={{padding:"8px 10px",textAlign:"center",fontFamily:"'JetBrains Mono',monospace",
                    color:s.t1q3>=4?"#E05C5C":s.t1q3<=2?"#3DDC84":T.amber}}>{s.t1q3||"—"}</td>
                  <td style={{padding:"8px 10px",color:T.textSub,fontSize:10,whiteSpace:"nowrap"}}>{s.t2q1||"—"}</td>
                  <td style={{padding:"8px 10px",color:T.textSub,fontSize:10,whiteSpace:"nowrap"}}>{s.t2q4||"—"}</td>
                  <td style={{padding:"8px 10px",color:T.textSub,fontSize:10,whiteSpace:"nowrap"}}>{s.d2||"—"}</td>
                  {/* Remove action */}
                  <td style={{padding:"8px 10px",textAlign:"center"}}>
                    <button onClick={()=>{ setConfirmIdx(s._origIdx); setRemoveReason(""); }}
                      title="Remove this submission"
                      style={{padding:"4px 10px",background:"rgba(224,92,92,0.12)",color:"#E05C5C",
                        border:"1px solid rgba(224,92,92,0.4)",borderRadius:5,
                        cursor:"pointer",fontSize:10,fontWeight:700,whiteSpace:"nowrap",
                        transition:"all 0.15s"}}
                      onMouseEnter={e=>{e.currentTarget.style.background="rgba(224,92,92,0.25)";}}
                      onMouseLeave={e=>{e.currentTarget.style.background="rgba(224,92,92,0.12)";}}>
                      ✕ Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>

      {/* Confirm Remove Modal */}
      {confirmIdx !== null && (() => {
        const s = submissions[confirmIdx];
        return (
          <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",zIndex:999,
            display:"flex",alignItems:"center",justifyContent:"center"}}>
            <div style={{background:T.card,border:`1px solid #E05C5C`,borderRadius:12,
              padding:28,width:420,boxShadow:"0 8px 40px rgba(0,0,0,0.5)"}}>
              <div style={{width:40,height:40,borderRadius:8,background:"rgba(224,92,92,0.12)",
                border:"1px solid #E05C5C",display:"flex",alignItems:"center",justifyContent:"center",
                fontFamily:"'JetBrains Mono',monospace",fontSize:14,fontWeight:700,
                color:"#E05C5C",marginBottom:8}}>!</div>
              <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:16,fontWeight:700,
                color:"#E05C5C",marginBottom:6}}>Remove Submission?</div>
              <div style={{fontSize:12,color:T.textSub,lineHeight:1.7,marginBottom:16}}>
                You are about to permanently remove the submission from{" "}
                <strong style={{color:T.text}}>{s?.name||"Unknown"}</strong>
                {s?.country ? ` (${s.country})` : ""}. 
                This action cannot be undone and the record will be excluded from all 
                dashboards, aggregates, and exports.
              </div>
              <div style={{marginBottom:16}}>
                <label style={{fontSize:11,color:T.muted,display:"block",marginBottom:6,
                  textTransform:"uppercase",letterSpacing:"0.06em"}}>
                  Reason for Removal *
                </label>
                <div style={{display:"flex",flexDirection:"column",gap:6}}>
                  {["Duplicate submission","Fraudulent / fabricated data","Incomplete or invalid data",
                    "Does not meet GS Watch standards","Test / accidental entry","Other"].map(r=>(
                    <div key={r} onClick={()=>setRemoveReason(r)}
                      style={{display:"flex",alignItems:"center",gap:8,padding:"7px 12px",
                        borderRadius:6,cursor:"pointer",
                        background:removeReason===r?"rgba(224,92,92,0.12)":"transparent",
                        border:`1px solid ${removeReason===r?"#E05C5C":T.border}`,
                        transition:"all 0.15s"}}>
                      <div style={{width:10,height:10,borderRadius:"50%",flexShrink:0,
                        border:`2px solid ${removeReason===r?"#E05C5C":T.muted}`,
                        background:removeReason===r?"#E05C5C":"transparent"}}/>
                      <span style={{fontSize:12,color:removeReason===r?T.text:T.textSub}}>{r}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{display:"flex",gap:10}}>
                <button
                  onClick={()=>{
                    if (!removeReason) return;
                    onRemove(confirmIdx, removeReason);
                    setConfirmIdx(null);
                    setRemoveReason("");
                  }}
                  disabled={!removeReason}
                  style={{flex:1,padding:"10px 0",background:removeReason?"#E05C5C":"#888",
                    color:"#fff",border:"none",borderRadius:6,fontWeight:700,
                    cursor:removeReason?"pointer":"not-allowed",fontSize:13,
                    opacity:removeReason?1:0.5}}>
                  Confirm Remove
                </button>
                <button onClick={()=>{ setConfirmIdx(null); setRemoveReason(""); }}
                  style={{padding:"10px 18px",background:"transparent",color:T.muted,
                    border:`1px solid ${T.border}`,borderRadius:6,cursor:"pointer",fontSize:13}}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        );
      })()}
          </table>
        </div>
      )}

      <div style={{fontSize:10,color:T.muted,textAlign:"center",paddingTop:4}}>
        Showing {filtered.length} of {submissions.length} records
        {search && ` · filtered by "${search}"`}
      </div>
    </div>
  );
}

// ─── Main App ──────────────────────────────────────────────────────────────
export default function App() {
  const [dark, setDark] = useState(true);
  const T = dark ? DARK : LIGHT;
  const [tab, setTab] = useState("dashboard");
  const [submissions, setSubmissions] = useState([]);
  const [loaded, setLoaded] = useState(false);

  const [isAdmin, setIsAdmin]           = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);

  useEffect(()=>{
    loadSubmissions().then(d=>{setSubmissions(d);setLoaded(true);});
  },[]);

  // ── Excel download (CSV-based, universally openable in Excel) ──
  const downloadExcel = () => {
    if (!isAdmin) return;
    const headers = [
      "Timestamp","Name","Email","Country","Region","Facility","Role","GDPR",
      "Supply Shortage","Wait Time","Workforce Score","Structural Bottleneck",
      "Travel Time","Out-of-Pocket","SSI Protocol","Digital Infra",
      "GS Curriculum","Advocacy Voice","Awareness Campaign","Campaign Detail",
      "AI Triage","AI Openness","Year"
    ];
    const rows = submissions.map(s => [
      s.timestamp||"",s.name||"",s.email||"",s.country||"",s.region||"",
      s.facility||"",s.role||"",s.gdpr?"YES":"NO",
      s.t1q1||"",s.t1q2||"",s.t1q3||"",s.t1q4||"",
      s.t2q1||"",s.t2q2||"",s.t2q3||"",s.t2q4||"",
      s.t3q1||"",s.t3q2||"",s.t3q3||"",s.t3q3b||"",
      s.d1||"",s.d2||"",s.year||""
    ].map(v => `"${String(v).replace(/"/g,'""')}"`));
    const csv = [headers.map(h=>`"${h}"`).join(","), ...rows.map(r=>r.join(","))].join("\n");
    const blob = new Blob(["\uFEFF"+csv], {type:"text/csv;charset=utf-8;"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href=url;
    a.download=`GS_Watch_Data_${new Date().getFullYear()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  // ── Remove a submission by original index ──
  const handleRemove = async (origIdx, reason) => {
    const sub = submissions[origIdx];
    if (!sub) return;
    // Use the DB id field; fall back to filtering by index locally
    await deleteSubmission(sub.id, reason);
    const fresh = await loadSubmissions();
    setSubmissions(fresh);
  };
  const downloadPDF = () => {
    if (!isAdmin) return;
    const agg = aggregate(submissions);
    const now = new Date().toLocaleDateString("en-GB",{day:"2-digit",month:"long",year:"numeric"});
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>GS Watch Report ${new Date().getFullYear()}</title>
<style>
  body{font-family:Arial,sans-serif;color:#0B1F35;margin:0;padding:32px;max-width:900px;margin:0 auto;}
  h1{color:#007F8C;font-size:22px;border-bottom:2px solid #007F8C;padding-bottom:10px;}
  h2{color:#005F6A;font-size:15px;margin-top:24px;}
  .kpi-row{display:flex;gap:16px;margin:16px 0;flex-wrap:wrap;}
  .kpi{border:1px solid #C6DFE5;border-radius:8px;padding:14px 20px;min-width:120px;flex:1;}
  .kpi-val{font-size:26px;font-weight:700;color:#007F8C;font-family:monospace;}
  .kpi-lbl{font-size:10px;color:#5A7A8E;text-transform:uppercase;margin-top:3px;}
  table{width:100%;border-collapse:collapse;font-size:11px;margin-top:12px;}
  th{background:#EEF7F9;padding:8px 10px;text-align:left;font-size:9px;text-transform:uppercase;color:#5A7A8E;border-bottom:2px solid #C6DFE5;}
  td{padding:7px 10px;border-bottom:1px solid #C6DFE5;}
  tr:nth-child(even){background:#F8FCFD;}
  .badge{display:inline-block;padding:2px 7px;border-radius:10px;font-size:9px;font-weight:700;}
  .footer{margin-top:32px;padding-top:12px;border-top:1px solid #C6DFE5;font-size:10px;color:#5A7A8E;text-align:center;}
  .gdpr-yes{color:#1D9A50;font-weight:700;} .gdpr-no{color:#C0392B;font-weight:700;}
  @media print{body{padding:16px;}}
</style></head><body>
<h1>InciSioN GS Watch — Surveillance Intelligence Report</h1>
<p style="color:#5A7A8E;font-size:12px;">Generated: ${now} · Confidential — Admin Access Only · GSAI v3.0</p>
${agg ? `<div class="kpi-row">
  <div class="kpi"><div class="kpi-val">${agg.n}</div><div class="kpi-lbl">Total Reports</div></div>
  <div class="kpi"><div class="kpi-val">${agg.countries.length}</div><div class="kpi-lbl">Countries</div></div>
  <div class="kpi"><div class="kpi-val">${agg.regions}/6</div><div class="kpi-lbl">WHO Regions</div></div>
  <div class="kpi"><div class="kpi-val">${agg.avgWF.toFixed(1)}</div><div class="kpi-lbl">Avg Workforce Score</div></div>
  <div class="kpi"><div class="kpi-val">${submissions.filter(s=>s.gdpr).length}</div><div class="kpi-lbl">GDPR Consented</div></div>
</div>` : ""}
<h2>All Submissions (${submissions.length} records)</h2>
<table><thead><tr>
  <th>#</th><th>Date</th><th>Name</th><th>Email</th><th>Country</th><th>Region</th>
  <th>Facility</th><th>Role</th><th>GDPR</th><th>Supply Crisis</th>
  <th>Wait Time</th><th>WF Score</th><th>Year</th>
</tr></thead><tbody>
${submissions.map((s,i)=>`<tr>
  <td>${i+1}</td>
  <td>${s.timestamp?new Date(s.timestamp).toLocaleDateString("en-GB"):"—"}</td>
  <td>${s.name||"—"}</td><td>${s.email||"—"}</td>
  <td>${s.country||"—"}</td>
  <td><span class="badge" style="background:${REGION_COLORS[s.region]||"#888"}22;color:${REGION_COLORS[s.region]||"#888"}">${s.region||"—"}</span></td>
  <td style="font-size:10px">${(s.facility||"—").substring(0,30)}</td>
  <td style="font-size:10px">${(s.role||"—").substring(0,25)}</td>
  <td class="${s.gdpr?"gdpr-yes":"gdpr-no"}">${s.gdpr?"✓ YES":"✗ NO"}</td>
  <td style="font-size:10px">${s.t1q1||"—"}</td>
  <td style="font-size:10px">${s.t1q2||"—"}</td>
  <td style="text-align:center;font-weight:700;color:${s.t1q3>=4?"#C0392B":s.t1q3<=2?"#1D9A50":"#D4890E"}">${s.t1q3||"—"}</td>
  <td style="font-family:monospace">${s.year||"—"}</td>
</tr>`).join("")}
</tbody></table>
<div class="footer">InciSioN GS Watch · Founder: Seemab Mehmood, Global Chair 2026–27 · © ${new Date().getFullYear()} InciSioN · CONFIDENTIAL</div>
</body></html>`;
    const win = window.open("","_blank");
    win.document.write(html);
    win.document.close();
    setTimeout(()=>win.print(), 600);
  };

  const handleSubmit = async (payload) => {
    await postSubmission(payload);
    // Reload from DB so we get the real id
    const fresh = await loadSubmissions();
    setSubmissions(fresh);
    setTab("dashboard");
  };

  const navItems = [
    {id:"dashboard",   label:"Dashboard",       icon:"◈"},
    {id:"yearly",      label:"Year Analysis",   icon:"◈"},
    {id:"form",        label:"Submit Report",   icon:"◈"},
    {id:"concept",     label:"About Project",   icon:"◈"},
    {id:"ai",          label:"AI Analyst",      icon:"◈"},
    {id:"controlroom", label:"Control Room",    icon:"◈", adminOnly:true},
  ];

  const currentYear = new Date().getFullYear();

  return (
    <div style={{fontFamily:"'Inter',system-ui,sans-serif",background:T.bg,
      minHeight:"100vh",color:T.text,display:"flex",flexDirection:"column",
      transition:"background 0.3s,color 0.3s"}}>

      {/* Header */}
      <header style={{background:T.headerBg,borderBottom:`1px solid ${T.border}`,
        padding:"0 22px",display:"flex",alignItems:"center",gap:14,
        height:56,flexShrink:0,boxShadow:T.shadow,position:"sticky",top:0,zIndex:100}}>

        <div style={{display:"flex",alignItems:"center",gap:10}}>
          {/* InciSioN Official Logo SVG */}
          <svg width="44" height="44" viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg" style={{flexShrink:0}}>
            {/* Background circle */}
            <circle cx="22" cy="22" r="21" fill={dark?"#0d2236":"#ffffff"} stroke={T.teal} strokeWidth="1.5"/>
            {/* Scalpel blade — the iconic InciSioN "I" mark */}
            {/* Blade body: narrow vertical line */}
            <rect x="20.5" y="7" width="3" height="18" rx="1" fill={T.teal}/>
            {/* Blade tip: downward pointing triangle */}
            <polygon points="22,29 19,22 25,22" fill={T.teal}/>
            {/* Handle: wider rect below blade */}
            <rect x="19.5" y="29" width="5" height="2" rx="0.8" fill={T.tealDim}/>
            {/* Handle grip lines */}
            <rect x="19.5" y="32" width="5" height="1.2" rx="0.5" fill={T.tealDim} opacity="0.7"/>
            <rect x="19.5" y="34" width="5" height="1.2" rx="0.5" fill={T.tealDim} opacity="0.5"/>
            {/* Reflection highlight on blade */}
            <rect x="21.5" y="8" width="1" height="12" rx="0.5" fill="white" opacity="0.25"/>
            {/* Small cross accent — global surgery symbol */}
            <rect x="9" y="21" width="7" height="2" rx="1" fill={T.amber} opacity="0.85"/>
            <rect x="11.5" y="18.5" width="2" height="7" rx="1" fill={T.amber} opacity="0.85"/>
          </svg>
          <div>
            <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:15,fontWeight:800,
              color:T.text,lineHeight:1.1,letterSpacing:"-0.3px"}}>
              InciSioN <span style={{color:T.teal}}>GS Watch</span>
            </div>
            <div style={{fontSize:9,color:T.muted,letterSpacing:"0.07em"}}>
              GLOBAL SURGERY INTELLIGENCE PLATFORM
            </div>
          </div>
        </div>

        <nav style={{display:"flex",gap:3,marginLeft:"auto"}}>
          {navItems.map(n=>(
            <button key={n.id} onClick={()=>{
              if (n.adminOnly && !isAdmin) { setShowAdminModal(true); }
              else setTab(n.id);
            }} style={{
              padding:"5px 12px",borderRadius:6,
              background:tab===n.id?T.tealGlow:"transparent",
              border:`1px solid ${tab===n.id?T.teal:n.adminOnly&&!isAdmin?"#E05C5C44":"transparent"}`,
              color:tab===n.id?T.teal:n.adminOnly&&!isAdmin?"#E05C5C":T.muted,
              cursor:"pointer",fontSize:11,fontWeight:tab===n.id?700:400,
              display:"flex",alignItems:"center",gap:5,transition:"all 0.18s"}}>
              {n.icon} {n.label}
              {n.adminOnly && isAdmin && <span style={{fontSize:8,background:"#E05C5C",color:"#fff",
                padding:"1px 5px",borderRadius:8,fontWeight:700}}>ADMIN</span>}
            </button>
          ))}
        </nav>

        {/* Year badge + theme toggle */}
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,
            color:T.teal,background:T.tealGlow,padding:"4px 10px",
            borderRadius:20,border:`1px solid ${T.teal}`}}>
            {currentYear}
          </div>

          <button onClick={()=>setDark(d=>!d)} title="Toggle light/dark mode"
            style={{width:34,height:20,borderRadius:10,
              background:dark?T.teal:T.border,border:"none",
              cursor:"pointer",position:"relative",transition:"background 0.25s",padding:0}}>
            <div style={{width:14,height:14,borderRadius:"50%",background:"#fff",
              position:"absolute",top:3,
              left:dark?17:3,transition:"left 0.25s",
              boxShadow:"0 1px 3px rgba(0,0,0,0.3)"}}/>
          </button>
          <span style={{fontSize:10,color:T.muted}}>{dark?"Dark":"Light"}</span>

          <div style={{display:"flex",alignItems:"center",gap:5,
            padding:"4px 10px",borderRadius:20,
            border:`1px solid ${submissions.length>0?T.green:T.border}`,
            background:submissions.length>0?"rgba(61,220,132,0.08)":"transparent"}}>
            <div style={{width:5,height:5,borderRadius:"50%",
              background:submissions.length>0?T.green:T.muted}}/>
            <span style={{fontSize:9,color:submissions.length>0?T.green:T.muted,
              fontFamily:"'JetBrains Mono',monospace"}}>
              {submissions.length>0?`${submissions.length} LIVE REPORTS`:"AWAITING DATA"}
            </span>
          </div>
        </div>
      </header>

      {/* Sub-header */}
      <div style={{background:T.bgMid,borderBottom:`1px solid ${T.border}`,padding:"10px 22px"}}>
        <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:16,fontWeight:700,color:T.text}}>
          {tab==="dashboard"  && "Surveillance Dashboard"}
          {tab==="yearly"     && "Year-by-Year Analysis"}
          {tab==="form"       && `Submit Report — ${currentYear}`}
          {tab==="concept"    && "About Project"}
          {tab==="ai"         && "AI Intelligence Analyst"}
          {tab==="controlroom"&& "Admin Control Room"}
        </div>
        <div style={{fontSize:11,color:T.muted,marginTop:2}}>
          {tab==="dashboard"  && "Live data only · Populates from verified center submissions across the InciSioN network"}
          {tab==="yearly"     && "Longitudinal surveillance trends · Designed to accumulate year over year"}
          {tab==="form"       && "Select from 80+ InciSioN member countries · Contributors receive formal acknowledgement in all publications"}
          {tab==="concept"    && "GS Watch methodology, framework, and recognition policy"}
          {tab==="ai"         && "Always active · Combines global surgery expertise with your submitted dataset"}
          {tab==="controlroom"&& "Authorised access only · Full raw dataset · Download as Excel or PDF"}
        </div>
      </div>

      {/* Admin Modal */}
      {showAdminModal && (
        <AdminModal T={T}
          onSuccess={()=>{ setIsAdmin(true); setShowAdminModal(false); setTab("controlroom"); }}
          onClose={()=>setShowAdminModal(false)}/>
      )}

      {/* Main Content */}
      <main style={{flex:1,padding:"22px",
        maxWidth:tab==="form"||tab==="concept"?680:tab==="controlroom"?1200:1020,
        width:"100%",boxSizing:"border-box",margin:"0 auto"}}>
        {!loaded ? (
          <div style={{textAlign:"center",padding:60,color:T.muted,fontSize:13}}>
            Loading GS Watch…
          </div>
        ) : tab==="dashboard" ? (
          <Dashboard T={T} submissions={submissions} onGoToForm={()=>setTab("form")}/>
        ) : tab==="yearly" ? (
          <YearlyAnalysis T={T} submissions={submissions}/>
        ) : tab==="form" ? (
          <>
            <div style={{background:T.tealGlow,border:`1px solid ${T.teal}`,
              borderRadius:10,padding:"12px 16px",marginBottom:20,display:"flex",gap:10}}>
              <div style={{width:20,height:20,borderRadius:4,background:T.tealGlow,
                border:`1px solid ${T.teal}`,display:"flex",alignItems:"center",
                justifyContent:"center",fontFamily:"'JetBrains Mono',monospace",
                fontSize:9,fontWeight:700,color:T.teal,flexShrink:0}}>i</div>
              <div>
                <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:12,
                  fontWeight:700,color:T.teal,marginBottom:2}}>
                  Acknowledgement for Contributors
                </div>
                <div style={{fontSize:11,color:T.textSub,lineHeight:1.6}}>
                  Contributors who successfully complete the GS Watch data collection cycle will be formally 
                  acknowledged in all publications, policy briefs, and whitepapers derived from this dataset.
                </div>
              </div>
            </div>
            <QuestionnaireForm T={T} onSubmit={handleSubmit}/>
          </>
        ) : tab==="concept" ? (
          <ProjectConcept T={T}/>
        ) : tab==="controlroom" ? (
          isAdmin ? (
            <ControlRoom T={T} submissions={submissions}
              onDownloadExcel={downloadExcel} onDownloadPDF={downloadPDF}
              onRemove={handleRemove}/>
          ) : (
            <div style={{textAlign:"center",padding:80,color:T.muted}}>
              <div style={{width:52,height:52,borderRadius:12,background:"rgba(224,92,92,0.1)",
                border:"1px solid #E05C5C",display:"flex",alignItems:"center",justifyContent:"center",
                margin:"0 auto 12px",fontFamily:"'JetBrains Mono',monospace",fontSize:18,
                fontWeight:700,color:"#E05C5C"}}>CR</div>
              <div style={{fontSize:14,marginBottom:16}}>You need admin access to view this section.</div>
              <button onClick={()=>setShowAdminModal(true)}
                style={{padding:"10px 24px",background:"#E05C5C",color:"#fff",border:"none",
                  borderRadius:6,fontWeight:700,cursor:"pointer",fontSize:13}}>
                Unlock Control Room
              </button>
            </div>
          )
        ) : (
          <AIAnalyst T={T} submissions={submissions}/>
        )}
      </main>

      {/* Footer */}
      <footer style={{borderTop:`1px solid ${T.border}`,padding:"10px 22px",
        display:"flex",justifyContent:"space-between",alignItems:"center",
        background:T.bgMid,fontSize:10,color:T.muted}}>
        <div>
          <span style={{color:T.teal,fontWeight:600}}>InciSioN GS Watch</span>
          {" · "}International Student Surgical Network
        </div>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <span style={{fontFamily:"'JetBrains Mono',monospace",color:T.tealDim}}>
            GSAI v3.0 · LIVE DATA ONLY
          </span>
          <span>© {currentYear}–{currentYear+10} InciSioN</span>
        </div>
      </footer>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700;800&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;700&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(0,175,190,0.3); border-radius: 3px; }
        input::placeholder, textarea::placeholder { opacity: 0.5; }
        button:focus { outline: none; }
      `}</style>
    </div>
  );
}
