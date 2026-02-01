import React from "react";

const kpis = [
  { label: "pH", value: "7.4" },
  { label: "DO", value: "5.8 mg/L" },
  { label: "Temperature", value: "28.6°C" },
  { label: "NH3", value: "0.08 mg/L" },
  { label: "ORP", value: "-250 mV" },
  { label: "Salinity", value: "20 ppt" },
  { label: "Biomass", value: "1500 kg" },
];

const TopKPI = () => {
  return (
    <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
      {kpis.map((item) => (
        <div
          key={item.label}
          style={{
            flex: 1,
            background: "white",
            padding: "10px",
            borderRadius: "10px",
            boxShadow: "0 0 5px rgba(0,0,0,0.1)",
          }}
        >
          <h4>{item.label}</h4>
          <h2>{item.value}</h2>
        </div>
      ))}
    </div>
  );
};

export default TopKPI;
