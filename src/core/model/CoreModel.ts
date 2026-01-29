// src/core/connection/CoreModel.ts
import { getConnection, getAdapter, ConnectionName } from "../connection/ConnectionFactory";
import type { DriverAdapter } from "../connection/DriverAdapter";

import { SchemaValidator, SchemaValidatorOptions } from "../schema/SchemaValidator";
import type { SchemaField, ValidationRule } from "../schema/SchemaBlueprint";

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
export abstract class CoreModel {
  protected tableName: string;
  protected connectionName: ConnectionName;

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

  /**
   * Get DB connection (lazy + cached)
   */
  protected async getDB() {
    if (this.connectionName === "mongo") {
      return await getConnection(this.connectionName);
    }
    return await getAdapter(this.connectionName);
  }

  /**
   * Validate incoming data using schema + hooks + custom rules
   */
  private async validateData(data: Record<string, unknown>): Promise<void> {
    const schema = (this.constructor as typeof CoreModel).schema;
    const hooks = (this.constructor as typeof CoreModel).validationHooks;
    const customRules = (this.constructor as typeof CoreModel).customRules;

    if (!schema) return;

    const validationRules: Record<string, ValidationRule> = {};

    for (const [key, field] of Object.entries(schema)) {
      if (field.kind === "column" && field.validate) {
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
  async find(id: number | string, pk: string = "id"): Promise<unknown> {
    const db = await this.getDB();

    switch (this.connectionName) {
      case "sqlite":
      case "mysql":
      case "pg": {
        const adapter = db as DriverAdapter;
        const table = adapter.wrapId(this.tableName);
        const col = adapter.wrapId(pk);
        const sql = `SELECT * FROM ${table} WHERE ${col} = ${adapter.placeholder(1)}`;
        const row = await adapter.queryOne<Record<string, unknown>>(sql, [id]);
        const Model = this.constructor as typeof CoreModel;
        return Model.hydrateRow(row);
      }

      case "mongo":
        {
          const row = await (db as any).collection(this.tableName).findOne({ [pk]: id });
          const Model = this.constructor as typeof CoreModel;
          return Model.hydrateRow(row as Record<string, unknown> | null);
        }

      default:
        throw new Error(`Unsupported driver: ${this.connectionName}`);
    }
  }

  /* -----------------------------------------------------
   * 📋 ALL (fetch all records)
   * ----------------------------------------------------- */
  async all(): Promise<unknown[]> {
    const db = await this.getDB();

    switch (this.connectionName) {
      case "sqlite":
      case "mysql":
      case "pg": {
        const adapter = db as DriverAdapter;
        const table = adapter.wrapId(this.tableName);
        const sql = `SELECT * FROM ${table}`;
        const rows = await adapter.query<Record<string, unknown>>(sql);
        const Model = this.constructor as typeof CoreModel;
        return Model.hydrateMany(rows);
      }

      case "mongo":
        {
          const rows = await (db as any).collection(this.tableName).find({}).toArray();
          const Model = this.constructor as typeof CoreModel;
          return Model.hydrateMany(rows as Record<string, unknown>[]);
        }

      default:
        throw new Error(`Unsupported driver: ${this.connectionName}`);
    }
  }

  /* -----------------------------------------------------
   * ➕ CREATE (insert new record)
   * ----------------------------------------------------- */
  async create(data: Record<string, unknown>): Promise<unknown | null> {
    // 1) Validate (runs validation hooks + custom rules)
    await this.validateData(data);

    // 2) Fire beforeCreate (can cancel by returning false)
    const canCreate = await this.fireEvent("beforeCreate", data);
    if (!canCreate) {
      // canceled by hook
      return null;
    }

    const db = await this.getDB();

    // 3) Execute INSERT per driver, return created record shape
    let createdRecord: Record<string, unknown> | null = null;

    switch (this.connectionName) {
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
        throw new Error(`Unsupported driver: ${this.connectionName}`);
    }

    // 4) Fire afterCreate (no cancellation)
    const Model = this.constructor as typeof CoreModel;
    const hydrated = Model.hydrateRow(createdRecord);

    await this.fireEvent("afterCreate", hydrated as Record<string, unknown> | null);

    return hydrated;
  }

  /* -----------------------------------------------------
   * ✏️ UPDATE (by ID)
   * ----------------------------------------------------- */
  async update(id: number | string, data: Record<string, unknown>, pk: string = "id"): Promise<void> {
    // 1) Validate
    await this.validateData(data);

    // 2) beforeUpdate (can cancel)
    const canUpdate = await this.fireEvent("beforeUpdate", data);
    if (!canUpdate) return;

    const db = await this.getDB();

    // 3) Execute UPDATE
    switch (this.connectionName) {
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
        await (db as any).collection(this.tableName).updateOne({ [pk]: id }, { $set: data });
        break;
      }

      default:
        throw new Error(`Unsupported driver: ${this.connectionName}`);
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

    // 2) Execute delete
    switch (this.connectionName) {
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
        await (db as any).collection(this.tableName).deleteOne({ [pk]: id });
        break;

      default:
        throw new Error(`Unsupported driver: ${this.connectionName}`);
    }

    // 3) afterDelete
    await this.fireEvent("afterDelete", id);
  }
}
