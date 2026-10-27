package com.example.demo.service;

import com.example.demo.entity.*;
import com.example.demo.repository.PushSubscriptionRepository;
import com.example.demo.repository.VisitApprovalLinkRepository;
import com.example.demo.repository.VisitNotificationRepository;
import com.example.demo.response.PushSubscriptionRequest;
import com.example.demo.response.VisitApprovalPreview;
import jakarta.transaction.Transactional;
import nl.martijndwars.webpush.Notification;
import nl.martijndwars.webpush.PushService;
import org.apache.http.HttpResponse;
import org.bouncycastle.jce.ECNamedCurveTable;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.bouncycastle.jce.spec.ECNamedCurveParameterSpec;
import org.bouncycastle.jce.spec.ECPublicKeySpec;
import org.bouncycastle.math.ec.ECPoint;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.nio.charset.StandardCharsets;
import java.net.URI;
import java.security.KeyFactory;
import java.security.PublicKey;
import java.security.Security;
import java.security.spec.InvalidKeySpecException;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.HexFormat;
import java.security.SecureRandom;

@Service
public class VisitNotificationService {
    private final PushSubscriptionRepository subscriptions;
    private final VisitNotificationRepository notifications;
    private final VisitApprovalLinkRepository links;
    private final ActivityLogService activityLogService;
    private final String vapidPublicKey;
    private final String vapidPrivateKey;
    private final String vapidSubject;
    private final String frontendUrl;
    private final boolean smsEnabled;
    private final String smsBaseUrl;
    private final String smsApiKey;
    private final String smsSender;

    public VisitNotificationService(
            PushSubscriptionRepository subscriptions,
            VisitNotificationRepository notifications,
            VisitApprovalLinkRepository links,
            ActivityLogService activityLogService,
            @Value("${app.push.public-key:}") String vapidPublicKey,
            @Value("${app.push.private-key:}") String vapidPrivateKey,
            @Value("${app.push.subject:mailto:support@estateflow.ng}") String vapidSubject,
            @Value("${app.frontend-url:https://estate-access-control-phi.vercel.app}") String frontendUrl,
            @Value("${app.termii.enabled:false}") boolean smsEnabled,
            @Value("${app.termii.base-url:}") String smsBaseUrl,
            @Value("${app.termii.api-key:}") String smsApiKey,
            @Value("${app.termii.sender-id:}") String smsSender) {
        this.subscriptions = subscriptions;
        this.notifications = notifications;
        this.links = links;
        this.activityLogService = activityLogService;
        this.vapidPublicKey = vapidPublicKey;
        this.vapidPrivateKey = vapidPrivateKey;
        this.vapidSubject = vapidSubject;
        this.frontendUrl = frontendUrl.replaceAll("/$", "");
        this.smsEnabled = smsEnabled;
        this.smsBaseUrl = smsBaseUrl.replaceAll("/$", "");
        this.smsApiKey = smsApiKey;
        this.smsSender = smsSender;
        if (Security.getProvider(BouncyCastleProvider.PROVIDER_NAME) == null) {
            Security.addProvider(new BouncyCastleProvider());
        }
    }

    public String getPublicKey() {
        return vapidPublicKey;
    }

    @Transactional
    public void saveSubscription(User user, PushSubscriptionRequest request) {
        if (request == null || request.endpoint() == null || request.p256dh() == null || request.auth() == null
                || !request.endpoint().startsWith("https://") || request.endpoint().length() > 2048) {
            throw new RuntimeException("A valid browser push subscription is required");
        }
        URI endpoint = URI.create(request.endpoint());
        String host = endpoint.getHost() == null ? "" : endpoint.getHost().toLowerCase();
        boolean trustedPushHost = List.of("fcm.googleapis.com", "push.services.mozilla.com", "web.push.apple.com")
                .stream().anyMatch(allowed -> host.equals(allowed) || host.endsWith("." + allowed));
        if (!trustedPushHost || (endpoint.getPort() != -1 && endpoint.getPort() != 443)
                || endpoint.getUserInfo() != null) {
            throw new RuntimeException("This browser push provider is not supported");
        }
        PushSubscription subscription = subscriptions.findByEndpoint(request.endpoint()).orElseGet(PushSubscription::new);
        subscription.setUser(user);
        subscription.setEndpoint(request.endpoint());
        subscription.setP256dh(request.p256dh());
        subscription.setAuth(request.auth());
        subscriptions.save(subscription);
    }

