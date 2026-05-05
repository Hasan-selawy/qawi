package com.qawi.repository;

import com.qawi.entity.PlatformPricingPage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface PlatformPricingPageRepository extends JpaRepository<PlatformPricingPage, UUID> {
}
