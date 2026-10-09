package com.example.demo.controller;

import com.example.demo.entity.ActivityLog;
import com.example.demo.response.ApiResponse;
import com.example.demo.service.ActivityLogService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/activity-logs")
public class ActivityLogController {

    private final ActivityLogService activityLogService;

    public ActivityLogController(
            ActivityLogService activityLogService) {

        this.activityLogService = activityLogService;
    }

    @GetMapping
    public ApiResponse<List<ActivityLog>> getAllLogs() {

        return new ApiResponse<>(
                true,
                "Activity logs retrieved successfully",
                activityLogService.getAllLogs()
        );
    }
}