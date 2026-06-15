# Qawi Platform — System Design Rationale & Replit-to-Production Migration Guide

> **Audience:** The founder (software engineer) taking this project from Replit to local development and self-hosted production.
> **Purpose:** Explain why every major architectural decision was made, what the tradeoffs are, and exactly what must change when leaving the Replit environment.

---

# PART A — SYSTEM DESIGN RATIONALE

## 1. Multi-Tenancy Approach

### What was chosen
The platform uses a **Shared Database, Shared Schema** model with **logical isolation** (not physical). Every entity that belongs to a gym stores `gymId` as a **plain UUID column** (`java.util.UUID`) with no JPA `@ManyToOne`, `@OneToMany`, `@JoinColumn`, or foreign key annotations. Isolation is enforced entirely in the service layer.

### Why it was chosen
This was a pragmatic decision during rapid prototyping. The project was built feature-by-feature across many phases, and adding JPA relationship annotations would have required constant schema changes every time a new entity was introduced. With plain UUID columns, adding a new table (e.g., `member_leads`, `nutrition_calendar_plans`) is a single entity class with no relationship mapping. The `gymId` is set explicitly when the record is created, and every repository query includes `WHERE gym_id = ?`.

**Example from `User.java`:**
```java
@Column(name = "gym_id")
private UUID gymId;  // No @ManyToOne, no @JoinColumn
```

**Example from `GymClassRepository.java`:**
```java
List<GymClass> findByGymIdOrderByDateTimeAsc(UUID gymId);
```

### What alternatives were considered
- **JPA relationship mapping** with `@ManyToOne(Gym.class)` — would have provided referential integrity and cascading behavior but adds schema coupling and requires careful `FetchType` tuning to avoid N+1 queries.
- **Separate schema per tenant** — would have given true isolation but dramatically complicates connection pooling, migrations, and backup strategy.
- **Separate database per tenant** — overkill for a SaaS with hundreds of small gyms sharing the same feature set.

### What tradeoffs this creates
**Gained:**
- Extremely fast schema evolution — no Flyway migrations needed for new tables.
- Simple, flat query patterns that are easy to read and optimize.
- No risk of JPA cascade surprises deleting unexpected records.

**Given up:**
- No database-level foreign key constraints on gym boundaries. A `gymId` can point to a deleted gym without the DB complaining.
- No JPA automatic lazy loading — every related entity must be fetched explicitly via repository.
- Manual join logic in services instead of `JOIN FETCH` via JPA. The `CoachMember` link table is queried manually (`coachMemberRepository.findByCoachId`) to check coach assignments.
- Risk of developers accidentally forgetting to filter by `gymId` in new repository queries.

### What problems came up
During the **Phase 4 nutrition system** build, a new `NutritionCalendarPlan` entity was added. Without a JPA relationship to `User`, the service had to manually join via `userRepository.findById(memberId)` for every nutrition plan lookup. This is boilerplate but predictable. The bigger issue was ensuring no `gymId` leak in `CoachMember` — a coach from Gym A could theoretically be assigned to a member from Gym B if the `CoachMember` creation endpoint didn't validate `gymId` equality. This is why `AccessGuard.assertCoachManagesMember()` does **three** checks: role=COACH, same gymId, and active `CoachMember` assignment.

---

## 2. Authentication & Session Strategy

### What was chosen
- **JWT tokens** with HS256 signing, 7-day expiry (604,800,000 ms).
- **No refresh token** — single long-lived access token.
- **Web storage:** `localStorage` under key `qawi_token`.
- **Mobile storage:** `AsyncStorage` under key `qawi_token`.
- **BCrypt password hashing** via `BCryptPasswordEncoder` with default strength (10 rounds).
- **CORS:** `allowCredentials=false` with wildcard origins (`*`).

### Why it was chosen
The 7-day token was chosen for **mobile UX**: gym members are not software engineers who want to re-login every hour. Coaches checking in members at 5 AM don't want to discover their session expired. The stateless model is simple — no Redis, no session store, no token revocation table.

The CORS wildcard is safe because the system uses **stateless Bearer JWTs** (no cookies). `allowCredentials=false` means the browser will never send cookies, so CSRF is not a concern. This eliminated the need to maintain an allowlist of origins during rapid development when Replit domains change constantly.

`localStorage` on web was chosen because:
1. The JWT is never a cookie (no CSRF risk from localStorage).
2. The API is on a different origin from the web frontend in Replit's environment, so `HttpOnly` cookies would require explicit CORS credential handling.
3. The 401 handler in `api.ts` (web) immediately clears localStorage and redirects to login — effectively making XSS-stolen tokens short-lived in practice.

### What alternatives were considered
- **Refresh token rotation** with a `refresh_tokens` table in PostgreSQL. This is the "correct" production approach but requires a token revocation endpoint and a Redis-backed blacklist for logout. Deferred.
- **HttpOnly Secure cookies** with `SameSite=Strict`. This would require the API and web to share a domain or use a subdomain, which was impossible in Replit's multi-artifact routing model.
- **OAuth 2.0 / OpenID Connect** with a provider like Clerk. This would have added a third-party dependency and billing complexity for a gym in Saudi Arabia.

### What tradeoffs this creates
**Gained:**
- Zero infrastructure for sessions (no Redis, no DB session table).
- Simple client code: one token, one header.
- Works across all three surfaces (web, mobile, API server) without cookie-domain negotiation.

**Given up:**
- **No server-side logout.** If a user's token is stolen, it is valid for 7 days. There is no "revoke all sessions" feature.
- **localStorage is XSS-vulnerable.** If an attacker injects a script into the web app, they can read `qawi_token`. The mitigation is the short-ish lifespan and the fact that the app has no user-generated HTML that would enable XSS.
- **No refresh token rotation** means a leaked token can be used indefinitely until expiry. In production, you should implement a refresh token system with a short-lived access token (15 min) and a longer-lived refresh token (7 days) stored in a `refresh_tokens` table with a `revoked_at` column.

### What problems came up
In the mobile app, the `EXPO_PUBLIC_DOMAIN` environment variable was initially hardcoded as a fallback:
```typescript
"https://d4769cb1-1efe-49e8-bc76-43e3163caa75-00-sdutkzkwul7u.pike.replit.dev:9000/api/v1"
```
This was a **Replit-specific UUID domain**. When the Replit workspace went to sleep, the first API call would hit an HTML wakeup interstitial page instead of JSON. The fix was a retry loop in `api.ts` (mobile) that detects HTML responses and retries with backoff for up to ~30 seconds. This is a **Replit-specific hack** that should be removed in production.

---

## 3. Database Schema Management

### What was chosen
- **Hibernate `ddl-auto=update`** — schema is auto-generated and auto-modified on every Spring Boot startup.
- **No Flyway, no Liquibase** — no formal migration tool.
- **Soft delete via `isActive=false`** — records are never physically deleted.
- **A `SchemaInitializer` bean** (`@Order(5)`) runs on startup to handle DDL that `ddl-auto=update` cannot safely do (e.g., adding `NOT NULL` columns to non-empty tables).

### Why it was chosen
This was a **time-pressure decision**. During rapid feature development across 7+ phases, adding a new entity (e.g., `NutritionCalendarPlan`, `GymLead`, `MealSuggestion`) only required creating the `@Entity` class. The table would appear on the next Spring Boot restart. No migration file to write, no version number to bump.

