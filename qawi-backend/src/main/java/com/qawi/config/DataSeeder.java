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

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Component
@RequiredArgsConstructor
@Slf4j
@Order(1)
public class DataSeeder implements ApplicationRunner {

    private final GymRepository gymRepository;
    private final UserRepository userRepository;
    private final CoachMemberRepository coachMemberRepository;
    private final PasswordEncoder passwordEncoder;
    private final ExerciseCategoryRepository categoryRepository;
    private final ExerciseTemplateRepository exerciseTemplateRepository;

    @Override
    public void run(ApplicationArguments args) {
        if (userRepository.count() > 0) {
            seedSuperAdminIfMissing();
            seedExercisesIfMissing();
            return;
        }

        log.info("Seeding database...");
        String hashed = passwordEncoder.encode("password123");

        // SUPER_ADMIN
        userRepository.save(User.builder()
                .name("Qawi Admin")
                .email("super@qawi.com")
                .password(passwordEncoder.encode("qawi_super_2024"))
                .role(Role.SUPER_ADMIN)
                .build());

        // Gym
        Gym gym = gymRepository.save(Gym.builder()
                .name("Iron Peak Gym")
                .ownerId(null)
                .subscriptionPlan(SubscriptionPlan.PRO)
                .subscriptionExpiresAt(LocalDateTime.now().plusYears(1))
                .build());

        // GYM_ADMIN
        User admin = userRepository.save(User.builder()
                .name("Admin")
                .email("admin@ironpeak.com")
                .password(hashed)
                .role(Role.GYM_ADMIN)
                .gymId(gym.getId())
                .build());

        gym.setOwnerId(admin.getId());
        gymRepository.save(gym);

        // Coaches
        User jordan = userRepository.save(User.builder()
                .name("Coach Jordan").email("coach.jordan@ironpeak.com").password(hashed)
                .role(Role.COACH).gymId(gym.getId()).build());

        User morgan = userRepository.save(User.builder()
                .name("Coach Morgan").email("coach.morgan@ironpeak.com").password(hashed)
                .role(Role.COACH).gymId(gym.getId()).build());

        // Members
        LocalDate today = LocalDate.now();

        User sam = userRepository.save(User.builder()
                .name("Sam").email("sam@ironpeak.com").password(hashed)
                .role(Role.MEMBER).gymId(gym.getId())
                .subscriptionStartDate(today.minusDays(30)).subscriptionEndDate(today.plusDays(30)).build());

        User casey = userRepository.save(User.builder()
                .name("Casey").email("casey@ironpeak.com").password(hashed)
                .role(Role.MEMBER).gymId(gym.getId())
                .subscriptionStartDate(today.minusDays(25)).subscriptionEndDate(today.plusDays(5)).build());

        User riley = userRepository.save(User.builder()
                .name("Riley").email("riley@ironpeak.com").password(hashed)
                .role(Role.MEMBER).gymId(gym.getId())
                .subscriptionStartDate(today.minusDays(30)).subscriptionEndDate(today.plusDays(30)).build());

        User drew = userRepository.save(User.builder()
                .name("Drew").email("drew@ironpeak.com").password(hashed)
                .role(Role.MEMBER).gymId(gym.getId())
                .subscriptionStartDate(today.minusDays(60)).subscriptionEndDate(today.minusDays(5)).build());

        coachMemberRepository.save(CoachMember.builder().coachId(jordan.getId()).memberId(sam.getId()).build());
        coachMemberRepository.save(CoachMember.builder().coachId(jordan.getId()).memberId(casey.getId()).build());
        coachMemberRepository.save(CoachMember.builder().coachId(morgan.getId()).memberId(riley.getId()).build());
        coachMemberRepository.save(CoachMember.builder().coachId(morgan.getId()).memberId(drew.getId()).build());

        log.info("User seeding complete. Users: {}", userRepository.count());
        seedExercisesIfMissing();
    }

    private void seedSuperAdminIfMissing() {
        if (!userRepository.existsByEmail("super@qawi.com")) {
            log.info("Adding SUPER_ADMIN seed user...");
            userRepository.save(User.builder()
                    .name("Qawi Admin").email("super@qawi.com")
                    .password(passwordEncoder.encode("qawi_super_2024"))
                    .role(Role.SUPER_ADMIN).build());
        }
    }

