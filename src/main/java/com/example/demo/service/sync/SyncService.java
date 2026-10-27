package com.example.demo.service.sync;

import com.example.demo.entity.SyncCommandReceipt;
import com.example.demo.entity.User;
import com.example.demo.repository.SyncCommandReceiptRepository;
import com.example.demo.response.SyncCommandDto;
import com.example.demo.response.SyncResponseDto;
import com.example.demo.service.CurrentUserService;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.ObjectNode;
import org.springframework.dao.DataAccessException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.TransientDataAccessException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.security.MessageDigest;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;
import java.util.UUID;

/** Sequential, per-item, idempotent processor for the React offline outbox. */
@Service
public class SyncService {

    private static final int MAX_BATCH_SIZE = 100;
    private static final String RETRY_MESSAGE = "Temporarily unable to sync this item. It is safe to retry.";

    private final CurrentUserService currentUserService;
    private final SyncCommandReceiptRepository receipts;
    private final SyncCommandProcessor processor;
    private final ObjectMapper objectMapper;
    private final TransactionTemplate transactionTemplate;

    public SyncService(
            CurrentUserService currentUserService,
            SyncCommandReceiptRepository receipts,
            SyncCommandProcessor processor,
            ObjectMapper objectMapper,
            PlatformTransactionManager transactionManager) {
        this.currentUserService = currentUserService;
        this.receipts = receipts;
        this.processor = processor;
        this.objectMapper = objectMapper;
        this.transactionTemplate = new TransactionTemplate(transactionManager);
    }

    public SyncResponseDto process(List<SyncCommandDto> commands) {
        List<SyncCommandDto> safeCommands = commands == null ? List.of() : commands;
        User actor = currentUserService.getCurrentUser();
        List<SyncResponseDto.ItemResult> results = new ArrayList<>(safeCommands.size());

        if (safeCommands.size() > MAX_BATCH_SIZE) {
            for (SyncCommandDto command : safeCommands) {
                results.add(result(command, "REJECTED", "A sync batch cannot contain more than 100 items.", null));
            }
            return new SyncResponseDto(results);
        }

        // Intentionally sequential: later commands may depend on earlier ones.
        for (SyncCommandDto command : safeCommands) {
            results.add(processOne(actor, command));
        }
        return new SyncResponseDto(results);
    }

    private SyncResponseDto.ItemResult processOne(User actor, SyncCommandDto command) {
        if (command == null) {
            return result(null, "REJECTED", "Sync item is empty.", null);
        }

        UUID mutationPublicId;
        try {
            mutationPublicId = parseUuid(command.mutationId());
        } catch (IllegalArgumentException invalid) {
            return result(command, "REJECTED", "mutationId must be a valid UUID.", null);
        }

        if (actor == null) {
            return result(command, "REJECTED", "An authenticated account is required.", null);
        }

        String payloadHash;
        try {
            payloadHash = fingerprint(command);
        } catch (Exception serializationFailure) {
            return result(command, "RETRY", RETRY_MESSAGE, null);
        }

        UUID entityPublicId = null;
        String invalidPublicIdMessage = null;
        try {
            entityPublicId = parseUuid(command.entityPublicId());
        } catch (IllegalArgumentException invalid) {
            invalidPublicIdMessage = "entityPublicId must be a valid UUID.";
        }

        final UUID targetPublicId = entityPublicId;
        final String invalidIdReason = invalidPublicIdMessage;
        try {
            return transactionTemplate.execute(status -> {
                SyncCommandReceipt existing = findReceipt(actor, mutationPublicId);
                if (existing != null) return replay(existing, payloadHash, command);
                if (invalidIdReason != null) {
                    throw new SyncCommandProcessor.ItemFailure("REJECTED", invalidIdReason);
                }

                SyncCommandProcessor.ProcessedCommand processed =
                        processor.process(actor, command, targetPublicId);
                SyncCommandReceipt receipt = newReceipt(
                        actor, command, mutationPublicId, targetPublicId, payloadHash,
                        "ACKNOWLEDGED", "Synced.", processed.serverId(), processed.publicId());
                receipts.saveAndFlush(receipt);
                return toResult(receipt, command);
            });
        } catch (SyncCommandProcessor.ItemFailure failure) {
            return persistOutcome(actor, command, mutationPublicId, targetPublicId,
                    payloadHash, failure.getStatus(), failure.getMessage());
        } catch (DataIntegrityViolationException duplicateOrConstraintFailure) {
            SyncCommandReceipt existing = findReceipt(actor, mutationPublicId);
            if (existing != null) return replay(existing, payloadHash, command);
            return persistOutcome(actor, command, mutationPublicId, targetPublicId,
                    payloadHash, "CONFLICT", "A record with this UUID already exists.");
        } catch (TransientDataAccessException temporaryDatabaseFailure) {
            return result(command, "RETRY", RETRY_MESSAGE, null);
        } catch (DataAccessException databaseFailure) {
            return result(command, "RETRY", RETRY_MESSAGE, null);
        } catch (RuntimeException unexpectedFailure) {
            return result(command, "RETRY", RETRY_MESSAGE, null);
        }
    }

