# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Contains a standalone Java Spring Boot 3 backend, a React/Vite web dashboard, an Expo mobile app, a marketing site, and an API server — all sharing the same PostgreSQL database.

---

## Qawi Spring Boot API (`qawi-backend/`)

- **Language**: Java 19 (GraalVM 22.3)
- **Framework**: Spring Boot 3.2.5
- **Security**: Spring Security + JWT (JJWT 0.11.5), 7-day expiry, BCrypt password hashing
- **ORM**: Spring Data JPA + Hibernate (PostgreSQL dialect auto-selected)
- **Build**: Maven 3.8.6
- **Port**: 9000
- **Base path**: all endpoints under `/api/v1/`
- **Actuator**: `/actuator/health` + `/actuator/info` public; others require `SUPER_ADMIN`

### Roles

| Role | Description |
|------|-------------|
| `SUPER_ADMIN` | Platform-level: manages all gyms, pricing tiers, sales pipeline |
| `GYM_ADMIN` | Full access to one gym: members, coaches, settings, analytics |
| `COACH` | Manages assigned members: workout plans, nutrition, notes |
| `NUTRITIONIST` | Manages nutrition targets, calendar plans, and meal suggestions for gym members |
| `RECEPTIONIST` | Front-desk: check-ins, walk-ins, subscription renewals, alerts |
| `SALES` | Lead management and conversion pipeline |
| `ACCOUNTANT` | Finance dashboard: revenue, subscriptions, CSV export |
| `HR` | Staff management: profiles, attendance, coach performance |
| `MEMBER` | Own dashboard: workouts, nutrition, classes, progress, check-in |

### Package Structure

```
com.qawi
  /config       — SecurityConfig, DataSeeder, Phase3DataSeeder, Phase4DataSeeder,
                  V3DataSeeder, NutritionFoodSeeder, PricingDataSeeder,
                  SalesDataSeeder, SchemaInitializer
  /controller   — 28 controllers (see API Modules below)
  /service      — 28 services (see API Modules below)
  /repository   — 44 JPA interfaces
  /entity       — 65+ entities and enums (see Entities below)
  /dto          — 40+ request/response DTOs (all with Bean Validation annotations)
  /exception    — AppException, GlobalExceptionHandler
  /filter       — RateLimitFilter (Bucket4j), RequestLoggingFilter (MDC)
  /security     — JwtService, JwtAuthFilter
```

### API Modules

