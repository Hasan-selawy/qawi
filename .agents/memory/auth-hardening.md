---
name: Auth hardening (Qawi)
description: Non-obvious gotchas for the Qawi login lockout + refresh-token rotation security features.
---

# Auth hardening gotchas

## Per-IP rate limiter masks the per-email account lockout in tests
The login rate limiter is per-IP (5/min) and resolves the client IP from the
first `X-Forwarded-For` entry (falling back to remote addr). The brute-force
account lockout is per-email. When testing lockout from one machine, the rate
limiter fires (429 "Too many requests. Please slow down.") before 5 failures ever
reach the service, so the lockout never accumulates and you observe the wrong 429.

**How to apply:** to exercise the lockout in isolation, send each failed attempt
with a distinct `X-Forwarded-For` IP — the rate-limit buckets stay separate while
the email-keyed lockout still accumulates. The lockout 429 carries a different
message ("Too many failed login attempts...").

## Refresh-token rotation must be atomic to be single-use
Read-then-write rotation (load token → check active → save revoked + save
replacement) has a TOCTOU race: two concurrent refreshes with the same token can
both pass the check and both mint replacements.

**Why:** rotation exists to bound a stolen token's replay window; a race defeats it.

**How to apply:** gate rotation on a single conditional
`UPDATE ... SET revoked = true WHERE token_hash = ? AND revoked = false AND expires_at > now`
and only mint the replacement when it reports 1 row updated. Under READ COMMITTED
the row serializes, so exactly one caller wins; the loser updates 0 rows → 401.
