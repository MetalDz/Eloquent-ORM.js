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
    collection(name: string) {
      const rows = state[name] ?? [];
      return {
        async findOne(filter: Record<string, unknown>) {
          return rows.find((row) => matchesFilter(row, filter)) ?? null;
        },
        find(filter: Record<string, unknown>) {
          const matched = rows.filter((row) => matchesFilter(row, filter));
          return {
            async toArray() {
              return matched.map((row) => ({ ...row }));
            },
          };
        },
      };
    },
  };
}

describe("NoSQL phase 10 native relations", () => {
  test("belongsTo and hasMany resolve directly on Mongo with id/_id fallback", async () => {
    const mongoDb = makeMongoDb({
      users: [
        { _id: "u1", name: "Alpha" },
        { _id: "u2", name: "Beta" },
      ],
      posts: [
        { _id: "p1", user_id: "u1", title: "A" },
        { _id: "p2", user_id: "u1", title: "B" },
        { _id: "p3", user_id: "u2", title: "C" },
      ],
    });

    class User extends BaseModel {
      static schema = {
        id: { kind: "column", type: "increments", options: { primary: true } },
        name: { kind: "column", type: "string", options: {} },
      } as any;

      constructor() {
        super("users", "mongo");
      }

      override async getDB(): Promise<unknown> {
        return mongoDb;
      }

      posts() {
        return this.hasMany(Post as any, "user_id");
      }
    }

    class Post extends BaseModel {
      static schema = {
        id: { kind: "column", type: "increments", options: { primary: true } },
        user_id: { kind: "column", type: "string", options: {} },
        title: { kind: "column", type: "string", options: {} },
      } as any;

      constructor() {
        super("posts", "mongo");
      }

      override async getDB(): Promise<unknown> {
        return mongoDb;
      }

      user() {
        return this.belongsTo(User as any, "user_id");
      }
    }

    const postUser = await (new Post() as any).user().getResults({ user_id: "u1" } as any);
    expect(postUser).toBeInstanceOf(User);
    expect((postUser as unknown as Row)._id).toBe("u1");

    const userPosts = await (new User() as any).posts().getResults({ _id: "u1" } as any);
    expect(Array.isArray(userPosts)).toBe(true);
    expect((userPosts as unknown as Row[])).toHaveLength(2);
    expect((userPosts as unknown as Row[])[0]).toBeInstanceOf(Post);
  });

  test("Mongo eager loading works for belongsTo and hasMany through with(...).find()", async () => {
    const mongoDb = makeMongoDb({
      users: [{ _id: "u1", name: "Alpha" }],
      posts: [
        { _id: "p1", user_id: "u1", title: "A" },
        { _id: "p2", user_id: "u1", title: "B" },
      ],
    });

    class User extends BaseModel {
      static schema = {
        id: { kind: "column", type: "increments", options: { primary: true } },
        name: { kind: "column", type: "string", options: {} },
      } as any;

      constructor() {
        super("users", "mongo");
      }

      override async getDB(): Promise<unknown> {
        return mongoDb;
      }

      posts() {
        return this.hasMany(Post as any, "user_id");
      }
    }

    class Post extends BaseModel {
      static schema = {
        id: { kind: "column", type: "increments", options: { primary: true } },
        user_id: { kind: "column", type: "string", options: {} },
        title: { kind: "column", type: "string", options: {} },
      } as any;

      constructor() {
        super("posts", "mongo");
      }

      override async getDB(): Promise<unknown> {
        return mongoDb;
      }

      user() {
        return this.belongsTo(User as any, "user_id");
      }
    }

    const user = await (new User() as any).with("posts").find("u1");
    expect(user).toBeInstanceOf(User);
    expect(Array.isArray((user as Row)?.posts)).toBe(true);
    expect(((user as Row).posts as Row[])).toHaveLength(2);
    expect((((user as Row).posts as Row[])[0])).toBeInstanceOf(Post);

    const post = await (new Post() as any).with("user").find("p1");
    expect(post).toBeInstanceOf(Post);
    expect((post as Row).user).toBeInstanceOf(User);
    expect(((post as Row).user as Row)._id).toBe("u1");
  });
});
