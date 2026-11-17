package com.example.demo.service;

import com.example.demo.entity.PasswordResetToken;
import com.example.demo.entity.Resident;
import com.example.demo.entity.Security;
import com.example.demo.entity.User;
import com.example.demo.repository.EstateRepository;
import com.example.demo.repository.PasswordResetTokenRepository;
import com.example.demo.repository.ResidentRepository;
import com.example.demo.repository.SecurityRepository;
import com.example.demo.repository.UserRepository;
import jakarta.transaction.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/*
 * Self-service account links.
 *
 * One mechanism serves two moments in an account's life:
 *
 *   ACTIVATION  the resident was provisioned by an administrator
 *               and has never chosen a password. The link lets
 *               them set one and switches the account to ACTIVE.
 *
 *   RESET       an active resident forgot their password.
 *
 * In both cases the raw token leaves the server ONLY inside the
 * email. It is never returned by the API, never logged, and only
 * its SHA-256 hash is stored. Tokens are single-use and expire
 * after 30 minutes.
 *
 * Every response is generic, so the endpoint cannot be used to
 * discover which accounts exist.
 */
@Service
public class PasswordResetService {

    private static final Logger log = LoggerFactory.getLogger(PasswordResetService.class);

    public static final String PURPOSE_ACTIVATION = "ACTIVATION";
    public static final String PURPOSE_RESET = "RESET";

    private static final int MAX_ATTEMPTS_PER_HOUR = 3;
    private static final int TOKEN_VALIDITY_MINUTES = 30;

    /*
     * Domains that can never receive a real message. A resident whose
     * only address lives here still gets the generic answer, but no
     * token is minted and no mail is attempted.
     */
    private static final Set<String> UNDELIVERABLE_DOMAINS = Set.of(
            "example.com",
            "example.org",
            "example.net",
            "estateflow.local"
    );

    private final PasswordResetTokenRepository resetTokens;
    private final ResidentRepository residents;
    private final SecurityRepository securities;
    private final UserRepository users;
    private final EstateRepository estates;
    private final PasswordEncoder passwordEncoder;
    private final ActivityLogService activityLogService;
    private final EmailService emailService;
    private final String frontendUrl;

    private final Map<String, List<LocalDateTime>> requestLog =
            new ConcurrentHashMap<>();

    public PasswordResetService(
            PasswordResetTokenRepository resetTokens,
            ResidentRepository residents,
            SecurityRepository securities,
            UserRepository users,
            EstateRepository estates,
            PasswordEncoder passwordEncoder,
            ActivityLogService activityLogService,
            EmailService emailService,
            @Value("${app.frontend-url:https://estate-access-control-phi.vercel.app}") String frontendUrl) {

        this.resetTokens = resetTokens;
        this.residents = residents;
        this.securities = securities;
        this.users = users;
        this.estates = estates;
        this.passwordEncoder = passwordEncoder;
        this.activityLogService = activityLogService;
        this.emailService = emailService;
        this.frontendUrl = frontendUrl.replaceAll("/$", "");
    }

    /* ------------------------------------------------------------------ */
    /* Public entry points                                                */
    /* ------------------------------------------------------------------ */

    /*
     * Anonymous request (login page). The caller supplies an estate code
     * plus either an email address or a phone number, so it works before
     * anybody is signed in.
     */
    @Transactional
    public Map<String, Object> requestLink(
            String identifier,
            String emailFallback,
            String estateCode,
            Long estateId,
            String purpose) {

        String flow = normalisePurpose(purpose);

        String requested = normaliseIdentifier(
                identifier != null && !identifier.isBlank()
                        ? identifier
                        : emailFallback);

        Map<String, Object> response = new HashMap<>();
        response.put("message", genericMessage(flow));

        Long resolvedEstateId = estateId;

        if (resolvedEstateId == null && estateCode != null && !estateCode.isBlank()) {

            var estate = estates.findByEstateCode(estateCode.trim().toUpperCase());

            if (estate != null) {
                resolvedEstateId = estate.getId();
            }
        }

        if (requested.isEmpty() || resolvedEstateId == null) {
            return response;
        }

        if (isRateLimited(resolvedEstateId, requested)) {
            activityLogService.log(
                    "SYSTEM",
                    "PASSWORD_RESET_RATE_LIMITED",
                    "Password reset requested too often for " + requested);
            return response;
        }

        AccountTarget target = resolveAccount(resolvedEstateId, requested);

        if (target == null) {
            activityLogService.log(
                    "SYSTEM",
                    "PASSWORD_RESET_REQUEST",
                    "Password reset requested for unknown account " + requested);
            return response;
        }

        dispatchLink(target, flow);

        return response;
    }

    /*
     * Backwards-compatible alias used by older callers that only pass an
     * email address.
     */
    @Transactional
    public Map<String, Object> requestReset(String email, String estateCode, Long estateId) {
        return requestLink(email, null, estateCode, estateId, PURPOSE_RESET);
    }

