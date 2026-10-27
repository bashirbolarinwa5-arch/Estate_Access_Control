package com.example.demo.repository;

import com.example.demo.entity.SyncCommandReceipt;
import com.example.demo.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface SyncCommandReceiptRepository extends JpaRepository<SyncCommandReceipt, Long> {

    Optional<SyncCommandReceipt> findByActorUserAndMutationPublicId(User actorUser, UUID mutationPublicId);
}
