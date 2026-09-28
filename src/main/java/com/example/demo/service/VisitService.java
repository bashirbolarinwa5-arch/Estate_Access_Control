package com.example.demo.service;

import com.example.demo.entity.Resident;
import com.example.demo.entity.Visit;
import com.example.demo.entity.Visitor;
import com.example.demo.entity.VisitorStatus;
import com.example.demo.repository.ResidentRepository;
import com.example.demo.repository.VisitRepository;
import com.example.demo.repository.VisitorRepository;
import org.springframework.stereotype.Service;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;


import java.time.LocalDate;
import java.time.LocalDateTime;

import java.util.List;
import java.util.Random;

@Service
public class VisitService {

    private final VisitRepository visitRepository;
    private final VisitorRepository visitorRepository;
    private final ResidentRepository residentRepository;

    public VisitService(
            VisitRepository visitRepository,
            VisitorRepository visitorRepository,
            ResidentRepository residentRepository) {

        this.visitRepository = visitRepository;
        this.visitorRepository = visitorRepository;
        this.residentRepository = residentRepository;
    }

    private String generateRandomCode() {

        String characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        Random random = new Random();

        String code = "";

        for (int i = 0; i < 6; i++) {
            int number = random.nextInt(characters.length());
            code += characters.charAt(number);
        }

        return code;
    }

    private String generateUniqueAccessCode() {

        String code = generateRandomCode();

        while (visitRepository.findByAccessCode(code) != null) {
            code = generateRandomCode();
        }

        return code;
    }

    // CREATE  A VISIT
    public Visit createVisit(Long residentId, Visitor visitor, String purpose) {

        Resident resident = residentRepository.findById(residentId)
                .orElseThrow(() -> new RuntimeException("resident not found"));

        // Search for an existing visitor
        Visitor existingVisitor =
                visitorRepository.findByPhoneNumber(visitor.getPhoneNumber());

        // If visitor doesn't exist, create them
        if (existingVisitor == null) {
            existingVisitor = new Visitor();
            existingVisitor.setFullName(visitor.getFullName());
            existingVisitor.setPhoneNumber(visitor.getPhoneNumber());

            existingVisitor = visitorRepository.save(existingVisitor);
        }

        // Create a new visit
        Visit visit = new Visit();

        visit.setVisitor(existingVisitor);
        visit.setResident(resident);
        visit.setPurpose(purpose);
        visit.setAccessCode(generateUniqueAccessCode());
        visit.setVisitDate(LocalDate.now());
        visit.setStatus(VisitorStatus.PENDING);

        return visitRepository.save(visit);
    }

    //CHECK IN VISITOR
    public Visit checkInVisitor(String accessCode) {

        Visit visit = visitRepository.findByAccessCode(accessCode);

        if (visit == null) {
            throw new RuntimeException("access code not found");
        }

        if (visit.getStatus() != VisitorStatus.PENDING) {
            throw new RuntimeException("visitor cannot be checked in");
        }

        visit.setStatus(VisitorStatus.CHECKED_IN);
        visit.setCheckInTime(LocalDateTime.now());

        return visitRepository.save(visit);
    }

    // CHECK OUT VISITOR
    public Visit checkOutVisitor(String accessCode) {

        Visit visit = visitRepository.findByAccessCode(accessCode);

        if (visit == null) {
            throw new RuntimeException("access code not found");
        }

        if (visit.getStatus() != VisitorStatus.CHECKED_IN) {
            throw new RuntimeException("visitor cannot be checked out");
        }

        visit.setStatus(VisitorStatus.CHECKED_OUT);
        visit.setCheckOutTime(LocalDateTime.now());

        return visitRepository.save(visit);
    }

    // GET ALL VISIT
    public List<Visit> getAllVisit() {
        return visitRepository.findAll();
    }

    // GET BY ID
    public Visit getVisitById(Long id) {
        return visitRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("visit not found"));
    }

    // UPDATE VISIT
    public Visit updateVisit(Long id, Visit updatedVisit) {

        Visit existingVisit = visitRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("visit not found"));

        existingVisit.setPurpose(updatedVisit.getPurpose());
        existingVisit.setVisitDate(updatedVisit.getVisitDate());

        return visitRepository.save(existingVisit);
    }
    // DELETE VISITOR

    public void deleteVisitById(Long id) {

        if (!visitRepository.existsById(id)) {
            throw new RuntimeException("id not found");
        }

        visitRepository.deleteById(id);
    }
}

