import fs from "fs";
import path from "path";

describe("LTS phase 5 index entrypoint coverage", () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    jest.resetModules();
  });

  test("plan tracks the dedicated src/index.ts coverage slice", () => {
    const planPath = path.resolve(
      process.cwd(),
      "validation tasks/LTS-Phase5-Index-Entrypoint-Coverage-Plan.md",
    );
    const content = fs.readFileSync(planPath, "utf8");

    expect(content).toContain("# LTS Phase 5 Index Entrypoint Coverage Plan");
    expect(content).toContain("Status: COMPLETED");
    expect(content).toContain("src/index.ts");
    expect(content).toContain(
      "src/lab_test/lts.phase5.index-entrypoint-coverage.logic.test.ts",
    );
  });

  test("root entrypoint exposes the expected runtime surface identities", () => {
    let entry: Record<string, unknown> | undefined;
    let baseModelModule: Record<string, unknown> | undefined;
    let coreModelModule: Record<string, unknown> | undefined;
    let schemaBlueprintModule: Record<string, unknown> | undefined;
    let schemaValidatorModule: Record<string, unknown> | undefined;
    let schemaBuilderModule: Record<string, unknown> | undefined;
    let cacheManagerModule: Record<string, unknown> | undefined;
    let setupCacheModule: Record<string, unknown> | undefined;
    let factoryModule: Record<string, unknown> | undefined;
    let pivotHelperModule: Record<string, unknown> | undefined;
    let modelRegistrationModule: Record<string, unknown> | undefined;
    let transactionManagerModule: Record<string, unknown> | undefined;

    jest.isolateModules(() => {
      jest.doMock("../cli/utils/factories/Factory", () => ({
        Factory: class Factory {},
      }));

      entry = require("../index") as Record<string, unknown>;
      baseModelModule = require("../core/model/BaseModel") as Record<string, unknown>;
      coreModelModule = require("../core/model/CoreModel") as Record<string, unknown>;
      schemaBlueprintModule = require("../core/schema/SchemaBlueprint") as Record<
        string,
        unknown
      >;
      schemaValidatorModule = require("../core/schema/SchemaValidator") as Record<
        string,
        unknown
      >;
      schemaBuilderModule = require("../core/schema/SchemaBuilder") as Record<
        string,
        unknown
      >;
      cacheManagerModule = require("../core/cache/CacheManager") as Record<string, unknown>;
      setupCacheModule = require("../core/cache/setupCache") as Record<string, unknown>;
      factoryModule = require("../cli/utils/factories/Factory") as Record<string, unknown>;
      pivotHelperModule = require("../core/orm/mixins/PivotHelperMixin") as Record<
        string,
        unknown
      >;
      transactionManagerModule = require("../core/connection/TransactionManager") as Record<
        string,
        unknown
      >;
      modelRegistrationModule = require(
        "../core/orm/mixins/utils/modelRegistration",
      ) as Record<string, unknown>;
    });

    expect(entry).toBeDefined();
    expect(baseModelModule).toBeDefined();
    expect(coreModelModule).toBeDefined();
    expect(schemaBlueprintModule).toBeDefined();
    expect(schemaValidatorModule).toBeDefined();
    expect(schemaBuilderModule).toBeDefined();
    expect(cacheManagerModule).toBeDefined();
    expect(setupCacheModule).toBeDefined();
    expect(factoryModule).toBeDefined();
    expect(pivotHelperModule).toBeDefined();
    expect(transactionManagerModule).toBeDefined();
    expect(modelRegistrationModule).toBeDefined();

    const runtimeExportNames = [
      "BaseModel",
      "Model",
      "SqlModel",
      "MongoModel",
      "MorphRegistry",
      "PivotHelperMixin",
      "Factory",
      "CoreModel",
      "column",
      "validate",
      "relation",
      "mixin",
      "validateSchema",
      "SchemaValidator",
      "SchemaBuilder",
      "CacheManager",
      "setupCache",
      "transaction",
      "lockedTransaction",
      "registerModels",
      "isModelRegistered",
      "setModelRegistryStrictMode",
      "isModelRegistryStrictMode",
    ] as const;

    for (const exportName of runtimeExportNames) {
      expect(entry?.[exportName]).toBeDefined();
    }

    expect(entry?.BaseModel).toBe(baseModelModule?.BaseModel);
    expect(entry?.Model).toBe(baseModelModule?.Model);
    expect(entry?.Model).toBe(baseModelModule?.SqlModel);
    expect(entry?.SqlModel).toBe(baseModelModule?.SqlModel);
    expect(entry?.MongoModel).toBe(baseModelModule?.MongoModel);
    expect(entry?.MorphRegistry).toBe(baseModelModule?.MorphRegistry);
    expect(entry?.PivotHelperMixin).toBe(pivotHelperModule?.PivotHelperMixin);
    expect(entry?.Factory).toBe(factoryModule?.Factory);
    expect(entry?.CoreModel).toBe(coreModelModule?.CoreModel);
    expect(entry?.column).toBe(schemaBlueprintModule?.column);
    expect(entry?.validate).toBe(schemaBlueprintModule?.validate);
    expect(entry?.relation).toBe(schemaBlueprintModule?.relation);
    expect(entry?.mixin).toBe(schemaBlueprintModule?.mixin);
    expect(entry?.validateSchema).toBe(schemaBlueprintModule?.validateSchema);
    expect(entry?.SchemaValidator).toBe(schemaValidatorModule?.SchemaValidator);
    expect(entry?.SchemaBuilder).toBe(schemaBuilderModule?.SchemaBuilder);
    expect(entry?.CacheManager).toBe(cacheManagerModule?.CacheManager);
    expect(entry?.setupCache).toBe(setupCacheModule?.setupCache);
    expect(entry?.transaction).toBe(transactionManagerModule?.transaction);
    expect(entry?.lockedTransaction).toBe(transactionManagerModule?.lockedTransaction);
    expect(entry?.registerModels).toBe(modelRegistrationModule?.registerModels);
    expect(entry?.isModelRegistered).toBe(modelRegistrationModule?.isModelRegistered);
    expect(entry?.setModelRegistryStrictMode).toBe(
      modelRegistrationModule?.setModelRegistryStrictMode,
    );
    expect(entry?.isModelRegistryStrictMode).toBe(
      modelRegistrationModule?.isModelRegistryStrictMode,
    );
  });
});
