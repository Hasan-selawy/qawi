# Phase 2 implementation and rollout

Scope is the seven Phase 2 items in AUDIT_REPORT.md. Phase 1 remains separate, including client refresh/SecureStore/httpOnly sessions, general pagination/query tuning, Java 21 standardization, container hardening, and distributed rate limits. Existing Phase 0 restrictions still apply.

## Application and compatibility

- Spring is now the only backend. The disabled Express api-server and unused Node database/object-storage packages are retired. Existing cloud objects are not deleted. The former private/upload routes stay unavailable; migrate any old `/api/storage/...` image references to approved hosted HTTPS assets before relying on those images. Web/mobile image controls now accept HTTPS image URLs and make no storage-sidecar requests.
- Nutrition V2 owns current targets, food/water persistence, analysis, summaries, and workflow policy. V3 is a request/response compatibility adapter with unit/field translation. Older V3 writes now respect the canonical workflow rather than bypassing it. Legacy V1 flat-plan data and endpoints remain deprecated during the compatibility window. Do not drop those tables or remove routes until real client/data migration is verified. No legacy records were silently converted or deleted.
- Springdoc generates the real `/v3/api-docs` contract, restricted to SUPER_ADMIN. Principals are omitted; bearer security and stable path-based operation IDs are included. `lib/api-spec/openapi.json` replaces the old stub. React Query and Zod clients are generated from this contract; the mobile attendance path uses the typed generated client. Other existing handwritten calls remain compatible. Zod validators are exported directly and generated DTO types are under the `models` namespace to avoid name collisions.
- Monetary persistence and DTOs use BigDecimal/numeric(19,3), preserving JOD's three fractional digits. JSON remains numeric for compatibility. Perform authoritative financial calculations on the server; JavaScript numbers are not arbitrary-precision money. V4 stops if legacy subscription values would materially lose precision. Tiny binary floating-point artifacts are rounded to three digits. Zero prices remain allowed; validate configured prices in staging.

## Privacy controls

These controls cover body measurements and biometric enrollment metadata stored by Qawi. They do not claim full PDPL compliance or whole-account deletion.

- MEMBER `GET /api/v1/privacy/me`: uncached JSON export of that member's measurements, enrollment metadata, and pending device erasures. No client-supplied member ID is accepted.
- MEMBER `DELETE /api/v1/privacy/me` with `{"measurements":true,"biometrics":true}`: erase selected server records belonging to that member. Both flags false is rejected. Repeating the request is safe.
- Biometric templates live on physical devices, not in these database rows. Server deletion creates durable V5 device-erasure tasks. It does **not** claim the hardware was erased.
- GYM_ADMIN `GET /api/v1/privacy/device-erasures` lists pending tasks only in the caller's gym. After removing the template on the physical device, call `POST /api/v1/privacy/device-erasures/{id}/confirm` with `{"confirmed":true}`. Confirmation clears the retained member/device identifiers while keeping the task ID, gym, and timestamps as an audit receipt.
- Retention is off by default, with dry-run on and no assumed legal duration. Configure the owner-approved jurisdiction/policy first:

  ```text
  QAWI_MEASUREMENT_RETENTION_DAYS=<approved days>
  QAWI_BIOMETRIC_RETENTION_DAYS=<approved days>
  QAWI_RETENTION_ENABLED=true
  QAWI_RETENTION_DRY_RUN=true
  ```

  Review dry-run counts and device operations. Set dry-run false only after that review. Zero means no automatic expiration for that category. The daily job handles at most 500 old rows per category per run; monitor a full batch as a possible backlog and adjust the cron if the approved policy needs faster draining.
- Backups, external device stores, exports, and log archives need their own approved access/retention policies. After restoring a backup, reapply later erasures before reopening the system; do not treat restored historical records as fresh consent.

## Mobile attendance and idempotency

- New MEMBER endpoint: `POST /api/v1/attendance/me/operations` with `idempotencyKey` (UUID), `operation` (CHECKIN/CHECKOUT), and `occurredAt` (ISO instant).
- V6 stores the response and request fingerprint under a member-scoped key in the same transaction as attendance. Concurrent retries return the original result; reusing a key with a different payload returns 409. Different members may safely use the same UUID.
- The technical replay ledger is pruned only after the accepted offline window plus two days. Original attendance rows are preserved. Keep that window consistent across application instances.
- Original timestamps are converted to the server's calendar/time zone. All backend instances must share that time zone. New operations older than seven days or over five minutes in the future are rejected. Offline attendance is an app log, not proof of physical entry; ADMS ingestion remains disabled.
- Queues are stored per account and writes/sync are serialized. A request keeps its original UUID and timestamp across retry. The generated client uses the captured account's token; queued records never replay under a later account's token.
- Network errors, 408, 429, and server errors use bounded backoff. 401 pauses until authentication. Permanent 4xx responses become reviewable rejected records and stop automatic retries. The user must review attendance/subscription status before discarding those records. Storage failures do not report a false successful save.
- Old global `pendingCheckins` records have no reliable owner and are preserved on-device without replay. A support-assisted ownership review is required to recover them. They are not assigned to whoever logs in next.

