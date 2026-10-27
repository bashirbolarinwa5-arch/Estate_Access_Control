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
}
