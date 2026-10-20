package com.example.demo.service;

import com.example.demo.entity.Estate;
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
    private final CurrentUserService currentUserService;

    public VisitorService(
            VisitorRepository visitorRepository,
            ResidentRepository residentRepository,
            ActivityLogService activityLogService,
            CurrentUserService currentUserService) {

        this.visitorRepository = visitorRepository;
        this.residentRepository = residentRepository;
        this.activityLogService = activityLogService;
        this.currentUserService = currentUserService;
    }

    // CREATE VISITOR
    public Visitor createVisitor(Long residentId, Visitor visitor) {

        // Only an ADMIN/SECURITY of one estate reaches here.
        Estate estate =
                currentUserService.getRequiredEstate();

        Resident resident = residentRepository.findById(residentId)
                .orElseThrow(() ->
                        new RuntimeException("Resident not found"));

        // The resident must belong to the actor's estate.
        currentUserService.verifySameEstate(
                estate,
                resident.getUser() == null
                        ? null
                        : resident.getUser().getEstate()
        );

        visitor.setResident(resident);
        visitor.setEstate(estate);

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

        Estate estate =
                currentUserService.getRequiredEstate();

        return visitorRepository.findByEstate(estate);
    }

    // GET VISITOR BY ID
    public Visitor getVisitorById(Long id) {

        Visitor visitor = visitorRepository.findById(id)
                .orElseThrow(() ->
                        new RuntimeException("Visitor not found"));

        currentUserService.verifySameEstate(
                currentUserService.getRequiredEstate(),
                visitor.getEstate()
        );

        return visitor;
    }

    // UPDATE VISITOR
    public Visitor updateVisitor(Long id, Visitor visitor) {

        Visitor existingVisitor = visitorRepository.findById(id)
                .orElseThrow(() ->
                        new RuntimeException("Visitor not found"));

        currentUserService.verifySameEstate(
                currentUserService.getRequiredEstate(),
                existingVisitor.getEstate()
        );

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

        currentUserService.verifySameEstate(
                currentUserService.getRequiredEstate(),
                visitor.getEstate()
        );

        visitorRepository.delete(visitor);

        activityLogService.log(
                "SYSTEM",
                "VISITOR_DELETED",
                "Visitor " + visitor.getFullName()
                        + " was deleted"
        );
    }

    public List<Visitor> getVisitorsForResident(Long residentId) {

        Estate estate =
                currentUserService.getRequiredEstate();

        Resident resident = residentRepository.findById(residentId)
                .orElseThrow(() ->
                        new RuntimeException("Resident not found"));

        // A resident can only list visitors of their own estate.
        currentUserService.verifySameEstate(
                estate,
                resident.getUser() == null
                        ? null
                        : resident.getUser().getEstate()
        );

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

        // A resident-registered visitor belongs to the
        // resident's own estate.
        visitor.setResident(resident);
        visitor.setEstate(resident.getUser().getEstate());

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
