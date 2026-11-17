package com.example.demo.service;

import com.example.demo.entity.Estate;
import com.example.demo.entity.Resident;
import com.example.demo.entity.Role;
import com.example.demo.entity.User;
import com.example.demo.repository.ResidentRepository;
import com.example.demo.repository.UserRepository;
import com.example.demo.response.BulkImportResult;
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
    private final PasswordResetService passwordResetService;
    private final TransactionTemplate transactionTemplate;

    public ResidentService(
            ResidentRepository repository,
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            ActivityLogService activityLogService,
            CurrentUserService currentUserService,
            CredentialService credentialService,
            PasswordResetService passwordResetService,
            PlatformTransactionManager transactionManager) {

        this.repository = repository;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.activityLogService = activityLogService;
        this.currentUserService = currentUserService;
        this.credentialService = credentialService;
        this.passwordResetService = passwordResetService;
        this.transactionTemplate = new TransactionTemplate(transactionManager);
    }

    // CREATE RESIDENT + USER ACCOUNT
    /*
     * Administrators never choose or see a resident password.
     *
     * The account is created in the PENDING_ACTIVATION state: the stored
     * password is the hash of a random value nobody knows, so there is no
     * default, shared or temporary password to distribute. The resident
     * sets the real password through the emailed activation link.
     */
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

        Long estateId = currentUserService.getRequiredEstate().getId();

        /*
         * Username is optional: when the spreadsheet has no username column
         * (the normal case) one is derived from the name and house number.
         */
        String cleanUsername = request.getUsername() == null
                ? ""
                : request.getUsername().trim();

        if (cleanUsername.isEmpty()) {
            cleanUsername = credentialService.generateUsername(
                    request.getFullName(),
                    request.getHouseNumber()
            );
        }

        request.setUsername(cleanUsername);

        /*
         * Email is required by the database column, but a resident may not
         * have one. Those rows get an internal placeholder derived from the
         * unique username; the UI hides it and activation reports that no
         * deliverable address exists.
         */
        String cleanEmail = request.getEmail() == null
                ? ""
                : request.getEmail().trim();

        boolean hasRealEmail = !cleanEmail.isEmpty();

        if (!hasRealEmail) {
            cleanEmail = cleanUsername + "@estateflow.local";
        }

        if (hasRealEmail && repository.existsByEstateIdAndEmail(
                estateId, cleanEmail)) {

            throw new RuntimeException("Email already exists");
        }

        if (userRepository.existsByUsername(cleanUsername)) {
            throw new RuntimeException("Username already exists");
        }

        User user = new User();

        user.setUsername(cleanUsername);

        /*
         * Unguessable, unknown to everybody, never returned or logged.
         *
         * A single UUID (122 random bits) stays well inside BCrypt's
         * 72-byte input limit.
         */
        user.setPassword(passwordEncoder.encode(
                java.util.UUID.randomUUID().toString()
        ));

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

        user.setActive(true);
        user.setMustChangePassword(false);
        user.setPendingActivation(true);

        User savedUser = userRepository.save(user);

        Resident resident = new Resident();

        resident.setFullName(request.getFullName().trim());
        resident.setPhoneNumber(request.getPhoneNumber().trim());
        resident.setHouseNumber(request.getHouseNumber().trim());
        resident.setEmail(cleanEmail);
        resident.setEstateId(estateId);

        resident.setUser(savedUser);

        Resident savedResident =
                repository.save(resident);
        activityLogService.log(
                "ADMIN",
                "RESIDENT_CREATED",
                "Resident " + savedResident.getFullName()
                        + " was created (pending activation)"
        );

        return savedResident;
    }

    // BULK CREATE RESIDENTS (CSV / EXCEL IMPORT)
    /*
     * The sheet only needs Name, Flat/Unit, Phone and Email.
     *
     * A password column — if the file happens to have one — is ignored
     * outright: no password from the file is ever stored, and no
     * generated password is returned to the administrator. Every row
     * lands in PENDING_ACTIVATION and the resident activates themself.
     */
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

            /* Any password supplied by the spreadsheet is discarded. */
            request.setPassword(null);

            String username = request.getUsername();

            try {

                if (username == null || username.isBlank()) {

                    username = credentialService.generateUsername(
                            request.getFullName(),
                            request.getHouseNumber()
                    );

                    request.setUsername(username);
                }

                Resident created = transactionTemplate.execute(
                        status -> createResident(request));

                row.setSuccess(true);
                row.setUsername(
                        created != null && created.getUser() != null
                                ? created.getUser().getUsername()
                                : username);
                row.setActivationStatus("PENDING_ACTIVATION");

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
     * Admin "resend" action in the resident list. Sends the secure
     * activation link to the address on the record; the admin never sees
     * or handles a password.
     */
    public Map<String, Object> sendActivationLink(Long id) {

        Resident resident = repository.findById(id)
                .orElseThrow(() ->
                        new RuntimeException("Resident not found")
                );

        if (resident.getUser() == null) {
            throw new RuntimeException("This resident has no login account");
        }

        currentUserService.verifySameEstate(
                currentUserService.getRequiredEstate(),
                resident.getUser().getEstate()
        );

        Map<String, Object> result =
                passwordResetService.sendActivationLink(resident);

        activityLogService.log(
                "ADMIN",
                "ACTIVATION_LINK_REQUESTED",
                "Activation link requested for resident "
                        + resident.getFullName()
        );

        return result;
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
                && repository.existsByEstateIdAndEmail(
                existingResident.getEstateId(), resident.getEmail())) {

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
