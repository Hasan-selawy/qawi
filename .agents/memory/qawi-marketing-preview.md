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

SEO "blocked from indexing" false alarm: Lighthouse/inspectors run against the **Replit dev/preview URL** report SEO failures like "Page is blocked from indexing" even though the code is correct (meta `robots=index,follow`, `robots.txt Allow: /`, canonical present). **Why:** the Replit dev/preview proxy injects an `X-Robots-Tag: noindex` response header on preview domains — it is NOT in the app's code and disappears on the real production domain (qawi.app). Do not "fix" it in code. Tell the user it is a preview-only header and verify the built `dist/public/index.html` meta robots + `robots.txt` instead.

Build/typecheck note: `qawi-marketing/vite.config.ts` throws unless both `PORT` and `BASE_PATH` env vars are set. Run builds as `PORT=5000 BASE_PATH=/marketing/ pnpm --filter @workspace/qawi-marketing run build`. Pre-existing TS errors in `src/components/ui/button-group.tsx` and `calendar.tsx` are unrelated shadcn issues and not imported by marketing pages.

SSG prerendering (the real FCP/LCP fix): the marketing page is a client-rendered Vite SPA, so the hero only paints after the JS bundle executes — that structurally caps Lighthouse Performance no matter how CSS/fonts are tuned. Fix = build-time static prerender. The `build` script chains three steps: client build → `vite build --ssr src/entry-server.tsx --outDir dist/server` → `node prerender.mjs` (renders the page to an HTML string and injects it into `dist/public/index.html`'s `<div id="root"></div>`). `entry-server.tsx` renders `<Marketing/>` directly (NOT `<App/>`) because wouter's Router/Switch/Route emit no DOM, so the server markup equals `<App/>`'s client output at "/". `main.tsx` hydrates when `#root` already has a child element, else falls back to `createRoot` (dev, where `#root` is empty).
**Why:** hydration requires the server HTML and the FIRST client render to be identical. Any browser-only state — language (localStorage/URL), prefers-reduced-motion, `Reveal` visibility, modal open — MUST start at a deterministic default and only update inside a `useEffect` after mount. Reading those in a `useState` initializer (as `useLanguage`/`useReducedMotion` originally did) produces a hydration mismatch.
**How to apply:** when editing marketing components, never read `window`/`localStorage`/`matchMedia` during render; do it in `useEffect`. The production serving path MUST match the build `BASE_PATH` (`/marketing/`) or wouter resolves to NotFound and hydration is wasted. SSG always serves English HTML first (Arabic switches after JS) — add a separate `?lang=ar` prerender only if Arabic first-paint SEO becomes a requirement.
