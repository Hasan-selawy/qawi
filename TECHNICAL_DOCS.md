# Qawi Gym Management Platform — Full Technical Documentation

> **Last updated:** June 2026  
> **Version:** Production-ready (Phase 7B complete + Pricing & Subscription System)

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Monorepo Structure](#2-monorepo-structure)
3. [Technology Stack](#3-technology-stack)
4. [Environment Variables & Secrets](#4-environment-variables--secrets)
5. [Backend — Spring Boot API](#5-backend--spring-boot-api)
   - 5.1 [Package Structure](#51-package-structure)
   - 5.2 [Security & Authentication](#52-security--authentication)
   - 5.3 [Rate Limiting & Request Logging](#53-rate-limiting--request-logging)
   - 5.4 [Error Handling](#54-error-handling)
   - 5.5 [Roles & Access Control](#55-roles--access-control)
   - 5.6 [Database Entities](#56-database-entities)
   - 5.7 [Enums](#57-enums)
   - 5.8 [Repositories](#58-repositories)
   - 5.9 [DTOs — Request Objects](#59-dtos--request-objects)
   - 5.10 [DTOs — Response Objects](#510-dtos--response-objects)
   - 5.11 [REST API Endpoints](#511-rest-api-endpoints)
   - 5.12 [Services](#512-services)
   - 5.13 [Data Seeders](#513-data-seeders)
   - 5.14 [Feature Flags](#514-feature-flags)
   - 5.15 [Security Hardening (code-level pass)](#515-security-hardening-code-level-pass)
6. [Web Frontend — React / Vite](#6-web-frontend--react--vite)
   - 6.1 [Architecture & Routing](#61-architecture--routing)
   - 6.2 [Auth Flow](#62-auth-flow)
   - 6.3 [i18n & RTL](#63-i18n--rtl)
   - 6.4 [Theming](#64-theming)
   - 6.5 [Pages by Role](#65-pages-by-role)
   - 6.6 [Shared Components](#66-shared-components)
7. [Mobile App — Expo / React Native](#7-mobile-app--expo--react-native)
   - 7.1 [Architecture & Routing](#71-architecture--routing)
   - 7.2 [Auth Flow & Token Management](#72-auth-flow--token-management)
   - 7.3 [Offline Support](#73-offline-support)
   - 7.4 [Custom Branding](#74-custom-branding)
   - 7.5 [Screens by Role](#75-screens-by-role)
8. [Pricing & Subscription System](#8-pricing--subscription-system)
9. [AI Nutrition Tracking (v3)](#9-ai-nutrition-tracking-v3)
10. [Reception, Finance & HR Modules](#10-reception-finance--hr-modules)
11. [Class Booking System](#11-class-booking-system)
12. [Workflows & Deployment](#12-workflows--deployment)
13. [Seed Data Reference](#13-seed-data-reference)
14. [Known Constraints & Conventions](#14-known-constraints--conventions)

---

## 1. Project Overview

**Qawi** is a multi-tenant gym management SaaS platform. A single deployment serves every gym that registers on the platform. Each gym gets one `GYM_ADMIN`, unlimited `COACH` users, unlimited `MEMBER` users, and optional staff roles (`ACCOUNTANT`, `HR`, `RECEPTION`).

**Three surfaces:**
| Surface | Technology | Audience |
|---|---|---|
| Spring Boot API | Java 19, Spring Boot 3.2.5 | All clients |
| Web Dashboard | React 19 + Vite + Tailwind | GYM_ADMIN, COACH, SUPER_ADMIN |
| Mobile App | Expo SDK 54, React Native | MEMBER, COACH, GYM_ADMIN |

**Multi-tenancy model:** Every entity that belongs to a gym stores `gymId` as a plain UUID column. There is no JPA relationship annotation — isolation is enforced in the service layer by extracting `gymId` from the authenticated user's record before every query.

---

## 2. Monorepo Structure

```
workspace/
├── qawi-backend/               # Standalone Java Spring Boot 3 project
│   ├── src/main/java/com/qawi/
│   │   ├── config/             # Security, CORS, data seeders
│   │   ├── controller/         # 22 REST controllers
│   │   ├── dto/                # 60+ request/response DTOs
│   │   ├── entity/             # 32 JPA entities
│   │   ├── exception/          # AppException, GlobalExceptionHandler
│   │   ├── filter/             # RateLimitFilter, RequestLoggingFilter
│   │   ├── repository/         # 35 JPA repositories
│   │   ├── security/           # JwtService, JwtAuthFilter
│   │   └── service/            # 22 service classes
│   ├── src/main/resources/
│   │   └── application.properties
│   └── pom.xml
├── artifacts/
│   ├── qawi-web/               # React + Vite web dashboard
│   │   ├── src/
│   │   │   ├── components/     # Shared UI components
│   │   │   ├── hooks/          # Custom React hooks
│   │   │   ├── lib/            # API client, utilities
│   │   │   ├── locales/        # EN + AR translation files
│   │   │   └── pages/          # Role-based page tree
│   │   └── package.json
│   ├── qawi-mobile/            # Expo SDK 54 mobile app
│   │   ├── app/                # expo-router file-based routing
│   │   │   ├── (auth)/         # Login screen
│   │   │   ├── (member)/       # Member tab screens
│   │   │   ├── (coach)/        # Coach tab screens
│   │   │   ├── (admin)/        # Admin tab screens
│   │   │   ├── coach/          # Coach creation flows
│   │   │   ├── member/         # Member detail views
│   │   │   └── notifications.tsx
│   │   ├── context/            # AuthContext, LanguageContext, BrandingContext
│   │   ├── hooks/              # useGymConfig, useColors
│   │   ├── locales/            # en.json, ar.json
│   │   ├── services/           # api.ts (axios client + 401 handler)
│   │   └── package.json
│   ├── api-server/             # Node.js/Express auxiliary server (port 8080)
│   └── mockup-sandbox/         # Vite component preview server (Canvas use only)
├── lib/                        # Shared TypeScript libraries
├── pnpm-workspace.yaml
└── TECHNICAL_DOCS.md           # This file
```

---

## 3. Technology Stack

### Backend
| Concern | Technology |
|---|---|
| Language | Java 19 (GraalVM 22.3) |
| Framework | Spring Boot 3.2.5 |
| ORM | Spring Data JPA + Hibernate |
| Database | PostgreSQL (dialect auto-selected) |
| Security | Spring Security + JWT (JJWT 0.11.5), BCrypt |
| JWT expiry | 7 days |
| Rate limiting | Bucket4j 8.10.1 |
| Validation | `spring-boot-starter-validation` (Bean Validation 3) |
| Health check | `spring-boot-starter-actuator` |
| Build | Maven 3.8.6 |
| Port | 9000 |
| Base path | `/api/v1/` |

### Web Frontend
| Concern | Technology |
|---|---|
| Framework | React 19 + Vite |
| Language | TypeScript |
| Routing | Wouter |
| Server state | TanStack Query v5 |
| UI library | shadcn/ui (Radix UI primitives) |
| Styling | Tailwind CSS v3 |
| Animation | Framer Motion |
| Charts | Recharts |
| i18n | Custom `use-language` hook |
| Port | `$PORT` (Vite dev server) |

### Mobile App
| Concern | Technology |
|---|---|
| Framework | Expo SDK 54 |
| Language | React Native + TypeScript |
| Routing | expo-router (file-based) |
| Server state | TanStack Query |
| Local storage | AsyncStorage |
| Network detection | `@react-native-community/netinfo` |
| HTTP client | Axios (via `services/api.ts`) |
| i18n | Custom LanguageContext (EN/AR) |

---

## 4. Environment Variables & Secrets

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection URL used by Spring Boot |
| `PGHOST` | Yes | PostgreSQL host |
| `PGPORT` | Yes | PostgreSQL port |
| `PGDATABASE` | Yes | PostgreSQL database name |
| `PGUSER` | Yes | PostgreSQL user |
| `PGPASSWORD` | Yes | PostgreSQL password |
| `JWT_SECRET` | Recommended | JWT signing secret (≥ 32 bytes). Falls back to `SESSION_SECRET` |
| `SESSION_SECRET` | Yes | Dev fallback for `JWT_SECRET` |
| `EXPO_PUBLIC_DOMAIN` | Mobile only | Replit domain for API calls from Expo: `https://${EXPO_PUBLIC_DOMAIN}/api/v1` |

All secrets are managed via Replit's secret manager (never stored in code or `.env` files).

---

## 5. Backend — Spring Boot API

### 5.1 Package Structure

```
com.qawi/
├── config/
│   ├── SecurityConfig.java          # Spring Security + CORS config
│   ├── DataSeeder.java              # Phase 1 seed (gym, admin, coaches, members)
│   ├── Phase3DataSeeder.java        # Phase 3 seed (exercise categories + library)
│   ├── Phase4DataSeeder.java        # Phase 4 seed (class booking statuses)
│   ├── PricingDataSeeder.java       # Phase 5 seed (platform tiers + gym member plans)
│   └── V3DataSeeder.java            # Phase 6 seed (nutrition targets, food entries, staff)
├── controller/                      # 22 REST controllers (see §5.11)
├── dto/                             # 60+ request + response DTOs (see §5.9, §5.10)
├── entity/                          # 32 JPA entities (see §5.6)
├── exception/
│   ├── AppException.java            # Business exception with EN + AR messages
│   └── GlobalExceptionHandler.java  # @ControllerAdvice — 9 exception types handled
├── filter/
│   ├── RateLimitFilter.java         # Bucket4j rate limiting (see §5.3)
│   └── RequestLoggingFilter.java    # MDC-tagged structured logging
├── repository/                      # 35 JPA interfaces (see §5.8)
├── security/
│   ├── JwtService.java              # Token generation + validation
│   └── JwtAuthFilter.java           # Per-request JWT extraction + auth
└── service/                         # 22 service classes (see §5.12)
```

### 5.2 Security & Authentication

**Authentication:** JWT Bearer tokens. Tokens are included in the `Authorization: Bearer <token>` header on every protected request.

**Token lifecycle:**
- Generated on `/api/v1/auth/login` and `/api/v1/auth/register-gym`
- 7-day expiry (configured in `JwtService`)
- Signed with `JWT_SECRET` (falls back to `SESSION_SECRET`)
- BCrypt used for password hashing

**CORS:** `allowCredentials=false`, wildcard origin — Bearer-token auth means no cookies are needed.

**Public endpoints (no auth required):**
```
POST /api/v1/auth/login
POST /api/v1/auth/register
POST /api/v1/public/register-gym
GET  /api/v1/public/plans
POST /api/v1/public/check-email
POST /api/v1/public/contact
GET  /api/v1/public/platform-tiers
GET  /api/v1/public/platform-page
GET  /api/v1/public/gym/{gymId}/member-plans
GET  /actuator/health
GET  /actuator/info
```

**AccessGuard service** (`service/AccessGuard.java`) enforces cross-role access rules:
- `assertCanAccessMember(callerEmail, memberId)` — passes for: member-self, assigned COACH in same gym, same-gym GYM_ADMIN, any SUPER_ADMIN. Throws 403 otherwise.
- `assertCoachManagesMember(coachEmail, memberId)` — write-side guard; coach must be assigned to the member and in the same gym.

### 5.3 Rate Limiting & Request Logging

**Rate limits** (`RateLimitFilter.java` via Bucket4j 8.10.1):
| Endpoint pattern | Limit | Window | Key |
|---|---|---|---|
| `POST /api/v1/auth/login` | 5 requests | per minute | per IP |
| `POST /api/v1/public/register-gym` | 3 requests | per hour | per IP |
| All others | 100 requests | per minute | per authenticated user or IP |

**Request logging** (`RequestLoggingFilter.java`):
- MDC-tagged structured log: `[METHOD /path] userId=... duration=...ms status=...`
- `requestId` (random hex) injected into every log line via MDC
- Skips `/actuator/*` paths

### 5.4 Error Handling

`GlobalExceptionHandler` (`@ControllerAdvice`) handles 9 exception types and returns a unified `ErrorResponse`:

```json
{
  "error": "Human-readable English message",
  "messageAr": "رسالة خطأ بالعربية",
  "fields": { "fieldName": "validation message" },
  "timestamp": "2026-06-08T14:00:00"
}
```

`fields` is `null` for all exception types except `MethodArgumentNotValidException` (Bean Validation failure), where it maps each invalid field to its message so clients can highlight individual form fields.

**Handled exception types:**
1. `AppException` — custom business exceptions
2. `MethodArgumentNotValidException` — Bean Validation failures (returns `fields` map)
3. `EntityNotFoundException` — 404
4. `DataIntegrityViolationException` — 409 with duplicate detection
5. `BadCredentialsException` — 401
6. `AuthenticationException` — 401
7. `AccessDeniedException` — 403
8. `NullPointerException` — 500
9. Generic `Exception` — 500

### 5.5 Roles & Access Control

| Role | Description |
|---|---|
| `MEMBER` | Gym member — mobile app only |
| `COACH` | Gym coach — web dashboard + mobile app |
| `GYM_ADMIN` | Gym owner/admin — web dashboard + mobile app |
| `ACCOUNTANT` | Finance access — web dashboard |
| `HR` | HR & staff access — web dashboard |
| `RECEPTION` | Front-desk access — web dashboard |
| `SUPER_ADMIN` | Platform owner — web dashboard only |

All role checks use Spring Security's `@PreAuthorize("hasRole('...')")` annotations at the controller level. Business-layer access is further enforced by `AccessGuard`.

### 5.6 Database Entities

All entities use `@GeneratedValue(strategy = GenerationType.UUID)` for primary keys. Timestamps use `LocalDateTime.now()` as `@Builder.Default`.

#### Core Entities

**User** (`users`)
| Field | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `name` | String | |
| `email` | String | Unique |
| `password` | String | BCrypt hashed |
| `role` | Role (enum) | MEMBER / COACH / GYM_ADMIN / etc. |
| `gymId` | UUID | FK → Gym (logical) |
| `isActive` | boolean | Soft delete flag |
| `phone` | String | Optional |
| `subscriptionStartDate` | LocalDate | Members only |
| `subscriptionEndDate` | LocalDate | Members only |
| `createdAt` | LocalDateTime | |

**Gym** (`gyms`)
| Field | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `name` | String | |
| `ownerId` | UUID | FK → User (admin) |
| `subscriptionPlan` | SubscriptionPlan (enum) | BASIC / PRO / ENTERPRISE |
| `subscriptionExpiresAt` | LocalDateTime | Platform subscription |
| `createdAt` | LocalDateTime | |
| `nutritionEnabled` | boolean | Feature flag |
| `pushNotificationsEnabled` | boolean | Feature flag |
| `customBrandingEnabled` | boolean | Feature flag |
| `classBookingEnabled` | boolean | Feature flag |
| `analyticsAdvancedEnabled` | boolean | Feature flag |
| `maxMembers` | Integer | null = unlimited |
| `logoUrl` | String | Custom branding |
| `primaryColor` | String | Custom branding (hex) |

**WorkoutPlan** (`workout_plans`)
| Field | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `name` | String | |
| `coachId` | UUID | Creator |
| `memberId` | UUID | Assigned member |
| `startDate` | LocalDate | |
| `endDate` | LocalDate | |
| `createdAt` | LocalDateTime | |

**ScheduleDay** (`schedule_days`)
| Field | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `workoutPlanId` | UUID | Parent plan |
| `dayDate` | LocalDate | Specific calendar date |
| `dayName` | String | EN label |
| `dayNameAr` | String | AR label |
| `isRestDay` | boolean | |
| `isCompleted` | boolean | |
| `completedAt` | LocalDateTime | |

**PlanExercise** (`plan_exercises`)
| Field | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `scheduleDayId` | UUID | Parent day |
| `exerciseTemplateId` | UUID | From library |
| `customName` | String | Optional override |
| `customNameAr` | String | Optional override |
| `sets` | int | |
| `reps` | int | |
| `targetWeight` | double | kg |
| `videoUrl` | String | |
| `orderIndex` | int | Sort order |

**ExerciseTemplate** (`exercise_templates`)
| Field | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `categoryId` | UUID | FK → ExerciseCategory |
| `name` | String | |
| `nameAr` | String | |
| `defaultSets` | int | |
| `defaultReps` | int | |
| `defaultWeight` | double | |
| `videoUrl` | String | |
| `isCustom` | boolean | false = global library |
| `createdByCoachId` | UUID | If custom |
| `scope` | ExerciseScope (enum) | GLOBAL / GYM / PERSONAL |
| `gymId` | UUID | If GYM scope |

**ExerciseCategory** (`exercise_categories`)
| Field | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `name` | String | e.g. "Chest" |
| `nameAr` | String | |
| `iconUrl` | String | |

**GymExerciseOverride** (`gym_exercise_overrides`)
| Field | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `gymId` | UUID | |
| `exerciseTemplateId` | UUID | |
| `name` | String | Custom gym name |
| `nameAr` | String | |
| `videoUrl` | String | |
| `createdAt` | LocalDateTime | |
| `updatedAt` | LocalDateTime | |

#### Nutrition Entities

**NutritionPlan** (`nutrition_plans`)
| Field | Type | |
|---|---|---|
| `id` | UUID | PK |
| `memberId` | UUID | |
| `coachId` | UUID | |
| `createdAt` | LocalDateTime | |

**Meal** (`meals`)
| Field | Type | |
|---|---|---|
| `id` | UUID | PK |
| `nutritionPlanId` | UUID | |
| `mealType` | MealType (enum) | BREAKFAST / LUNCH / DINNER / SNACK |
| `description` | String | EN |
| `descriptionAr` | String | AR |
| `calories` | Integer | |
| `protein` | Integer | grams |
| `orderIndex` | int | |

**MealLog** (`meal_logs`) — tracks when a member marks a meal as done
| Field | Type | |
|---|---|---|
| `id` | UUID | PK |
| `memberId` | UUID | |
| `mealId` | UUID | |
| `logDate` | LocalDate | |
| `loggedAt` | LocalDateTime | |

**NutritionTarget** (`nutrition_targets`) — macro targets set by coach
| Field | Type | |
|---|---|---|
| `id` | UUID | PK |
| `memberId` | UUID | |
| `coachId` | UUID | |
| `calories` | int | |
| `proteinG` | int | |
| `carbsG` | int | |
| `fatG` | int | |
| `waterMl` | int | |
| `goal` | NutritionGoal (enum) | LOSE_WEIGHT / MAINTAIN / GAIN_MUSCLE |
| `createdAt` / `updatedAt` | LocalDateTime | |

**FoodEntry** (`food_entries`) — AI-parsed food log entries
| Field | Type | |
|---|---|---|
| `id` | UUID | PK |
| `memberId` | UUID | |
| `foodName` | String | EN |
| `foodNameAr` | String | AR |
| `quantity` | Double | |
| `unit` | String | serving, g, ml… |
| `calories` | Double | |
| `proteinG` / `carbsG` / `fatG` / `fiberG` / `sugarG` | Double | macros |
| `confidence` | Double | 0–1 AI confidence score |
| `source` | String | ai / manual |
| `mealType` | String | BREAKFAST / LUNCH / etc. |
| `rawInput` | String | Original user text |
| `loggedAt` | LocalDateTime | |

**WaterLog** (`water_logs`)
| Field | Type | |
|---|---|---|
| `id` | UUID | PK |
| `memberId` | UUID | |
| `amountMl` | int | |
| `loggedAt` | LocalDateTime | |

#### Attendance & Measurement

**Attendance** (`attendances`)
| Field | Type | |
|---|---|---|
| `id` | UUID | PK |
| `memberId` | UUID | |
| `gymId` | UUID | |
| `checkedInAt` | LocalDateTime | |
| `checkedOutAt` | LocalDateTime | null until checked out |

**BodyMeasurement** (`body_measurements`)
| Field | Type | |
|---|---|---|
| `id` | UUID | PK |
| `memberId` | UUID | |
| `recordedBy` | UUID | Coach/admin who recorded |
| `weight` | Double | kg |
| `height` | Double | cm |
| `chest` / `waist` / `hips` / `arms` / `legs` | Double | cm |
| `bodyFatPercentage` | Double | |
| `notes` | String | |
| `recordedAt` | LocalDateTime | |

#### Class Booking

**GymClass** (`gym_classes`)
| Field | Type | |
|---|---|---|
| `id` | UUID | PK |
| `gymId` | UUID | |
| `name` | String | e.g. "Morning Yoga" |
| `instructorName` | String | |
| `dateTime` | LocalDateTime | |
| `durationMinutes` | int | |
| `maxCapacity` | int | |
| `description` | String | |
| `status` | GymClassStatus (enum) | SCHEDULED / CANCELLED / COMPLETED |
| `createdAt` | LocalDateTime | |

**ClassBooking** (`class_bookings`)
| Field | Type | |
|---|---|---|
| `id` | UUID | PK |
| `classId` | UUID | |
| `memberId` | UUID | |
| `bookedAt` | LocalDateTime | |
| `status` | ClassBookingStatus (enum) | BOOKED / CANCELLED |

#### Notifications & Social

**Notification** (`notifications`)
| Field | Type | |
|---|---|---|
| `id` | UUID | PK |
| `userId` | UUID | Recipient |
| `type` | NotificationType (enum) | |
| `message` | String | EN |
| `messageAr` | String | AR |
| `isRead` | boolean | |
| `createdAt` | LocalDateTime | |

**CoachNote** (`coach_notes`) — private coach notes on members
| Field | Type | |
|---|---|---|
| `id` | UUID | PK |
| `coachId` | UUID | |
| `memberId` | UUID | |
| `note` | TEXT | |
| `createdAt` / `updatedAt` | LocalDateTime | |

**CoachMember** (`coach_members`) — assignment mapping
| Field | Type | |
|---|---|---|
| `id` | UUID | PK |
| `coachId` | UUID | |
| `memberId` | UUID | |

**MemberReport** (`member_reports`) — member feedback/complaints
| Field | Type | |
|---|---|---|
| `id` | UUID | PK |
| `memberId` | UUID | |
| `gymId` | UUID | |
| `category` | ReportCategory (enum) | EQUIPMENT / CLEANLINESS / etc. |
| `description` | String | |
| `status` | ReportStatus (enum) | OPEN / RESOLVED |
| `createdAt` | LocalDateTime | |

**MemberSuggestion** (`member_suggestions`)
| Field | Type | |
|---|---|---|
| `id` | UUID | PK |
| `memberId` | UUID | |
| `gymId` | UUID | |
| `text` | String | |
| `createdAt` | LocalDateTime | |

#### Subscriptions & Pricing

**PlatformTier** (`platform_tiers`) — Qawi platform subscription tiers
| Field | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `name` / `nameAr` | String | EN + AR tier name |
| `price1m` / `price3m` / `price6m` / `price12m` | int | USD prices |
| `features` | String | JSON array (serialized) |
| `featuresAr` | String | JSON array (serialized) |
| `active` | boolean | |
| `highlighted` | boolean | Shows "Most Popular" badge |
| `displayOrder` | int | Sort order on pricing page |
| `maxMembers` / `maxCoaches` | Integer | null = unlimited |
| `subscriptionPlan` | SubscriptionPlan (enum) | |

**PlatformPricingPage** (`platform_pricing_page`) — editable landing page text
| Field | Type | |
|---|---|---|
| `id` | UUID | PK |
| `title` / `titleAr` | String | Page headline |
| `subtitle` / `subtitleAr` | String | Page subheadline |
| `footerText` / `footerTextAr` | String | Footer note |

**GymMemberPlan** (`gym_member_plans`) — subscription plans offered by a gym to its members
| Field | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `gymId` | UUID | |
| `name` / `nameAr` | String | |
| `duration` | MemberPlanDuration (enum) | ONE_MONTH / THREE_MONTHS / SIX_MONTHS / TWELVE_MONTHS |
| `price` | BigDecimal | |
| `description` / `descriptionAr` | String | |
| `active` | boolean | |
| `createdAt` | LocalDateTime | |

**RenewalRequest** (`renewal_requests`) — member requests to renew their subscription
| Field | Type | |
|---|---|---|
| `id` | UUID | PK |
| `memberId` / `memberName` | UUID / String | |
| `gymId` | UUID | |
| `planId` | UUID | The requested plan |
| `planName` / `planNameAr` | String | |
| `planDuration` | String | |
| `status` | RenewalRequestStatus (enum) | PENDING / APPROVED / REJECTED |
| `notes` | String | Member's notes |
| `createdAt` | LocalDateTime | |

**SubscriptionHistory** (`subscription_histories`)
| Field | Type | |
|---|---|---|
| `id` | UUID | PK |
| `memberId` | UUID | |
| `managedByAdminId` | UUID | |
| `startDate` / `endDate` | LocalDate | |
| `plan` | MemberSubscriptionPlan (enum) | |
| `price` | BigDecimal | |
| `createdAt` | LocalDateTime | |

**ContactRequest** (`contact_requests`) — leads/enquiries from the public register page
| Field | Type | |
|---|---|---|
| `id` | UUID | PK |
| `fullName` / `phoneNumber` / `gymName` / `city` / `message` | String | |
| `createdAt` | LocalDateTime | |
| `isContacted` | boolean | |

#### Workout Templates

**WorkoutTemplate** (`workout_templates`)
| Field | Type | |
|---|---|---|
| `id` | UUID | PK |
| `coachId` | UUID | |
| `name` / `nameAr` | String | |
| `description` | String | |
| `createdAt` | LocalDateTime | |

**WorkoutTemplateDay** (`workout_template_days`)
| Field | Type | |
|---|---|---|
| `id` | UUID | PK |
| `templateId` | UUID | |
| `dayNumber` | int | |
| `dayName` / `dayNameAr` | String | |
| `isRestDay` | boolean | |

**WorkoutTemplateDayExercise** (`workout_template_day_exercises`)
| Field | Type | |
|---|---|---|
| `id` | UUID | PK |
| `templateDayId` | UUID | |
| `exerciseTemplateId` | UUID | |
| `customName` / `customNameAr` | String | |
| `sets` / `reps` | int | |
| `targetWeight` | double | |
| `videoUrl` | String | |
| `orderIndex` | int | |

**WorkoutLog** (`workout_logs`) — member's actual performance per exercise
| Field | Type | |
|---|---|---|
| `id` | UUID | PK |
| `memberId` | UUID | |
| `planExerciseId` | UUID | |
| `actualSets` / `actualReps` | int | |
| `actualWeight` | double | |
| `notes` | String | |
| `loggedAt` | LocalDateTime | |

#### HR & Reception

**StaffProfile** (`staff_profiles`) — extended info for gym staff (coaches, HR, reception, accountants)
| Field | Type | |
|---|---|---|
| `id` | UUID | PK |
| `gymId` | UUID | |
| `userId` | UUID | |
| `jobTitle` | String | |
| `startDate` | LocalDate | |
| `salary` | BigDecimal | |
| `employmentType` | EmploymentType (enum) | FULL_TIME / PART_TIME / CONTRACT |
| `emergencyContact` | String | |
| `notes` | String | |
| `active` | boolean | |
| `createdAt` | LocalDateTime | |

**StaffAttendance** (`staff_attendances`) — HR staff clock-in records
| Field | Type | |
|---|---|---|
| `id` | UUID | PK |
| `staffId` | UUID | |
| `date` | LocalDate | |
| `checkIn` / `checkOut` | LocalDateTime | |
| `status` | String | PRESENT / ABSENT / LATE |
| `notes` | String | |
| `createdAt` | LocalDateTime | |

### 5.7 Enums

| Enum | Values |
|---|---|
| `Role` | MEMBER, COACH, GYM_ADMIN, ACCOUNTANT, HR, RECEPTION, SUPER_ADMIN |
| `SubscriptionPlan` | BASIC, PRO, ENTERPRISE |
| `MemberSubscriptionPlan` | MONTHLY, QUARTERLY, SEMI_ANNUAL, ANNUAL |
| `MemberPlanDuration` | ONE_MONTH, THREE_MONTHS, SIX_MONTHS, TWELVE_MONTHS |
| `RenewalRequestStatus` | PENDING, APPROVED, REJECTED |
| `ExerciseScope` | GLOBAL, GYM, PERSONAL |
| `MealType` | BREAKFAST, LUNCH, DINNER, SNACK |
| `NutritionGoal` | LOSE_WEIGHT, MAINTAIN, GAIN_MUSCLE |
| `GymClassStatus` | SCHEDULED, CANCELLED, COMPLETED |
| `ClassBookingStatus` | BOOKED, CANCELLED |
| `ReportCategory` | EQUIPMENT, CLEANLINESS, COACH, OTHER |
| `ReportStatus` | OPEN, RESOLVED |
| `EmploymentType` | FULL_TIME, PART_TIME, CONTRACT |
| `NotificationType` | SUBSCRIPTION_ALERT, WORKOUT_REMINDER, GENERAL |

### 5.8 Repositories

All 35 repositories extend `JpaRepository<Entity, UUID>` and are located in `com.qawi.repository`.

| Repository | Notable custom queries |
|---|---|
| `UserRepository` | `findByEmail`, `findByGymId`, `findByGymIdAndRole` |
| `GymRepository` | Standard CRUD |
| `WorkoutPlanRepository` | `findByMemberId`, `findByCoachId` |
| `ScheduleDayRepository` | `findByWorkoutPlanIdOrderByDayDate` |
| `PlanExerciseRepository` | `findByScheduleDayId` |
| `ExerciseTemplateRepository` | `findByCategoryId`, `findByScope`, `findByGymId` |
| `ExerciseCategoryRepository` | Standard CRUD |
| `GymExerciseOverrideRepository` | `findByGymId`, `findByGymIdAndExerciseTemplateId`, `deleteByGymIdAndExerciseTemplateId` |
| `NutritionPlanRepository` | `findByMemberId` |
| `MealRepository` | `findByNutritionPlanId` |
| `MealLogRepository` | `findByMemberIdAndLogDate` |
| `NutritionTargetRepository` | `findByMemberId` |
| `FoodEntryRepository` | `findByMemberIdAndDateRange` |
| `WaterLogRepository` | `findByMemberIdAndDate` |
| `AttendanceRepository` | `findByMemberIdOrderByCheckedInAtDesc`, `findByGymId` |
| `BodyMeasurementRepository` | `findByMemberIdOrderByRecordedAtDesc` |
| `CoachMemberRepository` | `findByCoachId`, `findByMemberId` |
| `CoachNoteRepository` | `findByCoachIdAndMemberId` |
| `WorkoutLogRepository` | `findByMemberIdAndPlanExerciseId` |
| `WorkoutTemplateRepository` | `findByCoachId` |
| `WorkoutTemplateDayRepository` | `findByTemplateId` |
| `WorkoutTemplateDayExerciseRepository` | `findByTemplateDayId` |
| `NotificationRepository` | `findByUserIdOrderByCreatedAtDesc` |
| `GymClassRepository` | `findByGymIdOrderByDateTimeAsc` |
| `ClassBookingRepository` | `findByClassIdAndStatus`, `findByMemberIdAndStatus` |
| `GymMemberPlanRepository` | `findByGymIdOrderByDurationAscCreatedAtAsc`, `findByGymIdAndActiveTrueOrderByDurationAscCreatedAtAsc`, `countByGymId` |
| `PlatformTierRepository` | `findByActiveTrueOrderByDisplayOrderAsc`, `findAllByOrderByDisplayOrderAsc` |
| `PlatformPricingPageRepository` | `findAll` (uses first record) |
| `RenewalRequestRepository` | `findByGymIdOrderByCreatedAtDesc`, `findByMemberIdOrderByCreatedAtDesc` |
| `SubscriptionHistoryRepository` | `findByMemberId` |
| `ContactRequestRepository` | `findAllByOrderByCreatedAtDesc` |
| `MemberReportRepository` | `findByGymId`, `findByMemberId` |
| `MemberSuggestionRepository` | `findByGymId` |
| `StaffProfileRepository` | `findByGymId`, `findByUserId` |
| `StaffAttendanceRepository` | `findByStaffIdAndDate`, `findByGymIdAndDate` |

### 5.9 DTOs — Request Objects

**Auth & User:**
- `LoginRequest` — `email`, `password`
- `RegisterRequest` — `name`, `email`, `password`
- `ChangePasswordRequest` — `currentPassword`, `newPassword`
- `CheckEmailRequest` — `email`
- `CreateGymUserRequest` — `name`, `email`, `password`, `subscriptionEndDate` (LocalDate)
- `CreateGymRequest` — `gymName`, `adminName`, `adminEmail`, `adminPassword`, `subscriptionPlan`, `subscriptionExpiresAt`
- `RegisterGymRequest` — `gymName`, `adminName`, `adminEmail`, `adminPassword`, `subscriptionPlan`
- `AssignCoachRequest` — `coachId`
- `MemberSubscriptionRequest` — `startDate`, `endDate`, `plan` (MemberSubscriptionPlan), `price`
- `UpdateSubscriptionRequest` — `subscriptionPlan`, `subscriptionExpiresAt`
- `GymFeaturesRequest` — all 5 feature flag booleans
- `GymLimitsRequest` — `maxMembers` (Integer)
- `GymBrandingRequest` — `logoUrl`, `primaryColor`

**Workout & Exercise:**
- `CreateWorkoutPlanRequest` — `name`, `memberId`, `startDate`, `endDate`
- `CreateFromTemplateRequest` — `templateId`, `memberId`, `startDate`
- `AddScheduleDayRequest` — `dayDate`, `dayName`, `dayNameAr`, `isRestDay`
- `AddPlanExerciseRequest` — `exerciseTemplateId`, `customName`, `customNameAr`, `sets`, `reps`, `targetWeight`, `videoUrl`, `orderIndex` (all validated with `@Valid`)
- `LogWorkoutRequest` — `planExerciseId`, `actualSets`, `actualReps`, `actualWeight`, `notes`
- `AddExerciseRequest` — `categoryId`, `name`, `nameAr`, `defaultSets`, `defaultReps`, `defaultWeight`, `videoUrl`
- `CreateTemplateRequest` — `name`, `nameAr`, `description`, `List<TemplateDayRequest>`
  - `TemplateDayRequest` — `dayNumber`, `dayName`, `dayNameAr`, `isRestDay`, `List<TemplateDayExerciseRequest>`

**Nutrition:**
- `CreateNutritionPlanRequest` — `memberId`
- `CreateMealRequest` — `mealType`, `description`, `descriptionAr`, `calories`, `protein`
- `NutritionTargetRequest` — `memberId`, `calories`, `proteinG`, `carbsG`, `fatG`, `waterMl`, `goal`
- `FoodEntryRequest` — all macro fields + `rawInput`, `mealType`, `source`
- `FoodAnalysisRequest` — `input` (free-text food description for AI parsing)
- `WaterLogRequest` — `memberId`, `amountMl`

**Attendance & Measurement:**
- `CreateMeasurementRequest` — `memberId`, `weight`, `height`, `chest`, `waist`, `hips`, `arms`, `legs`, `bodyFatPercentage`, `notes`

**Pricing & Subscriptions:**
- `PlatformTierRequest` — `name`, `nameAr`, all 4 prices, `features` (List<String>), `featuresAr`, `active`, `highlighted`, `displayOrder`, `maxMembers`, `maxCoaches`, `subscriptionPlan`
- `GymMemberPlanRequest` — `name`, `nameAr`, `duration`, `price`, `description`, `descriptionAr`, `active`
- `SubmitRenewalRequest` — `planId`, `planName`, `planNameAr`, `planDuration`, `notes`
- `RenewSubscriptionRequest` — `planId`, `durationMonths`

**Reception & HR:**
- `CreateWalkInMemberRequest` — `name`, `email`, `phone`, `coachId`, `planId`, `subscriptionEndDate`, `notes`
- `StaffProfileRequest` — `jobTitle`, `startDate`, `salary`, `employmentType`, `emergencyContact`, `notes`
- `StaffAttendanceRequest` — `date`, `checkIn`, `checkOut`, `status`, `notes`

**Misc:**
- `ContactRequestCreate` — `fullName`, `phoneNumber`, `gymName`, `city`, `message`
- `CreateCoachNoteRequest` — `memberId`, `note`
- `UpdateCoachNoteRequest` — `note`

### 5.10 DTOs — Response Objects

| DTO | Key Fields |
|---|---|
| `AuthResponse` | `token`, `user` (UserDto), `subscriptionAlert`, `subscriptionAlertAr` |
| `UserDto` | `id`, `name`, `email`, `role`, `gymId`, `isActive`, `subscriptionStartDate`, `subscriptionEndDate`, `createdAt` |
| `RegisterGymResponse` | `token`, `user`, `gym` (GymDetailResponse), `trialExpiresAt`, `message`, `messageAr` |
| `GymDetailResponse` | All gym fields + `adminId`, `adminEmail`, `totalMembers`, `totalCoaches`, `subscriptionStatus`, all feature flags, limits, branding |
| `AdminAnalyticsResponse` | `totalMembers`, `activeMembers`, `totalCoaches`, `expiringThisWeek`, `avgWorkoutsPerMember`, `attendanceThisWeek`, `topPerformingMembers`, `revenueThisMonth`, `memberGrowth`, `monthlyRevenue`, `weeklyAttendanceByDay` |
| `PlatformTierDto` | All tier fields + computed `save6mPercent`, `save12mPercent` |
| `PlatformPageDto` | `title`, `titleAr`, `subtitle`, `subtitleAr`, `footerText`, `footerTextAr` |
| `GymMemberPlanDto` | Plan fields + computed `durationLabel` (EN) + `durationLabelAr` (AR) |
| `RenewalRequestDto` | All renewal request fields |
| `PlatformStatsResponse` | `totalGyms`, `totalMembers`, `totalCoaches`, `activeGyms`, `expiringGyms` |
| `CoachMemberSummary` | `id`, `name`, `email`, `lastCheckinDate`, `currentWorkoutPlanName`, `workoutsCompletedThisWeek`, `subscriptionStatus`, `isActive`, `nutritionStatus` (green/yellow/red/gray) |
| `CheckInResponse` | `attendance`, `streak`, `notification` |
| `StreakResponse` | `streak`, `lastCheckIn` |
| `ReceptionMemberResult` | `id`, `name`, `email`, `phone`, `coachName`, `subscriptionStatus`, `subscriptionEndDate`, `lastCheckin`, `attendanceStreak`, `active` |
| `ReceptionTodayStats` | `checkedInToday`, `expectedToday`, `expiringThisWeek`, `totalCheckins`, `newMembersThisWeek` |
| `ErrorResponse` | `error`, `messageAr`, `fields` (Map, null if not validation), `timestamp` |
| `ExerciseUsageResponse` | Per-member usage of an exercise across plans |
| `ContactRequestDto` | Lead/contact data + `contacted` flag |
| `PlanInfo` | Platform plans for legacy `/public/plans` endpoint |

### 5.11 REST API Endpoints

#### `/api/v1/auth` — Authentication (Public)
| Method | Path | Description |
|---|---|---|
| POST | `/login` | Authenticate → JWT + refresh token + UserDto + subscription alert |
| POST | `/register` | Register new user |
| POST | `/refresh` | Rotate refresh token → new JWT + new refresh token |
| POST | `/logout` | Revoke the presented refresh token |
| GET | `/me` | Current user's DTO |
| POST | `/change-password` | Change own password |

#### `/api/v1/me` — Self Configuration
| Method | Path | Description |
|---|---|---|
| GET | `/gym-config` | Feature flags + branding for caller's gym |

#### `/api/v1/public` — No Auth Required
| Method | Path | Description |
|---|---|---|
| POST | `/register-gym` | New gym self-registration |
| GET | `/plans` | Legacy platform plan list |
| POST | `/check-email` | Email availability check |
| POST | `/contact` | Submit a contact/lead |
| GET | `/platform-tiers` | Active pricing tiers for registration page |
| GET | `/platform-page` | Landing page text (title/subtitle/footer) |
| GET | `/gym/{gymId}/member-plans` | Active gym member plans (for mobile renewal screen) |

#### `/api/v1/admin` — GYM_ADMIN Only
| Method | Path | Description |
|---|---|---|
| GET/POST | `/coaches` | List / create coach |
| GET | `/coaches/{coachId}/members` | Members assigned to a coach |
| GET/POST | `/members` | List / create member |
| PUT | `/members/{memberId}/assign` | Assign coach to member |
| DELETE | `/users/{userId}` | Soft-delete user |
| PUT | `/members/{memberId}/subscription` | Update member subscription |
| GET | `/members/{memberId}/subscription-history` | Subscription history |
| GET | `/expiring-subscriptions` | Members expiring in 7 days |
| GET | `/analytics` | Dashboard analytics summary |
| GET | `/revenue-report` | Revenue report (requires `analyticsAdvancedEnabled`) |
| GET | `/reports` | Member reports/complaints |
| PUT | `/reports/{reportId}/resolve` | Resolve a report |
| PUT | `/users/{userId}/reset-password` | Force-reset any user's password |
| GET/PUT/DELETE | `/exercises/overrides` | Gym-level exercise name/video overrides |
| PUT | `/exercises/{exerciseId}/override` | Upsert an exercise override |
| GET/POST | `/member-plans` | List / create gym subscription plans |
| PUT/DELETE | `/member-plans/{planId}` | Update / deactivate plan |
| GET | `/renewal-requests` | Pending member renewal requests |
| PUT | `/renewal-requests/{requestId}/status` | Approve or reject renewal |

#### `/api/v1/admin/classes` — GYM_ADMIN, Class Booking
| Method | Path | Description |
|---|---|---|
| GET | `/` | List all classes |
| POST | `/` | Create class |
| PUT | `/{id}` | Update class |
| DELETE | `/{id}` | Cancel class |
| GET | `/{id}/bookings` | All bookings for a class |

#### `/api/v1/coach` — COACH
| Method | Path | Description |
|---|---|---|
| GET | `/members` | Assigned members with nutrition status |
| GET | `/members/{memberId}/overview` | Full member progress overview |

#### `/api/v1/member` — MEMBER
| Method | Path | Description |
|---|---|---|
| GET | `/workouts/today` | Today's workout (with auto-shift logic) |
| GET | `/workouts/history` | Full workout history |
| GET | `/workouts/exercise/{templateId}/history` | Per-exercise history |
| GET | `/workouts/upcoming` | Next 10 scheduled days |
| POST/DELETE | `/meals/{mealId}/done` | Log / unlog meal |
| GET | `/meals/done` | Today's logged meal IDs |
| GET | `/nutrition/active` | Active nutrition plan + meals |
| GET/POST | `/measurements` | Body measurements |
| GET | `/profile` | Profile summary |
| POST | `/renewal-request` | Submit renewal request |
| GET | `/renewal-requests` | Own renewal history |
| GET | `/classes` | Upcoming bookable classes |
| GET | `/classes/my-bookings` | Own bookings |
| POST | `/classes/{classId}/book` | Book a class |
| DELETE | `/classes/{classId}/book` | Cancel booking |
| POST | `/reports` | Submit a report |
| POST | `/suggestions` | Submit a suggestion |

#### `/api/v1/workouts` — Workout Plans
| Method | Path | Auth |
|---|---|---|
| POST | `/` | COACH — Create plan |
| POST | `/from-template` | COACH — Create from template |
| GET | `/member/{memberId}` | Auth — List member's plans |
| GET | `/{planId}` | Auth — Full plan detail |
| POST | `/{planId}/days` | COACH — Add day |
| POST | `/days/{dayId}/exercises` | COACH — Add exercise |
| DELETE | `/days/{dayId}/exercises/{exerciseId}` | COACH — Remove exercise |
| PUT | `/days/{dayId}/complete` | MEMBER — Mark day complete |
| DELETE | `/days/{dayId}/complete` | COACH — Unmark day complete |
| POST | `/logs` | MEMBER — Log performance |
| DELETE | `/{planId}` | COACH — Delete plan |
| GET | `/logs/member/{memberId}` | Auth — Workout logs |
| GET | `/member/{memberId}/history` | Auth — Completed workout history |
| GET | `/exercise/{exerciseTemplateId}/history/{memberId}` | Auth — Per-exercise history |

#### `/api/v1/exercises` — Exercise Library
| Method | Path | Auth |
|---|---|---|
| GET | `/categories` | Auth — All categories |
| GET | `/library` | Auth — Full library (global + gym + personal) |
| GET | `/library/{categoryId}` | Auth — By category |
| POST | `/library` | COACH+ — Add custom exercise |
| PUT | `/library/{id}` | COACH+ — Update exercise |
| DELETE | `/library/{id}` | COACH+ — Delete exercise |
| GET | `/{id}/usage` | COACH+ — Exercise usage across plans |

#### `/api/v1/templates` — Workout Templates
| Method | Path | Auth |
|---|---|---|
| POST | `/` | COACH — Create template |
| GET | `/` | COACH — Own templates |
| GET | `/{templateId}` | Auth — Template details |
| DELETE | `/{templateId}` | COACH — Delete |

#### `/api/v1/nutrition` — Nutrition Plans (v1)
| Method | Path | Auth |
|---|---|---|
| POST | `/` | COACH — Create plan |
| GET | `/member/{memberId}` | Auth — Member's plans |
| POST | `/{planId}/meals` | COACH — Add meal |
| PUT | `/meals/{mealId}` | COACH — Update meal |
| DELETE | `/{planId}` | COACH — Delete plan |
| DELETE | `/meals/{mealId}` | COACH — Delete meal |

#### `/api/v1/nutrition/v3` — AI Nutrition Tracking (v3)
| Method | Path | Auth |
|---|---|---|
| POST | `/targets` | COACH/ADMIN — Set macro targets |
| GET | `/targets/{memberId}` | Auth — Get targets |
| PUT | `/targets/{memberId}` | COACH/ADMIN — Update targets |
| POST | `/analyze` | Auth — AI food analysis |
| POST | `/log` | Auth — Log food entry |
| GET | `/log/today/{memberId}` | Auth — Today's macros + entries |
| GET | `/log/history/{memberId}` | Auth — Daily history |
| DELETE | `/log/{entryId}` | Auth — Delete entry |
| POST | `/water` | Auth — Log water |
| GET | `/water/today/{memberId}` | Auth — Today's water |
| GET | `/coach/overview/{memberId}` | COACH/ADMIN — Nutrition overview |

#### `/api/v1/attendance` — Attendance
| Method | Path | Auth |
|---|---|---|
| POST | `/me/checkin` | MEMBER — Self check-in |
| POST | `/me/checkout` | MEMBER — Self check-out |
| GET | `/me` | MEMBER — Own records |
| GET | `/me/stats` | MEMBER — Stats summary |
| GET | `/member/{memberId}` | COACH/ADMIN/SUPER — Member records |
| GET | `/member/{memberId}/streak` | COACH/ADMIN/SUPER — Streak |

#### `/api/v1/measurements`
| Method | Path | Auth |
|---|---|---|
| POST | `/` | COACH/GYM_ADMIN — Add measurement |
| GET | `/member/{memberId}` | Auth — All measurements |
| GET | `/member/{memberId}/latest` | Auth — Most recent |

#### `/api/v1/notifications`
| Method | Path | Auth |
|---|---|---|
| GET | `/` | Auth — User's notifications |
| PUT | `/{id}/read` | Auth — Mark read |
| PUT | `/read-all` | Auth — Mark all read |

#### `/api/v1/notes` — Coach Notes
| Method | Path | Auth |
|---|---|---|
| POST | `/` | COACH — Create note |
| GET | `/member/{memberId}` | COACH — Notes for member |
| PUT | `/{noteId}` | COACH — Update |
| DELETE | `/{noteId}` | COACH — Delete |

#### `/api/v1/finance` — Finance (ACCOUNTANT / GYM_ADMIN)
| Method | Path | Description |
|---|---|---|
| GET | `/revenue` | Revenue summary (MRR, ARR, renewal rate) |
| GET | `/subscriptions` | Active / expiring / expired breakdown |
| GET | `/members` | Per-member financial status |
| GET | `/summary` | Full finance dashboard |
| GET | `/export` | CSV export of member finances |

#### `/api/v1/hr` — HR (HR / GYM_ADMIN)
| Method | Path | Description |
|---|---|---|
| GET | `/staff` | All staff with profiles |
| POST | `/staff/{userId}/profile` | Create/update staff profile |
| GET/POST | `/staff/{userId}/attendance` | View / log staff attendance |
| GET | `/attendance/today` | Present staff today |
| GET | `/reports/attendance` | Gym-wide attendance report |
| GET | `/staff/{coachId}/performance` | Coach performance metrics |
| GET | `/performance` | All coaches performance ranking |

#### `/api/v1/reception` — Reception (RECEPTION / GYM_ADMIN)
| Method | Path | Description |
|---|---|---|
| GET | `/members/search` | Search members by name/email |
| POST | `/checkin/{memberId}` | Front-desk check-in |
| POST | `/members` | Register walk-in member |
| POST | `/members/{memberId}/assign-coach` | Assign coach to walk-in |
| PUT | `/members/{memberId}/renew` | Renew member subscription |
| GET | `/today` | Today's stats (check-ins, new members) |
| GET | `/live-feed` | Recent check-ins feed |
| GET | `/alerts` | Expiring subscription alerts |
| GET | `/coaches` | Available coaches list |

#### `/api/v1/super` — SUPER_ADMIN
| Method | Path | Description |
|---|---|---|
| GET/POST | `/gyms` | List / create gym |
| GET | `/gyms/{gymId}` | Gym detail |
| PUT | `/gyms/{gymId}/subscription` | Update gym subscription tier |
| PUT | `/gyms/{gymId}/features` | Toggle feature flags |
| PUT | `/gyms/{gymId}/limits` | Update member/coach limits |
| PUT | `/gyms/{gymId}/branding` | Update logo/color |
| DELETE | `/gyms/{gymId}` | Deactivate gym |
| GET | `/stats` | Platform statistics |
| GET/PUT | `/leads` | Leads management |
| PUT | `/leads/{id}/contacted` | Mark lead contacted |
| PUT | `/users/{userId}/reset-password` | Reset any user's password |
| GET | `/platform-tiers` | All tiers (including inactive) |
| POST | `/platform-tiers` | Create tier |
| PUT | `/platform-tiers/{id}` | Update tier |
| DELETE | `/platform-tiers/{id}` | Deactivate tier |
| GET/PUT | `/platform-page` | Read/update landing page text |

#### `/actuator` — Ops (Public for health/info)
| Method | Path | Auth |
|---|---|---|
| GET | `/actuator/health` | Public |
| GET | `/actuator/info` | Public |
| All others | `/actuator/**` | SUPER_ADMIN |

### 5.12 Services

| Service | Responsibility |
|---|---|
| `AuthService` | Login, register, JWT issuance, password change |
| `GymAdminService` | Member/coach CRUD, analytics, subscription management, monthly revenue charts |
| `ExerciseService` | Exercise library CRUD, category listing, gym overrides |
| `WorkoutPlanService` | Plan + day + exercise CRUD, auto-shift stale plans, template instantiation |
| `WorkoutTemplateService` | Template CRUD |
| `NutritionService` | Nutrition plan + meal CRUD (v1) |
| `NutritionV3Service` | AI food analysis, food logging, macro totals, water tracking |
| `AttendanceService` | Check-in/out, streak calculation, stats |
| `MeasurementService` | Body measurement CRUD |
| `NotificationService` | Create + list + mark-read |
| `CoachNoteService` | Coach private notes CRUD |
| `CoachDashboardService` | Member list with nutrition status dots |
| `AccessGuard` | Cross-role access enforcement |
| `PlatformTierService` | Platform tier CRUD + save% calculation + pricing page management |
| `GymMemberPlanService` | Gym plan CRUD + renewal request lifecycle |
| `GymFeatureService` | Feature flag assertion (`assertEnabled`) |
| `PublicGymService` | Gym self-registration, email availability, contact leads |
| `SuperAdminService` | Gym management, feature/limit/branding updates, platform stats, leads |
| `FinanceService` | Revenue metrics, subscription analytics, CSV export |
| `HrService` | Staff profiles, staff attendance, coach performance metrics |
| `ReceptionService` | Front-desk member search, check-in, walk-in registration |
| `MemberReportService` | Member complaints and suggestions |

### 5.13 Data Seeders

Seeders run on application startup via `ApplicationRunner` and are idempotent (check count before seeding).

| Seeder | Order | Seeds |
|---|---|---|
| `DataSeeder` | 1 | 1 gym (Iron Peak Gym), 1 GYM_ADMIN, 2 COACHes, 4 MEMBERs, 1 SUPER_ADMIN |
| `Phase3DataSeeder` | 3 | Exercise categories (Chest, Back, Legs, Arms, Core, Cardio, etc.) + global exercise library |
| `Phase4DataSeeder` | 4 | GymClassStatus and ClassBookingStatus reference data |
| `PricingDataSeeder` | 10 | 3 platform tiers (Basic/Pro/Enterprise) + 8 gym member plans per gym |
| `V3DataSeeder` | 20 | NutritionTargets, FoodEntries (7 days), WaterLogs, StaffProfiles, StaffAttendance, attendance history for seeded members |

### 5.14 Feature Flags

Per-gym feature flags are stored as boolean columns on the `Gym` entity and toggled by SUPER_ADMIN via `PUT /api/v1/super/gyms/{gymId}/features`.

| Flag | Behavior when enabled |
|---|---|
| `nutritionEnabled` | Shows Nutrition sidebar link in web coach dashboard; shows Nutrition tab in mobile coach tabs |
| `pushNotificationsEnabled` | Reserved for future push notification delivery |
| `customBrandingEnabled` | Mobile login shows gym logo; app uses gym's `primaryColor` throughout |
| `classBookingEnabled` | Shows Classes tab in mobile member tabs; shows `/admin/classes` page in web |
| `analyticsAdvancedEnabled` | Unlocks revenue report endpoint; shows advanced charts in admin analytics |

All clients fetch flags via `GET /api/v1/me/gym-config` on login and cache the result.

### 5.15 Security Hardening (code-level pass)

A safe, non-destructive hardening pass added the following. The schema strategy is **unchanged** (`ddl-auto=update`); see **[`QAWI_SECURITY.md`](QAWI_SECURITY.md)** for the full Part A/B/C breakdown.

| Area | What was added |
|---|---|
| Seed credentials | Demo passwords read from `QAWI_DEMO_USER_PASSWORD` / `QAWI_DEMO_SUPER_ADMIN_PASSWORD` (dev fallbacks); never logged |
| Brute-force lockout | `LoginAttemptService` (in-memory): `QAWI_LOGIN_MAX_ATTEMPTS` (5) failures → lock for `QAWI_LOGIN_LOCK_MINUTES` (15); checked first in `AuthService.login`, returns bilingual `429`; per-email, resets on success; subscription-lock is not a credential failure |
| Refresh tokens | `RefreshToken` entity (`refresh_tokens`; **only** SHA-256 hash stored); `POST /auth/refresh` rotates, `POST /auth/logout` revokes; `QAWI_REFRESH_TOKEN_DAYS` (30); access JWT unchanged |
| Async push | `AsyncConfig` bounded `pushTaskExecutor` + `@Async PushFanOutService` invoked from `NotificationService` after-commit hook |
| JSON logging | `logstash-logback-encoder` + `logback-spring.xml`: readable console by default, JSON only under `prod` / `json-logging` profile (keeps `reqId` MDC) |
| Security headers | `SecurityConfig` emits HSTS, `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, conservative CSP, `Permissions-Policy`. CORS + actuator lockdown unchanged |
| Dependency scan / CI | OWASP Dependency-Check Maven plugin (unbound; on-demand), `.github/workflows/build-test.yml` + `security.yml`, `tests/k6/load.js` + `security.js` |

---

## 6. Web Frontend — React / Vite

### 6.1 Architecture & Routing

**File:** `artifacts/qawi-web/src/App.tsx`

Routing is handled by **Wouter**. On load, `useAuth` checks `localStorage` for a JWT. If present, `GET /api/v1/auth/me` validates the token. The user is then routed based on `role`:

| Role | Default redirect |
|---|---|
| GYM_ADMIN | `/admin/dashboard` |
| COACH | `/coach/dashboard` |
| SUPER_ADMIN | `/super/dashboard` |
| ACCOUNTANT | `/finance/dashboard` |
| HR | `/hr/dashboard` |
| RECEPTION | `/reception/dashboard` |
| MEMBER | Mobile-only notice page |

Every page is wrapped in `<ErrorBoundary>` for graceful crash recovery.

**API client:** `src/lib/queryClient.ts` — TanStack Query `queryClient` + a custom `apiRequest` fetch wrapper that attaches the JWT from `localStorage` and throws on non-2xx responses.

### 6.2 Auth Flow

1. User opens `/login`
2. Credentials sent to `POST /api/v1/auth/login`
3. JWT stored in `localStorage` under key `token`; `UserDto` stored under `user`
4. `useAuth` hook reads both and exposes `user`, `token`, `login()`, `logout()` to all components
5. On 401 response, `logout()` clears `localStorage` and redirects to `/login`

### 6.3 i18n & RTL

**Hook:** `hooks/use-language.ts` — reads/writes a `language` key in `localStorage` (values: `"en"` / `"ar"`).

**Translation files:** `locales/en.json` and `locales/ar.json` — flat key-value maps.

**RTL:** When `language === "ar"`, the root `<html>` element gets `dir="rtl"` applied. Tailwind's `rtl:` variant is used throughout for directional adjustments.

**Language toggle:** Available in the navbar; switches all text instantly without a page reload.

### 6.4 Theming

| Token | Value |
|---|---|
| Background | `#0A0F1E` (deep dark navy) |
| Accent / primary | `#22C55E` (green) |
| Glass card | `bg-white/5` + `backdrop-blur` |
| Border | `border-white/10` |
| Text primary | `white` |
| Text secondary | `text-gray-400` |

The design style is **dark glass-morphism** — frosted glass cards, subtle gradients, and green accents consistently applied throughout.

### 6.5 Pages by Role

#### Public Pages
| Route | File | Description |
|---|---|---|
| `/login` | `login.tsx` | JWT login form |
| `/register` | `register.tsx` | Gym self-registration with 4-duration toggle and live platform tier prices. Shows save badges (e.g., "Save 20%") on 6M and 12M plans. Pulls data from `GET /public/platform-tiers` + `GET /public/platform-page`. |
| `/not-found` | `not-found.tsx` | 404 page |

#### GYM_ADMIN Pages (`/admin/*`)
| Route | File | Description |
|---|---|---|
| `/admin/dashboard` | `admin/dashboard.tsx` | KPI cards (total members, active this week, expiring soon, coaches). Recharts bar charts for monthly revenue and weekly attendance. Skeleton loaders while loading. |
| `/admin/members` | `admin/members.tsx` | Full member directory. Add/delete/reset password. Member detail sheet: assign coach, update subscription, view history. Enforces `maxMembers` limit. Shows "X/Y members" count when limit is set. |
| `/admin/coaches` | `admin/coaches.tsx` | Coach directory. Add/delete/reset password. Improved empty state with bilingual text + CTA. |
| `/admin/subscriptions` | `admin/subscriptions.tsx` | Member subscription status view with active/expiring/expired buckets. |
| `/admin/analytics` | `admin/analytics.tsx` | Advanced analytics dashboard. Monthly revenue bar chart, weekly attendance bar chart, KPI stat cards. Print Report (browser print) + Export CSV buttons. |
| `/admin/revenue` | `admin/revenue.tsx` | Revenue report from Finance service. |
| `/admin/reports` | `admin/reports.tsx` | Member-submitted reports and suggestions with resolve action. |
| `/admin/classes` | `admin/classes.tsx` | Class booking management. CRUD for gym classes (name, instructor, date/time, capacity, description). Shows lock screen when `classBookingEnabled=false`. |
| `/admin/pricing` | `admin/pricing.tsx` | Two-tab layout: **Plans** (list/add/edit/deactivate gym member plans with duration labels and prices) + **Renewal Requests** (approve/reject member renewal requests, shows status badges). |

#### COACH Pages (`/coach/*`)
| Route | File | Description |
|---|---|---|
| `/coach/dashboard` | `coach/dashboard.tsx` | Assigned members grid. Each card shows name, subscription status, last check-in, and a colored nutrition status dot: 🟢 on track, 🟡 partial, 🔴 no logs, ⚫ no plan. Legend at top. Skeleton loaders. |
| `/coach/members/:id` | `coach/member-detail.tsx` | Detailed member view with workout plan editor, nutrition plan, body measurements, and coach notes. |
| `/coach/plans/create` | `coach/create-plan.tsx` | Multi-step workout plan builder. |
| `/coach/templates` | `coach/templates.tsx` | Workout template library. Create templates + assign to members. |
| `/coach/library` | `coach/library.tsx` | Exercise library accessible to both COACH and GYM_ADMIN. Exercise cards have: ✨ Sparkles button (GYM_ADMIN only) for gym-level name/video override; "Customized" badge on overridden exercises; UserPlus button for coach member assignment. |
| `/coach/nutrition` | `coach/nutrition.tsx` | Nutrition plan management. Feature-flagged: only visible when `nutritionEnabled=true`. |

#### SUPER_ADMIN Pages (`/super/*`)
| Route | File | Description |
|---|---|---|
| `/super/dashboard` | `super/dashboard.tsx` | Platform-wide stats (total gyms, members, coaches). Table of all gyms with subscription status. Create new gym modal. |
| `/super/gyms` | `super/gyms.tsx` | Full gym list with search. |
| `/super/gyms/:id` | `super/gym-detail.tsx` | Gym configuration: feature flag toggles (all 5 flags), member/coach limits, custom branding. |
| `/super/pricing` | `super/pricing.tsx` | Platform pricing management. Edit page text (title/subtitle/footer). Tier cards with edit modal: name EN/AR, all 4 prices, features list (add/remove rows), active toggle, highlighted toggle, display order, max members/coaches, subscription plan. |
| `/super/leads` | `super/leads.tsx` | Contact request list from registration page. Mark as contacted. |

### 6.6 Shared Components

| Component | Purpose |
|---|---|
| `AppShell` | Sidebar + Navbar wrapper. Responsive: auto-collapses on small screens. Full-viewport overlay backdrop on mobile closes on tap. |
| `ErrorBoundary` | Catches React render errors. Bilingual fallback UI with reload button. |
| `OfflineBanner` | Listens to `online`/`offline` window events. Yellow bar when offline, green "back online" bar (auto-dismisses after 3s). |
| `Skeleton` | Animate-pulse skeleton loaders replacing all loading spinners. |
| `useIsLargeScreen` | `matchMedia ≥ 1024px` hook used by `AppShell`. |
| `useGymConfig` (`hooks/use-gym-config.ts`) | Fetches + caches feature flags from `GET /me/gym-config`. |

---

## 7. Mobile App — Expo / React Native

### 7.1 Architecture & Routing

**Routing:** `expo-router` with file-based route groups. The root `_layout.tsx` checks auth state and redirects to the appropriate group:

```
app/
├── index.tsx                  → redirect to (auth)/login or role group
├── _layout.tsx                → root layout, auth guard
├── notifications.tsx          → global notifications (all roles)
├── (auth)/
│   └── login.tsx              → login screen
├── (member)/
│   ├── _layout.tsx            → tab bar definition
│   ├── index.tsx              → Home (check-in, stats, workout preview)
│   ├── workout.tsx            → Active workout session
│   ├── nutrition.tsx          → Nutrition plan viewer
│   ├── classes.tsx            → Class booking
│   ├── progress.tsx           → Body measurements + charts
│   ├── profile.tsx            → Profile + settings + Renew button
│   └── renewal.tsx            → Subscription renewal flow
├── (coach)/
│   ├── _layout.tsx            → tab bar definition
│   ├── index.tsx              → Members list
│   ├── plans.tsx              → Workout plans
│   ├── library.tsx            → Exercise library
│   ├── nutrition.tsx          → Nutrition management (feature-flagged)
│   └── profile.tsx            → Coach profile
├── (admin)/
│   ├── _layout.tsx            → tab bar definition
│   ├── index.tsx              → Dashboard
│   ├── members.tsx            → Member directory
│   ├── coaches.tsx            → Coach directory
│   └── profile.tsx            → Admin profile
├── member/
│   └── [id].tsx               → Member detail (coach's view)
└── coach/
    ├── create-plan.tsx        → New workout plan builder
    ├── create-nutrition.tsx   → New nutrition plan builder
    └── templates.tsx          → Template library
```

### 7.2 Auth Flow & Token Management

**Context:** `context/AuthContext.tsx`

1. On app launch, `AsyncStorage.getItem("token")` is called. If found, `GET /api/v1/auth/me` validates it.
2. JWT stored in `AsyncStorage` under key `token`; `UserDto` stored under `user`.
3. `useProtectedRoute()` watches `firstSegment` (string comparison, not nested object, to avoid infinite loops) to guard routes.
4. **401 auto-logout:** `services/api.ts` registers a global `setUnauthorizedHandler(fn)` callback. On any 401 response, it clears `AsyncStorage` token + user and calls the handler → `AuthContext` logs out immediately → router redirects to login.

**API client:** `services/api.ts` — Axios instance with base URL `https://${EXPO_PUBLIC_DOMAIN}/api/v1`. JWT injected via Axios request interceptor.

### 7.3 Offline Support

**Check-in queue** (`(member)/index.tsx`):
- Uses `@react-native-community/netinfo` to detect connectivity.
- When offline, check-in/check-out is saved to `AsyncStorage` under `pendingCheckins`.
- A `NetInfo` event listener syncs all pending check-ins automatically when connectivity is restored.
- Yellow offline banner displays with pending count.

**RefreshControl** added to nutrition, progress, coach/members, and notifications screens for pull-to-refresh.

### 7.4 Custom Branding

**Contexts:** `context/BrandingContext.tsx` + `hooks/useColors.ts`

When `customBrandingEnabled=true` and the gym has `primaryColor`/`logoUrl` set:
- All tappable elements and accents use the gym's `primaryColor` instead of default green.
- Login screen shows the gym logo (or gym name initial with glow effect) instead of the default Qawi mark.
- "Powered by Qawi" tagline displayed below gym branding.
- Gradient buttons use the gym's primary color.

Branding data comes from `GET /api/v1/me/gym-config`.

### 7.5 Screens by Role

#### Member Screens
| Screen | Route | Key Features |
|---|---|---|
| Home | `/(member)/` | QR-less self check-in/out. Offline queue. Streak counter, weekly stats. Today's workout preview. |
| Workout | `/(member)/workout` | Step-by-step workout logging. Record actual reps, weight, notes per set. Exercise video links. |
| Nutrition | `/(member)/nutrition` | Active nutrition plan broken down by meal type. Tap meal to log as done. |
| Classes | `/(member)/classes` | Upcoming class list with date/time, instructor, capacity. Book Now / Cancel with confirmation dialogs. Full/booked/locked states. |
| Progress | `/(member)/progress` | Body measurement history with charts. |
| Profile | `/(member)/profile` | Name, email, language toggle. Logout. **Renew subscription button** → navigates to `renewal`. |
| Renewal | `/(member)/renewal` | Duration filter buttons (1M / 3M / 6M / 1Y). Plan cards with price and description. Tap to select → confirmation modal → `POST /member/renewal-request`. Status: PENDING shown in profile. |
| Notifications | `/notifications` | List with read/unread states. Mark individual or all as read. Skeleton loaders + empty state. |

#### Coach Screens
| Screen | Route | Key Features |
|---|---|---|
| Members | `/(coach)/` | Searchable list of assigned members. Filter by Active/Inactive/Expiring Soon. |
| Member Detail | `/member/[id]` | Workout plan calendar (color-coded: green=done, blue=has exercises, gray=rest). Day detail bottom sheet with exercise list. Add exercise from picker. Delete exercise. Body measurements. Coach notes. |
| Plans | `/(coach)/plans` | Review and manage workout plans. |
| Library | `/(coach)/library` | Browse global + gym exercises. Create custom exercises. |
| Nutrition | `/(coach)/nutrition` | Manage nutrition plans (feature-flagged). |
| Create Plan | `/coach/create-plan` | Multi-day workout plan creation flow. |
| Create Nutrition | `/coach/create-nutrition` | Meal plan creation form. |
| Templates | `/coach/templates` | Predefined workout templates. |

#### Admin Screens
| Screen | Route | Key Features |
|---|---|---|
| Dashboard | `/(admin)/` | KPIs: total members, active this week, expiring subs, coaches. Expiry alerts. |
| Members | `/(admin)/members` | Full directory. Assign coaches. View statuses. |
| Coaches | `/(admin)/coaches` | Coach list with member assignment counts. |
| Profile | `/(admin)/profile` | Admin settings. |

---

## 8. Pricing & Subscription System

### Platform Tiers (Qawi → Gym)

**Managed by:** SUPER_ADMIN via `/super/platform-tiers` and `/super/platform-page`  
**Displayed on:** `/register` public page + `GET /public/platform-tiers`

Each `PlatformTier` has 4 price points (1m / 3m / 6m / 12m). The DTO computes:
- `save6mPercent = round(100 × (1 − (price6m÷6) ÷ price1m))`
- `save12mPercent = round(100 × (1 − (price12m÷12) ÷ price1m))`

Default seeded tiers:
| Tier | 1M | 3M | 6M (save) | 12M (save) | Highlighted |
|---|---|---|---|---|---|
| Basic | $50 | $130 | $240 (20%) | $450 (25%) | No |
| Pro | $100 | $270 | $510 (15%) | $960 (20%) | Yes |
| Enterprise | $180 | $486 | $918 (15%) | $1728 (20%) | No |

Features lists are stored as JSON strings in the DB and deserialized to `List<String>` in the DTO.

### Gym Member Plans (Gym → Member)

**Managed by:** GYM_ADMIN via `/admin/member-plans`  
**Displayed on:** Mobile Renewal screen via `GET /public/gym/{gymId}/member-plans`

Each gym gets 8 default plans seeded (4 "Training only" × 4 durations + 4 "Training + Nutrition" × 4 durations), all with `price = 0` (admin sets real prices).

### Member Renewal Flow

1. Member opens **Profile** → taps **Renew**
2. `/renewal` screen fetches `GET /public/gym/{gymId}/member-plans`
3. Member filters by duration (1M / 3M / 6M / 1Y)
4. Member taps a plan → confirmation modal shows plan name, price, duration
5. Confirm → `POST /api/v1/member/renewal-request` with `planId`, `planName`, `planNameAr`, `planDuration`, `notes`
6. Response: `RenewalRequestDto` with `status: PENDING`
7. GYM_ADMIN sees it in `/admin/pricing` → Renewal Requests tab → approve or reject

---

## 9. AI Nutrition Tracking (v3)

The v3 nutrition system (`/api/v1/nutrition/v3`) provides AI-powered food analysis on top of manual macro tracking.

**Food analysis flow:**
1. Member types free-text description (e.g. "2 eggs and toast")
2. `POST /nutrition/v3/analyze` with `{ "input": "2 eggs and toast" }` → returns estimated macros (calories, protein, carbs, fat) with a confidence score (0–1) and food name in EN + AR
3. Member confirms → `POST /nutrition/v3/log` stores the `FoodEntry`

**Daily tracking:**
- `GET /nutrition/v3/log/today/{memberId}` returns macro totals vs. targets and all food entries for today
- `GET /nutrition/v3/log/history/{memberId}` returns daily macro history chart data
- Water intake tracked separately via `/nutrition/v3/water`

**Coach overview:**
- `GET /nutrition/v3/coach/overview/{memberId}` gives coaches a dashboard view of a member's nutrition compliance

**Nutrition status on coach dashboard:**
- 🟢 Green: Member has a plan AND has logged all meals today
- 🟡 Yellow: Partial logging (some meals logged)
- 🔴 Red: Has a plan but zero logs today
- ⚫ Gray: No nutrition plan assigned

---

## 10. Reception, Finance & HR Modules

### Reception
Front-desk operators use the `/api/v1/reception` endpoints to:
- **Search** members by name or email
- **Check in** members at the front desk (same effect as member self-check-in)
- **Register walk-ins** with name, email, phone, coach assignment, and plan selection in one step (`CreateWalkInMemberRequest`)
- **Renew subscriptions** directly at the desk
- **View today's stats**: check-ins, new members, expected attendance
- **Monitor live feed** of recent check-ins
- **See alerts** for members whose subscriptions are expiring

### Finance
Finance operators (ACCOUNTANT role or GYM_ADMIN) access `/api/v1/finance`:
- **Revenue summary**: MRR (avg plan price × active members), ARR, renewal rate, expiring-this-week count
- **Subscriptions**: Active / expiring (within 7 days) / expired buckets
- **Member finances**: Per-member payment status (PAID / OVERDUE)
- **Finance summary**: Full dashboard including monthly revenue by cohort, revenue by plan, churn impact
- **CSV export**: Member finance data exported as CSV (name, email, phone, subscription dates, status)

### HR
HR managers access `/api/v1/hr`:
- **Staff profiles**: Job title, start date, salary, employment type, emergency contact for all staff
- **Staff attendance**: Clock-in/out records per staff member + gym-wide daily presence view
- **Coach performance**: Metrics per coach (members managed, plans created, etc.) + ranking across all coaches

---

## 11. Class Booking System

Feature-gated by `classBookingEnabled` flag.

**Admin manages classes** via `GET/POST/PUT/DELETE /api/v1/admin/classes`:
- Name, instructor, date/time, duration (minutes), max capacity, description
- Status: `SCHEDULED → CANCELLED / COMPLETED`
- View all bookings for a class

**Members book via mobile** (`/(member)/classes`):
- Lists upcoming classes sorted by date
- Shows current booking count vs. capacity
- Book Now (if capacity available and not already booked)
- Cancel booking (confirmation dialog)
- States: Available / Booked / Full / Locked (feature disabled)

**Web admin** (`/admin/classes`):
- Shows lock/upgrade screen when `classBookingEnabled=false`
- Full CRUD when enabled

---

## 12. Workflows & Deployment

### Configured Workflows

| Workflow | Command | Port |
|---|---|---|
| `Qawi Spring Boot API` | `cd qawi-backend && mvn spring-boot:run` | 9000 |
| `artifacts/qawi-web: web` | `pnpm --filter @workspace/qawi-web run dev` | `$PORT` |
| `artifacts/qawi-mobile: expo` | `pnpm --filter @workspace/qawi-mobile run dev` | Expo tunnel |
| `artifacts/api-server: API Server` | `pnpm --filter @workspace/api-server run dev` | 8080 |
| `artifacts/mockup-sandbox: Component Preview Server` | `pnpm --filter @workspace/mockup-sandbox run dev` | `$PORT` |

### Reverse Proxy Routing

All traffic enters through a shared reverse proxy at `localhost:80`. Routes are matched most-specific-first:

| Path prefix | Routes to |
|---|---|
| `/api/v1/` | Spring Boot (port 9000) |
| `/` | React web dashboard |
| Expo domain | Expo dev server |

### Deployment Checklist

1. All workflows must be running before deploying
2. `DATABASE_URL` and all `PG*` vars must be set in Replit Secrets
3. `JWT_SECRET` (≥ 32 bytes) must be set
4. `EXPO_PUBLIC_DOMAIN` must be set to the Replit deployment domain for mobile API calls
5. Spring Boot auto-creates all tables via Hibernate DDL-auto (`update` mode) — no migrations needed
6. Data seeders run once on first boot (idempotent via count checks)

### Actuator Health Check

`GET /actuator/health` returns `{"status":"UP"}` — can be used as the deployment health probe.

---

## 13. Seed Data Reference

After a fresh deployment the following accounts are available:

| Role | Email | Password | Gym |
|---|---|---|---|
| GYM_ADMIN | `admin@ironpeak.com` | `password123` | Iron Peak Gym |
| COACH | `coach.jordan@ironpeak.com` | `password123` | Iron Peak Gym |
| COACH | `coach.morgan@ironpeak.com` | `password123` | Iron Peak Gym |
| MEMBER (active 30d) | `sam@ironpeak.com` | `password123` | Iron Peak Gym |
| MEMBER (expiring 5d) | `casey@ironpeak.com` | `password123` | Iron Peak Gym |
| MEMBER (active 30d) | `riley@ironpeak.com` | `password123` | Iron Peak Gym |
| MEMBER (expired / blocked) | `drew@ironpeak.com` | `password123` | Iron Peak Gym |
| SUPER_ADMIN | `super@qawi.com` | `qawi_super_2024` | Platform-wide |

Default gym member plans for Iron Peak Gym (8 plans, prices start at 0 — admin must set real prices):
- Training – 1M / 3M / 6M / 1Y
- Training + Nutrition – 1M / 3M / 6M / 1Y

Default platform tiers: Basic / Pro (highlighted) / Enterprise

---

## 14. Known Constraints & Conventions

### Backend
- **No JPA relationships** between entities — `gymId`, `memberId`, etc. are plain UUID columns. All cross-entity joins are done in the service layer with separate repository calls.
- **Multi-tenancy enforced in service layer** — every write operation extracts `gymId` from the caller's `User` record before operating.
- **Features stored as JSON** — `PlatformTier.features` and `featuresAr` are JSON strings (`List<String>`) serialized/deserialized via Jackson `ObjectMapper` in the service.
- **Soft deletes** — deleting a user sets `isActive=false`; deleting a `GymMemberPlan` sets `active=false`. Nothing is hard-deleted from production.
- **Bean Validation** — all `@RequestBody` params use `@Valid`. Required fields have `@NotNull`/`@NotBlank`. The error response includes a `fields` map for form highlighting.
- **Auto-shift workout logic** — `MemberController.todaysWorkout()` auto-slides uncompleted workout days forward if the plan is stale (days have passed without being completed).
- **JWT fallback** — if `JWT_SECRET` env var is not set, falls back to `SESSION_SECRET`.

### Web Frontend
- **JWT in `localStorage`** — not `httpOnly` cookies. Acceptable given CORS wildcard + Bearer token auth.
- **Feature-flagged pages** — pages gated by feature flags show a lock/upgrade UI when the flag is `false`; they do not 404.
- **`maxMembers` enforcement** — the Add Member button in `/admin/members` is disabled when `members.length >= limits.maxMembers`. The count display shows "X/Y members".

### Mobile App
- **Port-free API calls** — the mobile API URL contains no port number (e.g., `/api/v1` not `:9000/api/v1`). Requests route through the Replit shared proxy.
- **`useProtectedRoute` uses `firstSegment` string** — not a nested object, to avoid triggering unnecessary navigation re-renders and infinite loops.
- **Offline check-in queue** — only check-in/check-out is queued offline. Other mutations require connectivity.

### Monorepo
- **pnpm workspaces** — packages use `@workspace/` prefix. Root-level `pnpm dev` does not exist; each artifact runs via its own workflow.
- **No Vite proxy config** — cross-service routing is handled entirely by the Replit shared reverse proxy. Do not add Vite proxy entries.
- **`PORT` env var** — Vite dev servers must bind to `process.env.PORT`. Hard-coded ports cause preview failures in the shared proxy environment.
