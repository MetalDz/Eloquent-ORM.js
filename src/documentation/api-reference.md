# EloquentJS Public API Reference

Last updated: 2026-03-06

## Stability Contract
- Only exports from `src/index.ts` are public and semver-tracked.
- Deep imports from `src/*` or `dist/*` internals are private and may break without notice.

## Public Exports

### Models and ORM Core
- `BaseModel`
- `SqlModel`
- `CoreModel`
- `MongoModel`
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

### Model Registration and Hook Guarding
- `registerModels`
- `isModelRegistered`
- `setModelRegistryStrictMode`
- `isModelRegistryStrictMode`

## Type Exports
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
- `RegisterModelsOptions`

## Extension Points

### Custom Models
- Extend `SqlModel` or `MongoModel`.
- Define schema via `column`, `relation`, and `mixin`.
- Register model classes at bootstrap using `registerModels([...])`.

### Factory Extension
- Extend `Factory` and implement per-model generation logic.
- Use `create`, `createMany`, and relation helpers in scenario seeding workflows.

### Schema and Validation
- Use `SchemaValidator` to validate schema contracts in tests/tooling.
- Use `SchemaBuilder` to generate SQL migration payloads from model schema.

### Runtime Controls
- Toggle strict model registration via `setModelRegistryStrictMode(true|false)`.
- Query registration state with `isModelRegistered` and `isModelRegistryStrictMode`.

## Notes
- CLI command functions are not exported as public package API.
- New public exports must be added through `src/index.ts` and documented here.

