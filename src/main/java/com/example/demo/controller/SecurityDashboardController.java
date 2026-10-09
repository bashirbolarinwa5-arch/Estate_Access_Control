package com.example.demo.controller;

import com.example.demo.response.ApiResponse;
import com.example.demo.service.SecurityDashboardService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/security/dashboard")
public class SecurityDashboardController {

    private final SecurityDashboardService dashboardService;

    public SecurityDashboardController(
            SecurityDashboardService dashboardService) {

        this.dashboardService = dashboardService;
    }

    @GetMapping
    public ApiResponse<Map<String, Long>> getDashboard() {

        return new ApiResponse<>(
                true,
                "Security dashboard retrieved successfully",
                dashboardService.getDashboard()
        );
    }
}