package com.example.demo.response;

import java.time.Instant;
import java.util.List;

/** Per-command results; a failed command never hides later results in the batch. */
public record SyncResponseDto(List<ItemResult> results) {

    public SyncResponseDto {
        results = List.copyOf(results);
    }

    public record ItemResult(
            String mutationId,
            String entityPublicId,
            String status,
            String message,
            Receipt receipt,
            Instant processedAt
    ) {
    }

    public record Receipt(Long serverId, String publicId) {
    }
}
