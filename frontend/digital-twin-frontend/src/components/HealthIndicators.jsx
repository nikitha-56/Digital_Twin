import React from "react";

const indicators = [
  { name: "pH", status: "Normal", value: "7.4" },
  { name: "DO", status: "Normal", value: "5.8 mg/L" },
  { name: "Temperature", status: "Normal", value: "28.6°C" },
  { name: "NH3", status: "Normal", value: "0.08 mg/L" },
  { name: "ORP", status: "Normal", value: "-250 mV" },
];

const HealthIndicators = () => {
  return (
    <div
      style={{
        background: "white",
        padding: "10px",
        borderRadius: "10px",
        minHeight: "350px",
      }}
    >
      <h3>Health Indicators</h3>
      {indicators.map((i) => (
        <div key={i.name} style={{ margin: "10px 0" }}>
          <strong>{i.name}:</strong> {i.value} — {i.status}
        </div>
      ))}
    </div>
  );
};

export default HealthIndicators;
