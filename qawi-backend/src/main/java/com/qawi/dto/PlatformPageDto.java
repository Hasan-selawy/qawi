package com.qawi.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PlatformPageDto {
    private String title;
    private String titleAr;
    private String subtitle;
    private String subtitleAr;
    private String footerText;
    private String footerTextAr;
}