    @Transactional
    public void removeSubscription(User user, String endpoint) {
        if (endpoint != null) subscriptions.deleteByUserAndEndpoint(user, endpoint);
    }

    @Transactional
    public void queueWalkIn(Visit visit) {
        VisitNotification delivery = new VisitNotification();
        delivery.setVisit(visit);
        delivery.setPushAccepted(false);
        delivery.setPushAttempted(false);
        delivery.setSmsDueAt(LocalDateTime.now());
        notifications.save(delivery);
    }

    private void sendPush(PushSubscription subscription, String message) throws Exception {
        if (vapidPublicKey.isBlank() || vapidPrivateKey.isBlank()) return;
        ECNamedCurveParameterSpec curve = ECNamedCurveTable.getParameterSpec("secp256r1");
        ECPoint point = curve.getCurve().decodePoint(Base64.getDecoder().decode(subscription.getP256dh()));
        PublicKey userKey = KeyFactory.getInstance("ECDH", BouncyCastleProvider.PROVIDER_NAME)
                .generatePublic(new ECPublicKeySpec(point, curve));
        byte[] payload = ("{\"title\":\"EstateFlow visitor request\",\"body\":\""
                + message.replace("\\", "\\\\").replace("\"", "\\\"")
                + "\",\"url\":\"/resident/visits\"}").getBytes(StandardCharsets.UTF_8);
        Notification push = new Notification(subscription.getEndpoint(), userKey,
                Base64.getDecoder().decode(subscription.getAuth()), payload);
        HttpResponse response = new PushService(vapidPublicKey, vapidPrivateKey, vapidSubject).send(push);
        int status = response.getStatusLine().getStatusCode();
        if (status < 200 || status >= 300) throw new IllegalStateException("Push delivery returned HTTP " + status);
    }

    @Scheduled(fixedDelayString = "${app.notifications.poll-ms:5000}")
    @Transactional
    public void sendPendingPushes() {
        for (VisitNotification delivery : notifications.findTop100ByCompletedFalseAndPushAttemptedFalseOrderByIdAsc()) {
            Visit visit = delivery.getVisit();
            if (visit == null || visit.getStatus() != VisitorStatus.PENDING) {
                delivery.setCompleted(true);
                delivery.setPushAttempted(true);
                continue;
            }
            boolean accepted = false;
            if (!vapidPublicKey.isBlank() && !vapidPrivateKey.isBlank() && visit.getResident().getUser() != null) {
                for (PushSubscription subscription : subscriptions.findByUser(visit.getResident().getUser())) {
                    try {
                        sendPush(subscription, "A visitor is waiting at the estate gate.");
                        accepted = true;
                    } catch (Exception failure) {
                        if (failure.getMessage() != null && failure.getMessage().contains("410")) subscriptions.delete(subscription);
                    }
                }
            }
            delivery.setPushAttempted(true);
            delivery.setPushAccepted(accepted);
            delivery.setSmsDueAt(accepted ? LocalDateTime.now().plusMinutes(2) : LocalDateTime.now());
        }
    }

