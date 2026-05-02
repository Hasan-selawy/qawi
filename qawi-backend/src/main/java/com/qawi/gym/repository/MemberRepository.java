package com.qawi.gym.repository;

import com.qawi.gym.entity.Member;
import com.qawi.gym.entity.enums.MemberStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface MemberRepository extends JpaRepository<Member, Long> {
    Page<Member> findByGymId(Long gymId, Pageable pageable);
    Page<Member> findByGymIdAndStatus(Long gymId, MemberStatus status, Pageable pageable);
    Optional<Member> findByMemberCode(String memberCode);
    Optional<Member> findByUserId(Long userId);

    @Query("SELECT m FROM Member m WHERE m.gym.id = :gymId AND " +
           "(LOWER(m.user.firstName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(m.user.lastName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(m.user.email) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "m.memberCode LIKE CONCAT('%', :search, '%'))")
    Page<Member> searchMembers(@Param("gymId") Long gymId,
                               @Param("search") String search,
                               Pageable pageable);

    long countByGymIdAndStatus(Long gymId, MemberStatus status);
}
