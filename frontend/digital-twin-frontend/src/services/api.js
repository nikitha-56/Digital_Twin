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
