# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.
Also contains a standalone Java Spring Boot 3 project for the Qawi gym management API,
a React/Vite web dashboard, and an Expo mobile app — all sharing the same backend.

## Qawi Mobile (`artifacts/qawi-mobile/`)
- **Stack**: Expo SDK 54, React Native, TypeScript, Expo Router, React Query, AsyncStorage
- **Backend**: Consumes Spring Boot at `https://${EXPO_PUBLIC_DOMAIN}/api/v1` via custom axios-style fetch in `services/api.ts`. JWT stored in AsyncStorage and sent as Bearer.
- **Auth**: `context/AuthContext.tsx` exposes `login/logout/user`, `useProtectedRoute()` redirects based on role.
- **i18n**: `context/LanguageContext.tsx` (EN/AR) with `locales/en.json` + `locales/ar.json`. Uses `pickName(lang, obj)` to choose `name`/`nameAr`. RTL via `flexDirection: row-reverse` per-screen.
- **Theme (Dark Elite)**: bg `#0A0F1E`, surface `#111827`, card `#1E293B`, accent `#22C55E`. Defined in `constants/colors.ts`, accessed via `useColors()`.
- **Roles & navigation**:
  - `app/(auth)/login.tsx` — login screen, language toggle.
  - `app/(member)/` — 5 tabs: Home / Workout / Check-in / Nutrition / Progress.
  - `app/(coach)/` — 5 tabs: Members / Plans / Notes / Library / Profile.
  - `app/(admin)/` — 4 tabs: Dashboard / Members / Coaches / Profile.
  - SUPER_ADMIN sees an alert directing to web dashboard, stays on login.
  - `app/notifications.tsx` and `app/member/[id].tsx` are shared modal/detail routes.
- **Shared components**: `components/ui.tsx` (Card/Button/Input/Badge/Avatar/EmptyState/Screen), `components/RoleHeader.tsx`, `components/RoleTabBar.tsx`.
- **Workflow**: `artifacts/qawi-mobile: expo` — restart only on dependency changes.
- **Member endpoints** (`/api/v1/member`, role MEMBER, JWT-resolved self):
  - `POST /attendance/checkin`, `POST /attendance/checkout`, `GET /attendance`, `GET /attendance/stats` (streak, thisWeek, totalDays, checkedInToday, checkedOutToday, checkedOutAt)
  - `GET /workouts/today`, `GET /workouts/upcoming` (next 10 future ScheduleDays, excludes today)
  - `GET /nutrition/active` (meals carry `done` flag for today), `POST/DELETE /meals/{mealId}/done` (idempotent via uniq+catch), `GET /meals/done`
  - `GET/POST /measurements`, `GET/POST /photos`
- **MealLog entity** `meal_logs` table — uniq `(member_id, meal_id, log_date)` tracks per-day "done" toggles. Auto-created via `ddl-auto=update`.
- **Attendance.checkedOutAt** column added — populated by `/attendance/checkout` (one per day, requires same-day check-in first).

## Stack

### Node.js Workspace (existing)
- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9

### Qawi Spring Boot API (`qawi-backend/`)
- **Language**: Java 19 (GraalVM 22.3)
- **Framework**: Spring Boot 3.2.5
- **Security**: Spring Security + JWT (JJWT 0.11.5), 7-day expiry, BCrypt
- **ORM**: Spring Data JPA + Hibernate (PostgreSQL)
- **Build**: Maven 3.8.6
- **Port**: 8080 (env: PORT)

## Qawi Package Structure

```
com.qawi
  /config     — SecurityConfig, DataSeeder
  /controller — AuthController
  /service    — AuthService
  /repository — UserRepository, GymRepository, CoachMemberRepository
  /entity     — User, Gym, CoachMember (+ enums: Role, SubscriptionPlan)
  /dto        — RegisterRequest, LoginRequest, AuthResponse, UserDto, ErrorResponse
  /exception  — AppException, GlobalExceptionHandler
  /security   — JwtService, JwtAuthFilter
```

## Entities (ONLY these 3)
- **Gym**: id (UUID), name, ownerId, subscriptionPlan (BASIC/PRO/ENTERPRISE), subscriptionExpiresAt, createdAt
- **User**: id (UUID), name, email, password, role (MEMBER/COACH/GYM_ADMIN), gymId, isActive, subscriptionStartDate, subscriptionEndDate, createdAt
- **CoachMember**: id (UUID), coachId, memberId

## Roles (ONLY these 3)
- MEMBER, COACH, GYM_ADMIN

## Endpoints
- `POST /api/v1/auth/register` — public
- `POST /api/v1/auth/login` — public; blocks expired members; alerts if ≤7 days left
- `GET  /api/v1/auth/me` — protected (JWT)

### Member self endpoints (`/api/v1/member/*`, MEMBER role, JWT-resolved self)
- `POST /attendance/checkin`, `GET /attendance`, `GET /attendance/stats` (streak, thisWeek, totalDays)
- `GET /workouts/today` — latest active plan (max createdAt in [start,end]); 204 if none
- `GET /nutrition/active` — latest plan + meals + totals; 204 if none
- `GET+POST /measurements` — POST sets memberId from JWT; GET aliases `bodyFat`/`takenAt`
- `GET+POST /photos` — POST accepts `imageBase64` or `photoUrl`

## Error format
All errors: `{ error, messageAr, timestamp }`

## Seed Data (runs on startup if DB empty)
- Gym: Iron Peak Gym
- 1 GYM_ADMIN: admin@ironpeak.com
- 2 COACHes: coach.jordan@ironpeak.com, coach.morgan@ironpeak.com
- 4 MEMBERs: sam (30d), casey (5d → alert), riley (30d), drew (expired → blocked)
- Jordan coaches Sam + Casey; Morgan coaches Riley + Drew

## Environment Variables
| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | JDBC PostgreSQL URL (required) |
| `DB_USERNAME` | DB user (default: postgres) |
| `DB_PASSWORD` | DB password (default: postgres) |
| `JWT_SECRET` | JWT signing secret (>=32 bytes; falls back to SESSION_SECRET; startup fails if both empty/short) |
| `SESSION_SECRET` | Fallback for `JWT_SECRET` in dev |
| `PORT` | Server port (default: 8080) |

## Security model
Authorization is enforced by `service/AccessGuard`:
- `assertCanAccessMember(callerEmail, memberId)` — passes for member-self, an assigned COACH in the same gym, a same-gym GYM_ADMIN, or any SUPER_ADMIN; throws 403 otherwise.
- `assertCoachManagesMember(coachEmail, memberId)` — write-side check; coach must be assigned to the member and in the same gym.

Applied across: WorkoutPlan, Nutrition, Measurement, ProgressPhoto, CoachNote (read + write), CoachDashboard.getMemberOverview, GymAdmin subscription endpoints, Notification.markRead (IDOR check).

Other guarantees:
- Self-registration (`POST /auth/register`) always creates `Role.MEMBER` with `gymId=null`. Coach/admin accounts are only created via `/api/v1/admin/*`.
- JWT secret is validated at startup (`>=32 bytes`); CORS uses `allowCredentials=false` (Bearer-token auth, no cookies).
