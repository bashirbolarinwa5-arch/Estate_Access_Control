package com.example.demo.service;

import com.example.demo.entity.Estate;
import com.example.demo.entity.Role;
import com.example.demo.entity.User;
import com.example.demo.entity.Visit;
import com.example.demo.repository.EstateRepository;
import com.example.demo.repository.UserRepository;
import com.example.demo.repository.VisitRepository;
import com.example.demo.repository.VisitorRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class SuperAdminService {

    private final UserRepository userRepository;
    private final VisitRepository visitRepository;
    private final VisitorRepository visitorRepository;
    private final EstateRepository estateRepository;
    private final ActivityLogService activityLogService;
    private final PasswordEncoder passwordEncoder;

    public SuperAdminService(UserRepository userRepository,
                             VisitRepository visitRepository,
                             VisitorRepository visitorRepository,
                             EstateRepository estateRepository,
                             ActivityLogService activityLogService,
                             PasswordEncoder passwordEncoder) {

        this.userRepository = userRepository;
        this.visitRepository = visitRepository;
        this.visitorRepository = visitorRepository;
        this.estateRepository = estateRepository;
        this.activityLogService = activityLogService;
        this.passwordEncoder = passwordEncoder;
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


    public User createAdmin(String username, String password, Long estateId) {

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

        /*
         * An estate admin must belong to an estate from
         * day one — that estate is the boundary of every
         * record they will ever create.
         */
        Estate estate = estateId == null
                ? null
                : estateRepository.findById(estateId)
                        .orElse(null);

        if (estate == null) {
            throw new RuntimeException(
                    "A valid estate is required for an estate admin");
        }

        User admin = new User(
                username.trim(),
                passwordEncoder.encode(password),
                Role.ROLE_ADMIN
        );

        admin.setEstate(estate);

        User saved = userRepository.save(admin);

        activityLogService.log(
                saved.getUsername(),
                "ADMIN_ACCOUNT_CREATED",
                "Platform administrator created estate admin account '"
                        + saved.getUsername()
                        + "' for estate " + estate.getEstateName()
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

        admin.setPassword(passwordEncoder.encode(newPassword));

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

        stats.put("estates",
                estateRepository.count());

        long activeEstateCount = estateRepository
                .findAll()
                .stream()
                .filter(estate ->
                        Boolean.TRUE.equals(estate.getActive()))
                .count();

        stats.put("activeEstates", activeEstateCount);

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


    /* =====================================================
       ESTATE MANAGEMENT
       ===================================================== */

    /*
     * All estates with a per-estate headcount snapshot,
     * so the platform owner can see the shape of every
     * estate at a glance.
     */
    public List<Map<String, Object>> listEstates() {

        return estateRepository
                .findAll()
                .stream()
                .map(estate -> {
                    Map<String, Object> view = new LinkedHashMap<>();

                    view.put("id", estate.getId());
                    view.put("estateName", estate.getEstateName());
                    view.put("estateCode", estate.getEstateCode());
                    view.put("active", estate.getActive());
                    view.put("createdAt", estate.getCreatedAt());
                    view.put("admins", userRepository
                            .countByRoleAndEstate(Role.ROLE_ADMIN, estate));
                    view.put("residents", userRepository
                            .countByRoleAndEstate(Role.ROLE_RESIDENT, estate));
                    view.put("securityPersonnel", userRepository
                            .countByRoleAndEstate(Role.ROLE_SECURITY, estate));

                    return view;
                })
                .toList();
    }


    public Estate createEstate(String estateName, String estateCode) {

        if (estateName == null || estateName.isBlank()) {
            throw new RuntimeException("Estate name is required");
        }

        if (estateCode == null || estateCode.isBlank()) {
            throw new RuntimeException("Estate code is required");
        }

        String cleanCode = estateCode.trim().toUpperCase();

        if (!cleanCode.matches("[A-Z0-9_-]{3,20}")) {
            throw new RuntimeException(
                    "Estate code must be 3–20 characters, letters/numbers only");
        }

        if (estateRepository.existsByEstateCode(cleanCode)) {
            throw new RuntimeException(
                    "Estate code already exists");
        }

        Estate estate = new Estate(
                estateName.trim(),
                cleanCode
        );

        Estate saved = estateRepository.save(estate);

        activityLogService.log(
                "PLATFORM",
                "ESTATE_CREATED",
                "Platform administrator created estate '"
                        + saved.getEstateName()
                        + "' (" + saved.getEstateCode() + ")"
        );

        return saved;
    }


    public Estate setEstateActive(Long id, boolean active) {

        Estate estate = estateRepository.findById(id)
                .orElseThrow(() ->
                        new RuntimeException("Estate not found"));

        // Already in the requested state — nothing to do.
        if (Boolean.TRUE.equals(estate.getActive()) == active) {
            return estate;
        }

        estate.setActive(active);

        Estate saved = estateRepository.save(estate);

        activityLogService.log(
                "PLATFORM",
                active ? "ESTATE_ACTIVATED" : "ESTATE_DEACTIVATED",
                "Estate '" + saved.getEstateName()
                        + (active ? "' activated" : "' deactivated")
        );

        return saved;
    }

}
