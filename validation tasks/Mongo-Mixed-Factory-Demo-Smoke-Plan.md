# Mongo Mixed Factory + Demo Smoke

Last updated: 2026-03-11  
Status: COMPLETE

## Goal
- Prove that Mongo-targeted CLI inspection/runtime commands keep working correctly when SQL and Mongo artifacts coexist in the same package sample.

## Scope
- `factory:status --test --mongo`
- `demo:scenario --test --mongo`
- packaged smoke coverage
- mixed SQL/Mongo factory visibility

## Completed
- [x] Tarball smoke now runs `factory:status --test --mongo --details`.
- [x] Tarball smoke asserts Mongo-only filtering in a mixed sample:
  - includes `GeoLocationFactory`
  - excludes `UserFactory`
- [x] Tarball smoke now runs `demo:scenario --test --mongo --random`.
- [x] Mongo demo smoke asserts:
  - command succeeds
  - missing `users` data is handled gracefully
  - no SQL-adapter error leaks into Mongo runtime
- [x] Added focused logic coverage for loader + `factoryStatus()` under `storageKind: "mongo"`.

## Files
- `scripts/pack-smoke.js`
- `src/lab_test/nosql.phase9.runtime-demo-factory-status.logic.test.ts`

## Validation
- targeted Jest run for the new phase 9 contract
- existing NoSQL pack-smoke contract still passes
- `npm run typecheck`
- `npm run build`

## Notes
- This slice does not change Mongo data semantics; it validates command routing and mixed-artifact filtering only.
- `demo:scenario --mongo` remains a blog-style relation diagnostic. On a GeoLocation-only Mongo sample it should exit cleanly with zero-count output and a no-users message.
