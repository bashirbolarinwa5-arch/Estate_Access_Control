package com.example.demo.entity;

import jakarta.persistence.*;
import lombok.Data;

import java.time.Instant;
import java.util.UUID;

/** Durable per-actor idempotency record for offline sync commands. */
@Entity
@Table(
        name = "sync_command_receipts",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_sync_actor_mutation_public_id",
                columnNames = {"actor_user_id", "mutation_public_id"}
        )
)
@Data
public class SyncCommandReceipt {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "actor_user_id", nullable = false)
    private User actorUser;

    @Column(name = "mutation_public_id", nullable = false, updatable = false)
    private UUID mutationPublicId;

    @Column(name = "entity_public_id")
    private UUID entityPublicId;

    @Column(name = "entity_type", nullable = false, length = 40)
    private String entityType;

    @Column(nullable = false, length = 60)
    private String operation;

    @Column(nullable = false, length = 16)
    private String status;

    @Column(name = "payload_hash", nullable = false, length = 64)
    private String payloadHash;

    @Column(length = 500)
    private String message;

    @Column(name = "server_id")
    private Long serverId;

    @Column(name = "result_public_id")
    private UUID resultPublicId;

    @Column(name = "processed_at", nullable = false)
    private Instant processedAt;
}
