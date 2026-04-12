# Transaction-Scoped ORM Helpers Plan

Last updated: 2026-04-12  
Status: COMPLETE

## Goal

- Add ORM-native helpers on top of `transaction(...)` so race-sensitive business flows do not have to drop to raw SQL for common model work.
- Keep transaction scope explicit while making model reads and writes transaction-aware.
- Preserve a raw `tx.execute(...)` fallback for truly SQL-specific or driver-specific operations.

## Problem Summary

- `transaction(...)` and `lockedTransaction(...)` now exist, but application code still has to use raw SQL for common transaction-bound model operations.
- High-concurrency flows like scheduling slot claims, pharmacy stock reservation, and financial allocation need:
  - one shared transaction context
  - transaction-bound model reads
  - transaction-bound model writes
  - optional row-lock semantics
- Without ORM-native helpers, the runtime contract is correct but the application ergonomics are still too low-level.

## Target API

- Transaction-bound model scope:
  - `Model.useTransaction(tx)`
  - `instance.useTransaction(tx)`
- Transaction-aware finder and write helpers:
  - `.where(field, value)`
  - `.first()`
  - `.get()`
  - `.create(data)`
  - `.save()`
  - `.delete()`
- SQL row-lock helpers:
  - `.forUpdate()`
  - `.forShare()`
  - `.skipLocked()`
- Fallback remains available:
  - `tx.query(...)`
  - `tx.queryOne(...)`
  - `tx.execute(...)`

## Example Contract

```ts
import { transaction } from "@alpha.consultings/eloquent-orm.js";

await transaction("pg", async (tx) => {
  const conflicting = await Appointment.useTransaction(tx)
    .where("practitioner_id", practitionerId)
    .where("appointment_date", appointmentDate)
    .forUpdate()
    .get();

  if (hasConflict(conflicting, appointmentTime)) {
    throw new Error("slot already taken");
  }

  await Appointment.useTransaction(tx).create({
    id,
    practitioner_id: practitionerId,
    patient_id: patientId,
    appointment_date: appointmentDate,
    appointment_time: appointmentTime,
  });
});
```

```ts
await transaction("pg", async (tx) => {
  const wallet = await CreditAccount.useTransaction(tx)
    .where("id", creditAccountId)
    .forUpdate()
    .first();

  const request = await CommunityHelpRequest.useTransaction(tx)
    .where("id", requestId)
    .forUpdate()
    .first();

  if (!wallet || !request) {
    throw new Error("missing finance state");
  }

  wallet.balance_minor -= amountMinor;
  await wallet.useTransaction(tx).save();

  request.funded_amount_minor += amountMinor;
  await request.useTransaction(tx).save();
});
```

```ts
await transaction("mongo", async (tx) => {
  await Wallet.useTransaction(tx).create({
    user_id: "u1",
    balance_minor: 0,
  });

  const wallet = await Wallet.useTransaction(tx)
    .where("user_id", "u1")
    .first();

  if (!wallet) {
    throw new Error("wallet missing");
  }

  wallet.balance_minor += 500;
  await wallet.useTransaction(tx).save();
});
```

## Scope

- Transaction-scoped model wrapper API
- Transaction-aware create/save/delete flows
- Transaction-aware finder execution for SQL and `mongo`
- SQL lock clause support for PostgreSQL and MySQL
- Safe no-op or explicit rejection behavior for unsupported driver lock features
- Runtime docs and examples after the contract is implemented

## Non-Goals

- No hidden implicit transaction scope.
- No automatic locking on every finder.
- No fake Mongo row-lock parity.
- No removal of raw `tx.execute(...)` for advanced SQL workflows.
- No full fluent query-builder redesign in this slice.

## Driver Contract

- PostgreSQL:
  - support `.forUpdate()`
  - support `.forShare()`
  - support `.skipLocked()` where valid
- MySQL:
  - support `.forUpdate()`
  - support `.forShare()` only when the adapter dialect can emit a valid equivalent
  - support `.skipLocked()` where valid
- SQLite:
  - transaction-bound model reads and writes only
  - no `lockedTransaction(...)` parity
  - no row-lock helpers
- MongoDB:
  - transaction-bound model reads and writes through the active session
  - no `.forUpdate()`
  - no `.forShare()`
  - no `.skipLocked()`

## Ordered Plan

### Phase 1: Contract Freeze

- [x] Freeze the public helper names:
  - `Model.useTransaction(tx)`
  - `instance.useTransaction(tx)`
  - `.forUpdate()`
  - `.forShare()`
  - `.skipLocked()`
- [x] Freeze that raw `tx.execute(...)` remains available as the escape hatch.

### Phase 2: Transaction Scope Propagation

- [x] Add a transaction-bound model execution context that can be carried through finder and persistence flows.
- [x] Ensure SQL models use the transaction adapter/connection for all reads and writes in scope.
- [x] Ensure `mongo` models use the active session for all reads and writes in scope.

### Phase 3: Finder Locking Surface

- [x] Add `.forUpdate()` support for SQL transaction-bound finders.
- [x] Add `.forShare()` support with dialect-aware emission or explicit rejection.
- [x] Add `.skipLocked()` support where the dialect supports it.
- [x] Reject row-lock helpers on `sqlite` and `mongo`.

### Phase 4: Persistence Parity

- [x] Make `.create(data)` transaction-aware.
- [x] Make `instance.save()` transaction-aware.
- [x] Make `instance.delete()` transaction-aware.
- [x] Keep instance and static helper behavior aligned.

### Phase 5: Driver And Error Semantics

- [x] Document unsupported lock-helper behavior by driver.
- [x] Ensure invalid lock combinations fail fast with explicit runtime errors.
- [x] Ensure nested helper usage does not silently escape the active transaction.

### Phase 6: Coverage And Docs

- [x] Add focused tests for:
  - SQL transaction-bound finder reads
  - SQL transaction-bound create/save/delete
  - PostgreSQL lock helper emission
  - MySQL lock helper emission
  - SQLite rejection of row-lock helpers
  - Mongo transaction-bound create/read/save behavior
  - raw `tx.execute(...)` fallback remaining available
- [x] Update runtime docs after implementation.

## Acceptance Criteria

- Models can be bound to an active transaction with `useTransaction(tx)`.
- Transaction-bound model reads and writes stay inside the same driver transaction or Mongo session.
- SQL lock helpers work only where the target driver supports them.
- Unsupported lock-helper usage fails fast with explicit errors.
- Raw transaction methods remain available for advanced workflows.
- Existing non-transaction model usage remains intact.

## Risks

- Transaction-scoped model state can leak if helper cloning is not isolated correctly.
- SQL and `mongo` parity can drift if session propagation is incomplete.
- Overloading finder state with lock semantics can break existing query-chain assumptions.
- Driver-specific lock differences may require stricter API limitations than the initial design suggests.

## Validation Strategy

- Plan contract test for this document.
- Focused runtime tests for SQL and Mongo transaction propagation.
- Focused runtime tests for row-lock helper support and rejection by driver.
- Typecheck pass after implementation.
- Full ORM suite pass after transaction propagation changes land.

## Notes

- This plan is intentionally about ORM-native ergonomics on top of the existing `transaction(...)` feature, not a replacement of the transaction manager itself.
- All planned phases in this document are now implemented.
- Nested helper semantics are locked:
  - rebinding to the same transaction is a no-op
  - rebinding to a different transaction on the same connection fails fast
- Coverage and runtime docs are in place.
