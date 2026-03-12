import { BaseModel, MorphRegistry } from "../core/model/BaseModel";

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

describe("NoSQL phase 13 native morph relations", () => {
  afterEach(() => {
    MorphRegistry.clear();
  });

  test("morphTo resolves and eager-loads on Mongo across grouped morph types", async () => {
    const mongoDb = makeMongoDb({
      photos: [{ _id: "ph1", url: "a.png" }],
      videos: [{ _id: "vd1", title: "clip" }],
      comments: [
        { _id: "c1", commentable_type: "photos", commentable_id: "ph1", body: "nice" },
        { _id: "c2", commentable_type: "videos", commentable_id: "vd1", body: "wow" },
      ],
    });

    class Photo extends BaseModel {
      static morphAlias = "photos";
      static schema = {
        id: { kind: "column", type: "increments", options: { primary: true } },
        url: { kind: "column", type: "string", options: {} },
      } as any;

      constructor() {
        super("photos", "mongo");
      }

      override async getDB(): Promise<unknown> {
        return mongoDb;
      }
    }

    class Video extends BaseModel {
      static morphAlias = "videos";
      static schema = {
        id: { kind: "column", type: "increments", options: { primary: true } },
        title: { kind: "column", type: "string", options: {} },
      } as any;

      constructor() {
        super("videos", "mongo");
      }

      override async getDB(): Promise<unknown> {
        return mongoDb;
      }
    }

    class Comment extends BaseModel {
      static schema = {
        id: { kind: "column", type: "increments", options: { primary: true } },
        commentable_type: { kind: "column", type: "string", options: {} },
        commentable_id: { kind: "column", type: "string", options: {} },
        body: { kind: "column", type: "string", options: {} },
      } as any;

      constructor() {
        super("comments", "mongo");
      }

      override async getDB(): Promise<unknown> {
        return mongoDb;
      }

      commentable() {
        return this.morphTo("commentable");
      }
    }

    MorphRegistry.register("photos", Photo as any);
    MorphRegistry.register("videos", Video as any);

    const single = await (new Comment() as any).commentable().getResults({
      commentable_type: "photos",
      commentable_id: "ph1",
    } as any);
    expect(single).toBeInstanceOf(Photo);
    expect((single as unknown as Row)._id).toBe("ph1");

    const comment = await (new Comment() as any).with("commentable").find("c1");
    expect(comment).toBeInstanceOf(Comment);
    expect((comment as Row).commentable).toBeInstanceOf(Photo);

    const relation = (new Comment() as any).commentable();
    relation.name = "commentable";
    const parents: Row[] = [
      { _id: "c1", commentable_type: "photos", commentable_id: "ph1" },
      { _id: "c2", commentable_type: "videos", commentable_id: "vd1" },
    ];
    await relation.match(parents);
    expect((parents[0] as Row).commentable).toBeInstanceOf(Photo);
    expect((parents[1] as Row).commentable).toBeInstanceOf(Video);
  });

  test("morphOne and morphMany resolve and eager-load on Mongo", async () => {
    const mongoDb = makeMongoDb({
      posts: [{ _id: "p1", title: "Post A" }],
      images: [{ _id: "i1", imageable_id: "p1", imageable_type: "posts", url: "hero.png" }],
      comments: [
        { _id: "c1", commentable_id: "p1", commentable_type: "posts", body: "A" },
        { _id: "c2", commentable_id: "p1", commentable_type: "posts", body: "B" },
      ],
    });

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

    class Post extends BaseModel {
      static morphAlias = "posts";
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

      image() {
        return this.morphOne(Image as any, "imageable");
      }

      comments() {
        return this.morphMany(Comment as any, "commentable");
      }
    }

    const image = await (new Post() as any).image().getResults({
      _id: "p1",
      getMorphClass: () => "posts",
    } as any);
    expect(image).toBeInstanceOf(Image);
    expect((image as unknown as Row).url).toBe("hero.png");

    const comments = await (new Post() as any).comments().getResults({
      _id: "p1",
      getMorphClass: () => "posts",
    } as any);
    expect(comments).toHaveLength(2);
    expect((comments as Row[])[0]).toBeInstanceOf(Comment);

    const post = await (new Post() as any).with("image", "comments").find("p1");
    expect(post).toBeInstanceOf(Post);
    expect((post as Row).image).toBeInstanceOf(Image);
    expect(((post as Row).comments as Row[])).toHaveLength(2);
  });
});
