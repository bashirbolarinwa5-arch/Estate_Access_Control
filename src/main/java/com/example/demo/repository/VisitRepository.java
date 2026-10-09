package com.example.demo.repository;

import com.example.demo.entity.Resident;
import com.example.demo.entity.Visit;
import com.example.demo.entity.Visitor;
import com.example.demo.entity.VisitorStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface VisitRepository extends JpaRepository<Visit, Long> {

    List<Visit> findByStatus(VisitorStatus status);

    List<Visit> findByResident(Resident resident);

    List<Visit> findByVisitor(Visitor visitor);

    Visit findByAccessCode(String accessCode);

    List<Visit> findByVisitDate(LocalDate visitDate);

    long countByVisitDate(LocalDate visitDate);

    long countByStatus(VisitorStatus status);
}