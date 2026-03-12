/**
 * Public package entrypoint.
 * Only exports from this file are semver-tracked and supported for consumers.
 * Deep imports into internal `dist/core/*`, `dist/cli/*`, or `src/*` paths are private.
 */
export {
  BaseModel,
  SqlModel,
  MongoModel,
  MorphRegistry,
  type ORMRecord,
  type ModelAttrs,
  type ModelInstance,
  type TypedRelation,
  type PivotRelation,
} from "./core/model/BaseModel";

export { PivotHelperMixin } from "./core/orm/mixins/PivotHelperMixin";
export {
  Factory,
  type PlainObject,
  type ModelCtor,
  type FactoryCtor,
} from "./cli/utils/factories/Factory";

export {
  CoreModel,
  type ModelEventHooks,
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

export { CacheManager } from "./core/cache/CacheManager";
export { setupCache } from "./core/cache/setupCache";

export {
  registerModels,
  isModelRegistered,
  setModelRegistryStrictMode,
  isModelRegistryStrictMode,
  type RegisterModelsOptions,
} from "./core/orm/mixins/utils/modelRegistration";
