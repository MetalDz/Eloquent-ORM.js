# Mongo SRV DNS Hardening Plan

Last updated: 2026-03-11
Status: DONE

## Goal
- Stabilize MongoDB SRV connection behavior for environments where Node DNS resolution fails even when system `nslookup` works.
- Keep Mongo integration first-class without weakening existing SQL behavior.

## Problem
- `mongodb+srv://...` can fail in Node with:
  - `querySrv ECONNREFUSED _mongodb._tcp.<cluster>`
- This can happen even when system DNS tools resolve the SRV records correctly.
- Result: Mongo runtime parity exists in code, but real local execution can still fail before auth/database logic.

## Implemented
- Added optional Mongo DNS override env parsing in:
  - `src/config/dbRoleEnv.ts`
- Wired Mongo config through:
  - `src/config/database.ts`
- Applied Mongo-only DNS override for SRV URIs in:
  - `src/core/connection/DatabaseConnection.ts`
- Normalized common Mongo runtime failures into actionable messages:
  - SRV/DNS lookup failure guidance
  - Atlas auth failure guidance

## New Env Contract
- Runtime:
  - `MONGO_DNS_SERVERS=8.8.8.8,1.1.1.1`
- Test:
  - `MONGO_TEST_DNS_SERVERS=8.8.8.8,1.1.1.1`
- Role-aware variants also resolve:
  - `MONGO_RUNTIME_DNS_SERVERS`
  - `MONGO_MIGRATION_DNS_SERVERS`
  - `MONGO_TEST_RUNTIME_DNS_SERVERS`
  - `MONGO_TEST_MIGRATION_DNS_SERVERS`

## Acceptance Criteria
- SRV Mongo URIs can use explicit DNS servers when configured.
- Plain `mongodb://` URIs do not apply SRV DNS override logic.
- Common Mongo connect failures produce actionable diagnostics.
- Existing Mongo validation/runtime tests still pass.
- SQL driver behavior remains unchanged.

## Validation
- Added runtime test:
  - `src/lab_test/nosql.mongo.dns.runtime.logic.test.ts`
- Added env coverage assertions in:
  - `src/lab_test/branch.coverage.100.phase24.utilities-and-env.logic.test.ts`

## Notes
- This hardening addresses SRV lookup/runtime reachability only.
- Atlas `8000 bad auth` remains a separate credential/role issue.
