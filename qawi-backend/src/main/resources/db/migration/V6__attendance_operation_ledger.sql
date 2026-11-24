CREATE TABLE attendance_operations (
    id uuid PRIMARY KEY,
    member_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    idempotency_key uuid NOT NULL,
    request_hash varchar(64) NOT NULL,
    response_json text NOT NULL,
    created_at timestamp(6) NOT NULL,
    CONSTRAINT uk_attendance_operation_member_key UNIQUE (member_id, idempotency_key)
);
CREATE INDEX idx_attendance_operation_cleanup ON attendance_operations(created_at);
