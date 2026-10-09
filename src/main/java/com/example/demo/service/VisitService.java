package com.example.demo.service;

import com.example.demo.entity.*;
import com.example.demo.repository.ResidentRepository;
import com.example.demo.repository.VisitRepository;
import com.example.demo.repository.VisitorRepository;
import org.springframework.security.core.Authentication;
import com.example.demo.repository.UserRepository;
import org.springframework.security.core.context.SecurityContextHolder;
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

    public VisitService(
            VisitRepository visitRepository,
            VisitorRepository visitorRepository,
            ResidentRepository residentRepository,
            UserRepository userRepository,
            ActivityLogService activityLogService) {

        this.visitRepository = visitRepository;
        this.visitorRepository = visitorRepository;
        this.residentRepository = residentRepository;
        this.userRepository = userRepository;
        this.activityLogService = activityLogService;
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

    public Visit createVisit(
            Long residentId,
            Visitor visitor,
            String purpose) {

        Resident resident = residentRepository.findById(residentId)
                .orElseThrow(() ->
                        new RuntimeException("Resident not found"));

        Visitor existingVisitor =
                visitorRepository.findByPhoneNumber(
                        visitor.getPhoneNumber());

        if (existingVisitor == null) {

            existingVisitor = new Visitor();

            existingVisitor.setFullName(visitor.getFullName());
            existingVisitor.setPhoneNumber(visitor.getPhoneNumber());

            existingVisitor =
                    visitorRepository.save(existingVisitor);
        }

        Visit visit = new Visit();

        visit.setVisitor(existingVisitor);
        visit.setResident(resident);
        visit.setPurpose(purpose);
        visit.setAccessCode(generateUniqueAccessCode());
        visit.setVisitDate(LocalDate.now());

        // New visits wait for resident approval
        visit.setStatus(VisitorStatus.PENDING);

        Visit savedVisit =
                visitRepository.save(visit);

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

        return visitRepository.findByStatus(
                VisitorStatus.PENDING
        );
    }

    // ==============================
    // GET APPROVED VISITS
    // ==============================

    public List<Visit> getApprovedVisits() {

        return visitRepository.findByStatus(
                VisitorStatus.APPROVED
        );
    }

    // ==============================
    // GET CHECKED-IN VISITS
    // ==============================

    public List<Visit> getCheckedInVisits() {

        return visitRepository.findByStatus(
                VisitorStatus.CHECKED_IN
        );
    }

    // ==============================
    // APPROVE VISIT
    // ==============================

    public Visit approveVisit(Long id) {

        Visit visit = visitRepository.findById(id)
                .orElseThrow(() ->
                        new RuntimeException("Visit not found"));

        if (visit.getStatus() != VisitorStatus.PENDING) {

            throw new RuntimeException(
                    "Only pending visits can be approved");
        }

        visit.setStatus(VisitorStatus.APPROVED);

        Visit savedVisit =
                visitRepository.save(visit);

        activityLogService.log(
                "RESIDENT",
                "VISIT_APPROVED",
                "Visit " + visit.getId()
                        + " was approved"
        );

        return savedVisit;
    }

    // ==============================
    // REJECT VISIT
    // ==============================

    public Visit rejectVisit(Long id) {

        Visit visit = visitRepository.findById(id)
                .orElseThrow(() ->
                        new RuntimeException("Visit not found"));

        if (visit.getStatus() != VisitorStatus.PENDING) {

            throw new RuntimeException(
                    "Only pending visits can be rejected");
        }

        visit.setStatus(VisitorStatus.REJECTED);

        Visit savedVisit =
                visitRepository.save(visit);

        activityLogService.log(
                "RESIDENT",
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

        Visit visit =
                visitRepository.findByAccessCode(accessCode);

        if (visit == null) {

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

        Visit visit =
                visitRepository.findByAccessCode(accessCode);

        if (visit == null) {

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

        return visitRepository.findAll();
    }

    // ==============================
    // GET VISIT BY ID
    // ==============================

    public Visit getVisitById(Long id) {

        return visitRepository.findById(id)
                .orElseThrow(() ->
                        new RuntimeException("Visit not found"));
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