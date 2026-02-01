import React from "react";

const AlertsPanel = () => {
  return (
    <div
      style={{
        background: "white",
        padding: "10px",
        borderRadius: "10px",
        minHeight: "350px",
      }}
    >
      <h3>Real-Time Alerts</h3>

      <p>⚠ Warning — DO drops below 6 mg/L</p>
      <p>❗ Critical — DO drops below 4 mg/L</p>
      <p>⚠ Warning — Ammonia levels high</p>

      <button style={{ marginTop: "10px" }}>View History</button>
      <br />
      <button style={{ marginTop: "10px" }}>Export CSV</button>
    </div>
  );
};

export default AlertsPanel;
