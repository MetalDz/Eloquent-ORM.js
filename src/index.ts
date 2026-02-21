export {
  BaseModel,
  SqlModel,
  MorphableMixin,
  MorphRegistry,
  type MorphableBaseModel,
  type ORMRecord,
  type ModelAttrs,
  type ModelInstance,
  type TypedRelation,
  type PivotRelation,
} from "./core/model/BaseModel";

export {
  CoreModel,
  MongoModel,
  type ModelEventHooks,
  type ModelBaseContract,
} from "./core/model/CoreModel";

export {
  column,
  validate,
  relation,
  mixin,
  validateSchema,
  type ColumnType,
  type ColumnOptions,
  type ValidationRule,
  type RelationType,
  type RelationOptions,
  type MixinName,
  type MixinDefinition,
  type ColumnDefinition,
  type RelationDefinition,
  type SchemaField,
} from "./core/schema/SchemaBlueprint";

export {
  SchemaValidator,
  type ValidationError,
  type SchemaValidatorOptions,
  type ValidationHooks,
  type CustomRuleFunction,
  type CustomRuleResult,
} from "./core/schema/SchemaValidator";

export { SchemaBuilder, type SchemaBuildResult } from "./core/schema/SchemaBuilder";

export {
  getConnection,
  getAdapter,
  closeAllConnections,
  type ConnectionName,
} from "./core/connection/ConnectionFactory";

export { resolveConnectionName } from "./core/connection/resolveConnectionName";

export type { DriverAdapter, AdapterKind } from "./core/connection/DriverAdapter";

export { CacheManager } from "./core/cache/CacheManager";
export { CacheRegistry } from "./core/cache/CacheRegistry";
export { CacheAnalytics } from "./core/cache/CacheAnalytics";
export { CacheFallbackManager } from "./core/cache/CacheFallbackManager";
export { setupCache } from "./core/cache/setupCache";

export { dbConfig } from "./config/database";