| Module | Base Path | Roles | Description |
|--------|-----------|-------|-------------|
| **Auth** | `/api/v1/auth` | public/all | Login, register-gym, change-password, me, check-email |
| **Me** | `/api/v1/me` | authenticated | Gym config/feature flags, profile |
| **Gym Admin** | `/api/v1/admin` | GYM_ADMIN | Dashboard KPIs, member/coach CRUD, subscriptions, analytics, notifications |
| **Employees** | `/api/v1/admin/employees` | GYM_ADMIN | Add/remove/deactivate staff accounts |
| **Gym Shared** | `/api/v1/gym` | GYM_ADMIN, RECEPTIONIST, SALES, COACH, NUTRITIONIST | Shared gym resources (coach list, etc.) |
| **Reception** | `/api/v1/reception` | RECEPTIONIST, GYM_ADMIN | Member check-in, walk-in registration, live feed, alerts, subscription renewal, coach assignment |
| **Finance** | `/api/v1/finance` | ACCOUNTANT, GYM_ADMIN | Revenue summary, subscription breakdown, member finance list, CSV export |
| **HR** | `/api/v1/hr` | HR, GYM_ADMIN | Staff profiles, daily attendance, coach performance metrics |
| **Sales / Leads** | `/api/v1/gym/leads` | SALES, RECEPTIONIST, GYM_ADMIN | Lead pipeline CRUD, lead-to-member conversion, CRM notes, renewal |
| **Coach Dashboard** | `/api/v1/coach` | COACH, GYM_ADMIN | Member overview, nutrition status, assignment |
| **Coach Notes** | `/api/v1/notes` | COACH, GYM_ADMIN | Per-member notes with timestamps |
| **Exercises** | `/api/v1/exercises` | authenticated | Exercise library + categories; GYM_ADMIN gym-level overrides (custom name EN/AR + video URL) |
| **Workout Plans** | `/api/v1/workouts` | COACH, GYM_ADMIN, MEMBER (self-training) | Plan CRUD, schedule days, exercises per day, mark complete |
| **Workout Templates** | `/api/v1/templates` | COACH, GYM_ADMIN | Reusable plan templates with days and exercises |
| **Nutrition V2** | `/api/v1/nutrition` | MEMBER (self), COACH, NUTRITIONIST, GYM_ADMIN | Targets, food search, manual logging, water log, meal suggestions, AI calendar plans |
| **Nutrition V3** | `/api/v1/nutrition/v3` | COACH, GYM_ADMIN, MEMBER | AI-powered text-to-nutrition analysis, enhanced logging, coach overview |
| **Measurements** | `/api/v1/measurements` | COACH, GYM_ADMIN, MEMBER | Body measurements history (weight, body fat, etc.) |
| **Attendance** | `/api/v1/attendance` | MEMBER, COACH, GYM_ADMIN | Member check-in/checkout, stats, history |
| **Notifications** | `/api/v1/notifications` | authenticated | In-app notifications with read/unread state |
| **Member** | `/api/v1/member` | MEMBER | Today's workout, upcoming days, reports/suggestions submission |
| **Gym Classes** | `/api/v1/admin/classes` | GYM_ADMIN | Class CRUD (capacity, instructor, date/time); feature-gated by `classBookingEnabled` |
| **Class Bookings** | `/api/v1/member/classes` | MEMBER | Browse upcoming classes, book/cancel |
| **Public Gym** | `/api/v1/public` | public | Public gym lookup by subdomain/slug |
| **Super Admin** | `/api/v1/super` | SUPER_ADMIN | All gyms, feature flag management, platform pricing tiers, contact requests |
| **Super Sales** | `/api/v1/super/leads` | SUPER_ADMIN | Platform-level sales pipeline, lead notes, status updates, followups |
| **Super Leads (Gym Directory)** | `/api/v1/super/leads/gyms` | SUPER_ADMIN | `GET /gyms` (all gyms + member-count breakdown total/active/expired/inactive/pending, owner name, contact email/phone, registration date; `search`/`sort` params) and `GET /gyms/{gymId}/members` (paginated member list w/ subscription status + dates; `page`/`size`/`search`/`status` params). Coexists with Super Sales on the same base path (literal `/gyms` segment) |
| **ZkTeco** | `/api/v1/zkteco` | RECEPTIONIST, GYM_ADMIN | Register biometric devices, member enrollment, ADMS protocol endpoints (`/iclock/cdata`, `/iclock/getrequest`) for hardware sync |

### Entities

**Core**
`User`, `Gym`, `GymFeatures`, `GymLimits`, `GymBranding`, `Role`

**Staff & HR**
`StaffProfile`, `StaffAttendance`, `EmploymentType`

**Members & Subscriptions**
`CoachMember`, `GymMemberPlan`, `MemberSubscriptionPlan`, `MemberPlanDuration`, `SubscriptionPlan`, `SubscriptionHistory`, `RenewalRequest`, `RenewalRequestStatus`

**Workouts**
`WorkoutPlan`, `WorkoutDay`, `ScheduleDay`, `PlanExercise`, `WorkoutLog`,
`WorkoutTemplate`, `WorkoutTemplateDay`, `WorkoutTemplateDayExercise`, `TemplateType`

**Exercises**
`ExerciseTemplate`, `ExerciseCategory`, `ExerciseScope`, `GymExerciseOverride`

**Nutrition V1**
`NutritionPlan`, `Meal`, `MealLog`, `MealType`

**Nutrition V2 / V3**
`NutritionTarget`, `NutritionGoal` (WEIGHT_LOSS, MUSCLE_GAIN, MAINTENANCE, RECOMPOSITION, PERFORMANCE),
`NutritionWorkflow` (COACH_ONLY, NUTRITIONIST_ONLY, COACH_AND_NUTRITIONIST),
`FoodEntry`, `WaterLog`, `ArabicFoodCache`, `ArabicFoodSource`,
`MealSuggestion`, `AiNutritionLog`,
`NutritionCalendarPlan`, `NutritionPlanDay`

**Progress**
`BodyMeasurement`, `Measurement`

**Classes**
`GymClass`, `GymClassStatus`, `ClassBooking`, `ClassBookingStatus`

**Notifications & Alerts**
`Notification`, `NotificationType`

**Attendance**
`Attendance`

**Biometric**
`BiometricDevice`, `BiometricEnrollment`

**Sales & Leads**
`GymLead`, `GymLeadNote`, `GymLeadSource`, `GymLeadStatus`,
`MemberLead`, `MemberLeadStatus`, `MemberLeadType`

**Member Feedback**
`MemberReport`, `MemberSuggestion`, `ReportCategory`, `ReportStatus`

