package com.example.demo.repository;

import com.example.demo.entity.VisitApprovalLink;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface VisitApprovalLinkRepository extends JpaRepository<VisitApprovalLink, Long> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select l from VisitApprovalLink l where l.tokenHash = :tokenHash")
    Optional<VisitApprovalLink> findByTokenHashForUpdate(@Param("tokenHash") String tokenHash);
}
