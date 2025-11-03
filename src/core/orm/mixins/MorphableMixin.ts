// src/orm/mixins/MorphableMixin.ts
import { MorphRegistry } from "./MorphRegistry";

/**
 * ✅ Base interface for all ORM models
 */
export interface MorphableBaseModel {
  id: number | string;
  [key: string]: unknown;

  // ORM-like methods (to satisfy TypeScript)
  find?(id: number | string): Promise<MorphableBaseModel | null>;
  query?(): ORMQuery<this>;
}

/**
 * ✅ Type for query builders used in ORM
 */
export interface ORMQuery<T> {
  where(field: string, value: unknown): ORMQuery<T>;
  first(): Promise<T | null>;
  get(): Promise<T[]>;
}

/**
 * ✅ Generic constructor type for ORM mixins
 * (Must use `any[]` — required by TypeScript for mixins)
 */
export type Constructor<T = object> = new (...args: any[]) => T;

/**
 * 🧬 MorphableMixin
 * Adds polymorphic relationship helpers:
 * - morphTo()
 * - morphOne()
 * - morphMany()
 */
export function MorphableMixin<TBase extends Constructor<MorphableBaseModel>>(Base: TBase) {
  return class Morphable extends Base {
    // ✅ TS requires this constructor signature
    constructor(...args: any[]) {
      super(...args);
    }

    /** 🌀 morphTo('commentable') */
    async morphTo(this: MorphableBaseModel, relationName: string): Promise<MorphableBaseModel | null> {
      const type = this[`${relationName}_type`] as string | undefined;
      const id = this[`${relationName}_id`] as number | string | undefined;

      if (!type || id === undefined) return null;

      const ModelClass = MorphRegistry.resolve<MorphableBaseModel>(type);
      if (typeof ModelClass.prototype.find !== "function") {
        throw new Error(`Model '${type}' does not implement find().`);
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      return await ModelClass.prototype.find.call(ModelClass, id);
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
  };
}
