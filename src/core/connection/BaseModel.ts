import { getConnection, type ConnectionName } from "./ConnectionFactory";
 
/**
 * BaseModel
 * Provides CRUD operations and connection abstraction layer
 */
export abstract class BaseModel {
  protected tableName: string;
  protected connectionName: ConnectionName;

  constructor(tableName: string, connectionName: ConnectionName = "mysql") {
    this.tableName = tableName;
    this.connectionName = connectionName;
  }

  /**
   * 🔌 Get a database connection (lazy + cached)
   */
  protected async getDB(): Promise<any> {
    const db = await getConnection(this.connectionName);

    if (!db) {
      throw new Error(`❌ Database connection for "${this.connectionName}" not found`);
    }

    return db;
  }

  /**
   * 🧭 Find a record by primary key (default: id)
   */
  async find<T = any>(id: number | string, pk: string = "id"): Promise<T | null> {
    const db = await this.getDB();
    const sql = `SELECT * FROM ${this.tableName} WHERE ${pk} = ?`;

    if (this.connectionName === "sqlite") {
      return await db.get(sql, [id]);
    }

    const [rows] = await db.query(sql, [id]);
    return Array.isArray(rows) && rows.length > 0 ? (rows[0] as T) : null;
  }

  /**
   * 🧱 Get all records
   */
  async all<T = any>(): Promise<T[]> {
    const db = await this.getDB();
    const sql = `SELECT * FROM ${this.tableName}`;

    if (this.connectionName === "sqlite") {
      return await db.all(sql);
    }

    const [rows] = await db.query(sql);
    return rows as T[];
  }

  /**
   * ➕ Insert a new record
   */
  async create<T = any>(data: Record<string, any>): Promise<T> {
    const db = await this.getDB();
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map(() => "?").join(", ");
    const sql = `INSERT INTO ${this.tableName} (${keys.join(", ")}) VALUES (${placeholders})`;

    if (this.connectionName === "sqlite") {
      const result = await db.run(sql, values);
      return { id: result.lastID, ...data } as T;
    }

    const [res] = await db.query(sql, values);
    return { id: res.insertId, ...data } as T;
  }

  /**
   * ✏️ Update record by ID
   */
  async update(id: number | string, data: Record<string, any>, pk: string = "id"): Promise<void> {
    const db = await this.getDB();
    const keys = Object.keys(data);
    const values = Object.values(data);
    const setClause = keys.map((key) => `${key} = ?`).join(", ");
    const sql = `UPDATE ${this.tableName} SET ${setClause} WHERE ${pk} = ?`;

    if (this.connectionName === "sqlite") {
      await db.run(sql, [...values, id]);
    } else {
      await db.query(sql, [...values, id]);
    }
  }

  /**
   * ❌ Delete record by ID
   */
  async delete(id: number | string, pk: string = "id"): Promise<void> {
    const db = await this.getDB();
    const sql = `DELETE FROM ${this.tableName} WHERE ${pk} = ?`;

    if (this.connectionName === "sqlite") {
      await db.run(sql, [id]);
    } else {
      await db.query(sql, [id]);
    }
  }

  /**
   * 🧩 Optional helper — execute raw SQL safely
   */
  async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    const db = await this.getDB();

    if (this.connectionName === "sqlite") {
      return await db.all(sql, params);
    }

    const [rows] = await db.query(sql, params);
    return rows as T[];
  }
}
