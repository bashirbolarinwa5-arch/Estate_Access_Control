package com.example.demo.service;

import com.example.demo.response.BulkImportResult;
import com.example.demo.entity.Estate;
import com.example.demo.entity.Role;
import com.example.demo.entity.Security;
import com.example.demo.entity.User;
import com.example.demo.entity.Visit;
import com.example.demo.repository.SecurityRepository;
import com.example.demo.repository.UserRepository;
import com.example.demo.response.SecurityRequest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.List;
import java.util.Map;

@Service
public class SecurityService {

    private final SecurityRepository securityRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final VisitService visitService;
    private final CurrentUserService currentUserService;
    private final CredentialService credentialService;
    private final PasswordResetService passwordResetService;
    private final ActivityLogService activityLogService;
    private final PhoneDirectoryGuard phoneDirectoryGuard;
    private final TransactionTemplate transactionTemplate;

    public SecurityService(
            SecurityRepository securityRepository,
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            VisitService visitService,
            CurrentUserService currentUserService,
            CredentialService credentialService,
            PasswordResetService passwordResetService,
            ActivityLogService activityLogService,
            PhoneDirectoryGuard phoneDirectoryGuard,
            PlatformTransactionManager transactionManager) {

        this.securityRepository = securityRepository;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.visitService = visitService;
        this.currentUserService = currentUserService;
        this.credentialService = credentialService;
        this.passwordResetService = passwordResetService;
        this.activityLogService = activityLogService;
        this.phoneDirectoryGuard = phoneDirectoryGuard;
        this.transactionTemplate = new TransactionTemplate(transactionManager);
    }

    // CREATE SECURITY
    /*
     * Administrators never choose or see a security officer's password.
     *
     * The account is created in the PENDING_ACTIVATION state: the stored
     * password is the hash of a random value nobody knows, so there is no
     * default, shared or temporary password to distribute. The officer
     * sets the real password through the emailed activation link.
     */
    public Security createSecurity(
            Security security,
            String username) {

        security.setPhoneNumber(PhoneNumberValidator.requireElevenDigitsWhenPresent(
                security.getPhoneNumber(), "Phone number"));

        if (security.getName() == null || security.getName().isBlank()) {
            throw new RuntimeException("Name is required");
        }

        Estate estate = currentUserService.getRequiredEstate();

        /*
         * The number is a login identifier, so it cannot already belong to
         * a resident or another officer in this estate.
         */
        phoneDirectoryGuard.assertAvailable(
                estate.getId(),
                security.getPhoneNumber(),
                null,
                null
        );

        /*
         * Username is optional: when the spreadsheet has no username
         * column one is derived from the officer's name.
         */
        String cleanUsername = username == null
                ? ""
                : username.trim();

        if (cleanUsername.isEmpty()) {

            cleanUsername = credentialService.generateUsername(
                    security.getName(),
                    null
            );
        }

        if (userRepository
                .findByUsername(cleanUsername)
                .isPresent()) {

            throw new RuntimeException(
                    "Username already exists"
            );
        }

        /*
         * Email is needed to deliver the activation link. When the sheet
         * has none, an internal placeholder keeps the column populated;
         * the activation endpoint then reports that no deliverable
         * address is on file.
         */
        String cleanEmail = security.getEmail() == null
                ? ""
                : security.getEmail().trim();

        if (cleanEmail.isEmpty()) {
            cleanEmail = cleanUsername + "@estateflow.local";
        }

        User user = new User();

        user.setUsername(cleanUsername);

        /*
         * Unguessable, unknown to everybody, never returned or logged.
         * A single UUID stays inside BCrypt's 72-byte input limit.
         */
        user.setPassword(
                passwordEncoder.encode(java.util.UUID.randomUUID().toString())
        );

        user.setRole(
                Role.ROLE_SECURITY
        );

        /*
         * A security person created by an admin works
         * in the admin's estate.
         */
        user.setEstate(
                estate
        );

        user.setActive(true);
        user.setMustChangePassword(false);
        user.setPendingActivation(true);

        User savedUser = userRepository.save(user);

        /*
         * We deliberately do NOT use
         * security.password.
         *
         * Authentication belongs to User.
         */
        security.setPassword(null);

        security.setEmail(cleanEmail);

        security.setUser(savedUser);

        return securityRepository.save(security);
    }

