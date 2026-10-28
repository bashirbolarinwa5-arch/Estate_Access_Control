package com.example.demo.service.sync;

import com.example.demo.entity.*;
import com.example.demo.repository.*;
import com.example.demo.response.SyncCommandDto;
import com.example.demo.service.ActivityLogService;
import com.example.demo.service.VisitService;
import com.example.demo.service.VisitorService;
import org.springframework.dao.DataAccessException;
import tools.jackson.databind.JsonNode;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Locale;
import java.util.UUID;

/** Executes one allow-listed offline command using the actor from the live JWT. */
@Component
public class SyncCommandProcessor {

    private final ResidentRepository residents;
    private final VisitorRepository visitors;
    private final VisitRepository visits;
    private final SecurityRepository securityPeople;
    private final UserRepository users;
    private final PasswordEncoder passwordEncoder;
    private final VisitService visitService;
    private final VisitorService visitorService;
    private final ActivityLogService activityLogService;
    private final ActivityLogRepository activityLogs;

    public SyncCommandProcessor(
            ResidentRepository residents,
            VisitorRepository visitors,
            VisitRepository visits,
            SecurityRepository securityPeople,
            UserRepository users,
            PasswordEncoder passwordEncoder,
            VisitService visitService,
            VisitorService visitorService,
            ActivityLogService activityLogService,
            ActivityLogRepository activityLogs) {
        this.residents = residents;
        this.visitors = visitors;
        this.visits = visits;
        this.securityPeople = securityPeople;
        this.users = users;
        this.passwordEncoder = passwordEncoder;
        this.visitService = visitService;
        this.visitorService = visitorService;
        this.activityLogService = activityLogService;
        this.activityLogs = activityLogs;
    }

    public ProcessedCommand process(User actor, SyncCommandDto command, UUID entityPublicId) {
        String entityType = normalize(command.entityType());
        String operation = normalize(command.operation());
        JsonNode payload = command.payload();

        if (payload == null || payload.isNull() || !payload.isObject()) {
            throw rejected("Command payload must be a JSON object.");
        }

        return switch (entityType + "." + operation) {
            case "RESIDENT.CREATE" -> createResident(actor, entityPublicId, payload);
            case "SECURITY.CREATE" -> createSecurity(actor, entityPublicId, payload);
            case "VISITOR.CREATE" -> createVisitor(actor, entityPublicId, payload);
            case "VISIT.CREATE_WALK_IN" -> createWalkIn(actor, entityPublicId, payload);
            case "VISIT.CREATE_PLANNED" -> createPlannedVisit(actor, entityPublicId, payload);
            case "VISIT.APPROVE" -> decideVisit(actor, entityPublicId, true);
            case "VISIT.REJECT" -> decideVisit(actor, entityPublicId, false);
            case "VISIT.CHECK_IN" -> checkIn(actor, entityPublicId);
            case "VISIT.CHECK_OUT" -> checkOut(actor, entityPublicId);
            case "SECURITY_LOG.APPEND" -> appendSecurityLog(actor, entityPublicId, payload);
            default -> throw rejected("This offline operation is not supported.");
        };
    }

    private ProcessedCommand createResident(User actor, UUID publicId, JsonNode payload) {
        requireRole(actor, Role.ROLE_ADMIN);
        Estate estate = requireEstate(actor);
        requireNewPublicId(residents.findByPublicId(publicId).isPresent());

        String fullName = requiredText(payload, "fullName", 160);
        String phone = requiredPhone(payload, "phoneNumber");
        String houseNumber = requiredText(payload, "houseNumber", 80);
        String username = requiredText(payload, "username", 80);
        String password = requiredText(payload, "password", 200);
        String email = optionalText(payload, "email", 200);
        if (email.isBlank()) email = username + "@estateflow.local";
        if (users.existsByUsername(username)) throw rejected("Username already exists.");
        if (residents.existsByEmail(email)) throw rejected("Email already exists.");

        User account = new User();
        account.setPublicId(optionalUuid(payload, "userPublicId").orElseGet(UUID::randomUUID));
        account.setUsername(username);
        account.setPassword(passwordEncoder.encode(password));
        account.setRole(Role.ROLE_RESIDENT);
        account.setEstate(estate);
        account.setActive(true);
        account.setMustChangePassword(false);
        User savedAccount = users.save(account);

        Resident resident = new Resident();
        resident.setPublicId(publicId);
        resident.setFullName(fullName);
        resident.setPhoneNumber(phone);
        resident.setHouseNumber(houseNumber);
        resident.setEmail(email);
        resident.setUser(savedAccount);
        Resident saved = residents.save(resident);
        activityLogService.log("ADMIN", "RESIDENT_CREATED", "Resident " + fullName + " was created");
        return new ProcessedCommand(saved.getId(), saved.getPublicId());
    }

