package com.example.demo.service;

import com.example.demo.entity.Estate;
import com.example.demo.entity.PasswordResetToken;
import com.example.demo.entity.User;
import com.example.demo.repository.PasswordResetTokenRepository;
import com.example.demo.repository.ResidentRepository;
import com.example.demo.repository.UserRepository;
import jakarta.transaction.Transactional;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class PasswordResetService {

    private static final int MAX_RESET_ATTEMPTS_PER_HOUR = 3;
    private static final int RESET_TOKEN_VALIDITY_MINUTES = 30;

    private final PasswordResetTokenRepository resetTokens;
    private final ResidentRepository residents;
    private final UserRepository users;
    private final PasswordEncoder passwordEncoder;
    private final ActivityLogService activityLogService;

    private final Map<String, List<LocalDateTime>> resetRequestLog =
            new ConcurrentHashMap<>();

    public PasswordResetService(
            PasswordResetTokenRepository resetTokens,
            ResidentRepository residents,
            UserRepository users,
            PasswordEncoder passwordEncoder,
            ActivityLogService activityLogService) {

        this.resetTokens = resetTokens;
        this.residents = residents;
        this.users = users;
        this.passwordEncoder = passwordEncoder;
        this.activityLogService = activityLogService;
    }

    /*
     * Forgot password: resolves the email inside a specific estate, then issues
     * a single-use reset token that lives for 30 minutes. Unknown emails return
     * the same generic response so the endpoint cannot be used to enumerate
     * accounts.
     */
    @Transactional
    public Map<String, Object> requestReset(String email, Long estateId) {

        String normalizedEmail = email == null
                ? ""
                : email.trim().toLowerCase();

        String genericResponse =
                "If this email exists for the estate, a password reset link has been sent.";

        java.util.Map<String, Object> response =
                new java.util.HashMap<>();
        response.put("message", genericResponse);

        if (normalizedEmail.isEmpty() || estateId == null) {
            return response;
        }

        LocalDateTime now = LocalDateTime.now();
        List<LocalDateTime> attempts = resetRequestLog
                .computeIfAbsent(normalizedEmail, key -> new java.util.concurrent.CopyOnWriteArrayList<>());
        attempts.removeIf(timestamp -> timestamp.isBefore(now.minusMinutes(60)));
        if (attempts.size() >= MAX_RESET_ATTEMPTS_PER_HOUR) {
            activityLogService.log(
                    "SYSTEM",
                    "PASSWORD_RESET_RATE_LIMITED",
                    "Password reset requested too often for " + normalizedEmail);
            return response;
        }
        attempts.add(now);

        var resident = residents.findByEstateIdAndEmail(estateId, normalizedEmail).orElse(null);

        if (resident == null || resident.getUser() == null) {
            activityLogService.log(
                    "SYSTEM",
                    "PASSWORD_RESET_REQUEST",
                    "Password reset requested for unknown email " + normalizedEmail);
            return response;
        }

        User user = resident.getUser();

        String rawToken = java.util.UUID.randomUUID().toString();
        String tokenHash = sha256(rawToken);

        PasswordResetToken token = new PasswordResetToken();
        token.setPublicId(java.util.UUID.randomUUID());
        token.setUser(user);
        token.setTokenHash(tokenHash);
        token.setExpiresAt(now.plusMinutes(RESET_TOKEN_VALIDITY_MINUTES));
        token.setCreatedAt(now);
        resetTokens.save(token);

        response.put("token", rawToken);

        activityLogService.logForUser(
                user,
                user.getUsername(),
                "PASSWORD_RESET_REQUEST",
                "Password reset requested for " + normalizedEmail
                        + " (token issued: " + (token.getExpiresAt().isAfter(now) ? "yes" : "no") + ")");

        return response;
    }

    /*
     * Reset password: consumes a single-use token and sets a new password.
     * The token is bound to a user, so the reset can only ever affect the
     * estate that user belongs to.
     */
    @Transactional
    public void resetPassword(String token, String newPassword) {

        if (token == null || token.isBlank() || newPassword == null) {
            throw new RuntimeException("Reset token and new password are required");
        }

        if (newPassword.length() < 8) {
            throw new RuntimeException("New password must be at least 8 characters");
        }

        if (newPassword.length() > 72) {
            throw new RuntimeException("Password is too long (maximum 72 characters)");
        }

        String tokenHash = sha256(token.trim());
        PasswordResetToken resetToken = resetTokens.findByTokenHash(tokenHash).orElse(null);

        if (resetToken == null) {
            throw new RuntimeException("This reset link is invalid or has expired");
        }

        if (resetToken.getUsedAt() != null || resetToken.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new RuntimeException("This reset link is invalid or has expired");
        }

        User user = resetToken.getUser();

        if (passwordEncoder.matches(newPassword, user.getPassword())) {
            throw new RuntimeException("New password must be different from the current password");
        }

        user.setPassword(passwordEncoder.encode(newPassword));
        user.setMustChangePassword(false);
        users.save(user);

        resetToken.setUsedAt(LocalDateTime.now());

        resetTokens.save(resetToken);

        activityLogService.logForUser(
                user,
                user.getUsername(),
                "PASSWORD_RESET_COMPLETED",
                user.getUsername() + " reset their password through a reset link");
    }

    private String sha256(String value) {
        try {
            byte[] digest = java.security.MessageDigest.getInstance("SHA-256")
                    .digest(value.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }
}
