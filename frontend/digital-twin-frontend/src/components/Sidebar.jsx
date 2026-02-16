import React from "react";
import { Link } from 'react-router-dom'
import Box from '@mui/material/Box'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import Typography from '@mui/material/Typography'
import './Sidebar.css'

const items = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/ponds', label: 'Ponds' },
  { to: '/digital-twin', label: 'Digital Twin' },
  { to: '/analytics', label: 'Analytics' },
  { to: '/simulations', label: 'Simulations' },
]

const Sidebar = () => {
  return (
    <Box sx={{ width: 240, bgcolor: 'background.paper', color: 'text.primary', p: 2, height: '100vh', overflow: 'auto' }}>
      <Typography variant="h5" sx={{ mb: 2, fontWeight: 'bold' }}>🌊 Digital Twin</Typography>
      <List>
        {items.map(i => (
          <ListItem key={i.to} sx={{ mb: 1, borderRadius: 1, '&:hover': { bgcolor: 'action.hover' } }}>
            <Link to={i.to} style={{ color: 'inherit', textDecoration: 'none', width: '100%' }}>
              <ListItemText primary={i.label} />
            </Link>
          </ListItem>
        ))}
      </List>
    </Box>
  )
}

export default Sidebar;
