package com.example.backend.controller;
import com.example.backend.dto.ResidentSummaryDTO;
import com.example.backend.model.Resident;
import com.example.backend.model.ShiftReport;
import com.example.backend.model.ShiftObservation;
import com.example.backend.service.WellnessService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/residents")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:3000")
public class ResidentController {
    private final WellnessService wellnessService;

    // Endpoint for HomePage: Display Resident Data (Summary)
    // URL: GET /api/residents?filter=all|fallRisk|medicationRefusal|moodChanges
    @GetMapping
    public List<ResidentSummaryDTO> getAllResidentsSummary(
            @RequestParam(required = false, defaultValue = "all") String filter) {
        // Retrieves summary data, including the AI-driven attention flag
        return wellnessService.getAllResidentSummaries(filter);
    }
    
    // Endpoint for ResidentCareForm: Get residents with care flags
    // URL: GET /api/residents/care-list
    @GetMapping("/care-list")
    public List<Resident> getResidentsForCareForm() {
        return wellnessService.getAllResidentsWithFlags();
    }

    // Endpoint for Resident Data Page: Detailed Vitals
    // URL: GET /api/residents/123
    @GetMapping("/{residentId}")
    public ResponseEntity<Resident> getResidentData(@PathVariable Long residentId) {
        return wellnessService.getResidentDetails(residentId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // Endpoint to get the shift reports for a resident
    // URL: GET /api/residents/123/reports
    @GetMapping("/{residentId}/reports")
    public List<ShiftReport> getResidentShiftReports(@PathVariable Long residentId) {
        return wellnessService.getResidentShiftHistory(residentId);
    }

    // Endpoint to get shift observations for analytics
    // URL: GET /api/residents/123/observations?days=30
    @GetMapping("/{residentId}/observations")
    public List<ShiftObservation> getResidentObservations(
            @PathVariable Long residentId,
            @RequestParam(required = false, defaultValue = "30") Integer days) {
        return wellnessService.getResidentObservations(residentId, days);
    }

    // Endpoint to create a new resident
    // URL: POST /api/residents
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Resident createResident(@RequestBody Resident resident) {
        resident.calculateAge(); // Calculate age from dateOfBirth
        return wellnessService.createResident(resident);
    }

    // Endpoint to update an existing resident
    // URL: PUT /api/residents/123
    @PutMapping("/{residentId}")
    public ResponseEntity<Resident> updateResident(
            @PathVariable Long residentId,
            @RequestBody Resident resident) {
        resident.calculateAge(); // Calculate age from dateOfBirth
        return wellnessService.updateResident(residentId, resident)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // Endpoint to delete a resident
    // URL: DELETE /api/residents/123
    @DeleteMapping("/{residentId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public ResponseEntity<Void> deleteResident(@PathVariable Long residentId) {
        boolean deleted = wellnessService.deleteResident(residentId);
        return deleted ? ResponseEntity.noContent().build() : ResponseEntity.notFound().build();
    }
}
