package com.example.demo.response;

import tools.jackson.databind.JsonNode;

import java.time.Instant;

public record PassSigningKeyDto(
        String keyId,
        String residentPublicId,
        String estatePublicId,
        String algorithm,
        JsonNode publicJwk,
        Instant createdAt,
        Instant expiresAt,
        Instant revokedAt
) {
}
