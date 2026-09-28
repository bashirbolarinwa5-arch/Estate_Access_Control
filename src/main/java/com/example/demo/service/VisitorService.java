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

    public VisitorService(VisitorRepository visitorRepository, ResidentRepository residentRepository) {
        this.visitorRepository = visitorRepository;
        this.residentRepository = residentRepository;
    }




    //create visitor
    public Visitor createVisitor(Long residentId, Visitor visitor) {
        Resident resident = residentRepository.findById(residentId).orElseThrow(() -> new RuntimeException("id not found"));
        visitor.setResident(resident);
        visitor.setPhoneNumber(visitor.getPhoneNumber());
        visitor.setPurpose(visitor.getPurpose());
        visitor.setFullName(visitor.getFullName());


        return visitorRepository.save(visitor);

    }

    //get all visitor
    public List<Visitor> getAllVisitor() {
        return visitorRepository.findAll();
    }

    // get a visitor
    public Visitor getVisitorById(Long id) {
        Visitor visitor = visitorRepository.findById(id).orElseThrow(() -> new RuntimeException("id not found"));

        return visitor;
    }

    // Update visitor
    public Visitor updateVisitor(Long id, Visitor visitor){
        Visitor existingVisitor = visitorRepository.findById(id).orElseThrow(() -> new RuntimeException("id not found"));

        existingVisitor.setPurpose(visitor.getPurpose());
        existingVisitor.setFullName(visitor.getFullName());
        existingVisitor.setPhoneNumber(visitor.getPhoneNumber());
        return visitorRepository.save(existingVisitor);

    }
    // Delete Visitor
    public void deleteVisitor(Long id){
        visitorRepository.deleteById(id);
    }

    // find by phone number


}

