# Qawi — قوي | Gym Management Platform

## Overview

Qawi is a multi-tenant SaaS gym management platform built for Arabic and English-speaking markets. It enables gym owners to manage members, coaches, workout plans, nutrition, attendance, and subscriptions — all from a single platform with full bilingual (AR/EN) support.

## نظرة عامة

قوي هو نظام إدارة صالات رياضية متعدد المستأجرين، مصمم للأسواق العربية والإنجليزية. يُمكّن أصحاب الصالات من إدارة الأعضاء والمدربين وخطط التمرين والتغذية والحضور والاشتراكات — كل ذلك من منصة واحدة مع دعم كامل للغتين.

## Roles

| Role | Description |
|------|-------------|
| `SUPER_ADMIN` | Manages all gyms on the platform |
| `GYM_ADMIN` | Manages their own gym, members, coaches, and subscriptions |
| `COACH` | Manages assigned members, creates workout and nutrition plans |
| `MEMBER` | Tracks their own workouts, nutrition, attendance, and measurements |

## Tech Stack

- **Backend**: Java 17 + Spring Boot 3 + PostgreSQL + JWT
- **Web Dashboard**: React + Vite + TailwindCSS + shadcn/ui
- **Mobile App**: Expo (React Native) — iOS & Android
- **Monorepo**: pnpm workspaces

## Running Locally

### Prerequisites
- Java 17+
- Maven 3.8+
- Node.js 20+ with pnpm
- PostgreSQL 15+

### Backend
```bash
cd qawi-backend
mvn spring-boot:run
```

### Web Dashboard
```bash
pnpm --filter @workspace/qawi-web run dev
```

### Mobile App
```bash
pnpm --filter @workspace/qawi-mobile run dev
```

## Running with Docker

1. Copy `.env.example` to `.env` and fill in values:
   ```bash
   cp .env.example .env
   ```

2. Start all services:
   ```bash
   docker-compose up --build
   ```

3. Access:
   - **Web Dashboard**: http://localhost:80
   - **Backend API**: http://localhost:9000
   - **Database**: localhost:5432

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DB_USERNAME` | PostgreSQL username | `postgres` |
| `DB_PASSWORD` | PostgreSQL password | `yourpassword` |
| `JWT_SECRET` | JWT signing secret (min 32 chars) | `your-super-secret-key` |
| `DB_URL` | Full JDBC connection URL | `jdbc:postgresql://localhost:5432/qawi` |

## API Endpoints

### Auth (Public)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/auth/login` | Login and receive JWT |
| POST | `/api/v1/public/register-gym` | Register a new gym |

### Member
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/member/workouts/today` | Today's workout plan |
| POST | `/api/v1/member/workouts/{dayId}/complete` | Mark workout complete |
| GET | `/api/v1/member/nutrition/today` | Today's nutrition plan |
| GET | `/api/v1/member/measurements` | Measurement history |
| POST | `/api/v1/member/measurements` | Log a measurement |
| GET | `/api/v1/member/notifications` | Notifications |
| POST | `/api/v1/attendance/me/checkin` | Check in |
| POST | `/api/v1/attendance/me/checkout` | Check out |

### Coach
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/coach/members` | Assigned members |
| POST | `/api/v1/coach/plans` | Create workout plan |
| GET | `/api/v1/exercises/library` | Exercise library |
| POST | `/api/v1/exercises` | Create exercise |

### Admin
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/admin/members` | All gym members |
| POST | `/api/v1/admin/members` | Add member |
| GET | `/api/v1/admin/subscriptions` | All subscriptions |
| POST | `/api/v1/admin/subscriptions/{id}/renew` | Renew subscription |
| GET | `/api/v1/admin/dashboard` | Dashboard stats |

### Super Admin
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/super/gyms` | All gyms |
| GET | `/api/v1/super/stats` | Platform stats |

## Test Accounts

| Role | Email | Password |
|------|-------|----------|
| Super Admin | super@qawi.com | qawi_super_2024 |
| Gym Admin | admin@ironpeak.com | password123 |
| Coach | coach.jordan@ironpeak.com | password123 |
| Member | sam@ironpeak.com | password123 |

## Production Deployment

| Service | Recommended Platform |
|---------|---------------------|
| Backend | Railway or Render (Docker support) |
| Database | Supabase or Railway PostgreSQL |
| Web Dashboard | Vercel or Railway |
| Mobile App | Expo EAS Build → App Store + Google Play |
