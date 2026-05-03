package com.qawi.repository;

import com.qawi.entity.ContactRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface ContactRequestRepository extends JpaRepository<ContactRequest, UUID> {
}
