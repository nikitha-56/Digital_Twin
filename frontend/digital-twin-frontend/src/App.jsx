import Sidebar from "./components/Sidebar";
import HeaderBar from "./components/HeaderBar";
import TopKPI from "./components/TopKPI";
import HealthIndicators from "./components/HealthIndicators";
import AlertPanel from "./components/AlertsPanel";
import DataTable from "./components/DataTable";
import "./App.css";

function App() {
  return (
    <div className="app-container">
      <Sidebar />

      <div className="dashboard">
        <HeaderBar />

        <TopKPI />

        <div className="center-row">
          <HealthIndicators />

          <div className="pond-view">
            <h3>3D Pond View </h3>
          </div>

          <AlertPanel />
        </div>

        <DataTable />
      </div>
    </div>
  );
}

export default App;
