// src/core/connection/CoreModel.ts
import { getConnection, getAdapter, ConnectionName } from "../connection/ConnectionFactory";
import { dbConfig } from "../../config/database";
import type { DriverAdapter } from "../connection/DriverAdapter";
import type { Db } from "mongodb";

import { SchemaValidator, SchemaValidatorOptions } from "../schema/SchemaValidator";
import type { SchemaField, ValidationRule } from "../schema/SchemaBlueprint";
import {
  SafeFinderDirection,
  SafeFinderFilters,
  SafeFinderModelStatic,
  SafeFinderQuery,
} from "./SafeFinder";

/**
 * Types for model contract (kept generic)
 */

export type ModelBaseContract = new (...args: any[]) => {
  create(data: Record<string, unknown>): Promise<unknown | null>;
  update(id: number | string, data: Record<string, unknown>, pk?: string): Promise<void>;
  delete(id: number | string, pk?: string): Promise<void>;
  find(id: number | string, pk?: string): Promise<unknown>;
  all(): Promise<unknown[]>;
};

/**
 * Model lifecycle event hook signatures
 */
export interface ModelEventHooks {
  beforeCreate?: (data: Record<string, unknown>) => Promise<void | boolean> | void | boolean;
  afterCreate?: (created: Record<string, unknown> | null) => Promise<void> | void;
  beforeUpdate?: (data: Record<string, unknown>) => Promise<void | boolean> | void | boolean;
  afterUpdate?: (data: Record<string, unknown>) => Promise<void> | void;
  beforeDelete?: (id: number | string) => Promise<void | boolean> | void | boolean;
  afterDelete?: (id: number | string) => Promise<void> | void;
}

/**
 * 🧱 CoreModel — driver-agnostic CRUD + schema validation + hooks + events
 */
export abstract class CoreModel<
  TAttrs extends Record<string, unknown> = Record<string, unknown>
