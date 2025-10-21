/**
 * 🧩 SerializeMixin
 * Adds toJSON() and toObject() serialization logic
 */
export function SerializeMixin<
  TBase extends new (...args: any[]) => {
    all(): Promise<any[]>;
    find(id: number | string, pk?: string): Promise<any>;
  }
>(Base: TBase) {
  return class extends Base {
    /**
     * 🕵️‍♂️ Attributes to hide during serialization
     */
    protected hidden: string[] = [];

    /**
     * 🌟 Attributes to append dynamically (computed)
     */
    protected appends: string[] = [];

    /**
     * 🚀 Convert model to plain JS object
     */
    toObject(): Record<string, any> {
      const raw = { ...this } as any;
      const obj: Record<string, any> = {};

      for (const key of Object.keys(raw)) {
        // Skip private, hidden, or internal fields
        if (key.startsWith("_")) continue;
        if (this.hidden.includes(key)) continue;

        const value = (raw as any)[key];
        obj[key] = this.serializeValue(value);
      }

      // Append computed attributes
      for (const attr of this.appends) {
        const getter = (this as any)[attr];
        if (typeof getter === "function") {
          obj[attr] = getter.call(this);
        }
      }

      return obj;
    }

    /**
     * 🧠 Convert to JSON (stringified)
     */
    toJSON(): string {
      return JSON.stringify(this.toObject());
    }

    /**
     * ♻️ Handle nested relation objects or arrays
     */
    protected serializeValue(value: any): any {
      if (value === null || value === undefined) return value;

      if (Array.isArray(value)) {
        return value.map((v) =>
          typeof v.toObject === "function" ? v.toObject() : v
        );
      }

      if (typeof value === "object") {
        if (typeof (value as any).toObject === "function") {
          return (value as any).toObject();
        }
        return value;
      }

      return value;
    }
  };
}
