import cjsPackage from "../dist/index.js";
import { Factory } from "./Factory.mjs";
const { BaseModel, Model, SqlModel, MongoModel, MorphRegistry, PivotHelperMixin, CoreModel, column, validate, relation, mixin, validateSchema, SchemaValidator, SchemaBuilder, CacheManager, setupCache, transaction, lockedTransaction, registerModels, isModelRegistered, setModelRegistryStrictMode, isModelRegistryStrictMode, } = cjsPackage;
export { BaseModel, Model, SqlModel, MongoModel, MorphRegistry, PivotHelperMixin, CoreModel, column, validate, relation, mixin, validateSchema, SchemaValidator, SchemaBuilder, CacheManager, setupCache, transaction, lockedTransaction, registerModels, isModelRegistered, setModelRegistryStrictMode, isModelRegistryStrictMode, Factory, };
export default {
    BaseModel,
    Model,
    SqlModel,
    MongoModel,
    MorphRegistry,
    PivotHelperMixin,
    CoreModel,
    column,
    validate,
    relation,
    mixin,
    validateSchema,
    SchemaValidator,
    SchemaBuilder,
    CacheManager,
    setupCache,
    transaction,
    lockedTransaction,
    registerModels,
    isModelRegistered,
    setModelRegistryStrictMode,
    isModelRegistryStrictMode,
    Factory,
};
