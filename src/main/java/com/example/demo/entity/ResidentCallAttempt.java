package com.example.demo.entity;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;

@Entity
@Data
public class ResidentCallAttempt {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    private Visit visit;

    @ManyToOne(optional = false)
    private User initiatedBy;

    @Column(nullable = false)
    private LocalDateTime startedAt = LocalDateTime.now();

    private LocalDateTime completedAt;

    @Enumerated(EnumType.STRING)
    private Outcome outcome;

    public enum Outcome { ANSWERED, NO_ANSWER, UNABLE_TO_CALL }
}
