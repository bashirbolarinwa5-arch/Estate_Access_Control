package com.example.demo.repository;

import com.example.demo.entity.Estate;
import com.example.demo.entity.Security;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SecurityRepository extends JpaRepository<Security, Long> {

    Optional<Security> findByPublicId(UUID publicId);

    // Estate isolation
    List<Security> findByUserEstate(Estate estate);

    /*
     * Self-service activation lookups. The estate comes from the linked
     * login account (security.user_id -> users.estate_id), so an email or
     * phone number can never reach a security officer in another estate.
     *
     * Phone numbers are unique per estate for accounts created since V8;
     * older rows may still share one, so the oldest match wins.
     */
    Optional<Security> findFirstByEmailIgnoreCaseAndUserEstateId(
            String email, Long estateId);

    Optional<Security> findFirstByPhoneNumberAndUserEstateIdOrderByIdAsc(
            String phoneNumber, Long estateId);

    /*
     * Phone uniqueness helpers used by PhoneDirectoryGuard. A security
     * officer's number must not collide with another officer or with a
     * resident in the same estate.
     */
    boolean existsByPhoneNumberAndUserEstateId(
            String phoneNumber, Long estateId);

    boolean existsByPhoneNumberAndUserEstateIdAndIdNot(
            String phoneNumber, Long estateId, Long id);
}
