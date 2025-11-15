import React from 'react';
import './App.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import SupportWorkerDashboard from './pages/SupportWorkerDashboard';
import SupportWorkerProfile from './pages/SupportWorkerProfile';
import ResidentCareForm from './pages/ResidentCareForm';
import ResidentAnalytics from './pages/ResidentAnalytics';
import ShiftObservationHistory from './pages/ShiftObservationHistory';
import Auth from './pages/Auth';
import { AuthProvider } from './context/AuthContext';
import RequireAuth from './components/RequireAuth';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              {/* First page: Auth (no navbar) */}
              <Route path="/auth" element={<Auth />} />

              {/* Routes with navbar */}
              <Route element={<Layout />}>
                <Route path="/" element={<RequireAuth><SupportWorkerDashboard /></RequireAuth>} />
                <Route path="/dashboard" element={<RequireAuth><SupportWorkerDashboard /></RequireAuth>} />
                <Route path="/resident-form" element={<RequireAuth><ResidentCareForm /></RequireAuth>} />
                <Route path="/analytics/:residentId" element={<RequireAuth><ResidentAnalytics /></RequireAuth>} />
                <Route path="/history" element={<RequireAuth><ShiftObservationHistory /></RequireAuth>} />
                <Route path="/profile" element={<RequireAuth><SupportWorkerProfile /></RequireAuth>} />
              </Route>

              {/* Backwards-compat: send /login and /register to tabs */}
              <Route path="/login" element={<Auth />} />
              <Route path="/register" element={<Auth />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </header>
    </div>
  );
}

export default App;
