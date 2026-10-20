package com.example.demo.repository;

import com.example.demo.entity.Estate;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EstateRepository extends JpaRepository<Estate, Long> {

    boolean existsByEstateCode(String estateCode);

    Estate findByEstateCode(String estateCode);
}
