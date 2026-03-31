import fs from "fs";
import path from "path";

import { CoreModel, MongoModel } from "../core/model/CoreModel.js";
import { column } from "../core/schema/SchemaBlueprint.js";

describe("LTS phase 5 CoreModel coverage", () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    jest.resetModules();
  });

  test("plan tracks the dedicated CoreModel coverage slice", () => {
    const planPath = path.resolve(
      process.cwd(),
      "validation tasks/LTS-Phase5-CoreModel-Coverage-Plan.md",
    );
    const content = fs.readFileSync(planPath, "utf8");

    expect(content).toContain("# LTS Phase 5 CoreModel Coverage Plan");
    expect(content).toContain("Status: COMPLETED");
    expect(content).toContain("src/core/model/CoreModel.ts");
    expect(content).toContain("src/lab_test/lts.phase5.coremodel-coverage.logic.test.ts");
  });

  test("static safe finder facades delegate through the extracted helper layer", async () => {
    const finder = {
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      with: jest.fn().mockReturnThis(),
      active: jest.fn().mockReturnThis(),
      inactive: jest.fn().mockReturnThis(),
      published: jest.fn().mockReturnThis(),
      get: jest.fn().mockResolvedValue(["get-result"]),
      first: jest.fn().mockResolvedValue("first-result"),
    };
    const filteredFinder = {
      get: jest.fn().mockResolvedValue(["filtered-result"]),
      first: jest
        .fn()
        .mockResolvedValueOnce({ id: 1, status: "active" })
        .mockResolvedValueOnce(null),
    };
    const createSafeFinderQuery = jest.fn(() => finder);
    const applySafeFinderFilters = jest.fn(() => filteredFinder);

    let CoreModelClass: typeof CoreModel | undefined;
    jest.isolateModules(() => {
      jest.doMock("../core/model/CoreModelSafeFinderSupport", () => ({
        createSafeFinderQuery,
        applySafeFinderFilters,
      }));
      ({ CoreModel: CoreModelClass } = require("../core/model/CoreModel"));
    });
    expect(CoreModelClass).toBeDefined();

    class FinderModel extends (CoreModelClass as typeof CoreModel) {
      constructor() {
        super("users", "mysql");
      }
    }

    const Model = FinderModel as typeof FinderModel & {
      where(field: string, value: unknown): unknown;
      orderBy(field: string, direction?: "asc" | "desc"): unknown;
      limit(count: number): unknown;
      with(...relations: string[]): unknown;
      active(...args: unknown[]): unknown;
      inactive(...args: unknown[]): unknown;
      published(...args: unknown[]): unknown;
      get(): Promise<unknown[]>;
      first(): Promise<unknown>;
      findBy(field: string, value: unknown): unknown;
      findOneBy(field: string, value: unknown): Promise<unknown>;
      findAllBy(filters: Record<string, unknown>): Promise<unknown[]>;
      existsBy(filters: Record<string, unknown>): Promise<boolean>;
    };

    expect(Model.where("name", "Ada")).toBe(finder);
    expect(Model.orderBy("id", "desc")).toBe(finder);
    expect(Model.orderBy("created_at")).toBe(finder);
    expect(Model.limit(5)).toBe(finder);
    expect(Model.with("posts", "profile")).toBe(finder);
    expect(Model.active("status")).toBe(finder);
    expect(Model.inactive("status")).toBe(finder);
    expect(Model.published("published_at")).toBe(finder);
    await expect(Model.get()).resolves.toEqual(["get-result"]);
    await expect(Model.first()).resolves.toBe("first-result");
    expect(Model.findBy("email", "ada@example.com")).toBe(finder);
    await expect(Model.findOneBy("email", "ada@example.com")).resolves.toBe(
      "first-result",
    );
    await expect(
      Model.findAllBy({ status: "active", published: true }),
    ).resolves.toEqual(["filtered-result"]);
    await expect(Model.existsBy({ status: "active" })).resolves.toBe(true);
    await expect(Model.existsBy({ status: "inactive" })).resolves.toBe(false);

    const safeFinderCalls = (createSafeFinderQuery as jest.Mock).mock.calls;
    expect(createSafeFinderQuery).toHaveBeenCalled();
    expect(safeFinderCalls[0]?.[0]).toBeInstanceOf(FinderModel);
    expect(safeFinderCalls[0]?.[1]).toBe(FinderModel);
    expect(finder.where).toHaveBeenNthCalledWith(1, "name", "Ada");
    expect(finder.where).toHaveBeenNthCalledWith(2, "email", "ada@example.com");
    expect(finder.where).toHaveBeenNthCalledWith(3, "email", "ada@example.com");
    expect(finder.orderBy).toHaveBeenNthCalledWith(1, "id", "desc");
    expect(finder.orderBy).toHaveBeenNthCalledWith(2, "created_at", "asc");
    expect(finder.limit).toHaveBeenCalledWith(5);
    expect(finder.with).toHaveBeenCalledWith("posts", "profile");
    expect(finder.active).toHaveBeenCalledWith("status");
    expect(finder.inactive).toHaveBeenCalledWith("status");
    expect(finder.published).toHaveBeenCalledWith("published_at");
    expect(finder.get).toHaveBeenCalledTimes(1);
    expect(finder.first).toHaveBeenCalledTimes(2);
    expect(applySafeFinderFilters).toHaveBeenNthCalledWith(1, finder, {
      status: "active",
      published: true,
    });
    expect(applySafeFinderFilters).toHaveBeenNthCalledWith(2, finder, {
      status: "active",
    });
    expect(applySafeFinderFilters).toHaveBeenNthCalledWith(3, finder, {
      status: "inactive",
    });
  });

  test("assertAssignableField rejects unknown persistence fields", () => {
    class PersistenceModel extends CoreModel {
      static schema = {
        id: column("increments"),
        name: column("string", 255),
      };

      constructor() {
        super("users", "mysql");
      }
    }

    const model = new PersistenceModel();

    expect(() => (model as any).assertAssignableField("unknown_field", "fill")).toThrow(
      "Unknown fill field 'unknown_field' on PersistenceModel.",
    );
  });

  test("MongoModel falls back to the raw connection name when no config entry exists", () => {
    class MissingConfigMongoModel extends MongoModel {
      constructor() {
        super("users", "mongo_shadow" as any);
      }
    }

    expect(() => new MissingConfigMongoModel()).toThrow(
      "MongoModel requires a mongo driver connection. Received: mongo_shadow",
    );
  });

  test("save and patch guard persisted state edge cases without issuing writes", async () => {
    class PersistenceModel extends CoreModel {
      static schema = {
        id: column("increments"),
        name: column("string", 255),
      };

      id?: number;
      name?: string;

      constructor() {
        super("users", "mysql");
      }
    }

    const createNullModel = new PersistenceModel();
    createNullModel.name = "Ada";
    (createNullModel as any).create = jest.fn().mockResolvedValue(null);

    await expect(createNullModel.save()).resolves.toBeUndefined();
    expect((createNullModel as any).create).toHaveBeenCalledWith({ name: "Ada" });
    expect((createNullModel as any)._exists).toBe(false);

    const missingSavePkModel = new PersistenceModel();
    (missingSavePkModel as any)._exists = true;
    (missingSavePkModel as any)._originalAttributes = { name: "Ada" };
    (missingSavePkModel as any).update = jest.fn();

    await expect(missingSavePkModel.save()).rejects.toThrow(
      "Cannot save persisted PersistenceModel without primary key 'id'.",
    );
    expect((missingSavePkModel as any).update).not.toHaveBeenCalled();

    const missingPatchPkModel = new PersistenceModel();
    (missingPatchPkModel as any)._exists = true;
    (missingPatchPkModel as any)._originalAttributes = { name: "Ada" };
    (missingPatchPkModel as any).update = jest.fn();

    await expect(missingPatchPkModel.patch({ name: "Grace" })).rejects.toThrow(
      "Cannot patch persisted PersistenceModel without primary key 'id'.",
    );
    expect((missingPatchPkModel as any).update).not.toHaveBeenCalled();

    const noOpPatchModel = new PersistenceModel();
    noOpPatchModel.id = 7;
    noOpPatchModel.name = "Ada";
    (noOpPatchModel as any)._exists = true;
    (noOpPatchModel as any)._originalAttributes = { id: 7, name: "Ada" };
    (noOpPatchModel as any).update = jest.fn();

    await expect(noOpPatchModel.patch({ id: 7, name: "Ada" })).resolves.toBeUndefined();
    expect((noOpPatchModel as any).update).not.toHaveBeenCalled();
    expect(noOpPatchModel.name).toBe("Ada");
  });

  test("bulk static helpers cover invalid payloads, restore guards, and null-skipping createMany", async () => {
    class BulkModel extends CoreModel {
      static schema = {
        id: column("increments"),
        name: column("string", 255),
      };

      id?: number;
      name?: string;

      constructor() {
        super("users", "mysql");
      }
    }

    const createSpy = jest
      .spyOn(BulkModel, "create")
      .mockResolvedValueOnce(null as never)
      .mockResolvedValueOnce({ id: 2, name: "Grace" } as never);

    await expect(
      (BulkModel as typeof BulkModel & {
        createMany(rows: Record<string, unknown>[]): Promise<Array<Record<string, unknown>>>;
      }).createMany([{ name: "Ada" }, { name: "Grace" }]),
    ).resolves.toEqual([{ id: 2, name: "Grace" }]);
    expect(createSpy).toHaveBeenCalledTimes(2);

    await expect(
      (BulkModel as typeof BulkModel & {
        createMany(rows: unknown): Promise<unknown>;
      }).createMany("bad-input"),
    ).rejects.toThrow("BulkModel.createMany() expects an array of payload objects.");

    await expect(
      (BulkModel as typeof BulkModel & {
        updateMany(ids: unknown, data: Record<string, unknown>, pk?: string): Promise<void>;
      }).updateMany("bad-input", { active: false }),
    ).rejects.toThrow("BulkModel.updateMany() expects an array of primary keys.");

    await expect(
      (BulkModel as typeof BulkModel & {
        patchMany(rows: unknown, pk?: string): Promise<void>;
      }).patchMany("bad-input"),
    ).rejects.toThrow("BulkModel.patchMany() expects an array of partial payload objects.");

    await expect(
      (BulkModel as typeof BulkModel & {
        patchMany(rows: Record<string, unknown>[], pk?: string): Promise<void>;
      }).patchMany([null as unknown as Record<string, unknown>]),
    ).rejects.toThrow("BulkModel.patchMany() expects plain object items.");

    await expect(
      (BulkModel as typeof BulkModel & {
        patchMany(rows: Record<string, unknown>[], pk?: string): Promise<void>;
      }).patchMany([{ name: "Ada" }]),
    ).rejects.toThrow("BulkModel.patchMany() requires primary key 'id' on every item.");

    await expect(
      (BulkModel as typeof BulkModel & {
        deleteMany(ids: unknown, pk?: string): Promise<void>;
      }).deleteMany("bad-input"),
    ).rejects.toThrow("BulkModel.deleteMany() expects an array of primary keys.");

    await expect(
      (BulkModel as typeof BulkModel & {
        restoreMany(ids: unknown, pk?: string): Promise<void>;
      }).restoreMany("bad-input"),
    ).rejects.toThrow("BulkModel.restoreMany() expects an array of primary keys.");

    await expect(
      (BulkModel as typeof BulkModel & {
        restoreMany(ids: Array<number | string>, pk?: string): Promise<void>;
      }).restoreMany([1]),
    ).rejects.toThrow("BulkModel does not support restoreMany().");
  });

  test("private CoreModel wrapper helpers cover validation, persistence snapshots, mongo filters, and event passthrough", async () => {
    class WrapperModel extends CoreModel {
      static schema = {
        id: column("increments"),
        name: column("string", 255),
      };

      static modelEvents = {
        beforeCreate: jest.fn(() => true),
      };

      id?: number;
      _id?: string;
      name?: string;

      constructor() {
        super("users", "mongo");
      }
    }

    const model = new WrapperModel() as any;

    model.id = 7;
    model._id = "mongo-7";
    model.name = "Ada";
    (model as any)._originalAttributes = { id: 7, name: "Ada" };
    (model as any)._exists = true;

    expect(model.buildMongoPrimaryFilter("id", 7)).toEqual({ $or: [{ id: 7 }, { _id: 7 }] });
    expect(model.getPersistenceSchema()).toEqual(WrapperModel.schema);
    expect(model.getColumnFieldNames()).toEqual(["id", "name"]);
    expect(model.resolvePrimaryKey()).toBe("id");
    expect(model.getPrimaryKeyValue("id")).toBe(7);
    expect(model.getOriginalPrimaryKeyValue("id")).toBe(7);
    expect(model.createSnapshot({ _id: "mongo-7", name: "Ada" })).toEqual({
      id: "mongo-7",
      name: "Ada",
    });

    model.syncPersistedState({ id: 7, name: "Ada" });
    expect((model as any)._exists).toBe(true);
    expect((model as any)._originalAttributes).toEqual({ id: 7, name: "Ada" });

    expect(model.sanitizeAssignableData({ name: "Grace" }, "fill")).toEqual({ name: "Grace" });
    expect(model.extractPersistableAttributes()).toEqual({ id: 7, name: "Ada" });
    expect(() => model.assertPrimaryKeyNotMutated("id")).not.toThrow();
    expect(model.getDirtyAttributes("id")).toEqual({});

    await expect(model.validateData({ name: "Ada" })).resolves.toBeUndefined();
    await expect(
      model.validateDataInternal({ name: "Ada" }, { partial: true }),
    ).resolves.toBeUndefined();
    await expect(model.fireEvent("beforeCreate", { name: "Ada" })).resolves.toBe(true);
  });

  test("direct CoreModel static create/find and delete state guards cover remaining branches", async () => {
    class StaticDirectModel extends CoreModel {
      static schema = {
        id: column("increments"),
        name: column("string", 255),
      };

      constructor() {
        super("users", "mysql");
      }
    }

    jest
      .spyOn(StaticDirectModel.prototype, "create")
      .mockImplementation(
        async (data: Record<string, unknown>) =>
          ({ id: 11, ...data }) as unknown as StaticDirectModel | null,
      );
    jest
      .spyOn(StaticDirectModel.prototype, "find")
      .mockImplementation(
        async (id: number | string, pk = "id") =>
          ({ id, pk }) as unknown as StaticDirectModel | null,
      );

    await expect(
      (StaticDirectModel as typeof StaticDirectModel & {
        create(data: Record<string, unknown>): Promise<Record<string, unknown> | null>;
      }).create({ name: "Ada" }),
    ).resolves.toEqual({ id: 11, name: "Ada" });

    await expect(
      (StaticDirectModel as typeof StaticDirectModel & {
        find(id: number | string, pk?: string): Promise<Record<string, unknown> | null>;
      }).find(9, "uuid"),
    ).resolves.toEqual({ id: 9, pk: "uuid" });

    const missingPk = new StaticDirectModel() as any;
    missingPk._exists = true;
    missingPk._originalAttributes = {};
    await expect(missingPk.delete()).rejects.toThrow(
      "Cannot delete StaticDirectModel without primary key 'id'.",
    );

    const persisted = new StaticDirectModel() as any;
    persisted.id = 77;
    persisted._exists = true;
    persisted._originalAttributes = { id: 77, name: "Ada" };

    const fireEventSpy = jest.spyOn(persisted, "fireEvent").mockResolvedValue(true);
    const adapter = {
      wrapId: jest.fn((value: string) => `\`${value}\``),
      placeholder: jest.fn(() => "?"),
      execute: jest.fn(async () => undefined),
    };
    jest.spyOn(persisted, "getDB").mockResolvedValue(adapter as any);

    await expect(persisted.delete()).resolves.toBeUndefined();
    expect(fireEventSpy).toHaveBeenNthCalledWith(1, "beforeDelete", 77);
    expect(fireEventSpy).toHaveBeenNthCalledWith(2, "afterDelete", 77);
    expect(persisted._exists).toBe(false);
    expect(persisted._originalAttributes).toEqual({});

    const fallbackPkModel = new StaticDirectModel() as any;
    fallbackPkModel.id = 91;
    fallbackPkModel._exists = true;
    fallbackPkModel._originalAttributes = { id: 91 };
    jest.spyOn(fallbackPkModel, "fireEvent").mockResolvedValue(true);
    jest.spyOn(fallbackPkModel, "getDB").mockResolvedValue(adapter as any);

    await expect(fallbackPkModel.delete(91, null as any)).resolves.toBeUndefined();
    expect(adapter.execute).toHaveBeenLastCalledWith("DELETE FROM `users` WHERE `id` = ?", [91]);
  });
});
