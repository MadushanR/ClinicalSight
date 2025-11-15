import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

export default function SupportWorkerHome() {
  const { user } = useContext(AuthContext);
  return (
    <div className="container">
      <h1 className="page-title">Welcome, Support Worker</h1>
      <div className="card" style={{ marginBottom: 16 }}>
        <p style={{ marginTop: 0 }}>
          Your workspace for resident onboarding, care summaries, and daily tasks.
        </p>
        <div className="actions">
          <Link className="btn btn-primary" to="/dashboard">Go to Dashboard</Link>
          <Link className="btn btn-secondary" to="/resident">Enter Resident Profile</Link>
        </div>
      </div>
      {/* Quick Actions removed per request */}
    </div>
  );
}
