package com.qawi.controller;

import com.qawi.dto.CheckInResponse;
import com.qawi.dto.CreateMeasurementRequest;
import com.qawi.dto.CreateProgressPhotoRequest;
import com.qawi.entity.*;
import com.qawi.exception.AppException;
import com.qawi.repository.*;
import com.qawi.service.AttendanceService;
import com.qawi.service.MeasurementService;
import com.qawi.service.NutritionService;
import com.qawi.service.ProgressPhotoService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.*;

@RestController
@RequestMapping("/api/v1/member")
@RequiredArgsConstructor
@PreAuthorize("hasRole('MEMBER')")
public class MemberController {

    private final UserRepository userRepository;
    private final AttendanceService attendanceService;
    private final AttendanceRepository attendanceRepository;
    private final WorkoutPlanRepository workoutPlanRepository;
    private final ScheduleDayRepository scheduleDayRepository;
    private final PlanExerciseRepository planExerciseRepository;
    private final ExerciseTemplateRepository exerciseTemplateRepository;
    private final NutritionService nutritionService;
    private final NutritionPlanRepository nutritionPlanRepository;
    private final MealRepository mealRepository;
    private final MeasurementService measurementService;
    private final BodyMeasurementRepository measurementRepository;
    private final ProgressPhotoService photoService;
    private final ProgressPhotoRepository photoRepository;
    private final MealLogRepository mealLogRepository;

    // ───────────────────────── ATTENDANCE ─────────────────────────

