package com.example.demo.entity;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;

@Entity
@Data
public class VisitNotification {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(optional = false)
    private Visit visit;

    @Column(nullable = false)
    private LocalDateTime smsDueAt;

    private LocalDateTime smsSentAt;

    @Column(nullable = false)
    private int smsAttempts;

    @Column(nullable = false)
    private boolean pushAccepted;

    @Column(nullable = false)
    private boolean pushAttempted;

    @Column(nullable = false)
    private boolean completed;
}
