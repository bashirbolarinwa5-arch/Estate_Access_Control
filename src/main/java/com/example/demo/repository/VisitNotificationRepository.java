package com.example.demo.repository;

import com.example.demo.entity.VisitNotification;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface VisitNotificationRepository extends JpaRepository<VisitNotification, Long> {
    List<VisitNotification> findTop100ByCompletedFalseAndPushAttemptedFalseOrderByIdAsc();
    List<VisitNotification> findTop100ByCompletedFalseAndPushAttemptedTrueAndSmsSentAtIsNullAndSmsDueAtLessThanEqualOrderByIdAsc(LocalDateTime now);
}
