/**
 * 🎭 CastsMixin
 * Adds attribute type casting (dates, numbers, booleans, JSON)
 */
export function CastsMixin<
  TBase extends new (...args: any[]) => {
    create(data: Record<string, any>): Promise<any>;
    update(id: number | string, data: Record<string, any>, pk?: string): Promise<void>;
    find(id: number | string, pk?: string): Promise<any>;
    all(): Promise<any[]>;
  }
>(Base: TBase) {
  return class extends Base {
    protected casts: Record<string, string> = {};

    /**
     * ⚙️ Convert a single attribute value
     */
    protected castValue(type: string, value: any): any {
      if (value === null || value === undefined) return value;

      switch (type) {
        case "number": return Number(value);
        case "boolean": return Boolean(value);
        case "date": return new Date(value);
        case "json":
          try { return JSON.parse(value); } catch { return value; }
        default: return value;
      }
    }

    /**
     * 🧩 Cast all attributes of a record
     */
    protected castRecord(record: Record<string, any>): Record<string, any> {
      const result: Record<string, any> = { ...record };
      for (const [key, type] of Object.entries(this.casts)) {
        result[key] = this.castValue(type, record[key]);
      }
      return result;
    }

    /**
     * 🔍 Cast single record after find()
     */
    async find(id: number | string, pk: string = "id"): Promise<any> {
      const record = await super.find(id, pk);
      return record ? this.castRecord(record) : null;
    }

    /**
     * 📋 Cast all records
     */
    async all(): Promise<any[]> {
      const records = await super.all();
      return records.map((r) => this.castRecord(r));
    }

    /**
     * ➕ Cast data before insert/update (optional future expansion)
     */
    protected uncastData(data: Record<string, any>): Record<string, any> {
      return { ...data };
    }
  };
}
