-- Move legacy startup DDL into an ordered, transactional migration.
ALTER TABLE member_leads ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'PROSPECT';
UPDATE member_leads SET type = 'PROSPECT' WHERE type IS NULL;
ALTER TABLE member_leads ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE member_leads ADD COLUMN IF NOT EXISTS member_id UUID;
ALTER TABLE member_leads ADD COLUMN IF NOT EXISTS coach_id UUID;
ALTER TABLE member_leads ADD COLUMN IF NOT EXISTS subscription_start_date DATE;
ALTER TABLE member_leads ADD COLUMN IF NOT EXISTS subscription_end_date DATE;
ALTER TABLE member_leads ADD COLUMN IF NOT EXISTS last_visit_at TIMESTAMP;
ALTER TABLE member_leads ADD COLUMN IF NOT EXISTS last_contacted_at TIMESTAMP;
ALTER TABLE member_leads ADD COLUMN IF NOT EXISTS next_follow_up_at DATE;
ALTER TABLE member_leads ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE member_leads ALTER COLUMN phone_number DROP NOT NULL;
ALTER TABLE member_leads DROP CONSTRAINT IF EXISTS member_leads_status_check;
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_start_date DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS self_training_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE workout_plans ALTER COLUMN coach_id DROP NOT NULL;
ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS profile_image_url VARCHAR(500);
ALTER TABLE exercise_templates ADD COLUMN IF NOT EXISTS image_url VARCHAR(500);
ALTER TABLE gym_exercise_overrides ADD COLUMN IF NOT EXISTS image_url VARCHAR(500);
ALTER TABLE member_leads ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'MANUAL_VISIT';
UPDATE member_leads SET source = 'MANUAL_VISIT' WHERE source IS NULL;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS gym_id UUID;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS title_en TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS title_ar TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS category VARCHAR(40);
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS priority VARCHAR(20);
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS action_url VARCHAR(500);
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS read_at TIMESTAMP;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS unique_key VARCHAR(255);
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_users_gym' AND conrelid = 'users'::regclass) THEN
    ALTER TABLE users ADD CONSTRAINT fk_users_gym FOREIGN KEY (gym_id) REFERENCES gyms (id) NOT VALID;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_attendances_gym' AND conrelid = 'attendances'::regclass) THEN
    ALTER TABLE attendances ADD CONSTRAINT fk_attendances_gym FOREIGN KEY (gym_id) REFERENCES gyms (id) NOT VALID;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_attendances_member' AND conrelid = 'attendances'::regclass) THEN
    ALTER TABLE attendances ADD CONSTRAINT fk_attendances_member FOREIGN KEY (member_id) REFERENCES users (id) NOT VALID;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_coach_members_coach' AND conrelid = 'coach_members'::regclass) THEN
    ALTER TABLE coach_members ADD CONSTRAINT fk_coach_members_coach FOREIGN KEY (coach_id) REFERENCES users (id) NOT VALID;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_coach_members_member' AND conrelid = 'coach_members'::regclass) THEN
    ALTER TABLE coach_members ADD CONSTRAINT fk_coach_members_member FOREIGN KEY (member_id) REFERENCES users (id) NOT VALID;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_member_leads_gym' AND conrelid = 'member_leads'::regclass) THEN
    ALTER TABLE member_leads ADD CONSTRAINT fk_member_leads_gym FOREIGN KEY (gym_id) REFERENCES gyms (id) NOT VALID;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_member_leads_member' AND conrelid = 'member_leads'::regclass) THEN
    ALTER TABLE member_leads ADD CONSTRAINT fk_member_leads_member FOREIGN KEY (member_id) REFERENCES users (id) NOT VALID;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_member_leads_coach' AND conrelid = 'member_leads'::regclass) THEN
    ALTER TABLE member_leads ADD CONSTRAINT fk_member_leads_coach FOREIGN KEY (coach_id) REFERENCES users (id) NOT VALID;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_gym_classes_gym' AND conrelid = 'gym_classes'::regclass) THEN
    ALTER TABLE gym_classes ADD CONSTRAINT fk_gym_classes_gym FOREIGN KEY (gym_id) REFERENCES gyms (id) NOT VALID;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_class_bookings_class' AND conrelid = 'class_bookings'::regclass) THEN
    ALTER TABLE class_bookings ADD CONSTRAINT fk_class_bookings_class FOREIGN KEY (class_id) REFERENCES gym_classes (id) NOT VALID;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_class_bookings_member' AND conrelid = 'class_bookings'::regclass) THEN
    ALTER TABLE class_bookings ADD CONSTRAINT fk_class_bookings_member FOREIGN KEY (member_id) REFERENCES users (id) NOT VALID;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_staff_profiles_gym' AND conrelid = 'staff_profiles'::regclass) THEN
    ALTER TABLE staff_profiles ADD CONSTRAINT fk_staff_profiles_gym FOREIGN KEY (gym_id) REFERENCES gyms (id) NOT VALID;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_staff_profiles_user' AND conrelid = 'staff_profiles'::regclass) THEN
    ALTER TABLE staff_profiles ADD CONSTRAINT fk_staff_profiles_user FOREIGN KEY (user_id) REFERENCES users (id) NOT VALID;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_notifications_gym' AND conrelid = 'notifications'::regclass) THEN
    ALTER TABLE notifications ADD CONSTRAINT fk_notifications_gym FOREIGN KEY (gym_id) REFERENCES gyms (id) NOT VALID;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_notifications_user' AND conrelid = 'notifications'::regclass) THEN
    ALTER TABLE notifications ADD CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users (id) NOT VALID;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_scheduled_notifications_gym' AND conrelid = 'scheduled_notifications'::regclass) THEN
    ALTER TABLE scheduled_notifications ADD CONSTRAINT fk_scheduled_notifications_gym FOREIGN KEY (gym_id) REFERENCES gyms (id) NOT VALID;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_scheduled_notifications_target' AND conrelid = 'scheduled_notifications'::regclass) THEN
    ALTER TABLE scheduled_notifications ADD CONSTRAINT fk_scheduled_notifications_target FOREIGN KEY (target_user_id) REFERENCES users (id) NOT VALID;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_gym_member_plans_gym' AND conrelid = 'gym_member_plans'::regclass) THEN
    ALTER TABLE gym_member_plans ADD CONSTRAINT fk_gym_member_plans_gym FOREIGN KEY (gym_id) REFERENCES gyms (id) NOT VALID;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_renewal_requests_gym' AND conrelid = 'renewal_requests'::regclass) THEN
    ALTER TABLE renewal_requests ADD CONSTRAINT fk_renewal_requests_gym FOREIGN KEY (gym_id) REFERENCES gyms (id) NOT VALID;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_renewal_requests_member' AND conrelid = 'renewal_requests'::regclass) THEN
    ALTER TABLE renewal_requests ADD CONSTRAINT fk_renewal_requests_member FOREIGN KEY (member_id) REFERENCES users (id) NOT VALID;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_renewal_requests_plan' AND conrelid = 'renewal_requests'::regclass) THEN
    ALTER TABLE renewal_requests ADD CONSTRAINT fk_renewal_requests_plan FOREIGN KEY (plan_id) REFERENCES gym_member_plans (id) NOT VALID;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_food_entries_gym' AND conrelid = 'food_entries'::regclass) THEN
    ALTER TABLE food_entries ADD CONSTRAINT fk_food_entries_gym FOREIGN KEY (gym_id) REFERENCES gyms (id) NOT VALID;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_food_entries_member' AND conrelid = 'food_entries'::regclass) THEN
    ALTER TABLE food_entries ADD CONSTRAINT fk_food_entries_member FOREIGN KEY (member_id) REFERENCES users (id) NOT VALID;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_meal_suggestions_gym' AND conrelid = 'meal_suggestions'::regclass) THEN
    ALTER TABLE meal_suggestions ADD CONSTRAINT fk_meal_suggestions_gym FOREIGN KEY (gym_id) REFERENCES gyms (id) NOT VALID;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_meal_suggestions_member' AND conrelid = 'meal_suggestions'::regclass) THEN
    ALTER TABLE meal_suggestions ADD CONSTRAINT fk_meal_suggestions_member FOREIGN KEY (member_id) REFERENCES users (id) NOT VALID;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_water_logs_gym' AND conrelid = 'water_logs'::regclass) THEN
    ALTER TABLE water_logs ADD CONSTRAINT fk_water_logs_gym FOREIGN KEY (gym_id) REFERENCES gyms (id) NOT VALID;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_water_logs_member' AND conrelid = 'water_logs'::regclass) THEN
    ALTER TABLE water_logs ADD CONSTRAINT fk_water_logs_member FOREIGN KEY (member_id) REFERENCES users (id) NOT VALID;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_nutrition_targets_gym' AND conrelid = 'nutrition_targets'::regclass) THEN
    ALTER TABLE nutrition_targets ADD CONSTRAINT fk_nutrition_targets_gym FOREIGN KEY (gym_id) REFERENCES gyms (id) NOT VALID;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_nutrition_targets_member' AND conrelid = 'nutrition_targets'::regclass) THEN
    ALTER TABLE nutrition_targets ADD CONSTRAINT fk_nutrition_targets_member FOREIGN KEY (member_id) REFERENCES users (id) NOT VALID;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_nutrition_calendar_plans_gym' AND conrelid = 'nutrition_calendar_plans'::regclass) THEN
    ALTER TABLE nutrition_calendar_plans ADD CONSTRAINT fk_nutrition_calendar_plans_gym FOREIGN KEY (gym_id) REFERENCES gyms (id) NOT VALID;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_nutrition_calendar_plans_member' AND conrelid = 'nutrition_calendar_plans'::regclass) THEN
    ALTER TABLE nutrition_calendar_plans ADD CONSTRAINT fk_nutrition_calendar_plans_member FOREIGN KEY (member_id) REFERENCES users (id) NOT VALID;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_nutrition_plan_days_gym' AND conrelid = 'nutrition_plan_days'::regclass) THEN
    ALTER TABLE nutrition_plan_days ADD CONSTRAINT fk_nutrition_plan_days_gym FOREIGN KEY (gym_id) REFERENCES gyms (id) NOT VALID;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_nutrition_plan_days_member' AND conrelid = 'nutrition_plan_days'::regclass) THEN
    ALTER TABLE nutrition_plan_days ADD CONSTRAINT fk_nutrition_plan_days_member FOREIGN KEY (member_id) REFERENCES users (id) NOT VALID;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_nutrition_plan_days_plan' AND conrelid = 'nutrition_plan_days'::regclass) THEN
    ALTER TABLE nutrition_plan_days ADD CONSTRAINT fk_nutrition_plan_days_plan FOREIGN KEY (plan_id) REFERENCES nutrition_calendar_plans (id) NOT VALID;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_member_reports_gym' AND conrelid = 'member_reports'::regclass) THEN
    ALTER TABLE member_reports ADD CONSTRAINT fk_member_reports_gym FOREIGN KEY (gym_id) REFERENCES gyms (id) NOT VALID;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_member_reports_member' AND conrelid = 'member_reports'::regclass) THEN
    ALTER TABLE member_reports ADD CONSTRAINT fk_member_reports_member FOREIGN KEY (member_id) REFERENCES users (id) NOT VALID;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_member_suggestions_gym' AND conrelid = 'member_suggestions'::regclass) THEN
    ALTER TABLE member_suggestions ADD CONSTRAINT fk_member_suggestions_gym FOREIGN KEY (gym_id) REFERENCES gyms (id) NOT VALID;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_member_suggestions_member' AND conrelid = 'member_suggestions'::regclass) THEN
    ALTER TABLE member_suggestions ADD CONSTRAINT fk_member_suggestions_member FOREIGN KEY (member_id) REFERENCES users (id) NOT VALID;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_workout_plans_member' AND conrelid = 'workout_plans'::regclass) THEN
    ALTER TABLE workout_plans ADD CONSTRAINT fk_workout_plans_member FOREIGN KEY (member_id) REFERENCES users (id) NOT VALID;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_workout_plans_coach' AND conrelid = 'workout_plans'::regclass) THEN
    ALTER TABLE workout_plans ADD CONSTRAINT fk_workout_plans_coach FOREIGN KEY (coach_id) REFERENCES users (id) NOT VALID;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_schedule_days_plan' AND conrelid = 'schedule_days'::regclass) THEN
    ALTER TABLE schedule_days ADD CONSTRAINT fk_schedule_days_plan FOREIGN KEY (workout_plan_id) REFERENCES workout_plans (id) NOT VALID;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_plan_exercises_day' AND conrelid = 'plan_exercises'::regclass) THEN
    ALTER TABLE plan_exercises ADD CONSTRAINT fk_plan_exercises_day FOREIGN KEY (schedule_day_id) REFERENCES schedule_days (id) NOT VALID;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_workout_logs_member' AND conrelid = 'workout_logs'::regclass) THEN
    ALTER TABLE workout_logs ADD CONSTRAINT fk_workout_logs_member FOREIGN KEY (member_id) REFERENCES users (id) NOT VALID;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_workout_logs_exercise' AND conrelid = 'workout_logs'::regclass) THEN
    ALTER TABLE workout_logs ADD CONSTRAINT fk_workout_logs_exercise FOREIGN KEY (plan_exercise_id) REFERENCES plan_exercises (id) NOT VALID;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_coach_notes_coach' AND conrelid = 'coach_notes'::regclass) THEN
    ALTER TABLE coach_notes ADD CONSTRAINT fk_coach_notes_coach FOREIGN KEY (coach_id) REFERENCES users (id) NOT VALID;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_coach_notes_member' AND conrelid = 'coach_notes'::regclass) THEN
    ALTER TABLE coach_notes ADD CONSTRAINT fk_coach_notes_member FOREIGN KEY (member_id) REFERENCES users (id) NOT VALID;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_subscription_history_member' AND conrelid = 'subscription_histories'::regclass) THEN
    ALTER TABLE subscription_histories ADD CONSTRAINT fk_subscription_history_member FOREIGN KEY (member_id) REFERENCES users (id) NOT VALID;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_subscription_history_admin' AND conrelid = 'subscription_histories'::regclass) THEN
    ALTER TABLE subscription_histories ADD CONSTRAINT fk_subscription_history_admin FOREIGN KEY (managed_by_admin_id) REFERENCES users (id) NOT VALID;
  END IF;
END $$;

