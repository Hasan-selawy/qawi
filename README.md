<div align="center">

# قوي | Qawi
### Smart Gym Management Platform — منصة إدارة الصالات الرياضية الذكية

[![License](https://img.shields.io/badge/license-Private-red.svg)](LICENSE)
[![Java](https://img.shields.io/badge/Java-19-orange.svg)](https://openjdk.org/)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.2-green.svg)](https://spring.io/projects/spring-boot)
[![React](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev/)
[![Expo](https://img.shields.io/badge/Expo-SDK%2054-black.svg)](https://expo.dev/)

**Production-ready multi-tenant SaaS for gym management, built for the Middle East market.**

منصة SaaS متعددة المستأجرين جاهزة للإنتاج لإدارة الصالات الرياضية، مبنية لسوق الشرق الأوسط.

</div>

---

## Overview / نظرة عامة

**English:** Qawi ("Strong" in Arabic — قوي) is a full-stack gym management SaaS platform designed from the ground up for Arabic-speaking markets. It ships with a Spring Boot REST API, a React web dashboard, and a React Native mobile app — all sharing the same backend, all supporting bilingual Arabic/English with full RTL layouts.

**عربي:** قوي هو منصة SaaS متكاملة لإدارة الصالات الرياضية، مصممة من الأساس للأسواق الناطقة بالعربية. تشمل المنصة واجهة برمجية مبنية بـ Spring Boot، ولوحة تحكم ويب بـ React، وتطبيق جوال بـ React Native — كلها تشترك في نفس الخادم مع دعم كامل للعربية والإنجليزية وتخطيط RTL.

---

## Features / المميزات

| Feature | Description |
|---------|-------------|
| 🏋️ **Exercise Library** | 70+ exercises across 7 muscle-group categories with YouTube video links and Arabic names |
| 📅 **Workout Planning** | Weekly/monthly workout scheduling with day-by-day plans and rest-day support |
| 🥗 **Nutrition Plans** | Meal plans with calorie/macro tracking; members mark meals done in the app |
| 📊 **Body Measurements** | Full measurement tracking (weight, chest, waist, arms, legs, body fat %) |
| 📍 **Attendance & Streaks** | Check-in/checkout with streak tracking, weekly stats, and offline queue |
| 💬 **Coach Notes** | Per-exercise coach notes attached to workout plans |
| 💳 **Subscription Management** | Expiry alerts, renewal, and per-member status (Active / Expiring / Expired) |
| 🌍 **Full Arabic RTL** | Every screen supports Arabic with proper RTL layout and bilingual labels |
| 🔔 **Smart Notifications** | Push notification support (feature-flagged per gym) |
| 🎨 **Custom Branding** | Per-gym logo and name shown in the sidebar (feature-flagged) |
| 📱 **Mobile App** | iOS + Android via Expo; dark theme, pull-to-refresh, offline check-in queue |
| 💻 **Web Dashboard** | Glass-morphism dark UI with skeleton loaders, error boundaries, and offline banner |
| 🔒 **Rate Limiting** | Bucket4j-based per-IP and per-user rate limits on all endpoints |
| 🏢 **Multi-tenant** | Full gym isolation — each gym's data is scoped and protected |
| 📈 **Analytics** | Attendance trends, member growth, top performers, revenue (Pro plan) |

---

## User Roles / أدوار المستخدمين

| Role | Arabic | Capabilities |
|------|--------|--------------|
| `SUPER_ADMIN` | مشرف المنصة | Manages all gyms, plans, features, leads |
| `GYM_ADMIN` | مدير الصالة | Manages coaches, members, subscriptions, analytics |
| `COACH` | المدرب | Creates workout/nutrition plans, tracks assigned members |
| `MEMBER` | العضو | Views workouts, logs exercises, tracks nutrition & progress |

---

## Tech Stack / التقنيات المستخدمة

### Backend
- **Java 19** + **Spring Boot 3.2.5**
- **PostgreSQL** (Spring Data JPA + Hibernate)
- **JWT Authentication** (JJWT 0.11.5, 7-day expiry, BCrypt passwords)
- **Bucket4j** rate limiting (per-IP login, register; per-user API)
- **Spring Actuator** health checks (`/actuator/health`)
- **Bean Validation** on all request DTOs with bilingual error responses

### Web Dashboard
- **React 19** + **TypeScript** + **Vite**
- **Tailwind CSS** + **shadcn/ui** components
- **TanStack Query** for data fetching and cache management
- **Recharts** for analytics charts
- **Framer Motion** animations
- **Wouter** client-side routing
- Full **RTL Arabic** support with `dir` attribute switching

### Mobile App
- **React Native** + **Expo SDK 54**
- **TypeScript** + **Expo Router** (file-based routing)
- **TanStack Query** + **AsyncStorage**
- `@react-native-community/netinfo` for offline detection
- **Expo Haptics** for tactile feedback
- Dark theme with custom design system

### Infrastructure
- **Docker** + `docker-compose` (local dev)
- **Railway** (backend hosting)
- **Vercel** (web dashboard hosting)
- **Expo EAS** (mobile builds and OTA updates)

---

## Project Structure / هيكل المشروع

```
qawi/
├── qawi-backend/           # Spring Boot REST API (port 9000)
│   └── src/main/java/com/qawi/
│       ├── config/         # SecurityConfig, DataSeeders
│       ├── controller/     # 15 REST controllers
│       ├── service/        # Business logic + AccessGuard
│       ├── repository/     # 20 JPA interfaces
│       ├── entity/         # 18 JPA entities
│       ├── dto/            # 30+ request/response DTOs
│       ├── exception/      # GlobalExceptionHandler
│       ├── filter/         # RateLimitFilter, RequestLoggingFilter
│       └── security/       # JwtService, JwtAuthFilter
│
├── artifacts/
│   ├── qawi-web/           # React dashboard
│   │   └── src/
│   │       ├── pages/      # admin/, coach/, super/, home/
│   │       ├── components/ # Layout, UI, Charts, ErrorBoundary
│   │       ├── hooks/      # use-auth, use-language, use-gym-config
│   │       └── services/   # API client
│   │
│   └── qawi-mobile/        # Expo mobile app
│       ├── app/
│       │   ├── (auth)/     # Login screen
│       │   ├── (member)/   # Home, Workout, Nutrition, Progress
│       │   ├── (coach)/    # Members, Plans, Library, Nutrition
│       │   └── (admin)/    # Dashboard, Members, Coaches
│       ├── components/     # UI kit (Card, Button, EmptyState…)
│       ├── context/        # AuthContext, LanguageContext
│       ├── services/       # api.ts with 401 auto-logout
│       └── locales/        # en.json, ar.json
│
├── lib/                    # Shared TypeScript libraries
├── pnpm-workspace.yaml
└── README.md
```

---

## Getting Started / البدء

### Prerequisites / المتطلبات
- **Java 19+** (or GraalVM 22.3)
- **Maven 3.8+**
- **Node.js 22+** + **pnpm**
- **PostgreSQL 15+**
- **Docker** (optional, for containerized setup)

---

### Running with Docker / التشغيل بـ Docker (Recommended)

```bash
# 1. Clone the repository
git clone https://github.com/your-org/qawi.git
cd qawi

# 2. Copy environment template
cp .env.example .env

# 3. Fill in your values in .env

# 4. Build and run
docker-compose up --build

# Access:
# Web:    http://localhost:80
# API:    http://localhost:9000
# Health: http://localhost:9000/actuator/health
```

---

### Running Manually / التشغيل اليدوي

**Backend (Spring Boot):**
```bash
cd qawi-backend
mvn spring-boot:run
# API available at http://localhost:9000/api/v1
```

**Web Dashboard (React + Vite):**
```bash
pnpm --filter @workspace/qawi-web run dev
```

**Mobile App (Expo):**
```bash
pnpm --filter @workspace/qawi-mobile run dev
# Scan QR with Expo Go app, or press i/a for simulator
```

---

## Environment Variables / المتغيرات البيئية

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL JDBC URL | `jdbc:postgresql://localhost:5432/qawi` |
| `DB_USERNAME` | Database user | `postgres` |
| `DB_PASSWORD` | Database password | `yourpassword` |
| `JWT_SECRET` | JWT signing key (≥32 bytes) | `your-256-bit-secret-key` |
| `SESSION_SECRET` | Fallback for JWT_SECRET in dev | `another-secret` |
| `PORT` | API server port | `9000` |
| `VITE_API_URL` | Web dashboard API base URL | `https://api.qawi.app/api/v1` |
| `EXPO_PUBLIC_DOMAIN` | Mobile app API domain | `api.qawi.app` |

---

## Test Accounts / حسابات تجريبية

The database seeds automatically on first startup with **Iron Peak Gym** demo data.

| Role | Email | Password |
|------|-------|----------|
| Super Admin | `super@qawi.com` | `qawi_super_2024` |
| Gym Admin | `admin@ironpeak.com` | `password123` |
| Coach | `coach.jordan@ironpeak.com` | `password123` |
| Coach | `coach.morgan@ironpeak.com` | `password123` |
| Member (active 30d) | `sam@ironpeak.com` | `password123` |
| Member (expiring 5d) | `casey@ironpeak.com` | `password123` |
| Member (active) | `riley@ironpeak.com` | `password123` |
| Member (expired/blocked) | `drew@ironpeak.com` | `password123` |

---

## API Reference / مرجع API

All endpoints are prefixed with `/api/v1/`. Protected endpoints require `Authorization: Bearer <token>`.

### Authentication
```
POST   /auth/login                      # Login → { token, user }
POST   /auth/register                   # Register member
GET    /auth/me                         # Get current user
```

### Public (no auth required)
```
POST   /public/register-gym             # Gym onboarding
GET    /public/plans                    # Subscription plan list
POST   /public/contact                  # Contact form
POST   /public/check-email              # Email availability check
```

### Exercises
```
GET    /exercises/categories            # All muscle group categories
GET    /exercises/library               # All exercises
GET    /exercises/library/{categoryId}  # Exercises by category
POST   /exercises/library               # Add custom exercise
PUT    /exercises/library/{id}          # Update exercise
DELETE /exercises/library/{id}          # Delete exercise
GET    /exercises/{id}/usage            # Plans using this exercise
```

### Workouts
```
POST   /workouts                        # Create workout plan
GET    /workouts/member/{memberId}      # Member's plans
GET    /workouts/{planId}               # Plan detail + days + exercises
PUT    /workouts/{planId}               # Update plan
DELETE /workouts/{planId}               # Delete plan
POST   /workouts/{planId}/days          # Add day to plan
POST   /workouts/days/{dayId}/exercises # Add exercise to day
DELETE /workouts/days/{dayId}/exercises/{exerciseId}
PUT    /workouts/days/{dayId}/complete  # Mark day complete
POST   /workouts/logs                   # Log exercise performance
GET    /workouts/templates              # Workout templates
```

### Nutrition
```
POST   /nutrition                       # Create nutrition plan
GET    /nutrition/member/{memberId}     # Member's nutrition plan
PUT    /nutrition/{planId}              # Update plan
DELETE /nutrition/{planId}              # Delete plan
POST   /nutrition/{planId}/meals        # Add meal to plan
```

### Attendance
```
POST   /attendance/me/checkin           # Check in (member self)
POST   /attendance/me/checkout          # Check out (member self)
GET    /attendance/me/stats             # Streak + weekly stats
GET    /attendance/member/{memberId}    # Member attendance history
```

### Measurements
```
POST   /member/measurements             # Add measurement entry
GET    /member/measurements             # My measurement history
```

### Member (self-service)
```
GET    /member/workouts/today           # Today's workout
GET    /member/workouts/upcoming        # Upcoming training days
GET    /member/nutrition/active         # Active nutrition plan
POST   /member/meals/{mealId}/done      # Mark meal done
DELETE /member/meals/{mealId}/done      # Unmark meal
```

### Admin (GYM_ADMIN)
```
GET    /admin/analytics                 # Dashboard stats + charts
GET    /admin/members                   # All gym members
POST   /admin/members                   # Add member
DELETE /admin/users/{id}                # Delete user
PUT    /admin/members/{id}/subscription # Renew subscription
PUT    /admin/members/{id}/assign       # Assign coach
GET    /admin/coaches                   # All gym coaches
POST   /admin/coaches                   # Add coach
GET    /admin/coaches/{id}/members      # Coach's members
GET    /admin/expiring-subscriptions    # Expiring soon list
GET    /me/gym-config                   # Feature flags + limits
```

### Super Admin
```
GET    /super/gyms                      # All gyms
POST   /super/gyms                      # Create gym
GET    /super/gyms/{id}                 # Gym detail
PUT    /super/gyms/{id}/subscription    # Update gym subscription
PUT    /super/gyms/{id}/features        # Toggle feature flags
GET    /super/stats                     # Platform-wide stats
GET    /super/leads                     # Registration leads
```

### Notifications
```
GET    /notifications                   # My notifications
```

---

## Subscription Plans / خطط الاشتراك

| Plan | السعر (Price) | Members | Coaches | Advanced Analytics |
|------|---------------|---------|---------|-------------------|
| **Basic** / الأساسية | 30 JOD/mo | 50 | 3 | ❌ |
| **Pro** / الاحترافية | 60 JOD/mo | 200 | 10 | ✅ |
| **Enterprise** / المؤسسية | 100 JOD/mo | Unlimited | Unlimited | ✅ |

> All plans include a **14-day free trial** · جميع الخطط تشمل **تجربة مجانية 14 يوم**

---

## Feature Flags / إعدادات الميزات

Per-gym toggles managed by SUPER_ADMIN via `/super/gyms/{id}/features`:

| Flag | Default | Description |
|------|---------|-------------|
| `nutritionEnabled` | `false` | Nutrition plans tab (web + mobile) |
| `pushNotificationsEnabled` | `false` | In-app notification bell |
| `customBrandingEnabled` | `false` | Custom gym logo in sidebar |
| `classBookingEnabled` | `false` | Class booking (coming soon) |
| `analyticsAdvancedEnabled` | `false` | Revenue charts, top performers |

---

## Health Check / فحص الصحة

```bash
curl http://localhost:9000/actuator/health
# → { "status": "UP" }

curl http://localhost:9000/actuator/info
# → Build info, version
```

---

## Rate Limiting / تحديد معدل الطلبات

| Endpoint | Limit |
|----------|-------|
| `POST /auth/login` | 5 requests / minute per IP |
| `POST /public/register-gym` | 3 requests / hour per IP |
| All other endpoints | 100 requests / minute per user/IP |

Returns `429 Too Many Requests` when exceeded.

---

## Error Response Format / صيغة رد الأخطاء

All API errors return a consistent JSON body:

```json
{
  "error": "Human-readable error in English",
  "messageAr": "رسالة الخطأ بالعربية",
  "fields": {
    "email": "Email is already in use",
    "password": "Must be at least 8 characters"
  },
  "timestamp": "2026-05-03T12:00:00Z"
}
```

`fields` is `null` for non-validation errors.

---

## Security / الأمان

- **JWT Bearer tokens** — 7-day expiry; auto-logout on 401 in web + mobile
- **BCrypt** password hashing
- **Role-based access control** enforced at service layer via `AccessGuard`
- **CORS** — configured for production domains; `allowCredentials=false`
- **Rate limiting** — Bucket4j on login and registration endpoints
- **Input validation** — Bean Validation on all DTOs; 400 with field-level errors
- **Gym isolation** — every query scoped to the caller's `gymId`

---

## Deployment / النشر

### Backend → Railway
```bash
# 1. Connect GitHub repo to Railway
# 2. Set environment variables in Railway dashboard:
#    DATABASE_URL, JWT_SECRET, PORT=9000
# 3. Deployments trigger automatically on push to main
```

### Web Dashboard → Vercel
```bash
# 1. Connect GitHub repo to Vercel
# 2. Set VITE_API_URL environment variable
# 3. Build command: pnpm --filter @workspace/qawi-web run build
# 4. Output directory: artifacts/qawi-web/dist
```

### Mobile → Expo EAS
```bash
npm install -g eas-cli
eas login

# Build
eas build --platform ios
eas build --platform android

# Submit to stores
eas submit --platform ios
eas submit --platform android

# Over-the-air update
eas update --branch production
```

---

## License / الرخصة

**Private — All rights reserved**
جميع الحقوق محفوظة

© 2026 Qawi — قوي

---

## Contact / التواصل

For business inquiries about the Qawi platform, use the gym registration form in the app or contact through the official website.

للاستفسارات التجارية حول منصة قوي، استخدم نموذج تسجيل الصالة في التطبيق أو تواصل عبر الموقع الرسمي.

---

<div align="center">

**Built with ❤️ for the Arab fitness community**
مبني بـ ❤️ لمجتمع اللياقة البدنية العربي

</div>
