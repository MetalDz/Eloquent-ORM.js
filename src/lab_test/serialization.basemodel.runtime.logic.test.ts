import { BaseModel } from "../core/model/BaseModel";

describe("BaseModel default serialization runtime", () => {
  class PostModel extends BaseModel {
    constructor() {
      super("posts", "sqlite_test");
    }
  }

  class UserModel extends BaseModel {
    constructor() {
      super("users", "sqlite_test");
    }

    fullName() {
      const self = this as unknown as Record<string, unknown>;
      return `${String(self.first_name ?? "")} ${String(self.last_name ?? "")}`.trim();
    }
  }

  test("default BaseModel instances expose toObject and toJSON", () => {
    const user = new UserModel() as UserModel & Record<string, unknown>;
    user.id = 1;
    user.email = "user@example.com";

    expect(typeof user.toObject).toBe("function");
    expect(typeof user.toJSON).toBe("function");
    expect(user.toObject()).toEqual(
      expect.objectContaining({
        id: 1,
        email: "user@example.com",
      })
    );
    expect(JSON.parse(user.toJSON())).toEqual(
      expect.objectContaining({
        id: 1,
        email: "user@example.com",
      })
    );
  });

  test("serialization excludes hidden fields, underscore internals, and appends computed attributes", () => {
    const user = new UserModel() as UserModel & Record<string, unknown>;
    user.first_name = "Ada";
    user.last_name = "Lovelace";
    user.password = "secret";
    user._internal = "skip-me";
    user.hidden = ["password"];
    user.appends = ["fullName"];

    const serialized = user.toObject() as Record<string, unknown>;

    expect(serialized).toEqual(
      expect.objectContaining({
        tableName: "users",
        connectionName: "sqlite_test",
        eagerRelations: [],
        hidden: ["password"],
        appends: ["fullName"],
        first_name: "Ada",
        last_name: "Lovelace",
        fullName: "Ada Lovelace",
      })
    );
    expect(serialized).not.toHaveProperty("password");
    expect(serialized).not.toHaveProperty("_internal");
  });

  test("serialization recursively serializes nested model instances and arrays", () => {
    const post = new PostModel() as PostModel & Record<string, unknown>;
    post.id = 10;
    post.title = "Hello";
    post.hidden = [];
    post.appends = [];

    const user = new UserModel() as UserModel & Record<string, unknown>;
    user.id = 1;
    user.hidden = [];
    user.appends = [];
    user.posts = [post];
    user.profile = post;

    expect(user.toObject()).toEqual(
      expect.objectContaining({
        id: 1,
        posts: [
          expect.objectContaining({
            id: 10,
            title: "Hello",
          }),
        ],
        profile: expect.objectContaining({
          id: 10,
          title: "Hello",
        }),
      })
    );
  });
});
