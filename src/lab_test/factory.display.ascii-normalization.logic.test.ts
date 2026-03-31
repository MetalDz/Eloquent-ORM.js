import fs from "fs";
import path from "path";
import { relation } from "../core/schema/SchemaBlueprint.js";
import { SqlModel } from "../core/model/BaseModel.js";
import { factoryStatus } from "../cli/commands/factoryStatus.js";
import {
  FACTORY_EMPTY_MARK,
  FACTORY_GRAPH_HEADER,
  FACTORY_STATUS_FOOTER,
  getFactoryRelationArrow,
} from "../cli/utils/factories/FactoryDisplay.js";
import { generateFactoryGraph } from "../cli/utils/factories/FactoryGraph.js";
import { FactoryRegistry } from "../cli/utils/factories/FactoryRegistry.js";

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
  };

  constructor() {
    super("users", "sqlite_test");
  }
}

class Post extends SqlModel<Record<string, never>> {
  static schema = {
    author: relation("belongsTo", "User", { foreignKey: "user_id" }),
    tags: relation("belongsToMany", "Tag"),
    comments: relation("morphMany", "Comment", { morphName: "commentable" }),
  };

  constructor() {
    super("posts", "sqlite_test");
  }
}

class UserFactory {
  model = User;

  definition(): Record<string, never> {
    return {};
  }
}

class PostFactory {
  model = Post;

  definition(): Record<string, never> {
    return {};
  }
}

function registerFactory(name: string, factoryCtor: new () => unknown): void {
  FactoryRegistry.register(name, factoryCtor as unknown as new () => never);
}

describe("factory display ASCII normalization", () => {
  const rootDir = process.cwd();
  const planPath = path.resolve(
    rootDir,
    "validation tasks/Factory-Display-ASCII-Normalization-Plan.md",
  );
  const trackedFiles = [
    "src/cli/commands/factoryStatus.ts",
    "src/cli/utils/factories/FactoryGraph.ts",
    "src/cli/utils/factories/FactoryRegistry.ts",
    "src/cli/utils/factories/FactoryDisplay.ts",
  ].map((filePath) => path.resolve(rootDir, filePath));

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

  test("plan documents the ASCII normalization scope and mapping", () => {
    const plan = fs.readFileSync(planPath, "utf8");

    const requiredSnippets = [
      "# Factory Display ASCII Normalization Plan",
      "Status: COMPLETED",
      "src/cli/commands/factoryStatus.ts",
      "src/cli/utils/factories/FactoryGraph.ts",
      "src/cli/utils/factories/FactoryRegistry.ts",
      "src/cli/utils/factories/FactoryDisplay.ts",
      "`belongsTo` -> `<-`",
      "`hasOne` -> `->`",
      "`hasMany` -> `->>`",
      "`belongsToMany` -> `<->`",
      "`morph*` -> `~>`",
    ];

    for (const snippet of requiredSnippets) {
      expect(plan).toContain(snippet);
    }
  });

  test("tracked factory display sources are ASCII-only", () => {
    for (const filePath of trackedFiles) {
      const content = fs.readFileSync(filePath, "utf8");
      expect(content).not.toMatch(/[^\x00-\x7F]/);
      expect(content).not.toContain("â");
    }
  });

  test("shared display helper returns the ASCII markers", () => {
    expect(FACTORY_EMPTY_MARK).toBe("-");
    expect(FACTORY_GRAPH_HEADER).toBe("\nModel Relationship Graph\n\n");
    expect(FACTORY_STATUS_FOOTER).toBe(
      "\nUse factories directly via FactoryRegistry.make(<name>)\n",
    );

    expect(getFactoryRelationArrow("belongsTo")).toBe("<-");
    expect(getFactoryRelationArrow("hasOne")).toBe("->");
    expect(getFactoryRelationArrow("hasMany")).toBe("->>");
    expect(getFactoryRelationArrow("belongsToMany")).toBe("<->");
    expect(getFactoryRelationArrow("morphMany")).toBe("~>");
    expect(getFactoryRelationArrow("custom")).toBe("->");
  });

  test("factoryStatus and FactoryGraph emit ASCII runtime output", async () => {
    registerFactory("UserFactory", UserFactory);
    registerFactory("PostFactory", PostFactory);

    await factoryStatus({ details: true });

    const detailRows = (console.table as jest.Mock).mock.calls[0]?.[0] as Array<
      Record<string, unknown>
    >;
    expect(detailRows[0]?.Relations).toContain("->> Post (hasMany)");
    expect(detailRows[1]?.Relations).toContain("<- User (belongsTo)");
    expect(detailRows[1]?.Relations).toContain("<-> Tag (belongsToMany)");
    expect(detailRows[1]?.Relations).toContain("~> Comment (morphMany)");
    expect(console.log).toHaveBeenCalledWith(
      "\nUse factories directly via FactoryRegistry.make(<name>)\n",
    );

    const graph = generateFactoryGraph(["UserFactory", "PostFactory"]);
    expect(graph).toContain("Model Relationship Graph");
    expect(graph).toContain("->> Post (hasMany)");
    expect(graph).not.toContain("<- User (belongsTo)");
    expect(graph).toContain("~> Comment (morphMany)");
    expect(graph).not.toMatch(/[^\x00-\x7F]/);
  });
});

export {};
