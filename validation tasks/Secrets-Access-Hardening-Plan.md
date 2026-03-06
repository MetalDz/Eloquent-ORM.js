# Secrets and Access Hardening Plan

Last updated: 2026-03-06

## Goal
- Close Production Readiness Step 3:
  - enforce secret redaction in CLI/core surfaced logs/errors
  - define runtime vs migration DB user env contract (least privilege)

## Implementation Checklist
- [x] Added shared secret redaction utility:
  - `src/core/security/SecretRedactor.ts`
- [x] Applied redaction in CLI log wrappers:
  - `src/cli/eloquent.ts`
- [x] Applied redaction in core connection close-error logging:
  - `src/core/connection/ConnectionFactory.ts`
- [x] Added DB role env resolver contract:
  - `src/config/dbRoleEnv.ts`
- [x] Wired role-aware env resolution in DB config:
  - `src/config/database.ts`
- [x] Added least-privilege guidance doc:
  - `src/documentation/db-least-privilege-env-contract.md`
- [x] Added tests:
  - `src/lab_test/cli.secret.redaction.logic.test.ts`
  - `src/lab_test/db.user.role.separation.logic.test.ts`

## Test Evidence
- Run:
  - `npm.cmd test -- --runTestsByPath src/lab_test/cli.secret.redaction.logic.test.ts src/lab_test/db.user.role.separation.logic.test.ts`
- Expected:
  - `PASS`
- Result:
  - `PASS` (2/2 suites).
