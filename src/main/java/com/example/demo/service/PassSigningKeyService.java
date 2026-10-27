package com.example.demo.service;

import com.example.demo.entity.Estate;
import com.example.demo.entity.Resident;
import com.example.demo.entity.ResidentPassSigningKey;
import com.example.demo.entity.Role;
import com.example.demo.entity.User;
import com.example.demo.repository.ResidentPassSigningKeyRepository;
import com.example.demo.repository.ResidentRepository;
import com.example.demo.response.PassSigningKeyDto;
import com.example.demo.response.PassSigningKeyRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.security.AlgorithmParameters;
import java.security.KeyFactory;
import java.security.spec.ECGenParameterSpec;
import java.security.spec.ECParameterSpec;
import java.security.spec.ECPoint;
import java.security.spec.ECPublicKeySpec;
import java.math.BigInteger;
import java.util.Base64;
import java.util.List;
import java.util.UUID;

/** Registers and distributes resident public keys for offline pass verification. */
@Service
public class PassSigningKeyService {

    private static final String ALGORITHM = "ECDSA-P256-SHA256";
    private static final int MAX_KEY_LIFETIME_DAYS = 30;

    private final CurrentUserService currentUserService;
    private final ResidentRepository residents;
    private final ResidentPassSigningKeyRepository keys;
    private final ObjectMapper objectMapper;

