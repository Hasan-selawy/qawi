---
name: Mobile API wakeup handling
description: Replit wakeup interstitial + Spring Boot startup returns HTML for up to ~30s; apiFetch must retry long enough and surface a friendly message.
---

## The problem
When the Replit workspace wakes from sleep OR Spring Boot restarts, the first
10–30 seconds of requests to `https://{REPLIT_DEV_DOMAIN}/api/v1/...` return
the Replit HTML wakeup interstitial (HTTP 200 with `<!DOCTYPE html>` body).
The original retry window (12.5s, 5 retries) was too short, causing the mobile
login screen to show a raw "Server returned non-JSON response" error with HTML.

## The fix (services/api.ts)
- `isHtmlBody()` detects HTML responses
- Retry loop extended to 10 retries with backoff [1s,1.5s,2s,2.5s,3s,3.5s,4s,4.5s,5s,5s] = ~32.5s total
- After exhausting retries, throws `ApiError` with sentinel `error: "__SERVER_WARMING_UP__"`

## Login screen handling (app/(auth)/login.tsx)
- Checks `e?.body?.error === "__SERVER_WARMING_UP__"` and shows bilingual message:
  EN: "Server is warming up. Please wait a moment and try again."
  AR: "الخادم يبدأ تشغيله، يرجى الانتظار لحظة والمحاولة مجدداً."
- Network errors (no status number) → "Cannot reach server. Check your internet connection."

## Also fixed
- `ContactSheet` in login.tsx was using `fetch('/api/v1/public/contact', ...)` — a relative
  URL that won't work in React Native (no base URL). Changed to `apiFetch('/public/contact', { method: 'POST', data: ... })`.

**Why:** React Native `fetch` has no implicit base URL; relative URLs throw network errors.
Expo `process.env.EXPO_PUBLIC_*` vars are baked at Metro bundle time via the dev script
`EXPO_PUBLIC_DOMAIN=$REPLIT_DEV_DOMAIN`, so `API_BASE = "https://{REPLIT_DEV_DOMAIN}/api/v1"` is correct.