The `SchemaInitializer` was added later when the codebase had real data. `ddl-auto=update` can add nullable columns safely, but it **cannot** add `NOT NULL` columns to tables with rows. `SchemaInitializer` uses `JdbcTemplate` to run `ALTER TABLE ... ADD COLUMN IF NOT EXISTS ...` with `DEFAULT` values, making the migration idempotent.

**Example from `SchemaInitializer.java`:**
```java
ddl("ALTER TABLE users ADD COLUMN IF NOT EXISTS self_training_enabled BOOLEAN NOT NULL DEFAULT false");
```

Soft delete (`isActive=false`) was chosen because gyms are small businesses where "accidentally deleting a member" is a real risk. Data is cheap; recovering a deleted record is not.

### What alternatives were considered
- **Flyway/Liquibase from day one** — the industry standard. Would have required a `src/main/resources/db/migration/` directory and versioned SQL files. This is the correct approach for production.
- **Manual schema creation** via `schema.sql` / `data.sql` — too rigid for rapid iteration.
- **Hibernate `create-drop`** — used in early tests but abandoned because it destroys seed data on every restart.

### What tradeoffs this creates
**Gained:**
- Schema changes take 30 seconds (add entity, restart Spring Boot) instead of 30 minutes (write migration, test migration, run migration).
- The `SchemaInitializer` + `ddl-auto=update` combination handles ~90% of schema evolution safely.

**Given up:**
- **Production data risk.** `ddl-auto=update` can alter columns in ways that lose data (e.g., changing a `VARCHAR` length). In production with real customer data, this is dangerous.
- **No rollback.** If a schema change breaks something, there is no migration to undo. You would have to write a manual `ALTER TABLE` to reverse.
- **Team coordination.** If two developers add entities with clashing table names, the conflict is only discovered at runtime, not at CI time.
- **Idempotency is not guaranteed.** `SchemaInitializer` wraps DDL in `try/catch` and logs skipped errors, but a failed migration may leave the schema in a partially migrated state.

### What problems came up
During Phase 5 (Sales CRM), adding `source` to `member_leads` required a default value because the table was not empty. `SchemaInitializer` handled this:
```java
ddl("ALTER TABLE member_leads ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'MANUAL_VISIT'");
ddl("UPDATE member_leads SET source = 'MANUAL_VISIT' WHERE source IS NULL");
```
But this is manual work every time. If you forget to add a `SchemaInitializer` line for a `NOT NULL` column, Spring Boot will fail to start with a PostgreSQL constraint error. This happened twice during development and was caught by the startup logs.

---

## 4. Feature Flag Implementation

### What was chosen
There are **two** feature flag systems:

1. **Per-gym boolean flags** in the `Gym` entity: `nutritionEnabled`, `pushNotificationsEnabled`, `customBrandingEnabled`, `classBookingEnabled`, `analyticsAdvancedEnabled`. These are **hard boolean columns** used for actual code-level feature gating.

2. **Marketing feature lists** in `PlatformTier` as **JSON strings** (`features`, `featuresAr`). These are stored as raw text, parsed via Jackson `ObjectMapper` in `PlatformTierService`.

### Why it was chosen
The `PlatformTier` JSON approach is purely for **marketing display**. The `features` string contains a JSON array like `["Unlimited Workouts", "Priority Support", "Custom Branding"]` that renders on the public pricing page. It allows the Super Admin to update marketing copy without touching the database schema.

The actual enforcement uses the `Gym` booleans. `GymFeatureService.isEnabled(gym, Feature.NUTRITION)` checks `gym.isNutritionEnabled()` — a direct boolean column. This creates a clean separation: **marketing truth** (what the pricing page says) vs. **code truth** (what the API actually allows).

### What alternatives were considered
- **A separate `FeatureFlag` entity** with many-to-many to `Gym` — would have required a join table (`gym_features`) and complex queries. Overkill for 5 features.
- **A single `features` JSONB column on `Gym`** — would have merged marketing and enforcement into one blob. This would make feature gating slower (parse JSON on every API call) and harder to query.
- **Environment variables** for feature flags — would require a redeploy to toggle a feature, which is unacceptable for a multi-tenant SaaS.

### What tradeoffs this creates
**Gained:**
- Simple schema for feature enforcement — just boolean columns.
- Flexible marketing copy without schema changes.
- `GymFeatureService.publicConfig()` returns a clean JSON structure that the frontend uses to show/hide tabs.

**Given up:**
- **Feature count is hardcoded.** Adding a new feature requires a new column on `Gym` and a new enum value in `GymFeatureService.Feature`. This is fine for 5 features but would become painful at 50.
- **No per-user feature flags.** The system only supports per-gym toggles. A "beta tester" member cannot be given early access to a new feature.
- **PlatformTier JSON is not queryable.** You cannot search for all tiers that include "Priority Support" in the database — you would need to parse JSON in every row.

### What problems came up
During Phase 6, the `nutritionWorkflow` enum (`COACH_ONLY`, `NUTRITIONIST_ONLY`, `COACH_AND_NUTRITIONIST`) was added to `Gym`. This was initially stored as a `VARCHAR` with a default, which `SchemaInitializer` had to handle. The feature flag system grew from a simple boolean to a three-state enum, which `GymFeatureService` had to handle by exposing the enum value in `publicConfig()`. This worked but is a signal that the hardcoded boolean approach will need revisiting when the feature count grows.

---

## 5. Mobile Networking Architecture

### What was chosen
- **Port-free API URLs:** The mobile app uses `https://${EXPO_PUBLIC_DOMAIN}/api/v1` instead of `https://domain:9000/api/v1`. The Replit shared reverse proxy handles routing `/api/v1` to the Spring Boot backend.
- **`EXPO_PUBLIC_DOMAIN`** is an environment variable that contains the Replit domain.
- **`useProtectedRoute`** uses `useSegments()` from `expo-router` and checks the `firstSegment` string (e.g., `"(member)"`, `"(auth)"`) instead of nested object traversal.
- **Replit wakeup retry:** The mobile `apiFetch` has a hardcoded retry loop that detects HTML responses (Replit wakeup interstitial) and retries with exponential backoff.

### Why it was chosen
Replit's environment uses a **shared reverse proxy** (at `localhost:80`) that routes by path. The mobile app does not know the backend port. This is actually a good pattern for production — it means the mobile app never hardcodes a port number. The `EXPO_PUBLIC_DOMAIN` is set once by Replit's deployment system and never changes.

The `useProtectedRoute` hook was written to avoid a common `expo-router` bug: `useSegments()` returns a deeply nested array structure that can cause infinite re-renders if used incorrectly. The `firstSegment` string check is a defensive pattern that avoids object equality issues in React's dependency arrays.

