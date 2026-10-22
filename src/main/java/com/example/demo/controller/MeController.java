package com.example.demo.controller;

import com.example.demo.response.ApiResponse;
import com.example.demo.service.AuthService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/*
 * Endpoints about the current authenticated user ("me").
 *
 * Deliberately NOT under /api/auth/** — that path is permitAll
 * in SecurityConfig, while this controller relies on the
 * global anyRequest().authenticated() rule: a valid JWT is
 * required before any method here even runs.
 */
@RestController
@RequestMapping("/api/me")
public class MeController {

    private final AuthService authService;

    public MeController(AuthService authService) {
        this.authService = authService;
    }

    /*
     * Self-service password change for every role. The actor
     * is taken from the JWT, never from the request body.
     */
    @PostMapping("/change-password")
    public ResponseEntity<ApiResponse<Void>> changePassword(
            Authentication authentication,
            @RequestBody ChangePasswordRequest request) {

        authService.changePassword(
                authentication.getName(),
                request.currentPassword(),
                request.newPassword()
        );

        return ResponseEntity.ok(
                new ApiResponse<>(
                        true,
                        "Password changed successfully",
                        null
                )
        );
    }

    public record ChangePasswordRequest(
            String currentPassword,
            String newPassword) {
    }

}