    // BULK CREATE SECURITY PERSONNEL (CSV / EXCEL IMPORT)
    /*
     * The sheet only needs Name, Phone, Email and Gate/Shift.
     *
     * A password column — if the file happens to have one — is ignored
     * outright: no password from the file is ever stored, and no
     * generated password is returned to the administrator. Every row
     * lands in PENDING_ACTIVATION and the officer activates themself.
     */
    public BulkImportResult createSecurities(
            List<SecurityRequest> requests) {

        BulkImportResult result = new BulkImportResult();

        for (int index = 0; index < requests.size(); index++) {

            SecurityRequest request = requests.get(index);

            BulkImportResult.RowResult row =
                    new BulkImportResult.RowResult();

            row.setRow(index + 1);
            row.setFullName(request.getName());
            row.setShift(request.getShift());

            String username = request.getUsername();

            /* Any password supplied by the spreadsheet is discarded. */
            request.setPassword(null);

            try {

                if (request.getName() == null ||
                        request.getName().isBlank()) {

                    throw new RuntimeException(
                            "Name is required"
                    );
                }

                /*
                 * The single-create controller builds this entity
                 * before calling the service, so the bulk path has
                 * to do the same.
                 */
                Security securityPerson = new Security();

                securityPerson.setName(
                        request.getName().trim()
                );

                securityPerson.setPhoneNumber(
                        request.getPhoneNumber()
                );

                securityPerson.setEmail(
                        request.getEmail()
                );

                securityPerson.setShift(
                        request.getShift() == null
                                ? null
                                : request.getShift().trim()
                );

                Security created = transactionTemplate.execute(status ->
                        createSecurity(
                                securityPerson,
                                request.getUsername()
                        ));

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
     * Admin "resend" action in the security list. Sends the secure
     * activation link to the address on the record; the admin never sees
     * or handles a password.
     */
    public Map<String, Object> sendActivationLink(Long id) {

        Security securityPerson = securityRepository.findById(id)
                .orElseThrow(() ->
                        new RuntimeException("security not found")
                );

        if (securityPerson.getUser() == null) {
            throw new RuntimeException(
                    "This security officer has no login account"
            );
        }

        currentUserService.verifySameEstate(
                currentUserService.getRequiredEstate(),
                securityPerson.getUser().getEstate()
        );

        Map<String, Object> result =
                passwordResetService.sendActivationLink(securityPerson);

        activityLogService.log(
                "ADMIN",
                "ACTIVATION_LINK_REQUESTED",
                "Activation link requested for security officer "
                        + securityPerson.getName()
        );

        return result;
    }

    // GET ALL SECURITY
    public List<Security> getAllSecurity() {

        return securityRepository.findByUserEstate(
                currentUserService.getRequiredEstate()
        );
    }

    // GET SECURITY BY ID
    public Security getSecurityById(Long id) {

        Security securityPerson =
                securityRepository.findById(id)
                        .orElseThrow(
                                () -> new RuntimeException(
                                        "security not found"
                                )
                        );

        currentUserService.verifySameEstate(
                currentUserService.getRequiredEstate(),
                securityPerson.getUser() == null
                        ? null
                        : securityPerson.getUser().getEstate()
        );

        return securityPerson;
    }

    // UPDATE SECURITY
    public Security updateSecurity(
            Long id,
            Security updatedSecurity) {

        updatedSecurity.setPhoneNumber(PhoneNumberValidator.requireElevenDigitsWhenPresent(
                updatedSecurity.getPhoneNumber(), "Phone number"));

        Security existingSecurity =
                securityRepository.findById(id)
                        .orElseThrow(
                                () -> new RuntimeException(
                                        "security not found"
                                )
                        );

        currentUserService.verifySameEstate(
                currentUserService.getRequiredEstate(),
                existingSecurity.getUser() == null
                        ? null
                        : existingSecurity.getUser().getEstate()
        );

        /*
         * Excludes the officer being edited so an unchanged save still
         * works, while another account's number is rejected.
         */
        phoneDirectoryGuard.assertAvailable(
                existingSecurity.getUser() == null
                        ? null
                        : existingSecurity.getUser().getEstate().getId(),
                updatedSecurity.getPhoneNumber(),
                null,
                existingSecurity.getId()
        );

        existingSecurity.setName(
                updatedSecurity.getName()
        );

        existingSecurity.setPhoneNumber(
                updatedSecurity.getPhoneNumber()
        );

        existingSecurity.setEmail(
                updatedSecurity.getEmail()
        );

        existingSecurity.setShift(
                updatedSecurity.getShift()
        );

        /*
         * Security.password is no longer
         * used for authentication.
         *
         * Do NOT copy updatedSecurity.password.
         */

        return securityRepository.save(
                existingSecurity
        );
    }

    // DELETE SECURITY
    public void deleteSecurity(Long id) {

        Security securityPerson =
                securityRepository.findById(id)
                        .orElseThrow(
                                () -> new RuntimeException(
                                        "security not found"
                                )
                        );

        currentUserService.verifySameEstate(
                currentUserService.getRequiredEstate(),
                securityPerson.getUser() == null
                        ? null
                        : securityPerson.getUser().getEstate()
        );

        User user = securityPerson.getUser();

        securityRepository.delete(securityPerson);

        /*
         * Remove the login account as well so a
         * deleted security person can no longer
         * authenticate.
         */
        if (user != null) {
            userRepository.delete(user);
        }
    }

    // CHECK IN VISITOR
    public Visit checkInVisitor(
            String accessCode) {

        return visitService.checkInVisitor(
                accessCode
        );
    }

    // CHECK OUT VISITOR
    public Visit checkOutVisitor(
            String accessCode) {

        return visitService.checkOutVisitor(
                accessCode
        );
    }

}
