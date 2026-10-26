package com.example.demo.repository;

import com.example.demo.entity.PushSubscription;
import com.example.demo.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PushSubscriptionRepository extends JpaRepository<PushSubscription, Long> {
    List<PushSubscription> findByUser(User user);
    Optional<PushSubscription> findByEndpoint(String endpoint);
    void deleteByUserAndEndpoint(User user, String endpoint);
}
