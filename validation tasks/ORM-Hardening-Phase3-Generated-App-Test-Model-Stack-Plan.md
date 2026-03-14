# ORM Hardening Phase 3: Generated App and Test Model Stack Plan

Last updated: 2026-03-14  
Status: COMPLETED

## Goal
- Validate that `make:model` output in both app and test trees inherits the same default `BaseModel` runtime surface.

## Scope
- Cover generated app SQL models.
- Cover generated app Mongo models.
- Cover generated test SQL models.
- Cover generated test Mongo models.
- Validate both generated file imports and loaded runtime behavior.

## Implemented
- Added a dedicated regression test that generates real app/test model files through `make:model`.
- Verified app/test relative imports to `BaseModel` and `SchemaBlueprint`.
- Verified generated SQL/Mongo models load through `tsRuntime`.
- Verified generated instances expose `fill()`, `save()`, `patch()`, `toObject()`, `toJSON()`, and eager-loading helpers.
- Verified generated constructors expose safe-finder statics such as `where()`, `with()`, `findBy()`, and `existsBy()`.

## Acceptance Criteria
- Generated app and test models load successfully without manual edits.
- SQL and Mongo generated models both inherit the default `BaseModel` stack.
- The generated import paths for app and test trees remain correct and drift is caught by tests.
