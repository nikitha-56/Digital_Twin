import { Routes, Route, Navigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import Sidebar from "./components/Sidebar"
import HeaderBar from "./components/HeaderBar"
import Dashboard from "./components/Dashboard"
import PondManagement from "./components/PondManagement"
import DigitalTwin from "./components/DigitalTwin"
import Analytics from "./components/Analytics"
import Simulation from "./components/Simulation"
import WaterMonitoring from "./components/WaterMonitoring"
import DiseasePrediction from "./components/DiseasePrediction"
import "./App.css"

function App() {
  return (
    <Box className="app-container" sx={{ display: 'flex', height: '100vh' }}>
      <Sidebar />
      <Box component="main" sx={{ flex: 1, overflow: 'auto' }}>
        <HeaderBar />
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/ponds" element={<PondManagement />} />
          <Route path="/digital-twin" element={<DigitalTwin />} />
          <Route path="/water" element={<WaterMonitoring />} />
          <Route path="/disease" element={<DiseasePrediction />} />
          <Route path="/simulations" element={<Simulation />} />
          <Route path="/analytics" element={<Analytics />} />
        </Routes>
      </Box>
    </Box>
  )
}

export default App
