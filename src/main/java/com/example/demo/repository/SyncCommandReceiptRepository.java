package com.example.demo.repository;

import com.example.demo.entity.SyncCommandReceipt;
import com.example.demo.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SyncCommandReceiptRepository extends JpaRepository<SyncCommandReceipt, Long> {

    Optional<SyncCommandReceipt> findByActorUserAndMutationPublicId(User actorUser, UUID mutationPublicId);

    @Query("select r from SyncCommandReceipt r "
            + "where r.resultPublicId = :resultPublicId "
            + "and r.actorUser.id = :actorUserId")
    List<SyncCommandReceipt> findByResultPublicIdAndActorUser(
            @Param("resultPublicId") UUID resultPublicId,
            @Param("actorUserId") Long actorUserId);
}
