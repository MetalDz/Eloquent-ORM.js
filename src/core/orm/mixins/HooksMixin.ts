/**
 * ⚙️ HooksMixin
 * Adds event-driven lifecycle hooks (creating, created, updating, updated, deleting, deleted)
 */
export function HooksMixin<
  TBase extends new (...args: any[]) => {
    create(data: Record<string, any>): Promise<any>;
    update(id: number | string, data: Record<string, any>, pk?: string): Promise<void>;
    delete(id: number | string, pk?: string): Promise<void>;
  }
>(Base: TBase) {
  return class extends Base {
    static hooks: Record<string, Function[]> = {};

    /**
     * Register a lifecycle hook
     */
    static on(event: string, callback: Function) {
      if (!this.hooks[event]) this.hooks[event] = [];
      this.hooks[event].push(callback);
    }

    /**
     * Trigger hooks
     */
    protected async fire(event: string, payload: any) {
      const listeners = (this.constructor as any).hooks[event] || [];
      for (const cb of listeners) await cb(payload);
    }

    /**
     * Override create() to trigger hooks
     */
    async create(data: Record<string, any>): Promise<any> {
      await this.fire("creating", data);
      const record = await super.create(data);
      await this.fire("created", record);
      return record;
    }

    /**
     * Override update() to trigger hooks
     */
    async update(id: number | string, data: Record<string, any>, pk: string = "id"): Promise<void> {
      await this.fire("updating", { id, data });
      await super.update(id, data, pk);
      await this.fire("updated", { id, data });
    }

    /**
     * Override delete() to trigger hooks
     */
    async delete(id: number | string, pk: string = "id"): Promise<void> {
      await this.fire("deleting", { id });
      await super.delete(id, pk);
      await this.fire("deleted", { id });
    }
  };
}
