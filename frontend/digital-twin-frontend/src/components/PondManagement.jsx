import React, { useState, useEffect } from 'react'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import TextField from '@mui/material/TextField'

const initialPonds = [
  { id: 1, name: 'Pond A', area: 500 },
  { id: 2, name: 'Pond B', area: 320 },
]

export default function PondManagement() {
  const [ponds, setPonds] = useState(initialPonds)
  useEffect(() => {
    let mounted = true
    import('../services/api').then(mod => {
      mod.fetchPonds().then(data => { if(mounted) setPonds(data) }).catch(()=>{})
    })
    return () => { mounted = false }
  }, [])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)

  const handleAdd = () => {
    setEditing({ name: '', area: 100 })
    setOpen(true)
  }

  const handleEdit = (p) => {
    setEditing(p)
    setOpen(true)
  }

  const handleDelete = (id) => setPonds(ps => ps.filter(p => p.id !== id))

  const handleSave = () => {
    if (editing.id) {
      setPonds(ps => ps.map(p => (p.id === editing.id ? editing : p)))
    } else {
      // call backend to create
      import('../services/api').then(mod => {
        mod.createPond(editing).then(created => setPonds(ps => [...ps, created])).catch(()=>{})
      })
    }
    setOpen(false)
  }

  return (
    <Box sx={{ p: 2 }}>
      <Paper sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Pond Management</Typography>
          <Button variant="contained" color="primary" onClick={handleAdd}>Add Pond</Button>
        </Box>

        <List>
          {ponds.map(p => (
            <ListItem key={p.id} secondaryAction={
              <>
                <Button size="small" onClick={() => handleEdit(p)}>Edit</Button>
                <Button size="small" color="error" onClick={() => handleDelete(p.id)}>Delete</Button>
              </>
            }>
              <ListItemText primary={p.name} secondary={`Area: ${p.area} m²`} />
            </ListItem>
          ))}
        </List>
      </Paper>

      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>{editing && editing.id ? 'Edit Pond' : 'Add Pond'}</DialogTitle>
        <DialogContent>
          <TextField label="Name" fullWidth sx={{ mt: 1 }} value={editing?.name || ''} onChange={e => setEditing({ ...editing, name: e.target.value })} />
          <TextField label="Area (m²)" type="number" fullWidth sx={{ mt: 1 }} value={editing?.area || ''} onChange={e => setEditing({ ...editing, area: Number(e.target.value) })} />
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} variant="contained" sx={{ ml: 1 }}>Save</Button>
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  )
}
