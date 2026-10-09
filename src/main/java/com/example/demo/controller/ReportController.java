package com.example.demo.controller;

import com.example.demo.entity.Visit;
import com.example.demo.response.ApiResponse;
import com.example.demo.service.ReportService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/reports")
public class ReportController {

    private final ReportService reportService;

    public ReportController(ReportService reportService) {
        this.reportService = reportService;
    }

    // TODAY'S VISITS
    @GetMapping("/today")
    public ApiResponse<List<Visit>> getTodayVisits() {

        return new ApiResponse<>(
                true,
                "Today's visits retrieved successfully",
                reportService.getTodayVisits()
        );
    }

    // VISITORS CURRENTLY INSIDE
    @GetMapping("/currently-inside")
    public ApiResponse<List<Visit>> getCurrentlyInside() {

        return new ApiResponse<>(
                true,
                "Currently inside visitors retrieved successfully",
                reportService.getCurrentlyInside()
        );
    }

    // ALL VISITS REPORT
    @GetMapping("/visits")
    public ApiResponse<List<Visit>> getAllVisits() {

        return new ApiResponse<>(
                true,
                "Visit report retrieved successfully",
                reportService.getAllVisits()
        );
    }
}