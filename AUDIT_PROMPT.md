# Full Audit Brief: Qawi Monorepo

You are a senior engineer doing a full **read-only** audit of this repository. Go through it file by file and produce one report that lists everything that should change: security, data integrity, performance, reliability, architecture, maintainability, operations, and long-term risk.

**Do not edit, refactor, or commit any source file.** Your only output is `AUDIT_REPORT.md` in the repo root (plus `AUDIT_PROGRESS.md` if you need to checkpoint, see "Working on a large repo").

---

## 1. What this project is

Qawi (قوي) is a multi-tenant SaaS for gym management in the Middle East. It is bilingual (Arabic/English) with full RTL support. Tenants are gyms. Tenant isolation is done with a `gymId` column on shared tables, not with separate schemas.

Roles: `SUPER_ADMIN`, `GYM_ADMIN`, `COACH`, `MEMBER`, plus reception, HR, and finance roles in the mobile app.

| Path | What it is |
|---|---|
| `qawi-backend/` | Main API. Spring Boot 3.2.5, Java 19, PostgreSQL, JPA/Hibernate (`ddl-auto=update`), JJWT 0.11.5, Bucket4j, web-push, scheduled notification jobs |
| `artifacts/qawi-web/` | Web dashboard. React 19, Vite 7, TanStack Query, Tailwind 4, shadcn/ui, Wouter |
| `artifacts/qawi-mobile/` | Expo SDK 54 / React Native app with Expo Router. Has an offline check-in queue |
| `artifacts/qawi-marketing/` | Marketing site (Vite + React) |
| `artifacts/api-server/` | Separate Node/TypeScript server with object storage and ACL code |
| `artifacts/mockup-sandbox/` | Design sandbox. Check whether it ships anywhere |
| `lib/db` | Drizzle ORM schema |
| `lib/api-spec`, `lib/api-zod`, `lib/api-client-react` | OpenAPI spec, Orval codegen, generated clients |
| `lib/object-storage-web` | Storage client for the web app |
| `scripts/`, `tests/k6/`, `.github/workflows/` | Dev scripts, k6 load and security tests, CI |
| `docker-compose.yml`, `*/Dockerfile` | Local and production containers |

**Skip these:** `graphify-out/`, `node_modules/`, `qawi-backend/target/`, `attached_assets/`, `qawi-brand/`, lockfiles. Give `components/ui/*` (generated shadcn code) only a light pass for local modifications.

## 2. Read these first, then verify them

Read these before reviewing code: `README.md`, `TECHNICAL_DOCS.md`, `SYSTEM_DESIGN_AND_MIGRATION.md`, `QAWI_SECURITY.md`, `QAWI_FEATURES.md`, `future plan.md`, `replit.md`, `AGENTS.md`.

- `QAWI_SECURITY.md` Part A says some fixes have shipped. **Check each claim against the code** and report any claim that is false or only partly true.
- `future plan.md` lists known problems: tenant isolation, ZkTeco device flow, `/auth/**` permitAll, class-capacity race, `MemberController` size, duplicate nutrition systems, refresh tokens in clients, API contract, `ddl-auto`, query amplification. Do not just repeat these items. For each one, confirm it with `file:line` evidence, find **every** place it occurs, and say whether the proposed plan is right.
- Report places where the docs no longer match the code.

## 3. Rules for findings

1. **Every finding needs evidence:** a `path:line` reference and the relevant code quoted. If you cannot point to a line, put the item under "Open questions", not under findings.
2. **Trace before you claim.** For security findings, follow the request from the controller through the service and repository to the query. Show the path. A comment saying something is checked is not proof.
3. **Confidence:** label each finding `Confirmed` (traced end to end or reproduced), `Likely` (strong evidence, one link unverified), or `Needs check`.
4. **Severity:**
   - **Critical:** exploitable now. Examples: cross-tenant read or write, auth bypass, privilege escalation, leaked secret, data loss or corruption.
   - **High:** a serious bug or security weakness with a realistic trigger, or something that blocks a safe production launch.
   - **Medium:** a real problem with limited impact or a narrow trigger.
   - **Low:** hygiene, maintainability, or minor inefficiency.
5. **No style nitpicks** unless they cause bugs or real maintenance cost. Do not pad the report.
6. **Every fix must be concrete:** what to change, where, and a short code sketch when it helps. "Improve validation" is not a fix.
7. If the build or tests can run, run them (`mvn -B verify` in `qawi-backend`, `pnpm install && pnpm typecheck` at the root, `pnpm audit`, `mvn dependency-check:check`) and include the real output. If you could not run something, say so. Never invent results.

## 4. Method

