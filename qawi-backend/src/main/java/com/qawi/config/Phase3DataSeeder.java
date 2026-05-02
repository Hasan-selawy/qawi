package com.qawi.config;

import com.qawi.entity.*;
import com.qawi.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Component
@RequiredArgsConstructor
@Slf4j
@Order(2)
public class Phase3DataSeeder implements ApplicationRunner {

    private final UserRepository userRepository;
    private final NutritionPlanRepository nutritionPlanRepository;
    private final MealRepository mealRepository;
    private final AttendanceRepository attendanceRepository;
    private final BodyMeasurementRepository bodyMeasurementRepository;
    private final CoachNoteRepository coachNoteRepository;
    private final GymRepository gymRepository;

    @Override
    public void run(ApplicationArguments args) {
        if (nutritionPlanRepository.count() > 0) {
            log.info("Phase 3 data already seeded, skipping.");
            return;
        }

        // Only seed if core users exist
        if (userRepository.count() == 0) {
            log.info("No users found, skipping Phase 3 seeding.");
            return;
        }

        List<User> members = userRepository.findAll().stream()
                .filter(u -> u.getRole() == Role.MEMBER)
                .toList();

        List<User> coaches = userRepository.findAll().stream()
                .filter(u -> u.getRole() == Role.COACH)
                .toList();

        if (members.isEmpty() || coaches.isEmpty()) {
            log.info("No members or coaches, skipping Phase 3 seeding.");
            return;
        }

        User coach = coaches.get(0);
        User coach2 = coaches.size() > 1 ? coaches.get(1) : coach;

        log.info("Seeding Phase 3 data for {} members...", members.size());

        for (int i = 0; i < members.size(); i++) {
            User member = members.get(i);
            User assignedCoach = (i < 2) ? coach : coach2;

            seedNutritionPlan(member, assignedCoach);
            seedAttendance(member);
            seedMeasurements(member, assignedCoach);
            seedCoachNotes(member, assignedCoach);
        }

        log.info("Phase 3 seeding complete.");
    }

    private void seedNutritionPlan(User member, User coach) {
        NutritionPlan plan = nutritionPlanRepository.save(NutritionPlan.builder()
                .memberId(member.getId())
                .coachId(coach.getId())
                .build());

        mealRepository.save(Meal.builder()
                .nutritionPlanId(plan.getId())
                .mealType(MealType.BREAKFAST)
                .description("Oats with banana and protein shake")
                .descriptionAr("شوفان مع موز وبروتين شيك")
                .calories(450).protein(35).orderIndex(0).build());

        mealRepository.save(Meal.builder()
                .nutritionPlanId(plan.getId())
                .mealType(MealType.LUNCH)
                .description("Grilled chicken with rice and salad")
                .descriptionAr("دجاج مشوي مع أرز وسلطة")
                .calories(650).protein(50).orderIndex(1).build());

        mealRepository.save(Meal.builder()
                .nutritionPlanId(plan.getId())
                .mealType(MealType.DINNER)
                .description("Salmon with sweet potato and vegetables")
                .descriptionAr("سمك السلمون مع البطاطا الحلوة والخضروات")
                .calories(550).protein(45).orderIndex(2).build());

        mealRepository.save(Meal.builder()
                .nutritionPlanId(plan.getId())
                .mealType(MealType.SNACK)
                .description("Greek yogurt with almonds")
                .descriptionAr("زبادي يوناني مع لوز")
                .calories(200).protein(15).orderIndex(3).build());
    }

    private void seedAttendance(User member) {
        if (member.getGymId() == null) return;

        // 10 attendance records spread over last 30 days (roughly every 2-3 days)
        int[] daysAgo = {1, 3, 5, 8, 10, 13, 16, 19, 23, 28};
        for (int d : daysAgo) {
            attendanceRepository.save(Attendance.builder()
                    .memberId(member.getId())
                    .gymId(member.getGymId())
                    .checkedInAt(LocalDateTime.now().minusDays(d).withHour(9).withMinute(0))
                    .build());
        }
    }

    private void seedMeasurements(User member, User coach) {
        // Measurement 1 — 30 days ago
        bodyMeasurementRepository.save(BodyMeasurement.builder()
                .memberId(member.getId())
                .recordedBy(coach.getId())
                .weight(82.5).height(178.0)
                .chest(100.0).waist(86.0).hips(98.0)
                .arms(36.0).legs(58.0)
                .bodyFatPercentage(18.5)
                .notes("Initial measurement")
                .recordedAt(LocalDateTime.now().minusDays(30))
                .build());

        // Measurement 2 — today (showing progress)
        bodyMeasurementRepository.save(BodyMeasurement.builder()
                .memberId(member.getId())
                .recordedBy(coach.getId())
                .weight(80.0).height(178.0)
                .chest(102.0).waist(83.0).hips(97.0)
                .arms(37.5).legs(60.0)
                .bodyFatPercentage(16.8)
                .notes("Good progress! Keep it up.")
                .recordedAt(LocalDateTime.now())
                .build());
    }

    private void seedCoachNotes(User member, User coach) {
        coachNoteRepository.save(CoachNote.builder()
                .coachId(coach.getId())
                .memberId(member.getId())
                .note("Member is showing great consistency. Focus on increasing bench press weight.")
                .build());

        coachNoteRepository.save(CoachNote.builder()
                .coachId(coach.getId())
                .memberId(member.getId())
                .note("Adjusted nutrition plan — increase protein intake to 180g/day.")
                .build());
    }
}
