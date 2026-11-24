# Audit Progress Checkpoint

Last updated: 2026-11-24 â€” **COMPLETE**

| Module | Status |
|--------|--------|
| Docs verification | done |
| Backend security/config/filter | done |
| Backend controllers + auth matrix | done |
| Backend services/repos/entities | done |
| Clients (web/mobile/api-server/lib) | done |
| Infra/CI/Docker/git hygiene | done |
| Tooling (`pnpm typecheck`) | done (mvn unavailable) |
| `AUDIT_REPORT.md` | **done** |

Next agent: implement Phase 0 fixes from `AUDIT_REPORT.md`, starting with SEC-001â€“SEC-004 and SEC-006. Do not treat this progress file as authoritative once the report exists.

## Phase 0 implementation — Codex 2026-11-24

Implemented Phase 0 code only. See `.planning/quick/261124-enj-implement-audit-report-phase-0-only/SUMMARY.md` for changes and evidence, and `qawi-backend/PHASE0_DEPLOYMENT.md` for rollout prerequisites. Final clean backend build: 36 tests passed; one optional schema exporter skipped. Typecheck, storage regression, Git hygiene, packaged-JAR checks, and isolated production-profile startup passed. No existing user/staging/production database was modified. Live staging baseline/data review remains an operator rollout step. Phase 1/2 findings remain open. Changes are uncommitted and preserve unrelated staged work.

## Phase 2 implementation — Codex 2026-11-24

Phase 2 code and isolated verification are complete; Phase 1 remains open. Canonical nutrition/adapters, real OpenAPI/generated clients, Node-sidecar retirement, exact monetary persistence, privacy controls, sanitized observability/recovery tooling, and durable idempotent mobile attendance are implemented. See `.planning/quick/261124-f6i-implement-audit-phase-2-only/SUMMARY.md` for results and `qawi-backend/PHASE2_DEPLOYMENT.md` for the migration/operating procedure. Full backend suite: 49 passed, one optional export skipped; focused rechecks, 8 queue tests, typecheck, web build, Android export, client generation, backup/restore and restored-app smoke passed. Automatic retention stays disabled as the conservative default selected with the user. No live deployment/migration or external account setup occurred; legacy V1 contraction requires compatibility evidence.


## Phase 4 infrastructure audit - Codex 2026-11-24

Completed the read-only infrastructure phase defined in AUDIT_PROMPT.md section 4. Appended the current-workspace addendum to AUDIT_REPORT.md, preserving the original audit and Phase 0/2 implementations. Coverage spans 49 source/config files including deployment/tooling support.

Recorded 14 prioritized findings (3 High, 9 Medium, 2 Low). Reproduced the malformed-Host preview-server crash, unsafe forwarded-host HTML substitution, new-file drift gate omission, optimized Python disabling smoke safety, blank-template Compose failure and retired database-selector no-op. Tests used isolated fixtures and loopback; smoke SQL was intercepted and never executed. Fresh JS audit metadata reports 13 critical, 92 high, 54 moderate, 15 low; production exploitability was not established. Workspace typecheck, 8 queue tests, existing contract consistency, syntax and hygiene passed. Container runtime/build verification was unavailable because the Docker engine is stopped. No source fixes, dependency upgrades, live changes or commits occurred. See report addendum for evidence, concrete fixes and verification limits.


## Phase 5 cross-cutting audit - Codex 2026-11-24

Completed Phase 5 from AUDIT_PROMPT.md only: duplication, backend/client contract drift and dead code. Appended 13 findings (4 High, 8 Medium, 1 Low), targeted 129-file inspection ledger, structural coverage and checks to AUDIT_REPORT.md. Preserved all earlier audit/implementation work.

Inventoried 296 apiFetch + 7 raw fetch calls in 72 files, compared 65 inline DTO bodies and traced import reachability and generated contracts. Disposable H2 reproduced dropped rest/template flags, ABSENT persisted as PRESENT, lead email lost, inactive status disagreement, missing admin routes returning 500 and finance estimated 200.000 vs recorded 125.000. Isolated JS/type probes confirmed price truncation, generated schema errors, repeated mutation after HTML and incorrect finance-export token extraction. Classified obsolete web pages separately from compatibility/framework code. Fresh focused backend tests: 6 passed; queue tests: 8 passed; workspace typecheck and fresh contract consistency passed. No source fixes, dependency changes, live database/hosting/device actions, commits or deployment. See addendum for fix order, evidence and limits.
