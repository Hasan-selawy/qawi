package com.qawi.repository;

import com.qawi.entity.Role;
import com.qawi.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);
    long countByRole(Role role);
    long countByGymIdAndRole(UUID gymId, Role role);
    List<User> findByGymId(UUID gymId);
    Optional<User> findFirstByGymIdAndRole(UUID gymId, Role role);
}
