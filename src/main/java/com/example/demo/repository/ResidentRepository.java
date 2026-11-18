
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

    // Estate-scoped email uniqueness (resident -> user -> users.estate_id)
    boolean existsByEstateIdAndEmail(Long estateId, String email);

    Optional<Resident> findByEstateIdAndEmail(Long estateId, String email);

    /*
     * Phone numbers are unique per estate (see PhoneDirectoryGuard and the
     * ux_resident_estate_phone index). A phone number is a login
     * identifier, so the same number cannot belong to two residents.
     */
    boolean existsByEstateIdAndPhoneNumber(Long estateId, String phoneNumber);

    boolean existsByEstateIdAndPhoneNumberAndIdNot(
            Long estateId, String phoneNumber, Long id);

    /*
     * Activation can be triggered with the phone number on record. The
     * number is unique for accounts created since V8, but older rows may
     * still share one; the oldest match wins and never crosses an estate
     * boundary.
     */
    Optional<Resident> findFirstByEstateIdAndPhoneNumberOrderByIdAsc(
            Long estateId, String phoneNumber);

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
