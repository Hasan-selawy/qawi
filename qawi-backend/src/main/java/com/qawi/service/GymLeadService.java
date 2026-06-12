package com.qawi.service;

import com.qawi.dto.*;
import com.qawi.entity.*;
import com.qawi.exception.AppException;
import com.qawi.repository.GymLeadRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class GymLeadService {

    private final GymLeadRepository gymLeadRepository;

    public List<GymLeadResponse> getAllLeads(String status, String city) {
        List<GymLead> leads;
        if (status != null && city != null) {
            leads = gymLeadRepository.findByStatusAndCityIgnoreCaseOrderByCreatedAtDesc(
                    GymLeadStatus.valueOf(status.toUpperCase()), city);
        } else if (status != null) {
            leads = gymLeadRepository.findByStatusOrderByCreatedAtDesc(
                    GymLeadStatus.valueOf(status.toUpperCase()));
        } else if (city != null) {
            leads = gymLeadRepository.findByCityIgnoreCaseOrderByCreatedAtDesc(city);
        } else {
            leads = gymLeadRepository.findAllByOrderByCreatedAtDesc();
        }
        return leads.stream().map(GymLeadResponse::from).toList();
    }

    @Transactional
    public GymLeadResponse createLead(GymLeadCreateRequest req) {
        GymLead lead = GymLead.builder()
                .gymName(req.getGymName())
                .contactName(req.getContactName())
                .phoneNumber(req.getPhoneNumber())
                .city(req.getCity())
                .source(req.getSource())
                .potentialPlanId(req.getPotentialPlanId())
                .notes(req.getNotes())
                .nextFollowUpDate(req.getNextFollowUpDate())
                .assignedTo(req.getAssignedTo())
                .build();
        return GymLeadResponse.from(gymLeadRepository.save(lead));
    }

    @Transactional
    public GymLeadResponse createLeadFromContact(String gymName, String contactName, String phoneNumber, String city) {
        GymLead lead = GymLead.builder()
                .gymName(gymName)
                .contactName(contactName)
                .phoneNumber(phoneNumber)
                .city(city)
                .source(GymLeadSource.WEBSITE_FORM)
                .build();
        return GymLeadResponse.from(gymLeadRepository.save(lead));
    }

    @Transactional
    public GymLeadResponse updateStatus(UUID id, GymLeadStatusUpdateRequest req) {
        GymLead lead = findLead(id);
        lead.setStatus(req.getStatus());
        lead.setStatusChangedAt(LocalDateTime.now());
        lead.setLastContactedAt(LocalDateTime.now());
        if (req.getNextFollowUpDate() != null) {
            lead.setNextFollowUpDate(req.getNextFollowUpDate());
        }
        if (req.getAssignedTo() != null) {
            lead.setAssignedTo(req.getAssignedTo());
        }
        if (req.getNote() != null && !req.getNote().isBlank()) {
            lead.getNoteHistory().add(GymLeadNote.builder()
                    .content(req.getNote())
                    .createdAt(LocalDateTime.now())
                    .build());
        }
        return GymLeadResponse.from(gymLeadRepository.save(lead));
    }

    @Transactional
    public GymLeadResponse addNote(UUID id, GymLeadNoteRequest req) {
        GymLead lead = findLead(id);
        lead.getNoteHistory().add(GymLeadNote.builder()
                .content(req.getContent())
                .createdAt(LocalDateTime.now())
                .build());
        lead.setLastContactedAt(LocalDateTime.now());
        return GymLeadResponse.from(gymLeadRepository.save(lead));
    }

    public List<PipelineStageDto> getPipeline() {
        Map<GymLeadStatus, Long> countMap = gymLeadRepository.countByStatus().stream()
                .collect(Collectors.toMap(
                        row -> (GymLeadStatus) row[0],
                        row -> (Long) row[1]
                ));
        return Arrays.stream(GymLeadStatus.values())
                .map(s -> new PipelineStageDto(s, countMap.getOrDefault(s, 0L)))
                .toList();
    }

    public List<GymLeadResponse> getFollowups() {
        return gymLeadRepository.findFollowUpsDueByToday(LocalDate.now())
                .stream().map(GymLeadResponse::from).toList();
    }

    private GymLead findLead(UUID id) {
        return gymLeadRepository.findById(id)
                .orElseThrow(() -> new AppException("Lead not found", "العميل المحتمل غير موجود", HttpStatus.NOT_FOUND));
    }
}
