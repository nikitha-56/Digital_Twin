import React from 'react'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'

export default function Analytics(){
  return (
    <Box sx={{ p: 2 }}>
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6">Analytics</Typography>
        <Typography variant="body2" sx={{ mt: 1 }}>Multi-modal correlations, disease timelines, and export tools will appear here.</Typography>
      </Paper>
    </Box>
  )
}
