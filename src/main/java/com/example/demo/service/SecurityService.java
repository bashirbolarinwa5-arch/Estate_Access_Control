package com.example.demo.service;

import com.example.demo.response.BulkImportResult;
import com.example.demo.entity.Estate;
import com.example.demo.entity.Role;
import com.example.demo.entity.Security;
import com.example.demo.entity.User;
import com.example.demo.entity.Visit;
import com.example.demo.repository.SecurityRepository;
import com.example.demo.repository.UserRepository;
import com.example.demo.response.PasswordResetResult;
import com.example.demo.response.SecurityRequest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class SecurityService {

    private final SecurityRepository securityRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final VisitService visitService;
    private final CurrentUserService currentUserService;
    private final CredentialService credentialService;

    public SecurityService(
            SecurityRepository securityRepository,
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            VisitService visitService,
            CurrentUserService currentUserService,
            CredentialService credentialService) {

        this.securityRepository = securityRepository;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.visitService = visitService;
        this.currentUserService = currentUserService;
        this.credentialService = credentialService;
    }

    // CREATE SECURITY
    public Security createSecurity(
            Security security,
            String username,
            String password) {

        if (username == null || username.trim().isEmpty()) {
            throw new RuntimeException(
                    "Username is required"
            );
        }

        if (password == null || password.trim().isEmpty()) {
            throw new RuntimeException(
                    "Password is required"
            );
        }

        String cleanUsername =
                username.trim();

        if (userRepository
                .findByUsername(cleanUsername)
                .isPresent()) {

            throw new RuntimeException(
                    "Username already exists"
            );
        }

        User user = new User();

        user.setUsername(cleanUsername);

        user.setPassword(
                passwordEncoder.encode(password)
        );

        user.setRole(
                Role.ROLE_SECURITY
        );

        /*
         * A security person created by an admin works
         * in the admin's estate.
         */
        user.setEstate(
                currentUserService.getRequiredEstate()
        );

        User savedUser = userRepository.save(user);

        /*
         * We deliberately do NOT use
         * security.password.
         *
         * Authentication belongs to User.
         */
        security.setPassword(null);

        security.setUser(savedUser);

        return securityRepository.save(security);
    }

    // BULK CREATE SECURITY PERSONNEL (CSV / EXCEL IMPORT)
    public BulkImportResult createSecurities(
            List<SecurityRequest> requests) {

        BulkImportResult result = new BulkImportResult();

        for (int index = 0; index < requests.size(); index++) {

            SecurityRequest request = requests.get(index);

            BulkImportResult.RowResult row =
                    new BulkImportResult.RowResult();

            row.setRow(index + 1);
            row.setFullName(request.getName());

            String username = request.getUsername();
            String generatedPassword = null;

            try {

                if (request.getName() == null ||
                        request.getName().isBlank()) {

                    throw new RuntimeException(
                            "Name is required"
                    );
                }

                if (username == null || username.isBlank()) {

                    username = credentialService.generateUsername(
                            request.getName(),
                            null
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

                /*
                 * The single-create controller builds this entity
                 * before calling the service, so the bulk path has
                 * to do the same. Otherwise the account is created
                 * with no name, phone number or email.
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

                Security created = createSecurity(
                        securityPerson,
                        username,
                        request.getPassword()
                );

                if (generatedPassword != null) {

                    User user = created.getUser();

                    user.setMustChangePassword(true);

                    userRepository.save(user);
                }

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
     * Admin-triggered password reset for a security officer.
     */
    public PasswordResetResult resetPassword(Long id) {

        Security securityPerson = securityRepository.findById(id)
                .orElseThrow(() ->
                        new RuntimeException("security not found")
                );

        currentUserService.verifySameEstate(
                currentUserService.getRequiredEstate(),
                securityPerson.getUser() == null
                        ? null
                        : securityPerson.getUser().getEstate()
        );

        User user = securityPerson.getUser();

        if (user == null) {
            throw new RuntimeException(
                    "This security officer has no login account"
            );
        }

        String temporaryPassword =
                credentialService.generateTemporaryPassword();

        user.setPassword(
                passwordEncoder.encode(temporaryPassword)
        );

        user.setMustChangePassword(true);

        userRepository.save(user);

        return new PasswordResetResult(
                user.getUsername(),
                temporaryPassword
        );
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

        existingSecurity.setName(
                updatedSecurity.getName()
        );

        existingSecurity.setPhoneNumber(
                updatedSecurity.getPhoneNumber()
        );

        existingSecurity.setEmail(
                updatedSecurity.getEmail()
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