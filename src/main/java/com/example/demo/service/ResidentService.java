package com.example.demo.service;

import com.example.demo.entity.Estate;
import com.example.demo.entity.Resident;
import com.example.demo.entity.Role;
import com.example.demo.entity.User;
import com.example.demo.repository.ResidentRepository;
import com.example.demo.repository.UserRepository;
import com.example.demo.response.BulkImportResult;
import com.example.demo.response.PasswordResetResult;
import com.example.demo.response.ResidentCreateRequest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;



import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class ResidentService {

    private final ResidentRepository repository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final ActivityLogService activityLogService;
    private final CurrentUserService currentUserService;
    private final CredentialService credentialService;
    private final TransactionTemplate transactionTemplate;

    public ResidentService(
            ResidentRepository repository,
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            ActivityLogService activityLogService,
            CurrentUserService currentUserService,
            CredentialService credentialService,
            PlatformTransactionManager transactionManager) {

        this.repository = repository;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.activityLogService = activityLogService;
        this.currentUserService = currentUserService;
        this.credentialService = credentialService;
        this.transactionTemplate = new TransactionTemplate(transactionManager);
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
        request.setPhoneNumber(PhoneNumberValidator.requireElevenDigits(
                request.getPhoneNumber(), "Phone number"));

        if (request.getHouseNumber() == null ||
                request.getHouseNumber().isBlank()) {

            throw new RuntimeException("House number is required");
        }

        /*
         * Email is optional for imported residents. The column
         * in the database is NOT NULL + UNIQUE, so a resident
         * without one gets an internal placeholder derived from
         * the (unique) username. The UI hides these addresses.
         */
        if (request.getUsername() == null ||
                request.getUsername().isBlank()) {

            throw new RuntimeException("Username is required");
        }

        if (request.getPassword() == null ||
                request.getPassword().isBlank()) {

            throw new RuntimeException("Password is required");
        }

        String cleanUsername = request.getUsername().trim();

        String cleanEmail = request.getEmail() == null
                ? ""
                : request.getEmail().trim();

        boolean hasRealEmail = !cleanEmail.isEmpty();

        if (!hasRealEmail) {
            cleanEmail = cleanUsername + "@estateflow.local";
        }

        if (hasRealEmail && repository.existsByEmail(cleanEmail)) {
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

        /*
         * A resident created by an admin joins the
         * admin's estate.
         */
        user.setEstate(
                currentUserService.getRequiredEstate()
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

    // BULK CREATE RESIDENTS (CSV / EXCEL IMPORT)
    public BulkImportResult createResidents(
            List<ResidentCreateRequest> requests) {

        BulkImportResult result = new BulkImportResult();

        for (int index = 0; index < requests.size(); index++) {

            ResidentCreateRequest request = requests.get(index);

            BulkImportResult.RowResult row =
                    new BulkImportResult.RowResult();

            row.setRow(index + 1);
            row.setFullName(request.getFullName());
            row.setHouseNumber(request.getHouseNumber());

            String username = request.getUsername();
            String generatedPassword = null;

            try {

                if (username == null || username.isBlank()) {

                    username = credentialService.generateUsername(
                            request.getFullName(),
                            request.getHouseNumber()
                    );

                    request.setUsername(username);
                }

                username = username.trim();
                request.setUsername(username);

                if (request.getPassword() == null ||
                        request.getPassword().isBlank()) {

                    generatedPassword =
                            credentialService.generateTemporaryPassword();

                    request.setPassword(generatedPassword);
                }

                boolean mustChangePassword = generatedPassword != null;

                Resident created = transactionTemplate.execute(status -> {
                    Resident importedResident = createResident(request);

                    if (mustChangePassword) {
                        User user = importedResident.getUser();
                        user.setMustChangePassword(true);
                        userRepository.save(user);
                    }

                    return importedResident;
                });

                row.setSuccess(true);
                row.setUsername(username);
                row.setTemporaryPassword(generatedPassword);

            } catch (RuntimeException ex) {

                row.setSuccess(false);
                row.setUsername(
                        username == null || username.isBlank()
                                ? "unknown"
                                : username
                );
                row.setReason(ex.getMessage());
            }

            result.add(row);
        }

        return result;
    }

    /*
     * Admin-triggered password reset.
     *
     * Generates a fresh temporary password, invalidates the
     * previous one, and forces a change on next login.
     */
    public PasswordResetResult resetPassword(Long id) {

        Resident resident = repository.findById(id)
                .orElseThrow(() ->
                        new RuntimeException("Resident not found")
                );

        currentUserService.verifySameEstate(
                currentUserService.getRequiredEstate(),
                resident.getUser() == null
                        ? null
                        : resident.getUser().getEstate()
        );

        User user = resident.getUser();

        if (user == null) {
            throw new RuntimeException(
                    "This resident has no login account"
            );
        }

        String temporaryPassword =
                credentialService.generateTemporaryPassword();

        user.setPassword(
                passwordEncoder.encode(temporaryPassword)
        );

        user.setMustChangePassword(true);

        userRepository.save(user);

        activityLogService.log(
                "ADMIN",
                "PASSWORD_RESET",
                "Password reset for resident "
                        + resident.getFullName()
        );

        return new PasswordResetResult(
                user.getUsername(),
                temporaryPassword
        );
    }

    // GET ALL RESIDENTS
    public List<Resident> getAllResidents() {

        return repository.findByUserEstate(
                currentUserService.getRequiredEstate()
        );
    }

    // GET RESIDENT BY ID
    public Resident getById(Long id) {

        Resident resident = repository.findById(id)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Resident not found"
                        )
                );

        currentUserService.verifySameEstate(
                currentUserService.getRequiredEstate(),
                resident.getUser() == null
                        ? null
                        : resident.getUser().getEstate()
        );

        return resident;
    }

    // SEARCH RESIDENTS
    public List<Resident> searchResidents(
            String name,
            String houseNumber,
            String phoneNumber) {

        Estate estate =
                currentUserService.getRequiredEstate();

        if (name != null && !name.isBlank()) {

            return repository
                    .findByUserEstateAndFullNameContainingIgnoreCase(
                            estate,
                            name
                    );
        }

        if (houseNumber != null && !houseNumber.isBlank()) {

            return repository
                    .findByUserEstateAndHouseNumberContainingIgnoreCase(
                            estate,
                            houseNumber
                    );
        }

        if (phoneNumber != null && !phoneNumber.isBlank()) {

            return repository
                    .findByUserEstateAndPhoneNumberContaining(
                            estate,
                            phoneNumber
                    );
        }

        return repository.findByUserEstate(estate);
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

        currentUserService.verifySameEstate(
                currentUserService.getRequiredEstate(),
                resident.getUser() == null
                        ? null
                        : resident.getUser().getEstate()
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

        resident.setPhoneNumber(PhoneNumberValidator.requireElevenDigits(
                resident.getPhoneNumber(), "Phone number"));

        Resident existingResident =
                repository.findById(id)
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Resident not found"
                                )
                        );

        currentUserService.verifySameEstate(
                currentUserService.getRequiredEstate(),
                existingResident.getUser() == null
                        ? null
                        : existingResident.getUser().getEstate()
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
