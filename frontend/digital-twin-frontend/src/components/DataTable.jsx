import React from "react";

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
    <div
      style={{
        background: "white",
        padding: "10px",
        borderRadius: "10px",
      }}
    >
      <h3>Detailed Records</h3>
      <table border="1" width="100%">
        <thead>
          <tr>
            <th>Date</th>
            <th>Time</th>
            <th>pH</th>
            <th>DO</th>
            <th>Temp</th>
            <th>NH3</th>
            <th>Salinity</th>
            <th>ORP</th>
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
