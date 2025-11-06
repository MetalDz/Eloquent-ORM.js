import { describe, it, expect, beforeEach } from "vitest";
import { BaseModel } from "../../../src/core/model/BaseModel";
import { MorphableMixin, MorphableBaseModel } from "../../../src/core/orm/mixins/MorphableMixin";
import { MorphRegistry } from "../../../src/core/orm/mixins/MorphRegistry";
import { EagerLoadingMixin, EagerLoadable, RelationDefinition } from "../../../src/core/orm/mixins/EagerLoadingMixin";

/**
 * 🧩 ORMBase = Morphable + EagerLoading + BaseModel
 */
const ORMBase = EagerLoadingMixin(MorphableMixin(BaseModel));

/**
 * ✅ Helper function to create mock Post & Comment models for testing.
 */
function createTestModels() {
  class Post extends ORMBase implements MorphableBaseModel, EagerLoadable {
    static morphAlias = "posts";
    id = 1;
    title = "Eager Post";

    constructor() {
      super("posts");
    }

    async all(): Promise<this[]> {
      const records = [this];
      if (this.eagerRelations.length > 0) {
        await this.eagerLoadRelations(records);
      }
      return records;
    }

    async find(id: number | string): Promise<this | null> {
      if (id === this.id) return this;
      return null;
    }

    comments(): RelationDefinition<Post> {
      return {
        name: "comments",
        async getResults(parent: Post) {
          return [
            {
              id: 100,
              body: "First comment",
              commentable_id: parent.id,
              commentable_type: "posts",
            },
          ];
        },
        async match(records: Post[]) {
          for (const record of records) {
            (record as Record<string, unknown>)["comments"] = [
              {
                id: 100,
                body: "Eager comment",
                commentable_id: record.id,
                commentable_type: "posts",
              },
            ];
          }
        },
      };
    }

    getRelation(name: string): RelationDefinition<this> {
      if (name === "comments") {
        return this.comments() as unknown as RelationDefinition<this>;
      }
      throw new Error(`Relation '${name}' not found on Post`);
    }
  }

  class Comment extends ORMBase implements MorphableBaseModel, EagerLoadable {
    static morphAlias = "comments";
    id = 100;
    body = "Morphable comment";
    commentable_type = "posts";
    commentable_id = 1;

    constructor() {
      super("comments");
    }

    async all(): Promise<this[]> {
      const records = [this];
      if (this.eagerRelations.length > 0) {
        await this.eagerLoadRelations(records);
      }
      return records;
    }

    async find(id: number | string): Promise<this | null> {
      if (id === this.id) return this;
      return null;
    }

    async commentable(): Promise<Record<string, unknown> | null> {
      return this.morphTo("commentable");
    }

    getRelation(name: string): RelationDefinition<this> {
      if (name === "commentable") {
        return {
          name: "commentable",
          getResults: async () => this.commentable(),
          match: async () => {},
        };
      }
      throw new Error(`Relation '${name}' not found on Comment`);
    }
  }

  return { Post, Comment };
}

/**
 * 🧠 Integration test for Morph + Eager Loading
 */
describe("⚡ EagerLoading + MorphableMixin Integration", () => {
  beforeEach(() => {
    MorphRegistry.clear();
  });

  it("should eager load simple relations", async () => {
    const { Post } = createTestModels();
    const post = new Post();

    // Cast to EagerLoadable to access `.with()`
    const loaded = await (post as unknown as EagerLoadable).with("comments").all();

    expect(loaded[0]).toHaveProperty("comments");
    const comments = (loaded[0] as Record<string, unknown>)["comments"] as Record<string, unknown>[];
    expect(Array.isArray(comments)).toBe(true);
    expect(comments[0].body).toBe("Eager comment");
  });

  it("should eager load nested morph relations (comments.commentable)", async () => {
    const { Post, Comment } = createTestModels();
    new Post();
    new Comment();

    // Mock Post.find to simulate DB return
    (Post.prototype as { find: (id: number | string) => Promise<Record<string, unknown>> }).find =
      async (id: number | string) => ({ id, title: "Nested morph result" });

    const post = new Post();
    const result = await (post as unknown as EagerLoadable).with("comments.commentable").all();

    const comment = ((result[0] as Record<string, unknown>)["comments"] as Record<string, unknown>[])[0];
    expect(comment).toHaveProperty("commentable_id");
    expect(comment["commentable_type"]).toBe("posts");

    // Ensure morphTo resolves
    const morphResult = await (new Comment() as unknown as MorphableBaseModel).morphTo("commentable");
    expect(morphResult).toBeTruthy();
    expect((morphResult as Record<string, unknown>)["title"]).toBe("Nested morph result");
  });

  it("should not crash when morph target not registered", async () => {
    const { Comment } = createTestModels();
    const comment = new Comment();
    comment.commentable_type = "unknown_model";
    comment.commentable_id = 999;

    await expect((comment as unknown as MorphableBaseModel).morphTo("commentable")).rejects.toThrow(/not found/i);
  });
});
