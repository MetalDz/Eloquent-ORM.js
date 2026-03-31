import { BaseModel } from "../core/model/BaseModel.js";

type Row = Record<string, unknown>;

function matchesFilter(row: Row, filter: Record<string, unknown>): boolean {
  if (filter.$or && Array.isArray(filter.$or)) {
    return (filter.$or as Record<string, unknown>[]).some((part) => matchesFilter(row, part));
  }

  return Object.entries(filter).every(([key, value]) => {
    if (value && typeof value === "object" && !Array.isArray(value) && "$in" in (value as Row)) {
      const values = (value as { $in: unknown[] }).$in;
      return values.some((candidate) => Object.is(row[key], candidate));
    }

    return Object.is(row[key], value);
  });
}

function makeMongoDb(seed: Record<string, Row[]>) {
  const state = Object.fromEntries(
    Object.entries(seed).map(([name, rows]) => [name, rows.map((row) => ({ ...row }))])
  ) as Record<string, Row[]>;

  return {
    dump(name: string) {
      return (state[name] ?? []).map((row) => ({ ...row }));
    },
    collection(name: string) {
      state[name] ??= [];
      return {
        async findOne(filter: Record<string, unknown>) {
          return state[name].find((row) => matchesFilter(row, filter)) ?? null;
        },
        find(filter: Record<string, unknown>) {
          const matched = state[name].filter((row) => matchesFilter(row, filter));
          return {
            async toArray() {
              return matched.map((row) => ({ ...row }));
            },
          };
        },
        async insertOne(doc: Record<string, unknown>) {
          state[name].push({ ...doc });
          return { acknowledged: true };
        },
        async insertMany(docs: Record<string, unknown>[]) {
          state[name].push(...docs.map((doc) => ({ ...doc })));
          return { acknowledged: true };
        },
        async deleteMany(filter: Record<string, unknown>) {
          const remaining = state[name].filter((row) => !matchesFilter(row, filter));
          state[name] = remaining;
          return { acknowledged: true };
        },
      };
    },
  };
}

describe("NoSQL phase 12 native belongsToMany", () => {
  test("belongsToMany resolves and eager-loads on Mongo with pivot collections", async () => {
    const mongoDb = makeMongoDb({
      posts: [{ _id: "p1", title: "Post A" }],
      tags: [
        { _id: "t1", name: "alpha" },
        { _id: "t2", name: "beta" },
      ],
      post_tag_pivot: [
        { post_id: "p1", tag_id: "t1" },
        { post_id: "p1", tag_id: "t2" },
      ],
    });

    class Tag extends BaseModel {
      static schema = {
        id: { kind: "column", type: "increments", options: { primary: true } },
        name: { kind: "column", type: "string", options: {} },
      } as any;

      constructor() {
        super("tags", "mongo");
      }

      override async getDB(): Promise<unknown> {
        return mongoDb;
      }
    }

    class Post extends BaseModel {
      static schema = {
        id: { kind: "column", type: "increments", options: { primary: true } },
        title: { kind: "column", type: "string", options: {} },
      } as any;

      constructor() {
        super("posts", "mongo");
      }

      override async getDB(): Promise<unknown> {
        return mongoDb;
      }

      tags() {
        return this.belongsToMany(Tag as any, "post_tag_pivot", "post_id", "tag_id");
      }
    }

    const direct = await (new Post() as any).tags().getResults({ _id: "p1" } as any);
    expect(direct).toHaveLength(2);
    expect((direct as Row[])[0]).toBeInstanceOf(Tag);

    const post = await (new Post() as any).with("tags").find("p1");
    expect(post).toBeInstanceOf(Post);
    expect(((post as Row).tags as Row[])).toHaveLength(2);
    expect(((post as Row).tags as Row[])[1]).toBeInstanceOf(Tag);
  });

  test("belongsToMany attach/detach/sync work on Mongo pivot collections", async () => {
    const mongoDb = makeMongoDb({
      tags: [{ _id: "t1", name: "alpha" }],
      post_tag_pivot: [{ post_id: "p1", tag_id: "t1" }],
    });

    class Tag extends BaseModel {
      static schema = {
        id: { kind: "column", type: "increments", options: { primary: true } },
        name: { kind: "column", type: "string", options: {} },
      } as any;

      constructor() {
        super("tags", "mongo");
      }

      override async getDB(): Promise<unknown> {
        return mongoDb;
      }
    }

    class PivotHostPost extends BaseModel {
      constructor() {
        super("posts", "mongo");
      }

      override async getDB(): Promise<unknown> {
        return mongoDb;
      }

      tags() {
        return this.belongsToMany(Tag as any, "post_tag_pivot", "post_id", "tag_id");
      }
    }

    const relation = new PivotHostPost().tags() as any;

    await relation.attach("p1", "t2");
    expect(mongoDb.dump("post_tag_pivot")).toEqual(
      expect.arrayContaining([{ post_id: "p1", tag_id: "t2" }])
    );

    await relation.detach("p1", "t1");
    expect(mongoDb.dump("post_tag_pivot")).toEqual([{ post_id: "p1", tag_id: "t2" }]);

    await relation.sync("p1", ["t3", "t4"]);
    expect(mongoDb.dump("post_tag_pivot")).toEqual([
      { post_id: "p1", tag_id: "t3" },
      { post_id: "p1", tag_id: "t4" },
    ]);
  });
});
