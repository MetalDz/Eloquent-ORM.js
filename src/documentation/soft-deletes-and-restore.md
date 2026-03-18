# Soft Deletes and Restore

Last updated: 2026-03-17

## When `delete()` is soft

`delete()` behaves as a soft delete when the model includes a `deleted_at` soft-delete field in its schema.

Valid schema patterns:

```ts
deleted_at: column("softDeletes")
```

or:

```ts
softDeletes: mixin("SoftDeletes")
```

Do not define both at once.

## How `restore()` works

`restore()` clears `deleted_at` and makes the record visible again to normal reads.

```ts
const model = new User() as User & { restore?: (id: number | string) => Promise<void> };
await model.restore?.(1);
```

## Query deleted records

```ts
const model = new User() as User & {
  withTrashed?: () => Promise<unknown[]>;
  onlyTrashed?: () => Promise<unknown[]>;
};

const allRows = await model.withTrashed?.();
const deletedRows = await model.onlyTrashed?.();
```

## Hard delete

Use `forceDelete()` only when the row should be permanently removed.

```ts
const model = new User() as User & { forceDelete?: (id: number | string) => Promise<void> };
await model.forceDelete?.(1);
```

After `forceDelete()`, do not assume `restore()` can recover the record.

## Recommended split

- models define the schema requirement
- services own `restore`, `withTrashed`, `onlyTrashed`, and `forceDelete`
- controllers expose restore endpoints only when the API needs recovery
