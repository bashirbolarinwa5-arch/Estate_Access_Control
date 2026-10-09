package com.example.demo.service;

import com.example.demo.entity.ActivityLog;
import com.example.demo.repository.ActivityLogRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class ActivityLogService {

    private final ActivityLogRepository repository;

    public ActivityLogService(ActivityLogRepository repository) {
        this.repository = repository;
    }

    public void log(
            String actor,
            String action,
            String description) {

        ActivityLog activityLog = new ActivityLog();

        activityLog.setActor(actor);
        activityLog.setAction(action);
        activityLog.setDescription(description);
        activityLog.setTimestamp(LocalDateTime.now());

        repository.save(activityLog);
    }

    public List<ActivityLog> getAllLogs() {
        return repository.findAllByOrderByTimestampDesc();
    }
}