package com.example.backend.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ShiftObservation {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "resident_id")
    private Long residentId;
    @Column(name = "shift_worker_id")
    private Long shiftWorkerId;
    private LocalDateTime timestamp;
    // Time of day bucket (Morning, Afternoon, Evening, Night) for shift context
    @Column(name = "time_of_day")
    private String timeOfDay;

    // Falls/Stability Section
    private Boolean fallsHasEvent;
    private String fallsEventType;  // "No fall (instability)", "Assisted fall", "Unwitnessed fall", "Witnessed fall"
    private String fallsLocation;
    private String fallsContributingFactors;
    private Boolean fallsAssistiveDeviceUsed;
    private String fallsInjury;

    // Mood Section
    private Boolean moodHasChange;
    private String moodBaseline;  // "Happier than usual", "Sad/tearful", "Agitated/irritable", "Withdrawn/quiet"
    @Column(length = 500)
    private String moodTriggers;  // Comma-separated list
    private String moodOtherTrigger;
    private Integer moodSeverity;  // 1, 2, or 3
    @Lob
    private String moodNotes;

    // Medication Section
    private Boolean medicationHasIssue;
    private String medicationName;
    private String medicationAction;  // "Taken", "Refused", "Partially taken", "Delayed"
    private String medicationReason;
    private String medicationStaffAction;  // "Reoffered", "Reported", "Documented only"

    // Vital Signs
    @Column(name = "bp_systolic")
    private Integer bpSystolic;  // Systolic blood pressure
    @Column(name = "bp_diastolic")
    private Integer bpDiastolic;  // Diastolic blood pressure
    @Column(name = "heart_rate")
    private Integer heartRate;  // Heart rate (bpm) - also called pulseRate in frontend
    @Column(name = "respiratory_rate")
    private Integer respiratoryRate;  // Respiratory rate (breaths/min)
    @Column(name = "oxygen_sat")
    private Integer oxygenSat;  // Oxygen saturation (%)
    private Double temperature;  // Body temperature (°C) - called bodyTemperature in frontend
    @Column(name = "pain_score")
    private Integer painScore;  // Pain level (0-10 scale)

    // Cognitive Assessment
    @Column(name = "mmse_score")
    private Integer mmseScore;  // Mini-Mental State Examination score (0-30)
    @Column(name = "cognitive_impairment_flag")
    private Boolean cognitiveImpairmentFlag;  // Cognitive impairment indicator

    // Mobility & Physical Status
    // 0=Independent, 1=Supervision required, 2=Partial assistance, 3=Full assistance, 4=Bedbound
    @Column(name = "mobility_level")
    private Integer mobilityLevel;
    @Column(name = "use_of_aid")
    private Boolean useOfAid;  // Whether assistive device is being used
    @Column(name = "dizziness_flag")
    private Boolean dizzinessFlag;  // Dizziness indicator
    @Column(name = "unsteady_gait_flag")
    private Boolean unsteadyGaitFlag;  // Gait stability indicator

    // Medication Analytics
    @Column(name = "polypharmacy_count")
    private Integer polypharmacyCount;  // Number of medications
    @Column(name = "high_risk_med_flag")
    private Boolean highRiskMedFlag;  // High-risk medication indicator

    // Mood Behavioral Flags (derived from moodBaseline)
    @Column(name = "confusion_flag")
    private Boolean confusionFlag;  // Set when "Confused/Wandering"
    @Column(name = "agitation_flag")
    private Boolean agitationFlag;  // Set when "Agitated/irritable"
    @Column(name = "depression_flag")
    private Boolean depressionFlag;  // Set when "Sad/tearful"
    @Column(name = "happy_flag")
    private Boolean happyFlag;  // Set when "Happier than usual"
    @Column(name = "withdrawn_flag")
    private Boolean withdrawnFlag;  // Set when "Withdrawn/quiet"

    // Derived Clinical Flags & Analytics
    @Column(name = "hypotension_flag")
    private Boolean hypotensionFlag; // Systolic <90 or Diastolic <60
    @Column(name = "tachycardia_flag")
    private Boolean tachycardiaFlag; // HeartRate >100
    @Column(name = "hypoxia_flag")
    private Boolean hypoxiaFlag;     // OxygenSat <90
    @Column(name = "fever_flag")
    private Boolean feverFlag;       // Temperature >37.5°C

    // 7-Day Rolling Statistics
    @Column(name = "hr_7d_mean")
    private Double hr7dMean;         // Mean heart rate last 7 days
    @Column(name = "sbp_7d_mean")
    private Double sbp7dMean;        // Mean systolic BP last 7 days
    @Column(name = "hr_7d_delta")
    private Double hr7dDelta;        // Change vs previous 7-day window
    @Column(name = "sbp_7d_delta")
    private Double sbp7dDelta;       // Change vs previous 7-day window

    // Fall & Medication Risk Metrics
    @Column(name = "prior_fall_90d")
    private Integer priorFall90d;    // Count of falls in previous 90 days
    @Column(name = "fall_next_7d")
    private Double fallNext7d;       // Model predicted fall probability next 7 days
    @Column(name = "missed_dose_ratio_7d")
    private Double missedDoseRatio7d; // Missed medication doses / total doses last 7 days
}