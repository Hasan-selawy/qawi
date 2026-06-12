package com.qawi.dto;

import com.qawi.entity.MemberLead;
import com.qawi.entity.MemberLeadStatus;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class MemberLeadResponse {
    private UUID id;
    private UUID gymId;
    private String name;
    private String phoneNumber;
    private String notes;
    private MemberLeadStatus status;
    private UUID createdBy;
    private LocalDateTime createdAt;
    private LocalDateTime lastUpdatedAt;

    public static MemberLeadResponse from(MemberLead l) {
        MemberLeadResponse r = new MemberLeadResponse();
        r.id            = l.getId();
        r.gymId         = l.getGymId();
        r.name          = l.getName();
        r.phoneNumber   = l.getPhoneNumber();
        r.notes         = l.getNotes();
        r.status        = l.getStatus();
        r.createdBy     = l.getCreatedBy();
        r.createdAt     = l.getCreatedAt();
        r.lastUpdatedAt = l.getLastUpdatedAt();
        return r;
    }
}
