// src/model/BaseModel.ts
import { CoreModel } from "./CoreModel";
import { PivotHelperMixin } from "../orm/mixins/PivotHelperMixin";
import { CastsMixin } from "../orm/mixins/CastsMixin";
import { SoftDeletesMixin } from "../orm/mixins/SoftDeletesMixin";
import { ScopeMixin } from "../orm/mixins/ScopeMixin";
import { HooksMixin } from "../orm/mixins/HooksMixin";
import { QueryCacheMixin } from "../orm/mixins/QueryCacheMixin";
import { EagerLoadingMixin } from "../orm/mixins/EagerLoadingMixin";
import { SerializeMixin } from "../orm/mixins/SerializeMixin";
import { getAdapter, ConnectionName } from "../connection/ConnectionFactory";
import type { DriverAdapter } from "../connection/DriverAdapter";
import { BelongsTo } from "../orm/relations/BelongsTo";
import { HasOne } from "../orm/relations/HasOne";
import { HasMany } from "../orm/relations/HasMany";
import { BelongsToMany } from "../orm/relations/BelongsToMany";
import { MorphOne } from "../orm/relations/MorphOne";
import { MorphMany } from "../orm/relations/MorphMany";
import { MorphTo } from "../orm/relations/MorphTo";
import type { CoreModelClass } from "../orm/Relation";
import type { SafeFinderDirection, SafeFinderFilters, SafeFinderQuery } from "./SafeFinder";

// Morph system (re-export convenience)
import { MorphableMixin, MorphableBaseModel } from "../orm/mixins/MorphableMixin";
import { MorphRegistry } from "../orm/mixins/MorphRegistry";

/**
 * Shared record interface for all models
 */
export interface ORMRecord {
  [key: string]: unknown;
}

/**
 * Unified constructor helper used for casting the seed CoreModel
 */
export type AbstractConstructor<T = object> = abstract new (...args: any[]) => T;

/**
 * ORMCoreContract mirrors CoreModel's public instance API.
 * Note: getDB returns Promise<unknown> to match CoreModel's current signature.
 */
export interface ORMCoreContract {
  tableName: string;
  connectionName: string;
  getDB(): Promise<unknown>;

  fill(data: ORMRecord): this;
  save(pk?: string): Promise<void>;
  patch(data: ORMRecord, pk?: string): Promise<void>;
  create(data: ORMRecord): Promise<unknown | null>;
  update(id: string | number, data: ORMRecord, pk?: string): Promise<void>;
  delete(id: string | number, pk?: string): Promise<void>;
  find(id: string | number, pk?: string): Promise<unknown | null>;
  all(): Promise<unknown[]>;
}

/**
 * Compose mixins in dependency-safe order:
 * CoreModel -> Morphable -> PivotHelper -> Casts -> SoftDeletes -> Scope -> Hooks -> QueryCache -> EagerLoading -> Serialize
 *
 * We cast CoreModel to AbstractConstructor<ORMCoreContract> as the composition seed so
 * TypeScript understands the initial shape we're building on top of.
 */
const MorphableSeed = MorphableMixin(
  CoreModel as unknown as AbstractConstructor<ORMCoreContract>
);

const ComposedModel = SerializeMixin(
  EagerLoadingMixin(
    QueryCacheMixin(
      HooksMixin(
        ScopeMixin(
          SoftDeletesMixin(
            CastsMixin(PivotHelperMixin(MorphableSeed))
          )
        )
      )
    )
  )
);

/**
 * BaseModel
 * The central abstract model class your application models should extend.
 */
export abstract class BaseModel<
  TAttrs extends Record<string, unknown> = Record<string, unknown>
