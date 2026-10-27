package com.example.demo.repository;

import com.example.demo.entity.Estate;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface EstateRepository extends JpaRepository<Estate, Long> {

    boolean existsByEstateCode(String estateCode);

    Estate findByEstateCode(String estateCode);

    Optional<Estate> findByPublicId(UUID publicId);
}
