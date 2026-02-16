import React from "react";
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'

const AlertsPanel = () => {
  return (
    <Box sx={{ bgcolor: 'background.paper', p: 2, borderRadius: 1 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>Real-Time Alerts</Typography>
      <Stack spacing={1} sx={{ mb: 2 }}>
        <Alert severity="warning">⚠ Warning — DO drops below 6 mg/L</Alert>
        <Alert severity="error">❗ Critical — DO drops below 4 mg/L</Alert>
        <Alert severity="warning">⚠ Warning — Ammonia levels high</Alert>
      </Stack>
      <Stack direction="row" gap={1}>
        <Button variant="outlined" size="small">View History</Button>
        <Button variant="outlined" size="small">Export CSV</Button>
      </Stack>
    </Box>
  );
};

export default AlertsPanel;
