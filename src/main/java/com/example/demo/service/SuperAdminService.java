package com.example.demo.service;

import com.example.demo.entity.Role;
import com.example.demo.entity.User;
import com.example.demo.entity.Visit;
import com.example.demo.repository.UserRepository;
import com.example.demo.repository.VisitRepository;
import com.example.demo.repository.VisitorRepository;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class SuperAdminService {

    private final UserRepository userRepository;
    private final VisitRepository visitRepository;
    private final VisitorRepository visitorRepository;
    private final ActivityLogService activityLogService;

    public SuperAdminService(UserRepository userRepository,
                             VisitRepository visitRepository,
                             VisitorRepository visitorRepository,
                             ActivityLogService activityLogService) {

        this.userRepository = userRepository;
        this.visitRepository = visitRepository;
        this.visitorRepository = visitorRepository;
        this.activityLogService = activityLogService;
    }


    /*
     * Every method below first verifies the target account is
     * actually an estate administrator. The SUPER_ADMIN manages
     * estate administrators only — never residents, security
     * personnel, or other super admins.
     */
    private User findAdminById(Long id) {

        User user = userRepository.findById(id)
                .orElseThrow(() ->
                        new RuntimeException("Administrator not found"));

        if (user.getRole() != Role.ROLE_ADMIN) {
            throw new RuntimeException(
                    "This account is not an estate administrator");
        }

        return user;
    }


    public List<User> listAdmins() {

        return userRepository.findByRoleOrderByIdAsc(Role.ROLE_ADMIN);
    }


    public User createAdmin(String username, String password) {

        if (username == null || username.isBlank()) {
            throw new RuntimeException("Username is required");
        }

        if (password == null || password.length() < 6) {
            throw new RuntimeException(
                    "Password must be at least 6 characters");
        }

        if (userRepository.existsByUsername(username)) {
            throw new RuntimeException("Username already exists");
        }

        User admin = new User(
                username.trim(),
                password,
                Role.ROLE_ADMIN
        );

        User saved = userRepository.save(admin);

        activityLogService.log(
                saved.getUsername(),
                "ADMIN_ACCOUNT_CREATED",
                "Platform administrator created estate admin account '"
                        + saved.getUsername() + "'"
        );

        return saved;
    }


    public User updateUsername(Long id, String newUsername) {

        User admin = findAdminById(id);

        if (newUsername == null || newUsername.isBlank()) {
            throw new RuntimeException("Username is required");
        }

        String trimmed = newUsername.trim();

        if (trimmed.equals(admin.getUsername())) {
            return admin;
        }

        if (userRepository.existsByUsername(trimmed)) {
            throw new RuntimeException("Username already exists");
        }

        String oldUsername = admin.getUsername();

        admin.setUsername(trimmed);

        User saved = userRepository.save(admin);

        activityLogService.log(
                saved.getUsername(),
                "ADMIN_ACCOUNT_UPDATED",
                "Estate admin account '" + oldUsername
                        + "' renamed to '" + saved.getUsername() + "'"
        );

        return saved;
    }


    public User setAdminEnabled(Long id, boolean enabled) {

        User admin = findAdminById(id);

        // Already in the requested state — nothing to do.
        if (Boolean.TRUE.equals(admin.getActive()) == enabled) {
            return admin;
        }

        admin.setActive(enabled);

        User saved = userRepository.save(admin);

        activityLogService.log(
                saved.getUsername(),
                enabled ? "ADMIN_ACCOUNT_ENABLED" : "ADMIN_ACCOUNT_DISABLED",
                "Estate admin account '" + saved.getUsername()
                        + (enabled ? "' re-enabled" : "' disabled")
        );

        return saved;
    }


    public User resetAdminPassword(Long id, String newPassword) {

        User admin = findAdminById(id);

        if (newPassword == null || newPassword.length() < 6) {
            throw new RuntimeException(
                    "Password must be at least 6 characters");
        }

        admin.setPassword(newPassword);

        User saved = userRepository.save(admin);

        activityLogService.log(
                saved.getUsername(),
                "ADMIN_PASSWORD_RESET",
                "Password reset for estate admin account '"
                        + saved.getUsername() + "'"
        );

        return saved;
    }


    public Map<String, Object> getGlobalStats() {

        Map<String, Object> stats = new LinkedHashMap<>();

        stats.put("admins",
                userRepository.countByRole(Role.ROLE_ADMIN));

        stats.put("residents",
                userRepository.countByRole(Role.ROLE_RESIDENT));

        stats.put("securityPersonnel",
                userRepository.countByRole(Role.ROLE_SECURITY));

        stats.put("visitors",
                visitorRepository.count());

        stats.put("visits",
                visitRepository.count());

        return stats;
    }


    public List<Visit> recentVisits() {

        return visitRepository.findTop10ByOrderByIdDesc();
    }

}