## Observability

Set `SENTRY_DSN` through the deployment secret/environment configuration and optionally `SENTRY_ENVIRONMENT`. Without a DSN, no Sentry events are sent. The core SDK reports sanitized unexpected server exception types and application stack locations, with request/user/breadcrumb/extra data removed. It does not upload exception messages, SQL values, request bodies, or causes. Unexpected errors also increment `qawi.server.errors`; `/actuator/metrics` is exposed only to SUPER_ADMIN. Local request logs identify role rather than login email.

Before enabling external delivery, confirm the project's region/access/retention settings and trigger a controlled non-sensitive test exception in staging. This implementation has not configured a live Sentry account or sent test telemetry to one.

## Backups and restore drills

Use Python 3.11+ with PostgreSQL client tools compatible with the database server. Supply `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, and `PGDATABASE` through the environment or approved credential mechanism; do not put passwords in command arguments.

```text
python scripts/database-backup.py backup --output <private-directory>/qawi-YYYYMMDD.dump
python scripts/database-backup.py drill --archive <private-directory>/qawi-YYYYMMDD.dump --target-db qawi_drill_YYYYMMDD
```

The backup uses PostgreSQL's consistent custom format and writes a SHA-256 manifest. A drill verifies the checksum, creates a new `qawi_drill_*` database, restores transactionally with stop-on-error, compares table row counts, and checks migration status. Existing target databases are refused; the tool never drops or cleans a database. Restored drill databases remain for application checks and explicit cleanup.

Count checks detect many incomplete restores, but are not proofs of byte-for-byte equality or business correctness. Back up during a quiet period when using count validation; concurrent writes can make the count comparison unusable even though pg_dump itself is consistent. Run application/security checks against the restored database before calling a drill complete.

For a disposable restored `qawi_drill_*` database, set the PG environment to that database and run `python scripts/phase2-smoke.py --start-app qawi-backend/target/qawi-1.0.0.jar`. It starts the production-profile app on loopback only, creates disposable login/data fixtures, checks authorization and Phase 2 behavior through real HTTP requests, and stops its process. CI performs this restored-app check. Never use those public fixture credentials in a live environment.

Backup archives contain sensitive data. Store them on an access-restricted encrypted volume/object store outside Git, set owner-only ACLs on Windows, and configure off-site storage, scheduling, retention, and restore-time objectives for the actual deployment. This repository supplies tooling and CI/local drills; it does not provision production backup infrastructure or assume a backup retention policy.

## Database rollout

1. Preserve a tested backup and previous application artifact. Stop writes for the reviewed rollout.
2. If the database predates Phase 0, first follow PHASE0_DEPLOYMENT.md's restored-staging schema review and explicit baseline at version 1. Never baseline a Phase 0 database again.
3. On a current Phase 0 database, Flyway applies V4-V6. Review rejected legacy prices before retrying V4; never bypass precision checks blindly.
4. Start staging with an explicit strong JWT secret and demo seeding disabled. Check decimal round trips, nutrition V2/V3 parity/workflow restrictions, member-only privacy export/erase, cross-gym device-task denial, and concurrent attendance retries. Rehearse backup restoration and erasure reconciliation.
5. Deploy only after staging/data/policy review. No live migrations, automatic retention deletion, Sentry account changes, or production backup scheduling were performed by this implementation.
6. Rollback across the money/schema transition requires a write freeze and tested backup/application restore. Do not revert entity types while retaining an unchecked new schema, edit applied migration checksums, or re-enable Hibernate update.

## Reproduction

```text
mvn -B -ntp clean verify                        # qawi-backend; disposable PHASE0_DB_URL enables PostgreSQL tests
node scripts/export-openapi.mjs                # repo root, after backend contract test exports target/openapi.json
pnpm --filter @workspace/api-spec run codegen
pnpm typecheck
pnpm --filter @workspace/qawi-mobile test
pnpm --filter @workspace/qawi-web run build
node scripts/check-git-hygiene.mjs
```

`node scripts/export-openapi.mjs --check` detects contract drift; CI also regenerates clients and checks for changes. PostgreSQL migration/concurrency tests only target the disposable database specified explicitly by the test runner.

References: [Springdoc compatibility](https://springdoc.org/v2/#what-is-the-compatibility-matrix-of-springdoc-openapi-with-spring-boot), [Sentry Java options](https://docs.sentry.io/platforms/java/configuration/options/), [PostgreSQL pg_restore](https://www.postgresql.org/docs/17/app-pgrestore.html).
