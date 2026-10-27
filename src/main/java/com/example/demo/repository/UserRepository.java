
package com.example.demo.repository;

import com.example.demo.entity.Estate;
import com.example.demo.entity.Role;
import com.example.demo.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByUsername(String username);

    Optional<User> findByPublicId(UUID publicId);

    boolean existsByUsername(String username);

    List<User> findByRoleOrderByIdAsc(Role role);

    long countByRole(Role role);

    long countByRoleAndEstate(Role role, Estate estate);

}