    /*
     * Administrator-triggered activation mail (the "resend" action in the
     * admin lists). The admin is authenticated and already allowed to see
     * the address, so this variant may report whether mail went out.
     */
    @Transactional
    public Map<String, Object> sendActivationLink(Resident resident) {

        Map<String, Object> result = new HashMap<>();

        if (resident == null || resident.getUser() == null) {
            result.put("sent", false);
            result.put("message", "This resident has no login account.");
            return result;
        }

        boolean sent = dispatchLink(
                new AccountTarget(
                        resident.getUser(),
                        resident.getEmail(),
                        resident.getFullName(),
                        "resident",
                        resident.getId()),
                PURPOSE_ACTIVATION);

        result.put("sent", sent);
        result.put(
                "message",
                sent
                        ? "Activation email sent to " + resident.getEmail()
                        : "This resident has no deliverable email address on file.");

        return result;
    }

    /*
     * Same action for a security officer. Guards follow the identical
     * self-service flow; only the wording of the reply differs.
     */
    @Transactional
    public Map<String, Object> sendActivationLink(Security officer) {

        Map<String, Object> result = new HashMap<>();

        if (officer == null || officer.getUser() == null) {
            result.put("sent", false);
            result.put("message", "This security officer has no login account.");
            return result;
        }

        boolean sent = dispatchLink(
                new AccountTarget(
                        officer.getUser(),
                        officer.getEmail(),
                        officer.getName(),
                        "security officer",
                        officer.getId()),
                PURPOSE_ACTIVATION);

        result.put("sent", sent);
        result.put(
                "message",
                sent
                        ? "Activation email sent to " + officer.getEmail()
                        : "This security officer has no deliverable email address on file.");

        return result;
    }

    /*
     * Consumes a single-use token and sets the new password.
     *
     * A pending account becomes ACTIVE here; an account an admin
     * disabled stays disabled (the reset only clears the activation
     * gate, it never overrides a deliberate ban).
     */
    @Transactional
    public Map<String, Object> resetPassword(String token, String newPassword) {

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

        if (resetToken.getUsedAt() != null
                || resetToken.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new RuntimeException("This reset link is invalid or has expired");
        }

        User user = resetToken.getUser();

        if (passwordEncoder.matches(newPassword, user.getPassword())) {
            throw new RuntimeException("New password must be different from the current password");
        }

        boolean wasPending = Boolean.TRUE.equals(user.getPendingActivation());

        user.setPassword(passwordEncoder.encode(newPassword));
        user.setMustChangePassword(false);
        user.setPendingActivation(false);
        users.save(user);

        resetToken.setUsedAt(LocalDateTime.now());
        resetTokens.save(resetToken);

        /*
         * Any other link that was still outstanding for this account is
         * burnt as well: choosing a password invalidates every earlier
         * link, not just the one that was used.
         */
        for (PasswordResetToken other : resetTokens.findByUserAndUsedAtIsNull(user)) {
            if (!other.getId().equals(resetToken.getId())) {
                other.setUsedAt(LocalDateTime.now());
                resetTokens.save(other);
            }
        }

        activityLogService.logForUser(
                user,
                user.getUsername(),
                wasPending ? "ACCOUNT_ACTIVATED" : "PASSWORD_RESET_COMPLETED",
                wasPending
                        ? user.getUsername() + " activated their account and set a password"
                        : user.getUsername() + " reset their password through a reset link");

        Map<String, Object> result = new HashMap<>();
        result.put(
                "message",
                wasPending
                        ? "Your account is now active. Sign in with your new password."
                        : "Password reset successfully");
        result.put("username", user.getUsername());

        return result;
    }

    /* ------------------------------------------------------------------ */
    /* Internals                                                          */
    /* ------------------------------------------------------------------ */

    /*
     * Everything one account needs in order to receive a link, regardless
     * of whether it belongs to a resident or a security officer.
     *
     * label is used in audit text ("resident 31"), id is the record id.
     */
    private record AccountTarget(
            User user,
            String email,
            String fullName,
            String label,
            Long recordId) {
    }

    private boolean dispatchLink(AccountTarget target, String flow) {

        User user = target.user();

        boolean activation = PURPOSE_ACTIVATION.equals(flow)
                || Boolean.TRUE.equals(user.getPendingActivation());

        String email = target.email();

        if (!isDeliverable(email)) {

            log.warn("Account link skipped: {} {} has no deliverable email address",
                    target.label(), target.recordId());

            activityLogService.logForUser(
                    user,
                    user.getUsername(),
                    "PASSWORD_RESET_NO_EMAIL",
                    "No deliverable email on file for " + target.label() + " " + target.recordId());

            return false;
        }

        LocalDateTime now = LocalDateTime.now();

        String rawToken = UUID.randomUUID().toString();

        PasswordResetToken token = new PasswordResetToken();
        token.setPublicId(UUID.randomUUID());
        token.setUser(user);
        token.setTokenHash(sha256(rawToken));
        token.setExpiresAt(now.plusMinutes(TOKEN_VALIDITY_MINUTES));
        token.setCreatedAt(now);
        resetTokens.save(token);

        String url = frontendUrl
                + "/reset-password?token="
                + java.net.URLEncoder.encode(rawToken, StandardCharsets.UTF_8);

        try {

            emailService.sendAccountLinkEmail(
                    email,
                    target.fullName(),
                    user.getUsername(),
                    url,
                    activation);

            /*
             * The audit entry is written only after JavaMailSender.send()
             * returned, so it proves the message was accepted for delivery.
             */
            activityLogService.logForUser(
                    user,
                    user.getUsername(),
                    "PASSWORD_RESET_REQUEST",
                    (activation ? "Activation link emailed to " : "Password reset link emailed to ")
                            + email);

            return true;

        } catch (Exception mailError) {

            log.error("Account link email could not be delivered for {}: {}",
                    email, mailError.getMessage());

            activityLogService.logForUser(
                    user,
                    user.getUsername(),
                    "PASSWORD_RESET_EMAIL_FAILED",
                    "Account link could not be emailed to " + email);

            return false;
        }
    }

