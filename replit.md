# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Also contains a standalone Java Spring Boot 3 project
for the Qawi gym management API, a React/Vite web dashboard, and an Expo mobile app — all
sharing the same backend.

---

## Qawi Spring Boot API (`qawi-backend/`)

- **Language**: Java 19 (GraalVM 22.3)
- **Framework**: Spring Boot 3.2.5
- **Security**: Spring Security + JWT (JJWT 0.11.5), 7-day expiry, BCrypt
- **ORM**: Spring Data JPA + Hibernate (PostgreSQL dialect auto-selected)
- **Build**: Maven 3.8.6
- **Port**: 9000
- **Base path**: all endpoints under `/api/v1/`
- **Actuator**: `/actuator/health` + `/actuator/info` public; others require `SUPER_ADMIN`

### Package Structure
```
com.qawi
  /config       — SecurityConfig, DataSeeder, Phase3DataSeeder, Phase4DataSeeder
  /controller   — Auth, GymAdmin, CoachDashboard, Exercise, WorkoutPlan, WorkoutTemplate,
                  Nutrition, Measurement, Attendance, Notification, Me, Member, PublicGym, SuperAdmin, CoachNote
  /service      — AuthService, GymAdminService, ExerciseService, WorkoutPlanService, WorkoutTemplateService,
                  NutritionService, MeasurementService, AttendanceService, NotificationService, AccessGuard
  /repository   — 20 JPA interfaces
  /entity       — User, Gym, GymFeatures, GymLimits, GymBranding, CoachMember, ExerciseCategory,
                  ExerciseTemplate, WorkoutPlan, WorkoutDay, ScheduleDay, PlanExercise,
                  NutritionPlan, Meal, MealLog, Measurement, Notification, Attendance
  /dto          — 30+ request/response DTOs (all with Bean Validation annotations)
  /exception    — AppException, GlobalExceptionHandler
  /filter       — RateLimitFilter (Bucket4j), RequestLoggingFilter (MDC)
  /security     — JwtService, JwtAuthFilter
```

### Phase 7A Hardening (completed)
- **Bean Validation**: `spring-boot-starter-validation` on all request DTOs; `@Valid` on all `@RequestBody` params across all controllers including `AddPlanExerciseRequest` in `WorkoutPlanController`
- **Enhanced error format**: `ErrorResponse { error, messageAr, fields: Map<String,String>?, timestamp }` — `fields` populated by `MethodArgumentNotValidException` handler so clients can highlight individual form fields
- **GlobalExceptionHandler** covers: `AppException`, `MethodArgumentNotValidException` (with fields map), `EntityNotFoundException` (404), `DataIntegrityViolationException` (409 with duplicate detection), `BadCredentialsException`, `AuthenticationException`, `AccessDeniedException`, `NullPointerException`, generic `Exception`
- **Rate limiting** (`RateLimitFilter` via Bucket4j 8.10.1): login 5 req/min per IP; register-gym 3 req/hr per IP; all others 100 req/min per authenticated user or IP
- **Request logging** (`RequestLoggingFilter`): MDC-tagged structured logs (`[METHOD /path] userId=... duration=...ms status=...`), skips `/actuator/*`; `requestId` injected into every log line
- **Health check**: `/actuator/health` (public) and `/actuator/info` (public) via `spring-boot-starter-actuator`

### Security model
Authorization enforced by `service/AccessGuard`:
- `assertCanAccessMember(callerEmail, memberId)` — passes for member-self, assigned COACH in same gym, same-gym GYM_ADMIN, or any SUPER_ADMIN; throws 403 otherwise
- `assertCoachManagesMember(coachEmail, memberId)` — write-side; coach must be assigned + same gym

CORS: `allowCredentials=false`, wildcard origin (Bearer-token auth, no cookies).

