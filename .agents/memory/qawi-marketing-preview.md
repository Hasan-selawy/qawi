---
name: Qawi marketing app preview port
description: Where the qawi-marketing artifact is served/previewed, and its build env requirement
---

# Qawi marketing preview & build

The `artifacts/qawi-marketing` Vite dev server is previewed at **external port 5173**, path **`/marketing/`** — NOT port 5000. Port 5000 is the `qawi-web` dashboard (its wouter router returns the NotFound page for `/marketing/`).

**Why:** screenshotting `/marketing/` on the default port (5000) shows qawi-web's 404, not the marketing site. Use `port: 5173` for the app_preview screenshot.

**How to apply:** when screenshotting or testing the marketing landing page, use path `/marketing/` (or `/marketing/?lang=ar` for RTL) at port 5173.

QA/Lighthouse note: there is **no headless Chrome/Chromium on PATH** in this environment, so Lighthouse cannot be run directly for Performance/SEO scores. Do a manual audit against the known Lighthouse checks (render-blocking fonts → load Google Fonts async via `media="print" onload`, single H1, meta description, valid hreflang/canonical, structured-data URLs that don't 404, `aria-hidden` decorative mockups, no `maximum-scale<5` in viewport). The `app_preview` screenshot tool captures at ~1280px only — it cannot verify 375px mobile layout, so rely on responsive class review + an `overflow-x: clip` safety net (use `clip` not `hidden` so the sticky navbar still works).

HMR false-alarm pattern: when you rename or add a field shared between `src/locales/content.ts` and a consumer component (e.g. renaming stats `label` → `title`/`subtitle`, or restructuring an array), Vite hot-updates the two files a few hundred ms apart. In that window the consumer reads a field that is briefly `undefined`, producing transient console errors like "Each child should have a unique key" or "Cannot read properties of undefined (reading 'items')". These are NOT real bugs. Confirm by restarting the `artifacts/qawi-marketing: web` workflow and re-checking console on a fresh load — the warnings disappear once both modules are in sync.

Build/typecheck note: `qawi-marketing/vite.config.ts` throws unless both `PORT` and `BASE_PATH` env vars are set. Run builds as `PORT=5000 BASE_PATH=/marketing/ pnpm --filter @workspace/qawi-marketing run build`. Pre-existing TS errors in `src/components/ui/button-group.tsx` and `calendar.tsx` are unrelated shadcn issues and not imported by marketing pages.
