package com.qawi.dto;

import com.qawi.entity.MemberLead;
import com.qawi.entity.MemberLeadStatus;
import com.qawi.entity.MemberLeadType;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

@Data
public class MemberLeadResponse {
    private UUID id;
    private UUID gymId;
    private MemberLeadType type;
    private UUID memberId;
    private String name;
    private String phoneNumber;
    private String email;
    private MemberLeadStatus status;
    private String notes;
    private UUID coachId;
    private String coachName;
    private LocalDate subscriptionStartDate;
    private LocalDate subscriptionEndDate;
    private Integer daysRemaining;
    private LocalDateTime lastVisitAt;
    private LocalDateTime lastContactedAt;
    private LocalDate nextFollowUpAt;
    private UUID createdBy;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private boolean canConvert;
    private boolean canRenew;
    private boolean canDelete;

    public static MemberLeadResponse from(MemberLead l, String coachName) {
        MemberLeadResponse r = new MemberLeadResponse();
        r.id                  = l.getId();
        r.gymId               = l.getGymId();
        r.type                = l.getType();
        r.memberId            = l.getMemberId();
        r.name                = l.getName();
        r.phoneNumber         = l.getPhoneNumber();
        r.email               = l.getEmail();
        r.status              = l.getStatus();
        r.notes               = l.getNotes();
        r.coachId             = l.getCoachId();
        r.coachName           = coachName;
        r.subscriptionStartDate = l.getSubscriptionStartDate();
        r.subscriptionEndDate   = l.getSubscriptionEndDate();
        if (l.getSubscriptionEndDate() != null) {
            r.daysRemaining = (int) ChronoUnit.DAYS.between(LocalDate.now(), l.getSubscriptionEndDate());
        }
        r.lastVisitAt         = l.getLastVisitAt();
        r.lastContactedAt     = l.getLastContactedAt();
        r.nextFollowUpAt      = l.getNextFollowUpAt();
        r.createdBy           = l.getCreatedBy();
        r.createdAt           = l.getCreatedAt();
        r.updatedAt           = l.getLastUpdatedAt();
        r.canConvert          = l.getType() == MemberLeadType.PROSPECT;
        r.canRenew            = l.getType() == MemberLeadType.MEMBER
                && (l.getStatus() == MemberLeadStatus.EXPIRED
                    || l.getStatus() == MemberLeadStatus.EXPIRING_SOON
                    || l.getStatus() == MemberLeadStatus.LOST);
        r.canDelete           = l.getType() == MemberLeadType.PROSPECT;
        return r;
    }

    public static MemberLeadResponse from(MemberLead l) {
        return from(l, null);
    }
}
