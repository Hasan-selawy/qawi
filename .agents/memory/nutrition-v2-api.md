---
name: Nutrition V2 API conventions
description: Field naming, endpoint paths, and response shapes for the NutritionV2 system
---

## Endpoints (all under /api/v1/nutrition)
- `POST /nutrition/calculate` — body: `{foodName, quantity, unit}` → returns `{foodName, foodNameAr, calories, protein, carbs, fat, fiber, sugar, confidence}`
- `POST /nutrition/log/manual` — body: `{memberId, foodName, foodNameAr, mealType, quantity, unit, calories, protein, carbs, fat, fiber, sugar}` (NOT proteinG/carbsG/fatG)
- `GET  /nutrition/log/today/{memberId}` — returns today's log (see shape below)
- `DELETE /nutrition/log/{entryId}` — removes a log entry
- `POST /nutrition/water` — body: `{memberId, amount}` where amount is **liters** (NOT amountMl)
- `POST /nutrition/targets` — creates target; body uses `targetCalories/targetProtein/targetCarbs/targetFat/targetWater`
- `PUT  /nutrition/targets/{memberId}` — updates target; same body as POST
- `GET  /nutrition/staff/overview/{memberId}` — staff/coach member overview
- `GET  /nutrition/log/history/{memberId}` — returns `[{date, totalCalories, totalProtein, goalMet, targetCalories}]` (already aggregated, NOT flat entries)
- `GET  /nutrition/staff/members` — list of members with nutrition status for staff view

## Today Log Response Shape
```json
{
  "date": "2026-06-12",
  "target": { "targetCalories": 2000, "targetProtein": 150, "targetCarbs": 250, "targetFat": 65, "targetWater": 2.0 },
  "entriesByMeal": { "BREAKFAST": [...], "LUNCH": [...], "DINNER": [...], "SNACK": [...] },
  "totals": {
    "calories": { "consumed": 500, "target": 2000, "remaining": 1500, "percentage": 25 },
    "protein":  { "consumed": 40, "target": 150, "remaining": 110, "percentage": 27 },
    "carbs":    { "consumed": 60, "target": 250, "remaining": 190, "percentage": 24 },
    "fat":      { "consumed": 15, "target": 65, "remaining": 50, "percentage": 23 },
    "water":    { "consumed": 0.5, "target": 2.0, "remaining": 1.5, "percentage": 25 }
  }
}
```

## Staff Overview Response Shape
```json
{
  "memberId": "...", "name": "...", "email": "...",
  "target": { "targetCalories": 2000, ... },
  "hasTarget": true,
  "today": { /* same shape as today log response */ },
  "last7Days": [...],
  "adherence7Days": 57,
  "weeklyAvgCalories": 1800,
  "weeklyAvgProtein": 120,
  "suggestions": [...]
}
```

## Key naming differences vs old /nutrition/v3 API
- `calories` → `targetCalories` (in target object)
- `proteinG`/`carbsG`/`fatG` → `targetProtein`/`targetCarbs`/`targetFat`
- `waterMl` (target) → `targetWater` in liters
- `totals.calories` (number) → `totals.calories.consumed` (nested object)
- `data.waterMl` → `data.totals.water.consumed * 1000`
- `data.entries` (flat array) → `data.entriesByMeal` (map keyed by meal type)
- Water POST body: `{amountMl}` → `{amount}` in liters

## Web routing
- COACH nutrition link in Sidebar → `/nutrition/dashboard` (not `/coach/nutrition`)
- `/nutrition/dashboard` RoleRoute allows: NUTRITIONIST, GYM_ADMIN, COACH, SUPER_ADMIN
- `/member/nutrition` RoleRoute allows: MEMBER

**Why:** V2 uses nested totals so clients can show remaining/percentage without calculation, and water is stored in liters for consistency with target. Old /v3 was a prototype with inconsistent naming.
