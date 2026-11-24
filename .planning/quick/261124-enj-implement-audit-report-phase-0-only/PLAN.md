# Phase 0 only

Source: AUDIT_REPORT.md section 7. User approved implementation on 2026-11-24.

1. Lock down template reads and copies to owning coaches; return 401 for protected auth endpoints; ignore untrusted forwarding headers; deny ADMS ingestion; disable private Node storage operations.
2. Serialize class bookings/cancellations and capacity edits with scoped class row locks. Serialize daily attendance across self-service and reception; add database uniqueness without deleting historic records.
3. Add Flyway schema baseline and move startup DDL into a versioned migration. Hibernate validates by default. Fail on duplicate legacy attendance pending operator review. Test fresh schema, upgrades, and restart on an isolated PostgreSQL database. Document explicit staging baseline and backup/rollback procedure; do not alter existing user databases.
4. Make demo seeders opt-in and unavailable in production/staging; require an explicit JWT secret, reject known development keys and existing default demo passwords in production/staging.
5. Untrack build output and client env files while retaining local files; add CI hygiene gate.
6. Run meaningful security, tenant isolation, concurrency, migration and production configuration checks. Record remaining deployment actions and preserve unrelated staged work. No Phase 1/2 changes or commits containing user work.
