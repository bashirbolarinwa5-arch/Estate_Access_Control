package com.example.demo.response;

import lombok.AllArgsConstructor;
import lombok.Data;

/*
 * Returned after an admin resets a password.
 *
 * The plain-text temporary password exists only in this
 * response — the database keeps only its BCrypt hash.
 */
@Data
@AllArgsConstructor
public class PasswordResetResult {

    private String username;

    private String temporaryPassword;
}
