// src/test/utils/MockOrmModel.v3.ts
import { EagerLoadable, RelationDefinition } from "../../core/orm/mixins/EagerLoadingMixin";
import { MorphableBaseModel } from "../../core/orm/mixins/MorphableMixin";

/**
 * MockOrmModel v3
 * - in-memory store with query simulation (.where/.first/.get)
 * - FK inference for mockHasMany
 * - basic transaction support
 * - auto-resolve relations for EagerLoadingMixin
 */

type PlainRecord = Record<string, unknown>;

export function MockOrmModelV3<TBase extends abstract new (...args: any[]) => object>(Base: TBase) {
  abstract class MockModel extends Base implements EagerLoadable, MorphableBaseModel {
    // allow dynamic fields
    [key: string]: unknown;

    // defaults
    id: number | string = 1;
    table = "mock_table";

    // per-class (constructor) in-memory store
    private static _globalStore: Record<string, MockModel[]> = {};

    // per-instance mock relations
    protected _mockRelations: Record<string, RelationDefinition<any>> = {};

    // per-class transaction buffer (only for tests; single tx at a time)
    private static _txBuffer: Record<string, { before: MockModel[]; after: MockModel[] } | null> = {};

    constructor(...args: any[]) {
      super(...(args as any[])); // mixin ctor pattern

      const modelName = (this.constructor as typeof MockModel).name;
      if (!MockModel._globalStore[modelName]) MockModel._globalStore[modelName] = [];

      // ensure tx buffer entry
      if (!(modelName in MockModel._txBuffer)) MockModel._txBuffer[modelName] = null;

      // patch getRelationStrict once per prototype (so EagerLoading can see mock relations)
      const proto = Object.getPrototypeOf(this) as any;
      if (proto && !proto.__mock_relation_patched__) {
        const origGetRelationStrict = proto.getRelationStrict;
        proto.getRelationStrict = function (this: MockModel, name: string) {
          // prefer mock relations
          if (this._mockRelations && this._mockRelations[name]) return this._mockRelations[name];
          // fallback if original exists
          if (typeof origGetRelationStrict === "function") {
            return origGetRelationStrict.call(this, name);
          }
          throw new Error(`Relation '${name}' is not defined on ${this.constructor.name}`);
        };
        proto.__mock_relation_patched__ = true;
      }
    }

    /* -------------------------
     * In-memory DB CRUD + query API
     * ------------------------- */
    async save(): Promise<this> {
      const cls = this.constructor as typeof MockModel;
      const modelName = cls.name;
      const store = MockModel._globalStore[modelName];

      // if inside transaction, write to tx buffer `after`; else write directly
      const tx = MockModel._txBuffer[modelName];
      if (tx) {
        // remove existing with same id in tx.after
        const idx = tx.after.findIndex((r) => (r as any).id === (this as any).id);
        if (idx >= 0) tx.after[idx] = this;
        else tx.after.push(this);
      } else {
        const idx = store.findIndex((r) => (r as any).id === (this as any).id);
        if (idx === -1) store.push(this);
        else store[idx] = this;
      }

      return this;
    }

    async delete(): Promise<boolean> {
      const cls = this.constructor as typeof MockModel;
      const modelName = cls.name;
      const store = MockModel._globalStore[modelName];

      const tx = MockModel._txBuffer[modelName];
      if (tx) {
        tx.after = tx.after.filter((r) => (r as any).id !== (this as any).id);
      } else {
        const idx = store.findIndex((r) => (r as any).id === (this as any).id);
        if (idx !== -1) store.splice(idx, 1);
      }

      return true;
    }

    async find(id: number | string): Promise<this | null> {
      const cls = this.constructor as typeof MockModel;
      const modelName = cls.name;
      const store = MockModel._globalStore[modelName];
      const tx = MockModel._txBuffer[modelName];

      // If tx active, check tx.after first, then fallback
      if (tx) {
        const inAfter = tx.after.find((r) => (r as any).id === id);
        if (inAfter) return (inAfter as this) ?? null;
      }

      const found = store.find((r) => (r as any).id === id) as this | undefined;
      return found ?? null;
    }

    /** generic where(query) -> chainable query object */
    query(): {
      where: (field: string, value: unknown) => ReturnType<MockModel["query"]>;
      first: () => Promise<this | null>;
      get: () => Promise<this[]>;
    } {
      const cls = this.constructor as typeof MockModel;
      const modelName = cls.name;
      const store = MockModel._globalStore[modelName];
      const tx = MockModel._txBuffer[modelName];

      // capture current items snapshot (tx.after should shadow)
      const snapshot = (): MockModel[] => {
        if (tx) {
          // merge tx.after with store, overriding by id
          const merged: Record<string | number, MockModel> = {};
          for (const r of store) merged[(r as any).id] = r;
          for (const r of tx.after) merged[(r as any).id] = r;
          return Object.values(merged);
        }
        return [...store];
      };

      const predicates: Array<(item: MockModel) => boolean> = [];

      const api = {
        where(field: string, value: unknown) {
          predicates.push((item: MockModel) => {
            const v = (item as unknown as PlainRecord)[field];
            return v === value;
          });
          return api;
        },
        async first() {
          const items = snapshot();
          for (const it of items) {
            if (predicates.every((p) => p(it))) return it as this;
          }
          return null;
        },
        async get() {
          const items = snapshot();
          return items.filter((it) => predicates.every((p) => p(it))) as this[];
        },
      };

      return api;
    }

    /** override all() to integrate with eager loader + query */
    async all(): Promise<this[]> {
      const cls = this.constructor as typeof MockModel;
      const modelName = cls.name;

      const items = await this.query().get();

      // If eagerRelations present, call EagerLoadingMixin logic
      const eagerLoad = (this as any).eagerLoadRelations;
      if (Array.isArray((this as any).eagerRelations) && typeof eagerLoad === "function") {
        await eagerLoad.call(this, items as this[]);
      }
      return items as this[];
    }

    static truncate(): void {
      MockModel._globalStore[this.name] = [];
    }

    /* -------------------------
     * Transaction emulation
     * - startTransaction returns a handle object: { commit, rollback }
     * - commit applies buffered `after` to store, rollback discards
     * ------------------------- */
    static startTransaction<T extends typeof MockModel>(this: T) {
      const modelName = this.name;
      const store = MockModel._globalStore[modelName] ?? [];
      // clone current store into 'before'
      const before = store.slice();
      // after starts as clone of before; transactional writes go into after
      const after = before.slice();
      MockModel._txBuffer[modelName] = { before, after };

      return {
        async commit() {
          MockModel._globalStore[modelName] = MockModel._txBuffer[modelName]!.after.slice();
          MockModel._txBuffer[modelName] = null;
        },
        async rollback() {
          // just discard tx buffer
          MockModel._txBuffer[modelName] = null;
        },
      };
    }

    /* -------------------------
     * Relation helpers + FK inference
     * ------------------------- */

    /**
     * addMockRelation: fully custom relation definition (name + data)
     */
    addMockRelation<TParent extends MockModel>(name: string, data: unknown[]) {
      const relation: RelationDefinition<TParent> = {
        name,
        getResults: async () => data as unknown,
        match: async (records: TParent[]) => {
          for (const r of records) {
            (r as unknown as PlainRecord)[name] = data;
          }
        },
      };

      this._mockRelations[name] = relation as RelationDefinition<any>;
    }

    /**
     * mockHasMany - infers foreign key and attaches data
     * e.g. user.mockHasMany('posts', [{id:1}]) -> adds posts and sets post.user_id = user.id
     */
    mockHasMany(name: string, data: PlainRecord[], options?: { foreignKey?: string }) {
      const fk = options?.foreignKey ?? `${this.constructor.name.toLowerCase()}_id`;
      const payload = data.map((d) => ({ ...(d as PlainRecord), [fk]: this.id }));
      this.addMockRelation(name, payload);
    }

    /**
     * mockBelongsTo - sets a single related record
     */
    mockBelongsTo(name: string, related: PlainRecord) {
      this.addMockRelation(name, [related]);
    }

    /**
     * mockMorphTo - store morph payload with inferred type
     */
    mockMorphTo(name: string, related: PlainRecord, morphType?: string) {
      const type = morphType ?? (this.constructor as any).name.toLowerCase();
      this.addMockRelation(name, [{ ...related, [`${name}_type`]: type, [`${name}_id`]: related.id }]);
    }

    getRelation(name: string): RelationDefinition<any> {
      const rel = this._mockRelations[name];
      if (rel) return rel;
      throw new Error(`Relation '${name}' not found on ${this.constructor.name}`);
    }

    // morphTo placeholder (in tests you can override)
    async morphTo(_relation: string): Promise<unknown> {
      // look into relation data for the morph type
      const typeKey = `${_relation}_type`;
      const idKey = `${_relation}_id`;
      const type = (this as unknown as PlainRecord)[typeKey] as string | undefined;
      const id = (this as unknown as PlainRecord)[idKey];
      if (!type || id === undefined) throw new Error(`❌ Morph type data not present on instance`);
      // Try to resolve via global registry (tests usually register models that implement find())
      // Here we simply return a placeholder; tests can mock Post.prototype.find to return actual object
      return { __morph: true, type, id };
    }
  }

  return MockModel as unknown as TBase & (abstract new (...args: unknown[]) => MockModel);
}
