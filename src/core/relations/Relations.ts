import { DatabaseConnection } from "../connection/DatabaseConnection";

export class Relations {
  static async hasOne(
    parentTable: string,
    relatedTable: string,
    foreignKey: string,
    localKey: string,
    id: number
  ) {
    const connection = DatabaseConnection.getInstance();
    const [rows] = await connection.query(
      `SELECT * FROM ${relatedTable} WHERE ${foreignKey} = ? LIMIT 1`,
      [id]
    );
    return Array.isArray(rows) ? rows[0] : null;
  }

  static async hasMany(
    parentTable: string,
    relatedTable: string,
    foreignKey: string,
    localKey: string,
    id: number
  ) {
    const connection = DatabaseConnection.getInstance();
    const [rows] = await connection.query(
      `SELECT * FROM ${relatedTable} WHERE ${foreignKey} = ?`,
      [id]
    );
    return rows;
  }

  static async belongsTo(
    childTable: string,
    relatedTable: string,
    foreignKey: string,
    ownerKey: string,
    foreignId: number
  ) {
    const connection = DatabaseConnection.getInstance();
    const [rows] = await connection.query(
      `SELECT * FROM ${relatedTable} WHERE ${ownerKey} = ? LIMIT 1`,
      [foreignId]
    );
    return Array.isArray(rows) ? rows[0] : null;
  }
}
