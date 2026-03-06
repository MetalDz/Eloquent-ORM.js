import { HooksMixin } from "../core/orm/mixins/HooksMixin";
import { QueryCacheMixin } from "../core/orm/mixins/QueryCacheMixin";
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
const CacheableHookableBase = QueryCacheMixin(HookableBase);

class GrantedHookModel extends HookableBase {}
class UngrantedHookModel extends HookableBase {}
class GrantedCacheModel extends CacheableHookableBase {}
class AlsoGrantedCacheModel extends CacheableHookableBase {}
class UngrantedCacheModel extends CacheableHookableBase {}

describe("Phase 2 - hook registry integration", () => {
  beforeEach(() => {
    jest.spyOn(console, "warn").mockImplementation(() => undefined);
  });

  afterEach(() => {
    HookStore.clear();
    ModelRegistry.clear();
    jest.restoreAllMocks();
  });

  test("granted model can register hooks through static and instance APIs", async () => {
    ModelRegistry.grant(GrantedHookModel);

    const onCreating = jest.fn(async () => undefined);
    const onCreated = jest.fn(async () => undefined);

    (GrantedHookModel as any).on("creating", onCreating);
    const instance = new GrantedHookModel() as any;
    instance.registerHook("created", onCreated);

    const result = await instance.create({ name: "alpha" });

    expect(result).toEqual({ name: "alpha" });
    expect(onCreating).toHaveBeenCalledWith({ name: "alpha" });
    expect(onCreated).toHaveBeenCalledWith({ name: "alpha" });
    expect(HookStore.snapshot(GrantedHookModel).creating).toHaveLength(1);
    expect(HookStore.snapshot(GrantedHookModel).created).toHaveLength(1);
  });

  test("unregistered model hook registration is denied", () => {
    ModelRegistry.setStrictMode(true);

    const onCreated = jest.fn(async () => undefined);
    const instance = new UngrantedHookModel() as any;

    expect(() => (UngrantedHookModel as any).on("created", onCreated)).toThrow(
      "Hook registration denied for unregistered model: UngrantedHookModel"
    );
    expect(() => instance.registerHook("created", onCreated)).toThrow(
      "Hook registration denied for unregistered model: UngrantedHookModel"
    );
  });

  test("unregistered model is lazily granted when strict mode is disabled", async () => {
    const onCreated = jest.fn(async () => undefined);
    const instance = new UngrantedHookModel() as any;

    (UngrantedHookModel as any).on("created", onCreated);

    const result = await instance.create({ name: "lazy" });

    expect(result).toEqual({ name: "lazy" });
    expect(ModelRegistry.isGranted(UngrantedHookModel)).toBe(true);
    expect(onCreated).toHaveBeenCalledWith({ name: "lazy" });
  });

  test("query cache hooks are registered once per granted model", () => {
    ModelRegistry.grant(GrantedCacheModel);
    ModelRegistry.grant(AlsoGrantedCacheModel);

    new GrantedCacheModel();
    new GrantedCacheModel();
    new AlsoGrantedCacheModel();

    const grantedSnapshot = HookStore.snapshot(GrantedCacheModel);
    const secondSnapshot = HookStore.snapshot(AlsoGrantedCacheModel);

    expect(grantedSnapshot.created).toHaveLength(1);
    expect(grantedSnapshot.updated).toHaveLength(1);
    expect(grantedSnapshot.deleted).toHaveLength(1);

    expect(secondSnapshot.created).toHaveLength(1);
    expect(secondSnapshot.updated).toHaveLength(1);
    expect(secondSnapshot.deleted).toHaveLength(1);
  });

  test("query cache mixin skips hook registration for ungranted models", () => {
    ModelRegistry.setStrictMode(true);
    new UngrantedCacheModel();

    const snapshot = HookStore.snapshot(UngrantedCacheModel);
    expect(snapshot.creating).toHaveLength(0);
    expect(snapshot.created).toHaveLength(0);
    expect(snapshot.updating).toHaveLength(0);
    expect(snapshot.updated).toHaveLength(0);
    expect(snapshot.deleting).toHaveLength(0);
    expect(snapshot.deleted).toHaveLength(0);
  });

  test("query cache mixin lazily registers hooks when strict mode is disabled", () => {
    new UngrantedCacheModel();

    expect(ModelRegistry.isGranted(UngrantedCacheModel)).toBe(true);

    const snapshot = HookStore.snapshot(UngrantedCacheModel);
    expect(snapshot.created).toHaveLength(1);
    expect(snapshot.updated).toHaveLength(1);
    expect(snapshot.deleted).toHaveLength(1);
  });
});
