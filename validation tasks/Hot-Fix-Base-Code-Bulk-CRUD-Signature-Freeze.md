# Hot Fix Base Code - Bulk CRUD Signature Freeze

Last updated: 2026-03-20
Owner: ORM core maintainers
Status: IN PROGRESS

## Purpose

Freeze one bulk CRUD signature set before runtime implementation starts.
This avoids ambiguous public API rollout during the base-code hot fix.

## Frozen target signatures

- `await User.createMany([{ ... }, { ... }])`
- `await User.updateMany([1, 2], { status: "inactive" })`
- `await User.patchMany([{ id: 1, email: "a@example.com" }, { id: 2, email: "b@example.com" }])`
- `await User.deleteMany([1, 2])`
- `await User.restoreMany([1, 2])`

## Contract rules

- `createMany(...)` returns hydrated model instances in the same order as input rows.
- `updateMany(...)` applies one validated payload to an explicit list of primary keys.
- `patchMany(...)` applies per-row partial payloads and each item must include the primary key.
- `deleteMany(...)` and `restoreMany(...)` operate on explicit primary-key lists only.
- No alternate overloads ship during the hot fix.

## Non-Goals

- No implicit filter-based bulk mutation API in this slice.
- No raw SQL bulk helpers.
- No generated template changes until runtime support exists.

## Exit Criteria

- Checklist and Step 02/03 docs reference the same bulk signatures.
- A focused logic test locks the frozen signatures and contract rules.
- Runtime implementation can proceed without re-deciding the public shape.
