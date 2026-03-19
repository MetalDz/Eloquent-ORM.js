# Runtime Querying

Last updated: 2026-03-19

The read side of the runtime is Laravel-like and should stay predictable.

## Primary query shapes

```ts
const byId = await User.find(1);
const byEmail = await User.findOneBy("email", "alice@example.com");
const newestUser = await User.orderBy("created_at", "desc").first();
```

```ts
const rows = await User.where("is_active", true)
  .orderBy("created_at", "desc")
  .limit(20)
  .get();
```

```ts
const allUsers = await new User().all();
```

## Eager loading

```ts
const users = await User.where("is_active", true)
  .with("posts")
  .get();
```

`with(...)` and `load(...)` require explicit relation methods.

## Scopes

```ts
const active = await User.active().first();
const inactive = await User.inactive().get();
```
