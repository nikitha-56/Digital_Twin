import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import TextField from '@mui/material/TextField'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import InputLabel from '@mui/material/InputLabel'
import FormControl from '@mui/material/FormControl'
import CircularProgress from '@mui/material/CircularProgress'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Grid from '@mui/material/Grid'
import { fetchPonds, createPond } from '../services/api'
import API from '../services/api'

// ── API helpers for update/delete (add to api.js later) ──────────────────────
const updatePond = (id, data) => API.put(`/api/v1/pond/${id}`, data).then(r => r.data)
const deletePond = (id)       => API.delete(`/api/v1/pond/${id}`).then(r => r.data)

const EMPTY_FORM = {
  pond_name: '', water_body: '', water_type: '', pond_type: '',
  city: '', pond_shape: '', pond_area: '', pond_area_unit: 'm²',
  pond_depth: '', pond_depth_unit: 'm', pond_length: '', pond_width: '', pond_radius: '',
  temperature: '', ph: '', oxygen: '', salinity: '', nh3: '', nitrate: '', turbidity: '',
  humidity: '', tds: '', orp: '',
  shrimp_type: '', shrimp_stage: '', shrimp_size: '', stocking_density: '',
  prawns_per_acre: '', avg_weight_g: '', seed_source: '',
  feed_type: '', soil_type: '', pond_ownership: '',
  latitude: '', longitude: '',
}

const statusColor = '#66bb6a'
const cell = { color: 'rgba(255,255,255,0.7)', fontSize: 11, p: '6px 8px', borderBottom: '1px solid rgba(255,255,255,0.05)' }
const hcell = { color: 'rgba(255,255,255,0.35)', fontSize: 10, fontWeight: 700, p: '6px 8px', borderBottom: '1px solid rgba(255,255,255,0.1)', textTransform: 'uppercase', letterSpacing: 0.8 }

const shapeIcon = s => s === 'circular' || s === 'circle' ? '⭕' : s === 'irregular' ? '〰️' : '▭'

const volume = p => {
  const a = parseFloat(p.pond_area), d = parseFloat(p.pond_depth)
  if (!a || !d) return '—'
  return (a * d).toFixed(1)
}

const Field = ({ label, value, color = '#fff' }) => (
  <Box sx={{ mb: 1.5 }}>
    <Typography sx={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8 }}>{label}</Typography>
    <Typography sx={{ fontSize: 13, fontWeight: 600, color: value && value !== '—' ? color : 'rgba(255,255,255,0.2)' }}>
      {value || '—'}
    </Typography>
  </Box>
)

