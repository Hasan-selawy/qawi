# Qawi Monorepo — Full Audit Report

**Date:** 2026-11-24  
**Scope:** Read-only audit per `AUDIT_PROMPT.md`  
**Verdict:** **Not production-ready** for multi-gym SaaS with physical access, health data, and billing. Core admin/reception paths are mostly gym-scoped, but several Critical/High issues (device ADMS, auth permitAll, token storage, schema management, unauthenticated object storage) must be fixed before launch.

---

## 1. Executive summary

Qawi’s Spring backend is a coherent multi-tenant gym platform with real hardening already shipped (refresh tokens, lockout, security headers, async push, AccessGuard). Most GYM_ADMIN / reception / finance endpoints correctly take `gymId` from the JWT user and use `findByIdAndGymId`. Remaining risk is concentrated: public ZkTeco ADMS that writes attendance without subscription or device-auth checks; blanket `/api/v1/auth/**` permitAll; workout-template IDOR; rate-limit XFF spoofing; clients ignoring refresh tokens and storing JWTs in XSS-reachable storage; `ddl-auto=update` in all environments; 413 tracked `target/` build files; and a leftover Node `api-server` whose private object routes have auth commented out. Test coverage is two classes (~17 tests). Fix Phase 0 items below before any paid multi-tenant launch.

---

## 2. Top 10 issues to fix first

| Rank | ID | Issue | Severity |
|------|-----|--------|----------|
| 1 | SEC-001 | ZkTeco ADMS/iclock public; attendance written with no subscription/device-auth gate | Critical |
| 2 | SEC-002 | `GET /api/v1/templates/{id}` — any authenticated user, no ownership | Critical |
| 3 | SEC-003 | `/api/v1/auth/**` permitAll includes `/me` and `/change-password` | High |
| 4 | SEC-004 | Rate limit trusts client `X-Forwarded-For` (bypass) | High |
| 5 | SEC-005 | `api-server` upload URLs + private object GET unauthenticated | High |
| 6 | SEC-006 / OPS-001 | Tracked `qawi-backend/target/` (413 files) + client `.env` in git | High |
| 7 | DATA-001 | Class booking TOCTOU overbook | High |
| 8 | ARCH-001 | `ddl-auto=update` as production schema strategy | High |
| 9 | SEC-007 / MOB-001 | 7-day JWT in localStorage / AsyncStorage; refresh unused | High |
| 10 | DATA-002 / MOB-002 | Offline check-in duplicates; no same-day uniqueness | High |

---

## 3. Endpoint authorization matrix

**Baseline** (`SecurityConfig.java:79–86`):  
`/api/v1/auth/**`, `/api/v1/public/**`, ZK ADMS + `/iclock/**`, actuator health/info → **permitAll**. Else → authenticated. Method security via `@PreAuthorize`.  
**gymId pattern:** almost always JWT → DB user → `User.gymId` (not a client claim).

Legend: **PA** = permitAll; **SC** = authenticated only; **OK** / **RISK** / **CRITICAL**.

### AuthController `/api/v1/auth` (PA for whole prefix)

| Method + path | Roles | gymId | Ownership | Verdict |
|---------------|-------|-------|-----------|---------|
| POST `/register` | PA | none (`null`) | forces MEMBER | RISK (orphan spam) |
| POST `/login` | PA | — | — | OK |
| POST `/refresh` | PA | — | refresh token | OK |
| POST `/logout` | PA | — | — | OK |
| GET `/me` | PA (expects JWT) | JWT | self | RISK |
| POST `/change-password` | PA (expects JWT) | — | self | RISK |

### PublicGymController `/api/v1/public` (PA)

| Method + path | Verdict |
|---------------|---------|
| POST `/register-gym`, `/check-email`, `/contact` | OK |
| GET `/plans`, `/platform-tiers`, `/platform-page` | OK |
| GET `/gym/{gymId}/member-plans` | OK (intentional public) |

### ZkTecoController

| Method + path | Roles | Ownership | Verdict |
|---------------|-------|-----------|---------|
| POST `/api/v1/zkteco/devices/register` | GYM_ADMIN | admin gym | OK |
| GET `/api/v1/zkteco/devices` | GYM_ADMIN, RECEPTIONIST | gym list | OK |
| POST `/api/v1/zkteco/members/{id}/enroll` | GYM_ADMIN, RECEPTIONIST | member+device in gym | OK |
| GET `/api/v1/zkteco/enrollments` | GYM_ADMIN, RECEPTIONIST | gym | OK |
| GET/POST `/api/v1/zkteco/adms`, `/iclock/**` | **PA** | serial → device | **CRITICAL** |

### SuperAdmin* `/api/v1/super/**` — SUPER_ADMIN — all OK (platform scope)

### GymAdminController `/api/v1/admin` — GYM_ADMIN — JWT gym + `findByIdAndGymId` — OK  
(coaches, members, assign, subscription, analytics, reports, exercises/overrides, member-plans, renewals)

### AdminNotificationController, EmployeeController, GymClassController — GYM_ADMIN — OK  
(except class capacity race is DATA, not auth)

### Reception / HR / Finance / GymSales / GymShared — role-gated + JWT gym — OK

### AttendanceController — MEMBER self; coach/admin via AccessGuard — OK

### CoachDashboard / CoachNote — COACH + assignment — OK

### MeasurementController — AccessGuard — OK

### ExerciseController — role visibility / `assertCanModify` — OK

### WorkoutTemplateController `/api/v1/templates`

| Method + path | Roles | Ownership | Verdict |
|---------------|-------|-----------|---------|
| POST `/`, GET `/`, DELETE `/{id}` | COACH | coachId | OK |
| GET `/{templateId}` | **SC, no PreAuthorize** | **none** | **CRITICAL** |

### WorkoutPlanController — AccessGuard / write-plan checks — OK; `from-template` template unscoped — RISK

### MemberController `/api/v1/member` — MEMBER

