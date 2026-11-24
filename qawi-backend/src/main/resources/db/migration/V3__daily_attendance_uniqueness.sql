-- Preserve history: legacy duplicates must be reviewed by an operator, never silently deleted.
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM attendances
    GROUP BY gym_id, member_id, checked_in_at::date HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate daily attendance exists. Review gym_id, member_id, checked_in_at::date groups before migrating; no rows were deleted.';
  END IF;
END $$;

-- Application check-in days and this index use the calendar date of the stored local timestamp.
CREATE UNIQUE INDEX uk_attendance_gym_member_day
    ON attendances (gym_id, member_id, (checked_in_at::date));

CREATE UNIQUE INDEX IF NOT EXISTS uk_class_member_booking
    ON class_bookings (class_id, member_id);