export default function PondManagement() {
  const navigate = useNavigate()
  const [ponds,    setPonds]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [selected, setSelected] = useState(null)
  const [detailTab, setDetailTab] = useState(0)

  // Dialog
  const [open,    setOpen]    = useState(false)
  const [isEdit,  setIsEdit]  = useState(false)
  const [form,    setForm]    = useState(EMPTY_FORM)
  const [formTab, setFormTab] = useState(0)
  const [saving,  setSaving]  = useState(false)
  const [errors,  setErrors]  = useState({})

  // Delete confirm
  const [delOpen,   setDelOpen]   = useState(false)
  const [delTarget, setDelTarget] = useState(null)
  const [deleting,  setDeleting]  = useState(false)

  const [snack, setSnack] = useState({ open: false, msg: '', severity: 'success' })
  const toast = (msg, severity = 'success') => setSnack({ open: true, msg, severity })

  // ── Load ──────────────────────────────────────────────────────────────────
  const load = async () => {
    setLoading(true)
    try {
      const data = await fetchPonds()
      // Sort by created_at — matches backend's 1-based sequential index
      const sorted = [...(data||[])].sort((a,b) => new Date(a.created_at) - new Date(b.created_at))
      setPonds(sorted)
      if (sorted.length > 0) setSelected(s => s ? (sorted.find(p => p.id === s.id) ?? sorted[0]) : sorted[0])
      return sorted
    } catch { toast('Failed to load ponds', 'error') }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  // ── Validate ──────────────────────────────────────────────────────────────
  const validate = () => {
    const e = {}
    if (!form.pond_name?.trim()) e.pond_name = 'Required'
    setErrors(e)
    return !Object.keys(e).length
  }

  const setF = (k, v) => { setForm(p => ({ ...p, [k]: v })); setErrors(p => ({ ...p, [k]: '' })) }
  const num = v => v === '' ? null : parseFloat(v)
  const str = v => v?.trim() || null

  const buildPayload = () => ({
    pond_name:       str(form.pond_name),
    water_body:      str(form.water_body),
    water_type:      str(form.water_type),
    pond_type:       str(form.pond_type),
    city:            str(form.city),
    pond_shape:      str(form.pond_shape),
    pond_area:       num(form.pond_area),
    pond_area_unit:  str(form.pond_area_unit),
    pond_depth:      num(form.pond_depth),
    pond_depth_unit: str(form.pond_depth_unit),
    pond_length:     num(form.pond_length),
    pond_width:      num(form.pond_width),
    pond_radius:     num(form.pond_radius),
    temperature:     num(form.temperature),
    ph:              num(form.ph),
    oxygen:          num(form.oxygen),
    salinity:        num(form.salinity),
    nh3:             num(form.nh3),
    nitrate:         num(form.nitrate),
    turbidity:       num(form.turbidity),
    humidity:        num(form.humidity),
    tds:             num(form.tds),
    orp:             num(form.orp),
    shrimp_type:     str(form.shrimp_type),
    shrimp_stage:    str(form.shrimp_stage),
    shrimp_size:     num(form.shrimp_size),
    stocking_density:form.stocking_density ? parseInt(form.stocking_density) : null,
    prawns_per_acre: form.prawns_per_acre ? parseInt(form.prawns_per_acre) : null,
    avg_weight_g:    num(form.avg_weight_g),
    seed_source:     str(form.seed_source),
    feed_type:       str(form.feed_type),
    soil_type:       str(form.soil_type),
    pond_ownership:  str(form.pond_ownership),
    latitude:        num(form.latitude),
    longitude:       num(form.longitude),
  })

  // ── Save (add or edit) ────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!validate()) return
    setSaving(true)
    try {
      const payload = buildPayload()
      if (isEdit) {
        await updatePond(form.id, payload)
        toast(`"${form.pond_name}" updated!`)
      } else {
        await createPond(payload)
        toast(`"${form.pond_name}" created!`)
      }
      setOpen(false)
      await load()
    } catch (e) {
      console.error('Save error:', e?.response?.data ?? e?.message ?? e)
      const detail = e?.response?.data?.detail
      const msg = Array.isArray(detail)
        ? detail.map(d => `${d.loc?.slice(-1)[0]}: ${d.msg}`).join(', ')
        : detail ?? e?.message ?? 'Save failed'
      toast(msg, 'error')
    } finally { setSaving(false) }
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    setDeleting(true)
    try {
      await deletePond(delTarget.id)
      toast(`"${delTarget.pond_name}" deleted`)
      setDelOpen(false)
      if (selected?.id === delTarget.id) setSelected(null)
      await load()
    } catch (e) {
      toast(e?.response?.data?.detail ?? 'Delete failed', 'error')
    } finally { setDeleting(false) }
  }

  const openAdd = () => {
    setIsEdit(false); setForm(EMPTY_FORM); setErrors({}); setFormTab(0); setOpen(true)
  }
  const openEdit = (p) => {
    setIsEdit(true)
    setForm(Object.fromEntries(Object.keys(EMPTY_FORM).map(k => [k, p[k] ?? ''])))
    setForm(f => ({ ...f, id: p.id }))
    setErrors({}); setFormTab(0); setOpen(true)
  }
  const confirmDelete = (p) => { setDelTarget(p); setDelOpen(true) }

  // ── INPUT component ───────────────────────────────────────────────────────
  const TF = ({ label, fkey, type = 'text', half = false }) => (
    <TextField label={label} type={type} size="small" fullWidth
      value={form[fkey] ?? ''} onChange={e => setF(fkey, e.target.value)}
      error={!!errors[fkey]} helperText={errors[fkey]}
      inputProps={type === 'number' ? { step: 'any' } : {}}
      sx={{ mb: 1.5, ...(half ? { width: 'calc(50% - 6px)' } : {}) }} />
  )

  const SEL = ({ label, fkey, options }) => (
    <FormControl size="small" fullWidth sx={{ mb: 1.5 }}>
      <InputLabel>{label}</InputLabel>
      <Select value={form[fkey] ?? ''} label={label} onChange={e => setF(fkey, e.target.value)}>
        <MenuItem value=""><em>None</em></MenuItem>
        {options.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
      </Select>
    </FormControl>
  )

  return (
    <Box sx={{ p: { xs: 1.5, md: 2.5 }, minHeight: '100vh',
      background: 'linear-gradient(160deg,#050e1a 0%,#071828 60%,#051520 100%)' }}>

      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
        <Box>
          <Typography sx={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>🐟 Pond Management</Typography>
          <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
            {ponds.length} pond{ponds.length !== 1 ? 's' : ''} registered
          </Typography>
        </Box>
        <Button variant="contained" onClick={openAdd}
          sx={{ borderRadius: 2, fontWeight: 700, background: 'linear-gradient(90deg,#0288d1,#4fc3f7)' }}>
          + Add Pond
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress sx={{ color: '#4fc3f7' }} /></Box>
      ) : ponds.length === 0 ? (
        <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 3,
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <Typography sx={{ fontSize: 40 }}>🌊</Typography>
          <Typography sx={{ fontSize: 15, fontWeight: 600, color: '#fff', mt: 1 }}>No ponds yet</Typography>
          <Button variant="contained" onClick={openAdd} sx={{ mt: 2, borderRadius: 2, fontWeight: 700,
            background: 'linear-gradient(90deg,#0288d1,#4fc3f7)' }}>+ Add First Pond</Button>
        </Paper>
      ) : (
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', flexWrap: { xs: 'wrap', md: 'nowrap' } }}>

          {/* ── Sidebar list ── */}
          <Box sx={{ width: { xs: '100%', md: 280 }, flexShrink: 0 }}>
            {ponds.map(p => (
              <Paper key={p.id} onClick={() => setSelected(p)}
                sx={{ p: 1.5, mb: 1, borderRadius: 2, cursor: 'pointer',
                  background: selected?.id === p.id
                    ? 'linear-gradient(135deg,rgba(79,195,247,0.14),rgba(79,195,247,0.05))'
                    : 'rgba(255,255,255,0.03)',
                  border: selected?.id === p.id ? '1px solid rgba(79,195,247,0.4)' : '1px solid rgba(255,255,255,0.07)',
                  transition: 'all 0.18s',
                  '&:hover': { border: '1px solid rgba(79,195,247,0.22)' } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                  <Box sx={{ width: 36, height: 36, borderRadius: p.pond_shape === 'circular' ? '50%' : 1.5,
                    bgcolor: 'rgba(79,195,247,0.1)', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>🌊</Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display:'flex', alignItems:'center', gap:0.7 }}>
                      <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#fff',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.pond_name ?? '(unnamed)'}
                      </Typography>
                      <Box sx={{ px:0.6, py:0.1, borderRadius:1, flexShrink:0,
                        bgcolor:'rgba(79,195,247,0.15)', border:'1px solid rgba(79,195,247,0.25)' }}>
                        <Typography sx={{ fontSize:9, fontWeight:700, color:'#4fc3f7' }}>
                          #{ponds.indexOf(p)+1}
                        </Typography>
                      </Box>
                    </Box>
                    <Typography sx={{ fontSize: 10, color: 'rgba(255,255,255,0.38)' }}>
                      {shapeIcon(p.pond_shape)} {p.pond_shape ?? '—'} · {p.pond_area ?? '—'} m²
                    </Typography>
                  </Box>
                  <Chip label="Active" size="small" sx={{ height: 17, fontSize: 9, fontWeight: 700,
                    bgcolor: 'rgba(102,187,106,0.15)', color: '#66bb6a' }} />
                </Box>
              </Paper>
            ))}
          </Box>

          {/* ── Detail panel ── */}
          {selected && (
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Paper sx={{ borderRadius: 3, overflow: 'hidden',
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>

                {/* Detail header */}
                <Box sx={{ p: 2, borderBottom: '1px solid rgba(255,255,255,0.07)',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box>
                    <Typography sx={{ fontSize: 17, fontWeight: 700, color: '#fff' }}>
                      {selected.pond_name ?? '(unnamed)'}
                    </Typography>
                    <Typography sx={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>
                      Digital Twin #{ponds.findIndex(p=>p.id===selected?.id)+1} · Created {new Date(selected.created_at).toLocaleDateString()}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button size="small" variant="outlined" onClick={() => openEdit(selected)}
                      sx={{ borderRadius: 2, fontSize: 12, borderColor: 'rgba(79,195,247,0.4)', color: '#4fc3f7',
                        '&:hover': { borderColor: '#4fc3f7', bgcolor: 'rgba(79,195,247,0.08)' } }}>
                      ✏️ Edit
                    </Button>
                    <Button size="small" variant="outlined" onClick={() => confirmDelete(selected)}
                      sx={{ borderRadius: 2, fontSize: 12, borderColor: 'rgba(239,83,80,0.4)', color: '#ef5350',
                        '&:hover': { borderColor: '#ef5350', bgcolor: 'rgba(239,83,80,0.08)' } }}>
                      🗑 Delete
                    </Button>
                  </Box>
                </Box>

                {/* View Digital Twin Button */}
                <Box sx={{ px:2, pt:1.5, pb:0.5 }}>
                  <Button
                    variant="contained" fullWidth
                    onClick={() => navigate(`/digital-twin/${ponds.findIndex(p=>p.id===selected?.id)+1 || 1}`)}
                    sx={{ height:42, borderRadius:2, fontWeight:700, fontSize:12, letterSpacing:0.5,
                      background:'linear-gradient(90deg,#0277bd,#4fc3f7)',
                      '&:hover':{ background:'linear-gradient(90deg,#01579b,#039be5)',
                        boxShadow:'0 4px 20px rgba(79,195,247,0.35)' },
                      boxShadow:'0 2px 12px rgba(79,195,247,0.2)' }}>
                    🌊 &nbsp; View Digital Twin & Analysis
                  </Button>
                </Box>

                {/* Quick stats */}
                <Box sx={{ display: 'flex', gap: 1.2, p: 2, flexWrap: 'wrap', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  {[
                    { l: 'Shape',  v: selected.pond_shape ?? '—', icon: shapeIcon(selected.pond_shape), c: '#4fc3f7' },
                    { l: 'Area',   v: selected.pond_area ? `${selected.pond_area} ${selected.pond_area_unit ?? 'm²'}` : '—', icon: '📐', c: '#ab47bc' },
                    { l: 'Depth',  v: selected.pond_depth ? `${selected.pond_depth} ${selected.pond_depth_unit ?? 'm'}` : '—', icon: '📏', c: '#ff7043' },
                    { l: 'Volume', v: volume(selected) !== '—' ? `${volume(selected)} m³` : '—', icon: '🪣', c: '#66bb6a' },
                    { l: 'City',   v: selected.city ?? '—', icon: '📍', c: '#ffca28' },
                    { l: 'Temp',   v: selected.temperature ? `${selected.temperature}°C` : '—', icon: '🌡️', c: '#ff7043' },
                  ].map(({ l, v, icon, c }) => (
                    <Paper key={l} sx={{ p: 1.5, flex: '1 1 100px', borderRadius: 2,
                      background: `radial-gradient(ellipse at top left,${c}10 0%,transparent 70%)`,
                      border: '1px solid rgba(255,255,255,0.07)' }}>
                      <Typography sx={{ fontSize: 16 }}>{icon}</Typography>
                      <Typography sx={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>{l}</Typography>
                      <Typography sx={{ fontSize: 13, fontWeight: 700, color: v === '—' ? 'rgba(255,255,255,0.2)' : c }}>{v}</Typography>
                    </Paper>
                  ))}
                </Box>

                {/* Detail tabs */}
                <Tabs value={detailTab} onChange={(_, v) => setDetailTab(v)}
                  sx={{ px: 2, borderBottom: '1px solid rgba(255,255,255,0.07)',
                    '& .MuiTab-root': { color: 'rgba(255,255,255,0.38)', fontSize: 12, fontWeight: 600, minHeight: 40 },
                    '& .Mui-selected': { color: '#4fc3f7' },
                    '& .MuiTabs-indicator': { bgcolor: '#4fc3f7' } }}>
                  <Tab label="Water Quality" />
                  <Tab label="Shrimp Info" />
                  <Tab label="All Ponds" />
                </Tabs>

                <Box sx={{ p: 2 }}>
                  {/* Water Quality */}
                  {detailTab === 0 && (
                    <Grid container spacing={2}>
                      {[
                        { l: 'pH',         v: selected.ph,          c: '#ab47bc', u: '' },
                        { l: 'Oxygen',      v: selected.oxygen,      c: '#4fc3f7', u: 'mg/L' },
                        { l: 'Salinity',    v: selected.salinity,    c: '#5c6bc0', u: 'ppt' },
                        { l: 'NH3',         v: selected.nh3,         c: '#ffca28', u: 'mg/L' },
                        { l: 'Nitrate',     v: selected.nitrate,     c: '#66bb6a', u: 'mg/L' },
                        { l: 'Turbidity',   v: selected.turbidity,   c: '#26c6da', u: 'NTU' },
                        { l: 'Temperature', v: selected.temperature, c: '#ff7043', u: '°C' },
                        { l: 'Humidity',    v: selected.humidity,    c: '#80cbc4', u: '%' },
                        { l: 'TDS',         v: selected.tds,         c: '#ce93d8', u: 'ppm' },
                        { l: 'ORP',         v: selected.orp,         c: '#f48fb1', u: 'mV' },
                        { l: 'Water Body',  v: selected.water_body,  c: '#4fc3f7', u: '' },
                        { l: 'Water Type',  v: selected.water_type,  c: '#4fc3f7', u: '' },
                      ].map(({ l, v, c, u }) => (
                        <Grid item xs={6} sm={4} md={3} key={l}>
                          <Paper sx={{ p: 1.2, borderRadius: 2, textAlign: 'center',
                            background: `radial-gradient(ellipse at top,${c}10,transparent 70%)`,
                            border: '1px solid rgba(255,255,255,0.06)' }}>
                            <Typography sx={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8 }}>{l}</Typography>
                            <Typography sx={{ fontSize: 15, fontWeight: 700, color: v != null ? c : 'rgba(255,255,255,0.15)' }}>
                              {v != null ? `${v}${u}` : '—'}
                            </Typography>
                          </Paper>
                        </Grid>
                      ))}
                    </Grid>
                  )}

                  {/* Shrimp Info */}
                  {detailTab === 1 && (
                    <Grid container spacing={2}>
                      {[
                        { l: 'Shrimp Type',     v: selected.shrimp_type },
                        { l: 'Shrimp Stage',    v: selected.shrimp_stage },
                        { l: 'Shrimp Size (g)', v: selected.shrimp_size },
                        { l: 'Stocking Density',v: selected.stocking_density },
                        { l: 'Prawns/Acre',     v: selected.prawns_per_acre },
                        { l: 'Avg Weight (g)',  v: selected.avg_weight_g },
                        { l: 'Seed Source',     v: selected.seed_source },
                        { l: 'Feed Type',       v: selected.feed_type },
                        { l: 'Soil Type',       v: selected.soil_type },
                        { l: 'Pond Ownership',  v: selected.pond_ownership },
                        { l: 'Pond Type',       v: selected.pond_type },
                        { l: 'Latitude',        v: selected.latitude },
                        { l: 'Longitude',       v: selected.longitude },
                      ].map(({ l, v }) => (
                        <Grid item xs={6} sm={4} key={l}>
                          <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                            <Typography sx={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8 }}>{l}</Typography>
                            <Typography sx={{ fontSize: 13, fontWeight: 600, color: v != null ? '#fff' : 'rgba(255,255,255,0.18)' }}>{v ?? '—'}</Typography>
                          </Box>
                        </Grid>
                      ))}
                    </Grid>
                  )}

                  {/* All ponds table */}
                  {detailTab === 2 && (
                    <Box sx={{ overflowX: 'auto' }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            {['Name','Shape','Area','Depth','Volume','pH','O₂','Temp','City','Created',''].map(h => (
                              <TableCell key={h} sx={hcell}>{h}</TableCell>
                            ))}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {ponds.map(p => (
                            <TableRow key={p.id} onClick={() => { setSelected(p); setDetailTab(0) }}
                              sx={{ cursor: 'pointer',
                                bgcolor: selected?.id === p.id ? 'rgba(79,195,247,0.06)' : 'transparent',
                                '&:hover': { bgcolor: 'rgba(255,255,255,0.03)' } }}>
                              <TableCell sx={{ ...cell, color: '#fff', fontWeight: 600 }}>{p.pond_name ?? '—'}</TableCell>
                              <TableCell sx={cell}>{shapeIcon(p.pond_shape)} {p.pond_shape ?? '—'}</TableCell>
                              <TableCell sx={{ ...cell, color: '#ab47bc' }}>{p.pond_area ?? '—'}</TableCell>
                              <TableCell sx={{ ...cell, color: '#ff7043' }}>{p.pond_depth ?? '—'}</TableCell>
                              <TableCell sx={{ ...cell, color: '#66bb6a' }}>{volume(p)}</TableCell>
                              <TableCell sx={{ ...cell, color: '#ab47bc' }}>{p.ph ?? '—'}</TableCell>
                              <TableCell sx={{ ...cell, color: '#4fc3f7' }}>{p.oxygen ?? '—'}</TableCell>
                              <TableCell sx={{ ...cell, color: '#ff7043' }}>{p.temperature ?? '—'}</TableCell>
                              <TableCell sx={cell}>{p.city ?? '—'}</TableCell>
                              <TableCell sx={{ ...cell, color: 'rgba(255,255,255,0.35)', fontSize: 10 }}>
                                {new Date(p.created_at).toLocaleDateString()}
                              </TableCell>
                              <TableCell sx={{ ...cell, whiteSpace: 'nowrap' }}>
                                <Button size="small" onClick={e => { e.stopPropagation(); navigate(`/digital-twin/${ponds.findIndex(x=>x.id===p.id)+1 || 1}`) }}
                                  sx={{ fontSize: 10, minWidth: 0, px: 1, color: '#4fc3f7', fontWeight:700 }}>🌊</Button>
                                <Button size="small" onClick={e => { e.stopPropagation(); openEdit(p) }}
                                  sx={{ fontSize: 10, minWidth: 0, px: 1, color: '#4fc3f7' }}>✏️</Button>
                                <Button size="small" onClick={e => { e.stopPropagation(); confirmDelete(p) }}
                                  sx={{ fontSize: 10, minWidth: 0, px: 1, color: '#ef5350' }}>🗑</Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </Box>
                  )}
                </Box>
              </Paper>
            </Box>
          )}
        </Box>
      )}

      {/* ── Add / Edit Dialog ── */}
      <Dialog open={open} onClose={() => !saving && setOpen(false)} maxWidth="md" fullWidth
        PaperProps={{ sx: { borderRadius: 3, background: '#0d1f33', border: '1px solid rgba(255,255,255,0.1)', maxHeight: '90vh' } }}>
        <DialogTitle sx={{ color: '#fff', fontWeight: 700, pb: 0 }}>
          {isEdit ? '✏️ Edit Pond' : '🌊 Add New Pond'}
        </DialogTitle>

        <Tabs value={formTab} onChange={(_, v) => setFormTab(v)}
          sx={{ px: 2, borderBottom: '1px solid rgba(255,255,255,0.08)',
            '& .MuiTab-root': { color: 'rgba(255,255,255,0.38)', fontSize: 11, fontWeight: 600, minHeight: 36 },
            '& .Mui-selected': { color: '#4fc3f7' },
            '& .MuiTabs-indicator': { bgcolor: '#4fc3f7' } }}>
          <Tab label="Basic Info" />
          <Tab label="Dimensions" />
          <Tab label="Water Quality" />
          <Tab label="Shrimp & Farm" />
        </Tabs>

        <DialogContent sx={{ pt: 2 }}>
          {/* Tab 0 — Basic */}
          {formTab === 0 && (
            <Grid container spacing={1.5}>
              <Grid item xs={12}><TF label="Pond Name *" fkey="pond_name" /></Grid>
              <Grid item xs={6}><SEL label="Pond Shape" fkey="pond_shape" options={['rectangular','circular','irregular']} /></Grid>
              <Grid item xs={6}><SEL label="Water Body" fkey="water_body" options={['lake','pond','river','reservoir','coastal','estuary']} /></Grid>
              <Grid item xs={6}><SEL label="Water Type" fkey="water_type" options={['fresh','salt','brackish']} /></Grid>
              <Grid item xs={6}><SEL label="Pond Type"  fkey="pond_type"  options={['earthen','concrete','plastic lined','hdpe lined']} /></Grid>
              <Grid item xs={6}><TF label="City"           fkey="city" /></Grid>
              <Grid item xs={6}><SEL label="Pond Ownership" fkey="pond_ownership" options={['owned','leased','shared']} /></Grid>
              <Grid item xs={6}><TF label="Latitude"  fkey="latitude"  type="number" /></Grid>
              <Grid item xs={6}><TF label="Longitude" fkey="longitude" type="number" /></Grid>
            </Grid>
          )}

          {/* Tab 1 — Dimensions */}
          {formTab === 1 && (
            <Grid container spacing={1.5}>
              <Grid item xs={8}><TF label="Pond Area" fkey="pond_area" type="number" /></Grid>
              <Grid item xs={4}><SEL label="Unit" fkey="pond_area_unit" options={['m²','acres','hectares','sq ft']} /></Grid>
              <Grid item xs={8}><TF label="Pond Depth" fkey="pond_depth" type="number" /></Grid>
              <Grid item xs={4}><SEL label="Unit" fkey="pond_depth_unit" options={['m','ft','cm']} /></Grid>
              <Grid item xs={6}><TF label="Pond Length (m)" fkey="pond_length" type="number" /></Grid>
              <Grid item xs={6}><TF label="Pond Width (m)"  fkey="pond_width"  type="number" /></Grid>
              <Grid item xs={6}><TF label="Pond Radius (m)" fkey="pond_radius" type="number" /></Grid>
              {/* Live volume preview */}
              {form.pond_area && form.pond_depth && (
                <Grid item xs={12}>
                  <Paper sx={{ p: 1.5, borderRadius: 2, bgcolor: 'rgba(79,195,247,0.08)', border: '1px solid rgba(79,195,247,0.2)' }}>
                    <Typography sx={{ fontSize: 12, color: '#4fc3f7' }}>
                      📦 Estimated Volume: <strong>{(parseFloat(form.pond_area) * parseFloat(form.pond_depth)).toFixed(1)} m³</strong>
                    </Typography>
                  </Paper>
                </Grid>
              )}
            </Grid>
          )}

          {/* Tab 2 — Water Quality */}
          {formTab === 2 && (
            <Grid container spacing={1.5}>
              <Grid item xs={6}><TF label="Temperature (°C)" fkey="temperature" type="number" /></Grid>
              <Grid item xs={6}><TF label="pH"               fkey="ph"          type="number" /></Grid>
              <Grid item xs={6}><TF label="Oxygen (mg/L)"    fkey="oxygen"      type="number" /></Grid>
              <Grid item xs={6}><TF label="Salinity (ppt)"   fkey="salinity"    type="number" /></Grid>
              <Grid item xs={6}><TF label="NH3 (mg/L)"       fkey="nh3"         type="number" /></Grid>
              <Grid item xs={6}><TF label="Nitrate (mg/L)"   fkey="nitrate"     type="number" /></Grid>
              <Grid item xs={6}><TF label="Turbidity (NTU)"  fkey="turbidity"   type="number" /></Grid>
              <Grid item xs={6}><TF label="Humidity (%)"     fkey="humidity"    type="number" /></Grid>
              <Grid item xs={6}><TF label="TDS (ppm)"        fkey="tds"         type="number" /></Grid>
              <Grid item xs={6}><TF label="ORP (mV)"         fkey="orp"         type="number" /></Grid>
            </Grid>
          )}

          {/* Tab 3 — Shrimp & Farm */}
          {formTab === 3 && (
            <Grid container spacing={1.5}>
              <Grid item xs={6}><SEL label="Shrimp Type"  fkey="shrimp_type"  options={['Vannamei','Monodon','Indicus','Merguiensis']} /></Grid>
              <Grid item xs={6}><SEL label="Shrimp Stage" fkey="shrimp_stage" options={['PL','Juvenile','Sub-adult','Adult']} /></Grid>
              <Grid item xs={6}><TF label="Shrimp Size (g)"     fkey="shrimp_size"     type="number" /></Grid>
              <Grid item xs={6}><TF label="Stocking Density"    fkey="stocking_density" type="number" /></Grid>
              <Grid item xs={6}><TF label="Prawns per Acre"     fkey="prawns_per_acre"  type="number" /></Grid>
              <Grid item xs={6}><TF label="Avg Weight (g)"      fkey="avg_weight_g"     type="number" /></Grid>
              <Grid item xs={6}><TF label="Seed Source"         fkey="seed_source" /></Grid>
              <Grid item xs={6}><SEL label="Feed Type"  fkey="feed_type"  options={['Pellet','Granule','Powder','Liquid']} /></Grid>
              <Grid item xs={6}><SEL label="Soil Type"  fkey="soil_type"  options={['Clay','Sandy','Loam','Silt','Mixed']} /></Grid>
            </Grid>
          )}

          <Divider sx={{ borderColor: 'rgba(255,255,255,0.07)', mt: 2, mb: 2 }} />
          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
            {formTab > 0 && (
              <Button onClick={() => setFormTab(t => t - 1)} sx={{ borderRadius: 2, color: 'rgba(255,255,255,0.5)' }}>← Back</Button>
            )}
            {formTab < 3 ? (
              <Button variant="outlined" onClick={() => setFormTab(t => t + 1)}
                sx={{ borderRadius: 2, borderColor: 'rgba(79,195,247,0.4)', color: '#4fc3f7' }}>Next →</Button>
            ) : null}
            <Button onClick={() => !saving && setOpen(false)} sx={{ borderRadius: 2, color: 'rgba(255,255,255,0.4)' }}>Cancel</Button>
            <Button variant="contained" onClick={handleSave} disabled={saving}
              sx={{ borderRadius: 2, fontWeight: 700, background: 'linear-gradient(90deg,#0288d1,#4fc3f7)' }}>
              {saving ? <CircularProgress size={17} sx={{ color: '#fff' }} /> : isEdit ? 'Update Pond' : 'Create Pond'}
            </Button>
          </Box>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirm ── */}
      <Dialog open={delOpen} onClose={() => !deleting && setDelOpen(false)} maxWidth="xs" fullWidth
        PaperProps={{ sx: { borderRadius: 3, background: '#0d1f33', border: '1px solid rgba(239,83,80,0.3)' } }}>
        <DialogTitle sx={{ color: '#ef5350', fontWeight: 700 }}>🗑 Delete Pond</DialogTitle>
        <DialogContent>
          <Typography sx={{ color: 'rgba(255,255,255,0.7)', mb: 2 }}>
            Are you sure you want to delete <strong style={{ color: '#fff' }}>{delTarget?.pond_name}</strong>?
            This cannot be undone.
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
            <Button onClick={() => setDelOpen(false)} disabled={deleting}
              sx={{ borderRadius: 2, color: 'rgba(255,255,255,0.5)' }}>Cancel</Button>
            <Button variant="contained" onClick={handleDelete} disabled={deleting}
              sx={{ borderRadius: 2, fontWeight: 700, bgcolor: '#ef5350', '&:hover': { bgcolor: '#e53935' } }}>
              {deleting ? <CircularProgress size={17} sx={{ color: '#fff' }} /> : 'Yes, Delete'}
            </Button>
          </Box>
        </DialogContent>
      </Dialog>

      {/* Toast */}
      <Snackbar open={snack.open} autoHideDuration={4000}
        onClose={() => setSnack(p => ({ ...p, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity={snack.severity} sx={{ borderRadius: 2 }}>{snack.msg}</Alert>
      </Snackbar>
    </Box>
  )
}