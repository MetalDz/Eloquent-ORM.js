# Mongo CLI Scenario Runtime Parity Plan

## Goal
- Push Mongo support higher than model/mixin parity and validate the real CLI scenario path.
- Keep `demo:scenario --mongo` aligned with the actual morph aliases and persisted Mongo document shape.

## Scope
- `demo:scenario --test --mongo --random`
- `make:scenario blog --test --mongo --run --force`
- Live Mongo pack-smoke assertions for seeded blog scenario counts

## Required runtime fixes
- Resolve `User` / `Post` morph aliases from app/test model files for Mongo the same way the SQL scenario path does.
- Count favorite posts with `id` / `_id` fallback because Mongo records are naturally persisted under `_id`.

## Acceptance
- Mongo `demo:scenario` reports seeded blog counts without SQL-adapter fallback.
- Morph comment counts use model morph aliases instead of hardcoded `"users"` / `"posts"`.
- Pack-smoke includes the Mongo scenario lifecycle, not just generic GeoLocation smoke.
