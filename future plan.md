# Qawi Future Plan

Qawi does not need a rewrite. It needs a focused stabilization phase that improves security, data integrity, maintainability, and production readiness before more large features are added.

## P0 — Security and Data Integrity

### 1. Enforce Tenant Isolation Centrally

Tenant safety currently depends on every controller and service remembering to include `gymId`. A missing filter could expose one gym's data to another gym.

Planned work:

- Expand `AccessGuard` to support every tenant-scoped role.
- Prefer repository methods that require both the entity ID and `gymId`, such as `findByIdAndGymId`.
- Add PostgreSQL foreign keys and tenant-related constraints where possible.
- Avoid unrestricted `findById` calls for tenant-owned entities.
- Add integration tests proving Gym A cannot read, update, or delete Gym B's records.

### 2. Secure and Complete the ZkTeco Flow

The current public device flow primarily identifies hardware by serial number. It records attendance without applying subscription access rules and does not implement the documented turnstile unlock authorization.

Planned work:

- Authenticate devices or place them behind a secured, allowlisted network gateway.
- Verify that the device and biometric enrollment are active.
- Verify that the device, enrollment, member, and gym all belong together.
- Apply `SubscriptionStatusUtil` before granting physical access.
- Separate attendance ingestion from access authorization.
- Add replay and duplicate-event protection.
- Define and test the exact device response required to unlock or deny the turnstile.

### 3. Protect Authenticated `/auth` Endpoints

The security configuration currently permits all `/api/v1/auth/**` endpoints, including operations that require an authenticated principal.

Planned work:

- Keep only `/auth/login`, `/auth/register`, `/auth/refresh`, and `/auth/logout` public.
- Require authentication for `/auth/me` and `/auth/change-password`.
- Return a consistent `401` response when the authenticated principal is missing.
- Add controller security tests for every authentication endpoint.

### 4. Add Authorization and Security Integration Tests

The test suite is too small for a multi-tenant application handling subscriptions, financial data, and physical access.

Required coverage:

- Every role and major controller.
- Cross-gym read and mutation attempts.
- Coaches attempting to access unassigned members.
- Active, grace-period, expired, pending, and inactive subscriptions.
- Refresh-token replay and concurrent rotation.
- Unknown and spoofed ZkTeco devices.
- Concurrent class booking and renewal approval.
- Public versus authenticated endpoint behavior.

## P1 — Correctness and Maintainability

### 5. Fix Class-Capacity Concurrency

Class booking currently counts active bookings and then saves a new booking. Two simultaneous requests can both observe the final available spot and overbook the class.

Planned work:

- Lock the class row during booking or implement an atomic database reservation operation.
- Add a unique constraint on `(class_id, member_id)`.
- Make cancellation and rebooking idempotent.
- Add concurrency tests for the final available class spot.

### 6. Break Up `MemberController`

`MemberController` currently handles workouts, automatic plan shifting, meals, nutrition, measurements, profiles, and renewals while coordinating many repositories directly.

Extract focused services:

- `MemberWorkoutService`
- `MemberNutritionService`
- `MemberMeasurementService`
- `MemberRenewalService`

Controllers should validate HTTP input and delegate to transactional domain services. Repository coordination and business rules should live in services.

### 7. Consolidate the Nutrition Systems

`NutritionController`, `NutritionV2Controller`, and `NutritionV3Controller` overlap and represent different generations of the same domain.

Planned work:

- Select one canonical nutrition model and API.
- Document which features from each version must survive.
- Migrate web and mobile clients to the canonical API.
- Provide temporary compatibility adapters for deployed clients.
- Deprecate and eventually remove the older controllers, entities, and routes.

### 8. Complete Refresh-Token Support in the Clients

The backend issues rotating refresh tokens, but the web and mobile clients largely rely only on the long-lived access token.

Planned work:

- Store refresh tokens securely.
- Use secure device storage on mobile instead of plain AsyncStorage for long-lived credentials.
- Automatically refresh an expired access token.
- Retry the original request once after a successful refresh.
- Prevent multiple simultaneous refresh attempts.
- Log out and clear credentials when refresh fails.
- Reduce access-token lifetime from seven days to approximately 15–30 minutes.

### 9. Define a Shared API Contract

Backend DTOs and frontend TypeScript models are manually duplicated and have already drifted.

Planned work:

- Generate an OpenAPI document from the Spring backend.
- Generate shared web and mobile client types.
- Generate or centralize role and enum definitions.
- Add request and response contract validation.
- Detect breaking API changes in CI.
- Eliminate naming drift such as `FINANCE` versus `ACCOUNTANT`, `RECEPTION` versus `RECEPTIONIST`, and singular versus plural endpoint paths.

## P2 — Production Hardening

### 10. Replace Hibernate `ddl-auto=update`

Automatic production schema mutation is difficult to review, reproduce, and roll back.

Planned work:

- Introduce Flyway.
- Baseline the existing production schema.
- Store every future schema change in a numbered migration.
- Set Hibernate to `validate` in production.
- Gradually retire `SchemaInitializer` after its changes are represented by migrations.
- Test migrations against copies of realistic production data.

### 11. Fix Build and Repository Hygiene

Planned work:

- Stop tracking `qawi-backend/target` build artifacts.
- Add or repair the Maven wrapper.
- Make the PNPM `preinstall` script cross-platform instead of requiring Unix `sh`.
- Pin the PNPM version using the `packageManager` field.
- Remove unused Replit packages after confirming there are no consumers.
- Decide whether the Express upload server should remain or be moved into Spring Boot.
- Normalize the repository to UTF-8 and replace corrupted Arabic/mojibake strings.

### 12. Reduce Database Query Amplification

Several important flows perform repository queries inside loops, increasing latency as data grows.

Prioritize:

- Workout exercise and template loading.
- Coach dashboard member summaries.
- Notification audience expansion.
- Class response construction.
- Workout history aggregation.

Use joins, projections, batch queries, entity graphs, and purpose-built aggregate queries. Add query-count tests for important endpoints.

### 13. Harden Production Configuration and Operations

Planned work:

- Replace wildcard CORS with explicitly configured frontend origins.
- Move login lockouts and rate-limit state to Redis when deploying multiple backend instances.
- Disable demo seeders by default outside development.
- Validate required secrets and environment variables at startup.
- Add structured audit logging for administrative, subscription, and financial changes.
- Add monitoring for authentication failures, tenant-access violations, notification failures, and device anomalies.
- Establish backup, restore, migration rollback, and incident-response procedures.

## Recommended Execution Order

The first implementation milestone should contain:

1. Tenant-isolation enforcement and tests.
2. ZkTeco security and access authorization.
3. Correct `/auth` endpoint authorization.
4. Flyway database migrations.
5. `MemberController` service extraction.

These changes remove the largest security and maintenance risks before the next major feature cycle.
