package com.example.demo.service;

import com.example.demo.entity.Estate;
import com.example.demo.entity.VisitorStatus;
import com.example.demo.repository.VisitRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;

@Service
public class SecurityDashboardService {

    private final VisitRepository visitRepository;
    private final CurrentUserService currentUserService;

    public SecurityDashboardService(
            VisitRepository visitRepository,
            CurrentUserService currentUserService) {
        this.visitRepository = visitRepository;
        this.currentUserService = currentUserService;
    }

    // Complete dashboard data (estate-scoped)
    public Map<String, Long> getDashboard() {

        LocalDate today = LocalDate.now();
        Estate estate =
                currentUserService.getRequiredEstate();

        Map<String, Long> dashboard = new HashMap<>();

        dashboard.put(
                "todayVisits",
                visitRepository.countByVisitDateAndEstate(today, estate)
        );

        dashboard.put(
                "pendingVisits",
                visitRepository.countByStatusAndEstate(VisitorStatus.PENDING, estate)
        );

        dashboard.put(
                "checkedInVisits",
                visitRepository.countByStatusAndEstate(VisitorStatus.CHECKED_IN, estate)
        );

        dashboard.put(
                "checkedOutVisits",
                visitRepository.countByStatusAndEstate(VisitorStatus.CHECKED_OUT, estate)
        );

        dashboard.put(
                "expiredVisits",
                visitRepository.countByStatusAndEstate(VisitorStatus.EXPIRED, estate)
        );

        return dashboard;
    }

    public long getTodayVisits() {
        return visitRepository.countByVisitDateAndEstate(
                LocalDate.now(),
                currentUserService.getRequiredEstate()
        );
    }

    public long getPendingVisits() {
        return visitRepository.countByStatusAndEstate(
                VisitorStatus.PENDING,
                currentUserService.getRequiredEstate()
        );
    }

    public long getCheckedInVisits() {
        return visitRepository.countByStatusAndEstate(
                VisitorStatus.CHECKED_IN,
                currentUserService.getRequiredEstate()
        );
    }

    public long getCheckedOutVisits() {
        return visitRepository.countByStatusAndEstate(
                VisitorStatus.CHECKED_OUT,
                currentUserService.getRequiredEstate()
        );
    }

    public long getExpiredVisits() {
        return visitRepository.countByStatusAndEstate(
                VisitorStatus.EXPIRED,
                currentUserService.getRequiredEstate()
        );
    }
}
