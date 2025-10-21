// src/core/connection/CoreModel.ts
import { getConnection } from "../connection/ConnectionFactory";
import type { ConnectionName } from "../connection/DatabaseConnection";
export type ModelBaseContract = new (...args: any[]) => {
  create(data: Record<string, any>): Promise<any>;
  update(id: number | string, data: Record<string, any>, pk?: string): Promise<void>;
  delete(id: number | string, pk?: string): Promise<void>;
  find(id: number | string, pk?: string): Promise<any>;
  all(): Promise<any[]>;
};

/**
 * 🧱 CoreModel — handles driver-agnostic CRUD
 */
export abstract class CoreModel {
  protected tableName: string;
  protected connectionName: ConnectionName;

  constructor(tableName: string, connectionName: ConnectionName = "mysql") {
    this.tableName = tableName;
    this.connectionName = connectionName;
  }

  /**
   * 🔌 Get DB connection (lazy + cached)
   */
  protected async getDB() {
    return await getConnection(this.connectionName);
  }

  /* -----------------------------------------------------
   * 📦 FIND (by ID)
   * ----------------------------------------------------- */
  async find(id: number | string, pk: string = "id"): Promise<any> {
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
  async all(): Promise<any[]> {
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
  async create(data: Record<string, any>): Promise<any> {
    const db = await this.getDB();

    switch (this.connectionName) {
      case "sqlite": {
        const keys = Object.keys(data);
        const values = Object.values(data);
        const placeholders = keys.map(() => "?").join(", ");
        const sql = `INSERT INTO ${this.tableName} (${keys.join(", ")}) VALUES (${placeholders})`;
        const result = await db.run(sql, values);
        return { id: result.lastID, ...data };
      }

      case "mysql":
      case "pg": {
        const keys = Object.keys(data);
        const values = Object.values(data);
        const placeholders = keys.map(() => "?").join(", ");
        const sql = `INSERT INTO ${this.tableName} (${keys.join(", ")}) VALUES (${placeholders})`;
        const [res] = await db.query(sql, values);
        return { id: res.insertId, ...data };
      }

      case "mongo": {
        const result = await db.collection(this.tableName).insertOne(data);
        return { id: result.insertedId, ...data };
      }

      default:
        throw new Error(`Unsupported driver: ${this.connectionName}`);
    }
  }

  /* -----------------------------------------------------
   * ✏️ UPDATE (by ID)
   * ----------------------------------------------------- */
  async update(id: number | string, data: Record<string, any>, pk: string = "id"): Promise<void> {
    const db = await this.getDB();

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
  }

  /* -----------------------------------------------------
   * ❌ DELETE (by ID)
   * ----------------------------------------------------- */
  async delete(id: number | string, pk: string = "id"): Promise<void> {
    const db = await this.getDB();

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
  }
}
