import React from 'react';
import Box from '@mui/material/Box'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import NotificationsIcon from '@mui/icons-material/Notifications'
import AccountCircleIcon from '@mui/icons-material/AccountCircle'

const HeaderBar = () => {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: 'background.paper', p: 2, mb: 2 }}>
      <Box sx={{ display: 'flex', gap: 3, alignItems: 'center' }}>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Typography variant='body2'>Date Range:</Typography>
          <Select size='small' defaultValue='7' sx={{ width: 120 }}>
            <MenuItem value='7'>Last 7 Days</MenuItem>
            <MenuItem value='30'>Last 30 Days</MenuItem>
          </Select>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Typography variant='body2'>Data Source:</Typography>
          <Button size='small' variant='outlined'>Manual</Button>
          <Button size='small' variant='outlined'>Sensor</Button>
        </Box>
      </Box>
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
        <NotificationsIcon />
        <AccountCircleIcon />
      </Box>
    </Box>
  );
};

export default HeaderBar;
