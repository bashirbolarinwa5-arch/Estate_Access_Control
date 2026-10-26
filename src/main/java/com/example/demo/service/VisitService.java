package com.example.demo.service;

import com.example.demo.entity.*;
import com.example.demo.repository.ResidentRepository;
import com.example.demo.repository.VisitRepository;
import com.example.demo.repository.ResidentCallAttemptRepository;
import com.example.demo.repository.VisitorRepository;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import com.example.demo.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Random;

@Service
public class VisitService {

    private final VisitRepository visitRepository;
    private final VisitorRepository visitorRepository;
    private final ResidentRepository residentRepository;
    private final UserRepository userRepository;
    private final ActivityLogService activityLogService;
    private final CurrentUserService currentUserService;
    private final VisitNotificationService visitNotificationService;
    private final ResidentCallAttemptRepository residentCallAttemptRepository;

    public VisitService(
            VisitRepository visitRepository,
            VisitorRepository visitorRepository,
            ResidentRepository residentRepository,
            UserRepository userRepository,
            ActivityLogService activityLogService,
            CurrentUserService currentUserService,
            VisitNotificationService visitNotificationService,
            ResidentCallAttemptRepository residentCallAttemptRepository) {

        this.visitRepository = visitRepository;
        this.visitorRepository = visitorRepository;
        this.residentRepository = residentRepository;
        this.userRepository = userRepository;
        this.activityLogService = activityLogService;
        this.currentUserService = currentUserService;
        this.visitNotificationService = visitNotificationService;
        this.residentCallAttemptRepository = residentCallAttemptRepository;
    }

    // ==============================
    // GENERATE RANDOM ACCESS CODE
    // ==============================

    private String generateRandomCode() {

        String characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        Random random = new Random();

        StringBuilder code = new StringBuilder();

        for (int i = 0; i < 6; i++) {
            int number = random.nextInt(characters.length());
            code.append(characters.charAt(number));
        }

        return code.toString();
    }

    // ==============================
    // GENERATE UNIQUE ACCESS CODE
    // ==============================

    private String generateUniqueAccessCode() {

        String code = generateRandomCode();

        while (visitRepository.findByAccessCode(code) != null) {
            code = generateRandomCode();
        }

        return code;
    }

    // ==============================
    // GET CURRENT LOGGED-IN RESIDENT
    // ==============================

