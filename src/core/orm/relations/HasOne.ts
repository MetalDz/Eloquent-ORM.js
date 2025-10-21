import { Relation } from "../Relation";

export class HasOne extends Relation {
  async getResults(parent: any): Promise<any> {
    const relatedInstance = new this.relatedModel();
    const db = await relatedInstance["getDB"]();

    const sql = `SELECT * FROM ${relatedInstance["tableName"]} WHERE ${this.foreignKey} = ? LIMIT 1`;
    const [rows] = await db.query(sql, [parent[this.localKey]]);
    return Array.isArray(rows) ? rows[0] : rows;
  }

  async match(parents: any[]): Promise<void> {
    if (!parents.length) return;
    const parentIds = parents.map((p) => p[this.localKey]);
    const relatedInstance = new this.relatedModel();
    const db = await relatedInstance["getDB"]();

    const sql = `SELECT * FROM ${relatedInstance["tableName"]} WHERE ${this.foreignKey} IN (?)`;
    const [rows] = await db.query(sql, [parentIds]);

    const grouped: Record<string, any> = {};
    for (const row of rows) {
      grouped[row[this.foreignKey]] = row;
    }

    const relName = this.name ?? "relation";
    for (const parent of parents) {
      (parent as any)[relName] = grouped[parent[this.localKey]] || null;
    }
  }
}
