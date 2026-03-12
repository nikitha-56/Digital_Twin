import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Slider from '@mui/material/Slider'
import Switch from '@mui/material/Switch'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import TextField from '@mui/material/TextField'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import { fetchPonds, runWhatIf } from '../services/api'

// ── Helpers ───────────────────────────────────────────────────────────────────
const statusColor = s =>
  s==='Critical'?'#ef5350':s==='Warning'?'#ffa726':s==='Moderate'?'#26c6da':'#66bb6a'
const impactColor = i => i==='positive'?'#66bb6a':i==='negative'?'#ef5350':'#90a4ae'
const impactIcon  = i => i==='positive'?'↑':i==='negative'?'↓':'→'

const buildParams = (vals, scenarioName) => {
  const p = {}
  const nums = ['temperature','ph','ammonia','nitrate','turbidity','salinity',
                'stocking_density','bsi_override','shrimp_size','pond_depth']
  nums.forEach(k => { if (vals[k]!==''&&vals[k]!=null) p[k]=parseFloat(vals[k]) })
  if (vals.do!==''&&vals.do!=null)  p['do']=parseFloat(vals.do)
  if (vals.shrimp_stage)            p.shrimp_stage=vals.shrimp_stage
  if (vals.risk_level_override)     p.risk_level_override=vals.risk_level_override
  if (vals.feed_type)               p.feed_type=vals.feed_type
  if (vals.molting_stage===true)    p.molting_stage=true
  if (scenarioName)                 p.scenario_name=scenarioName
  return p
}

const DEFAULTS = {
  temperature:'', ph:'', do:'', ammonia:'', nitrate:'', turbidity:'', salinity:'',
  stocking_density:'', shrimp_stage:'', risk_level_override:'', feed_type:'',
  bsi_override:'', shrimp_size:'', pond_depth:'', molting_stage:false,
}

// ── Sub-components ────────────────────────────────────────────────────────────
function SliderRow({ label, unit, value, min, max, step, color, onChange, hint }) {
  const v = (value===''||value==null) ? min : parseFloat(value)
  return (
    <Box sx={{ mb:2 }}>
      <Box sx={{ display:'flex', justifyContent:'space-between', mb:0.4 }}>
        <Typography sx={{ fontSize:11, fontWeight:600, color:'rgba(255,255,255,0.65)' }}>
          {label}{hint && <span style={{color:'rgba(255,255,255,0.3)',fontSize:9,marginLeft:4}}>{hint}</span>}
        </Typography>
        <Typography sx={{ fontSize:12, fontWeight:700, color, minWidth:60, textAlign:'right' }}>
          {value===''||value==null ? '—' : `${value}${unit}`}
        </Typography>
      </Box>
      <Slider value={v} min={min} max={max} step={step} onChange={(_,nv)=>onChange(nv)}
        sx={{ color, height:3, py:0.8,
          '& .MuiSlider-thumb':{ width:13, height:13, boxShadow:`0 0 0 4px ${color}22` },
          '& .MuiSlider-rail':{ bgcolor:'rgba(255,255,255,0.07)' },
          '& .MuiSlider-track':{ border:'none' } }}/>
    </Box>
  )
}

function SelectRow({ label, value, onChange, options, color }) {
  return (
    <Box sx={{ mb:1.5 }}>
      <Typography sx={{ fontSize:11, fontWeight:600, color:'rgba(255,255,255,0.65)', mb:0.5 }}>{label}</Typography>
      <Select value={value||''} onChange={e=>onChange(e.target.value)} displayEmpty size="small" fullWidth
        sx={{ fontSize:12, color:'#fff', bgcolor:'rgba(255,255,255,0.04)',
          border:`1px solid ${color}33`, borderRadius:1.5,
          '& .MuiOutlinedInput-notchedOutline':{ border:'none' },
          '& .MuiSvgIcon-root':{ color:'rgba(255,255,255,0.35)' } }}>
        <MenuItem value=""><em style={{color:'rgba(255,255,255,0.25)'}}>Not set</em></MenuItem>
        {options.map(o=><MenuItem key={o} value={o}>{o}</MenuItem>)}
      </Select>
    </Box>
  )
}