> extends ComposedModel {
  constructor(...args: any[]) {
    super(...args);
  }

  static where<T extends typeof BaseModel>(
    this: T,
    field: string,
    value: unknown
  ): SafeFinderQuery<InstanceType<T>> {
    return (CoreModel.where as any).call(this, field, value);
  }

  static with<T extends typeof BaseModel>(
    this: T,
    ...relations: string[]
  ): SafeFinderQuery<InstanceType<T>> {
    return (CoreModel.with as any).call(this, ...relations);
  }

  static active<T extends typeof BaseModel>(
    this: T,
    ...args: unknown[]
  ): SafeFinderQuery<InstanceType<T>> {
    return (CoreModel.active as any).call(this, ...args);
  }

  static inactive<T extends typeof BaseModel>(
    this: T,
    ...args: unknown[]
  ): SafeFinderQuery<InstanceType<T>> {
    return (CoreModel.inactive as any).call(this, ...args);
  }

  static published<T extends typeof BaseModel>(
    this: T,
    ...args: unknown[]
  ): SafeFinderQuery<InstanceType<T>> {
    return (CoreModel.published as any).call(this, ...args);
  }

  static orderBy<T extends typeof BaseModel>(
    this: T,
    field: string,
    direction: SafeFinderDirection = "asc"
  ): SafeFinderQuery<InstanceType<T>> {
    return (CoreModel.orderBy as any).call(this, field, direction);
  }

  static limit<T extends typeof BaseModel>(
    this: T,
    count: number
  ): SafeFinderQuery<InstanceType<T>> {
    return (CoreModel.limit as any).call(this, count);
  }

  static get<T extends typeof BaseModel>(this: T): Promise<InstanceType<T>[]> {
    return (CoreModel.get as any).call(this);
  }

  static first<T extends typeof BaseModel>(this: T): Promise<InstanceType<T> | null> {
    return (CoreModel.first as any).call(this);
  }

  static findBy<T extends typeof BaseModel>(
    this: T,
    field: string,
    value: unknown
  ): SafeFinderQuery<InstanceType<T>> {
    return (CoreModel.findBy as any).call(this, field, value);
  }

  static findOneBy<T extends typeof BaseModel>(
    this: T,
    field: string,
    value: unknown
  ): Promise<InstanceType<T> | null> {
    return (CoreModel.findOneBy as any).call(this, field, value);
  }

  static findAllBy<T extends typeof BaseModel>(
    this: T,
    filters: SafeFinderFilters
  ): Promise<InstanceType<T>[]> {
    return (CoreModel.findAllBy as any).call(this, filters);
  }

  static existsBy<T extends typeof BaseModel>(
    this: T,
    filters: SafeFinderFilters
  ): Promise<boolean> {
    return (CoreModel.existsBy as any).call(this, filters);
  }

  /**
   * Instance-level morph alias lookup (like Laravel's getMorphClass)
   */
  getMorphClass(): string {
    const entries = Object.entries(MorphRegistry.list());
    const entry = entries.find(([, name]) => name === this.constructor.name);
    return entry ? entry[0] : this.constructor.name;
  }

  /**
   * Static-level morph alias lookup
   * Example: `static morphAlias = 'posts'`
   */
  static getMorphClass(): string {
    const self = this as unknown as { morphAlias?: string; name: string };
    if (self.morphAlias) return self.morphAlias;

    const entries = Object.entries(MorphRegistry.list());
    const entry = entries.find(([, name]) => name === this.name);
    return entry ? entry[0] : this.name;
  }

  // -----------------------------
  // Typed relation helpers
  // -----------------------------
  protected belongsTo<TRelated extends BaseModel>(
    RelatedModel: CoreModelClass<TRelated>,
    foreignKey: string,
    ownerKey: string = "id",
    name?: string
  ): TypedRelation<this, TRelated | null> {
    return new BelongsTo(RelatedModel, foreignKey, ownerKey, name) as unknown as TypedRelation<
      this,
      TRelated | null
    >;
  }

  protected hasOne<TRelated extends BaseModel>(
    RelatedModel: CoreModelClass<TRelated>,
    foreignKey: string,
    localKey: string = "id",
    name?: string
  ): TypedRelation<this, TRelated | null> {
    return new HasOne(RelatedModel, foreignKey, localKey, name) as unknown as TypedRelation<
      this,
      TRelated | null
    >;
  }

  protected hasMany<TRelated extends BaseModel>(
    RelatedModel: CoreModelClass<TRelated>,
    foreignKey: string,
    localKey: string = "id",
    name?: string
  ): TypedRelation<this, TRelated[]> {
    return new HasMany(RelatedModel, foreignKey, localKey, name) as unknown as TypedRelation<
      this,
      TRelated[]
    >;
  }

  protected belongsToMany<TRelated extends BaseModel>(
    RelatedModel: CoreModelClass<TRelated>,
    pivotTable: string,
    foreignPivotKey: string,
    relatedPivotKey: string
  ): TypedRelation<this, TRelated[]> & PivotRelation {
    return new BelongsToMany(
      RelatedModel,
      pivotTable,
      foreignPivotKey,
      relatedPivotKey
    ) as unknown as TypedRelation<this, TRelated[]> & PivotRelation;
  }

  protected morphOne<TRelated extends BaseModel>(
    RelatedModel: CoreModelClass<TRelated>,
    morphName: string
  ): TypedRelation<this, TRelated | null> {
    return new MorphOne(RelatedModel, `${morphName}_type`, `${morphName}_id`) as unknown as TypedRelation<
      this,
      TRelated | null
    >;
  }

  protected morphMany<TRelated extends BaseModel>(
    RelatedModel: CoreModelClass<TRelated>,
    morphName: string
  ): TypedRelation<this, TRelated[]> {
    return new MorphMany(RelatedModel, `${morphName}_type`, `${morphName}_id`) as unknown as TypedRelation<
      this,
      TRelated[]
    >;
  }

  protected morphTo(morphName: string): TypedRelation<this, BaseModel | null> {
    return new MorphTo(`${morphName}_type`, `${morphName}_id`) as unknown as TypedRelation<
      this,
      BaseModel | null
    >;
  }
}

/**
 * SqlModel
 * Narrowed base class for SQL-backed models with typed getDB().
 */
export abstract class SqlModel<
  TAttrs extends Record<string, unknown> = Record<string, unknown>
> extends BaseModel<TAttrs> {
  public override connectionName!: Exclude<ConnectionName, "mongo">;

  constructor(...args: any[]) {
    super(...args);
    if ((this.connectionName as ConnectionName) === "mongo") {
      throw new Error("SqlModel cannot use the mongo connection.");
    }
  }

  public override async getDB(): Promise<DriverAdapter> {
    return await getAdapter(this.connectionName as Exclude<ConnectionName, "mongo">);
  }
}

/**
 * Re-export morph helpers for convenience
 */

export { MorphableMixin, MorphableBaseModel, MorphRegistry };
export { MongoModel } from "./CoreModel";

// Attribute typing for models (ModelInstance adds only typed attrs to avoid merge conflicts).
export type ModelAttrs<TAttrs extends Record<string, unknown>> = {
  [K in keyof TAttrs]: TAttrs[K];
};

export type ModelInstance<TAttrs extends Record<string, unknown>> = ModelAttrs<TAttrs>;

export interface TypedRelation<TParent, TResult> {
  name?: string;
  getResults(parent: TParent): Promise<TResult>;
  match(records: TParent[]): Promise<void>;
}

export interface PivotRelation {
  attach(parentId: unknown, relatedId: unknown): Promise<void>;
  detach(parentId: unknown, relatedId: unknown): Promise<void>;
  sync(parentId: unknown, relatedIds: unknown[]): Promise<void>;
}
