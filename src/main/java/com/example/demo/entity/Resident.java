package com.example.demo.entity;

import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import lombok.Data;

import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "resident", uniqueConstraints = {
        @UniqueConstraint(name = "uk_resident_estate_email", columnNames = {"estate_id", "email"})
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

    /*
     * Denormalized estate scope used for per-estate uniqueness. The owning
     * user is resident.user_id -> users.id -> users.estate_id, and this column
     * carries the same estate for fast per-estate lookups and constraints.
     */
    @Column(name = "estate_id")
    private Long estateId;

    @OneToMany(mappedBy = "resident")
    @JsonManagedReference
    private List<Visitor> visitors;

    private String fullName;

    private String phoneNumber;

    private String houseNumber;

    /*
     * Email is scoped per estate through the estateId column. The database
     * enforces (estate_id, email) uniqueness so the same email can exist in
     * different estates but not twice for the same estate.
     */
    @Column(nullable = false)
    private String email;
}
