---
name: Staff gymId seeder bug
description: V3DataSeeder assigned RECEPTIONIST/ACCOUNTANT/HR to wrong gym due to non-deterministic findFirst(); how to detect and fix.
---

## The Bug
`V3DataSeeder.run()` used `gymRepository.findAll().stream().findFirst()` to locate the gym.
When multiple gyms exist (e.g. from test registrations), this returned a random gym — not "Iron Peak Gym".
Result: RECEPTIONIST, ACCOUNTANT, HR all had `gym_id` pointing to a different gym than the actual members, causing empty results for all member/lead queries.

## Symptom
- RECEPTIONIST logs in successfully (correct JWT, `isActive=true`)
- `GET /api/v1/reception/members/search` returns empty list
- `GET /api/v1/gym/leads` returns empty list
- No 403 errors — just empty data

## Root cause confirmation
```sql
SELECT email, role, gym_id FROM users
WHERE role IN ('RECEPTIONIST','ACCOUNTANT','HR');
-- All three show a different gym_id than GYM_ADMIN and MEMBERs
```

## Fix Applied
1. **GymRepository**: added `Optional<Gym> findByName(String name)`
2. **V3DataSeeder**: changed gym lookup to `findByName("Iron Peak Gym").or(() -> findAll().stream().findFirst())`
3. **V3DataSeeder**: added `healStaffGymId(gym)` self-heal step that runs on every startup and re-assigns any of the 3 staff users whose `gymId` doesn't match the correct gym
4. **DB hotfix**: ran `UPDATE users SET gym_id = '1a5551ec...' WHERE email IN (...)`

**Why:** `findAll()` returns rows in storage order which can vary; always look up seeder-specific gym by name.
**How to apply:** Any future seeder that targets a named gym (Iron Peak, etc.) must use `findByName` not `findFirst`. Add a self-heal step for critical user-gym associations.