    public PassSigningKeyService(
            CurrentUserService currentUserService,
            ResidentRepository residents,
            ResidentPassSigningKeyRepository keys,
            ObjectMapper objectMapper) {
        this.currentUserService = currentUserService;
        this.residents = residents;
        this.keys = keys;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public PassSigningKeyDto registerMyKey(PassSigningKeyRequest request) {
        User actor = requireUser();
        if (actor.getRole() != Role.ROLE_RESIDENT) throw new IllegalArgumentException("Only residents can register pass keys.");
        if (actor.getEstate() == null) throw new IllegalArgumentException("The resident account is not linked to an estate.");
        Resident resident = residents.findByUser(actor)
                .orElseThrow(() -> new IllegalArgumentException("Resident profile was not found."));
        if (request == null || !ALGORITHM.equals(request.algorithm())) {
            throw new IllegalArgumentException("The pass key must use ECDSA-P256-SHA256.");
        }

        UUID keyId = parseUuid(request.keyId());
        validatePublicJwk(request.publicJwk());
        String jwk = objectMapper.writeValueAsString(request.publicJwk());
        ResidentPassSigningKey existing = keys.findByKeyId(keyId).orElse(null);
        if (existing != null) {
            if (!existing.getResident().getId().equals(resident.getId())
                    || !existing.getPublicJwk().equals(jwk)
                    || !existing.getAlgorithm().equals(ALGORITHM)) {
                throw new IllegalArgumentException("This key ID is already registered to a different key or resident.");
            }
            return toDto(existing);
        }

        Instant createdAt = Instant.now();
        ResidentPassSigningKey key = new ResidentPassSigningKey();
        key.setKeyId(keyId);
        key.setResident(resident);
        key.setEstate(actor.getEstate());
        key.setAlgorithm(ALGORITHM);
        key.setPublicJwk(jwk);
        key.setCreatedAt(createdAt);
        key.setExpiresAt(createdAt.plus(MAX_KEY_LIFETIME_DAYS, ChronoUnit.DAYS));
        return toDto(keys.save(key));
    }

    @Transactional(readOnly = true)
    public List<PassSigningKeyDto> getMyKeys() {
        User actor = requireUser();
        if (actor.getRole() != Role.ROLE_RESIDENT) throw new IllegalArgumentException("Only residents can view their pass keys.");
        Resident resident = residents.findByUser(actor)
                .orElseThrow(() -> new IllegalArgumentException("Resident profile was not found."));
        Instant now = Instant.now();
        return keys.findByResidentAndRevokedAtIsNullAndExpiresAtAfter(resident, now).stream()
                .map(this::toDto).toList();
    }

    @Transactional(readOnly = true)
    public List<PassSigningKeyDto> getEstateKeys() {
        User actor = requireUser();
        if (actor.getRole() != Role.ROLE_ADMIN && actor.getRole() != Role.ROLE_SECURITY) {
            throw new IllegalArgumentException("Only estate admins and security can download trusted pass keys.");
        }
        Estate estate = actor.getEstate();
        if (estate == null) throw new IllegalArgumentException("This account is not linked to an estate.");
        Instant now = Instant.now();
        // Include revoked but unexpired keys so online gate devices can cache
        // revocations before going offline. Verification fails closed for them.
        return keys.findByEstateAndExpiresAtAfter(estate, now).stream()
                .map(this::toDto).toList();
    }

    @Transactional
    public void revokeMyKey(String value) {
        User actor = requireUser();
        if (actor.getRole() != Role.ROLE_RESIDENT) throw new IllegalArgumentException("Only residents can revoke their pass keys.");
        Resident resident = residents.findByUser(actor)
                .orElseThrow(() -> new IllegalArgumentException("Resident profile was not found."));
        ResidentPassSigningKey key = keys.findByKeyId(parseUuid(value))
                .orElseThrow(() -> new IllegalArgumentException("Pass key was not found."));
        if (!key.getResident().getId().equals(resident.getId())) {
            throw new IllegalArgumentException("You cannot revoke another resident's pass key.");
        }
        if (key.getRevokedAt() == null) key.setRevokedAt(Instant.now());
    }

    private User requireUser() {
        User user = currentUserService.getCurrentUser();
        if (user == null) throw new IllegalArgumentException("An authenticated account is required.");
        return user;
    }

    private void validatePublicJwk(JsonNode jwk) {
        if (jwk == null || !jwk.isObject()
                || !"EC".equals(jwk.path("kty").asText())
                || !"P-256".equals(jwk.path("crv").asText())
                || !jwk.path("x").isTextual()
                || !jwk.path("y").isTextual()
                || jwk.has("d")) {
            throw new IllegalArgumentException("A public P-256 JWK is required; private key material is not accepted.");
        }
        JsonNode keyOps = jwk.get("key_ops");
        if (keyOps != null) {
            boolean verifyAllowed = false;
            if (keyOps.isArray()) {
                for (JsonNode operation : keyOps) {
                    if (operation.isTextual() && "verify".equals(operation.asText())) verifyAllowed = true;
                }
            }
            if (!verifyAllowed) throw new IllegalArgumentException("The public JWK must permit signature verification.");
        }
        try {
            byte[] x = Base64.getUrlDecoder().decode(jwk.path("x").asText());
            byte[] y = Base64.getUrlDecoder().decode(jwk.path("y").asText());
            if (x.length != 32 || y.length != 32) throw new IllegalArgumentException("Invalid P-256 coordinate length.");
            AlgorithmParameters parameters = AlgorithmParameters.getInstance("EC");
            parameters.init(new ECGenParameterSpec("secp256r1"));
            ECParameterSpec curve = parameters.getParameterSpec(ECParameterSpec.class);
            KeyFactory.getInstance("EC").generatePublic(new ECPublicKeySpec(
                    new ECPoint(new BigInteger(1, x), new BigInteger(1, y)), curve));
        } catch (Exception invalidPoint) {
            throw new IllegalArgumentException("The public JWK is not a valid P-256 key.", invalidPoint);
        }
    }

    private UUID parseUuid(String value) {
        try {
            return UUID.fromString(value);
        } catch (RuntimeException invalid) {
            throw new IllegalArgumentException("keyId must be a valid UUID.");
        }
    }

    private PassSigningKeyDto toDto(ResidentPassSigningKey key) {
        try {
            JsonNode jwk = objectMapper.readTree(key.getPublicJwk());
            return new PassSigningKeyDto(
                    key.getKeyId().toString(),
                    key.getResident().getPublicId().toString(),
                    key.getEstate().getPublicId().toString(),
                    key.getAlgorithm(),
                    jwk,
                    key.getCreatedAt(),
                    key.getExpiresAt(),
                    key.getRevokedAt());
        } catch (RuntimeException invalidStoredKey) {
            throw new IllegalStateException("Stored pass key could not be read.", invalidStoredKey);
        }
    }
}
