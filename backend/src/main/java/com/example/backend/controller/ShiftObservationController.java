package com.example.backend.controller;

import com.example.backend.dto.ShiftObservationDTO;
import com.example.backend.model.ShiftObservation;
import com.example.backend.repository.ShiftObservationRepository;
import com.example.backend.service.WellnessService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;

@RestController
@RequestMapping("/api/shift-observations")
@RequiredArgsConstructor
public class ShiftObservationController {
    private final ShiftObservationRepository shiftObservationRepository;
    private final WellnessService wellnessService;

    // Get all shift observations
    @GetMapping
    public List<ShiftObservation> getAllShiftObservations() {
        return shiftObservationRepository.findAll();
    }

    // Get shift observations by resident ID
    @GetMapping("/resident/{residentId}")
    public List<ShiftObservation> getShiftObservationsByResident(@PathVariable Long residentId) {
        return shiftObservationRepository.findByResidentIdOrderByTimestampDesc(residentId);
    }

    // Get shift observations by shift worker ID
    @GetMapping("/worker/{workerId}")
    public List<ShiftObservation> getShiftObservationsByWorker(@PathVariable Long workerId) {
        return shiftObservationRepository.findByShiftWorkerIdOrderByTimestampDesc(workerId);
    }

    // Create new shift observation
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ShiftObservation createShiftObservation(@RequestBody ShiftObservationDTO dto) {
        // Convert DTO to Entity
        ShiftObservation shiftObservation = convertDtoToEntity(dto);
        shiftObservation.setTimestamp(LocalDateTime.now());
        // Always derive timeOfDay bucket from timestamp
        int hour = shiftObservation.getTimestamp().getHour();
        String bucket;
        if (hour < 12) bucket = "Morning"; else if (hour < 17) bucket = "Afternoon"; else if (hour < 21) bucket = "Evening"; else bucket = "Night";
        shiftObservation.setTimeOfDay(bucket);
        
        // Set mood flags based on moodBaseline
        setMoodFlags(shiftObservation);
        
        // Calculate clinical flags directly from current observation vitals
        shiftObservation.setHypotensionFlag(
            (shiftObservation.getBpSystolic() != null && shiftObservation.getBpSystolic() < 90) ||
            (shiftObservation.getBpDiastolic() != null && shiftObservation.getBpDiastolic() < 60)
        );
        shiftObservation.setTachycardiaFlag(shiftObservation.getHeartRate() != null && shiftObservation.getHeartRate() > 100);
        shiftObservation.setHypoxiaFlag(shiftObservation.getOxygenSat() != null && shiftObservation.getOxygenSat() < 90);
        shiftObservation.setFeverFlag(shiftObservation.getTemperature() != null && shiftObservation.getTemperature() > 37.5);

        // Auto derive cognitive impairment flag if mmseScore provided and flag not explicitly set
        if (shiftObservation.getMmseScore() != null && shiftObservation.getCognitiveImpairmentFlag() == null) {
            shiftObservation.setCognitiveImpairmentFlag(shiftObservation.getMmseScore() < 24);
        }

        // Use current timestamp as anchor time for calculations
        LocalDateTime anchorTime = LocalDateTime.now();

        // Calculate metrics with safe defaults if calculation fails
        try {
            shiftObservation.setHr7dMean(wellnessService.calculateHr7DayMean(dto.getResidentId(), anchorTime));
        } catch (Exception e) {
            shiftObservation.setHr7dMean(0.0);
        }
        
        try {
            shiftObservation.setSbp7dMean(wellnessService.calculateSbp7DayMean(dto.getResidentId(), anchorTime));
        } catch (Exception e) {
            shiftObservation.setSbp7dMean(0.0);
        }
        
        try {
            shiftObservation.setHr7dDelta(wellnessService.calculateHr7DayDelta(dto.getResidentId(), anchorTime));
        } catch (Exception e) {
            shiftObservation.setHr7dDelta(0.0);
        }
        
        try {
            shiftObservation.setSbp7dDelta(wellnessService.calculateSbp7DayDelta(dto.getResidentId(), anchorTime));
        } catch (Exception e) {
            shiftObservation.setSbp7dDelta(0.0);
        }

        try {
            shiftObservation.setPriorFall90d((int) wellnessService.calculatePriorFall90Day(dto.getResidentId(), anchorTime));
        } catch (Exception e) {
            shiftObservation.setPriorFall90d(0);
        }
        
        try {
            shiftObservation.setFallNext7d(wellnessService.calculateFallNext7Day(dto.getResidentId()));
        } catch (Exception e) {
            shiftObservation.setFallNext7d(0.0);
        }
        
        try {
            shiftObservation.setMissedDoseRatio7d(wellnessService.calculateMissedDoseRatio7Day(dto.getResidentId(), anchorTime));
        } catch (Exception e) {
            shiftObservation.setMissedDoseRatio7d(0.0);
        }
        
        // Save the observation first
        ShiftObservation saved = shiftObservationRepository.save(shiftObservation);
        
        // Trigger immediate AI model recalculation in background
        // This ensures the dashboard shows updated predictions right away
        try {
            wellnessService.triggerAIModelUpdate(dto.getResidentId());
        } catch (Exception e) {
            // Log error but don't fail the save operation
            System.err.println("Failed to update AI predictions: " + e.getMessage());
        }
        
        return saved;
    }

