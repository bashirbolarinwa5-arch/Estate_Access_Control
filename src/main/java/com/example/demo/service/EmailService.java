package com.example.demo.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

/*
 * Outbound email.
 *
 * Only transactional messages live here: the secure account link
 * that lets a resident either activate a newly provisioned
 * account or reset a forgotten password.
 *
 * The raw token is built and hashed by PasswordResetService — this
 * class only delivers the link to the address on the account.
 *
 * SMTP is configured through SMTP_* env vars (see
 * application.properties). In production those point at Gmail SMTP.
 */
@Service
public class EmailService {

    private final JavaMailSender mailSender;
    private final String fromAddress;
    private final String fromName;

    public EmailService(
            JavaMailSender mailSender,
            @Value("${app.mail.from:no-reply@estateflow.local}") String fromAddress,
            @Value("${app.mail.from-name:EstateFlow}") String fromName) {

        this.mailSender = mailSender;
        this.fromAddress = fromAddress;
        this.fromName = fromName;
    }

    /*
     * Sends the single secure link. Throws on failure so the caller can
     * record it; the HTTP response stays generic either way.
     *
     * activation = true  -> the account has no password yet
     * activation = false -> an active account is resetting its password
     */
    public void sendAccountLinkEmail(
            String to,
            String fullName,
            String username,
            String link,
            boolean activation) {

        SimpleMailMessage message = new SimpleMailMessage();

        message.setFrom(fromName + " <" + fromAddress + ">");
        message.setTo(to);
        message.setSubject(
                activation
                        ? "Set your EstateFlow password"
                        : "Reset your EstateFlow password");

        String greeting = fullName == null || fullName.isBlank()
                ? "Hello,"
                : "Hello " + fullName.trim() + ",";

        String intro = activation
                ? "An EstateFlow account has been created for you by your estate "
                + "office. No password has been set yet — you choose it yourself."
                : "We received a request to reset the password for your "
                + "EstateFlow account.";

        String usernameLine = username == null || username.isBlank()
                ? ""
                : "\nYour username is: " + username + "\n";

        String closing = activation
                ? "If you were not expecting this, you can ignore this email — "
                + "the account simply stays inactive."
                : "If you did not request a password reset, you can safely "
                + "ignore this email — your current password keeps working.";

        message.setText(
                greeting + "\n\n"
                        + intro + "\n"
                        + usernameLine + "\n"
                        + "Open this link to choose your password:\n\n"
                        + link + "\n\n"
                        + "This link expires in 30 minutes and can be used only once.\n\n"
                        + closing + "\n\n"
                        + "— EstateFlow"
        );

        mailSender.send(message);
    }

    /*
     * Kept for callers that only deal with an existing account.
     */
    public void sendPasswordResetEmail(String to, String resetUrl) {
        sendAccountLinkEmail(to, null, null, resetUrl, false);
    }
}