**Coach**
`CoachNote`

**Platform (Super Admin)**
`PlatformTier`, `PlatformPricingPage`, `ContactRequest`

### Security Model

Authorization enforced by `service/AccessGuard`:
- `assertCanAccessMember(callerEmail, memberId)` — passes for member-self, assigned COACH in same gym, same-gym GYM_ADMIN, or any SUPER_ADMIN; throws 403 otherwise
- `assertCoachManagesMember(coachEmail, memberId)` — write-side; coach must be assigned + same gym
- `assertCanManageTarget(email, memberId)` — allows self-training MEMBERs to set own nutrition targets; also passes for COACH, NUTRITIONIST, GYM_ADMIN, SUPER_ADMIN

CORS: `allowCredentials=false`, wildcard origin (Bearer-token auth, no cookies).

### Feature Flags (`GET /api/v1/me/gym-config`)

Per-gym via `gym_features` table:
| Flag | Description |
|------|-------------|
| `nutritionEnabled` | Shows Nutrition tab/page for coaches and members |
| `pushNotificationsEnabled` | Enables notification bell in Navbar |
| `customBrandingEnabled` | Gym logo + primary color applied in mobile app |
| `classBookingEnabled` | Class booking tab for members + admin class management |
| `analyticsAdvancedEnabled` | Advanced analytics charts for GYM_ADMIN |

Limits: `maxMembers` (null = unlimited). Enforced in admin/members UI.

Per-gym nutrition workflow: `gym.nutritionWorkflow` ∈ `{COACH_ONLY, NUTRITIONIST_ONLY, COACH_AND_NUTRITIONIST}`.

Per-user: `user.selfTrainingEnabled` (boolean) — when true for a MEMBER, they can create their own workout plan and set nutrition targets directly.

### Hardening (Phase 7A)

- **Bean Validation**: `spring-boot-starter-validation` on all DTOs; `@Valid` on all `@RequestBody` params
- **Error format**: `{ "error": "...", "messageAr": "...", "fields": { "fieldName": "msg" }, "timestamp": "..." }` — `fields` only present for validation errors
- **GlobalExceptionHandler**: `AppException`, `MethodArgumentNotValidException`, `EntityNotFoundException` (404), `DataIntegrityViolationException` (409), `BadCredentialsException`, `AuthenticationException`, `AccessDeniedException`, `NullPointerException`, generic `Exception`
- **Rate limiting** (`RateLimitFilter` via Bucket4j 8.10.1): login 5 req/min/IP; register-gym 3 req/hr/IP; all others 100 req/min per user or IP
- **Request logging** (`RequestLoggingFilter`): MDC-tagged `[METHOD /path] userId=... duration=...ms status=...`, skips `/actuator/*`

### Seed Data (runs on startup; guards prevent re-seeding)

| Role | Email | Password |
|------|-------|----------|
| GYM_ADMIN | `admin@ironpeak.com` | `password123` |
| COACH | `coach.jordan@ironpeak.com` | `password123` |
| COACH | `coach.morgan@ironpeak.com` | `password123` |
| MEMBER (self-training) | `sam@ironpeak.com` | `password123` |
| MEMBER | `casey@ironpeak.com` | `password123` |
| MEMBER | `riley@ironpeak.com` | `password123` |
| MEMBER (expired) | `drew@ironpeak.com` | `password123` |
| NUTRITIONIST | `nutritionist@ironpeak.com` | `password123` |
| RECEPTIONIST | `reception@ironpeak.com` | `password123` |
| ACCOUNTANT | `accountant@ironpeak.com` | `password123` |
| HR | `hr@ironpeak.com` | `password123` |
| SUPER_ADMIN | `super@qawi.com` | `qawi_super_2024` |

**Also seeded**: 25 Arabic/Middle Eastern foods in `arabic_food_cache`, platform pricing tiers, sales CRM data.

---

## Qawi Web (`artifacts/qawi-web/`)

- **Stack**: React 19 + Vite + TypeScript, TanStack Query, Tailwind CSS, shadcn/ui, Framer Motion
- **i18n**: `use-language` hook with EN/AR locale files; full RTL support via `dir="rtl"` on `<html>`
- **Theme**: Dark glass-morphism (bg `#0A0F1E`, accent green `#22C55E`)
- **Auth**: JWT in `localStorage`, `useAuth` hook, role-based routing in `App.tsx`
- **Feature flags**: `hooks/use-gym-config.ts` — consumed by Sidebar and individual pages

### Pages by Role

