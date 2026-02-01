import React from "react";
import "./Sidebar.css";

const Sidebar = () => {
  return (
    <div className="sidebar">
      <h2 className="logo">Digital Twin</h2>

      <ul>
        <li>Dashboard</li>
        <li>Ponds</li>
        <li>Digital Twin</li>
        <li>Reports</li>
        <li>Settings</li>
      </ul>
    </div>
  );
};

export default Sidebar;
