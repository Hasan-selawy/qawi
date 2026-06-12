---
name: Mobile API URL env configuration
description: How the Expo mobile app's API base URL is configured and common pitfall
---

**Rule**: `EXPO_PUBLIC_API_URL` in `artifacts/qawi-mobile/.env` must NOT include `:9000`. All traffic should route through the Replit shared proxy at port 80, not directly to Spring Boot.

**Correct**: `https://<domain>/api/v1`
**Wrong**: `https://<domain>:9000/api/v1`

**Why**: Replit's shared proxy routes `/api/v1` → Spring Boot port 9000 internally. Direct port access bypasses the proxy and breaks in published/deployed environments.

**How to apply**: Any time the mobile .env is updated or a new EXPO_PUBLIC_API_URL is set, verify no port suffix is present.
