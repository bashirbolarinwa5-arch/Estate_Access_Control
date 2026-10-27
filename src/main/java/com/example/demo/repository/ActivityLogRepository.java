
package com.example.demo.repository;

import com.example.demo.entity.ActivityLog;
import com.example.demo.entity.Estate;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ActivityLogRepository
        extends JpaRepository<ActivityLog, Long> {

    Optional<ActivityLog> findByPublicId(UUID publicId);

    List<ActivityLog> findAllByOrderByTimestampDesc();

    List<ActivityLog> findByEstateOrderByTimestampDesc(Estate estate);
}
