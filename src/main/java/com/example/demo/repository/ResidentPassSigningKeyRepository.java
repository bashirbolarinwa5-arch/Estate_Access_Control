package com.example.demo.repository;

import com.example.demo.entity.Estate;
import com.example.demo.entity.Resident;
import com.example.demo.entity.ResidentPassSigningKey;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ResidentPassSigningKeyRepository extends JpaRepository<ResidentPassSigningKey, Long> {

    Optional<ResidentPassSigningKey> findByKeyId(UUID keyId);

    List<ResidentPassSigningKey> findByEstateAndRevokedAtIsNullAndExpiresAtAfter(Estate estate, Instant now);

    List<ResidentPassSigningKey> findByEstateAndExpiresAtAfter(Estate estate, Instant now);

    List<ResidentPassSigningKey> findByResidentAndRevokedAtIsNullAndExpiresAtAfter(Resident resident, Instant now);
}
