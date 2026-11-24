---
status: complete
date: 2026-11-24
scope: Phase 2 code and isolated verification; live rollout pending
---

# Phase 2 implementation

Implemented the audit's Phase 2 code scope. Phase 1 remains excluded. All work is uncommitted; prior Phase 0 and unrelated staged changes remain intact. No live database, external monitoring account, production backup schedule, or physical device was changed.

## Delivered

1. **Nutrition consolidation:** V2 owns current persistence, analysis, workflow and validation. V3 translates legacy request/response fields and water units. Legacy V1 flat-plan routes/data remain deprecated during the compatibility window; removing those records requires verified client/data migration rather than an automatic table drop.
2. **Real contract and clients:** Springdoc exports 201 paths and 242 operations with stable operation IDs, bearer security, hidden principals, and SUPER_ADMIN-only docs. Generated React Query/Zod packages replace the health-only stub. The mobile attendance path uses the generated typed client. Repeated generation is deterministic across 312 files; CI checks backend-contract and generated-client drift.
3. **Single backend:** retired the disabled Node api-server and unused Node database/object-storage packages and their workspace/CI references. Hosted HTTPS image URL controls replace broken uploads on web/mobile, preserving Arabic/English support and accessible labels/errors. Existing cloud objects were not deleted.
4. **Money migration:** monetary entities, DTOs and calculations use BigDecimal/numeric(19,3). V4 preserves JOD precision and refuses material legacy precision loss. Server-side validation rejects negative and over-precision subscription/tier inputs. JSON numbers remain compatible with existing clients.
5. **Privacy:** member-only uncached export and selective erasure for measurements/enrollment metadata; durable V5 hardware-erasure tasks; gym-scoped confirmation clears retained member/device identifiers. Retention is configurable, disabled by default, dry-run by default, and bounded to 500 rows/category/run. User requested the best overall option: preserve those conservative defaults rather than inventing a jurisdiction or statutory duration. No scheduled deletion is enabled.
6. **Observability and recovery:** opt-in sanitized Sentry reporting and unexpected-error metrics; protected `/actuator/metrics`; role-based request logging. Backup/checksum/restore tools refuse existing/source targets and corrupt archives. CI restores into a new database and exercises the packaged production-profile application over real HTTP.
7. **Offline attendance:** V6 member-scoped operation ledger, original timestamps, request fingerprints, atomic response replay, key-conflict detection and bounded offline time window. Technical replay records expire after the accepted window plus two days, without deleting attendance. Mobile storage is per account, writes/sync serialized, IDs retained across retries, network requests bounded to 15 seconds, transient failures backed off, and permanent failures retained for review. Unattributed legacy global queues are preserved without replay. Pending/rejected state is visible, and rejected operations do not produce a success haptic.

## Verification evidence

- Money regression reproduced the previous floating-point/Integer DTO mismatch before conversion.
- Clean full backend verification: **50 discovered, 49 passed, zero failures/errors, one optional schema exporter skipped**. Includes old Phase 0 regression gates, decimal migrations and rollback, privacy scope/retention, adapter translation, input constraints, and PostgreSQL concurrency/idempotency.
- Focused rechecks after bulk ledger cleanup/metrics changes: **5 passed**. After explicit forbidden-response handling: **9 security/contract checks passed**. Packaging succeeded after stopping the old Windows JVM that held the JAR open.
- Final workspace typecheck: passed. Frozen/offline installation: passed. Retired importer blocks were pruned from the lockfile.
- Final queue tests: **8 passed**, covering duplicate events, reconnect single-flight, stable retry keys/timestamps, backoff/order, 401/429 behavior, permanent failures, account switching, enqueue during sync, and unreadable storage preservation.
- Web production build: passed. Vite emitted component sourcemap warnings and a large-chunk warning; bundle splitting remains outside this Phase 2 scope.
- Final Expo Android export: passed, including the new crypto/generated-client path. Output is an ignored test bundle, not an app-store release.
- OpenAPI export matches Spring output. Generated clients are repeatable across 312 files.
- Actual backup/restore drill: **55 tables and 32 test rows**, matching counts and SHA-256 manifest. The source was quiescent/disposable. Existing-target, source-target, and corrupt-archive attempts were refused without destructive fallback.
- Restored production-profile JAR smoke: passed through actual login-issued tokens. Verified health, protected docs/metrics, disabled ADMS, exact tier pricing/rejected precision, canonical nutrition validation/workflow, timestamped attendance replay/conflict, uncached private export, selective erasure, cross-gym denial, and identifier clearing after device-erasure acknowledgement.
- Real HTTP testing found servlet error dispatch replacing forbidden statuses with 401. Security now writes explicit JSON 403 responses; both focused tests and the restored-app smoke pass.
- Git hygiene and whitespace checks passed. No private env/build/backup files were added to Git. Local client env files remain.

## Deployment and limits

Follow `qawi-backend/PHASE2_DEPLOYMENT.md`. Restore/review staging, apply V4-V6 after existing Phase 0, reconcile precision exceptions, and verify actual client/data compatibility before retiring V1. Configure real Sentry delivery, encrypted/off-site backup scheduling/retention, and the owner-approved privacy policy in the actual deployment. Device confirmation is an operator acknowledgement, not automated proof of hardware erasure. Restore procedures must reapply subsequent erasures before reopening access.

Local database tests used PostgreSQL 17.11 and emitted Flyway 9's newer-server warning; the existing Compose deployment still specifies PostgreSQL 15. Temporary test application processes were stopped by the smoke runner; the isolated PostgreSQL cluster is stopped at task completion. Disposable databases and ignored backup artifacts are retained for inspection. No live deployment or data migration occurred.
