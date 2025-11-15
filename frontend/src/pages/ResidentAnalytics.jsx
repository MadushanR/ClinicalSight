import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import './ResidentAnalytics.css';

const ResidentAnalytics = () => {
  const { residentId } = useParams();
  const navigate = useNavigate();
  const [residentData, setResidentData] = useState(null);
  const [observationData, setObservationData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30'); // days

  useEffect(() => {
    fetchResidentData();
    fetchObservationData();
  }, [residentId, timeRange]);

  const fetchResidentData = async () => {
    try {
      const response = await fetch(`http://localhost:8081/api/residents/${residentId}`);
      if (response.ok) {
        const data = await response.json();
        setResidentData(data);
      } else {
        console.error('Failed to fetch resident data:', response.status);
        setResidentData(null);
      }
    } catch (error) {
      console.error('Error fetching resident data:', error);
      setResidentData(null);
    }
  };

  const fetchObservationData = async () => {
    try {
      console.log(`Fetching observations for resident ${residentId} with timeRange ${timeRange}`);
      const response = await fetch(`http://localhost:8081/api/residents/${residentId}/observations?days=${timeRange}`);
      console.log('Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Received observation data:', data);
        setObservationData(data);
        setLoading(false);
      } else {
        console.error('Failed to fetch observation data:', response.status);
        const errorText = await response.text();
        console.error('Error response:', errorText);
        setObservationData([]);
        setLoading(false);
      }
    } catch (error) {
      console.error('Error fetching observation data:', error);
      setObservationData([]);
      setLoading(false);
    }
  };

  const renderPredictionBanners = () => {
    if (!observationData.length) return null;
    
    // Observations are returned in descending order (most recent first)
    const latestObs = observationData[0];
    const fallRisk = latestObs.fallNext7d;
    const missedDoseRisk = latestObs.missedDoseRatio7d;
    
    return null;
  };

  const renderVitalsChart = () => {
    if (!observationData.length) return null;

    const chartData = observationData.map(obs => ({
      date: new Date(obs.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      heartRate: obs.heartRate,
      bpSystolic: obs.bpSystolic,
      bpDiastolic: obs.bpDiastolic,
      temperature: Math.round(obs.temperature * 10) / 10,
      oxygenSat: obs.oxygenSat
    })).reverse(); // Reverse to show most recent on the right

    return (
      <div className="chart-container">
        <h3>Vital Signs Trends</h3>
        <div className="chart-wrapper">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 25 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" stroke="#666" fontSize={12} />
              <YAxis stroke="#666" fontSize={12} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  border: '1px solid #ddd', 
                  borderRadius: '8px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  fontSize: '12px',
                  maxWidth: '200px',
                  padding: '8px'
                }}
                labelStyle={{ fontSize: '12px', marginBottom: '4px' }}
                itemStyle={{ fontSize: '11px', padding: '1px 0' }}
              />
              <Legend 
                verticalAlign="bottom" 
                height={20}
                iconSize={12}
                wrapperStyle={{ fontSize: '11px', paddingTop: '5px' }}
              />
              <Line 
                type="monotone" 
                dataKey="heartRate" 
                stroke="#e74c3c" 
                strokeWidth={2}
                name="Heart Rate (bpm)"
                dot={{ fill: '#e74c3c', strokeWidth: 2, r: 4 }}
              />
              <Line 
                type="monotone" 
                dataKey="bpSystolic" 
                stroke="#3498db" 
                strokeWidth={2}
                name="BP Systolic (mmHg)"
                dot={{ fill: '#3498db', strokeWidth: 2, r: 4 }}
              />
              <Line 
                type="monotone" 
                dataKey="oxygenSat" 
                stroke="#27ae60" 
                strokeWidth={2}
                name="Oxygen Sat (%)"
                dot={{ fill: '#27ae60', strokeWidth: 2, r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="vitals-summary">
          <div className="vital-stat">
            <span className="stat-label">Latest HR:</span>
            <span className="stat-value">{chartData[chartData.length - 1]?.heartRate} bpm</span>
          </div>
          <div className="vital-stat">
            <span className="stat-label">Latest BP:</span>
            <span className="stat-value">{chartData[chartData.length - 1]?.bpSystolic}/{chartData[chartData.length - 1]?.bpDiastolic} mmHg</span>
          </div>
          <div className="vital-stat">
            <span className="stat-label">Latest O2:</span>
            <span className="stat-value">{chartData[chartData.length - 1]?.oxygenSat}%</span>
          </div>
        </div>
      </div>
    );
  };

  const renderCognitiveChart = () => {
    if (!observationData.length) return null;

    const cognitiveData = observationData.filter(obs => obs.mmseScore).slice(-10).map(obs => ({
      date: new Date(obs.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      mmseScore: obs.mmseScore,
      baseline: residentData?.baselineMmse || residentData?.baselineMMSE || 24
    })).reverse(); // Reverse to show most recent on the right
    
    return (
      <div className="chart-container">
        <h3>Cognitive Assessment (MMSE)</h3>
        <div className="chart-wrapper">
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={cognitiveData} margin={{ top: 5, right: 30, left: 20, bottom: 25 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" stroke="#666" fontSize={12} />
              <YAxis domain={[0, 30]} stroke="#666" fontSize={12} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  border: '1px solid #ddd', 
                  borderRadius: '8px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  fontSize: '12px',
                  maxWidth: '180px',
                  padding: '8px'
                }}
                labelStyle={{ fontSize: '12px', marginBottom: '4px' }}
                itemStyle={{ fontSize: '11px', padding: '1px 0' }}
              />
              <Legend 
                verticalAlign="bottom" 
                height={20}
                iconSize={12}
                wrapperStyle={{ fontSize: '11px', paddingTop: '5px' }}
              />
              <Line 
                type="monotone" 
                dataKey="baseline" 
                stroke="#95a5a6" 
                strokeWidth={2}
                strokeDasharray="5 5"
                name="Baseline"
                dot={false}
              />
              <Line 
                type="monotone" 
                dataKey="mmseScore" 
                stroke="#9b59b6" 
                strokeWidth={3}
                name="MMSE Score"
                dot={{ fill: '#9b59b6', strokeWidth: 2, r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="cognitive-summary">
          <div className="cognitive-stat">
            <span className="stat-label">Latest Score:</span>
            <span className={`stat-value ${cognitiveData[cognitiveData.length - 1]?.mmseScore < 20 ? 'concerning' : cognitiveData[cognitiveData.length - 1]?.mmseScore < 24 ? 'moderate' : 'good'}`}>
              {cognitiveData[cognitiveData.length - 1]?.mmseScore}/30
            </span>
          </div>
          <div className="cognitive-stat">
            <span className="stat-label">vs Baseline:</span>
            <span className={`stat-value ${(cognitiveData[cognitiveData.length - 1]?.mmseScore - cognitiveData[0]?.baseline) < -3 ? 'concerning' : 'stable'}`}>
              {cognitiveData[cognitiveData.length - 1]?.mmseScore - cognitiveData[0]?.baseline > 0 ? '+' : ''}
              {cognitiveData[cognitiveData.length - 1]?.mmseScore - cognitiveData[0]?.baseline}
            </span>
          </div>
        </div>
      </div>
    );
  };

  const renderMobilitySection = () => {
    if (!observationData.length) return null;

    // Observations are returned in descending order (most recent first)
    const latestObs = observationData[0];
    const mobilityLevels = ['Independent', 'Supervision', 'Partial Assist', 'Full Assist', 'Bedbound'];
    
    return (
      <div className="section-container">
        <h3>Mobility & Safety</h3>
        <div className="mobility-grid">
          <div className="mobility-item">
            <label>Current Level</label>
            <span className={`mobility-level level-${latestObs.mobilityLevel}`}>
              {mobilityLevels[latestObs.mobilityLevel]}
            </span>
          </div>
          <div className="mobility-item">
            <label>Falls (90 days)</label>
            <span className={`fall-count ${latestObs.priorFall90d > 1 ? 'high' : latestObs.priorFall90d > 0 ? 'moderate' : 'low'}`}>
              {latestObs.priorFall90d || 0}
            </span>
          </div>
          <div className="flags-grid">
            {latestObs.dizzynessFlag && <span className="flag dizziness">Dizziness</span>}
            {latestObs.unsteadyGaitFlag && <span className="flag unsteady">Unsteady Gait</span>}
          </div>
        </div>
      </div>
    );
  };

  const renderClinicalFlags = () => {
    if (!observationData.length) return null;

    // Observations are returned in descending order (most recent first)
    const latestObs = observationData[0];
    const flags = [
      { key: 'hypotensionFlag', label: 'Hypotension', active: latestObs.hypotensionFlag },
      { key: 'tachycardiaFlag', label: 'Tachycardia', active: latestObs.tachycardiaFlag },
      { key: 'hypoxiaFlag', label: 'Hypoxia', active: latestObs.hypoxiaFlag },
      { key: 'feverFlag', label: 'Fever', active: latestObs.feverFlag },
      { key: 'cognitiveImpairmentFlag', label: 'Cognitive Decline', active: latestObs.cognitiveImpairmentFlag },
      { key: 'highRiskMedFlag', label: 'High-Risk Medications', active: latestObs.highRiskMedFlag }
    ];

    const activeFlags = flags.filter(flag => flag.active);

    return (
      <div className="section-container">
        <h3>Clinical Alerts</h3>
        {activeFlags.length > 0 ? (
          <div className="clinical-flags">
            {activeFlags.map(flag => (
              <div key={flag.key} className={`clinical-flag ${flag.key}`}>
                {flag.label}
              </div>
            ))}
          </div>
        ) : (
          <p className="no-flags">No active clinical alerts</p>
        )}
      </div>
    );
  };

  const renderMedicationSection = () => {
    if (!observationData.length) return null;

    // Observations are returned in descending order (most recent first)
    const latestObs = observationData[0];
    
    return (
      <div className="section-container">
        <h3>Medication Management</h3>
        <div className="medication-grid">
          <div className="med-item">
            <label>Total Medications</label>
            <span className={`med-count ${latestObs.polypharmacyCount > 10 ? 'high' : latestObs.polypharmacyCount > 7 ? 'moderate' : 'normal'}`}>
              {latestObs.polypharmacyCount}
            </span>
          </div>
          <div className="med-item">
            <label>Missed Dose Rate (7d)</label>
            <span className={`dose-rate ${latestObs.missedDoseRatio7d > 0.15 ? 'high' : latestObs.missedDoseRatio7d > 0.05 ? 'moderate' : 'low'}`}>
              {(latestObs.missedDoseRatio7d * 100).toFixed(1)}%
            </span>
          </div>
        </div>
      </div>
    );
  };

  const renderAIFallPrediction = () => {
    if (!observationData.length) return null;

    // Observations are returned in descending order (most recent first)
    const latestObs = observationData[0];
    const fallRisk = latestObs.fallNext7d;
    
    if (fallRisk == null) return null;

    return (
      <div className="section-container">
        <h3>AI Fall Risk Prediction (Next 7 Days)</h3>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '12px',
          marginTop: '16px'
        }}>
          <div style={{
            width: '120px',
            height: '16px',
            backgroundColor: '#e0e0e0',
            borderRadius: '8px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${(fallRisk * 100)}%`,
              height: '100%',
              backgroundColor: 
                fallRisk > 0.7 ? '#f44336' :
                fallRisk > 0.4 ? '#ff9800' : '#4caf50',
              transition: 'width 0.3s'
            }}></div>
          </div>
          <span style={{ fontSize: '16px', fontWeight: 600, color: '#333' }}>
            {(fallRisk * 100).toFixed(0)}%
          </span>
        </div>
      </div>
    );
  };

  if (loading) {
    return <div className="analytics-loading">Loading analytics...</div>;
  }

  if (!residentData) {
    return <div className="analytics-error">Unable to load resident data. Please check your connection and try again.</div>;
  }

  if (!observationData || observationData.length === 0) {
    return (
      <div className="resident-analytics">
        <div className="analytics-header">
          <button className="back-button" onClick={() => navigate(-1)}>
            ← Back
          </button>
          <div className="resident-info">
            <h1>{residentData?.name} Analytics</h1>
            <span className="room-info">Room {residentData?.roomNumber} • {residentData?.careLevel}</span>
          </div>
          <select 
            value={timeRange} 
            onChange={(e) => setTimeRange(e.target.value)}
            className="time-range-select"
          >
            <option value="7">Last 7 days</option>
            <option value="14">Last 14 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
        </div>
        <div className="no-data-message">
          <h3>No observation data available</h3>
          <p>There are no shift observations recorded for this resident in the selected time range.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="resident-analytics">
      <div className="analytics-header">
        <button className="back-button" onClick={() => navigate(-1)}>
          ← Back
        </button>
        <div className="resident-info">
          <h1>{residentData?.name} Analytics</h1>
          <span className="room-info">Room {residentData?.roomNumber} • {residentData?.careLevel}</span>
        </div>
        <select 
          value={timeRange} 
          onChange={(e) => setTimeRange(e.target.value)}
          className="time-range-select"
        >
          <option value="7">Last 7 days</option>
          <option value="14">Last 14 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
        </select>
      </div>

      {renderPredictionBanners()}

      <div className="analytics-grid">
        <div className="analytics-section vitals">
          {renderVitalsChart()}
        </div>

        <div className="analytics-section cognitive">
          {renderCognitiveChart()}
        </div>

        <div className="analytics-section mobility">
          {renderMobilitySection()}
        </div>

        <div className="analytics-section clinical">
          {renderClinicalFlags()}
        </div>

        <div className="analytics-section medication">
          {renderMedicationSection()}
        </div>
      </div>
    </div>
  );
};

export default ResidentAnalytics;