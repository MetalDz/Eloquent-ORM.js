import { createBaseMethodResolver } from "./utils/BaseMethodResolver.js";

/**
 * ًںŒچ ScopeMixin
 * Adds support for global model scopes (auto-filters)
 * âœ… Type-safe, chain-compatible, and compliant with all previous mixins
 */

export interface ScopableModel<TRecord extends Record<string, unknown> = Record<string, unknown>> {
  all(): Promise<TRecord[]>;
  find(id: number | string, pk?: string): Promise<TRecord | null>;
}

/**
 * ًں§© A single global scope callback
 */
export type ScopeCallback<TRecord> = (records: TRecord[]) => TRecord[] | void;

/**
 * ًں§  Constructor helper for mixins
 */
type Constructor<T = object> = abstract new (...args: any[]) => T;

export function ScopeMixin<
  TBase extends Constructor,
  TRecord extends Record<string, unknown> = Record<string, unknown>
>(Base: TBase) {
  const resolveBaseMethod = createBaseMethodResolver(Base);

  abstract class ScopedModel extends Base implements ScopableModel<TRecord> {
    /** ًں§± Static global scope registry */
    static globalScopes: Record<string, ScopeCallback<any>> = {};

    constructor(...args: any[]) {
      super(...args);
    }

    /**
     * â‍• Add a global scope to the model.
     * Example:
     *   User.addGlobalScope("active", records => records.filter(r => r.active))
     */
    static addGlobalScope<TRec extends Record<string, unknown>>(
      this: { globalScopes: Record<string, ScopeCallback<TRec>> },
      name: string,
      callback: ScopeCallback<TRec>
    ): void {
      this.globalScopes[name] = callback;
    }

    /**
     * ًںڑ« Remove a global scope by name.
     */
    static removeGlobalScope<TRec extends Record<string, unknown>>(
      this: { globalScopes: Record<string, ScopeCallback<TRec>> },
      name: string
    ): void {
      delete this.globalScopes[name];
    }

    /**
     * ًں§  Apply all global scopes to a result set.
     */
    protected applyScopes(records: TRecord[]): TRecord[] {
      const cls = this.constructor as typeof ScopedModel;
      const scopes = cls.globalScopes as Record<string, ScopeCallback<TRecord>>;
      let filtered = records;

      for (const scopeFn of Object.values(scopes)) {
        if (typeof scopeFn === "function") {
          const res = scopeFn(filtered);
          if (Array.isArray(res)) filtered = res;
        }
      }

      return filtered;
    }

    /**
     * ًں“‹ Override all() to apply global scopes automatically.
     */
    async all(): Promise<TRecord[]> {
      const baseAll = resolveBaseMethod(this, "all");
      if (typeof baseAll !== "function") {
        throw new Error("Base 'all' method not found in ScopeMixin chain.");
      }

      const records = await baseAll();
      return this.applyScopes(records as TRecord[]);
    }

    /**
     * ًں”چ Override find() to apply scopes to single record results.
     */
    async find(id: number | string, pk: string = "id"): Promise<TRecord | null> {
      const baseFind = resolveBaseMethod(this, "find");
      if (typeof baseFind !== "function") {
        throw new Error("Base 'find' method not found in ScopeMixin chain.");
      }

      const record = await baseFind(id, pk);
      if (!record) return null;

      const filtered = this.applyScopes([record as TRecord]);
      return filtered.length > 0 ? filtered[0] : null;
    }
  }

  // âœ… Return merged type for correct inference
  return ScopedModel as unknown as TBase & (abstract new (...args: any[]) => ScopableModel<TRecord>);
}
