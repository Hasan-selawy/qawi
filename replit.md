# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.
Also contains a standalone Java Spring Boot 3 project for the Qawi gym management API.

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
| `JWT_SECRET` | JWT signing secret (default: dev value) |
| `PORT` | Server port (default: 8080) |
