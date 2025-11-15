package com.example.backend.model;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ShiftWorker {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id; // caregiver_id in your schema

    private String firstName;
    private String lastName;
    private String name; // full name for backward compatibility
    private String email;
    private String password; // for authentication
    private String role;
    private String phone;
    private String sex; // gender/sex
    private String shiftPreference; // day, evening, night, flex
    private String avatarUrl;
    private String notes;
}
