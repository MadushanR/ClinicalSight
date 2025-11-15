import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { residentAPI } from '../services/api';
import logo from '../assets/logo.svg';
import banner from '../assets/banner.svg';

// Simple in-module cache to prevent refetching on every navigation.
// Persists while the bundle stays loaded (SPA session).
let residentsCache = [];
let residentsCacheTimestamp = 0; // epoch ms

function Card({ title, value, subtitle }) {
  return (
    <div className="card" style={{ flex: '1 1 240px', minWidth: 240 }}>
      <div style={{ fontSize: 14, color: '#666' }}>{title}</div>
      <div style={{ fontSize: 28, fontWeight: 600 }}>{value}</div>
      {subtitle ? <div style={{ fontSize: 12, color: '#666' }}>{subtitle}</div> : null}
    </div>
  );
}

export default function SupportWorkerDashboard() {
  const [residents, setResidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [, setTick] = useState(0); // Force re-render for timestamp updates
  const [sortBy, setSortBy] = useState('name'); // 'name', 'riskLevel', 'fallRisk', 'attention'
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' or 'desc'

  useEffect(() => {
    // On mount, try to hydrate from cache or fetch fresh data if cache is empty
    if (residentsCache.length > 0) {
      setResidents(residentsCache);
      setLastUpdated(new Date(residentsCacheTimestamp));
      setLoading(false);
    } else {
      // Auto-fetch on first load (e.g., after login)
      loadResidents();
    }

    // Auto-refresh every 30 minutes (if enabled)
    let refreshIntervalId;
    if (autoRefresh) {
      refreshIntervalId = setInterval(() => {
        loadResidents();
      }, 1800000); // 30 minutes
    }

    // Update timestamp display every second
    const timestampIntervalId = setInterval(() => {
      setTick(t => t + 1);
    }, 1000);

    return () => {
      if (refreshIntervalId) clearInterval(refreshIntervalId);
      clearInterval(timestampIntervalId);
    };
  }, [autoRefresh]);

  const loadResidents = async () => {
    try {
      setLoading(true);
      const data = await residentAPI.getAllResidents();
      residentsCache = data || [];
      residentsCacheTimestamp = Date.now();
      setResidents(residentsCache);
      setLastUpdated(new Date(residentsCacheTimestamp));
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to load residents');
      console.error('Error loading residents:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatLastUpdated = () => {
    if (!lastUpdated) return '';
    const now = new Date();
    const seconds = Math.floor((now - lastUpdated) / 1000);
    if (seconds < 60) return `Updated ${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `Updated ${minutes}m ago`;
    return lastUpdated.toLocaleTimeString();
  };

  const needsAttention = residents.filter(r => r.attentionFlag === 'Yes').length;
  const highRisk = residents.filter(r => r.riskLevel === 'High').length;

  const handleSort = (column) => {
    if (sortBy === column) {
      // Toggle sort order if clicking same column
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new column and default to ascending
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const sortedResidents = [...residents].sort((a, b) => {
    let comparison = 0;
    
    switch (sortBy) {
      case 'name':
        comparison = a.residentName.localeCompare(b.residentName);
        break;
      case 'riskLevel':
        const riskOrder = { 'High': 3, 'Medium': 2, 'Low': 1 };
        comparison = (riskOrder[a.riskLevel] || 0) - (riskOrder[b.riskLevel] || 0);
        break;
      case 'fallRisk':
        comparison = (a.fallRiskProbability || 0) - (b.fallRiskProbability || 0);
        break;
      case 'attention':
        const attentionOrder = { 'Yes': 1, 'No': 0 };
        comparison = (attentionOrder[a.attentionFlag] || 0) - (attentionOrder[b.attentionFlag] || 0);
        break;
      default:
        comparison = 0;
    }
    
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  return (
    <div className="container">
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: 20,
        padding: '16px 0',
        borderBottom: '2px solid #e0e0e0'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <img src={logo} alt="Logo" style={{ 
            height: '50px', 
            width: '50px', 
            objectFit: 'cover',
            borderRadius: '8px',
            border: '2px solid #435030'
          }} />
          <h1 className="page-title" style={{ margin: 0 }}>Summary Dashboard</h1>
        </div>
        <div style={{ 
          display: 'flex', 
          gap: 12, 
          alignItems: 'center',
          background: '#f8f9fa',
          padding: '10px 16px',
          borderRadius: '8px',
          border: '1px solid #e0e0e0'
        }}>
          <button 
            onClick={() => loadResidents()} 
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              fontSize: '14px',
              fontWeight: 600,
              color: loading ? '#999' : '#435030',
              background: loading ? '#e0e0e0' : '#D9F79B',
              border: loading ? 'none' : '1px solid rgba(67,80,48,0.2)',
              borderRadius: '999px',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: loading ? 'none' : '0 2px 4px rgba(67, 80, 48, 0.15)'
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.filter = 'brightness(0.95)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.filter = 'brightness(1)';
            }}
          >
            {loading ? 'Refreshing...' : 'Refresh Now'}
          </button>
          
          <div style={{ width: '1px', height: '24px', background: '#d0d0d0' }} />
          
          <label style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 8, 
            fontSize: 14,
            fontWeight: 500,
            cursor: 'pointer',
            userSelect: 'none',
            color: '#2d3436'
          }}>
            <input 
              type="checkbox" 
              checked={autoRefresh} 
              onChange={(e) => setAutoRefresh(e.target.checked)}
              style={{
                width: '18px',
                height: '18px',
                cursor: 'pointer',
                accentColor: '#435030'
              }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ lineHeight: 1 }}>Auto-refresh</span>
              <span style={{ fontSize: 11, color: '#636e72', lineHeight: 1 }}>
                {autoRefresh ? 'Every 30 minutes' : 'Off'}
              </span>
            </div>
          </label>
        </div>
      </div>

      {lastUpdated && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 12,
          color: '#636e72',
          marginBottom: 16,
          padding: '8px 12px',
          background: '#f8f9fa',
          borderRadius: '6px',
          width: 'fit-content',
          border: autoRefresh ? '1px solid #11998e' : '1px solid transparent',
          transition: 'all 0.3s ease'
        }}>
          <span>{formatLastUpdated()}</span>
        </div>
      )}
      
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.95); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <Card title="Residents Assigned" value={residents.length} subtitle="Active residents" />
        <Card title="Needs Attention" value={needsAttention} subtitle="Flagged by AI" />
        <Card title="High Risk" value={highRisk} subtitle="Requires immediate care" />
      </div>

      {loading && <div className="card">Loading residents...</div>}
      {error && <div className="card" style={{ color: 'red' }}>Error: {error}</div>}

      {!loading && !error && residents.length > 0 && (
        <div className="card">
          <h2 className="section-title">Resident Summary</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #ddd', textAlign: 'left' }}>
                <th 
                  style={{ padding: '8px', cursor: 'pointer', userSelect: 'none', fontSize: '16px', color: '#333' }}
                  onClick={() => handleSort('name')}
                >
                  Name {sortBy === 'name' ? (sortOrder === 'asc' ? '↑' : '↓') : '↕'}
                </th>
                <th style={{ padding: '8px', fontSize: '16px', color: '#333' }}>Room</th>
                <th 
                  style={{ padding: '8px', cursor: 'pointer', userSelect: 'none', fontSize: '16px', color: '#333' }}
                  onClick={() => handleSort('riskLevel')}
                >
                  Risk Level {sortBy === 'riskLevel' ? (sortOrder === 'asc' ? '↑' : '↓') : '↕'}
                </th>
                <th 
                  style={{ padding: '8px', cursor: 'pointer', userSelect: 'none', fontSize: '16px', color: '#333' }}
                  onClick={() => handleSort('fallRisk')}
                >
                  Fall Risk (AI) {sortBy === 'fallRisk' ? (sortOrder === 'asc' ? '↑' : '↓') : '↕'}
                </th>
                <th style={{ padding: '8px', fontSize: '16px', color: '#333' }}>Mood Summary (AI)</th>
                <th style={{ padding: '8px', fontSize: '16px', color: '#333' }}>Medication Adherence (AI)</th>
                <th 
                  style={{ padding: '8px', cursor: 'pointer', userSelect: 'none', fontSize: '16px', color: '#333' }}
                  onClick={() => handleSort('attention')}
                >
                  Attention {sortBy === 'attention' ? (sortOrder === 'asc' ? '↑' : '↓') : '↕'}
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedResidents.map((resident) => (
                <tr key={resident.residentId} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '8px', fontSize: '12px', color: '#555' }}>{resident.residentName}</td>
                  <td style={{ padding: '8px', fontSize: '12px', color: '#555' }}>{resident.roomNumber}</td>
                  <td style={{ padding: '8px', fontSize: '12px', color: '#555' }}>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      backgroundColor: 
                        resident.riskLevel === 'High' ? '#fee' :
                        resident.riskLevel === 'Medium' ? '#ffeaa7' : '#dfe6e9',
                      color:
                        resident.riskLevel === 'High' ? '#c00' :
                        resident.riskLevel === 'Medium' ? '#d63031' : '#2d3436',
                    }}>
                      {resident.riskLevel}
                    </span>
                  </td>
                  <td style={{ padding: '8px', fontSize: '12px', color: '#555' }}>
                    {resident.fallRiskProbability != null ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                          width: '60px',
                          height: '8px',
                          backgroundColor: '#e0e0e0',
                          borderRadius: '4px',
                          overflow: 'hidden'
                        }}>
                          <div style={{
                            width: `${(resident.fallRiskProbability * 100)}%`,
                            height: '100%',
                            backgroundColor: 
                              resident.fallRiskProbability > 0.7 ? '#f44336' :
                              resident.fallRiskProbability > 0.4 ? '#ff9800' : '#4caf50',
                            transition: 'width 0.3s'
                          }}></div>
                        </div>
                        <span style={{ fontSize: '12px', fontWeight: 600 }}>
                          {(resident.fallRiskProbability * 100).toFixed(0)}%
                        </span>
                      </div>
                    ) : 'N/A'}
                  </td>
                  <td style={{ padding: '8px' }}>
                    <div style={{ 
                      fontSize: '12px', 
                      color: '#555',
                      lineHeight: '1.5',
                      maxWidth: '400px'
                    }}>
                      {resident.aiMoodPrediction || 'No recent data'}
                    </div>
                  </td>
                  <td style={{ padding: '8px' }}>
                    <div style={{ 
                      fontSize: '12px', 
                      lineHeight: '1.5',
                      maxWidth: '350px'
                    }}>
                      {resident.medicationAdherenceSummary ? (
                        <>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            marginBottom: '4px'
                          }}>
                            <span style={{
                              padding: '2px 6px',
                              borderRadius: '3px',
                              fontSize: '11px',
                              fontWeight: 600,
                              backgroundColor: 
                                resident.medicationConcernLevel === 'critical' ? '#fee' :
                                resident.medicationConcernLevel === 'high' ? '#fff3cd' :
                                resident.medicationConcernLevel === 'moderate' ? '#e7f3ff' : '#d4edda',
                              color:
                                resident.medicationConcernLevel === 'critical' ? '#c00' :
                                resident.medicationConcernLevel === 'high' ? '#856404' :
                                resident.medicationConcernLevel === 'moderate' ? '#004085' : '#155724',
                            }}>
                              {resident.medicationAdherenceRate != null ? 
                                `${resident.medicationAdherenceRate.toFixed(0)}% adherence` : 
                                'N/A'}
                            </span>
                          </div>
                          <div style={{ color: '#555' }}>
                            {resident.medicationAdherenceSummary}
                          </div>
                        </>
                      ) : (
                        <span style={{ color: '#999' }}>No medication data</span>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '8px', fontSize: '12px', color: '#555' }}>
                    {resident.attentionFlag === 'Yes' ? '⚠️ Yes' : 'No'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && !error && residents.length === 0 && (
        <div className="card">
          <p>No residents loaded yet. Use "Refresh Now" to fetch current assignments.</p>
        </div>
      )}
    </div>
  );
}