    private Resident getCurrentResident() {

        Authentication authentication =
                SecurityContextHolder
                        .getContext()
                        .getAuthentication();

        if (authentication == null ||
                !authentication.isAuthenticated()) {

            throw new RuntimeException("User is not authenticated");
        }

        String username = authentication.getName();

        return residentRepository
                .findByUserUsername(username)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Resident account not found"
                        ));
    }

    // ==============================
    // CHECK VISIT OWNERSHIP
    // ==============================

    private void verifyResidentOwnsVisit(
            Visit visit,
            Resident resident) {

        if (visit.getResident() == null ||
                !visit.getResident()
                        .getId()
                        .equals(resident.getId())) {

            throw new RuntimeException(
                    "You are not authorized to manage this visit"
            );
        }
    }

    // ==============================
    // CREATE VISIT
    // ==============================

    @org.springframework.transaction.annotation.Transactional
    public Visit createVisit(
            Long residentId,
            Visitor visitor,
            String purpose) {

        visitor.setPhoneNumber(PhoneNumberValidator.requireElevenDigits(
                visitor.getPhoneNumber(), "Visitor phone number"));

        if (purpose == null || purpose.trim().isEmpty()) {
            throw new RuntimeException("Visit purpose is required");
        }

        // The database column is varchar(255) — reject gracefully
        // instead of letting Postgres throw a 500.
        if (purpose.trim().length() > 255) {
            throw new RuntimeException(
                    "Visit purpose is too long (maximum 255 characters)");
        }

        // The gate/admin creating the walk-in defines the estate.
        Estate estate =
                currentUserService.getRequiredEstate();

        Resident resident = residentRepository.findById(residentId)
                .orElseThrow(() ->
                        new RuntimeException("Resident not found"));

        // The resident must live in the same estate as the actor.
        currentUserService.verifySameEstate(
                estate,
                resident.getUser() == null
                        ? null
                        : resident.getUser().getEstate()
        );

        Visitor existingVisitor =
                visitorRepository.findByPhoneNumberAndResident(
                        visitor.getPhoneNumber(),
                        resident);

        if (existingVisitor == null) {

            existingVisitor = new Visitor();

            existingVisitor.setFullName(visitor.getFullName());
            existingVisitor.setPhoneNumber(visitor.getPhoneNumber());
            existingVisitor.setPurpose(purpose);
            existingVisitor.setResident(resident);
            existingVisitor.setEstate(estate);

            existingVisitor =
                    visitorRepository.save(existingVisitor);
        }

        Visit visit = new Visit();

        visit.setVisitor(existingVisitor);
        visit.setResident(resident);
        visit.setEstate(estate);
        visit.setPurpose(purpose);
        visit.setAccessCode(generateUniqueAccessCode());
        visit.setVisitDate(LocalDate.now());

        // New visits wait for resident approval
        visit.setStatus(VisitorStatus.PENDING);

        Visit savedVisit =
                visitRepository.save(visit);

        // A notification failure must not undo an otherwise valid gate registration.
        visitNotificationService.queueWalkIn(savedVisit);

        activityLogService.log(
                "SYSTEM",
                "VISIT_CREATED",
                "Visit created for visitor "
                        + existingVisitor.getFullName()
                        + " visiting resident "
                        + resident.getFullName()
        );

        return savedVisit;
    }

    // ==============================
    // GET CURRENT RESIDENT'S VISITS
    // ==============================

    public List<Visit> getMyVisits() {

        Resident resident = getCurrentResident();

        return visitRepository.findByResident(resident);
    }

    // ==============================
    // APPROVE CURRENT RESIDENT'S VISIT
    // ==============================

    public Visit approveMyVisit(Long id) {

        Resident resident = getCurrentResident();

        Visit visit = visitRepository.findById(id)
                .orElseThrow(() ->
                        new RuntimeException("Visit not found"));

        verifyResidentOwnsVisit(visit, resident);

        if (visit.getStatus() != VisitorStatus.PENDING) {

            throw new RuntimeException(
                    "Only pending visits can be approved"
            );
        }

        visit.setStatus(VisitorStatus.APPROVED);

        Visit savedVisit =
                visitRepository.save(visit);

        activityLogService.log(
                "RESIDENT",
                "VISIT_APPROVED",
                "Resident "
                        + resident.getFullName()
                        + " approved visit "
                        + visit.getId()
        );

        return savedVisit;
    }

    // ==============================
    // REJECT CURRENT RESIDENT'S VISIT
    // ==============================

    public Visit rejectMyVisit(Long id) {

        Resident resident = getCurrentResident();

        Visit visit = visitRepository.findById(id)
                .orElseThrow(() ->
                        new RuntimeException("Visit not found"));

        verifyResidentOwnsVisit(visit, resident);

        if (visit.getStatus() != VisitorStatus.PENDING) {

            throw new RuntimeException(
                    "Only pending visits can be rejected"
            );
        }

        visit.setStatus(VisitorStatus.REJECTED);

        Visit savedVisit =
                visitRepository.save(visit);

        activityLogService.log(
                "RESIDENT",
                "VISIT_REJECTED",
                "Resident "
                        + resident.getFullName()
                        + " rejected visit "
                        + visit.getId()
        );

        return savedVisit;
    }

    // ==============================
    // GET PENDING VISITS
    // ==============================

    public List<Visit> getPendingVisits() {

        Estate estate =
                currentUserService.getRequiredEstate();

        return visitRepository.findByStatusAndEstate(
                VisitorStatus.PENDING,
                estate
        );
    }

    public String beginResidentCall(Long id) {
        Visit visit = visitRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Visit not found"));
        currentUserService.verifySameEstate(currentUserService.getRequiredEstate(), visit.getEstate());
        if (visit.getStatus() != VisitorStatus.PENDING) {
            throw new RuntimeException("Resident calls are available only for pending visits");
        }
        String phone = visit.getResident() == null ? null : visit.getResident().getPhoneNumber();
        if (phone == null || phone.isBlank()) throw new RuntimeException("Resident phone number is unavailable");
        User caller = currentUserService.getCurrentUser();
        if (caller == null) throw new RuntimeException("User is not authenticated");
        ResidentCallAttempt attempt = new ResidentCallAttempt();
        attempt.setVisit(visit);
        attempt.setInitiatedBy(caller);
        residentCallAttemptRepository.save(attempt);
        String actor = caller.getRole().name().replace("ROLE_", "");
        activityLogService.log(actor, "RESIDENT_CALL_ATTEMPT",
                "Call attempt started for pending visit " + visit.getId());
        return phone;
    }

    @org.springframework.transaction.annotation.Transactional
    public void recordResidentCallOutcome(Long id, String outcome) {
        Visit visit = visitRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Visit not found"));
        currentUserService.verifySameEstate(currentUserService.getRequiredEstate(), visit.getEstate());
        User caller = currentUserService.getCurrentUser();
        ResidentCallAttempt attempt = residentCallAttemptRepository
                .findTopByVisitAndInitiatedByAndOutcomeIsNullOrderByStartedAtDesc(visit, caller)
                .orElseThrow(() -> new RuntimeException("No unfinished call attempt exists for this visit"));
        ResidentCallAttempt.Outcome callOutcome;
        try {
            callOutcome = ResidentCallAttempt.Outcome.valueOf(outcome);
        } catch (Exception invalidOutcome) {
            throw new RuntimeException("Choose a valid call outcome");
        }
        attempt.setOutcome(callOutcome);
        attempt.setCompletedAt(LocalDateTime.now());
        residentCallAttemptRepository.save(attempt);
        String actor = caller.getRole().name().replace("ROLE_", "");
        activityLogService.log(actor, "RESIDENT_CALL_OUTCOME",
                "Call outcome for pending visit " + visit.getId() + ": " + outcome);
    }

    // ==============================
    // GET APPROVED VISITS
    // ==============================

    public List<Visit> getApprovedVisits() {

        Estate estate =
                currentUserService.getRequiredEstate();

        return visitRepository.findByStatusAndEstate(
                VisitorStatus.APPROVED,
                estate
        );
    }

    // ==============================
    // GET CHECKED-IN VISITS
    // ==============================

    public List<Visit> getCheckedInVisits() {

        Estate estate =
                currentUserService.getRequiredEstate();

        return visitRepository.findByStatusAndEstate(
                VisitorStatus.CHECKED_IN,
                estate
        );
    }

    // ==============================
    // APPROVE VISIT
    // ==============================

    public Visit approveVisit(Long id, String actorRole) {

        Visit visit = visitRepository.findById(id)
                .orElseThrow(() ->
                        new RuntimeException("Visit not found"));

        currentUserService.verifySameEstate(
                currentUserService.getRequiredEstate(),
                visit.getEstate()
        );

        if (visit.getStatus() != VisitorStatus.PENDING) {

            throw new RuntimeException(
                    "Only pending visits can be approved");
        }

        visit.setStatus(VisitorStatus.APPROVED);

        Visit savedVisit =
                visitRepository.save(visit);

        activityLogService.log(
                actorRole,
                "VISIT_APPROVED",
                "Visit " + visit.getId()
                        + " was approved"
        );

        return savedVisit;
    }

    // ==============================
    // REJECT VISIT
    // ==============================

    public Visit rejectVisit(Long id, String actorRole) {

        Visit visit = visitRepository.findById(id)
                .orElseThrow(() ->
                        new RuntimeException("Visit not found"));

        currentUserService.verifySameEstate(
                currentUserService.getRequiredEstate(),
                visit.getEstate()
        );

        if (visit.getStatus() != VisitorStatus.PENDING) {

            throw new RuntimeException(
                    "Only pending visits can be rejected");
        }

        visit.setStatus(VisitorStatus.REJECTED);

        Visit savedVisit =
                visitRepository.save(visit);

        activityLogService.log(
                actorRole,
                "VISIT_REJECTED",
                "Visit " + visit.getId()
                        + " was rejected"
        );

        return savedVisit;
    }

    // ==============================
    // CHECK IN VISITOR
    // ==============================

    public Visit checkInVisitor(String accessCode) {

        Estate estate =
                currentUserService.getRequiredEstate();

        Visit visit =
                visitRepository.findByAccessCode(accessCode);

        // Same message for "not found" and "wrong estate" so
        // an estate cannot probe another estate's codes.
        if (visit == null ||
                visit.getEstate() == null ||
                !visit.getEstate().getId().equals(estate.getId())) {

            throw new RuntimeException(
                    "Access code not found");
        }

        if (visit.getStatus() != VisitorStatus.APPROVED) {

            throw new RuntimeException(
                    "Visitor must be approved before check-in");
        }

        visit.setStatus(VisitorStatus.CHECKED_IN);
        visit.setCheckInTime(LocalDateTime.now());

        Visit savedVisit =
                visitRepository.save(visit);

        activityLogService.log(
                "SECURITY",
                "VISITOR_CHECKED_IN",
                "Visitor "
                        + visit.getVisitor().getFullName()
                        + " checked in"
        );

        return savedVisit;
    }

    // ==============================
    // CHECK OUT VISITOR
    // ==============================

    public Visit checkOutVisitor(String accessCode) {

        Estate estate =
                currentUserService.getRequiredEstate();

        Visit visit =
                visitRepository.findByAccessCode(accessCode);

        if (visit == null ||
                visit.getEstate() == null ||
                !visit.getEstate().getId().equals(estate.getId())) {

            throw new RuntimeException(
                    "Access code not found");
        }

        if (visit.getStatus() != VisitorStatus.CHECKED_IN) {

            throw new RuntimeException(
                    "Visitor cannot be checked out");
        }

        visit.setStatus(VisitorStatus.CHECKED_OUT);
        visit.setCheckOutTime(LocalDateTime.now());

        Visit savedVisit =
                visitRepository.save(visit);

        activityLogService.log(
                "SECURITY",
                "VISITOR_CHECKED_OUT",
                "Visitor "
                        + visit.getVisitor().getFullName()
                        + " checked out"
        );

        return savedVisit;
    }

    // ==============================
    // GET ALL VISITS
    // ==============================

    public List<Visit> getAllVisit() {

        Estate estate =
                currentUserService.getRequiredEstate();

        return visitRepository.findByEstate(estate);
    }

    // ==============================
    // GET VISIT BY ID
    // ==============================

    public Visit getVisitById(Long id) {

        Visit visit = visitRepository.findById(id)
                .orElseThrow(() ->
                        new RuntimeException("Visit not found"));

        currentUserService.verifySameEstate(
                currentUserService.getRequiredEstate(),
                visit.getEstate()
        );

        return visit;
    }

    // ==============================
    // UPDATE VISIT
    // ==============================

    public Visit updateVisit(
            Long id,
            Visit updatedVisit) {

        Visit existingVisit =
                visitRepository.findById(id)
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Visit not found"));

        currentUserService.verifySameEstate(
                currentUserService.getRequiredEstate(),
                existingVisit.getEstate()
        );

        existingVisit.setPurpose(
                updatedVisit.getPurpose());

        existingVisit.setVisitDate(
                updatedVisit.getVisitDate());

        Visit savedVisit =
                visitRepository.save(existingVisit);

        activityLogService.log(
                "ADMIN",
                "VISIT_UPDATED",
                "Visit " + savedVisit.getId()
                        + " was updated"
        );

        return savedVisit;
    }

    // ==============================
    // DELETE VISIT
    // ==============================

    public void deleteVisitById(Long id) {

        Visit visit =
                visitRepository.findById(id)
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Visit not found"));

        currentUserService.verifySameEstate(
                currentUserService.getRequiredEstate(),
                visit.getEstate()
        );

        visitRepository.delete(visit);

        activityLogService.log(
                "ADMIN",
                "VISIT_DELETED",
                "Visit " + visit.getId()
                        + " was deleted"
        );
    }

    public Visit createPlannedVisit(
            String username,
            Long visitorId,
            String purpose,
            LocalDate visitDate) {

        User user = userRepository.findByUsername(username)
                .orElseThrow(() ->
                        new RuntimeException("User not found"));

        Resident resident = residentRepository.findByUser(user)
                .orElseThrow(() ->
                        new RuntimeException("Resident not found"));

        Visitor visitor = visitorRepository.findById(visitorId)
                .orElseThrow(() ->
                        new RuntimeException("Visitor not found"));

        if (visitor.getResident() == null
                || !visitor.getResident().getId().equals(resident.getId())) {

            throw new RuntimeException(
                    "You can only create visits for your own visitors");
        }

        if (purpose == null || purpose.trim().isEmpty()) {
            throw new RuntimeException("Visit purpose is required");
        }

        // The database column is varchar(255) — reject gracefully
        // instead of letting Postgres throw a 500.
        if (purpose.trim().length() > 255) {
            throw new RuntimeException(
                    "Visit purpose is too long (maximum 255 characters)");
        }

        if (visitDate == null) {
            throw new RuntimeException("Visit date is required");
        }

        if (visitDate.isBefore(LocalDate.now())) {
            throw new RuntimeException(
                    "Visit date cannot be in the past");
        }

        Visit visit = new Visit();

        visit.setVisitor(visitor);
        visit.setResident(resident);

        // A planned visit always belongs to the resident's estate.
        visit.setEstate(resident.getUser().getEstate());

        visit.setPurpose(purpose.trim());
        visit.setVisitDate(visitDate);
        visit.setAccessCode(generateUniqueAccessCode());

        // A resident-created planned visit is authorized immediately.
        visit.setStatus(VisitorStatus.APPROVED);

        Visit savedVisit = visitRepository.save(visit);

        activityLogService.log(
                "RESIDENT",
                "PLANNED_VISIT_CREATED",
                "Resident " + resident.getFullName()
                        + " created a planned visit for visitor "
                        + visitor.getFullName()
        );

        return savedVisit;
    }
}
