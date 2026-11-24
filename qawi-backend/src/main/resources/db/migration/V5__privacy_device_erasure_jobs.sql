CREATE TABLE biometric_erasure_jobs (
    id uuid PRIMARY KEY,
    gym_id uuid NOT NULL REFERENCES gyms(id),
    member_id uuid,
    device_serial varchar(255),
    device_user_id varchar(255),
    requested_at timestamp(6) NOT NULL,
    confirmed_at timestamp(6)
);
CREATE INDEX idx_device_erasure_pending ON biometric_erasure_jobs(gym_id, requested_at) WHERE confirmed_at IS NULL;
CREATE INDEX idx_measurement_retention ON body_measurements(recorded_at);
CREATE INDEX idx_enrollment_retention ON biometric_enrollments(enrolled_at);