    @Scheduled(fixedDelayString = "${app.notifications.poll-ms:5000}")
    @Transactional
    public void sendDueSmsFallbacks() {
        for (VisitNotification delivery : notifications
                .findTop100ByCompletedFalseAndPushAttemptedTrueAndSmsSentAtIsNullAndSmsDueAtLessThanEqualOrderByIdAsc(LocalDateTime.now())) {
            Visit visit = delivery.getVisit();
            if (visit == null || visit.getStatus() != VisitorStatus.PENDING) {
                delivery.setCompleted(true);
                continue;
            }
            if (!smsEnabled || smsApiKey.isBlank() || smsBaseUrl.isBlank() || smsSender.isBlank()) {
                // Credentials are intentionally optional in deployments; avoid a noisy retry loop.
                activityLogService.logForUser(visit.getResident().getUser(), "SYSTEM",
                        "VISIT_SMS_NOT_CONFIGURED", "SMS fallback is not configured for visit " + visit.getId());
                delivery.setCompleted(true);
                continue;
            }
            VisitApprovalLink approvalLink = null;
            try {
                byte[] tokenBytes = new byte[32];
                new SecureRandom().nextBytes(tokenBytes);
                String rawToken = Base64.getUrlEncoder().withoutPadding().encodeToString(tokenBytes);
                approvalLink = new VisitApprovalLink();
                approvalLink.setVisit(visit);
                approvalLink.setTokenHash(sha256(rawToken));
                approvalLink.setExpiresAt(LocalDateTime.now().plusMinutes(20));
                links.save(approvalLink);
                String link = frontendUrl + "/guest-approval#token=" + rawToken;
                String sms = "Estate gate: " + visit.getVisitor().getFullName()
                        + " is waiting to visit you. Approve or decline (20 min): " + link;
                RestClient.create().post().uri(smsBaseUrl + "/api/sms/send")
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(Map.of("api_key", smsApiKey,
                                "to", normalizeNigerianNumber(visit.getResident().getPhoneNumber()),
                                "from", smsSender, "sms", sms, "type", "plain", "channel", "dnd"))
                        .retrieve().toBodilessEntity();
                delivery.setSmsSentAt(LocalDateTime.now());
                delivery.setCompleted(true);
            } catch (Exception failure) {
                if (approvalLink != null) links.delete(approvalLink);
                int attempts = delivery.getSmsAttempts() + 1;
                delivery.setSmsAttempts(attempts);
                activityLogService.logForUser(visit.getResident().getUser(), "SYSTEM",
                        "VISIT_NOTIFICATION_FAILED", "SMS fallback failed for visit " + visit.getId());
                if (attempts >= 3) delivery.setCompleted(true);
                else delivery.setSmsDueAt(LocalDateTime.now().plusSeconds(60));
            }
        }
    }

    @Transactional
    public VisitApprovalPreview preview(String token) {
        VisitApprovalLink link = validLink(token);
        Visit visit = link.getVisit();
        return new VisitApprovalPreview(visit.getVisitor().getFullName(), visit.getPurpose(),
                visit.getVisitDate(), visit.getResident().getHouseNumber(), visit.getStatus().name());
    }

    @Transactional
    public String decide(String token, boolean approve) {
        VisitApprovalLink link = validLink(token);
        Visit visit = link.getVisit();
        if (visit.getStatus() != VisitorStatus.PENDING) {
            throw new RuntimeException("This visit is no longer waiting for a decision");
        }
        visit.setStatus(approve ? VisitorStatus.APPROVED : VisitorStatus.REJECTED);
        link.setUsedAt(LocalDateTime.now());
        activityLogService.logForUser(visit.getResident().getUser(), "RESIDENT",
                approve ? "VISIT_APPROVED" : "VISIT_REJECTED",
                "Resident responded to visit " + visit.getId() + " through a secure SMS approval link");
        return approve ? "Visit approved" : "Visit declined";
    }

    private VisitApprovalLink validLink(String token) {
        if (token == null || token.length() > 128) throw new RuntimeException("This approval link is invalid or expired");
        VisitApprovalLink link = links.findByTokenHashForUpdate(sha256(token))
                .orElseThrow(() -> new RuntimeException("This approval link is invalid or expired"));
        if (link.getUsedAt() != null || link.getExpiresAt().isBefore(LocalDateTime.now()))
            throw new RuntimeException("This approval link is invalid or expired");
        return link;
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

    private String normalizeNigerianNumber(String phone) {
        if (phone == null || phone.isBlank()) throw new IllegalArgumentException("Resident phone number is missing");
        String digits = phone.replaceAll("\\D", "");
        if (digits.startsWith("0")) return "234" + digits.substring(1);
        if (digits.startsWith("234")) return digits;
        return digits;
    }
}