    @PostMapping("/attendance/checkin")
    public ResponseEntity<CheckInResponse> checkin(@AuthenticationPrincipal UserDetails ud) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(attendanceService.checkIn(ud.getUsername()));
    }

    @PostMapping("/attendance/checkout")
    public ResponseEntity<Attendance> checkout(@AuthenticationPrincipal UserDetails ud) {
        return ResponseEntity.ok(attendanceService.checkOut(ud.getUsername()));
    }

    @GetMapping("/attendance")
    public ResponseEntity<List<Map<String, Object>>> attendance(@AuthenticationPrincipal UserDetails ud) {
        User me = self(ud);
        List<Attendance> rows = attendanceRepository.findByMemberIdOrderByCheckedInAtDesc(me.getId());
        return ResponseEntity.ok(rows.stream().map(a -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", a.getId());
            m.put("date", a.getCheckedInAt() == null ? null : a.getCheckedInAt().toString());
            m.put("checkedInAt", a.getCheckedInAt());
            return m;
        }).toList());
    }

    @GetMapping("/attendance/stats")
    public ResponseEntity<Map<String, Object>> attendanceStats(@AuthenticationPrincipal UserDetails ud) {
        User me = self(ud);
        var streak = attendanceService.getStreak(me.getId());
        List<Attendance> all = attendanceRepository.findByMemberIdOrderByCheckedInAtDesc(me.getId());
        LocalDate weekStart = LocalDate.now().minusDays(6);
        long thisWeek = all.stream()
                .filter(a -> a.getCheckedInAt() != null && !a.getCheckedInAt().toLocalDate().isBefore(weekStart))
                .map(a -> a.getCheckedInAt().toLocalDate())
                .distinct()
                .count();
        long total = all.stream()
                .filter(a -> a.getCheckedInAt() != null)
                .map(a -> a.getCheckedInAt().toLocalDate())
                .distinct()
                .count();
        Attendance todays = all.stream()
                .filter(a -> a.getCheckedInAt() != null
                        && LocalDate.now().equals(a.getCheckedInAt().toLocalDate()))
                .findFirst()
                .orElse(null);
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("streak", streak.getStreak());
        out.put("lastCheckIn", streak.getLastCheckIn());
        out.put("thisWeek", thisWeek);
        out.put("totalDays", total);
        out.put("checkedInToday", todays != null);
        out.put("checkedOutToday", todays != null && todays.getCheckedOutAt() != null);
        out.put("checkedOutAt", todays == null ? null : todays.getCheckedOutAt());
        return ResponseEntity.ok(out);
    }

    // ───────────────────────── WORKOUTS ─────────────────────────

    @GetMapping("/workouts/today")
    public ResponseEntity<Map<String, Object>> todaysWorkout(@AuthenticationPrincipal UserDetails ud) {
        User me = self(ud);
        LocalDate today = LocalDate.now();

        // Find the most relevant active plan: one whose start..end window includes today,
        // else the most recently created plan.
        List<WorkoutPlan> plans = workoutPlanRepository.findByMemberId(me.getId());
        WorkoutPlan plan = plans.stream()
                .filter(p -> !today.isBefore(p.getStartDate()) && !today.isAfter(p.getEndDate()))
                .max(Comparator.comparing(WorkoutPlan::getCreatedAt))
                .orElse(plans.stream()
                        .max(Comparator.comparing(WorkoutPlan::getCreatedAt))
                        .orElse(null));

        if (plan == null) return ResponseEntity.noContent().build();

        ScheduleDay day = scheduleDayRepository.findByWorkoutPlanIdOrderByDayDate(plan.getId()).stream()
                .filter(d -> today.equals(d.getDayDate()))
                .findFirst()
                .orElse(null);

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("planId", plan.getId());
        out.put("planName", plan.getName());
        if (day == null) {
            out.put("restDay", true);
            out.put("exercises", List.of());
            return ResponseEntity.ok(out);
        }
        out.put("dayId", day.getId());
        out.put("dayName", day.getDayName());
        out.put("dayNameAr", day.getDayNameAr());
        out.put("restDay", day.isRestDay());
        out.put("isCompleted", day.isCompleted());

        if (day.isRestDay()) {
            out.put("exercises", List.of());
            return ResponseEntity.ok(out);
        }

        out.put("exercises", buildExerciseList(day.getId()));
        return ResponseEntity.ok(out);
    }

    private List<Map<String, Object>> buildExerciseList(UUID scheduleDayId) {
        return planExerciseRepository.findByScheduleDayIdOrderByOrderIndex(scheduleDayId).stream().map(ex -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", ex.getId());
            String name = ex.getCustomName();
            String nameAr = ex.getCustomNameAr();
            if ((name == null || nameAr == null) && ex.getExerciseTemplateId() != null) {
                ExerciseTemplate t = exerciseTemplateRepository.findById(ex.getExerciseTemplateId()).orElse(null);
                if (t != null) {
                    if (name == null) name = t.getName();
                    if (nameAr == null) nameAr = t.getNameAr();
                }
            }
            m.put("name", name);
            m.put("nameAr", nameAr);
            m.put("sets", ex.getSets());
            m.put("reps", ex.getReps());
            m.put("weight", ex.getTargetWeight());
            m.put("videoUrl", ex.getVideoUrl());
            return m;
        }).toList();
    }

    @GetMapping("/workouts/upcoming")
    public ResponseEntity<List<Map<String, Object>>> upcoming(@AuthenticationPrincipal UserDetails ud) {
        User me = self(ud);
        LocalDate today = LocalDate.now();
        List<WorkoutPlan> plans = workoutPlanRepository.findByMemberId(me.getId());

        record DayRef(WorkoutPlan plan, ScheduleDay day) {}
        List<DayRef> futureDays = new ArrayList<>();
        for (WorkoutPlan plan : plans) {
            for (ScheduleDay d : scheduleDayRepository.findByWorkoutPlanIdOrderByDayDate(plan.getId())) {
                if (d.getDayDate() == null || !d.getDayDate().isAfter(today)) continue;
                futureDays.add(new DayRef(plan, d));
            }
        }
        futureDays.sort(Comparator.comparing(r -> r.day().getDayDate()));

        List<Map<String, Object>> out = new ArrayList<>();
        for (DayRef ref : futureDays.stream().limit(10).toList()) {
            ScheduleDay d = ref.day();
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("dayId", d.getId());
            m.put("planId", ref.plan().getId());
            m.put("planName", ref.plan().getName());
            m.put("date", d.getDayDate());
            m.put("dayName", d.getDayName());
            m.put("dayNameAr", d.getDayNameAr());
            m.put("restDay", d.isRestDay());
            m.put("isCompleted", d.isCompleted());
            List<Map<String, Object>> exList = d.isRestDay() ? List.of() : buildExerciseList(d.getId());
            m.put("exerciseCount", exList.size());
            m.put("exercises", exList);
            out.add(m);
        }
        return ResponseEntity.ok(out);
    }

    // ───────────────────────── MEALS ─────────────────────────

    @PostMapping("/meals/{mealId}/done")
    public ResponseEntity<Map<String, Object>> markMealDone(
            @AuthenticationPrincipal UserDetails ud,
            @PathVariable UUID mealId) {
        User me = self(ud);
        LocalDate today = LocalDate.now();
        if (mealLogRepository.findByMemberIdAndMealIdAndLogDate(me.getId(), mealId, today).isEmpty()) {
            try {
                mealLogRepository.save(MealLog.builder()
                        .memberId(me.getId())
                        .mealId(mealId)
                        .logDate(today)
                        .build());
            } catch (org.springframework.dao.DataIntegrityViolationException ignored) {
                // Concurrent duplicate — already logged, treat as success
            }
        }
        return ResponseEntity.ok(Map.of("mealId", mealId, "done", true));
    }

    @DeleteMapping("/meals/{mealId}/done")
    @org.springframework.transaction.annotation.Transactional
    public ResponseEntity<Map<String, Object>> unmarkMealDone(
            @AuthenticationPrincipal UserDetails ud,
            @PathVariable UUID mealId) {
        User me = self(ud);
        mealLogRepository.deleteByMemberIdAndMealIdAndLogDate(me.getId(), mealId, LocalDate.now());
        return ResponseEntity.ok(Map.of("mealId", mealId, "done", false));
    }

    @GetMapping("/meals/done")
    public ResponseEntity<List<UUID>> mealsDoneToday(@AuthenticationPrincipal UserDetails ud) {
        User me = self(ud);
        return ResponseEntity.ok(mealLogRepository.findByMemberIdAndLogDate(me.getId(), LocalDate.now())
                .stream().map(MealLog::getMealId).toList());
    }

    // ───────────────────────── NUTRITION ─────────────────────────

    @GetMapping("/nutrition/active")
    public ResponseEntity<Map<String, Object>> activeNutrition(@AuthenticationPrincipal UserDetails ud) {
        User me = self(ud);
        List<NutritionPlan> plans = nutritionPlanRepository.findByMemberId(me.getId());
        if (plans.isEmpty()) return ResponseEntity.noContent().build();

        NutritionPlan plan = plans.stream()
                .max(Comparator.comparing(NutritionPlan::getCreatedAt))
                .orElse(plans.get(0));

        List<Meal> meals = mealRepository.findByNutritionPlanIdOrderByOrderIndex(plan.getId());
        int totalCal = meals.stream().mapToInt(m -> m.getCalories() == null ? 0 : m.getCalories()).sum();
        int totalProtein = meals.stream().mapToInt(m -> m.getProtein() == null ? 0 : m.getProtein()).sum();

        Set<UUID> doneIds = mealLogRepository.findByMemberIdAndLogDate(me.getId(), LocalDate.now())
                .stream().map(MealLog::getMealId).collect(java.util.stream.Collectors.toSet());

        List<Map<String, Object>> mealList = meals.stream().map(m -> {
            Map<String, Object> mm = new LinkedHashMap<>();
            mm.put("id", m.getId());
            mm.put("type", m.getMealType());
            mm.put("mealType", m.getMealType());
            mm.put("name", m.getDescription());
            mm.put("nameAr", m.getDescriptionAr());
            mm.put("description", m.getDescription());
            mm.put("descriptionAr", m.getDescriptionAr());
            mm.put("calories", m.getCalories());
            mm.put("protein", m.getProtein());
            mm.put("done", doneIds.contains(m.getId()));
            return mm;
        }).toList();

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("id", plan.getId());
        out.put("name", "Nutrition Plan");
        out.put("nameAr", "خطة التغذية");
        out.put("totalCalories", totalCal);
        out.put("totalProtein", totalProtein);
        out.put("meals", mealList);
        return ResponseEntity.ok(out);
    }

    // ───────────────────────── MEASUREMENTS ─────────────────────────

    @GetMapping("/measurements")
    public ResponseEntity<List<Map<String, Object>>> measurements(@AuthenticationPrincipal UserDetails ud) {
        User me = self(ud);
        List<BodyMeasurement> rows = measurementRepository.findByMemberIdOrderByRecordedAtDesc(me.getId());
        return ResponseEntity.ok(rows.stream().map(this::measurementToMap).toList());
    }

    private Map<String, Object> measurementToMap(BodyMeasurement m) {
        Map<String, Object> mm = new LinkedHashMap<>();
        mm.put("id", m.getId());
        mm.put("memberId", m.getMemberId());
        mm.put("recordedBy", m.getRecordedBy());
        mm.put("weight", m.getWeight());
        mm.put("height", m.getHeight());
        mm.put("chest", m.getChest());
        mm.put("waist", m.getWaist());
        mm.put("hips", m.getHips());
        mm.put("arms", m.getArms());
        mm.put("legs", m.getLegs());
        mm.put("bodyFatPercentage", m.getBodyFatPercentage());
        mm.put("bodyFat", m.getBodyFatPercentage());
        mm.put("notes", m.getNotes());
        mm.put("recordedAt", m.getRecordedAt());
        mm.put("takenAt", m.getRecordedAt());
        return mm;
    }

    @PostMapping("/measurements")
    public ResponseEntity<BodyMeasurement> addMeasurement(
            @AuthenticationPrincipal UserDetails ud,
            @RequestBody Map<String, Object> body) {
        User me = self(ud);
        CreateMeasurementRequest req = new CreateMeasurementRequest();
        req.setMemberId(me.getId());
        req.setWeight(num(body.get("weight")));
        req.setHeight(num(body.get("height")));
        req.setChest(num(body.get("chest")));
        req.setWaist(num(body.get("waist")));
        req.setHips(num(body.get("hips")));
        req.setArms(num(body.get("arms")));
        req.setLegs(num(body.get("legs")));
        Double bf = num(body.get("bodyFat"));
        if (bf == null) bf = num(body.get("bodyFatPercentage"));
        req.setBodyFatPercentage(bf);
        Object n = body.get("notes");
        if (n != null) req.setNotes(n.toString());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(measurementService.addMeasurement(req, ud.getUsername()));
    }

    // ───────────────────────── PHOTOS ─────────────────────────

    @GetMapping("/photos")
    public ResponseEntity<List<ProgressPhoto>> photos(@AuthenticationPrincipal UserDetails ud) {
        User me = self(ud);
        return ResponseEntity.ok(photoRepository.findByMemberIdOrderByTakenAtDesc(me.getId()));
    }

    @PostMapping("/photos")
    public ResponseEntity<ProgressPhoto> addPhoto(
            @AuthenticationPrincipal UserDetails ud,
            @RequestBody Map<String, Object> body) {
        CreateProgressPhotoRequest req = new CreateProgressPhotoRequest();
        Object url = body.get("photoUrl");
        if (url == null) url = body.get("imageBase64");
        if (url == null) {
            throw new AppException("Photo data required", "بيانات الصورة مطلوبة", HttpStatus.BAD_REQUEST);
        }
        req.setPhotoUrl(url.toString());
        Object cap = body.get("caption");
        if (cap != null) req.setCaption(cap.toString());
        Object takenAt = body.get("takenAt");
        LocalDate when = LocalDate.now();
        if (takenAt != null) {
            String s = takenAt.toString();
            try { when = LocalDate.parse(s.length() >= 10 ? s.substring(0, 10) : s); } catch (Exception ignored) {}
        }
        req.setTakenAt(when);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(photoService.addPhoto(req, ud.getUsername()));
    }

    // ───────────────────────── helpers ─────────────────────────

    private User self(UserDetails ud) {
        return userRepository.findByEmail(ud.getUsername())
                .orElseThrow(() -> new AppException("User not found", "المستخدم غير موجود", HttpStatus.NOT_FOUND));
    }

    private static Double num(Object v) {
        if (v == null) return null;
        if (v instanceof Number n) return n.doubleValue();
        try { return Double.parseDouble(v.toString()); } catch (Exception e) { return null; }
    }
}
