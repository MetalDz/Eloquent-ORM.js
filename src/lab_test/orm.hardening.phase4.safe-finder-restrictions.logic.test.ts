import fs from "fs";
import { getAdapter, getConnection } from "../core/connection/ConnectionFactory.js";
import { BaseModel } from "../core/model/BaseModel.js";
import { column, relation, validate } from "../core/schema/SchemaBlueprint.js";
import { loadAppModel, resolveAppModelPath } from "./support/appModelResolver.js";

jest.mock("../core/connection/ConnectionFactory", () => ({
  getAdapter: jest.fn(),
  getConnection: jest.fn(),
}));

const mockedGetAdapter = getAdapter as jest.MockedFunction<typeof getAdapter>;
const mockedGetConnection = getConnection as jest.MockedFunction<typeof getConnection>;

type AppSafeFinderStatic = {
  where(field: string, value: unknown): unknown;
  orderBy(field: string, direction?: "asc" | "desc"): unknown;
  findAllBy(filters: Record<string, unknown>): Promise<unknown[]>;
  existsBy(filters: Record<string, unknown>): Promise<boolean>;
};

function loadAppSmokeModel() {
  return loadAppModel<AppSafeFinderStatic>("AppSmoke").exported;
}

function loadGeoLocalisationModel() {
  return loadAppModel<AppSafeFinderStatic>("GeoLocalisation").exported;
}

function pinGeneratedSqlConnection(filePath: string, connectionName = "mysql"): () => void {
  const original = fs.readFileSync(filePath, "utf8");
  const pinned = original.replace(
    /process\.env\.DB_CONNECTION\s*\?\?\s*"[^"]+"/g,
    `"${connectionName}"`
  );
  fs.writeFileSync(filePath, pinned, "utf8");
  return () => {
    fs.writeFileSync(filePath, original, "utf8");
  };
}

describe("ORM hardening phase 4 safe finder restrictions", () => {
  const originalDbConnection = process.env.DB_CONNECTION;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.DB_CONNECTION = "mysql";
  });

  afterAll(() => {
    if (originalDbConnection === undefined) {
      delete process.env.DB_CONNECTION;
    } else {
      process.env.DB_CONNECTION = originalDbConnection;
    }
  });

  test("real SQL app models reject unknown safe-finder fields before adapter access", async () => {
    const appSmokePath = resolveAppModelPath("AppSmoke");
    const restoreAppSmoke = pinGeneratedSqlConnection(appSmokePath, "mysql");

    try {
      process.env.DB_CONNECTION = "mysql";
      const AppSmoke = loadAppSmokeModel();

      expect(() => AppSmoke.where("missing", "value")).toThrow(
        "Unknown filter field 'missing' on AppSmoke."
      );
      expect(() => AppSmoke.orderBy("missing")).toThrow(
        "Unknown sort field 'missing' on AppSmoke."
      );
      expect(() => AppSmoke.findAllBy({ missing: "value" })).toThrow(
        "Unknown filter field 'missing' on AppSmoke."
      );
      await expect(AppSmoke.existsBy({ missing: "value" })).rejects.toThrow(
        "Unknown filter field 'missing' on AppSmoke."
      );

      expect(mockedGetAdapter).not.toHaveBeenCalled();
    } finally {
      restoreAppSmoke();
    }
  });

  test("real Mongo app models reject unknown safe-finder fields before connection access", async () => {
    const GeoLocalisation = loadGeoLocalisationModel();

    expect(() => GeoLocalisation.where("missing", "value")).toThrow(
      "Unknown filter field 'missing' on GeoLocalisation."
    );
    expect(() => GeoLocalisation.orderBy("missing")).toThrow(
      "Unknown sort field 'missing' on GeoLocalisation."
    );
    expect(() => GeoLocalisation.findAllBy({ missing: "value" })).toThrow(
      "Unknown filter field 'missing' on GeoLocalisation."
    );
    await expect(GeoLocalisation.existsBy({ missing: "value" })).rejects.toThrow(
      "Unknown filter field 'missing' on GeoLocalisation."
    );

    expect(mockedGetConnection).not.toHaveBeenCalled();
  });

  test("safe finder rejects relation fields and malformed eager-loading paths before execution", async () => {
    class RelationAwareModel extends BaseModel {
      static schema = {
        id: column("increments", undefined, { primary: true }),
        name: validate(column("string", 255), { required: true }),
        posts: relation("hasMany", "Post", { foreignKey: "user_id" }),
      };

      constructor() {
        super("users", "mysql");
      }

      posts() {
        return {
          name: "posts",
          getResults: async () => [],
          match: async () => undefined,
        };
      }
    }

    expect(() => RelationAwareModel.where("posts", 1)).toThrow(
      "Unknown filter field 'posts' on RelationAwareModel."
    );
    expect(() => RelationAwareModel.orderBy("posts")).toThrow(
      "Unknown sort field 'posts' on RelationAwareModel."
    );
    expect(() => RelationAwareModel.with("")).toThrow(
      "with() expects non-empty relation names on RelationAwareModel."
    );
    expect(() => RelationAwareModel.with("posts..comments")).toThrow(
      "Invalid relation path 'posts..comments' on RelationAwareModel."
    );
    expect(() => RelationAwareModel.with("missing")).toThrow(
      "Relation 'missing' is not defined on RelationAwareModel."
    );
    expect(() => RelationAwareModel.with("posts.comments")).not.toThrow();
    expect(() => RelationAwareModel.findAllBy({ posts: 1 })).toThrow(
      "Unknown filter field 'posts' on RelationAwareModel."
    );
    await expect(RelationAwareModel.existsBy({ posts: 1 })).rejects.toThrow(
      "Unknown filter field 'posts' on RelationAwareModel."
    );

    expect(mockedGetAdapter).not.toHaveBeenCalled();
    expect(mockedGetConnection).not.toHaveBeenCalled();
  });
});