**MEMBER**
| Path | Description |
|------|-------------|
| `/member/dashboard` | Today's workout, check-in stats, upcoming sessions |
| `/member/workout` | Full workout plan + schedule days; self-training members can create own plan |
| `/member/nutrition` | Daily food log, water tracker, macro progress rings |

**COACH**
| Path | Description |
|------|-------------|
| `/coach/dashboard` | Member cards with nutrition status dots (green/yellow/red/gray) |
| `/coach/library` | Exercise library; GYM_ADMIN can add gym overrides (custom name + video URL); "Customized" badge |
| `/coach/nutrition` | Assign nutrition targets + calendar plans to members (feature-flagged) |
| `/coach/create-plan` | Build workout plan for a member |
| `/coach/member-detail` | Detailed member view with plan, notes, measurements |
| `/coach/templates` | Reusable workout templates |

**GYM_ADMIN**
| Path | Description |
|------|-------------|
| `/admin/dashboard` | KPI cards, member count vs limit, recent activity |
| `/admin/members` | Member CRUD; enforces `maxMembers` limit; shows X/Y count |
| `/admin/coaches` | Coach management and member assignment |
| `/admin/classes` | Gym class CRUD (feature-gated by `classBookingEnabled`) |
| `/admin/analytics` | Recharts bar charts (monthly revenue, weekly attendance), Print + CSV export |
| `/admin/subscriptions` | Subscription plan management |
| `/admin/reports` | Member feedback and suggestions |
| `/admin/notifications` | Send Notification: broadcast in-app + push to members (all / by membership status / specific member); wired to `POST /api/v1/admin/notifications/send` |
| `/admin/employees` | Staff account management |
| `/admin/revenue` | Revenue breakdown |
| `/admin/sales` | Sales leads pipeline (shared with RECEPTIONIST, SALES) |
| `/admin/pricing` | Pricing tier display |

**RECEPTIONIST** (also GYM_ADMIN)
| Path | Description |
|------|-------------|
| `/reception/dashboard` | Live feed of check-ins, today stats, expiry alerts |

**ACCOUNTANT** (also GYM_ADMIN)
| Path | Description |
|------|-------------|
| `/finance/dashboard` | Revenue KPIs, subscription status breakdown, member finance list, CSV export |

**HR** (also GYM_ADMIN)
| Path | Description |
|------|-------------|
| `/hr/dashboard` | Staff attendance summary, coach performance metrics |

**NUTRITIONIST**
| Path | Description |
|------|-------------|
| `/nutrition/dashboard` | Full AI nutrition management: member list, targets, calendar plans, meal suggestions |

**SUPER_ADMIN**
| Path | Description |
|------|-------------|
| `/super/dashboard` | Platform-wide stats |
| `/super/gyms` | All gyms list |
| `/super/gyms/:id` | Per-gym feature flag toggles + `maxMembers` limit |
| `/super/leads` | Leads: master-detail directory of all gyms with member-count breakdown + owner/contact + quick stats; drill into a gym's members (subscription status pills, dates, search, status filter, pagination, CSV export w/ BOM) |
| `/super/sales` | Platform sales pipeline / analytics |
| `/super/pricing` | Platform pricing tiers management |

### UI Polish (Phase 7B)

- **ErrorBoundary** (`components/ErrorBoundary.tsx`) — wraps every page; bilingual fallback + reload button
- **OfflineBanner** (`components/OfflineBanner.tsx`) — yellow offline / green "back online" bars
- **Responsive sidebar** (`AppShell.tsx`): collapses on mobile; full-viewport overlay backdrop closes on tap
- **Skeleton loaders** on all major pages (animate-pulse Skeleton components)
- **Empty states** — icon + bilingual text + CTA on members, coaches, library, coach dashboard
- **Form validation** — inline red errors on dialogs (name ≥2 chars, valid email, password ≥6, future date)
- **WorkoutDayCard** — expandable card using `<div role="button">` (avoids nested `<button>` HTML error)

---

## Qawi Mobile (`artifacts/qawi-mobile/`)

- **Stack**: Expo SDK 54, React Native, TypeScript, Expo Router, React Query, AsyncStorage
- **Backend**: `https://${EXPO_PUBLIC_DOMAIN}/api/v1` via `services/api.ts`; JWT in AsyncStorage
- **Auth**: `context/AuthContext.tsx` + `useProtectedRoute()` (watches `firstSegment` string, avoids infinite loops)
- **i18n**: `context/LanguageContext.tsx` (EN/AR); `locales/en.json` + `locales/ar.json`
- **Feature flags**: `hooks/useGymConfig.ts` — gates tabs and screens
- **Custom Branding**: `context/BrandingContext.tsx` + `hooks/useColors.ts` — gym `primaryColor` + `logoUrl` applied globally when `customBrandingEnabled=true`
- **401 handler**: `setUnauthorizedHandler(fn)` in `services/api.ts`; on 401 clears storage → `AuthContext` logs out → routes to login

