import React from "react";
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Paper from '@mui/material/Paper'

const rows = [
  {
    date: "May 22, 2022",
    time: "06:00 AM",
    ph: 7.4,
    do: 5.9,
    temp: 28.5,
    nh3: 0.08,
    salinity: 20,
    orp: -250,
    biomass: 1500,
    notes: "Morning Check",
  },
  {
    date: "May 22, 2022",
    time: "00:00 AM",
    ph: 7.4,
    do: 5.7,
    temp: 28.5,
    nh3: 0.08,
    salinity: 20,
    orp: -250,
    biomass: 1200,
    notes: "Routine Check",
  },
];

const DataTable = () => {
  return (
    <Paper sx={{ bgcolor: 'background.paper', p: 2, mt: 2 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>Detailed Records</Typography>
      <Box sx={{ overflowX: 'auto' }}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: 'action.hover' }}>
              <TableCell>Date</TableCell>
              <TableCell>Time</TableCell>
              <TableCell>pH</TableCell>
              <TableCell>DO</TableCell>
              <TableCell>Temp</TableCell>
              <TableCell>NH3</TableCell>
              <TableCell>Salinity</TableCell>
              <TableCell>ORP</TableCell>
              <TableCell>Biomass</TableCell>
              <TableCell>Notes</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row, idx) => (
              <TableRow key={idx} sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                <TableCell>{row.date}</TableCell>
                <TableCell>{row.time}</TableCell>
                <TableCell>{row.ph}</TableCell>
                <TableCell>{row.do}</TableCell>
                <TableCell>{row.temp}°C</TableCell>
                <TableCell>{row.nh3}</TableCell>
                <TableCell>{row.salinity}</TableCell>
                <TableCell>{row.orp}</TableCell>
                <TableCell>{row.biomass} kg</TableCell>
                <TableCell>{row.notes}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
    </Paper>
  );
};

export default DataTable;
            <th>Biomass</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td>{r.date}</td>
              <td>{r.time}</td>
              <td>{r.ph}</td>
              <td>{r.do}</td>
              <td>{r.temp}</td>
              <td>{r.nh3}</td>
              <td>{r.salinity}</td>
              <td>{r.orp}</td>
              <td>{r.biomass}</td>
              <td>{r.notes}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DataTable;
