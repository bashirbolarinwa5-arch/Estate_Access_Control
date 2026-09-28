package com.example.demo.repository;
import org.springframework.data.jpa.repository.JpaRepository;
import com.example.demo.entity.Resident;


import java.util.Optional;

public interface ResidentRepository  extends JpaRepository<Resident, Long>{
    Optional<Resident> findByEmail(String email);


}

