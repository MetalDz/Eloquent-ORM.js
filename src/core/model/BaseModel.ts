import { DatabaseConnection } from "../connection/DatabaseConnection";
import { Relations } from "../relations/relations";

export abstract class BaseModel {
  protected tableName: string;
  protected connection = DatabaseConnection.getInstance();

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  async all() {
    const [rows] = await this.connection.query(`SELECT * FROM ${this.tableName}`);
    return rows;
  }

  async find(id: number) {
    const [rows] = await this.connection.query(`SELECT * FROM ${this.tableName} WHERE id = ? LIMIT 1`, [id]);
    return Array.isArray(rows) ? rows[0] : null;
  }

  async create(data: Record<string, any>) {
    const keys = Object.keys(data).join(", ");
    const values = Object.values(data);
    const placeholders = values.map(() => "?").join(", ");
    const [result] = await this.connection.query(
      `INSERT INTO ${this.tableName} (${keys}) VALUES (${placeholders})`,
      values
    );
    return result;
  }

   hasOne(relatedModel: any, foreignKey: string, localKey: string = "id") {
    return Relations.hasOne(this.tableName, new relatedModel().tableName, foreignKey, localKey, (this as any)[localKey]);
  }

  hasMany(relatedModel: any, foreignKey: string, localKey: string = "id") {
    return Relations.hasMany(this.tableName, new relatedModel().tableName, foreignKey, localKey, (this as any)[localKey]);
  }

  belongsTo(relatedModel: any, foreignKey: string, ownerKey: string = "id") {
    return Relations.belongsTo(this.tableName, new relatedModel().tableName, foreignKey, ownerKey, (this as any)[foreignKey]);
  }
}

