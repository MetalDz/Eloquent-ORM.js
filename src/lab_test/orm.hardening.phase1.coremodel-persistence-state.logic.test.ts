import fs from "fs";
import path from "path";
import {
  assertPrimaryKeyNotMutated,
  buildMongoPrimaryFilter,
  createPersistedSnapshot,
  extractPersistableAttributes,
  getColumnFieldNames,
  getDirtyAttributes,
  getOriginalPrimaryKeyValue,
  getPersistenceSchema,
  getPrimaryKeyValue,
  resolvePrimaryKey,
  sanitizeAssignableData,
} from "../core/model/CoreModelPersistenceState.js";
import { column, relation, type SchemaField } from "../core/schema/SchemaBlueprint.js";

describe("ORM hardening phase 1 CoreModel persistence state extraction", () => {
  const rootDir = process.cwd();
  const planPath = path.resolve(
    rootDir,
    "validation tasks/ORM-Hardening-Phase1-CoreModel-Persistence-State-Extraction-Plan.md"
  );

  test("sub-plan exists and freezes the extraction scope", () => {
    const plan = fs.readFileSync(planPath, "utf8");

    const requiredSnippets = [
      "# ORM Hardening Phase 1 CoreModel Persistence State Extraction Plan",
      "Status: COMPLETED",
      "primary-key resolution",
      "persisted snapshot creation",
      "assignable payload validation",
      "dirty-field calculation",
      "Mongo primary-key filter construction",
      "`CoreModel` delegates persistence-state helper logic to a dedicated module.",
      "Existing instance persistence behavior (`fill`, `save`, `patch`) still passes.",
      "`npm run typecheck`",
    ];

    for (const snippet of requiredSnippets) {
      expect(plan).toContain(snippet);
    }
  });

  test("primary key helpers resolve schema priorities and id fallbacks", () => {
    const explicitSchema = {
      uuid: column("uuid", undefined, { primary: true }),
      name: column("string"),
    };
    const mongoSchema = {
      _id: column("string"),
      name: column("string"),
    };

    expect(resolvePrimaryKey(explicitSchema)).toBe("uuid");
    expect(resolvePrimaryKey(mongoSchema)).toBe("_id");
    expect(resolvePrimaryKey(undefined)).toBe("id");

    expect(getPrimaryKeyValue({ id: 4 }, "id")).toBe(4);
    expect(getPrimaryKeyValue({ _id: "m1" }, "id")).toBe("m1");
    expect(getPrimaryKeyValue({ id: 7 }, "_id")).toBe(7);

    expect(getOriginalPrimaryKeyValue({ id: 9 }, "_id")).toBe(9);
    expect(getOriginalPrimaryKeyValue({ _id: "x1" }, "id")).toBe("x1");
    expect(getOriginalPrimaryKeyValue({}, "id")).toBeUndefined();
  });

  test("snapshot helpers filter schema fields and mirror id/_id fallbacks", () => {
    const schema = {
      id: column("increments", undefined, { primary: true }),
      name: column("string"),
      owner: relation("belongsTo", "User", { foreignKey: "user_id" }),
    } satisfies Record<string, SchemaField>;

    expect(
      createPersistedSnapshot({
        source: { id: 3, name: "Alpha", owner: "skip", _internal: true },
        schema,
        primaryKey: "id",
      })
    ).toEqual({ id: 3, name: "Alpha" });

    expect(
      createPersistedSnapshot({
        source: { id: "mongo-like", name: "Geo" },
        schema: {
          _id: column("string"),
          name: column("string"),
        },
        primaryKey: "_id",
      })
    ).toEqual({ _id: "mongo-like", name: "Geo" });

    expect(
      createPersistedSnapshot({
        source: { id: 1, name: "NoSchema", _private: "skip" },
        primaryKey: "id",
      })
    ).toEqual({ id: 1, name: "NoSchema" });
  });

  test("schema and assignable helpers reject schema-less, invalid, and relation payloads", () => {
    const schema = {
      id: column("increments", undefined, { primary: true }),
      name: column("string"),
      owner: relation("belongsTo", "User", { foreignKey: "user_id" }),
    } satisfies Record<string, SchemaField>;

    expect(() => getPersistenceSchema("UserModel", undefined)).toThrow(
      "UserModel must define a schema to use fill(), save(), or patch()."
    );

    expect(getColumnFieldNames(schema)).toEqual(["id", "name"]);
    expect(
      extractPersistableAttributes({
        record: { id: 1, name: "Alpha", owner: 7 },
        columnFieldNames: getColumnFieldNames(schema),
      })
    ).toEqual({ id: 1, name: "Alpha" });

    expect(() =>
      sanitizeAssignableData({
        data: [] as unknown as Record<string, unknown>,
        usage: "fill",
        schema,
        modelName: "UserModel",
      })
    ).toThrow("fill() expects a plain object payload.");

    expect(() =>
      sanitizeAssignableData({
        data: { owner: 7 },
        usage: "patch",
        schema,
        modelName: "UserModel",
      })
    ).toThrow("Unknown patch field 'owner' on UserModel.");

    expect(
      sanitizeAssignableData({
        data: { name: "Alpha" },
        usage: "fill",
        schema,
        modelName: "UserModel",
      })
    ).toEqual({ name: "Alpha" });
  });

  test("dirty attribute and primary key mutation helpers keep persistence semantics intact", () => {
    expect(
      getDirtyAttributes({
        currentAttributes: { id: 5, name: "Beta", active: true },
        originalAttributes: { id: 5, name: "Alpha", active: true },
        primaryKey: "id",
      })
    ).toEqual({ name: "Beta" });

    expect(() =>
      assertPrimaryKeyNotMutated({
        exists: true,
        primaryKey: "id",
        currentPrimaryKey: 7,
        originalPrimaryKey: 5,
        modelName: "UserModel",
      })
    ).toThrow("Cannot change persisted primary key 'id' on UserModel.");

    expect(() =>
      assertPrimaryKeyNotMutated({
        exists: false,
        primaryKey: "id",
        currentPrimaryKey: 7,
        originalPrimaryKey: 5,
        modelName: "UserModel",
      })
    ).not.toThrow();
  });

  test("mongo primary filter helper keeps id, _id, and custom key behavior", () => {
    expect(buildMongoPrimaryFilter("id", "abc")).toEqual({
      $or: [{ id: "abc" }, { _id: "abc" }],
    });
    expect(buildMongoPrimaryFilter("_id", "mongo-1")).toEqual({ _id: "mongo-1" });
    expect(buildMongoPrimaryFilter("slug", "alpha")).toEqual({ slug: "alpha" });
  });
});
