package com.example.backend.controller;
import com.example.backend.model.ShiftReport;
import com.example.backend.model.ShiftWorker;
import com.example.backend.repository.ShiftWorkerRepository;
import com.example.backend.service.WellnessService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

// Simplified DTO for Shift Report Submission
record ShiftReportRequest(Long residentId, String reportText) {}

@RestController
@RequestMapping("/api/shiftworkers")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:3000")
public class ShiftWorkerController {
    private final WellnessService wellnessService;
    private final ShiftWorkerRepository shiftWorkerRepository;

    // Endpoint for Shiftworker Profile (basic info retrieval)
    // URL: GET /api/shiftworkers/99
    @GetMapping("/{workerId}")
    public ShiftWorker getShiftWorkerProfile(@PathVariable Long workerId) {
        if (workerId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Worker id required");
        }
        return shiftWorkerRepository.findById(workerId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Shift Worker not found"));
    }

    // Endpoint for Shift Report Page: Submit Report
    // URL: POST /api/shiftworkers/99/report
    @PostMapping("/{shiftWorkerId}/report")
    @ResponseStatus(HttpStatus.CREATED)
    public ShiftReport submitShiftReport(
            @PathVariable Long shiftWorkerId,
            @RequestBody ShiftReportRequest request) {
        if (shiftWorkerId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Shift worker id required");
        }
        if (!shiftWorkerRepository.existsById(shiftWorkerId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Shift Worker not found to file report.");
        }

        // This reportText is the valuable unstructured data for your AI's NLP component
        return wellnessService.submitShiftReport(
                request.residentId(),
                shiftWorkerId,
                request.reportText()
        );
    }

    // Endpoint to update shift worker profile
    // URL: PUT /api/shiftworkers/99
    @PutMapping("/{workerId}")
    public ShiftWorker updateShiftWorkerProfile(
            @PathVariable Long workerId,
            @RequestBody ShiftWorker updatedWorker) {
    if (workerId == null) {
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Worker id required");
    }
    ShiftWorker existing = shiftWorkerRepository.findById(workerId)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Shift Worker not found"));
        
        // Update fields
        existing.setFirstName(updatedWorker.getFirstName());
        existing.setLastName(updatedWorker.getLastName());
        existing.setName(updatedWorker.getFirstName() + " " + updatedWorker.getLastName());
        existing.setEmail(updatedWorker.getEmail());
        existing.setRole(updatedWorker.getRole());
        existing.setPhone(updatedWorker.getPhone());
        existing.setSex(updatedWorker.getSex());
        existing.setShiftPreference(updatedWorker.getShiftPreference());
        existing.setAvatarUrl(updatedWorker.getAvatarUrl());
        existing.setNotes(updatedWorker.getNotes());
        
        return shiftWorkerRepository.save(existing);
    }

    // Endpoint for login/authentication
    // URL: POST /api/shiftworkers/login
    @PostMapping("/login")
    public ShiftWorker login(@RequestBody LoginRequest request) {
        return shiftWorkerRepository.findByEmail(request.email())
                .map(existing -> {
                    // For demo: if password is unset, accept any; else perform simple match
                    if (existing.getPassword() == null || existing.getPassword().isBlank() || existing.getPassword().equals(request.password())) {
                        return existing;
                    }
                    throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials");
                })
                .orElseGet(() -> {
                    // Auto-provision new worker if email not found (demo convenience)
                    String rawEmail = request.email();
                    String baseName = (rawEmail != null && rawEmail.contains("@")) ? rawEmail.substring(0, rawEmail.indexOf('@')) : "User";
                    ShiftWorker created = new ShiftWorker();
                    created.setFirstName(baseName);
                    created.setLastName("");
                    created.setName(baseName);
                    created.setEmail(rawEmail);
                    created.setPassword(request.password()); // Plaintext (demo only)
                    created.setRole("Support Worker");
                    created.setSex("unspecified");
                    created.setShiftPreference("day");
                    created.setAvatarUrl("");
                    created.setPhone("");
                    created.setNotes("Auto-created on first login");
                    return shiftWorkerRepository.save(created);
                });
    }

    // Endpoint for registration
    // URL: POST /api/shiftworkers/register
    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public ShiftWorker register(@RequestBody ShiftWorker worker) {
        worker.setName(worker.getFirstName() + " " + worker.getLastName());
        return shiftWorkerRepository.save(worker);
    }
}

// Simple DTO for login
record LoginRequest(String email, String password) {}
