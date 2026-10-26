package com.example.demo.repository;

import com.example.demo.entity.ResidentCallAttempt;
import com.example.demo.entity.User;
import com.example.demo.entity.Visit;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ResidentCallAttemptRepository extends JpaRepository<ResidentCallAttempt, Long> {
    Optional<ResidentCallAttempt> findTopByVisitAndInitiatedByAndOutcomeIsNullOrderByStartedAtDesc(Visit visit, User user);
}
