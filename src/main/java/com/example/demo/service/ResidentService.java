package com.example.demo.service;

import com.example.demo.entity.Resident;
import com.example.demo.repository.ResidentRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class ResidentService {
    private final ResidentRepository repository;

    public ResidentService(ResidentRepository repository) {
        this.repository = repository;

    }

    // CREATE RESIDENT
    public Resident createResident(Resident resident) {

        Optional<Resident> existingResident = repository.findByEmail(resident.getEmail());

        if (existingResident.isPresent()) {
            throw new RuntimeException("Email already exists");
        }
            return repository.save(resident);

    }

    // GET ALL RESIDENT
    public List<Resident> getAllResidents() {
        return repository.findAll();
    }

    // GET RESIDENT BY ID
    public Resident getById(Long id) {
        return repository.findById(id).orElseThrow(() -> new RuntimeException("id not found"));
    }

    // DELETE RESIDENT
    public void deleteResidentById(Long id) {
        repository.deleteById(id);

    }

    // UPDATE RESIDENT
    public Resident updateResident(Long id, Resident resident) {
        Resident existingResident = repository.findById(id).orElseThrow(() -> new RuntimeException("id not found"));

        existingResident.setEmail(resident.getEmail());
        existingResident.setFullName(resident.getFullName());
        existingResident.setPassword(resident.getPassword());
        existingResident.setHouseNumber(resident.getHouseNumber());
        existingResident.setPhoneNumber(resident.getPhoneNumber());


        return repository.save(existingResident);
    }
}
