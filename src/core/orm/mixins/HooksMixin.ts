/**
 * ⚙️ HooksMixin
 * Adds event-driven lifecycle hooks (creating, created, updating, updated, deleting, deleted)
 * ✅ Fully TS-safe, mixin-compliant, and compatible with all ORM layers
 */

import { createBaseMethodResolver } from "./utils/BaseMethodResolver";

export type LifecycleEvent =
  | "creating"
  | "created"
  | "updating"
  | "updated"
  | "deleting"
  | "deleted";

export type HookHandler<TPayload> = (payload: TPayload) => Promise<void> | void;

/**
 * Base interface for hookable models
 */
export interface HookableModel {
  create(data: Record<string, unknown>): Promise<unknown>;
  update(id: number | string, data: Record<string, unknown>, pk?: string): Promise<void>;
  delete(id: number | string, pk?: string): Promise<void>;
}

/** Generic mixin constructor helper */
type Constructor<T = object> = abstract new (...args: any[]) => T;

export function HooksMixin<TBase extends Constructor>(Base: TBase) {
  const resolveBaseMethod = createBaseMethodResolver(Base);

  abstract class Hookable extends Base implements HookableModel {
    /**
     * Global registry of lifecycle hooks per subclass
     */
    static hooks: Record<LifecycleEvent, HookHandler<unknown>[]> = {
      creating: [],
      created: [],
      updating: [],
      updated: [],
      deleting: [],
      deleted: [],
    };

    constructor(...args: any[]) {
      super(...args);
    }

    /**
     * 📌 Register a hook for a specific event
     * Example:
     *   User.on("creating", async (data) => { ... })
     */
    static on<TPayload>(event: LifecycleEvent, callback: HookHandler<TPayload>): void {
      const hooks = (this as typeof Hookable).hooks[event] as HookHandler<TPayload>[];
      hooks.push(callback);
    }

    /**
     * 🧩 Internal helper to trigger all hooks for an event
     */
    protected async fire<TPayload>(event: LifecycleEvent, payload: TPayload): Promise<void> {
      const cls = this.constructor as typeof Hookable;
      const listeners = cls.hooks[event] as HookHandler<TPayload>[];

      for (const cb of listeners) {
        await cb(payload);
      }
    }

    /**
     * 🧠 Override create() to trigger hooks
     */
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

    /**
     * 🧱 Override update() to trigger hooks
     */
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

    /**
     * 🗑️ Override delete() to trigger hooks
     */
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
     * ✅ Instance method to register hooks dynamically at runtime
     * Example: user.registerHook("created", fn)
     */
    registerHook<TPayload>(event: LifecycleEvent, callback: HookHandler<TPayload>): void {
      const cls = this.constructor as typeof Hookable;
      (cls.hooks[event] as HookHandler<TPayload>[]).push(callback);
    }
  }

  // ✅ Return type cast ensures TS knows Base + Hookable merged
  return Hookable as unknown as TBase & (abstract new (...args: any[]) => HookableModel);
}
