---
status: complete
date: 2026-11-24
scope: Phase 0 code and isolated verification; live rollout pending
---

# Phase 0 implementation

Implemented only the audit's Phase 0 code scope. No Phase 1/2 work, commits, deployment, or changes to existing databases.

## Changes

- SEC-001: ADMS/iclock ingestion disabled in Spring Security and its service. Device management permissions are preserved.
- SEC-002: template GET requires COACH and an owning-coach repository lookup. Template-based plan creation uses the same ownership boundary, closing the related copy bypass.
- SEC-003: only the four public POST auth operations are permitted anonymously. Missing/invalid authentication receives 401.
- SEC-004: rate limiting ignores client forwarding headers; forwarding-header interpretation is explicitly disabled. Proxy clients currently share the proxy's rate bucket.
- SEC-005: private Node storage and upload signing return 503 until authentication/ACLs are implemented. Public asset handling remains available.
- SEC-006: 413 tracked target files and two client .env files removed from the index; local env files remain. CI rejects build output/private env files in Git. Existing history was not rewritten.
- DATA-001: class booking, booking cancellation, class cancellation, and capacity edits share a tenant-scoped pessimistic class row lock. Capacity edits cannot reduce capacity below existing bookings.
- DATA-002: self-service and reception lock the member row, return the existing daily check-in on retries, and preserve checkout state. V3 adds database uniqueness by gym/member/calendar day. Legacy duplicates stop migration without automatic deletion.
- ARCH-001: Flyway V1 captures the entity schema; V2 replaces the legacy startup initializer's 31 DDL statements and 48 FKs; V3 adds uniqueness. Hibernate validates by default; automatic baselining and Flyway clean are disabled.
- Demo account seeders are opt-in and excluded from prod/staging. Production checks reject missing/short/development keys, mixed local profile, enabled demo seeding, and known default demo passwords. Compose requires a supplied JWT secret. Static food/pricing seeders remain available.

## Verification

- Red security tests: reproduced anonymous auth 500s, member template access, public ADMS success, and forged-header login limit bypass.
- Red template isolation test: foreign coach received 200 instead of 404.
- Red PostgreSQL concurrency tests: eight simultaneous bookings occupied a one-person class; eight simultaneous self/reception check-ins created eight attendance rows.
- Red storage test: upload route remained active instead of returning 503.
- Final `mvn -B -ntp clean verify`: BUILD SUCCESS. 37 tests discovered; 36 passed, zero failures/errors, one opt-in schema exporter skipped. PostgreSQL migration/concurrency tests ran against a dedicated disposable PostgreSQL 17.11 cluster on loopback port 55439.
- Migration checks: fresh V1-V3 schema, repeat migration with no changes, explicit baseline requirement on nonempty schema, data-preserving baseline/upgrade, SQLSTATE 23505 for duplicate attendance, and rollback without data deletion when history contains duplicates.
- Concurrency checks: one booking for eight contenders; one daily check-in across self/reception calls; cancellation/rebooking works; capacity/tenant boundaries hold; duplicate direct insert fails; another day's attendance succeeds.
- Final `pnpm typecheck`: passed across the workspace.
- Final Node storage test: passed for valid/invalid upload metadata and private downloads with an arbitrary bearer token.
- Git hygiene and `git diff --check`: passed. Local client env files contain only VITE_API_URL and EXPO_PUBLIC_API_URL.
- Packaged JAR inspection: exactly three Flyway migrations and no stale SchemaInitializer class.
- Production-profile packaged-app smoke test on another fresh disposable database: health 200; anonymous profile/ADMS/iclock 401; three applied migrations; zero login accounts seeded.

## Rollout and limits

Read `qawi-backend/PHASE0_DEPLOYMENT.md`. Existing staging/production still require backup/restore rehearsal, schema review, explicit baseline at version 1, duplicate-history decisions, legacy FK review, and credential rotation where applicable. No live rollout has occurred. ADMS/private storage stay disabled. Login buckets remain shared behind a proxy; trusted-proxy configuration and multi-instance rate-limit storage are separate work. Use consistent server time zones for attendance days.

Unrelated pre-existing staged source/docs/graphify changes were preserved. Code changes remain uncommitted for review; Git hygiene intentionally changed the index for target/client-env paths only. Test log files are ignored. Temporary verification processes are stopped after checks; disposable database files are retained in the system temp directory.
