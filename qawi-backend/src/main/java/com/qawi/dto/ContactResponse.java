package com.qawi.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ContactResponse {
    private String message;
    private String messageAr;
}
