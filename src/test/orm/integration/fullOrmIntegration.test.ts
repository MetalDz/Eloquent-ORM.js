import { describe, it, expect, beforeEach } from "vitest";
import { BaseModel } from "../../../core/model/BaseModel";
import { MockOrmModelV3 } from "../../utils/MockOrmModel.v3";

// Mixins
import { CastsMixin } from "../../../../src/core/orm/mixins/CastsMixin";
import { EagerLoadingMixin } from "../../../../src/core/orm/mixins/EagerLoadingMixin";
import { HooksMixin } from "../../../src/../core/orm/mixins/HooksMixin";
import { MorphableMixin } from "../../../../src/core/orm/mixins/MorphableMixin";
import { PivotHelperMixin } from "../../../../src/core/orm/mixins/PivotHelperMixin";
import { QueryCacheMixin } from "../../../../src/core/orm/mixins/QueryCacheMixin";
import { ScopeMixin } from "../../../../src/core/orm/mixins/ScopeMixin";
import { SerializeMixin } from "../../../../src/core/orm/mixins/SerializeMixin";
import { SoftDeletesMixin } from "../../../../src/core/orm/mixins/SoftDeletesMixin";

// Relations
import { HasOne } from "../../../../src/core/orm/relations/HasOne";
import { HasMany } from "../../../../src/core/orm/relations/HasMany";
import { BelongsTo } from "../../../../src/core/orm/relations/BelongsTo";
import { BelongsToMany } from "../../../../src/core/orm/relations/BelongsToMany";
import { MorphOne } from "../../../../src/core/orm/relations/MorphOne";
import { MorphMany } from "../../../../src/core/orm/relations/MorphMany";
import { MorphTo } from "../../../../src/core/orm/relations/MorphTo";

/**
 * Compose all mixins for a maximal ORM base.
 * (In your real ORM, this is exactly what your BaseModel chain does.)
 */

const ORMBase = MockOrmModelV3(
  SoftDeletesMixin(
    SerializeMixin(
      ScopeMixin(
        QueryCacheMixin(
          PivotHelperMixin(
            MorphableMixin(
              HooksMixin(
                EagerLoadingMixin(
                  CastsMixin(BaseModel)
                )
              )
            )
          )
        )
      )
    )
  )
);

/** -----------------------------
 * 💾 Setup Mock Models for Relations
 * ----------------------------- */


class User extends ORMBase {
  static morphAlias = "users";
  name = "Alice";

  constructor() {
    super("users");

    this.mockHasMany("posts", [
      { id: 1, title: "Post 1" },
      { id: 2, title: "Post 2" },
    ]);
    this.mockHasOne("profile", [{ id: 100, bio: "Hello" }]);
  }
}

class Post extends ORMBase {
  static morphAlias = "posts";
  title = "Post title";
  user_id = 1;

  constructor() {
    super("posts");

    this.mockBelongsTo("user", { id: 1, name: "Alice" });
    this.mockHasMany("comments", [{ id: 99, body: "Comment" }]);
  }
}

class Comment extends ORMBase {
  static morphAlias = "comments";
  body = "Sample comment";
  commentable_id = 1;
  commentable_type = "posts";

  constructor() {
    super("comments");
    this.mockMorphTo("commentable", { id: 1, title: "Post title" }, "posts");
  }
}

/** -----------------------------
 * 🧪 Full ORM Integration Tests
 * ----------------------------- */
describe("🌐 Full ORM + Relation Integration Suite", () => {
  beforeEach(() => {
    User.truncate();
    Post.truncate();
    Comment.truncate();
  });

  it("should instantiate and save all mixin-composed models", async () => {
    const u = new User();
    await u.save();
    const found = await u.find(u.id);
    expect(found?.name).toBe("Alice");
  });

  it("should handle HasMany and HasOne relations via eager-loading", async () => {
    const u = new User();
    await u.save();
    const res = await (u as any).with("posts", "profile").all();
    const first = res[0] as Record<string, unknown>;

    expect(Array.isArray(first.posts)).toBe(true);
    expect((first.profile as any).bio).toBe("Hello");
  });

  it("should support BelongsTo and HasMany relations", async () => {
    const p = new Post();
    await p.save();
    const res = await (p as any).with("user", "comments").all();
    const first = res[0] as Record<string, unknown>;
    expect(first.user.name).toBe("Alice");
    expect(first.comments[0].body).toBe("Comment");
  });

  it("should resolve MorphTo and MorphMany correctly", async () => {
    const c = new Comment();
    await c.save();
    const morphTarget = await c.morphTo("commentable");
    expect((morphTarget as any).type).toBe("posts");
  });

  it("should support SoftDeletesMixin behavior", async () => {
    const u = new User();
    await u.save();
    expect(typeof (u as any).delete).toBe("function");
    await u.delete();
    const found = await u.find(u.id);
    expect(found).toBeNull();
  });

  it("should respect QueryCacheMixin and SerializeMixin", async () => {
    const u = new User();
    await u.save();

    // Simulate caching or serialization
    const json = JSON.stringify(u);
    expect(json.includes("Alice")).toBe(true);

    const cached = await u.query().where("name", "Alice").first();
    expect(cached?.name).toBe("Alice");
  });
});
