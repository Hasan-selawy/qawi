# Qawi Full Audit: Security, Performance, Long-Term

Date: 2026-11-24. This audit covers the working tree as it is now, including the uncommitted Phase 0 and Phase 2 fixes.

It is **read-only**. No source code was changed. One temporary test file was created to prove two findings, then deleted. A throwaway Postgres container was used for tests. Nothing touched a real database, server or device.

This report does not replace `AUDIT_REPORT.md`. It does three things:
1. Reviews the new Phase 0 and Phase 2 code, which no one had audited yet.
2. Rechecks which earlier findings are still open.
3. Adds new findings from scanners, live tests and manual review.

---

## 1. Summary

**Overall: not ready for production yet.** Phase 0 and Phase 2 fixed real problems: the ADMS device bypass, the template IDOR, the `/auth` permitAll, overbooking races, duplicate check-ins, money precision, and schema management (now Flyway). All 50 backend tests pass.

Some serious gaps remain:

- **Session control is broken.** A user who is deactivated keeps full API access indefinitely. Changing a password does not log out other sessions. Access tokens last 7 days and are stored where XSS can reach them. **Confirmed with a live test.**
- **The rate limiter does not work in production.** It can be bypassed by sending any random Bearer value, and every attempt adds to a memory map that never shrinks. Behind nginx or a hosting proxy, the whole platform shares 5 logins per minute. **Confirmed with a live test.**
- **Email case bug.** Accounts created by an admin, by gym signup, or by the super admin keep their capital letters. Login lowercases the email, so those users can never log in.
- **Performance will degrade with real data.** Almost no foreign-key or tenant indexes exist, the web app ships as one 1.67 MB file, and the OpenAI call has no timeout.
- **Time zones.** The server runs in UTC but the gyms are in UTC+3. Attendance days, subscription expiry and the 8 AM reminders all use the server clock.
- **The platform is out of support.** Java 19 and Spring Boot 3.2 no longer receive security patches.

| Severity | New in this audit | Earlier findings still open |
|---|---|---|
| Critical | 0 | 0 |
| High | 6 | 4 |
| Medium | 16 | 8 |
| Low | 10 | 3 |

---

## 2. What was actually run

| Check | Result |
|---|---|
| `mvn clean verify` with real PostgreSQL 15 (concurrency + migration tests enabled) | **50 tests, 0 failures, 1 skipped on purpose.** Build succeeded. |
| Live probe 1: deactivated user's token on a protected endpoint | **Returned 200 instead of 401.** Confirms SEC-A01. |
| Live probe 2: 1,000 requests from one IP with random Bearer values | **All 1,000 allowed; the limit is 100/min.** Confirms SEC-A02. |
| gitleaks on full git history (189 commits) and working tree | 184 hits, **all false positives**: file hashes in `graphify-out/` plus one test-only key. **No real secrets found.** |
| `pnpm audit` (all deps) | 13 critical, 92 high. Almost all are in build tools (Expo CLI, Orval, Vite). |
| `pnpm audit --prod` | 2 critical, 74 high. **All come through the `expo` CLI** on developer and CI machines. Nothing found in the web app's runtime bundle. |
| Semgrep and Trivy | See section 7. |

---

## 3. New findings: High

### SEC-A01: Deactivated users keep access forever; password change doesn't end other sessions
- **Where:**
  - `security/JwtAuthFilter.java:167` checks only the email and the expiry, never `isEnabled()`.
  - `service/AuthService.java:183-195`: `refresh()` issues a new token without checking that the user is active.
  - `AuthService.java:162-176`: `changePassword` revokes nothing.
  - `GymAdminService.java:223` (delete user) and `SuperAdminService.java:137` (deactivate gym) only set `isActive=false`.
- **Impact:** a fired coach, a removed member, or every user of a deactivated gym keeps full access. Their access token lasts 7 days. The refresh token rotates for 30 days at a time, so it never runs out. If an attacker steals a session, the victim changing their password does not kick the attacker out. **Proven live.**
- **Fix:**
  1. In `JwtAuthFilter`, require `user.isEnabled()`.
  2. In `refresh()`, reject inactive users.
  3. Add `RefreshTokenRepository.revokeAllByUserId(userId)` and call it from `changePassword`, `softDelete`, `deactivateGym`, and wherever a role changes.
  4. Cut the access-token lifetime to 15 minutes (`app.jwt.expiration-ms=900000`). Refresh tokens already exist.
  5. Optionally add a `tokenVersion` column, put it in the JWT, and compare it in the filter. That gives instant revocation.

