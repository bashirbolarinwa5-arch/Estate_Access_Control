package com.example.demo.entity;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import lombok.Data;

import java.util.UUID;

@Entity
@Data
public class Visitor {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "public_id", updatable = false)
    private UUID publicId = UUID.randomUUID();

    @ManyToOne
    @JsonBackReference
    private Resident resident;

    /*
     * Every visitor is isolated inside one estate.
     */
    @ManyToOne
    private Estate estate;

    private String fullName;

    private String purpose;

    private String phoneNumber;

}
