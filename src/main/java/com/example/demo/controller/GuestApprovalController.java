package com.example.demo.controller;

import com.example.demo.response.ApiResponse;
import com.example.demo.response.VisitApprovalPreview;
import com.example.demo.response.VisitApprovalRequest;
import com.example.demo.service.VisitNotificationService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/visit/public-approval")
public class GuestApprovalController {
    private final VisitNotificationService notifications;

    public GuestApprovalController(VisitNotificationService notifications) {
        this.notifications = notifications;
    }

    @PostMapping("/preview")
    public ApiResponse<VisitApprovalPreview> preview(@RequestBody VisitApprovalRequest request) {
        return new ApiResponse<>(true, "Visit approval details retrieved", notifications.preview(request.token()));
    }

    @PostMapping("/decision")
    public ApiResponse<String> decide(@RequestBody VisitApprovalRequest request) {
        return new ApiResponse<>(true, "Your decision was recorded",
                notifications.decide(request.token(), request.approve()));
    }
}
