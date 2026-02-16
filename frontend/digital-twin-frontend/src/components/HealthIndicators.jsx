import React from "react";
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import Chip from '@mui/material/Chip'

const indicators = [
  { name: "pH", status: "Normal", value: "7.4" },
  { name: "DO", status: "Normal", value: "5.8 mg/L" },
  { name: "Temperature", status: "Normal", value: "28.6°C" },
  { name: "NH3", status: "Normal", value: "0.08 mg/L" },
  { name: "ORP", status: "Normal", value: "-250 mV" },
];

const HealthIndicators = () => {
  return (
    <Box sx={{ bgcolor: 'background.paper', p: 2, borderRadius: 1 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>Health Indicators</Typography>
      <List>
        {indicators.map((i) => (
          <ListItem key={i.name} sx={{ display: 'flex', justifyContent: 'space-between', py: 1 }}>
            <Box>
              <Typography variant="body2"><strong>{i.name}:</strong> {i.value}</Typography>
            </Box>
            <Chip label={i.status} color="success" size="small" />
          </ListItem>
        ))}
      </List>
    </Box>
  );
};

export default HealthIndicators;
