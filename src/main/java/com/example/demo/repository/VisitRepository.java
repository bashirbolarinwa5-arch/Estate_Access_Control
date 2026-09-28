package com.example.demo.repository;

import com.example.demo.entity.Visitor;
import com.example.demo.entity.Visit;
import org.springframework.data.jpa.repository.JpaRepository;
import com.example.demo.entity.VisitorStatus;
import com.example.demo.entity.Resident;


import java.util.List;

public interface VisitRepository extends JpaRepository<Visit,Long> {
    List<Visit> findByStatus(VisitorStatus status);

    List<Visit> findByResident(Resident resident);

    List<Visit> findByVisitor(Visitor visitor);

    Visit findByAccessCode(String accessCode);

}