> {
  public tableName: string;
  public connectionName: ConnectionName;

  /** Optional schema definition (set by subclass) */
  static schema?: Record<string, SchemaField>;

  /** Validation lifecycle hooks (beforeValidate / afterValidate) */
  static validationHooks?: SchemaValidatorOptions["hooks"];

  /** Custom validation rules (async supported) */
  static customRules?: SchemaValidatorOptions["customRules"];

  /** Model lifecycle events (beforeCreate/afterCreate etc.) */
  static modelEvents?: ModelEventHooks;

  constructor(tableName: string, connectionName: ConnectionName = "mysql") {
    this.tableName = tableName;
    this.connectionName = connectionName;
  }

  /**
   * Create a new model instance for hydration.
   * Subclasses may override by defining a no-arg constructor.
   */
  protected static newInstance<T extends typeof CoreModel>(this: T): InstanceType<T> {
    const Ctor = this as unknown as { new (): InstanceType<T> };
    return new Ctor();
  }

  /**
   * Hydrate a single row into a model instance.
   */
  static hydrateRow<T extends typeof CoreModel>(
    this: T,
    row: Record<string, unknown> | null
  ): InstanceType<T> | null {
    if (!row) return null;
    const instance = this.newInstance();
    Object.assign(instance, row);
    return instance;
  }

  /**
   * Hydrate a list of rows into model instances.
   */
  static hydrateMany<T extends typeof CoreModel>(
    this: T,
    rows: Record<string, unknown>[]
  ): InstanceType<T>[] {
    return rows.map((row) => this.hydrateRow(row) as InstanceType<T>);
  }

  protected static safeFinder<T extends typeof CoreModel>(
    this: T
  ): SafeFinderQuery<InstanceType<T>> {
    const instance = this.newInstance();
    return new SafeFinderQuery(
      instance as InstanceType<T>,
      this as unknown as SafeFinderModelStatic<InstanceType<T>>
    );
  }

  static where<T extends typeof CoreModel>(
    this: T,
    field: string,
    value: unknown
  ): SafeFinderQuery<InstanceType<T>> {
    return this.safeFinder().where(field, value);
  }

  static orderBy<T extends typeof CoreModel>(
    this: T,
    field: string,
    direction: SafeFinderDirection = "asc"
  ): SafeFinderQuery<InstanceType<T>> {
    return this.safeFinder().orderBy(field, direction);
  }

  static limit<T extends typeof CoreModel>(
    this: T,
    count: number
  ): SafeFinderQuery<InstanceType<T>> {
    return this.safeFinder().limit(count);
  }

  static with<T extends typeof CoreModel>(
    this: T,
    ...relations: string[]
  ): SafeFinderQuery<InstanceType<T>> {
    return this.safeFinder().with(...relations);
  }

  static active<T extends typeof CoreModel>(
    this: T,
    ...args: unknown[]
  ): SafeFinderQuery<InstanceType<T>> {
    return this.safeFinder().active(...args);
  }

  static get<T extends typeof CoreModel>(this: T): Promise<InstanceType<T>[]> {
    return this.safeFinder().get();
  }

  static first<T extends typeof CoreModel>(this: T): Promise<InstanceType<T> | null> {
    return this.safeFinder().first();
  }

  static findBy<T extends typeof CoreModel>(
    this: T,
    field: string,
    value: unknown
  ): SafeFinderQuery<InstanceType<T>> {
    return this.where(field, value);
  }

  static findOneBy<T extends typeof CoreModel>(
    this: T,
    field: string,
    value: unknown
  ): Promise<InstanceType<T> | null> {
    return this.where(field, value).first();
  }

  static findAllBy<T extends typeof CoreModel>(
    this: T,
    filters: SafeFinderFilters
  ): Promise<InstanceType<T>[]> {
    const finder = this.safeFinder();
    for (const [field, value] of Object.entries(filters)) {
      finder.where(field, value);
    }
    return finder.get();
  }

  static async existsBy<T extends typeof CoreModel>(
    this: T,
    filters: SafeFinderFilters
  ): Promise<boolean> {
    const finder = this.safeFinder();
    for (const [field, value] of Object.entries(filters)) {
      finder.where(field, value);
    }
    return (await finder.first()) !== null;
  }

  /**
   * Get DB connection (lazy + cached)
   */
  public async getDB() {
    if (this.connectionName === "mongo") {
      return await getConnection(this.connectionName);
    }
    return await getAdapter(this.connectionName);
  }

  private getDriverName(): string {
    return dbConfig.connections[this.connectionName]?.driver ?? this.connectionName;
  }

  private shouldSkipModelHooks(): boolean {
    const value = process.env.ELOQUENT_DISABLE_MODEL_HOOKS;
    return value === "1" || value === "true";
  }

  private buildMongoPrimaryFilter(
    pk: string,
    id: number | string
  ): Record<string, unknown> {
    if (pk === "_id") {
      return { _id: id };
    }
    if (pk === "id") {
      return { $or: [{ id }, { _id: id }] };
    }
    return { [pk]: id };
  }

  /**
   * Validate incoming data using schema + hooks + custom rules
   */
  private async validateData(data: Record<string, unknown>): Promise<void> {
    return this.validateDataInternal(data, { partial: false });
  }

  private async validateDataInternal(
    data: Record<string, unknown>,
    options: { partial: boolean }
  ): Promise<void> {
    const schema = (this.constructor as typeof CoreModel).schema;
    const hooks = this.shouldSkipModelHooks()
      ? undefined
      : (this.constructor as typeof CoreModel).validationHooks;
    const customRules = (this.constructor as typeof CoreModel).customRules;

    if (!schema) return;

    const validationRules: Record<string, ValidationRule> = {};

    for (const [key, field] of Object.entries(schema)) {
      if (field.kind === "column" && field.validate) {
        if (options.partial && !Object.prototype.hasOwnProperty.call(data, key)) {
          continue;
        }
        validationRules[key] = field.validate;
      }
    }

    const errors = await SchemaValidator.validateData(data, validationRules, {
      hooks,
      customRules,
    });

    if (errors.length > 0) {
      const formatted = errors.map((e) => `• ${e.field} ${e.message}`).join("\n");
      throw new Error(`Validation failed for ${this.tableName}:\n${formatted}`);
    }
  }

  /**
   * Fire a lifecycle event.
   *
   * We use `unknown` for payload to avoid the `Parameters<>` union issue.
   * Returns `true` to proceed; returns `false` if the handler explicitly canceled (returned false).
   */
  
  private async fireEvent(eventName: keyof ModelEventHooks, payload?: unknown): Promise<boolean> {
    if (this.shouldSkipModelHooks()) return true;
    const handler = (this.constructor as typeof CoreModel).modelEvents?.[eventName];
    if (!handler) return true;

    // Cast handler to a generic async-capable function type that accepts unknown.
    const fn = handler as (arg: unknown) => Promise<unknown> | unknown;
    const result = await fn(payload);

    // If handler returned boolean false, treat as cancellation.
    if (result === false) return false;
    return true;
  }

  /* -----------------------------------------------------
   * 📦 FIND (by ID)
   * ----------------------------------------------------- */
  async find(id: number | string, pk: string = "id"): Promise<this | null> {
    const db = await this.getDB();
    const driver = this.getDriverName();

    switch (driver) {
      case "sqlite":
      case "mysql":
      case "pg": {
        const adapter = db as DriverAdapter;
        const table = adapter.wrapId(this.tableName);
        const col = adapter.wrapId(pk);
        const sql = `SELECT * FROM ${table} WHERE ${col} = ${adapter.placeholder(1)}`;
        const row = await adapter.queryOne<Record<string, unknown>>(sql, [id]);
        const Model = this.constructor as typeof CoreModel;
        return Model.hydrateRow(row) as this | null;
      }

      case "mongo":
        {
          const row = await (db as any)
            .collection(this.tableName)
            .findOne(this.buildMongoPrimaryFilter(pk, id));
          const Model = this.constructor as typeof CoreModel;
          return Model.hydrateRow(row as Record<string, unknown> | null) as this | null;
        }

      default:
        throw new Error(`Unsupported driver: ${driver}`);
    }
  }

  /* -----------------------------------------------------
   * 📋 ALL (fetch all records)
   * ----------------------------------------------------- */
  async all(): Promise<this[]> {
    const db = await this.getDB();
    const driver = this.getDriverName();

    switch (driver) {
      case "sqlite":
      case "mysql":
      case "pg": {
        const adapter = db as DriverAdapter;
        const table = adapter.wrapId(this.tableName);
        const sql = `SELECT * FROM ${table}`;
        const rows = await adapter.query<Record<string, unknown>>(sql);
        const Model = this.constructor as typeof CoreModel;
        return Model.hydrateMany(rows) as this[];
      }

      case "mongo":
        {
          const rows = await (db as any).collection(this.tableName).find({}).toArray();
          const Model = this.constructor as typeof CoreModel;
          return Model.hydrateMany(rows as Record<string, unknown>[]) as this[];
        }

      default:
        throw new Error(`Unsupported driver: ${driver}`);
    }
  }

  /* -----------------------------------------------------
   * ➕ CREATE (insert new record)
   * ----------------------------------------------------- */
  async create(data: Record<string, unknown>): Promise<this | null> {
    // 1) Validate (runs validation hooks + custom rules)
    await this.validateData(data);

    // 2) Fire beforeCreate (can cancel by returning false)
    const canCreate = await this.fireEvent("beforeCreate", data);
    if (!canCreate) {
      // canceled by hook
      return null;
    }

    const db = await this.getDB();
    const driver = this.getDriverName();

    // 3) Execute INSERT per driver, return created record shape
    let createdRecord: Record<string, unknown> | null = null;

    switch (driver) {
      case "sqlite":
      case "mysql":
      case "pg": {
        const adapter = db as DriverAdapter;
        const keys = Object.keys(data);
        if (keys.length === 0) throw new Error("Cannot create a record with empty data.");

        const values = keys.map((key) => data[key]);
        const table = adapter.wrapId(this.tableName);
        const columns = keys.map((key) => adapter.wrapId(key)).join(", ");
        const sql = `INSERT INTO ${table} (${columns}) VALUES (${adapter.placeholders(
          keys.length
        )})`;
        const result = await adapter.insert(sql, values);
        const base = result.row ? { ...result.row } : { ...data };
        if (result.id !== undefined && (base as any).id === undefined) {
          (base as Record<string, unknown>).id = result.id;
        }
        createdRecord = base;
        break;
      }

      case "mongo": {
        const result = await (db as any).collection(this.tableName).insertOne(data);
        createdRecord = { id: result.insertedId, ...data };
        break;
      }

      default:
        throw new Error(`Unsupported driver: ${driver}`);
    }

    // 4) Fire afterCreate (no cancellation)
    const Model = this.constructor as typeof CoreModel;
    const hydrated = Model.hydrateRow(createdRecord) as this | null;

    await this.fireEvent("afterCreate", hydrated as Record<string, unknown> | null);

    return hydrated;
  }

  /* -----------------------------------------------------
   * ✏️ UPDATE (by ID)
   * ----------------------------------------------------- */
  async update(
    id: number | string,
    data: Record<string, unknown>,
    pk: string = "id"
  ): Promise<void> {
    // 1) Validate
    await this.validateDataInternal(data, { partial: true });

    // 2) beforeUpdate (can cancel)
    const canUpdate = await this.fireEvent("beforeUpdate", data);
    if (!canUpdate) return;

    const db = await this.getDB();
    const driver = this.getDriverName();

    // 3) Execute UPDATE
    switch (driver) {
      case "sqlite":
      case "mysql":
      case "pg": {
        const adapter = db as DriverAdapter;
        const keys = Object.keys(data);
        if (keys.length === 0) return;

        const setClause = keys
          .map((key, idx) => `${adapter.wrapId(key)} = ${adapter.placeholder(idx + 1)}`)
          .join(", ");
        const table = adapter.wrapId(this.tableName);
        const pkCol = adapter.wrapId(pk);
        const sql = `UPDATE ${table} SET ${setClause} WHERE ${pkCol} = ${adapter.placeholder(
          keys.length + 1
        )}`;
        const values = keys.map((key) => data[key]);
        await adapter.execute(sql, [...values, id]);
        break;
      }

      case "mongo": {
        await (db as any)
          .collection(this.tableName)
          .updateOne(this.buildMongoPrimaryFilter(pk, id), { $set: data });
        break;
      }

      default:
        throw new Error(`Unsupported driver: ${driver}`);
    }

    // 4) afterUpdate
    await this.fireEvent("afterUpdate", data);
  }

  /* -----------------------------------------------------
   * ❌ DELETE (by ID)
   * ----------------------------------------------------- */
  async delete(id: number | string, pk: string = "id"): Promise<void> {
    // 1) beforeDelete (can cancel)
    const canDelete = await this.fireEvent("beforeDelete", id);
    if (!canDelete) return;

    const db = await this.getDB();
    const driver = this.getDriverName();

    // 2) Execute delete
    switch (driver) {
      case "sqlite":
      case "mysql":
      case "pg": {
        const adapter = db as DriverAdapter;
        const table = adapter.wrapId(this.tableName);
        const pkCol = adapter.wrapId(pk);
        const sql = `DELETE FROM ${table} WHERE ${pkCol} = ${adapter.placeholder(1)}`;
        await adapter.execute(sql, [id]);
        break;
      }

      case "mongo":
        await (db as any)
          .collection(this.tableName)
          .deleteOne(this.buildMongoPrimaryFilter(pk, id));
        break;

      default:
        throw new Error(`Unsupported driver: ${driver}`);
    }

    // 3) afterDelete
    await this.fireEvent("afterDelete", id);
  }
}

/**
 * MongoModel
 * Narrowed base class for Mongo-backed models with typed getDB().
 */
export abstract class MongoModel<
  TAttrs extends Record<string, unknown> = Record<string, unknown>
> extends CoreModel<TAttrs> {
  constructor(tableName: string, connectionName: ConnectionName = "mongo") {
    super(tableName, connectionName);
    const driver = dbConfig.connections[this.connectionName]?.driver ?? this.connectionName;
    if (driver !== "mongo") {
      throw new Error(
        `MongoModel requires a mongo driver connection. Received: ${this.connectionName}`
      );
    }
  }

  public override async getDB(): Promise<Db> {
    return (await getConnection(this.connectionName)) as Db;
  }
}
