export {
  BaseModel,
  SqlModel,
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
  MongoModel,
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
