---
name: Notification push delivery (web + Expo)
description: Non-obvious constraints for the Spring Boot notification push fan-out — dependency gotcha, SSRF, and transaction boundaries.
---

# Notification push delivery

## web-push 5.1.1 needs BouncyCastle declared explicitly
`nl.martijndwars:web-push:5.1.1` references BouncyCastle in its API but does NOT
pull it in transitively, so the app fails at runtime unless
`org.bouncycastle:bcprov-jdk18on` is added to `pom.xml`. `WebPushService` registers
`BouncyCastleProvider` at init.
**Why:** the missing transitive dep is invisible at compile time; only surfaces when
VAPID is configured and a send is attempted.
**How to apply:** if upgrading/replacing web-push, re-verify bcprov is still present.

## User-supplied web push endpoints are outbound HTTP targets → SSRF
A browser Web Push `endpoint` is later POSTed to by the server. Any authenticated
user could register an internal/private URL and turn the server into an SSRF proxy.
`PushRegistrationService.assertSafeEndpoint` validates at registration: require
HTTPS, resolve the host, reject loopback/private/link-local/multicast/CGNAT/IPv6-ULA.
**Why:** caught in architect review of the notification backend.
**How to apply:** any new "register a URL we'll call later" feature needs the same
private-IP rejection.

## Push fan-out runs AFTER commit, outside any DB transaction
`NotificationService.dispatch` schedules push via
`TransactionSynchronization.afterCommit` (with a no-transaction fallback) so HTTP
never runs inside the DB tx and never fires for rolled-back rows. The push send
methods (`WebPushService.sendToUser`, `ExpoPushService.sendToUser`) are deliberately
NOT `@Transactional` — they must not hold a pooled DB connection during network I/O.
Stale-subscription/token deactivation happens via individual repo saves (each its own
short tx).
**Why:** wrapping outbound HTTP in a tx starves the connection pool under broadcasts.
**How to apply:** keep push send methods non-transactional; do DB cleanup as small
discrete saves after the HTTP response.

## VAPID degrades gracefully when keys absent
Env: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`. When unset,
`WebPushService` logs "Web Push disabled" and is a no-op; `GET /api/v1/notifications/
vapid-public-key` returns `{"publicKey":null}`. Secrets can only be stored by the user
(tooling can't set secrets) — request via the environment-secrets skill.
