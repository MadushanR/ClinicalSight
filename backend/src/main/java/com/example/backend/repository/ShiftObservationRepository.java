package com.example.backend.repository;

import com.example.backend.model.ShiftObservation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ShiftObservationRepository extends JpaRepository<ShiftObservation, Long> {
    List<ShiftObservation> findByResidentIdOrderByTimestampDesc(Long residentId);
    List<ShiftObservation> findByShiftWorkerIdOrderByTimestampDesc(Long shiftWorkerId);
}