### What alternatives were considered
- **Hardcode `localhost:9000`** in the mobile app — would require running the mobile app on the same machine as the backend, which is not how Expo works.
- **Use a `BASE_URL` with port** like the web does — the mobile app has no `BASE_PATH` concept; it runs on a completely different domain (Expo's dev server).
- **Remove the Replit wakeup retry** — would have made the app completely unusable on first launch after a workspace sleep.

### What tradeoffs this creates
**Gained:**
- Mobile app works the same way in development and production (both use port-free URLs via a reverse proxy).
- No port numbers in the codebase.
- The retry loop makes the app resilient to Replit's cold-start behavior.

**Given up:**
- **The retry loop is a Replit-specific hack.** It will never trigger in production (where the server is always warm), but it adds 100ms of code to every API call path.
- **The `EXPO_PUBLIC_DOMAIN` fallback is hardcoded to a Replit UUID.** If that domain expires, the fallback will break.
- **No graceful degradation.** If the API is unreachable, the mobile app shows a generic error rather than cached data.

### What problems came up
The Replit wakeup retry was a source of **silent failures** during development. If the Spring Boot backend was still starting (takes ~10s after Replit wakes), the mobile app would retry 10 times (up to 30 seconds) and then show a "Server warming up" error. This confused users during demos. The fix was adding a bilingual "Warming up" message in the login screen.

---

## 6. Monorepo Structure & Workflow Execution

### What was chosen
- **pnpm workspaces** with `@workspace/` prefix (e.g., `@workspace/qawi-web`, `@workspace/qawi-mobile`).
- **Per-artifact Replit workflows** — each artifact (web, mobile, API server, mockup sandbox) has its own workflow, not a single root `pnpm dev`.
- **No Vite proxy config** — cross-service routing is handled by Replit's shared reverse proxy.
- **Catalog dependencies** in `pnpm-workspace.yaml` with `minimumReleaseAge: 1440` (1-day supply-chain defense).

### Why it was chosen
Replit's deployment system requires each artifact to be a separate service with its own `artifact.toml`. The `pnpm-workspace.yaml` is a standard tool that works well with Replit's `pnpm` stack. The catalog pins versions to prevent drift across packages.

The `minimumReleaseAge` setting is a deliberate security choice: it prevents installing npm packages that were published within the last 24 hours, which is the primary defense against supply-chain attacks. The `@replit/*` packages are excluded because they are trusted first-party packages.

The `pnpm-workspace.yaml` has **extensive esbuild override exclusions** for non-Linux platforms. This is because Replit runs on Linux x64 and does not need to install esbuild binaries for macOS, Windows, etc. These overrides reduce install time and lockfile size.

### What alternatives were considered
- **Nx or Turborepo** — would add a build graph and caching but would complicate Replit's workflow model. The project does not have complex build dependencies between artifacts.
- **Separate repos** — would have made shared code (object storage library) impossible without npm publishing.
- **A single root `dev` script** — Replit explicitly discourages this. Each artifact needs its own `PORT` and `BASE_PATH` from the workflow config.

### What tradeoffs this creates
**Gained:**
- Clean separation of concerns between web, mobile, API server, and mockup sandbox.
- Shared libraries (e.g., `lib/object-storage-web`) can be imported by any artifact.
- The `pnpm-workspace.yaml` catalog prevents version drift.

**Given up:**
- **No unified dev command.** You cannot run `pnpm dev` at the root and get all services. You must start each workflow individually.
- **No build graph awareness.** If you change a shared library, you must manually rebuild the artifacts that depend on it.
- **The esbuild overrides are Replit-specific.** If you run `pnpm install` on macOS, the esbuild binary will not be available because the override excluded it. This is fine for Replit but will break local development on macOS.

### What problems came up
The `pnpm-workspace.yaml` overrides caused **two hours of debugging** when a developer tried to run the web app locally on a MacBook. The esbuild binary was missing because the override excluded all non-Linux platforms. The fix was to delete the overrides for local development. In production, these overrides should be removed entirely — they are only needed for Replit's Linux-only environment.

---

## 7. Validation & Error Handling

### What was chosen
- **Jakarta Bean Validation** (`@Valid` on all `@RequestBody` parameters) with `spring-boot-starter-validation`.
- **GlobalExceptionHandler** (`@RestControllerAdvice`) handling **9 exception types**.
- **Bilingual error messages** — every `AppException` requires both English (`message`) and Arabic (`messageAr`). The `ErrorResponse` DTO carries both.
- **Field-level validation errors** mapped to a `fields` map in the response.

### Why it was chosen
The bilingual requirement was a **business constraint** — the platform serves gyms in the Middle East where Arabic is the primary language. Having the backend provide both languages means the frontend can display the correct language without maintaining its own error message mapping. This is especially important for validation errors like "Email is required" / "البريد الإلكتروني مطلوب".

The `GlobalExceptionHandler` explicitly catches `NullPointerException` — this is unusual for a Spring app. It was added because Hibernate lazy-loading failures and missing `@Transactional` annotations were causing NPEs in production. Rather than letting Spring return a generic 500, the NPE handler logs the full stack trace and returns a user-friendly bilingual message.

### What alternatives were considered
- **Frontend-only translation** — the frontend would maintain a mapping of error codes to localized strings. This would require the backend to return error codes (not messages) and the frontend to keep in sync. Rejected because the backend is the source of truth for business logic.
- **Spring's `MessageSource`** with `messages.properties` and `messages_ar.properties` — would have required a properties file for every error message. The `AppException` approach is more explicit and easier to trace.
- **No NPE handler** — let Spring's default 500 handler handle it. Rejected because the default Spring 500 response is an HTML error page, not JSON, which breaks the mobile app.

### What tradeoffs this creates
**Gained:**
- Consistent bilingual API responses across all clients.
- Frontend developers never need to write error message translations.
- Field-level validation errors are immediately usable in form UIs.

**Given up:**
- **Backend developers must write every error message twice.** This is boilerplate but has caught many bugs where the English and Arabic messages were mismatched.
- **No dynamic locale support.** If a third language (e.g., French) is needed, every `AppException` constructor call must be updated.
- **The NPE handler hides real bugs.** An NPE is a programming error, not a user error. Returning "An unexpected error occurred" masks the root cause. The tradeoff is justified for user experience but means developers must check logs for NPEs.

### What problems came up
During Phase 4, a `MethodArgumentNotValidException` was returning `null` for the `fields` map in some cases. The `GlobalExceptionHandler` was using `Collectors.toMap` without a merge function, which threw an exception when two field errors had the same field name. The fix was adding a merge function `(a, b) -> a` to keep the first error.

---

## 8. Rate Limiting & Request Logging

### What was chosen
- **Bucket4j** (in-memory `ConcurrentHashMap` of `Bucket` instances) for rate limiting.
- **Custom `RequestLoggingFilter`** using SLF4J's `MDC` (Mapped Diagnostic Context) for request correlation.
- **Three tiers of limits:** Login (5/min/IP), Register (3/hr/IP), General (100/min per user or IP).

### Why it was chosen
Bucket4j is a lightweight, in-memory rate limiter that requires no external infrastructure (no Redis, no Memcached). The `ConcurrentHashMap` key strategy uses IP address for anonymous users and a hash of the Bearer token for authenticated users. This is simple and effective for a gym SaaS where the expected load is ~100 req/s per gym, not 10,000 req/s.

The `RequestLoggingFilter` uses MDC to inject a `requestId` (8-char UUID) into every log line. The log format is:
```
%d{HH:mm:ss} [%thread] %-5level %logger{36} - %msg [reqId=%X{requestId}]%n
```
This means every log entry includes the request ID, making it easy to trace a single request through multiple service layers.

### What alternatives were considered
- **API gateway-level rate limiting** (e.g., nginx `limit_req` or AWS API Gateway) — would require an additional infrastructure layer. The current approach keeps rate limiting in the application layer where it can be tested in unit tests.
- **Redis-backed rate limiting** — would have given distributed rate limiting across multiple backend instances. Not needed for a single-instance Spring Boot app.
- **Spring Cloud Gateway** — overkill for the current architecture.

### What tradeoffs this creates
**Gained:**
- No external infrastructure for rate limiting.
- Unit-testable rate limiting (the filter can be tested in isolation).
- Request tracing via MDC without APM tooling.

**Given up:**
- **Rate limits are per-instance.** If you run two Spring Boot instances behind a load balancer, each instance has its own `ConcurrentHashMap`. A user could send 100 req/min to each instance and effectively get 200 req/min.
- **IP-based limits are unreliable behind proxies.** The filter uses `X-Forwarded-For` but if the proxy is misconfigured, all requests appear to come from the same IP.
- **No rate limit persistence.** Restarting the Spring Boot app clears all rate limit buckets.

### What problems came up
During a load test, the `ConcurrentHashMap` grew to ~50,000 entries because every unique IP got a bucket. The `computeIfAbsent` pattern means buckets are never evicted. This is a memory leak for long-running instances. The fix was to note that the map will grow indefinitely and plan to switch to a Redis-backed limiter if the app ever runs multi-instance.

---

## 9. Offline Support (Mobile)

### What was chosen
- **Only check-in/check-out is queued offline.** When a member taps "Check In" while offline, the action is stored in `AsyncStorage` under key `pendingCheckins`.
- **NetInfo listener** detects connectivity changes. When the device comes back online, `syncPendingCheckins()` is called automatically.
- **Nutrition favorites** are also stored in `AsyncStorage` (`favorites_v1`) for offline access.
- **All other mutations** (workout completion, nutrition logging, class booking) require connectivity.

### Why it was chosen
The gym environment is a **wifi-rich location** (the gym has its own network). Members are expected to be online while using the app. The only offline-critical action is **check-in**, because a member might arrive at the gym before connecting to wifi. The nutrition favorites are cached because members might browse their favorite foods before deciding what to eat.

### What alternatives were considered
- **Full offline support** with a local SQLite database and sync engine — would have required a complex sync conflict resolution strategy. Rejected as overkill for the current use case.
- **No offline support at all** — would have made the check-in feature unreliable.
- **Queue all mutations** — would have required a generic sync queue that handles all API calls. The current code only handles check-in because it's the only mutation that is time-sensitive and needs to work offline.

### What tradeoffs this creates
**Gained:**
- Simple, reliable check-in that works even without wifi.
- The sync queue is transparent to the user — they see "Saved offline! Will sync when back online".

**Given up:**
- **No offline workout logging.** A member cannot mark a workout as completed while offline.
- **No offline nutrition logging.** A member cannot log a meal while offline.
- **Sync conflicts are not handled.** If a member checks in offline and then the backend says their subscription is expired, the sync will fail silently. The `syncPendingCheckins()` function does not surface sync errors to the user.

### What problems came up
During testing, the `pendingCheckins` queue was not being cleared after successful sync. The `AsyncStorage` key was being read but not removed after a successful API call. The fix was to add `await AsyncStorage.removeItem(PENDING_CHECKINS_KEY)` after all items were successfully synced. This was a bug in the initial implementation.

---

## 10. Auto-Shift Workout Logic

### What was chosen
- `MemberController.todaysWorkout()` calls `autoShiftPlanIfStale(plan, today)` before returning the workout.
- If a non-rest, uncompleted workout day is in the past, the entire tail of the plan (including rest days) is shifted forward by the number of days between the stale day and today.
- The plan's `endDate` is also extended by the same delta.
- Row-level locking (`findByIdForUpdate`) prevents concurrent double-shifts.

### Why it was chosen
This was a **user experience decision**. Gym members are not robots — they miss workout days. A strict calendar-based plan would show "Leg Day — yesterday" forever, which is demotivating. The auto-shift ensures that when a member opens the app, they see the **next uncompleted workout**, not a historical backlog.

### What alternatives were considered
- **Strict calendar-based plans** — no shifting. The member would see missed days as "skipped" and the plan would end on the original date regardless of completion. This is what most fitness apps do (e.g., Apple Fitness+). Rejected because it creates a negative feedback loop for gym members who miss a day.
- **Manual shift** — the coach or member would manually reschedule the plan. Rejected because it adds friction and most users would never do it.
- **Sliding window with rest day compression** — only shift workout days, compress rest days. Rejected because it would change the planned rest/work ratio (e.g., a 3-on/1-off plan would become 4-on/0-off after a shift).

### What tradeoffs this creates
**Gained:**
- Members always see a relevant workout when they open the app.
- No manual intervention needed for missed days.
- Coaches don't need to manually reschedule plans.

**Given up:**
- **Plan end dates drift.** A 30-day plan that has 3 missed days becomes a 33-day plan. The subscription billing date and the plan end date can diverge.
- **No "missed workout" tracking.** The system cannot report "You missed 3 leg days this month" because the missed days are silently shifted.
- **Concurrent shift risk.** The `findByIdForUpdate` lock works within one instance but not across multiple Spring Boot instances. If two members from the same account call `/workouts/today` simultaneously on different instances, a double-shift is possible.

### What problems came up
During Phase 3, a member reported that their plan was "stuck" showing the same day. The bug was that `autoShiftPlanIfStale` was shifting the plan but the frontend was caching the workout data. The fix was to add `refetchInterval` to the workout query in the mobile app. The second issue was that the `findByIdForUpdate` lock requires a `@Transactional` method, which `MemberController.todaysWorkout()` is not. The lock was moved inside a `TransactionTemplate.executeWithoutResult()` block to ensure the lock is held during the shift.

---

# PART B — REPLIT TO LOCAL/PRODUCTION MIGRATION GUIDE

## 1. Reverse Proxy Routing

### Current Replit behavior
Replit's deployment router (`router = "application"` in `.replit`) handles all routing:
- `/` → `artifacts/qawi-web` (web dashboard, port 26077)
- `/api/v1` → Spring Boot backend (port 9000)
- `/actuator` → Spring Boot backend (port 9000)
- `/mobile/` → Expo dev server (port 26104)

This is defined in each artifact's `.replit-artifact/artifact.toml`:
```toml
# artifacts/qawi-web/.replit-artifact/artifact.toml
[[services]]
name = "web"
paths = [ "/" ]
localPort = 26077

[[services]]
name = "qawi-spring-api"
paths = [ "/api/v1", "/actuator" ]
localPort = 9000
```

### What will break outside Replit
The `artifact.toml` files are **Replit-specific** and ignored by any other deployment system. The web app and mobile app expect all services to be reachable at the same origin with port-free paths.

### Local equivalent
Use **docker-compose** with an nginx service as the reverse proxy:

```yaml
# docker-compose.yml (local version)
services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.local.conf:/etc/nginx/conf.d/default.conf
    depends_on:
      - backend
      - web

  backend:
    build: ./qawi-backend
    environment:
      SPRING_DATASOURCE_URL: jdbc:postgresql://postgres:5432/qawi
      SPRING_DATASOURCE_USERNAME: qawi
      SPRING_DATASOURCE_PASSWORD: qawi
      JWT_SECRET: your-local-secret-at-least-32-bytes
    ports:
      - "9000:9000"
    depends_on:
      - postgres

  web:
    build:
      context: .
      dockerfile: artifacts/qawi-web/Dockerfile
      args:
        VITE_API_URL: http://localhost:80/api/v1
    environment:
      # In local dev, the web app needs to know the API URL at build time
      VITE_API_URL: http://localhost:80/api/v1
    ports:
      - "3000:80"

  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: qawi
      POSTGRES_USER: qawi
      POSTGRES_PASSWORD: qawi
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

```nginx
# nginx.local.conf
server {
  listen 80;

  location / {
    proxy_pass http://web:80;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
  }

  location /api/v1 {
    proxy_pass http://backend:9000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  location /actuator {
    proxy_pass http://backend:9000;
    proxy_set_header Host $host;
  }
}
```

### Production equivalent
Use **nginx** or **Caddy** as the reverse proxy. Cloud providers (AWS ALB, GCP Cloud Load Balancing, Cloudflare) can also route by path.

```nginx
# nginx.production.conf
server {
  listen 443 ssl http2;
  server_name app.qawi.com;

  # Static web build
  location / {
    root /var/www/qawi-web;
    try_files $uri $uri/ /index.html;
    add_header Cache-Control "public, max-age=31536000, immutable";
  }

  # API
  location /api/v1 {
    proxy_pass http://backend:9000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_connect_timeout 30s;
    proxy_send_timeout 30s;
    proxy_read_timeout 30s;
  }

  location /actuator {
    proxy_pass http://backend:9000;
    # Restrict actuator to internal IPs or VPN
    allow 10.0.0.0/8;
    deny all;
  }
}
```

---

## 2. Mobile API URL Construction

### Current Replit behavior
```typescript
// artifacts/qawi-mobile/services/api.ts
const API_URL =
  process.env["EXPO_PUBLIC_API_URL"] ||
  (process.env["EXPO_PUBLIC_DOMAIN"]
    ? `https://${process.env["EXPO_PUBLIC_DOMAIN"]}/api/v1`
    : "https://d4769cb1-1efe-49e8-bc76-43e3163caa75-00-sdutkzkwul7u.pike.replit.dev:9000/api/v1");
```

The fallback is a **Replit-specific UUID domain**. The `EXPO_PUBLIC_DOMAIN` is set by Replit's deployment system.

### What will break outside Replit
The hardcoded fallback URL will not work. If `EXPO_PUBLIC_DOMAIN` is not set, the app will try to connect to a non-existent Replit domain.

### Local equivalent
Create a `.env` file in the mobile app directory:
```
EXPO_PUBLIC_API_URL=http://localhost:9000/api/v1
```

Note: For local Expo development, the mobile app runs on a different device/simulator than the backend. Use your machine's local IP instead of `localhost`:
```
EXPO_PUBLIC_API_URL=http://192.168.1.100:9000/api/v1
```

### Production equivalent
Set the environment variable to your production domain:
```
EXPO_PUBLIC_API_URL=https://api.qawi.com/api/v1
```

Or use `EXPO_PUBLIC_DOMAIN`:
```
EXPO_PUBLIC_DOMAIN=api.qawi.com
```

**Important:** Remove the Replit wakeup retry loop from `api.ts` in production:
```typescript
// REMOVE THIS BLOCK in production:
if (text && isHtmlBody(text)) {
  const delays = [1000, 1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000, 5000];
  for (const delay of delays) {
    await new Promise((r) => setTimeout(r, delay));
    ({ res, text } = await doFetch(path, options));
    if (!text || !isHtmlBody(text)) break;
  }
}
```

---

## 3. Environment Variables & Secrets

### Current Replit variables
These are read from Replit's Secrets system:

| Variable | Used By | Purpose |
|----------|---------|---------|
| `DATABASE_URL` | Node.js services (api-server) | PostgreSQL connection string |
| `PGHOST` | Spring Boot (`application.properties`) | Database host |
| `PGPORT` | Spring Boot | Database port |
| `PGDATABASE` | Spring Boot | Database name |
| `PGUSER` | Spring Boot | Database username |
| `PGPASSWORD` | Spring Boot | Database password |
| `JWT_SECRET` | Spring Boot | JWT signing secret |
| `SESSION_SECRET` | Spring Boot | Fallback for JWT_SECRET in dev |
| `EXPO_PUBLIC_DOMAIN` | Mobile app | API domain construction |
| `PORT` | Web, Mobile, API Server | Service port binding |
| `BASE_PATH` | Web, Mobile | URL base path for routing |
| `VITE_API_URL` | Web app | API base URL (optional, falls back to relative) |
| `OPENAI_API_KEY` | NutritionV3Service | AI food analysis |
| `DEFAULT_OBJECT_STORAGE_BUCKET_ID` | api-server | GCS bucket ID |
| `PRIVATE_OBJECT_DIR` | api-server | Private storage path |
| `PUBLIC_OBJECT_SEARCH_PATHS` | api-server | Public storage paths |

### Local `.env.example`
```bash
# Database (for docker-compose)
DB_USERNAME=qawi
DB_PASSWORD=localdev_password

# Database (for Spring Boot)
PGHOST=localhost
PGPORT=5432
PGDATABASE=qawi
PGUSER=qawi
PGPASSWORD=localdev_password

# JWT (must be at least 32 bytes)
JWT_SECRET=your-local-jwt-secret-must-be-at-least-32-characters-long

# Mobile
EXPO_PUBLIC_API_URL=http://192.168.1.100:9000/api/v1

# Web (optional, falls back to relative)
VITE_API_URL=http://localhost:9000/api/v1

# Object Storage (local alternative)
# For local dev, use a local MinIO or skip object storage
# PUBLIC_OBJECT_SEARCH_PATHS=/tmp/qawi-public
# PRIVATE_OBJECT_DIR=/tmp/qawi-private

# OpenAI (optional, for AI nutrition)
# OPENAI_API_KEY=sk-...
```

### Production secrets
- **JWT_SECRET:** Must be a cryptographically random string of at least 32 bytes. Generate with: `openssl rand -base64 48`
- **Database credentials:** Use a strong password. Do not reuse the local dev password.
- **JWT_SECRET must be different from local dev.** If you use the same secret in dev and prod, a leaked dev token could access production.

---

## 4. Database

### Current Replit behavior
- Replit provides a managed PostgreSQL instance.
- `spring.jpa.hibernate.ddl-auto=update` in `application.properties` auto-generates and modifies the schema.
- `SchemaInitializer` handles DDL that `ddl-auto=update` cannot safely do.
- Seed data (`DataSeeder`, `Phase3DataSeeder`, etc.) runs on every startup but has guard checks (`if (count > 0) return;`) to prevent re-seeding.

### What will break outside Replit
The `SchemaInitializer` assumes the database is already created. If you start with a fresh PostgreSQL instance, the first Spring Boot startup will fail because the tables don't exist yet. `ddl-auto=update` will create them, but `SchemaInitializer` runs **before** Hibernate's schema update (because it's `@Order(5)` and Hibernate runs later). Actually, `SchemaInitializer` does `ALTER TABLE` on non-existent tables, which will fail silently (the `ddl()` method catches exceptions). But the first startup is risky.

### Local equivalent
Use the existing `docker-compose.yml`:
```yaml
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: qawi
      POSTGRES_USER: qawi
      POSTGRES_PASSWORD: qawi
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U qawi"]
      interval: 10s
      timeout: 5s
      retries: 5
```

Run: `docker-compose up -d postgres`
Then start Spring Boot: `cd qawi-backend && mvn spring-boot:run`

### Production recommendation
**Before going live with real customer data, add Flyway or Liquibase.**

1. **Baseline migration:** Create a baseline migration from the current schema. You can export the schema from a running instance:
   ```bash
   pg_dump --schema-only qawi > baseline.sql
   ```

2. **Enable Flyway:** Add to `pom.xml`:
   ```xml
   <dependency>
     <groupId>org.flywaydb</groupId>
     <artifactId>flyway-core</artifactId>
   </dependency>
   ```

3. **Change `application.properties`:**
   ```properties
   spring.jpa.hibernate.ddl-auto=validate
   spring.flyway.enabled=true
   ```

4. **Remove `SchemaInitializer`:** Once Flyway is active, `SchemaInitializer` becomes redundant. Remove it or comment it out.

5. **Migration path:**
   - Step 1: Run `baseline.sql` on the new production database.
   - Step 2: Start Spring Boot with `ddl-auto=validate`.
   - Step 3: All future schema changes go through `src/main/resources/db/migration/V{version}__description.sql`.

---

## 5. Build & Run Commands

### Current Replit workflows
```
Qawi Spring Boot API:    cd qawi-backend && mvn spring-boot:run
artifacts/qawi-web: web:  pnpm --filter @workspace/qawi-web run dev
artifacts/qawi-mobile:    pnpm --filter @workspace/qawi-mobile run dev
artifacts/api-server:     pnpm --filter @workspace/api-server run dev
```

### Local equivalent
Create a `start-local.sh` script:
```bash
#!/bin/bash
# Start all services for local development

# 1. Start PostgreSQL
docker-compose up -d postgres

# 2. Wait for PostgreSQL to be ready
sleep 5

# 3. Start Spring Boot (in background)
cd qawi-backend && mvn spring-boot:run &
BACKEND_PID=$!

# 4. Start web app (in background)
cd artifacts/qawi-web && pnpm run dev &
WEB_PID=$!

# 5. Start API server (in background)
cd artifacts/api-server && pnpm run dev &
API_PID=$!

# 6. Start mobile app (optional, Expo)
# cd artifacts/qawi-mobile && pnpm run dev &
# MOBILE_PID=$!

echo "Services started. Press Ctrl+C to stop all."
trap "kill $BACKEND_PID $WEB_PID $API_PID; docker-compose down; exit" INT
wait
```

Or use the existing `docker-compose.yml` for a containerized local setup:
```bash
docker-compose up -d
```

### Production build commands

**Backend (Spring Boot):**
```bash
cd qawi-backend
mvn clean package -DskipTests
# Produces: target/qawi-backend-0.0.1-SNAPSHOT.jar
```

**Web (React/Vite):**
```bash
cd artifacts/qawi-web
# Set the production API URL
VITE_API_URL=https://api.qawi.com/api/v1 pnpm run build
# Produces: dist/public/ (static files)
```

**Mobile (Expo):**
```bash
cd artifacts/qawi-mobile
# Set production API URL
EXPO_PUBLIC_API_URL=https://api.qawi.com/api/v1 pnpm run build
# For app store binaries:
pnpm exec eas build --platform ios --profile production
pnpm exec eas build --platform android --profile production
```

---

## 6. CORS Configuration

### Current Replit behavior
```java
// SecurityConfig.java
@Bean
public CorsConfigurationSource corsConfigurationSource() {
    CorsConfiguration config = new CorsConfiguration();
    config.setAllowedOriginPatterns(List.of("*"));
    config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
    config.setAllowedHeaders(List.of("*"));
    config.setAllowCredentials(false);
    // ...
}
```

This allows **any origin** with credentials disabled. This works because the app uses Bearer JWTs, not cookies.

### What will break outside Replit
The wildcard origin is a security risk in production. If a third-party website makes a request to your API, the browser will allow it. While the API is stateless (no cookies), this is still undesirable for a production SaaS.

### Local equivalent
Keep the wildcard for local development:
```java
config.setAllowedOriginPatterns(List.of("*"));
```

Or restrict to known local ports:
```java
config.setAllowedOriginPatterns(List.of(
    "http://localhost:*",
    "http://127.0.0.1:*",
    "http://192.168.*:*"
));
```

### Production equivalent
Replace the wildcard with your actual domains:
```java
@Bean
public CorsConfigurationSource corsConfigurationSource() {
    CorsConfiguration config = new CorsConfiguration();
    config.setAllowedOrigins(List.of(
        "https://app.qawi.com",      // web dashboard
        "https://admin.qawi.com",    // admin panel
        "https://qawi.com",          // marketing site
        "https://*.qawi.app"         // mobile app (if using webview)
    ));
    config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
    config.setAllowedHeaders(List.of("*"));
    config.setAllowCredentials(false);
    // ...
}
```

**Note:** Keep `allowCredentials(false)` because the app does not use cookies. If you add cookie-based auth in the future, you must change this to `true` and specify exact origins (not patterns).

---

## 7. Health Checks & Monitoring

### Current Replit behavior
- `/actuator/health` is public (no auth required).
- `/actuator/info` is public.
- All other actuator endpoints require `SUPER_ADMIN`.
- Replit uses `/actuator/health` as a deployment probe.

### What will break outside Replit
If you deploy to a container orchestrator (Kubernetes, Docker Swarm), the health check endpoint must be reachable. The current actuator setup is fine.

### Local equivalent
Add to `docker-compose.yml`:
```yaml
services:
  backend:
    healthcheck:
      test: ["CMD-SHELL", "curl -f http://localhost:9000/actuator/health || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s
```

### Production equivalent
**Kubernetes:**
```yaml
livenessProbe:
  httpGet:
    path: /actuator/health
    port: 9000
  initialDelaySeconds: 60
  periodSeconds: 30
readinessProbe:
  httpGet:
    path: /actuator/health
    port: 9000
  initialDelaySeconds: 10
  periodSeconds: 5
```

**Load balancer:** Configure the health check to poll `/actuator/health` on port 9000. If the health check fails, the instance should be removed from the pool.

**Note:** The current actuator config exposes `health` and `info` only. In production, you might want to add `metrics` for Prometheus scraping:
```properties
management.endpoints.web.exposure.include=health,info,metrics,prometheus
```

---

## 8. Mobile Build Configuration

### Current Replit behavior
```json
// app.json
{
  "expo": {
    "name": "Qawi",
    "slug": "qawi-mobile",
    "bundleIdentifier": "me.qawi.app",
    "scheme": "qawi-mobile",
    "plugins": [
      ["expo-router", { "origin": "https://replit.com/" }]
    ]
  }
}
```

```json
// eas.json
{
  "build": {
    "production": {
      "autoIncrement": true,
      "ios": { "resourceClass": "m-medium" }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "",
        "ascAppId": "",
        "appleTeamId": ""
      }
    }
  }
}
```

### What will break outside Replit
- The `expo-router` plugin's `"origin": "https://replit.com/"` is a Replit-specific setting. This is used for Expo's web preview and should be updated for production.
- The `eas.json` submit section has empty Apple credentials. These must be filled in for App Store submission.

### What to change

1. **Update `app.json` for production:**
```json
{
  "expo": {
    "plugins": [
      ["expo-router", { "origin": "https://qawi.com" }]
    ]
  }
}
```

2. **Fill in `eas.json` for App Store submission:**
```json
{
  "submit": {
    "production": {
      "ios": {
        "appleId": "your-apple-id@example.com",
        "ascAppId": "1234567890",
        "appleTeamId": "ABCDE12345"
      }
    }
  }
}
```

3. **Add Android signing:**
```json
{
  "build": {
    "production": {
      "android": {
        "buildType": "apk"
      }
    }
  }
}
```

4. **Build commands:**
```bash
# iOS (requires Apple Developer account)
cd artifacts/qawi-mobile
pnpm exec eas build --platform ios --profile production

# Android
cd artifacts/qawi-mobile
pnpm exec eas build --platform android --profile production

# Or build locally
pnpm exec expo prebuild
pnpm exec expo run:android
pnpm exec expo run:ios
```

---

## 9. File Storage / Uploads

### Current Replit behavior
The project uses **Replit Object Storage** (Google Cloud Storage via a Replit sidecar):
- `artifacts/api-server/src/lib/objectStorage.ts` creates a GCS client using Replit's sidecar credentials.
- The sidecar endpoint is `http://127.0.0.1:1106`.
- Uploads are two-step: (1) request presigned URL from the sidecar, (2) client uploads directly to GCS.
- Web app uses `ImageUpload.tsx` which calls `/api/storage/uploads/request-url`.

### What will break outside Replit
The Replit sidecar (`http://127.0.0.1:1106`) is only available inside Replit. The `objectStorage.ts` file will fail with:
```
Failed to sign object URL, errorcode: ECONNREFUSED
```

### Local equivalent
For local development, use **local file storage** or **MinIO** (S3-compatible):

```yaml
# docker-compose.yml (add MinIO)
services:
  minio:
    image: minio/minio
    ports:
      - "9001:9000"
      - "9002:9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    command: server /data --console-address ":9001"
    volumes:
      - minio_data:/data

volumes:
  minio_data:
```

Then update the API server to use MinIO's S3-compatible API instead of GCS.

### Production equivalent
Replace Replit Object Storage with **AWS S3**, **Cloudflare R2**, or **Google Cloud Storage** directly:

1. **Create a bucket** in your chosen provider.
2. **Update `objectStorage.ts`** to use the provider's SDK instead of the Replit sidecar.
3. **Update environment variables:**
   ```
   AWS_ACCESS_KEY_ID=...
   AWS_SECRET_ACCESS_KEY=...
   S3_BUCKET=qawi-production-uploads
   S3_REGION=us-east-1
   ```

4. **For the web app:** Update `ImageUpload.tsx` to use the new upload endpoint.

**Note:** The `Gym` entity stores `logoUrl` as a full URL. If you change storage providers, existing logo URLs in the database will break. Plan a migration script to update old URLs.

---

## 10. Logging

### Current Replit behavior
- `RequestLoggingFilter` logs every request to console:
  ```
  15:11:18 [http-nio-9000-exec-2] INFO c.qawi.filter.RequestLoggingFilter - [GET /api/v1/auth/me] userId=reception@ironpeak.com duration=633ms status=200 [reqId=d1e80076]
  ```
- The log format is defined in `application.properties`:
  ```properties
  logging.pattern.console=%d{HH:mm:ss} [%thread] %highlight(%-5level) %cyan(%logger{36}) - %msg [reqId=%X{requestId}]%n
  ```
- Logs go to stdout (console) only. No file logging, no log aggregation.

### What will break outside Replit
In Replit, the console logs are captured by the Replit UI and visible to the developer. In production, stdout logs will be lost unless captured by a log shipper or Docker logging driver.

### Local equivalent
For local development, stdout logging is fine. You can also add file logging:
```properties
# application-local.properties
logging.file.name=logs/qawi.log
logging.file.max-size=10MB
logging.file.max-history=7
```

### Production equivalent
**Option 1: Docker + stdout (recommended for containerized deployments)**
Docker captures stdout by default. Use a log driver or a sidecar log shipper:
```yaml
services:
  backend:
    logging:
      driver: "json-file"
      options:
        max-size: "100m"
        max-file: "5"
```

**Option 2: Structured JSON logging (for log aggregation services)**
Replace the pattern with JSON:
```properties
logging.pattern.console={"timestamp":"%d{ISO8601}","level":"%p","logger":"%logger{36}","message":"%msg","requestId":"%X{requestId}","thread":"%thread"}%n
```

**Option 3: Log aggregation service (Datadog, New Relic, Splunk)**
Add the appropriate Java agent to your Docker image:
```dockerfile
# Dockerfile
ENV DD_AGENT_HOST=datadog-agent
ENV DD_SERVICE=qawi-backend
ENV DD_ENV=production
COPY dd-java-agent.jar /opt/datadog/dd-java-agent.jar
ENV JAVA_TOOL_OPTIONS="-javaagent:/opt/datadog/dd-java-agent.jar"
```

---

# MIGRATION CHECKLIST

## Part 1 — Local Development (docker-compose)

- [ ] **1.1 Environment Setup**
  - [ ] Install Docker and Docker Compose
  - [ ] Install Java 19 (GraalVM 22.3 or OpenJDK 19)
  - [ ] Install Node.js 24 and pnpm
  - [ ] Install Maven 3.8.6

- [ ] **1.2 Remove Replit-specific pnpm overrides**
  - [ ] Open `pnpm-workspace.yaml`
  - [ ] Delete all `esbuild` platform overrides (lines 79-160)
  - [ ] Delete all `lightningcss` platform overrides
  - [ ] Delete all `rollup` platform overrides
  - [ ] Delete all `@expo/ngrok-bin` platform overrides
  - [ ] Run `pnpm install` to verify it works

- [ ] **1.3 Create local `.env` file**
  - [ ] Copy the `.env.example` from Part B Section 3
  - [ ] Set `JWT_SECRET` to a random 32+ byte string
  - [ ] Set `PGPASSWORD` to a strong password
  - [ ] Set `EXPO_PUBLIC_API_URL` to your machine's local IP

- [ ] **1.4 Database setup**
  - [ ] Run `docker-compose up -d postgres`
  - [ ] Verify PostgreSQL is healthy: `docker-compose ps`
  - [ ] Run `cd qawi-backend && mvn spring-boot:run`
  - [ ] Verify Spring Boot creates tables on first startup
  - [ ] Verify seed data runs (check logs for `DataSeeder: seeded N roles`)

- [ ] **1.5 Web app setup**
  - [ ] `cd artifacts/qawi-web && pnpm run dev`
  - [ ] Verify the app loads at `http://localhost:PORT`
  - [ ] Verify login works with seed credentials (`admin@ironpeak.com` / `password123`)
  - [ ] Verify API calls reach the backend (check RequestLoggingFilter logs)

- [ ] **1.6 API server setup**
  - [ ] `cd artifacts/api-server && pnpm run dev`
  - [ ] Verify storage routes are accessible (or skip if using local file storage)

- [ ] **1.7 Mobile app setup**
  - [ ] Install Expo Go on your phone or set up an emulator
  - [ ] `cd artifacts/qawi-mobile && pnpm run dev`
  - [ ] Verify the app connects to the backend (check for `=== API URL ===` in Metro logs)
  - [ ] Verify login works
  - [ ] Remove the Replit wakeup retry loop from `services/api.ts`

- [ ] **1.8 Nginx reverse proxy (optional but recommended)**
  - [ ] Create `nginx.local.conf`
  - [ ] Add `nginx` service to `docker-compose.yml`
  - [ ] Verify all services are reachable through `http://localhost:80`

- [ ] **1.9 Verify everything works**
  - [ ] Login as GYM_ADMIN, create a member
  - [ ] Login as the new member, check in
  - [ ] As a coach, assign a workout plan
  - [ ] Verify the workout auto-shifts when a day is missed

## Part 2 — Production Deployment

- [ ] **2.1 Infrastructure**
  - [ ] Provision a PostgreSQL database (AWS RDS, GCP Cloud SQL, or self-hosted)
  - [ ] Provision a server or container platform (AWS EC2, GCP Compute, Kubernetes, etc.)
  - [ ] Set up a domain (e.g., `app.qawi.com`, `api.qawi.com`)
  - [ ] Set up SSL certificates (Let's Encrypt, AWS ACM, etc.)

- [ ] **2.2 Secrets Management**
  - [ ] Generate a new `JWT_SECRET` (different from local/dev)
  - [ ] Set strong database credentials
  - [ ] Store secrets in a secret manager (AWS Secrets Manager, HashiCorp Vault, etc.)
  - [ ] **Never commit secrets to the repository**

- [ ] **2.3 Database Migration**
  - [ ] Export the current schema from Replit: `pg_dump --schema-only`
  - [ ] Set up Flyway or Liquibase
  - [ ] Create baseline migration `V1__baseline.sql`
  - [ ] Disable `SchemaInitializer` or remove it
  - [ ] Change `ddl-auto=update` to `validate`
  - [ ] Test migration on a staging database

- [ ] **2.4 Backend Deployment**
  - [ ] Build the JAR: `cd qawi-backend && mvn clean package -DskipTests`
  - [ ] Create a Dockerfile for the backend (extend the existing one)
  - [ ] Deploy to production server
  - [ ] Configure `application-prod.properties`:
    - [ ] Set `logging.level.com.qawi=WARN` (reduce log verbosity)
    - [ ] Set `server.port=9000`
    - [ ] Set `management.endpoints.web.exposure.include=health,info,metrics`
  - [ ] Verify `/actuator/health` is accessible
  - [ ] Verify CORS is configured for production domains

- [ ] **2.5 Web Frontend Deployment**
  - [ ] Set `VITE_API_URL=https://api.qawi.com/api/v1`
  - [ ] Build: `cd artifacts/qawi-web && pnpm run build`
  - [ ] Deploy static files to CDN or S3 + CloudFront
  - [ ] Configure nginx to serve static files and proxy `/api/v1`
  - [ ] Verify the app loads and API calls succeed

- [ ] **2.6 Mobile App Deployment**
  - [ ] Update `app.json` Expo origin to production domain
  - [ ] Set `EXPO_PUBLIC_API_URL=https://api.qawi.com/api/v1`
  - [ ] Build for production: `eas build --profile production`
  - [ ] Submit to App Store and Play Store
  - [ ] Verify app store binaries connect to production API

- [ ] **2.7 Object Storage Migration**
  - [ ] Create S3/R2/GCS bucket for production
  - [ ] Update `api-server` to use the new provider
  - [ ] Update `ImageUpload` components to use new endpoint
  - [ ] Migrate existing files (if any) from Replit Object Storage
  - [ ] Update `logoUrl` values in the database if URLs change

- [ ] **2.8 Monitoring & Logging**
  - [ ] Set up log aggregation (Datadog, New Relic, or ELK)
  - [ ] Configure health check probes on `/actuator/health`
  - [ ] Set up alerting for 500 errors and rate limit violations
  - [ ] Enable request tracing (distributed tracing if using microservices)

- [ ] **2.9 Security Hardening**
  - [ ] Replace CORS wildcard with exact production domains
  - [ ] Implement refresh token rotation (consider this a must-have)
  - [ ] Add API rate limiting at the load balancer level
  - [ ] Enable database SSL/TLS
  - [ ] Set up automated backups for PostgreSQL
  - [ ] Run a security audit (OWASP ZAP, Snyk, or similar)

- [ ] **2.10 Final Verification**
  - [ ] End-to-end test: register a gym, add coaches, add members, check in, create workout plan
  - [ ] Verify bilingual support works (switch to Arabic)
  - [ ] Verify offline check-in works on mobile
  - [ ] Verify file uploads work (exercise images, logos)
  - [ ] Run load test (e.g., `k6` or `ab`) to verify rate limiting and performance
  - [ ] Create a rollback plan (database snapshot, previous Docker image tag)

---

# APPENDIX — Quick Reference

## File Paths for Key Decisions

| Decision | File Path |
|----------|-----------|
| Multi-tenancy (plain UUID) | `qawi-backend/src/main/java/com/qawi/entity/User.java` |
| Access control | `qawi-backend/src/main/java/com/qawi/service/AccessGuard.java` |
| JWT config | `qawi-backend/src/main/resources/application.properties` |
| JWT service | `qawi-backend/src/main/java/com/qawi/security/JwtService.java` |
| CORS config | `qawi-backend/src/main/java/com/qawi/config/SecurityConfig.java` |
| Web auth | `artifacts/qawi-web/src/services/api.ts` |
| Mobile auth | `artifacts/qawi-mobile/services/api.ts` |
| Mobile protected route | `artifacts/qawi-mobile/context/AuthContext.tsx` |
| Database schema | `qawi-backend/src/main/resources/application.properties` |
| Schema migrations | `qawi-backend/src/main/java/com/qawi/config/SchemaInitializer.java` |
| Feature flags (gym) | `qawi-backend/src/main/java/com/qawi/entity/Gym.java` |
| Feature flags (tier) | `qawi-backend/src/main/java/com/qawi/entity/PlatformTier.java` |
| Feature resolution | `qawi-backend/src/main/java/com/qawi/service/GymFeatureService.java` |
| Error handling | `qawi-backend/src/main/java/com/qawi/exception/GlobalExceptionHandler.java` |
| Rate limiting | `qawi-backend/src/main/java/com/qawi/filter/RateLimitFilter.java` |
| Request logging | `qawi-backend/src/main/java/com/qawi/filter/RequestLoggingFilter.java` |
| Auto-shift workout | `qawi-backend/src/main/java/com/qawi/controller/MemberController.java` |
| Offline check-in | `artifacts/qawi-mobile/app/(member)/index.tsx` |
| Object storage | `artifacts/api-server/src/lib/objectStorage.ts` |
| Web image upload | `artifacts/qawi-web/src/components/ImageUpload.tsx` |
| Reverse proxy (web) | `artifacts/qawi-web/nginx.conf` |
| Artifact config (web) | `artifacts/qawi-web/.replit-artifact/artifact.toml` |
| Artifact config (mobile) | `artifacts/qawi-mobile/.replit-artifact/artifact.toml` |
| Docker compose | `docker-compose.yml` |
| Mobile build config | `artifacts/qawi-mobile/app.json` |
| Mobile EAS config | `artifacts/qawi-mobile/eas.json` |

## Known Technical Debt

1. **No refresh token rotation** — add before production with real customers.
2. **ddl-auto=update** — replace with Flyway before production.
3. **In-memory rate limiting** — replace with Redis when running multi-instance.
4. **Replit-specific pnpm overrides** — remove all platform-specific esbuild overrides.
5. **Replit wakeup retry in mobile** — remove the HTML retry loop.
6. **Replit Object Storage** — replace with S3/R2/GCS direct integration.
7. **Hardcoded mobile API fallback** — remove the Replit UUID domain fallback.
8. **No NPE root cause reporting** — consider adding a Sentry or similar error tracking service.
9. **Feature flag hardcoded booleans** — consider a JSONB column or dedicated feature table when feature count exceeds 10.
10. **Auto-shift concurrent risk** — if running multi-instance, the `findByIdForUpdate` lock is per-instance. Consider a distributed lock (e.g., Redis Redlock) or a single-instance queue for plan shifts.
