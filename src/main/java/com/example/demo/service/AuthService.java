package com.example.demo.service;

import com.example.demo.entity.Role;
import com.example.demo.entity.User;
import com.example.demo.repository.UserRepository;
import com.example.demo.security.JwtService;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import com.example.demo.response.LoginResponse;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final ActivityLogService activityLogService;
    private final com.example.demo.repository.EstateRepository estateRepository;

    public AuthService(UserRepository userRepository,
                       PasswordEncoder passwordEncoder,
                       JwtService jwtService,
                       ActivityLogService activityLogService,
                       com.example.demo.repository.EstateRepository estateRepository) {

        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.activityLogService = activityLogService;
        this.estateRepository = estateRepository;
    }
    /*
     * Public signup may only ever create a RESIDENT.
     *
     * ADMIN and SECURITY accounts must be created by a
     * caller who is already an authenticated ADMIN.
     */
    public User register(
            String username,
            String password,
            Role requestedRole,
            String estateCode,
            Authentication authentication) {

        Role role =
                requestedRole == null
                        ? Role.ROLE_RESIDENT
                        : requestedRole;

        /*
         * Multi-estate: every estate account must belong to
         * exactly one estate.
         *
         *  - Public RESIDENT sign-up: resolved from the
         *    provided estate code.
         *  - ADMIN/SECURITY accounts (created by an
         *    authenticated ADMIN): inherit the admin's estate.
         */
        com.example.demo.entity.Estate estate = null;

        if (role == Role.ROLE_RESIDENT) {

            if (estateCode == null || estateCode.isBlank()) {
                throw new RuntimeException(
                        "An estate code is required to register");
            }

            estate = estateRepository
                    .findByEstateCode(estateCode.trim().toUpperCase());

            if (estate == null) {
                throw new RuntimeException("Estate not found");
            }

            if (!Boolean.TRUE.equals(estate.getActive())) {
                throw new RuntimeException(
                        "This estate is currently not accepting registrations");
            }

        } else if (authentication != null) {

            String callerUsername = authentication.getName();

            com.example.demo.entity.User caller =
                    userRepository.findByUsername(callerUsername)
                            .orElse(null);

            if (caller != null) {
                estate = caller.getEstate();
            }
        }

        if (role != Role.ROLE_RESIDENT) {
            boolean callerIsAdmin = authentication != null
                    && authentication.isAuthenticated()
                    && authentication.getAuthorities()
                            .stream()
                            .anyMatch(authority ->
                                    "ROLE_ADMIN".equals(
                                            authority.getAuthority()));

            if (!callerIsAdmin) {
                throw new RuntimeException(
                        "Only an administrator can create admin or security accounts"
                );
            }

            if (estate == null) {
                throw new RuntimeException(
                        "An administrator account must be linked to an estate");
            }
        }

        if (userRepository.existsByUsername(username)) {
            throw new RuntimeException("Username already exists");
        }

        String hashedPassword = passwordEncoder.encode(password);

        User user = new User(
                username,
                hashedPassword,
                role
        );

        if (role != Role.ROLE_SUPER_ADMIN) {
            user.setEstate(estate);
        }

        return userRepository.save(user);
    }
    public LoginResponse login(String username, String password) {

        User user = userRepository.findByUsername(username)
                .orElseThrow(() ->
                        new RuntimeException("Invalid username or password"));

        if (!passwordEncoder.matches(password, user.getPassword())) {
            throw new RuntimeException("Invalid username or password");
        }

        if (!Boolean.TRUE.equals(user.getActive())) {
            throw new RuntimeException(
                    "This account has been disabled. Contact the platform administrator.");
        }

        /*
         * A deactivated estate blocks its users completely:
         * authentication fails, no JWT is issued, nothing to
         * bypass with. SUPER_ADMIN is platform-level (no
         * estate) and can always log in.
         */
        if (user.getEstate() != null
                && !Boolean.TRUE.equals(user.getEstate().getActive())) {

            throw new RuntimeException(
                    "This estate has been deactivated. "
                            + "Please contact the platform administrator.");
        }

        String token = jwtService.generateToken(user);

        /*
         * The login event is attached to the user's estate
         * (the security context is still anonymous here).
         */
        activityLogService.logForUser(
                user,
                user.getUsername(),
                "USER_LOGIN",
                user.getUsername()
                        + " logged in as "
                        + user.getRole().name().replace("ROLE_", "")
        );

        return new LoginResponse(
                token,
                user.getUsername(),
                user.getRole()
        );

    }

}