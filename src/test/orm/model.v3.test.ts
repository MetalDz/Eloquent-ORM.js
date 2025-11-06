// src/test/orm/model.v3.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { BaseModel } from "../../core/model/BaseModel";
import { MockOrmModelV3 } from "../utils/MockOrmModel.v3";
import { EagerLoadingMixin } from "../../core/orm/mixins/EagerLoadingMixin";
import { MorphableMixin } from "../../core/orm/mixins/MorphableMixin";

const ORMBase = MockOrmModelV3(EagerLoadingMixin(MorphableMixin(BaseModel)));

class User extends ORMBase {
  static morphAlias = "users";
  name = "Alice";
  constructor() {
    super("users");
    // register a hasMany relation (FK inferred: user_id)
    this.mockHasMany("posts", [
      { id: 10, title: "P1" },
      { id: 11, title: "P2" },
    ]);
  }
}

describe("MockOrmModelV3 integration", () => {
  beforeEach(() => {
    User.truncate();
  });

  it("should persist and find", async () => {
    const u = new User();
    u.id = 1;
    await u.save();
    const found = await u.find(1);
    expect(found?.id).toBe(1);
  });

  it("should eager-load hasMany and respect FK inference", async () => {
    const u = new User();
    u.id = 42;
    // ensure mocked posts got user_id set
    u.mockHasMany("posts", [{ id: 21, title: "Hello" }]);
    await u.save();

    const res = await (u as any).with("posts").all();
    const loaded = res[0] as Record<string, unknown>;
    expect(Array.isArray(loaded.posts)).toBe(true);

    // check inferred FK on first mocked post
    const firstPost = (loaded.posts as Record<string, unknown>[])[0];
    expect(firstPost["user_id"]).toBe(42);
  });

  it("should support basic query where() + first()", async () => {
    const u = new User();
    u.id = 7;
    await u.save();

    // query via instance query()
    const found = await u.query().where("id", 7).first();
    expect(found).not.toBeNull();
    expect(found?.id).toBe(7);
  });

  it("should run in a transaction (commit/rollback)", async () => {
    const u = new User();
    u.id = 100;
    const tx = (User as any).startTransaction(); // static tx handle
    await u.save(); // save writes into tx.after

    // before commit, find should return null from snapshot unless tx merges; our find looks at tx.after
    const foundInTx = await u.find(100);
    expect(foundInTx).not.toBeNull();

    // rollback and ensure item disappears
    await tx.rollback();
    const afterRollback = await u.find(100);
    expect(afterRollback).toBeNull();

    // start new tx and commit
    const tx2 = (User as any).startTransaction();
    await u.save();
    await tx2.commit();
    const afterCommit = await u.find(100);
    expect(afterCommit).not.toBeNull();
  });
});
