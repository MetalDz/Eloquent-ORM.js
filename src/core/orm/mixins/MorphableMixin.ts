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

type QueryCapableModel<T> = {
  name?: string;
  query?: () => ORMQuery<T>;
  where?: (field: string, value: unknown) => ORMQuery<T>;
  first?: () => Promise<T | null>;
  get?: () => Promise<T[]>;
};

function resolveQueryable<T>(RelatedModel: QueryCapableModel<T>): ORMQuery<T> {
  if (typeof RelatedModel.query === "function") {
    return RelatedModel.query();
  }

  if (typeof RelatedModel.where === "function") {
    let current: ORMQuery<T> | null = null;

    return {
      where(field: string, value: unknown): ORMQuery<T> {
        current = current ? current.where(field, value) : RelatedModel.where!(field, value);
        return this;
      },
      async first(): Promise<T | null> {
        if (current) return current.first();
        if (typeof RelatedModel.first === "function") return RelatedModel.first();
        throw new Error(
          `❌ Model '${RelatedModel.name || "AnonymousModel"}' does not implement first().`
        );
      },
      async get(): Promise<T[]> {
        if (current) return current.get();
        if (typeof RelatedModel.get === "function") return RelatedModel.get();
        throw new Error(
          `❌ Model '${RelatedModel.name || "AnonymousModel"}' does not implement get().`
        );
      },
    };
  }

  throw new Error(
    `❌ Model '${RelatedModel.name || "AnonymousModel"}' does not implement query()/where().`
  );
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
      RelatedModel: QueryCapableModel<T>,
      relationName: string
    ): Promise<T | null> {
      assertSafeRelationName(relationName);
      const self = this as { getMorphClass?: () => string; constructor: { name: string } };
      const modelName =
        typeof self.getMorphClass === "function"
          ? self.getMorphClass()
          : this.constructor.name;
      const modelId = (this as Record<string, unknown>).id as string | number | undefined;

      return await resolveQueryable(RelatedModel)
        .where(`${relationName}_type`, modelName)
        .where(`${relationName}_id`, modelId)
        .first();
    }

    /** 🌌 morphMany(RelatedModel, 'commentable') */
    async morphMany<T extends MorphableBaseModel>(
      this: MorphableBaseModel,
      RelatedModel: QueryCapableModel<T>,
      relationName: string
    ): Promise<T[]> {
      assertSafeRelationName(relationName);
      const self = this as { getMorphClass?: () => string; constructor: { name: string } };
      const modelName =
        typeof self.getMorphClass === "function"
          ? self.getMorphClass()
          : this.constructor.name;
      const modelId = (this as Record<string, unknown>).id as string | number | undefined;

      return await resolveQueryable(RelatedModel)
        .where(`${relationName}_type`, modelName)
        .where(`${relationName}_id`, modelId)
        .get();
    }
  }

  return Morphable as unknown as Constructor<MorphableBaseModel> & TBase;
}
