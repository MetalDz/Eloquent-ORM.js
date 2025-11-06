// src/test/orm/model.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { BaseModel } from "../../../src/core/model/BaseModel";
import { MockOrmModel } from "../utils/MockOrmModel";
import { EagerLoadingMixin } from "../../../src/core/orm/mixins/EagerLoadingMixin";
import { MorphableMixin } from "../../../src/core/orm/mixins/MorphableMixin";

const ORMBase = MockOrmModel(EagerLoadingMixin(MorphableMixin(BaseModel)));

class User extends ORMBase {
  static morphAlias = "users";
  name = "Alice";

  constructor() {
    super("users");
    this.mockHasMany("posts", [
      { id: 1, title: "Post 1" },
      { id: 2, title: "Post 2" },
    ]);
  }
}

describe("⚙️ Standard ORM Model Template", () => {
  beforeEach(() => {
    User.truncate(); // reset store between tests
  });

  it("✅ should instantiate and save model", async () => {
    const user = new User();
    await user.save();
    const found = await user.find(1);
    expect(found?.name).toBe("Alice");
  });

  it("🧩 should eager load hasMany relation", async () => {
    const user = new User();
    await user.save();
    const result = await (user as any).with("posts").all();
    const loaded = result[0] as Record<string, unknown>;
    expect(Array.isArray(loaded["posts"])).toBe(true);
    expect((loaded["posts"] as any[]).length).toBe(2);
  });

  it("🔍 should mock belongsTo relation easily", async () => {
    const user = new User();
    user.mockBelongsTo("profile", { id: 10, bio: "Developer" });
    const rel = user.getRelation("profile");
    const results = await rel.getResults(user);
    expect(results[0]).toHaveProperty("bio", "Developer");
  });

  it("🧬 should mock morphTo relation", async () => {
    const user = new User();
    user.mockMorphTo("avatar", { id: 99, path: "/img.png" }, "images");
    const morph = user.getRelation("avatar");
    const result = await morph.getResults(user);
    expect(result[0]).toHaveProperty("path", "/img.png");
    expect(result[0]).toHaveProperty("morphType", "images");
  });

  it("🧱 should find by ID", async () => {
    const user = new User();
    await user.save();
    const found = await user.find(1);
    expect(found?.id).toBe(1);
  });

  it("🧹 should delete safely", async () => {
    const user = new User();
    await user.save();
    const deleted = await user.delete();
    expect(deleted).toBe(true);
  });
});