### SEC-A02: Rate limiter bypass and memory DoS
- **Where:** `filter/RateLimitFilter.java:58-63` keys the bucket on `hashCode()` of the raw `Authorization` header, *before* the token is validated. `:24` stores the buckets in a `ConcurrentHashMap` that is never evicted.
- **Impact:**
  - Anyone can bypass the general limit by sending `Bearer <random>` on each request.
  - Each random value adds a new bucket that is never removed, so memory grows until the JVM runs out (OOM).
  - Two different users can also collide on the same `hashCode`. **Proven live.**
- **Fix:**
  - Key on the authenticated user ID: run the limiter after `JwtAuthFilter`, or read `SecurityContextHolder`.
  - Key on IP when there is no valid token.
  - Store buckets in a size-bounded cache with expiry (Caffeine, `expireAfterAccess(10m)`, `maximumSize(100k)`). Use Redis or Bucket4j-JDBC once there is more than one instance.

### SEC-A03: Behind a proxy, the whole platform shares one login bucket (5/min)
- **Where:**
  - `application.properties:9` sets `server.forward-headers-strategy=none`.
  - `RateLimitFilter.java:80-83` uses `getRemoteAddr()`.
  - `docker-compose.yml` and `artifacts/qawi-web/nginx.conf` send all API traffic through nginx. Railway, Vercel and any load balancer behave the same way.
