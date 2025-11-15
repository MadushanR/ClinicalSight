import React, { useState, useMemo, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FALL_EVENT_TYPES,
  MOOD_BASELINE_OPTIONS,
  MOOD_TRIGGERS,
  MEDICATION_ACTIONS,
  STAFF_ACTIONS,
  MOBILITY_LEVELS,
  INITIAL_FORM_STATE 
} from '../data/SAMPLEDATA';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import './ResidentCareForm.css';

const ResidentCareForm = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [residents, setResidents] = useState([]);
  const [selectedResident, setSelectedResident] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);
  const [hasChanges, setHasChanges] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Modal states
  const [showResidentModal, setShowResidentModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isEditingResident, setIsEditingResident] = useState(false);
  const [pendingResident, setPendingResident] = useState(null);
  const [residentToDelete, setResidentToDelete] = useState(null);
  
  // Resident form states
  const [residentFormData, setResidentFormData] = useState({
    id: null,
    fullName: '',
    dateOfBirth: '',
    gender: '',
    age: '',
    careLevel: '',
    emergencyContact: '',
    emergencyPhone: '',
    residence: '',
    roomUnit: '',
    moveInDate: '',
    diagnoses: '',
    baselineMmse: '',
    fallRisk: false,
    medicationRefusal: false,
    moodChanges: false,
    baselineVitals: {
      bpSystolic: '', bpDiastolic: '', heartRate: '', oxygenSat: '', temperature: '', pulseRate: '', respiratoryRate: ''
    }
  });
  const [residentValidationErrors, setResidentValidationErrors] = useState({});

  // Fetch residents on component mount and when filter changes
  useEffect(() => {
    const fetchResidents = async () => {
      try {
        setLoading(true);
        const data = await api.residentAPI.getResidentsForCareForm();
        setResidents(data);
        // Select first resident with a flag, or first resident
        const defaultResident = data.find(r => r.fallRisk || r.medicationRefusal || r.moodChanges) || data[0];
        setSelectedResident(defaultResident);
      } catch (error) {
        console.error('Error fetching residents:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchResidents();
  }, []);

  // Filter residents based on search and filters
  const filteredResidents = useMemo(() => {
    return residents.filter(resident => {
      // Add null checks for name and room
      const residentName = resident.name || '';
      const residentRoom = resident.room || '';
      
      const matchesSearch = residentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           residentRoom.includes(searchTerm);
      
      let matchesFilter = true;
      if (activeFilter === 'fallRisk') {
        matchesFilter = resident.fallRisk;
      } else if (activeFilter === 'medicationRefusal') {
        matchesFilter = resident.medicationRefusal;
      } else if (activeFilter === 'moodChanges') {
        matchesFilter = resident.moodChanges;
      }
      // 'all' filter shows everyone
      
      return matchesSearch && matchesFilter;
    });
  }, [residents, searchTerm, activeFilter]);

  // Check if there are meaningful changes in the form
  const hasFormChanges = () => {
    return (
      formData.fallsStability.hasEvent ||
      formData.mood.hasChange ||
      formData.medication.hasIssue ||
      formData.vitals.hasReading ||
      formData.mobility.hasAssessment ||
      formData.fallsStability.eventType ||
      formData.fallsStability.location ||
      formData.fallsStability.contributingFactors ||
      formData.fallsStability.assistiveDeviceUsed !== null ||
      formData.fallsStability.injury ||
      formData.mood.baseline ||
      formData.mood.triggers.length > 0 ||
      formData.mood.otherTrigger ||
      formData.mood.severity !== null ||
      formData.mood.notes ||
      formData.medication.medicationName ||
      formData.medication.action ||
      formData.medication.reason ||
      formData.medication.staffAction ||
      formData.medication.polypharmacyCount ||
      formData.medication.highRiskMedFlag !== null ||
      formData.vitals.bodyTemperature ||
      formData.vitals.pulseRate ||
      formData.vitals.respiratoryRate ||
      formData.vitals.systolicBP ||
      formData.vitals.diastolicBP ||
      formData.vitals.oxygenSat ||
      formData.mobility.mobilityLevel ||
      formData.mobility.useOfAid !== null ||
      formData.mobility.dizzinessFlag !== null ||
      formData.mobility.unsteadyGaitFlag !== null
    );
  };

  const handleResidentSelect = (resident) => {
    if (hasFormChanges()) {
      setPendingResident(resident);
      setShowConfirmModal(true);
    } else {
      setSelectedResident(resident);
      setFormData({...INITIAL_FORM_STATE});
      setHasChanges(false);
    }
  };

  const discardAndSwitchResident = () => {
    setSelectedResident(pendingResident);
    setFormData({...INITIAL_FORM_STATE});
    setHasChanges(false);
    setShowConfirmModal(false);
    setPendingResident(null);
  };

  const cancelResidentChange = () => {
    setShowConfirmModal(false);
    setPendingResident(null);
  };

  // Resident add/edit functions
  const handleAddResident = () => {
    setIsEditingResident(false);
    setResidentFormData({
      id: null,
      fullName: '',
      dateOfBirth: '',
      gender: '',
      age: '',
      emergencyContact: '',
      emergencyPhone: '',
      residence: '',
      roomUnit: '',
      careLevel: '',
      moveInDate: '',
      diagnoses: '',
      baselineMmse: '',
      fallRisk: false,
      medicationRefusal: false,
      moodChanges: false,
      baselineVitals: { bpSystolic: '', bpDiastolic: '', heartRate: '', oxygenSat: '', temperature: '', pulseRate: '', respiratoryRate: '' }
    });
    setShowResidentModal(true);
  };

  const handleEditResident = (resident) => {
    if (hasFormChanges()) {
      // Show confirmation modal first
      setPendingResident(resident);
      setShowConfirmModal(true);
      return;
    }
    
    setIsEditingResident(true);
    setResidentFormData({
      id: resident.id,
      fullName: resident.name || '',
      dateOfBirth: resident.dateOfBirth || '',
      gender: resident.gender || '',
      age: resident.age || '',
      emergencyContact: resident.emergencyContact || '',
      emergencyPhone: resident.emergencyPhone || '',
      residence: resident.residence || '',
      roomUnit: resident.roomNumber || resident.room || '',
      careLevel: resident.careLevel || '',
      moveInDate: resident.moveInDate || '',
      diagnoses: resident.diagnoses || '',
      baselineMmse: resident.baselineMmse || '',
      fallRisk: !!resident.fallRisk,
      medicationRefusal: !!resident.medicationRefusal,
      moodChanges: !!resident.moodChanges,
      baselineVitals: {
        bpSystolic: resident.bpSystolic || '',
        bpDiastolic: resident.bpDiastolic || '',
        heartRate: resident.heartRate || '',
        oxygenSat: resident.oxygenSat || '',
        temperature: resident.temperature || '',
        pulseRate: resident.pulseRate || '',
        respiratoryRate: resident.respiratoryRate || ''
      }
    });
    setShowResidentModal(true);
  };

  const handleDeleteResident = (resident) => {
    setResidentToDelete(resident);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      await api.residentAPI.deleteResident(residentToDelete.id);
      
      // Refresh residents list
      const updatedResidents = await api.residentAPI.getResidentsForCareForm();
      setResidents(updatedResidents);
      
      // If deleted resident was selected, select first resident
      if (selectedResident?.id === residentToDelete.id) {
        setSelectedResident(updatedResidents[0] || null);
        setFormData({...INITIAL_FORM_STATE});
      }
      
      setShowDeleteModal(false);
      setResidentToDelete(null);
    } catch (error) {
      console.error('Error deleting resident:', error);
      alert('Failed to delete resident. Please try again.');
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setResidentToDelete(null);
  };

  const updateResidentFormData = (field, value) => {
    setResidentFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Helper function to calculate age from date of birth
  const calculateAge = (dob) => {
    if (!dob) return 0;
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const handleSaveResident = () => {
    // Call the actual save function
    saveResident();
  };

  const closeResidentModal = () => {
    setShowResidentModal(false);
    setIsEditingResident(false);
    setResidentValidationErrors({}); // Clear validation errors
    setResidentFormData({
      id: null,
      fullName: '',
      dateOfBirth: '',
      gender: '',
      age: '',
      careLevel: '',
      emergencyContact: '',
      emergencyPhone: '',
      residence: '',
      roomUnit: '',
      moveInDate: '',
      diagnoses: '',
      baselineMmse: '',
      fallRisk: false,
      medicationRefusal: false,
      moodChanges: false,
      baselineVitals: { bpSystolic: '', bpDiastolic: '', heartRate: '', oxygenSat: '', temperature: '', pulseRate: '', respiratoryRate: '' }
    });
  };

  const handleResidentFormChange = (e) => {
    const { name, value } = e.target;
    setResidentFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateResidentForm = () => {
    const errors = {};
    
    if (!residentFormData.fullName || !residentFormData.fullName.trim()) {
      errors.fullName = 'Full name is required';
    }
    if (!residentFormData.dateOfBirth) {
      errors.dateOfBirth = 'Date of birth is required';
    }
    if (!residentFormData.gender) {
      errors.gender = 'Gender is required';
    }
    // Age is auto-calculated from dateOfBirth, no validation needed
    if (!residentFormData.careLevel) {
      errors.careLevel = 'Care level is required';
    }
    if (!residentFormData.emergencyContact || !residentFormData.emergencyContact.trim()) {
      errors.emergencyContact = 'Emergency contact is required';
    }
    if (!residentFormData.emergencyPhone || !residentFormData.emergencyPhone.trim()) {
      errors.emergencyPhone = 'Emergency phone is required';
    }
    if (!residentFormData.residence || !residentFormData.residence.trim()) {
      errors.residence = 'Residence is required';
    }
    if (!residentFormData.roomUnit || !residentFormData.roomUnit.trim()) {
      errors.roomUnit = 'Room/Unit is required';
    }
    if (!residentFormData.moveInDate) {
      errors.moveInDate = 'Move-in date is required';
    }
    
    setResidentValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const saveResident = async () => {
    if (!validateResidentForm()) {
      return;
    }

    try {
      if (isEditingResident) {
        // Update existing resident
          const updateData = {
            name: residentFormData.fullName,
            dateOfBirth: residentFormData.dateOfBirth,
            gender: residentFormData.gender,
            age: calculateAge(residentFormData.dateOfBirth),
            careLevel: residentFormData.careLevel,
            emergencyContact: residentFormData.emergencyContact,
            emergencyPhone: residentFormData.emergencyPhone,
            roomNumber: residentFormData.roomUnit,
            residence: residentFormData.residence,
            moveInDate: residentFormData.moveInDate,
            diagnoses: residentFormData.diagnoses || '',
            baselineMmse: residentFormData.baselineMmse ? parseInt(residentFormData.baselineMmse,10) : 25
          };
        
        await api.residentAPI.updateResident(residentFormData.id, updateData);
        
        // Update local state
        // Update local state
        const updatedResidents = await api.residentAPI.getResidentsForCareForm();
        setResidents(updatedResidents);
      } else {
        // Add new resident
        const createdResident = await api.residentAPI.createResident({
          name: residentFormData.fullName,
          dateOfBirth: residentFormData.dateOfBirth,
          gender: residentFormData.gender,
          age: calculateAge(residentFormData.dateOfBirth),
          emergencyContact: residentFormData.emergencyContact,
          emergencyPhone: residentFormData.emergencyPhone,
          roomNumber: residentFormData.roomUnit,
          residence: residentFormData.residence,
          careLevel: residentFormData.careLevel,
          moveInDate: residentFormData.moveInDate,
          diagnoses: residentFormData.diagnoses || '',
          baselineMmse: residentFormData.baselineMmse ? parseInt(residentFormData.baselineMmse,10) : 25
        });

        // Refresh residents list and select the newly created one
        const updatedResidents = await api.residentAPI.getResidentsForCareForm();
        setResidents(updatedResidents);
        const newlyAdded = updatedResidents.find(r => r.id === createdResident.id) || createdResident;
        setSelectedResident(newlyAdded);
        console.log('Resident created successfully:', createdResident);
      }

      closeResidentModal();
    } catch (error) {
      console.error('Error saving resident:', error);
      alert('Failed to save resident. Please try again.');
    }
  };

  const updateFormData = (section, field, value) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
    setHasChanges(true);
  };

  const updateResidentBaselineVitals = (field, value) => {
    setResidentFormData(prev => ({
      ...prev,
      baselineVitals: { ...prev.baselineVitals, [field]: value }
    }));
  };

  const handleTriggerToggle = (trigger) => {
    const currentTriggers = formData.mood.triggers;
    const newTriggers = currentTriggers.includes(trigger)
      ? currentTriggers.filter(t => t !== trigger)
      : [...currentTriggers, trigger];
    
    updateFormData('mood', 'triggers', newTriggers);
  };

  const handleSeverityClick = (level) => {
    // Allow deselection by clicking the same severity level
    const newSeverity = formData.mood.severity === level ? null : level;
    updateFormData('mood', 'severity', newSeverity);
  };

  const handleRadioClick = (section, field, value) => {
    // Allow deselection by clicking the same radio button
    const currentValue = formData[section][field];
    const newValue = currentValue === value ? null : value;
    updateFormData(section, field, newValue);
  };

  const validateForm = () => {
    const errors = {};
    
    // Falls validation
    if (formData.fallsStability.hasEvent) {
      if (!formData.fallsStability.eventType) {
        errors.eventType = 'Event type is required';
      }
      if (!formData.fallsStability.location) {
        errors.location = 'Location is required';
      }
    }
    
    // Mood validation
    if (formData.mood.hasChange) {
      if (!formData.mood.baseline) {
        errors.baseline = 'Baseline comparison is required';
      }
      if (formData.mood.severity === null) {
        errors.severity = 'Severity is required';
      }
    }
    
    // Medication validation
    if (formData.medication.hasIssue) {
      if (!formData.medication.medicationName) {
        errors.medicationName = 'Medication name is required';
      }
      if (!formData.medication.action) {
        errors.action = 'Action is required';
      }
      if (!formData.medication.staffAction) {
        errors.staffAction = 'Staff action is required';
      }
    }
    
    // Vitals validation
    if (formData.vitals.hasReading) {
      if (!formData.vitals.bodyTemperature) {
        errors.bodyTemperature = 'Body temperature is required';
      }
      if (!formData.vitals.pulseRate) {
        errors.pulseRate = 'Pulse rate is required';
      }
      if (!formData.vitals.respiratoryRate) {
        errors.respiratoryRate = 'Respiratory rate is required';
      }
      if (!formData.vitals.systolicBP) {
        errors.systolicBP = 'Systolic blood pressure is required';
      }
      if (!formData.vitals.diastolicBP) {
        errors.diastolicBP = 'Diastolic blood pressure is required';
      }
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveAndNext = async () => {
    if (!validateForm()) {
      return;
    }
    
    try {
      setSaving(true);
      
      // Prepare care documentation data
      const careData = {
        residentId: selectedResident.id,
        shiftWorkerId: user?.id || 1,
        
        // Falls section
        fallsHasEvent: formData.fallsStability.hasEvent,
        fallsEventType: formData.fallsStability.eventType || null,
        fallsLocation: formData.fallsStability.location || null,
        fallsContributingFactors: formData.fallsStability.contributingFactors || null,
        fallsAssistiveDeviceUsed: formData.fallsStability.assistiveDeviceUsed,
  fallsInjury: formData.fallsStability.injury || null,
  painScore: formData.fallsStability.painScore ? parseInt(formData.fallsStability.painScore,10) : null,
        
        // Mood section
        moodHasChange: formData.mood.hasChange,
        moodBaseline: formData.mood.baseline || null,
        moodTriggers: formData.mood.triggers.join(', '),
        moodOtherTrigger: formData.mood.otherTrigger || null,
        moodSeverity: formData.mood.severity,
        moodNotes: formData.mood.notes || null,
        
        // Medication section
        medicationHasIssue: formData.medication.hasIssue,
        medicationName: formData.medication.medicationName || null,
        medicationAction: formData.medication.action || null,
        medicationReason: formData.medication.reason || null,
        medicationStaffAction: formData.medication.staffAction || null,
        polypharmacyCount: formData.medication.polypharmacyCount ? parseInt(formData.medication.polypharmacyCount) : null,
        highRiskMedFlag: formData.medication.highRiskMedFlag,
        
  // Vitals section
        temperature: formData.vitals.bodyTemperature ? parseFloat(formData.vitals.bodyTemperature) : null,
        heartRate: formData.vitals.pulseRate ? parseInt(formData.vitals.pulseRate) : null,
        respiratoryRate: formData.vitals.respiratoryRate ? parseInt(formData.vitals.respiratoryRate) : null,
        bpSystolic: formData.vitals.systolicBP ? parseInt(formData.vitals.systolicBP) : null,
        bpDiastolic: formData.vitals.diastolicBP ? parseInt(formData.vitals.diastolicBP) : null,
    oxygenSat: formData.vitals.oxygenSat ? parseInt(formData.vitals.oxygenSat) : null,
    mmseScore: formData.vitals.mmseScore ? parseInt(formData.vitals.mmseScore,10) : null,
    cognitiveImpairmentFlag: formData.vitals.mmseScore ? (parseInt(formData.vitals.mmseScore,10) < 24) : null,
        
        // Mobility section
        mobilityLevel: formData.mobility.mobilityLevel || null,
        useOfAid: formData.mobility.useOfAid,
        dizzinessFlag: formData.mobility.dizzinessFlag,
        unsteadyGaitFlag: formData.mobility.unsteadyGaitFlag
      };
      
      await api.careDocumentationAPI.create(careData);
      console.log('Care documentation saved for', selectedResident.name);
      
      // Clear the hasChanges flag and reset form
      setHasChanges(false);
  setFormData({ ...INITIAL_FORM_STATE });
      
      // Show success message
      alert('Care documentation saved successfully!');
      
      // Move to next resident
      const currentIndex = residents.findIndex(r => r.id === selectedResident.id);
      const nextIndex = (currentIndex + 1) % residents.length;
      const nextResident = residents[nextIndex];
      
      // Directly select next resident without confirmation since we just saved
      setSelectedResident(nextResident);
      
    } catch (error) {
      console.error('Error saving care documentation:', error);
      alert('Failed to save care documentation. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const ResidentIcon = ({ type, active }) => {
    const iconMap = {
      fallRisk: '🚨',
      medicationRefusal: '💊',
      moodChanges: '😔'
    };
    
    return active ? (
      <span className="resident-icon active">
        {iconMap[type]}
      </span>
    ) : null;
  };

  if (loading) {
    return <div className="resident-care-form"><div className="loading">Loading residents...</div></div>;
  }

  return (
    <div className="resident-care-form">
      <div className="main-content">
        {/* Left Pane - Resident List */}
        <div className="resident-list-pane">
          <div className="search-section">
            <div className="search-container">
              <input
                type="text"
                placeholder="Search residents"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
              <select 
                className="filter-dropdown"
                value={activeFilter}
                onChange={(e) => setActiveFilter(e.target.value)}
              >
                <option value="all">All Residents</option>
                <option value="fallRisk">Fall Risk</option>
                <option value="medicationRefusal">Medication Issues</option>
                <option value="moodChanges">Mood Changes</option>
              </select>
            </div>
          </div>

          <div className="add-resident-section">
            <button 
              className="add-resident-button"
              onClick={handleAddResident}
            >
              + Add Resident
            </button>
          </div>

          <div className="residents-list">
            {filteredResidents.map(resident => (
              <div
                key={resident.id}
                className={`resident-card ${selectedResident?.id === resident.id ? 'selected' : ''}`}
                onClick={() => handleResidentSelect(resident)}
              >
                <div className="resident-info">
                  <div className="resident-name">{resident.name}</div>
              <div className="resident-room">Room {resident.roomNumber || resident.roomUnit || resident.room || 'N/A'}</div>
                </div>
                <div className="resident-icons">
                  <ResidentIcon type="fallRisk" active={resident.fallRisk} />
                  <ResidentIcon type="medicationRefusal" active={resident.medicationRefusal} />
                  <ResidentIcon type="moodChanges" active={resident.moodChanges} />
                </div>
                <div className="resident-action-buttons">
                  <button 
                    className="edit-resident-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditResident(resident);
                    }}
                    title="Edit resident"
                  >
                    ✏️
                  </button>
                  <button 
                    className="delete-resident-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteResident(resident);
                    }}
                    title="Delete resident"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Main Pane - Form */}
        <div className="form-pane">
          {selectedResident && (
            <>
              <div className="resident-header">
                <div className="resident-header-left">
                  <h2>{selectedResident.name}</h2>
                  <p>Room: {selectedResident.roomNumber || selectedResident.roomUnit || selectedResident.room || 'N/A'}</p>
                </div>
                <div className="resident-header-right">
                  <button 
                    className="analytics-button"
                    onClick={() => navigate(`/analytics/${selectedResident.id}`)}
                    title="View Analytics"
                  >
                    📊 Analytics
                  </button>
                </div>
              </div>

              {/* Falls/Stability Section (includes Pain Score now) */}
              <div className="form-section">
                <div 
                  className="section-header"
                  onClick={() => updateFormData('fallsStability', 'hasEvent', !formData.fallsStability.hasEvent)}
                >
                  <h3>Falls / Stability</h3>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={formData.fallsStability.hasEvent}
                      onChange={(e) => updateFormData('fallsStability', 'hasEvent', e.target.checked)}
                    />
                    <span className="toggle-slider"></span>
                    <span className="toggle-label">{formData.fallsStability.hasEvent ? 'Yes' : 'No'}</span>
                  </label>
                </div>

                {(formData.fallsStability.hasEvent || formData.fallsStability.painScore) && (
                  <div className="section-content">
                    <div className="form-group">
                      <label>Event type *</label>
                      <select
                        value={formData.fallsStability.eventType}
                        onChange={(e) => updateFormData('fallsStability', 'eventType', e.target.value)}
                        className={`form-select ${validationErrors.eventType ? 'error' : ''}`}
                      >
                        <option value="">Select event type</option>
                        {FALL_EVENT_TYPES.map(type => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                      {validationErrors.eventType && <span className="error-message">{validationErrors.eventType}</span>}
                    </div>

                    <div className="form-group">
                      <label>Location *</label>
                      <input
                        type="text"
                        value={formData.fallsStability.location}
                        onChange={(e) => updateFormData('fallsStability', 'location', e.target.value)}
                        className={`form-input ${validationErrors.location ? 'error' : ''}`}
                        placeholder="Enter location"
                      />
                      {validationErrors.location && <span className="error-message">{validationErrors.location}</span>}
                    </div>

                    <div className="form-group">
                      <label>Contributing factors</label>
                      <input
                        type="text"
                        value={formData.fallsStability.contributingFactors}
                        onChange={(e) => updateFormData('fallsStability', 'contributingFactors', e.target.value)}
                        className="form-input"
                        placeholder="Describe contributing factors"
                      />
                    </div>

                    <div className="form-group">
                      <label>Assistive device used?</label>
                      <div className="radio-group">
                        <label className="radio-option">
                          <input
                            type="radio"
                            name="assistiveDevice"
                            checked={formData.fallsStability.assistiveDeviceUsed === true}
                            onChange={() => handleRadioClick('fallsStability', 'assistiveDeviceUsed', true)}
                            onClick={(e) => {
                              if (formData.fallsStability.assistiveDeviceUsed === true) {
                                e.preventDefault();
                                handleRadioClick('fallsStability', 'assistiveDeviceUsed', true);
                              }
                            }}
                          />
                          Yes
                        </label>
                        <label className="radio-option">
                          <input
                            type="radio"
                            name="assistiveDevice"
                            checked={formData.fallsStability.assistiveDeviceUsed === false}
                            onChange={() => handleRadioClick('fallsStability', 'assistiveDeviceUsed', false)}
                            onClick={(e) => {
                              if (formData.fallsStability.assistiveDeviceUsed === false) {
                                e.preventDefault();
                                handleRadioClick('fallsStability', 'assistiveDeviceUsed', false);
                              }
                            }}
                          />
                          No
                        </label>
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Injury</label>
                      <input
                        type="text"
                        value={formData.fallsStability.injury}
                        onChange={(e) => updateFormData('fallsStability', 'injury', e.target.value)}
                        className="form-input"
                        placeholder="Describe injury or enter 'None'"
                      />
                    </div>
                    <div className="form-group">
                      <label>Pain Score (0-10)</label>
                      <input
                        type="number"
                        min="0"
                        max="10"
                        value={formData.fallsStability.painScore || ''}
                        onChange={(e) => updateFormData('fallsStability','painScore', e.target.value)}
                        className="form-input"
                        placeholder="0"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Mood Section */}
              <div className="form-section">
                <div 
                  className="section-header"
                  onClick={() => updateFormData('mood', 'hasChange', !formData.mood.hasChange)}
                >
                  <h3>Mood change</h3>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={formData.mood.hasChange}
                      onChange={(e) => updateFormData('mood', 'hasChange', e.target.checked)}
                    />
                    <span className="toggle-slider"></span>
                    <span className="toggle-label">{formData.mood.hasChange ? 'Yes' : 'No'}</span>
                  </label>
                </div>

                {formData.mood.hasChange && (
                  <div className="section-content">
                    <div className="form-group">
                      <label>Baseline vs. this shift *</label>
                      <select
                        value={formData.mood.baseline}
                        onChange={(e) => updateFormData('mood', 'baseline', e.target.value)}
                        className={`form-select ${validationErrors.baseline ? 'error' : ''}`}
                      >
                        <option value="">Select mood change</option>
                        {MOOD_BASELINE_OPTIONS.map(option => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                      {validationErrors.baseline && <span className="error-message">{validationErrors.baseline}</span>}
                    </div>

                    <div className="form-group">
                      <label>Possible triggers</label>
                      <div className="tags-container">
                        {MOOD_TRIGGERS.map(trigger => (
                          <button
                            key={trigger}
                            type="button"
                            className={`tag-button ${formData.mood.triggers.includes(trigger) ? 'selected' : ''}`}
                            onClick={() => handleTriggerToggle(trigger)}
                          >
                            {trigger}
                          </button>
                        ))}
                      </div>
                      <input
                        type="text"
                        value={formData.mood.otherTrigger}
                        onChange={(e) => updateFormData('mood', 'otherTrigger', e.target.value)}
                        className="form-input"
                        placeholder="Other trigger"
                      />
                    </div>

                    <div className="form-group">
                      <label>Severity *</label>
                      <div className="severity-scale">
                        {[1, 2, 3].map(level => (
                          <button
                            key={level}
                            type="button"
                            className={`severity-button ${formData.mood.severity === level ? 'selected' : ''}`}
                            onClick={() => handleSeverityClick(level)}
                          >
                            {level}
                          </button>
                        ))}
                      </div>
                      {validationErrors.severity && <span className="error-message">{validationErrors.severity}</span>}
                    </div>

                    <div className="form-group">
                      <label>Additional notes</label>
                      <input
                        type="text"
                        value={formData.mood.notes}
                        onChange={(e) => updateFormData('mood', 'notes', e.target.value)}
                        className="form-input"
                        placeholder="Additional information"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Medication Adherence Section */}
              <div className="form-section">
                <div 
                  className="section-header"
                  onClick={() => updateFormData('medication', 'hasIssue', !formData.medication.hasIssue)}
                >
                  <h3>Medication adherence</h3>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={formData.medication.hasIssue}
                      onChange={(e) => updateFormData('medication', 'hasIssue', e.target.checked)}
                    />
                    <span className="toggle-slider"></span>
                    <span className="toggle-label">{formData.medication.hasIssue ? 'Yes' : 'No'}</span>
                  </label>
                </div>

                {formData.medication.hasIssue && (
                  <div className="section-content">
                    <div className="form-group">
                      <label>Medication name *</label>
                      <input
                        type="text"
                        value={formData.medication.medicationName}
                        onChange={(e) => updateFormData('medication', 'medicationName', e.target.value)}
                        className={`form-input ${validationErrors.medicationName ? 'error' : ''}`}
                        placeholder="Enter medication name"
                      />
                      {validationErrors.medicationName && <span className="error-message">{validationErrors.medicationName}</span>}
                    </div>

                    <div className="form-group">
                      <label>Action *</label>
                      <div className="radio-group">
                        {MEDICATION_ACTIONS.map(action => (
                          <label key={action} className="radio-option">
                            <input
                              type="radio"
                              name="medicationAction"
                              checked={formData.medication.action === action}
                              onChange={() => handleRadioClick('medication', 'action', action)}
                              onClick={(e) => {
                                if (formData.medication.action === action) {
                                  e.preventDefault();
                                  handleRadioClick('medication', 'action', action);
                                }
                              }}
                            />
                            {action}
                          </label>
                        ))}
                      </div>
                      {validationErrors.action && <span className="error-message">{validationErrors.action}</span>}
                    </div>

                    {(formData.medication.action === 'Refused' || formData.medication.action === 'Partially taken') && (
                      <div className="form-group">
                        <label>Reason</label>
                        <input
                          type="text"
                          value={formData.medication.reason}
                          onChange={(e) => updateFormData('medication', 'reason', e.target.value)}
                          className="form-input"
                          placeholder="Reason for refusal/partial taking"
                        />
                      </div>
                    )}

                    <div className="form-group">
                      <label>Staff action *</label>
                      <select
                        value={formData.medication.staffAction}
                        onChange={(e) => updateFormData('medication', 'staffAction', e.target.value)}
                        className={`form-select ${validationErrors.staffAction ? 'error' : ''}`}
                      >
                        <option value="">Select staff action</option>
                        {STAFF_ACTIONS.map(action => (
                          <option key={action} value={action}>{action}</option>
                        ))}
                      </select>
                      {validationErrors.staffAction && <span className="error-message">{validationErrors.staffAction}</span>}
                    </div>

                    <div className="form-group">
                      <label>Polypharmacy Count</label>
                      <input
                        type="number"
                        min="0"
                        max="50"
                        value={formData.medication.polypharmacyCount || ""}
                        onChange={(e) => updateFormData('medication', 'polypharmacyCount', e.target.value)}
                        className="form-input"
                        placeholder="Number of medications"
                      />
                    </div>

                    <div className="form-group">
                      <label>High risk medication?</label>
                      <div className="radio-group">
                        <label className="radio-option">
                          <input
                            type="radio"
                            name="highRiskMedFlag"
                            checked={formData.medication.highRiskMedFlag === true}
                            onChange={() => handleRadioClick('medication', 'highRiskMedFlag', true)}
                            onClick={(e) => {
                              if (formData.medication.highRiskMedFlag === true) {
                                e.preventDefault();
                                handleRadioClick('medication', 'highRiskMedFlag', true);
                              }
                            }}
                          />
                          Yes
                        </label>
                        <label className="radio-option">
                          <input
                            type="radio"
                            name="highRiskMedFlag"
                            checked={formData.medication.highRiskMedFlag === false}
                            onChange={() => handleRadioClick('medication', 'highRiskMedFlag', false)}
                            onClick={(e) => {
                              if (formData.medication.highRiskMedFlag === false) {
                                e.preventDefault();
                                handleRadioClick('medication', 'highRiskMedFlag', false);
                              }
                            }}
                          />
                          No
                        </label>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Vitals Section (includes MMSE now) */}
              <div className="form-section">
                <div 
                  className="section-header"
                  onClick={() => updateFormData('vitals', 'hasReading', !formData.vitals.hasReading)}
                >
                  <h3>Vitals</h3>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={formData.vitals.hasReading}
                      onChange={(e) => updateFormData('vitals', 'hasReading', e.target.checked)}
                    />
                    <span className="toggle-slider"></span>
                    <span className="toggle-label">{formData.vitals.hasReading ? 'Yes' : 'No'}</span>
                  </label>
                </div>

                {formData.vitals.hasReading && (
                  <div className="section-content">
                    <div className="form-group">
                      <label>Body Temperature (°C) *</label>
                      <input
                        type="number"
                        step="0.1"
                        min="30"
                        max="45"
                        value={formData.vitals.bodyTemperature || ""}
                        onChange={(e) => updateFormData('vitals', 'bodyTemperature', e.target.value)}
                        className={`form-input ${validationErrors.bodyTemperature ? 'error' : ''}`}
                        placeholder="36.5"
                      />
                      {validationErrors.bodyTemperature && <span className="error-message">{validationErrors.bodyTemperature}</span>}
                    </div>

                    <div className="form-group">
                      <label>Pulse Rate (bpm) *</label>
                      <input
                        type="number"
                        min="40"
                        max="200"
                        value={formData.vitals.pulseRate || ""}
                        onChange={(e) => updateFormData('vitals', 'pulseRate', e.target.value)}
                        className={`form-input ${validationErrors.pulseRate ? 'error' : ''}`}
                        placeholder="72"
                      />
                      {validationErrors.pulseRate && <span className="error-message">{validationErrors.pulseRate}</span>}
                    </div>

                    <div className="form-group">
                      <label>Respiratory Rate (breaths/min) *</label>
                      <input
                        type="number"
                        min="8"
                        max="40"
                        value={formData.vitals.respiratoryRate || ""}
                        onChange={(e) => updateFormData('vitals', 'respiratoryRate', e.target.value)}
                        className={`form-input ${validationErrors.respiratoryRate ? 'error' : ''}`}
                        placeholder="16"
                      />
                      {validationErrors.respiratoryRate && <span className="error-message">{validationErrors.respiratoryRate}</span>}
                    </div>

                    <div className="form-group">
                      <label>Blood Pressure (mmHg) *</label>
                      <div className="blood-pressure-inputs">
                        <input
                          type="number"
                          min="50"
                          max="300"
                          value={formData.vitals.systolicBP || ""}
                          onChange={(e) => updateFormData('vitals', 'systolicBP', e.target.value)}
                          className={`form-input ${validationErrors.systolicBP ? 'error' : ''}`}
                          placeholder="120"
                        />
                        <span className="bp-separator">/</span>
                        <input
                          type="number"
                          min="30"
                          max="200"
                          value={formData.vitals.diastolicBP || ""}
                          onChange={(e) => updateFormData('vitals', 'diastolicBP', e.target.value)}
                          className={`form-input ${validationErrors.diastolicBP ? 'error' : ''}`}
                          placeholder="80"
                        />
                      </div>
                      {(validationErrors.systolicBP || validationErrors.diastolicBP) && 
                        <span className="error-message">
                          {validationErrors.systolicBP || validationErrors.diastolicBP}
                        </span>
                      }
                    </div>

                    <div className="form-group">
                      <label>Oxygen Saturation (%)</label>
                      <input
                        type="number"
                        min="70"
                        max="100"
                        value={formData.vitals.oxygenSat || ""}
                        onChange={(e) => updateFormData('vitals', 'oxygenSat', e.target.value)}
                        className="form-input"
                        placeholder="98"
                      />
                    </div>
                    <div className="form-group">
                      <label>MMSE Score (0-30)</label>
                      <input
                        type="number"
                        min="0"
                        max="30"
                        value={formData.vitals.mmseScore || ''}
                        onChange={(e) => updateFormData('vitals','mmseScore', e.target.value)}
                        className="form-input"
                        placeholder="24"
                      />
                    </div>
                    {formData.vitals.mmseScore !== '' && (
                      <div className="form-group">
                        <label>Cognitive Impairment</label>
                        <div className="info-text">
                          {parseInt(formData.vitals.mmseScore,10) < 24 ? 'Flagged (MMSE < 24)' : 'Not Flagged'}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Mobility & Physical Status Section */}
              <div className="form-section">
                <div 
                  className="section-header"
                  onClick={() => updateFormData('mobility', 'hasAssessment', !formData.mobility.hasAssessment)}
                >
                  <h3>Mobility & Physical Status</h3>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={formData.mobility.hasAssessment}
                      onChange={(e) => updateFormData('mobility', 'hasAssessment', e.target.checked)}
                    />
                    <span className="toggle-slider"></span>
                    <span className="toggle-label">{formData.mobility.hasAssessment ? 'Yes' : 'No'}</span>
                  </label>
                </div>

                {formData.mobility.hasAssessment && (
                  <div className="section-content">
                    <div className="form-group">
                      <label>Mobility Level</label>
                      <select
                        value={formData.mobility.mobilityLevel}
                        onChange={(e) => updateFormData('mobility', 'mobilityLevel', e.target.value)}
                        className="form-select"
                      >
                        <option value="">Select mobility level</option>
                        {MOBILITY_LEVELS.map(level => (
                          <option key={level} value={level}>{level}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Use of aid?</label>
                      <div className="radio-group">
                        <label className="radio-option">
                          <input
                            type="radio"
                            name="useOfAid"
                            checked={formData.mobility.useOfAid === true}
                            onChange={() => handleRadioClick('mobility', 'useOfAid', true)}
                            onClick={(e) => {
                              if (formData.mobility.useOfAid === true) {
                                e.preventDefault();
                                handleRadioClick('mobility', 'useOfAid', true);
                              }
                            }}
                          />
                          Yes
                        </label>
                        <label className="radio-option">
                          <input
                            type="radio"
                            name="useOfAid"
                            checked={formData.mobility.useOfAid === false}
                            onChange={() => handleRadioClick('mobility', 'useOfAid', false)}
                            onClick={(e) => {
                              if (formData.mobility.useOfAid === false) {
                                e.preventDefault();
                                handleRadioClick('mobility', 'useOfAid', false);
                              }
                            }}
                          />
                          No
                        </label>
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Dizziness observed?</label>
                      <div className="radio-group">
                        <label className="radio-option">
                          <input
                            type="radio"
                            name="dizzinessFlag"
                            checked={formData.mobility.dizzinessFlag === true}
                            onChange={() => handleRadioClick('mobility', 'dizzinessFlag', true)}
                            onClick={(e) => {
                              if (formData.mobility.dizzinessFlag === true) {
                                e.preventDefault();
                                handleRadioClick('mobility', 'dizzinessFlag', true);
                              }
                            }}
                          />
                          Yes
                        </label>
                        <label className="radio-option">
                          <input
                            type="radio"
                            name="dizzinessFlag"
                            checked={formData.mobility.dizzinessFlag === false}
                            onChange={() => handleRadioClick('mobility', 'dizzinessFlag', false)}
                            onClick={(e) => {
                              if (formData.mobility.dizzinessFlag === false) {
                                e.preventDefault();
                                handleRadioClick('mobility', 'dizzinessFlag', false);
                              }
                            }}
                          />
                          No
                        </label>
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Unsteady gait observed?</label>
                      <div className="radio-group">
                        <label className="radio-option">
                          <input
                            type="radio"
                            name="unsteadyGaitFlag"
                            checked={formData.mobility.unsteadyGaitFlag === true}
                            onChange={() => handleRadioClick('mobility', 'unsteadyGaitFlag', true)}
                            onClick={(e) => {
                              if (formData.mobility.unsteadyGaitFlag === true) {
                                e.preventDefault();
                                handleRadioClick('mobility', 'unsteadyGaitFlag', true);
                              }
                            }}
                          />
                          Yes
                        </label>
                        <label className="radio-option">
                          <input
                            type="radio"
                            name="unsteadyGaitFlag"
                            checked={formData.mobility.unsteadyGaitFlag === false}
                            onChange={() => handleRadioClick('mobility', 'unsteadyGaitFlag', false)}
                            onClick={(e) => {
                              if (formData.mobility.unsteadyGaitFlag === false) {
                                e.preventDefault();
                                handleRadioClick('mobility', 'unsteadyGaitFlag', false);
                              }
                            }}
                          />
                          No
                        </label>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="bottom-bar">
        <button 
          className="save-next-button"
          onClick={handleSaveAndNext}
          disabled={saving || loading}
        >
          {saving ? 'Saving...' : 'Save & Next'}
        </button>
      </div>

      {/* Resident Form Modal */}
      {showResidentModal && (
        <div className="modal-overlay">
          <div className="modal-content resident-modal">
            <h3>{isEditingResident ? 'Edit Resident' : 'Add New Resident'}</h3>
            <form className="resident-form">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="fullName">Full Name *</label>
                  <input
                    type="text"
                    id="fullName"
                    name="fullName"
                    value={residentFormData.fullName}
                    onChange={handleResidentFormChange}
                    className={residentValidationErrors.fullName ? 'error' : ''}
                    required
                  />
                  {residentValidationErrors.fullName && <span className="error-message">{residentValidationErrors.fullName}</span>}
                </div>
                <div className="form-group">
                  <label htmlFor="dateOfBirth">Date of Birth *</label>
                  <input
                    type="date"
                    id="dateOfBirth"
                    name="dateOfBirth"
                    value={residentFormData.dateOfBirth}
                    onChange={handleResidentFormChange}
                    className={residentValidationErrors.dateOfBirth ? 'error' : ''}
                    required
                  />
                  {residentValidationErrors.dateOfBirth && <span className="error-message">{residentValidationErrors.dateOfBirth}</span>}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="gender">Gender *</label>
                  <select
                    id="gender"
                    name="gender"
                    value={residentFormData.gender}
                    onChange={handleResidentFormChange}
                    className={residentValidationErrors.gender ? 'error' : ''}
                    required
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                  </select>
                  {residentValidationErrors.gender && <span className="error-message">{residentValidationErrors.gender}</span>}
                </div>
                <div className="form-group">
                  <label htmlFor="careLevel">Care Level *</label>
                  <select
                    id="careLevel"
                    name="careLevel"
                    value={residentFormData.careLevel}
                    onChange={handleResidentFormChange}
                    className={residentValidationErrors.careLevel ? 'error' : ''}
                    required
                  >
                    <option value="">Select Care Level</option>
                    <option value="Independent">Independent</option>
                    <option value="Assisted">Assisted</option>
                    <option value="Memory Care">Memory Care</option>
                    <option value="Skilled Nursing">Skilled Nursing</option>
                  </select>
                  {residentValidationErrors.careLevel && <span className="error-message">{residentValidationErrors.careLevel}</span>}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="emergencyContact">Emergency Contact *</label>
                  <input
                    type="text"
                    id="emergencyContact"
                    name="emergencyContact"
                    value={residentFormData.emergencyContact}
                    onChange={handleResidentFormChange}
                    className={residentValidationErrors.emergencyContact ? 'error' : ''}
                    required
                  />
                  {residentValidationErrors.emergencyContact && <span className="error-message">{residentValidationErrors.emergencyContact}</span>}
                </div>
                <div className="form-group">
                  <label htmlFor="emergencyPhone">Emergency Phone *</label>
                  <input
                    type="tel"
                    id="emergencyPhone"
                    name="emergencyPhone"
                    value={residentFormData.emergencyPhone}
                    onChange={handleResidentFormChange}
                    className={residentValidationErrors.emergencyPhone ? 'error' : ''}
                    required
                  />
                  {residentValidationErrors.emergencyPhone && <span className="error-message">{residentValidationErrors.emergencyPhone}</span>}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="residence">Residence *</label>
                  <input
                    type="text"
                    id="residence"
                    name="residence"
                    value={residentFormData.residence}
                    onChange={handleResidentFormChange}
                    placeholder="e.g., Sunrise Senior Living"
                    className={residentValidationErrors.residence ? 'error' : ''}
                    required
                  />
                  {residentValidationErrors.residence && <span className="error-message">{residentValidationErrors.residence}</span>}
                </div>
                <div className="form-group">
                  <label htmlFor="roomUnit">Room/Unit *</label>
                  <input
                    type="text"
                    id="roomUnit"
                    name="roomUnit"
                    value={residentFormData.roomUnit}
                    onChange={handleResidentFormChange}
                    placeholder="e.g., Room 205A"
                    className={residentValidationErrors.roomUnit ? 'error' : ''}
                    required
                  />
                  {residentValidationErrors.roomUnit && <span className="error-message">{residentValidationErrors.roomUnit}</span>}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="moveInDate">Move-in Date *</label>
                  <input
                    type="date"
                    id="moveInDate"
                    name="moveInDate"
                    value={residentFormData.moveInDate}
                    onChange={handleResidentFormChange}
                    className={residentValidationErrors.moveInDate ? 'error' : ''}
                    required
                  />
                  {residentValidationErrors.moveInDate && <span className="error-message">{residentValidationErrors.moveInDate}</span>}
                </div>
                <div className="form-group">
                  {/* Empty space for alignment */}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="baselineMmse">Baseline MMSE</label>
                  <input
                    type="number"
                    id="baselineMmse"
                    name="baselineMmse"
                    min="0"
                    max="30"
                    value={residentFormData.baselineMmse}
                    onChange={handleResidentFormChange}
                    placeholder="25"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="diagnoses">Diagnoses</label>
                  <input
                    type="text"
                    id="diagnoses"
                    name="diagnoses"
                    value={residentFormData.diagnoses}
                    onChange={handleResidentFormChange}
                    placeholder="e.g., HTN, DM2"
                  />
                </div>
              </div>
            </form>

            <div className="modal-actions">
              <button 
                type="button"
                className="btn-cancel"
                onClick={closeResidentModal}
              >
                Cancel
              </button>
              <button 
                type="button"
                className="btn-confirm"
                onClick={saveResident}
              >
                {isEditingResident ? 'Save Changes' : 'Add Resident'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Unsaved Changes</h3>
            <p>You have unsaved changes for {selectedResident.name}. Are you sure you want to discard these changes and switch to {pendingResident?.name}?</p>
            <div className="modal-actions">
              <button 
                className="btn-cancel"
                onClick={cancelResidentChange}
              >
                Stay Here
              </button>
              <button 
                className="btn-confirm"
                style={{ backgroundColor: '#dc3545' }}
                onClick={discardAndSwitchResident}
              >
                Discard Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Delete Resident</h3>
            <p>Are you sure you want to delete <strong>{residentToDelete?.name}</strong>? This action cannot be undone.</p>
            <div className="modal-actions">
              <button 
                className="btn-cancel"
                onClick={cancelDelete}
              >
                Cancel
              </button>
              <button 
                className="btn-confirm"
                style={{ backgroundColor: '#dc3545' }}
                onClick={confirmDelete}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResidentCareForm;