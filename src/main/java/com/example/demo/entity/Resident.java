package com.example.demo.entity;

import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import lombok.Data;

import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "resident", uniqueConstraints = {
        @UniqueConstraint(name = "uk_resident_estate_email", columnNames = {"user_id", "email"})
})
@Data
public class Resident {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "public_id", updatable = false)
    private UUID publicId = UUID.randomUUID();

    @OneToOne
    @JoinColumn(name = "user_id", unique = true)
    private User user;

    @OneToMany(mappedBy = "resident")
    @JsonManagedReference
    private List<Visitor> visitors;

    private String fullName;

    private String phoneNumber;

    private String houseNumber;

    /*
     * Email is scoped per estate through the owning user (resident -> user ->
     * users.estate_id). The database enforces (user_id, email) uniqueness so
     * the same email can exist in different estates.
     */
    @Column(nullable = false)
    private String email;
}
