package com.qawi.repository;

import com.qawi.entity.PlatformTier;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface PlatformTierRepository extends JpaRepository<PlatformTier, UUID> {
    List<PlatformTier> findByActiveTrueOrderByDisplayOrderAsc();
    List<PlatformTier> findAllByOrderByDisplayOrderAsc();
}