function NumberInput({ label, value, onChange, color, unit, helper }) {
  return (
    <Box sx={{ mb:1.5 }}>
      <Typography sx={{ fontSize:11, fontWeight:600, color:'rgba(255,255,255,0.65)', mb:0.5 }}>{label}</Typography>
      <TextField value={value} onChange={e=>onChange(e.target.value)} type="number"
        size="small" fullWidth placeholder="—" helperText={helper}
        InputProps={{ endAdornment: unit
          ? <Typography sx={{fontSize:10,color:'rgba(255,255,255,0.25)',mr:0.5,flexShrink:0}}>{unit}</Typography>
          : null }}
        sx={{ '& .MuiInputBase-root':{ bgcolor:'rgba(255,255,255,0.04)', borderRadius:1.5,
          border:`1px solid ${color}33`, fontSize:12, color:'#fff' },
          '& .MuiOutlinedInput-notchedOutline':{ border:'none' },
          '& .MuiFormHelperText-root':{ color:'rgba(255,255,255,0.28)', fontSize:9 } }}/>
    </Box>
  )
}

function Donut({ pct, status, label }) {
  const col = statusColor(status)
  const r=40, circ=2*Math.PI*r
  const dash = circ*Math.min(pct,100)/100
  return (
    <Box sx={{ display:'flex', flexDirection:'column', alignItems:'center', gap:0.8 }}>
      <Box sx={{ position:'relative', width:96, height:96 }}>
        <svg width="96" height="96" style={{transform:'rotate(-90deg)'}}>
          <circle cx="48" cy="48" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="7"/>
          <circle cx="48" cy="48" r={r} fill="none" stroke={col} strokeWidth="7"
            strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
            style={{transition:'stroke-dasharray 0.7s ease'}}/>
        </svg>
        <Box sx={{ position:'absolute', inset:0, display:'flex', flexDirection:'column',
          alignItems:'center', justifyContent:'center' }}>
          <Typography sx={{ fontSize:17, fontWeight:800, color:col, lineHeight:1 }}>{Math.round(pct)}%</Typography>
          <Typography sx={{ fontSize:7.5, color:'rgba(255,255,255,0.35)', letterSpacing:0.5, mt:0.2 }}>HEALTH</Typography>
        </Box>
      </Box>
      <Chip label={status} size="small"
        sx={{ height:19, fontSize:9.5, fontWeight:700, bgcolor:`${col}1a`, color:col, border:`1px solid ${col}44` }}/>
      <Typography sx={{ fontSize:10, color:'rgba(255,255,255,0.38)' }}>{label}</Typography>
    </Box>
  )
}

function FlagBadge({ flag, resolved, isNew }) {
  const col = resolved?'#66bb6a':isNew?'#ef5350':'#ffa726'
  return (
    <Box sx={{ display:'flex', alignItems:'center', gap:0.6, mb:0.5,
      px:1, py:0.4, borderRadius:1, bgcolor:`${col}10`, border:`1px solid ${col}28` }}>
      <Typography sx={{ fontSize:9 }}>{resolved?'✅':isNew?'🚨':'⚠️'}</Typography>
      <Typography sx={{ fontSize:9, color:col, fontWeight:600, letterSpacing:0.3 }}>
        {flag.replace(/_/g,' ')}
      </Typography>
    </Box>
  )
}

function SuggCard({ s }) {
  const uc = s.urgency==='immediate'?'#ef5350':s.urgency==='soon'?'#ffa726':'#66bb6a'
  return (
    <Box sx={{ p:1.5, mb:1, borderRadius:1.5, bgcolor:'rgba(255,255,255,0.025)',
      border:'1px solid rgba(255,255,255,0.06)', borderLeft:`3px solid ${uc}` }}>
      <Box sx={{ display:'flex', justifyContent:'space-between', mb:0.4, gap:1 }}>
        <Typography sx={{ fontSize:11, fontWeight:700, color:'#fff' }}>{s.title}</Typography>
        <Chip label={s.urgency} size="small"
          sx={{ height:16, fontSize:8, fontWeight:700, flexShrink:0, bgcolor:`${uc}1a`, color:uc }}/>
      </Box>
      <Typography sx={{ fontSize:10, color:'rgba(255,255,255,0.52)', lineHeight:1.5 }}>{s.description}</Typography>
      {s.expected_impact && (
        <Typography sx={{ fontSize:9, color:'#66bb6a', mt:0.5 }}>→ {s.expected_impact}</Typography>
      )}
    </Box>
  )
}

