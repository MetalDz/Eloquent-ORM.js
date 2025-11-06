// src/core/connection/CoreModel.ts
import { getConnection, ConnectionName } from "../connection/ConnectionFactory";

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
   * Get DB connection (lazy + cached)
   */
  protected async getDB() {
    return await getConnection(this.connectionName);
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
        return db.get(`SELECT * FROM ${this.tableName} WHERE ${pk} = ?`, [id]);

      case "mysql":
      case "pg": {
        const [rows] = await db.query(`SELECT * FROM ${this.tableName} WHERE ${pk} = ?`, [id]);
        return Array.isArray(rows) ? rows[0] : rows;
      }

      case "mongo":
        return await db.collection(this.tableName).findOne({ [pk]: id });

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
        return db.all(`SELECT * FROM ${this.tableName}`);

      case "mysql":
      case "pg": {
        const [rows] = await db.query(`SELECT * FROM ${this.tableName}`);
        return rows;
      }

      case "mongo":
        return await db.collection(this.tableName).find({}).toArray();

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
      case "sqlite": {
        const keys = Object.keys(data);
        const values = Object.values(data);
        const placeholders = keys.map(() => "?").join(", ");
        const sql = `INSERT INTO ${this.tableName} (${keys.join(", ")}) VALUES (${placeholders})`;
        const result = await db.run(sql, values);
        createdRecord = { id: result.lastID, ...data };
        break;
      }

      case "mysql":
      case "pg": {
        const keys = Object.keys(data);
        const values = Object.values(data);
        const placeholders = keys.map(() => "?").join(", ");
        const sql = `INSERT INTO ${this.tableName} (${keys.join(", ")}) VALUES (${placeholders})`;
        const [res] = await db.query(sql, values);
        // many drivers return insertId, fallback to insertId || id
        const insertId = (res && (res.insertId ?? (res.insertedId ?? undefined))) as unknown;
        createdRecord = { id: insertId, ...data };
        break;
      }

      case "mongo": {
        const result = await db.collection(this.tableName).insertOne(data);
        createdRecord = { id: result.insertedId, ...data };
        break;
      }

      default:
        throw new Error(`Unsupported driver: ${this.connectionName}`);
    }

    // 4) Fire afterCreate (no cancellation)
    await this.fireEvent("afterCreate", createdRecord);

    return createdRecord;
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
      case "sqlite": {
        const keys = Object.keys(data);
        const values = Object.values(data);
        const setClause = keys.map((key) => `${key} = ?`).join(", ");
        const sql = `UPDATE ${this.tableName} SET ${setClause} WHERE ${pk} = ?`;
        await db.run(sql, [...values, id]);
        break;
      }

      case "mysql":
      case "pg": {
        const keys = Object.keys(data);
        const values = Object.values(data);
        const setClause = keys.map((key) => `${key} = ?`).join(", ");
        const sql = `UPDATE ${this.tableName} SET ${setClause} WHERE ${pk} = ?`;
        await db.query(sql, [...values, id]);
        break;
      }

      case "mongo": {
        await db.collection(this.tableName).updateOne({ [pk]: id }, { $set: data });
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
        await db.run(`DELETE FROM ${this.tableName} WHERE ${pk} = ?`, [id]);
        break;

      case "mysql":
      case "pg":
        await db.query(`DELETE FROM ${this.tableName} WHERE ${pk} = ?`, [id]);
        break;

      case "mongo":
        await db.collection(this.tableName).deleteOne({ [pk]: id });
        break;

      default:
        throw new Error(`Unsupported driver: ${this.connectionName}`);
    }

    // 3) afterDelete
    await this.fireEvent("afterDelete", id);
  }
}
