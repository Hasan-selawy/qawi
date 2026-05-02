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
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

### Qawi Spring Boot API (`qawi-backend/`)
- **Language**: Java 19 (GraalVM 22.3)
- **Framework**: Spring Boot 3.2.5
- **Security**: Spring Security + JWT (JJWT 0.12.5)
- **ORM**: Spring Data JPA + Hibernate (PostgreSQL dialect)
- **Database**: PostgreSQL
- **Build**: Maven 3.8.6
- **Port**: 8080

## Key Commands

### Node.js Workspace
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)

### Qawi Spring Boot API
- `cd qawi-backend && mvn compile` — compile only
- `cd qawi-backend && mvn spring-boot:run` — run locally
- `cd qawi-backend && mvn clean package` — build fat JAR

## Qawi API Structure

```
qawi-backend/src/main/java/com/qawi/gym/
├── config/           # SecurityConfig, ApplicationConfig
├── controller/       # Auth, Gym, Member, Plan, Subscription, Payment, Attendance, Class, Dashboard
├── dto/request/      # Request DTOs with Bean Validation
├── dto/response/     # Response DTOs (ApiResponse, PageResponse, etc.)
├── entity/           # JPA entities + enums
├── exception/        # Custom exceptions + GlobalExceptionHandler
├── repository/       # Spring Data JPA repositories
├── security/         # JwtService, JwtAuthenticationFilter
└── service/          # Business logic services
```

## Qawi Environment Variables
| Variable | Default |
|----------|---------|
| `DATABASE_URL` | `jdbc:postgresql://localhost:5432/qawi_gym` |
| `DB_USERNAME` | `postgres` |
| `DB_PASSWORD` | `postgres` |
| `JWT_SECRET` | dev default (change in prod) |
| `PORT` | `8080` |

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
See `qawi-backend/README.md` for full Qawi API documentation.