    /*
     * Resolves an estate-scoped account by email address or phone number.
     *
     * Residents are checked first, then security officers, so the same
     * identifier can serve either role on the login page. The estate is
     * always part of the filter: an address in another estate never
     * resolves.
     */
    private AccountTarget resolveAccount(Long estateId, String identifier) {

        if (identifier.contains("@")) {

            Resident resident = residents
                    .findByEstateIdAndEmail(estateId, identifier)
                    .orElse(null);

            if (resident != null && resident.getUser() != null) {
                return new AccountTarget(
                        resident.getUser(),
                        resident.getEmail(),
                        resident.getFullName(),
                        "resident",
                        resident.getId());
            }

            Security officer = securities
                    .findFirstByEmailIgnoreCaseAndUserEstateId(identifier, estateId)
                    .orElse(null);

            if (officer != null && officer.getUser() != null) {
                return new AccountTarget(
                        officer.getUser(),
                        officer.getEmail(),
                        officer.getName(),
                        "security officer",
                        officer.getId());
            }

            return null;
        }

        String phone = normalisePhone(identifier);

        if (phone == null) {
            return null;
        }

        Resident resident = residents
                .findFirstByEstateIdAndPhoneNumberOrderByIdAsc(estateId, phone)
                .orElse(null);

        if (resident != null && resident.getUser() != null) {
            return new AccountTarget(
                    resident.getUser(),
                    resident.getEmail(),
                    resident.getFullName(),
                    "resident",
                    resident.getId());
        }

        Security officer = securities
                .findFirstByPhoneNumberAndUserEstateIdOrderByIdAsc(phone, estateId)
                .orElse(null);

        if (officer != null && officer.getUser() != null) {
            return new AccountTarget(
                    officer.getUser(),
                    officer.getEmail(),
                    officer.getName(),
                    "security officer",
                    officer.getId());
        }

        return null;
    }

    /*
     * Accepts 08012345678, 8012345678, +2348012345678 and 2348012345678
     * and normalises them all to the 11-digit local form stored in the
     * database.
     */
    private String normalisePhone(String value) {

        String digits = value.replaceAll("[^0-9]", "");

        if (digits.length() == 13 && digits.startsWith("234")) {
            digits = "0" + digits.substring(3);
        } else if (digits.length() == 12 && digits.startsWith("234")) {
            digits = "0" + digits.substring(3);
        } else if (digits.length() == 10 && digits.startsWith("8")) {
            digits = "0" + digits;
        }

        return digits.length() == 11 ? digits : null;
    }

    private String normaliseIdentifier(String value) {

        if (value == null) {
            return "";
        }

        String trimmed = value.trim();

        return trimmed.contains("@") ? trimmed.toLowerCase() : trimmed.replaceAll("[^0-9+]", "");
    }

    private String normalisePurpose(String purpose) {
        return PURPOSE_ACTIVATION.equalsIgnoreCase(
                purpose == null ? "" : purpose.trim())
                ? PURPOSE_ACTIVATION
                : PURPOSE_RESET;
    }

    private String genericMessage(String flow) {

        return PURPOSE_ACTIVATION.equals(flow)
                ? "If an account exists, an activation link has been sent."
                : "If this email exists for the estate, a password reset link has been sent.";
    }

    private boolean isRateLimited(Long estateId, String identifier) {

        LocalDateTime now = LocalDateTime.now();

        String key = estateId + "|" + identifier;

        List<LocalDateTime> attempts = requestLog.computeIfAbsent(
                key,
                ignored -> new java.util.concurrent.CopyOnWriteArrayList<>());

        attempts.removeIf(timestamp -> timestamp.isBefore(now.minusMinutes(60)));

        if (attempts.size() >= MAX_ATTEMPTS_PER_HOUR) {
            return true;
        }

        attempts.add(now);

        return false;
    }

    private boolean isDeliverable(String email) {

        if (email == null || email.isBlank() || !email.contains("@")) {
            return false;
        }

        String domain = email.substring(email.lastIndexOf('@') + 1)
                .trim()
                .toLowerCase();

        return !UNDELIVERABLE_DOMAINS.contains(domain);
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
