package com.example.demo.controller;

import com.example.demo.entity.User;
import com.example.demo.response.LoginRequest;
import com.example.demo.response.RegisterRequest;
import com.example.demo.response.RegisterResponse;
import com.example.demo.service.AuthService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.example.demo.response.LoginResponse;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    public ResponseEntity<RegisterResponse> register(
            @RequestBody RegisterRequest request) {

        User user = authService.register(
                request.getUsername(),
                request.getPassword(),
                request.getRole()
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

}
