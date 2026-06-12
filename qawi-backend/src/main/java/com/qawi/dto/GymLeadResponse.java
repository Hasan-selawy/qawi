package com.qawi.dto;

import com.qawi.entity.GymLead;
import com.qawi.entity.GymLeadSource;
import com.qawi.entity.GymLeadStatus;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

@Data
public class GymLeadResponse {
    private UUID id;
    private String gymName;
    private String contactName;
    private String phoneNumber;
    private String city;
    private GymLeadSource source;
    private GymLeadStatus status;
    private String potentialPlanId;
    private String notes;
    private LocalDate nextFollowUpDate;
    private LocalDateTime lastContactedAt;
    private LocalDateTime createdAt;
    private String assignedTo;
    private long daysInStage;
    private List<NoteDto> noteHistory;

    @Data
    public static class NoteDto {
        private String content;
        private LocalDateTime createdAt;
    }

    public static GymLeadResponse from(GymLead l) {
        GymLeadResponse r = new GymLeadResponse();
        r.id              = l.getId();
        r.gymName         = l.getGymName();
        r.contactName     = l.getContactName();
        r.phoneNumber     = l.getPhoneNumber();
        r.city            = l.getCity();
        r.source          = l.getSource();
        r.status          = l.getStatus();
        r.potentialPlanId = l.getPotentialPlanId();
        r.notes           = l.getNotes();
        r.nextFollowUpDate = l.getNextFollowUpDate();
        r.lastContactedAt = l.getLastContactedAt();
        r.createdAt       = l.getCreatedAt();
        r.assignedTo      = l.getAssignedTo();
        r.daysInStage     = l.getStatusChangedAt() != null
                ? ChronoUnit.DAYS.between(l.getStatusChangedAt(), LocalDateTime.now())
                : 0;
        r.noteHistory     = l.getNoteHistory().stream().map(n -> {
            NoteDto nd = new NoteDto();
            nd.content   = n.getContent();
            nd.createdAt = n.getCreatedAt();
            return nd;
        }).toList();
        return r;
    }
}