**Phase 1: Map.** Build an inventory of every source file in scope, grouped by module. Write the coverage table in the report as you go (see section 6).

**Phase 2: Backend, file by file.** Use this order: `security/` → `config/` (SecurityConfig, CORS, seeders) → `filter/` → `controller/` → `service/` → `repository/` → `entity/` → `dto/` → `event/` → `exception/` → `resources/` → `pom.xml` → `src/test`.

Produce an **endpoint authorization matrix** with one row per controller method:

| HTTP method + path | Controller#method | Roles allowed (annotation or config) | Where gymId comes from (JWT, path, body, query) | Ownership check (where) | Verdict |

This matrix is the most important artifact in the report. Any endpoint that takes an entity ID or a `gymId` from the client and does not verify it against the caller's tenant is at least High severity.

**Phase 3: Clients.** Review `qawi-web`, `qawi-mobile`, `qawi-marketing`, `api-server`, and `lib/*`.

**Phase 4: Infrastructure.** Review Dockerfiles, compose, CI workflows, env handling, `.gitignore`, `pnpm-workspace.yaml`, and scripts.

**Phase 5: Cross-cutting.** Look across modules for duplication, contract drift between backend DTOs and client types, and dead code.

## 5. Checklist

### Security
- **Tenant isolation and IDOR:** check every `findById`, `findAll`, `deleteById`, and `save` on tenant-owned entities. Check whether a GYM_ADMIN of gym A can act on gym B. Check whether a COACH can reach members who are not assigned to them, and whether a MEMBER can reach other members' data.
- **Role checks:** is access enforced on the server, or only hidden in the UI? Check `@PreAuthorize` / `hasRole` coverage, role-name prefix mistakes, and whether a role can be escalated through a profile or user update.
- **Mass assignment:** check whether entities are bound directly from request bodies, and whether a client can set `role`, `gymId`, `status`, `subscriptionEnd`, or price fields.
- **Auth and JWT:** secret strength and fallbacks (`JWT_SECRET` → `SESSION_SECRET` → empty?), algorithm, expiry (7 days), refresh-token rotation and reuse detection, revocation on password change and logout, and claims trusted without a DB check.
- **Password handling:** change and reset flows, timing differences, user enumeration, lockout bypass (the lockout is in memory, so check what happens after a restart and across multiple instances).
- **Rate limiting:** Bucket4j state is in memory. Check per-IP keying behind a proxy and `X-Forwarded-For` spoofing.
- **Public and device endpoints:** the ZkTeco / turnstile flow, webhooks, and anything else that is `permitAll`. Check authentication, replay protection, and whether subscription rules are applied before granting physical access.
- **Input validation:** check `@Valid` coverage, size limits, enum handling, and date ranges.
- **Injection:** native queries, JPQL string building, `LIKE` patterns.
- **File upload and object storage** (`api-server`, `object-storage-web`): ACLs, signed URL scope and expiry, content-type and size checks, path traversal, and whether one gym can read another gym's files.
- **CORS, security headers, CSRF assumptions,** and actuator exposure.
- **Secrets:** check for anything committed. `artifacts/qawi-web/.env`, `artifacts/qawi-mobile/.env`, and `qawi-backend/target/` are tracked in git. Also check default passwords in properties and compose files, seeders that run in production, and secrets reachable through `VITE_*` or `EXPO_PUBLIC_*` variables.
- **Client token storage:** web (localStorage vs cookies, XSS exposure) and mobile (AsyncStorage vs SecureStore).
- **Logging:** passwords, tokens, PII, biometric IDs, or health data in logs.
- **Privacy and compliance:** the app stores body measurements, health data, and biometric enrollment for Middle East users (Saudi PDPL, UAE PDPL). Cover data minimization, retention, deletion and export, and encryption at rest.
- **Push notifications:** VAPID key handling and whether one user can register a subscription for another.

### Data integrity and correctness
- Transaction boundaries (`@Transactional` placement, self-invocation, read-only flags).
- Race conditions: class capacity, check-in streaks, subscription renewals, and anything done as read-modify-write.
- Missing DB constraints: unique, foreign key, not-null, check constraints. Since `ddl-auto=update` creates the schema, list what it silently fails to create or change.
- Subscription and grace-period logic (3-day grace, Active/Expiring/Expired): test boundaries, off-by-one errors, and timezone handling (server UTC vs gym local time, `LocalDate` vs `Instant`).
- Scheduled jobs: idempotency, duplicate runs when more than one instance is running, failure handling, and catch-up after downtime.
- The mobile offline check-in queue: duplicates, ordering, conflicts, and spoofed timestamps.
- Money: types (`double` vs `BigDecimal`), rounding, and currency.
- Arabic and English: text handling, sorting, and search.

