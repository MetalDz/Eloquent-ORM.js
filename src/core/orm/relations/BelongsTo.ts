import { Relation } from "../Relation";

export class BelongsTo extends Relation {
  async getResults(parent: any): Promise<any> {
    const relatedInstance = new this.relatedModel();
    const db = await relatedInstance["getDB"]();

    const sql = `SELECT * FROM ${relatedInstance["tableName"]} WHERE ${this.localKey} = ? LIMIT 1`;
    const [rows] = await db.query(sql, [parent[this.foreignKey]]);
    return Array.isArray(rows) ? rows[0] : rows;
  }

  async match(parents: any[]): Promise<void> {
    if (!parents.length) return;
    const foreignKeys = parents.map((p) => p[this.foreignKey]);
    const relatedInstance = new this.relatedModel();
    const db = await relatedInstance["getDB"]();

    const sql = `SELECT * FROM ${relatedInstance["tableName"]} WHERE ${this.localKey} IN (?)`;
    const [rows] = await db.query(sql, [foreignKeys]);

    const grouped: Record<string, any> = {};
    for (const row of rows) {
      grouped[row[this.localKey]] = row;
    }

    const relName = this.name ?? "relation";
    for (const parent of parents) {
      (parent as any)[relName] = grouped[parent[this.foreignKey]] || null;
    }
  }
}
