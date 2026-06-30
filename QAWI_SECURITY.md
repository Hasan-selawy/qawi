# Qawi — Security Hardening & Posture

> **Scope.** This document records a **code-level security hardening pass** on the
> Qawi backend (`qawi-backend/`) plus supporting monorepo tooling (CI, load/security
> test scripts, ignore rules). It was intentionally constrained to **safe, non-destructive**
> changes: **no Flyway** was introduced and the schema strategy remains
> `spring.jpa.hibernate.ddl-auto=update`. The backend still boots, and
> `MEMBER` / `GYM_ADMIN` / `SUPER_ADMIN` logins still work. The riskier schema-management
> changes that were deliberately **deferred** are described in **Part C**.

This file is organized into three parts so the boundary between "already shipped"
and "still needs doing" is unambiguous:

- **[Part A](#part-a--completed-code-level-fixes-shipped)** — Completed code-level fixes (shipped in this pass).
- **[Part B](#part-b--external-infrastructure-still-required-not-code)** — External infrastructure still required (operational, not code).
- **[Part C](#part-c--deferred--risky-future-work)** — Deferred / risky future work (Flyway + `ddl-auto=validate`).

Appendices: **[Config knobs](#appendix-a--configuration-knobs-environment-variables)**, **[Scan snapshot](#appendix-b--security-scan-snapshot)**, **[Verification](#appendix-c--how-this-was-verified)**.

---

## Part A — Completed code-level fixes (shipped)

### A1. Seed credentials sourced from environment variables
The data seeders previously hard-coded the demo passwords as string literals.
They now read them from the environment with a **dev fallback** so existing
seeded logins keep working out of the box:

| Variable | Default (dev fallback) | Used by |
|----------|------------------------|---------|
| `QAWI_DEMO_USER_PASSWORD` | `password123` | `DataSeeder`, `V3DataSeeder`, `SalesDataSeeder` |
| `QAWI_DEMO_SUPER_ADMIN_PASSWORD` | `qawi_super_2024` | `DataSeeder` |

Plaintext password values are **no longer written to any log line** (the
nutritionist seed log that previously echoed the password was scrubbed).

> **Production action:** set both variables to strong secrets, or — better — disable
> demo seeding entirely in production. The fallback exists only so local/dev startup
> is friction-free.

### A2. `.gitignore` hardening
Root `.gitignore` now ignores `.env` and `.env.*` (while keeping `.env.example`
tracked), plus `target/`, compiled `*.class`, and `*.log`. A dedicated
`qawi-backend/.gitignore` was added for the Maven build output. No files were
removed from version control (no `git rm`) — that is a destructive operation and
is out of scope; any already-tracked `.env` files contain only public URLs (see
the audit note in Appendix C).

### A3. Brute-force account lockout
A new in-memory `LoginAttemptService` (backed by a `ConcurrentHashMap`) locks an
account after repeated failed logins:

- Threshold: `QAWI_LOGIN_MAX_ATTEMPTS` (default **5**) consecutive failures.
- Lock window: `QAWI_LOGIN_LOCK_MINUTES` (default **15** minutes).
- `AuthService.login()` checks the lock **first** and returns `429 Too Many Requests`
  with a bilingual (EN/AR) message while locked.
- An **unknown email** and a **wrong password** are treated identically (same
  generic `401`, both recorded as failures) so the lockout also blunts username
  enumeration and password spraying.
- A **subscription lock** (expired membership → `403`) is **not** a credential
  failure and never counts toward the lockout.
- A successful login resets the counter.

> This is **per-process, in-memory** state. It is correct for a single backend
> instance but does **not** coordinate across replicas — see **Part B**.

### A4. Refresh tokens + revocation
Adds a refresh-token flow on top of the existing (unchanged) 7-day access JWT:

- New `RefreshToken` entity (`refresh_tokens` table, auto-created by
  `ddl-auto=update`). Only the **SHA-256 hash** of the opaque token is stored —
  the raw token is returned to the client exactly once, so a DB leak cannot be
  replayed.
- `POST /api/v1/auth/login` and `register-gym` responses now include a
  `refreshToken` field (older clients that ignore it are unaffected).
- `POST /api/v1/auth/refresh` — validates the presented token, **rotates** it
  (revokes the old, issues a new one) and returns a fresh access token. Rotation
  is **single-use and atomic** — gated on a conditional
  `UPDATE ... WHERE revoked = false AND expires_at > now`, so two concurrent
  requests presenting the same token cannot both succeed (exactly one wins, the
  other gets `401`), which is the precise stolen-token race rotation defends.
- `POST /api/v1/auth/logout` — revokes the presented refresh token (idempotent).
- Lifetime: `QAWI_REFRESH_TOKEN_DAYS` (default **30**).

> Token rows accumulate over time; pruning expired/revoked rows is a future
> housekeeping job (noted in Part B). For multi-instance correctness the store is
> already DB-backed, so refresh/revocation works across replicas today (only the
> A3 lockout is per-process).

### A5. Asynchronous push fan-out
Outbound web + Expo push delivery is now dispatched off the request thread:

- New `AsyncConfig` enables `@Async` and defines a **bounded** `pushTaskExecutor`
  (core 2 / max 8 / queue 500, `CallerRunsPolicy` for back-pressure, graceful
  shutdown). Bounded by design so a push backlog cannot exhaust memory.
- New `PushFanOutService.fanOut(...)` is `@Async`; it is a **separate bean**
  (not a method on `NotificationService`) because Spring's async proxy is bypassed
  on self-invocation.
- `NotificationService` still fires the fan-out from the **after-commit** hook, so
  pushes are never sent for a rolled-back notification and never hold a DB
  connection open during outbound HTTP. Delivery remains best-effort (failures
  are swallowed/logged, never surfaced to the caller).

### A6. Structured JSON logging (opt-in by profile)
- Added `logstash-logback-encoder` and a `logback-spring.xml`.
- **Default (dev):** human-readable console output, unchanged, including the
  `reqId` MDC value set by `RequestLoggingFilter`.
- **JSON:** emitted only when the `prod` or `json-logging` Spring profile is
  active, with `requestId` and `userId` MDC keys promoted to first-class fields
  and a static `{"app":"qawi-backend"}` field for aggregation.

### A7. HTTP security response headers
`SecurityConfig` now emits hardening headers on every response:

| Header | Value |
|--------|-------|
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` (effective over TLS) |
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Content-Security-Policy` | `default-src 'none'; frame-ancestors 'none'; base-uri 'none'` |
| `Permissions-Policy` | `geolocation=(), microphone=(), camera=()` |

CORS configuration is **unchanged** (wildcard origin, `allowCredentials=false`,
Bearer-token auth). The CSP is conservative because this service returns JSON only.

### A8. Dependency scanning, CI, and load/security tests
- **OWASP Dependency-Check** Maven plugin added to `qawi-backend/pom.xml`,
  **intentionally not bound** to a build phase, so normal builds stay fast and
  offline-friendly. Run on demand:
  `mvn org.owasp:dependency-check-maven:check` (fails on CVSS ≥ 8). Set
  `NVD_API_KEY` to speed up the data feed.
- **CI** (`.github/workflows/`): `build-test.yml` (backend `mvn verify` against a
  Postgres service + web build) and `security.yml` (scheduled/dispatch OWASP scan,
  uploads the report artifact).
- **k6 scripts** (`tests/k6/`): `load.js` (smoke + light load with thresholds) and
  `security.js` (unauthenticated-access rejection, actuator lockdown, header
  presence, and brute-force lockout). Both are env-driven (`BASE_URL`, creds).

### A9. Actuator endpoints remain locked down (verified)
`/actuator/health` and `/actuator/info` remain public; everything else requires
`SUPER_ADMIN`. This was a hard requirement and is **unchanged** — verified that
only two endpoints are exposed beneath `/actuator` and that the hardening headers
are present on the public ones.

---

## Part B — External infrastructure still required (not code)

These are **operational** items that cannot be solved purely in application code
and are **not** part of this pass:

1. **Distributed lockout / shared cache (Redis).** The A3 lockout is in-memory and
   per-instance. Behind more than one backend replica, move the attempt counters
   (and any rate-limiting state) to Redis so a lock is honored cluster-wide.
2. **Error monitoring (Sentry, or equivalent).** Wire a Sentry DSN to capture
   backend exceptions and frontend errors with release/environment tagging. The
   JSON logging from A6 is the local half of this; Sentry is the aggregation half.
3. **Staging environment.** A production-like staging deploy is the prerequisite
   for safely exercising **Part C** (the Flyway migration) and for running the k6
   scripts against something other than dev.
4. **Uptime / health monitoring (UptimeRobot, or equivalent).** Poll
   `/actuator/health` from outside the platform and alert on downtime.
5. **Read replica.** For read-heavy analytics/finance/super-admin queries, a
   Postgres read replica offloads the primary. Requires app-side datasource
   routing — design, not a drop-in.
6. **Secrets management for production.** Set `JWT_SECRET` (≥ 32 bytes) explicitly,
   set the A1 demo-password variables (or disable demo seeding), and provision the
   VAPID keys (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`) to enable
   web push (currently logged as disabled).
7. **`NVD_API_KEY` for CI.** Add as a repository secret so the scheduled OWASP scan
   in `security.yml` runs quickly and reliably.
8. **Refresh-token housekeeping.** A scheduled job (or DB TTL policy) to purge
   expired/revoked `refresh_tokens` rows over time.

---

## Part C — Deferred / risky future work

### Flyway migrations + `ddl-auto=validate` (explicitly NOT done in this pass)

**Why deferred.** The platform currently relies on `ddl-auto=update`, which lets
Hibernate create/alter tables at boot (this is how the new `refresh_tokens` table
was created). Switching to managed migrations with `validate` is the correct
long-term posture, but it is **high-risk**: if the migration baseline does not
**exactly** match the schema Hibernate expects, the application **fails to start**.
That directly violates the "backend must still start" constraint, so it was kept
out of this pass.

**Recommended phased rollout (do this on staging first, with a backup/snapshot):**

1. **Capture the current schema.** With the app running on `ddl-auto=update`, dump
   the live schema (`pg_dump --schema-only`) as the source of truth. This must
   include every table Hibernate auto-created, including `refresh_tokens` and any
   columns added during this pass.
2. **Introduce Flyway, baseline-only.** Add the Flyway dependency, place the
   captured schema as `V1__baseline.sql`, and configure
   `flyway.baseline-on-migrate=true` so existing databases are marked at the
   baseline without re-running DDL.
3. **Keep Hibernate from mutating, gradually.** Move from `update` → `none` first
   (Hibernate stops changing the schema; Flyway owns it) and confirm a clean boot.
   Only then consider `validate`, which additionally asserts the mapping matches.
4. **Reconcile mismatches.** Expect `validate` to flag differences (column types,
   lengths, nullability, enum storage, implicit indexes/constraints). Resolve each
   either by correcting the entity mapping or adding a corrective migration —
   **never** by letting Hibernate "fix" it.
5. **All future changes via versioned migrations.** New schema changes ship as
   `V2__*.sql`, `V3__*.sql`, … reviewed in PRs; entities and migrations change in
   lockstep.
6. **Roll out behind staging + rollback.** Validate the whole sequence on staging,
   keep a database snapshot, and have a tested rollback (restore snapshot, revert
   to `none`/`update`) before touching production.

**Net effect when complete:** deterministic, reviewable, environment-consistent
schema changes and drift detection at boot — at the cost of the upfront baseline
work and the startup-failure risk above. Until then, `ddl-auto=update` remains in
place by design.

---

## Appendix A — Configuration knobs (environment variables)

| Variable | Default | Purpose |
|----------|---------|---------|
| `QAWI_DEMO_USER_PASSWORD` | `password123` | Seeded demo user password (A1) |
| `QAWI_DEMO_SUPER_ADMIN_PASSWORD` | `qawi_super_2024` | Seeded super-admin password (A1) |
| `QAWI_LOGIN_MAX_ATTEMPTS` | `5` | Failed logins before lockout (A3) |
| `QAWI_LOGIN_LOCK_MINUTES` | `15` | Lock duration in minutes (A3) |
| `QAWI_REFRESH_TOKEN_DAYS` | `30` | Refresh-token lifetime (A4) |
| `NVD_API_KEY` | _(unset)_ | Speeds up OWASP Dependency-Check (A8) |
| Spring profile `prod` or `json-logging` | _(unset)_ | Switches logging to JSON (A6) |

Existing variables (`JWT_SECRET`, `DATABASE_URL`/`PG*`, `EXPO_PUBLIC_DOMAIN`,
`OPENAI_API_KEY`, `VAPID_*`) are documented in `replit.md`.

## Appendix B — Security scan snapshot

Run via the security-scan tooling during this pass. None of the high findings are
in code changed by this pass, and none are introduced by it:

- **Dependency audit:** findings are in **JS/npm workspace** packages
  (pre-existing). The backend (Java) dependency posture is now covered by the
  OWASP plugin (A8).
- **SAST:** 2 "high" findings, both **pre-existing false positives** — a Replit
  sidecar localhost `http` call in `artifacts/api-server`, and a Semgrep misfire
  on a bilingual toast **template string** (no SQL) in `artifacts/qawi-mobile`.
- **HoundDog:** 1 low-severity finding.

These belong to the JS side of the monorepo and are outside the scope of this
backend hardening pass; they are recorded here for visibility.

## Appendix C — How this was verified

- **Build:** `mvn -o compile` and `mvn -o test` both pass; the app boots cleanly
  (Tomcat on `:9000`, `refresh_tokens` auto-created).
- **Secret audit:** tracked `.env` files contain only public URLs; `.env.example`
  holds placeholders only.
- **Login matrix:** `super@qawi.com`, `admin@ironpeak.com`, `casey@ironpeak.com`
  all return `200` with both `token` and `refreshToken`.
- **Subscription lock:** expired member `drew@ironpeak.com` returns `403` and is
  **not** counted as a failed attempt.
- **Lockout:** 5 failures → 6th returns `429` with the lockout message; a valid
  account from a different source still logs in (lock is per-email).
- **Refresh flow:** refresh returns a new access token and a **rotated** refresh
  token; reusing the old token → `401`; logout → `204`; refresh after logout →
  `401`; an empty token → `400` (validation).
- **Concurrency:** two simultaneous refreshes presenting the same token return
  exactly one `200` and one `401` — single-use rotation holds under a race.
- **Headers:** all six headers in A7 verified present on `/actuator/health`.