    private ProcessedCommand createSecurity(User actor, UUID publicId, JsonNode payload) {
        requireRole(actor, Role.ROLE_ADMIN);
        Estate estate = requireEstate(actor);
        requireNewPublicId(securityPeople.findByPublicId(publicId).isPresent());

        String name = requiredText(payload, "name", 160);
        String phone = requiredPhone(payload, "phoneNumber");
        String username = requiredText(payload, "username", 80);
        String password = requiredText(payload, "password", 200);
        String email = optionalText(payload, "email", 200);
        if (users.existsByUsername(username)) throw rejected("Username already exists.");

        User account = new User();
        account.setPublicId(optionalUuid(payload, "userPublicId").orElseGet(UUID::randomUUID));
        account.setUsername(username);
        account.setPassword(passwordEncoder.encode(password));
        account.setRole(Role.ROLE_SECURITY);
        account.setEstate(estate);
        account.setActive(true);
        account.setMustChangePassword(false);
        users.save(account);

        Security security = new Security();
        security.setPublicId(publicId);
        security.setName(name);
        security.setPhoneNumber(phone);
        security.setEmail(email);
        security.setUser(account);
        Security saved = securityPeople.save(security);
        return new ProcessedCommand(saved.getId(), saved.getPublicId());
    }

    private ProcessedCommand createVisitor(User actor, UUID publicId, JsonNode payload) {
        if (actor.getRole() != Role.ROLE_ADMIN && actor.getRole() != Role.ROLE_RESIDENT) {
            throw rejected("Only an admin or resident can register a visitor.");
        }
        requireEstate(actor);
        requireNewPublicId(visitors.findByPublicId(publicId).isPresent());

        Visitor visitor = new Visitor();
        visitor.setPublicId(publicId);
        visitor.setFullName(requiredText(payload, "fullName", 160));
        visitor.setPhoneNumber(requiredPhone(payload, "phoneNumber"));
        visitor.setPurpose(optionalText(payload, "purpose", 255));

        Visitor saved;
        if (actor.getRole() == Role.ROLE_RESIDENT) {
            saved = invokeDomain(() -> visitorService.createVisitorForResidentUsername(actor.getUsername(), visitor));
        } else {
            Resident resident = residentByPublicId(requiredUuid(payload, "residentPublicId"), actor);
            saved = invokeDomain(() -> visitorService.createVisitor(resident.getId(), visitor));
        }
        return new ProcessedCommand(saved.getId(), saved.getPublicId());
    }

    private ProcessedCommand createWalkIn(User actor, UUID publicId, JsonNode payload) {
        requireOneRole(actor, Role.ROLE_ADMIN, Role.ROLE_SECURITY);
        Estate estate = requireEstate(actor);
        requireNewPublicId(visits.findByPublicId(publicId).isPresent());

        Resident resident = residentByPublicId(requiredUuid(payload, "residentPublicId"), actor);
        String purpose = requiredText(payload, "purpose", 255);
        JsonNode visitorData = payload.path("visitor");
        if (!visitorData.isObject()) throw rejected("Visitor details are required.");
        String fullName = requiredText(visitorData, "fullName", 160);
        String phone = requiredPhone(visitorData, "phoneNumber");
        UUID visitorPublicId = optionalUuid(visitorData, "publicId").orElseGet(UUID::randomUUID);

        Visitor visitor = visitors.findByPublicId(visitorPublicId).orElse(null);
        if (visitor != null) {
            verifyEstate(actor, visitor.getEstate());
            if (visitor.getResident() == null || !visitor.getResident().getId().equals(resident.getId())) {
                throw rejected("Visitor does not belong to the selected resident.");
            }
        } else {
            Visitor duplicateByPhone = visitors.findByPhoneNumberAndResident(phone, resident);
            if (duplicateByPhone != null) {
                visitor = duplicateByPhone;
            } else {
                visitor = new Visitor();
                visitor.setPublicId(visitorPublicId);
                visitor.setFullName(fullName);
                visitor.setPhoneNumber(phone);
                visitor.setPurpose(purpose);
                visitor.setResident(resident);
                visitor.setEstate(estate);
                visitor = visitors.save(visitor);
            }
        }

        Visitor selectedVisitor = visitor;
        Visit created = invokeDomain(() -> visitService.createVisit(resident.getId(), selectedVisitor, purpose));
        created.setPublicId(publicId);

        // Keep a gate code the guard generated offline when it is still free.
        String proposedCode = optionalText(payload, "accessCode", 12).toUpperCase(Locale.ROOT);
        if (proposedCode.matches("[A-Z0-9]{6}") && visits.findByAccessCode(proposedCode) == null) {
            created.setAccessCode(proposedCode);
        }

        Visit saved = visits.save(created);
        return new ProcessedCommand(saved.getId(), saved.getPublicId());
    }

