import { BaseModel, MorphRegistry } from "../core/model/BaseModel";
import { MorphableMixin } from "../core/orm/mixins/MorphableMixin";

type Row = Record<string, unknown>;

function matchesFilter(row: Row, filter: Record<string, unknown>): boolean {
  if (filter.$or && Array.isArray(filter.$or)) {
    const { $or, ...rest } = filter;
    const matchesOr = ($or as Record<string, unknown>[]).some((part) => matchesFilter(row, part));
    if (!matchesOr) return false;
    return matchesFilter(row, rest);
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

describe("NoSQL phase 14 scenario parity and morphable helpers", () => {
  afterEach(() => {
    MorphRegistry.clear();
  });

  test("MorphableMixin falls back to static where()/first()/get() when query() is absent", async () => {
    class EmptyBase {}
    class MorphModel extends MorphableMixin(EmptyBase) {
      id = 77;
      getMorphClass(): string {
        return "CustomMorphAlias";
      }
    }

    const query = {
      where: jest.fn().mockReturnThis(),
      first: jest.fn(async () => ({ id: 1 })),
      get: jest.fn(async () => [{ id: 1 }]),
    };

    const RelatedModel = {
      where: jest.fn(() => query),
    };

    const model = new MorphModel() as unknown as {
      morphOne(
        related: { where(field: string, value: unknown): typeof query },
        relation: string
      ): Promise<unknown>;
      morphMany(
        related: { where(field: string, value: unknown): typeof query },
        relation: string
      ): Promise<unknown[]>;
    };

    const one = await model.morphOne(RelatedModel as never, "commentable");
    const many = await model.morphMany(RelatedModel as never, "commentable");

    expect(one).toEqual({ id: 1 });
    expect(many).toEqual([{ id: 1 }]);
    expect(RelatedModel.where).toHaveBeenNthCalledWith(1, "commentable_type", "CustomMorphAlias");
    expect(query.where).toHaveBeenNthCalledWith(1, "commentable_id", 77);
    expect(RelatedModel.where).toHaveBeenNthCalledWith(2, "commentable_type", "CustomMorphAlias");
    expect(query.where).toHaveBeenNthCalledWith(2, "commentable_id", 77);
  });

  test("Mongo nested eager loading supports blog-style scenario graphs", async () => {
    const mongoDb = makeMongoDb({
      users: [{ _id: "u1", name: "Alpha" }],
      posts: [
        { _id: "p1", user_id: "u1", title: "Post A" },
        { _id: "p2", user_id: "u1", title: "Post B" },
      ],
      comments: [
        { _id: "c1", commentable_id: "p1", commentable_type: "posts", body: "Nice" },
        { _id: "c2", commentable_id: "p2", commentable_type: "posts", body: "Cool" },
      ],
      images: [{ _id: "i1", imageable_id: "p1", imageable_type: "posts", url: "hero.png" }],
      post_user_pivot: [{ user_id: "u1", post_id: "p2" }],
    });

    class Comment extends BaseModel {
      static schema = {
        id: { kind: "column", type: "increments", options: { primary: true } },
        commentable_id: { kind: "column", type: "string", options: {} },
        commentable_type: { kind: "column", type: "string", options: {} },
        body: { kind: "column", type: "string", options: {} },
      } as any;

      constructor() {
        super("comments", "mongo");
      }

      override async getDB(): Promise<unknown> {
        return mongoDb;
      }
    }

    class Image extends BaseModel {
      static schema = {
        id: { kind: "column", type: "increments", options: { primary: true } },
        imageable_id: { kind: "column", type: "string", options: {} },
        imageable_type: { kind: "column", type: "string", options: {} },
        url: { kind: "column", type: "string", options: {} },
      } as any;

      constructor() {
        super("images", "mongo");
      }

      override async getDB(): Promise<unknown> {
        return mongoDb;
      }
    }

    class Post extends BaseModel {
      static morphAlias = "posts";
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

      comments() {
        return this.morphMany(Comment as any, "commentable");
      }

      image() {
        return this.morphOne(Image as any, "imageable");
      }
    }

    class User extends BaseModel {
      static morphAlias = "users";
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

      favorites() {
        return this.belongsToMany(Post as any, "post_user_pivot", "user_id", "post_id");
      }
    }

    const user = await (new User() as any)
      .with("posts.comments", "posts.image", "favorites")
      .find("u1");

    expect(user).toBeInstanceOf(User);
    expect(((user as Row).posts as Row[])).toHaveLength(2);
    expect((((user as Row).posts as Row[])[0] as Row).comments).toHaveLength(1);
    expect((((user as Row).posts as Row[])[0] as Row).image).toBeInstanceOf(Image);
    expect(((user as Row).favorites as Row[])).toHaveLength(1);

    const serialized = (user as { toObject(): unknown }).toObject() as {
      posts: Array<{ comments: Array<{ body: string }>; image: { url: string } }>;
      favorites: Array<{ title: string }>;
    };
    expect(serialized.posts[0].comments[0].body).toBe("Nice");
    expect(serialized.posts[0].image.url).toBe("hero.png");
    expect(serialized.favorites[0].title).toBe("Post B");
  });
});
