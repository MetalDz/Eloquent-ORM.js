import { EagerLoadingMixin } from "../core/orm/mixins/EagerLoadingMixin";
import { SoftDeletesMixin } from "../core/orm/mixins/SoftDeletesMixin";

describe("LTS phase 5 residual ORM mixin coverage", () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    jest.restoreAllMocks();
  });

  test("EagerLoadingMixin covers top-level and nested eager loading branches plus helper fallbacks", async () => {
    const profileMatch = jest.fn(async (records: Array<Record<string, unknown>>) => {
      for (const row of records) {
        row.profile = { id: `profile-${row.id}` };
      }
    });
    const postsMatch = jest.fn(async (records: Array<Record<string, unknown>>) => {
      for (const row of records) {
        row.posts =
          row.id === 1
            ? [
                {
                  id: "post-1a",
                  getRelation: (name: string) =>
                    name === "comments"
                      ? {
                          match: async (children: Array<Record<string, unknown>>) => {
                            for (const child of children) {
                              child.comments = [{ id: `comment-${child.id}` }];
                            }
                          },
                          getResults: async () => [],
                        }
                      : {
                          match: async (children: Array<Record<string, unknown>>) => {
                            for (const child of children) {
                              child.tags = [{ id: `tag-${child.id}` }];
                            }
                          },
                          getResults: async () => [],
                        },
                },
              ]
            : {
                id: "post-2a",
                getRelation: (name: string) =>
                  name === "comments"
                    ? {
                        match: async (children: Array<Record<string, unknown>>) => {
                          for (const child of children) {
                            child.comments = [{ id: `comment-${child.id}` }];
                          }
                        },
                        getResults: async () => [],
                      }
                    : {
                        match: async (children: Array<Record<string, unknown>>) => {
                          for (const child of children) {
                            child.tags = [{ id: `tag-${child.id}` }];
                          }
                        },
                        getResults: async () => [],
                      },
              };
      }
    });

    class EagerBase {
      async all(): Promise<Array<Record<string, unknown>>> {
        return [{ id: 1 }, { id: 2 }];
      }

      async find(id: number | string): Promise<Record<string, unknown> | null> {
        return { id };
      }
    }

    class EagerModel extends EagerLoadingMixin(
      EagerBase as unknown as abstract new (...args: any[]) => object,
    ) {
      profile() {
        return {
          match: profileMatch,
          getResults: async () => ({ id: "profile-single" }),
        };
      }

      posts() {
        return {
          match: postsMatch,
          getResults: async () => [{ id: "post-single" }],
        };
      }
    }

    const model = new (EagerModel as any)().with("profile", "posts.comments", "posts.tags");
    const all = await model.all();

    expect(profileMatch).toHaveBeenCalledTimes(1);
    expect(postsMatch).toHaveBeenCalledTimes(1);
    expect(all[0].profile).toEqual({ id: "profile-1" });
    expect(all[0].posts[0].comments).toEqual([{ id: "comment-post-1a" }]);
    expect(all[0].posts[0].tags).toEqual([{ id: "tag-post-1a" }]);
    expect(all[1].posts.comments).toEqual([{ id: "comment-post-2a" }]);
    expect(all[1].posts.tags).toEqual([{ id: "tag-post-2a" }]);

    const found = await new (EagerModel as any)().with("profile").find(5);
    expect(found?.profile).toEqual({ id: "profile-5" });

    const loadFallbackModel = new (EagerModel as any)();
    loadFallbackModel.profile = () => ({
      getResults: async function (this: { name?: string }) {
        this.name = undefined;
        return { id: "profile-load" };
      },
    });
    await loadFallbackModel.load("profile");
    expect(loadFallbackModel.profile).toEqual({ id: "profile-load" });

    const relation = {
      match: jest.fn(async () => undefined),
      getResults: async () => undefined,
    };
    await expect((model as any).loadNestedRelations([{ relation: [] }], relation, "")).resolves.toBeUndefined();
    await expect(
      (model as any).loadNestedRelations([{ relation: null }], relation, "comments"),
    ).resolves.toBeUndefined();
    await expect(
      (model as any).loadNestedRelations(
        [{ relation: [{ id: "plain-child" }] }],
        relation,
        "comments",
      ),
    ).resolves.toBeUndefined();
    await expect(
      (model as any).loadNestedRelations(
        [
          {
            relation: [
              {
                getRelation: () => null,
              },
            ],
          },
        ],
        relation,
        "comments",
      ),
    ).resolves.toBeUndefined();

    expect((model as any).getBaseMethod("missingMethod")).toBeNull();
    expect(typeof model.getRelation("profile")).toBe("object");

    process.env.NODE_ENV = "test";
    class NoBaseEager extends EagerLoadingMixin(
      (class {} as unknown) as abstract new (...args: any[]) => object,
    ) {}

    const noBase = new (NoBaseEager as any)();
    expect(await noBase.all()).toEqual([]);
    expect(await noBase.find(1)).toBeNull();
    expect((noBase as any).getBaseMethod("update")).toBeNull();
  });

  test("SoftDeletesMixin covers soft delete state sync, filtering, restore, force delete, and delegated update branches", async () => {
    const updates: Array<[number | string, Record<string, unknown>, string]> = [];
    const deletes: Array<[number | string, string]> = [];
    const syncPersistedState = jest.fn();

    class SoftBase {
      async all(): Promise<Array<Record<string, unknown>>> {
        return [
          { id: 1, name: "A", deleted_at: null },
          { id: 2, name: "B", deleted_at: "2026-03-16T00:00:00.000Z" },
        ];
      }

      async find(id: number | string): Promise<Record<string, unknown> | null> {
        if (id === "missing") return null;
        if (id === "deleted") {
          return { id, deleted_at: "2026-03-16T00:00:00.000Z" };
        }
        return { id, deleted_at: null };
      }

      async update(
        id: number | string,
        data: Record<string, unknown>,
        pk = "id",
      ): Promise<void> {
        updates.push([id, data, pk]);
      }

      async delete(id: number | string, pk = "id"): Promise<void> {
        deletes.push([id, pk]);
      }
    }

    class SoftModel extends SoftDeletesMixin(
      SoftBase as unknown as abstract new (...args: any[]) => object,
    ) {
      public id = 5;
      public _id = "mongo-5";
      public uuid = "uuid-5";
      public _exists = true;
      public _originalAttributes = { id: 5, _id: "mongo-5", uuid: "uuid-5" };
      public syncPersistedState = syncPersistedState;
    }

    const model = new SoftModel() as any;

    await model.delete(5);
    expect(updates[0][2]).toBe("id");
    expect(typeof updates[0][1].deleted_at).toBe("string");
    expect(typeof model.deleted_at).toBe("string");
    expect(syncPersistedState).toHaveBeenCalledWith(expect.objectContaining({ deleted_at: model.deleted_at }));

    await model.restore(5);
    expect(updates[1]).toEqual([5, { deleted_at: null }, "id"]);
    expect(model.deleted_at).toBeNull();

    expect(await model.all()).toEqual([{ id: 1, name: "A", deleted_at: null }]);
    expect(await model.find("missing")).toBeNull();
    expect(await model.find("deleted")).toBeNull();
    expect(await model.find(7)).toEqual({ id: 7, deleted_at: null });
    expect(await model.withTrashed()).toHaveLength(2);
    expect(await model.onlyTrashed()).toEqual([
      { id: 2, name: "B", deleted_at: "2026-03-16T00:00:00.000Z" },
    ]);

    await model.forceDelete(5);
    expect(deletes).toEqual([[5, "id"]]);
    expect(model._exists).toBe(false);
    expect(model._originalAttributes).toEqual({});

    await model.update(3, { name: "Updated" }, "uuid");
    expect(updates.at(-1)).toEqual([3, { name: "Updated" }, "uuid"]);

    model.deleted_at = "unchanged";
    await model.delete("other-id", "_id");
    expect(model.deleted_at).toBe("unchanged");

    const mongoModel = new SoftModel() as any;
    mongoModel.id = undefined;
    await mongoModel.restore("mongo-5", "_id");
    expect(updates.at(-1)).toEqual(["mongo-5", { deleted_at: null }, "_id"]);

    const customPkModel = new SoftModel() as any;
    customPkModel.id = undefined;
    customPkModel._id = undefined;
    await customPkModel.delete("uuid-5", "uuid");
    expect(updates.at(-1)).toEqual([
      "uuid-5",
      expect.objectContaining({ deleted_at: expect.any(String) }),
      "uuid",
    ]);

    const originalMongoFallbackModel = new SoftModel() as any;
    originalMongoFallbackModel.id = undefined;
    originalMongoFallbackModel._id = undefined;
    await originalMongoFallbackModel.restore("mongo-5", "_id");
    expect(updates.at(-1)).toEqual(["mongo-5", { deleted_at: null }, "_id"]);

    const originalIdFallbackModel = new SoftModel() as any;
    originalIdFallbackModel.id = undefined;
    originalIdFallbackModel._id = undefined;
    originalIdFallbackModel._originalAttributes = { id: "legacy-id" };
    await originalIdFallbackModel.restore("legacy-id", "_id");
    expect(updates.at(-1)).toEqual(["legacy-id", { deleted_at: null }, "_id"]);

    class NoSyncSoftModel extends SoftDeletesMixin(
      SoftBase as unknown as abstract new (...args: any[]) => object,
    ) {
      public id = 9;
      public _exists = true;
      public _originalAttributes = { id: 9 };
    }

    const noSyncModel = new (NoSyncSoftModel as any)();
    await noSyncModel.restore(9);
    expect(noSyncModel.deleted_at).toBeNull();
  });

  test("SoftDeletesMixin tracks mongo fallback ids and keeps non-matching forceDelete state untouched", async () => {
    const deletes: Array<[number | string, string]> = [];

    class SoftBase {
      async all(): Promise<Array<Record<string, unknown>>> {
        return [];
      }

      async find(): Promise<Record<string, unknown> | null> {
        return null;
      }

      async update(): Promise<void> {
        return undefined;
      }

      async delete(id: number | string, pk = "id"): Promise<void> {
        deletes.push([id, pk]);
      }
    }

    class SoftModel extends SoftDeletesMixin(
      SoftBase as unknown as abstract new (...args: any[]) => object,
    ) {
      public id = undefined;
      public _id = "mongo-1";
      public _exists = true;
      public _originalAttributes = { _id: "mongo-1" };
    }

    const tracked = new (SoftModel as any)();
    await tracked.forceDelete("other-id", "_id");
    expect(deletes.at(-1)).toEqual(["other-id", "_id"]);
    expect(tracked._exists).toBe(true);
    expect(tracked._originalAttributes).toEqual({ _id: "mongo-1" });

    await tracked.forceDelete("mongo-1", "_id");
    expect(tracked._exists).toBe(false);
    expect(tracked._originalAttributes).toEqual({});
  });

  test("SoftDeletesMixin covers tracked id fallback for id keys and object-style delegated update", async () => {
    class SoftBase {
      update = jest.fn((payload: Record<string, unknown>) => payload);
      async all(): Promise<Array<Record<string, unknown>>> {
        return [];
      }
      async find(): Promise<Record<string, unknown> | null> {
        return null;
      }
      async delete(): Promise<void> {
        return undefined;
      }
    }

    class SoftModel extends SoftDeletesMixin(
      SoftBase as unknown as abstract new (...args: any[]) => object,
    ) {
      public id = undefined;
      public _id = "mongo-7";
      public _originalAttributes = { _id: "mongo-7", id: "legacy-id" };
    }

    const model = new (SoftModel as any)();

    expect(model.getTrackedPrimaryValue("id")).toBe("mongo-7");
    expect(model.update({ name: "Ada" })).toEqual({ name: "Ada" });
    expect((model as any).update).toHaveBeenCalledWith({ name: "Ada" });
  });
});
