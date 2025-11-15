package com.example.backend.model;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.Period;
import java.time.format.DateTimeFormatter;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Resident {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id; // resident_id in your schema

    private String name;
    private String dateOfBirth; // dob from frontend
    private String gender; // gender from frontend
    private String roomNumber;
    private String roomUnit; // room/unit from frontend
    private Integer age;  // Changed to Integer to allow null values
    private String diagnoses;

    // Contacts
    private String emergencyContact;
    private String emergencyPhone;

    // Residence
    private String residence;
    private String careLevel; // independent, assisted, memory
    private String moveInDate;

    // (Removed baseline vitals & care tracking flags: handled via ShiftObservation records now)

    // Cognitive Assessment Baseline
    private Integer baselineMmse;  // Mini-Mental State Examination baseline score (0-30)

    // Last time the record was updated
    private LocalDateTime lastUpdated;

    /**
     * Calculate age from dateOfBirth string.
     * Expected format: "YYYY-MM-DD"
     */
    public void calculateAge() {
        if (this.dateOfBirth != null && !this.dateOfBirth.isEmpty()) {
            try {
                LocalDate dob = LocalDate.parse(this.dateOfBirth, DateTimeFormatter.ISO_LOCAL_DATE);
                LocalDate now = LocalDate.now();
                this.age = Period.between(dob, now).getYears();
            } catch (Exception e) {
                // If parsing fails, leave age as is
                System.err.println("Failed to parse dateOfBirth: " + this.dateOfBirth);
            }
        }
    }
}