- **Impact:** every user arrives from the proxy's IP. Five login attempts per minute *in total* cause 429 errors for every gym. The 3-per-hour limit on gym signup is also shared platform-wide.
- **Fix:**
  - Set `server.forward-headers-strategy=native` and configure Tomcat's `RemoteIpValve` with `internal-proxies` limited to your proxy's address range only. Then `getRemoteAddr()` returns the real client and can't be spoofed from outside.
  - In nginx, use `proxy_set_header X-Forwarded-For $remote_addr;` (replace the header; don't append to it).

### DATA-A04: Users created with capital letters in their email can never log in
- **Where:** `GymAdminService.java:45` (`createCoach`), `:85` (`createMember`), `PublicGymService.java:44,71` (`registerGym`), `SuperAdminService.java:65` and `PublicGymService.isEmailAvailable` all store or compare the email as typed. `AuthService.login` (`:68`) and `UserDetailsServiceImpl` (`:284`) lowercase it. `users.email` has a case-sensitive `unique` constraint (`V1:48`).
- **Impact:**
  - A gym owner who signs up as `Owner@Gym.com` is locked out of their own gym at once.
  - Duplicate accounts `A@x.com` and `a@x.com` can both be created.
  - The `/public/check-email` result is wrong.
- **Fix:**
  - Normalize the email (`trim().toLowerCase(Locale.ROOT)`) in one place, for example a setter on `User`, or a `@PrePersist`/`@PreUpdate` hook.
  - Add a Flyway migration with `CREATE UNIQUE INDEX ux_users_email_lower ON users (lower(email))`.
  - Clean up existing mixed-case rows first.

### PERF-A05: Almost no indexes on tenant and foreign-key columns
- **Where:** `db/migration/V1..V6` define only 11 indexes in total. V2 adds 48 foreign keys and 0 indexes, and PostgreSQL does not index foreign keys automatically.
- **Impact:** every list query is a full table scan, for example by `gym_id`, `member_id`, `coach_id`, `workout_plan_id` or `schedule_day_id`. Fine at demo size. At around 100 gyms and 50k members, dashboards, coach member lists, attendance stats, nutrition history and cascading deletes (deleting a parent row scans every child table) become slow, and the slowdown grows with the data.
- **Fix:** add V7 with indexes such as:
  ```sql
  CREATE INDEX ON users (gym_id, role);
  CREATE INDEX ON attendance (member_id, checked_in_at DESC);
  CREATE INDEX ON attendance (gym_id, checked_in_at DESC);
  CREATE INDEX ON coach_members (coach_id);
  CREATE INDEX ON coach_members (member_id);
  CREATE INDEX ON workout_plans (member_id);
  CREATE INDEX ON schedule_days (workout_plan_id, day_date);
  CREATE INDEX ON plan_exercises (schedule_day_id, order_index);
  CREATE INDEX ON workout_logs (member_id, logged_at DESC);
  CREATE INDEX ON food_entries (member_id, log_date);
  CREATE INDEX ON body_measurements (member_id, recorded_at DESC);
  CREATE INDEX ON class_bookings (class_id);
  CREATE INDEX ON gym_classes (gym_id, date_time);
  CREATE INDEX ON subscription_history (member_id);
  ```
  Use `CREATE INDEX CONCURRENTLY` on a live database. Before writing V7, run `EXPLAIN ANALYZE` on the hot queries to confirm the column names and order.

### OPS-A06: Out-of-support runtime and framework
- **Where:** `pom.xml:22` sets Java 19; support ended March 2023. The Dockerfile builds and runs on Java 21, so the versions also don't match. Spring Boot 3.2.5's open-source support ended in late 2024. JJWT is 0.11.5.
- **Impact:** new CVEs in Spring, Tomcat or Jackson will not get patches for this line.
- **Fix:**
  - Move to Java 21 LTS: set it in `pom.xml` and CI to match Docker.
  - Upgrade to the current supported Spring Boot 3.x line and JJWT 0.12.x. The JJWT API changes slightly (`Jwts.parser().verifyWith(...)`).
  - Add a Maven wrapper (`mvn wrapper:wrapper`) so CI, Docker and developer machines all use the same Maven.

---

## 4. New findings: Medium

| ID | Finding | Where | Fix |
|---|---|---|---|
| SEC-A07 | **OpenAI call has no timeout and runs inside a DB transaction.** If OpenAI is slow, request threads hang and hold database connections until the pool runs out. A new `HttpClient` is also created on every call. | `NutritionV2Service.java:612-620`, called from `@Transactional logFood` | Use one shared `HttpClient` with `connectTimeout(5s)` and a request `.timeout(15s)`. Call the AI *outside* the transaction (resolve the food first, then save). Add a circuit breaker or fall back to the estimate on timeout. |
| SEC-A08 | **Shared food cache can be poisoned through prompt injection.** `foodName` goes straight into the prompt. The AI's returned `foodName` and values are cached in `ArabicFoodCache`, which every gym shares. One member can plant wrong nutrition data for everyone. | `NutritionV2Service.java:597-602, 643-657` | Cache under the *normalized user input*, not the name the AI returns. Mark AI results as unverified per gym, or keep them only for that gym until an admin approves. Check that values are in range (calories 0-5000 and so on). |
| SEC-A09 | **No length limit on `foodName`.** Input tokens are unbounded: 100 calls per day per member at any size. A request body could be megabytes. | `dto/FoodLogRequest.java:16` | Add `@Size(max=120)` to `foodName` and `unit`. Set `server.tomcat.max-http-form-post-size` and a Spring max request size. |
| SEC-A10 | **Members can backdate self check-ins by up to 7 days.** The client sends `occurredAt` and the server accepts anything within 7 days. Self check-in also has no proof of presence (no QR code, location or reception step), so attendance and streak numbers can be faked. | `AttendanceOperationService.java:41-46` | Accept an offline timestamp only if the operation was queued while offline: limit the gap to about 24h and require the device's queued-at to be close to the first attempt. Better: issue a signed gym QR code or nonce at reception and require it for check-in. |
| SEC-A11 | **CSV export allows formula injection.** A member name such as `=HYPERLINK("http://evil","x")` runs as a formula when the accountant opens the file in Excel. Quoting the field does not stop this. | `FinanceService.java:193-195, 262` | Prefix cells that start with `= + - @ \t \r` with `'`. Also write a UTF-8 BOM so Arabic names display correctly in Excel. |
| SEC-A12 | **Stored URLs aren't validated on the server.** The web app accepts only `https:`, but the API accepts any `videoUrl`, `logoUrl` or `profileImageUrl`. Mobile then opens `videoUrl` with `Linking.openURL` with no scheme check (`tel:`, `sms:`, `intent:`, phishing links). | `(member)/workout.tsx:332`, `(coach)/library.tsx:182`; the backend DTOs have no `@Pattern` | Add a server-side check that allows only `https://` (and an optional allowlist such as YouTube or your own CDN). Check the scheme on mobile before calling `openURL`. |
| SEC-A13 | **Login reveals expired members before the password is checked.** An expired member gets 403 "subscription expired" for *any* password; others get 401. This confirms the account exists. Unknown emails also skip bcrypt, so timing gives the same information. | `AuthService.java:82-104` | Check the password first, then the subscription. For unknown emails, run a dummy `passwordEncoder.matches` so response time is the same. |
| SEC-A14 | **Lockout can be used to lock out any account on purpose.** Five wrong passwords lock a known email for 15 minutes. An attacker can keep a gym's admin locked out permanently. | `LoginAttemptService` | Key failures on email + IP. Add CAPTCHA or exponential backoff instead of a hard lock. Notify the user. |
| SEC-A15 | **Production safety checks only run with the `prod` or `staging` profile.** Deployed without a profile (often the default on Railway), the demo-password and secret checks are skipped. | `ProductionSafetyCheck.java:17` | Run them unless `local` or `test` is active: `@Profile("!local & !test")`. |
| SEC-A16 | **Gym signup has no email verification.** Anyone can create a gym and GYM_ADMIN account using someone else's email, and pick the trial plan. | `PublicGymService.registerGym` | Send a verification email and keep the gym inactive until verified. Add CAPTCHA to the public signup and contact forms. |
| DATA-A17 | **Server time zone drives business days.** Attendance day uniqueness (V3), "checked in today", streaks, subscription expiry (`LocalDate.now()`) and cron jobs ("8 AM" reminders) all use the JVM zone. Containers default to UTC, but gyms are in UTC+3: a 1 AM check-in counts as the previous day, and reminders arrive at 11 AM. | `AttendanceService.java:30,139,152,194`, `AttendanceOperationService.java:46`, `SubscriptionStatusUtil`, `NotificationJobService` crons | Store a `timezone` per gym (default `Asia/Amman` or `Asia/Riyadh`). Compute business dates with `ZonedDateTime.now(gymZone)`. Set `zone` on `@Scheduled`. Short term: set `TZ`/`-Duser.timezone` in the Dockerfile. |
| OPS-A18 | **Scheduled jobs have no lock across instances.** With two instances running, every notification job runs twice and members get duplicate pushes. | 7 `@Scheduled` jobs (listed in section 8) | Add ShedLock with the JDBC provider (one table) before scaling past one instance. |
| PERF-A19 | **Web app is one 1.67 MB JavaScript file with no lazy routes.** Members on phones download the super-admin, finance and HR screens. | `artifacts/qawi-web/dist/public/assets/index-*.js`; `App.tsx` has 0 `lazy(` calls | Use `React.lazy` for each role's routes, and `manualChunks` for recharts and framer-motion. Expect the first load to drop by about 60-70%. |
| PERF-A20 | **Refresh tokens pile up forever.** Every login adds a row and nothing deletes expired or revoked tokens. | `RefreshTokenService` has no cleanup job | Add a nightly `DELETE FROM refresh_tokens WHERE expires_at < now() - interval '7 days'`. |

---

## 5. New findings: Low

| ID | Finding | Fix |
|---|---|---|
| LOW-A21 (**raised to Medium**, CVE-2025-22228) | Signup requires 6 password characters; change-password requires 8. There is no maximum length (bcrypt only uses the first 72 bytes). | Use one policy everywhere: minimum 8, maximum 72, and check against a list of common passwords. |
| LOW-A22 | `NutritionV2Service.assertSameGym` throws a null-pointer error (500) for SUPER_ADMIN, whose `gymId` is null. | Skip the check for SUPER_ADMIN. |
| LOW-A23 | Malformed JSON, bad UUIDs in paths and unknown routes fall through to the generic `Exception` handler. They return **500** and are reported to Sentry as server errors. | Add handlers for `HttpMessageNotReadableException` and `MethodArgumentTypeMismatchException` (return 400) and `NoResourceFoundException` (return 404). |
| LOW-A24 | Permission checks return 403 where the record exists and 404 where it doesn't, so callers can tell valid IDs apart (CoachNote, WorkoutPlan, Nutrition V1). | Return 404 for "not yours" as well. |
| LOW-A25 | A coach who is unassigned from a member can still edit plans they created, because `assertCallerCanWritePlan` checks only `plan.coachId`. | Also require the assignment to still exist. |
| LOW-A26 | The fallback estimate (when the AI is unavailable) is labelled `source: AI_CALCULATED`. | Label it `ESTIMATE`. |
| LOW-A27 | `management.info.env.enabled=true` with `/actuator/info` public: any future `info.*` property becomes public. | Turn it off, or expose only build info. |
| LOW-A28 | The privacy export covers only measurements and biometrics, not profile, attendance, nutrition or workouts. | Expand it before you advertise "export my data" (PDPL right of access). |
| LOW-A29 | nginx (web) sends no security headers (CSP, `X-Frame-Options`, `Referrer-Policy`), no gzip, and no long-cache rule for hashed assets. | Add `add_header` lines, `gzip on`, and `location /assets { expires 1y; }`. |

---

## 6. Earlier findings: status today

Verified in code today:

| Earlier ID | Status | Note |
|---|---|---|
| SEC-001 ADMS bypass, SEC-002/008 template IDOR, SEC-003 `/auth` permitAll, SEC-004 XFF spoof, SEC-005 storage, SEC-006 tracked env/target, DATA-001 overbooking, DATA-002 duplicate check-in, DATA-003/ARCH-001 ddl-auto, SEC-016 money | **Fixed**, covered by tests | The SEC-004 fix created SEC-A03. |
| SEC-007 7-day JWT in localStorage; clients ignore refresh tokens | **Open (High)** | Web `stores/authStore.ts:31-43` and mobile `AuthContext.tsx` never call `/auth/refresh`. Combined with SEC-A01. |
| SEC-011 any coach in the gym can read any member's nutrition | **Open (Medium)** | `NutritionV2Service.java:923-930` checks only the gym, not the coach assignment. |
| FE-001 finance export sends the wrong token | **Open (Medium)** | `pages/finance/dashboard.tsx:91` reads `localStorage['qawi_token']`. The zustand store (`authStore.ts:59`) saves a JSON object `{state:{token,...}}` under that key, so the export sends the whole JSON text as the Bearer token and always fails. Use the shared `apiFetch` (or `useAuthStore.getState().token`). |
| MOB-001 mobile tokens in AsyncStorage (unencrypted) | **Open (High)** | Move them to `expo-secure-store`. |
| MOB-003 hardcoded Replit fallback API URL | **Open (High)** | `qawi-mobile/services/api.ts:7`. If the build env var is missing, the app sends passwords to a third-party dev host. Remove the fallback and fail the build instead. |
| OPS-P4-001 Postgres published on `0.0.0.0:5432` with a default password | **Open (High)** | `docker-compose.yml:11-12`. Use `127.0.0.1:5432:5432` or drop the port, and make the password required (`:?`). |
| OPS-001 containers run as root, no healthcheck, no JVM memory flags | **Open (Medium)** | Add `USER 10001`, `HEALTHCHECK`, and `-XX:MaxRAMPercentage=75`. |
| SEC-015 CORS `*` | **Open (Low)** | Safe while there are no cookies, but restrict it to your domains. |
| MAINT-001 no Maven wrapper | **Open (Low)** | |
| PERF-001 N+1 queries, PERF-002 unpaginated lists | **Open (Medium)** | Only 5 files use pagination. |
| ARCH-004 `MemberController` god class, ARCH-003 nutrition V1 still present | **Open (Medium)** | See the architecture plan in section 9. |
| DATA-P5-001..004 (rest days, absent→PRESENT, price truncation, revenue) | **Not re-verified** in this pass | Treat as open until fixed. |
| OPS-P4-002..012 infrastructure items | **Not re-verified** | Treat as open. |

---

## 7. Scanner results (dependencies and SAST)

- **JavaScript:** 13 critical and 92 high advisories across all packages.
  - The criticals are `orval <8.22` (code execution only when generating from a malicious spec), `tar` and `shell-quote`. All are build or dev tools.
  - **Fix:** upgrade `orval` to ≥8.22, upgrade Expo to the latest SDK patch, add `pnpm.overrides` for `tar ≥7.5.21`, `ws ≥8.21`, `brace-expansion`, `js-yaml`, `postcss`, `nanoid`, and add `pnpm audit --prod --audit-level=high` to CI.
  - Nothing reaches the browser bundle.
- **Secrets:** clean.
- **Semgrep** (rulesets: java, typescript, react, owasp-top-ten, secrets, dockerfile, github-actions): **23 results**, triaged by hand:
  - **New, Low, OPS-A30:** 12 GitHub Actions steps use movable tags (`actions/checkout@v4` and similar, in `.github/workflows/build-test.yml:12,13,47,49,...`). If one of those tags is hijacked, it runs code in CI. **Fix:** pin each action to a full commit SHA and let Dependabot update them.
  - **New, Low, OPS-A31:** pnpm supply-chain hardening is incomplete. `minimumReleaseAge` is set, but there is no `trustPolicy` and no `blockExoticSubdeps` (`pnpm-workspace.yaml:28,37`), and `.npmrc` sets no release age. **Fix:** add `blockExoticSubdeps: true` and a trust policy. Keep `minimumReleaseAge`.
  - Already reported: `qawi-backend/Dockerfile:11` has no `USER` (OPS-001); actuator `metrics` is exposed (`application.properties:23`), which is acceptable because it requires SUPER_ADMIN.
  - False positives:
    - `scripts/phase2-smoke.py:140`: subprocess is called with a list, not a shell.
    - `phase2-smoke.py:25`: a documented test-only bcrypt fixture.
    - `nginx.conf:11`: `Host $host` on an internal proxy.
    - Two hits in markdown docs.
  - **No SQL injection, XSS, insecure-crypto or deserialization patterns were found** in the Java or TypeScript source.
- **Trivy (Java dependencies).** The first full-repo run was stopped at the 30-minute limit while crawling `node_modules`. A backend-only run was then blocked by Maven Central (HTTP 429). The final run scanned the **built backend JAR** (`target/qawi-1.0.0.jar`), which bundles every library: **16 Critical, 59 High, 65 Medium, 17 Low.**

  | Library (bundled version) | Crit/High | Notes |
  |---|---|---|
  | Tomcat embed 10.1.20 | 8 / 18 | e.g. CVE-2025-24813 (partial-PUT RCE: needs a writable default servlet, which Spring Boot doesn't enable by default, but it is only one of 26) and HTTP/2 header and digest-auth bypasses |
  | async-http-client 2.10.4 + Netty 4.1.109 | 3 / 20 | Pulled in by the `web-push` library, which makes outbound calls to push endpoints. Request smuggling, TLS validation and DNS issues |
  | Bouncy Castle 1.78.1 | 2 / 2 | Used by `web-push` |
  | Spring Security 6.2.4 | 2 / 1 | **CVE-2025-22228**: `BCryptPasswordEncoder.matches` accepts any password whose first 72 bytes match. **Raises LOW-A21 to Medium:** enforce a 72-byte maximum. CVE-2024-38821 affects WebFlux only, which this app doesn't use. |
  | Spring Framework 6.1.6 (webmvc/core/expression) | 1 / 6 | Includes path traversal (CVE-2024-38816/38819) and SpEL DoS |
  | Jackson databind/core 2.15.4 | 0 / 7 | |
  | Spring Boot 3.2.5, Micrometer 1.12.5, pgjdbc 42.6.2, jose4j 0.7.0 | 0 / 5 | |

  **Conclusion:** I did not test each CVE for exploitability in Qawi; several are not reachable in this configuration. But **the only real fix is the platform upgrade in OPS-A06**, and this raises OPS-A06 to the top of the "next 2 weeks" list:
  1. Spring Boot to the current supported 3.x line. This pulls in patched Tomcat, Spring Framework, Spring Security, Jackson, Micrometer and Logback.
  2. Bump pgjdbc to ≥42.7.11 and Bouncy Castle to ≥1.84.
  3. Replace or upgrade `web-push`, whose async-http-client 2.x and Netty 4.1 line carry most of the network-layer CVEs.
  4. Add `mvn org.owasp:dependency-check-maven:check -DfailBuildOnCVSS=7` to CI. The existing `security.yml` runs weekly but never fails the build.

### SEC-A32 (Medium, new): Web-push SSRF guard can be bypassed with DNS rebinding
- **Where:** `service/PushRegistrationService.java:96-117` resolves and checks the endpoint host **only at registration**. The outbound push later resolves the hostname again, through the `web-push` library's async-http-client, with no check.
- **Impact:** an authenticated user registers `https://attacker-host/...` that resolves to a public IP. Later they change its DNS to `169.254.169.254` or another internal address. The notification fan-out then sends server-side requests into the private network or to the cloud metadata service. Java's `isSiteLocalAddress` also does not cover IPv6 unique-local addresses (`fc00::/7`).
- **Fix (simplest and strongest):** allow only the real push services. Endpoint hosts must match `fcm.googleapis.com`, `*.push.services.mozilla.com`, `*.notify.windows.com` or `web.push.apple.com`. Reject everything else at registration *and* re-check before sending.

---

## 8. Smaller items noticed (housekeeping)

- `graphify-out/` (46 MB, 371 files) is staged in git and not in `.gitignore`. Add it to `.gitignore` and unstage it before committing. It's a generated analysis cache, and it produced all 184 secret-scan false alarms.
- Seven `@Scheduled` jobs, including one every minute (`flush-cron`) and one every 15 minutes (class reminders). Fine on one instance; see OPS-A18.
- `qawi-web/Dockerfile` builds on `node:20-alpine`, which reached end of life in April 2026. Move to Node 22 or 24 LTS.
- `.env.example` still contains `DB_PASSWORD=qawi_local_password`; Compose falls back to the same value.
- The `video_url` and `logo_url` columns are `varchar(255)`. Longer CDN URLs will fail with a 409 "Data conflict" message that doesn't explain the cause.

---

## 9. Future plans and architecture

1. **Keep the monorepo and the single Spring Boot service.** Reorganize it into a modular monolith with packages per business area: members, attendance, classes, nutrition, workouts, billing, notifications, platform and shared. Add an ArchUnit or Spring Modulith test so CI fails when one module reaches into another module's internals.
2. **Before scaling past one instance:** Redis for rate limits and lockout, ShedLock for jobs, short access tokens with refresh, a per-gym time zone.
3. **Real file uploads:** the backend issues presigned S3/R2 upload URLs scoped to the gym, with content-type and size checks. This replaces "paste an https URL", which is a step back for users.
4. **Observability:** set `SENTRY_DSN`, add request-ID response headers, slow-query logging (`log_min_duration_statement=500`), and alerts on 5xx and 429 rates.
5. **Test the riskiest paths:**
   - The tenant-isolation matrix for every endpoint.
   - Session revocation (SEC-A01).
   - Email normalization (DATA-A04).
   - A timezone boundary test: a check-in at 00:30 Amman time.
6. **Privacy (Saudi and Jordanian PDPL):** a written retention policy, then enable the retention job. A complete data export. Account deletion.

---

## 10. Fix order

**This week (blocking):**
1. SEC-A01 (session revocation)
2. SEC-A02 and SEC-A03 (rate limiter)
3. DATA-A04 (email case)
4. MOB-003 (remove the Replit URL)
5. OPS-P4-001 (stop publishing Postgres)
6. FE-001 (finance export token)

**Next 2 weeks:**
- **OPS-A06 (Spring Boot, Java 21 and dependency upgrade: 16 critical CVEs in the bundled libraries)**
- PERF-A05 (indexes)
- SEC-A32 (allow only real push services)
- SEC-A07, A08, A09 (AI timeout, cache, input size)
- DATA-A17 (time zone)
- SEC-007 and MOB-001 (short tokens, refresh in clients, SecureStore)
- SEC-A11 (CSV)
- SEC-A15 (profile check)
- LOW-A23 (400/404 handlers)

**This quarter:**
- OPS-A30, OPS-A31 (pin Actions, pnpm hardening)
- PERF-A19 (code splitting)
- OPS-A18 (ShedLock)
- SEC-A10 (check-in proof)
- SEC-A16 (email verification)
- SEC-011 (nutrition coach scope)
- The modular-monolith reorganization
- Real uploads
- Dependency upgrades