    private SyncResponseDto.ItemResult persistOutcome(
            User actor,
            SyncCommandDto command,
            UUID mutationPublicId,
            UUID entityPublicId,
            String payloadHash,
            String outcome,
            String message) {
        try {
            return transactionTemplate.execute(status -> {
                SyncCommandReceipt existing = findReceipt(actor, mutationPublicId);
                if (existing != null) return replay(existing, payloadHash, command);
                SyncCommandReceipt receipt = newReceipt(actor, command, mutationPublicId,
                        entityPublicId, payloadHash, outcome, message, null, null);
                receipts.saveAndFlush(receipt);
                return toResult(receipt, command);
            });
        } catch (DataIntegrityViolationException concurrentDuplicate) {
            SyncCommandReceipt existing = findReceipt(actor, mutationPublicId);
            if (existing != null) return replay(existing, payloadHash, command);
            return result(command, "RETRY", RETRY_MESSAGE, null);
        } catch (RuntimeException storageFailure) {
            return result(command, "RETRY", RETRY_MESSAGE, null);
        }
    }

    private SyncCommandReceipt findReceipt(User actor, UUID mutationPublicId) {
        return receipts.findByActorUserAndMutationPublicId(actor, mutationPublicId).orElse(null);
    }

    private SyncResponseDto.ItemResult replay(
            SyncCommandReceipt receipt,
            String payloadHash,
            SyncCommandDto command) {
        if (!receipt.getPayloadHash().equals(payloadHash)) {
            return result(command, "REJECTED",
                    "mutationId was already used for a different command.", null);
        }
        return toResult(receipt, command);
    }

    private SyncCommandReceipt newReceipt(
            User actor,
            SyncCommandDto command,
            UUID mutationPublicId,
            UUID entityPublicId,
            String payloadHash,
            String status,
            String message,
            Long serverId,
            UUID resultPublicId) {
        SyncCommandReceipt receipt = new SyncCommandReceipt();
        receipt.setActorUser(actor);
        receipt.setMutationPublicId(mutationPublicId);
        receipt.setEntityPublicId(entityPublicId);
        receipt.setEntityType(safe(command.entityType(), 40));
        receipt.setOperation(safe(command.operation(), 60));
        receipt.setPayloadHash(payloadHash);
        receipt.setStatus(status);
        receipt.setMessage(safe(message, 500));
        receipt.setServerId(serverId);
        receipt.setResultPublicId(resultPublicId);
        receipt.setProcessedAt(Instant.now());
        return receipt;
    }

    private SyncResponseDto.ItemResult toResult(SyncCommandReceipt receipt, SyncCommandDto command) {
        SyncResponseDto.Receipt resultReceipt = receipt.getServerId() == null
                && receipt.getResultPublicId() == null
                ? null
                : new SyncResponseDto.Receipt(receipt.getServerId(),
                        receipt.getResultPublicId() == null ? null : receipt.getResultPublicId().toString());
        return new SyncResponseDto.ItemResult(
                receipt.getMutationPublicId().toString(),
                command == null ? null : command.entityPublicId(),
                receipt.getStatus(),
                receipt.getMessage(),
                resultReceipt,
                receipt.getProcessedAt());
    }

    private SyncResponseDto.ItemResult result(
            SyncCommandDto command,
            String status,
            String message,
            SyncResponseDto.Receipt receipt) {
        return new SyncResponseDto.ItemResult(
                command == null ? null : command.mutationId(),
                command == null ? null : command.entityPublicId(),
                status,
                message,
                receipt,
                Instant.now());
    }

    private String fingerprint(SyncCommandDto command) throws Exception {
        ObjectNode canonical = objectMapper.createObjectNode();
        canonical.put("entityType", safe(command.entityType(), 40));
        canonical.put("entityPublicId", safe(command.entityPublicId(), 80));
        canonical.put("operation", safe(command.operation(), 60));
        if (command.baseVersion() == null) canonical.putNull("baseVersion");
        else canonical.put("baseVersion", command.baseVersion());
        if (command.payload() == null) canonical.putNull("payload");
        else canonical.set("payload", command.payload());
        byte[] digest = MessageDigest.getInstance("SHA-256")
                .digest(objectMapper.writeValueAsBytes(canonical));
        return HexFormat.of().formatHex(digest);
    }

    private static UUID parseUuid(String value) {
        if (value == null || value.isBlank()) throw new IllegalArgumentException("Missing UUID");
        return UUID.fromString(value.trim());
    }

    private static String safe(String value, int maxLength) {
        if (value == null) return "UNKNOWN";
        String trimmed = value.trim();
        if (trimmed.isEmpty()) return "UNKNOWN";
        return trimmed.length() <= maxLength ? trimmed : trimmed.substring(0, maxLength);
    }
}
