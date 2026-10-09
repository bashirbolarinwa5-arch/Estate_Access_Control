package com.example.demo.service;

import com.example.demo.entity.Visit;
import com.example.demo.entity.VisitorStatus;
import com.example.demo.repository.VisitRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;

@Service
public class ReportService {

    private final VisitRepository visitRepository;

    public ReportService(VisitRepository visitRepository) {
        this.visitRepository = visitRepository;
    }

    // TODAY'S VISITS
    public List<Visit> getTodayVisits() {

        LocalDate today = LocalDate.now();

        return visitRepository.findByVisitDate(today);
    }

    // VISITORS CURRENTLY INSIDE
    public List<Visit> getCurrentlyInside() {

        return visitRepository.findByStatus(
                VisitorStatus.CHECKED_IN
        );
    }

    // ALL VISITS
    public List<Visit> getAllVisits() {

        return visitRepository.findAll();
    }
}