### Performance and scalability
- N+1 queries, EAGER fetches, `open-in-view=false` combined with lazy loading, missing `JOIN FETCH` or entity graphs.
- Unpaginated list endpoints and responses that return whole entities.
- Missing indexes for `gymId` + common filters. List the indexes you would add.
- Work done in Java loops that the DB should do. Check analytics endpoints especially.
- Connection pool settings and thread usage for async push fan-out.
- State that blocks horizontal scaling: in-memory maps, local caches, schedulers.
- Web: bundle size, code splitting, TanStack Query `staleTime` and invalidation, re-render hot spots, large lists.
- Mobile: FlatList usage, image sizes, polling, battery use, and offline queue size.
- Check whether the k6 tests in `tests/k6` cover the real hot paths.

### Architecture and long-term health
- Layering violations: logic in controllers, repositories called from controllers, entities returned from the API.
- God classes (`MemberController` and others). Propose concrete splits.
- Two backends and two data layers: Spring/JPA alongside `api-server` + Drizzle `lib/db`. Explain what each one is actually used for and recommend which to keep.
- API contract: is `lib/api-spec/openapi.yaml` the source of truth, or are web and mobile hand-writing types that drift from it?
- Duplicated logic across web and mobile that should live in a shared package.
- Dead code, unused dependencies, and Replit leftovers (`.replit`, `@replit/*` plugins, platform overrides in `pnpm-workspace.yaml` that break builds on macOS or Windows).
- Schema migrations: a concrete plan for Flyway baseline → `validate`.
- Versions: Java 19 is non-LTS and past end of life. Check Spring Boot 3.2 support status, JJWT 0.11, and anything else with known CVEs. Give an upgrade path.
- Tests: there are only two backend tests. Name the highest-value tests to write first (tenant isolation, authorization, subscription logic, concurrency).
- CI/CD: what is missing (frontend tests, mobile build, migration check, secret scanning, branch protection).

### Operations
- Dockerfiles: base image, non-root user, multi-stage build, layer caching, healthchecks, JVM memory flags.
- Config per environment, a list of required env vars, and fail-fast behavior when a secret is missing.
- Logging and observability: correlation IDs, metrics, alerting, error tracking.
- Backups, restore, and disaster recovery for Postgres.
- Graceful shutdown and handling of in-flight jobs.

### Frontend quality (lighter pass)
- Error and loading states, error boundaries, and behavior when offline.
- RTL correctness and missing translations (hard-coded English or Arabic strings).
- Accessibility basics: labels, focus handling, contrast, touch target size.

## 6. Report format (`AUDIT_REPORT.md`)

1. **Executive summary:** at most 10 lines, including an overall production-readiness verdict.
2. **Top 10 issues to fix first,** ranked.
3. **Endpoint authorization matrix** (from Phase 2).
4. **Findings,** grouped by severity, then by category. Use this format for each one:

   ```
   ### [SEC-001] Short title
   Severity: Critical | Confidence: Confirmed | Category: Security / Tenant isolation | Effort: S/M/L
   Location: qawi-backend/src/main/java/com/qawi/controller/X.java:123
   Evidence:
     <quoted code>
   What's wrong: …
   Impact / exploit scenario: concrete steps an attacker or user would take, and the result
   Fix: concrete change + code sketch
   Related: SEC-004, PERF-002
   ```

   ID prefixes: `SEC`, `DATA`, `PERF`, `ARCH`, `MAINT`, `OPS`, `FE`, `MOB`, `DOC`.
5. **Documentation claims checked:** each claim from `QAWI_SECURITY.md` and `future plan.md` with a verdict of true, false, or partial, and evidence.
6. **Quick wins:** under one hour each, high value.
7. **Roadmap:** phased plan. Phase 0 is before launch, Phase 1 is the first month, Phase 2 is the first quarter. Include dependencies between items.
8. **Open questions for the owner:** things the code cannot answer.
9. **Coverage ledger:** every in-scope file with a status of `reviewed`, `skimmed`, or `skipped`, plus a reason for anything not reviewed. The audit is not complete until every in-scope file appears here.
10. **Tool output:** results from build, test, typecheck, and dependency scans, or a note on why each was not run.

## 7. Working on a large repo

This repo has more than 1,000 tracked files. Do not skim to finish faster. Work module by module. After each module, append its findings and coverage rows to `AUDIT_PROGRESS.md`, so that if you run out of context you can resume from the last completed module without starting over. Merge everything into `AUDIT_REPORT.md` at the end.
