package com.example.demo.service;

import com.example.demo.entity.Estate;
import com.example.demo.entity.Visit;
import com.example.demo.entity.VisitorStatus;
import com.example.demo.repository.VisitRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;

@Service
public class ReportService {

    private final VisitRepository visitRepository;
    private final CurrentUserService currentUserService;

    public ReportService(
            VisitRepository visitRepository,
            CurrentUserService currentUserService) {
        this.visitRepository = visitRepository;
        this.currentUserService = currentUserService;
    }

    // TODAY'S VISITS
    public List<Visit> getTodayVisits() {

        LocalDate today = LocalDate.now();
        Estate estate =
                currentUserService.getRequiredEstate();

        return visitRepository.findByVisitDateAndEstate(today, estate);
    }

    // VISITORS CURRENTLY INSIDE
    public List<Visit> getCurrentlyInside() {

        Estate estate =
                currentUserService.getRequiredEstate();

        return visitRepository.findByStatusAndEstate(
                VisitorStatus.CHECKED_IN,
                estate
        );
    }

    // ALL VISITS
    public List<Visit> getAllVisits() {

        Estate estate =
                currentUserService.getRequiredEstate();

        return visitRepository.findByEstate(estate);
    }
}
