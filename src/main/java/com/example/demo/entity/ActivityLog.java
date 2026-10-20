package com.example.demo.entity;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;

@Entity
@Data
public class ActivityLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String actor;

    private String action;

    private String description;

    private LocalDateTime timestamp;

    /*
     * The estate this event happened in, or NULL for
     * platform-level events. Login events are attached to
     * the logging-in user's estate; SUPER_ADMIN actions
     * are platform-wide (NULL).
     */
    @ManyToOne
    private Estate estate;

}