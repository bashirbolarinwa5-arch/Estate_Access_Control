package com.example.demo.service;

import com.example.demo.entity.Resident;
import com.example.demo.entity.Role;
import com.example.demo.entity.User;
import com.example.demo.repository.ResidentRepository;
import com.example.demo.repository.UserRepository;
import com.example.demo.response.ResidentCreateRequest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;



import java.util.List;

@Service
public class ResidentService {

    private final ResidentRepository repository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final ActivityLogService activityLogService;

    public ResidentService(
            ResidentRepository repository,
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            ActivityLogService activityLogService) {

        this.repository = repository;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.activityLogService = activityLogService;
    }

    // CREATE RESIDENT + USER ACCOUNT
    public Resident createResident(ResidentCreateRequest request) {

        if (request.getFullName() == null ||
                request.getFullName().isBlank()) {

            throw new RuntimeException("Full name is required");
        }

        if (request.getPhoneNumber() == null ||
                request.getPhoneNumber().isBlank()) {

            throw new RuntimeException("Phone number is required");
        }

        if (request.getHouseNumber() == null ||
                request.getHouseNumber().isBlank()) {

            throw new RuntimeException("House number is required");
        }

        if (request.getEmail() == null ||
                request.getEmail().isBlank()) {

            throw new RuntimeException("Email is required");
        }

        if (request.getUsername() == null ||
                request.getUsername().isBlank()) {

            throw new RuntimeException("Username is required");
        }

        if (request.getPassword() == null ||
                request.getPassword().isBlank()) {

            throw new RuntimeException("Password is required");
        }

        String cleanEmail = request.getEmail().trim();
        String cleanUsername = request.getUsername().trim();

        if (repository.existsByEmail(cleanEmail)) {
            throw new RuntimeException("Email already exists");
        }

        if (userRepository.existsByUsername(cleanUsername)) {
            throw new RuntimeException("Username already exists");
        }

        User user = new User();

        user.setUsername(cleanUsername);

        user.setPassword(
                passwordEncoder.encode(request.getPassword())
        );

        user.setRole(
                Role.ROLE_RESIDENT
        );

        User savedUser = userRepository.save(user);

        Resident resident = new Resident();

        resident.setFullName(request.getFullName().trim());
        resident.setPhoneNumber(request.getPhoneNumber().trim());
        resident.setHouseNumber(request.getHouseNumber().trim());
        resident.setEmail(cleanEmail);

        resident.setUser(savedUser);

        Resident savedResident =
                repository.save(resident);
        activityLogService.log(
                "ADMIN",
                "RESIDENT_CREATED",
                "Resident " + savedResident.getFullName()
                        + " was created"
        );

        return savedResident;
    }

    // GET ALL RESIDENTS
    public List<Resident> getAllResidents() {

        return repository.findAll();
    }

    // GET RESIDENT BY ID
    public Resident getById(Long id) {

        return repository.findById(id)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Resident not found"
                        )
                );
    }

    // SEARCH RESIDENTS
    public List<Resident> searchResidents(
            String name,
            String houseNumber,
            String phoneNumber) {

        if (name != null && !name.isBlank()) {

            return repository
                    .findByFullNameContainingIgnoreCase(name);
        }

        if (houseNumber != null && !houseNumber.isBlank()) {

            return repository
                    .findByHouseNumberContainingIgnoreCase(
                            houseNumber
                    );
        }

        if (phoneNumber != null && !phoneNumber.isBlank()) {

            return repository
                    .findByPhoneNumberContaining(phoneNumber);
        }

        return repository.findAll();
    }

    // DELETE RESIDENT
    public void deleteResidentById(Long id) {

        Resident resident =
                repository.findById(id)
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Resident not found"
                                )
                        );

        User user = resident.getUser();

        repository.delete(resident);

        if (user != null) {
            userRepository.delete(user);
        }

        activityLogService.log(
                "ADMIN",
                "RESIDENT_DELETED",
                "Resident " + resident.getFullName()
                        + " was deleted"
        );
    }

    // UPDATE RESIDENT
    public Resident updateResident(
            Long id,
            Resident resident) {

        Resident existingResident =
                repository.findById(id)
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Resident not found"
                                )
                        );

        if (resident.getEmail() == null ||
                resident.getEmail().isBlank()) {

            throw new RuntimeException(
                    "Email is required"
            );
        }

        if (!existingResident.getEmail()
                .equalsIgnoreCase(resident.getEmail())
                && repository.existsByEmail(
                resident.getEmail())) {

            throw new RuntimeException(
                    "Email already exists"
            );
        }

        existingResident.setEmail(
                resident.getEmail().trim()
        );

        existingResident.setFullName(
                resident.getFullName()
        );

        existingResident.setHouseNumber(
                resident.getHouseNumber()
        );

        existingResident.setPhoneNumber(
                resident.getPhoneNumber()
        );

        /*
         * Do NOT modify:
         *
         * existingResident.password
         *
         * or the associated User password.
         *
         * Authentication belongs to User.
         */

        Resident updatedResident =
                repository.save(existingResident);

        activityLogService.log(
                "ADMIN",
                "RESIDENT_UPDATED",
                "Resident " + updatedResident.getFullName()
                        + " was updated"
        );

        return updatedResident;
    }

    public Resident getMyProfile() {

        Authentication authentication =
                SecurityContextHolder.getContext().getAuthentication();

        String username = authentication.getName();

        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        return repository.findByUser(user)
                .orElseThrow(() -> new RuntimeException("Resident profile not found"));
    }
}
