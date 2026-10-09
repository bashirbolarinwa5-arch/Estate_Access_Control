package com.example.demo.service;

import com.example.demo.entity.Resident;
import com.example.demo.entity.Visitor;
import com.example.demo.repository.ResidentRepository;
import com.example.demo.repository.VisitorRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class VisitorService {

    private final ResidentRepository residentRepository;
    private final VisitorRepository visitorRepository;
    private final ActivityLogService activityLogService;

    public VisitorService(
            VisitorRepository visitorRepository,
            ResidentRepository residentRepository,
            ActivityLogService activityLogService) {

        this.visitorRepository = visitorRepository;
        this.residentRepository = residentRepository;
        this.activityLogService = activityLogService;
    }

    // CREATE VISITOR
    public Visitor createVisitor(Long residentId, Visitor visitor) {

        Resident resident = residentRepository.findById(residentId)
                .orElseThrow(() ->
                        new RuntimeException("Resident not found"));

        visitor.setResident(resident);

        Visitor savedVisitor = visitorRepository.save(visitor);

        activityLogService.log(
                "SYSTEM",
                "VISITOR_CREATED",
                "Visitor " + savedVisitor.getFullName()
                        + " was created for resident "
                        + resident.getFullName()
        );

        return savedVisitor;
    }

    // GET ALL VISITORS
    public List<Visitor> getAllVisitor() {
        return visitorRepository.findAll();
    }

    // GET VISITOR BY ID
    public Visitor getVisitorById(Long id) {

        return visitorRepository.findById(id)
                .orElseThrow(() ->
                        new RuntimeException("Visitor not found"));
    }

    // UPDATE VISITOR
    public Visitor updateVisitor(Long id, Visitor visitor) {

        Visitor existingVisitor = visitorRepository.findById(id)
                .orElseThrow(() ->
                        new RuntimeException("Visitor not found"));

        existingVisitor.setPurpose(visitor.getPurpose());
        existingVisitor.setFullName(visitor.getFullName());
        existingVisitor.setPhoneNumber(visitor.getPhoneNumber());

        Visitor updatedVisitor =
                visitorRepository.save(existingVisitor);

        activityLogService.log(
                "SYSTEM",
                "VISITOR_UPDATED",
                "Visitor " + updatedVisitor.getFullName()
                        + " was updated"
        );

        return updatedVisitor;
    }

    // DELETE VISITOR
    public void deleteVisitor(Long id) {

        Visitor visitor = visitorRepository.findById(id)
                .orElseThrow(() ->
                        new RuntimeException("Visitor not found"));

        visitorRepository.delete(visitor);

        activityLogService.log(
                "SYSTEM",
                "VISITOR_DELETED",
                "Visitor " + visitor.getFullName()
                        + " was deleted"
        );
    }
    public List<Visitor> getVisitorsForResident(Long residentId) {
        return visitorRepository.findByResidentId(residentId);
    }
    public List<Visitor> getVisitorsForResidentUsername(String username) {
        return visitorRepository.findByResidentUserUsername(username);
    }
    public Visitor createVisitorForResidentUsername(
            String username,
            Visitor visitor
    ) {

        Resident resident = residentRepository
                .findByUserUsername(username)
                .orElseThrow(() ->
                        new RuntimeException("Resident not found"));

        visitor.setResident(resident);

        Visitor savedVisitor = visitorRepository.save(visitor);

        activityLogService.log(
                "SYSTEM",
                "VISITOR_CREATED",
                "Visitor " + savedVisitor.getFullName()
                        + " was created for resident "
                        + resident.getFullName()
        );

        return savedVisitor;
    }
}