package com.example.demo.controller;

import com.example.demo.entity.Visitor;
import com.example.demo.response.ApiResponse;
import com.example.demo.service.VisitService;
import org.springframework.web.bind.annotation.*;
import com.example.demo.entity.Visit;

import java.util.List;
@RestController
@RequestMapping("/visit")
@CrossOrigin(origins = "*")

public class VisitController {
    private final VisitService service;
    public VisitController(VisitService service){
        this.service = service;
    }
    // GET ALL VISIT
    @GetMapping
    public ApiResponse<List<Visit>> getAllVisit() {

        return new ApiResponse<>(
                true,
                "Visits retrieved successfully",
                service.getAllVisit()
        );
    }


    // GET VISIT BY ID
    @GetMapping("/{id}")
    public ApiResponse<Visit> getById(
            @PathVariable Long id) {

        return new ApiResponse<>(
                true,
                "Visit retrieved successfully",
                service.getVisitById(id)
        );

    }

    // CREATE VISIT
    @PostMapping
    public ApiResponse<Visit> createVisit(
            @RequestParam Long residentId,
            @RequestParam String purpose,
            @RequestBody Visitor visitor) {

        Visit visit = service.createVisit(
                residentId,
                visitor,
                purpose
        );

        return new ApiResponse<>(
                true,
                "Visit created successfully",
                visit
        );
    }



    // UPDATE VISIT
    @PutMapping("/{id}")
    public Visit updateVisit(@PathVariable Long id, Visit updatedVisit){

        return service.updateVisit(id,updatedVisit);

    }

    // DELETE VISITOR
    @DeleteMapping("/{id}")
    public void deleteVisit(@PathVariable Long id){
        service.deleteVisitById(id);
    }

    //CHECK IN VISITOR
    @PostMapping("/check-In/{accessCode}")
    public ApiResponse<Visit> checkInVisitor(
            @PathVariable String accessCode) {

        Visit visit = service.checkInVisitor(accessCode);

        return new ApiResponse<>(
                true,
                "Visitor checked in successfully",
                visit
        );
    }

    // CHECK OUT VISITOR
    @PostMapping("/check-Out/{accessCode}")
    public ApiResponse<Visit> checkOutVisitor(
            @PathVariable String accessCode) {

        Visit visit = service.checkOutVisitor(accessCode);

        return new ApiResponse<>(
                true,
                "Visitor checked out successfully",
                visit
        );
    }
}

