package com.example.backend.service;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import com.example.backend.dto.ResidentSummaryDTO;
import com.example.backend.model.Resident;
import com.example.backend.model.ShiftObservation;
import com.example.backend.model.ShiftReport;
import com.example.backend.repository.ResidentRepository;
import com.example.backend.repository.ShiftObservationRepository;
import com.example.backend.repository.ShiftReportRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class WellnessService {

    private final ResidentRepository residentRepository;
    private final ShiftReportRepository shiftReportRepository;
    private final ShiftObservationRepository shiftObservationRepository;
    private final AIModelService aiModelService;

    // --- Core AI Model Simulation Logic ---

    /**
     * Determines risk level using BOTH AI fall prediction and clinical vitals.
     * Combines machine learning prediction with traditional clinical indicators
     * for comprehensive risk assessment.
     */
    private String determineRiskLevel(Resident resident, Double fallRiskProbability) {
        // Get most recent shift observation for vitals
        List<ShiftObservation> observations = shiftObservationRepository
                .findByResidentIdOrderByTimestampDesc(resident.getId());
        ShiftObservation latest = observations.stream().findFirst().orElse(null);

        // Start with AI fall risk assessment (primary indicator)
        int riskScore = 0;
        if (fallRiskProbability != null) {
            if (fallRiskProbability >= 0.7) riskScore += 4;      // High AI fall risk
            else if (fallRiskProbability >= 0.4) riskScore += 2; // Medium AI fall risk
            else if (fallRiskProbability >= 0.2) riskScore += 1; // Low-Medium AI fall risk
        }

        // Add clinical vitals indicators (if recent observation exists)
        if (latest != null) {
            if (latest.getTemperature() != null && latest.getTemperature() >= 38.0) riskScore += 3; // Fever
            if (latest.getBpSystolic() != null && (latest.getBpSystolic() < 100 || latest.getBpSystolic() > 160)) riskScore += 2; // BP out of range
            if (latest.getHeartRate() != null && (latest.getHeartRate() > 100 || latest.getHeartRate() < 60)) riskScore += 1; // HR abnormal
            if (latest.getOxygenSat() != null && latest.getOxygenSat() < 90) riskScore += 2; // Low oxygen

            // Check for fall events within last 3 days only
            if (Boolean.TRUE.equals(latest.getFallsHasEvent()) &&
                    latest.getTimestamp() != null &&
                    latest.getTimestamp().isAfter(LocalDateTime.now().minusDays(3))) {
                riskScore += 3; // Recent fall event (within 3 days)
            }
        }

        // Determine risk level from combined score
        if (riskScore >= 6) return "High";
        if (riskScore >= 3) return "Medium";
        return "Low";
    }

    // --- Controller-Facing Methods ---

    /**
     * Retrieves the data for the Home Page (List View) with optional filtering.
     */
    public List<ResidentSummaryDTO> getAllResidentSummaries(String filter) {
        return residentRepository.findAll().stream()
                // Legacy filter flags removed from Resident; ignore filter and return all
                .filter(resident -> true)
                .map(resident -> {
                    // Get AI model predictions FIRST (used in risk level calculation)
                    Double fallRiskProbability = aiModelService.getFallRiskPrediction(resident.getId());
                    String moodSummary = aiModelService.getMoodSummary(resident.getId());
                    Map<String, Object> medicationAdherence = aiModelService.getMedicationAdherenceSummary(resident.getId());

                    // Determine risk level using AI prediction + clinical vitals
                    String riskLevel = determineRiskLevel(resident, fallRiskProbability);
                    // Medication concern level extracted early for unified attention logic
                    String medConcern = (String) medicationAdherence.get("concern_level");

                    // Attention flag (original logic restored):
                    // Set to "Yes" if ANY of:
                    //  - riskLevel is High OR Medium
                    //  - fallRiskProbability >= 0.50 (AI model elevated risk)
                    //  - medication concern level is high or critical
                    String attentionFlag = "No";
                    if ("High".equals(riskLevel) || "Medium".equals(riskLevel)) {
                        attentionFlag = "Yes";
                    } else if (fallRiskProbability != null && fallRiskProbability >= 0.50) {
                        attentionFlag = "Yes";
                    }
                    if ("high".equals(medConcern) || "critical".equals(medConcern)) {
                        attentionFlag = "Yes";
                    }

                    // Check for recent mood changes in shift observations (last 7 days)
                    LocalDateTime sevenDaysAgo = LocalDateTime.now().minusDays(7);
                    List<ShiftObservation> recentObservations = shiftObservationRepository
                            .findByResidentIdOrderByTimestampDesc(resident.getId());

                    boolean hasMoodChanges = recentObservations.stream()
                            .filter(obs -> obs.getTimestamp() != null && obs.getTimestamp().isAfter(sevenDaysAgo))
                            .anyMatch(obs -> Boolean.TRUE.equals(obs.getMoodHasChange()));

                    // Extract medication adherence data
                    String medAdherenceSummary = (String) medicationAdherence.get("adherence_summary");
                    Double medAdherenceRate = medicationAdherence.get("adherence_rate") instanceof Number ?
                            ((Number) medicationAdherence.get("adherence_rate")).doubleValue() : 0.0;

                    return ResidentSummaryDTO.builder()
                            .residentId(resident.getId())
                            .residentName(resident.getName())
                            .roomNumber(resident.getRoomNumber())
                            .riskLevel(riskLevel)
                            .attentionFlag(attentionFlag)
                            .moodChanges(hasMoodChanges)
                            .fallRiskProbability(fallRiskProbability)
                            .aiMoodPrediction(moodSummary)
                            .medicationAdherenceSummary(medAdherenceSummary)
                            .medicationAdherenceRate(medAdherenceRate)
                            .medicationConcernLevel(medConcern)
                            .build();
                })
                .collect(Collectors.toList());
    }

    /**
     * Get all residents with care flags for ResidentCareForm.
     */
    public List<Resident> getAllResidentsWithFlags() {
        return residentRepository.findAll();
    }

    /**
     * Retrieves detailed data for the Resident Data Page.
     */
    public Optional<Resident> getResidentDetails(Long residentId) {
        if (residentId == null) return Optional.empty();
        return residentRepository.findById(residentId);
    }

    /**
     * Handles the saving of the Shift Report (unstructured data).
     */
    public ShiftReport submitShiftReport(Long residentId, Long shiftWorkerId, String reportText) {
        ShiftReport report = new ShiftReport();
        report.setResidentId(residentId);
        report.setShiftWorkerId(shiftWorkerId);
        report.setReportTime(LocalDateTime.now());
        report.setReportText(reportText);

        // Save the unstructured data, which will be ingested by the AI pipeline later.
        return shiftReportRepository.save(report);
    }

    public List<ShiftReport> getResidentShiftHistory(Long residentId) {
        return shiftReportRepository.findByResidentIdOrderByReportTimeDesc(residentId);
    }

    /**
     * Creates a new resident.
     */
    public Resident createResident(Resident resident) {
        if (resident.getBaselineMmse() == null) {
            resident.setBaselineMmse(25); // default baseline cognitive score
        }
        resident.setLastUpdated(LocalDateTime.now());
        return residentRepository.save(resident);
    }

    /**
     * Updates an existing resident.
     */
    public Optional<Resident> updateResident(Long residentId, Resident updatedResident) {
        if (residentId == null) return Optional.empty();
        return residentRepository.findById(residentId)
                .map(existing -> {
                    // Update fields
                    existing.setName(updatedResident.getName());
                    existing.setDateOfBirth(updatedResident.getDateOfBirth());
                    existing.setGender(updatedResident.getGender());
                    existing.setRoomNumber(updatedResident.getRoomNumber());
                    existing.setRoomUnit(updatedResident.getRoomUnit());
                    existing.setAge(updatedResident.getAge());
                    existing.setDiagnoses(updatedResident.getDiagnoses());
                    existing.setEmergencyContact(updatedResident.getEmergencyContact());
                    existing.setEmergencyPhone(updatedResident.getEmergencyPhone());
                    existing.setResidence(updatedResident.getResidence());
                    existing.setCareLevel(updatedResident.getCareLevel());
                    existing.setMoveInDate(updatedResident.getMoveInDate());
                    // Removed baseline vitals & care flags; values now flow through ShiftObservation only
                    existing.setLastUpdated(LocalDateTime.now());

                    return residentRepository.save(existing);
                });
    }

    /**
     * Deletes a resident by ID.
     * Also deletes all related shift observations and shift reports.
     */
    public boolean deleteResident(Long residentId) {
        if (residentId != null && residentRepository.existsById(residentId)) {
            // Delete related shift observations first (foreign key constraint)
            List<ShiftObservation> observations = shiftObservationRepository.findByResidentIdOrderByTimestampDesc(residentId);
            for (ShiftObservation obs : observations) {
                shiftObservationRepository.delete(obs);
            }

            // Delete related shift reports
            List<ShiftReport> reports = shiftReportRepository.findByResidentIdOrderByReportTimeDesc(residentId);
            for (ShiftReport report : reports) {
                shiftReportRepository.delete(report);
            }

            // Now safe to delete the resident
            residentRepository.deleteById(residentId);
            return true;
        }
        return false;
    }

    // --- New Methods for Calculating Variables (Refactored to use anchorTime) ---

    /**
     * Calculates the 7-day mean heart rate, ending at the anchorTime.
     */
    public double calculateHr7DayMean(Long residentId, LocalDateTime anchorTime) {
        List<ShiftObservation> observations = shiftObservationRepository
                .findByResidentIdOrderByTimestampDesc(residentId);
        LocalDateTime sevenDaysAgo = anchorTime.minusDays(7);
        return observations.stream()
                .filter(obs -> obs.getTimestamp() != null && obs.getTimestamp().isAfter(sevenDaysAgo) && obs.getTimestamp().isBefore(anchorTime.plusMinutes(1)))
                .filter(obs -> obs.getHeartRate() != null)
                .mapToInt(ShiftObservation::getHeartRate)
                .average()
                .orElse(0);
    }

    /**
     * Calculates the 7-day mean systolic blood pressure, ending at the anchorTime.
     */
    public double calculateSbp7DayMean(Long residentId, LocalDateTime anchorTime) {
        List<ShiftObservation> observations = shiftObservationRepository
                .findByResidentIdOrderByTimestampDesc(residentId);
        LocalDateTime sevenDaysAgo = anchorTime.minusDays(7);
        return observations.stream()
                .filter(obs -> obs.getTimestamp() != null && obs.getTimestamp().isAfter(sevenDaysAgo) && obs.getTimestamp().isBefore(anchorTime.plusMinutes(1)))
                .filter(obs -> obs.getBpSystolic() != null)
                .mapToInt(ShiftObservation::getBpSystolic)
                .average()
                .orElse(0);
    }

    /**
     * Calculates the delta in heart rate compared to the previous 7-day mean, anchored at anchorTime.
     */
    public double calculateHr7DayDelta(Long residentId, LocalDateTime anchorTime) {
        List<ShiftObservation> observations = shiftObservationRepository
                .findByResidentIdOrderByTimestampDesc(residentId);

        LocalDateTime sevenDaysAgo = anchorTime.minusDays(7);
        LocalDateTime fourteenDaysAgo = anchorTime.minusDays(14);

        // Current window: (anchorTime - 7 days) to anchorTime
        double currentMean = observations.stream()
                .filter(o -> o.getTimestamp() != null && o.getTimestamp().isAfter(sevenDaysAgo) && o.getTimestamp().isBefore(anchorTime.plusMinutes(1)) && o.getHeartRate() != null)
                .mapToInt(o -> o.getHeartRate().intValue())
                .average().orElse(0);

        // Previous window: (anchorTime - 14 days) to (anchorTime - 7 days)
        double previousMean = observations.stream()
                .filter(o -> o.getTimestamp() != null && o.getTimestamp().isAfter(fourteenDaysAgo) && o.getTimestamp().isBefore(sevenDaysAgo.plusMinutes(1)) && o.getHeartRate() != null)
                .mapToInt(o -> o.getHeartRate().intValue())
                .average().orElse(0);

        return currentMean - previousMean;
    }

    /**
     * Calculates the delta in systolic blood pressure compared to the previous 7-day mean, anchored at anchorTime.
     */
    public double calculateSbp7DayDelta(Long residentId, LocalDateTime anchorTime) {
        List<ShiftObservation> observations = shiftObservationRepository
                .findByResidentIdOrderByTimestampDesc(residentId);

        LocalDateTime sevenDaysAgo = anchorTime.minusDays(7);
        LocalDateTime fourteenDaysAgo = anchorTime.minusDays(14);

        // Current window: (anchorTime - 7 days) to anchorTime
        double currentMean = observations.stream()
                .filter(o -> o.getTimestamp() != null && o.getTimestamp().isAfter(sevenDaysAgo) && o.getTimestamp().isBefore(anchorTime.plusMinutes(1)) && o.getBpSystolic() != null)
                .mapToInt(o -> o.getBpSystolic().intValue())
                .average().orElse(0);

        // Previous window: (anchorTime - 14 days) to (anchorTime - 7 days)
        double previousMean = observations.stream()
                .filter(o -> o.getTimestamp() != null && o.getTimestamp().isAfter(fourteenDaysAgo) && o.getTimestamp().isBefore(sevenDaysAgo.plusMinutes(1)) && o.getBpSystolic() != null)
                .mapToInt(o -> o.getBpSystolic().intValue())
                .average().orElse(0);

        return currentMean - previousMean;
    }

    /**
     * Counts the number of falls in the past 90 days, ending at the anchorTime.
     */
    public long calculatePriorFall90Day(Long residentId, LocalDateTime anchorTime) {
        List<ShiftObservation> observations = shiftObservationRepository
                .findByResidentIdOrderByTimestampDesc(residentId);
        LocalDateTime ninetyDaysAgo = anchorTime.minusDays(90);
        return observations.stream()
                .filter(obs -> obs.getTimestamp() != null && obs.getTimestamp().isAfter(ninetyDaysAgo) && obs.getTimestamp().isBefore(anchorTime.plusMinutes(1)))
                .filter(o -> Boolean.TRUE.equals(o.getFallsHasEvent()))
                .count();
    }

    /**
     * Predicts the likelihood of a fall in the next 7 days using AI.
     * NOTE: This remains anchored to the CURRENT state, as AI predictions are real-time.
     */
    public double calculateFallNext7Day(Long residentId) {
        return aiModelService.getFallRiskPrediction(residentId);
    }

    /**
     * Triggers an immediate AI model update for a resident.
     */
    public void triggerAIModelUpdate(Long residentId) {
        // Force recalculation of AI predictions
        aiModelService.getFallRiskPrediction(residentId);
        aiModelService.getMoodSummary(residentId);
    }

    /**
     * Calculates the ratio of missed medication doses in the past 7 days, ending at the anchorTime.
     */
    public double calculateMissedDoseRatio7Day(Long residentId, LocalDateTime anchorTime) {
        List<ShiftObservation> observations = shiftObservationRepository
                .findByResidentIdOrderByTimestampDesc(residentId);
        LocalDateTime sevenDaysAgo = anchorTime.minusDays(7);

        long totalObservations = observations.stream()
                .filter(obs -> obs.getTimestamp() != null && obs.getTimestamp().isAfter(sevenDaysAgo) && obs.getTimestamp().isBefore(anchorTime.plusMinutes(1)))
                .count();

        long missedDoses = observations.stream()
                .filter(obs -> obs.getTimestamp() != null && obs.getTimestamp().isAfter(sevenDaysAgo) && obs.getTimestamp().isBefore(anchorTime.plusMinutes(1)))
                .filter(o -> Boolean.TRUE.equals(o.getMedicationHasIssue()))
                .count();

        return totalObservations > 0 ? (double) missedDoses / totalObservations : 0;
    }

    /**
     * Gets shift observations for a resident within a specified number of days.
     * Used for analytics dashboard.
     * Enriches observations with AI model predictions for display.
     */
    public List<ShiftObservation> getResidentObservations(Long residentId, Integer days) {
        List<ShiftObservation> allObservations = shiftObservationRepository
                .findByResidentIdOrderByTimestampDesc(residentId);

        if (days == null || days <= 0) {
            return enrichObservationsWithAI(allObservations, residentId);
        }

        LocalDateTime cutoffDate = LocalDateTime.now().minusDays(days);
        List<ShiftObservation> filteredObservations = allObservations.stream()
                .filter(obs -> obs.getTimestamp() != null && obs.getTimestamp().isAfter(cutoffDate))
                .collect(Collectors.toList());

        return enrichObservationsWithAI(filteredObservations, residentId);
    }

    /**
     * Enriches observations with real-time AI model predictions and historical analytical values.
     */
    private List<ShiftObservation> enrichObservationsWithAI(List<ShiftObservation> observations, Long residentId) {
        if (observations.isEmpty()) {
            return observations;
        }

        // Get current AI predictions (only for the most recent observation)
        Double currentFallRisk = aiModelService.getFallRiskPrediction(residentId);
        Map<String, Object> medicationAdherence = aiModelService.getMedicationAdherenceSummary(residentId);
        Double missedDoseRatio = medicationAdherence.get("adherence_rate") instanceof Number ?
                ((Number) medicationAdherence.get("adherence_rate")).doubleValue() : 0.0;

        // Enrich each observation with AI predictions and historical stats
        for (int i = 0; i < observations.size(); i++) {
            ShiftObservation obs = observations.get(i);

            // Determine the anchor time for historical calculations
            // Use the observation's own timestamp. Fall back to current time if timestamp is null.
            LocalDateTime anchorTime = obs.getTimestamp() != null ? obs.getTimestamp() : LocalDateTime.now();

            // For the most recent observation (i=0), use current real-time AI predictions
            if (i == 0) {
                obs.setFallNext7d(currentFallRisk);
                obs.setMissedDoseRatio7d(missedDoseRatio);
            } else {
                // For older observations, calculate the 7-day missed dose ratio based on its historical context
                obs.setMissedDoseRatio7d(calculateMissedDoseRatio7Day(residentId, anchorTime));
                // NOTE: Historical AI Fall Risk (fallNext7d) would require an archive/timestamping
                // capability in the AI model service, so we'll leave it null for older entries unless
                // the ShiftObservation model itself stores historical predictions.
            }

            // Calculate derived statistics using the observation's timestamp as the anchor
            if (obs.getHr7dMean() == null) {
                obs.setHr7dMean(calculateHr7DayMean(residentId, anchorTime));
            }
            if (obs.getSbp7dMean() == null) {
                obs.setSbp7dMean(calculateSbp7DayMean(residentId, anchorTime));
            }
            if (obs.getHr7dDelta() == null) {
                obs.setHr7dDelta(calculateHr7DayDelta(residentId, anchorTime));
            }
            if (obs.getSbp7dDelta() == null) {
                obs.setSbp7dDelta(calculateSbp7DayDelta(residentId, anchorTime));
            }
            if (obs.getPriorFall90d() == null) {
                obs.setPriorFall90d((int) calculatePriorFall90Day(residentId, anchorTime));
            }

            // Set clinical flags based on vitals
            if (obs.getBpSystolic() != null && obs.getBpDiastolic() != null) {
                obs.setHypotensionFlag(obs.getBpSystolic() < 90 || obs.getBpDiastolic() < 60);
            }
            if (obs.getHeartRate() != null) {
                obs.setTachycardiaFlag(obs.getHeartRate() > 100);
            }
            if (obs.getOxygenSat() != null) {
                obs.setHypoxiaFlag(obs.getOxygenSat() < 90);
            }
            if (obs.getTemperature() != null) {
                obs.setFeverFlag(obs.getTemperature() > 37.5);
            }
        }

        return observations;
    }
}