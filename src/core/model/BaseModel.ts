// src/model/BaseModel.ts
import { CoreModel } from "./CoreModel.js";
import { PivotHelperMixin } from "../orm/mixins/PivotHelperMixin.js";
import { CastsMixin } from "../orm/mixins/CastsMixin.js";
import { SoftDeletesMixin } from "../orm/mixins/SoftDeletesMixin.js";
import { ScopeMixin } from "../orm/mixins/ScopeMixin.js";
import { HooksMixin } from "../orm/mixins/HooksMixin.js";
import { QueryCacheMixin } from "../orm/mixins/QueryCacheMixin.js";
import { EagerLoadingMixin } from "../orm/mixins/EagerLoadingMixin.js";
import { SerializeMixin } from "../orm/mixins/SerializeMixin.js";
import { getAdapter, getConnection, ConnectionName } from "../connection/ConnectionFactory.js";
import type { DriverAdapter } from "../connection/DriverAdapter.js";
import {
  transaction,
  type TransactionContext,
  type TransactionOptions,
} from "../connection/TransactionManager.js";
import type {
  SafeFinderDirection,
  SafeFinderFilters,
  SafeFinderQuery,
} from "./SafeFinder.js";
import type { Db } from "mongodb";
import { dbConfig } from "../../config/database.js";
import { BelongsTo } from "../orm/relations/BelongsTo.js";
import { HasOne } from "../orm/relations/HasOne.js";
import { HasMany } from "../orm/relations/HasMany.js";
import { BelongsToMany } from "../orm/relations/BelongsToMany.js";
import { MorphOne } from "../orm/relations/MorphOne.js";
import { MorphMany } from "../orm/relations/MorphMany.js";
import { MorphTo } from "../orm/relations/MorphTo.js";
import type { CoreModelClass } from "../orm/Relation.js";
import { BaseModelSafeFinderStaticsMixin } from "./BaseModelSafeFinderStatics.js";

// Morph system (re-export convenience)
import { MorphableMixin, MorphableBaseModel } from "../orm/mixins/MorphableMixin.js";
import { MorphRegistry } from "../orm/mixins/MorphRegistry.js";

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
  useTransaction(context: TransactionContext): this;
  getTransactionContext(): TransactionContext | undefined;
  withTransaction<R>(
    fn: ((context: TransactionContext) => Promise<R>) | (() => Promise<R>),
    options?: TransactionOptions
  ): Promise<R>;

  fill(data: ORMRecord): this;
  save(pk?: string): Promise<void>;
  patch(data: ORMRecord, pk?: string): Promise<void>;
  create(data: ORMRecord): Promise<this | null>;
  update(data: ORMRecord, pk?: string): this;
  update(id: string | number, data: ORMRecord, pk?: string): Promise<void>;
  delete(): Promise<void>;
  delete(id: string | number, pk?: string): Promise<void>;
  find(id: string | number, pk?: string): Promise<this | null>;
  all(): Promise<this[]>;
  where(field: string, value: unknown): SafeFinderQuery<this>;
  with(...relations: string[]): SafeFinderQuery<this>;
  active(...args: unknown[]): SafeFinderQuery<this>;
  inactive(...args: unknown[]): SafeFinderQuery<this>;
  published(...args: unknown[]): SafeFinderQuery<this>;
  orderBy(field: string, direction?: SafeFinderDirection): SafeFinderQuery<this>;
  limit(count: number): SafeFinderQuery<this>;
  get(): Promise<this[]>;
  first(): Promise<this | null>;
  findBy(field: string, value: unknown): SafeFinderQuery<this>;
  findOneBy(field: string, value: unknown): Promise<this | null>;
  findAllBy(filters: SafeFinderFilters): Promise<this[]>;
  existsBy(filters: SafeFinderFilters): Promise<boolean>;
  toObject?: () => Record<string, unknown>;
  toJSON?: () => Record<string, unknown>;
}

export const BASE_MODEL_COMPOSITION_ORDER = [
  "CoreModel",
  "MorphableMixin",
  "PivotHelperMixin",
  "CastsMixin",
  "SoftDeletesMixin",
  "ScopeMixin",
  "HooksMixin",
  "QueryCacheMixin",
  "EagerLoadingMixin",
  "SerializeMixin",
] as const;

export const MODEL_BOUNDARY_MATRIX = {
  CoreModel: [
    "hydration",
    "driver-agnostic CRUD",
    "validation dispatch",
    "lifecycle event dispatch",
    "persistence state tracking",
    "safe-finder construction",
  ],
  BaseModel: [
    "default composed runtime surface",
    "safe-finder static delegation",
    "typed relation helpers",
    "morph alias convenience",
  ],
  SqlModel: ["SQL connection guard", "typed SQL getDB()"],
  MongoModel: ["Mongo connection guard", "typed Mongo getDB()"],
  GeneratedModels: [
    "extendSqlModelOrMongoModel",
    "neverExtendCoreModelDirectly",
    "inheritDefaultBaseModelStack",
  ],
} as const;

/**
 * Compose mixins in dependency-safe order.
 * Keep BASE_MODEL_COMPOSITION_ORDER in sync with this stack.
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

const SafeFinderStaticModel = BaseModelSafeFinderStaticsMixin(ComposedModel);

/**
 * BaseModel
 * The central abstract model class your application models should extend.
 */
export abstract class BaseModel<
  TAttrs extends Record<string, unknown> = Record<string, unknown>
> extends SafeFinderStaticModel {
  constructor(...args: any[]) {
    super(...args);
  }

  /**
   * Instance-level morph alias lookup (like Laravel's getMorphClass)
   */
  getMorphClass(): string {
    const ctor = this.constructor as typeof BaseModel & { morphAlias?: string; name: string };
    if (ctor.morphAlias) return ctor.morphAlias;

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

  public async withTransaction<R>(
    fn: ((context: TransactionContext) => Promise<R>) | (() => Promise<R>),
    options?: TransactionOptions
  ): Promise<R> {
    return await transaction(
      this.connectionName as ConnectionName,
      async (context) => await (fn as (ctx?: TransactionContext) => Promise<R>)(context),
      options
    );
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
    return (await super.getDB()) as DriverAdapter;
  }
}

/**
 * Laravel-style SQL model alias exposed for package consumers.
 */
export { SqlModel as Model };

/**
 * Re-export morph helpers for convenience
 */

export { MorphableMixin, MorphRegistry };
export type { MorphableBaseModel };

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

/**
 * MongoModel
 * Narrowed base class for Mongo-backed models with typed getDB().
 */
export abstract class MongoModel<
  TAttrs extends Record<string, unknown> = Record<string, unknown>
> extends BaseModel<TAttrs> {
  constructor(...args: any[]) {
    super(...args);
    const driver = dbConfig.connections[this.connectionName as ConnectionName]?.driver;
    if (driver !== "mongo") {
      throw new Error(`MongoModel requires a mongo driver connection. Received: ${this.connectionName}`);
    }
  }

  public override async getDB(): Promise<Db> {
    return (await super.getDB()) as Db;
  }
}
