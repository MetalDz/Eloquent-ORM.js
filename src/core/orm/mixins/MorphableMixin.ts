// src/orm/mixins/MorphableMixin.ts
import { MorphRegistry, type MorphableConstructor } from "./MorphRegistry";

function assertSafeRelationName(relationName: string): void {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(relationName)) {
    throw new Error(`Unsafe relation name: ${relationName}`);
  }
}

/**
 * ✅ Base interface for all morphable ORM models
 */
export interface MorphableBaseModel {
  find?(id: number | string): Promise<MorphableBaseModel | null>;
  query?(): ORMQuery<this>;
}

/**
 * ✅ Type for ORM-like query builders
 */
export interface ORMQuery<T> {
  where(field: string, value: unknown): ORMQuery<T>;
  first(): Promise<T | null>;
  get(): Promise<T[]>;
}

/** Generic constructor helper for mixins */
type Constructor<T = object> = abstract new (...args: any[]) => T;

/**
 * 🧬 MorphableMixin
 * Adds polymorphic relationship helpers:
 * - morphTo()
 * - morphOne()
 * - morphMany()
 *
 * 🪄 Auto-registers every extended model into MorphRegistry.
 */
export function MorphableMixin<TBase extends Constructor>(Base: TBase) {
  abstract class Morphable extends Base {
    constructor(...args: any[]) {
      super(...args);

      // 🪄 Auto-register this class in MorphRegistry (once per subclass)
      const ctor = this.constructor as typeof Morphable & { morphAlias?: string; name: string };
      const alias = ctor.morphAlias || ctor.name;
      if (!MorphRegistry.has(alias)) {
        MorphRegistry.register(alias, ctor as unknown as MorphableConstructor<MorphableBaseModel>);
      }
    }

    /** 🌀 morphTo('commentable') */
    async morphTo(this: MorphableBaseModel, relationName: string): Promise<MorphableBaseModel | null> {
      assertSafeRelationName(relationName);
      const record = this as Record<string, unknown>;
      const type = record[`${relationName}_type`] as string | undefined;
      const id = record[`${relationName}_id`] as number | string | undefined;

      if (!type || id === undefined) return null;

      const ModelClass = MorphRegistry.resolve<MorphableBaseModel>(type);
      if (typeof ModelClass.prototype.find !== "function") {
        throw new Error(`❌ Model '${type}' does not implement find().`);
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      const findFn = ModelClass.prototype.find as unknown as (id: number | string) => Promise<MorphableBaseModel | null>;
      return await findFn.call(new ModelClass(), id);
    }

    /** 💫 morphOne(RelatedModel, 'commentable') */
    async morphOne<T extends MorphableBaseModel>(
      this: MorphableBaseModel,
      RelatedModel: { query(): ORMQuery<T> },
      relationName: string
    ): Promise<T | null> {
      assertSafeRelationName(relationName);
      const self = this as { getMorphClass?: () => string; constructor: { name: string } };
      const modelName =
        typeof self.getMorphClass === "function"
          ? self.getMorphClass()
          : this.constructor.name;
      const modelId = (this as Record<string, unknown>).id as string | number | undefined;

      return await RelatedModel.query()
        .where(`${relationName}_type`, modelName)
        .where(`${relationName}_id`, modelId)
        .first();
    }

    /** 🌌 morphMany(RelatedModel, 'commentable') */
    async morphMany<T extends MorphableBaseModel>(
      this: MorphableBaseModel,
      RelatedModel: { query(): ORMQuery<T> },
      relationName: string
    ): Promise<T[]> {
      assertSafeRelationName(relationName);
      const self = this as { getMorphClass?: () => string; constructor: { name: string } };
      const modelName =
        typeof self.getMorphClass === "function"
          ? self.getMorphClass()
          : this.constructor.name;
      const modelId = (this as Record<string, unknown>).id as string | number | undefined;

      return await RelatedModel.query()
        .where(`${relationName}_type`, modelName)
        .where(`${relationName}_id`, modelId)
        .get();
    }
  }

  return Morphable as unknown as Constructor<MorphableBaseModel> & TBase;
}
