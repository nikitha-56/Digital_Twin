import React from 'react'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

const sample = Array.from({ length: 24 }).map((_, i) => ({ t: i, ph: 7.6 + Math.sin(i/4)*0.2, do: 5 + Math.cos(i/3)*0.6 }))

export default function WaterMonitoring(){
  return (
    <Box sx={{ p: 2 }}>
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6">Water Monitoring</Typography>
        <Box sx={{ height: 300, mt: 1 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sample}>
              <XAxis dataKey="t" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="ph" stroke="#00BCD4" />
              <Line type="monotone" dataKey="do" stroke="#4CAF50" />
            </LineChart>
          </ResponsiveContainer>
        </Box>
      </Paper>
    </Box>
  )
}
