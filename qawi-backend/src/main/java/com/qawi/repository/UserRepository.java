package com.qawi.repository;

import com.qawi.entity.Role;
import com.qawi.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
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
    List<User> findByGymIdAndRole(UUID gymId, Role role);
    Optional<User> findFirstByGymIdAndRole(UUID gymId, Role role);

    long countByGymIdAndRoleAndIsActive(UUID gymId, Role role, boolean isActive);

    @Query("SELECT u FROM User u WHERE u.gymId = :gymId AND u.role = 'MEMBER' AND u.subscriptionEndDate BETWEEN :start AND :end")
    List<User> findMembersWithExpiringSubscription(UUID gymId, LocalDate start, LocalDate end);

    @Query("SELECT u FROM User u WHERE u.gymId = :gymId AND u.role = 'MEMBER' AND u.subscriptionEndDate < :today")
    List<User> findExpiredMembers(UUID gymId, LocalDate today);

    @Query("SELECT YEAR(u.createdAt) as yr, MONTH(u.createdAt) as mo, COUNT(u) FROM User u WHERE u.role = 'MEMBER' AND u.gymId = :gymId AND u.createdAt >= :since GROUP BY YEAR(u.createdAt), MONTH(u.createdAt) ORDER BY yr ASC, mo ASC")
    List<Object[]> findMemberGrowthByGym(UUID gymId, java.time.LocalDateTime since);
}
