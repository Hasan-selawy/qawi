package com.qawi.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.qawi.entity.*;
import com.qawi.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
@Order(10)
public class PricingDataSeeder implements ApplicationRunner {

    private final PlatformTierRepository tierRepository;
    private final PlatformPricingPageRepository pageRepository;
    private final GymMemberPlanRepository memberPlanRepository;
    private final GymRepository gymRepository;
    private final ObjectMapper objectMapper;

    @Override
    public void run(ApplicationArguments args) {
        seedPlatformTiers();
        seedPricingPage();
        seedGymMemberPlans();
    }

    private void seedPlatformTiers() {
        if (tierRepository.count() > 0) return;
        log.info("Seeding platform tiers...");

        tierRepository.save(PlatformTier.builder()
                .name("Basic").nameAr("الأساسية")
                .subscriptionPlan(SubscriptionPlan.BASIC)
                .price1m(60).price3m(162).price6m(306).price12m(576)
                .features(toJson(List.of("Up to 50 members", "Up to 3 coaches", "Workout plans & scheduling", "Attendance tracking", "Arabic & English", "Mobile app for members")))
                .featuresAr(toJson(List.of("حتى 50 عضو", "حتى 3 مدربين", "خطط التمرين والجدولة", "تتبع الحضور", "العربية والإنجليزية", "تطبيق للجوال للأعضاء")))
                .active(true).highlighted(false).displayOrder(1)
                .maxMembers(50).maxCoaches(3)
                .build());

        tierRepository.save(PlatformTier.builder()
                .name("Pro").nameAr("الاحترافية")
                .subscriptionPlan(SubscriptionPlan.PRO)
                .price1m(100).price3m(270).price6m(510).price12m(960)
                .features(toJson(List.of("Up to 200 members", "Up to 10 coaches", "Everything in Basic", "Nutrition plans", "Body measurements", "Advanced analytics", "Workout templates", "Coach notes")))
                .featuresAr(toJson(List.of("حتى 200 عضو", "حتى 10 مدربين", "كل ما في الأساسية", "خطط غذائية", "قياسات الجسم", "تحليلات متقدمة", "قوالب تمرين", "ملاحظات المدربين")))
                .active(true).highlighted(true).displayOrder(2)
                .maxMembers(200).maxCoaches(10)
                .build());

        tierRepository.save(PlatformTier.builder()
                .name("Enterprise").nameAr("المؤسسية")
                .subscriptionPlan(SubscriptionPlan.ENTERPRISE)
                .price1m(180).price3m(486).price6m(918).price12m(1728)
                .features(toJson(List.of("Unlimited members", "Unlimited coaches", "Everything in Pro", "Custom branding & logo", "Priority support", "Multiple gym locations")))
                .featuresAr(toJson(List.of("أعضاء غير محدودين", "مدربون غير محدودين", "كل ما في الاحترافية", "علامة تجارية مخصصة", "دعم ذو أولوية", "مواقع متعددة")))
                .active(true).highlighted(false).displayOrder(3)
                .maxMembers(null).maxCoaches(null)
                .build());

        log.info("Platform tiers seeded.");
    }

    private void seedPricingPage() {
        if (pageRepository.count() > 0) return;
        pageRepository.save(PlatformPricingPage.builder().build());
        log.info("Platform pricing page seeded.");
    }

    private void seedGymMemberPlans() {
        gymRepository.findAll().forEach(gym -> {
            if (memberPlanRepository.countByGymId(gym.getId()) > 0) return;
            log.info("Seeding member plans for gym: {}", gym.getName());

            memberPlanRepository.saveAll(List.of(
                    plan(gym.getId(), "Training – 1 Month", "تدريب - شهر", MemberPlanDuration.ONE_MONTH, "Basic training access for 1 month", "الوصول للتدريب لمدة شهر"),
                    plan(gym.getId(), "Training – 3 Months", "تدريب - 3 أشهر", MemberPlanDuration.THREE_MONTHS, "Basic training access for 3 months", "الوصول للتدريب لمدة 3 أشهر"),
                    plan(gym.getId(), "Training – 6 Months", "تدريب - 6 أشهر", MemberPlanDuration.SIX_MONTHS, "Basic training access for 6 months", "الوصول للتدريب لمدة 6 أشهر"),
                    plan(gym.getId(), "Training – 1 Year", "تدريب - سنة", MemberPlanDuration.TWELVE_MONTHS, "Basic training access for 1 year", "الوصول للتدريب لمدة سنة"),
                    plan(gym.getId(), "Training + Nutrition – 1 Month", "تدريب + تغذية - شهر", MemberPlanDuration.ONE_MONTH, "Training + nutrition coaching for 1 month", "تدريب وتغذية لمدة شهر"),
                    plan(gym.getId(), "Training + Nutrition – 3 Months", "تدريب + تغذية - 3 أشهر", MemberPlanDuration.THREE_MONTHS, "Training + nutrition coaching for 3 months", "تدريب وتغذية لمدة 3 أشهر"),
                    plan(gym.getId(), "Training + Nutrition – 6 Months", "تدريب + تغذية - 6 أشهر", MemberPlanDuration.SIX_MONTHS, "Training + nutrition coaching for 6 months", "تدريب وتغذية لمدة 6 أشهر"),
                    plan(gym.getId(), "Training + Nutrition – 1 Year", "تدريب + تغذية - سنة", MemberPlanDuration.TWELVE_MONTHS, "Training + nutrition coaching for 1 year", "تدريب وتغذية لمدة سنة")
            ));
        });
    }

    private GymMemberPlan plan(java.util.UUID gymId, String name, String nameAr,
                                MemberPlanDuration duration, String desc, String descAr) {
        return GymMemberPlan.builder()
                .gymId(gymId)
                .name(name)
                .nameAr(nameAr)
                .duration(duration)
                .price(BigDecimal.ZERO)
                .description(desc)
                .descriptionAr(descAr)
                .active(true)
                .build();
    }

    private String toJson(List<String> list) {
        try { return objectMapper.writeValueAsString(list); }
        catch (Exception e) { return "[]"; }
    }
}
