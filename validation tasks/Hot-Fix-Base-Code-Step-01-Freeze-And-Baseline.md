# Hot Fix Base Code Step 01 - Freeze And Baseline

Last updated: 2026-03-19
Owner: ORM core maintainers
Status: COMPLETED

## Purpose

Lock the first execution slice from the base-code checklist before runtime CRUD refactors begin.
This step freezes the public target direction, records the current baseline, and prevents silent API drift during the hot-fix phase.

## Scope locked in this step

- Freeze the public Laravel-like CRUD target as the documented destination.
- Record the current coverage baseline before any runtime CRUD refactor.
- Record the current pack-smoke baseline before any generator or package-surface change.
- Mark the expected change type before implementation starts.

## Change classification

- Additive:
  - static `create(...)` public path
  - `createMany`
  - `updateMany`
  - `patchMany`
  - `deleteMany`
  - `restoreMany`
  - `updateById`
  - `deleteById`
  - `restoreById`
- Deprecating:
  - low-level public examples that recommend `new User().update(id, data)`
  - low-level public examples that recommend `new User().delete(id)`
  - low-level public examples that recommend `new User().restore(id)`
- Breaking:
  - none in this step
  - runtime implementation changes must stay additive or deprecating until a later explicit major-version decision

## Frozen public target API

```ts
const user = new User();
user.fill({ name: "Alice", email: "alice@example.com" });
await user.save();

const created = await User.create({ name: "Alice", email: "alice@example.com" });

const found = await User.find(1);
const one = await User.findOneBy("email", "alice@example.com");
const rows = await User.where("is_active", true).orderBy("created_at", "desc").limit(20).get();

if (found) {
  found.update({ name: "Alice Updated" });
  await found.save();
  await found.patch({ name: "Alice Patch" });
  await found.delete();
}

const foundToRestore = await User.withTrashed().find(1);
if (foundToRestore) {
  await foundToRestore.restore();
}
```

## Exact public paths that will change

- Querying remains Laravel-like and stays public:
  - `User.find(...)`
  - `User.findOneBy(...)`
  - `User.where(...).orderBy(...).limit(...).get()`
- Creation remains public:
  - `new User().fill(...); await user.save();`
  - target additive alias: `await User.create(...)`
- Loaded-instance mutation becomes the recommended public write path:
  - `found.update({...}); await found.save();`
  - `await found.patch({...});`
  - `await found.delete();`
  - `await found.restore();`
- Direct-by-id APIs move to explicit naming:
  - `updateById`
  - `deleteById`
  - `restoreById`
- Bulk APIs are tracked as Laravel-like targets:
  - `createMany`
  - `updateMany`
  - `patchMany`
  - `deleteMany`
  - `restoreMany`

## Docs and examples that must move with the code

- `README.md`
- `src/documentation/installation-and-quickstart.md`
- `src/documentation/usage-guides.md`
- `src/documentation/usage-guides-controller.md`
- `src/documentation/usage-guides-services.md`
- `docs/getting-started/installation.mdx`
- `docs/getting-started/quick-start.mdx`
- `docs/getting-started/usage-guides.mdx`
- `docs/getting-started/controllers.mdx`
- `docs/getting-started/services.mdx`
- `docs/api/querying.mdx`
- `docs/api/models.mdx`
- `docs/orm/soft-deletes.mdx`

## Step-01 exit

- CRUD target frozen before implementation
- coverage baseline captured
- pack-smoke baseline captured
- change type recorded
- next slice can update contract tests first
