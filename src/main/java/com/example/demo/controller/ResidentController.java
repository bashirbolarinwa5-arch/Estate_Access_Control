package com.example.demo.controller;

import com.example.demo.entity.Resident;
import com.example.demo.response.ApiResponse;
import com.example.demo.response.ResidentCreateRequest;
import com.example.demo.service.ResidentService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/resident")
@CrossOrigin(origins = "*")
public class ResidentController {

    private final ResidentService residentService;

    public ResidentController(ResidentService residentService) {
        this.residentService = residentService;
    }

    // CREATE RESIDENT
    @PostMapping
    public ApiResponse<Resident> createResident(
            @RequestBody ResidentCreateRequest request) {

        Resident created = residentService.createResident(request);

        return new ApiResponse<>(
                true,
                "Resident created successfully",
                created
        );
    }

    // GET ALL RESIDENTS
    @GetMapping
    public ApiResponse<List<Resident>> getAllResidents() {

        return new ApiResponse<>(
                true,
                "Residents retrieved successfully",
                residentService.getAllResidents()
        );
    }

    // SEARCH RESIDENTS
    @GetMapping("/search")
    public ApiResponse<List<Resident>> searchResidents(
            @RequestParam(required = false) String name,
            @RequestParam(required = false) String houseNumber,
            @RequestParam(required = false) String phoneNumber) {

        return new ApiResponse<>(
                true,
                "Residents retrieved successfully",
                residentService.searchResidents(
                        name,
                        houseNumber,
                        phoneNumber
                )
        );
    }

    // GET RESIDENT BY ID
    @GetMapping("/{id}")
    public ApiResponse<Resident> getById(
            @PathVariable Long id) {

        return new ApiResponse<>(
                true,
                "Resident retrieved successfully",
                residentService.getById(id)
        );
    }

    // UPDATE RESIDENT
    @PutMapping("/update/{id}")
    public ApiResponse<Resident> updateResident(
            @PathVariable Long id,
            @RequestBody Resident resident) {

        Resident updated =
                residentService.updateResident(id, resident);

        return new ApiResponse<>(
                true,
                "Resident updated successfully",
                updated
        );
    }

    // DELETE RESIDENT
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Long>> deleteById(
            @PathVariable Long id) {

        residentService.deleteResidentById(id);

        return ResponseEntity.ok(
                new ApiResponse<>(
                        true,
                        "Resident deleted successfully",
                        id
                )
        );
    }
    @GetMapping("/me")
    public ApiResponse<Resident> getMyProfile() {
        Resident resident = residentService.getMyProfile();

        return new ApiResponse<>(
                true,
                "Resident profile retrieved successfully",
                resident
        );
    }

}