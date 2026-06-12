package com.qawi.service;

import com.qawi.dto.*;
import com.qawi.entity.*;
import com.qawi.exception.AppException;
import com.qawi.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.TextStyle;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class NutritionCalendarPlanService {

    private final UserRepository userRepository;
    private final GymRepository gymRepository;
    private final NutritionCalendarPlanRepository planRepository;
    private final NutritionPlanDayRepository planDayRepository;
    private final MealSuggestionRepository mealSuggestionRepository;
    private final FoodEntryRepository foodEntryRepository;
    private final NutritionTargetRepository nutritionTargetRepository;

    // ─── Arabic day names ────────────────────────────────────────
    private static final Map<Integer, String> DAY_AR = Map.of(
            1, "الاثنين", 2, "الثلاثاء", 3, "الأربعاء", 4, "الخميس",
            5, "الجمعة", 6, "السبت", 7, "الأحد"
    );

    // ─── Create Plan ─────────────────────────────────────────────

    @Transactional
    public Map<String, Object> createPlan(String callerEmail, CreateNutritionCalendarPlanRequest req) {
        User caller = loadUser(callerEmail);
        User member = loadUser(req.getMemberId());
        assertCanManagePlan(caller, member);

        if (req.getEndDate().isBefore(req.getStartDate()))
            throw new AppException("End date must be after start date", "تاريخ الانتهاء يجب أن يكون بعد البداية", HttpStatus.BAD_REQUEST);

        long dayCount = req.getStartDate().datesUntil(req.getEndDate().plusDays(1)).count();
        if (dayCount > 366)
            throw new AppException("Plan cannot exceed 366 days", "لا يمكن أن تتجاوز الخطة 366 يوماً", HttpStatus.BAD_REQUEST);

        // Deactivate any current active plan for this member
        planRepository.findByMemberIdAndIsActiveTrue(member.getId()).ifPresent(old -> {
            old.setIsActive(false);
            old.setUpdatedAt(LocalDateTime.now());
            planRepository.save(old);
        });

        NutritionCalendarPlan plan = planRepository.save(NutritionCalendarPlan.builder()
                .gymId(caller.getGymId())
                .memberId(member.getId())
                .createdByUserId(caller.getId())
                .createdByRole(caller.getRole().name())
                .title(req.getTitle())
                .startDate(req.getStartDate())
                .endDate(req.getEndDate())
                .isActive(true)
                .build());

        // Auto-generate plan days
        int waterMl = req.getDefaultTargetWater() != null ? (int)(req.getDefaultTargetWater() * 1000) : 2000;
        List<NutritionPlanDay> days = new ArrayList<>();
        for (LocalDate d = req.getStartDate(); !d.isAfter(req.getEndDate()); d = d.plusDays(1)) {
            String dayEn = d.getDayOfWeek().getDisplayName(TextStyle.FULL, Locale.ENGLISH);
            String dayAr = DAY_AR.getOrDefault(d.getDayOfWeek().getValue(), dayEn);
            days.add(NutritionPlanDay.builder()
                    .planId(plan.getId())
                    .gymId(caller.getGymId())
                    .memberId(member.getId())
                    .dayDate(d)
                    .dayName(dayEn)
                    .dayNameAr(dayAr)
                    .targetCalories(req.getDefaultTargetCalories())
                    .targetProtein(req.getDefaultTargetProtein())
                    .targetCarbs(req.getDefaultTargetCarbs())
                    .targetFat(req.getDefaultTargetFat())
                    .targetWater(waterMl)
                    .goal(req.getGoal())
                    .notes(req.getNotes())
                    .build());
        }
        planDayRepository.saveAll(days);

        Map<String, Object> result = buildPlanMap(plan);
        result.put("daysGenerated", days.size());
        return result;
    }

    // ─── Get Plans for Member ─────────────────────────────────────

    public List<Map<String, Object>> getPlansByMember(String callerEmail, UUID memberId) {
        User caller = loadUser(callerEmail);
        User member = loadUser(memberId);
        assertCanViewMember(caller, member);

        return planRepository.findByMemberIdOrderByCreatedAtDesc(memberId)
                .stream().map(this::buildPlanMap).collect(Collectors.toList());
    }

    // ─── Get Plan Detail ─────────────────────────────────────────

    public Map<String, Object> getPlanById(String callerEmail, UUID planId) {
        User caller = loadUser(callerEmail);
        NutritionCalendarPlan plan = loadPlan(planId);
        User member = loadUser(plan.getMemberId());
        assertCanViewMember(caller, member);

        List<NutritionPlanDay> days = planDayRepository.findByPlanIdOrderByDayDate(planId);
        LocalDate today = LocalDate.now();

        List<Map<String, Object>> dayMaps = days.stream().map(day -> {
            Map<String, Object> dm = buildDayMap(day);
            // Add logged calories for that day
            long loggedCal = foodEntryRepository.findByMemberIdAndDateRange(
                    day.getMemberId(),
                    day.getDayDate().atStartOfDay(),
                    day.getDayDate().atTime(23, 59, 59)
            ).stream().mapToLong(e -> e.getCalories() != null ? Math.round(e.getCalories()) : 0).sum();
            dm.put("loggedCalories", loggedCal);
            // Suggestion count
            int suggCount = mealSuggestionRepository.findByPlanDayIdOrderByCreatedAtAsc(day.getId()).size();
            dm.put("suggestionCount", suggCount);
            // Status
            String status = "NO_TARGET";
            if (day.getTargetCalories() != null && day.getTargetCalories() > 0) {
                if (!day.getDayDate().isAfter(today) && loggedCal > 0) {
                    double ratio = (double) loggedCal / day.getTargetCalories();
                    status = (ratio >= 0.9 && ratio <= 1.1) ? "ON_TRACK" : (ratio < 0.9 ? "UNDER" : "OVER");
                } else {
                    status = day.getDayDate().isBefore(today) ? "NO_LOG" : "UPCOMING";
                }
            }
            dm.put("status", status);
            return dm;
        }).collect(Collectors.toList());

        Map<String, Object> result = buildPlanMap(plan);
        result.put("days", dayMaps);
        return result;
    }

    // ─── Update Plan Day ─────────────────────────────────────────

    @Transactional
    public Map<String, Object> updatePlanDay(String callerEmail, UUID dayId, UpdateNutritionPlanDayRequest req) {
        User caller = loadUser(callerEmail);
        NutritionPlanDay day = loadDay(dayId);
        User member = loadUser(day.getMemberId());
        assertCanManagePlan(caller, member);

        if (req.getTargetCalories() != null) day.setTargetCalories(req.getTargetCalories());
        if (req.getTargetProtein() != null)  day.setTargetProtein(req.getTargetProtein());
        if (req.getTargetCarbs() != null)    day.setTargetCarbs(req.getTargetCarbs());
        if (req.getTargetFat() != null)      day.setTargetFat(req.getTargetFat());
        if (req.getTargetWater() != null)    day.setTargetWater((int)(req.getTargetWater() * 1000));
        if (req.getGoal() != null)           day.setGoal(req.getGoal());
        if (req.getNotes() != null)          day.setNotes(req.getNotes());
        if (req.getNotesAr() != null)        day.setNotesAr(req.getNotesAr());
        day.setUpdatedAt(LocalDateTime.now());
        return buildDayMap(planDayRepository.save(day));
    }

    // ─── Add Suggestion to Day ───────────────────────────────────

    @Transactional
    public Map<String, Object> addDaySuggestion(String callerEmail, UUID dayId, AddDaySuggestionRequest req) {
        User caller = loadUser(callerEmail);
        NutritionPlanDay day = loadDay(dayId);
        User member = loadUser(day.getMemberId());
        assertCanManagePlan(caller, member);

        MealSuggestion s = mealSuggestionRepository.save(MealSuggestion.builder()
                .gymId(caller.getGymId())
                .memberId(day.getMemberId())
                .createdByUserId(caller.getId())
                .mealType(req.getMealType())
                .description(req.getDescription())
                .descriptionAr(req.getDescriptionAr())
                .targetCalories(req.getTargetCalories())
                .targetProtein(req.getTargetProtein())
                .planDayId(dayId)
                .suggestionDate(day.getDayDate())
                .build());

        return buildSuggestionMap(s);
    }

    // ─── Delete Suggestion ────────────────────────────────────────

    @Transactional
    public void deleteDaySuggestion(String callerEmail, UUID suggestionId) {
        User caller = loadUser(callerEmail);
        MealSuggestion s = mealSuggestionRepository.findById(suggestionId)
                .orElseThrow(() -> new AppException("Suggestion not found", "الاقتراح غير موجود", HttpStatus.NOT_FOUND));
        User member = loadUser(s.getMemberId());
        assertCanManagePlan(caller, member);
        mealSuggestionRepository.delete(s);
    }

    // ─── Copy Day ─────────────────────────────────────────────────

    @Transactional
    public Map<String, Object> copyDay(String callerEmail, UUID dayId, CopyDayRequest req) {
        User caller = loadUser(callerEmail);
        NutritionPlanDay srcDay = loadDay(dayId);
        User member = loadUser(srcDay.getMemberId());
        assertCanManagePlan(caller, member);

        List<LocalDate> targets = new ArrayList<>();
        if (req.getCopyToDates() != null) targets.addAll(req.getCopyToDates());
        if (req.getCopyToRangeStart() != null && req.getCopyToRangeEnd() != null) {
            for (LocalDate d = req.getCopyToRangeStart(); !d.isAfter(req.getCopyToRangeEnd()); d = d.plusDays(1))
                if (!d.equals(srcDay.getDayDate())) targets.add(d);
        }

        List<MealSuggestion> srcSuggestions = mealSuggestionRepository.findByPlanDayIdOrderByCreatedAtAsc(dayId);

        int copied = 0;
        for (LocalDate target : targets) {
            // Find the plan day for that date within the same plan
            Optional<NutritionPlanDay> targetDayOpt = planDayRepository.findByPlanIdAndDayDate(srcDay.getPlanId(), target);
            if (targetDayOpt.isEmpty()) continue;

            NutritionPlanDay tDay = targetDayOpt.get();
            tDay.setTargetCalories(srcDay.getTargetCalories());
            tDay.setTargetProtein(srcDay.getTargetProtein());
            tDay.setTargetCarbs(srcDay.getTargetCarbs());
            tDay.setTargetFat(srcDay.getTargetFat());
            tDay.setTargetWater(srcDay.getTargetWater());
            tDay.setGoal(srcDay.getGoal());
            tDay.setNotes(srcDay.getNotes());
            tDay.setNotesAr(srcDay.getNotesAr());
            tDay.setUpdatedAt(LocalDateTime.now());
            planDayRepository.save(tDay);

            // Copy suggestions
            for (MealSuggestion s : srcSuggestions) {
                mealSuggestionRepository.save(MealSuggestion.builder()
                        .gymId(s.getGymId())
                        .memberId(s.getMemberId())
                        .createdByUserId(caller.getId())
                        .mealType(s.getMealType())
                        .description(s.getDescription())
                        .descriptionAr(s.getDescriptionAr())
                        .targetCalories(s.getTargetCalories())
                        .targetProtein(s.getTargetProtein())
                        .planDayId(tDay.getId())
                        .suggestionDate(target)
                        .build());
            }
            copied++;
        }

        return Map.of("copiedToDays", copied, "sourceDayDate", srcDay.getDayDate().toString());
    }

    // ─── Deactivate Plan ─────────────────────────────────────────

    @Transactional
    public void deactivatePlan(String callerEmail, UUID planId) {
        User caller = loadUser(callerEmail);
        NutritionCalendarPlan plan = loadPlan(planId);
        User member = loadUser(plan.getMemberId());
        assertCanManagePlan(caller, member);
        plan.setIsActive(false);
        plan.setUpdatedAt(LocalDateTime.now());
        planRepository.save(plan);
    }

    // ─── Get Day with Suggestions ────────────────────────────────

    public Map<String, Object> getDayDetail(String callerEmail, UUID dayId) {
        User caller = loadUser(callerEmail);
        NutritionPlanDay day = loadDay(dayId);
        User member = loadUser(day.getMemberId());
        assertCanViewMember(caller, member);

        Map<String, Object> dm = buildDayMap(day);
        List<Map<String, Object>> suggestions = mealSuggestionRepository
                .findByPlanDayIdOrderByCreatedAtAsc(dayId)
                .stream().map(this::buildSuggestionMap).collect(Collectors.toList());
        dm.put("suggestions", suggestions);
        return dm;
    }

    // ─── Builders ────────────────────────────────────────────────

    private Map<String, Object> buildPlanMap(NutritionCalendarPlan p) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", p.getId()); m.put("title", p.getTitle());
        m.put("memberId", p.getMemberId()); m.put("gymId", p.getGymId());
        m.put("startDate", p.getStartDate().toString()); m.put("endDate", p.getEndDate().toString());
        m.put("isActive", p.getIsActive()); m.put("createdByRole", p.getCreatedByRole());
        m.put("createdAt", p.getCreatedAt().toString()); m.put("updatedAt", p.getUpdatedAt().toString());
        return m;
    }

    public Map<String, Object> buildDayMap(NutritionPlanDay d) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", d.getId()); m.put("planId", d.getPlanId());
        m.put("dayDate", d.getDayDate().toString()); m.put("dayName", d.getDayName());
        m.put("dayNameAr", d.getDayNameAr());
        m.put("targetCalories", d.getTargetCalories()); m.put("targetProtein", d.getTargetProtein());
        m.put("targetCarbs", d.getTargetCarbs()); m.put("targetFat", d.getTargetFat());
        m.put("targetWater", d.getTargetWater() != null ? d.getTargetWater() / 1000.0 : null);
        m.put("goal", d.getGoal()); m.put("notes", d.getNotes()); m.put("notesAr", d.getNotesAr());
        m.put("isCompleted", d.getIsCompleted());
        return m;
    }

    public Map<String, Object> buildSuggestionMap(MealSuggestion s) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", s.getId()); m.put("mealType", s.getMealType());
        m.put("description", s.getDescription()); m.put("descriptionAr", s.getDescriptionAr());
        m.put("targetCalories", s.getTargetCalories()); m.put("targetProtein", s.getTargetProtein());
        m.put("planDayId", s.getPlanDayId());
        m.put("suggestionDate", s.getSuggestionDate() != null ? s.getSuggestionDate().toString() : null);
        m.put("createdAt", s.getCreatedAt().toString());
        return m;
    }

    // ─── Access helpers ──────────────────────────────────────────

    private User loadUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new AppException("User not found", "المستخدم غير موجود", HttpStatus.NOT_FOUND));
    }

    private User loadUser(UUID id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new AppException("User not found", "المستخدم غير موجود", HttpStatus.NOT_FOUND));
    }

    private NutritionCalendarPlan loadPlan(UUID planId) {
        return planRepository.findById(planId)
                .orElseThrow(() -> new AppException("Plan not found", "الخطة غير موجودة", HttpStatus.NOT_FOUND));
    }

    private NutritionPlanDay loadDay(UUID dayId) {
        return planDayRepository.findById(dayId)
                .orElseThrow(() -> new AppException("Plan day not found", "يوم الخطة غير موجود", HttpStatus.NOT_FOUND));
    }

    private void assertCanManagePlan(User caller, User member) {
        switch (caller.getRole()) {
            case GYM_ADMIN, SUPER_ADMIN -> {
                if (caller.getRole() != Role.SUPER_ADMIN && !caller.getGymId().equals(member.getGymId()))
                    throw new AppException("Access denied", "غير مصرح لك", HttpStatus.FORBIDDEN);
            }
            case NUTRITIONIST, COACH -> {
                if (!caller.getGymId().equals(member.getGymId()))
                    throw new AppException("Access denied", "غير مصرح لك", HttpStatus.FORBIDDEN);
                assertWorkflowAllowsWrite(caller);
            }
            default -> throw new AppException("Access denied", "غير مصرح لك", HttpStatus.FORBIDDEN);
        }
    }

    /**
     * Enforces the gym's nutritionWorkflow setting for write operations.
     * COACH_ONLY blocks NUTRITIONIST; NUTRITIONIST_ONLY blocks COACH.
     * GYM_ADMIN and SUPER_ADMIN are exempt (handled before this call).
     */
    private void assertWorkflowAllowsWrite(User caller) {
        NutritionWorkflow wf = gymRepository.findById(caller.getGymId())
                .map(Gym::getNutritionWorkflow)
                .orElse(NutritionWorkflow.COACH_ONLY);
        if (caller.getRole() == Role.COACH && wf == NutritionWorkflow.NUTRITIONIST_ONLY)
            throw new AppException(
                    "Nutrition plans for this gym are managed by the nutrition department only.",
                    "خطط التغذية في هذا النادي تديرها قسم التغذية فقط.", HttpStatus.FORBIDDEN);
        if (caller.getRole() == Role.NUTRITIONIST && wf == NutritionWorkflow.COACH_ONLY)
            throw new AppException(
                    "Nutrition plans for this gym are managed by coaches only.",
                    "خطط التغذية في هذا النادي يديرها المدربون فقط.", HttpStatus.FORBIDDEN);
    }

    private void assertCanViewMember(User caller, User member) {
        switch (caller.getRole()) {
            case MEMBER -> { if (!caller.getId().equals(member.getId())) throw new AppException("Access denied", "غير مصرح لك", HttpStatus.FORBIDDEN); }
            case COACH, NUTRITIONIST, GYM_ADMIN -> { if (!caller.getGymId().equals(member.getGymId())) throw new AppException("Access denied", "غير مصرح لك", HttpStatus.FORBIDDEN); }
            case SUPER_ADMIN -> {}
            default -> throw new AppException("Access denied", "غير مصرح لك", HttpStatus.FORBIDDEN);
        }
    }
}
