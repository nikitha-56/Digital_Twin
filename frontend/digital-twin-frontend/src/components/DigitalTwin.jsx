import React, { useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import Slider from '@mui/material/Slider'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Switch from '@mui/material/Switch'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import CircularProgress from '@mui/material/CircularProgress'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import LinearProgress from '@mui/material/LinearProgress'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, ReferenceLine } from 'recharts'
import Pond3D from './Pond3D'
import { useParams } from 'react-router-dom'
import { fetchDigitalTwin, runWhatIf } from '../services/api'

// Pond ID comes from URL param (/digital-twin/:pondId) or defaults to 1
const POND_ID_DEFAULT = 1

const NUMERIC_DEFAULTS = {
  temperature: 28.0, ph: 7.5, do: 6.0, ammonia: 0.1,
  nitrate: 20.0, turbidity: 30.0, salinity: 5.0, stocking_density: 300,
}
const STRING_DEFAULTS = {
  shrimp_stage: '', bsi_override: '', risk_level_override: '',
  feed_type: '', molting_stage: false, shrimp_size: '', pond_depth: '',
}
const MANUAL_DEFAULTS = { ...NUMERIC_DEFAULTS, ...STRING_DEFAULTS }
const WI_DEFAULTS     = { ...NUMERIC_DEFAULTS, ...STRING_DEFAULTS }

// ── Helpers ──────────────────────────────────────────────────────────────────
const sColor = s =>
  s==='Critical'?'#ef5350':s==='Warning'?'#ffa726':s==='Moderate'?'#26c6da':'#66bb6a'
const sBg = s =>
  s==='Critical'?'rgba(239,83,80,0.15)':s==='Warning'?'rgba(255,167,38,0.15)':
  s==='Moderate'?'rgba(38,198,218,0.15)':'rgba(102,187,106,0.15)'
const urgencyColor = u =>
  u==='immediate'?'#ef5350':u==='today'?'#ffa726':u==='this_week'?'#26c6da':'#66bb6a'
const urgencyBg = u =>
  u==='immediate'?'rgba(239,83,80,0.12)':u==='today'?'rgba(255,167,38,0.12)':
  u==='this_week'?'rgba(38,198,218,0.12)':'rgba(102,187,106,0.12)'
const categoryIcon = c =>
  c==='compound'?'🔗':c==='disease'?'🦠':c==='water'?'💧':c==='feed'?'🍤':'📋'
const fmt = (v, d=2) => v!=null ? Number(v).toFixed(d) : '—'
const spark = base => Array.from({length:7},()=>({v:base+(Math.random()-0.5)*base*0.07}))

