---
name: Nutrition V2 seed gap
description: How DataSeeder handles new-role seed users when the DB already has data.
---

## Rule
`DataSeeder.run()` has an early-return guard (`if (userRepository.count() > 0)`) that prevents
the full initial seed from running again. Any new role-based user (NUTRITIONIST, etc.) that needs
to be seeded on an already-live DB must be added as its own idempotent `seedXIfMissing()` method
called from inside that early-return block — alongside `seedSuperAdminIfMissing()`.

**Why:** The initial full seed only runs once (empty DB). Every subsequent boot skips it. Missing
this means the new role user never gets created in development or staging, blocking all testing.

**How to apply:** When adding a new gym-scoped role seed, look up the gym with
`gymRepository.findAll().stream().filter(g -> "Iron Peak Gym".equals(g.getName())).findFirst()`
since the gym ID is not stored as a constant.
