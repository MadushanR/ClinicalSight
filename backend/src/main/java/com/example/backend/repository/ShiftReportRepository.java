package com.example.backend.repository;
import com.example.backend.model.ShiftReport;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ShiftReportRepository extends JpaRepository<ShiftReport, Long> {
    List<ShiftReport> findByResidentIdOrderByReportTimeDesc(Long residentId);
}