// ── MAIN ─────────────────────────────────────────────────────────────────────
export default function Simulation() {
  const navigate = useNavigate()
  const [ponds,          setPonds]         = useState([])
  const [pondIdx,        setPondIdx]       = useState(1)
  const [pondInfo,       setPondInfo]      = useState(null)
  const [vals,           setVals]          = useState(DEFAULTS)
  const [scenName,       setScenName]      = useState('Scenario 1')
  const [result,         setResult]        = useState(null)
  const [loading,        setLoading]       = useState(false)
  const [pondsLoading,   setPondsLoading]  = useState(true)
  const [showAdvanced,   setShowAdvanced]  = useState(false)
  const [history,        setHistory]       = useState([])

  const setV = useCallback((k,v) => setVals(p=>({...p,[k]:v})), [])

  useEffect(()=>{
    fetchPonds()
      .then(data=>{
        const sorted=[...(data||[])].sort((a,b)=>new Date(a.created_at)-new Date(b.created_at))
        setPonds(sorted)
        if(sorted[0]){ setPondInfo(sorted[0]); setPondIdx(1) }
      })
      .catch(console.error)
      .finally(()=>setPondsLoading(false))
  },[])

  useEffect(()=>{
    if(ponds[pondIdx-1]) setPondInfo(ponds[pondIdx-1])
  },[pondIdx,ponds])

  const handleRun = async () => {
    setLoading(true); setResult(null)
    try {
      const res = await runWhatIf(pondIdx, buildParams(vals,scenName))
      setResult(res)
      setHistory(h=>[{
        name:scenName, pondIdx,
        time: new Date().toLocaleTimeString(),
        status: res.hypothetical?.fusion?.pond_status,
        health: Math.round((res.hypothetical?.fusion?.composite_health_score??0)*100),
        change: res.delta?.health_score_change??0,
      },...h].slice(0,5))
    } catch(e) {
      console.error(e)
      alert('Simulation failed: '+(e?.response?.data?.detail??e.message))
    } finally { setLoading(false) }
  }

  const handleReset = () => { setVals(DEFAULTS); setResult(null) }

  // Derived result values
  const curH  = Math.round((result?.current?.composite_health_score??0)*100)
  const simH  = Math.round((result?.hypothetical?.fusion?.composite_health_score??0)*100)
  const curSt = result?.current?.pond_status ?? 'Good'
  const simSt = result?.hypothetical?.fusion?.pond_status ?? 'Good'
  const delta = result?.delta ?? {}
  const paramChanges = delta.parameter_changes ?? []
  const newFlags  = delta.new_flags ?? []
  const resolvedFlags = delta.resolved_flags ?? []
  const curFlags = (result?.current?.cross_modal_flags??[]).filter(f=>!resolvedFlags.includes(f)&&!newFlags.includes(f))
  const suggs = result?.hypothetical?.suggestions ?? []

  return (
    <Box sx={{ p:3, minHeight:'100vh',
      background:'linear-gradient(160deg,#050e1a 0%,#071828 60%,#051520 100%)' }}>

      {/* Header */}
      <Box sx={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', mb:3 }}>
        <Box>
          <Typography sx={{ fontSize:22, fontWeight:800, color:'#fff', letterSpacing:-0.5 }}>
            🧪 What-If Simulation
          </Typography>
          <Typography sx={{ fontSize:12, color:'rgba(255,255,255,0.38)', mt:0.4 }}>
            Model hypothetical scenarios — adjust parameters and see the predicted impact on pond health
          </Typography>
        </Box>
        {result && (
          <Button variant="outlined" size="small" onClick={()=>navigate(`/digital-twin/${pondIdx}`)}
            sx={{ borderColor:'rgba(79,195,247,0.35)', color:'#4fc3f7', fontSize:11, fontWeight:700,
              borderRadius:1.5, '&:hover':{ bgcolor:'rgba(79,195,247,0.08)' } }}>
            🌊 View Digital Twin
          </Button>
        )}
      </Box>

      <Box sx={{ display:'grid', gridTemplateColumns:'350px 1fr', gap:2.5, alignItems:'start' }}>

        {/* ══ LEFT PANEL ══ */}
        <Box sx={{ display:'flex', flexDirection:'column', gap:2 }}>

          {/* Pond picker */}
          <Paper sx={{ p:2, borderRadius:2, bgcolor:'rgba(255,255,255,0.03)',
            border:'1px solid rgba(255,255,255,0.07)' }}>
            <Typography sx={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.38)',
              letterSpacing:1, mb:1.5 }}>SELECT POND</Typography>
            {pondsLoading
              ? <CircularProgress size={20} sx={{ color:'#4fc3f7' }}/>
              : <Box sx={{ display:'flex', flexDirection:'column', gap:0.7, maxHeight:180, overflowY:'auto',
                  '&::-webkit-scrollbar':{ width:3 },
                  '&::-webkit-scrollbar-thumb':{ bgcolor:'rgba(255,255,255,0.1)', borderRadius:2 } }}>
                  {ponds.map((p,i)=>(
                    <Box key={p.id} onClick={()=>setPondIdx(i+1)}
                      sx={{ display:'flex', alignItems:'center', gap:1.2, px:1.5, py:1, borderRadius:1.5,
                        cursor:'pointer', transition:'all 0.15s',
                        bgcolor: pondIdx===i+1?'rgba(79,195,247,0.1)':'transparent',
                        border: pondIdx===i+1?'1px solid rgba(79,195,247,0.35)':'1px solid transparent',
                        '&:hover':{ bgcolor:'rgba(79,195,247,0.06)', border:'1px solid rgba(79,195,247,0.2)' } }}>
                      <Box sx={{ width:22, height:22, borderRadius:1, flexShrink:0, display:'flex',
                        alignItems:'center', justifyContent:'center', fontSize:9, fontWeight:800,
                        bgcolor: pondIdx===i+1?'rgba(79,195,247,0.25)':'rgba(255,255,255,0.06)',
                        color: pondIdx===i+1?'#4fc3f7':'rgba(255,255,255,0.4)' }}>#{i+1}</Box>
                      <Typography sx={{ fontSize:12, fontWeight:600, flex:1,
                        color: pondIdx===i+1?'#4fc3f7':'rgba(255,255,255,0.65)',
                        overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {p.pond_name??'(unnamed)'}
                      </Typography>
                      {p.temperature!=null && (
                        <Typography sx={{ fontSize:10, color:'#ff7043', flexShrink:0 }}>{p.temperature}°C</Typography>
                      )}
                    </Box>
                  ))}
                </Box>
            }
            {pondInfo && (
              <Box sx={{ mt:1.5, pt:1.5, borderTop:'1px solid rgba(255,255,255,0.05)',
                display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:0.8 }}>
                {[
                  {l:'Temp',   v:pondInfo.temperature, u:'°C',   c:'#ff7043'},
                  {l:'pH',     v:pondInfo.ph,           u:'',     c:'#ab47bc'},
                  {l:'O₂',     v:pondInfo.oxygen,       u:'mg/L', c:'#4fc3f7'},
                  {l:'Nitrate',v:pondInfo.nitrate,      u:'mg/L', c:'#66bb6a'},
                ].map(({l,v,u,c})=>(
                  <Box key={l} sx={{ p:0.8, borderRadius:1, bgcolor:'rgba(255,255,255,0.03)', textAlign:'center' }}>
                    <Typography sx={{ fontSize:8.5, color:'rgba(255,255,255,0.3)' }}>{l}</Typography>
                    <Typography sx={{ fontSize:11, fontWeight:700, color:v!=null?c:'rgba(255,255,255,0.15)' }}>
                      {v!=null?`${v}${u}`:'—'}
                    </Typography>
                  </Box>
                ))}
              </Box>
            )}
          </Paper>

          {/* Scenario name */}
          <Paper sx={{ p:2, borderRadius:2, bgcolor:'rgba(255,255,255,0.03)',
            border:'1px solid rgba(255,255,255,0.07)' }}>
            <Typography sx={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.38)',
              letterSpacing:1, mb:1 }}>SCENARIO NAME</Typography>
            <TextField value={scenName} onChange={e=>setScenName(e.target.value)}
              size="small" fullWidth placeholder="My scenario"
              sx={{ '& .MuiInputBase-root':{ bgcolor:'rgba(255,255,255,0.04)', borderRadius:1.5,
                fontSize:13, fontWeight:600, color:'#fff' },
                '& .MuiOutlinedInput-notchedOutline':{ borderColor:'rgba(255,255,255,0.1)' } }}/>
          </Paper>

          {/* Water params */}
          <Paper sx={{ p:2, borderRadius:2, bgcolor:'rgba(255,255,255,0.03)',
            border:'1px solid rgba(255,255,255,0.07)' }}>
            <Typography sx={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.38)',
              letterSpacing:1, mb:1.8 }}>💧 WATER PARAMETERS</Typography>
            <SliderRow label="Temperature" unit="°C"     value={vals.temperature}      min={15} max={35}  step={0.5}  color="#ff7043" onChange={v=>setV('temperature',v)}/>
            <SliderRow label="pH"          unit=""        value={vals.ph}               min={5}  max={10}  step={0.1}  color="#ab47bc" onChange={v=>setV('ph',v)}/>
            <SliderRow label="DO"          unit=" mg/L"   value={vals.do}               min={0}  max={15}  step={0.1}  color="#4fc3f7" onChange={v=>setV('do',v)} hint="Dissolved Oxygen"/>
            <SliderRow label="Ammonia"     unit=" mg/L"   value={vals.ammonia}          min={0}  max={5}   step={0.01} color="#ffca28" onChange={v=>setV('ammonia',v)}/>
            <SliderRow label="Nitrate"     unit=" mg/L"   value={vals.nitrate}          min={0}  max={200} step={1}    color="#66bb6a" onChange={v=>setV('nitrate',v)}/>
            <SliderRow label="Turbidity"   unit=" NTU"    value={vals.turbidity}        min={0}  max={500} step={1}    color="#26c6da" onChange={v=>setV('turbidity',v)}/>
            <SliderRow label="Salinity"    unit=" ppt"    value={vals.salinity}         min={0}  max={40}  step={0.5}  color="#5c6bc0" onChange={v=>setV('salinity',v)}/>
            <SliderRow label="Stocking"    unit=" pcs/m²" value={vals.stocking_density} min={50} max={800} step={10}   color="#ec407a" onChange={v=>setV('stocking_density',v)}/>
          </Paper>

          {/* Advanced params */}
          <Paper sx={{ borderRadius:2, bgcolor:'rgba(255,255,255,0.03)',
            border:'1px solid rgba(255,255,255,0.07)', overflow:'hidden' }}>
            <Box onClick={()=>setShowAdvanced(p=>!p)}
              sx={{ display:'flex', alignItems:'center', justifyContent:'space-between',
                px:2, py:1.5, cursor:'pointer', userSelect:'none',
                '&:hover':{ bgcolor:'rgba(255,255,255,0.02)' } }}>
              <Typography sx={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.38)', letterSpacing:1 }}>
                ⚙️ ADVANCED PARAMETERS
              </Typography>
              <Typography sx={{ fontSize:11, color:'rgba(255,255,255,0.25)' }}>{showAdvanced?'▲':'▼'}</Typography>
            </Box>
            {showAdvanced && (
              <Box sx={{ px:2, pb:2 }}>
                <SelectRow label="Shrimp Stage" value={vals.shrimp_stage} onChange={v=>setV('shrimp_stage',v)}
                  options={['PL','Juvenile','Sub-adult','Adult']} color="#ec407a"/>
                <NumberInput label="Shrimp Size" value={vals.shrimp_size} onChange={v=>setV('shrimp_size',v)}
                  color="#ec407a" unit="g"/>
                <NumberInput label="Pond Depth" value={vals.pond_depth} onChange={v=>setV('pond_depth',v)}
                  color="#26c6da" unit="m"/>
                <NumberInput label="BSI Override (0–1)" value={vals.bsi_override} onChange={v=>setV('bsi_override',v)}
                  color="#ab47bc" helper="Override behavioral stress index"/>
                <SelectRow label="Risk Level Override" value={vals.risk_level_override}
                  onChange={v=>setV('risk_level_override',v)} options={['Low','Medium','High','Critical']} color="#ffa726"/>
                <SelectRow label="Feed Type" value={vals.feed_type} onChange={v=>setV('feed_type',v)}
                  options={['Pellet','Granule','Powder','Liquid']} color="#66bb6a"/>
                <Box sx={{ display:'flex', alignItems:'center', justifyContent:'space-between',
                  p:1.2, borderRadius:1.5, bgcolor:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)' }}>
                  <Box>
                    <Typography sx={{ fontSize:11, fontWeight:600, color:'rgba(255,255,255,0.65)' }}>Molting Stage</Typography>
                    <Typography sx={{ fontSize:9, color:'rgba(255,255,255,0.3)' }}>Shrimps currently molting</Typography>
                  </Box>
                  <Switch checked={!!vals.molting_stage} onChange={e=>setV('molting_stage',e.target.checked)} size="small"
                    sx={{ '& .MuiSwitch-thumb':{ bgcolor:'#4fc3f7' }, '& .MuiSwitch-track':{ bgcolor:'#4fc3f7aa' } }}/>
                </Box>
              </Box>
            )}
          </Paper>

          {/* Run / Reset */}
          <Box sx={{ display:'flex', gap:1.2 }}>
            <Button variant="contained" fullWidth onClick={handleRun} disabled={loading}
              sx={{ height:46, borderRadius:2, fontWeight:800, fontSize:13, letterSpacing:0.5,
                background:'linear-gradient(90deg,#0277bd,#4fc3f7)',
                boxShadow:'0 2px 16px rgba(79,195,247,0.22)',
                '&:hover':{ background:'linear-gradient(90deg,#01579b,#039be5)',
                  boxShadow:'0 4px 24px rgba(79,195,247,0.42)' },
                '&:disabled':{ background:'rgba(255,255,255,0.07)', color:'rgba(255,255,255,0.25)' } }}>
              {loading
                ? <><CircularProgress size={15} sx={{ color:'rgba(255,255,255,0.7)', mr:1 }}/> Running…</>
                : '▶ Run Simulation'}
            </Button>
            <Button variant="outlined" onClick={handleReset} disabled={loading}
              sx={{ height:46, borderRadius:2, fontWeight:700, fontSize:12, minWidth:80,
                borderColor:'rgba(255,255,255,0.12)', color:'rgba(255,255,255,0.45)',
                '&:hover':{ borderColor:'rgba(255,255,255,0.28)', color:'#fff' } }}>Reset</Button>
          </Box>

          {/* History */}
          {history.length>0 && (
            <Paper sx={{ p:2, borderRadius:2, bgcolor:'rgba(255,255,255,0.02)',
              border:'1px solid rgba(255,255,255,0.05)' }}>
              <Typography sx={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,0.28)',
                letterSpacing:1, mb:1.2 }}>RECENT RUNS</Typography>
              {history.map((h,i)=>(
                <Box key={i} sx={{ display:'flex', alignItems:'center', gap:1, mb:0.7,
                  px:1.2, py:0.8, borderRadius:1.5, bgcolor:'rgba(255,255,255,0.02)',
                  border:'1px solid rgba(255,255,255,0.04)' }}>
                  <Box sx={{ width:6, height:6, borderRadius:'50%', bgcolor:statusColor(h.status), flexShrink:0 }}/>
                  <Box sx={{ flex:1, minWidth:0 }}>
                    <Typography sx={{ fontSize:10, fontWeight:600, color:'rgba(255,255,255,0.6)',
                      overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{h.name}</Typography>
                    <Typography sx={{ fontSize:8.5, color:'rgba(255,255,255,0.28)' }}>
                      Pond #{h.pondIdx} · {h.time}
                    </Typography>
                  </Box>
                  <Typography sx={{ fontSize:11, fontWeight:700, color:statusColor(h.status) }}>{h.health}%</Typography>
                  <Typography sx={{ fontSize:10, fontWeight:700, color:h.change>=0?'#66bb6a':'#ef5350' }}>
                    {h.change>=0?'+':''}{(h.change*100).toFixed(1)}%
                  </Typography>
                </Box>
              ))}
            </Paper>
          )}
        </Box>

        {/* ══ RIGHT PANEL — Results ══ */}
        <Box>
          {/* Empty state */}
          {!result && !loading && (
            <Box sx={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
              height:480, border:'2px dashed rgba(255,255,255,0.07)', borderRadius:3 }}>
              <Typography sx={{ fontSize:44, mb:2 }}>🧪</Typography>
              <Typography sx={{ fontSize:16, fontWeight:700, color:'rgba(255,255,255,0.45)', mb:1 }}>
                Run a What-If Simulation
              </Typography>
              <Typography sx={{ fontSize:12, color:'rgba(255,255,255,0.28)', textAlign:'center', maxWidth:300, lineHeight:1.7 }}>
                Select a pond, adjust parameters on the left,<br/>then click <strong style={{color:'#4fc3f7'}}>Run Simulation</strong> to see the predicted outcome.
              </Typography>
              <Box sx={{ mt:3, display:'flex', gap:1, flexWrap:'wrap', justifyContent:'center', maxWidth:400 }}>
                {['What if DO drops below 3?','What if ammonia spikes?','What if stocking is doubled?','What if temperature rises to 35°C?'].map(t=>(
                  <Chip key={t} label={t} size="small" onClick={()=>{}} sx={{ fontSize:10, height:24,
                    bgcolor:'rgba(255,255,255,0.04)', color:'rgba(255,255,255,0.4)',
                    border:'1px solid rgba(255,255,255,0.08)', cursor:'default' }}/>
                ))}
              </Box>
            </Box>
          )}

          {/* Loading */}
          {loading && (
            <Box sx={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:480 }}>
              <CircularProgress size={52} sx={{ color:'#4fc3f7', mb:2 }}/>
              <Typography sx={{ fontSize:14, fontWeight:600, color:'rgba(255,255,255,0.5)' }}>Running simulation…</Typography>
              <Typography sx={{ fontSize:11, color:'rgba(255,255,255,0.28)', mt:0.8 }}>
                Computing hypothetical pond state for <strong style={{color:'#4fc3f7'}}>{scenName}</strong>
              </Typography>
            </Box>
          )}

          {/* Results */}
          {result && !loading && (
            <Box sx={{ display:'flex', flexDirection:'column', gap:2 }}>

              {/* Health comparison card */}
              <Paper sx={{ p:2.5, borderRadius:2.5, bgcolor:'rgba(255,255,255,0.03)',
                border:'1px solid rgba(255,255,255,0.08)' }}>
                <Box sx={{ display:'flex', alignItems:'center', justifyContent:'space-between', mb:2.5 }}>
                  <Box>
                    <Typography sx={{ fontSize:14, fontWeight:700, color:'#fff' }}>
                      📊 {result.scenario_name}
                    </Typography>
                    <Typography sx={{ fontSize:10, color:'rgba(255,255,255,0.35)', mt:0.2 }}>
                      Pond #{pondIdx} — {pondInfo?.pond_name ?? ''}
                    </Typography>
                  </Box>
                  <Button size="small" variant="text" onClick={()=>setResult(null)}
                    sx={{ fontSize:10, color:'rgba(255,255,255,0.3)', minWidth:0, px:1,
                      '&:hover':{ color:'rgba(255,255,255,0.6)' } }}>✕ Clear</Button>
                </Box>

                {/* Donuts comparison */}
                <Box sx={{ display:'flex', alignItems:'center', justifyContent:'space-around' }}>
                  <Donut pct={curH} status={curSt} label="Current State"/>
                  <Box sx={{ textAlign:'center', px:2 }}>
                    <Typography sx={{ fontSize:28, fontWeight:900, lineHeight:1,
                      color:(delta.health_score_change??0)>=0?'#66bb6a':'#ef5350' }}>
                      {(delta.health_score_change??0)>=0?'+':''}{(((delta.health_score_change??0))*100).toFixed(1)}%
                    </Typography>
                    <Typography sx={{ fontSize:9, color:'rgba(255,255,255,0.3)', mt:0.3, letterSpacing:0.5 }}>HEALTH CHANGE</Typography>
                    <Chip label={delta.status_change??'unchanged'} size="small" sx={{ mt:1, height:20, fontSize:9.5, fontWeight:700,
                      bgcolor: delta.status_change==='improved'?'rgba(102,187,106,0.15)':
                               delta.status_change==='degraded'?'rgba(239,83,80,0.15)':'rgba(255,255,255,0.07)',
                      color:   delta.status_change==='improved'?'#66bb6a':
                               delta.status_change==='degraded'?'#ef5350':'rgba(255,255,255,0.45)' }}/>
                  </Box>
                  <Donut pct={simH} status={simSt} label="Simulated State"/>
                </Box>

                {/* Simulation note */}
                {result.simulation_note && (
                  <Box sx={{ mt:2.5, p:1.8, borderRadius:1.5,
                    bgcolor:'rgba(79,195,247,0.05)', border:'1px solid rgba(79,195,247,0.13)' }}>
                    <Typography sx={{ fontSize:10.5, color:'rgba(255,255,255,0.58)', lineHeight:1.7 }}>
                      {result.simulation_note}
                    </Typography>
                  </Box>
                )}
              </Paper>

              {/* Parameter impacts + Flags row */}
              <Box sx={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:2 }}>

                {/* Parameter impacts */}
                <Paper sx={{ p:2, borderRadius:2, bgcolor:'rgba(255,255,255,0.03)',
                  border:'1px solid rgba(255,255,255,0.07)' }}>
                  <Typography sx={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.35)',
                    letterSpacing:1, mb:1.5 }}>PARAMETER IMPACTS</Typography>
                  {paramChanges.length===0
                    ? <Typography sx={{ fontSize:11, color:'rgba(255,255,255,0.25)', fontStyle:'italic' }}>
                        No parameters modified
                      </Typography>
                    : paramChanges.map((pc,i)=>(
                      <Box key={i} sx={{ display:'flex', alignItems:'center', gap:1, mb:0.9,
                        px:1.2, py:0.9, borderRadius:1.5, bgcolor:'rgba(255,255,255,0.02)',
                        border:`1px solid ${impactColor(pc.impact)}1a` }}>
                        <Typography sx={{ fontSize:15, color:impactColor(pc.impact), fontWeight:900, minWidth:18, lineHeight:1 }}>
                          {impactIcon(pc.impact)}
                        </Typography>
                        <Box sx={{ flex:1, minWidth:0 }}>
                          <Typography sx={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,0.7)',
                            textTransform:'capitalize' }}>{pc.parameter.replace(/_/g,' ')}</Typography>
                          <Typography sx={{ fontSize:9, color:'rgba(255,255,255,0.32)' }}>
                            {typeof pc.before==='number'?pc.before.toFixed(2):pc.before}
                            {' → '}
                            {typeof pc.after==='number'?pc.after.toFixed(2):pc.after}
                          </Typography>
                        </Box>
                        <Chip label={pc.impact} size="small"
                          sx={{ height:16, fontSize:8, fontWeight:700, flexShrink:0,
                            bgcolor:`${impactColor(pc.impact)}15`, color:impactColor(pc.impact) }}/>
                      </Box>
                    ))
                  }
                </Paper>

                {/* Risk flags */}
                <Paper sx={{ p:2, borderRadius:2, bgcolor:'rgba(255,255,255,0.03)',
                  border:'1px solid rgba(255,255,255,0.07)' }}>
                  <Typography sx={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.35)',
                    letterSpacing:1, mb:1.5 }}>RISK FLAGS</Typography>
                  {resolvedFlags.length>0 && (
                    <Box sx={{ mb:1 }}>
                      <Typography sx={{ fontSize:9, fontWeight:700, color:'#66bb6a', mb:0.5, letterSpacing:0.5 }}>RESOLVED ✅</Typography>
                      {resolvedFlags.map(f=><FlagBadge key={f} flag={f} resolved/>)}
                    </Box>
                  )}
                  {newFlags.length>0 && (
                    <Box sx={{ mb:1 }}>
                      <Typography sx={{ fontSize:9, fontWeight:700, color:'#ef5350', mb:0.5, letterSpacing:0.5 }}>NEW RISKS 🚨</Typography>
                      {newFlags.map(f=><FlagBadge key={f} flag={f} isNew/>)}
                    </Box>
                  )}
                  {curFlags.length>0 && (
                    <Box>
                      <Typography sx={{ fontSize:9, fontWeight:700, color:'rgba(255,255,255,0.25)', mb:0.5, letterSpacing:0.5 }}>UNCHANGED ⚠️</Typography>
                      {curFlags.map(f=><FlagBadge key={f} flag={f}/>)}
                    </Box>
                  )}
                  {resolvedFlags.length===0&&newFlags.length===0&&curFlags.length===0 && (
                    <Typography sx={{ fontSize:11, color:'rgba(255,255,255,0.25)', fontStyle:'italic' }}>No active flags</Typography>
                  )}
                </Paper>
              </Box>

              {/* Recommendations */}
              <Paper sx={{ p:2.5, borderRadius:2, bgcolor:'rgba(255,255,255,0.03)',
                border:'1px solid rgba(255,255,255,0.07)' }}>
                <Box sx={{ display:'flex', alignItems:'center', justifyContent:'space-between', mb:1.5 }}>
                  <Typography sx={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.35)', letterSpacing:1 }}>
                    💡 SIMULATED RECOMMENDATIONS ({suggs.length})
                  </Typography>
                  <Button size="small" onClick={()=>navigate(`/digital-twin/${pondIdx}`)}
                    sx={{ fontSize:10, color:'#4fc3f7', py:0, minHeight:22,
                      '&:hover':{ bgcolor:'rgba(79,195,247,0.07)' } }}>
                    Full Analysis →
                  </Button>
                </Box>
                {suggs.length===0
                  ? <Typography sx={{ fontSize:11, color:'rgba(255,255,255,0.25)', fontStyle:'italic' }}>
                      No recommendations for this scenario
                    </Typography>
                  : suggs.map((s,i)=><SuggCard key={i} s={s}/>)
                }
              </Paper>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  )
}