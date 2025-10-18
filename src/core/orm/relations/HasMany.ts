import { Relation } from "../Relation";

export class HasMany extends Relation {
  async getResults(parent: any): Promise<any[]> {
    const relatedInstance = new this.relatedModel();
    const db = await relatedInstance["getDB"]();

    const sql = `SELECT * FROM ${relatedInstance["tableName"]} WHERE ${this.foreignKey} = ?`;
    const [rows] = await db.query(sql, [parent[this.localKey]]);
    return rows;
  }
}
