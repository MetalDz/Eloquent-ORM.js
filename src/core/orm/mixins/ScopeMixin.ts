/**
 * 🌍 ScopeMixin
 * Adds support for global model scopes (auto-filters)
 */
export function ScopeMixin<
  TBase extends new (...args: any[]) => {
    all(): Promise<any[]>;
    find(id: number | string, pk?: string): Promise<any>;
  }
>(Base: TBase) {
  return class extends Base {
    // Each scope is a function that accepts records and returns filtered records (or void)
    static globalScopes: Record<string, (records: any[]) => any[] | void> = {};

    /**
     * ➕ Add a global scope
     */
    static addGlobalScope(name: string, callback: (records: any[]) => any[] | void) {
      this.globalScopes[name] = callback;
    }

    /**
     * 🚫 Remove a global scope
     */
    static removeGlobalScope(name: string) {
      delete this.globalScopes[name];
    }

    /**
     * 🧠 Apply all global scopes to a result set
     */
    protected applyScopes(records: any[]): any[] {
      // Narrow the static field to the correct type
      const scopes = (this.constructor as any).globalScopes as Record<string, (records: any[]) => any[] | void>;
      let filtered = records;

      // Iterate and call each scope with a known callable signature
      for (const scopeFn of Object.values(scopes)) {
        if (typeof scopeFn === "function") {
          const res = scopeFn(filtered);
          // If a scope returns something, use it; otherwise keep previous filtered value
          if (Array.isArray(res)) filtered = res;
        }
      }

      return filtered;
    }

    /**
     * 🧩 Override all()
     */
    async all(): Promise<any[]> {
      const records = await super.all();
      return this.applyScopes(records);
    }

    /**
     * 🧩 Override find()
     */
    async find(id: number | string, pk: string = "id"): Promise<any> {
      const record = await super.find(id, pk);
      if (!record) return null;

      const filtered = this.applyScopes([record]);
      return filtered.length ? filtered[0] : null;
    }
  };
}