    // Helper method to set mood flags based on moodBaseline
    private void setMoodFlags(ShiftObservation observation) {
        // Reset all flags to false
        observation.setHappyFlag(false);
        observation.setDepressionFlag(false);
        observation.setAgitationFlag(false);
        observation.setWithdrawnFlag(false);
        observation.setConfusionFlag(false);
        
        // Set appropriate flag based on moodBaseline
        if (observation.getMoodBaseline() != null) {
            switch (observation.getMoodBaseline()) {
                case "Happier than usual":
                    observation.setHappyFlag(true);
                    break;
                case "Sad/tearful":
                    observation.setDepressionFlag(true);
                    break;
                case "Agitated/irritable":
                    observation.setAgitationFlag(true);
                    break;
                case "Withdrawn/quiet":
                    observation.setWithdrawnFlag(true);
                    break;
                case "Confused/Wandering":
                    observation.setConfusionFlag(true);
                    break;
            }
        }
    }
    
    // Helper method to convert mobility level string to integer
    // 0=Independent, 1=Supervision required, 2=Partial assistance, 3=Full assistance, 4=Bedbound
    private Integer convertMobilityLevel(String mobilityLevelStr) {
        if (mobilityLevelStr == null || mobilityLevelStr.isEmpty()) {
            return null;
        }
        
        switch (mobilityLevelStr) {
            case "Independent":
                return 0;
            case "Supervision required":
                return 1;
            case "Partial assistance":
                return 2;
            case "Full assistance":
                return 3;
            case "Bedbound":
                return 4;
            default:
                // If it's already a number, try to parse it
                try {
                    return Integer.parseInt(mobilityLevelStr);
                } catch (NumberFormatException e) {
                    return null;
                }
        }
    }

