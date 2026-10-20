package com.example.demo.controller;

import com.example.demo.entity.User;
import com.example.demo.entity.Visit;
import com.example.demo.response.ApiResponse;
import com.example.demo.service.SuperAdminService;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/*
 * Platform-owner endpoints. Every route under /super-admin is
 * locked to ROLE_SUPER_ADMIN in SecurityConfig — estate admins
 * and other roles cannot reach any of it.
 */
@RestController
@RequestMapping("/super-admin")
public class SuperAdminController {

    private final SuperAdminService superAdminService;

    public SuperAdminController(SuperAdminService superAdminService) {
        this.superAdminService = superAdminService;
    }


    /* =====================================================
       ESTATE ADMIN MANAGEMENT
       ===================================================== */

    @GetMapping("/admins")
    public ApiResponse<List<User>> listAdmins() {

        return new ApiResponse<>(
                true,
                "Estate administrators retrieved successfully",
                superAdminService.listAdmins()
        );
    }


    @PostMapping("/admins")
    public ApiResponse<User> createAdmin(
            @RequestBody CreateAdminRequest request) {

        return new ApiResponse<>(
                true,
                "Estate administrator created successfully",
                superAdminService.createAdmin(
                        request.username(),
                        request.password()
                )
        );
    }


    @PutMapping("/admins/{id}")
    public ApiResponse<User> updateAdmin(
            @PathVariable Long id,
            @RequestBody UpdateAdminRequest request) {

        return new ApiResponse<>(
                true,
                "Estate administrator updated successfully",
                superAdminService.updateUsername(
                        id,
                        request.username()
                )
        );
    }


    @PutMapping("/admins/{id}/disable")
    public ApiResponse<User> disableAdmin(@PathVariable Long id) {

        return new ApiResponse<>(
                true,
                "Estate administrator disabled",
                superAdminService.setAdminEnabled(id, false)
        );
    }


    @PutMapping("/admins/{id}/enable")
    public ApiResponse<User> enableAdmin(@PathVariable Long id) {

        return new ApiResponse<>(
                true,
                "Estate administrator re-enabled",
                superAdminService.setAdminEnabled(id, true)
        );
    }


    @PutMapping("/admins/{id}/reset-password")
    public ApiResponse<User> resetAdminPassword(
            @PathVariable Long id,
            @RequestBody ResetPasswordRequest request) {

        return new ApiResponse<>(
                true,
                "Password reset successfully",
                superAdminService.resetAdminPassword(
                        id,
                        request.password()
                )
        );
    }


    /* =====================================================
       GLOBAL STATISTICS & SYSTEM ACTIVITY
       ===================================================== */

    @GetMapping("/stats")
    public ApiResponse<Map<String, Object>> globalStats() {

        return new ApiResponse<>(
                true,
                "Global statistics retrieved successfully",
                superAdminService.getGlobalStats()
        );
    }


    @GetMapping("/recent-visits")
    public ApiResponse<List<Visit>> recentVisits() {

        return new ApiResponse<>(
                true,
                "Recent visits retrieved successfully",
                superAdminService.recentVisits()
        );
    }


    /* =====================================================
       REQUEST BODIES
       ===================================================== */

    public record CreateAdminRequest(
            String username,
            String password
    ) {
    }

    public record UpdateAdminRequest(
            String username
    ) {
    }

    public record ResetPasswordRequest(
            String password
    ) {
    }

}
