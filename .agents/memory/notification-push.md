---
name: Notification push delivery (web + Expo)
description: Non-obvious constraints for the Spring Boot notification push fan-out — dependency gotcha, SSRF, transaction boundaries, graceful degradation.
---

# Notification push delivery

## web-push needs BouncyCastle declared explicitly
`nl.martijndwars:web-push` references BouncyCastle in its API but does NOT pull it
in transitively, so the app fails at runtime (not compile time) unless
`org.bouncycastle:bcprov-jdk18on` is in `pom.xml`; the service registers
`BouncyCastleProvider` at init.
**Why:** the missing transitive dep is invisible at compile time; only surfaces when
VAPID is configured and a send is attempted.
**How to apply:** if upgrading/replacing web-push, re-verify bcprov is still present.

## User-supplied web push endpoints are outbound HTTP targets → SSRF
A browser Web Push `endpoint` is a URL the server later POSTs to. Any authenticated
user could register an internal/private URL and turn the server into an SSRF proxy.
Validate at registration: require HTTPS, resolve the host, reject
loopback/private/link-local/multicast/CGNAT/IPv6-ULA.
**Why:** caught in architect review of the notification backend.
**How to apply:** any new "register a URL we'll call later" feature needs the same
private-IP rejection.

## Push fan-out runs AFTER commit, outside any DB transaction
Dispatch schedules push via `TransactionSynchronization.afterCommit` (with a
no-transaction fallback) so HTTP never runs inside the DB tx and never fires for
rolled-back rows. The push send methods are deliberately NOT `@Transactional` — they
must not hold a pooled DB connection during network I/O. Stale subscription/token
deactivation happens via individual short saves.
**Why:** wrapping outbound HTTP in a tx starves the connection pool under broadcasts.
**How to apply:** keep push send methods non-transactional; do DB cleanup as small
discrete saves after the HTTP response.

## Don't lazily create config rows in the dispatch hot path
The per-gym ADMIN_ALERT gate reads the gym setting with a read-only accessor that
defaults to the entity's default (enabled) when no row exists — it does NOT call the
lazy `getOrCreate`. Creating a row as a side effect of sending a notification opens a
first-writer race under concurrent first dispatches for the same gym (unique
constraint → dropped notification).
**Why:** flagged in architect review; the hot path is high-concurrency.
**How to apply:** in any read-path gate, prefer a read-only "value-or-default" lookup
over `getOrCreate`; keep lazy creation on explicit user/admin write paths only.

## VAPID degrades gracefully when keys absent
When the VAPID env keys are unset the web-push service logs that it is disabled and
becomes a no-op, and the public-key endpoint returns a null key (clients skip browser
push). Secrets can only be stored by the user (tooling can't set them) — request via
the environment-secrets skill rather than re-prompting each session.
