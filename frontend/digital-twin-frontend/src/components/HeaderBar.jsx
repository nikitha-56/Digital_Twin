import React from "react";

const HeaderBar = () => {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        background: "white",
        padding: "10px 15px",
        borderRadius: "10px",
      }}
    >
      <div>
        <span>Date Range: </span>
        <select>
          <option>Last 7 Days</option>
          <option>Last 30 Days</option>
        </select>

        <span style={{ marginLeft: "20px" }}>Data Source:</span>
        <button style={{ marginLeft: "10px" }}>Manual</button>
        <button style={{ marginLeft: "10px" }}>Sensor</button>
      </div>

      <div>
        <span>🔔</span>
        <span style={{ marginLeft: "10px" }}>👤 User</span>
      </div>
    </div>
  );
};

export default HeaderBar;
