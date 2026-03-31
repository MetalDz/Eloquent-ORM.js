import fs from "fs";
import path from "path";
import { factoryStatus } from "../cli/commands/factoryStatus.js";
import { PathMap } from "../cli/utils/PathMap.js";
import { loadFactories } from "../cli/utils/factories/FactoryLoader.js";
import { FactoryRegistry } from "../cli/utils/factories/FactoryRegistry.js";
import * as tsRuntime from "../cli/utils/typescript/tsRuntime.js";
import { MongoModel, SqlModel } from "../core/model/BaseModel.js";

jest.mock("chalk", () => ({
  __esModule: true,
  default: new Proxy(
    (value: unknown): string => String(value ?? ""),
    {
      get: () => (value: unknown): string => String(value ?? ""),
      apply: (_target, _thisArg, args: unknown[]) => String(args[0] ?? ""),
    }
  ),
}));

class GeoLocationModel extends MongoModel<Record<string, never>> {
  constructor() {
    super("geolocations", "mongo_test");
  }
}

class UserModel extends SqlModel<Record<string, never>> {
  constructor() {
    super("users", "sqlite_test");
  }
}

class GeoLocationFactory {
  model = GeoLocationModel;

  definition(): Record<string, never> {
    return {};
  }
}

class UserFactory {
  model = UserModel;

  definition(): Record<string, never> {
    return {};
  }
}

describe("NoSQL phase 9 runtime demo/factory-status smoke contract", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    FactoryRegistry.clear();
    jest.spyOn(console, "log").mockImplementation(() => undefined);
    jest.spyOn(console, "warn").mockImplementation(() => undefined);
    jest.spyOn(console, "error").mockImplementation(() => undefined);
    jest.spyOn(console, "table").mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    FactoryRegistry.clear();
  });

  test("factoryStatus only reports mongo factories when the loader targets mongo storage", async () => {
    jest.spyOn(PathMap, "factories").mockReturnValue("virtual-factories");
    jest.spyOn(fs, "existsSync").mockReturnValue(true);
    jest
      .spyOn(fs, "readdirSync")
      .mockReturnValue([
        "UserFactory.ts",
        "GeoLocationFactory.ts",
      ] as unknown as ReturnType<typeof fs.readdirSync>);
    jest.spyOn(tsRuntime, "loadModule").mockImplementation((filePath: string) => {
      if (filePath.includes("GeoLocationFactory")) {
        return { GeoLocationFactory };
      }
      return { UserFactory };
    });

    const tableSpy = jest.spyOn(console, "table");

    await loadFactories(true, { storageKind: "mongo" });
    await factoryStatus({ details: true });

    expect(FactoryRegistry.list()).toEqual(["GeoLocationFactory"]);

    const tableRows = tableSpy.mock.calls[0]?.[0] as Array<Record<string, unknown>>;
    expect(tableRows).toHaveLength(1);
    expect(tableRows[0]?.Factory).toBe("GeoLocationFactory");
  });

  test("pack-smoke script runs mongo-only factory status and demo scenario assertions", () => {
    const script = fs.readFileSync(
      path.resolve(process.cwd(), "scripts/pack-smoke.js"),
      "utf8"
    );

    const requiredSnippets = [
      "function assertNotContains(step, text, unexpected)",
      '["factory:status", "--test", "--mongo", "--details"]',
      '"nosql factory:status --mongo"',
      '"GeoLocationFactory"',
      '"UserFactory"',
      '["demo:scenario", "--test", "--mongo", "--random"]',
      '"nosql demo:scenario --mongo"',
      '"No users found to demonstrate relations."',
      '"Mongo driver does not support SQL adapter APIs."',
    ];

    for (const snippet of requiredSnippets) {
      expect(script).toContain(snippet);
    }
  });
});

export {};
