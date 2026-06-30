package com.qawi.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class MemberLeadPageResponse {
    private List<LeadMemberResponse> content;
    private int page;
    private int size;
    private long totalElements;
    private int totalPages;
}
