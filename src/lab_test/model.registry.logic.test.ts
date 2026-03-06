import { ModelRegistry } from "../core/orm/mixins/utils/ModelRegistry";

class UserModel {}
class PostModel {}

describe("ModelRegistry logic", () => {
  afterEach(() => {
    ModelRegistry.clear();
  });

  test("grant and isGranted are idempotent", () => {
    expect(ModelRegistry.isGranted(UserModel)).toBe(false);

    ModelRegistry.grant(UserModel);
    ModelRegistry.grant(UserModel);

    expect(ModelRegistry.isGranted(UserModel)).toBe(true);
    expect(ModelRegistry.listGranted()).toContain(UserModel);
    expect(ModelRegistry.listGranted().length).toBe(1);
  });

  test("revoke removes only the targeted model", () => {
    ModelRegistry.grant(UserModel);
    ModelRegistry.grant(PostModel);

    ModelRegistry.revoke(UserModel);

    expect(ModelRegistry.isGranted(UserModel)).toBe(false);
    expect(ModelRegistry.isGranted(PostModel)).toBe(true);
    expect(ModelRegistry.listGranted()).toEqual([PostModel]);
  });

  test("clear resets the registry", () => {
    ModelRegistry.grant(UserModel);
    ModelRegistry.grant(PostModel);

    ModelRegistry.clear();

    expect(ModelRegistry.isGranted(UserModel)).toBe(false);
    expect(ModelRegistry.isGranted(PostModel)).toBe(false);
    expect(ModelRegistry.listGranted()).toEqual([]);
  });

  test("invalid constructor input throws", () => {
    expect(() => ModelRegistry.grant(null as unknown as Function)).toThrow(
      "ModelRegistry expects a model constructor function."
    );
    expect(() => ModelRegistry.isGranted(undefined as unknown as Function)).toThrow(
      "ModelRegistry expects a model constructor function."
    );
  });

  test("ensureGranted lazily grants in non-strict mode", () => {
    expect(ModelRegistry.isGranted(UserModel)).toBe(false);

    ModelRegistry.ensureGranted(UserModel, "lifecycle");

    expect(ModelRegistry.isGranted(UserModel)).toBe(true);
  });

  test("ensureGranted throws for unregistered model in strict mode", () => {
    ModelRegistry.setStrictMode(true);

    expect(() => ModelRegistry.ensureGranted(PostModel, "registration")).toThrow(
      "Hook registration denied for unregistered model: PostModel"
    );
  });
});
