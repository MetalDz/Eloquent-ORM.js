import { EagerLoadable, RelationDefinition } from "../../core/orm/mixins/EagerLoadingMixin";
import { MorphableBaseModel } from "../../core/orm/mixins/MorphableMixin";

type PlainRecord = Record<string, unknown>;

export function MockOrmModelV3<TBase extends abstract new (...args: any[]) => object>(Base: TBase) {
  abstract class MockModel extends Base implements EagerLoadable, MorphableBaseModel {
    [key: string]: unknown;

    id: number | string = 1;
    table = "mock_table";
    protected _mockRelations: Record<string, RelationDefinition<any>> = {};

    private static _globalStore: Record<string, MockModel[]> = {};
    private static _txBuffer: Record<string, { before: MockModel[]; after: MockModel[] } | null> = {};

    constructor(...args: any[]) {
      super(...(args as any[]));

      const name = (this.constructor as typeof MockModel).name;
      if (!MockModel._globalStore[name]) MockModel._globalStore[name] = [];
      if (!(name in MockModel._txBuffer)) MockModel._txBuffer[name] = null;

      // ensure getRelationStrict patch
      const proto = Object.getPrototypeOf(this);
      if (proto && !proto.__patchedRelations__) {
        const original = proto.getRelationStrict;
        proto.getRelationStrict = function (this: MockModel, rel: string) {
          if (this._mockRelations?.[rel]) return this._mockRelations[rel];
          if (typeof original === "function") return original.call(this, rel);
          throw new Error(`Relation '${rel}' not found on ${this.constructor.name}`);
        };
        proto.__patchedRelations__ = true;
      }
    }

    /* --------------------
     * DB CRUD & query API
     * -------------------- */
    async save(): Promise<this> {
      const cls = this.constructor as typeof MockModel;
      const store = MockModel._globalStore[cls.name];
      const tx = MockModel._txBuffer[cls.name];
      const target = tx ? tx.after : store;

      const idx = target.findIndex((r) => (r as any).id === this.id);
      if (idx >= 0) target[idx] = this;
      else target.push(this);
      return this;
    }

    async delete(): Promise<boolean> {
      const cls = this.constructor as typeof MockModel;
      const store = MockModel._globalStore[cls.name];
      const tx = MockModel._txBuffer[cls.name];
      const target = tx ? tx.after : store;
      const idx = target.findIndex((r) => (r as any).id === this.id);
      if (idx !== -1) target.splice(idx, 1);
      return true;
    }

    async find(id: number | string): Promise<this | null> {
      const cls = this.constructor as typeof MockModel;
      const store = MockModel._globalStore[cls.name];
      const tx = MockModel._txBuffer[cls.name];
      const target = tx ? tx.after : store;
      return (target.find((r) => (r as any).id === id) as this) ?? null;
    }

    query() {
      const cls = this.constructor as typeof MockModel;
      const store = MockModel._globalStore[cls.name];
      const tx = MockModel._txBuffer[cls.name];
      const base = tx ? tx.after : store;
      const filters: ((r: MockModel) => boolean)[] = [];
      return {
        where: (field: string, value: unknown) => {
          filters.push((r) => (r as any)[field] === value);
          return this.query();
        },
        first: async () => base.find((r) => filters.every((f) => f(r))) as this | null,
        get: async () => base.filter((r) => filters.every((f) => f(r))) as this[],
      };
    }

    async all(): Promise<this[]> {
      const cls = this.constructor as typeof MockModel;
      const items = MockModel._globalStore[cls.name];
      const eager = (this as any).eagerLoadRelations;
      if (Array.isArray((this as any).eagerRelations) && typeof eager === "function")
        await eager.call(this, items);
      return items;
    }

    static truncate() {
      MockModel._globalStore[this.name] = [];
    }

    static startTransaction() {
      const name = this.name;
      const store = MockModel._globalStore[name] ?? [];
      MockModel._txBuffer[name] = { before: [...store], after: [...store] };
      return {
        commit() {
          MockModel._globalStore[name] = MockModel._txBuffer[name]!.after;
          MockModel._txBuffer[name] = null;
        },
        rollback() {
          MockModel._txBuffer[name] = null;
        },
      };
    }

    /* --------------------
     * Relation helpers
     * -------------------- */
    addMockRelation(name: string, data: unknown[], single = false) {
      const rel: RelationDefinition<this> = {
        name,
        async getResults() {
          return data;
        },
        async match(records) {
          for (const rec of records) {
            (rec as any)[name] = single ? data[0] : data;
          }
        },
      };
      this._mockRelations[name] = rel;
    }

    mockHasMany(name: string, data: PlainRecord[], options?: { foreignKey?: string }) {
      const fk = options?.foreignKey ?? `${this.constructor.name.toLowerCase()}_id`;
      const payload = data.map((d) => ({ ...d, [fk]: this.id }));
      this.addMockRelation(name, payload);
    }

    mockHasOne(name: string, data: PlainRecord[]) {
      const record = { ...data[0], [`${this.constructor.name.toLowerCase()}_id`]: this.id };
      this.addMockRelation(name, [record], true);
    }

    mockBelongsTo(name: string, related: PlainRecord) {
      this.addMockRelation(name, [related], true);
    }

    mockMorphTo(name: string, related: PlainRecord, morphType?: string) {
      const type = morphType ?? (this.constructor as any).name.toLowerCase();
      const payload = [{ ...related, [`${name}_type`]: type, [`${name}_id`]: related.id }];
      this.addMockRelation(name, payload, true);
    }

    getRelation(name: string): RelationDefinition<any> {
      const rel = this._mockRelations[name];
      if (!rel) throw new Error(`Relation '${name}' not found`);
      return rel;
    }

    async morphTo(relation: string): Promise<unknown> {
      const type = (this as any)[`${relation}_type`];
      const id = (this as any)[`${relation}_id`];
      if (!type) throw new Error(`Missing morph type`);
      return { type, id };
    }
  }

  return MockModel as unknown as TBase & (abstract new (...args: unknown[]) => MockModel);
}
