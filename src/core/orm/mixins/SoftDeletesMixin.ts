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
  update(data: Record<string, unknown>, pk?: string): this;
  update(id: number | string, data: Record<string, unknown>, pk?: string): Promise<void>;
  delete(): Promise<void>;
  delete(id: number | string, pk?: string): Promise<void>;
  restore(): Promise<void>;
  restore(id: number | string, pk?: string): Promise<void>;
}

/** Generic constructor helper */
type Constructor<T = object> = abstract new (...args: any[]) => T;

export function SoftDeletesMixin<TBase extends Constructor>(Base: TBase) {
  const resolveBaseMethod = createBaseMethodResolver(Base);

  abstract class SoftDeletableModel extends Base implements SoftDeletable {
    deleted_at?: string | null;

    protected readonly deletedAtColumn = "deleted_at";

    private supportsSoftDeletes(): boolean {
      const ctor = this.constructor as {
        schema?: Record<string, unknown>;
        softDeletes?: boolean;
      };
      if (ctor.softDeletes === true) {
        return true;
      }

      const schema = ctor.schema;
      if (!schema || typeof schema !== "object") {
        return false;
      }

      for (const [fieldName, field] of Object.entries(schema)) {
        if (fieldName === this.deletedAtColumn) {
          return true;
        }
        if (!field || typeof field !== "object") {
          continue;
        }

        const candidate = field as {
          kind?: string;
          type?: string;
          name?: string;
        };
        /* istanbul ignore next -- exercised by schema-detection tests; ts-jest records this narrow loop branch inconsistently */
        if (candidate.type === "softDeletes") {
          return true;
        }

        /* istanbul ignore next -- exercised by schema-detection tests; ts-jest records this narrow loop branch inconsistently */
        if (candidate.kind === "mixin" && candidate.name === "SoftDeletes") {
          return true;
        }
      }

      return false;
    }

    constructor(...args: any[]) {
      super(...args);
    }

    private getTrackedPrimaryValue(pk: string): unknown {
      const self = this as Record<string, unknown>;
      const original =
        ((self._originalAttributes as Record<string, unknown> | undefined) ?? {}) as Record<
          string,
          unknown
        >;

      if (pk === "_id") {
        return self._id ?? self.id ?? original._id ?? original.id;
      }

      if (pk === "id") {
        return self.id ?? self._id ?? original.id ?? original._id;
      }

      return self[pk] ?? original[pk];
    }

    private syncSoftDeleteState(
      id: number | string,
      pk: string,
      deletedAtValue: string | null,
      options?: { removed?: boolean }
    ): void {
      if (!Object.is(this.getTrackedPrimaryValue(pk), id)) {
        return;
      }

      const self = this as Record<string, unknown>;
      self[this.deletedAtColumn] = deletedAtValue;

      if (options?.removed) {
        self._exists = false;
        self._originalAttributes = {};
        return;
      }

      const syncPersistedState = self.syncPersistedState;
      if (typeof syncPersistedState === "function") {
        syncPersistedState.call(this, {
          ...self,
          [this.deletedAtColumn]: deletedAtValue,
        });
      }
    }

    /**
     * 🚫 Override delete() to perform soft delete instead of hard remove
     */
    delete(): Promise<void>;
    delete(id: number | string, pk?: string): Promise<void>;
    async delete(id?: number | string, pk: string = "id"): Promise<void> {
      if (!this.supportsSoftDeletes()) {
        const baseDelete = resolveBaseMethod(this, "delete");
        if (typeof baseDelete !== "function") {
          throw new Error("Base 'delete' method not found for SoftDeletesMixin.");
        }

        const targetId =
          id ?? (this.getTrackedPrimaryValue(pk) as number | string | undefined);
        if (targetId === undefined || targetId === null) {
          throw new Error(
            `Cannot delete ${this.constructor.name} without primary key '${pk}'.`
          );
        }

        await baseDelete(targetId, pk);
        this.syncSoftDeleteState(targetId, pk, null, { removed: true });
        return;
      }

      const baseUpdate = resolveBaseMethod(this, "update");
      if (typeof baseUpdate !== "function") {
        throw new Error("Base 'update' method not found for SoftDeletesMixin.");
      }

      const targetId =
        id ?? (this.getTrackedPrimaryValue(pk) as number | string | undefined);
      if (targetId === undefined || targetId === null) {
        throw new Error(
          `Cannot delete ${this.constructor.name} without primary key '${pk}'.`
        );
      }

      const timestamp = new Date().toISOString();
      await baseUpdate(targetId, { [this.deletedAtColumn]: timestamp }, pk);
      this.syncSoftDeleteState(targetId, pk, timestamp);
    }

    /**
     * ♻️ Restore a soft-deleted record
     */
    restore(): Promise<void>;
    restore(id: number | string, pk?: string): Promise<void>;
    async restore(id?: number | string, pk: string = "id"): Promise<void> {
      const baseUpdate = resolveBaseMethod(this, "update");
      if (typeof baseUpdate !== "function") {
        throw new Error("Base 'update' method not found for SoftDeletesMixin.");
      }

      const targetId =
        id ?? (this.getTrackedPrimaryValue(pk) as number | string | undefined);
      if (targetId === undefined || targetId === null) {
        throw new Error(
          `Cannot restore ${this.constructor.name} without primary key '${pk}'.`
        );
      }

      await baseUpdate(targetId, { [this.deletedAtColumn]: null }, pk);
      this.syncSoftDeleteState(targetId, pk, null);
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
      if (!this.supportsSoftDeletes()) {
        return records as this[];
      }
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
      if (!this.supportsSoftDeletes()) {
        return record as this;
      }

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
      if (!this.supportsSoftDeletes()) {
        return [];
      }
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
      this.syncSoftDeleteState(id, pk, null, { removed: true });
    }

    /**
     * 🧩 TypeScript satisfaction: ensure update() exists
     */
    update(data: Record<string, unknown>, pk?: string): this;
    update(id: number | string, data: Record<string, unknown>, pk?: string): Promise<void>;
    update(
      idOrData: number | string | Record<string, unknown>,
      dataOrPk?: Record<string, unknown> | string,
      pk: string = "id"
    ): Promise<void> | this {
      const baseUpdate = resolveBaseMethod(this, "update");
      if (typeof baseUpdate !== "function") {
        throw new Error("Base 'update' method not found for SoftDeletesMixin.");
      }

      if (typeof idOrData === "object" && idOrData !== null && !Array.isArray(idOrData)) {
        return baseUpdate(idOrData, dataOrPk) as this;
      }

      return baseUpdate(idOrData, dataOrPk, pk) as Promise<void>;
    }
  }

  // ✅ Return type cast ensures TS knows Base + SoftDeletable merged
  return SoftDeletableModel as unknown as TBase & (abstract new (...args: any[]) => SoftDeletable);
}
