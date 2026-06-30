---
name: Qawi marketing app preview port
description: Where the qawi-marketing artifact is served/previewed, and its build env requirement
---

# Qawi marketing preview & build

The `artifacts/qawi-marketing` Vite dev server is previewed at **external port 5173**, path **`/marketing/`** — NOT port 5000. Port 5000 is the `qawi-web` dashboard (its wouter router returns the NotFound page for `/marketing/`).

**Why:** screenshotting `/marketing/` on the default port (5000) shows qawi-web's 404, not the marketing site. Use `port: 5173` for the app_preview screenshot.

**How to apply:** when screenshotting or testing the marketing landing page, use path `/marketing/` (or `/marketing/?lang=ar` for RTL) at port 5173.

Build/typecheck note: `qawi-marketing/vite.config.ts` throws unless both `PORT` and `BASE_PATH` env vars are set. Run builds as `PORT=5000 BASE_PATH=/marketing/ pnpm --filter @workspace/qawi-marketing run build`. Pre-existing TS errors in `src/components/ui/button-group.tsx` and `calendar.tsx` are unrelated shadcn issues and not imported by marketing pages.
