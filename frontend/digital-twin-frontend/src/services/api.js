import axios from 'axios'

const API = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000' })

// Events
export async function fetchEvents(limit = 100, offset = 0) {
  const r = await API.get('/api/v1/events/', { params: { limit, offset } })
  return r.data
}

// Ponds
export async function fetchPonds(customer_uid = null, search = null) {
  const r = await API.get('/api/v1/pond/all', {
    params: { customer_uid, search }
  })
  return r.data
}

export async function createPond(data) {
  const r = await API.post('/api/v1/pond/add', data)
  return r.data
}

export async function submitWater(pond_id, reading){
	const r = await API.post(`/ponds/${pond_id}/water`, reading)
	return r.data
}

export async function getLatestWater(pond_id){
	const r = await API.get(`/ponds/${pond_id}/water`)
	return r.data
}

export async function runSimulate(pond_id, adjustments, hours=24){
	const r = await API.post(`/simulate?pond_id=${pond_id}`, { adjustments, hours })
	return r.data
}

export default API

// ─────────────────────────────────────────────────────────────
//  ADD THESE 3 FUNCTIONS to the bottom of your existing api.js
// ─────────────────────────────────────────────────────────────

// Digital Twin — main fusion data
export async function fetchDigitalTwin(pond_id) {
  const r = await API.get(`/digital-twin/${pond_id}`)
  return r.data
}

// What-If simulation
// IMPORTANT: "do" is a JS reserved word — we build params with bracket notation
export async function runWhatIf(pond_id, params = {}) {
  // Build URLSearchParams manually to safely include "do" as a key
  const searchParams = new URLSearchParams()
  for (const [key, val] of Object.entries(params)) {
    if (val !== undefined && val !== null) {
      searchParams.append(key, val)
    }
  }
  // Use axios with params as URLSearchParams object — avoids "do" reserved word issues
  const r = await API.get(`/digital-twin/${pond_id}/what-if`, {
    params: searchParams,
  })
  return r.data
}

// Mock disease score (for shrimp behavior)
export async function fetchDiseaseScore(pond_id) {
  const r = await API.get(`/mock/disease-score/${pond_id}`)
  return r.data
}

// ── ADD THESE to your existing api.js ────────────────────────────────────────

export async function updatePond(pond_id, data) {
  const r = await API.put(`/api/v1/pond/${pond_id}`, data)
  return r.data
}

export async function deletePond(pond_id) {
  const r = await API.delete(`/api/v1/pond/${pond_id}`)
  return r.data
}