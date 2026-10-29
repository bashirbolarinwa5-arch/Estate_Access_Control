package com.example.demo.entity;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * A check-in recorded by a guard while the estate gate had no connection.
 *
 * The device only knows the 6-character access code, so the entry is stored
 * first and reconciled with a real visit when the batch reaches the server.
 */
@Entity
@Data
public class GateEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "public_id", nullable = false, unique = true)
    private UUID publicId = UUID.randomUUID();

    @ManyToOne(optional = false)
    private Estate estate;

    @ManyToOne
    private User guardUser;

    @Column(name = "access_code", nullable = false, length = 12)
    private String accessCode;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private GateEntryStatus status;

    @ManyToOne
    private Visit visit;

    /** When the guard actually opened the gate (device clock). */
    private LocalDateTime occurredAt;

    /** When the server received the entry. */
    private LocalDateTime receivedAt;

    @Column(length = 300)
    private String note;
}
