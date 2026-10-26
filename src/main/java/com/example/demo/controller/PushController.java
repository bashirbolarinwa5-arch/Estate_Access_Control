package com.example.demo.controller;

import com.example.demo.entity.User;
import com.example.demo.response.ApiResponse;
import com.example.demo.response.PushSubscriptionRequest;
import com.example.demo.service.CurrentUserService;
import com.example.demo.service.VisitNotificationService;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/push")
public class PushController {
    private final VisitNotificationService notificationService;
    private final CurrentUserService currentUserService;

    public PushController(VisitNotificationService notificationService, CurrentUserService currentUserService) {
        this.notificationService = notificationService;
        this.currentUserService = currentUserService;
    }

    @GetMapping("/public-key")
    public ApiResponse<Map<String, String>> publicKey() {
        return new ApiResponse<>(true, "Push key retrieved", Map.of("publicKey", notificationService.getPublicKey()));
    }

    @PostMapping("/subscriptions")
    public ApiResponse<Void> subscribe(@RequestBody PushSubscriptionRequest request) {
        User user = currentUserService.getCurrentUser();
        if (user == null || user.getRole() == null || !user.getRole().name().equals("ROLE_RESIDENT")) {
            throw new RuntimeException("Resident account required");
        }
        notificationService.saveSubscription(user, request);
        return new ApiResponse<>(true, "Visitor alerts enabled", null);
    }

    @DeleteMapping("/subscriptions")
    public ApiResponse<Void> unsubscribe(@RequestBody PushSubscriptionRequest request) {
        User user = currentUserService.getCurrentUser();
        if (user == null || user.getRole() == null || !user.getRole().name().equals("ROLE_RESIDENT")) {
            throw new RuntimeException("Resident account required");
        }
        notificationService.removeSubscription(user, request.endpoint());
        return new ApiResponse<>(true, "Visitor alerts disabled", null);
    }
}
