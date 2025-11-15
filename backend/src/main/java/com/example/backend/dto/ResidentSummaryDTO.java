package com.example.backend.dto;
import lombok.Builder;
import lombok.Data;

// DTO for the Home Page (List View)
@Data
@Builder
public class ResidentSummaryDTO {
    private Long residentId;
    private String residentName;
    private String roomNumber;
    private String attentionFlag; // "Yes" or "No" based on AI Score
    private String riskLevel; // e.g., "High", "Medium", "Low"
    private Boolean moodChanges; // True if recent mood changes in shift observations
    
    // AI Model Predictions
    private Double fallRiskProbability; // AI predicted fall risk (0.0 to 1.0)
    private String aiMoodPrediction; // AI predicted mood classification
    private String aiRecommendation; // AI recommendation text
    
    // Medication Adherence Analysis
    private String medicationAdherenceSummary; // AI medication adherence summary
    private Double medicationAdherenceRate; // Adherence percentage (0-100)
    private String medicationConcernLevel; // "low", "moderate", "high", "critical"
}
