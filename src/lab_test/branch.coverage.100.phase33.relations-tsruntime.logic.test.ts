import fs from "fs";
import os from "os";
import path from "path";
import type { DriverAdapter } from "../core/connection/DriverAdapter";
import { BelongsTo } from "../core/orm/relations/BelongsTo";
import { HasMany } from "../core/orm/relations/HasMany";
import { HasOne } from "../core/orm/relations/HasOne";
import { MorphTo } from "../core/orm/relations/MorphTo";
import { MorphRegistry } from "../core/orm/mixins/MorphRegistry";

type Row = Record<string, unknown>;

type MockAdapter = {
  query: jest.Mock<Promise<Row[]>, [string, unknown[]?]>;
  queryOne: jest.Mock<Promise<Row | null>, [string, unknown[]?]>;
} & Omit<DriverAdapter, "query" | "queryOne">;

function makeAdapter(): MockAdapter {
  return {
    name: "pg_test",
    kind: "sql",
    query: jest.fn<Promise<Row[]>, [string, unknown[]?]>(async () => []),
    queryOne: jest.fn<Promise<Row | null>, [string, unknown[]?]>(async () => null),
    execute: jest.fn(async () => undefined),
    insert: jest.fn(async () => ({ id: undefined })),
    placeholder: (index: number) => `$${index}`,
    placeholders: (count: number, start = 1) =>
      Array.from({ length: count }, (_, idx) => `$${start + idx}`).join(", "),
    inClause: (field: string, values: unknown[], startIndex = 1) => ({
      sql: `${field} IN (${Array.from({ length: values.length }, (_, i) => `$${startIndex + i}`).join(", ")})`,
      params: values,
      nextIndex: startIndex + values.length,
    }),
    wrapId: (id: string) => id,
  };
}

function makeRelatedModel(
  adapter: MockAdapter,
  tableName: string,
  hydrateRowImpl?: (row: Row | null) => Row | null
) {
  class RelatedModel {
    tableName = tableName;

    async getDB(): Promise<DriverAdapter> {
      return adapter as unknown as DriverAdapter;
    }

    static hydrateRow(row: Row | null): Row | null {
      if (hydrateRowImpl) return hydrateRowImpl(row);
      return row;
    }

    static hydrateMany(rows: Row[]): Row[] {
      return rows;
    }
  }

  return RelatedModel;
}

describe("Branch coverage 100% - phase 33 relation + tsRuntime edge branches", () => {
  afterEach(() => {
    MorphRegistry.clear();
    jest.restoreAllMocks();
    jest.resetModules();
    jest.unmock("ts-node");
  });

  test("BelongsTo/HasOne/HasMany match skip null-hydrated rows and use default relation name", async () => {
    const adapter = makeAdapter();
    adapter.query.mockResolvedValue([
      { id: 1, user_id: 7, post_id: 7, title: "skip" },
      { id: 7, user_id: 7, post_id: 7, title: "keep" },
    ]);

    const RelatedModel = makeRelatedModel(adapter, "items", (row) => {
      if (!row) return null;
      return row.id === 1 ? null : row;
    });

    const belongsTo = new BelongsTo(RelatedModel as never, "user_id", "id");
    const hasOne = new HasOne(RelatedModel as never, "user_id", "id");
    const hasMany = new HasMany(RelatedModel as never, "post_id", "id");

    (belongsTo as unknown as { name?: string }).name = undefined;
    (hasOne as unknown as { name?: string }).name = undefined;
    (hasMany as unknown as { name?: string }).name = undefined;

    const belongsParent: Row = { user_id: 7 };
    const hasOneParent: Row = { id: 7 };
    const hasManyParent: Row = { id: 7 };

    await belongsTo.match([belongsParent]);
    await hasOne.match([hasOneParent]);
    await hasMany.match([hasManyParent]);

    expect(belongsParent.relation).toEqual({ id: 7, user_id: 7, post_id: 7, title: "keep" });
    expect(hasOneParent.relation).toEqual({ id: 7, user_id: 7, post_id: 7, title: "keep" });
    expect(hasManyParent.relation).toEqual([{ id: 7, user_id: 7, post_id: 7, title: "keep" }]);
  });

  test("MorphTo match skips null-hydrated rows and assigns default relation name", async () => {
    const adapter = makeAdapter();
    adapter.query.mockResolvedValue([{ id: 10 }, { id: 11 }]);

    class PhotoModel {
      tableName = "photos";

      async getDB(): Promise<DriverAdapter> {
        return adapter as unknown as DriverAdapter;
      }

      static hydrateRow(row: Row | null): Row | null {
        if (!row) return null;
        return row.id === 10 ? null : row;
      }

      static hydrateMany(rows: Row[]): Row[] {
        return rows;
      }
    }

    MorphRegistry.register("Photo", PhotoModel as never);
    const relation = new MorphTo("commentable_type", "commentable_id");
    (relation as unknown as { name?: string }).name = undefined;

    const parents: Row[] = [
      { commentable_type: "Photo", commentable_id: 10 },
      { commentable_type: "Photo", commentable_id: 11 },
    ];

    await relation.match(parents);

    expect(parents[0].relation).toBeNull();
    expect(parents[1].relation).toEqual({ id: 11 });
  });

  test("tsRuntime ensureTsRuntime short-circuits after first successful register", () => {
    const register = jest.fn();
    jest.doMock("ts-node", () => ({ register }));

    let runtime: typeof import("../cli/utils/typescript/tsRuntime");
    jest.isolateModules(() => {
      runtime = require("../cli/utils/typescript/tsRuntime") as typeof import("../cli/utils/typescript/tsRuntime");
    });

    expect(runtime!.ensureTsRuntime()).toBe(true);
    expect(runtime!.ensureTsRuntime()).toBe(true);
    expect(register).toHaveBeenCalledTimes(1);
  });

  test("tsRuntime loads .ts outside src when ts-node is unavailable", () => {
    jest.doMock("ts-node", () => {
      throw new Error("ts-node unavailable");
    });

    let runtime: typeof import("../cli/utils/typescript/tsRuntime");
    jest.isolateModules(() => {
      runtime = require("../cli/utils/typescript/tsRuntime") as typeof import("../cli/utils/typescript/tsRuntime");
    });

    const root = fs.mkdtempSync(path.join(os.tmpdir(), "runtime-no-tsnode-"));
    const outsideTsPath = path.join(root, "outside-module.ts");
    fs.writeFileSync(outsideTsPath, "module.exports = { ok: 'fallback' };", "utf8");

    try {
      expect(runtime!.loadModule(outsideTsPath)).toEqual({ ok: "fallback" });
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test("tsRuntime loads .ts directly when ts-node runtime is available", () => {
    let runtime: typeof import("../cli/utils/typescript/tsRuntime");
    jest.isolateModules(() => {
      runtime = require("../cli/utils/typescript/tsRuntime") as typeof import("../cli/utils/typescript/tsRuntime");
    });

    const root = fs.mkdtempSync(path.join(os.tmpdir(), "runtime-ok-"));
    const tsFile = path.join(root, "ok.ts");
    fs.writeFileSync(tsFile, "module.exports = { ok: true };", "utf8");

    expect(runtime!.loadModule(tsFile)).toEqual({ ok: true });
  });
});
