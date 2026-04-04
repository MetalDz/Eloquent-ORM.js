# Relational DDL Safe Diff Plan

## Goal

Add first-class model metadata for relational database artifacts that plain column schema cannot express cleanly, and make `make:migration` non-destructive by default for unmanaged PostgreSQL foreign keys and composite indexes.

## Why

Current behavior mixes two different concerns:

- semantic schema shape
- ownership of database constraints already present in the live database

That causes false-positive update migrations when:

- the database has valid foreign keys
- the model schema cannot express those foreign keys
- the diff engine treats them as removable drift

## Required Contract

### 1. First-class relational DDL metadata

Models need an explicit metadata surface for:

- foreign keys
- composite unique indexes
- composite normal indexes

Suggested direction:

```ts
static database = {
  foreignKeys: [
    {
      name: "identity_documents_registration_intake_fk",
      column: "registration_intake_id",
      references: { table: "registration_intakes", column: "id" },
      onDelete: "SET NULL",
    },
  ],
  indexes: [
    {
      name: "idempotency_records_scope_actor_route_key_unique",
      unique: true,
      columns: ["scope_code", "actor_id", "route_key", "idempotency_key"],
    },
  ],
};
```

### 2. Additions use semantic matching

When a desired foreign key or index already exists in the database with the same effective target, the generator must not add a duplicate artifact just because the name differs.

### 3. Drops use ownership rules

Default smart-update behavior must only drop artifacts the ORM can safely treat as managed.

Safe default:

- drop managed ORM-owned artifacts
- keep unmanaged/manual/unknown artifacts

### 4. No destructive cleanup by default

`make:migration` must prefer:

- additive updates
- non-destructive diffing
- preserving unknown relational artifacts

## Ownership Rule

For this slice, the safe ownership model is:

- ORM auto-generated relation constraints with deterministic ORM names are managed
- explicitly declared relational metadata is managed while present in the model
- unknown existing database artifacts are preserved by default

This keeps current update generation safe even before deeper schema-state tracking exists.

## Required Behavior Changes

### PostgreSQL foreign keys

- existing unmanaged foreign keys must not be auto-dropped
- managed ORM foreign keys may still be dropped when the managed relation is removed

### Composite indexes

- models can declare named composite indexes
- create migrations emit those indexes
- update migrations add missing named indexes
- unknown existing indexes are preserved by default

## Tests To Lock

1. SchemaBuilder can generate named foreign keys and composite indexes from model metadata.
2. Smart update does not drop unmanaged PostgreSQL foreign keys.
3. Smart update still drops ORM-managed default-named foreign keys when the relation is removed.
4. `make:migration` passes model relational metadata through to generated migration content.

## Non-Goal For This Slice

Do not add destructive pruning of unknown relational artifacts by default.

If explicit pruning is needed later, it should be opt-in and separately designed.
