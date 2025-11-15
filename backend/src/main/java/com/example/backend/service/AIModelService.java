package com.example.backend.service;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import com.example.backend.model.Resident;
import com.example.backend.model.ShiftObservation;
import com.example.backend.repository.ResidentRepository;
import com.example.backend.repository.ShiftObservationRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AIModelService {
    
    private final RestTemplate restTemplate = new RestTemplate();
    private final ShiftObservationRepository shiftObservationRepository;
    private final ResidentRepository residentRepository;
    
    // AI model endpoint URLs
    private static final String FALL_PREDICTION_URL = "http://localhost:5000/fall/predict";
    private static final String MOOD_PREDICTION_URL = "http://localhost:5000/mood/predict";
    private static final String MEDICATION_ADHERENCE_URL = "http://localhost:5000/medication/adherence";
    
    /**
     * Calculate age group for fall risk model
     * 0: < 65 years, 1: 65-74 years, 2: 75-84 years, 3: 85+ years
     */
    private int calculateAgeGroup(Integer age) {
        if (age == null) return 2; // Default to 75-84 age group
        if (age < 65) return 0;
        if (age < 75) return 1;
        if (age < 85) return 2;
        return 3;
    }
    
    /**
     * Convert mobility level integer to string for AI model
     */
    private String convertMobilityLevel(Integer level) {
        if (level == null) return "Independent";
        switch (level) {
            case 0: return "Independent";
            case 1: return "Independent with aid";
            case 2: return "Requires some assistance";
            case 3: return "Requires significant assistance";
            case 4: return "Bedbound";
            default: return "Independent";
        }
    }
    
    /**
     * Get last 7 days of shift observations for a resident and prepare features for FALL RISK model
     */
    private List<Map<String, Object>> getFallRiskFeatures(Long residentId) {
        LocalDateTime sevenDaysAgo = LocalDateTime.now().minusDays(7);
        List<ShiftObservation> observations = shiftObservationRepository
                .findByResidentIdOrderByTimestampDesc(residentId);
        
        // Get resident for age group
        Resident resident = residentRepository.findById(residentId).orElse(null);
        int ageGroup = calculateAgeGroup(resident != null ? resident.getAge() : null);
        
        return observations.stream()
                .filter(obs -> obs.getTimestamp() != null && obs.getTimestamp().isAfter(sevenDaysAgo))
                .map(obs -> {
                    Map<String, Object> features = new HashMap<>();
                    
                    // Fall risk model features (matching Python model exactly)
                    features.put("has_fall_event", obs.getFallsHasEvent() != null ? obs.getFallsHasEvent() : false);
                    features.put("mobility_level", convertMobilityLevel(obs.getMobilityLevel()));
                    features.put("use_of_aid", obs.getUseOfAid() != null ? obs.getUseOfAid() : false);
                    features.put("dizziness_flag", obs.getDizzinessFlag() != null ? obs.getDizzinessFlag() : false);
                    features.put("unsteady_gait_flag", obs.getUnsteadyGaitFlag() != null ? obs.getUnsteadyGaitFlag() : false);
                    features.put("mmse_score", obs.getMmseScore() != null ? obs.getMmseScore() : 25);
                    features.put("cognitive_impairment_flag", obs.getCognitiveImpairmentFlag() != null ? obs.getCognitiveImpairmentFlag() : false);
                    features.put("confusion_flag", obs.getConfusionFlag() != null ? obs.getConfusionFlag() : false);
                    features.put("polypharmacy_count", obs.getPolypharmacyCount() != null ? obs.getPolypharmacyCount() : 3);
                    features.put("high_risk_med_flag", obs.getHighRiskMedFlag() != null ? obs.getHighRiskMedFlag() : false);
                    features.put("bp_systolic", obs.getBpSystolic() != null ? obs.getBpSystolic() : 120);
                    features.put("oxygen_sat", obs.getOxygenSat() != null ? obs.getOxygenSat() : 96);
                    features.put("agitation_flag", obs.getAgitationFlag() != null ? obs.getAgitationFlag() : false);
                    features.put("withdrawn_flag", obs.getWithdrawnFlag() != null ? obs.getWithdrawnFlag() : false);
                    features.put("age_group", ageGroup);
                    
                    return features;
                })
                .collect(Collectors.toList());
    }
    
    /**
     * Get last 7 days of shift observations for a resident and prepare features for MOOD model
     */
    private List<Map<String, Object>> getMoodFeatures(Long residentId) {
        LocalDateTime sevenDaysAgo = LocalDateTime.now().minusDays(7);
        List<ShiftObservation> observations = shiftObservationRepository
                .findByResidentIdOrderByTimestampDesc(residentId);
        
        return observations.stream()
                .filter(obs -> obs.getTimestamp() != null && obs.getTimestamp().isAfter(sevenDaysAgo))
                .map(obs -> {
                    Map<String, Object> features = new HashMap<>();
                    
                    // Mood model features (matching Python model exactly)
                    features.put("confusion_flag", obs.getConfusionFlag() != null ? obs.getConfusionFlag() : false);
                    features.put("agitation_flag", obs.getAgitationFlag() != null ? obs.getAgitationFlag() : false);
                    features.put("depression_flag", obs.getDepressionFlag() != null ? obs.getDepressionFlag() : false);
                    features.put("happy_flag", obs.getHappyFlag() != null ? obs.getHappyFlag() : false);
                    features.put("withdrawn_flag", obs.getWithdrawnFlag() != null ? obs.getWithdrawnFlag() : false);
                    features.put("has_mood_change", obs.getMoodHasChange() != null ? obs.getMoodHasChange() : false);
                    features.put("mood_baseline", obs.getMoodBaseline() != null ? obs.getMoodBaseline() : "Normal");
                    features.put("mood_severity", obs.getMoodSeverity() != null ? obs.getMoodSeverity() : 0);
                    features.put("mood_triggers", obs.getMoodTriggers() != null ? obs.getMoodTriggers() : "");
                    
                    return features;
                })
                .collect(Collectors.toList());
    }
    
    /**
     * Get fall risk prediction from AI model
     * Returns probability of falling in next 7 days (0.0 to 1.0)
     */
    public Double getFallRiskPrediction(Long residentId) {
        try {
            if (residentId == null) {
                return 0.0;
            }
            
            List<Map<String, Object>> features = getFallRiskFeatures(residentId);
            
            if (features == null || features.isEmpty()) {
                return 0.0; // No data to predict from
            }
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            
            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("features", features);
            
            HttpEntity<Map<String, Object>> request = new HttpEntity<>(requestBody, headers);
            
            @SuppressWarnings("unchecked")
            ResponseEntity<Map<String, Object>> response = (ResponseEntity<Map<String, Object>>) (ResponseEntity<?>) restTemplate.exchange(
                FALL_PREDICTION_URL,
                HttpMethod.POST,
                request,
                Map.class
            );
            
            Map<String, Object> result = response.getBody();
            if (result != null && result.containsKey("fall_risk_probability")) {
                Object probability = result.get("fall_risk_probability");
                if (probability instanceof Number) {
                    return ((Number) probability).doubleValue();
                }
            }
            
            return 0.0;
            
        } catch (Exception e) {
            System.err.println("Error calling fall risk prediction model: " + e.getMessage());
            return 0.0;
        }
    }
    
    /**
     * Get mood summary from AI model
     * Returns text summary of mood changes in last 7 days
     */
    public String getMoodSummary(Long residentId) {
        try {
            if (residentId == null) {
                return "No recent mood data available.";
            }
            
            List<Map<String, Object>> features = getMoodFeatures(residentId);
            
            if (features == null || features.isEmpty()) {
                return "No recent mood data available.";
            }
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            
            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("features", features);
            
            HttpEntity<Map<String, Object>> request = new HttpEntity<>(requestBody, headers);
            
            @SuppressWarnings("unchecked")
            ResponseEntity<Map<String, Object>> response = (ResponseEntity<Map<String, Object>>) (ResponseEntity<?>) restTemplate.exchange(
                MOOD_PREDICTION_URL,
                HttpMethod.POST,
                request,
                Map.class
            );
            
            Map<String, Object> result = response.getBody();
            if (result != null && result.containsKey("mood_changes")) {
                return (String) result.get("mood_changes");
            }
            
            return "No mood changes detected";
            
        } catch (Exception e) {
            System.err.println("Error calling mood prediction model: " + e.getMessage());
            return "Mood analysis unavailable";
        }
    }
    
    /**
     * Get last 7 days of shift observations for medication adherence analysis
     */
    private List<Map<String, Object>> getMedicationAdherenceFeatures(Long residentId) {
        LocalDateTime sevenDaysAgo = LocalDateTime.now().minusDays(7);
        List<ShiftObservation> observations = shiftObservationRepository
                .findByResidentIdOrderByTimestampDesc(residentId);
        
        return observations.stream()
                .filter(obs -> obs.getTimestamp() != null && obs.getTimestamp().isAfter(sevenDaysAgo))
                .map(obs -> {
                    Map<String, Object> features = new HashMap<>();
                    
                    // Medication adherence features
                    boolean medicationRefused = obs.getMedicationHasIssue() != null && 
                                                obs.getMedicationHasIssue() && 
                                                "Refused".equals(obs.getMedicationAction());
                    
                    features.put("medication_refused", medicationRefused);
                    features.put("refusal_reason", obs.getMedicationReason() != null ? obs.getMedicationReason() : "");
                    features.put("observation_time", obs.getTimeOfDay() != null ? obs.getTimeOfDay() : "");
                    
                    return features;
                })
                .collect(Collectors.toList());
    }
    
    /**
     * Get medication adherence summary from AI model
     * Returns comprehensive adherence analysis with patterns and recommendations
     */
    public Map<String, Object> getMedicationAdherenceSummary(Long residentId) {
        try {
            if (residentId == null) {
                Map<String, Object> emptyResult = new HashMap<>();
                emptyResult.put("adherence_summary", "No resident data available.");
                emptyResult.put("adherence_rate", 0.0);
                emptyResult.put("concern_level", "no_data");
                return emptyResult;
            }
            
            List<Map<String, Object>> features = getMedicationAdherenceFeatures(residentId);
            
            if (features == null || features.isEmpty()) {
                Map<String, Object> emptyResult = new HashMap<>();
                emptyResult.put("adherence_summary", "No medication data available.");
                emptyResult.put("adherence_rate", 100.0);
                emptyResult.put("concern_level", "no_data");
                return emptyResult;
            }
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            
            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("features", features);
            
            HttpEntity<Map<String, Object>> request = new HttpEntity<>(requestBody, headers);
            
            @SuppressWarnings("unchecked")
            ResponseEntity<Map<String, Object>> response = (ResponseEntity<Map<String, Object>>) (ResponseEntity<?>) restTemplate.exchange(
                MEDICATION_ADHERENCE_URL,
                HttpMethod.POST,
                request,
                Map.class
            );
            
            Map<String, Object> result = response.getBody();
            if (result != null) {
                return result;
            }
            
            Map<String, Object> defaultResult = new HashMap<>();
            defaultResult.put("adherence_summary", "Unable to analyze medication adherence.");
            defaultResult.put("adherence_rate", 0.0);
            defaultResult.put("concern_level", "unknown");
            return defaultResult;
            
        } catch (Exception e) {
            System.err.println("Error calling medication adherence model: " + e.getMessage());
            Map<String, Object> errorResult = new HashMap<>();
            errorResult.put("adherence_summary", "Medication adherence analysis unavailable.");
            errorResult.put("adherence_rate", 0.0);
            errorResult.put("concern_level", "error");
            return errorResult;
        }
    }
}
