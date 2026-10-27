package com.example.demo.controller;

import com.example.demo.response.ApiResponse;
import com.example.demo.response.SyncBatchRequestDto;
import com.example.demo.response.SyncResponseDto;
import com.example.demo.service.sync.SyncService;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/sync")
public class SyncController {

    private final SyncService syncService;

    public SyncController(SyncService syncService) {
        this.syncService = syncService;
    }

    @PostMapping("/batch")
    public ApiResponse<SyncResponseDto> synchronize(@RequestBody SyncBatchRequestDto request) {
        SyncResponseDto response = syncService.process(request == null ? null : request.mutations());
        return new ApiResponse<>(true, "Sync batch processed", response);
    }
}
