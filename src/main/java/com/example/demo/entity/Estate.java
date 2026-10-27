package com.example.demo.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

/*
 * An estate is the tenant-like boundary of EstateFlow.
 * It owns users (admins, security, residents), visitors,
 * visits and its own activity logs.
 *
 * The platform itself (and SUPER_ADMIN) does NOT belong
 * to an estate.
 */
@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Estate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "public_id", updatable = false)
    private UUID publicId = UUID.randomUUID();

    @Column(nullable = false)
    private String estateName;

    /*
     * Short public handle used in dashboards and (later)
     * public resident sign-up: e.g. "EST001".
     */
    @Column(nullable = false, unique = true)
    private String estateCode;

    /*
     * A deactivated estate keeps all its data but its
     * users can no longer act inside it.
     */
    @Column(nullable = false)
    private Boolean active = true;

    @JsonIgnore
    private LocalDateTime createdAt;

    public Estate(String estateName, String estateCode) {
        this.estateName = estateName;
        this.estateCode = estateCode;
        this.active = true;
        this.createdAt = LocalDateTime.now();
    }

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (active == null) {
            active = true;
        }
    }

}