### Tab Groups & Screens

**`(member)`** — Home / Workout / Check-in / Nutrition / Classes / Progress / Profile / Renewal
| Screen | Description |
|--------|-------------|
| `index.tsx` | Home: today's workout preview, check-in button; offline queue with pending sync count |
| `workout.tsx` | Full workout plan view; self-training members can create own plan |
| `nutrition.tsx` | Food log, macro rings, Set Goals modal, History modal |
| `classes.tsx` | Upcoming classes; Book Now / Cancel with confirmation dialogs |
| `progress.tsx` | Body measurements history with charts |
| `renewal.tsx` | Subscription renewal request flow |
| `profile.tsx` | Profile settings, language toggle, logout |

**`(coach)`** — Members / Plans / Library / Nutrition / Profile
| Screen | Description |
|--------|-------------|
| `index.tsx` | Member list → navigate to `app/member/[id].tsx` for full detail |
| `plans.tsx` | Workout plan templates |
| `library.tsx` | Exercise library |
| `nutrition.tsx` | Nutrition management for assigned members (feature-flagged) |

**`(admin)`** — Dashboard / Members / Coaches / Profile

**`(finance)`** — Dashboard / Members / Profile
| Screen | Description |
|--------|-------------|
| `index.tsx` | Revenue KPIs (This Month, Last Month, Total) + subscription status progress bars |
| `members.tsx` | Member finance list: plan, price, expiry, status |

**`(hr)`** — Dashboard / Staff / Profile
| Screen | Description |
|--------|-------------|
| `index.tsx` | Today's attendance stats, coach performance summary |
| `staff.tsx` | Staff directory; mark staff Present manually |

**`(reception)`** — Dashboard / Members / Profile
| Screen | Description |
|--------|-------------|
| `index.tsx` | Live check-in feed, today stats (total in gym, check-ins) |
| `members.tsx` | Member search + manual check-in trigger |

**Shared screens**
- `app/notifications.tsx` — notification feed with read/unread state
- `app/member/[id].tsx` — Coach member detail: workout calendar, day bottom sheet, exercise picker, delete exercise
- `app/(auth)/login.tsx` — Branded login: gym logo / initial glow, "Powered by Qawi" tagline, gradient button

### Phase 7B Polish

- **Offline check-in queue** — `AsyncStorage` key `pendingCheckins`; syncs on reconnect via `NetInfo` listener
- **RefreshControl** — on nutrition, progress, coach members, notifications screens
- **Skeleton loaders** — shimmer placeholders on all loading states
- **Improved empty states** — bilingual sub-text + CTA buttons throughout
- **Coach member workout calendar** (`app/member/[id].tsx`): color-coded days (green = done, blue = has exercises, gray = rest); day detail sheet with exercise list, add/delete exercise, sets × reps × weight

---

## Qawi Marketing (`artifacts/qawi-marketing/`)

Public-facing marketing website for the Qawi SaaS platform. Includes landing page, features, pricing, and contact.

---

## Node.js Workspace

- **Monorepo tool**: pnpm workspaces
- **Node.js**: 24 | **TypeScript**: 5.9
- **API Server** (`artifacts/api-server/`): Express, port 8080, handles Node-side routes
- **Mockup Sandbox** (`artifacts/mockup-sandbox/`): Vite dev server for Canvas UI component previews

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection URL (required by Node services) |
| `PGHOST / PGPORT / PGDATABASE / PGUSER / PGPASSWORD` | Individual PG vars used by Spring Boot |
| `JWT_SECRET` | JWT signing secret (≥32 bytes); falls back to `SESSION_SECRET` |
| `SESSION_SECRET` | Fallback for `JWT_SECRET` in dev |
| `EXPO_PUBLIC_DOMAIN` | Replit domain used by mobile app to reach `/api/v1` |
| `OPENAI_API_KEY` | Used by `NutritionV3Service` for AI food analysis |

---

## User Preferences

- Keep all endpoint paths under `/api/v1/`
- Bilingual (EN/AR) UI on all client-facing text
- Dark glass-morphism theme — never use light backgrounds
- Use `<div role="button">` instead of nesting `<button>` inside another `<button>`
