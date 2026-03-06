import { HooksMixin } from "../core/orm/mixins/HooksMixin";
import { HookStore } from "../core/orm/mixins/utils/HookStore";
import { ModelRegistry } from "../core/orm/mixins/utils/ModelRegistry";

class CrudBase {
  async create(data: Record<string, unknown>): Promise<unknown> {
    return { ...data };
  }

  async update(_id: number | string, _data: Record<string, unknown>, _pk = "id"): Promise<void> {
    return;
  }

  async delete(_id: number | string, _pk = "id"): Promise<void> {
    return;
  }
}

const HookableBase = HooksMixin(CrudBase as unknown as abstract new (...args: any[]) => object);
class UserModel extends HookableBase {}

describe("Phase 4 - hook deprecation warnings", () => {
  afterEach(() => {
    HookStore.clear();
    ModelRegistry.clear();
    jest.restoreAllMocks();
  });

  test("warns once for static on() and once for instance registerHook()", () => {
    ModelRegistry.grant(UserModel);
    ModelRegistry.setStrictMode(true);

    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => undefined);

    (UserModel as any).on("created", async () => undefined);
    (UserModel as any).on("updated", async () => undefined);

    const instance = new UserModel() as any;
    instance.registerHook("deleted", async () => undefined);
    instance.registerHook("creating", async () => undefined);

    const deprecationMessages = warnSpy.mock.calls
      .map((args) => String(args[0]))
      .filter((line) => line.includes("[DEPRECATION]"));

    expect(deprecationMessages).toHaveLength(2);
    expect(deprecationMessages.some((line) => line.includes("UserModel.on()"))).toBe(true);
    expect(deprecationMessages.some((line) => line.includes("UserModel.registerHook()"))).toBe(
      true
    );
  });
});
