# Mongo Scenario Generator Type Parity Plan

## Goal
- Keep `make:scenario --mongo --run` on the Mongo path end to end.

## Problem fixed
- Generated Mongo scenario models used raw relation objects in `static schema`.
- TypeScript widened `kind` / `relation` to plain strings, which broke schema typing and downstream artifact introspection.
- As a result, Mongo scenario seeders could be misclassified as incompatible during `db:seed`.

## Fix
- Generate relation entries with the typed `relation(...)` builder.
- Keep generated Mongo scenario models loadable by TypeScript runtime tooling.

## Acceptance
- Generated Mongo scenario model files import `relation`.
- Generated Mongo scenario seeders resolve to storage kind `mongo`.
- Live `make:scenario --mongo --run` no longer fails on seeder compatibility/type errors.
