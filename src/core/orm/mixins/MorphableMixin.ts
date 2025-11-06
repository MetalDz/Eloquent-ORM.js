// src/orm/mixins/MorphableMixin.ts
import { MorphRegistry } from "./MorphRegistry";

/**
 * ✅ Base interface for all morphable ORM models
 */
export interface MorphableBaseModel {
  id?: string | number;
  [key: string]: unknown;

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
  abstract class Morphable extends Base implements MorphableBaseModel {
    id?: string | number;
    [key: string]: unknown;

    constructor(...args: any[]) {
      super(...args);

      // 🪄 Auto-register this class in MorphRegistry (once per subclass)
      const ctor = this.constructor as typeof Morphable & { morphAlias?: string; name: string };
      const alias = ctor.morphAlias || ctor.name;
      if (!MorphRegistry.has(alias)) {
        MorphRegistry.register(alias, ctor as any);
      }
    }

    /** 🌀 morphTo('commentable') */
    async morphTo(this: MorphableBaseModel, relationName: string): Promise<MorphableBaseModel | null> {
      const type = this[`${relationName}_type`] as string | undefined;
      const id = this[`${relationName}_id`] as number | string | undefined;

      if (!type || id === undefined) return null;

      const ModelClass = MorphRegistry.resolve<MorphableBaseModel>(type);
      if (typeof ModelClass.prototype.find !== "function") {
        throw new Error(`❌ Model '${type}' does not implement find().`);
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      return await (ModelClass.prototype.find as any).call(new ModelClass(), id);
    }

    /** 💫 morphOne(RelatedModel, 'commentable') */
    async morphOne<T extends MorphableBaseModel>(
      this: MorphableBaseModel,
      RelatedModel: { query(): ORMQuery<T> },
      relationName: string
    ): Promise<T | null> {
      const modelName = this.constructor.name;
      const modelId = this.id;

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
      const modelName = this.constructor.name;
      const modelId = this.id;

      return await RelatedModel.query()
        .where(`${relationName}_type`, modelName)
        .where(`${relationName}_id`, modelId)
        .get();
    }
  }

  return Morphable as unknown as Constructor<MorphableBaseModel> & TBase;
}
