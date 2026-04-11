# EloquentJS Public API Reference

Last updated: 2026-04-11

## Stability Contract
- Only exports from `src/index.ts` are public and semver-tracked.
- The dedicated model subpath `src/Model.ts` is also public and semver-tracked as `@alpha.consultings/eloquent-orm.js/Model`.
- Deep imports from `src/*` or `dist/*` internals are private and may break without notice.

## Root Package: `@alpha.consultings/eloquent-orm.js`

### Models and ORM Core
- `BaseModel`
- `Model`
- `SqlModel`
- `MongoModel`
- `CoreModel`
- `MorphRegistry`
- `PivotHelperMixin`

### Factories
- `Factory`

### Schema
- `column`
- `relation`
- `mixin`
- `validate`
- `validateSchema`
- `SchemaBuilder`
- `SchemaValidator`

### Cache
- `CacheManager`
- `setupCache`
- `transaction`
- `lockedTransaction`

### Model Registration and Hook Guarding
- `registerModels`
- `isModelRegistered`
- `setModelRegistryStrictMode`
- `isModelRegistryStrictMode`

### Root Type Exports
- `ORMRecord`
- `ModelAttrs`
- `ModelInstance`
- `TypedRelation`
- `PivotRelation`
- `PlainObject`
- `ModelCtor`
- `FactoryCtor`
- `ModelEventHooks`
- `ColumnType`
- `ColumnOptions`
- `ValidationRule`
- `RelationType`
- `RelationOptions`
- `MixinName`
- `MixinDefinition`
- `ColumnDefinition`
- `RelationDefinition`
- `SchemaField`
- `ValidationError`
- `SchemaValidatorOptions`
- `ValidationHooks`
- `CustomRuleFunction`
- `CustomRuleResult`
- `SchemaBuildResult`
- `TransactionContext`
- `TransactionOptions`
- `LockingOptions`
- `SqlTransaction`
- `SqlTransactionDriver`
- `MongoTransactionContext`
- `RegisterModelsOptions`

## Model Subpath: `@alpha.consultings/eloquent-orm.js/Model`

### Named Exports
- `SqlModel`
- `MongoModel`
- `ModelInstance`
- `ModelAttrs`

### Subpath Rules
- `@alpha.consultings/eloquent-orm.js/Model` does not expose a default export.
- `@alpha.consultings/eloquent-orm.js/Model` does not expose the root `Model` alias.
- Use the root package for the Laravel-style SQL alias:
  - `import { Model } from "@alpha.consultings/eloquent-orm.js"`

### Examples

Root SQL alias:

```ts
import { Model } from "@alpha.consultings/eloquent-orm.js";
```

Explicit model bases:

```ts
import { SqlModel, MongoModel, type ModelInstance } from "@alpha.consultings/eloquent-orm.js/Model";
```

## Extension Points

### Custom Models
- Extend `Model` or `SqlModel` for SQL-backed models.
- Extend `MongoModel` for Mongo-backed document models.
- Define schema via `column`, `relation`, and `mixin`.
- Register model classes at bootstrap using `registerModels([...])` or a generated registry helper.

### Factory Extension
- Extend `Factory` and implement per-model generation logic.
- Use `create`, `createMany`, and relation helpers in scenario seeding workflows.

### Schema and Validation
- Use `SchemaValidator` to validate schema contracts in tests/tooling.
- Use `SchemaBuilder` to generate SQL migration payloads from model schema.

### Runtime Controls
- Toggle strict model registration via `setModelRegistryStrictMode(true|false)`.
- Query registration state with `isModelRegistered` and `isModelRegistryStrictMode`.
- Use `transaction(...)` for grouped SQL or Mongo runtime writes.
- Use `lockedTransaction(...)` for MySQL/PostgreSQL race-sensitive write sections.
- Use `model.withTransaction(...)` when the model connection should own the transaction context.

## Notes
- CLI command functions are not exported as public package API.
- New public exports must be added through `src/index.ts` or `src/Model.ts` and documented here.
- For mongo runtime and CLI behavior, see:
  - `src/documentation/nosql-usage-guide.md`
