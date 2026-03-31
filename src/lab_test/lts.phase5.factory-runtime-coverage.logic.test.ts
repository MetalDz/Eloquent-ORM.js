import fs from "fs";
import path from "path";
import { column, relation } from "../core/schema/SchemaBlueprint.js";
import { MongoModel, SqlModel } from "../core/model/BaseModel.js";
import { factoryStatus } from "../cli/commands/factoryStatus.js";
import { generateFactoryGraph } from "../cli/utils/factories/FactoryGraph.js";
import { FactoryRegistry } from "../cli/utils/factories/FactoryRegistry.js";
import { loadFactories } from "../cli/utils/factories/FactoryLoader.js";
import { PathMap } from "../cli/utils/PathMap.js";
import * as tsRuntime from "../cli/utils/typescript/tsRuntime.js";

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

class User extends SqlModel<Record<string, never>> {
  static schema = {
    posts: relation("hasMany", "Post", { foreignKey: "user_id" }),
    profile: relation("hasOne", "Profile", { foreignKey: "user_id" }),
  };

  constructor() {
    super("users", "sqlite_test");
  }
}

class Post extends SqlModel<Record<string, never>> {
  static schema = {
    title: column("string"),
    author: relation("belongsTo", "User", { foreignKey: "user_id" }),
    tags: relation("belongsToMany", "Tag"),
    comments: relation("morphMany", "Comment", { morphName: "commentable" }),
  };

  constructor() {
    super("posts", "sqlite_test");
  }
}

class Tag extends SqlModel<Record<string, never>> {
  static schema = {
    posts: relation("belongsToMany", "Post"),
  };

  constructor() {
    super("tags", "sqlite_test");
  }
}

class GeoLocation extends MongoModel<Record<string, never>> {
  constructor() {
    super("geolocations", "mongo_test");
  }
}

class SchemaLess extends SqlModel<Record<string, never>> {
  constructor() {
    super("plain_records", "sqlite_test");
  }
}

class PostFactory {
  model = Post;

  definition(): Record<string, never> {
    return {};
  }
}

class TagFactory {
  model = Tag;

  definition(): Record<string, never> {
    return {};
  }
}

class GeoLocationFactory {
  model = GeoLocation;

  definition(): Record<string, never> {
    return {};
  }
}

class UserFactory {
  model = User;

  definition(): Record<string, never> {
    return {};
  }
}

class SchemaLessFactory {
  model = SchemaLess;

  definition(): Record<string, never> {
    return {};
  }
}

class PostUserPivotFactory {
  model = Post;

  definition(): Record<string, never> {
    return {};
  }
}

class HelperFactoryModule {
  static helper(): void {}
}

function registerFactory(name: string, factoryCtor: new () => unknown): void {
  FactoryRegistry.register(
    name,
    factoryCtor as unknown as new () => never,
  );
}

