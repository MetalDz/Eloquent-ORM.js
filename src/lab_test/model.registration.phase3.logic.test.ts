import { HooksMixin } from "../core/orm/mixins/HooksMixin.js";
import { HookStore } from "../core/orm/mixins/utils/HookStore.js";
import { ModelRegistry } from "../core/orm/mixins/utils/ModelRegistry.js";
import {
  isModelRegistered,
  isModelRegistryStrictMode,
  registerModels,
  setModelRegistryStrictMode,
} from "../core/orm/mixins/utils/modelRegistration.js";

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

class RegisteredModel extends HookableBase {}
class UnregisteredModel extends HookableBase {}
class OptionalStrictModel extends HookableBase {}

describe("Phase 3 - model registration flow", () => {
  afterEach(() => {
    HookStore.clear();
    ModelRegistry.clear();
    jest.clearAllMocks();
  });

  test("registerModels grants models and enables strict mode by default", () => {
    registerModels([RegisteredModel]);

    expect(isModelRegistered(RegisteredModel)).toBe(true);
    expect(isModelRegistryStrictMode()).toBe(true);
  });

  test("registerModels can skip strict mode when requested", () => {
    registerModels([OptionalStrictModel], { strict: false });

    expect(isModelRegistered(OptionalStrictModel)).toBe(true);
    expect(isModelRegistryStrictMode()).toBe(false);
  });

  test("strict mode blocks lifecycle hook access for unregistered models", async () => {
    registerModels([RegisteredModel]);

    await expect(new RegisteredModel().create({ ok: true })).resolves.toEqual({ ok: true });

    await expect(new UnregisteredModel().create({ ok: false })).rejects.toThrow(
      "Model not granted in ModelRegistry: UnregisteredModel. Register models via registerModels([...])."
    );
  });

  test("non-strict mode lazily grants model at first lifecycle usage", async () => {
    setModelRegistryStrictMode(false);

    expect(isModelRegistered(UnregisteredModel)).toBe(false);

    await expect(new UnregisteredModel().create({ ok: true })).resolves.toEqual({ ok: true });

    expect(isModelRegistered(UnregisteredModel)).toBe(true);
  });
});
