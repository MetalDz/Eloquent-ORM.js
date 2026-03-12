import { BelongsTo } from "../core/orm/relations/BelongsTo";
import { HasMany } from "../core/orm/relations/HasMany";
import { HasOne } from "../core/orm/relations/HasOne";
import { BelongsToMany } from "../core/orm/relations/BelongsToMany";
import { MorphTo } from "../core/orm/relations/MorphTo";
import { MorphMany } from "../core/orm/relations/MorphMany";
import { MorphOne } from "../core/orm/relations/MorphOne";
import { MorphRegistry } from "../core/orm/mixins/MorphRegistry";
import type { DriverAdapter } from "../core/connection/DriverAdapter";
import type { CoreModelClass } from "../core/orm/Relation";

type Row = Record<string, unknown>;

type MockAdapter = {
  query: jest.Mock<Promise<Row[]>, [string, unknown[]?]>;
  queryOne: jest.Mock<Promise<Row | null>, [string, unknown[]?]>;
  execute: jest.Mock<Promise<void>, [string, unknown[]?]>;
  insert: jest.Mock<Promise<{ id?: unknown; row?: Row }>, [string, unknown[]?]>;
} & Omit<DriverAdapter, "query" | "queryOne" | "execute" | "insert">;

function makeAdapter(name: DriverAdapter["name"] = "mysql"): MockAdapter {
  const query = jest.fn<Promise<Row[]>, [string, unknown[]?]>(async () => []);
  const queryOne = jest.fn<Promise<Row | null>, [string, unknown[]?]>(async () => null);
  const execute = jest.fn<Promise<void>, [string, unknown[]?]>(async () => undefined);
  const insert = jest.fn<Promise<{ id?: unknown; row?: Row }>, [string, unknown[]?]>(
    async () => ({ id: undefined })
  );

  const wrapId = (id: string) => {
    for (const part of id.split(".")) {
      if (part !== "*" && !/^[A-Za-z_][A-Za-z0-9_]*$/.test(part)) {
        throw new Error(`Unsafe SQL identifier: ${part}`);
      }
    }
    return id;
  };

  return {
    name,
    kind: "sql",
    query,
    queryOne,
    execute,
    insert,
    placeholder: () => "?",
    placeholders: (count: number) => Array.from({ length: count }, () => "?").join(", "),
    inClause: (field: string, values: unknown[], startIndex = 1) => ({
      sql: `${field} IN (${Array.from({ length: values.length }, () => "?").join(", ")})`,
      params: values,
      nextIndex: startIndex + values.length,
    }),
    wrapId,
  };
}

function makeRelatedModel(adapter: MockAdapter, tableName: string): CoreModelClass {
  class RelatedModel {
    tableName = tableName;

    async getDB(): Promise<DriverAdapter> {
      return adapter as unknown as DriverAdapter;
    }

    static hydrateRow(row: Row | null): Row | null {
      return row;
    }

    static hydrateMany(rows: Row[]): Row[] {
      return rows;
    }
  }

  return RelatedModel as unknown as CoreModelClass;
}

