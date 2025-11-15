import React, { useState, useEffect } from 'react';
import { shiftObservationAPI, residentAPI } from '../services/api';
import './ShiftObservationHistory.css';

const ShiftObservationHistory = () => {
  const [residents, setResidents] = useState([]);
  const [selectedResident, setSelectedResident] = useState(null);
  const [observations, setObservations] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [expandedObservation, setExpandedObservation] = useState(null);

  useEffect(() => {
    loadResidents();
  }, []);

  const loadResidents = async () => {
    try {
      const data = await residentAPI.getResidentsForCareForm();
      setResidents(data);
    } catch (error) {
      console.error('Error loading residents:', error);
    }
  };

  const loadObservations = async (residentId) => {
    try {
      setLoading(true);
      const data = await shiftObservationAPI.getByResident(residentId);
      setObservations(data);
    } catch (error) {
      console.error('Error loading observations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResidentChange = (e) => {
    const residentId = parseInt(e.target.value);
    const resident = residents.find(r => r.id === residentId);
    setSelectedResident(resident);
    setSelectedDate('');
    setExpandedObservation(null);
    if (residentId) {
      loadObservations(residentId);
    } else {
      setObservations([]);
    }
  };

  const filteredObservations = selectedDate
    ? observations.filter(obs => {
        const obsDate = new Date(obs.timestamp).toISOString().split('T')[0];
        return obsDate === selectedDate;
      })
    : observations;

  const formatDateTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const toggleObservation = (id) => {
    setExpandedObservation(expandedObservation === id ? null : id);
  };

  const getUniqueDates = () => {
    const dates = observations.map(obs => 
      new Date(obs.timestamp).toISOString().split('T')[0]
    );
    return [...new Set(dates)].sort().reverse();
  };

  return (
    <div className="shift-observation-history">
      <h1 className="page-title">Shift Observation History</h1>

      <div className="filters-section">
        <div className="filter-group">
          <label>Select Resident:</label>
          <select 
            onChange={handleResidentChange}
            value={selectedResident?.id || ''}
            className="filter-select"
          >
            <option value="">-- Choose a resident --</option>
            {residents.map(resident => (
              <option key={resident.id} value={resident.id}>
                {resident.name} - Room {resident.room}
              </option>
            ))}
          </select>
        </div>

        {selectedResident && observations.length > 0 && (
          <div className="filter-group">
            <label>Filter by Date:</label>
            <select 
              onChange={(e) => setSelectedDate(e.target.value)}
              value={selectedDate}
              className="filter-select"
            >
              <option value="">All Dates</option>
              {getUniqueDates().map(date => (
                <option key={date} value={date}>
                  {formatDate(date)}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {loading && <div className="loading">Loading observations...</div>}

      {!loading && selectedResident && filteredObservations.length === 0 && (
        <div className="no-data">
          No shift observations found {selectedDate ? 'for this date' : 'for this resident'}.
        </div>
      )}

      {!loading && filteredObservations.length > 0 && (
        <div className="observations-list">
          {filteredObservations.map(observation => (
            <div key={observation.id} className="observation-card">
              <div 
                className="observation-header"
                onClick={() => toggleObservation(observation.id)}
              >
                <div className="observation-info">
                  <h3>{formatDateTime(observation.timestamp)}</h3>
                  <div className="observation-summary">
                    {observation.fallsHasEvent && <span className="badge badge-fall">Fall Event</span>}
                    {observation.moodHasChange && <span className="badge badge-mood">Mood Change</span>}
                    {observation.medicationHasIssue && <span className="badge badge-med">Medication Issue</span>}
                    {(observation.temperature || observation.heartRate || observation.respiratoryRate || 
                      observation.bpSystolic || observation.bpDiastolic) && 
                      <span className="badge badge-vitals">Vitals Recorded</span>}
                  </div>
                </div>
                <button className="expand-btn">
                  {expandedObservation === observation.id ? '▼' : '▶'}
                </button>
              </div>

              {expandedObservation === observation.id && (
                <div className="observation-details">
                  {/* Falls Section */}
                  {observation.fallsHasEvent && (
                    <div className="detail-section">
                      <h4>Falls / Stability</h4>
                      <div className="detail-grid">
                        <div className="detail-item">
                          <span className="label">Event Type:</span>
                          <span className="value">{observation.fallsEventType}</span>
                        </div>
                        <div className="detail-item">
                          <span className="label">Location:</span>
                          <span className="value">{observation.fallsLocation}</span>
                        </div>
                        {observation.fallsContributingFactors && (
                          <div className="detail-item full-width">
                            <span className="label">Contributing Factors:</span>
                            <span className="value">{observation.fallsContributingFactors}</span>
                          </div>
                        )}
                        <div className="detail-item">
                          <span className="label">Assistive Device Used:</span>
                          <span className="value">{observation.fallsAssistiveDeviceUsed ? 'Yes' : 'No'}</span>
                        </div>
                        {observation.fallsInjury && (
                          <div className="detail-item full-width">
                            <span className="label">Injury:</span>
                            <span className="value">{observation.fallsInjury}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Mood Section */}
                  {observation.moodHasChange && (
                    <div className="detail-section">
                      <h4>Mood Change</h4>
                      <div className="detail-grid">
                        <div className="detail-item">
                          <span className="label">Baseline vs. This Shift:</span>
                          <span className="value">{observation.moodBaseline}</span>
                        </div>
                        <div className="detail-item">
                          <span className="label">Severity:</span>
                          <span className="value">{observation.moodSeverity}/3</span>
                        </div>
                        {observation.moodTriggers && (
                          <div className="detail-item full-width">
                            <span className="label">Triggers:</span>
                            <span className="value">{observation.moodTriggers}</span>
                          </div>
                        )}
                        {observation.moodOtherTrigger && (
                          <div className="detail-item full-width">
                            <span className="label">Other Trigger:</span>
                            <span className="value">{observation.moodOtherTrigger}</span>
                          </div>
                        )}
                        {observation.moodNotes && (
                          <div className="detail-item full-width">
                            <span className="label">Additional Notes:</span>
                            <span className="value">{observation.moodNotes}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Medication Section */}
                  {observation.medicationHasIssue && (
                    <div className="detail-section">
                      <h4>Medication Adherence</h4>
                      <div className="detail-grid">
                        <div className="detail-item">
                          <span className="label">Medication Name:</span>
                          <span className="value">{observation.medicationName}</span>
                        </div>
                        <div className="detail-item">
                          <span className="label">Action:</span>
                          <span className="value">{observation.medicationAction}</span>
                        </div>
                        {observation.medicationReason && (
                          <div className="detail-item full-width">
                            <span className="label">Reason:</span>
                            <span className="value">{observation.medicationReason}</span>
                          </div>
                        )}
                        <div className="detail-item">
                          <span className="label">Staff Action:</span>
                          <span className="value">{observation.medicationStaffAction}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Vitals Section */}
                  {(observation.temperature || observation.heartRate || observation.respiratoryRate || 
                    observation.bpSystolic || observation.bpDiastolic) && (
                    <div className="detail-section">
                      <h4>Vitals</h4>
                      <div className="detail-grid">
                        {observation.temperature && (
                          <div className="detail-item">
                            <span className="label">Body Temperature:</span>
                            <span className="value">{observation.temperature}°C</span>
                          </div>
                        )}
                        {observation.heartRate && (
                          <div className="detail-item">
                            <span className="label">Pulse Rate:</span>
                            <span className="value">{observation.heartRate} bpm</span>
                          </div>
                        )}
                        {observation.respiratoryRate && (
                          <div className="detail-item">
                            <span className="label">Respiratory Rate:</span>
                            <span className="value">{observation.respiratoryRate} breaths/min</span>
                          </div>
                        )}
                        {(observation.bpSystolic && observation.bpDiastolic) && (
                          <div className="detail-item">
                            <span className="label">Blood Pressure:</span>
                            <span className="value">{observation.bpSystolic}/{observation.bpDiastolic} mmHg</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {!selectedResident && !loading && (
        <div className="no-data">
          Please select a resident to view their shift observation history.
        </div>
      )}
    </div>
  );
};

export default ShiftObservationHistory;
