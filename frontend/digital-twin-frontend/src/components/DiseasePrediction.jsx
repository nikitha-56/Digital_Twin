import React from 'react'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'

const risks = [
  { name: 'WSSV', score: '0.12', level: 'LOW' },
  { name: 'AHPND', score: '0.45', level: 'MEDIUM' },
  { name: 'IHHNV', score: '0.08', level: 'LOW' },
]

export default function DiseasePrediction(){
  return (
    <Box sx={{ p: 2 }}>
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6">Disease Prediction</Typography>
        <List>
          {risks.map(r => (
            <ListItem key={r.name}>
              <ListItemText primary={`${r.name} — ${r.level}`} secondary={`Confidence ${r.score}`} />
            </ListItem>
          ))}
        </List>
      </Paper>
    </Box>
  )
}
