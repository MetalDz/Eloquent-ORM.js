// src/core/connection/CoreModel.ts
import { getConnection, getAdapter, ConnectionName } from "../connection/ConnectionFactory.js";
import { dbConfig } from "../../config/database.js";
import type { DriverAdapter } from "../connection/DriverAdapter.js";
import type { Db } from "mongodb";

import type { SchemaValidatorOptions } from "../schema/SchemaValidator.js";
import type {
  ModelDatabaseDefinition,
  SchemaField,
} from "../schema/SchemaBlueprint.js";
import {
  SafeFinderDirection,
  SafeFinderFilters,
  SafeFinderModelStatic,
  SafeFinderQuery,
} from "./SafeFinder.js";
import {
  assertPrimaryKeyNotMutated,
  buildMongoPrimaryFilter,
  createPersistedSnapshot,
  extractPersistableAttributes,
  getColumnFieldNames,
  getDirtyAttributes,
  getOriginalPrimaryKeyValue,
  getPersistenceSchema,
  getPrimaryKeyValue,
  resolvePrimaryKey,
  sanitizeAssignableData,
} from "./CoreModelPersistenceState.js";
import {
  fireModelEvent,
  shouldSkipModelHooks,
  validateModelData,
} from "./CoreModelValidationEvents.js";
import { applySafeFinderFilters, createSafeFinderQuery } from "./CoreModelSafeFinderSupport.js";
import type { TransactionContext } from "../connection/TransactionManager.js";

/**
 * Types for model contract (kept generic)
 */

