import React from 'react';
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'

const kpis = [
  { label: 'pH', value: '7.4' },
  { label: 'DO', value: '5.8 mg/L' },
  { label: 'Temperature', value: '28.6°C' },
  { label: 'NH3', value: '0.08 mg/L' },
  { label: 'ORP', value: '-250 mV' },
  { label: 'Salinity', value: '20 ppt' },
  { label: 'Biomass', value: '1500 kg' },
];

const TopKPI = () => {
  return (
    <Box sx={{ display: 'flex', gap: 1, overflow: 'auto', pb: 1 }}>
      {kpis.map((item) => (
        <Paper
          key={item.label}
          sx={{
            flex: '0 0 auto',
            minWidth: 120,
            p: 2,
            textAlign: 'center',
            bgcolor: 'background.paper',
          }}
        >
          <Typography variant='caption' color='textSecondary'>{item.label}</Typography>
          <Typography variant='h6'>{item.value}</Typography>
        </Paper>
      ))}
    </Box>
  );
};

export default TopKPI;