describe("LTS phase 5 factory runtime coverage", () => {
  const rootDir = process.cwd();
  const slicePlanPath = path.resolve(
    rootDir,
    "validation tasks/LTS-Phase5-Factory-Runtime-Coverage-Plan.md",
  );
  const phasePlanPath = path.resolve(
    rootDir,
    "validation tasks/LTS-Phase5-Coverage-To-100-Plan.md",
  );
  const commandPath = path.resolve(
    rootDir,
    "src/cli/commands/factoryStatus.ts",
  );

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

  test("phase plans track the factory runtime hotspot cluster", () => {
    const slicePlan = fs.readFileSync(slicePlanPath, "utf8");
    const phasePlan = fs.readFileSync(phasePlanPath, "utf8");
    const commandSource = fs.readFileSync(commandPath, "utf8");

    expect(slicePlan).toContain("# LTS Phase 5 Factory Runtime Coverage Plan");
    expect(slicePlan).toContain("src/cli/commands/factoryStatus.ts");
    expect(slicePlan).toContain("src/cli/utils/factories/FactoryGraph.ts");
    expect(slicePlan).toContain("src/cli/utils/factories/FactoryRegistry.ts");
    expect(slicePlan).toContain("src/cli/utils/factories/FactoryLoader.ts");

    expect(phasePlan).toContain("src/cli/commands/factoryStatus.ts");
    expect(phasePlan).toContain("src/cli/utils/factories/FactoryGraph.ts");
    expect(phasePlan).toContain("src/cli/utils/factories/FactoryRegistry.ts");
    expect(phasePlan).toContain("src/cli/utils/factories/FactoryLoader.ts");
    expect(phasePlan).toContain("LTS-Phase5-Factory-Runtime-Coverage-Plan.md");

    expect(commandSource).toContain("generateFactoryGraph(factories)");
    expect(commandSource).not.toContain("function generateGraph(");
  });

  test("FactoryGraph covers empty and no-relationship paths", () => {
    expect(generateFactoryGraph([])).toContain("No factories registered.");

    registerFactory("SchemaLessFactory", SchemaLessFactory);

    expect(generateFactoryGraph(["SchemaLessFactory"])).toContain(
      "No relationships detected.",
    );
  });

  test("FactoryGraph dedupes mirrored belongsToMany relationships", () => {
    registerFactory("PostFactory", PostFactory);
    registerFactory("TagFactory", TagFactory);

    const graph = generateFactoryGraph(["PostFactory", "TagFactory"]);

    expect(graph).toContain("Post");
    expect(graph).toContain("Tag");
    expect(graph.match(/\(belongsToMany\)/g)).toHaveLength(1);
  });

  test("FactoryGraph covers hasOne and hasMany arrow branches", () => {
    registerFactory("UserFactory", UserFactory);

    const graph = generateFactoryGraph(["UserFactory"]);

    expect(graph).toContain("(hasMany)");
    expect(graph).toContain("(hasOne)");
  });

  test("FactoryRegistry covers duplicate, missing, and pivot lookup branches", () => {
    const warnSpy = jest.spyOn(console, "warn");

    registerFactory("PostFactory", PostFactory);
    registerFactory("PostFactory", PostFactory);
    registerFactory("PostUserPivotFactory", PostUserPivotFactory);

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("Factory already registered: PostFactory"),
    );
    expect(FactoryRegistry.make("PostFactory")).toBeInstanceOf(PostFactory);
    expect(FactoryRegistry.makePivot("PostUser")).toBeInstanceOf(PostUserPivotFactory);
    expect(FactoryRegistry.makePivot("PostUserPivotFactory")).toBeInstanceOf(
      PostUserPivotFactory,
    );
    expect(() => FactoryRegistry.make("MissingFactory")).toThrow(
      "Factory 'MissingFactory' not found in registry.",
    );
  });

  test("FactoryRegistry registerBulk covers bulk registration", () => {
    FactoryRegistry.registerBulk({
      PostFactory: PostFactory as unknown as never,
      TagFactory: TagFactory as unknown as never,
    });

    expect(FactoryRegistry.list()).toEqual(["PostFactory", "TagFactory"]);
  });

  test("FactoryRegistry autoDiscover covers missing folder branch", async () => {
    jest.spyOn(PathMap, "factories").mockReturnValue("virtual-factories");
    jest.spyOn(fs, "existsSync").mockReturnValue(false);

    await FactoryRegistry.autoDiscover(true);

    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining("No factories folder found at: virtual-factories"),
    );
  });

  test("FactoryRegistry autoDiscover covers targeted skip, import success, and import failure", async () => {
    const warnSpy = jest.spyOn(console, "warn");
    const errorSpy = jest.spyOn(console, "error");

    jest.spyOn(PathMap, "factories").mockReturnValue("virtual-factories");
    jest.spyOn(fs, "existsSync").mockReturnValue(true);
    jest.spyOn(fs, "readdirSync").mockReturnValue(
      ["UserFactory.ts", "GeoLocationFactory.ts", "MixedFactory.ts", "BrokenFactory.ts"] as never,
    );
    jest.spyOn(tsRuntime, "loadModule").mockImplementation((filePath: string) => {
      if (filePath.includes("GeoLocationFactory")) {
        return { GeoLocationFactory };
      }

      if (filePath.includes("MixedFactory")) {
        return {
          helper: HelperFactoryModule.helper,
          GeoLocationFactory,
        };
      }

      if (filePath.includes("UserFactory")) {
        return { UserFactory };
      }

      throw new Error("broken factory");
    });

    await FactoryRegistry.autoDiscover(true, { storageKind: "mongo" });

    expect(FactoryRegistry.list()).toEqual(["GeoLocationFactory"]);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("Skipping incompatible factory for mongo"),
    );
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("UserFactory"),
    );
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("Failed to import factory file: BrokenFactory.ts"),
    );
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("broken factory"),
    );
  });

  test("FactoryLoader covers success and failure initialization branches", async () => {
    const autoDiscoverSpy = jest
      .spyOn(FactoryRegistry, "autoDiscover")
      .mockResolvedValue(undefined);
    jest.spyOn(FactoryRegistry, "list").mockReturnValue(["GeoLocationFactory"]);

    await loadFactories(true, { storageKind: "mongo" });

    expect(autoDiscoverSpy).toHaveBeenCalledWith(true, { storageKind: "mongo" });
    expect(console.log).toHaveBeenCalledWith("Loaded 1 factories.");

    autoDiscoverSpy.mockRejectedValueOnce(new Error("auto discover failed"));

    await loadFactories(true, { storageKind: "mongo" });

    expect(console.error).toHaveBeenCalledWith("Failed to initialize factories.");
    expect(console.error).toHaveBeenCalledWith("auto discover failed");

    autoDiscoverSpy.mockRejectedValueOnce("string failure");

    await loadFactories(true, { storageKind: "mongo" });

    expect(console.error).toHaveBeenCalledWith("Failed to initialize factories.");
  });

  test("factoryStatus covers empty and simple summary paths", async () => {
    const tableSpy = jest.spyOn(console, "table");

    await factoryStatus();

    expect(tableSpy).not.toHaveBeenCalled();
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining("No factories are currently registered."),
    );

    registerFactory("PostFactory", PostFactory);

    await factoryStatus();

    const summaryRows = tableSpy.mock.calls.at(-1)?.[0] as Array<Record<string, unknown>>;
    expect(summaryRows).toHaveLength(1);
    expect(summaryRows[0]?.Factory).toBe("PostFactory");
    expect(summaryRows[0]?.Status).toBe("Ready");
  });

  test("factoryStatus covers details and graph paths", async () => {
    const tableSpy = jest.spyOn(console, "table");

    registerFactory("PostFactory", PostFactory);
    registerFactory("PostUserPivotFactory", PostUserPivotFactory);
    registerFactory("TagFactory", TagFactory);

    await factoryStatus({ details: true });

    const detailRows = tableSpy.mock.calls.at(-1)?.[0] as Array<Record<string, unknown>>;
    expect(detailRows).toHaveLength(3);
    expect(detailRows[0]?.Model).toBe("Post");
    expect(detailRows[0]?.Relations).toContain("(belongsTo)");
    expect(detailRows[1]?.Pivot).toBe("Yes");

    await factoryStatus({ graph: true });

    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining("Model Relationship Graph"),
    );
  });

  test("factoryStatus covers the top-level error handler", async () => {
    jest.spyOn(FactoryRegistry, "list").mockImplementation(() => {
      throw new Error("status boom");
    });

    await factoryStatus();

    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("Failed to fetch factory status."),
    );
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("status boom"),
    );
  });
});

export {};
