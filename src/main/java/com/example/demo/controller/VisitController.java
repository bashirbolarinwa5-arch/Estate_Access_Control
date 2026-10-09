package com.example.demo.controller;

import com.example.demo.entity.Visit;
import com.example.demo.entity.Visitor;
import com.example.demo.response.ApiResponse;
import com.example.demo.service.VisitService;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/visit")
@CrossOrigin(origins = "*")
public class VisitController {

    private final VisitService service;

    public VisitController(VisitService service) {
        this.service = service;
    }

    // ==============================
    // RESIDENT - MY VISITS
    // ==============================

    @GetMapping("/me")
    public ApiResponse<List<Visit>> getMyVisits() {

        return new ApiResponse<>(
                true,
                "Your visits retrieved successfully",
                service.getMyVisits()
        );
    }

    // ==============================
    // RESIDENT - APPROVE MY VISIT
    // ==============================

    @PutMapping("/me/approve/{id}")
    public ApiResponse<Visit> approveMyVisit(
            @PathVariable Long id) {

        return new ApiResponse<>(
                true,
                "Visit approved successfully",
                service.approveMyVisit(id)
        );
    }

    // ==============================
    // RESIDENT - REJECT MY VISIT
    // ==============================

    @PutMapping("/me/reject/{id}")
    public ApiResponse<Visit> rejectMyVisit(
            @PathVariable Long id) {

        return new ApiResponse<>(
                true,
                "Visit rejected successfully",
                service.rejectMyVisit(id)
        );
    }

    // ==============================
    // GET ALL VISITS
    // ==============================

    @GetMapping
    public ApiResponse<List<Visit>> getAllVisit() {

        return new ApiResponse<>(
                true,
                "Visits retrieved successfully",
                service.getAllVisit()
        );
    }

    // ==============================
    // GET VISIT BY ID
    // ==============================

    @GetMapping("/{id}")
    public ApiResponse<Visit> getById(
            @PathVariable Long id) {

        return new ApiResponse<>(
                true,
                "Visit retrieved successfully",
                service.getVisitById(id)
        );
    }

    // ==============================
    // CREATE VISIT
    // ==============================

    @PostMapping
    public ApiResponse<Visit> createVisit(
            @RequestParam Long residentId,
            @RequestParam String purpose,
            @RequestBody Visitor visitor) {

        Visit visit = service.createVisit(
                residentId,
                visitor,
                purpose
        );

        return new ApiResponse<>(
                true,
                "Visit created successfully",
                visit
        );
    }

    // ==============================
    // GET PENDING VISITS
    // ==============================

    @GetMapping("/pending")
    public ApiResponse<List<Visit>> getPendingVisits() {

        return new ApiResponse<>(
                true,
                "Pending visits retrieved successfully",
                service.getPendingVisits()
        );
    }

    // ==============================
    // GET APPROVED VISITS
    // ==============================

    @GetMapping("/approved")
    public ApiResponse<List<Visit>> getApprovedVisits() {

        return new ApiResponse<>(
                true,
                "Approved visits retrieved successfully",
                service.getApprovedVisits()
        );
    }

    // ==============================
    // GET CHECKED-IN VISITS
    // ==============================

    @GetMapping("/checked-in")
    public ApiResponse<List<Visit>> getCheckedInVisits() {

        return new ApiResponse<>(
                true,
                "Checked-in visits retrieved successfully",
                service.getCheckedInVisits()
        );
    }

    // ==============================
    // APPROVE VISIT
    // ==============================

    @PutMapping("/approve/{id}")
    public ApiResponse<Visit> approveVisit(
            @PathVariable Long id) {

        return new ApiResponse<>(
                true,
                "Visit approved successfully",
                service.approveVisit(id)
        );
    }

    // ==============================
    // REJECT VISIT
    // ==============================

    @PutMapping("/reject/{id}")
    public ApiResponse<Visit> rejectVisit(
            @PathVariable Long id) {

        return new ApiResponse<>(
                true,
                "Visit rejected successfully",
                service.rejectVisit(id)
        );
    }

    // ==============================
    // UPDATE VISIT
    // ==============================

    @PutMapping("/{id}")
    public ApiResponse<Visit> updateVisit(
            @PathVariable Long id,
            @RequestBody Visit updatedVisit) {

        return new ApiResponse<>(
                true,
                "Visit updated successfully",
                service.updateVisit(id, updatedVisit)
        );
    }

    // ==============================
    // DELETE VISIT
    // ==============================

    @DeleteMapping("/{id}")
    public ApiResponse<Long> deleteVisit(
            @PathVariable Long id) {

        service.deleteVisitById(id);

        return new ApiResponse<>(
                true,
                "Visit deleted successfully",
                id
        );
    }

    // ==============================
    // CHECK IN VISITOR
    // ==============================

    @PostMapping("/check-In/{accessCode}")
    public ApiResponse<Visit> checkInVisitor(
            @PathVariable String accessCode) {

        Visit visit =
                service.checkInVisitor(accessCode);

        return new ApiResponse<>(
                true,
                "Visitor checked in successfully",
                visit
        );
    }

    // ==============================
    // CHECK OUT VISITOR
    // ==============================

    @PostMapping("/check-Out/{accessCode}")
    public ApiResponse<Visit> checkOutVisitor(
            @PathVariable String accessCode) {

        Visit visit =
                service.checkOutVisitor(accessCode);

        return new ApiResponse<>(
                true,
                "Visitor checked out successfully",
                visit
        );
    }
    @PostMapping("/planned")
    public ApiResponse<Visit> createPlannedVisit(
            Authentication authentication,
            @RequestParam Long visitorId,
            @RequestParam String purpose,
            @RequestParam LocalDate visitDate) {

        Visit visit = service.createPlannedVisit(
                authentication.getName(),
                visitorId,
                purpose,
                visitDate
        );

        return new ApiResponse<>(
                true,
                "Planned visit created successfully",
                visit
        );
    }
}