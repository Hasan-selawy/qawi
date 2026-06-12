---
name: Nutrition V2 system endpoints
description: Key endpoint paths and entity relationships for the NutritionV2 system
---

**Food search**: `GET /api/v1/nutrition/search?q=<query>` — NutritionV2Controller line 56; returns cached ArabicFoodCache entries with nameAr, name, caloriesPer100g, servingSize, servingUnit.

**Calendar plan routes** (all under /api/v1/nutrition/calendar-plans):
- `POST /` — create plan + auto-generate days
- `GET /member/{memberId}` — list plans for member
- `GET /{planId}` — plan detail with days and per-day status
- `DELETE /{planId}` — deactivate plan
- `GET /days/{dayId}` — day detail with suggestions
- `PUT /days/{dayId}` — update day targets/notes
- `POST /days/{dayId}/suggestions` — add suggestion to day
- `DELETE /suggestions/{suggestionId}` — remove suggestion

**Route conflict**: old NutritionController owns /api/v1/nutrition/plans (workout-linked meal plans). Calendar plans use /calendar-plans to avoid collision.

**todayPlanDay**: included in `GET /api/v1/nutrition/log/today/{memberId}` response when active calendar plan exists for today. Resolves from NutritionPlanDayRepository.findActiveplanDayForMemberAndDate().

**Why:** route conflict was a real issue during development — /plans was already taken. Future endpoints must use /calendar-plans prefix.
