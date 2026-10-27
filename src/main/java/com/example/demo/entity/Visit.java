package com.example.demo.entity;

import jakarta.persistence.*;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Data
public class Visit {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "public_id")
    private UUID publicId = UUID.randomUUID();

    @ManyToOne
    private Visitor visitor;

    @ManyToOne
    @JsonIgnoreProperties({"phoneNumber", "email", "user", "visitors"})
    private Resident resident;

    /*
     * Every visit is isolated inside one estate.
     */
    @ManyToOne
    private Estate estate;

    private String purpose;

    @Column(unique = true, nullable = false)
    private String accessCode;

    private LocalDate visitDate;

    private LocalDateTime checkInTime;

    private LocalDateTime checkOutTime;

    @Enumerated(EnumType.STRING)
    private VisitorStatus status;

}
