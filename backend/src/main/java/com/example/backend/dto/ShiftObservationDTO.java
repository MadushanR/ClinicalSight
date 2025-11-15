package com.example.backend.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ShiftObservationDTO {
    private Long id;
    private Long residentId;
    private Long shiftWorkerId;

    // Falls/Stability Section
    private Boolean fallsHasEvent;
    private String fallsEventType;
    private String fallsLocation;
    private String fallsContributingFactors;
    private Boolean fallsAssistiveDeviceUsed;
    private String fallsInjury;

    // Mood Section
    private Boolean moodHasChange;
    private String moodBaseline;
    private String moodTriggers;
    private String moodOtherTrigger;
    private Integer moodSeverity;
    private String moodNotes;

    // Medication Section
    private Boolean medicationHasIssue;
    private String medicationName;
    private String medicationAction;
    private String medicationReason;
    private String medicationStaffAction;
    private Integer polypharmacyCount;
    private Boolean highRiskMedFlag;

    // Vital Signs
    private Integer bpSystolic;
    private Integer bpDiastolic;
    private Integer heartRate;
    private Integer respiratoryRate;
    private Integer oxygenSat;
    private Double temperature;
    private Integer painScore;

    // Cognitive Assessment
    private Integer mmseScore;
    private Boolean cognitiveImpairmentFlag;

    // Mobility & Physical Status (mobilityLevel comes as String from frontend)
    private String mobilityLevel;  // Frontend sends: "Independent", "Supervision required", etc.
    private Boolean useOfAid;
    private Boolean dizzinessFlag;
    private Boolean unsteadyGaitFlag;
}
