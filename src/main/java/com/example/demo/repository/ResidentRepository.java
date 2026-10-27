
package com.example.demo.repository;

import com.example.demo.entity.Estate;
import com.example.demo.entity.Resident;
import com.example.demo.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ResidentRepository extends JpaRepository<Resident, Long> {

    // Existing Resident searches
    boolean existsByEmail(String email);

    List<Resident> findByFullNameContainingIgnoreCase(String fullName);

    List<Resident> findByHouseNumberContainingIgnoreCase(String houseNumber);

    List<Resident> findByPhoneNumberContaining(String phoneNumber);

    // Resident ↔ User relationship
    Optional<Resident> findByUser(User user);

    Optional<Resident> findByPublicId(UUID publicId);



    // Used by Resident "My Profile"
    Optional<Resident> findByUserUsername(String username);

    // Estate isolation — a resident's estate lives on its user
    List<Resident> findByUserEstate(Estate estate);

    List<Resident> findByUserEstateAndFullNameContainingIgnoreCase(Estate estate, String fullName);

    List<Resident> findByUserEstateAndHouseNumberContainingIgnoreCase(Estate estate, String houseNumber);

    List<Resident> findByUserEstateAndPhoneNumberContaining(Estate estate, String phoneNumber);
}