    private ProcessedCommand createPlannedVisit(User actor, UUID publicId, JsonNode payload) {
        requireRole(actor, Role.ROLE_RESIDENT);
        requireNewPublicId(visits.findByPublicId(publicId).isPresent());

        UUID visitorPublicId = requiredUuid(payload, "visitorPublicId");
        Visitor visitor = visitors.findByPublicId(visitorPublicId)
                .orElseThrow(() -> rejected("Visitor was not found."));
        verifyEstate(actor, visitor.getEstate());
        if (visitor.getResident() == null || visitor.getResident().getUser() == null
                || !visitor.getResident().getUser().getId().equals(actor.getId())) {
            throw rejected("You can only schedule a visit for your own visitor.");
        }

        String purpose = requiredText(payload, "purpose", 255);
        LocalDate visitDate;
        try {
            visitDate = LocalDate.parse(requiredText(payload, "visitDate", 10));
        } catch (RuntimeException invalidDate) {
            throw rejected("Visit date must use YYYY-MM-DD format.");
        }
        Visit created = invokeDomain(() -> visitService.createPlannedVisit(actor.getUsername(), visitor.getId(), purpose, visitDate));
        created.setPublicId(publicId);

        /*
         * An offline device generates its own gate code so the resident can
         * share it immediately, before any network round trip. Keep that code
         * when it is still available; otherwise the server-generated code from
         * createPlannedVisit stands and the client picks it up on the next load.
         */
        String proposedCode = optionalText(payload, "accessCode", 12).toUpperCase(Locale.ROOT);
        if (proposedCode.matches("[A-Z0-9]{6}") && visits.findByAccessCode(proposedCode) == null) {
            created.setAccessCode(proposedCode);
        }

        Visit saved = visits.save(created);
        return new ProcessedCommand(saved.getId(), saved.getPublicId());
    }

    private ProcessedCommand decideVisit(User actor, UUID publicId, boolean approve) {
        Visit visit = visitByPublicId(publicId, actor);
        if (actor.getRole() == Role.ROLE_RESIDENT) {
            Resident ownResident = residents.findByUser(actor)
                    .orElseThrow(() -> rejected("Resident account was not found."));
            if (visit.getResident() == null || !visit.getResident().getId().equals(ownResident.getId())) {
                throw rejected("You are not authorized to decide this visit.");
            }
            Visit saved = invokeDomain(() -> approve
                    ? visitService.approveMyVisit(visit.getId())
                    : visitService.rejectMyVisit(visit.getId()));
            return new ProcessedCommand(saved.getId(), saved.getPublicId());
        }
        requireRole(actor, Role.ROLE_ADMIN);
        Visit saved = invokeDomain(() -> approve
                ? visitService.approveVisit(visit.getId(), "ADMIN")
                : visitService.rejectVisit(visit.getId(), "ADMIN"));
        return new ProcessedCommand(saved.getId(), saved.getPublicId());
    }

    private ProcessedCommand checkIn(User actor, UUID publicId) {
        requireOneRole(actor, Role.ROLE_ADMIN, Role.ROLE_SECURITY);
        Visit visit = visitByPublicId(publicId, actor);
        if (visit.getStatus() != VisitorStatus.APPROVED) {
            throw conflict("Visit is no longer approved for check-in.");
        }
        Visit saved = invokeDomain(() -> visitService.checkInVisitor(visit.getAccessCode()));
        return new ProcessedCommand(saved.getId(), saved.getPublicId());
    }

    private ProcessedCommand checkOut(User actor, UUID publicId) {
        requireOneRole(actor, Role.ROLE_ADMIN, Role.ROLE_SECURITY);
        Visit visit = visitByPublicId(publicId, actor);
        if (visit.getStatus() != VisitorStatus.CHECKED_IN) {
            throw conflict("Visit is no longer checked in.");
        }
        Visit saved = invokeDomain(() -> visitService.checkOutVisitor(visit.getAccessCode()));
        return new ProcessedCommand(saved.getId(), saved.getPublicId());
    }

