package com.example.demo.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "users")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

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

