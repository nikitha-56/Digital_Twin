import React from 'react';
import Box from '@mui/material/Box'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import Badge from '@mui/material/Badge'
import NotificationsIcon from '@mui/icons-material/Notifications'
import AccountCircleIcon from '@mui/icons-material/AccountCircle'

const HeaderBar = () => {
  return (
    <Box sx={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      bgcolor: 'background.paper', px: 3, py: 1.5, mb: 0,
      borderBottom: '1px solid rgba(255,255,255,0.06)',
    }}>
      {/* Left: Date range only */}
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>
          Date Range:
        </Typography>
        <Select size="small" defaultValue="7"
          sx={{ width: 130, fontSize: 12,
            '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.15)' },
            '& .MuiSelect-select': { py: 0.7 },
          }}>
          <MenuItem value="1">Last 24 Hours</MenuItem>
          <MenuItem value="7">Last 7 Days</MenuItem>
          <MenuItem value="30">Last 30 Days</MenuItem>
          <MenuItem value="90">Last 90 Days</MenuItem>
        </Select>
      </Box>

      {/* Right: notifications + profile */}
      <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
        <IconButton size="small" sx={{ color: 'rgba(255,255,255,0.6)' }}>
          <Badge badgeContent={3} color="error" sx={{ '& .MuiBadge-badge': { fontSize: 9 } }}>
            <NotificationsIcon fontSize="small" />
          </Badge>
        </IconButton>
        <IconButton size="small" sx={{ color: 'rgba(255,255,255,0.6)' }}>
          <AccountCircleIcon fontSize="small" />
        </IconButton>
      </Box>
    </Box>
  );
};

export default HeaderBar;