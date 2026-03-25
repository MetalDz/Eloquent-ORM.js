import fs from "fs";
import os from "os";
import path from "path";
import {
  applyCliTestConnectionOverride,
  resolveCliRequestedStorageKind,
  shouldAutoLoadFactoriesForCli,
} from "../cli/utils/CliBootstrapSupport";
import {
  buildStructuredLogLine,
  isJsonLogFormat,
  resolveLogLevel,
} from "../cli/utils/StructuredLogger";
import { resolveTargetedMorphAlias } from "../cli/utils/ScenarioMorphAliasRouting";
import { PathMap } from "../cli/utils/PathMap";
import * as artifactStorage from "../cli/utils/ArtifactStorage";
import * as tsRuntime from "../cli/utils/typescript/tsRuntime";
import {
  resolveDbExecutionRole,
  resolveMongoEnv,
  resolveMysqlEnv,
} from "../config/dbRoleEnv";
import {
  createPersistedSnapshot,
  extractPersistableAttributes,
  getDirtyAttributes,
  getOriginalPrimaryKeyValue,
  getPersistenceSchema,
  getPrimaryKeyValue,
  resolvePrimaryKey,
  sanitizeAssignableData,
} from "../core/model/CoreModelPersistenceState";
import { Relation } from "../core/orm/Relation";
import { SerializeMixin } from "../core/orm/mixins/SerializeMixin";
import { PivotHelperMixin } from "../core/orm/mixins/PivotHelperMixin";
import { ModelRegistry } from "../core/orm/mixins/utils/ModelRegistry";
import { column } from "../core/schema/SchemaBlueprint";
import { dbConfig } from "../config/database";
import {
  checkProductionDestructiveCommand,
  checkProductionTestOnlyCommand,
} from "../cli/utils/ProductionSafety";

