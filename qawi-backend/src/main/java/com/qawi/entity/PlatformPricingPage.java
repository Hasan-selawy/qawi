package com.qawi.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(name = "platform_pricing_page")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PlatformPricingPage {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    @Builder.Default
    private String title = "Simple, Transparent Pricing";

    @Column(name = "title_ar", nullable = false)
    @Builder.Default
    private String titleAr = "أسعار بسيطة وشفافة";

    @Column(nullable = false)
    @Builder.Default
    private String subtitle = "Choose the plan that fits your gym. Start free for 14 days.";

    @Column(name = "subtitle_ar", nullable = false)
    @Builder.Default
    private String subtitleAr = "اختر الخطة المناسبة لصالتك. ابدأ مجاناً لمدة 14 يوماً.";

    @Column(name = "footer_text")
    @Builder.Default
    private String footerText = "All plans include a 14-day free trial. Cancel anytime.";

    @Column(name = "footer_text_ar")
    @Builder.Default
    private String footerTextAr = "جميع الخطط تشمل تجربة مجانية لمدة 14 يوماً. إلغاء في أي وقت.";
}
