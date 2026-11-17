package com.example.demo.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

/*
 * Outbound email.
 *
 * Only transactional messages live here today: the password
 * reset link. The token itself is generated, hashed and stored
 * by PasswordResetService — this class merely delivers the
 * link to the address on the account.
 *
 * SMTP is configured through SPRING_MAIL_* / SMTP_* env vars
 * (see application.properties). In testing those point at a
 * Mailpit sink; in production they point at a real provider.
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
     * Sends the reset link. Throws on failure so the caller can
     * log it; the HTTP response stays generic either way.
     */
    public void sendPasswordResetEmail(String to, String resetUrl) {

        SimpleMailMessage message = new SimpleMailMessage();

        message.setFrom(fromName + " <" + fromAddress + ">");
        message.setTo(to);
        message.setSubject("Reset your EstateFlow password");

        message.setText(
                "Hello,\n\n"
                        + "We received a request to reset the password for your "
                        + "EstateFlow account.\n\n"
                        + "Open this link to choose a new password:\n\n"
                        + resetUrl + "\n\n"
                        + "This link expires in 30 minutes and can be used only once.\n\n"
                        + "If you did not request a password reset, you can safely "
                        + "ignore this email — your current password keeps working.\n\n"
                        + "— EstateFlow"
        );

        mailSender.send(message);
    }
}
