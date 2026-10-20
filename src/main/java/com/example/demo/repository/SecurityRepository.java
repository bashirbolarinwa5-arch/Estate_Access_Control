package com.example.demo.repository;

import com.example.demo.entity.Estate;
import com.example.demo.entity.Security;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SecurityRepository extends JpaRepository<Security, Long> {

    // Estate isolation
    List<Security> findByUserEstate(Estate estate);
}
