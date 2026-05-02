# Qawi (قوي) - Gym Management SaaS API

A complete REST API backend for gym management built with Java Spring Boot 3, Spring Security (JWT), Spring Data JPA, and PostgreSQL.

## Tech Stack

- **Java 17** + **Spring Boot 3.2**
- **Spring Security** with JWT (JJWT 0.12)
- **Spring Data JPA** with Hibernate (PostgreSQL dialect)
- **PostgreSQL** database
- **Lombok** for boilerplate reduction
- **Bean Validation** (Jakarta Validation)
- **Spring Actuator** for health checks

## Project Structure

```
src/main/java/com/qawi/gym/
├── config/           # SecurityConfig, ApplicationConfig (beans, auth, CORS)
├── controller/       # REST controllers
├── dto/
│   ├── request/      # Request DTOs with validation
│   └── response/     # Response DTOs
├── entity/           # JPA entities
│   └── enums/        # Enumerations
├── exception/        # Custom exceptions + GlobalExceptionHandler
├── repository/       # Spring Data JPA repositories
├── security/         # JwtService, JwtAuthenticationFilter
└── service/          # Business logic services
```

## API Endpoints

### Auth — `/api/v1/auth`
| Method | Path | Description |
|--------|------|-------------|
| POST | `/register` | Register a new user |
| POST | `/login` | Login and get JWT tokens |
| POST | `/refresh` | Refresh access token |

### Gyms — `/api/v1/gyms`
| Method | Path | Roles |
|--------|------|-------|
| POST | `/` | SUPER_ADMIN, GYM_OWNER |
| GET | `/` | SUPER_ADMIN |
| GET | `/{id}` | Authenticated |
| PUT | `/{id}` | SUPER_ADMIN, GYM_OWNER |
| PATCH | `/{id}/status` | SUPER_ADMIN |
| DELETE | `/{id}` | SUPER_ADMIN |

### Members — `/api/v1/members`
| Method | Path | Roles |
|--------|------|-------|
| POST | `/` | SUPER_ADMIN, GYM_OWNER, STAFF |
| GET | `/{id}` | Authenticated |
| GET | `/code/{code}` | Authenticated |
| GET | `/gym/{gymId}` | Authenticated |
| PUT | `/{id}` | SUPER_ADMIN, GYM_OWNER, STAFF |
| PATCH | `/{id}/status` | SUPER_ADMIN, GYM_OWNER, STAFF |

### Membership Plans — `/api/v1/gyms/{gymId}/plans`
| Method | Path | Roles |
|--------|------|-------|
| POST | `/` | SUPER_ADMIN, GYM_OWNER |
| GET | `/` | Authenticated |
| GET | `/{id}` | Authenticated |
| PUT | `/{id}` | SUPER_ADMIN, GYM_OWNER |
| DELETE | `/{id}` | SUPER_ADMIN, GYM_OWNER |

### Subscriptions — `/api/v1/subscriptions`
| Method | Path | Roles |
|--------|------|-------|
| POST | `/` | SUPER_ADMIN, GYM_OWNER, STAFF |
| GET | `/{id}` | Authenticated |
| GET | `/member/{memberId}` | Authenticated |
| GET | `/gym/{gymId}` | Authenticated |
| POST | `/{id}/freeze` | SUPER_ADMIN, GYM_OWNER, STAFF |
| POST | `/{id}/unfreeze` | SUPER_ADMIN, GYM_OWNER, STAFF |
| POST | `/{id}/cancel` | SUPER_ADMIN, GYM_OWNER, STAFF |

### Payments — `/api/v1/payments`
| Method | Path | Roles |
|--------|------|-------|
| POST | `/` | SUPER_ADMIN, GYM_OWNER, STAFF |
| GET | `/member/{memberId}` | Authenticated |
| GET | `/gym/{gymId}` | SUPER_ADMIN, GYM_OWNER, STAFF |
| GET | `/gym/{gymId}/revenue` | SUPER_ADMIN, GYM_OWNER |

### Attendance — `/api/v1/attendance`
| Method | Path | Roles |
|--------|------|-------|
| POST | `/check-in` | SUPER_ADMIN, GYM_OWNER, STAFF |
| POST | `/check-out/{memberId}` | SUPER_ADMIN, GYM_OWNER, STAFF |
| GET | `/member/{memberId}` | Authenticated |
| GET | `/gym/{gymId}` | SUPER_ADMIN, GYM_OWNER, STAFF |

### Classes — `/api/v1/gyms/{gymId}/classes`
| Method | Path | Roles |
|--------|------|-------|
| POST | `/` | SUPER_ADMIN, GYM_OWNER, STAFF |
| GET | `/` | Authenticated |
| GET | `/schedule` | Authenticated |
| PUT | `/{id}` | SUPER_ADMIN, GYM_OWNER, STAFF |
| POST | `/{id}/cancel` | SUPER_ADMIN, GYM_OWNER, STAFF |
| POST | `/{classId}/book/{memberId}` | Authenticated |
| DELETE | `/{classId}/book/{memberId}` | Authenticated |

### Dashboard — `/api/v1/dashboard`
| Method | Path | Roles |
|--------|------|-------|
| GET | `/gym/{gymId}` | SUPER_ADMIN, GYM_OWNER, STAFF |

## Roles

| Role | Description |
|------|-------------|
| `SUPER_ADMIN` | Platform-level admin across all gyms |
| `GYM_OWNER` | Owner of one or more gyms |
| `STAFF` | Gym staff (receptionist, trainer) |
| `MEMBER` | Regular gym member |

## Authentication

All protected endpoints require: `Authorization: Bearer <access_token>`

The `/api/v1/auth/**` and `/api/v1/health` endpoints are public.

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | JDBC PostgreSQL URL | `jdbc:postgresql://localhost:5432/qawi_gym` |
| `DB_USERNAME` | Database username | `postgres` |
| `DB_PASSWORD` | Database password | `postgres` |
| `JWT_SECRET` | JWT signing secret (min 256-bit) | dev default |
| `JWT_EXPIRATION` | Access token TTL in ms | `86400000` (24h) |
| `JWT_REFRESH_EXPIRATION` | Refresh token TTL in ms | `604800000` (7d) |
| `ALLOWED_ORIGINS` | CORS allowed origins (comma-separated) | localhost |
| `PORT` | Server port | `8080` |

## Running the App

```bash
cd qawi-backend

# Build
mvn clean package -DskipTests

# Run
mvn spring-boot:run

# Or run the jar
java -jar target/gym-1.0.0.jar
```

## Database Schema

Tables auto-created via Hibernate `ddl-auto: update`:
- `users` — all system users
- `gyms` — gym locations
- `members` — gym members (linked to users)
- `membership_plans` — subscription plan definitions
- `subscriptions` — member plan subscriptions
- `payments` — payment records
- `attendance` — check-in/check-out log
- `gym_classes` — scheduled classes
- `class_bookings` — member class reservations
