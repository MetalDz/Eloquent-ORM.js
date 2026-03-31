import { HookStore, type LifecycleEvent } from "../core/orm/mixins/utils/HookStore.js";
import { ModelRegistry } from "../core/orm/mixins/utils/ModelRegistry.js";

class UserModel {}
class PostModel {}

describe("HookStore logic", () => {
  afterEach(() => {
    HookStore.clear();
    ModelRegistry.clear();
  });

  test("add/get works for granted models", async () => {
    ModelRegistry.grant(UserModel);

    const handlerA = jest.fn(async () => undefined);
    const handlerB = jest.fn(async () => undefined);

    HookStore.add(UserModel, "created", handlerA);
    HookStore.add(UserModel, "created", handlerB);

    const handlers = HookStore.get(UserModel, "created");
    expect(handlers).toHaveLength(2);

    await handlers[0]({ id: 1 });
    await handlers[1]({ id: 2 });

    expect(handlerA).toHaveBeenCalledWith({ id: 1 });
    expect(handlerB).toHaveBeenCalledWith({ id: 2 });
  });

  test("add lazily grants unregistered models when strict mode is disabled", () => {
    const handler = jest.fn();

    HookStore.add(PostModel, "created", handler);

    expect(ModelRegistry.isGranted(PostModel)).toBe(true);
    expect(HookStore.get(PostModel, "created")).toHaveLength(1);
  });

  test("add throws for unregistered models in strict mode", () => {
    const handler = jest.fn();
    ModelRegistry.setStrictMode(true);

    expect(() => HookStore.add(PostModel, "created", handler)).toThrow(
      "Hook registration denied for unregistered model: PostModel"
    );
  });

  test("clear(model) clears only one model bucket", () => {
    ModelRegistry.grant(UserModel);
    ModelRegistry.grant(PostModel);

    const events: LifecycleEvent[] = ["creating", "created", "updating", "updated", "deleting", "deleted"];
    for (const event of events) {
      HookStore.add(UserModel, event, () => undefined);
      HookStore.add(PostModel, event, () => undefined);
    }

    HookStore.clear(UserModel);

    expect(HookStore.get(UserModel, "created")).toHaveLength(0);
    expect(HookStore.get(PostModel, "created")).toHaveLength(1);
  });

  test("clear() clears all buckets", () => {
    ModelRegistry.grant(UserModel);
    HookStore.add(UserModel, "created", () => undefined);
    expect(HookStore.get(UserModel, "created")).toHaveLength(1);

    HookStore.clear();

    expect(HookStore.get(UserModel, "created")).toHaveLength(0);
  });
});
