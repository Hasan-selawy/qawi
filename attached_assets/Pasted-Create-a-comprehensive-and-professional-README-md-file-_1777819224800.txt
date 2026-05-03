Create a comprehensive and professional README.md 
file for the entire Qawi project.

The README must be bilingual (English + Arabic).

Include these sections:

# Qawi - قوي | Smart Gym Management Platform

## Overview / نظرة عامة
Qawi is a production-ready multi-tenant SaaS platform 
for gym management, built for the Middle East market.
Arabic description here.

## Features / المميزات
List all features with emojis:
- 🏋️ Exercise library (70 exercises, 7 categories)
- 📅 Weekly/monthly workout scheduling
- 🥗 Nutrition plans
- 📊 Body measurements tracking
- 📍 Attendance + streak tracking
- 💬 Coach notes per exercise
- 💳 Subscription management
- 🌍 Full Arabic RTL support
- 🔔 Smart notifications
- 🎨 Custom branding per gym
- 📱 Mobile app (iOS + Android)
- 💻 Web dashboard

## User Roles / أدوار المستخدمين
- SUPER_ADMIN: manages entire platform
- GYM_ADMIN: manages their gym
- COACH: manages assigned members
- MEMBER: tracks workouts via mobile

## Tech Stack / التقنيات المستخدمة
Backend:
- Java 17 + Spring Boot 3
- PostgreSQL
- JWT Authentication
- Bucket4j rate limiting
- Spring Actuator health checks

Web Dashboard:
- React 18 + TypeScript
- Vite + Tailwind CSS
- Recharts for analytics
- Framer Motion animations
- Full RTL Arabic support

Mobile App:
- React Native + Expo SDK 51
- TypeScript
- Expo Router
- i18next translations
- Dark theme

Infrastructure:
- Docker + docker-compose
- Railway (backend hosting)
- Vercel (web hosting)
- Expo EAS (mobile builds)

## Project Structure / هيكل المشروع
qawi/
  qawi-backend/     (Spring Boot API)
  qawi-web/         (React dashboard)
  qawi-mobile/      (Expo mobile app)
  docker-compose.yml
  README.md

## Getting Started / البدء

### Prerequisites
- Java 17+
- Node.js 18+
- PostgreSQL 15+
- Docker (optional)

### Running with Docker (Recommended)
1. Clone the repository
2. Copy .env.example to .env
3. Fill in environment variables
4. Run: docker-compose up --build
5. Access:
   Web: http://localhost:80
   API: http://localhost:9000
   Health: http://localhost:9000/actuator/health

### Running Manually

Backend:
cd qawi-backend
mvn spring-boot:run

Web:
cd qawi-web
npm install
npm run dev

Mobile:
cd qawi-mobile
npm install
npx expo start

## Environment Variables / المتغيرات البيئية
DATABASE_URL=jdbc:postgresql://localhost:5432/qawi
DB_USERNAME=postgres
DB_PASSWORD=yourpassword
JWT_SECRET=your-256-bit-secret-key
PORT=9000
VITE_API_URL=http://localhost:9000/api/v1
EXPO_PUBLIC_API_URL=http://localhost:9000/api/v1

## Test Accounts / حسابات تجريبية
| Role | Email | Password |
|------|-------|----------|
| Super Admin | super@qawi.com | qawi_super_2024 |
| Gym Admin | admin@ironpeak.com | password123 |
| Coach | coach.jordan@ironpeak.com | password123 |
| Member | sam@ironpeak.com | password123 |

## API Reference / مرجع API

### Authentication
POST /api/v1/auth/login
POST /api/v1/auth/register  
GET  /api/v1/auth/me

### Public
POST /api/v1/public/register-gym
GET  /api/v1/public/plans
POST /api/v1/public/contact
POST /api/v1/public/check-email

### Exercises
GET  /api/v1/exercises/categories
GET  /api/v1/exercises/library
GET  /api/v1/exercises/library/{categoryId}
POST /api/v1/exercises/library

### Workouts
POST /api/v1/workouts
GET  /api/v1/workouts/member/{memberId}
GET  /api/v1/workouts/{planId}
POST /api/v1/workouts/{planId}/days
POST /api/v1/workouts/days/{dayId}/exercises
PUT  /api/v1/workouts/days/{dayId}/complete
POST /api/v1/workouts/logs

### Nutrition
POST /api/v1/nutrition
GET  /api/v1/nutrition/member/{memberId}
POST /api/v1/nutrition/{planId}/meals

### Attendance
POST /api/v1/attendance/checkin
GET  /api/v1/attendance/member/{memberId}
GET  /api/v1/attendance/member/{memberId}/streak

### Measurements
POST /api/v1/measurements
GET  /api/v1/measurements/member/{memberId}
GET  /api/v1/measurements/member/{memberId}/latest

### Admin
GET  /api/v1/admin/analytics
GET  /api/v1/admin/members
POST /api/v1/admin/members
PUT  /api/v1/admin/members/{id}/assign
PUT  /api/v1/admin/members/{id}/subscription
GET  /api/v1/admin/coaches
POST /api/v1/admin/coaches

### Super Admin
GET  /api/v1/super/gyms
POST /api/v1/super/gyms
PUT  /api/v1/super/gyms/{id}/subscription
PUT  /api/v1/super/gyms/{id}/features
GET  /api/v1/super/stats
GET  /api/v1/super/leads

## Subscription Plans / خطط الاشتراك
| Plan | Price | Members | Coaches |
|------|-------|---------|---------|
| Basic / الأساسية | 30 JOD/mo | 50 | 3 |
| Pro / الاحترافية | 60 JOD/mo | 200 | 10 |
| Enterprise / المؤسسية | 100 JOD/mo | Unlimited | Unlimited |

All plans include 14-day free trial.

## Deployment / النشر

### Backend → Railway
1. Connect GitHub repo to Railway
2. Set environment variables
3. Deploy automatically

### Web → Vercel
1. Connect GitHub repo to Vercel
2. Set VITE_API_URL environment variable
3. Deploy automatically

### Mobile → Expo EAS
1. Install EAS CLI: npm install -g eas-cli
2. Login: eas login
3. Build iOS: eas build --platform ios
4. Build Android: eas build --platform android
5. Submit: eas submit

## Health Check / فحص الصحة
GET /actuator/health
Returns: { "status": "UP", "database": "UP" }

## Rate Limiting / تحديد معدل الطلبات
- Login: 5 requests/minute per IP
- Register gym: 3 requests/hour per IP
- All endpoints: 100 requests/minute per user

## License / الرخصة
Private — All rights reserved
© 2026 Qawi - قوي

## Contact / التواصل
For business inquiries about Qawi platform,
contact us through the app registration page.