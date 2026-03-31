import fs from "fs";
import path from "path";

import { BelongsToMany } from "../core/orm/relations/BelongsToMany.js";

type Row = Record<string, unknown>;

type MongoCollection = {
  find: (filter: Record<string, unknown>) => {
    toArray: () => Promise<Row[]>;
  };
  insertOne?: (doc: Record<string, unknown>) => Promise<unknown>;
  insertMany?: (docs: Record<string, unknown>[]) => Promise<unknown>;
  deleteMany?: (filter: Record<string, unknown>) => Promise<unknown>;
};

let currentDb: {
  collection: (name: string) => MongoCollection;
};

class RelatedModel {
  tableName = "tags";

  async getDB(): Promise<unknown> {
    return currentDb;
  }

  static hydrateRow(row: Row | null): Row | null {
    if (!row || row.__skip === true) return null;
    return { ...row };
  }

  static hydrateMany(rows: Row[]): Row[] {
    return rows.map((row) => ({ ...row }));
  }
}

function makeFindCollection(rows: Row[], onFind?: (filter: Record<string, unknown>) => void): MongoCollection {
  return {
    find(filter: Record<string, unknown>) {
      onFind?.(filter);
      return {
        async toArray() {
          return rows.map((row) => ({ ...row }));
        },
      };
    },
  };
}

describe("LTS phase 5 BelongsToMany coverage", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("plan tracks the dedicated BelongsToMany LTS slice", () => {
    const planPath = path.resolve(
      process.cwd(),
      "validation tasks/LTS-Phase5-BelongsToMany-Coverage-Plan.md",
    );
    const content = fs.readFileSync(planPath, "utf8");

    expect(content).toContain("# LTS Phase 5 BelongsToMany Coverage Plan");
    expect(content).toContain("Status: COMPLETED");
    expect(content).toContain("src/core/orm/relations/BelongsToMany.ts");
    expect(content).toContain(
      "src/lab_test/lts.phase5.belongs-to-many-coverage.logic.test.ts",
    );
  });

  test("mongo getResults returns [] for missing parent ids and for empty pivot ids", async () => {
    const collectionSpy = jest.fn();
    currentDb = {
      collection(name: string) {
        collectionSpy(name);
        return makeFindCollection([{ post_id: 1 }]);
      },
    };

    const relation = new BelongsToMany(
      RelatedModel as never,
      "post_tag_pivot",
      "post_id",
      "tag_id",
    );

    await expect(relation.getResults({})).resolves.toEqual([]);
    expect(collectionSpy).not.toHaveBeenCalled();

    await expect(relation.getResults({ id: 1 })).resolves.toEqual([]);
    expect(collectionSpy).toHaveBeenCalledWith("post_tag_pivot");
  });

  test("mongo match covers missing parent keys, duplicate ids, missing rows, hydrateRow null, and relation fallback", async () => {
    const relatedFindSpy = jest.fn();

    currentDb = {
      collection(name: string) {
        if (name === "post_tag_pivot") {
          return makeFindCollection([
            { post_id: 1, tag_id: 10 },
            { post_id: undefined, tag_id: 999 },
            { post_id: 1, tag_id: 10 },
            { post_id: 1, tag_id: 11 },
            { post_id: 1, tag_id: 12 },
          ]);
        }

        return makeFindCollection(
          [
            { id: 10, name: "alpha" },
            { id: 11, name: "skip", __skip: true },
          ],
          relatedFindSpy,
        );
      },
    };

    const relation = new BelongsToMany(
      RelatedModel as never,
      "post_tag_pivot",
      "post_id",
      "tag_id",
    );
    ((relation as unknown) as { name?: string }).name = undefined;

    const parents: Row[] = [{ id: 1 }, { id: 2 }];
    await relation.match(parents);

    expect(relatedFindSpy).toHaveBeenCalledTimes(1);
    expect((parents[0] as { relation?: Row[] }).relation).toEqual([
      { id: 10, name: "alpha" },
    ]);
    expect((parents[1] as { relation?: Row[] }).relation).toEqual([]);
  });

  test("mongo match skips related lookup when no related ids are present", async () => {
    const relatedCollectionSpy = jest.fn();

    currentDb = {
      collection(name: string) {
        if (name === "post_tag_pivot") {
          return makeFindCollection([{ post_id: undefined }]);
        }

        relatedCollectionSpy(name);
        return makeFindCollection([]);
      },
    };

    const relation = new BelongsToMany(
      RelatedModel as never,
      "post_tag_pivot",
      "post_id",
      "tag_id",
    );
    ((relation as unknown) as { name?: string }).name = undefined;

    const parents: Row[] = [{ id: 1 }];
    await relation.match(parents);

    expect(relatedCollectionSpy).not.toHaveBeenCalled();
    expect((parents[0] as { relation?: Row[] }).relation).toEqual([]);
  });

  test("mongo attach falls back to insertMany and throws when inserts are unsupported", async () => {
    const insertMany = jest.fn(async () => ({ acknowledged: true }));

    currentDb = {
      collection() {
        return {
          find() {
            return { async toArray() { return []; } };
          },
          insertMany,
        };
      },
    };

    const relation = new BelongsToMany(
      RelatedModel as never,
      "post_tag_pivot",
      "post_id",
      "tag_id",
    );

    await relation.attach("p1", "t1");
    expect(insertMany).toHaveBeenCalledWith([
      { post_id: "p1", tag_id: "t1" },
    ]);

    currentDb = {
      collection() {
        return {
          find() {
            return { async toArray() { return []; } };
          },
        };
      },
    };

    await expect(relation.attach("p1", "t2")).rejects.toThrow(
      "MongoDB pivot collection does not support insert operations.",
    );
  });

  test("mongo detach throws when deleteMany is unsupported", async () => {
    currentDb = {
      collection() {
        return {
          find() {
            return { async toArray() { return []; } };
          },
        };
      },
    };

    const relation = new BelongsToMany(
      RelatedModel as never,
      "post_tag_pivot",
      "post_id",
      "tag_id",
    );

    await expect(relation.detach("p1", "t1")).rejects.toThrow(
      "MongoDB pivot collection does not support delete operations.",
    );
  });

  test("mongo sync covers missing deleteMany, empty related ids, and attach fallback when insertMany is absent", async () => {
    currentDb = {
      collection() {
        return {
          find() {
            return { async toArray() { return []; } };
          },
        };
      },
    };

    const relation = new BelongsToMany(
      RelatedModel as never,
      "post_tag_pivot",
      "post_id",
      "tag_id",
    );

    await expect(relation.sync("p1", ["t1"])).rejects.toThrow(
      "MongoDB pivot collection does not support delete operations.",
    );

    const deleteMany = jest.fn(async () => ({ acknowledged: true }));
    currentDb = {
      collection() {
        return {
          find() {
            return { async toArray() { return []; } };
          },
          deleteMany,
        };
      },
    };

    await relation.sync("p1", []);
    expect(deleteMany).toHaveBeenCalledWith({ post_id: "p1" });

    const attachSpy = jest
      .spyOn(relation, "attach")
      .mockResolvedValue(undefined);

    currentDb = {
      collection() {
        return {
          find() {
            return { async toArray() { return []; } };
          },
          deleteMany,
        };
      },
    };

    await relation.sync("p1", ["t2", "t3"]);
    expect(attachSpy).toHaveBeenNthCalledWith(1, "p1", "t2");
    expect(attachSpy).toHaveBeenNthCalledWith(2, "p1", "t3");
  });
});
