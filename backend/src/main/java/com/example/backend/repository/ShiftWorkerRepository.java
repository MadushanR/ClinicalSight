package com.example.backend.repository;
import com.example.backend.model.ShiftWorker;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ShiftWorkerRepository extends JpaRepository<ShiftWorker, Long> {
    java.util.Optional<ShiftWorker> findByEmail(String email);
}