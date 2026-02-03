/**
 * 🧩 SerializeMixin
 * Adds toJSON() and toObject() serialization logic.
 * ✅ Type-safe, mixin-compliant, and compatible with nested models and arrays.
 */

export interface SerializableModel {
  all(): Promise<unknown[]>;
  find(id: number | string, pk?: string): Promise<unknown | null>;
  toObject?(): Record<string, unknown>;
  toJSON?(): string;
}

/** Generic abstract constructor used by all mixins */
type Constructor<T = object> = abstract new (...args: any[]) => T;


export function SerializeMixin<TBase extends Constructor<SerializableModel>>(Base: TBase) {
  abstract class Serializable extends Base implements SerializableModel {
    /**
     * 🕵️‍♂️ Attributes to hide during serialization
     * Example: ['password', 'api_token']
     */
    protected hidden: string[] = [];

    /**
     * 🌟 Computed attributes to append to output
     * Example: ['full_name', 'profile_url']
     */
    protected appends: string[] = [];

    constructor(...args: any[]) {
      super(...args);
    }

    /**
     * 🚀 Convert model instance into a plain JS object
     * - Removes hidden/private fields
     * - Appends computed attributes
     * - Recursively serializes nested models/arrays
     */
    toObject(): Record<string, unknown> {
      // ✅ Safe shallow clone that TS accepts
      const raw = Object.assign({}, this) as Record<string, unknown>;
      const obj: Record<string, unknown> = {};

      for (const [key, value] of Object.entries(raw)) {
        if (key.startsWith("_")) continue; // skip internals
        if (this.hidden.includes(key)) continue;

        obj[key] = this.serializeValue(value);
      }

      // 🌟 Append computed attributes
      for (const attr of this.appends) {
        const getter = (this as Record<string, unknown>)[attr];
        if (typeof getter === "function") {
          obj[attr] = (getter as () => unknown).call(this);
        }
      }

      return obj;
    }

    /**
     * 🧠 Convert model to JSON string
     */
    toJSON(): string {
      return JSON.stringify(this.toObject());
    }

    /**
     * ♻️ Recursively serialize nested models, arrays, or plain objects
     */
    protected serializeValue(value: unknown): unknown {
      if (value === null || value === undefined) return value;

      // 🧩 Handle arrays
      if (Array.isArray(value)) {
        return value.map((v) => this.serializeValue(v));
      }

      // 🧩 Handle nested model or plain object
      if (typeof value === "object") {
        const objVal = value as { toObject?: () => Record<string, unknown> };
        if (typeof objVal.toObject === "function") {
          return objVal.toObject();
        }
        return { ...(value as Record<string, unknown>) };
      }

      // ⚙️ Primitive values (string, number, boolean)
      return value;
    }
  }

  return Serializable;
}
