package com.example.demo.service;

import com.example.demo.entity.VisitorStatus;
import com.example.demo.repository.VisitRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;

@Service
public class SecurityDashboardService {

    private final VisitRepository visitRepository;

    public SecurityDashboardService(VisitRepository visitRepository) {
        this.visitRepository = visitRepository;
    }

    // Complete dashboard data
    public Map<String, Long> getDashboard() {

        Map<String, Long> dashboard = new HashMap<>();

        dashboard.put(
                "todayVisits",
                visitRepository.countByVisitDate(LocalDate.now())
        );

        dashboard.put(
                "pendingVisits",
                visitRepository.countByStatus(VisitorStatus.PENDING)
        );

        dashboard.put(
                "checkedInVisits",
                visitRepository.countByStatus(VisitorStatus.CHECKED_IN)
        );

        dashboard.put(
                "checkedOutVisits",
                visitRepository.countByStatus(VisitorStatus.CHECKED_OUT)
        );

        dashboard.put(
                "expiredVisits",
                visitRepository.countByStatus(VisitorStatus.EXPIRED)
        );

        return dashboard;
    }

    public long getTodayVisits() {
        return visitRepository.countByVisitDate(LocalDate.now());
    }

    public long getPendingVisits() {
        return visitRepository.countByStatus(VisitorStatus.PENDING);
    }

    public long getCheckedInVisits() {
        return visitRepository.countByStatus(VisitorStatus.CHECKED_IN);
    }

    public long getCheckedOutVisits() {
        return visitRepository.countByStatus(VisitorStatus.CHECKED_OUT);
    }

    public long getExpiredVisits() {
        return visitRepository.countByStatus(VisitorStatus.EXPIRED);
    }
}