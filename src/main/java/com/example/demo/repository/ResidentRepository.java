package com.example.demo.repository;

import com.example.demo.entity.Resident;
import com.example.demo.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ResidentRepository extends JpaRepository<Resident, Long> {

    // Existing Resident searches
    boolean existsByEmail(String email);

    List<Resident> findByFullNameContainingIgnoreCase(String fullName);

    List<Resident> findByHouseNumberContainingIgnoreCase(String houseNumber);

    List<Resident> findByPhoneNumberContaining(String phoneNumber);

    // Resident ↔ User relationship
    Optional<Resident> findByUser(User user);



    // Used by Resident "My Profile"
    Optional<Resident> findByUserUsername(String username);
}


