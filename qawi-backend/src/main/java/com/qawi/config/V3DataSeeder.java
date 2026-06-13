package com.qawi.config;

import com.qawi.entity.*;
import com.qawi.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Component
@RequiredArgsConstructor
@Slf4j
@Order(20)
public class V3DataSeeder implements ApplicationRunner {

    private final UserRepository userRepository;
    private final GymRepository gymRepository;
    private final PasswordEncoder passwordEncoder;
    private final StaffProfileRepository staffProfileRepository;
    private final StaffAttendanceRepository staffAttendanceRepository;
    private final NutritionTargetRepository nutritionTargetRepository;
    private final FoodEntryRepository foodEntryRepository;
    private final WaterLogRepository waterLogRepository;
    private final AttendanceRepository attendanceRepository;
    private final CoachMemberRepository coachMemberRepository;

    @Override
    public void run(ApplicationArguments args) {
        Optional<com.qawi.entity.Gym> gymOpt = gymRepository.findByName("Iron Peak Gym")
                .or(() -> gymRepository.findAll().stream().findFirst());
        if (gymOpt.isEmpty()) {
            log.info("No gym found, skipping V3 seeder.");
            return;
        }

        com.qawi.entity.Gym gym = gymOpt.get();
        healStaffGymId(gym);
        String hashed = passwordEncoder.encode("password123");

        seedReceptionist(gym, hashed);
        seedAccountant(gym, hashed);
        seedHr(gym, hashed);
        seedStaffProfiles(gym);
        seedStaffAttendance(gym);
        seedNutritionData(gym);
        seedAttendanceHistory(gym);
        seedNutritionist(gym, hashed);

        log.info("V3 data seeding complete.");
    }

    /**
     * Self-healing: if RECEPTIONIST / ACCOUNTANT / HR users already exist but were
     * seeded against the wrong gym (e.g. due to non-deterministic findFirst ordering),
     * re-assign them to the correct gym now.
     */
    private void healStaffGymId(Gym gym) {
        List<String> staffEmails = List.of(
                "reception@ironpeak.com", "accountant@ironpeak.com", "hr@ironpeak.com");
        staffEmails.forEach(email -> userRepository.findByEmail(email).ifPresent(u -> {
            if (!gym.getId().equals(u.getGymId())) {
                u.setGymId(gym.getId());
                userRepository.save(u);
                log.info("Healed gymId for staff user: {}", email);
            }
        }));
    }

    private void seedReceptionist(Gym gym, String hashed) {
        if (!userRepository.existsByEmail("reception@ironpeak.com")) {
            userRepository.save(User.builder()
                    .name("Reception Desk")
                    .email("reception@ironpeak.com")
                    .password(hashed)
                    .role(Role.RECEPTIONIST)
                    .gymId(gym.getId())
                    .build());
            log.info("Seeded receptionist user.");
        }
    }

    private void seedAccountant(Gym gym, String hashed) {
        if (!userRepository.existsByEmail("accountant@ironpeak.com")) {
            userRepository.save(User.builder()
                    .name("Finance Team")
                    .email("accountant@ironpeak.com")
                    .password(hashed)
                    .role(Role.ACCOUNTANT)
                    .gymId(gym.getId())
                    .build());
            log.info("Seeded accountant user.");
        }
    }

    private void seedHr(Gym gym, String hashed) {
        if (!userRepository.existsByEmail("hr@ironpeak.com")) {
            userRepository.save(User.builder()
                    .name("HR Manager")
                    .email("hr@ironpeak.com")
                    .password(hashed)
                    .role(Role.HR)
                    .gymId(gym.getId())
                    .build());
            log.info("Seeded HR user.");
        }
    }

    private void seedStaffProfiles(Gym gym) {
        List<User> staffUsers = userRepository.findByGymId(gym.getId()).stream()
                .filter(u -> u.getRole() == Role.COACH || u.getRole() == Role.RECEPTIONIST
                        || u.getRole() == Role.ACCOUNTANT || u.getRole() == Role.HR)
                .toList();

        String[] titles = {"Head Coach", "Senior Coach", "Reception Manager", "Senior Accountant", "HR Specialist"};
        EmploymentType[] types = {EmploymentType.FULL_TIME, EmploymentType.FULL_TIME, EmploymentType.FULL_TIME,
                EmploymentType.PART_TIME, EmploymentType.CONTRACT};
        double[] salaries = {800, 700, 500, 600, 550};

        int i = 0;
        for (User u : staffUsers) {
            if (staffProfileRepository.findByUserId(u.getId()).isEmpty()) {
                int idx = i % titles.length;
                staffProfileRepository.save(StaffProfile.builder()
                        .gymId(gym.getId())
                        .userId(u.getId())
                        .jobTitle(titles[idx])
                        .startDate(LocalDate.now().minusMonths(6 + idx))
                        .salary(BigDecimal.valueOf(salaries[idx]))
                        .employmentType(types[idx])
                        .emergencyContact("+962 7" + (9000000 + idx))
                        .notes("Seeded staff profile")
                        .build());
                i++;
            }
        }
        log.info("Seeded {} staff profiles.", i);
    }

