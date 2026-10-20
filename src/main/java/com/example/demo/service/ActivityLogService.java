package com.example.demo.service;

import com.example.demo.entity.ActivityLog;
import com.example.demo.entity.Estate;
import com.example.demo.repository.ActivityLogRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class ActivityLogService {

    private final ActivityLogRepository repository;
    private final CurrentUserService currentUserService;

    public ActivityLogService(
            ActivityLogRepository repository,
            CurrentUserService currentUserService) {

        this.repository = repository;
        this.currentUserService = currentUserService;
    }

    /*
     * Estate-aware logging used by all estate workflows.
     *
     * The estate is resolved from the acting user inside
     * the security context, so no call site had to change
     * when estates were introduced.
     */
    public void log(
            String actor,
            String action,
            String description) {

        ActivityLog activityLog = new ActivityLog();

        activityLog.setActor(actor);
        activityLog.setAction(action);
        activityLog.setDescription(description);
        activityLog.setTimestamp(LocalDateTime.now());

        // Estate of the acting user; null for platform
        // users (SUPER_ADMIN) and anonymous callers.
        activityLog.setEstate(
                currentUserService.getCurrentEstate()
        );

        repository.save(activityLog);
    }

    /*
     * Logging for a specific user's event, used where the
     * security context does not describe the actor — the
     * clearest case being LOGIN, which happens while the
     * user is still anonymous.
     */
    public void logForUser(
            com.example.demo.entity.User user,
            String actor,
            String action,
            String description) {

        ActivityLog activityLog = new ActivityLog();

        activityLog.setActor(actor);
        activityLog.setAction(action);
        activityLog.setDescription(description);
        activityLog.setTimestamp(LocalDateTime.now());

        activityLog.setEstate(
                user == null ? null : user.getEstate()
        );

        repository.save(activityLog);
    }

    /*
     * SUPER_ADMIN sees every log on the platform.
     * Everyone else sees only their estate's logs.
     */
    public List<ActivityLog> getAllLogs() {

        com.example.demo.entity.User currentUser =
                currentUserService.getCurrentUser();

        if (currentUser != null &&
                currentUser.getRole() ==
                        com.example.demo.entity.Role.ROLE_SUPER_ADMIN) {

            return repository.findAllByOrderByTimestampDesc();
        }

        Estate estate =
                currentUser == null
                        ? null
                        : currentUser.getEstate();

        if (estate == null) {
            return List.of();
        }

        return repository.findByEstateOrderByTimestampDesc(estate);
    }

}