    private void seedExercisesIfMissing() {
        if (categoryRepository.count() > 0) {
            log.info("Exercises already seeded, skipping.");
            return;
        }

        log.info("Seeding exercise library...");

        // ── CHEST ──────────────────────────────────────────────────────────────
        ExerciseCategory chest = cat("Chest", "صدر", null);
        ex(chest, "Bench Press", "بنش برس", 4, 10, 60, "https://www.youtube.com/watch?v=rT7DgCr-3pg");
        ex(chest, "Incline Press", "ضغط مائل", 4, 10, 50, "https://www.youtube.com/watch?v=DbFgADa2PL8");
        ex(chest, "Cable Fly", "كيبل فلاي", 3, 12, 20, "https://www.youtube.com/watch?v=Iwe6AmxVf7o");
        ex(chest, "Push Ups", "تمرين الضغط", 4, 20, 0, "https://www.youtube.com/watch?v=IODxDxX7oi4");
        ex(chest, "Dips", "ديبس", 3, 12, 0, "https://www.youtube.com/watch?v=2z8JmcrW-As");
        ex(chest, "Decline Press", "ضغط هبوطي", 3, 10, 55, "https://www.youtube.com/watch?v=LfyQBUKR8SE");
        ex(chest, "Chest Press Machine", "ماكينة الصدر", 3, 12, 40, "https://www.youtube.com/watch?v=xUm0BiZCWlQ");
        ex(chest, "Pec Deck", "بيك ديك", 3, 12, 30, "https://www.youtube.com/watch?v=Z57CtFmRMxA");
        ex(chest, "Dumbbell Fly", "فلاي دمبل", 3, 12, 15, "https://www.youtube.com/watch?v=eozdVDA78K0");
        ex(chest, "Incline Dumbbell Press", "ضغط دمبل مائل", 4, 10, 25, "https://www.youtube.com/watch?v=8iPEnn-ltC8");

        // ── LEGS ───────────────────────────────────────────────────────────────
        ExerciseCategory legs = cat("Legs", "أرجل", null);
        ex(legs, "Barbell Squat", "سكوات", 4, 10, 80, "https://www.youtube.com/watch?v=ultWZbUMPL8");
        ex(legs, "Deadlift", "ديدليفت", 4, 8, 100, "https://www.youtube.com/watch?v=op9kVnSso6Q");
        ex(legs, "Leg Press", "ليج بريس", 4, 12, 120, "https://www.youtube.com/watch?v=IZxyjW7MPJQ");
        ex(legs, "Lunges", "لانجز", 3, 12, 20, "https://www.youtube.com/watch?v=QOVaHwm-Q6U");
        ex(legs, "Leg Curl", "ليج كيرل", 3, 12, 40, "https://www.youtube.com/watch?v=1Tq3QdYUuHs");
        ex(legs, "Leg Extension", "ليج إكستنشن", 3, 12, 35, "https://www.youtube.com/watch?v=YyvSfVjQeL0");
        ex(legs, "Romanian Deadlift", "رومانيان ديدليفت", 4, 10, 70, "https://www.youtube.com/watch?v=JCXUYuzwNrM");
        ex(legs, "Calf Raises", "رفع الكعب", 4, 20, 40, "https://www.youtube.com/watch?v=-M4-G8p1fCI");
        ex(legs, "Hack Squat", "هاك سكوات", 3, 10, 90, "https://www.youtube.com/watch?v=0tn5K9NlCfo");
        ex(legs, "Sumo Squat", "سومو سكوات", 3, 12, 60, "https://www.youtube.com/watch?v=QKKZ9AGYTVk");

        // ── BACK ───────────────────────────────────────────────────────────────
        ExerciseCategory back = cat("Back", "ظهر", null);
        ex(back, "Pull Up", "بول أب", 4, 8, 0, "https://www.youtube.com/watch?v=eGo4IYlbE5g");
        ex(back, "Lat Pulldown", "لات بول داون", 4, 10, 50, "https://www.youtube.com/watch?v=CAwf7n6Luuc");
        ex(back, "Barbell Row", "بارييل رو", 4, 10, 70, "https://www.youtube.com/watch?v=FWJR5Ve8bnQ");
        ex(back, "Seated Cable Row", "كيبل رو", 3, 12, 45, "https://www.youtube.com/watch?v=GZbfZ033f74");
        ex(back, "T-Bar Row", "تي بار رو", 3, 10, 60, "https://www.youtube.com/watch?v=j3Igk5nyZE4");
        ex(back, "Single Arm Row", "رو بذراع واحدة", 3, 12, 25, "https://www.youtube.com/watch?v=pYcpY20QaE8");
        ex(back, "Face Pull", "فيس بول", 3, 15, 20, "https://www.youtube.com/watch?v=HSoHeSjFHmQ");
        ex(back, "Straight Arm Pulldown", "ستريت آرم", 3, 12, 25, "https://www.youtube.com/watch?v=kiuVA0gs3EI");
        ex(back, "Hyperextension", "هايبر إكستنشن", 3, 15, 0, "https://www.youtube.com/watch?v=ph3pddpKzzw");
        ex(back, "Deadlift", "ديدليفت", 4, 8, 100, "https://www.youtube.com/watch?v=op9kVnSso6Q");

        // ── SHOULDERS ─────────────────────────────────────────────────────────
        ExerciseCategory shoulders = cat("Shoulders", "أكتاف", null);
        ex(shoulders, "Overhead Press", "أوفر هيد برس", 4, 10, 50, "https://www.youtube.com/watch?v=2yjwXTZQDDI");
        ex(shoulders, "Lateral Raise", "رفع جانبي", 4, 12, 10, "https://www.youtube.com/watch?v=3VcKaXpzqRo");
        ex(shoulders, "Front Raise", "رفع أمامي", 3, 12, 10, "https://www.youtube.com/watch?v=sOoBRCfMsMY");
        ex(shoulders, "Rear Delt Fly", "فلاي خلفي", 3, 15, 8, "https://www.youtube.com/watch?v=EA7u4Q_8HQ0");
        ex(shoulders, "Arnold Press", "أرنولد برس", 3, 10, 15, "https://www.youtube.com/watch?v=6Z15_WdXmVw");
        ex(shoulders, "Shrugs", "شراغز", 4, 12, 60, "https://www.youtube.com/watch?v=g6qbq4Lf1FI");
        ex(shoulders, "Cable Lateral Raise", "كيبل جانبي", 3, 15, 8, "https://www.youtube.com/watch?v=PPdPkO3jAMc");
        ex(shoulders, "Machine Press", "ماكينة أكتاف", 3, 12, 35, "https://www.youtube.com/watch?v=WvLMauqrnK8");
        ex(shoulders, "Upright Row", "أبرايت رو", 3, 12, 30, "https://www.youtube.com/watch?v=amCU-ziHITM");
        ex(shoulders, "Face Pull", "فيس بول", 3, 15, 20, "https://www.youtube.com/watch?v=HSoHeSjFHmQ");

        // ── ARMS ──────────────────────────────────────────────────────────────
        ExerciseCategory arms = cat("Arms", "أذرع", null);
        ex(arms, "Barbell Curl", "بارييل كيرل", 3, 12, 30, "https://www.youtube.com/watch?v=kwG2ipFRgfo");
        ex(arms, "Hammer Curl", "هامر كيرل", 3, 12, 15, "https://www.youtube.com/watch?v=zC3nLlEvin4");
        ex(arms, "Tricep Pushdown", "ترايسب", 3, 12, 25, "https://www.youtube.com/watch?v=2-LAMcpzODU");
        ex(arms, "Skull Crusher", "سكال كراشر", 3, 10, 20, "https://www.youtube.com/watch?v=d_KZxkY_0cM");
        ex(arms, "Preacher Curl", "بريتشر كيرل", 3, 12, 20, "https://www.youtube.com/watch?v=fIWP-FRFNU0");
        ex(arms, "Cable Curl", "كيبل كيرل", 3, 12, 15, "https://www.youtube.com/watch?v=NFzTWp2qpiE");
        ex(arms, "Overhead Tricep", "ترايسب أوفر هيد", 3, 12, 20, "https://www.youtube.com/watch?v=nRiJVZDpdL0");
        ex(arms, "Concentration Curl", "كونسنتريشن كيرل", 3, 12, 12, "https://www.youtube.com/watch?v=Jvj2wV0vOYU");
        ex(arms, "Dips", "ديبس", 3, 12, 0, "https://www.youtube.com/watch?v=2z8JmcrW-As");
        ex(arms, "Close Grip Bench", "بنش ضيق", 3, 10, 50, "https://www.youtube.com/watch?v=nEF0bv2FW94");

        // ── CORE ──────────────────────────────────────────────────────────────
        ExerciseCategory core = cat("Core", "كور", null);
        ex(core, "Plank", "بلانك", 3, 1, 0, "https://www.youtube.com/watch?v=pSHjTRCQxIw");
        ex(core, "Crunches", "كرانتش", 4, 20, 0, "https://www.youtube.com/watch?v=Xyd_fa5zoEU");
        ex(core, "Leg Raises", "رفع الأرجل", 3, 15, 0, "https://www.youtube.com/watch?v=l4kQd9eWclE");
        ex(core, "Russian Twist", "روسيان تويست", 3, 20, 5, "https://www.youtube.com/watch?v=wkD8rjkodUI");
        ex(core, "Ab Wheel", "عجلة البطن", 3, 10, 0, "https://www.youtube.com/watch?v=rMvwVtlqjTE");
        ex(core, "Cable Crunch", "كيبل كرانتش", 3, 15, 20, "https://www.youtube.com/watch?v=_x7T0b8tPMU");
        ex(core, "Hanging Knee Raise", "رفع الركبة", 3, 15, 0, "https://www.youtube.com/watch?v=hdng3Nm1x_E");
        ex(core, "Side Plank", "بلانك جانبي", 3, 1, 0, "https://www.youtube.com/watch?v=_rdfjFSFKMY");
        ex(core, "Mountain Climbers", "ماونتن كلايمبرز", 3, 30, 0, "https://www.youtube.com/watch?v=nmwgirgXLYM");
        ex(core, "Bicycle Crunch", "كرانتش دراجة", 3, 20, 0, "https://www.youtube.com/watch?v=9FGilxCbdz8");

        // ── CARDIO ────────────────────────────────────────────────────────────
        ExerciseCategory cardio = cat("Cardio", "كارديو", null);
        ex(cardio, "Treadmill", "جهاز الجري", 1, 30, 0, "https://www.youtube.com/watch?v=ZQcb5nDnLJk");
        ex(cardio, "Rowing Machine", "روينج", 1, 20, 0, "https://www.youtube.com/watch?v=H0r0HNE6gow");
        ex(cardio, "Stair Climber", "سلم متحرك", 1, 20, 0, "https://www.youtube.com/watch?v=cwRBLBrLnq4");
        ex(cardio, "Jump Rope", "تخطي الحبل", 3, 100, 0, "https://www.youtube.com/watch?v=FJmRQ5iTXKE");
        ex(cardio, "Cycling", "دراجة", 1, 30, 0, "https://www.youtube.com/watch?v=MQ5MjBhm-Jc");
        ex(cardio, "Elliptical", "إليبتيكال", 1, 25, 0, "https://www.youtube.com/watch?v=XjQjFMbkRoY");
        ex(cardio, "HIIT", "هيت", 4, 8, 0, "https://www.youtube.com/watch?v=ml6cT4AZdqI");
        ex(cardio, "Box Jumps", "بوكس جامبس", 4, 10, 0, "https://www.youtube.com/watch?v=hxldG9BIGmk");
        ex(cardio, "Battle Ropes", "حبال المعركة", 4, 30, 0, "https://www.youtube.com/watch?v=ej3uwCGHhZ4");
        ex(cardio, "Burpees", "بيربيز", 4, 15, 0, "https://www.youtube.com/watch?v=dZgVxmf6jkA");

        log.info("Exercise seeding complete. Categories: {}, Exercises: {}",
                categoryRepository.count(), exerciseTemplateRepository.count());
    }

    private ExerciseCategory cat(String name, String nameAr, String iconUrl) {
        return categoryRepository.save(ExerciseCategory.builder()
                .name(name).nameAr(nameAr).iconUrl(iconUrl).build());
    }

    private void ex(ExerciseCategory category, String name, String nameAr,
                    int sets, int reps, double weight, String videoUrl) {
        exerciseTemplateRepository.save(ExerciseTemplate.builder()
                .categoryId(category.getId())
                .name(name).nameAr(nameAr)
                .defaultSets(sets).defaultReps(reps).defaultWeight(weight)
                .videoUrl(videoUrl)
                .isCustom(false)
                .build());
    }
}
