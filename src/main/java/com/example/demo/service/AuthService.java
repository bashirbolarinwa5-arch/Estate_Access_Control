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

    public AuthService(UserRepository userRepository,
                       PasswordEncoder passwordEncoder,
                       JwtService jwtService) {

        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
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
            Authentication authentication) {

        Role role =
                requestedRole == null
                        ? Role.ROLE_RESIDENT
                        : requestedRole;

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

        return userRepository.save(user);
    }
    public LoginResponse login(String username, String password) {

        User user = userRepository.findByUsername(username)
                .orElseThrow(() ->
                        new RuntimeException("Invalid username or password"));

        if (!passwordEncoder.matches(password, user.getPassword())) {
            throw new RuntimeException("Invalid username or password");
        }

        String token = jwtService.generateToken(user);

        return new LoginResponse(
                token,
                user.getUsername(),
                user.getRole()
        );

    }

}