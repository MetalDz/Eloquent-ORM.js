import fs from "fs";
import path from "path";

import { column } from "../core/schema/SchemaBlueprint";
import { SqlModel } from "../core/model/BaseModel";
import { factoryStatus } from "../cli/commands/factoryStatus";
import { FACTORY_EMPTY_MARK } from "../cli/utils/factories/FactoryDisplay";
import { loadFactories } from "../cli/utils/factories/FactoryLoader";
import { FactoryRegistry } from "../cli/utils/factories/FactoryRegistry";
import { PathMap } from "../cli/utils/PathMap";
import * as tsRuntime from "../cli/utils/typescript/tsRuntime";

jest.mock("chalk", () => ({
  __esModule: true,
  default: new Proxy(
    (value: unknown): string => String(value ?? ""),
    {
      get: () => (value: unknown): string => String(value ?? ""),
      apply: (_target, _thisArg, args: unknown[]) => String(args[0] ?? ""),
    },
  ),
}));

jest.mock("../cli/utils/typescript/tsRuntime", () => ({
  loadModule: jest.fn(),
}));

class UndefinedSchemaModel extends SqlModel<Record<string, never>> {
  static schema = undefined as never;

  constructor() {
    super("undefined_schema_models", "sqlite_test");
  }
}

class ColumnOnlyModel extends SqlModel<Record<string, never>> {
  static schema = {
    title: column("string"),
  };

  constructor() {
    super("column_only_models", "sqlite_test");
  }
}

class MissingTableNameModel {
  static schema = {
    title: column("string"),
  };
}

const NamelessModel = class extends SqlModel<Record<string, never>> {
  constructor() {
    super("nameless_models", "sqlite_test");
  }
};

Object.defineProperty(NamelessModel, "name", {
  value: undefined,
  configurable: true,
});

class UndefinedSchemaFactory {
  model = UndefinedSchemaModel;

  definition(): Record<string, never> {
    return {};
  }
}

class ColumnOnlyFactory {
  model = ColumnOnlyModel;

  definition(): Record<string, never> {
    return {};
  }
}

class MissingTableNameFactory {
  model = MissingTableNameModel as never;

  definition(): Record<string, never> {
    return {};
  }
}

class NamelessFactory {
  model = NamelessModel as never;

  definition(): Record<string, never> {
    return {};
  }
}

class SqlUserFactory {
  model = ColumnOnlyModel;

  definition(): Record<string, never> {
    return {};
  }
}

const mockedLoadModule = tsRuntime.loadModule as jest.MockedFunction<typeof tsRuntime.loadModule>;

function registerFactory(name: string, factoryCtor: new () => unknown): void {
  FactoryRegistry.register(name, factoryCtor as unknown as new () => never);
}

