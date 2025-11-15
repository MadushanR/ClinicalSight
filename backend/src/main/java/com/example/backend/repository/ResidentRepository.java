package com.example.backend.repository;
import com.example.backend.model.Resident;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ResidentRepository extends JpaRepository<Resident, Long> {
    // Spring Data JPA automatically provides basic methods (findAll, findById, save)
}
