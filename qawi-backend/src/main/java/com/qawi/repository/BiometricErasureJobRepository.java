package com.qawi.repository;
import com.qawi.entity.BiometricErasureJob;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;

public interface BiometricErasureJobRepository extends JpaRepository<BiometricErasureJob, UUID> {
    List<BiometricErasureJob> findByGymIdAndConfirmedAtIsNullOrderByRequestedAtAsc(UUID gymId);
    List<BiometricErasureJob> findByMemberIdAndConfirmedAtIsNull(UUID memberId);
    Optional<BiometricErasureJob> findByIdAndGymId(UUID id, UUID gymId);
}