    // Update shift observation
    @PutMapping("/{id}")
    public ResponseEntity<ShiftObservation> updateShiftObservation(
            @PathVariable Long id,
            @RequestBody ShiftObservationDTO dto) {
        Objects.requireNonNull(id, "id must not be null");
        return shiftObservationRepository.findById(id)
                .map(existing -> {
                    // Convert DTO to updates
                    updateEntityFromDto(existing, dto);

                    // Set mood flags based on updated moodBaseline
                    setMoodFlags(existing);

                    @SuppressWarnings("null")
                    ShiftObservation saved = shiftObservationRepository.save(existing);
                    Objects.requireNonNull(saved, "Persisted ShiftObservation is null");
                    return ResponseEntity.ok(saved);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // Helper method to convert DTO to Entity
    private ShiftObservation convertDtoToEntity(ShiftObservationDTO dto) {
        ShiftObservation entity = new ShiftObservation();
        
        entity.setResidentId(dto.getResidentId());
        entity.setShiftWorkerId(dto.getShiftWorkerId());
        
        // Falls fields
        entity.setFallsHasEvent(dto.getFallsHasEvent());
        entity.setFallsEventType(dto.getFallsEventType());
        entity.setFallsLocation(dto.getFallsLocation());
        entity.setFallsContributingFactors(dto.getFallsContributingFactors());
        entity.setFallsAssistiveDeviceUsed(dto.getFallsAssistiveDeviceUsed());
        entity.setFallsInjury(dto.getFallsInjury());
        
        // Mood fields
        entity.setMoodHasChange(dto.getMoodHasChange());
        entity.setMoodBaseline(dto.getMoodBaseline());
        entity.setMoodTriggers(dto.getMoodTriggers());
        entity.setMoodOtherTrigger(dto.getMoodOtherTrigger());
        entity.setMoodSeverity(dto.getMoodSeverity());
        entity.setMoodNotes(dto.getMoodNotes());
        
        // Medication fields
        entity.setMedicationHasIssue(dto.getMedicationHasIssue());
        entity.setMedicationName(dto.getMedicationName());
        entity.setMedicationAction(dto.getMedicationAction());
        entity.setMedicationReason(dto.getMedicationReason());
        entity.setMedicationStaffAction(dto.getMedicationStaffAction());
        entity.setPolypharmacyCount(dto.getPolypharmacyCount());
        entity.setHighRiskMedFlag(dto.getHighRiskMedFlag());
        
        // Vitals fields
        entity.setTemperature(dto.getTemperature());
        entity.setHeartRate(dto.getHeartRate());
        entity.setRespiratoryRate(dto.getRespiratoryRate());
        entity.setBpSystolic(dto.getBpSystolic());
        entity.setBpDiastolic(dto.getBpDiastolic());
        entity.setOxygenSat(dto.getOxygenSat());
        entity.setPainScore(dto.getPainScore());
        
        // Cognitive fields
        entity.setMmseScore(dto.getMmseScore());
        entity.setCognitiveImpairmentFlag(dto.getCognitiveImpairmentFlag());
        
        // Mobility fields - convert string to integer
        entity.setMobilityLevel(convertMobilityLevel(dto.getMobilityLevel()));
        entity.setUseOfAid(dto.getUseOfAid());
        entity.setDizzinessFlag(dto.getDizzinessFlag());
        entity.setUnsteadyGaitFlag(dto.getUnsteadyGaitFlag());
        
        return entity;
    }
    
    // Helper method to update existing entity from DTO
    private void updateEntityFromDto(ShiftObservation entity, ShiftObservationDTO dto) {
        // Falls fields
        entity.setFallsHasEvent(dto.getFallsHasEvent());
        entity.setFallsEventType(dto.getFallsEventType());
        entity.setFallsLocation(dto.getFallsLocation());
        entity.setFallsContributingFactors(dto.getFallsContributingFactors());
        entity.setFallsAssistiveDeviceUsed(dto.getFallsAssistiveDeviceUsed());
        entity.setFallsInjury(dto.getFallsInjury());
        
        // Mood fields
        entity.setMoodHasChange(dto.getMoodHasChange());
        entity.setMoodBaseline(dto.getMoodBaseline());
        entity.setMoodTriggers(dto.getMoodTriggers());
        entity.setMoodOtherTrigger(dto.getMoodOtherTrigger());
        entity.setMoodSeverity(dto.getMoodSeverity());
        entity.setMoodNotes(dto.getMoodNotes());
        
        // Medication fields (including new fields)
        entity.setMedicationHasIssue(dto.getMedicationHasIssue());
        entity.setMedicationName(dto.getMedicationName());
        entity.setMedicationAction(dto.getMedicationAction());
        entity.setMedicationReason(dto.getMedicationReason());
        entity.setMedicationStaffAction(dto.getMedicationStaffAction());
        entity.setPolypharmacyCount(dto.getPolypharmacyCount());
        entity.setHighRiskMedFlag(dto.getHighRiskMedFlag());
        
        // Vitals fields (including new field)
        entity.setTemperature(dto.getTemperature());
        entity.setHeartRate(dto.getHeartRate());
        entity.setRespiratoryRate(dto.getRespiratoryRate());
        entity.setBpSystolic(dto.getBpSystolic());
        entity.setBpDiastolic(dto.getBpDiastolic());
        entity.setOxygenSat(dto.getOxygenSat());
        entity.setPainScore(dto.getPainScore());
        
        // Cognitive fields
        entity.setMmseScore(dto.getMmseScore());
        entity.setCognitiveImpairmentFlag(dto.getCognitiveImpairmentFlag());
        
        // Mobility fields - convert string to integer
        entity.setMobilityLevel(convertMobilityLevel(dto.getMobilityLevel()));
        entity.setUseOfAid(dto.getUseOfAid());
        entity.setDizzinessFlag(dto.getDizzinessFlag());
        entity.setUnsteadyGaitFlag(dto.getUnsteadyGaitFlag());
        // Recompute timeOfDay from existing timestamp (if timestamp was externally modified future enhancement can recalc)
        if (entity.getTimestamp() != null) {
            int hr = entity.getTimestamp().getHour();
            String tb;
            if (hr < 12) tb = "Morning"; else if (hr < 17) tb = "Afternoon"; else if (hr < 21) tb = "Evening"; else tb = "Night";
            entity.setTimeOfDay(tb);
        }

        // Recompute cognitive impairment if mmseScore changed or flag not set
        if (dto.getMmseScore() != null && entity.getMmseScore() != null && !dto.getMmseScore().equals(entity.getMmseScore())) {
            entity.setCognitiveImpairmentFlag(dto.getCognitiveImpairmentFlag() != null ? dto.getCognitiveImpairmentFlag() : dto.getMmseScore() < 24);
        } else if (entity.getCognitiveImpairmentFlag() == null && entity.getMmseScore() != null) {
            entity.setCognitiveImpairmentFlag(entity.getMmseScore() < 24);
        }
    }
    
    // Delete shift observation
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteShiftObservation(@PathVariable Long id) {
        Objects.requireNonNull(id, "id must not be null");
        shiftObservationRepository.deleteById(id);
    }
}
