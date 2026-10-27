package com.example.demo.response;

import tools.jackson.databind.JsonNode;

/** One immutable offline command sent by a React client outbox. */
public record SyncCommandDto(
        String mutationId,
        String entityType,
        String entityPublicId,
        String operation,
        JsonNode payload,
        Long baseVersion,
        String createdAt
) {
}