// ── Sparkline ────────────────────────────────────────────────────────────────
const Spark = ({ color='#4fc3f7', data=[] }) => (
  <ResponsiveContainer width="100%" height={28}>
    <AreaChart data={data} margin={{top:2,right:0,left:0,bottom:0}}>
      <defs>
        <linearGradient id={`sg${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%"  stopColor={color} stopOpacity={0.35}/>
          <stop offset="95%" stopColor={color} stopOpacity={0}/>
        </linearGradient>
      </defs>
      <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.5}
        fill={`url(#sg${color.replace('#','')})`} dot={false} isAnimationActive={false}/>
    </AreaChart>
  </ResponsiveContainer>
)

// ── KPI Card ─────────────────────────────────────────────────────────────────
const KpiCard = ({ label, value, unit, color, sparkData, status }) => (
  <Paper sx={{ p:1.5, flex:'1 1 110px', minWidth:100,
    background:'linear-gradient(135deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))',
    border:'1px solid rgba(255,255,255,0.07)', borderRadius:2, position:'relative', overflow:'hidden' }}>
    <Box sx={{ position:'absolute', top:0, left:0, right:0, bottom:0,
      background:`radial-gradient(ellipse at top left,${color}15 0%,transparent 65%)`, pointerEvents:'none' }}/>
    <Typography sx={{ fontSize:9, fontWeight:700, letterSpacing:1.5,
      color:'rgba(255,255,255,0.4)', textTransform:'uppercase', mb:0.5 }}>{label}</Typography>
    <Box sx={{ display:'flex', alignItems:'baseline', gap:0.4 }}>
      <Typography sx={{ fontSize:19, fontWeight:700, color, lineHeight:1 }}>{value}</Typography>
      <Typography sx={{ fontSize:9, color:'rgba(255,255,255,0.3)' }}>{unit}</Typography>
    </Box>
    {status && <Chip label={status} size="small" sx={{ mt:0.5, height:16, fontSize:9, fontWeight:600,
      bgcolor:sBg(status==='warning'?'Warning':status==='safe'?'Good':status),
      color:sColor(status==='warning'?'Warning':status==='safe'?'Good':status) }}/>}
    <Box sx={{ mt:0.3 }}><Spark color={color} data={sparkData}/></Box>
  </Paper>
)

// ── Suggestion Card ───────────────────────────────────────────────────────────
const SuggestionCard = ({ s, i }) => (
  <Box sx={{ mb:1.2, p:1.5, borderRadius:2,
    bgcolor:urgencyBg(s.urgency), border:`1px solid ${urgencyColor(s.urgency)}30` }}>
    <Box sx={{ display:'flex', alignItems:'center', gap:1, mb:0.6 }}>
      <Typography sx={{ fontSize:14 }}>{categoryIcon(s.category)}</Typography>
      <Box sx={{ flex:1 }}>
        <Box sx={{ display:'flex', gap:0.6, flexWrap:'wrap', mb:0.3 }}>
          <Chip label={s.urgency?.replace('_',' ')} size="small" sx={{ height:15, fontSize:8, fontWeight:700,
            bgcolor:urgencyBg(s.urgency), color:urgencyColor(s.urgency), border:`1px solid ${urgencyColor(s.urgency)}50` }}/>
          <Chip label={s.category} size="small" sx={{ height:15, fontSize:8,
            bgcolor:'rgba(255,255,255,0.06)', color:'rgba(255,255,255,0.45)' }}/>
        </Box>
        <Typography sx={{ fontSize:11, fontWeight:700, color:'#fff', lineHeight:1.3 }}>{s.title}</Typography>
      </Box>
    </Box>
    <Typography sx={{ fontSize:10, color:'rgba(255,255,255,0.55)', lineHeight:1.5, mb:0.5 }}>{s.description}</Typography>
    {s.expected_impact && (
      <Typography sx={{ fontSize:10, color:'#66bb6a', fontStyle:'italic' }}>
        💡 {s.expected_impact}
      </Typography>
    )}
  </Box>
)

// ── Health Row ────────────────────────────────────────────────────────────────
const HealthRow = ({ label, value, unit, color, status, icon }) => (
  <Box sx={{ display:'flex', alignItems:'center', py:0.9,
    borderBottom:'1px solid rgba(255,255,255,0.05)', gap:1.2 }}>
    <Box sx={{ width:28, height:28, borderRadius:'50%', display:'flex', alignItems:'center',
      justifyContent:'center', fontSize:13, bgcolor:`${color}22`, flexShrink:0 }}>{icon}</Box>
    <Box sx={{ flex:1 }}>
      <Typography sx={{ fontSize:11, fontWeight:600, color:'rgba(255,255,255,0.85)' }}>{label}</Typography>
      <Typography sx={{ fontSize:10, color:'rgba(255,255,255,0.38)' }}>{value} {unit}</Typography>
    </Box>
    <Chip label={status} size="small" sx={{ height:17, fontSize:9, fontWeight:700,
      bgcolor:sBg(status), color:sColor(status) }}/>
  </Box>
)

// ── Param Slider ──────────────────────────────────────────────────────────────
const ParamSlider = ({ label, unit, value, min, max, step, color, onChange }) => (
  <Box sx={{ mb:1.2 }}>
    <Box sx={{ display:'flex', justifyContent:'space-between', mb:0.2 }}>
      <Typography sx={{ fontSize:11, color:'rgba(255,255,255,0.48)', fontWeight:500 }}>{label}</Typography>
      <Typography sx={{ fontSize:11, fontWeight:700, color }}>
        {value}<span style={{ color:'rgba(255,255,255,0.28)', fontSize:10 }}> {unit}</span>
      </Typography>
    </Box>
    <Slider min={min} max={max} step={step} value={value} onChange={onChange} size="small"
      sx={{ color, height:3, py:0.5,
        '& .MuiSlider-thumb':{ width:11, height:11 },
        '& .MuiSlider-rail':{ opacity:0.18 } }}/>
  </Box>
)

// ── Param Input ───────────────────────────────────────────────────────────────
const ParamInput = ({ label, value, onChange, type='text', color='#4fc3f7', helper='' }) => (
  <TextField label={label} size="small" fullWidth type={type}
    value={value??''} onChange={e=>onChange(type==='number'?parseFloat(e.target.value)||'':e.target.value)}
    helperText={helper} inputProps={type==='number'?{step:'any'}:{}}
    sx={{ mb:1.2,
      '& .MuiOutlinedInput-root':{ fontSize:12,
        '& fieldset':{ borderColor:'rgba(255,255,255,0.12)' },
        '&:hover fieldset':{ borderColor:`${color}66` },
        '&.Mui-focused fieldset':{ borderColor:color } },
      '& .MuiInputLabel-root':{ fontSize:12, color:'rgba(255,255,255,0.4)' },
      '& .MuiFormHelperText-root':{ fontSize:10, color:'rgba(255,255,255,0.3)', mt:0.2 } }}/>
)

// ── Param Select ──────────────────────────────────────────────────────────────
const ParamSelect = ({ label, value, onChange, options, color='#4fc3f7' }) => (
  <FormControl size="small" fullWidth sx={{ mb:1.2 }}>
    <InputLabel sx={{ fontSize:12, color:'rgba(255,255,255,0.4)' }}>{label}</InputLabel>
    <Select value={value??''} label={label} onChange={e=>onChange(e.target.value)}
      sx={{ fontSize:12,
        '& .MuiOutlinedInput-notchedOutline':{ borderColor:'rgba(255,255,255,0.12)' },
        '&:hover .MuiOutlinedInput-notchedOutline':{ borderColor:`${color}66` },
        '&.Mui-focused .MuiOutlinedInput-notchedOutline':{ borderColor:color } }}>
      <MenuItem value=""><em>None</em></MenuItem>
      {options.map(o=><MenuItem key={o.value??o} value={o.value??o}>{o.label??o}</MenuItem>)}
    </Select>
  </FormControl>
)

// ── Build API params (handles "do" reserved word) ─────────────────────────────
const buildParams = (vals, scenarioName) => {
  const p = {}
  const nums = ['temperature','ph','ammonia','nitrate','turbidity','salinity','stocking_density','bsi_override','shrimp_size','pond_depth']
  nums.forEach(k => { if (vals[k]!==''&&vals[k]!=null) p[k]=vals[k] })
  if (vals.do!==''&&vals.do!=null) p['do']=vals.do
  if (vals.shrimp_stage)          p.shrimp_stage=vals.shrimp_stage
  if (vals.risk_level_override)   p.risk_level_override=vals.risk_level_override
  if (vals.feed_type)             p.feed_type=vals.feed_type
  if (vals.molting_stage===true)  p.molting_stage=true
  if (scenarioName)               p.scenario_name=scenarioName
  return p
}

// ── Numeric sliders — shared for Manual + What-If ─────────────────────────────
const NumericSliders = ({ vals, setVal }) => <>
  <ParamSlider label="Temperature" unit="°C"    value={vals.temperature}      min={15} max={35}  step={0.5}  color="#ff7043" onChange={(_,v)=>setVal('temperature',v)}/>
  <ParamSlider label="pH"          unit=""       value={vals.ph}               min={5}  max={10}  step={0.1}  color="#ab47bc" onChange={(_,v)=>setVal('ph',v)}/>
  <ParamSlider label="DO"          unit="mg/L"   value={vals.do}               min={0}  max={15}  step={0.1}  color="#4fc3f7" onChange={(_,v)=>setVal('do',v)}/>
  <ParamSlider label="Ammonia"     unit="mg/L"   value={vals.ammonia}          min={0}  max={5}   step={0.01} color="#ffca28" onChange={(_,v)=>setVal('ammonia',v)}/>
  <ParamSlider label="Nitrate"     unit="mg/L"   value={vals.nitrate}          min={0}  max={200} step={1}    color="#66bb6a" onChange={(_,v)=>setVal('nitrate',v)}/>
  <ParamSlider label="Turbidity"   unit="NTU"    value={vals.turbidity}        min={0}  max={500} step={1}    color="#26c6da" onChange={(_,v)=>setVal('turbidity',v)}/>
  <ParamSlider label="Salinity"    unit="ppt"    value={vals.salinity}         min={0}  max={40}  step={0.5}  color="#5c6bc0" onChange={(_,v)=>setVal('salinity',v)}/>
  <ParamSlider label="Stocking"    unit="pcs/m²" value={vals.stocking_density} min={50} max={800} step={10}   color="#ec407a" onChange={(_,v)=>setVal('stocking_density',v)}/>
</>

// ── String/advanced params ────────────────────────────────────────────────────
const AdvancedParams = ({ vals, setVal }) => <>
  <Divider sx={{ borderColor:'rgba(255,255,255,0.07)', my:1.2 }}/>
  <Typography sx={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,0.32)', mb:1, letterSpacing:1 }}>ADVANCED</Typography>
  <ParamSelect label="Shrimp Stage" value={vals.shrimp_stage} onChange={v=>setVal('shrimp_stage',v)} color="#ec407a"
    options={['PL','Juvenile','Sub-adult','Adult']}/>
  <ParamInput  label="Shrimp Size (g)"      value={vals.shrimp_size}         onChange={v=>setVal('shrimp_size',v)}         type="number" color="#ec407a"/>
  <ParamInput  label="Pond Depth (m)"       value={vals.pond_depth}          onChange={v=>setVal('pond_depth',v)}          type="number" color="#26c6da"/>
  <ParamInput  label="BSI Override (0–1)"   value={vals.bsi_override}        onChange={v=>setVal('bsi_override',v)}        type="number" color="#ab47bc" helper="Override behavioral stress index"/>
  <ParamSelect label="Risk Level Override"  value={vals.risk_level_override} onChange={v=>setVal('risk_level_override',v)} color="#ffa726"
    options={['Low','Medium','High','Critical']}/>
  <ParamSelect label="Feed Type"            value={vals.feed_type}           onChange={v=>setVal('feed_type',v)}           color="#66bb6a"
    options={['Pellet','Granule','Powder','Liquid']}/>
  <Box sx={{ display:'flex', alignItems:'center', justifyContent:'space-between',
    p:1, mb:1, borderRadius:1.5, bgcolor:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)' }}>
    <Box>
      <Typography sx={{ fontSize:11, fontWeight:600, color:'rgba(255,255,255,0.7)' }}>Molting Stage</Typography>
      <Typography sx={{ fontSize:10, color:'rgba(255,255,255,0.32)' }}>Shrimps currently molting</Typography>
    </Box>
    <Switch checked={!!vals.molting_stage} onChange={e=>setVal('molting_stage',e.target.checked)} size="small"
      sx={{ '& .MuiSwitch-thumb':{ bgcolor:'#4fc3f7' }, '& .MuiSwitch-track':{ bgcolor:'#4fc3f7aa' } }}/>
  </Box>
</>

// ─────────────────────────────────────────────────────────────────────────────
export default function DigitalTwin() {
  const { pondId } = useParams()
  const POND_ID = pondId ? (isNaN(parseInt(pondId)) ? pondId : parseInt(pondId)) : POND_ID_DEFAULT

  const [twin,    setTwin]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [mode,    setMode]    = useState('sensor')
  const [tab,     setTab]     = useState('overview')

  const [mi,            setMi]            = useState(MANUAL_DEFAULTS)
  const [manualResult,  setManualResult]  = useState(null)
  const [manualLoading, setManualLoading] = useState(false)
  const [manualError,   setManualError]   = useState(null)

  const [wi,        setWi]        = useState(WI_DEFAULTS)
  const [wiName,    setWiName]    = useState('My scenario')
  const [wiResult,  setWiResult]  = useState(null)
  const [wiLoading, setWiLoading] = useState(false)

  useEffect(() => {
    // Reset everything when pond changes
    setTwin(null)
    setWiResult(null)
    setManualResult(null)
    setTab('overview')
    setLoading(true)
    fetchDigitalTwin(POND_ID)
      .then(d => setTwin(d))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [POND_ID])

  // ── Extract from live API response ───────────────────────────────────────
  const fusion      = twin?.fusion      ?? {}
  const farmerSum   = twin?.farmer_summary ?? {}
  const suggestions = twin?.suggestions ?? []

  const pondStatus    = fusion.pond_status            ?? 'Good'
  const healthScore   = fusion.composite_health_score ?? 1
  const primaryConcern= fusion.primary_concern        ?? '—'
  const confidence    = fusion.confidence             ?? 0
  const activeFlags   = fusion.cross_modal_flags      ?? []
  const compScores    = fusion.component_scores       ?? {}

  const wr    = twin?.raw_scores?.water?.current_readings ?? {}
  const wPh   = wr.ph          ?? null
  const wDo   = wr.do          ?? null
  const wTemp = wr.temperature ?? null
  const wNH3  = wr.ammonia     ?? null
  const wNO3  = wr.nitrate     ?? null
  const wTurb = wr.turbidity   ?? null
  const wSal  = wr.salinity    ?? null

  // Use raw_scores.disease (from main twin) — no separate API call needed
  const diseaseRaw= twin?.raw_scores?.disease ?? {}
  const bsi       = diseaseRaw.behavioral_stress_index ?? 0
  const symptom   = diseaseRaw.dominant_symptom        ?? 'reduced activity'
  const riskLvl   = diseaseRaw.risk_level              ?? 'Low'
  const shrimpCnt = diseaseRaw.shrimp_count            ?? 0
  const spreadRisk= diseaseRaw.spread_risk             ?? '—'

  const feed     = twin?.raw_scores?.feed ?? {}
  const feedKg   = feed.optimal_feed_kg       ?? null
  const mortality= feed.mortality_probability ?? 0
  const layerDist= feed.layer_distribution    ?? {}

  const forecastData = (twin?.raw_scores?.water?.hourly_forecast ?? []).map((h,i) => ({
    time:  `+${i+1}h`,
    Temp:  +(h.temperature??0).toFixed(2),
    DO:    +(h.do??0).toFixed(2),
    pH:    +(h.ph??0).toFixed(2),
    NH3:   +(h.ammonia??0).toFixed(3),
    WQS:   +(h.water_quality_score??0).toFixed(3),
    Sal:   +(h.salinity??0).toFixed(3),
    Turb:  +(h.turbidity??0).toFixed(2),
  }))

  // wiResult persists across ALL tabs — overview shows simulation state until cleared
  const activeResult  = wiResult ?? (mode==='manual' ? manualResult : null)
  const isSimulating  = !!activeResult
  const dispStatus    = activeResult?.hypothetical?.fusion?.pond_status            ?? pondStatus
  const dispHealth    = activeResult?.hypothetical?.fusion?.composite_health_score ?? healthScore
  const dispSymptom   = activeResult?.hypothetical?.fusion?.primary_concern==='disease' ? 'erratic swimming' : symptom
  const dispSuggs     = activeResult?.hypothetical?.suggestions ?? activeResult?.suggestions ?? suggestions
  const dispFlags     = activeResult?.hypothetical?.fusion?.cross_modal_flags ?? activeFlags
  const dispFarmerSum = activeResult?.hypothetical?.farmer_summary ?? farmerSum
  const wiDelta        = activeResult?.delta ?? null
  const wiNote         = activeResult?.simulation_note ?? null
  const wiParamChanges = activeResult?.delta?.parameter_changes ?? []
  const wiParamsTested = activeResult?.parameters_tested ?? {}

  // ── Farmer summary critical param status helper ──────────────────────────
  const getCritParam = name => farmerSum.critical_parameters?.find(p=>p.name===name)

  // ── Handlers ─────────────────────────────────────────────────────────────
  const setMiVal = (k,v) => setMi(p=>({...p,[k]:v}))
  const setWiVal = (k,v) => setWi(p=>({...p,[k]:v}))

  const handleManualRun = async () => {
    setManualLoading(true); setManualResult(null); setManualError(null)
    try { setManualResult(await runWhatIf(POND_ID, buildParams(mi,'Manual Input'))) }
    catch(e) { console.error(e); setManualError('Simulation failed — check backend.') }
    finally  { setManualLoading(false) }
  }

  const handleWhatIf = async () => {
    setWiLoading(true); setWiResult(null)
    try {
      const result = await runWhatIf(POND_ID, buildParams(wi, wiName))
      console.log("WhatIf result:", JSON.stringify(result).substring(0,500))
      console.log("hypothetical.suggestions:", result?.hypothetical?.suggestions?.length, "top-level:", result?.suggestions?.length)
      setWiResult(result)
      setTab("overview")
    }
    catch(e) { console.error(e); alert("What-If failed.") }
    finally  { setWiLoading(false) }
  }

  const tabSx = t => ({
    px:2, py:1, cursor:'pointer', fontSize:12, fontWeight:600, userSelect:'none',
    borderBottom: tab===t?'2px solid #4fc3f7':'2px solid transparent',
    color: tab===t?'#4fc3f7':'rgba(255,255,255,0.38)', transition:'color 0.2s',
  })

  if (loading) return (
    <Box sx={{ display:'flex', justifyContent:'center', alignItems:'center', height:'70vh' }}>
      <Box sx={{ textAlign:'center' }}>
        <CircularProgress size={44} sx={{ color:'#4fc3f7' }}/>
        <Typography sx={{ mt:2, color:'rgba(255,255,255,0.4)', fontSize:13 }}>Loading Digital Twin…</Typography>
      </Box>
    </Box>
  )

  return (
    <Box sx={{ p:{xs:1.5,md:2}, background:'linear-gradient(160deg,#050e1a 0%,#071828 60%,#051520 100%)', minHeight:'100vh' }}>

      {/* ── Header ── */}
      <Box sx={{ display:'flex', alignItems:'center', justifyContent:'space-between', mb:2, flexWrap:'wrap', gap:1 }}>
        <Box sx={{ display:'flex', alignItems:'center', gap:1.5 }}>
          <Box sx={{ width:36, height:36, borderRadius:1.5, bgcolor:'#4fc3f718',
            display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>🌊</Box>
          <Box>
            <Typography sx={{ fontSize:16, fontWeight:700, color:'#fff', lineHeight:1.1 }}>Digital Twin</Typography>
            <Typography sx={{ fontSize:11, color:'rgba(255,255,255,0.32)' }}>
              Pond {twin?.pond_id ?? POND_ID} · {farmerSum.water_trend ? `Water trend: ${farmerSum.water_trend}` : 'Live Monitoring'}
            </Typography>
          </Box>
        </Box>

        {/* Immediate action banner */}
        {farmerSum.immediate_action_required && (
          <Box sx={{ flex:1, mx:2, px:1.5, py:0.8, borderRadius:2,
            bgcolor:'rgba(239,83,80,0.12)', border:'1px solid rgba(239,83,80,0.35)',
            display:'flex', alignItems:'center', gap:1 }}>
            <Typography sx={{ fontSize:11, fontWeight:700, color:'#ef5350' }}>🚨</Typography>
            <Typography sx={{ fontSize:11, color:'rgba(255,255,255,0.75)', lineHeight:1.3 }}>
              {farmerSum.top_action}
            </Typography>
          </Box>
        )}

        <Box sx={{ display:'flex', alignItems:'center', gap:1, bgcolor:'rgba(255,255,255,0.05)',
          borderRadius:2, px:1.5, py:0.6, border:'1px solid rgba(255,255,255,0.09)' }}>
          <Typography sx={{ fontSize:12, fontWeight:600, color:mode==='manual'?'#4fc3f7':'rgba(255,255,255,0.28)' }}>MANUAL</Typography>
          <Switch checked={mode==='sensor'} onChange={e=>{ setMode(e.target.checked?'sensor':'manual'); setManualResult(null) }} size="small"
            sx={{ '& .MuiSwitch-thumb':{ bgcolor:'#4fc3f7' }, '& .MuiSwitch-track':{ bgcolor:'#4fc3f7aa' } }}/>
          <Typography sx={{ fontSize:12, fontWeight:600, color:mode==='sensor'?'#4fc3f7':'rgba(255,255,255,0.28)' }}>SENSOR</Typography>
        </Box>
      </Box>

      {/* ── KPI strip — always live sensor values from farmer_summary.critical_parameters ── */}
      <Box sx={{ display:'flex', gap:1.2, mb:2, overflowX:'auto', pb:0.5 }}>
        {[
          { label:'pH',          value:fmt(wPh,3),   unit:'',      color:'#ab47bc', base:7.5,  cp: getCritParam('ph') },
          { label:'DO',          value:fmt(wDo,2),   unit:'mg/L',  color:'#4fc3f7', base:6,    cp: getCritParam('do') },
          { label:'Temperature', value:fmt(wTemp,2), unit:'°C',    color:'#ff7043', base:28,   cp: getCritParam('temperature') },
          { label:'NH3',         value:fmt(wNH3,3),  unit:'mg/L',  color:'#ffca28', base:0.1,  cp: getCritParam('ammonia') },
          { label:'Nitrate',     value:fmt(wNO3,2),  unit:'mg/L',  color:'#66bb6a', base:20,   cp: getCritParam('nitrate') },
          { label:'Turbidity',   value:fmt(wTurb,2), unit:'NTU',   color:'#26c6da', base:30,   cp: getCritParam('turbidity') },
          { label:'Salinity',    value:fmt(wSal,3),  unit:'ppt',   color:'#5c6bc0', base:5,    cp: getCritParam('salinity') },
          { label:'Shrimps',     value:shrimpCnt,    unit:'',      color:'#ec407a', base:1900, cp:null },
        ].map(({ label, value, unit, color, base, cp }) => (
          <KpiCard key={label} label={label} value={value} unit={unit} color={color}
            sparkData={spark(base)} status={cp?.status ?? null}/>
        ))}
      </Box>

      {/* ── Main Grid ── */}
      <Grid container spacing={1.5}>

        {/* LEFT: health or manual sliders */}
        <Grid item xs={12} md={3}>
          <Paper sx={{ p:2, background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)',
            borderRadius:3, maxHeight:700, overflowY:'auto' }}>

            {mode==='sensor' ? <>
              {/* Component scores */}
              <Typography sx={{ fontSize:13, fontWeight:700, color:'#fff', mb:1.5 }}>System Scores</Typography>
              {[
                { l:'Water Quality',  v:compScores.water,           color:'#4fc3f7' },
                { l:'Disease Risk',   v:compScores.disease_risk,    color:'#ffa726' },
                { l:'Feed Efficiency',v:compScores.feed_efficiency, color:'#66bb6a' },
              ].map(({ l, v, color }) => (
                <Box key={l} sx={{ mb:1.5 }}>
                  <Box sx={{ display:'flex', justifyContent:'space-between', mb:0.5 }}>
                    <Typography sx={{ fontSize:11, color:'rgba(255,255,255,0.55)' }}>{l}</Typography>
                    <Typography sx={{ fontSize:11, fontWeight:700, color }}>{fmt(v*100,1)}%</Typography>
                  </Box>
                  <LinearProgress variant="determinate" value={(v??0)*100}
                    sx={{ height:4, borderRadius:2, bgcolor:'rgba(255,255,255,0.07)',
                      '& .MuiLinearProgress-bar':{ bgcolor:color, borderRadius:2 } }}/>
                </Box>
              ))}
              <Box sx={{ mb:1.5, p:1, borderRadius:1.5, bgcolor:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)' }}>
                <Typography sx={{ fontSize:10, color:'rgba(255,255,255,0.35)' }}>Confidence</Typography>
                <Typography sx={{ fontSize:13, fontWeight:700, color:'#4fc3f7' }}>{fmt(confidence*100,1)}%</Typography>
              </Box>

              <Divider sx={{ my:1.5, borderColor:'rgba(255,255,255,0.06)' }}/>
              <Typography sx={{ fontSize:13, fontWeight:700, color:'#fff', mb:1 }}>Health Indicators</Typography>
              <HealthRow label="pH"           value={fmt(wPh,3)}  unit=""      color="#ab47bc" icon="⚗️"  status={getCritParam('ph')?.status==='warning'?'Warning':'Good'}/>
              <HealthRow label="Dissolved O₂" value={fmt(wDo,2)}  unit="mg/L"  color="#4fc3f7" icon="💧"  status={getCritParam('do')?.status==='warning'?'Warning':'Good'}/>
              <HealthRow label="Temperature"  value={fmt(wTemp,2)} unit="°C"   color="#ff7043" icon="🌡️" status={getCritParam('temperature')?.status==='warning'?'Warning':'Good'}/>
              <HealthRow label="Ammonia"      value={fmt(wNH3,3)} unit="mg/L"  color="#ffca28" icon="⚠️"  status={getCritParam('ammonia')?.status==='warning'?'Warning':'Good'}/>
              <HealthRow label="Nitrate"      value={fmt(wNO3,2)} unit="mg/L"  color="#66bb6a" icon="🧪"  status="Good"/>
              <HealthRow label="Turbidity"    value={fmt(wTurb,2)} unit="NTU"  color="#26c6da" icon="🌫️" status={getCritParam('turbidity')?.status==='warning'?'Warning':'Good'}/>
              <HealthRow label="Salinity"     value={fmt(wSal,3)} unit="ppt"   color="#5c6bc0" icon="🧂"  status={getCritParam('salinity')?.status==='warning'?'Warning':'Good'}/>

              <Divider sx={{ my:1.5, borderColor:'rgba(255,255,255,0.06)' }}/>
              <Typography sx={{ fontSize:13, fontWeight:700, color:'#fff', mb:1 }}>Feed & Disease</Typography>
              <HealthRow label="Optimal Feed"   value={fmt(feedKg,1)}         unit="kg"  color="#66bb6a" icon="🍤" status="Good"/>
              <HealthRow label="Mortality Risk" value={`${fmt(mortality*100,1)}%`} unit="" color="#ef5350" icon="💀" status={mortality>0.7?'Critical':mortality>0.4?'Warning':'Good'}/>
              <HealthRow label="Disease Risk"   value={riskLvl}                unit=""   color="#ffa726" icon="🦠" status={riskLvl==='High'||riskLvl==='Critical'?'Warning':'Good'}/>
              <HealthRow label="BSI"            value={fmt(bsi,3)}             unit=""   color="#ab47bc" icon="📊" status={bsi>0.7?'Critical':bsi>0.4?'Warning':'Good'}/>

              {/* Layer distribution */}
              <Divider sx={{ my:1.5, borderColor:'rgba(255,255,255,0.06)' }}/>
              <Typography sx={{ fontSize:12, fontWeight:700, color:'#fff', mb:1 }}>Feed Layer Distribution</Typography>
              {[
                { l:'Bottom', v:layerDist.bottom_pct, c:'#ff7043' },
                { l:'Mid',    v:layerDist.mid_pct,    c:'#4fc3f7' },
                { l:'Surface',v:layerDist.surface_pct,c:'#66bb6a' },
              ].map(({ l, v, c }) => (
                <Box key={l} sx={{ mb:1 }}>
                  <Box sx={{ display:'flex', justifyContent:'space-between', mb:0.3 }}>
                    <Typography sx={{ fontSize:10, color:'rgba(255,255,255,0.45)' }}>{l}</Typography>
                    <Typography sx={{ fontSize:10, fontWeight:700, color:c }}>{fmt((v??0)*100,1)}%</Typography>
                  </Box>
                  <LinearProgress variant="determinate" value={(v??0)*100}
                    sx={{ height:3, borderRadius:2, bgcolor:'rgba(255,255,255,0.07)',
                      '& .MuiLinearProgress-bar':{ bgcolor:c, borderRadius:2 } }}/>
                </Box>
              ))}

              {/* Farmer summary */}
              <Divider sx={{ my:1.5, borderColor:'rgba(255,255,255,0.06)' }}/>
              <Typography sx={{ fontSize:12, fontWeight:700, color:'#fff', mb:1 }}>🌾 Farmer Summary</Typography>
              <Box sx={{ p:1, borderRadius:1.5, bgcolor:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)', mb:1 }}>
                <Typography sx={{ fontSize:10, color:'rgba(255,255,255,0.35)' }}>Shrimp Status</Typography>
                <Typography sx={{ fontSize:11, color:'rgba(255,255,255,0.7)', lineHeight:1.4 }}>{farmerSum.shrimp_status}</Typography>
              </Box>
              <Box sx={{ p:1, borderRadius:1.5, bgcolor:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)', mb:1 }}>
                <Typography sx={{ fontSize:10, color:'rgba(255,255,255,0.35)' }}>Feed Adjustment</Typography>
                <Typography sx={{ fontSize:11, color:'rgba(255,255,255,0.7)', lineHeight:1.4 }}>{farmerSum.feed_adjustment_reason}</Typography>
              </Box>
              <Box sx={{ display:'flex', gap:1 }}>
                <Box sx={{ flex:1, p:1, borderRadius:1.5, bgcolor:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)' }}>
                  <Typography sx={{ fontSize:10, color:'rgba(255,255,255,0.35)' }}>Mortality Trend</Typography>
                  <Typography sx={{ fontSize:12, fontWeight:700,
                    color:farmerSum.mortality_trend==='rising'?'#ef5350':farmerSum.mortality_trend==='stable'?'#ffa726':'#66bb6a' }}>
                    {farmerSum.mortality_trend==='rising'?'📈':farmerSum.mortality_trend==='stable'?'➡️':'📉'} {farmerSum.mortality_trend}
                  </Typography>
                </Box>
                <Box sx={{ flex:1, p:1, borderRadius:1.5, bgcolor:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)' }}>
                  <Typography sx={{ fontSize:10, color:'rgba(255,255,255,0.35)' }}>Today's Feed</Typography>
                  <Typography sx={{ fontSize:12, fontWeight:700, color:'#66bb6a' }}>{fmt(farmerSum.adjusted_feed_today_kg,1)} kg</Typography>
                </Box>
              </Box>
            </> : <>
              <Typography sx={{ fontSize:13, fontWeight:700, color:'#fff', mb:0.5 }}>📝 Manual Parameters</Typography>
              <Typography sx={{ fontSize:11, color:'rgba(255,255,255,0.32)', mb:1.5 }}>Adjust and analyze conditions</Typography>
              <NumericSliders vals={mi} setVal={setMiVal}/>
              <AdvancedParams  vals={mi} setVal={setMiVal}/>
              <Button variant="contained" fullWidth onClick={handleManualRun} disabled={manualLoading}
                sx={{ mt:1.5, height:40, borderRadius:2, fontWeight:700,
                  background:'linear-gradient(90deg,#0288d1,#4fc3f7)',
                  '&:hover':{ background:'linear-gradient(90deg,#0277bd,#039be5)' } }}>
                {manualLoading ? <CircularProgress size={17} sx={{color:'#fff'}}/> : '▶ Analyze Conditions'}
              </Button>
              {manualError && <Typography sx={{ mt:1, fontSize:11, color:'#ef5350' }}>{manualError}</Typography>}

              <Divider sx={{ my:1.5, borderColor:'rgba(255,255,255,0.06)' }}/>

              {/* Feed & Disease — live OR simulated after Analyze */}
              {(() => {
                const simFeed    = manualResult?.hypothetical?.raw_scores?.feed
                const simDisease = manualResult?.hypothetical?.raw_scores?.disease
                const dispFeedKg    = simFeed?.optimal_feed_kg       ?? feedKg
                const dispMortality = simFeed?.mortality_probability  ?? mortality
                const dispLayer     = simFeed?.layer_distribution     ?? layerDist
                const dispRiskLvl   = simDisease?.risk_level          ?? riskLvl
                const dispBsi       = simDisease?.behavioral_stress_index ?? bsi
                const dispSpread    = simDisease?.spread_risk         ?? spreadRisk
                const dispSymptom_  = simDisease?.dominant_symptom   ?? symptom
                const isSim         = !!manualResult
                return (
                  <>
                    <Box sx={{ display:'flex', alignItems:'center', justifyContent:'space-between', mb:1 }}>
                      <Typography sx={{ fontSize:13, fontWeight:700, color:'#fff' }}>Feed & Disease</Typography>
                      {isSim && (
                        <Chip label="Simulated" size="small" sx={{ height:16, fontSize:9, fontWeight:700,
                          bgcolor:'rgba(79,195,247,0.15)', color:'#4fc3f7', border:'1px solid #4fc3f733' }}/>
                      )}
                    </Box>

                    {/* Side-by-side if simulated */}
                    {isSim ? (
                      <Box>
                        {[
                          { label:'Optimal Feed',   live:`${fmt(feedKg,1)} kg`,        sim:`${fmt(dispFeedKg,1)} kg`,        color:'#66bb6a', icon:'🍤' },
                          { label:'Mortality Risk', live:`${fmt(mortality*100,1)}%`,    sim:`${fmt(dispMortality*100,1)}%`,   color:'#ef5350', icon:'💀' },
                          { label:'Disease Risk',   live:riskLvl,                       sim:dispRiskLvl,                      color:'#ffa726', icon:'🦠' },
                          { label:'BSI',            live:fmt(bsi,3),                    sim:fmt(dispBsi,3),                   color:'#ab47bc', icon:'📊' },
                          { label:'Spread Risk',    live:spreadRisk,                    sim:dispSpread,                       color:'#ffa726', icon:'🌐' },
                          { label:'Symptom',        live:symptom,                       sim:dispSymptom_,                     color:'#ffca28', icon:'🦐' },
                        ].map(({ label, live, sim, color, icon }) => (
                          <Box key={label} sx={{ display:'flex', alignItems:'center', py:0.7,
                            borderBottom:'1px solid rgba(255,255,255,0.05)', gap:1 }}>
                            <Typography sx={{ fontSize:12 }}>{icon}</Typography>
                            <Typography sx={{ fontSize:10, color:'rgba(255,255,255,0.45)', width:72, flexShrink:0 }}>{label}</Typography>
                            <Typography sx={{ fontSize:10, color:'rgba(255,255,255,0.3)', flex:1, textDecoration:'line-through' }}>{live}</Typography>
                            <Typography sx={{ fontSize:11, fontWeight:700, color, flex:1, textAlign:'right' }}>{sim}</Typography>
                          </Box>
                        ))}

                        <Divider sx={{ my:1.2, borderColor:'rgba(255,255,255,0.06)' }}/>
                        <Typography sx={{ fontSize:11, fontWeight:700, color:'#fff', mb:1 }}>Feed Layer Distribution</Typography>
                        {[
                          { l:'Bottom', live:layerDist.bottom_pct, sim:dispLayer.bottom_pct, c:'#ff7043' },
                          { l:'Mid',    live:layerDist.mid_pct,    sim:dispLayer.mid_pct,    c:'#4fc3f7' },
                          { l:'Surface',live:layerDist.surface_pct,sim:dispLayer.surface_pct,c:'#66bb6a' },
                        ].map(({ l, live, sim, c }) => (
                          <Box key={l} sx={{ mb:1 }}>
                            <Box sx={{ display:'flex', justifyContent:'space-between', mb:0.3 }}>
                              <Typography sx={{ fontSize:10, color:'rgba(255,255,255,0.45)' }}>{l}</Typography>
                              <Box sx={{ display:'flex', gap:1 }}>
                                <Typography sx={{ fontSize:9, color:'rgba(255,255,255,0.25)', textDecoration:'line-through' }}>
                                  {fmt((live??0)*100,1)}%
                                </Typography>
                                <Typography sx={{ fontSize:10, fontWeight:700, color:c }}>{fmt((sim??0)*100,1)}%</Typography>
                              </Box>
                            </Box>
                            <Box sx={{ position:'relative', height:5, borderRadius:2, bgcolor:'rgba(255,255,255,0.07)', overflow:'hidden' }}>
                              <Box sx={{ position:'absolute', height:'100%', borderRadius:2, opacity:0.3,
                                width:`${(live??0)*100}%`, bgcolor:c }}/>
                              <Box sx={{ position:'absolute', height:'100%', borderRadius:2, transition:'width 0.6s ease',
                                width:`${(sim??0)*100}%`, bgcolor:c }}/>
                            </Box>
                          </Box>
                        ))}
                      </Box>
                    ) : (
                      <Box>
                        <HealthRow label="Optimal Feed"   value={fmt(feedKg,1)}              unit="kg"  color="#66bb6a" icon="🍤" status="Good"/>
                        <HealthRow label="Mortality Risk" value={`${fmt(mortality*100,1)}%`} unit=""    color="#ef5350" icon="💀" status={mortality>0.7?'Critical':mortality>0.4?'Warning':'Good'}/>
                        <HealthRow label="Disease Risk"   value={riskLvl}                    unit=""    color="#ffa726" icon="🦠" status={riskLvl==='High'||riskLvl==='Critical'?'Warning':'Good'}/>
                        <HealthRow label="BSI"            value={fmt(bsi,3)}                 unit=""    color="#ab47bc" icon="📊" status={bsi>0.7?'Critical':bsi>0.4?'Warning':'Good'}/>
                        <HealthRow label="Spread Risk"    value={spreadRisk}                 unit=""    color="#ffa726" icon="🌐" status={spreadRisk==='High'?'Warning':spreadRisk==='Critical'?'Critical':'Good'}/>
                        <HealthRow label="Symptom"        value={symptom}                    unit=""    color="#ffca28" icon="🦐" status={bsi>0.5?'Warning':'Good'}/>

                        <Divider sx={{ my:1.2, borderColor:'rgba(255,255,255,0.06)' }}/>
                        <Typography sx={{ fontSize:12, fontWeight:700, color:'#fff', mb:1 }}>Feed Layer Distribution</Typography>
                        {[
                          { l:'Bottom', v:layerDist.bottom_pct, c:'#ff7043' },
                          { l:'Mid',    v:layerDist.mid_pct,    c:'#4fc3f7' },
                          { l:'Surface',v:layerDist.surface_pct,c:'#66bb6a' },
                        ].map(({ l, v, c }) => (
                          <Box key={l} sx={{ mb:1 }}>
                            <Box sx={{ display:'flex', justifyContent:'space-between', mb:0.3 }}>
                              <Typography sx={{ fontSize:10, color:'rgba(255,255,255,0.45)' }}>{l}</Typography>
                              <Typography sx={{ fontSize:10, fontWeight:700, color:c }}>{fmt((v??0)*100,1)}%</Typography>
                            </Box>
                            <LinearProgress variant="determinate" value={(v??0)*100}
                              sx={{ height:3, borderRadius:2, bgcolor:'rgba(255,255,255,0.07)',
                                '& .MuiLinearProgress-bar':{ bgcolor:c, borderRadius:2 } }}/>
                          </Box>
                        ))}
                      </Box>
                    )}
                  </>
                )
              })()}
            </>}
          </Paper>
        </Grid>

        {/* CENTRE: 3D Pond */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ height:500, position:'relative', overflow:'hidden', borderRadius:3,
            border:'1px solid rgba(255,255,255,0.08)', background:'#050e1a' }}>
            {/* Status chip */}
            <Box sx={{ position:'absolute', top:12, left:12, zIndex:10, display:'flex', gap:1 }}>
              <Chip label={dispStatus} size="small" sx={{
                bgcolor:sBg(dispStatus), color:sColor(dispStatus),
                fontWeight:700, fontSize:11, border:`1px solid ${sColor(dispStatus)}44`, backdropFilter:'blur(8px)' }}/>
              {isSimulating && (
                <Chip label="Simulated" size="small" sx={{
                  bgcolor:'rgba(79,195,247,0.15)', color:'#4fc3f7', fontWeight:600, fontSize:10,
                  border:'1px solid #4fc3f733', backdropFilter:'blur(8px)' }}/>
              )}
            </Box>

            {/* BSI + shrimp count */}
            <Box sx={{ position:'absolute', top:12, right:12, zIndex:10, display:'flex', flexDirection:'column', gap:0.5, alignItems:'flex-end' }}>
              <Chip label={`BSI ${fmt(bsi*100,0)}%`} size="small" sx={{
                bgcolor:'rgba(0,0,0,0.55)', color:'rgba(255,255,255,0.65)', fontWeight:600, fontSize:10,
                backdropFilter:'blur(8px)' }}/>
              <Chip label={`🦐 ${shrimpCnt?.toLocaleString()} shrimps`} size="small" sx={{
                bgcolor:'rgba(0,0,0,0.55)', color:'#ffddaa', fontWeight:600, fontSize:10,
                backdropFilter:'blur(8px)' }}/>
            </Box>

            {/* Symptom */}
            <Box sx={{ position:'absolute', top:72, right:12, zIndex:10 }}>
              <Chip label={
                dispSymptom==='lethargy'?'💤 Lethargic':
                dispSymptom==='erratic swimming'?'🌀 Erratic':
                dispSymptom==='surface gasping'?'😮‍💨 Gasping':
                dispSymptom==='gill inflammation'?'🔴 Gill Stress':
                dispSymptom==='reduced activity'?'🐢 Sluggish':'🦐 Normal'
              } size="small" sx={{
                bgcolor:'rgba(0,0,0,0.55)', color:'#ffddaa', fontWeight:600, fontSize:10,
                backdropFilter:'blur(8px)', border:'1px solid rgba(255,200,100,0.18)' }}/>
            </Box>

            {/* Health bar */}
            <Box sx={{ position:'absolute', bottom:44, left:14, zIndex:10, width:160 }}>
              <Typography sx={{ fontSize:9, color:'rgba(255,255,255,0.38)', mb:0.5, fontWeight:600, letterSpacing:1 }}>
                HEALTH {fmt(dispHealth*100,0)}%
              </Typography>
              <Box sx={{ height:4, borderRadius:2, bgcolor:'rgba(255,255,255,0.1)', overflow:'hidden' }}>
                <Box sx={{ height:'100%', borderRadius:2, transition:'width 0.8s ease',
                  width:`${dispHealth*100}%`,
                  background:dispHealth>0.7?'#66bb6a':dispHealth>0.4?'#ffa726':'#ef5350' }}/>
              </Box>
            </Box>

            <Box sx={{ position:'absolute', bottom:12, left:'50%', transform:'translateX(-50%)', zIndex:10 }}>
              <Typography sx={{ fontSize:10, color:'rgba(255,255,255,0.28)', bgcolor:'rgba(0,0,0,0.4)',
                px:2, py:0.5, borderRadius:10, backdropFilter:'blur(6px)', letterSpacing:0.8 }}>
                drag to rotate · scroll to zoom
              </Typography>
            </Box>

            <Pond3D
              status={dispStatus}
              bsi={bsi}
              symptom={dispSymptom}
              shrimpCount={30}
              doLevel={wDo ?? 6}
              ammonia={wNH3 ?? 0.1}
              feedActive={false}
            />
          </Paper>

          {/* Behaviour + disease row */}
          <Paper sx={{ mt:1.2, p:1.5, borderRadius:3,
            background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)',
            display:'flex', gap:2, alignItems:'center' }}>
            <Box sx={{ fontSize:24 }}>
              {symptom==='lethargy'?'💤':symptom==='erratic swimming'?'🌀':symptom==='surface gasping'?'😮‍💨':symptom==='gill inflammation'?'🔴':'🦐'}
            </Box>
            <Box sx={{ flex:1 }}>
              <Typography sx={{ fontSize:12, fontWeight:700, color:'#fff' }}>
                {symptom?.charAt(0).toUpperCase()+symptom?.slice(1)}
              </Typography>
              <Typography sx={{ fontSize:11, color:'rgba(255,255,255,0.38)' }}>
                {shrimpCnt?.toLocaleString()} shrimps · Disease: <span style={{color:diseaseRaw.disease_detected?'#ef5350':'#66bb6a', fontWeight:600}}>
                  {diseaseRaw.disease_detected ? (diseaseRaw.disease_name??'Detected') : 'None detected'}
                </span>
              </Typography>
            </Box>
            <Box sx={{ textAlign:'right' }}>
              <Typography sx={{ fontSize:10, color:'rgba(255,255,255,0.32)' }}>Spread Risk</Typography>
              <Typography sx={{ fontSize:13, fontWeight:700,
                color:spreadRisk==='High'?'#ffa726':spreadRisk==='Critical'?'#ef5350':'#66bb6a' }}>
                {spreadRisk}
              </Typography>
            </Box>
            <Box sx={{ textAlign:'right' }}>
              <Typography sx={{ fontSize:10, color:'rgba(255,255,255,0.32)' }}>Risk Level</Typography>
              <Typography sx={{ fontSize:13, fontWeight:700, color:sColor(riskLvl==='High'?'Warning':riskLvl) }}>{riskLvl}</Typography>
            </Box>
          </Paper>
        </Grid>

        {/* RIGHT: tabs */}
        <Grid item xs={12} md={3}>
          <Paper sx={{ borderRadius:3, overflow:'hidden',
            background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)' }}>
            <Box sx={{ display:'flex', borderBottom:'1px solid rgba(255,255,255,0.07)' }}>
              {[['overview','Overview'],['forecast','Forecast'],['whatif','What-If']].map(([t,l])=>(
                <Box key={t} onClick={()=>setTab(t)} sx={tabSx(t)}>{l}</Box>
              ))}
            </Box>

            <Box sx={{ p:2, minHeight:500, maxHeight:700, overflowY:'auto' }}>

              {/* ── OVERVIEW ── */}
              {tab==='overview' && <>

                {/* When simulating: side-by-side current vs simulation */}
                {isSimulating ? (
                  <Box>
                    {/* Header row */}
                    <Box sx={{ display:'flex', alignItems:'center', justifyContent:'space-between', mb:1.5 }}>
                      <Typography sx={{ fontSize:12, fontWeight:700, color:'#fff' }}>
                        📊 {activeResult?.scenario_name ?? 'Simulation'}
                      </Typography>
                      <Button size="small" onClick={()=>{ setWiResult(null); setManualResult(null) }}
                        sx={{ fontSize:10, color:'rgba(255,255,255,0.4)', textTransform:'none', minWidth:0,
                          '&:hover':{ color:'#ef5350' } }}>✕ Clear</Button>
                    </Box>

                    {/* Side-by-side health donuts */}
                    <Box sx={{ display:'flex', gap:1, mb:1.5 }}>
                      {/* Current State */}
                      <Box sx={{ flex:1, p:1.2, borderRadius:2, textAlign:'center',
                        bgcolor:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.1)' }}>
                        <Typography sx={{ fontSize:9, fontWeight:700, color:'rgba(255,255,255,0.38)',
                          letterSpacing:1, textTransform:'uppercase', mb:1 }}>Current State</Typography>
                        <Box sx={{ position:'relative', display:'inline-flex', alignItems:'center',
                          justifyContent:'center', width:64, height:64, borderRadius:'50%',
                          background:`conic-gradient(${sColor(pondStatus)} ${healthScore*360}deg, rgba(255,255,255,0.07) 0deg)` }}>
                          <Box sx={{ width:50, height:50, borderRadius:'50%', bgcolor:'#071828',
                            display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
                            <Typography sx={{ fontSize:13, fontWeight:800, color:sColor(pondStatus), lineHeight:1 }}>
                              {fmt(healthScore*100,0)}%
                            </Typography>
                          </Box>
                        </Box>
                        <Typography sx={{ mt:0.6, fontSize:11, fontWeight:700, color:sColor(pondStatus) }}>{pondStatus}</Typography>
                        <Typography sx={{ fontSize:9, color:'rgba(255,255,255,0.3)' }}>{primaryConcern}</Typography>
                      </Box>

                      {/* Arrow */}
                      <Box sx={{ display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:0.5 }}>
                        <Typography sx={{ fontSize:18, color:'rgba(255,255,255,0.2)' }}>→</Typography>
                        <Chip label={
                          (activeResult?.delta?.health_score_change??0)>=0
                            ? `+${fmt((activeResult.delta.health_score_change)*100,1)}%`
                            : `${fmt((activeResult.delta.health_score_change)*100,1)}%`
                        } size="small" sx={{ height:18, fontSize:9, fontWeight:800,
                          bgcolor:(activeResult?.delta?.health_score_change??0)>=0?'rgba(102,187,106,0.2)':'rgba(239,83,80,0.2)',
                          color:(activeResult?.delta?.health_score_change??0)>=0?'#66bb6a':'#ef5350' }}/>
                      </Box>

                      {/* Simulated State */}
                      <Box sx={{ flex:1, p:1.2, borderRadius:2, textAlign:'center',
                        bgcolor:'rgba(79,195,247,0.06)', border:'1px solid rgba(79,195,247,0.25)' }}>
                        <Typography sx={{ fontSize:9, fontWeight:700, color:'#4fc3f7',
                          letterSpacing:1, textTransform:'uppercase', mb:1 }}>Simulated</Typography>
                        <Box sx={{ position:'relative', display:'inline-flex', alignItems:'center',
                          justifyContent:'center', width:64, height:64, borderRadius:'50%',
                          background:`conic-gradient(${sColor(dispStatus)} ${dispHealth*360}deg, rgba(255,255,255,0.07) 0deg)` }}>
                          <Box sx={{ width:50, height:50, borderRadius:'50%', bgcolor:'#071828',
                            display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
                            <Typography sx={{ fontSize:13, fontWeight:800, color:sColor(dispStatus), lineHeight:1 }}>
                              {fmt(dispHealth*100,0)}%
                            </Typography>
                          </Box>
                        </Box>
                        <Typography sx={{ mt:0.6, fontSize:11, fontWeight:700, color:sColor(dispStatus) }}>{dispStatus}</Typography>
                        <Typography sx={{ fontSize:9, color:'rgba(255,255,255,0.3)', textTransform:'capitalize' }}>
                          {activeResult?.delta?.status_change}
                        </Typography>
                      </Box>
                    </Box>

                    {/* Side-by-side flags */}
                    <Box sx={{ display:'flex', gap:1, mb:1.2 }}>
                      <Box sx={{ flex:1 }}>
                        <Typography sx={{ fontSize:9, fontWeight:700, color:'rgba(255,255,255,0.3)',
                          letterSpacing:1, mb:0.5 }}>CURRENT FLAGS</Typography>
                        {activeFlags.length>0
                          ? activeFlags.map(f=>(
                              <Chip key={f} label={f.replace(/_/g,' ')} size="small"
                                sx={{ fontSize:8, height:16, mb:0.4, mr:0.3, display:'block', maxWidth:'100%',
                                  bgcolor:'rgba(255,167,38,0.13)', color:'#ffa726' }}/>
                            ))
                          : <Typography sx={{ fontSize:9, color:'rgba(255,255,255,0.2)', fontStyle:'italic' }}>None</Typography>
                        }
                      </Box>
                      <Box sx={{ flex:1 }}>
                        <Typography sx={{ fontSize:9, fontWeight:700, color:'#4fc3f7',
                          letterSpacing:1, mb:0.5 }}>SIMULATED FLAGS</Typography>
                        {dispFlags.length>0
                          ? dispFlags.map(f=>(
                              <Chip key={f} label={f.replace(/_/g,' ')} size="small"
                                sx={{ fontSize:8, height:16, mb:0.4, mr:0.3, display:'block', maxWidth:'100%',
                                  bgcolor:'rgba(79,195,247,0.13)', color:'#4fc3f7' }}/>
                            ))
                          : <Typography sx={{ fontSize:9, color:'rgba(255,255,255,0.2)', fontStyle:'italic' }}>None</Typography>
                        }
                      </Box>
                    </Box>

                    {/* Resolved / new flags */}
                    {activeResult?.delta?.resolved_flags?.length>0 && (
                      <Box sx={{ mb:0.8 }}>
                        <Typography sx={{ fontSize:9, color:'#66bb6a', fontWeight:700, mb:0.4 }}>✅ Resolved by simulation</Typography>
                        <Box sx={{ display:'flex', flexWrap:'wrap', gap:0.3 }}>
                          {activeResult.delta.resolved_flags.map(f=>(
                            <Chip key={f} label={f.replace(/_/g,' ')} size="small" sx={{ fontSize:8, height:15,
                              bgcolor:'rgba(102,187,106,0.13)', color:'#66bb6a' }}/>
                          ))}
                        </Box>
                      </Box>
                    )}
                    {activeResult?.delta?.new_flags?.length>0 && (
                      <Box sx={{ mb:0.8 }}>
                        <Typography sx={{ fontSize:9, color:'#ef5350', fontWeight:700, mb:0.4 }}>🚨 New risks introduced</Typography>
                        <Box sx={{ display:'flex', flexWrap:'wrap', gap:0.3 }}>
                          {activeResult.delta.new_flags.map(f=>(
                            <Chip key={f} label={f.replace(/_/g,' ')} size="small" sx={{ fontSize:8, height:15,
                              bgcolor:'rgba(239,83,80,0.13)', color:'#ef5350' }}/>
                          ))}
                        </Box>
                      </Box>
                    )}

                    <Divider sx={{ borderColor:'rgba(255,255,255,0.07)', my:1.2 }}/>

                    {/* Side-by-side suggestions */}
                    <Box sx={{ display:'flex', gap:1, mb:1 }}>
                      <Typography sx={{ flex:1, fontSize:10, fontWeight:700,
                        color:'rgba(255,255,255,0.35)' }}>💡 CURRENT ({suggestions.length})</Typography>
                      <Typography sx={{ flex:1, fontSize:10, fontWeight:700,
                        color:'#4fc3f7' }}>🧪 SIMULATED ({dispSuggs.length})</Typography>
                    </Box>

                    <Box sx={{ display:'flex', gap:1 }}>
                      {/* Current suggestions */}
                      <Box sx={{ flex:1, display:'flex', flexDirection:'column', gap:0.8 }}>
                        {suggestions.map((s,i)=>(
                          <Box key={i} sx={{ p:1, borderRadius:1.5,
                            bgcolor:urgencyBg(s.urgency), border:`1px solid ${urgencyColor(s.urgency)}25` }}>
                            <Box sx={{ display:'flex', gap:0.5, mb:0.4, flexWrap:'wrap' }}>
                              <Chip label={s.urgency?.replace('_',' ')} size="small" sx={{ height:14, fontSize:8, fontWeight:700,
                                bgcolor:urgencyBg(s.urgency), color:urgencyColor(s.urgency) }}/>
                            </Box>
                            <Typography sx={{ fontSize:10, fontWeight:700, color:'#fff', lineHeight:1.3, mb:0.3 }}>
                              {categoryIcon(s.category)} {s.title}
                            </Typography>
                            <Typography sx={{ fontSize:9, color:'rgba(255,255,255,0.45)', lineHeight:1.4 }}>
                              {s.description?.substring(0,80)}…
                            </Typography>
                            {s.expected_impact && (
                              <Typography sx={{ fontSize:9, color:'#66bb6a', mt:0.3, fontStyle:'italic' }}>
                                💡 {s.expected_impact?.substring(0,50)}
                              </Typography>
                            )}
                          </Box>
                        ))}
                      </Box>

                      {/* Simulated suggestions */}
                      <Box sx={{ flex:1, display:'flex', flexDirection:'column', gap:0.8 }}>
                        {dispSuggs.map((s,i)=>(
                          <Box key={i} sx={{ p:1, borderRadius:1.5,
                            bgcolor:'rgba(79,195,247,0.05)', border:'1px solid rgba(79,195,247,0.2)' }}>
                            <Box sx={{ display:'flex', gap:0.5, mb:0.4, flexWrap:'wrap' }}>
                              <Chip label={s.urgency?.replace('_',' ')} size="small" sx={{ height:14, fontSize:8, fontWeight:700,
                                bgcolor:urgencyBg(s.urgency), color:urgencyColor(s.urgency) }}/>
                            </Box>
                            <Typography sx={{ fontSize:10, fontWeight:700, color:'#4fc3f7', lineHeight:1.3, mb:0.3 }}>
                              {categoryIcon(s.category)} {s.title}
                            </Typography>
                            <Typography sx={{ fontSize:9, color:'rgba(255,255,255,0.45)', lineHeight:1.4 }}>
                              {s.description?.substring(0,80)}…
                            </Typography>
                            {s.expected_impact && (
                              <Typography sx={{ fontSize:9, color:'#66bb6a', mt:0.3, fontStyle:'italic' }}>
                                💡 {s.expected_impact?.substring(0,50)}
                              </Typography>
                            )}
                          </Box>
                        ))}
                      </Box>
                    </Box>

                    {/* Simulation note */}
                    {wiNote && (
                      <Box sx={{ mt:1.2, p:1, borderRadius:1.5,
                        bgcolor:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)' }}>
                        <Typography sx={{ fontSize:9, fontWeight:700, color:'rgba(255,255,255,0.3)', mb:0.3 }}>
                          📝 SIMULATION NOTE
                        </Typography>
                        <Typography sx={{ fontSize:10, color:'rgba(255,255,255,0.5)', lineHeight:1.5 }}>
                          {wiNote}
                        </Typography>
                      </Box>
                    )}
                  </Box>

                ) : (
                  /* ── LIVE STATE (no simulation) ── */
                  <Box>
                    {/* Health donut */}
                    <Box sx={{ textAlign:'center', mb:2 }}>
                      <Box sx={{ position:'relative', display:'inline-flex', alignItems:'center', justifyContent:'center',
                        width:84, height:84, borderRadius:'50%',
                        background:`conic-gradient(${sColor(pondStatus)} ${healthScore*360}deg, rgba(255,255,255,0.07) 0deg)` }}>
                        <Box sx={{ width:66, height:66, borderRadius:'50%', bgcolor:'#071828',
                          display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
                          <Typography sx={{ fontSize:17, fontWeight:800, color:sColor(pondStatus), lineHeight:1 }}>
                            {fmt(healthScore*100,0)}%
                          </Typography>
                          <Typography sx={{ fontSize:8, color:'rgba(255,255,255,0.3)', letterSpacing:1 }}>HEALTH</Typography>
                        </Box>
                      </Box>
                      <Typography sx={{ mt:0.8, fontSize:13, fontWeight:700, color:sColor(pondStatus) }}>{pondStatus}</Typography>
                      <Typography sx={{ fontSize:10, color:'rgba(255,255,255,0.32)' }}>Primary concern: {primaryConcern}</Typography>
                    </Box>

                    {activeFlags.length>0 && (
                      <Box sx={{ mb:1.5 }}>
                        <Typography sx={{ fontSize:10, fontWeight:700, color:'#ffa726', mb:0.7 }}>⚠ ACTIVE FLAGS</Typography>
                        <Box sx={{ display:'flex', flexWrap:'wrap', gap:0.5 }}>
                          {activeFlags.map(f=>(
                            <Chip key={f} label={f.replace(/_/g,' ')} size="small" sx={{ fontSize:9, height:17,
                              bgcolor:'rgba(255,167,38,0.13)', color:'#ffa726' }}/>
                          ))}
                        </Box>
                      </Box>
                    )}

                    <Typography sx={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,0.35)', mb:0.8 }}>
                      💡 RECOMMENDATIONS ({suggestions.length})
                    </Typography>
                    {suggestions.map((s,i)=><SuggestionCard key={i} s={s} i={i}/>)}
                  </Box>
                )}
              </>}

              {/* ── FORECAST ── */}
              {tab==='forecast' && <>
                <Typography sx={{ fontSize:13, fontWeight:700, color:'#fff', mb:1.5 }}>6-Hour Water Forecast</Typography>
                {forecastData.length>0 ? <>
                  <Typography sx={{ fontSize:10, color:'rgba(255,255,255,0.38)', mb:0.5 }}>Temperature · DO · pH</Typography>
                  <ResponsiveContainer width="100%" height={140}>
                    <LineChart data={forecastData}>
                      <XAxis dataKey="time" tick={{ fontSize:10, fill:'rgba(255,255,255,0.38)' }} axisLine={false} tickLine={false}/>
                      <YAxis tick={{ fontSize:10, fill:'rgba(255,255,255,0.38)' }} axisLine={false} tickLine={false} width={26}/>
                      <Tooltip contentStyle={{ background:'#0d1f33', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8, fontSize:11 }}/>
                      <Line type="monotone" dataKey="Temp" stroke="#ff7043" strokeWidth={2} dot={false} name="Temp °C"/>
                      <Line type="monotone" dataKey="DO"   stroke="#4fc3f7" strokeWidth={2} dot={false} name="DO mg/L"/>
                      <Line type="monotone" dataKey="pH"   stroke="#ab47bc" strokeWidth={2} dot={false} name="pH"/>
                    </LineChart>
                  </ResponsiveContainer>

                  <Typography sx={{ fontSize:10, color:'rgba(255,255,255,0.38)', mt:1.5, mb:0.5 }}>Ammonia · Water Quality Score</Typography>
                  <ResponsiveContainer width="100%" height={110}>
                    <AreaChart data={forecastData}>
                      <defs>
                        <linearGradient id="nh3g" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#ffca28" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#ffca28" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="wqsg" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#66bb6a" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#66bb6a" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="time" tick={{ fontSize:10, fill:'rgba(255,255,255,0.38)' }} axisLine={false} tickLine={false}/>
                      <YAxis tick={{ fontSize:10, fill:'rgba(255,255,255,0.38)' }} axisLine={false} tickLine={false} width={26}/>
                      <Tooltip contentStyle={{ background:'#0d1f33', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8, fontSize:11 }}/>
                      <ReferenceLine y={0.3} stroke="#ffca28" strokeDasharray="4 2" strokeOpacity={0.5}/>
                      <Area type="monotone" dataKey="NH3" stroke="#ffca28" fill="url(#nh3g)" strokeWidth={2} dot={false} name="NH3 mg/L"/>
                      <Area type="monotone" dataKey="WQS" stroke="#66bb6a" fill="url(#wqsg)" strokeWidth={2} dot={false} name="WQ Score"/>
                    </AreaChart>
                  </ResponsiveContainer>

                  <Typography sx={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,0.35)', mt:1.5, mb:0.8 }}>Hourly Detail</Typography>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        {['Hr','Temp','DO','pH','NH₃','Sal','WQS'].map(h=>(
                          <TableCell key={h} sx={{ color:'rgba(255,255,255,0.32)', fontSize:9, p:'4px 6px',
                            borderBottom:'1px solid rgba(255,255,255,0.07)' }}>{h}</TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {forecastData.map((r,i)=>(
                        <TableRow key={i}>
                          <TableCell sx={{ color:'#4fc3f7',  fontSize:10, p:'4px 6px', borderBottom:'1px solid rgba(255,255,255,0.04)' }}>{r.time}</TableCell>
                          <TableCell sx={{ color:'#ff7043',  fontSize:10, p:'4px 6px', borderBottom:'1px solid rgba(255,255,255,0.04)' }}>{r.Temp}</TableCell>
                          <TableCell sx={{ color:'#4fc3f7',  fontSize:10, p:'4px 6px', borderBottom:'1px solid rgba(255,255,255,0.04)' }}>{r.DO}</TableCell>
                          <TableCell sx={{ color:'#ab47bc',  fontSize:10, p:'4px 6px', borderBottom:'1px solid rgba(255,255,255,0.04)' }}>{r.pH}</TableCell>
                          <TableCell sx={{ color:'#ffca28',  fontSize:10, p:'4px 6px', borderBottom:'1px solid rgba(255,255,255,0.04)',
                            fontWeight: r.NH3>0.3?700:400,
                            background: r.NH3>0.3?'rgba(255,202,40,0.1)':'transparent' }}>{r.NH3}</TableCell>
                          <TableCell sx={{ color:'#5c6bc0',  fontSize:10, p:'4px 6px', borderBottom:'1px solid rgba(255,255,255,0.04)' }}>{r.Sal}</TableCell>
                          <TableCell sx={{ color:'#66bb6a',  fontSize:10, p:'4px 6px', borderBottom:'1px solid rgba(255,255,255,0.04)' }}>{r.WQS}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </> : (
                  <Box sx={{ textAlign:'center', mt:6 }}>
                    <Typography sx={{ fontSize:26, mb:1 }}>📈</Typography>
                    <Typography sx={{ color:'rgba(255,255,255,0.28)', fontSize:12 }}>No forecast data</Typography>
                  </Box>
                )}
              </>}

              {/* ── WHAT-IF ── */}
              {tab==='whatif' && <>
                {!wiResult ? <>
                  {/* ── INPUT FORM ── */}
                  <Typography sx={{ fontSize:13, fontWeight:700, color:'#fff', mb:0.4 }}>🧪 What-If Simulation</Typography>
                  <Typography sx={{ fontSize:11, color:'rgba(255,255,255,0.32)', mb:1.2 }}>
                    All fields optional · Pond updates on Run
                  </Typography>
                  <TextField label="Scenario Name" fullWidth size="small" value={wiName}
                    onChange={e=>setWiName(e.target.value)}
                    sx={{ mb:1.2, '& .MuiInputBase-root':{ fontSize:12 } }}/>
                  <NumericSliders vals={wi} setVal={setWiVal}/>
                  <AdvancedParams  vals={wi} setVal={setWiVal}/>
                  <Button variant="contained" fullWidth onClick={handleWhatIf} disabled={wiLoading}
                    sx={{ mt:1, height:40, borderRadius:2, fontWeight:700,
                      background:'linear-gradient(90deg,#0288d1,#4fc3f7)',
                      '&:hover':{ background:'linear-gradient(90deg,#0277bd,#039be5)' } }}>
                    {wiLoading ? <CircularProgress size={17} sx={{color:'#fff'}}/> : '▶ Run Scenario'}
                  </Button>
                </> : <>
                  {/* ── RESULTS ── */}
                  <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'center', mb:1.5 }}>
                    <Typography sx={{ fontSize:13, fontWeight:700, color:'#fff' }}>
                      📊 {wiResult.scenario_name}
                    </Typography>
                    <Button size="small" onClick={()=>setWiResult(null)}
                      sx={{ fontSize:10, color:'#4fc3f7', textTransform:'none', minWidth:0 }}>
                      ← New Scenario
                    </Button>
                  </Box>

                  {/* Health before → after */}
                  <Box sx={{ display:'flex', gap:1, mb:1.5 }}>
                    {[
                      { l:'Before', s:wiResult.current?.pond_status, h:(wiResult.current?.composite_health_score??0)*100 },
                      { l:'After',  s:dispStatus,                    h:dispHealth*100 },
                    ].map(({l,s,h})=>(
                      <Box key={l} sx={{ flex:1, p:1.2, borderRadius:2, textAlign:'center',
                        bgcolor:'rgba(255,255,255,0.04)', border:`1px solid ${sColor(s)}22` }}>
                        <Typography sx={{ fontSize:9, color:'rgba(255,255,255,0.35)', mb:0.3 }}>{l}</Typography>
                        <Typography sx={{ fontSize:14, fontWeight:800, color:sColor(s) }}>{s}</Typography>
                        <Typography sx={{ fontSize:11, color:'rgba(255,255,255,0.45)' }}>{fmt(h,0)}%</Typography>
                      </Box>
                    ))}
                    <Box sx={{ flex:1, p:1.2, borderRadius:2, textAlign:'center',
                      bgcolor:(wiDelta?.health_score_change??0)>=0?'rgba(102,187,106,0.08)':'rgba(239,83,80,0.08)',
                      border:`1px solid ${(wiDelta?.health_score_change??0)>=0?'#66bb6a33':'#ef535033'}` }}>
                      <Typography sx={{ fontSize:9, color:'rgba(255,255,255,0.35)', mb:0.3 }}>Δ Health</Typography>
                      <Typography sx={{ fontSize:14, fontWeight:800,
                        color:(wiDelta?.health_score_change??0)>=0?'#66bb6a':'#ef5350' }}>
                        {(wiDelta?.health_score_change??0)>=0?'+':''}{fmt((wiDelta?.health_score_change??0)*100,1)}%
                      </Typography>
                      <Typography sx={{ fontSize:9, color:'rgba(255,255,255,0.4)', textTransform:'capitalize' }}>
                        {wiDelta?.status_change}
                      </Typography>
                    </Box>
                  </Box>

                  {/* Simulation note */}
                  {wiNote && (
                    <Box sx={{ mb:1.5, p:1.2, borderRadius:2,
                      bgcolor:'rgba(79,195,247,0.06)', border:'1px solid rgba(79,195,247,0.2)' }}>
                      <Typography sx={{ fontSize:10, color:'rgba(255,255,255,0.35)', mb:0.3 }}>📝 Simulation Summary</Typography>
                      <Typography sx={{ fontSize:11, color:'rgba(255,255,255,0.7)', lineHeight:1.5 }}>{wiNote}</Typography>
                    </Box>
                  )}

                  {/* Top action from simulated farmer_summary */}
                  {dispFarmerSum?.immediate_action_required && dispFarmerSum?.top_action && (
                    <Box sx={{ mb:1.5, p:1.2, borderRadius:2,
                      bgcolor:'rgba(239,83,80,0.08)', border:'1px solid rgba(239,83,80,0.3)' }}>
                      <Typography sx={{ fontSize:10, fontWeight:700, color:'#ef5350', mb:0.3 }}>🚨 Immediate Action</Typography>
                      <Typography sx={{ fontSize:11, color:'rgba(255,255,255,0.75)', lineHeight:1.4 }}>{dispFarmerSum.top_action}</Typography>
                    </Box>
                  )}

                  {/* Parameter changes table */}
                  {wiParamChanges.length>0 && (
                    <Box sx={{ mb:1.5 }}>
                      <Typography sx={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,0.35)', mb:0.8 }}>
                        PARAMETER CHANGES
                      </Typography>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            {['Param','Before','After','Impact'].map(h=>(
                              <TableCell key={h} sx={{ color:'rgba(255,255,255,0.3)', fontSize:9, p:'4px 6px',
                                borderBottom:'1px solid rgba(255,255,255,0.07)' }}>{h}</TableCell>
                            ))}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {wiParamChanges.map((pc,i)=>(
                            <TableRow key={i}>
                              <TableCell sx={{ color:'rgba(255,255,255,0.7)', fontSize:10, fontWeight:600, p:'4px 6px',
                                borderBottom:'1px solid rgba(255,255,255,0.04)', textTransform:'capitalize' }}>
                                {pc.parameter}
                              </TableCell>
                              <TableCell sx={{ color:'rgba(255,255,255,0.45)', fontSize:10, p:'4px 6px',
                                borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
                                {fmt(pc.before,2)}
                              </TableCell>
                              <TableCell sx={{ color:'#4fc3f7', fontSize:10, fontWeight:600, p:'4px 6px',
                                borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
                                {fmt(pc.after,2)}
                              </TableCell>
                              <TableCell sx={{ p:'4px 6px', borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
                                <Chip label={pc.impact} size="small" sx={{ height:15, fontSize:8, fontWeight:700,
                                  bgcolor:pc.impact==='negative'?'rgba(239,83,80,0.15)':pc.impact==='positive'?'rgba(102,187,106,0.15)':'rgba(255,255,255,0.07)',
                                  color:pc.impact==='negative'?'#ef5350':pc.impact==='positive'?'#66bb6a':'rgba(255,255,255,0.5)' }}/>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </Box>
                  )}

                  {/* Resolved / new flags */}
                  {wiDelta?.resolved_flags?.length>0 && (
                    <Box sx={{ mb:1 }}>
                      <Typography sx={{ fontSize:10, color:'#66bb6a', fontWeight:700, mb:0.5 }}>✅ Resolved Flags</Typography>
                      <Box sx={{ display:'flex', flexWrap:'wrap', gap:0.4 }}>
                        {wiDelta.resolved_flags.map(f=>(
                          <Chip key={f} label={f.replace(/_/g,' ')} size="small" sx={{ fontSize:8, height:17,
                            bgcolor:'rgba(102,187,106,0.13)', color:'#66bb6a' }}/>
                        ))}
                      </Box>
                    </Box>
                  )}
                  {wiDelta?.new_flags?.length>0 && (
                    <Box sx={{ mb:1.5 }}>
                      <Typography sx={{ fontSize:10, color:'#ef5350', fontWeight:700, mb:0.5 }}>🚨 New Risks</Typography>
                      <Box sx={{ display:'flex', flexWrap:'wrap', gap:0.4 }}>
                        {wiDelta.new_flags.map(f=>(
                          <Chip key={f} label={f.replace(/_/g,' ')} size="small" sx={{ fontSize:8, height:17,
                            bgcolor:'rgba(239,83,80,0.13)', color:'#ef5350' }}/>
                        ))}
                      </Box>
                    </Box>
                  )}

                  <Divider sx={{ borderColor:'rgba(255,255,255,0.07)', mb:1.5 }}/>

                  {/* Simulated shrimp status */}
                  {dispFarmerSum?.shrimp_status && (
                    <Box sx={{ mb:1.2, p:1, borderRadius:1.5, bgcolor:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)' }}>
                      <Typography sx={{ fontSize:9, color:'rgba(255,255,255,0.35)', mb:0.2 }}>🦐 Shrimp Status (Simulated)</Typography>
                      <Typography sx={{ fontSize:11, color:'rgba(255,255,255,0.7)', lineHeight:1.4 }}>{dispFarmerSum.shrimp_status}</Typography>
                    </Box>
                  )}
                  {dispFarmerSum?.feed_adjustment_reason && (
                    <Box sx={{ mb:1.2, p:1, borderRadius:1.5, bgcolor:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)' }}>
                      <Typography sx={{ fontSize:9, color:'rgba(255,255,255,0.35)', mb:0.2 }}>🍤 Feed Adjustment (Simulated)</Typography>
                      <Typography sx={{ fontSize:11, color:'rgba(255,255,255,0.7)', lineHeight:1.4 }}>{dispFarmerSum.feed_adjustment_reason}</Typography>
                    </Box>
                  )}

                  {/* Suggestions from what-if */}
                  <Typography sx={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,0.35)', mb:0.8 }}>
                    💡 RECOMMENDATIONS ({dispSuggs.length})
                  </Typography>
                  {dispSuggs.map((s,i)=><SuggestionCard key={i} s={s} i={i}/>)}

                  <Button variant="outlined" fullWidth onClick={()=>setWiResult(null)}
                    sx={{ mt:1.5, borderRadius:2, fontSize:12, borderColor:'rgba(79,195,247,0.3)', color:'#4fc3f7' }}>
                    ← Run Another Scenario
                  </Button>
                </>}
              </>}
            </Box>
          </Paper>
        </Grid>

        {/* BOTTOM LEFT: Real-Time Alerts */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p:2, borderRadius:3, background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)' }}>
            <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'center', mb:1.5 }}>
              <Typography sx={{ fontSize:13, fontWeight:700, color:'#fff' }}>🔔 Real-Time Alerts</Typography>
              <Chip label={`${activeFlags.length} active`} size="small" sx={{ height:18, fontSize:9,
                bgcolor:activeFlags.length>0?'rgba(239,83,80,0.15)':'rgba(102,187,106,0.15)',
                color:activeFlags.length>0?'#ef5350':'#66bb6a' }}/>
            </Box>
            {activeFlags.length>0 ? activeFlags.map((f,i)=>(
              <Box key={f} sx={{ display:'flex', alignItems:'flex-start', gap:1.5, mb:1, p:1.2, borderRadius:2,
                bgcolor:i===0?'rgba(239,83,80,0.07)':'rgba(255,167,38,0.07)',
                border:`1px solid ${i===0?'#ef535028':'#ffa72628'}` }}>
                <Typography sx={{ fontSize:13 }}>{i===0?'🔴':'⚠️'}</Typography>
                <Box sx={{ flex:1 }}>
                  <Typography sx={{ fontSize:11, fontWeight:700, color:i===0?'#ef5350':'#ffa726' }}>
                    {i===0?'Critical':'Warning'}
                  </Typography>
                  <Typography sx={{ fontSize:11, color:'rgba(255,255,255,0.55)', lineHeight:1.4 }}>
                    {f.replace(/_/g,' ')}
                  </Typography>
                </Box>
                <Chip label="Live" size="small" sx={{ height:15, fontSize:8, bgcolor:'rgba(79,195,247,0.1)', color:'#4fc3f7' }}/>
              </Box>
            )) : (
              <Box sx={{ textAlign:'center', py:3 }}>
                <Typography sx={{ fontSize:22 }}>✅</Typography>
                <Typography sx={{ fontSize:12, color:'rgba(255,255,255,0.28)', mt:0.5 }}>No active alerts</Typography>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* BOTTOM RIGHT: 4-Day Feed Forecast */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p:2, borderRadius:3, background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)' }}>
            <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'center', mb:1.5 }}>
              <Typography sx={{ fontSize:13, fontWeight:700, color:'#fff' }}>📅 4-Day Feed Forecast</Typography>
              <Chip label={`Mortality: ${fmt(mortality*100,1)}%`} size="small" sx={{ height:18, fontSize:9, fontWeight:700,
                bgcolor:mortality>0.7?'rgba(239,83,80,0.15)':mortality>0.4?'rgba(255,167,38,0.15)':'rgba(102,187,106,0.15)',
                color:mortality>0.7?'#ef5350':mortality>0.4?'#ffa726':'#66bb6a' }}/>
            </Box>
            {(feed.four_day_forecast??[]).length>0 ? (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {['Day','Feed (kg)','Growth (g)','Mortality Risk',''].map(h=>(
                      <TableCell key={h} sx={{ color:'rgba(255,255,255,0.32)', fontSize:10,
                        borderBottom:'1px solid rgba(255,255,255,0.07)', p:0.8 }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {feed.four_day_forecast.map((d,i)=>(
                    <TableRow key={i} sx={{ '&:hover':{ bgcolor:'rgba(255,255,255,0.02)' } }}>
                      <TableCell sx={{ color:'rgba(255,255,255,0.8)', fontSize:12, p:0.8, fontWeight:600,
                        borderBottom:'1px solid rgba(255,255,255,0.04)' }}>Day {d.day}</TableCell>
                      <TableCell sx={{ color:'#66bb6a', fontSize:12, p:0.8, fontWeight:700,
                        borderBottom:'1px solid rgba(255,255,255,0.04)' }}>{fmt(d.feed_kg,1)}</TableCell>
                      <TableCell sx={{ color:'#4fc3f7', fontSize:12, p:0.8,
                        borderBottom:'1px solid rgba(255,255,255,0.04)' }}>{fmt(d.expected_growth_g,2)}</TableCell>
                      <TableCell sx={{ p:0.8, borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
                        <Chip label={`${fmt(d.mortality_risk*100,1)}%`} size="small" sx={{ height:18, fontSize:9, fontWeight:700,
                          bgcolor:d.mortality_risk>0.7?'rgba(239,83,80,0.18)':d.mortality_risk>0.4?'rgba(255,167,38,0.18)':'rgba(102,187,106,0.18)',
                          color:d.mortality_risk>0.7?'#ef5350':d.mortality_risk>0.4?'#ffa726':'#66bb6a' }}/>
                      </TableCell>
                      <TableCell sx={{ p:0.8, borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
                        {d.mortality_risk>0.8 && <Typography sx={{ fontSize:10, color:'#ef5350' }}>⚠ High risk</Typography>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <Typography sx={{ color:'rgba(255,255,255,0.28)', fontSize:12, textAlign:'center', py:3 }}>
                No forecast data
              </Typography>
            )}
          </Paper>
        </Grid>

      </Grid>
    </Box>
  )
}