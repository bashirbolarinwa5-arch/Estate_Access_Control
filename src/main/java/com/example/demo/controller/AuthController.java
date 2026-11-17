package com.example.demo.controller;

import com.example.demo.entity.User;
import com.example.demo.response.ForgotPasswordRequest;
import com.example.demo.response.LoginRequest;
import com.example.demo.response.LoginResponse;
import com.example.demo.response.RegisterRequest;
import com.example.demo.response.RegisterResponse;
import com.example.demo.response.ResetPasswordRequest;
import com.example.demo.service.AuthService;
import com.example.demo.service.PasswordResetService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import com.example.demo.response.LoginResponse;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final PasswordResetService passwordResetService;

    public AuthController(AuthService authService, PasswordResetService passwordResetService) {
        this.authService = authService;
        this.passwordResetService = passwordResetService;
    }

    @PostMapping("/register")
    public ResponseEntity<RegisterResponse> register(
            Authentication authentication,
            @RequestBody RegisterRequest request) {

        User user = authService.register(
                request.getUsername(),
                request.getPassword(),
                request.getRole(),
                request.getEstateCode(),
                authentication
        );

        RegisterResponse response = new RegisterResponse(
                user.getId(),
                user.getUsername(),
                user.getRole()
        );

        return ResponseEntity.ok(response);
    }
    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(
            @RequestBody LoginRequest request) {

        LoginResponse response = authService.login(
                request.getUsername(),
                request.getPassword()
        );

        return ResponseEntity.ok(response);
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<Map<String, Object>> forgotPassword(
            @RequestBody ForgotPasswordRequest request) {

        return ResponseEntity.ok(passwordResetService.requestLink(
                request.getIdentifier(),
                request.getEmail(),
                request.getEstateCode(),
                request.getEstateId(),
                request.getPurpose()));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<Map<String, Object>> resetPassword(
            @RequestBody ResetPasswordRequest request) {

        return ResponseEntity.ok(passwordResetService.resetPassword(
                request.getToken(),
                request.getNewPassword()));
    }

}