### Feature Flags (`GET /api/v1/me/gym-config`)
Per-gym via `gym_features` table. Flags: `nutritionEnabled`, `pushNotificationsEnabled`, `customBrandingEnabled`, `classBookingEnabled`, `analyticsAdvancedEnabled`. Limits: `maxMembers` (null = unlimited). Both web and mobile consume this endpoint on login.

### Roles
`MEMBER`, `COACH`, `GYM_ADMIN`, `SUPER_ADMIN`

### Error Format
```json
{ "error": "...", "messageAr": "...", "fields": { "fieldName": "message" }, "timestamp": "..." }
```
`fields` is omitted (`null`) when not a validation error.

### Seed Data (runs on startup if DB empty)
- Gym: Iron Peak Gym
- 1 GYM_ADMIN: `admin@ironpeak.com` / `password123`
- 2 COACHes: `coach.jordan@ironpeak.com`, `coach.morgan@ironpeak.com` / `password123`
- 4 MEMBERs: sam (30d), casey (5d → expiry alert), riley (30d), drew (expired → blocked)
- SUPER_ADMIN: `super@qawi.com` / `qawi_super_2024`

---

## Qawi Web (`artifacts/qawi-web/`)

- **Stack**: React 19 + Vite + TypeScript, TanStack Query, Tailwind CSS, shadcn/ui, Framer Motion
- **i18n**: `use-language` hook with EN/AR locale files; full RTL support
- **Theme**: Dark glass-morphism (bg `#0A0F1E`, accent green `#22C55E`)
- **Auth**: JWT in `localStorage`, `useAuth` hook, role-based routing in `App.tsx`
- **Feature flags**: `hooks/use-gym-config.ts` fetches `/me/gym-config`; Nutrition sidebar link shown only when `nutritionEnabled=true`
- **Roles**: MEMBER dashboard, COACH dashboard (members, plans, nutrition, library, templates, notes), GYM_ADMIN dashboard (analytics, members, coaches, subscriptions), SUPER_ADMIN dashboard

### Key pages
- `/coach/nutrition` — nutrition plan management page (feature-flagged)
- `/admin/members` — enforces `limits.maxMembers`; shows `X/Y members` count when limit set; disables Add button at limit
- `/super/gyms/:id` — per-gym feature flag toggles and limits management

---

## Qawi Mobile (`artifacts/qawi-mobile/`)

- **Stack**: Expo SDK 54, React Native, TypeScript, Expo Router, React Query, AsyncStorage
- **Backend**: `https://${EXPO_PUBLIC_DOMAIN}/api/v1` via `services/api.ts`; JWT in AsyncStorage
- **Auth**: `context/AuthContext.tsx` with `useProtectedRoute()` (watches `firstSegment` string to avoid infinite loops)
- **i18n**: `context/LanguageContext.tsx` (EN/AR); `locales/en.json` + `locales/ar.json`
- **Feature flags**: `hooks/useGymConfig.ts`; coach Nutrition tab gated by `nutritionEnabled`
- **Tabs**:
  - `(member)` — Home / Workout / Check-in / Nutrition / Progress
  - `(coach)` — Members / Plans / Library / Nutrition (feature-flagged) / Profile
  - `(admin)` — Dashboard / Members / Coaches / Profile
- **Workflow**: `artifacts/qawi-mobile: expo` — restart only on dependency changes

---

## Node.js Workspace

- **Monorepo tool**: pnpm workspaces
- **Node.js**: 24 | **pnpm** | **TypeScript**: 5.9
- **API Server** (`artifacts/api-server/`): Express, port 8080, handles Node-side routes
- **Mockup Sandbox** (`artifacts/mockup-sandbox/`): Vite, component previews for Canvas

## Environment Variables
| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection URL (required) |
| `PGHOST/PGPORT/PGDATABASE/PGUSER/PGPASSWORD` | Individual PG vars used by Spring Boot |
| `JWT_SECRET` | JWT signing secret (≥32 bytes; falls back to `SESSION_SECRET`) |
| `SESSION_SECRET` | Fallback for `JWT_SECRET` in dev |
