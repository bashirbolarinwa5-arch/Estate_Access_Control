package com.example.demo.service;

import com.example.demo.entity.Role;
import com.example.demo.entity.Security;
import com.example.demo.entity.User;
import com.example.demo.entity.Visit;
import com.example.demo.repository.SecurityRepository;
import com.example.demo.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class SecurityService {

    private final SecurityRepository securityRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final VisitService visitService;

    public SecurityService(
            SecurityRepository securityRepository,
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            VisitService visitService) {

        this.securityRepository = securityRepository;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.visitService = visitService;
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

        userRepository.save(user);

        /*
         * We deliberately do NOT use
         * security.password.
         *
         * Authentication belongs to User.
         */
        security.setPassword(null);

        return securityRepository.save(security);
    }

    // GET ALL SECURITY
    public List<Security> getAllSecurity() {

        return securityRepository.findAll();
    }

    // GET SECURITY BY ID
    public Security getSecurityById(Long id) {

        return securityRepository.findById(id)
                .orElseThrow(
                        () -> new RuntimeException(
                                "security not found"
                        )
                );
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

        if (!securityRepository.existsById(id)) {

            throw new RuntimeException(
                    "security not found"
            );
        }

        securityRepository.deleteById(id);
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