describe("LTS phase 5 residual helper and mixin coverage", () => {
  const originalConnections = dbConfig.connections;

  afterEach(() => {
    dbConfig.connections = { ...originalConnections };
    ModelRegistry.clear();
    jest.restoreAllMocks();
    jest.resetModules();
  });

  test("StructuredLogger covers invalid levels, JSON format, and circular arg fallback", () => {
    expect(resolveLogLevel({ ELOQUENT_LOG_LEVEL: " verbose " } as NodeJS.ProcessEnv)).toBe(
      "info",
    );
    expect(isJsonLogFormat({ ELOQUENT_LOG_FORMAT: " JSON " } as NodeJS.ProcessEnv)).toBe(true);

    const problematic = { token: "x" };
    const originalStringify = JSON.stringify;
    const stringifySpy = jest
      .spyOn(JSON, "stringify")
      .mockImplementation(((value: unknown, ...rest: unknown[]) => {
        if (value === problematic) {
          throw new Error("stringify failed");
        }
        return originalStringify(value, ...(rest as [never, never]));
      }) as typeof JSON.stringify);

    const parsed = JSON.parse(
      buildStructuredLogLine("warn", [problematic, "tail"], { command: "db:seed", pid: 42 }),
    ) as {
      level: string;
      message: string;
      command: string;
      pid: number;
    };

    expect(parsed).toEqual(
      expect.objectContaining({
        level: "warn",
        message: "[object Object] tail",
        command: "db:seed",
        pid: 42,
      }),
    );
    expect(stringifySpy).toHaveBeenCalled();
  });

  test("CliBootstrapSupport covers commandless argv and DB_CONNECTION fallback in test mode", () => {
    const env = {
      DB_CONNECTION: "mongo",
      DB_TEST_CONNECTION: "",
    };

    applyCliTestConnectionOverride(["node", "eloquent", "db:seed", "--test"], env);
    expect(env.DB_CONNECTION).toBe("mysql_test");

    expect(
      resolveCliRequestedStorageKind(["node", "eloquent", "db:seed", "--test"], {
        DB_CONNECTION: "mongo",
        DB_TEST_CONNECTION: "",
      }),
    ).toBe("mongo");
    expect(shouldAutoLoadFactoriesForCli(["node", "eloquent"])).toBe(false);
  });

  test("ProductionSafety covers non-production test-only allowance and missing-force message", () => {
    expect(
      checkProductionTestOnlyCommand({
        command: "db:seed",
        env: { NODE_ENV: "development" } as NodeJS.ProcessEnv,
      }),
    ).toEqual({ allowed: true });

    expect(
      checkProductionDestructiveCommand({
        command: "migrate:fresh",
        env: {
          NODE_ENV: "production",
          ELOQUENT_ALLOW_PROD_DESTRUCTIVE: "true",
        } as NodeJS.ProcessEnv,
        force: false,
        yes: true,
      }),
    ).toEqual({
      allowed: false,
      reason:
        "migrate:fresh is blocked in production. Missing --force. Re-run with --force --yes and ELOQUENT_ALLOW_PROD_DESTRUCTIVE=true.",
    });
  });

  test("ScenarioMorphAliasRouting covers missing file, js file, missing morph helper, and loader failure fallbacks", () => {
    const modelsDir = fs.mkdtempSync(path.join(os.tmpdir(), "eloquent-phase5-morph-routing-"));
    dbConfig.connections = {
      ...originalConnections,
      mongo_test: { driver: "mongo" },
    } as typeof dbConfig.connections;

    jest.spyOn(PathMap, "models").mockReturnValue(modelsDir);
    jest.spyOn(artifactStorage, "resolveModelStorageKind").mockReturnValue("unknown");

    try {
      expect(
        resolveTargetedMorphAlias({
          isTest: true,
          connectionName: "mongo_test",
          modelName: "MissingUser",
          fallback: "users",
        }),
      ).toBe("users");

      fs.writeFileSync(path.join(modelsDir, "User.js"), "module.exports = {};\n", "utf8");
      jest.spyOn(tsRuntime, "loadModule").mockReturnValue({ User: {} });
      expect(
        resolveTargetedMorphAlias({
          isTest: true,
          connectionName: "mongo_test",
          modelName: "User",
          fallback: "users",
        }),
      ).toBe("users");

      (tsRuntime.loadModule as jest.MockedFunction<typeof tsRuntime.loadModule>).mockImplementation(
        () => {
          throw new Error("load failed");
        },
      );
      expect(
        resolveTargetedMorphAlias({
          isTest: true,
          connectionName: "mongo_test",
          modelName: "User",
          fallback: "users",
        }),
      ).toBe("users");
    } finally {
      fs.rmSync(modelsDir, { recursive: true, force: true });
    }
  });

  test("dbRoleEnv covers mongo DNS parsing, runtime defaults, and invalid numeric fallback", () => {
    const originalMongoRuntimeUri = process.env.MONGO_RUNTIME_URI;
    const originalMongoRuntimeDb = process.env.MONGO_RUNTIME_DB;
    const originalMongoRuntimeDns = process.env.MONGO_RUNTIME_DNS_SERVERS;
    const originalRole = process.env.ELOQUENT_DB_ROLE;

    expect(resolveDbExecutionRole({ ELOQUENT_DB_ROLE: "RUNTIME" } as NodeJS.ProcessEnv)).toBe(
      "runtime",
    );
    expect(
      resolveMysqlEnv(
        {
          DB_PORT: "bad-port",
        } as NodeJS.ProcessEnv,
        { test: false },
      ).port,
    ).toBe(3306);

    expect(
      resolveMongoEnv(
        {
          MONGO_TEST_RUNTIME_URI: "mongodb://example:27017",
          MONGO_TEST_RUNTIME_DB: "eloquent_runtime_test",
          MONGO_TEST_RUNTIME_DNS_SERVERS: "1.1.1.1, 8.8.8.8",
        } as NodeJS.ProcessEnv,
        { test: true },
      ),
    ).toEqual({
      uri: "mongodb://example:27017",
      database: "eloquent_runtime_test",
      dnsServers: ["1.1.1.1", "8.8.8.8"],
    });
    expect(resolveMongoEnv({} as NodeJS.ProcessEnv, { test: false })).toEqual({
      uri: "mongodb://localhost:27017",
      database: "eloquentjs_db",
      dnsServers: [],
    });

    process.env.ELOQUENT_DB_ROLE = "runtime";
    process.env.MONGO_RUNTIME_URI = "mongodb://default-arg:27017";
    process.env.MONGO_RUNTIME_DB = "default_arg_db";
    process.env.MONGO_RUNTIME_DNS_SERVERS = "9.9.9.9";
    expect(resolveMongoEnv()).toEqual({
      uri: "mongodb://default-arg:27017",
      database: "default_arg_db",
      dnsServers: ["9.9.9.9"],
    });

    if (originalMongoRuntimeUri === undefined) {
      delete process.env.MONGO_RUNTIME_URI;
    } else {
      process.env.MONGO_RUNTIME_URI = originalMongoRuntimeUri;
    }
    if (originalMongoRuntimeDb === undefined) {
      delete process.env.MONGO_RUNTIME_DB;
    } else {
      process.env.MONGO_RUNTIME_DB = originalMongoRuntimeDb;
    }
    if (originalMongoRuntimeDns === undefined) {
      delete process.env.MONGO_RUNTIME_DNS_SERVERS;
    } else {
      process.env.MONGO_RUNTIME_DNS_SERVERS = originalMongoRuntimeDns;
    }
    if (originalRole === undefined) {
      delete process.env.ELOQUENT_DB_ROLE;
    } else {
      process.env.ELOQUENT_DB_ROLE = originalRole;
    }
  });

  test("CoreModelPersistenceState covers direct original keys, id fallback snapshots, empty dirtiness, and object payload validation", () => {
    const schema = {
      id: column("increments", undefined, { primary: true }),
      name: column("string"),
    };

    expect(getOriginalPrimaryKeyValue({ slug: "alpha" }, "slug")).toBe("alpha");
    expect(
      createPersistedSnapshot({
        source: { _id: "mongo-id", name: "Alpha" },
        schema,
        primaryKey: "id",
      }),
    ).toEqual({ id: "mongo-id", name: "Alpha" });
    expect(getPersistenceSchema("UserModel", schema)).toBe(schema);
    expect(
      resolvePrimaryKey({
        id: column("increments"),
        name: column("string"),
      }),
    ).toBe("id");
    expect(getPrimaryKeyValue({ slug: "alpha" }, "slug")).toBe("alpha");
    expect(
      getDirtyAttributes({
        currentAttributes: { id: 1, name: "Alpha" },
        originalAttributes: { id: 1, name: "Alpha" },
        primaryKey: "id",
      }),
    ).toEqual({});
    expect(
      extractPersistableAttributes({
        record: { name: "Alpha" },
        columnFieldNames: ["id", "name"],
      }),
    ).toEqual({ name: "Alpha" });
    expect(() =>
      sanitizeAssignableData({
        data: null as unknown as Record<string, unknown>,
        usage: "fill",
        schema,
        modelName: "UserModel",
      }),
    ).toThrow("fill() expects a plain object payload.");
  });

  test("Relation helper methods cover mongo equality, in-filters, comparables, and driver detection", () => {
    class ProbeRelation extends Relation {
      async getResults(): Promise<unknown> {
        return null;
      }

      async match(): Promise<void> {
        return undefined;
      }

      public equality(field: string, value: unknown): Record<string, unknown> {
        return this.buildMongoEqualityFilter(field, value);
      }

      public inFilter(field: string, values: unknown[]): Record<string, unknown> {
        return this.buildMongoInFilter(field, values);
      }

      public comparable(record: Record<string, unknown>, field: string): unknown[] {
        return this.getMongoComparableValues(record, field);
      }

      public mongo(db: unknown): boolean {
        return this.isMongoDatabase(db);
      }
    }

    const relation = new ProbeRelation(null, "foreign_id", "id", "probe");

    expect(relation.equality("id", 7)).toEqual({ $or: [{ id: 7 }, { _id: 7 }] });
    expect(relation.equality("_id", "m1")).toEqual({ $or: [{ _id: "m1" }, { id: "m1" }] });
    expect(relation.equality("slug", "alpha")).toEqual({ slug: "alpha" });
    expect(relation.inFilter("id", [1, 2])).toEqual({
      $or: [{ id: { $in: [1, 2] } }, { _id: { $in: [1, 2] } }],
    });
    expect(relation.inFilter("_id", ["a"])).toEqual({
      $or: [{ _id: { $in: ["a"] } }, { id: { $in: ["a"] } }],
    });
    expect(relation.inFilter("slug", ["a"])).toEqual({ slug: { $in: ["a"] } });
    expect(relation.comparable({ id: 1, _id: "1" }, "id")).toEqual([1, "1"]);
    expect(relation.comparable({ slug: "alpha" }, "slug")).toEqual(["alpha"]);
    expect(relation.comparable({}, "slug")).toEqual([]);
    expect(relation.mongo({ collection: () => ({}) })).toBe(true);
    expect(relation.mongo({})).toBe(false);
  });

  test("SerializeMixin covers hidden fields, callable appends, arrays, nested toObject, plain objects, and primitives", () => {
    class SerializableBase {
      async all(): Promise<unknown[]> {
        return [];
      }

      async find(): Promise<unknown | null> {
        return null;
      }
    }

    class SerializableModel extends SerializeMixin(SerializableBase) {
      public id = 1;
      public name = "Alpha";
      public password = "secret";
      public child = {
        toObject: () => ({ nested: true }),
      };
      public plain = { visible: true };
      public tags = ["a", null, 3];
      public _internal = "skip";
      public fullName(): string {
        return `${this.name} User`;
      }
    }

    const model = new SerializableModel();
    model.hidden = ["password"];
    model.appends = ["fullName", "missingAppend"];

    expect(model.toObject()).toEqual({
      hidden: ["password"],
      appends: ["fullName", "missingAppend"],
      id: 1,
      name: "Alpha",
      child: { nested: true },
      plain: { visible: true },
      tags: ["a", null, 3],
      fullName: "Alpha User",
    });
    expect(model.toJSON()).toEqual(
      expect.objectContaining({ fullName: "Alpha User" })
    );
    expect(model.serializeValue("value")).toBe("value");
  });

  test("PivotHelperMixin covers mongo attach/detach, empty sync, mongo capability guards, and unsupported driver failures", async () => {
    const mongoInsertMany = jest.fn(async () => undefined);
    const mongoDeleteMany = jest.fn(async () => undefined);

    class MongoPivotBase {
      connectionName = "mongo";

      async getDB(): Promise<unknown> {
        return {
          collection: () => ({
            insertMany: mongoInsertMany,
            deleteMany: mongoDeleteMany,
          }),
        };
      }
    }

    class UnsupportedPivotBase {
      connectionName = "oracle";

      async getDB(): Promise<unknown> {
        return {};
      }
    }

    dbConfig.connections = {
      ...originalConnections,
      mongo: { driver: "mongo" },
      oracle: { driver: "oracle" },
    } as unknown as typeof dbConfig.connections & Record<string, { driver: string }>;

    const MongoPivot = PivotHelperMixin(MongoPivotBase);
    const UnsupportedPivot = PivotHelperMixin(UnsupportedPivotBase);

    const mongoModel = new MongoPivot() as unknown as {
      attach: (...args: unknown[]) => Promise<void>;
      detach: (...args: unknown[]) => Promise<void>;
      sync: (...args: unknown[]) => Promise<void>;
    };
    await mongoModel.attach("post_user_pivot", "user_id", "post_id", 5, [9, 10]);
    await mongoModel.detach("post_user_pivot", "user_id", 5);
    await mongoModel.attach("post_user_pivot", "user_id", "post_id", 5, []);

    expect(mongoInsertMany).toHaveBeenCalledWith([
      { user_id: 5, post_id: 9 },
      { user_id: 5, post_id: 10 },
    ]);
    expect(mongoDeleteMany).toHaveBeenCalledWith({ user_id: 5 });

    const brokenMongo = new MongoPivot() as unknown as {
      attach: (...args: unknown[]) => Promise<void>;
      detach: (...args: unknown[]) => Promise<void>;
      getDB: () => Promise<unknown>;
    };
    brokenMongo.getDB = async () => ({});
    await expect(
      brokenMongo.attach("post_user_pivot", "user_id", "post_id", 5, [9]),
    ).rejects.toThrow("MongoDB driver not available for pivot operations.");
    await expect(
      brokenMongo.detach("post_user_pivot", "user_id", 5),
    ).rejects.toThrow("MongoDB driver not available for pivot operations.");

    const detachSpy = jest.spyOn(
      MongoPivot.prototype as unknown as { detach: (...args: unknown[]) => Promise<void> },
      "detach",
    );
    const attachSpy = jest.spyOn(
      MongoPivot.prototype as unknown as { attach: (...args: unknown[]) => Promise<void> },
      "attach",
    );
    await mongoModel.sync("post_user_pivot", "user_id", "post_id", 5, []);
    expect(detachSpy).toHaveBeenCalled();
    expect(attachSpy).not.toHaveBeenCalledWith(
      "post_user_pivot",
      "user_id",
      "post_id",
      5,
      [],
    );

    const unsupported = new UnsupportedPivot() as unknown as {
      attach: (...args: unknown[]) => Promise<void>;
    };
    await expect(
      unsupported.attach("post_user_pivot", "user_id", "post_id", 1, [2]),
    ).rejects.toThrow("Unsupported connection type: oracle");
  });

  test("ModelRegistry covers grantMany and strict-mode access after batch grant", () => {
    class UserModel {}
    class PostModel {}

    ModelRegistry.grantMany([UserModel, PostModel]);
    ModelRegistry.setStrictMode(true);

    expect(ModelRegistry.isStrictMode()).toBe(true);
    expect(ModelRegistry.isGranted(UserModel)).toBe(true);
    expect(ModelRegistry.isGranted(PostModel)).toBe(true);
    ModelRegistry.ensureGranted(UserModel, "lifecycle");
    expect(() => ModelRegistry.assertGranted(UserModel, "registration")).not.toThrow();
  });
});
