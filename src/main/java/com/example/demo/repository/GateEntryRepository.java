package com.example.demo.repository;

import com.example.demo.entity.Estate;
import com.example.demo.entity.GateEntry;
import com.example.demo.entity.GateEntryStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface GateEntryRepository extends JpaRepository<GateEntry, Long> {

    Optional<GateEntry> findByPublicId(UUID publicId);

    List<GateEntry> findByEstateAndStatusOrderByOccurredAtDesc(Estate estate, GateEntryStatus status);

    List<GateEntry> findByEstateAndAccessCodeAndStatus(
            Estate estate, String accessCode, GateEntryStatus status);

    long countByEstateAndStatus(Estate estate, GateEntryStatus status);
}