export type ModelBaseContract = new (...args: any[]) => {
  useTransaction(context: TransactionContext): unknown;
  create(data: Record<string, unknown>): Promise<unknown | null>;
  update(data: Record<string, unknown>, pk?: string): unknown;
  update(id: number | string, data: Record<string, unknown>, pk?: string): Promise<void>;
  delete(): Promise<void>;
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
 * CoreModel - driver-agnostic CRUD + schema validation + hooks + events
 */
export abstract class CoreModel<
  TAttrs extends Record<string, unknown> = Record<string, unknown>
> {
  public tableName: string;
  public connectionName: ConnectionName;
  protected _exists = false;
  protected _originalAttributes: Record<string, unknown> = {};
  protected _transactionContext?: TransactionContext;

  /** Optional schema definition (set by subclass) */
  static schema?: Record<string, SchemaField>;

  /** Optional relational DDL metadata for constraints and indexes */
  static database?: ModelDatabaseDefinition;

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

  static useTransaction<T extends typeof CoreModel>(
    this: T,
    context: TransactionContext
  ): InstanceType<T> {
    const instance = this.newInstance();
    return instance.useTransaction(context) as InstanceType<T>;
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
    return createSafeFinderQuery(
      instance as InstanceType<T>,
      this as unknown as SafeFinderModelStatic<InstanceType<T>>
    );
  }

  protected safeFinderInstance(): SafeFinderQuery<this> {
    return createSafeFinderQuery(
      this,
      this.constructor as unknown as SafeFinderModelStatic<this>
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

  static create<T extends typeof CoreModel>(
    this: T,
    data: Record<string, unknown>
  ): Promise<InstanceType<T> | null> {
    const instance = this.newInstance();
    return instance.create(data) as Promise<InstanceType<T> | null>;
  }

  static async createMany<T extends typeof CoreModel>(
    this: T,
    rows: Record<string, unknown>[]
  ): Promise<InstanceType<T>[]> {
    if (!Array.isArray(rows)) {
      throw new Error(`${this.name}.createMany() expects an array of payload objects.`);
    }

    const created: InstanceType<T>[] = [];
    for (const row of rows) {
      const record = await this.create(row);
      if (record) {
        created.push(record);
      }
    }

    return created;
  }

  static find<T extends typeof CoreModel>(
    this: T,
    id: number | string,
    pk: string = "id"
  ): Promise<InstanceType<T> | null> {
    const instance = this.newInstance();
    return instance.find(id, pk) as Promise<InstanceType<T> | null>;
  }

  static async updateMany<T extends typeof CoreModel>(
    this: T,
    ids: Array<number | string>,
    data: Record<string, unknown>,
    pk: string = "id"
  ): Promise<void> {
    if (!Array.isArray(ids)) {
      throw new Error(`${this.name}.updateMany() expects an array of primary keys.`);
    }

    const instance = this.newInstance();
    for (const id of ids) {
      await instance.update(id, data, pk);
    }
  }

  static async patchMany<T extends typeof CoreModel>(
    this: T,
    rows: Record<string, unknown>[],
    pk: string = "id"
  ): Promise<void> {
    if (!Array.isArray(rows)) {
      throw new Error(`${this.name}.patchMany() expects an array of partial payload objects.`);
    }

    const instance = this.newInstance();
    for (const row of rows) {
      if (!row || typeof row !== "object" || Array.isArray(row)) {
        throw new Error(`${this.name}.patchMany() expects plain object items.`);
      }

      const id = row[pk];
      if (id === undefined || id === null) {
        throw new Error(`${this.name}.patchMany() requires primary key '${pk}' on every item.`);
      }

      const { [pk]: _ignored, ...patch } = row;
      await instance.update(id as string | number, patch, pk);
    }
  }

  static async deleteMany<T extends typeof CoreModel>(
    this: T,
    ids: Array<number | string>,
    pk: string = "id"
  ): Promise<void> {
    if (!Array.isArray(ids)) {
      throw new Error(`${this.name}.deleteMany() expects an array of primary keys.`);
    }

    const instance = this.newInstance();
    for (const id of ids) {
      await instance.delete(id, pk);
    }
  }

  static async restoreMany<T extends typeof CoreModel>(
    this: T,
    ids: Array<number | string>,
    pk: string = "id"
  ): Promise<void> {
    if (!Array.isArray(ids)) {
      throw new Error(`${this.name}.restoreMany() expects an array of primary keys.`);
    }

    const instance = this.newInstance() as InstanceType<T> & {
      restore?: (id: number | string, key?: string) => Promise<void>;
    };

    if (typeof instance.restore !== "function") {
      throw new Error(`${this.name} does not support restoreMany().`);
    }

    for (const id of ids) {
      await instance.restore(id, pk);
    }
  }

  static findAllBy<T extends typeof CoreModel>(
    this: T,
    filters: SafeFinderFilters
  ): Promise<InstanceType<T>[]> {
    return applySafeFinderFilters(this.safeFinder(), filters).get();
  }

  static async existsBy<T extends typeof CoreModel>(
    this: T,
    filters: SafeFinderFilters
  ): Promise<boolean> {
    return (await applySafeFinderFilters(this.safeFinder(), filters).first()) !== null;
  }

  where(field: string, value: unknown): SafeFinderQuery<this> {
    return this.safeFinderInstance().where(field, value);
  }

  with(...relations: string[]): SafeFinderQuery<this> {
    return this.safeFinderInstance().with(...relations);
  }

  active(...args: unknown[]): SafeFinderQuery<this> {
    return this.safeFinderInstance().active(...args);
  }

  inactive(...args: unknown[]): SafeFinderQuery<this> {
    return this.safeFinderInstance().inactive(...args);
  }

  published(...args: unknown[]): SafeFinderQuery<this> {
    return this.safeFinderInstance().published(...args);
  }

  orderBy(field: string, direction: SafeFinderDirection = "asc"): SafeFinderQuery<this> {
    return this.safeFinderInstance().orderBy(field, direction);
  }

  limit(count: number): SafeFinderQuery<this> {
    return this.safeFinderInstance().limit(count);
  }

  get(): Promise<this[]> {
    return this.safeFinderInstance().get();
  }

  first(): Promise<this | null> {
    return this.safeFinderInstance().first();
  }

  findBy(field: string, value: unknown): SafeFinderQuery<this> {
    return this.where(field, value);
  }

  findOneBy(field: string, value: unknown): Promise<this | null> {
    return this.where(field, value).first();
  }

  findAllBy(filters: SafeFinderFilters): Promise<this[]> {
    return applySafeFinderFilters(this.safeFinderInstance(), filters).get();
  }

  async existsBy(filters: SafeFinderFilters): Promise<boolean> {
    return (await applySafeFinderFilters(this.safeFinderInstance(), filters).first()) !== null;
  }

  /**
   * Get DB connection (lazy + cached)
   */
  public async getDB() {
    if (this._transactionContext) {
      if (this._transactionContext.connectionName !== this.connectionName) {
        throw new Error(
          `Cannot use transaction for connection '${this._transactionContext.connectionName}' on model '${this.constructor.name}' using connection '${this.connectionName}'.`
        );
      }

      if (this._transactionContext.driver === "mongo") {
        return this._transactionContext.db;
      }

      return this._transactionContext;
    }

    if (this.getDriverName() === "mongo") {
      return await getConnection(this.connectionName);
    }
    return await getAdapter(this.connectionName);
  }

  public useTransaction<T extends this>(context: TransactionContext): T {
    if (context.connectionName !== this.connectionName) {
      throw new Error(
        `Cannot bind transaction for connection '${context.connectionName}' to model '${this.constructor.name}' using connection '${this.connectionName}'.`
      );
    }

    if (this._transactionContext) {
      if (this._transactionContext === context) {
        return this as T;
      }

      throw new Error(
        `Cannot rebind model '${this.constructor.name}' from one active transaction to another on connection '${this.connectionName}'.`
      );
    }

    const clone = Object.assign(
      Object.create(Object.getPrototypeOf(this)) as T,
      this
    );
    clone._transactionContext = context;
    return clone;
  }

  public getTransactionContext(): TransactionContext | undefined {
    return this._transactionContext;
  }

  private getDriverName(): string {
    return dbConfig.connections[this.connectionName]?.driver ?? this.connectionName;
  }

  private shouldSkipModelHooks(): boolean {
    return shouldSkipModelHooks(process.env.ELOQUENT_DISABLE_MODEL_HOOKS);
  }

  private buildMongoPrimaryFilter(
    pk: string,
    id: number | string
  ): Record<string, unknown> {
    return buildMongoPrimaryFilter(pk, id);
  }

  private getPersistenceSchema(): Record<string, SchemaField> {
    return getPersistenceSchema(
      this.constructor.name,
      (this.constructor as typeof CoreModel).schema
    );
  }

  private getColumnFieldNames(): string[] {
    return getColumnFieldNames(this.getPersistenceSchema());
  }

  private resolvePrimaryKey(): string {
    return resolvePrimaryKey((this.constructor as typeof CoreModel).schema);
  }

  private getPrimaryKeyValue(pk: string): unknown {
    return getPrimaryKeyValue(this as Record<string, unknown>, pk);
  }

  private getOriginalPrimaryKeyValue(pk: string): unknown {
    return getOriginalPrimaryKeyValue(this._originalAttributes, pk);
  }

  private createSnapshot(source?: Record<string, unknown>): Record<string, unknown> {
    const snapshotSource =
      source ?? (Object.assign({}, this) as Record<string, unknown>);
    return createPersistedSnapshot({
      source: snapshotSource,
      schema: (this.constructor as typeof CoreModel).schema,
      primaryKey: this.resolvePrimaryKey(),
    });
  }

  private syncPersistedState(source?: Record<string, unknown>): void {
    this._exists = true;
    this._originalAttributes = this.createSnapshot(source);
  }

  private assertAssignableField(field: string, usage: "fill" | "patch"): void {
    sanitizeAssignableData({
      data: { [field]: undefined },
      usage,
      schema: this.getPersistenceSchema(),
      modelName: this.constructor.name,
    });
  }

  private sanitizeAssignableData(
    data: Record<string, unknown>,
    usage: "fill" | "patch"
  ): Record<string, unknown> {
    return sanitizeAssignableData({
      data,
      usage,
      schema: this.getPersistenceSchema(),
      modelName: this.constructor.name,
    });
  }

  private extractPersistableAttributes(): Record<string, unknown> {
    return extractPersistableAttributes({
      record: this as Record<string, unknown>,
      columnFieldNames: this.getColumnFieldNames(),
    });
  }

  private assertPrimaryKeyNotMutated(primaryKey: string): void {
    assertPrimaryKeyNotMutated({
      exists: this._exists,
      primaryKey,
      currentPrimaryKey: this.getPrimaryKeyValue(primaryKey),
      originalPrimaryKey: this.getOriginalPrimaryKeyValue(primaryKey),
      modelName: this.constructor.name,
    });
  }

  private getDirtyAttributes(primaryKey: string): Record<string, unknown> {
    return getDirtyAttributes({
      currentAttributes: this.extractPersistableAttributes(),
      originalAttributes: this._originalAttributes,
      primaryKey,
    });
  }

  fill(data: Record<string, unknown>): this {
    const assignable = this.sanitizeAssignableData(data, "fill");
    Object.assign(this as Record<string, unknown>, assignable);
    return this;
  }

  private bindHydratedRecord<TRecord extends this | null>(record: TRecord): TRecord {
    if (!record || !this._transactionContext) {
      return record;
    }

    return record.useTransaction(this._transactionContext) as TRecord;
  }

  private bindHydratedRecords<TRecord extends this>(records: TRecord[]): TRecord[] {
    if (!this._transactionContext) {
      return records;
    }

    return records.map((record) => record.useTransaction(this._transactionContext!)) as TRecord[];
  }

  private getMongoCollectionBinding(db: unknown): {
    collection: any;
    options?: { session: unknown };
  } {
    if (this._transactionContext?.driver === "mongo") {
      return {
        collection: this._transactionContext.collection(this.tableName),
        options: { session: this._transactionContext.session },
      };
    }

    return {
      collection: (db as any).collection(this.tableName),
    };
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
    const hooks = (this.constructor as typeof CoreModel).validationHooks;
    const customRules = (this.constructor as typeof CoreModel).customRules;

    await validateModelData({
      tableName: this.tableName,
      schema,
      hooks,
      customRules,
      data,
      partial: options.partial,
      skipModelHooks: this.shouldSkipModelHooks(),
    });

  }

  /**
   * Fire a lifecycle event.
   *
   * We use `unknown` for payload to avoid the `Parameters<>` union issue.
   * Returns `true` to proceed; returns `false` if the handler explicitly canceled (returned false).
   */
  private async fireEvent(eventName: keyof ModelEventHooks, payload?: unknown): Promise<boolean> {
    const handler = (this.constructor as typeof CoreModel).modelEvents?.[eventName];
    return fireModelEvent({
      skipModelHooks: this.shouldSkipModelHooks(),
      handler: handler as ((arg: unknown) => Promise<unknown> | unknown) | undefined,
      payload,
    });
  }

  /* -----------------------------------------------------
   * FIND (by ID)
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
        return this.bindHydratedRecord(Model.hydrateRow(row) as this | null);
      }

      case "mongo":
        {
          const { collection, options } = this.getMongoCollectionBinding(db);
          const filter = this.buildMongoPrimaryFilter(pk, id);
          const row =
            options === undefined
              ? await collection.findOne(filter)
              : await collection.findOne(filter, options);
          const Model = this.constructor as typeof CoreModel;
          return this.bindHydratedRecord(
            Model.hydrateRow(row as Record<string, unknown> | null) as this | null
          );
        }

      default:
        throw new Error(`Unsupported driver: ${driver}`);
    }
  }
  /* -----------------------------------------------------
   * ALL (fetch all records)
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
        return this.bindHydratedRecords(Model.hydrateMany(rows) as this[]);
      }

      case "mongo":
        {
          const { collection, options } = this.getMongoCollectionBinding(db);
          const cursor = options === undefined ? collection.find({}) : collection.find({}, options);
          const rows = await cursor.toArray();
          const Model = this.constructor as typeof CoreModel;
          return this.bindHydratedRecords(
            Model.hydrateMany(rows as Record<string, unknown>[]) as this[]
          );
        }

      default:
        throw new Error(`Unsupported driver: ${driver}`);
    }
  }
  /* -----------------------------------------------------
   * CREATE (insert new record)
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
        const { collection, options } = this.getMongoCollectionBinding(db);
        const result =
          options === undefined
            ? await collection.insertOne(data)
            : await collection.insertOne(data, options);
        createdRecord = { id: result.insertedId, ...data };
        break;
      }

      default:
        throw new Error(`Unsupported driver: ${driver}`);
    }

    // 4) Fire afterCreate (no cancellation)
    const Model = this.constructor as typeof CoreModel;
    const hydrated = this.bindHydratedRecord(
      Model.hydrateRow(createdRecord) as this | null
    );

    await this.fireEvent("afterCreate", hydrated as Record<string, unknown> | null);

    return hydrated;
  }
  /* -----------------------------------------------------
   * UPDATE (by ID)
   * ----------------------------------------------------- */
  update(data: Record<string, unknown>, pk?: string): this;
  update(id: number | string, data: Record<string, unknown>, pk?: string): Promise<void>;
  update(
    idOrData: number | string | Record<string, unknown>,
    dataOrPk?: Record<string, unknown> | string,
    pk: string = "id"
  ): Promise<void> | this {
    if (typeof idOrData === "object" && idOrData !== null && !Array.isArray(idOrData)) {
      return this.fill(idOrData);
    }

    const id = idOrData as number | string;
    const data = dataOrPk as Record<string, unknown>;
    return this.performCorePersistedUpdate(id, data, pk);
  }

  private async performCorePersistedUpdate(
    id: number | string,
    data: Record<string, unknown>,
    pk: string
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
        const { collection, options } = this.getMongoCollectionBinding(db);
        const filter = this.buildMongoPrimaryFilter(pk, id);
        if (options === undefined) {
          await collection.updateOne(filter, { $set: data });
        } else {
          await collection.updateOne(filter, { $set: data }, options);
        }
        break;
      }

      default:
        throw new Error(`Unsupported driver: ${driver}`);
    }

    // 4) afterUpdate
    await this.fireEvent("afterUpdate", data);
  }
  /* -----------------------------------------------------
   * DELETE (by ID)
   * ----------------------------------------------------- */
  delete(): Promise<void>;
  delete(id: number | string, pk?: string): Promise<void>;
  async delete(id?: number | string, pk: string = "id"): Promise<void> {
    const primaryKey = pk ?? this.resolvePrimaryKey();
    const targetId =
      id ?? (this.getOriginalPrimaryKeyValue(primaryKey) as number | string | undefined);

    if (targetId === undefined || targetId === null) {
      throw new Error(
        `Cannot delete ${this.constructor.name} without primary key '${primaryKey}'.`
      );
    }

    // 1) beforeDelete (can cancel)
    const canDelete = await this.fireEvent("beforeDelete", targetId);
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
        const pkCol = adapter.wrapId(primaryKey);
        const sql = `DELETE FROM ${table} WHERE ${pkCol} = ${adapter.placeholder(1)}`;
        await adapter.execute(sql, [targetId]);
        break;
      }

      case "mongo":
        {
          const { collection, options } = this.getMongoCollectionBinding(db);
          const filter = this.buildMongoPrimaryFilter(primaryKey, targetId);
          if (options === undefined) {
            await collection.deleteOne(filter);
          } else {
            await collection.deleteOne(filter, options);
          }
        }
        break;

      default:
        throw new Error(`Unsupported driver: ${driver}`);
    }

    // 3) afterDelete
    if (this.getOriginalPrimaryKeyValue(primaryKey) === targetId) {
      this._exists = false;
      this._originalAttributes = {};
    }

    await this.fireEvent("afterDelete", targetId);
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
