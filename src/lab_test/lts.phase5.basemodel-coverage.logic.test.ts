import fs from "fs";
import path from "path";
import { dbConfig } from "../config/database.js";

jest.mock("../core/connection/ConnectionFactory", () => ({
  getAdapter: jest.fn(),
  getConnection: jest.fn(),
}));

import {
  BaseModel,
  MongoModel,
  MorphRegistry,
  MorphableMixin,
} from "../core/model/BaseModel.js";
import { getConnection } from "../core/connection/ConnectionFactory.js";

const mockedGetConnection = getConnection as jest.MockedFunction<typeof getConnection>;

describe("LTS phase 5 BaseModel coverage", () => {
  const originalConnections = dbConfig.connections;

  beforeEach(() => {
    dbConfig.connections = { ...originalConnections };
    mockedGetConnection.mockReset();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    dbConfig.connections = { ...originalConnections };
    MorphRegistry.clear();
  });

  test("plan tracks the dedicated BaseModel coverage slice", () => {
    const planPath = path.resolve(
      process.cwd(),
      "validation tasks/LTS-Phase5-BaseModel-Coverage-Plan.md",
    );
    const content = fs.readFileSync(planPath, "utf8");

    expect(content).toContain("# LTS Phase 5 BaseModel Coverage Plan");
    expect(content).toContain("Status: COMPLETED");
    expect(content).toContain("src/core/model/BaseModel.ts");
    expect(content).toContain("src/lab_test/lts.phase5.basemodel-coverage.logic.test.ts");
  });

  test("morph helper re-exports remain available from BaseModel", () => {
    const baseModelModule = require("../core/model/BaseModel") as Record<string, unknown>;

    expect(typeof MorphableMixin).toBe("function");
    expect(MorphRegistry).toBeDefined();
    expect(baseModelModule).toHaveProperty("MorphableMixin", MorphableMixin);
    expect(baseModelModule).toHaveProperty("MorphRegistry", MorphRegistry);
  });

  test("MongoModel resolves getDB for mongo connections and rejects non-mongo drivers", async () => {
    const mongoDb = { kind: "mongo-db" } as never;
    mockedGetConnection.mockResolvedValue(mongoDb);

    dbConfig.connections = {
      ...dbConfig.connections,
      mongo_test: {
        ...dbConfig.connections.mongo_test,
        driver: "mongo",
      },
      mysql_test: {
        ...dbConfig.connections.mysql_test,
        driver: "mysql",
      },
    };

    class ValidMongoModel extends MongoModel {
      constructor(connectionName: any = "mongo_test") {
        super("mongo_models", connectionName);
      }
    }

    await expect(new ValidMongoModel().getDB()).resolves.toBe(mongoDb);
    expect(mockedGetConnection).toHaveBeenCalledWith("mongo_test");
    expect(() => new ValidMongoModel("mysql_test")).toThrow(
      "MongoModel requires a mongo driver connection. Received: mysql_test",
    );
  });

  test("instance getMorphClass covers direct alias, registry alias, and fallback name", () => {
    class DirectAliasModel extends BaseModel {
      static morphAlias = "direct_alias";

      constructor() {
        super("direct_alias_models", "mysql_test");
      }
    }

    class RegistryAliasModel extends BaseModel {
      constructor() {
        super("registry_alias_models", "mysql_test");
      }
    }

    class FallbackAliasModel extends BaseModel {
      constructor() {
        super("fallback_alias_models", "mysql_test");
      }
    }

    const listSpy = jest.spyOn(MorphRegistry, "list");

    expect(new DirectAliasModel().getMorphClass()).toBe("direct_alias");
    listSpy.mockReturnValue({ registry_alias: "RegistryAliasModel" });
    expect(new RegistryAliasModel().getMorphClass()).toBe("registry_alias");
    listSpy.mockReturnValue({});
    expect(new FallbackAliasModel().getMorphClass()).toBe("FallbackAliasModel");
    listSpy.mockRestore();
  });
});
