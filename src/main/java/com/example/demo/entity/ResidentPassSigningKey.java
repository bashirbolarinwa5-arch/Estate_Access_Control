package com.example.demo.entity;

import jakarta.persistence.*;
import lombok.Data;

import java.time.Instant;
import java.util.UUID;

/** A resident-owned public key used by gate clients to verify signed offline passes. */
@Entity
@Table(name = "resident_pass_signing_keys", uniqueConstraints = {
        @UniqueConstraint(name = "uk_pass_key_key_id", columnNames = "key_id")
})
@Data
public class ResidentPassSigningKey {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "key_id", nullable = false, updatable = false)
    private UUID keyId;

    @ManyToOne(optional = false)
    @JoinColumn(name = "resident_id", nullable = false)
    private Resident resident;

    @ManyToOne(optional = false)
    @JoinColumn(name = "estate_id", nullable = false)
    private Estate estate;

    @Column(name = "algorithm", nullable = false, length = 40)
    private String algorithm;

    @Column(name = "public_jwk", nullable = false, columnDefinition = "text")
    private String publicJwk;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "revoked_at")
    private Instant revokedAt;
}
