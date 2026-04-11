/**
 * Public package entrypoint.
 * Only exports from this file are semver-tracked and supported for consumers.
 * Deep imports into internal `dist/core/*`, `dist/cli/*`, or `src/*` paths are private.
 */
export {
  BaseModel,
  Model,
  SqlModel,
  MongoModel,
  MorphRegistry,
  type ORMRecord,
  type ModelAttrs,
  type ModelInstance,
  type TypedRelation,
  type PivotRelation,
} from "./core/model/BaseModel.js";

export { PivotHelperMixin } from "./core/orm/mixins/PivotHelperMixin.js";
export {
  Factory,
  type PlainObject,
  type ModelCtor,
  type FactoryCtor,
} from "./cli/utils/factories/Factory.js";

export {
  CoreModel,
  type ModelEventHooks,
} from "./core/model/CoreModel.js";

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
} from "./core/schema/SchemaBlueprint.js";

export {
  SchemaValidator,
  type ValidationError,
  type SchemaValidatorOptions,
  type ValidationHooks,
  type CustomRuleFunction,
  type CustomRuleResult,
} from "./core/schema/SchemaValidator.js";

export { SchemaBuilder, type SchemaBuildResult } from "./core/schema/SchemaBuilder.js";

export { CacheManager } from "./core/cache/CacheManager.js";
export { setupCache } from "./core/cache/setupCache.js";
export {
  transaction,
  lockedTransaction,
  type TransactionContext,
  type TransactionOptions,
  type LockingOptions,
  type SqlTransaction,
  type SqlTransactionDriver,
  type MongoTransactionContext,
} from "./core/connection/TransactionManager.js";

export {
  registerModels,
  isModelRegistered,
  setModelRegistryStrictMode,
  isModelRegistryStrictMode,
  type RegisterModelsOptions,
} from "./core/orm/mixins/utils/modelRegistration.js";
