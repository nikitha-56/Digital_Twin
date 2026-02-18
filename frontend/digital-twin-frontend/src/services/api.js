import axios from 'axios'

const API = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000' })

export async function fetchPonds(){
	const r = await API.get('/ponds')
	return r.data
}

export async function createPond(p){
	const { name, shape, area, depth } = p
	const r = await API.post('/ponds', { name, shape, area, depth })
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
