package com.example.demo.entity;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Data;

import java.util.UUID;
@Entity
@Data
public class Security {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "public_id", updatable = false)
    private UUID publicId = UUID.randomUUID();

    private String name;
    private String phoneNumber;
    @JsonIgnore
    private String password;
    private String email;

    /*
     * The login account that belongs to this
     * security person. Kept so that deleting the
     * security record also revokes access.
     */
    @OneToOne
    @JoinColumn(name = "user_id", unique = true)
    @JsonIgnore
    private User user;

}
