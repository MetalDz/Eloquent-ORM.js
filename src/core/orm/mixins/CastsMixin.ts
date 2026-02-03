/**
 * 🎭 CastsMixin
 * Adds attribute type casting (dates, numbers, booleans, JSON)
 * ✅ No abstract overload errors
 * ✅ Clean ESLint/TS-compatible super calls
 */

import { createBaseMethodResolver } from "./utils/BaseMethodResolver";

export interface Castable {
  find(id: number | string, pk?: string): Promise<this | null>;
  all(): Promise<this[]>;
  create(data: Record<string, unknown>): Promise<this>;
  update(id: number | string, data: Record<string, unknown>, pk?: string): Promise<void>;
}

/** Generic constructor helper */
type Constructor<T = object> = abstract new (...args: any[]) => T;

export function CastsMixin<TBase extends Constructor>(Base: TBase) {
  const resolveBaseMethod = createBaseMethodResolver(Base);

  abstract class CastableModel extends Base implements Castable {
    // ⚙️ Define attribute casting configuration
    protected casts: Record<
      string,
      "number" | "boolean" | "date" | "json" | "string"
    > = {};

    constructor(...args: any[]) {
      super(...args);
    }

    /**
     * ⚙️ Convert a single attribute value based on type.
     */
    protected castValue(type: string, value: unknown): unknown {
      if (value === null || value === undefined) return value;

      switch (type) {
        case "number":
          return Number(value);
        case "boolean":
          if (typeof value === "string") return value === "true" || value === "1";
          if (typeof value === "number") return value === 1;
          return Boolean(value);
        case "date":
          return new Date(value as string);
        case "json":
          try {
            return typeof value === "string" ? JSON.parse(value) : value;
          } catch {
            return value;
          }
        default:
          return value;
      }
    }

    /**
     * 🧩 Cast all attributes of a record.
     * Ensures immutability (does not mutate original).
     */
    protected castRecord(record: Record<string, unknown>): Record<string, unknown> {
      const result: Record<string, unknown> = { ...record };
      for (const [key, type] of Object.entries(this.casts)) {
        if (key in result) {
          result[key] = this.castValue(type, result[key]);
        }
      }
      return result;
    }

    /**
     * 🔍 Cast single record after find().
     */
    async find(id: number | string, pk: string = "id"): Promise<this | null> {
      const baseFind = resolveBaseMethod(this, "find");
      if (typeof baseFind !== "function") {
        throw new Error("Base 'find' method not found in CastsMixin chain.");
      }

      const record = (await baseFind(id, pk)) as this | null;
      if (!record) return null;

      const casted = this.castRecord(record as Record<string, unknown>);
      Object.assign(record, casted);
      return record;
    }

    /**
     * 📋 Cast all records returned by all().
     */
    async all(): Promise<this[]> {
      const baseAll = resolveBaseMethod(this, "all");
      if (typeof baseAll !== "function") {
        throw new Error("Base 'all' method not found in CastsMixin chain.");
      }

      const records = (await baseAll()) as this[];
      return records.map((r) => {
        const casted = this.castRecord(r as Record<string, unknown>);
        Object.assign(r, casted);
        return r;
      });
    }

    /**
     * 🔁 Optional: Revert data before saving (future DB driver use)
     */
    protected uncastData(data: Record<string, unknown>): Record<string, unknown> {
      return { ...data };
    }

    /**
     * ✏️ Dummy methods for interface satisfaction (not abstract to avoid overload conflict)
     */
    async create(data: Record<string, unknown>): Promise<this> {
      const baseCreate = resolveBaseMethod(this, "create");
      if (typeof baseCreate !== "function") {
        throw new Error("Base 'create' method not found in CastsMixin chain.");
      }
      const record = (await baseCreate(data)) as this;
      if (!record) return record;
      const casted = this.castRecord(record as Record<string, unknown>);
      Object.assign(record, casted);
      return record;
    }

    async update(id: number | string, data: Record<string, unknown>, pk: string = "id"): Promise<void> {
      const baseUpdate = resolveBaseMethod(this, "update");
      if (typeof baseUpdate !== "function") {
        throw new Error("Base 'update' method not found in CastsMixin chain.");
      }
      await baseUpdate(id, data, pk);
    }
  }

  // 👇 Return merged type for proper inference
  return CastableModel as unknown as TBase & (abstract new (...args: any[]) => Castable);
}