    private ProcessedCommand appendSecurityLog(User actor, UUID publicId, JsonNode payload) {
        requireOneRole(actor, Role.ROLE_ADMIN, Role.ROLE_SECURITY);
        Estate estate = requireEstate(actor);
        if (activityLogs.findByPublicId(publicId).isPresent()) {
            throw conflict("A log entry with this public ID already exists.");
        }

        String action = requiredText(payload, "action", 60).toUpperCase(Locale.ROOT);
        if (!action.matches("OFFLINE_[A-Z0-9_]{1,52}")) {
            throw rejected("Offline log actions must use the OFFLINE_ prefix.");
        }
        String description = requiredText(payload, "description", 500);
        ActivityLog log = new ActivityLog();
        log.setPublicId(publicId);
        log.setActor(actor.getRole().name().replace("ROLE_", ""));
        log.setAction(action);
        log.setDescription(description);
        log.setTimestamp(LocalDateTime.now());
        log.setEstate(estate);
        ActivityLog saved = activityLogs.save(log);
        return new ProcessedCommand(saved.getId(), saved.getPublicId());
    }

    private Resident residentByPublicId(UUID publicId, User actor) {
        Resident resident = residents.findByPublicId(publicId)
                .orElseThrow(() -> rejected("Resident was not found."));
        Estate residentEstate = resident.getUser() == null ? null : resident.getUser().getEstate();
        verifyEstate(actor, residentEstate);
        return resident;
    }

    private Visit visitByPublicId(UUID publicId, User actor) {
        Visit visit = visits.findByPublicId(publicId)
                .orElseThrow(() -> rejected("Visit was not found."));
        verifyEstate(actor, visit.getEstate());
        return visit;
    }

    private Estate requireEstate(User actor) {
        if (actor.getEstate() == null) throw rejected("This operation requires an estate account.");
        return actor.getEstate();
    }

    private void verifyEstate(User actor, Estate resourceEstate) {
        Estate actorEstate = requireEstate(actor);
        if (resourceEstate == null || !actorEstate.getId().equals(resourceEstate.getId())) {
            throw rejected("This record does not belong to your estate.");
        }
    }

    private void requireRole(User actor, Role expected) {
        if (actor.getRole() != expected) throw rejected("This role is not authorized for this operation.");
    }

    private void requireOneRole(User actor, Role first, Role second) {
        if (actor.getRole() != first && actor.getRole() != second) {
            throw rejected("This role is not authorized for this operation.");
        }
    }

    private void requireNewPublicId(boolean exists) {
        if (exists) throw conflict("A record with this public ID already exists.");
    }

    private static String normalize(String value) {
        return value == null ? "" : value.trim().toUpperCase(Locale.ROOT);
    }

    private static <T> T invokeDomain(java.util.function.Supplier<T> action) {
        try {
            return action.get();
        } catch (DataAccessException databaseFailure) {
            throw databaseFailure;
        } catch (ItemFailure itemFailure) {
            throw itemFailure;
        } catch (RuntimeException businessFailure) {
            String message = businessFailure.getMessage();
            throw conflict(message == null || message.isBlank()
                    ? "The record changed and this command needs review."
                    : message);
        }
    }

    private static String requiredText(JsonNode payload, String field, int maxLength) {
        String value = optionalText(payload, field, maxLength);
        if (value.isBlank()) throw rejected(field + " is required.");
        return value;
    }

    private static String optionalText(JsonNode payload, String field, int maxLength) {
        JsonNode value = payload.get(field);
        if (value == null || value.isNull()) return "";
        if (!value.isTextual()) throw rejected(field + " must be text.");
        String trimmed = value.asText().trim();
        if (trimmed.length() > maxLength) throw rejected(field + " is too long.");
        return trimmed;
    }

    private static String requiredPhone(JsonNode payload, String field) {
        String phone = requiredText(payload, field, 11);
        if (!phone.matches("[0-9]{11}")) throw rejected(field + " must contain exactly 11 digits.");
        return phone;
    }

    private static UUID requiredUuid(JsonNode payload, String field) {
        return optionalUuid(payload, field).orElseThrow(() -> rejected(field + " must be a valid UUID."));
    }

    private static java.util.Optional<UUID> optionalUuid(JsonNode payload, String field) {
        JsonNode value = payload.get(field);
        if (value == null || value.isNull() || value.asText().isBlank()) return java.util.Optional.empty();
        if (!value.isTextual()) throw rejected(field + " must be a valid UUID.");
        try {
            return java.util.Optional.of(UUID.fromString(value.asText()));
        } catch (IllegalArgumentException invalid) {
            throw rejected(field + " must be a valid UUID.");
        }
    }

    private static ItemFailure rejected(String message) {
        return new ItemFailure("REJECTED", message);
    }

    private static ItemFailure conflict(String message) {
        return new ItemFailure("CONFLICT", message);
    }

    public record ProcessedCommand(Long serverId, UUID publicId) {
    }

    public static class ItemFailure extends RuntimeException {
        private final String status;

        public ItemFailure(String status, String message) {
            super(message);
            this.status = status;
        }

        public String getStatus() {
            return status;
        }
    }
}
