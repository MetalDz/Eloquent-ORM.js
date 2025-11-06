// src/test/utils/MockOrmModel.ts
import { EagerLoadable, RelationDefinition } from "../../core/orm/mixins/EagerLoadingMixin";
import { MorphableBaseModel } from "../../core/orm/mixins/MorphableMixin";

/**
 * 🧠 MockOrmModel v2.1
 * - In-memory DB
 * - Auto-relations recognized by EagerLoadingMixin
 * - Monkey-patches getRelationStrict for test environment
 */
export function MockOrmModel<TBase extends abstract new (...args: any[]) => object>(Base: TBase) {
  abstract class MockModel extends Base implements EagerLoadable, MorphableBaseModel {
    [key: string]: unknown;

    id: number | string = 1;
    table = "mock_table";

    private static _store: Record<string, MockModel[]> = {};
    protected _mockRelations: Record<string, RelationDefinition<this>> = {};

    constructor(...args: any[]) {
      super(...args);
      const modelName = this.constructor.name;
      if (!MockModel._store[modelName]) MockModel._store[modelName] = [];

      // 🧩 Patch getRelationStrict dynamically (if exists)
      const proto = Object.getPrototypeOf(this);
      if (typeof proto.getRelationStrict === "function" && !proto.__patchedForMock__) {
        const original = proto.getRelationStrict;
        proto.getRelationStrict = function (this: MockModel, name: string) {
          // First, check for mock relations
          if (this._mockRelations[name]) return this._mockRelations[name];
          // Else, fallback to original
          return original.call(this, name);
        };
        proto.__patchedForMock__ = true;
      }
    }

    // -----------------------------
    // 🗂 In-Memory Persistence
    // -----------------------------
    async save(): Promise<this> {
      const modelName = this.constructor.name;
      const store = MockModel._store[modelName];
      const existing = store.find(r => (r as any).id === this.id);
      if (!existing) store.push(this);
      return this;
    }

    async delete(): Promise<boolean> {
      const modelName = this.constructor.name;
      const store = MockModel._store[modelName];
      const idx = store.findIndex(r => (r as any).id === this.id);
      if (idx !== -1) store.splice(idx, 1);
      return true;
    }

    async find(id: number | string): Promise<this | null> {
      const modelName = this.constructor.name;
      const store = MockModel._store[modelName];
      return (store.find(r => (r as any).id === id) as this) ?? null;
    }

    async all(): Promise<this[]> {
      const modelName = this.constructor.name;
      const store = MockModel._store[modelName];
      const records = [...store] as this[];

      const eagerRelations = (this as any).eagerRelations ?? [];
      const eagerLoad = (this as any).eagerLoadRelations;

      if (eagerRelations.length && typeof eagerLoad === "function") {
        await eagerLoad.call(this, records);
      }

      return records;
    }

    static truncate(): void {
      MockModel._store[this.name] = [];
    }

    // -----------------------------
    // 🔗 Relation Helpers
    // -----------------------------
    addMockRelation(name: string, data: unknown[]): void {
      this._mockRelations[name] = {
        name,
        getResults: async () => data,
        match: async (records: this[]) => {
          for (const r of records) (r as Record<string, unknown>)[name] = data;
        },
      };
    }

    mockHasMany(name: string, data: Record<string, unknown>[]): void {
      this.addMockRelation(name, data);
    }

    mockBelongsTo(name: string, related: Record<string, unknown>): void {
      this.addMockRelation(name, [related]);
    }

    mockMorphTo(name: string, related: Record<string, unknown>, morphType: string): void {
      const payload = { ...related, morphType };
      this.addMockRelation(name, [payload]);
    }

    getRelation(name: string): RelationDefinition<this> {
      const rel = this._mockRelations[name];
      if (rel) return rel;
      throw new Error(`Mock relation '${name}' not found on ${this.constructor.name}`);
    }

    async morphTo(_relation: string): Promise<unknown> {
      return { mock: true, type: _relation };
    }
  }

  return MockModel as unknown as TBase & (abstract new (...args: any[]) => MockModel);
}
