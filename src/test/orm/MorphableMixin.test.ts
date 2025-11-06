import { describe, it, expect, beforeEach } from "vitest";
import { BaseModel, MorphableMixin, MorphableBaseModel } from "../../../src/core/model/BaseModel";

import { MorphRegistry } from "../../../src/core/orm/mixins/MorphRegistry";
// 🧩 Dummy Models for Testing
const MorphableBase = MorphableMixin(BaseModel);

export class Post extends MorphableBase implements MorphableBaseModel {
  static morphAlias = "posts";

  constructor() {
    super("posts");
  }

  comments() {
    return {
      name: "comments",
      async getResults(parent: Post) {
        return [
          { id: 1, body: "Hello world!", commentable_id: parent["id"], commentable_type: "posts" },
        ];
      },
      async match(records: Post[]) {
        // Simulated eager loading matcher
        for (const r of records) {
          r["comments"] = [{ id: 1, body: "Eager loaded" }];
        }
      },
    };
  }
}

class Comment extends MorphableBase {
  static morphAlias = "comments";

  constructor() {
    super("comments");
  }

  async commentable() {
    return this.morphTo("commentable");
  }
}

describe("🧬 MorphableMixin Integration", () => {
  beforeEach(() => {
    MorphRegistry.clear();
  });

  it("should auto-register models in MorphRegistry", () => {
    new Post();
    new Comment();

    const list = MorphRegistry.list();
    expect(list).toHaveProperty("posts");
    expect(list).toHaveProperty("comments");
    expect(list.posts).toBe("Post");
    expect(list.comments).toBe("Comment");
  });

  it("should resolve model constructors correctly", () => {
    new Post();
    new Comment();

    const PostModel = MorphRegistry.resolve("posts");
    const CommentModel = MorphRegistry.resolve("comments");

    expect(PostModel.name).toBe("Post");
    expect(CommentModel.name).toBe("Comment");
  });

  it("should morphTo() return correct instance", async () => {
    new Post();
    const comment = new Comment();
    comment["commentable_type"] = "posts";
    comment["commentable_id"] = 1;

    // Simulate DB-like find
    Post.prototype.find = async (id: number | string) => ({ id, title: "Test Post" });

    const result = await comment.morphTo("commentable");

    expect(result).toBeTruthy();
    expect((result as any).title).toBe("Test Post");
  });

  it("should not duplicate morph registrations", () => {
    const c1 = new Comment();
    const c2 = new Comment();
    expect(MorphRegistry.list()).toHaveProperty("comments");

    // Registry count remains stable
    expect(Object.keys(MorphRegistry.list())).toHaveLength(1);
  });

  it("should throw error for unknown morph type", async () => {
    const comment = new Comment();
    comment["commentable_type"] = "unknown_model";
    comment["commentable_id"] = 123;

    await expect(comment.morphTo("commentable")).rejects.toThrow();
  });
});
