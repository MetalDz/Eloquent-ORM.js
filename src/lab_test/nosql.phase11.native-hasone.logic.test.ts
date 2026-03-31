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

describe("NoSQL phase 11 native hasOne", () => {
  test("hasOne resolves directly on Mongo with id/_id fallback", async () => {
    const mongoDb = makeMongoDb({
      users: [{ _id: "u1", name: "Alpha" }],
      profiles: [
        { _id: "pr1", user_id: "u1", bio: "Alpha bio" },
        { _id: "pr2", user_id: "u2", bio: "Beta bio" },
      ],
    });

    class Profile extends BaseModel {
      static schema = {
        id: { kind: "column", type: "increments", options: { primary: true } },
        user_id: { kind: "column", type: "string", options: {} },
        bio: { kind: "column", type: "string", options: {} },
      } as any;

      constructor() {
        super("profiles", "mongo");
      }

      override async getDB(): Promise<unknown> {
        return mongoDb;
      }
    }

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

      profile() {
        return this.hasOne(Profile as any, "user_id");
      }
    }

    const profile = await (new User() as any).profile().getResults({ _id: "u1" } as any);
    expect(profile).toBeInstanceOf(Profile);
    expect((profile as unknown as Row).bio).toBe("Alpha bio");
  });

  test("Mongo eager loading works for hasOne through with(...).find()", async () => {
    const mongoDb = makeMongoDb({
      users: [{ _id: "u1", name: "Alpha" }],
      profiles: [{ _id: "pr1", user_id: "u1", bio: "Alpha bio" }],
    });

    class Profile extends BaseModel {
      static schema = {
        id: { kind: "column", type: "increments", options: { primary: true } },
        user_id: { kind: "column", type: "string", options: {} },
        bio: { kind: "column", type: "string", options: {} },
      } as any;

      constructor() {
        super("profiles", "mongo");
      }

      override async getDB(): Promise<unknown> {
        return mongoDb;
      }
    }

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

      profile() {
        return this.hasOne(Profile as any, "user_id");
      }
    }

    const user = await (new User() as any).with("profile").find("u1");
    expect(user).toBeInstanceOf(User);
    expect((user as Row).profile).toBeInstanceOf(Profile);
    expect(((user as Row).profile as Row).bio).toBe("Alpha bio");
  });
});
