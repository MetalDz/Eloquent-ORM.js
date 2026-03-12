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
  fill(data: Record<string, unknown>): unknown;
  save(pk?: string): Promise<void>;
  patch(data: Record<string, unknown>, pk?: string): Promise<void>;
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
  protected _exists = false;
  protected _originalAttributes: Record<string, unknown> = {};

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
    (instance as unknown as CoreModel).syncPersistedState(row);
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

  static inactive<T extends typeof CoreModel>(
    this: T,
    ...args: unknown[]
  ): SafeFinderQuery<InstanceType<T>> {
    return this.safeFinder().inactive(...args);
  }

  static published<T extends typeof CoreModel>(
    this: T,
    ...args: unknown[]
  ): SafeFinderQuery<InstanceType<T>> {
    return this.safeFinder().published(...args);
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

  private getPersistenceSchema(): Record<string, SchemaField> {
    const schema = (this.constructor as typeof CoreModel).schema;
    if (!schema) {
      throw new Error(
        `${this.constructor.name} must define a schema to use fill(), save(), or patch().`
      );
    }
    return schema;
  }

  private getColumnFieldNames(): string[] {
    const schema = this.getPersistenceSchema();
    return Object.entries(schema)
      .filter(([, field]) => field.kind === "column")
      .map(([fieldName]) => fieldName);
  }

  private resolvePrimaryKey(): string {
    const schema = (this.constructor as typeof CoreModel).schema;
    if (schema) {
      for (const [fieldName, field] of Object.entries(schema)) {
        if (field.kind === "column" && field.options.primary) {
          return fieldName;
        }
      }
      if (schema._id?.kind === "column") return "_id";
      if (schema.id?.kind === "column") return "id";
    }

    return "id";
  }

  private getPrimaryKeyValue(pk: string): unknown {
    const record = this as Record<string, unknown>;
    if (pk === "_id") {
      return record._id ?? record.id;
    }
    if (pk === "id") {
      return record.id ?? record._id;
    }
    return record[pk];
  }

  private getOriginalPrimaryKeyValue(pk: string): unknown {
    if (Object.prototype.hasOwnProperty.call(this._originalAttributes, pk)) {
      return this._originalAttributes[pk];
    }
    if (pk === "_id" && Object.prototype.hasOwnProperty.call(this._originalAttributes, "id")) {
      return this._originalAttributes.id;
    }
    if (pk === "id" && Object.prototype.hasOwnProperty.call(this._originalAttributes, "_id")) {
      return this._originalAttributes._id;
    }
    return undefined;
  }

  private createSnapshot(source?: Record<string, unknown>): Record<string, unknown> {
    const snapshotSource =
      source ?? (Object.assign({}, this) as Record<string, unknown>);
    const schema = (this.constructor as typeof CoreModel).schema;

    if (!schema) {
      return Object.fromEntries(
        Object.entries(snapshotSource).filter(([field]) => !field.startsWith("_"))
      );
    }

    const snapshot: Record<string, unknown> = {};
    for (const [fieldName, field] of Object.entries(schema)) {
      if (field.kind !== "column") continue;
      if (Object.prototype.hasOwnProperty.call(snapshotSource, fieldName)) {
        snapshot[fieldName] = snapshotSource[fieldName];
      }
    }

    const primaryKey = this.resolvePrimaryKey();
    if (!Object.prototype.hasOwnProperty.call(snapshot, primaryKey)) {
      const record = snapshotSource as Record<string, unknown>;
      if (primaryKey === "_id" && record.id !== undefined) {
        snapshot._id = record.id;
      } else if (primaryKey === "id" && record._id !== undefined) {
        snapshot.id = record._id;
      }
    }

    return snapshot;
  }

  private syncPersistedState(source?: Record<string, unknown>): void {
    this._exists = true;
    this._originalAttributes = this.createSnapshot(source);
  }

  private assertAssignableField(field: string, usage: "fill" | "patch"): void {
    const schema = this.getPersistenceSchema();
    const definition = schema[field];

    if (!definition || definition.kind !== "column") {
      throw new Error(`Unknown ${usage} field '${field}' on ${this.constructor.name}.`);
    }
  }

  private sanitizeAssignableData(
    data: Record<string, unknown>,
    usage: "fill" | "patch"
  ): Record<string, unknown> {
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      throw new Error(`${usage}() expects a plain object payload.`);
    }

    const sanitized: Record<string, unknown> = {};
    for (const [field, value] of Object.entries(data)) {
      this.assertAssignableField(field, usage);
      sanitized[field] = value;
    }

    return sanitized;
  }

  private extractPersistableAttributes(): Record<string, unknown> {
    const record = this as Record<string, unknown>;
    const attributes: Record<string, unknown> = {};

    for (const fieldName of this.getColumnFieldNames()) {
      if (Object.prototype.hasOwnProperty.call(record, fieldName)) {
        attributes[fieldName] = record[fieldName];
      }
    }

    return attributes;
  }

  private assertPrimaryKeyNotMutated(primaryKey: string): void {
    if (!this._exists) return;

    const currentPrimaryKey = this.getPrimaryKeyValue(primaryKey);
    const originalPrimaryKey = this.getOriginalPrimaryKeyValue(primaryKey);

    if (!Object.is(currentPrimaryKey, originalPrimaryKey)) {
      throw new Error(
        `Cannot change persisted primary key '${primaryKey}' on ${this.constructor.name}.`
      );
    }
  }

  private getDirtyAttributes(primaryKey: string): Record<string, unknown> {
    const currentAttributes = this.extractPersistableAttributes();
    const dirtyAttributes: Record<string, unknown> = {};

    for (const [field, value] of Object.entries(currentAttributes)) {
      if (field === primaryKey) continue;
      if (!Object.is(this._originalAttributes[field], value)) {
        dirtyAttributes[field] = value;
      }
    }

    return dirtyAttributes;
  }

  fill(data: Record<string, unknown>): this {
    const assignable = this.sanitizeAssignableData(data, "fill");
    Object.assign(this as Record<string, unknown>, assignable);
    return this;
  }

  async save(pk?: string): Promise<void> {
    const primaryKey = pk ?? this.resolvePrimaryKey();
    const persistedPrimaryKey = this.getOriginalPrimaryKeyValue(primaryKey);

    if (!this._exists) {
      const created = await this.create(this.extractPersistableAttributes());
      if (!created) return;

      Object.assign(
        this as Record<string, unknown>,
        created as unknown as Record<string, unknown>
      );
      this.syncPersistedState();
      return;
    }

    this.assertPrimaryKeyNotMutated(primaryKey);

    if (persistedPrimaryKey === undefined || persistedPrimaryKey === null) {
      throw new Error(
        `Cannot save persisted ${this.constructor.name} without primary key '${primaryKey}'.`
      );
    }

    const dirtyAttributes = this.getDirtyAttributes(primaryKey);
    if (Object.keys(dirtyAttributes).length === 0) return;

    await this.update(persistedPrimaryKey as string | number, dirtyAttributes, primaryKey);
    this.syncPersistedState();
  }

  async patch(data: Record<string, unknown>, pk?: string): Promise<void> {
    if (!this._exists) {
      throw new Error(`patch() requires a persisted model instance for ${this.constructor.name}.`);
    }

    const primaryKey = pk ?? this.resolvePrimaryKey();
    this.assertPrimaryKeyNotMutated(primaryKey);

    const assignable = this.sanitizeAssignableData(data, "patch");
    const originalPrimaryKey = this.getOriginalPrimaryKeyValue(primaryKey);

    if (originalPrimaryKey === undefined || originalPrimaryKey === null) {
      throw new Error(
        `Cannot patch persisted ${this.constructor.name} without primary key '${primaryKey}'.`
      );
    }

    if (
      Object.prototype.hasOwnProperty.call(assignable, primaryKey) &&
      !Object.is(assignable[primaryKey], originalPrimaryKey)
    ) {
      throw new Error(
        `Cannot change persisted primary key '${primaryKey}' on ${this.constructor.name}.`
      );
    }

    const patchPayload: Record<string, unknown> = {};
    for (const [field, value] of Object.entries(assignable)) {
      if (field === primaryKey) continue;
      if (!Object.is(this._originalAttributes[field], value)) {
        patchPayload[field] = value;
      }
    }

    if (Object.keys(patchPayload).length === 0) return;

    await this.update(originalPrimaryKey as string | number, patchPayload, primaryKey);
    Object.assign(this as Record<string, unknown>, patchPayload);
    this.syncPersistedState();
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
