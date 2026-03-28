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
} from "./core/model/BaseModel";

export { PivotHelperMixin } from "./core/orm/mixins/PivotHelperMixin";
export let Factory: typeof import("./cli/utils/factories/Factory").Factory;
export type {
  PlainObject,
  ModelCtor,
  FactoryCtor,
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

Object.defineProperty(exports, "Factory", {
  enumerable: true,
  get: function () {
    // Lazy-load the factory surface so plain package imports do not pull faker.
    // This keeps the public export stable while avoiding eager ESM/CJS interop failures.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("./cli/utils/factories/Factory").Factory as typeof import("./cli/utils/factories/Factory").Factory;
  },
});
