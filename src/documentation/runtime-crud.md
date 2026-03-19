# Runtime CRUD

Last updated: 2026-03-19

## Core rule

Use one of these creation paths:

```ts
const user = new User();
user.fill({
  name: "Alice",
  email: "alice@example.com",
});
await user.save();
```

```ts
const created = await User.create({
  name: "Alice",
  email: "alice@example.com",
});
```

Interpretation:

- `new User()` means a transient in-memory model instance
- `save()` persists the current instance state
- `User.create(...)` persists immediately and returns the created model

## Create

Use `new User()` when you want to build an instance before persistence.
Use `User.create(...)` when you want a one-shot insert.

## Read

```ts
const found = await User.find(1);
const one = await User.findOneBy("email", "alice@example.com");
const rows = await User.where("is_active", true)
  .orderBy("created_at", "desc")
  .limit(20)
  .get();
```

## Update

Recommended loaded-instance path:

```ts
const found = await User.find(1);
if (found) {
  found.update({ name: "Alice Updated" });
  await found.save();
}
```

Partial update:

```ts
const found = await User.find(1);
if (found) {
  await found.patch({ name: "Alice Patch" });
}
```

## Delete

```ts
const found = await User.find(1);
if (found) {
  await found.delete();
}
```

## Restore

```ts
const found = await User.find(1);
if (found) {
  await found.restore();
}
```

Restore requires soft-delete support on the model.

## Explicit by-id helpers

```ts
await User.updateById(1, { name: "Alice Direct" });
await User.deleteById(1);
await User.restoreById(1);
```

Use them only when the service intentionally wants a direct by-id path.
