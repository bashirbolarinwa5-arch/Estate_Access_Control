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
     * Optional gate / shift assignment captured on import, e.g.
     * "Main Gate - Night". Informational only.
     */
    private String shift;

    /*
     * The login account that belongs to this
     * security person. Kept so that deleting the
     * security record also revokes access.
     */
    @OneToOne
    @JoinColumn(name = "user_id", unique = true)
    @JsonIgnore
    private User user;

    /*
     * Read-only view of the linked account's activation state for the
     * admin list. Nothing is stored here — the single source of truth is
     * the User row, exactly as for residents.
     *
     *   PENDING_ACTIVATION  no password chosen yet; login is blocked
     *   ACTIVE              the officer has set a password
     *   DISABLED            an administrator disabled the account
     *   NO_ACCOUNT          legacy row without a login account
     */
    @Transient
    public String getActivationStatus() {

        if (user == null) {
            return "NO_ACCOUNT";
        }

        if (Boolean.TRUE.equals(user.getPendingActivation())) {
            return "PENDING_ACTIVATION";
        }

        return Boolean.TRUE.equals(user.getActive()) ? "ACTIVE" : "DISABLED";
    }

}
