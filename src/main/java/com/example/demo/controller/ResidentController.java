package com.example.demo.controller;

import com.example.demo.service.ResidentService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.example.demo.response.ApiResponse;

import java.util.List;
import com.example.demo.entity.Resident;
@RestController
@RequestMapping("/resident")
@CrossOrigin(origins = "*")
public class ResidentController {
    private final ResidentService residentService;
    public ResidentController(ResidentService residentService){
        this.residentService = residentService;
    }

    // CREATE RESIDENT
    @PostMapping
    public ApiResponse<Resident> createResident(@RequestBody Resident resident){
         Resident resident1 =  residentService.createResident(resident);

        return new ApiResponse<>(
                true,
                "Resident created successfully",
                resident1
        );
    }

    // GET ALL RESIDENT
    @GetMapping
    public List<Resident> getAllResidents(){
        return residentService.getAllResidents();
    }

    // GET RESIDENT WITH ID
    @GetMapping("/{id}")
    public Resident getById(@PathVariable Long id){
        return residentService.getById(id);

    }

    // DELETE RESIDENT

        @DeleteMapping("/{id}")
        public ResponseEntity<ApiResponse<Long>> deleteById(@PathVariable Long id) {
            residentService.deleteResidentById(id);

            ApiResponse<Long> response = new ApiResponse<>(
                    true,
                    "Resident deleted successfully",
                    id
            );

            return ResponseEntity.ok(response);
            // This sends back HTTP 200 OK along with your JSON payload
        }



    // UPDATE RESIDENT
    @PutMapping("/update/{id}")
    public ApiResponse<Resident> updateResident(@PathVariable Long id, @RequestBody Resident existingResident){
        Resident resident2 = residentService.updateResident(id,existingResident);
        return new ApiResponse<>(
                true,
                "Resident Updated successfully",
                resident2
        );
    }
}
