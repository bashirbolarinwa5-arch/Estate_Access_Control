package com.example.demo.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Entity
@Table(name = "users")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "public_id", updatable = false)
    private UUID publicId = UUID.randomUUID();

    @Column(nullable = false, unique = true)
    private String username;


    @JsonIgnore
    @Column(nullable = false)
    private String password;


    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role;


    /*
     * Disabled accounts keep their data but can no longer
     * log in, and existing tokens stop working because the
     * JWT filter re-checks this flag on every request.
     *
     * The column default keeps existing users enabled when
     * Hibernate adds the column to an existing database.
     */
    @Column(nullable = false, columnDefinition = "boolean default true")
    private Boolean active = true;


    /*
     * True when the current password is a system-generated
     * temporary password.
     *
     * Login still succeeds (the user needs the token to reach
     * the change-password screen), but every other protected
     * endpoint is blocked until the password is replaced.
     *
     * The column default keeps existing accounts unaffected
     * when Hibernate adds the column to an existing database.
     */
    @Column(nullable = false, columnDefinition = "boolean default false")
    private Boolean mustChangePassword = false;


    /*
     * The estate this account operates in.
     *
     * NULL means the account belongs to the platform,
     * not to an estate — that is exactly and only the
     * SUPER_ADMIN.
     */
    @ManyToOne
    @JoinColumn(name = "estate_id")
    private Estate estate;



    public User(String username, String password, Role role) {
        this.username = username;
        this.password = password;
        this.role = role;
    }


}

