/**
 * 🧹 SoftDeletesMixin
 * Adds soft delete support (deleted_at timestamp)
 */
export function SoftDeletesMixin<
  TBase extends new (...args: any[]) => {
    find(id: number | string, pk?: string): Promise<any>;
    all(): Promise<any[]>;
    update(id: number | string, data: Record<string, any>, pk?: string): Promise<void>;
    delete(id: number | string, pk?: string): Promise<void>;
  }
>(Base: TBase) {
  return class extends Base {
    protected deletedAtColumn = "deleted_at";

    /**
     * 🚫 Override delete() to perform soft delete
     */
    async delete(id: number | string, pk: string = "id"): Promise<void> {
      const timestamp = new Date().toISOString();
      await this.update(id, { [this.deletedAtColumn]: timestamp }, pk);
    }

    /**
     * ♻️ Restore a soft-deleted record
     */
    async restore(id: number | string, pk: string = "id"): Promise<void> {
      await this.update(id, { [this.deletedAtColumn]: null }, pk);
    }

    /**
     * 🔎 Get all non-deleted records
     */
    async all(): Promise<any[]> {
      const records = await super.all();
      return records.filter((r: any) => !r[this.deletedAtColumn]);
    }

    /**
     * 🔎 Find a record if not soft-deleted
     */
    async find(id: number | string, pk: string = "id"): Promise<any> {
      const record = await super.find(id, pk);
      if (!record) return null;
      return record[this.deletedAtColumn] ? null : record;
    }

    /**
     * 🧠 Get all including deleted
     */
    async withTrashed(): Promise<any[]> {
      return await super.all();
    }

    /**
     * 🧠 Get only deleted records
     */
    async onlyTrashed(): Promise<any[]> {
      const allRecords = await super.all();
      return allRecords.filter((r: any) => !!r[this.deletedAtColumn]);
    }

    /**
     * ⚙️ Force delete (really remove from DB)
     */
    async forceDelete(id: number | string, pk: string = "id"): Promise<void> {
      await super.delete(id, pk);
    }
  };
}