    private void seedStaffAttendance(Gym gym) {
        List<StaffProfile> profiles = staffProfileRepository.findByGymId(gym.getId());
        if (profiles.isEmpty()) return;

        String[] statuses = {"PRESENT", "PRESENT", "PRESENT", "LATE", "PRESENT", "PRESENT", "ABSENT"};
        int seeded = 0;
        for (StaffProfile p : profiles) {
            for (int d = 6; d >= 0; d--) {
                LocalDate date = LocalDate.now().minusDays(d);
                if (staffAttendanceRepository.findByStaffIdAndDate(p.getId(), date).isEmpty()) {
                    String status = statuses[d % statuses.length];
                    staffAttendanceRepository.save(StaffAttendance.builder()
                            .staffId(p.getId())
                            .date(date)
                            .checkIn(date.atTime(8, 30 + (d % 15)))
                            .checkOut(date.atTime(17, 0))
                            .status(status)
                            .build());
                    seeded++;
                }
            }
        }
        log.info("Seeded {} staff attendance records.", seeded);
    }

    private void seedNutritionData(Gym gym) {
        List<User> members = userRepository.findByGymIdAndRole(gym.getId(), Role.MEMBER);
        List<User> coaches = userRepository.findByGymIdAndRole(gym.getId(), Role.COACH);
        if (members.isEmpty() || coaches.isEmpty()) return;

        User coach = coaches.get(0);
        NutritionGoal[] goals = {NutritionGoal.MUSCLE_GAIN, NutritionGoal.WEIGHT_LOSS, NutritionGoal.MAINTENANCE, NutritionGoal.RECOMPOSITION};

        int targetIdx = 0;
        for (User member : members) {
            if (!nutritionTargetRepository.existsByMemberId(member.getId())) {
                nutritionTargetRepository.save(NutritionTarget.builder()
                        .memberId(member.getId())
                        .coachId(coach.getId())
                        .calories(2000 + (targetIdx * 200))
                        .proteinG(150 + targetIdx * 10)
                        .carbsG(200 + targetIdx * 20)
                        .fatG(60 + targetIdx * 5)
                        .waterMl(2500 + targetIdx * 250)
                        .goal(goals[targetIdx % goals.length])
                        .build());
                targetIdx++;
            }
        }

        User sam = members.get(0);
        String[] foods = {"Chicken Shawarma", "Grilled Chicken", "Rice", "Eggs", "Hummus"};
        String[] foodsAr = {"شاورما دجاج", "دجاج مشوي", "أرز", "بيض", "حمص"};
        double[] cals = {550, 239, 130, 155, 177};
        double[] prots = {35, 27, 3, 13, 8};
        double[] carbs = {45, 0, 28, 1, 20};
        double[] fats = {18, 14, 0.3, 11, 8};
        String[] mealTypes = {"BREAKFAST", "LUNCH", "LUNCH", "BREAKFAST", "SNACK"};

        for (int d = 6; d >= 0; d--) {
            LocalDateTime base = LocalDate.now().minusDays(d).atTime(8, 0);
            for (int f = 0; f < Math.min(3, foods.length); f++) {
                final int fi = f;
                LocalDateTime logTime = base.plusHours(f * 4L);
                boolean exists = foodEntryRepository.findByMemberIdAndDateRange(
                        sam.getId(), logTime.toLocalDate().atStartOfDay(),
                        logTime.toLocalDate().atStartOfDay().plusDays(1))
                        .stream().anyMatch(e -> e.getFoodName().equals(foods[fi]));
                if (!exists) {
                    foodEntryRepository.save(FoodEntry.builder()
                            .memberId(sam.getId())
                            .foodName(foods[f])
                            .foodNameAr(foodsAr[f])
                            .rawInput(foods[f])
                            .mealType(mealTypes[f])
                            .quantity(1.0)
                            .unit("serving")
                            .calories(cals[f])
                            .proteinG(prots[f])
                            .carbsG(carbs[f])
                            .fatG(fats[f])
                            .fiberG(2.0)
                            .sugarG(1.5)
                            .confidence(0.9)
                            .source("SEEDED")
                            .loggedAt(logTime)
                            .build());
                }
            }
            waterLogRepository.save(WaterLog.builder()
                    .memberId(sam.getId())
                    .amountMl(500)
                    .loggedAt(base.plusHours(1))
                    .build());
        }
        log.info("Seeded nutrition targets and food entries.");
    }

    private void seedAttendanceHistory(Gym gym) {
        List<User> members = userRepository.findByGymIdAndRole(gym.getId(), Role.MEMBER);
        int seeded = 0;
        for (User m : members) {
            for (int d = 13; d >= 0; d--) {
                LocalDateTime checkin = LocalDate.now().minusDays(d).atTime(7, 30 + (d % 30));
                List<Attendance> existing = attendanceRepository.findByMemberIdAndCheckedInAtAfterOrderByCheckedInAtDesc(
                        m.getId(), checkin.minusHours(1));
                boolean alreadyExists = existing.stream().anyMatch(a ->
                        a.getCheckedInAt().toLocalDate().equals(checkin.toLocalDate()));
                if (!alreadyExists && d % 3 != 0) {
                    attendanceRepository.save(Attendance.builder()
                            .memberId(m.getId())
                            .gymId(gym.getId())
                            .checkedInAt(checkin)
                            .checkedOutAt(checkin.plusHours(1).plusMinutes(30))
                            .build());
                    seeded++;
                }
            }
        }
        log.info("Seeded {} attendance history records.", seeded);
    }

    private void seedNutritionist(Gym gym, String hashed) {
        if (!userRepository.existsByEmail("nutritionist@ironpeak.com")) {
            userRepository.save(User.builder()
                    .name("Maya Al-Rashid")
                    .email("nutritionist@ironpeak.com")
                    .password(hashed)
                    .role(Role.NUTRITIONIST)
                    .gymId(gym.getId())
                    .build());
            log.info("Seeded NUTRITIONIST: nutritionist@ironpeak.com / password123");
        }
    }
}
