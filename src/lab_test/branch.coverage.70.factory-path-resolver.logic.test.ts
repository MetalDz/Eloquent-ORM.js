jest.mock("@faker-js/faker", () => ({
  faker: {},
}));

import fs from "fs";
import path from "path";
import { Factory } from "../cli/utils/factories/Factory.js";
import { PathMap } from "../cli/utils/PathMap.js";
import { dbConfig } from "../config/database.js";
import { resolveConnectionName } from "../core/connection/resolveConnectionName.js";

describe("Branch coverage 70 - factory, path map, and resolver", () => {
  const originalEnv = { ...process.env };
  const originalConnections = JSON.parse(JSON.stringify(dbConfig.connections));
  const originalDefault = dbConfig.default;

  afterEach(() => {
    process.env = { ...originalEnv };
    dbConfig.default = originalDefault;
    dbConfig.connections = JSON.parse(JSON.stringify(originalConnections));
    jest.restoreAllMocks();
    jest.resetModules();
    jest.clearAllMocks();
  });

  describe("Factory", () => {
    class BaseFactory extends Factory<any> {
      model: any;
      constructor(model: any) {
        super();
        this.model = model;
      }
      definition(index = 0): Record<string, unknown> {
        return { idx: index, base: true };
      }
      async callRelated(factoryOrCtor: any, count = 1): Promise<any> {
        return await this.related(factoryOrCtor, count);
      }
      async callPivot(factory: any, ids: Array<string | number>): Promise<void> {
        await this.relatedPivot(factory, "pivot_table", "a_id", "b_id", 1, ids, { active: true });
      }
    }

    test("create uses instance create with beforeCreate/afterCreate hooks", async () => {
      class InstanceCreateModel {
        public payload: Record<string, unknown> = {};
        async create(data: Record<string, unknown>): Promise<this> {
          this.payload = data;
          return this;
        }
      }

      const factory = new BaseFactory(InstanceCreateModel);
      const beforeCreate = jest.fn(async () => ({ hookAdded: true }));
      const afterCreate = jest.fn(async () => undefined);
      factory.beforeCreate = beforeCreate;
      factory.afterCreate = afterCreate;

      const model = await factory.create({ custom: "x" }, 5);
      expect(beforeCreate).toHaveBeenCalledTimes(1);
      expect(afterCreate).toHaveBeenCalledTimes(1);
      expect(model.payload).toEqual({
        idx: 5,
        base: true,
        custom: "x",
        hookAdded: true,
      });
    });

    test("create returns static create result and skips afterCreate path", async () => {
      const staticCreate = jest.fn(async (data: Record<string, unknown>) => ({
        static: true,
        data,
      }));
      class StaticCreateModel {
        static create = staticCreate;
      }

      const factory = new BaseFactory(StaticCreateModel);
      const afterCreate = jest.fn(async () => undefined);
      factory.afterCreate = afterCreate;

      const result = await factory.create({ custom: "s" }, 1);
      expect(result).toEqual({
        static: true,
        data: { idx: 1, base: true, custom: "s" },
      });
      expect(afterCreate).not.toHaveBeenCalled();
    });

    test("create uses instance save fallback and throws on unsupported model", async () => {
      class SaveModel {
        public saved = false;
        public idx?: number;
        async save(): Promise<void> {
          this.saved = true;
        }
      }

      const saveFactory = new BaseFactory(SaveModel);
      const saved = await saveFactory.create({ custom: "v" }, 2);
      expect(saved.saved).toBe(true);
      expect((saved as any).idx).toBe(2);
      expect((saved as any).custom).toBe("v");

      class UnsupportedModel {}
      const unsupportedFactory = new BaseFactory(UnsupportedModel);
      await expect(unsupportedFactory.create()).rejects.toThrow("no valid create/save method");
    });

    test("related helper covers ctor and instance branches; relatedPivot delegates", async () => {
      class RelatedModel {
        async create(): Promise<{ id: number }> {
          return { id: 1 };
        }
      }
      class RelatedFactory extends BaseFactory {
        constructor() {
          super(RelatedModel);
        }
      }

      const factory = new BaseFactory(RelatedModel);
      const one = await factory.callRelated(new RelatedFactory(), 1);
      const many = await factory.callRelated(RelatedFactory, 2);
      expect(one).toEqual({ id: 1 });
      expect(many).toHaveLength(2);

      const createPivot = jest.fn(async () => undefined);
      const logSpy = jest.spyOn(console, "log").mockImplementation(() => undefined);
      await factory.callPivot({ createPivot }, [2, 3]);
      expect(createPivot).toHaveBeenCalledWith(1, [2, 3], { active: true });
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("[Pivot Attached]"));
    });

    test("createMany sequential callback branch is preserved", async () => {
      class CounterModel {
        public index = -1;
        async create(data: Record<string, unknown>): Promise<this> {
          this.index = Number(data.idx);
          return this;
        }
      }

      const factory = new BaseFactory(CounterModel);
      const seen: number[] = [];
      const rows = await factory.createMany(
        3,
        async (model: any, index) => {
          seen.push(index);
          expect(model.index).toBe(index);
        },
        1
      );

      expect(rows).toHaveLength(3);
      expect(seen).toEqual([0, 1, 2]);
    });
  });

  describe("PathMap and resolveConnectionName", () => {
    test("PathMap models/factories/seeds honor explicit and NODE_ENV test mode", () => {
      process.env.NODE_ENV = "test";
      expect((PathMap as any).isTestEnv(undefined)).toBe(true);
      expect(PathMap.models(true)).toContain(
        path.join("src", "test", "database", "models")
      );
      expect(PathMap.factories(true)).toContain(
        path.join("src", "test", "database", "factories")
      );
      expect(PathMap.seeds(true)).toContain(
        path.join("src", "test", "database", "seeds")
      );
      expect(PathMap.models(false)).toContain(path.join("src", "app", "models"));
    });

    test("PathMap helpers cover non-test env and no-op clearTestDirs branch", () => {
      process.env.NODE_ENV = "development";
      expect((PathMap as any).isTestEnv(undefined)).toBe(false);
      expect(PathMap.models()).toContain(path.join("src", "app", "models"));
      expect(PathMap.factories()).toContain(path.join("src", "app", "database", "factories"));
      expect(PathMap.seeds()).toContain(path.join("src", "app", "database", "seeds"));
      expect(PathMap.testMigrations()).toContain(path.join("src", "test", "database", "migrations"));

      const existsSpy = jest.spyOn(fs, "existsSync").mockReturnValue(false);
      const rmSpy = jest.spyOn(fs, "rmSync").mockImplementation(() => undefined as any);
      PathMap.clearTestDirs();
      expect(existsSpy).toHaveBeenCalled();
      expect(rmSpy).not.toHaveBeenCalled();
    });

    test("PathMap migrations/template and directory maintenance branches", () => {
      const existsSpy = jest.spyOn(fs, "existsSync").mockImplementation((target: fs.PathLike) => {
        const value = String(target);
        if (value.endsWith(path.join("src", "cli", "templates"))) return true;
        if (value.includes(path.join("src", "test", "database"))) return true;
        return false;
      });
      const mkdirSpy = jest.spyOn(fs, "mkdirSync").mockImplementation(() => undefined as any);
      const rmSpy = jest.spyOn(fs, "rmSync").mockImplementation(() => undefined as any);

      expect(PathMap.appMigrations()).toContain(path.join("src", "app", "database", "migrations"));
      expect(PathMap.testMigrations("pg:test")).toContain(path.join("pg_test"));
      expect(PathMap.migrations(true, "sqlite/test")).toContain(path.join("sqlite_test"));
      expect(PathMap.migrations(false, "mysql")).toContain(path.join("mysql"));
      expect(PathMap.template("seed")).toMatch(/seed\.tpl$/);
      expect(PathMap.template("factory.tpl")).toMatch(/factory\.tpl$/);

      PathMap.ensureDirs();
      expect(mkdirSpy).toHaveBeenCalled();

      PathMap.clearTestDirs();
      expect(rmSpy).toHaveBeenCalled();
      expect(existsSpy).toHaveBeenCalled();
    });

    test("resolveConnectionName covers test-mode, invalid fallback, and explicit valid branches", () => {
      dbConfig.connections = {
        mysql: { driver: "mysql" },
        mysql_test: { driver: "mysql" },
        pg_test: { driver: "pg" },
      } as any;
      dbConfig.default = "mysql";

      process.env.DB_TEST_CONNECTION = "pg_test";
      expect(resolveConnectionName(undefined, { test: true })).toBe("pg_test");

      process.env.DB_TEST_CONNECTION = "missing";
      expect(resolveConnectionName(undefined, { test: true })).toBe("mysql_test");

      process.env.DB_CONNECTION = "missing";
      const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => undefined);
      expect(resolveConnectionName({ connectionName: "missing" }, { test: false })).toBe("mysql");
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("Invalid connection"));

      process.env.DB_CONNECTION = "mysql";
      expect(resolveConnectionName(undefined, { test: false })).toBe("mysql");
    });
  });

  describe("BetterSqliteConnection", () => {
    test("normalizes params for all/get/run and forwards exec/close", async () => {
      const allMock = jest.fn(() => [{ id: 1 }]);
      const getMock = jest.fn(() => ({ id: 2 }));
      const runMock = jest.fn(() => ({ lastInsertRowid: 9, changes: 3 }));
      const execMock = jest.fn();
      const closeMock = jest.fn();
      const prepareMock = jest.fn(() => ({
        all: allMock,
        get: getMock,
        run: runMock,
      }));

      const ctorMock = jest.fn(() => ({
        prepare: prepareMock,
        exec: execMock,
        close: closeMock,
      }));

      jest.doMock("better-sqlite3", () => ctorMock);
      const mod = require("../core/connection/BetterSqliteConnection") as typeof import("../core/connection/BetterSqliteConnection.js");
      const conn = new mod.BetterSqliteConnection(":memory:");

      await conn.all("SELECT 1", "x" as unknown as unknown[]);
      await conn.get("SELECT 2", []);
      const runResult = await conn.run("INSERT", [1, 2]);
      await conn.exec("PRAGMA foreign_keys = ON");
      await conn.close();

      expect(ctorMock).toHaveBeenCalledWith(":memory:");
      expect(allMock).toHaveBeenCalledWith("x");
      expect(getMock).toHaveBeenCalledWith();
      expect(runMock).toHaveBeenCalledWith(1, 2);
      expect(runResult).toEqual({ lastID: 9, changes: 3 });
      expect(execMock).toHaveBeenCalledWith("PRAGMA foreign_keys = ON");
      expect(closeMock).toHaveBeenCalledTimes(1);
    });

    test("uses default params when none are supplied", async () => {
      const allMock = jest.fn(() => [{ id: 1 }]);
      const getMock = jest.fn(() => ({ id: 2 }));
      const runMock = jest.fn(() => ({ lastInsertRowid: 1, changes: 1 }));
      const prepareMock = jest.fn(() => ({
        all: allMock,
        get: getMock,
        run: runMock,
      }));
      const ctorMock = jest.fn(() => ({
        prepare: prepareMock,
        exec: jest.fn(),
        close: jest.fn(),
      }));
      jest.doMock("better-sqlite3", () => ctorMock);
      const mod = require("../core/connection/BetterSqliteConnection") as typeof import("../core/connection/BetterSqliteConnection.js");
      const conn = new mod.BetterSqliteConnection(":memory:");

      await conn.all("SELECT 1");
      await conn.get("SELECT 2");
      await conn.run("INSERT");

      expect(allMock).toHaveBeenCalledWith();
      expect(getMock).toHaveBeenCalledWith();
      expect(runMock).toHaveBeenCalledWith();
    });
  });
});
