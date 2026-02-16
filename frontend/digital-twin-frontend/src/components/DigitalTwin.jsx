import React from 'react'
import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import Pond3D from './Pond3D'
import { useEffect, useState } from 'react'
import { getLatestWater } from '../services/api'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

const sample = Array.from({ length: 12 }).map((_, i) => ({ time: `T${i}`, temp: 26 + Math.sin(i / 2) }))

export default function DigitalTwin() {
  const [reading, setReading] = useState(null)

  useEffect(() => {
    // load latest for pond 1 as example
    getLatestWater(1).then(r => setReading(r)).catch(() => {})
  }, [])

  return (
    <Box sx={{ p: 2 }}>
      <Grid container spacing={2}>
        <Grid item xs={12} md={7}>
          <Paper sx={{ height: 520, p: 1 }}>
            <Typography variant="h6">Digital Twin - 3D Pond</Typography>
            <Box sx={{ height: 440 }}>
              <Pond3D status={reading && reading.do && reading.do < 3 ? 'DANGER' : 'GOOD'} />
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 2, mb: 2 }}>
            <Typography variant="subtitle1">Live Water Parameter</Typography>
            <Box sx={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sample}>
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="temp" stroke="#4CAF50" />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          </Paper>

          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1">Disease Risk Heatmap</Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>WSSV: LOW • AHPND: MEDIUM • IHHNV: LOW</Typography>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  )
}
