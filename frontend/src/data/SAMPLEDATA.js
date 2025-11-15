export const FALL_EVENT_TYPES = [
  "No fall (instability)",
  "Assisted fall", 
  "Unwitnessed fall",
  "Witnessed fall"
];

export const MOOD_BASELINE_OPTIONS = [
  "Happier than usual",
  "Sad/tearful", 
  "Agitated/irritable",
  "Withdrawn/quiet",
  "Confused/Wandering"
];

export const MOOD_TRIGGERS = [
  "Staff interaction",
  "Roommate",
  "Pain",
  "Sleep",
  "Family visit",
  "Activity cancelled",
  "Poor appetite",
  "Device not used",
  "Rushed",
  "Unknown"
];

export const MEDICATION_ACTIONS = [
  "Taken",
  "Refused",
  "Partially taken", 
  "Delayed"
];

export const STAFF_ACTIONS = [
  "Reoffered",
  "Reported", 
  "Documented only"
];

export const MOBILITY_LEVELS = [
  "Independent",
  "Supervision required",
  "Partial assistance",
  "Full assistance",
  "Bedbound"
];

// Initial form state for a resident
export const INITIAL_FORM_STATE = {
  fallsStability: {
    hasEvent: false,
    eventType: "",
    location: "",
    contributingFactors: "",
    assistiveDeviceUsed: null,
    injury: "",
    painScore: "" // Moved pain score under Falls/Stability
  },
  mood: {
    hasChange: false,
    baseline: "",
    triggers: [],
    otherTrigger: "",
    severity: null,
    notes: ""
  },
  medication: {
    hasIssue: false,
    medicationName: "",
    action: "",
    reason: "",
    staffAction: "",
    polypharmacyCount: "",
    highRiskMedFlag: null
  },
  vitals: {
    hasReading: false,
    bodyTemperature: "",
    pulseRate: "",
    respiratoryRate: "",
    systolicBP: "",
    diastolicBP: "",
    oxygenSat: "",
    mmseScore: "" // Moved MMSE score into vitals section
  },
  mobility: {
    hasAssessment: false,
    mobilityLevel: "",
    useOfAid: null,
    dizzinessFlag: null,
    unsteadyGaitFlag: null
  }
};