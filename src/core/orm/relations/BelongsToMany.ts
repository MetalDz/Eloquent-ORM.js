import { Relation } from "../Relation";

export class BelongsToMany extends Relation {
  protected pivotTable: string;
  protected foreignPivotKey: string;
  protected relatedPivotKey: string;

  constructor(
    relatedModel: any,
    pivotTable: string,
    foreignPivotKey: string,
    relatedPivotKey: string
  ) {
    super(relatedModel, foreignPivotKey, relatedPivotKey);
    this.pivotTable = pivotTable;
    this.foreignPivotKey = foreignPivotKey;
    this.relatedPivotKey = relatedPivotKey;
  }

  async getResults(parent: any): Promise<any[]> {
    const relatedInstance = new this.relatedModel();
    const db = await relatedInstance["getDB"]();

    const sql = `
      SELECT r.* FROM ${relatedInstance["tableName"]} AS r
      JOIN ${this.pivotTable} AS p
        ON r.id = p.${this.relatedPivotKey}
      WHERE p.${this.foreignPivotKey} = ?`;
    const [rows] = await db.query(sql, [parent[this.localKey]]);
    return rows;
  }

  async match(parents: any[]): Promise<void> {
    if (!parents.length) return;
    const parentIds = parents.map((p) => p[this.localKey]);
    const relatedInstance = new this.relatedModel();
    const db = await relatedInstance["getDB"]();

    const sql = `
      SELECT r.*, p.${this.foreignPivotKey} AS pivot_parent
      FROM ${relatedInstance["tableName"]} AS r
      JOIN ${this.pivotTable} AS p
        ON r.id = p.${this.relatedPivotKey}
      WHERE p.${this.foreignPivotKey} IN (?)`;
    const [rows] = await db.query(sql, [parentIds]);

    const grouped: Record<string, any[]> = {};
    for (const row of rows) {
      const pid = row["pivot_parent"];
      if (!grouped[pid]) grouped[pid] = [];
      grouped[pid].push(row);
    }

    const relName = this.name ?? "relation";
    for (const parent of parents) {
      (parent as any)[relName] = grouped[parent[this.localKey]] || [];
    }
  }

  async attach(parentId: any, relatedId: any): Promise<void> {
    const db = await new this.relatedModel()["getDB"]();
    await db.query(
      `INSERT INTO ${this.pivotTable} (${this.foreignPivotKey}, ${this.relatedPivotKey}) VALUES (?, ?)`,
      [parentId, relatedId]
    );
  }

  async detach(parentId: any, relatedId: any): Promise<void> {
    const db = await new this.relatedModel()["getDB"]();
    await db.query(
      `DELETE FROM ${this.pivotTable} WHERE ${this.foreignPivotKey} = ? AND ${this.relatedPivotKey} = ?`,
      [parentId, relatedId]
    );
  }

  async sync(parentId: any, relatedIds: any[]): Promise<void> {
    const db = await new this.relatedModel()["getDB"]();
    await db.query(
      `DELETE FROM ${this.pivotTable} WHERE ${this.foreignPivotKey} = ?`,
      [parentId]
    );
    for (const id of relatedIds) await this.attach(parentId, id);
  }
}
