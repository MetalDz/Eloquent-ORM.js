import { createBaseMethodResolver } from "./utils/BaseMethodResolver";
import { HookStore } from "./utils/HookStore";
import { ModelRegistry, type ModelConstructor } from "./utils/ModelRegistry";

export type LifecycleEvent =
  | "creating"
  | "created"
  | "updating"
  | "updated"
  | "deleting"
  | "deleted";

export type HookHandler<TPayload> = (payload: TPayload) => Promise<void> | void;

/**
 * Base interface for hookable models.
 */
export interface HookableModel {
  create(data: Record<string, unknown>): Promise<unknown>;
  update(id: number | string, data: Record<string, unknown>, pk?: string): Promise<void>;
  delete(id: number | string, pk?: string): Promise<void>;
}

type Constructor<T = object> = abstract new (...args: any[]) => T;

export function HooksMixin<TBase extends Constructor>(Base: TBase) {
  const resolveBaseMethod = createBaseMethodResolver(Base);
  const deprecationWarnings = new WeakMap<ModelConstructor, Set<string>>();

  function warnDeprecatedApi(modelCtor: ModelConstructor, api: "on" | "registerHook"): void {
    const seen = deprecationWarnings.get(modelCtor) ?? new Set<string>();
    if (seen.has(api)) return;

    const modelName = modelCtor.name || "AnonymousModel";
    console.warn(
      `[DEPRECATION] ${modelName}.${api}() is deprecated. Prefer static modelEvents and registerModels([...]).`
    );

    seen.add(api);
    deprecationWarnings.set(modelCtor, seen);
  }

  abstract class Hookable extends Base implements HookableModel {
    constructor(...args: any[]) {
      super(...args);
    }

    /**
     * Register a class-level lifecycle hook.
     * Model must be granted via ModelRegistry before registration.
     */
    static on<TPayload>(
      this: Function,
      event: LifecycleEvent,
      callback: HookHandler<TPayload>
    ): void {
      const modelCtor = this as ModelConstructor;
      warnDeprecatedApi(modelCtor, "on");
      HookStore.add(modelCtor, event, callback);
    }

    /**
     * Internal helper to trigger all hooks for an event.
     */
    protected async fire<TPayload>(event: LifecycleEvent, payload: TPayload): Promise<void> {
      const modelCtor = this.constructor as ModelConstructor;
      ModelRegistry.ensureGranted(modelCtor, "lifecycle");
      const listeners = HookStore.get(modelCtor, event) as HookHandler<TPayload>[];

      for (const cb of listeners) {
        await cb(payload);
      }
    }

    async create(data: Record<string, unknown>): Promise<unknown> {
      const baseCreate = resolveBaseMethod(this, "create");
      if (typeof baseCreate !== "function") {
        throw new Error("Base 'create' method not found for HooksMixin.");
      }

      await this.fire("creating", data);
      const record = await baseCreate(data);
      await this.fire("created", record);
      return record;
    }

    async update(
      id: number | string,
      data: Record<string, unknown>,
      pk: string = "id"
    ): Promise<void> {
      const baseUpdate = resolveBaseMethod(this, "update");
      if (typeof baseUpdate !== "function") {
        throw new Error("Base 'update' method not found for HooksMixin.");
      }

      await this.fire("updating", { id, data });
      await baseUpdate(id, data, pk);
      await this.fire("updated", { id, data });
    }

    async delete(id: number | string, pk: string = "id"): Promise<void> {
      const baseDelete = resolveBaseMethod(this, "delete");
      if (typeof baseDelete !== "function") {
        throw new Error("Base 'delete' method not found for HooksMixin.");
      }

      await this.fire("deleting", { id });
      await baseDelete(id, pk);
      await this.fire("deleted", { id });
    }

    /**
     * Register an instance-level hook on the model constructor bucket.
     * Model must be granted via ModelRegistry before registration.
     */
    registerHook<TPayload>(event: LifecycleEvent, callback: HookHandler<TPayload>): void {
      const modelCtor = this.constructor as ModelConstructor;
      warnDeprecatedApi(modelCtor, "registerHook");
      HookStore.add(modelCtor, event, callback);
    }
  }

  return Hookable as unknown as TBase & (abstract new (...args: any[]) => HookableModel);
}