| Method | Verdict |
|--------|---------|
| workouts/*, nutrition/active, measurements, profile, renewals | OK |
| POST `/meals/{mealId}/done` | RISK (no meal ownership) |

### MemberClassController — book race RISK; cancel OK

### MemberReportController — OK

### NutritionController (V1) — coach owns plan / AccessGuard — OK

### NutritionV2 / V3 — same-gym staff can access any member without coach assignment — RISK; V3 `/analyze` any auth — RISK

### NotificationController — self-scoped — OK

### MeController GET `/gym-config` — OK

**~237 mapped endpoints.** High-signal failures: 2 Critical auth issues + ~10 RISK rows above. Vast majority of admin/staff paths are OK.

---

## 4. Findings

### [SEC-001] ZkTeco ADMS writes attendance without auth or subscription checks
Severity: **Critical** | Confidence: **Confirmed** | Category: Security / Physical access | Effort: L  
Location: `SecurityConfig.java:82–83`; `ZkTecoService.java:140–191`

Evidence:
```java
.requestMatchers("/api/v1/zkteco/adms", "/api/v1/zkteco/adms/**").permitAll()
.requestMatchers("/iclock/**").permitAll()
// ...
Optional<BiometricDevice> deviceOpt = deviceRepo.findByDeviceSerial(serial.trim());
if (deviceOpt.isEmpty()) { return "OK"; }
// ... enrollment lookup → attendanceRepo.save — no isActive, no SubscriptionStatusUtil
return "OK";
```

What's wrong: Anyone who can reach the API and knows/guesses a device serial + enrolled PIN can create attendance. Unknown serial still returns `"OK"`. `BiometricDevice.isActive` / enrollment `isActive` are unused on the ADMS path. No subscription gate before access. Always returns `"OK"` (no unlock/deny protocol).

Impact: Spoofed check-ins; expired members still recorded as present; forged attendance for compliance/billing; no turnstile deny path.

Fix: Require device shared secret/HMAC or mTLS / network allowlist; reject inactive devices/enrollments; call `SubscriptionStatusUtil` before save; return distinct unlock/deny payloads; add replay nonce + unique (member, device, eventTime) constraint. Separate “ingest attendance” from “authorize door.”

Related: DOC future-plan §2 (confirmed)

---

### [SEC-002] Workout template GET is an IDOR
Severity: **Critical** | Confidence: **Confirmed** | Category: Security / IDOR | Effort: S  
Location: `WorkoutTemplateController.java:42–45`; `WorkoutTemplateService.java:74–77`

Evidence:
```java
@GetMapping("/{templateId}")
public ResponseEntity<Map<String, Object>> getTemplate(@PathVariable UUID templateId) {
    return ResponseEntity.ok(templateService.getTemplate(templateId));
}
// service: templateRepository.findById(templateId) — no coach/gym check
```

What's wrong: Any authenticated role can read any coach’s template (exercises, structure). Templates have no `gymId`.

Impact: Cross-gym / cross-coach intellectual property and member-program leakage.

Fix: Add `@PreAuthorize("hasRole('COACH')")` and assert `template.coachId == caller.id` (or same gym + role policy). Prefer `findByIdAndCoachId`.

Related: SEC-008 (createFromTemplate)

---

### [SEC-003] Authenticated auth endpoints sit under permitAll
Severity: **High** | Confidence: **Confirmed** | Category: Security / Auth | Effort: S  
Location: `SecurityConfig.java:80`; `AuthController.java:46–56`

Evidence:
```java
.requestMatchers("/api/v1/auth/**").permitAll()
// GET /me and POST /change-password use @AuthenticationPrincipal with no @PreAuthorize
```

What's wrong: Filter chain does not require authentication. Unauthenticated calls NPE on null principal instead of clean 401.

Fix:
```java
.requestMatchers("/api/v1/auth/login", "/api/v1/auth/register",
    "/api/v1/auth/refresh", "/api/v1/auth/logout").permitAll()
// /me and /change-password fall through to authenticated()
```
Add null-principal → 401 in controller or use `@AuthenticationPrincipal(errorOnInvalidType=true)` + exception handler.

Related: future-plan §3

---

### [SEC-004] Rate limiting bypass via X-Forwarded-For
Severity: **High** | Confidence: **Confirmed** | Category: Security / Rate limit | Effort: S  
Location: `RateLimitFilter.java:80–84`

Evidence:
```java
String xff = req.getHeader("X-Forwarded-For");
if (xff != null && !xff.isBlank()) {
    return xff.split(",")[0].trim();
}
```

What's wrong: Client can rotate XFF and reset login (5/min) and register buckets. No trusted-proxy configuration.

Fix: Only honor XFF when request comes from known reverse-proxy IPs; otherwise use `getRemoteAddr()`. Or use Spring `ForwardedHeaderFilter` with `server.forward-headers-strategy=framework` behind a trusted proxy only. Move buckets to Redis for multi-instance.

Related: SEC-009 (in-memory lockout)

---

### [SEC-005] api-server object storage endpoints lack authentication
Severity: **High** | Confidence: **Confirmed** | Category: Security / File storage | Effort: M  
Location: `artifacts/api-server/src/routes/storage.ts:16–36`, `:79–99`

Evidence: Upload URL endpoint has no auth. Private object GET has auth/ACL **commented out**. ACL helpers throw / empty enum.

Impact: Anyone who can reach the Node server can mint upload URLs and read private objects.

Fix: Do not deploy `api-server` until auth is restored; or remove it and serve uploads from Spring with gym-scoped ACLs and short-lived signed URLs. Reject until fixed.

Related: ARCH-002

---

### [SEC-006] Build artifacts and env files tracked in git
Severity: **High** | Confidence: **Confirmed** | Category: Security / Hygiene | Effort: S  
Location: git index — `qawi-backend/target/**` (~413 files); `artifacts/qawi-web/.env`; `artifacts/qawi-mobile/.env`

Evidence: `.gitignore` ignores `.env` and `target/`, but files remain tracked. Mobile `.env` contains a Replit API host.

Impact: Leak of compiled config, accidental secret commits, noisy PRs, supply-chain confusion.

Fix: `git rm -r --cached qawi-backend/target artifacts/qawi-web/.env artifacts/qawi-mobile/.env`; verify no secrets; add CI check that `target/` is never present.

Related: OPS-001

---

### [SEC-007] Long-lived JWT in XSS-reachable client storage; refresh unused
Severity: **High** | Confidence: **Confirmed** | Category: Security / Session | Effort: M  
Location: `application.properties:16` (7-day TTL); `authStore.ts:29–61`; `AuthContext.tsx` + `api.ts` (AsyncStorage); no client `/auth/refresh`

What's wrong: Backend issues rotating refresh tokens; web/mobile ignore them and keep a 7-day access JWT in localStorage/AsyncStorage.

Impact: XSS or device backup → full account takeover for days; logout cannot revoke access JWT (only refresh rows).

Fix: Store refresh in httpOnly Secure cookie (web) or SecureStore (mobile); access token 15–30 min; implement single-flight refresh + retry; clear on refresh failure.

Related: future-plan §8; MOB-001

---

### [SEC-008] createFromTemplate uses unscoped template findById
Severity: **Medium** | Confidence: **Confirmed** | Category: Security / IDOR | Effort: S  
Location: `WorkoutPlanService.java` (~66); templates lack `gymId`

Fix: Restrict templates to owning coach or same-gym coaches; add `gymId` column.

Related: SEC-002

---

### [SEC-009] Login lockout and rate limits are in-memory only
Severity: **Medium** | Confidence: **Confirmed** | Category: Security / Ops | Effort: M  
Location: `LoginAttemptService` ConcurrentHashMap; `RateLimitFilter` ConcurrentHashMap

Impact: Multi-instance deploy → lockout/rate limit ineffective; restart clears locks.

Fix: Redis (documented in QAWI_SECURITY Part B). Document single-instance constraint until then.

---

### [SEC-010] Open self-register creates orphan MEMBER with gymId=null
Severity: **Medium** | Confidence: **Confirmed** | Category: Security | Effort: S  
Location: `AuthService.java:45–55`

Fix: Disable public `/auth/register` in production, or require invite/gym code; rate-limit already partial.

---

### [SEC-011] Nutrition V2/V3: any same-gym coach can access any member
Severity: **Medium** | Confidence: **Confirmed** | Category: Security / AuthZ | Effort: M  
Location: `NutritionV2Service` / `NutritionV3Service` gym-scoped loads without assignment

What's wrong: Differs from workout/coach dashboard which use assignment. May be intentional for nutritionists — document or enforce assignment.

---

### [SEC-012] Member meal-done without meal ownership check
Severity: **Medium** | Confidence: **Confirmed** | Category: Security / Integrity | Effort: S  
Location: `MemberController.java:227–244`

Fix: Verify meal belongs to an active nutrition plan for this member before insert.

---

### [SEC-013] V3 analyze endpoint burns OpenAI for any authenticated user
Severity: **Medium** | Confidence: **Likely** | Category: Security / Cost abuse | Effort: S  
Location: `NutritionV3Controller` POST `/analyze`

Fix: Restrict roles + per-user rate limit + gym feature flag.

---

### [SEC-014] Demo password defaults still active
Severity: **Medium** | Confidence: **Confirmed** | Category: Security | Effort: S  
Location: `DataSeeder.java:35–39` (`password123`, `qawi_super_2024`)

Fix: Disable seeders unless `QAWI_SEED=true`; fail boot in prod if demo users exist with default hashes.

---

### [SEC-015] CORS wildcard origins
Severity: **Low** | Confidence: **Confirmed** | Category: Security | Effort: S  
Location: `SecurityConfig.java:101` (`allowedOriginPatterns("*")`, credentials false)

Acceptable with Bearer-only auth; tighten to known frontends for defense in depth.

---

### [SEC-016] SubscriptionHistory.price uses double
Severity: **Medium** | Confidence: **Confirmed** | Category: Data integrity / Money | Effort: M  
Location: `SubscriptionHistory.java:36` (`double price`) vs `GymMemberPlan` `BigDecimal`

Fix: Migrate money fields to `BigDecimal` / numeric(12,2).

---

### [DATA-001] Class booking race overbooks capacity
Severity: **High** | Confidence: **Confirmed** | Category: Data integrity | Effort: M  
Location: `MemberClassController.java:88–100`

Evidence: count booked → if under capacity → save. No row lock / DB capacity constraint. Unique only on (class, member).

Fix:
```sql
-- lock class row or use atomic:
UPDATE gym_classes SET booked_count = booked_count + 1
WHERE id = ? AND booked_count < max_capacity;
```
Or `SELECT … FOR UPDATE` on class inside transaction + unique (class_id, member_id).

Related: future-plan §5

---

### [DATA-002] Attendance allows duplicate same-day check-ins
Severity: **High** | Confidence: **Confirmed** | Category: Data integrity | Effort: M  
Location: `AttendanceService.java:53–56`; mobile offline queue appends without dedupe

Impact: Inflated streaks/analytics; offline multi-tap storms.

Fix: Unique partial index on (member_id, date(checked_in_at)) or reject if open check-in exists; offline queue dedupe by local day + idempotency key.

Related: MOB-002

---

### [DATA-003] Hibernate ddl-auto=update
Severity: **High** | Confidence: **Confirmed** | Category: Ops / Schema | Effort: L  
Location: `application.properties:6`

Fix: Flyway baseline → `none` → `validate` per QAWI_SECURITY Part C. Never mutate prod via Hibernate.

Related: ARCH-001

---

### [DATA-004] ZkTeco soft 5-minute dedupe only
Severity: **Medium** | Confidence: **Confirmed** | Effort: S  
Location: `ZkTecoService.java:178–181`

Fix: Persist device event IDs; DB unique constraint.

---

### [PERF-001] N+1 query amplification on hot staff paths
Severity: **High** | Confidence: **Confirmed** | Category: Performance | Effort: M  
Locations:
- `ReceptionService.java` (~258–293, ~372–388): per-member coach + attendance + streak
- `NutritionV2Service.java` (~449–463, ~819–822): per-member targets/entries + 7 queries/day adherence
- `MemberReportService.java` (~72–87)
- `HrService.java` (~206–213): `workoutPlanRepository.findAll()` then filter

Fix: Batch `WHERE member_id IN (…)`, projections, entity graphs; precompute streaks; query-count tests.

Related: future-plan §12

---

### [PERF-002] Unpaginated list endpoints
Severity: **Medium** | Confidence: **Confirmed** | Effort: M  
Examples: `GET /admin/members`, reception live-feed/alerts, finance member lists, super-admin `findAll` gyms, exercise library for some roles.

Fix: Spring `Pageable` + default page size 20–50; cursor for mobile feeds.

---

### [PERF-003] Web app: no code splitting
Severity: **Medium** | Confidence: **Confirmed** | Effort: S  
Location: `artifacts/qawi-web/src/App.tsx` static imports of all pages

Fix: `React.lazy` per route group (admin/coach/member/super).

---

### [PERF-004] In-memory rate-limit map unbounded growth
Severity: **Low** | Confidence: **Likely** | Effort: S  
Location: `RateLimitFilter` ConcurrentHashMap — no eviction

Fix: Caffeine with TTL or Redis.

---

### [ARCH-001] Schema strategy blocks safe production ops
Severity: **High** | Confidence: **Confirmed** | Effort: L  
See DATA-003. Also `SchemaInitializer` side effects should move into migrations.

---

### [ARCH-002] Dual backends / stub contract
Severity: **Medium** | Confidence: **Confirmed** | Effort: M  
- Production API = Spring `qawi-backend`  
- `artifacts/api-server` = Express storage sidecar (not in compose)  
- `lib/db` schema = empty `export {}`  
- `lib/api-spec/openapi.yaml` = only `/healthz`

Fix: Decide keep/kill for api-server; generate OpenAPI from Spring; wire Orval clients; delete or quarantine stubs.

Related: future-plan §9, §11

---

### [ARCH-003] Three overlapping nutrition APIs
Severity: **Medium** | Confidence: **Confirmed** | Effort: L  
`NutritionController` + V2 + V3 share/duplicate domain; clients likely split.

Fix: Pick V2 (or V3) as canonical; adapters; delete V1 after migration.

Related: future-plan §7

---

### [ARCH-004] MemberController is a god class
Severity: **Medium** | Confidence: **Confirmed** | Effort: M  
~361–411 lines; workouts, meals, nutrition, measurements, profile, renewals; repos used inline.

Fix: Extract `MemberWorkoutService`, `MemberNutritionService`, `MemberMeasurementService`, `MemberRenewalService`.

Related: future-plan §6

---

### [ARCH-005] Java version mismatch (19 vs Docker 21)
Severity: **Medium** | Confidence: **Confirmed** | Effort: M  
`pom.xml` / CI: Java **19** (non-LTS, EOL). Dockerfile: Temurin **21**.

Fix: Standardize on Java **21** LTS everywhere; bump Spring Boot to supported 3.3/3.4 line when ready; JJWT → 0.12.x.

---

### [ARCH-006] Thin automated tests
Severity: **High** | Confidence: **Confirmed** | Effort: L  
Only `AccessGuardIntegrationTest` + `SubscriptionStatusUtilTest` (~17 tests). No controller security suite.

Highest-value tests first:
1. Cross-gym IDOR matrix (read/update/delete)  
2. Auth permitAll vs authenticated endpoints  
3. Class booking concurrency  
4. Refresh rotation race  
5. ZkTeco unknown device / expired member  
6. Subscription grace boundaries  

---

### [MAINT-001] No Maven wrapper
Severity: **Low** | Confidence: **Confirmed** | Effort: S  
This audit host had no `mvn` on PATH and no `mvnw`.

Fix: Add `mvnw` + pin Maven; document JDK 21.

---

### [OPS-001] Docker images run as root; no app healthchecks
Severity: **Medium** | Confidence: **Confirmed** | Effort: S  
`qawi-backend/Dockerfile` / web Dockerfile: no `USER`; compose healthcheck only on postgres.

Fix: Non-root user; `HEALTHCHECK` curl `/actuator/health`; JVM `-XX:MaxRAMPercentage`.

---

### [OPS-002] Compose defaults weak secrets
Severity: **Medium** | Confidence: **Confirmed** | Effort: S  
`docker-compose.yml:8,25–26` default DB password + JWT.

OK for local; document never for staging/prod; fail-fast if JWT equals default string when profile=prod.

---

### [OPS-003] CI gaps
Severity: **Medium** | Confidence: **Confirmed** | Effort: M  
Present: backend `mvn verify`, web build, scheduled OWASP.  
Missing: mobile build, frontend unit tests, secret scanning, migration check, dependency audit for JS on PR, branch protection enforcement (cannot verify from code).

---

### [FE-001] Finance export sends wrong Bearer token
Severity: **Medium** | Confidence: **Confirmed** | Effort: S  
Location: `artifacts/qawi-web/src/pages/finance/dashboard.tsx:91–94` reads raw `localStorage.getItem('qawi_token')` (zustand JSON blob), not `useAuthStore.getState().token`.

Fix: Use auth store / api client helper.

---

### [FE-002] Register writes raw token inconsistent with zustand persist format
Severity: **Low** | Confidence: **Confirmed** | Effort: S  
`register.tsx:97` vs `authStore` JSON wrapper — mitigated by parse fallback but fragile.

---

### [MOB-001] JWT in AsyncStorage; no SecureStore
Severity: **High** | Confidence: **Confirmed** | Effort: M  
See SEC-007.

---

### [MOB-002] Offline check-in queue duplicates + lost timestamps
Severity: **High** | Confidence: **Confirmed** | Effort: M  
`app/(member)/index.tsx` queue; sync POSTs without timestamp; failures re-queue forever including 4xx.

Fix: Idempotency keys; don’t requeue permanent errors; optionally accept client `checkedInAt` with server skew limits.

---

### [MOB-003] Hardcoded Replit API fallback URL
Severity: **Medium** | Confidence: **Confirmed** | Effort: S  
`artifacts/qawi-mobile/services/api.ts` default host + `console.log` of API URL.

Fix: Fail build if `EXPO_PUBLIC_API_URL` missing in release profiles.

---

### [DOC-001] Documentation claims vs code
See section 5.

---

## 5. Documentation claims checked

### QAWI_SECURITY.md Part A

| Claim | Verdict | Evidence |
|-------|---------|----------|
| A1 Seed passwords from env | **True** | `DataSeeder` / `V3DataSeeder` / `SalesDataSeeder` env vars + weak defaults |
| A2 .gitignore hardening | **Partial** | Rules exist; tracked `.env` / `target/` still in index |
| A3 Login lockout | **True** | `LoginAttemptService` + `AuthService.login` |
| A4 Refresh tokens + rotation | **True** | Entity hash + atomic revoke; **clients unused** |
| A5 Async push fan-out | **True** | `AsyncConfig` + `PushFanOutService` |
| A6 JSON logging profiles | **True** (not re-run) | `logback-spring.xml` present per prior docs |
| A7 Security headers | **True** | `SecurityConfig.java:61–77` |
| A8 OWASP plugin + CI + k6 | **True** | workflows + `tests/k6/` |
| A9 Actuator lockdown | **True** | properties + matchers |

### future plan.md

| Item | Verdict |
|------|---------|
| §1 Tenant isolation central | **Partial** — AccessGuard + many `findByIdAndGymId`; gaps remain (templates, some findById) |
| §2 ZkTeco | **True / still open** — confirmed SEC-001 |
| §3 /auth permitAll | **True / still open** — SEC-003 |
| §4 Authz tests | **True / still open** — only 2 test classes |
| §5 Class capacity race | **True** — DATA-001 |
| §6 MemberController split | **True** — still monolithic |
| §7 Nutrition consolidate | **True** — V1/V2/V3 |
| §8 Client refresh | **True** — backend yes, clients no |
| §9 Shared API contract | **True** — OpenAPI stub only |
| §10 Flyway | **True / deferred** — still `ddl-auto=update` |
| §11 Build hygiene | **True** — target tracked, no mvnw |
| §12 Query amplification | **True** — PERF-001 |
| §13 Prod hardening | **True / open** — CORS *, in-memory limits, seeders |

Docs generally match code; main drift: A2 “gitignore hardened” implies clean tree but artifacts remain tracked; security doc does not stress that clients ignore refresh tokens.

---

## 6. Quick wins (< 1 hour each)

1. Narrow `SecurityConfig` auth permitAll (SEC-003).  
2. Add ownership + `@PreAuthorize` on template GET (SEC-002).  
3. `git rm --cached` target/ and client `.env` (SEC-006).  
4. Fix finance export Bearer to use auth store (FE-001).  
5. Stop trusting raw XFF without proxy allowlist (SEC-004).  
6. Remove/disable public `/auth/register` or gate with invite (SEC-010).  
7. Assert meal ownership in markMealDone (SEC-012).  
8. Fail release builds if mobile API URL missing (MOB-003).  
9. Add `@PreAuthorize` on NutritionV3 `/analyze` (SEC-013).  
10. Document single-instance lockout limitation in README/ops runbook.

---

## 7. Roadmap

### Phase 0 — Before launch (blocking)

1. SEC-001 ZkTeco hardening (or disable physical access until ready)  
2. SEC-002, SEC-003, SEC-004, SEC-005 (or don’t deploy api-server)  
3. SEC-006 git hygiene  
4. DATA-001 booking lock + DATA-002 attendance uniqueness  
5. ARCH-001 Flyway baseline on staging  
6. Minimal security integration tests (ARCH-006 subset)  
7. Disable demo seeders in prod; strong JWT required  

**Depends:** 5 before any irreversible prod data; 6 after 2–3 so tests lock behavior.

### Phase 1 — First month

1. SEC-007 / MOB-001 client refresh + SecureStore / httpOnly  
2. PERF-001 batch reception/nutrition queries + PERF-002 pagination  
3. ARCH-004 MemberController extraction  
4. ARCH-005 Java 21 everywhere  
5. OPS-001 Docker non-root + healthchecks  
6. Expand AccessGuard + repository `findByIdAndGymId` discipline  
7. Redis for lockout/rate limit if scaling >1 instance  

### Phase 2 — First quarter

1. ARCH-003 nutrition consolidation  
2. ARCH-002 real OpenAPI from Spring + generated clients  
3. Kill or properly productize api-server  
4. Money `BigDecimal` migration  
5. PDPL: retention/export/delete for measurements & biometrics  
6. Observability (Sentry), backups/restore drills  
7. Mobile offline queue redesign with idempotency  

---

## 8. Open questions for the owner

1. Is gym-wide nutrition access for any coach intentional, or should it match coach assignment?  
2. Will ZkTeco devices sit on a private VLAN / VPN, or must the ADMS endpoint be internet-facing?  
3. Is `artifacts/api-server` used in any production/Replit deploy today?  
4. Target launch topology: single backend instance or HA (affects Redis urgency)?  
5. Which nutrition API (V1/V2/V3) do web and mobile currently call in production builds?  
6. Are demo seeders ever run against shared staging with real-looking data?  
7. Compliance target: Saudi PDPL only, UAE PDPL, or both — retention periods for biometric + health data?  
8. Should public self-`/auth/register` exist at all, or only admin-created members?

---

## 9. Coverage ledger

### Backend Java (317 files) — reviewed unless noted

| Package | Count | Status |
|---------|------:|--------|
| `com.qawi` (QawiApplication) | 1 | reviewed |
| `config/` | 10 | reviewed (SecurityConfig, seeders, AsyncConfig, SchemaInitializer) |
| `security/` | 3 | reviewed |
| `filter/` | 2 | reviewed |
| `controller/` | 30 | reviewed (full matrix) |
| `service/` | 43 | reviewed (deep on Auth, ZkTeco, AccessGuard, booking, nutrition, reception, attendance, templates) |
| `repository/` | 51 | skimmed (findByIdAndGymId usage patterns) |
| `entity/` | 78 | skimmed (money types, biometric flags, constraints) |
| `dto/` | 95 | skimmed (mass-assignment risk — no entity bodies) |
| `event/` | 2 | reviewed |
| `exception/` | 2 | reviewed |
| `src/test/` | 2 | reviewed |
| `resources/` (properties, logback) | — | reviewed |
| `pom.xml`, `Dockerfile` | — | reviewed |

Full path inventory written during audit to `AUDIT_FILE_INVENTORY.tmp.txt` (317 lines). Every controller/service listed in agent passes was opened or grepped with evidence.

### Clients & libs

| Path | Status | Notes |
|------|--------|-------|
| `artifacts/qawi-web/src/stores/authStore.ts` | reviewed | |
| `artifacts/qawi-web/src/services/api.ts` | reviewed | |
| `artifacts/qawi-web/src/App.tsx` + pages (auth, finance) | reviewed / skimmed | all routes mapped; finance Bearer bug confirmed |
| `artifacts/qawi-web/components/ui/*` | skipped | generated shadcn per brief |
| `artifacts/qawi-mobile/context/AuthContext.tsx` | reviewed | |
| `artifacts/qawi-mobile/services/api.ts` | reviewed | |
| `artifacts/qawi-mobile/app/(member)/index.tsx` | reviewed | offline queue |
| other mobile routes | skimmed | role routing |
| `artifacts/qawi-marketing` | skimmed | static marketing |
| `artifacts/mockup-sandbox` | skimmed | design only; not in compose |
| `artifacts/api-server/**` | reviewed | storage ACL critical |
| `lib/db`, `lib/api-spec`, `lib/api-zod`, `lib/api-client-react` | reviewed/skimmed | stubs / generated |
| `lib/object-storage-web` | skimmed | |

### Infra

| Path | Status |
|------|--------|
| `docker-compose.yml` | reviewed |
| `.github/workflows/build-test.yml`, `security.yml` | reviewed |
| `.gitignore`, `.env.example` | reviewed |
| `tests/k6/load.js`, `security.js` | reviewed |
| `graphify-out/`, `node_modules/`, `attached_assets/`, `qawi-brand/` | skipped (per brief) |
| lockfiles | skipped |

---

## 10. Tool output

| Command | Result |
|---------|--------|
| `pnpm typecheck` (workspace libs + artifacts) | **Passed** (exit 0). api-server, qawi-web, qawi-mobile, qawi-marketing, mockup-sandbox, scripts all `Done`. |
| `mvn -B verify` / `mvn test` | **Not run** — `mvn` not on PATH; no `mvnw` in repo. Java available (JDK 21 at user tools + Oracle javapath). |
| `mvn dependency-check:check` | **Not run** (Maven unavailable). |
| `pnpm audit` | **Not run** this pass (prefer after Maven restore). |
| Manual code review | Controllers/services/security/clients/infra as above. |

CI workflow expects JDK 19 + Postgres 16 for backend verify — recommend aligning local + Docker + CI on **JDK 21**.

---

## Appendix — Suggested security test stubs (not implemented)

```java
@Test void gymACannotReadGymBMember() { /* … */ }
@Test void unauthenticatedMeReturns401() { /* … */ }
@Test void templateGetRequiresOwner() { /* … */ }
@Test void classBookingDoesNotOverbookUnderConcurrency() { /* … */ }
@Test void zktecoExpiredMemberDoesNotCheckIn() { /* … */ }
```

---

*End of audit. No source files were modified except this report and `AUDIT_PROGRESS.md`. `AUDIT_PROMPT.md` left untouched.*


---

## Phase 4 infrastructure audit - current workspace, 2026-11-24

Scope: **Phase 4: Infrastructure** from AUDIT_PROMPT.md section 4. This is a read-only audit, not an implementation phase. The implementation roadmap above ends at Phase 2. Existing Phase 0/2 work and unrelated staged/unstaged changes were preserved. Only audit/shared documents changed; checks also produced ignored local artifacts. No deployment, live database, hosting policy, external monitoring account or device was changed.

The original report remains a historical baseline. This addendum supersedes its infrastructure conclusions where later work changed the code. Client/backend files were inspected only to trace deployment/tooling; application security, UI and business logic were not re-audited.

### Assessment and priorities

Infrastructure still needs changes before an internet-facing rollout. **14 findings: 3 High, 9 Medium, 2 Low.** The most urgent issues are published PostgreSQL with known fallback credentials, an unauthenticated preview-server crash, and missing JavaScript vulnerability gates. Dependency advisory counts are scanner output, not counts of exploitable production flaws.

| Priority | ID | Finding | Severity / confidence |
|---|---|---|---|
| 1 | OPS-P4-001 | PostgreSQL published broadly with known fallback superuser credentials | High / Confirmed configuration |
| 2 | OPS-P4-002 | Malformed Host crashes Expo preview server; forwarded hosts reach HTML unescaped | High / Confirmed locally; deployment exposure conditional |
| 3 | OPS-P4-003 | No JavaScript vulnerability gate despite critical audit results | High / Confirmed gate gap and scanner results |
| 4 | OPS-P4-004 | Nested env files permitted in web builder context | Medium / Confirmed configuration |
| 5 | OPS-P4-005 | Runtime containers do not enforce non-root execution | Medium / Confirmed configuration |
| 6 | OPS-P4-006 | Backend/web readiness absent from Compose | Medium / Confirmed configuration |
| 7 | OPS-P4-007 | Artifact typechecks, mobile export and container builds missing from CI | Medium / Confirmed configuration |
| 8 | OPS-P4-008 | New generated modules evade drift check | Medium / Confirmed reproduction |
| 9 | OPS-P4-009 | Python optimization removes smoke safety/result checks | Medium / Confirmed reproduction |
| 10 | OPS-P4-010 | Runtime/build mismatch, including EOL Node builder | Medium / Confirmed |
| 11 | OPS-P4-011 | Overrides remove native dependencies for other hosts | Medium / Confirmed removal; target failure Likely |
| 12 | OPS-P4-012 | Documented first-run Docker flow fails with untouched template | Medium / Confirmed reproduction |
| 13 | OPS-P4-013 | Post-merge hook selects retired database package | Low / Confirmed reproduction |
| 14 | OPS-P4-014 | CI privileges and dependency identity remain implicit | Low / Confirmed configuration |

### Findings

#### [OPS-P4-001] Published PostgreSQL retains known superuser defaults

Severity: **High** | Confidence: **Confirmed configuration** | Category: Infrastructure security | Effort: S/M

Location: docker-compose.yml:7, docker-compose.yml:8, docker-compose.yml:12, docker-compose.yml:24, docker-compose.yml:25.

Evidence: POSTGRES_USER falls back to postgres, POSTGRES_PASSWORD to qawi_local_password, and the port mapping is "5432:5432". The backend receives the same identity.

After supplying a required JWT secret, leaving DB settings unchanged permits a known password and broadly published database port. POSTGRES_USER creates a superuser; renaming it does not restrict privileges. A reachable database with defaults bypasses API tenant authorization. Actual host-firewall exposure was not tested. See [Docker port publishing](https://docs.docker.com/engine/network/port-publishing/) and the [official PostgreSQL image variables](https://docs.docker.com/guides/postgresql/immediate-setup-and-data-persistence/).

Fix: keep PostgreSQL internal in deployment. Use 127.0.0.1:5432:5432 only in a developer override if needed. Require a unique password; provision distinct restricted application and migration identities. Rotate credentials explicitly on existing volumes: initialization env changes do not rotate existing accounts. Related: original OPS-002, partly fixed for JWT only.

#### [OPS-P4-002] One malformed Host terminates the preview server

Severity: **High** | Confidence: **Confirmed locally** | Category: Availability / request validation | Effort: S

Location: artifacts/qawi-mobile/server/serve.js:111, artifacts/qawi-mobile/server/serve.js:69, artifacts/qawi-mobile/server/serve.js:75; artifacts/qawi-mobile/server/templates/landing-page.html:389 and :409. Deployment wiring: artifacts/qawi-mobile/.replit-artifact/artifact.toml:21 -> package serve -> server/serve.js.

Evidence: the request callback constructs new URL with req.headers.host outside try/catch. It also reads:
~~~js
const host = req.headers["x-forwarded-host"] || req.headers["host"];
.replace(/EXPS_URL_PLACEHOLDER/g, expsUrl)
~~~

A single unauthenticated GET / with Host: [ caused ERR_INVALID_URL, connection termination and **process exit 1**. Reproduced against unchanged server code with its listener forced to loopback/ephemeral port; child cleaned up. A separate in-process test confirmed crafted forwarded-host markup appears unescaped in generated HTML. Browser delivery/exploitation depends on proxy behavior and was not established. Compose does not run this server; this applies if the checked-in Replit/Expo serving path is used.

Fix: parse targets against a fixed origin inside try/catch; return 400 for malformed input. Validate allowed hosts, generate deep links from a configured origin, and trust forwarded headers only at an explicit proxy boundary. Escape HTML attributes and serialize JavaScript strings correctly. Add a process-level test proving bad input fails while the next valid request still works.

#### [OPS-P4-003] JavaScript vulnerabilities never gate pull requests

Severity: **High** | Confidence: **Confirmed gate gap and scanner results** | Category: CI / dependencies | Effort: M

Location: .github/workflows/security.yml:8, .github/workflows/security.yml:12, .github/workflows/security.yml:29; .github/workflows/build-test.yml:83 and :90; lib/api-spec/package.json:9.

Evidence: the security PR trigger selects only "qawi-backend/pom.xml"; its only scan job invokes the backend dependency-check plugin. The codegen dependency is "orval": "^8.5.2". No checked-in workflow runs a JavaScript audit.

Fresh pnpm audit --json exited **1**. Metadata reported **13 critical, 92 high, 54 moderate, 15 low** across **1,030 dependencies**, with **167 advisory entries**. Counts are the tool's metadata, not independently exploitable production issues. Examples include Orval 8.5.3 through lib/api-spec, tar 7.5.13 through Expo CLI, and shell-quote 1.8.3 through React Native developer tooling. CI executes the generator. References: [Orval schema-property injection](https://github.com/advisories/GHSA-6mr6-jvcr-2f25), [tar resource exhaustion](https://github.com/advisories/GHSA-23hp-3jrh-7fpw), [shell-quote escaping](https://github.com/advisories/GHSA-w7jw-789q-3m8p).

Fix: add a manifest/lockfile-triggered JS audit gate and scheduled scan. Triage paths and reachable operations, then update compatible direct/transitive dependencies. For those examples the scan lists patched floors Orval >=8.21.0, tar >=7.5.19 and shell-quote >=1.8.4; these are advisory-specific floors, not a complete upgrade plan. Check Expo/native compatibility and regenerate/typecheck clients after Orval upgrades. Avoid blanket force upgrades. Add a secret scanner: filename hygiene cannot detect credentials in other files. Backend scanning already has a genuine CVSS >=8 threshold at pom.xml:176. Dependency remediation is outside this read-only phase.

#### [OPS-P4-004] Root Docker ignore rules permit nested env files

Severity: **Medium** | Confidence: **Confirmed configuration** | Category: Build / secret handling | Effort: S

Location: .dockerignore:11 and :12; docker-compose.yml:38; artifacts/qawi-web/Dockerfile:12; artifacts/qawi-web/.dockerignore:3.

Evidence:
~~~text
.env
.env.*
!.env.example
~~~
~~~dockerfile
COPY artifacts/qawi-web ./artifacts/qawi-web
~~~

Compose builds web from repository root. These root-only patterns do not exclude artifacts/qawi-web/.env. The package's separate .dockerignore is not the context-root ignore file or a Dockerfile.dockerignore. That local env file exists; its values were not read. It can enter the builder and influence a build. This does not prove a secret entered the final static image. Backup archives also lack context exclusions; transfer depends on builder behavior and selected files. See [Docker context and pattern rules](https://docs.docker.com/build/concepts/context/).

Fix: add recursive **/.env, **/.env.*, !**/.env.example patterns plus backup/credential exclusions at the effective context root. Supply intentional public frontend settings as build arguments. Git ignore rules do not filter Docker contexts.

#### [OPS-P4-005] Runtime images lack enforced non-root execution

Severity: **Medium** | Confidence: **Confirmed configuration** | Category: Container privileges | Effort: S/M

Location: qawi-backend/Dockerfile:7 and :11; artifacts/qawi-web/Dockerfile:17 and :20; docker-compose.yml:19.

Evidence: runtime stages use "FROM eclipse-temurin:21-jre-alpine" and "FROM nginx:alpine"; neither sets USER, and Compose has no user override. Privilege policy relies on image defaults. Ordinary nginx has a privileged master; worker privileges are separate. Effective built-image UIDs were not inspected because the engine is unavailable.

Fix: select a dedicated Java UID with minimal writable ownership. Use an unprivileged nginx configuration on a high internal port with appropriate cache/pid paths. Test required writes before adding capability drops and no-new-privileges. Related: original OPS-001 remains open.

#### [OPS-P4-006] Compose cannot determine app readiness

Severity: **Medium** | Confidence: **Confirmed configuration** | Category: Availability | Effort: S

Location: docker-compose.yml:31 and :45; qawi-backend/Dockerfile:11; artifacts/qawi-web/Dockerfile:20.

Evidence: backend waits for PostgreSQL service_healthy, but web depends only on backend process startup. Only PostgreSQL has a healthcheck. A running JVM need not have completed migrations/Spring initialization; web can start during that interval. Compose also cannot identify a hung app. A healthcheck alone does not restart an unhealthy container. See [Compose startup semantics](https://docs.docker.com/compose/how-tos/startup-order/).

Fix: add bounded backend readiness/web-serving probes, startup grace periods and service_healthy dependency gating. Configure actual platform recovery/alerts and test startup/recovery with packaged images. Related: original OPS-001.

#### [OPS-P4-007] CI omits artifact typechecks and deployment builds

Severity: **Medium** | Confidence: **Confirmed configuration** | Category: CI coverage | Effort: M

Location: .github/workflows/build-test.yml:84 and :86; artifacts/qawi-web/package.json:8; artifacts/qawi-mobile/package.json:10; lib/api-spec/package.json:6.

Evidence: web build runs "vite build --config vite.config.ts"; mobile runs queue tests. Codegen checks shared libraries, but artifact-level web/mobile/marketing typechecking is absent. There is no Expo export or Dockerfile build. Bundling/context/proxy/image defects can therefore pass CI. Fresh local workspace typechecking and eight queue tests passed; this finding concerns future regression coverage.

Fix: run pnpm typecheck, an Expo production export with explicit public test configuration, and builds of actual Docker contexts. Test packaged startup/proxy behavior with disposable services. PR exports need no store-signing credentials. Preserve migration, contract and restored-app checks.

#### [OPS-P4-008] New generated modules evade drift checking

Severity: **Medium** | Confidence: **Confirmed reproduction** | Category: CI correctness | Effort: S

Location: .github/workflows/build-test.yml:90 and :91.

Evidence:
~~~sh
pnpm --filter @workspace/api-spec run codegen
git diff --exit-code -- lib/api-client-react/src/generated lib/api-zod/src/generated
~~~

git diff ignores untracked files. In an isolated temporary repository this exact path-limited gate exited **0** while git status showed a new generated module as "??". A new DTO/module can be absent from the submitted change without failing this gate.

Fix: after regeneration require empty path-limited "git status --porcelain --untracked-files=all", or compare generation in a temporary directory. Check new files as well as modifications/deletions. Do not stage files in the user's index merely to check drift.

#### [OPS-P4-009] Python optimization disables smoke safety and result checks

Severity: **Medium** | Confidence: **Confirmed reproduction** | Category: Test tooling / data safety | Effort: S

Location: scripts/phase2-smoke.py:43, :44, :57 and :120.

Evidence:
~~~python
assert re.fullmatch(r"qawi_drill_[a-z0-9_]+", database), "Only disposable drill databases are allowed"
assert destination.hostname in {"127.0.0.1", "localhost"}, "Only loopback applications are allowed"
~~~

Python -O or PYTHONOPTIMIZE removes assertions. PGDATABASE=not_a_drill was rejected normally but reached the first SQL call under optimization. SQL was replaced with a sentinel, so **no SQL executed**. Result assertions are also removed, allowing a false success message. CI currently uses normal Python; this does not invalidate the previous normal-mode drill. See [Python optimization behavior](https://docs.python.org/3/using/cmdline.html#cmdoption-O).

Fix: use explicit checks raising ValueError for environment/destination guards and result checks that fail regardless of optimization. Add a no-database subprocess test in both modes. Preserve the separate backup tool's no-overwrite/no-drop protections.

#### [OPS-P4-010] Build/runtime versions differ, including EOL Node

Severity: **Medium** | Confidence: **Confirmed configuration/support status** | Category: Release parity | Effort: M

Location: artifacts/qawi-web/Dockerfile:1; .github/workflows/build-test.yml:80, :52 and :23; .github/workflows/security.yml:21; qawi-backend/pom.xml:22; qawi-backend/Dockerfile:1; docker-compose.yml:3.

Evidence: web Docker uses node:20-alpine while CI uses Node 24. Maven/CI use Java 19, Docker Java 21. Compose uses PostgreSQL 15, CI PostgreSQL 16. Node 20 is EOL at this review date per the [Node release table](https://nodejs.org/en/about/previous-releases). Passing CI does not prove the Docker builder behaves the same or receives fixes. No specific database incompatibility was demonstrated.

Fix: align CI/Docker on a tested supported Node line, standardize Java 21 as already planned, and test the deployed PostgreSQL major with compatible backup tools. Treat live database-major upgrades separately. Related: original ARCH-005; implementation remains outside this audit.

#### [OPS-P4-011] Overrides delete native binaries for other hosts

Severity: **Medium** | Confidence: **Confirmed removal; target failure Likely** | Category: Portability | Effort: S/M

Location: pnpm-workspace.yaml:78, :79, :109, :121 and :150.

Evidence:
~~~yaml
"esbuild>@esbuild/darwin-arm64": "-"
"@tailwindcss/oxide>@tailwindcss/oxide-linux-arm64-musl": "-"
"rollup>@rollup/rollup-darwin-arm64": "-"
~~~

These remove dependency edges rather than selecting the current platform. Windows ngrok binaries are removed too. Mac and ARM Linux/Alpine tooling needs platform binaries; fallback behavior differs by tool. Windows x64 checks passed; no Mac/ARM build ran. [pnpm override semantics](https://pnpm.io/settings/dependency-resolution#overrides) confirm removal behavior.

Fix: remove blanket platform deletions, allow optional platform dependency selection, deliberately regenerate the lockfile and test required architectures. If deployment is x64-only, document that while preserving developer-platform dependencies.

#### [OPS-P4-012] Documented first-run Docker flow fails

Severity: **Medium** | Confidence: **Confirmed reproduction** | Category: Developer operations | Effort: S

Location: scripts/dev.ps1:19 and :29; .env.example:4; README.md:172; docker-compose.yml:26.

Evidence: dev.ps1 copies .env.example and immediately invokes Compose. The template has "JWT_SECRET=", while README says defaults work without editing. With inherited JWT removed, "docker compose --env-file .env.example config --quiet" exited **1**, reporting required JWT missing. A disposable >=32-byte test value made config validation pass. No user's env file was read or overwritten.

Fix: keep fail-closed secret requirements. Add an explicit first-run generation/setup step or safely generate a unique local value without replacing existing settings. Correct README and distinguish local bootstrap from production provisioning. Do not restore a shared fallback.

#### [OPS-P4-013] Post-merge hook still targets retired database package

Severity: **Low** | Confidence: **Confirmed reproduction** | Category: Retired tooling | Effort: S

Location: .replit:55; scripts/post-merge.sh:4.

Evidence: configured hook invokes "pnpm --filter db push". Phase 2 retired the Node DB package. A safe "pnpm --filter db exec node ..." probe printed **No projects matched the filters** and exited 0. The stale selector is silently ignored and does not migrate Spring's schema.

Fix: remove the obsolete command and keep migrations under reviewed Flyway procedures. Use --fail-if-no-match where automation requires a package match. Review the hook's 20-second install timeout separately; no timeout failure was reproduced.

#### [OPS-P4-014] CI privileges and dependency identity remain implicit

Severity: **Low** | Confidence: **Confirmed configuration** | Category: Supply chain | Effort: S/M

Location: .github/workflows/build-test.yml:12, :49 and :76; .github/workflows/security.yml:32; artifacts/qawi-web/Dockerfile:17.

Evidence: actions use mutable refs such as actions/checkout@v4 and pnpm/action-setup@v4; images use tags such as nginx:alpine. Neither workflow declares permissions. Effective privileges depend on repository/org settings, which were not inspected. No compromise or excessive effective privilege was established.

Fix: declare minimum permissions, normally contents: read; disable checkout credential persistence where unnecessary. Pin reviewed action commits/image digests with automated update review, or use a supported workflow dependency lock mechanism. See [GitHub secure-use guidance](https://docs.github.com/en/actions/reference/security/secure-use). Do not invent hashes or freeze security updates indefinitely.


### Existing controls and earlier claims checked

| Claim | Current assessment |
|---|---|
| SEC-006: target/client env tracked | Current index hygiene passes. Private local env files remain on disk. Git history was not secret-scanned. |
| OPS-002: Compose JWT fallback | Fixed: missing JWT fails config; production startup guard rejects weak/development settings. DB fallback remains. |
| ARCH-001: Hibernate updates production schema | Current application.properties uses validate, explicit Flyway baseline and clean-disabled. No live schema queried. |
| OPS-003: migration/mobile checks absent | Partly superseded: Maven migration/concurrency, queue tests, contract, backup/restore and restored-app smoke now run in CI. Other gaps are above. |
| Backend vulnerability scanner | Present, pinned, configured at CVSS >=8. Not rerun for this infrastructure phase. |
| Backups | Checksum, fresh restricted drill target, transactional restore, row counts and restored-app check exist. Production off-site/encryption/scheduling/access/retention remain documented rollout work. |
| Retired api-server | No Compose/Replit startup workflow runs it. Stale database hook remains. |
| Sandbox deployment | No Compose/Replit production service found; artifact declares kind = "design". App content not audited. |
| API routing | nginx proxies /api and Vite has dev proxies. No live TLS edge, host firewall, hosting secret or repository policy inspected. |

### Coverage ledger

49 source/config files are included in final SHA-256 preservation checks. Files were read in full unless marked skimmed. Private env values, application UI/business logic, graphify/build output and attached assets were excluded. Lockfile internals were not manually audited; pnpm audit used the lockfile as input.

| File | Status / scope |
|---|---|
| .dockerignore | Reviewed - root context |
| .env.example | Reviewed - public template |
| .github/workflows/build-test.yml | Reviewed - all jobs/steps |
| .github/workflows/security.yml | Reviewed - triggers/scanner/artifacts |
| .gitignore | Reviewed |
| .npmrc | Reviewed |
| .replit | Reviewed - workflows/ports/hooks |
| docker-compose.yml | Reviewed - all services/volume |
| package.json | Reviewed - tooling entry points |
| pnpm-workspace.yaml | Reviewed - all settings/overrides |
| qawi-backend/Dockerfile | Reviewed - both stages |
| qawi-backend/.dockerignore | Reviewed |
| qawi-backend/.gitignore | Reviewed |
| qawi-backend/pom.xml | Skimmed - compiler/scanner/build config only |
| qawi-backend/src/main/resources/application.properties | Reviewed - configuration boundary |
| qawi-backend/src/main/java/com/qawi/config/ProductionSafetyCheck.java | Reviewed - startup boundary only |
| artifacts/qawi-web/Dockerfile | Reviewed - both stages |
| artifacts/qawi-web/.dockerignore | Reviewed - context comparison |
| artifacts/qawi-web/nginx.conf | Reviewed |
| artifacts/qawi-web/vite.config.ts | Reviewed - build/deployment only |
| artifacts/qawi-web/package.json | Reviewed - scripts/tooling dependencies |
| artifacts/qawi-web/.replit-artifact/artifact.toml | Reviewed |
| artifacts/qawi-mobile/.gitignore | Reviewed |
| artifacts/qawi-mobile/package.json | Reviewed - build/serve/test wiring |
| artifacts/qawi-mobile/eas.json | Reviewed - no remote EAS settings queried |
| artifacts/qawi-mobile/app.json | Reviewed - deployment config only |
| artifacts/qawi-mobile/.replit-artifact/artifact.toml | Reviewed |
| artifacts/qawi-mobile/scripts/build.js | Reviewed - all 573 lines; not executed because it clears build/cache directories |
| artifacts/qawi-mobile/server/serve.js | Reviewed - all 135 lines; isolated tests |
| artifacts/qawi-mobile/server/templates/landing-page.html | Skimmed - substitutions/script contexts; visual styles skipped |
| artifacts/qawi-marketing/.replit-artifact/artifact.toml | Reviewed |
| artifacts/qawi-marketing/vite.config.ts | Reviewed - build/deployment only |
| artifacts/qawi-marketing/prerender.mjs | Reviewed; not executed |
| artifacts/mockup-sandbox/.replit-artifact/artifact.toml | Reviewed - design classification |
| artifacts/mockup-sandbox/vite.config.ts | Reviewed - config only |
| lib/api-spec/package.json | Reviewed - generator/check wiring |
| scripts/check-git-hygiene.mjs | Reviewed and executed |
| scripts/database-backup.py | Reviewed - no real backup/drill run |
| scripts/dev.ps1 | Reviewed/parsed; not executed |
| scripts/stop.ps1 | Reviewed/parsed; not executed |
| scripts/ensure-pnpm.mjs | Reviewed |
| scripts/export-openapi.mjs | Reviewed; check mode executed |
| scripts/phase2-smoke.py | Reviewed; SQL intercepted in safety probe |
| scripts/post-merge.sh | Reviewed; only safe selector probe ran |
| scripts/package.json | Reviewed |
| scripts/tsconfig.json | Reviewed |
| scripts/src/hello.ts | Reviewed |
| tests/k6/load.js | Reviewed - health/login/me only; not run against a host |
| tests/k6/security.js | Reviewed - auth/headers/lockout; not run against a host |

Context read: AUDIT_PROMPT.md, earlier audit sections, STATE.md, AGENTS.md/shared instructions, README.md and PHASE2_DEPLOYMENT.md. Infrastructure claims in QAWI_SECURITY.md, TECHNICAL_DOCS.md, SYSTEM_DESIGN_AND_MIGRATION.md, future plan.md and replit.md were selectively checked. No additional workflow files were present. No UI/UX review or design change was performed.

### Verification and limits

| Check | Result |
|---|---|
| Compose template with inherited JWT removed | Expected exit 1: required JWT missing |
| Compose template with disposable test JWT | Configuration validation passed; no services started |
| Both workflow YAML files | Parsed; not a replacement for actionlint/GitHub execution |
| Python AST, six Node scripts, two PowerShell helpers | Syntax checks passed |
| Selected infrastructure credential-pattern scan | Zero private-key/AWS/GitHub/Stripe/JWT-literal matches; not a comprehensive secret scan |
| Git hygiene | Passed: no target/private env files in current index |
| New generated-file drift reproduction | Gate returned 0 while new module was untracked |
| Normal/optimized smoke guard | Normal rejected; optimized reached intercepted SQL; no SQL executed |
| Preview-server malformed Host | One loopback request caused exit 1 / ERR_INVALID_URL; child cleaned up |
| Forwarded-host template harness | Unescaped markup confirmed; no browser exploitation attempted |
| Retired db selector probe | No projects matched; exit 0; no database command ran |
| pnpm audit --json | Exit 1; registry metadata reported above; raw result in system temp qawi-phase4-pnpm-audit.json |
| pnpm typecheck | Passed; local ignored phase4-typecheck.log |
| Mobile queue tests | 8 passed, 0 failed; harmless Node module-type warning |
| Existing Spring contract consistency | Passed: 201 paths / 242 operations; export not freshly rebuilt |
| Source/document preservation | Final hashes and append-only checks recorded in STATE.md |
| Container builds/runtime | Not run: CLI/Compose installed, Docker Desktop Linux engine pipe unavailable |
| Maven verify/backend OWASP/fresh export | Not rerun: backend application audit outside Phase 4; Maven exists at documented tools path, not on PATH |
| actionlint, Gitleaks, Trivy, Semgrep, k6 | Not installed/on PATH; no scan/test results claimed |
| Hosting TLS/firewall/policies/backup schedule/branch protection | Not inspected |

Implementation order: secure DB/preview serving, triage JS advisories, harden Docker contexts/users/readiness and align runtimes, then close CI/drift/smoke-safety gaps. These are recommendations only. No source fixes, dependency upgrades, commits, deployment or other audit phases were performed.


---

## Phase 5 cross-cutting audit - current workspace, 2026-11-24

Scope: **Phase 5: Cross-cutting** from AUDIT_PROMPT.md:69: duplication, drift between backend/client contracts, and dead code. This completes that audit phase only. It does not implement fixes, rerun the client/infrastructure audit phases, or change the implementation roadmap. Existing Phase 0/2 work, the Phase 4 report, and unrelated staged/unstaged changes remain intact. Only audit/shared documents were edited; tests produced ignored build/log artifacts and temporary probes.

### Findings at a glance

**13 findings: 4 High, 8 Medium, 1 Low.** The strongest failures were reproduced using current Java DTOs/services, Spring's actual ObjectMapper and disposable in-memory H2 data, plus isolated execution of existing TypeScript logic. No live PostgreSQL, real accounts, external API, device, hosting configuration or telemetry account was used.

| ID | Finding | Severity | Evidence level |
|---|---|---|---|
| DATA-P5-001 | Rest-day flags disappear across request/serialization conventions | High | Confirmed binding and service trace |
| DATA-P5-002 | Marking a staff member absent saves PRESENT | High | Confirmed persisted H2 result |
| DATA-P5-003 | Pricing editor silently truncates decimal prices | High | Confirmed actual payload execution |
| DATA-P5-004 | Finance labels plan estimates as actual revenue | High | Confirmed inconsistent H2 results |
| ARCH-P5-005 | Mobile admin dashboard calls absent endpoints and shows zeros | Medium | Confirmed HTTP and caller trace |
| ARCH-P5-006 | Active mobile nutrition-plan workflow uses obsolete route shapes | Medium | Confirmed mappings and navigation trace |
| ARCH-P5-007 | Generic map contracts produce incorrect generated types/validators | Medium | Confirmed schema/type/validator probes |
| DATA-P5-008 | Mobile transport replays mutations after HTML responses | Medium | Confirmed repeated POST; duplicate persistence conditional |
| ARCH-P5-009 | Finance CSV bypasses shared authentication/transport | Medium | Confirmed actual closure execution; original FE-001 remains open |
| ARCH-P5-010 | Subscription status rules disagree across server/client modules | Medium | Confirmed current service outputs |
| DATA-P5-011 | Lead email is accepted by the form and silently discarded | Medium | Confirmed persisted H2 result |
| DATA-P5-012 | Both finance clients relabel JOD amounts as SAR | Medium | Confirmed source/response mismatch |
| MAINT-P5-013 | Obsolete web pages remain outside the application import graph | Low | Confirmed current entry/import graph |

The audit inventoried 296 handwritten apiFetch calls and 7 raw fetch calls in 72 files, compared 65 statically resolvable inline request bodies, and inspected the 201-path/242-operation Spring contract and 126 schemas. These counts describe structural inspection, not 303 live HTTP tests. Query-string templates and deliberately dynamic URL branches were manually distinguished from actual route failures.

### High findings

#### [DATA-P5-001] Rest-day flags use different JSON names across clients and Java

Severity: **High** | Confidence: **Confirmed** | Category: Data integrity / DTO drift | Effort: S/M

Locations:
- Backend: dto/AddScheduleDayRequest.java:14, dto/CreateTemplateRequest.java:21, service/WorkoutPlanService.java:129, controller/WorkoutPlanController.java:58, entity/ScheduleDay.java:37, under qawi-backend/src/main/java/com/qawi/.
- Web: src/pages/coach/create-plan.tsx:144, src/pages/coach/member-detail.tsx:137, src/pages/member/my-plan.tsx:71, src/pages/coach/templates.tsx:143, under artifacts/qawi-web/.
- Mobile: app/coach/create-plan.tsx:79 and :116, app/member/my-plan.tsx:409, under artifacts/qawi-mobile/.

Evidence:
~~~java
private boolean isRestDay = false;
~~~
~~~ts
data: { dayDate, dayName, dayNameAr, isRestDay }
~~~

Lombok/Jackson expose the logical JSON property as **restDay**, while these handwritten requests send **isRestDay**. Spring's actual ObjectMapper bound isRestDay:true to false; restDay:true bound to true. Nested template input has the same failure. WorkoutPlanService saves req.isRestDay(), so the dropped flag reaches persistence rather than merely affecting display. ScheduleDay serialization also emitted restDay. Both clients can report successful creation while losing the chosen rest-day meaning.

Fix: define one explicit wire name and accept the legacy input name with a Jackson alias during migration. For example, a restDay field with JsonAlias("isRestDay") preserves old request compatibility. Align request/response DTOs, all five day-creation callers and both template builders; regenerate consumers. Add a literal client-payload -> HTTP binding -> stored-day round-trip test, including nested templates. Do not rename database columns or remove compatibility blindly.

#### [DATA-P5-002] Staff ABSENT input is persisted as PRESENT

Severity: **High** | Confidence: **Confirmed** | Category: Attendance data integrity | Effort: S

Locations: artifacts/qawi-mobile/app/(hr)/staff.tsx:25; artifacts/qawi-web/src/pages/hr/dashboard.tsx:152; qawi-backend/src/main/java/com/qawi/dto/StaffAttendanceRequest.java:14; controller/HrController.java:46; service/HrService.java:105.

Evidence:
~~~ts
data: { type, date: new Date().toISOString().slice(0, 10) }
~~~
~~~java
att.setStatus(req.getStatus() != null ? req.getStatus() : "PRESENT");
~~~

The mobile form supports PRESENT and ABSENT but sends type. The DTO accepts status, so type is ignored and status remains null. An actual service call in disposable H2 persisted **PRESENT** from a request containing type:"ABSENT". Web sends type:"PRESENT", which happens to appear correct because of the same fallback. This can corrupt HR attendance and downstream reports.

Fix: use the generated status field in both clients, validate allowed statuses and preserve a temporary legacy alias if required. Do not silently convert malformed explicit attendance input into PRESENT. Test the real absent/present payloads through deserialization and repository readback.

#### [DATA-P5-003] Editing a tier silently changes decimal prices

Severity: **High** | Confidence: **Confirmed** | Category: Monetary correctness / client-server drift | Effort: S

Locations: artifacts/qawi-web/src/pages/super/pricing.tsx:26, :42, :138, :144; qawi-backend/src/main/java/com/qawi/dto/PlatformTierRequest.java:14; service/PlatformTierService.java:46.

Evidence:
~~~ts
price1m: parseInt(p1m) || 0,
price3m: parseInt(p3m) || 0,
price6m: parseInt(p6m) || 0,
price12m: parseInt(p12m) || 0,
~~~

Executing the actual onSave payload expression turned 12.345, 37.035, 74.070 and 148.140 into 12, 37, 74 and 148. Existing prices are loaded into those same fields, so editing another tier field can change prices too. The backend correctly accepts/preserves 12.345 as BigDecimal; the client destroys precision before transmission.

Fix: validate the complete decimal input, retain up to the supported three fractional digits, and preserve the numeric JSON contract within supported client numeric ranges. Do not parse prices as integers or coerce invalid text to a free tier. Add an edit-without-price-change and a 12.345 round-trip regression. The Phase 2 database migration should remain intact.

#### [DATA-P5-004] Finance actualRevenue does not use recorded subscription amounts

Severity: **High** | Confidence: **Confirmed** | Category: Duplicated financial definitions | Effort: M

Locations: qawi-backend/src/main/java/com/qawi/service/FinanceService.java:132, :144, :150; service/GymAdminService.java:422, :442; controller/FinanceController.java:39; artifacts/qawi-web/src/pages/finance/dashboard.tsx:187.

Evidence:
~~~java
BigDecimal actualRevenue = avgPrice.multiply(BigDecimal.valueOf(activeCount));
~~~
~~~java
BigDecimal totalRevenue = histories.stream().map(SubscriptionHistory::getPrice)
    .reduce(BigDecimal.ZERO, BigDecimal::add);
~~~

Two modules present different revenue definitions. Finance estimates actualRevenue from average available plan price and active membership count. Admin sums recorded subscription amounts. In the same disposable gym with two active members, a 100.000 plan and subscription records for 50.000 and 75.000, finance returned **200.000**, while admin's recorded total was **125.000**. All records were in the same current-day period. Changing plan prices can therefore change reported actual revenue without a new recorded transaction.

Fix: define a shared server-side recorded-revenue aggregation with an explicit reporting period and typed result. Keep plan-based projections/MRR separate and clearly named; account for plan duration when defining projections. Reuse the recorded aggregation across finance/admin clients instead of maintaining competing calculations. Add a discounted-renewal/plan-price-change fixture to catch this divergence. This test compares existing subscription records, not an independently verified cash-payment ledger.

### Medium findings

#### [ARCH-P5-005] Mobile admin dashboard hides missing routes behind zero data

Severity: **Medium** | Confidence: **Confirmed** | Category: Route and response drift | Effort: S/M

Locations: artifacts/qawi-mobile/app/(admin)/index.tsx:31, :35, :51, :70; app/(admin)/_layout.tsx:13; qawi-backend/src/main/java/com/qawi/controller/GymAdminController.java:113 and :118; dto/AdminAnalyticsResponse.java:12; entity/User.java:64.

Evidence:
~~~ts
apiFetch<any>("/admin/dashboard/stats").catch(() => null)
apiFetch<any[]>("/admin/members/expiring").catch(() => [])
~~~

Neither route exists in the fresh Spring contract or controller mappings. Authenticated requests to both returned **500** in the isolated app because the generic exception handler also catches the missing-resource error. The active admin tab turns these failures into successful empty query data, then renders zeros/no expiring members.

Existing routes are /admin/analytics and /admin/expiring-subscriptions. Merely changing URLs is insufficient: analytics has activeMembers, not activeThisWeek; member records use subscriptionEndDate, not subscriptionExpiresAt.

Fix: consume the documented typed operations, align metric meanings and field names, and preserve an observable error instead of converting request failure to real-looking zero data. Handle absent resources with appropriate 4xx responses separately. Add an admin dashboard contract check using nonzero fixtures.

#### [ARCH-P5-006] Active mobile legacy nutrition paths omit the plans segment

Severity: **Medium** | Confidence: **Confirmed mappings/callers** | Category: Compatibility and route drift | Effort: S/M

Locations: artifacts/qawi-mobile/app/(coach)/plans.tsx:38, :74, :90; app/coach/create-nutrition.tsx:69 and :72; qawi-backend/src/main/java/com/qawi/controller/NutritionController.java:22, :35, :45, :53, :74.

Evidence: the coach plans screen navigates to /coach/create-nutrition. That screen POSTs /nutrition and /nutrition/{id}/meals; the list/delete branches use /nutrition/member/{id} and /nutrition/{id}. The compatibility controller is mounted at **/api/v1/nutrition/plans**. None of those four old operation shapes exists in the current contract.

Fix: use the existing compatibility prefix consistently as a short-term correction, or migrate the whole workflow to the defined calendar-plan model. Test list/create/meal-add/delete together. Preserve legacy records and owning-coach authorization; deprecation is not permission to delete the legacy model. V3's canonical adapter is separate from this outdated plan flow.

#### [ARCH-P5-007] Generic map schemas contradict valid request/response data

Severity: **Medium** | Confidence: **Confirmed** | Category: API contract quality | Effort: M

Locations: qawi-backend/src/main/java/com/qawi/controller/GymClassController.java:54; service/NutritionV2Service.java:88; lib/api-client-react/src/generated/api.schemas.ts:2300; lib/api-zod/src/generated/api.ts:9; lib/api-spec/openapi.json at the matching operation schemas.

Evidence:
~~~ts
export type GetApiV1NutritionTargetsMemberId200 = {
  [key: string]: { [key: string]: unknown };
};
~~~
~~~java
if (t.isEmpty()) return Map.of("hasTarget", false);
~~~

Map<String,Object> is described as a map of JSON objects rather than arbitrary JSON values. A real no-target response contains a boolean. Assigning that response to the generated type produced **TS2322**. The generated class-creation Zod request validator also rejected legitimate string/number fields name, instructorName, dateTime, durationMinutes and maxCapacity because it expects objects.

The contract scan found **69 top-level loose success-response schemas**, beyond nested map/list cases. The contract is real and freshly generated, but still cannot enforce important payload shapes. Class creation also documents a default 200 while the controller returns 201; explicit status metadata remains necessary.

Fix: replace business response/request maps with named DTOs, document required/nullable fields and actual status codes, and regenerate. Reserve arbitrary JSON maps for actual extension data with a correct arbitrary-value schema. Add real payload validation/type fixtures. Existing contract snapshot tests prove export consistency and route/security metadata, not full payload conformance. Do not hand-edit generated files to conceal the source mismatch.

#### [DATA-P5-008] Mobile retries non-idempotent writes after HTML

Severity: **Medium** | Confidence: **Confirmed replay; duplicate persistence conditional** | Category: Divergent transport rules | Effort: S/M

Locations: artifacts/qawi-mobile/services/api.ts:39, :66, :70; artifacts/qawi-web/src/services/api.ts:36; lib/api-client-react/src/custom-fetch.ts:350; artifacts/qawi-mobile/services/attendance-sync.ts:12.

Evidence: the mobile HTML-retry loop calls doFetch(path, options) again without restricting the method or adding an idempotency key. An isolated execution of the unchanged transport sent the same POST twice after an initial HTML response. Persistent HTML can cause up to eleven attempts. Whether an intermediary already forwarded the original write is not known; no live duplicate operation was performed.

The web wrapper treats a successful HTML/non-JSON response as an empty object instead. The generated transport has its own parse/error policy. These independent implementations disagree about success and retry behavior.

Fix: retry safe reads by default; retry writes only under explicit server-supported idempotency semantics. Treat wrong media types as errors, not empty successful data. Reuse a platform-neutral transport policy with small storage/navigation adapters. Preserve the attendance queue's captured-account token, durable operation key, timeout and owner checks; do not apply a generic replay rule over them.

#### [ARCH-P5-009] Finance export reads serialized state as a bearer token

Severity: **Medium** | Confidence: **Confirmed** | Category: Duplicate authentication/transport | Effort: S

Locations: artifacts/qawi-web/src/pages/finance/dashboard.tsx:89; src/stores/authStore.ts:39 and :59; src/services/api.ts:12; qawi-backend/src/main/java/com/qawi/controller/FinanceController.java:44.

Evidence:
~~~ts
const token = localStorage.getItem('qawi_token') ?? '';
headers: { Authorization: ... }
~~~

Zustand persists a JSON envelope containing state.token. Executing the actual export closure with a synthetic stored envelope produced Bearer followed by the **entire JSON string**, not the JWT. The closure also uses the UI base path instead of VITE_API_URL and downloads a blob without checking res.ok, so an error body can be saved as CSV. This is the original FE-001, still unresolved.

Fix: obtain credentials through the auth adapter/shared transport, respect API configuration, check status/media type and request a blob explicitly. Keep the server's authenticated CSV endpoint. Add an export check with persisted state, a non-default API origin and a 401 response. Never log real tokens in a test.

#### [ARCH-P5-010] Subscription status has competing definitions

Severity: **Medium** | Confidence: **Confirmed outputs** | Category: Duplicated domain rules | Effort: M

Locations: qawi-backend/src/main/java/com/qawi/service/SubscriptionStatusUtil.java:40; CoachDashboardService.java:181; ReceptionService.java:452; FinanceService.java:214; artifacts/qawi-web/src/lib/sub-status.ts:5 and :9.

Evidence: canonical compute checks inactive/no-subscription states, while the three service helpers calculate status again from dates. For the same inactive, future-dated member, actual service outputs were:
- canonical: INACTIVE;
- coach, reception and finance: ACTIVE.

The browser has another date-based implementation and a separate GRACE/EXPIRING vocabulary. Renewal warnings may legitimately differ from account/access state; those different meanings are currently mixed into loosely typed status strings. This finding does not establish an access-control bypass.

Fix: return one canonical account/access status plus a separate renewal-warning/expiry metric from the backend. Type the fields and have clients map labels/colors without recomputing entitlement. Keep grace boundaries and time-zone/date behavior in one tested domain function, including inactive and never-subscribed members. Avoid forcing unrelated presentation warnings into the access-status enum.

#### [DATA-P5-011] Lead email is discarded between form and persistence

Severity: **Medium** | Confidence: **Confirmed** | Category: DTO drift / data loss | Effort: S

Locations: artifacts/qawi-web/src/pages/admin/sales.tsx:153 and :160; qawi-backend/src/main/java/com/qawi/dto/MemberLeadRequest.java:9; service/MemberLeadService.java:96; entity/MemberLead.java:28.

Evidence: the form sends email, and the entity has an email column, but MemberLeadRequest has no email property. The creation service cannot copy it. An actual disposable-H2 lead creation from a JSON request containing an email returned **email=null**.

Fix: add the intentionally supported email field to the request DTO with appropriate optional validation and map it during creation; regenerate clients. If email is deliberately unsupported, remove the form field instead of silently collecting and losing it. Add request-to-persistence round-trip coverage. No schema change is needed merely to use the existing column.

#### [DATA-P5-012] Both finance clients display JOD values as SAR

Severity: **Medium** | Confidence: **Confirmed source contract mismatch** | Category: Duplicated formatting rules | Effort: S

Locations: qawi-backend/src/main/java/com/qawi/service/FinanceService.java:67 and :168; artifacts/qawi-web/src/pages/finance/dashboard.tsx:106 and :260; artifacts/qawi-mobile/app/(finance)/index.tsx:61.

Evidence: the server explicitly emits currency:"JOD", while both clients append a hard-coded " SAR". No currency conversion takes place. Thus even a numerically correct amount is labeled as another currency.

Fix: format using the response's documented currency and appropriate precision, with a small shared pure formatter if that removes real duplication. If multiple tenant currencies are supported, make the authoritative currency explicit at the data source. Do not infer a currency or convert values by relabeling.

### Low finding

#### [MAINT-P5-013] Obsolete web pages remain detached from the app

Severity: **Low** | Confidence: **Confirmed current import graph** | Category: Dead application code | Effort: S

Locations: artifacts/qawi-web/src/pages/super/leads.tsx:13 and :23; src/pages/super/index.tsx:1; src/App.tsx:45 and :158; index.html:14.

The literal import/re-export/dynamic-import graph rooted at main.tsx reached 85 of 127 web source files. Excluding generated shadcn UI, four files were unreachable: the two page files above and use-toast/use-mobile helper files. The active /super/leads route renders SuperLeadGyms, not the old SuperLeads page. The obsolete page still calls a removed contacted endpoint, which must not be reported as an active route failure.

Fix: remove the obsolete page and unused alias after confirming no external loader uses them. Keep generated UI/helper inventory separate; absence of an app import alone does not justify broad deletion. No source was deleted in this phase.

### Consolidation decisions and exclusions

- Spring is now the only configured backend. Do not resurrect retired api-server/db/storage packages to solve current contract drift.
- Nutrition V3 delegates to canonical V2. It is a compatibility adapter, not another persistence implementation to delete. Deprecated V1 plan data/routes remain a compatibility concern; retirement needs consumer/data evidence.
- The generated contract and clients are current. The import scan found only one application import of the generated API package, in attendance-sync.ts; the legacy wrappers still contain 296 apiFetch calls. No app import of api-zod was found. Those public library exports are not automatically dead code; adopt them after correcting schemas/transport policy.
- Prefer generated DTOs and explicit request/response mapping at existing seams. Do not introduce a replacement framework, shared React UI or blanket abstraction for every similar helper.
- Spring scheduled components such as NotificationJobService have framework callers even when a Java name-reference scan finds no ordinary caller. Demo seeders, disabled device paths, compatibility aliases, old offline records and generated UI were not classified as deletable.
- Whether mobile should support SALES and NUTRITIONIST remains a product question: the backend/web role sets include them, while mobile's local role union/routes do not. No privilege-bypass or mandatory mobile feature requirement was inferred.
- Phase 1 refresh/storage work and the Phase 4 infrastructure findings remain separate. This phase supplies findings and fix guidance only.


### Coverage and method

- Snapshotted 1,070 existing source/config files for preservation. This is a preservation baseline, not a claim that every line of those files was manually audited in Phase 5.
- Parsed 349 JS/TS source files, excluding generated client outputs, for literal imports, type declarations and apiFetch/fetch calls. This includes a light structural pass over generated UI helpers; no visual/UX audit was performed.
- Inventoried 296 apiFetch calls (197 web, 99 mobile) and 7 raw fetch calls across 72 files. Static body comparison covered 65 resolvable inline DTO bodies. Named variables, nested builders and dynamic query strings required targeted follow-up; this is not an exhaustive request-conformance proof.
- Inspected the fresh 201-path/242-operation/126-schema Spring contract, representative generated declarations/validators, server binding/serialization, consuming handlers and current web entry graph.
- The graph includes literal imports, re-exports and literal dynamic imports. Nonliteral external loaders are a limit; the current explicit App routing was checked before classifying the obsolete pages.
- The following 129-file ledger distinguishes targeted manual review from structural skimming. Reviewed means the relevant cross-cutting interfaces/handlers/models were traced; it does not mean unrelated application behavior or all UI markup was re-audited. The 312 generated output files were preserved; only representative generated schemas/validators were inspected individually.

| File | Inspection status |
|---|---|
| artifacts/qawi-mobile/app/(admin)/_layout.tsx | Reviewed - relevant contract, model, handler or import/wiring sections; visual/unrelated logic excluded |
| artifacts/qawi-mobile/app/(admin)/coaches.tsx | Skimmed - JS/TS AST request-site inspection; findings name manually traced handlers |
| artifacts/qawi-mobile/app/(admin)/index.tsx | Skimmed - JS/TS AST request-site inspection; findings name manually traced handlers |
| artifacts/qawi-mobile/app/(admin)/members.tsx | Skimmed - JS/TS AST request-site inspection; findings name manually traced handlers |
| artifacts/qawi-mobile/app/(auth)/login.tsx | Skimmed - JS/TS AST request-site inspection; findings name manually traced handlers |
| artifacts/qawi-mobile/app/(coach)/index.tsx | Skimmed - JS/TS AST request-site inspection; findings name manually traced handlers |
| artifacts/qawi-mobile/app/(coach)/library.tsx | Skimmed - JS/TS AST request-site inspection; findings name manually traced handlers |
| artifacts/qawi-mobile/app/(coach)/nutrition.tsx | Skimmed - JS/TS AST request-site inspection; findings name manually traced handlers |
| artifacts/qawi-mobile/app/(coach)/plans.tsx | Skimmed - JS/TS AST request-site inspection; findings name manually traced handlers |
| artifacts/qawi-mobile/app/(finance)/index.tsx | Skimmed - JS/TS AST request-site inspection; findings name manually traced handlers |
| artifacts/qawi-mobile/app/(finance)/members.tsx | Skimmed - JS/TS AST request-site inspection; findings name manually traced handlers |
| artifacts/qawi-mobile/app/(hr)/index.tsx | Skimmed - JS/TS AST request-site inspection; findings name manually traced handlers |
| artifacts/qawi-mobile/app/(hr)/staff.tsx | Skimmed - JS/TS AST request-site inspection; findings name manually traced handlers |
| artifacts/qawi-mobile/app/(member)/classes.tsx | Skimmed - JS/TS AST request-site inspection; findings name manually traced handlers |
| artifacts/qawi-mobile/app/(member)/index.tsx | Skimmed - JS/TS AST request-site inspection; findings name manually traced handlers |
| artifacts/qawi-mobile/app/(member)/nutrition.tsx | Skimmed - JS/TS AST request-site inspection; findings name manually traced handlers |
| artifacts/qawi-mobile/app/(member)/profile.tsx | Skimmed - JS/TS AST request-site inspection; findings name manually traced handlers |
| artifacts/qawi-mobile/app/(member)/progress.tsx | Skimmed - JS/TS AST request-site inspection; findings name manually traced handlers |
| artifacts/qawi-mobile/app/(member)/renewal.tsx | Skimmed - JS/TS AST request-site inspection; findings name manually traced handlers |
| artifacts/qawi-mobile/app/(member)/workout.tsx | Skimmed - JS/TS AST request-site inspection; findings name manually traced handlers |
| artifacts/qawi-mobile/app/(reception)/index.tsx | Skimmed - JS/TS AST request-site inspection; findings name manually traced handlers |
| artifacts/qawi-mobile/app/(reception)/members.tsx | Skimmed - JS/TS AST request-site inspection; findings name manually traced handlers |
| artifacts/qawi-mobile/app/coach/create-nutrition.tsx | Skimmed - JS/TS AST request-site inspection; findings name manually traced handlers |
| artifacts/qawi-mobile/app/coach/create-plan.tsx | Skimmed - JS/TS AST request-site inspection; findings name manually traced handlers |
| artifacts/qawi-mobile/app/coach/templates.tsx | Skimmed - JS/TS AST request-site inspection; findings name manually traced handlers |
| artifacts/qawi-mobile/app/member/[id].tsx | Skimmed - JS/TS AST request-site inspection; findings name manually traced handlers |
| artifacts/qawi-mobile/app/member/my-plan.tsx | Skimmed - JS/TS AST request-site inspection; findings name manually traced handlers |
| artifacts/qawi-mobile/app/notifications.tsx | Skimmed - JS/TS AST request-site inspection; findings name manually traced handlers |
| artifacts/qawi-mobile/components/ChangePasswordModal.tsx | Skimmed - JS/TS AST request-site inspection; findings name manually traced handlers |
| artifacts/qawi-mobile/context/AuthContext.tsx | Reviewed - relevant contract, model, handler or import/wiring sections; visual/unrelated logic excluded |
| artifacts/qawi-mobile/hooks/useGymConfig.ts | Skimmed - JS/TS AST request-site inspection; findings name manually traced handlers |
| artifacts/qawi-mobile/scripts/build.js | Skimmed - JS/TS AST request-site inspection; findings name manually traced handlers |
| artifacts/qawi-mobile/services/api.ts | Skimmed - JS/TS AST request-site inspection; findings name manually traced handlers |
| artifacts/qawi-mobile/services/attendance-sync.ts | Reviewed - relevant contract, model, handler or import/wiring sections; visual/unrelated logic excluded |
| artifacts/qawi-web/index.html | Reviewed - relevant contract, model, handler or import/wiring sections; visual/unrelated logic excluded |
| artifacts/qawi-web/src/App.tsx | Reviewed - relevant contract, model, handler or import/wiring sections; visual/unrelated logic excluded |
| artifacts/qawi-web/src/components/ChangePasswordModal.tsx | Skimmed - JS/TS AST request-site inspection; findings name manually traced handlers |
| artifacts/qawi-web/src/components/ResetPasswordModal.tsx | Skimmed - JS/TS AST request-site inspection; findings name manually traced handlers |
| artifacts/qawi-web/src/hooks/use-auth.tsx | Skimmed - JS/TS AST request-site inspection; findings name manually traced handlers |
| artifacts/qawi-web/src/hooks/use-gym-config.ts | Skimmed - JS/TS AST request-site inspection; findings name manually traced handlers |
| artifacts/qawi-web/src/lib/sub-status.ts | Reviewed - relevant contract, model, handler or import/wiring sections; visual/unrelated logic excluded |
| artifacts/qawi-web/src/pages/admin/analytics.tsx | Skimmed - JS/TS AST request-site inspection; findings name manually traced handlers |
| artifacts/qawi-web/src/pages/admin/classes.tsx | Skimmed - JS/TS AST request-site inspection; findings name manually traced handlers |
| artifacts/qawi-web/src/pages/admin/coaches.tsx | Skimmed - JS/TS AST request-site inspection; findings name manually traced handlers |
| artifacts/qawi-web/src/pages/admin/dashboard.tsx | Skimmed - JS/TS AST request-site inspection; findings name manually traced handlers |
| artifacts/qawi-web/src/pages/admin/employees.tsx | Skimmed - JS/TS AST request-site inspection; findings name manually traced handlers |
| artifacts/qawi-web/src/pages/admin/members.tsx | Skimmed - JS/TS AST request-site inspection; findings name manually traced handlers |
| artifacts/qawi-web/src/pages/admin/notifications.tsx | Skimmed - JS/TS AST request-site inspection; findings name manually traced handlers |
| artifacts/qawi-web/src/pages/admin/pricing.tsx | Skimmed - JS/TS AST request-site inspection; findings name manually traced handlers |
| artifacts/qawi-web/src/pages/admin/reports.tsx | Skimmed - JS/TS AST request-site inspection; findings name manually traced handlers |
| artifacts/qawi-web/src/pages/admin/revenue.tsx | Skimmed - JS/TS AST request-site inspection; findings name manually traced handlers |
| artifacts/qawi-web/src/pages/admin/sales.tsx | Skimmed - JS/TS AST request-site inspection; findings name manually traced handlers |
| artifacts/qawi-web/src/pages/admin/subscriptions.tsx | Skimmed - JS/TS AST request-site inspection; findings name manually traced handlers |
| artifacts/qawi-web/src/pages/coach/create-plan.tsx | Skimmed - JS/TS AST request-site inspection; findings name manually traced handlers |
| artifacts/qawi-web/src/pages/coach/dashboard.tsx | Skimmed - JS/TS AST request-site inspection; findings name manually traced handlers |
| artifacts/qawi-web/src/pages/coach/library.tsx | Skimmed - JS/TS AST request-site inspection; findings name manually traced handlers |
| artifacts/qawi-web/src/pages/coach/member-detail.tsx | Skimmed - JS/TS AST request-site inspection; findings name manually traced handlers |
| artifacts/qawi-web/src/pages/coach/nutrition.tsx | Skimmed - JS/TS AST request-site inspection; findings name manually traced handlers |
| artifacts/qawi-web/src/pages/coach/templates.tsx | Skimmed - JS/TS AST request-site inspection; findings name manually traced handlers |
| artifacts/qawi-web/src/pages/finance/dashboard.tsx | Skimmed - JS/TS AST request-site inspection; findings name manually traced handlers |
| artifacts/qawi-web/src/pages/hr/dashboard.tsx | Skimmed - JS/TS AST request-site inspection; findings name manually traced handlers |
| artifacts/qawi-web/src/pages/member/dashboard.tsx | Skimmed - JS/TS AST request-site inspection; findings name manually traced handlers |
| artifacts/qawi-web/src/pages/member/my-plan.tsx | Skimmed - JS/TS AST request-site inspection; findings name manually traced handlers |
| artifacts/qawi-web/src/pages/member/nutrition.tsx | Skimmed - JS/TS AST request-site inspection; findings name manually traced handlers |
| artifacts/qawi-web/src/pages/member/workout.tsx | Skimmed - JS/TS AST request-site inspection; findings name manually traced handlers |
| artifacts/qawi-web/src/pages/nutrition/dashboard.tsx | Skimmed - JS/TS AST request-site inspection; findings name manually traced handlers |
| artifacts/qawi-web/src/pages/reception/dashboard.tsx | Skimmed - JS/TS AST request-site inspection; findings name manually traced handlers |
| artifacts/qawi-web/src/pages/register.tsx | Skimmed - JS/TS AST request-site inspection; findings name manually traced handlers |
| artifacts/qawi-web/src/pages/super/dashboard.tsx | Skimmed - JS/TS AST request-site inspection; findings name manually traced handlers |
| artifacts/qawi-web/src/pages/super/gym-detail.tsx | Skimmed - JS/TS AST request-site inspection; findings name manually traced handlers |
| artifacts/qawi-web/src/pages/super/gyms.tsx | Skimmed - JS/TS AST request-site inspection; findings name manually traced handlers |
| artifacts/qawi-web/src/pages/super/index.tsx | Reviewed - relevant contract, model, handler or import/wiring sections; visual/unrelated logic excluded |
| artifacts/qawi-web/src/pages/super/lead-gyms.tsx | Skimmed - JS/TS AST request-site inspection; findings name manually traced handlers |
| artifacts/qawi-web/src/pages/super/leads.tsx | Skimmed - JS/TS AST request-site inspection; findings name manually traced handlers |
| artifacts/qawi-web/src/pages/super/pricing.tsx | Skimmed - JS/TS AST request-site inspection; findings name manually traced handlers |
| artifacts/qawi-web/src/pages/super/sales.tsx | Skimmed - JS/TS AST request-site inspection; findings name manually traced handlers |
| artifacts/qawi-web/src/services/api.ts | Skimmed - JS/TS AST request-site inspection; findings name manually traced handlers |
| artifacts/qawi-web/src/stores/authStore.ts | Reviewed - relevant contract, model, handler or import/wiring sections; visual/unrelated logic excluded |
| lib/api-client-react/src/custom-fetch.ts | Reviewed - relevant contract, model, handler or import/wiring sections; visual/unrelated logic excluded |
| lib/api-client-react/src/generated/api.schemas.ts | Reviewed - relevant contract, model, handler or import/wiring sections; visual/unrelated logic excluded |
| lib/api-client-react/src/index.ts | Reviewed - relevant contract, model, handler or import/wiring sections; visual/unrelated logic excluded |
| lib/api-spec/openapi.json | Reviewed - relevant contract, model, handler or import/wiring sections; visual/unrelated logic excluded |
| lib/api-spec/orval.config.ts | Reviewed - relevant contract, model, handler or import/wiring sections; visual/unrelated logic excluded |
| lib/api-spec/package.json | Reviewed - relevant contract, model, handler or import/wiring sections; visual/unrelated logic excluded |
| lib/api-zod/src/generated/api.ts | Reviewed - relevant contract, model, handler or import/wiring sections; visual/unrelated logic excluded |
| lib/api-zod/src/generated/types/getApiV1NutritionTargetsMemberId200.ts | Reviewed - relevant contract, model, handler or import/wiring sections; visual/unrelated logic excluded |
| lib/api-zod/src/index.ts | Reviewed - relevant contract, model, handler or import/wiring sections; visual/unrelated logic excluded |
| qawi-backend/src/main/java/com/qawi/config/OpenApiConfig.java | Reviewed - relevant contract, model, handler or import/wiring sections; visual/unrelated logic excluded |
| qawi-backend/src/main/java/com/qawi/controller/FinanceController.java | Reviewed - relevant contract, model, handler or import/wiring sections; visual/unrelated logic excluded |
| qawi-backend/src/main/java/com/qawi/controller/GymAdminController.java | Reviewed - relevant contract, model, handler or import/wiring sections; visual/unrelated logic excluded |
| qawi-backend/src/main/java/com/qawi/controller/GymClassController.java | Reviewed - relevant contract, model, handler or import/wiring sections; visual/unrelated logic excluded |
| qawi-backend/src/main/java/com/qawi/controller/HrController.java | Reviewed - relevant contract, model, handler or import/wiring sections; visual/unrelated logic excluded |
| qawi-backend/src/main/java/com/qawi/controller/MemberController.java | Reviewed - relevant contract, model, handler or import/wiring sections; visual/unrelated logic excluded |
| qawi-backend/src/main/java/com/qawi/controller/NutritionController.java | Reviewed - relevant contract, model, handler or import/wiring sections; visual/unrelated logic excluded |
| qawi-backend/src/main/java/com/qawi/controller/NutritionV2Controller.java | Reviewed - relevant contract, model, handler or import/wiring sections; visual/unrelated logic excluded |
| qawi-backend/src/main/java/com/qawi/controller/WorkoutPlanController.java | Reviewed - relevant contract, model, handler or import/wiring sections; visual/unrelated logic excluded |
| qawi-backend/src/main/java/com/qawi/controller/WorkoutTemplateController.java | Skimmed - route and DTO wiring/reference inspection |
| qawi-backend/src/main/java/com/qawi/dto/AddScheduleDayRequest.java | Reviewed - relevant contract, model, handler or import/wiring sections; visual/unrelated logic excluded |
| qawi-backend/src/main/java/com/qawi/dto/AdminAnalyticsResponse.java | Reviewed - relevant contract, model, handler or import/wiring sections; visual/unrelated logic excluded |
| qawi-backend/src/main/java/com/qawi/dto/CreateNutritionPlanRequest.java | Reviewed - relevant contract, model, handler or import/wiring sections; visual/unrelated logic excluded |
| qawi-backend/src/main/java/com/qawi/dto/CreateTemplateRequest.java | Reviewed - relevant contract, model, handler or import/wiring sections; visual/unrelated logic excluded |
| qawi-backend/src/main/java/com/qawi/dto/MemberLeadRequest.java | Reviewed - relevant contract, model, handler or import/wiring sections; visual/unrelated logic excluded |
| qawi-backend/src/main/java/com/qawi/dto/PlatformTierRequest.java | Reviewed - relevant contract, model, handler or import/wiring sections; visual/unrelated logic excluded |
| qawi-backend/src/main/java/com/qawi/dto/StaffAttendanceRequest.java | Reviewed - relevant contract, model, handler or import/wiring sections; visual/unrelated logic excluded |
| qawi-backend/src/main/java/com/qawi/dto/UserDto.java | Reviewed - relevant contract, model, handler or import/wiring sections; visual/unrelated logic excluded |
| qawi-backend/src/main/java/com/qawi/entity/GymMemberPlan.java | Reviewed - relevant contract, model, handler or import/wiring sections; visual/unrelated logic excluded |
| qawi-backend/src/main/java/com/qawi/entity/MemberLead.java | Reviewed - relevant contract, model, handler or import/wiring sections; visual/unrelated logic excluded |
| qawi-backend/src/main/java/com/qawi/entity/MemberPlanDuration.java | Reviewed - relevant contract, model, handler or import/wiring sections; visual/unrelated logic excluded |
| qawi-backend/src/main/java/com/qawi/entity/Role.java | Reviewed - relevant contract, model, handler or import/wiring sections; visual/unrelated logic excluded |
| qawi-backend/src/main/java/com/qawi/entity/ScheduleDay.java | Reviewed - relevant contract, model, handler or import/wiring sections; visual/unrelated logic excluded |
| qawi-backend/src/main/java/com/qawi/entity/StaffProfile.java | Reviewed - relevant contract, model, handler or import/wiring sections; visual/unrelated logic excluded |
| qawi-backend/src/main/java/com/qawi/entity/SubscriptionHistory.java | Reviewed - relevant contract, model, handler or import/wiring sections; visual/unrelated logic excluded |
| qawi-backend/src/main/java/com/qawi/entity/User.java | Reviewed - relevant contract, model, handler or import/wiring sections; visual/unrelated logic excluded |
| qawi-backend/src/main/java/com/qawi/repository/SubscriptionHistoryRepository.java | Skimmed - revenue aggregation signatures |
| qawi-backend/src/main/java/com/qawi/service/CoachDashboardService.java | Reviewed - relevant contract, model, handler or import/wiring sections; visual/unrelated logic excluded |
| qawi-backend/src/main/java/com/qawi/service/FinanceService.java | Reviewed - relevant contract, model, handler or import/wiring sections; visual/unrelated logic excluded |
| qawi-backend/src/main/java/com/qawi/service/GymAdminService.java | Reviewed - relevant contract, model, handler or import/wiring sections; visual/unrelated logic excluded |
| qawi-backend/src/main/java/com/qawi/service/HrService.java | Reviewed - relevant contract, model, handler or import/wiring sections; visual/unrelated logic excluded |
| qawi-backend/src/main/java/com/qawi/service/MeasurementService.java | Reviewed - relevant contract, model, handler or import/wiring sections; visual/unrelated logic excluded |
| qawi-backend/src/main/java/com/qawi/service/MemberLeadService.java | Reviewed - relevant contract, model, handler or import/wiring sections; visual/unrelated logic excluded |
| qawi-backend/src/main/java/com/qawi/service/NotificationJobService.java | Reviewed - relevant contract, model, handler or import/wiring sections; visual/unrelated logic excluded |
| qawi-backend/src/main/java/com/qawi/service/NutritionService.java | Reviewed - relevant contract, model, handler or import/wiring sections; visual/unrelated logic excluded |
| qawi-backend/src/main/java/com/qawi/service/NutritionV2Service.java | Reviewed - relevant contract, model, handler or import/wiring sections; visual/unrelated logic excluded |
| qawi-backend/src/main/java/com/qawi/service/NutritionV3Service.java | Reviewed - relevant contract, model, handler or import/wiring sections; visual/unrelated logic excluded |
| qawi-backend/src/main/java/com/qawi/service/PlatformTierService.java | Reviewed - relevant contract, model, handler or import/wiring sections; visual/unrelated logic excluded |
| qawi-backend/src/main/java/com/qawi/service/ReceptionService.java | Reviewed - relevant contract, model, handler or import/wiring sections; visual/unrelated logic excluded |
| qawi-backend/src/main/java/com/qawi/service/SubscriptionStatusUtil.java | Reviewed - relevant contract, model, handler or import/wiring sections; visual/unrelated logic excluded |
| qawi-backend/src/main/java/com/qawi/service/WorkoutPlanService.java | Reviewed - relevant contract, model, handler or import/wiring sections; visual/unrelated logic excluded |
| qawi-backend/src/test/java/com/qawi/security/OpenApiContractTest.java | Reviewed - relevant contract, model, handler or import/wiring sections; visual/unrelated logic excluded |

Context: AUDIT_PROMPT.md, earlier AUDIT_REPORT.md sections, shared/project instructions and STATE.md. Existing summaries/deployment decisions were used to avoid misclassifying compatibility, framework-discovered or retired code. Private env contents, dependency lockfile internals, graphify caches, attached assets, production data and unrelated infrastructure were excluded. No fresh dependency/security scan was needed to substantiate this phase's contract/duplication/dead-code findings.

### Verification and reproducible evidence

| Check | Current result |
|---|---|
| Focused Maven tests: OpenApiContractTest, NutritionCompatibilityTest, MoneyPrecisionTest | 6 passed, 0 failures/errors/skips; fresh compile and H2 contract export |
| node scripts/export-openapi.mjs --check | Passed against that fresh export: 201 paths, 242 operations |
| pnpm typecheck | Passed across libraries and all artifact/script projects |
| pnpm --filter @workspace/qawi-mobile test | 8 passed, 0 failed; existing module-type warning only |
| Spring H2 probe using actual ObjectMapper/services | Rest flag and nested template flag lost; HR ABSENT saved PRESENT; lead email saved null |
| Same H2 fixture, revenue definitions | Finance actualRevenue 200.000 vs recorded subscription total 125.000 |
| Actual backend decimal create/read | 12.345 retained; contrast with actual client onSave expression producing 12 |
| Same inactive-member fixture across service helpers | Canonical INACTIVE vs three date-only helpers ACTIVE |
| Authenticated HTTP with real JwtService-issued fixture JWT | Both absent mobile-admin routes returned 500; no real account/login used |
| Actual generated Zod class-request schema | Rejected legitimate primitive request fields; expected failure reproduces schema defect |
| Isolated TypeScript assignment to generated nutrition response type | TS2322 for legitimate hasTarget:false; expected reproduction, not workspace compilation failure |
| Actual web finance export closure with synthetic Zustand storage | Bearer header contains serialized envelope, not fixture JWT |
| Actual transport code with controlled responses | Web 200 HTML becomes {}; mobile HTML caused same POST to be sent twice |
| Request and import/dead-code structural scans | Completed; dynamic cases and framework entry points manually triaged |
| Source/config hashes and existing document prefixes | Final preservation checks recorded in STATE.md |
| Browser/native visual end-to-end tests, PostgreSQL migrations, live hosting/device actions | Not performed; outside this phase's isolated checks |

Local ignored logs: phase5-backend-contract-tests.log, phase5-typecheck.log, phase5-queue-tests.log and phase5-domain-probe-final.log. The Java probe source/dependency copy is retained in the system temp qawi-phase5-java-rboin1_7 directory. Structural evidence is retained in the system temp directory as qawi-phase5-client-inventory.json, qawi-phase5-body-candidates.json, qawi-phase5-web-graph.json and qawi-phase5-coverage.json. Temporary evidence may be cleaned by the operating system; the confirmed inputs/results and source locations are preserved in this report.

### Fix order and acceptance conditions

1. Correct HR status, rest-day/template binding and decimal tier submission. Verify literal web/mobile payloads against real DTOs and stored values, not only each layer's own types.
2. Define recorded revenue once, separate projections and render the authoritative currency. Use a fixture with discounted subscription records and changed list prices.
3. Repair mobile admin/nutrition operations and lead email mapping; assert nonempty/nonzero records and complete create/read/delete behavior so swallowed errors cannot pass.
4. Replace generic map schemas with DTOs, document actual statuses and migrate touched callers to generated types/operations. Keep compatibility aliases and existing queued-account guards during rollout.
5. Align read/write retry, response parsing and blob/auth handling in the existing transport seam. Prove write retries require server-supported idempotency and export respects API origin/auth errors.
6. Separate account/access status from renewal warnings, then remove the two verified obsolete web pages after build/routing checks.

No fixes were applied, no source/config/dependency changes were made, and no commits or deployment occurred. Phase 5 audit work is complete; the findings above are the resulting implementation backlog, not claims that those defects have been corrected.
