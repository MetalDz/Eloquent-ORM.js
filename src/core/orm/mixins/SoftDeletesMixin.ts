/**
 * 🧹 SoftDeletesMixin
 * Adds soft delete support (deleted_at timestamp)
 * ✅ Fully type-safe and mixin-compliant
 * ✅ Compatible with CoreModel and previous mixins
 */

import { createBaseMethodResolver } from "./utils/BaseMethodResolver";

export interface SoftDeletable {
  deleted_at?: string | null;

  find(id: number | string, pk?: string): Promise<this | null>;
  all(): Promise<this[]>;
  update(id: number | string, data: Record<string, unknown>, pk?: string): Promise<void>;
  delete(id: number | string, pk?: string): Promise<void>;
}

/** Generic constructor helper */
type Constructor<T = object> = abstract new (...args: any[]) => T;

export function SoftDeletesMixin<TBase extends Constructor>(Base: TBase) {
  const resolveBaseMethod = createBaseMethodResolver(Base);

  abstract class SoftDeletableModel extends Base implements SoftDeletable {
    deleted_at?: string | null;

    protected readonly deletedAtColumn = "deleted_at";

    constructor(...args: any[]) {
      super(...args);
    }

    /**
     * 🚫 Override delete() to perform soft delete instead of hard remove
     */
    async delete(id: number | string, pk: string = "id"): Promise<void> {
      const baseUpdate = resolveBaseMethod(this, "update");
      if (typeof baseUpdate !== "function") {
        throw new Error("Base 'update' method not found for SoftDeletesMixin.");
      }

      const timestamp = new Date().toISOString();
      await baseUpdate(id, { [this.deletedAtColumn]: timestamp }, pk);
    }

    /**
     * ♻️ Restore a soft-deleted record
     */
    async restore(id: number | string, pk: string = "id"): Promise<void> {
      const baseUpdate = resolveBaseMethod(this, "update");
      if (typeof baseUpdate !== "function") {
        throw new Error("Base 'update' method not found for SoftDeletesMixin.");
      }

      await baseUpdate(id, { [this.deletedAtColumn]: null }, pk);
    }

    /**
     * 🔎 Get all non-deleted records
     */
    async all(): Promise<this[]> {
      const baseAll = resolveBaseMethod(this, "all");
      if (typeof baseAll !== "function") {
        throw new Error("Base 'all' method not found for SoftDeletesMixin.");
      }

      const records = await baseAll();
      return (records as this[]).filter(
        (record) => !(record as any)[this.deletedAtColumn]
      );
    }

    /**
     * 🔍 Find a record if not soft-deleted
     */
    async find(id: number | string, pk: string = "id"): Promise<this | null> {
      const baseFind = resolveBaseMethod(this, "find");
      if (typeof baseFind !== "function") {
        throw new Error("Base 'find' method not found for SoftDeletesMixin.");
      }

      const record = await baseFind(id, pk);
      if (!record) return null;

      const isDeleted =
        typeof (record as any)[this.deletedAtColumn] === "string" &&
        (record as any)[this.deletedAtColumn] !== null;

      return isDeleted ? null : (record as this);
    }

    /**
     * 🧠 Get all including deleted
     */
    async withTrashed(): Promise<this[]> {
      const baseAll = resolveBaseMethod(this, "all");
      if (typeof baseAll !== "function") {
        throw new Error("Base 'all' method not found for SoftDeletesMixin.");
      }

      return (await baseAll()) as this[];
    }

    /**
     * 🧠 Get only deleted records
     */
    async onlyTrashed(): Promise<this[]> {
      const baseAll = resolveBaseMethod(this, "all");
      if (typeof baseAll !== "function") {
        throw new Error("Base 'all' method not found for SoftDeletesMixin.");
      }

      const allRecords = (await baseAll()) as this[];
      return allRecords.filter(
        (record) =>
          typeof (record as any)[this.deletedAtColumn] === "string" &&
          (record as any)[this.deletedAtColumn] !== null
      );
    }

    /**
     * ⚙️ Force delete (permanent removal from DB)
     */
    async forceDelete(id: number | string, pk: string = "id"): Promise<void> {
      const baseDelete = resolveBaseMethod(this, "delete");
      if (typeof baseDelete !== "function") {
        throw new Error("Base 'delete' method not found for SoftDeletesMixin.");
      }

      await baseDelete(id, pk);
    }

    /**
     * 🧩 TypeScript satisfaction: ensure update() exists
     */
    async update(id: number | string, data: Record<string, unknown>, pk: string = "id"): Promise<void> {
      const baseUpdate = resolveBaseMethod(this, "update");
      if (typeof baseUpdate !== "function") {
        throw new Error("Base 'update' method not found for SoftDeletesMixin.");
      }
      await baseUpdate(id, data, pk);
    }
  }

  // ✅ Return type cast ensures TS knows Base + SoftDeletable merged
  return SoftDeletableModel as unknown as TBase & (abstract new (...args: any[]) => SoftDeletable);
}
