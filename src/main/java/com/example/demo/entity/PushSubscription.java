package com.example.demo.entity;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;

@Entity
@Table(name = "push_subscriptions", uniqueConstraints =
        @UniqueConstraint(name = "uk_push_endpoint", columnNames = "endpoint"))
@Data
public class PushSubscription {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    private User user;

    @Column(nullable = false, length = 2048)
    private String endpoint;

    @Column(nullable = false, length = 512)
    private String p256dh;

    @Column(nullable = false, length = 256)
    private String auth;

    @Column(nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
}
