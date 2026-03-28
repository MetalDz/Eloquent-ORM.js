import cjsPackage from "../dist/index.js";
import { Factory } from "./Factory.mjs";

export { Factory };

export const {
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
  registerModels,
  isModelRegistered,
  setModelRegistryStrictMode,
  isModelRegistryStrictMode,
} = cjsPackage;

export default {
  ...cjsPackage,
  Factory,
};
