# Phase 0 deployment

For the current application, also follow [Phase 2 deployment](PHASE2_DEPLOYMENT.md). The Node storage server and its test command below were retired in Phase 2; that command is historical. Current fresh databases apply all six migrations.

Phase 0 code changes do not migrate any existing developer, staging, or production database. Run the rollout below against a restored staging copy before deploying to a database with real data.

## Runtime changes

- ADMS/iclock ingestion is disabled at both the HTTP boundary and service layer. Device management remains available to its existing roles. Physical attendance ingestion must stay disabled until device authentication and subscription checks are implemented.
- Node upload signing and private-object downloads return 503. Public static assets remain public. Existing signed upload URLs are not revoked by this change; let them expire or revoke their storage permissions separately if needed.
- Only POST login, register, refresh, and logout are public under `/api/v1/auth`. Other auth endpoints require a valid bearer token and return 401 for anonymous requests.
- Template reads and template-based plan creation require the owning coach. Foreign templates return 404.
- Check-ins return the existing attendance record for the same gym/member/calendar day, including after checkout. The day uses the server's local calendar and the stored timestamp without time zone. All instances must use the same time zone.
- Login rate limiting uses the socket peer, never client forwarding headers. Behind a reverse proxy, clients share a bucket for that proxy. Keep `server.forward-headers-strategy=none`; configure and test a trusted proxy policy before enabling forwarded addresses. Rate limits remain single-instance as scoped by the audit.
- Default schema mode is Hibernate `validate`, with Flyway migrations. Startup DDL has moved from `SchemaInitializer` into V2. Future schema edits require new migrations.

## Fresh database

1. Provide a unique, randomly generated `JWT_SECRET` with at least 32 bytes. `.env.example` deliberately leaves it blank; Compose refuses a missing secret. Do not reuse the test keys or development fallback.
2. Set `SPRING_PROFILES_ACTIVE=prod` (Compose now sets this). Do not combine `local` with `prod` or `staging`.
3. Leave `qawi.seed.enabled=false`. Demo account seeders are opt-in in development and excluded from prod/staging even when requested. The static food catalog and pricing seeders remain enabled; they create no login accounts. Provision real accounts and any required exercise catalog through controlled setup/import, not demo seeding.
4. Start the backend. Flyway applies V1, V2, V3 and Hibernate validates the result. No production account is created with a default password.

## Existing database: staging rehearsal first

1. Stop writes, take a database backup, and verify restoration to an isolated staging database. Retain the old application artifact and backup for rollback.
2. Compare the restored schema with V1. V1 represents the current entity schema; V2 incorporates the legacy additive DDL and tenant foreign keys. Baseline is an assertion about an existing schema, not a tool that creates missing V1 tables. Bring older/incompatible schemas to the expected baseline through a reviewed migration before proceeding.
3. Review duplicate daily attendance without deleting history automatically:

   ```sql
   SELECT gym_id, member_id, checked_in_at::date AS attendance_day,
          count(*) AS records, array_agg(id ORDER BY checked_in_at) AS ids
   FROM attendances
   GROUP BY gym_id, member_id, checked_in_at::date
   HAVING count(*) > 1;
   ```

   V3 refuses to run while duplicates exist. Review and archive/reconcile them with an approved data decision and backup. Do not remove legitimate sessions blindly.
4. Review legacy orphan references before validating tenant foreign keys. V2 uses `NOT VALID` to preserve old rows while enforcing future writes. For each added FK, resolve its orphan rows and run `ALTER TABLE <table> VALIDATE CONSTRAINT <constraint>;` in staging before launch. V2 lists all 48 constraints.
5. Rotate or remove existing demo accounts that still use `password123` or `qawi_super_2024`. The prod/staging startup guard refuses the known demo identities with those passwords. Seeding never rotates already-existing credentials.
6. Configure Flyway CLI with the restored staging database's `FLYWAY_URL`, `FLYWAY_USER`, and `FLYWAY_PASSWORD` through the environment. Use Flyway 9.22.3, matching this Spring Boot dependency set. Verify the destination, then explicitly baseline the reviewed schema at version 1:

   ```text
   flyway -baselineVersion=1 baseline
   ```

   Never enable automatic `baseline-on-migrate`. An unbaselined, nonempty database intentionally fails startup.
7. Start the backend with `staging`, the explicit JWT secret, and the staging datasource. Flyway applies only V2/V3. Check `/actuator/health`, login, profile, owner-only templates, booking capacity, and repeat check-in behavior. Restart once and confirm that no migrations rerun.
8. After a successful rehearsal and data review, repeat the backup/baseline/migration procedure during a production write freeze. This repository change has not performed those steps against live infrastructure.

## Rollback

Do not set `ddl-auto=update`, edit applied migration checksums, or run Flyway clean. If migration fails, PostgreSQL rolls back that migration; fix the reported data/schema prerequisite before retrying. If rollback after a successful migration is required, stop writes and restore the tested pre-migration backup together with the previous application artifact. The previous application may create duplicate daily check-ins and is incompatible with the new uniqueness rule.

## Verification commands

```powershell
# PHASE0_DB_URL must point only to a disposable test PostgreSQL database.
# Supply PHASE0_DB_USER and PHASE0_DB_PASSWORD through the environment.
mvn -B -ntp clean verify  # from qawi-backend
pnpm typecheck           # from repository root
pnpm --filter @workspace/api-server test
node scripts/check-git-hygiene.mjs
```

CI supplies a disposable PostgreSQL database and runs the migration/concurrency tests. Those tests skip when `PHASE0_DB_URL` is absent. `GenerateBaselineTest` is an opt-in schema export tool and normally skips; do not regenerate an applied V1 migration.

Git hygiene removes `target/` and client `.env` files from the index while preserving their local files. It does not rewrite Git history. The untracked client environment files contain public client configuration keys; any independently discovered historical secret requires separate rotation.

References: [Spring Boot 3.2 database initialization](https://docs.spring.io/spring-boot/docs/3.2.12/reference/html/howto.html#howto.data-initialization), [Flyway baseline safety](https://documentation.red-gate.com/flyway/reference/configuration/flyway-namespace/flyway-baseline-on-migrate-setting).
