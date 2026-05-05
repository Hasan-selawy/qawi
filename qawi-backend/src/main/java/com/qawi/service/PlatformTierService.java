package com.qawi.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.qawi.dto.PlatformPageDto;
import com.qawi.dto.PlatformTierDto;
import com.qawi.dto.PlatformTierRequest;
import com.qawi.entity.PlatformPricingPage;
import com.qawi.entity.PlatformTier;
import com.qawi.entity.SubscriptionPlan;
import com.qawi.exception.AppException;
import com.qawi.repository.PlatformPricingPageRepository;
import com.qawi.repository.PlatformTierRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PlatformTierService {

    private final PlatformTierRepository tierRepository;
    private final PlatformPricingPageRepository pageRepository;
    private final ObjectMapper objectMapper;

    @Transactional(readOnly = true)
    public List<PlatformTierDto> getActiveTiers() {
        return tierRepository.findByActiveTrueOrderByDisplayOrderAsc()
                .stream().map(this::toDto).toList();
    }

    @Transactional(readOnly = true)
    public List<PlatformTierDto> getAllTiers() {
        return tierRepository.findAllByOrderByDisplayOrderAsc()
                .stream().map(this::toDto).toList();
    }

    @Transactional
    public PlatformTierDto createTier(PlatformTierRequest req) {
        PlatformTier tier = PlatformTier.builder()
                .name(req.getName())
                .nameAr(req.getNameAr())
                .price1m(orZero(req.getPrice1m()))
                .price3m(orZero(req.getPrice3m()))
                .price6m(orZero(req.getPrice6m()))
                .price12m(orZero(req.getPrice12m()))
                .features(toJson(req.getFeatures()))
                .featuresAr(toJson(req.getFeaturesAr()))
                .active(req.getActive() == null || req.getActive())
                .highlighted(req.getHighlighted() != null && req.getHighlighted())
                .displayOrder(req.getDisplayOrder() == null ? 99 : req.getDisplayOrder())
                .maxMembers(req.getMaxMembers())
                .maxCoaches(req.getMaxCoaches())
                .subscriptionPlan(req.getSubscriptionPlan() != null ? req.getSubscriptionPlan() : SubscriptionPlan.BASIC)
                .build();
        return toDto(tierRepository.save(tier));
    }

    @Transactional
    public PlatformTierDto updateTier(UUID id, PlatformTierRequest req) {
        PlatformTier tier = tierRepository.findById(id)
                .orElseThrow(() -> new AppException("Tier not found", "الباقة غير موجودة", HttpStatus.NOT_FOUND));
        if (req.getName() != null) tier.setName(req.getName());
        if (req.getNameAr() != null) tier.setNameAr(req.getNameAr());
        if (req.getPrice1m() != null) tier.setPrice1m(req.getPrice1m());
        if (req.getPrice3m() != null) tier.setPrice3m(req.getPrice3m());
        if (req.getPrice6m() != null) tier.setPrice6m(req.getPrice6m());
        if (req.getPrice12m() != null) tier.setPrice12m(req.getPrice12m());
        if (req.getFeatures() != null) tier.setFeatures(toJson(req.getFeatures()));
        if (req.getFeaturesAr() != null) tier.setFeaturesAr(toJson(req.getFeaturesAr()));
        if (req.getActive() != null) tier.setActive(req.getActive());
        if (req.getHighlighted() != null) tier.setHighlighted(req.getHighlighted());
        if (req.getDisplayOrder() != null) tier.setDisplayOrder(req.getDisplayOrder());
        if (req.getMaxMembers() != null) tier.setMaxMembers(req.getMaxMembers());
        if (req.getMaxCoaches() != null) tier.setMaxCoaches(req.getMaxCoaches());
        if (req.getSubscriptionPlan() != null) tier.setSubscriptionPlan(req.getSubscriptionPlan());
        return toDto(tierRepository.save(tier));
    }

    @Transactional
    public void deactivateTier(UUID id) {
        PlatformTier tier = tierRepository.findById(id)
                .orElseThrow(() -> new AppException("Tier not found", "الباقة غير موجودة", HttpStatus.NOT_FOUND));
        tier.setActive(false);
        tierRepository.save(tier);
    }

    @Transactional(readOnly = true)
    public PlatformPageDto getPage() {
        return pageRepository.findAll().stream().findFirst()
                .map(this::toPageDto)
                .orElseGet(() -> PlatformPageDto.builder()
                        .title("Simple, Transparent Pricing")
                        .titleAr("أسعار بسيطة وشفافة")
                        .subtitle("Choose the plan that fits your gym. Start free for 14 days.")
                        .subtitleAr("اختر الخطة المناسبة لصالتك. ابدأ مجاناً لمدة 14 يوماً.")
                        .footerText("All plans include a 14-day free trial. Cancel anytime.")
                        .footerTextAr("جميع الخطط تشمل تجربة مجانية لمدة 14 يوماً. إلغاء في أي وقت.")
                        .build());
    }

    @Transactional
    public PlatformPageDto updatePage(PlatformPageDto req) {
        PlatformPricingPage page = pageRepository.findAll().stream().findFirst()
                .orElse(PlatformPricingPage.builder().build());
        if (req.getTitle() != null) page.setTitle(req.getTitle());
        if (req.getTitleAr() != null) page.setTitleAr(req.getTitleAr());
        if (req.getSubtitle() != null) page.setSubtitle(req.getSubtitle());
        if (req.getSubtitleAr() != null) page.setSubtitleAr(req.getSubtitleAr());
        if (req.getFooterText() != null) page.setFooterText(req.getFooterText());
        if (req.getFooterTextAr() != null) page.setFooterTextAr(req.getFooterTextAr());
        return toPageDto(pageRepository.save(page));
    }

    private PlatformTierDto toDto(PlatformTier t) {
        int save6m = t.getPrice1m() > 0
                ? Math.round(100f * (1f - (t.getPrice6m() / 6f) / t.getPrice1m()))
                : 0;
        int save12m = t.getPrice1m() > 0
                ? Math.round(100f * (1f - (t.getPrice12m() / 12f) / t.getPrice1m()))
                : 0;
        return PlatformTierDto.builder()
                .id(t.getId())
                .name(t.getName())
                .nameAr(t.getNameAr())
                .price1m(t.getPrice1m())
                .price3m(t.getPrice3m())
                .price6m(t.getPrice6m())
                .price12m(t.getPrice12m())
                .features(fromJson(t.getFeatures()))
                .featuresAr(fromJson(t.getFeaturesAr()))
                .active(t.isActive())
                .highlighted(t.isHighlighted())
                .displayOrder(t.getDisplayOrder())
                .maxMembers(t.getMaxMembers())
                .maxCoaches(t.getMaxCoaches())
                .subscriptionPlan(t.getSubscriptionPlan())
                .save6mPercent(Math.max(0, save6m))
                .save12mPercent(Math.max(0, save12m))
                .build();
    }

    private PlatformPageDto toPageDto(PlatformPricingPage p) {
        return PlatformPageDto.builder()
                .title(p.getTitle())
                .titleAr(p.getTitleAr())
                .subtitle(p.getSubtitle())
                .subtitleAr(p.getSubtitleAr())
                .footerText(p.getFooterText())
                .footerTextAr(p.getFooterTextAr())
                .build();
    }

    private String toJson(List<String> list) {
        if (list == null) return null;
        try { return objectMapper.writeValueAsString(list); }
        catch (JsonProcessingException e) { return "[]"; }
    }

    private List<String> fromJson(String json) {
        if (json == null || json.isBlank()) return List.of();
        try { return objectMapper.readValue(json, new TypeReference<>() {}); }
        catch (JsonProcessingException e) { return List.of(); }
    }

    private int orZero(Integer v) { return v == null ? 0 : v; }
}
