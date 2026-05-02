package com.qawi.gym.repository;

import com.qawi.gym.entity.User;
import com.qawi.gym.entity.enums.Role;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);
    List<User> findByGymId(Long gymId);
    List<User> findByGymIdAndRole(Long gymId, Role role);
}
