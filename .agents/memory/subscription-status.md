---
name: Subscription grace/lock status
description: How member subscription status + the grace-period access lock are modeled, and where to plug in new surfaces.
---

# Subscription status & grace-period lock

Member subscription status is **computed, never persisted**. The single source of
truth is `com.qawi.service.SubscriptionStatusUtil` (`compute()`,
`isLockedForAccess()` — MEMBER-only, `graceCutoff(today) = today - GRACE_PERIOD_DAYS`).
There is a grace window (3 days) after the end date during which a member still has
full access; only `end < graceCutoff` locks (login + per-request via JwtAuthFilter).

**Why computed:** renewing the subscription to a future end date must instantly
restore access with no migration/background job. Do not add a DB status column.

**How to apply (any NEW surface that shows or gates on subscription status):**
- Route through `SubscriptionStatusUtil` (same `com.qawi.service` package — no import).
  Use `graceCutoff(today)` for the "expired/locked" threshold, NOT raw
  `end.isBefore(today)`.
- **Per-member status LABELS** (what a single member shows / alerts) must be
  grace-aware: a grace member is accessible and must never be labeled
  EXPIRED/locked — map them to the existing "expiring/needs-renewal" presentation
  so no frontend change is needed.
- **Aggregate count buckets / revenue / analytics** that are a strict binary
  active-vs-expired have NO slot for a 3rd grace state — reclassifying grace there
  makes members vanish from totals (looks like a bug). Leave those raw unless the
  bucketing is an N-way partition that still covers everyone (e.g. finance
  active/expiring/expired: there, route grace → expiring to keep totals intact).

Frontend mirrors this in `artifacts/qawi-web/src/lib/sub-status.ts`
(`GRACE_PERIOD_DAYS`, `getSubStatus`); web computes status client-side from
`subscriptionEndDate` rather than a server field. `differenceInDays` against date-only
values aligns exactly with Java `LocalDate` at the grace boundary.
