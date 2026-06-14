package com.qawi.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Idempotent DDL migration — runs once per startup BEFORE other seeders.
 * Handles columns that Hibernate's ddl-auto=update cannot safely add
 * (e.g. NOT NULL columns on non-empty tables in PostgreSQL).
 */
@Component
@RequiredArgsConstructor
@Slf4j
@Order(5)
public class SchemaInitializer implements ApplicationRunner {

    private final JdbcTemplate jdbc;

    @Override
    public void run(ApplicationArguments args) {
        // ── member_leads: new CRM fields ──────────────────────────────────────
        ddl("ALTER TABLE member_leads ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'PROSPECT'");
        ddl("UPDATE member_leads SET type = 'PROSPECT' WHERE type IS NULL");

        ddl("ALTER TABLE member_leads ADD COLUMN IF NOT EXISTS email VARCHAR(255)");
        ddl("ALTER TABLE member_leads ADD COLUMN IF NOT EXISTS member_id UUID");
        ddl("ALTER TABLE member_leads ADD COLUMN IF NOT EXISTS coach_id UUID");
        ddl("ALTER TABLE member_leads ADD COLUMN IF NOT EXISTS subscription_start_date DATE");
        ddl("ALTER TABLE member_leads ADD COLUMN IF NOT EXISTS subscription_end_date DATE");
        ddl("ALTER TABLE member_leads ADD COLUMN IF NOT EXISTS last_visit_at TIMESTAMP");
        ddl("ALTER TABLE member_leads ADD COLUMN IF NOT EXISTS last_contacted_at TIMESTAMP");
        ddl("ALTER TABLE member_leads ADD COLUMN IF NOT EXISTS next_follow_up_at DATE");

        // allow null created_by so the backfill seeder can create system records
        ddl("ALTER TABLE member_leads ALTER COLUMN created_by DROP NOT NULL");
        // allow null phone_number so members without phones can be backfilled
        ddl("ALTER TABLE member_leads ALTER COLUMN phone_number DROP NOT NULL");

        // drop old status check constraint — enum now has 8 values (ACTIVE, EXPIRING_SOON, EXPIRED added)
        ddl("ALTER TABLE member_leads DROP CONSTRAINT IF EXISTS member_leads_status_check");

        // ── users: ensure subscription_start_date exists ──────────────────────
        ddl("ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_start_date DATE");

        // ── users: self-training mode flag (NOT NULL with default so Hibernate
        //           ddl-auto=update cannot safely add it to a non-empty table) ──
        ddl("ALTER TABLE users ADD COLUMN IF NOT EXISTS self_training_enabled BOOLEAN NOT NULL DEFAULT false");

        // ── workout_plans: allow coach_id to be NULL for self-training members ──
        ddl("ALTER TABLE workout_plans ALTER COLUMN coach_id DROP NOT NULL");

        // ── staff_profiles: avatar / profile image for coach library ──
        ddl("ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS profile_image_url VARCHAR(500)");

        // ── exercise_templates: cover image for library cards ──
        ddl("ALTER TABLE exercise_templates ADD COLUMN IF NOT EXISTS image_url VARCHAR(500)");

        // ── gym_exercise_overrides: cover image for overridden exercises ──
        ddl("ALTER TABLE gym_exercise_overrides ADD COLUMN IF NOT EXISTS image_url VARCHAR(500)");

        // ── member_leads: source of lead ──
        ddl("ALTER TABLE member_leads ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'MANUAL_VISIT'");
        ddl("UPDATE member_leads SET source = 'MANUAL_VISIT' WHERE source IS NULL");

        log.info("SchemaInitializer: migration complete");
    }

    private void ddl(String sql) {
        try {
            jdbc.execute(sql);
        } catch (Exception e) {
            log.debug("SchemaInitializer skipped: {} — {}", sql, e.getMessage());
        }
    }
}
