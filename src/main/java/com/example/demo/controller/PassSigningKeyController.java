package com.example.demo.controller;

import com.example.demo.response.ApiResponse;
import com.example.demo.response.PassSigningKeyDto;
import com.example.demo.response.PassSigningKeyRequest;
import com.example.demo.service.PassSigningKeyService;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** Separate API surface for resident-owned signing keys; existing controllers stay unchanged. */
@RestController
@RequestMapping("/api/pass-keys")
public class PassSigningKeyController {

    private final PassSigningKeyService service;

    public PassSigningKeyController(PassSigningKeyService service) {
        this.service = service;
    }

    @PostMapping("/me")
    public ApiResponse<PassSigningKeyDto> registerMyKey(@RequestBody PassSigningKeyRequest request) {
        return new ApiResponse<>(true, "Pass signing key registered", service.registerMyKey(request));
    }

    @GetMapping("/me")
    public ApiResponse<List<PassSigningKeyDto>> getMyKeys() {
        return new ApiResponse<>(true, "Resident pass keys", service.getMyKeys());
    }

    @DeleteMapping("/me/{keyId}")
    public ApiResponse<Void> revokeMyKey(@PathVariable String keyId) {
        service.revokeMyKey(keyId);
        return new ApiResponse<>(true, "Pass signing key revoked", null);
    }

    @GetMapping("/estate")
    public ApiResponse<List<PassSigningKeyDto>> getEstateKeys() {
        return new ApiResponse<>(true, "Estate pass verification keys", service.getEstateKeys());
    }
}
