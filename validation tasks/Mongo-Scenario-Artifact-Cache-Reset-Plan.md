# Mongo Scenario Artifact Cache Reset Plan

## Goal
- Make `make:scenario --force --mongo --run` reliable when stale SQL scenario artifacts were loaded earlier in the same CLI process.

## Problem
- Scenario generation deletes and rewrites model/factory/seeder files in one process.
- Node `require` cache can keep old SQL `User` / `Post` / `Comment` factories and models alive.
- The inline `db:seed` step then classifies the regenerated Mongo scenario seeder against stale SQL classes.

## Fix
- Clear `require.cache` for all managed scenario models, factories, pivot factories, and seeders:
  - after force cleanup
  - again after regeneration, before migrations/seeding

## Acceptance
- A cached SQL `BlogScenarioSeeder` path can be replaced by a Mongo scenario in the same process.
- Storage detection for the regenerated seeder resolves to `mongo`.