describe("Relation logic coverage", () => {
  afterEach(() => {
    MorphRegistry.clear();
    jest.clearAllMocks();
  });

  test("BelongsTo: getResults + match", async () => {
    const adapter = makeAdapter();
    adapter.queryOne.mockResolvedValue({ id: 2, name: "User2" });
    adapter.query.mockResolvedValue([{ id: 2, name: "User2" }]);

    const RelatedModel = makeRelatedModel(adapter, "users");
    const relation = new BelongsTo(
      RelatedModel,
      "user_id",
      "id",
      "author"
    );

    const single = await relation.getResults({ user_id: 2 });
    expect(single).toEqual({ id: 2, name: "User2" });
    expect(adapter.queryOne).toHaveBeenCalledWith(
      expect.stringContaining("WHERE id = ? LIMIT 1"),
      [2]
    );

    const parents: Row[] = [{ user_id: 2 }, { user_id: 999 }];
    await relation.match(parents);
    expect((parents[0] as Row).author).toEqual({ id: 2, name: "User2" });
    expect((parents[1] as Row).author).toBeNull();
  });

  test("HasMany: getResults + match", async () => {
    const adapter = makeAdapter();
    adapter.query
      .mockResolvedValueOnce([
        { id: 11, user_id: 1, title: "A" },
        { id: 12, user_id: 1, title: "B" },
      ])
      .mockResolvedValueOnce([
        { id: 11, user_id: 1, title: "A" },
        { id: 12, user_id: 1, title: "B" },
        { id: 21, user_id: 2, title: "C" },
      ]);

    const RelatedModel = makeRelatedModel(adapter, "posts");
    const relation = new HasMany(
      RelatedModel,
      "user_id",
      "id",
      "posts"
    );

    const single = await relation.getResults({ id: 1 });
    expect(single).toHaveLength(2);
    expect(adapter.query).toHaveBeenCalledWith(
      expect.stringContaining("WHERE user_id = ?"),
      [1]
    );

    const parents: Row[] = [{ id: 1 }, { id: 2 }, { id: 3 }];
    await relation.match(parents);
    expect(((parents[0] as Row).posts as Row[]).length).toBe(2);
    expect(((parents[1] as Row).posts as Row[]).length).toBe(1);
    expect(((parents[2] as Row).posts as Row[]).length).toBe(0);
  });

  test("HasOne: getResults + match", async () => {
    const adapter = makeAdapter();
    adapter.queryOne.mockResolvedValue({ id: 101, user_id: 1, bio: "Bio" });
    adapter.query.mockResolvedValue([
      { id: 101, user_id: 1, bio: "Bio1" },
      { id: 102, user_id: 2, bio: "Bio2" },
    ]);

    const RelatedModel = makeRelatedModel(adapter, "profiles");
    const relation = new HasOne(
      RelatedModel,
      "user_id",
      "id",
      "profile"
    );

    const single = await relation.getResults({ id: 1 });
    expect(single).toEqual({ id: 101, user_id: 1, bio: "Bio" });
    expect(adapter.queryOne).toHaveBeenCalledWith(
      expect.stringContaining("WHERE user_id = ? LIMIT 1"),
      [1]
    );

    const parents: Row[] = [{ id: 1 }, { id: 2 }, { id: 3 }];
    await relation.match(parents);
    expect((parents[0] as Row).profile).toEqual({ id: 101, user_id: 1, bio: "Bio1" });
    expect((parents[1] as Row).profile).toEqual({ id: 102, user_id: 2, bio: "Bio2" });
    expect((parents[2] as Row).profile).toBeNull();
  });

  test("BelongsToMany: getResults + match + attach + detach + sync", async () => {
    const adapter = makeAdapter();
    adapter.query
      .mockResolvedValueOnce([{ id: 7, name: "TagA" }])
      .mockResolvedValueOnce([
        { id: 7, name: "TagA", pivot_parent: 10 },
        { id: 8, name: "TagB", pivot_parent: 10 },
        { id: 9, name: "TagC", pivot_parent: 11 },
      ]);

    const RelatedModel = makeRelatedModel(adapter, "tags");
    const relation = new BelongsToMany(
      RelatedModel,
      "post_tag_pivot",
      "post_id",
      "tag_id"
    );
    (relation as unknown as { name?: string }).name = "tags";

    const single = await relation.getResults({ id: 10 });
    expect(single).toEqual([{ id: 7, name: "TagA" }]);
    expect(adapter.query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("JOIN post_tag_pivot"),
      [10]
    );

    const parents: Row[] = [{ id: 10 }, { id: 11 }, { id: 12 }];
    await relation.match(parents);
    expect(((parents[0] as Row).tags as Row[]).length).toBe(2);
    expect(((parents[1] as Row).tags as Row[]).length).toBe(1);
    expect(((parents[2] as Row).tags as Row[]).length).toBe(0);
    expect(((parents[0] as Row).tags as Row[])[0]).not.toHaveProperty("pivot_parent");

    await relation.attach(10, 99);
    expect(adapter.execute).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO post_tag_pivot"),
      [10, 99]
    );

    await relation.detach(10, 99);
    expect(adapter.execute).toHaveBeenCalledWith(
      expect.stringContaining("DELETE FROM post_tag_pivot"),
      [10, 99]
    );

    adapter.execute.mockClear();
    await relation.sync(10, [1, 2]);
    expect(adapter.execute).toHaveBeenCalledTimes(3);
    expect(adapter.execute).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("DELETE FROM post_tag_pivot"),
      [10]
    );
  });

  test("MorphTo: getResults + match", async () => {
    const userAdapter = makeAdapter();
    const postAdapter = makeAdapter();

    userAdapter.queryOne.mockResolvedValue({ id: 5, name: "User5" });
    userAdapter.query.mockResolvedValue([{ id: 5, name: "User5" }]);
    postAdapter.query.mockResolvedValue([{ id: 8, title: "Post8" }]);

    const UserModel = makeRelatedModel(userAdapter, "users");
    const PostModel = makeRelatedModel(postAdapter, "posts");

    MorphRegistry.register("users", UserModel as unknown as { new (...args: unknown[]): unknown; name: string });
    MorphRegistry.register("posts", PostModel as unknown as { new (...args: unknown[]): unknown; name: string });

    const relation = new MorphTo("commentable_type", "commentable_id");
    (relation as unknown as { name?: string }).name = "commentable";

    const single = await relation.getResults({
      commentable_type: "users",
      commentable_id: 5,
    });
    expect(single).toEqual({ id: 5, name: "User5" });
    expect(userAdapter.queryOne).toHaveBeenCalledWith(
      expect.stringContaining("FROM users"),
      [5]
    );

    const parents: Row[] = [
      { id: 1, commentable_type: "users", commentable_id: 5 },
      { id: 2, commentable_type: "posts", commentable_id: 8 },
      { id: 3, commentable_type: "users", commentable_id: 404 },
    ];
    await relation.match(parents);

    expect((parents[0] as Row).commentable).toEqual({ id: 5, name: "User5" });
    expect((parents[1] as Row).commentable).toEqual({ id: 8, title: "Post8" });
    expect((parents[2] as Row).commentable).toBeNull();
  });

  test("MorphMany: getResults + match", async () => {
    const adapter = makeAdapter();
    adapter.query
      .mockResolvedValueOnce([
        { id: 1, commentable_id: 10, commentable_type: "posts", body: "A" },
      ])
      .mockResolvedValueOnce([
        { id: 1, commentable_id: 10, commentable_type: "posts", body: "A" },
        { id: 2, commentable_id: 10, commentable_type: "posts", body: "B" },
        { id: 3, commentable_id: 11, commentable_type: "posts", body: "C" },
      ]);

    const RelatedModel = makeRelatedModel(adapter, "comments");
    const relation = new MorphMany(RelatedModel, "commentable_type", "commentable_id");
    (relation as unknown as { name?: string }).name = "comments";

    const parentA: Row = { id: 10, getMorphClass: () => "posts" };
    const single = await relation.getResults(parentA);
    expect(single).toHaveLength(1);
    expect(adapter.query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("commentable_id = ? AND commentable_type = ?"),
      [10, "posts"]
    );

    const parents: Row[] = [
      { id: 10, getMorphClass: () => "posts" },
      { id: 11, getMorphClass: () => "posts" },
      { id: 12, getMorphClass: () => "posts" },
    ];
    await relation.match(parents);

    expect(((parents[0] as Row).comments as Row[]).length).toBe(2);
    expect(((parents[1] as Row).comments as Row[]).length).toBe(1);
    expect(((parents[2] as Row).comments as Row[]).length).toBe(0);
  });

  test("MorphOne: getResults + match", async () => {
    const adapter = makeAdapter();
    adapter.queryOne.mockResolvedValue({
      id: 50,
      imageable_id: 1,
      imageable_type: "users",
      url: "a.png",
    });
    adapter.query.mockResolvedValue([
      { id: 50, imageable_id: 1, imageable_type: "users", url: "a.png" },
      { id: 51, imageable_id: 2, imageable_type: "users", url: "b.png" },
    ]);

    const RelatedModel = makeRelatedModel(adapter, "images");
    const relation = new MorphOne(RelatedModel, "imageable_type", "imageable_id");
    (relation as unknown as { name?: string }).name = "image";

    const single = await relation.getResults({
      id: 1,
      getMorphClass: () => "users",
    });
    expect(single).toEqual({
      id: 50,
      imageable_id: 1,
      imageable_type: "users",
      url: "a.png",
    });
    expect(adapter.queryOne).toHaveBeenCalledWith(
      expect.stringContaining("imageable_id = ? AND imageable_type = ?"),
      [1, "users"]
    );

    const parents: Row[] = [
      { id: 1, getMorphClass: () => "users" },
      { id: 2, getMorphClass: () => "users" },
      { id: 3, getMorphClass: () => "users" },
    ];
    await relation.match(parents);

    expect((parents[0] as Row).image).toEqual({
      id: 50,
      imageable_id: 1,
      imageable_type: "users",
      url: "a.png",
    });
    expect((parents[1] as Row).image).toEqual({
      id: 51,
      imageable_id: 2,
      imageable_type: "users",
      url: "b.png",
    });
    expect((parents[2] as Row).image).toBeNull();
  });

  test("relations reject unsafe identifiers before building SQL", async () => {
    const adapter = makeAdapter();
    const RelatedModel = makeRelatedModel(adapter, "users");

    const belongsTo = new BelongsTo(
      RelatedModel,
      "user_id",
      "id OR 1=1",
      "author"
    );
    await expect(belongsTo.getResults({ user_id: 1 })).rejects.toThrow("Unsafe SQL identifier");

    const belongsToMany = new BelongsToMany(
      RelatedModel,
      "post_user_pivot;DROP",
      "user_id",
      "post_id"
    );
    await expect(belongsToMany.attach(1, 2)).rejects.toThrow("Unsafe SQL identifier");
  });
});
