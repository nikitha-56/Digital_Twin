import React from 'react'
import Grid from '@mui/material/Grid'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import TopKPI from './TopKPI'
import HealthIndicators from './HealthIndicators'
import AlertsPanel from './AlertsPanel'

export default function Dashboard() {
  return (
    <Box sx={{ p: 2 }}>
      <TopKPI />
      <Grid container spacing={2} sx={{ mt: 1 }}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6">Pond Status</Typography>
            <HealthIndicators />
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6">Recent Alerts</Typography>
            <AlertsPanel />
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6">System Health</Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>All systems nominal. Live connections: 4 ponds.</Typography>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  )
}
