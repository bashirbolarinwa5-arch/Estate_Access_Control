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
     * True for accounts that were provisioned by an administrator
     * (CSV import, manual create, offline sync) but whose owner has
     * not chosen a password yet.
     *
     * Such an account stores an unguessable random hash that nobody
     * knows — there is no shared, default or temporary password.
     * Login is blocked with an explicit "not activated" message
     * until the resident sets a password through the emailed link.
     *
     * The column default keeps every existing account unaffected
     * when the column is added to a populated database.
     */
    @Column(nullable = false, columnDefinition = "boolean default false")
    private Boolean pendingActivation = false;


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

