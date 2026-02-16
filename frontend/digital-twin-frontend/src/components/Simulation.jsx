import React, { useState } from 'react'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import Slider from '@mui/material/Slider'
import Button from '@mui/material/Button'
import Grid from '@mui/material/Grid'

export default function Simulation(){
  const [temp, setTemp] = useState(28)
  const [ph, setPh] = useState(7.8)
  const [doVal, setDoVal] = useState(5.5)

  const run = () => {
    import('../services/api').then(mod => {
      const adjustments = { temperature: temp - 28, ph: ph - 7.8, do: doVal - 5.5 }
      mod.runSimulate(1, adjustments, 24).then(res => {
        alert('Simulation completed. Open Analytics to view results (placeholder).')
        console.log('simulation', res)
      }).catch(err => {
        alert('Simulation failed. See console.')
        console.error(err)
      })
    })
  }

  return (
    <Box sx={{ p: 2 }}>
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6">Simulation</Typography>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12} md={4}>
            <Typography gutterBottom>Temperature: {temp}°C</Typography>
            <Slider min={15} max={35} value={temp} onChange={(e, v) => setTemp(v)} />
          </Grid>
          <Grid item xs={12} md={4}>
            <Typography gutterBottom>pH: {ph}</Typography>
            <Slider min={6} max={9} step={0.1} value={ph} onChange={(e, v) => setPh(v)} />
          </Grid>
          <Grid item xs={12} md={4}>
            <Typography gutterBottom>DO: {doVal} mg/L</Typography>
            <Slider min={1} max={10} step={0.1} value={doVal} onChange={(e, v) => setDoVal(v)} />
          </Grid>
        </Grid>
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
          <Button variant="contained" onClick={run}>Run Simulation</Button>
        </Box>
      </Paper>
    </Box>
  )
}
