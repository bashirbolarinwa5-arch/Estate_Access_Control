package com.example.demo.entity;

import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import lombok.Data;

import java.util.List;

@Entity
@Data
public class Resident {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne
    @JoinColumn(name = "user_id", unique = true)
    private User user;

    @OneToMany(mappedBy = "resident")
    @JsonManagedReference
    private List<Visitor> visitors;

    private String fullName;

    private String phoneNumber;

    private String houseNumber;

    @Column(unique = true, nullable = false)
    private String email;
}