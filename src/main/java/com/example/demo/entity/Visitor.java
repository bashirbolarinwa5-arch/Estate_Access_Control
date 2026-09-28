package com.example.demo.entity;
import jakarta.persistence.Entity;
import lombok.Data;
import jakarta.persistence.*;
import com.fasterxml.jackson.annotation.JsonBackReference;


@Entity
@Data
public class Visitor {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JsonBackReference
    private Resident resident;

    private String fullName;
    private String purpose;
    private String phoneNumber;




}
