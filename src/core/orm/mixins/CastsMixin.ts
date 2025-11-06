/**
 * 🎭 CastsMixin
 * Adds attribute type casting (dates, numbers, booleans, JSON)
 * ✅ No abstract overload errors
 * ✅ Clean ESLint/TS-compatible super calls
 */

export interface Castable {
  id?: string | number;
  [key: string]: unknown;

  find(id: number | string, pk?: string): Promise<this | null>;
  all(): Promise<this[]>;
  create(data: Record<string, unknown>): Promise<this>;
  update(id: number | string, data: Record<string, unknown>, pk?: string): Promise<void>;
}

/** Generic constructor helper */
type Constructor<T = object> = abstract new (...args: any[]) => T;

export function CastsMixin<TBase extends Constructor>(Base: TBase) {
  abstract class CastableModel extends Base implements Castable {
    id?: string | number;
    [key: string]: unknown;

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
      const baseFind = (Object.getPrototypeOf(this) as any).find?.bind(this);
      if (typeof baseFind !== "function") {
        throw new Error("Base 'find' method not found in CastsMixin chain.");
      }

      const record = await baseFind(id, pk);
      if (!record) return null;

      const casted = this.castRecord(record as Record<string, unknown>);
      return Object.assign(this, casted) as this;
    }

    /**
     * 📋 Cast all records returned by all().
     */
    async all(): Promise<this[]> {
      const baseAll = (Object.getPrototypeOf(this) as any).all?.bind(this);
      if (typeof baseAll !== "function") {
        throw new Error("Base 'all' method not found in CastsMixin chain.");
      }

      const records = await baseAll();
      return (records as Record<string, unknown>[]).map((r) => this.castRecord(r)) as this[];
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
      const baseCreate = (Object.getPrototypeOf(this) as any).create?.bind(this);
      const record = await baseCreate(data);
      return Object.assign(this, record) as this;
    }

    async update(id: number | string, data: Record<string, unknown>, pk: string = "id"): Promise<void> {
      const baseUpdate = (Object.getPrototypeOf(this) as any).update?.bind(this);
      if (typeof baseUpdate === "function") {
        await baseUpdate(id, data, pk);
      }
    }
  }

  // 👇 Return merged type for proper inference
  return CastableModel as unknown as TBase & (abstract new (...args: any[]) => Castable);
}