describe("LTS phase 5 factory runtime residual coverage", () => {
  const planPath = path.resolve(
    process.cwd(),
    "validation tasks/LTS-Phase5-Factory-Runtime-Residual-Coverage-Plan.md",
  );

  beforeEach(() => {
    jest.restoreAllMocks();
    FactoryRegistry.clear();
    mockedLoadModule.mockReset();
    jest.spyOn(console, "log").mockImplementation(() => undefined);
    jest.spyOn(console, "warn").mockImplementation(() => undefined);
    jest.spyOn(console, "error").mockImplementation(() => undefined);
    jest.spyOn(console, "table").mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    FactoryRegistry.clear();
  });

  test("plan tracks the residual factory runtime slice", () => {
    const content = fs.readFileSync(planPath, "utf8");

    expect(content).toContain("# LTS Phase 5 Factory Runtime Residual Coverage Plan");
    expect(content).toContain("Status: COMPLETED");
    expect(content).toContain("src/cli/commands/factoryStatus.ts");
    expect(content).toContain("src/cli/utils/factories/FactoryLoader.ts");
    expect(content).toContain("src/cli/utils/factories/FactoryRegistry.ts");
    expect(content).toContain(
      "src/lab_test/lts.phase5.factory-runtime-residual-coverage.logic.test.ts",
    );
  });

  test("factoryStatus covers undefined-schema, column-only, missing-table, nameless, pivot, and non-Error failure branches", async () => {
    const tableSpy = jest.spyOn(console, "table");
    registerFactory("UndefinedSchemaFactory", UndefinedSchemaFactory);
    registerFactory("ColumnOnlyFactory", ColumnOnlyFactory);
    registerFactory("MissingTableNameFactory", MissingTableNameFactory);

    await factoryStatus({ details: true });

    const detailRows = tableSpy.mock.calls.at(-1)?.[0] as Array<Record<string, unknown>>;
    expect(detailRows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          Factory: "UndefinedSchemaFactory",
          Relations: FACTORY_EMPTY_MARK,
        }),
        expect.objectContaining({
          Factory: "ColumnOnlyFactory",
          Relations: FACTORY_EMPTY_MARK,
        }),
        expect.objectContaining({
          Factory: "MissingTableNameFactory",
          Table: FACTORY_EMPTY_MARK,
        }),
      ]),
    );

    FactoryRegistry.clear();
    registerFactory("AnyPivotFactory", UndefinedSchemaFactory);
    await factoryStatus();

    const summaryRows = tableSpy.mock.calls.at(-1)?.[0] as Array<Record<string, unknown>>;
    expect(summaryRows).toEqual([
      expect.objectContaining({
        Factory: "AnyPivotFactory",
        Type: "Pivot",
      }),
    ]);

    FactoryRegistry.clear();
    registerFactory("NamelessFactory", NamelessFactory);
    await factoryStatus({ details: true });
    expect(console.error).toHaveBeenCalledWith("Failed to fetch factory status.");

    jest.spyOn(FactoryRegistry, "list").mockImplementation(() => {
      throw "string status failure";
    });

    await factoryStatus();

    expect(console.error).toHaveBeenCalledWith("Failed to fetch factory status.");
    expect(console.error).not.toHaveBeenCalledWith("string status failure");
  });

  test("FactoryLoader covers default arguments", async () => {
    const autoDiscoverSpy = jest
      .spyOn(FactoryRegistry, "autoDiscover")
      .mockResolvedValue(undefined);
    jest.spyOn(FactoryRegistry, "list").mockReturnValue(["ColumnOnlyFactory"]);

    await loadFactories();

    expect(autoDiscoverSpy).toHaveBeenCalledWith(false, {});
    expect(console.log).toHaveBeenCalledWith("Loaded 1 factories.");
  });

  test("FactoryRegistry autoDiscover covers the default-argument branch", async () => {
    jest.spyOn(PathMap, "factories").mockReturnValue("virtual-factories");
    jest.spyOn(fs, "existsSync").mockReturnValue(true);
    jest.spyOn(fs, "readdirSync").mockReturnValue([] as never);

    await FactoryRegistry.autoDiscover();

    expect(console.log).toHaveBeenCalledWith("\nFactory auto-discovery complete.\n");
  });

  test("FactoryRegistry autoDiscover covers targeted skips and string import failures on the live module", async () => {
    jest.spyOn(PathMap, "factories").mockReturnValue("virtual-factories");
    jest.spyOn(fs, "existsSync").mockReturnValue(true);
    jest
      .spyOn(fs, "readdirSync")
      .mockReturnValue(["SqlUserFactory.ts", "BrokenFactory.ts"] as never);
    mockedLoadModule
      .mockImplementationOnce(() => ({ SqlUserFactory }))
      .mockImplementationOnce(() => {
        throw "string import failure";
      });

    await FactoryRegistry.autoDiscover(false, { storageKind: "mongo" });

    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining("Skipping incompatible factory for mongo"),
    );
    expect(console.error).toHaveBeenCalledWith("Failed to import factory file: BrokenFactory.ts");
    expect(console.error).not.toHaveBeenCalledWith("string import failure");
    expect(FactoryRegistry.list()).toEqual([]);
  });
});
