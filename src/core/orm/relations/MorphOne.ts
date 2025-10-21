import { Relation } from "../Relation";

export class MorphOne extends Relation {
  protected morphType: string;
  protected morphId: string;

  constructor(relatedModel: any, morphType: string, morphId: string) {
    super(relatedModel, morphId, "id");
    this.morphType = morphType;
    this.morphId = morphId;
  }

  async getResults(parent: any): Promise<any> {
    const relatedInstance = new this.relatedModel();
    const db = await relatedInstance["getDB"]();

    const sql = `
      SELECT * FROM ${relatedInstance["tableName"]}
      WHERE ${this.morphId} = ? AND ${this.morphType} = ? LIMIT 1
    `;
    const [rows] = await db.query(sql, [parent[this.localKey], parent.constructor.name]);
    return Array.isArray(rows) ? rows[0] : rows;
  }

  async match(parents: any[]): Promise<void> {
    if (!parents.length) return;
    const parentIds = parents.map((p) => p[this.localKey]);
    const relatedInstance = new this.relatedModel();
    const db = await relatedInstance["getDB"]();

    const sql = `
      SELECT * FROM ${relatedInstance["tableName"]}
      WHERE ${this.morphId} IN (?) AND ${this.morphType} = ?
    `;
    const [rows] = await db.query(sql, [parentIds, parents[0].constructor.name]);

    const grouped: Record<string, any> = {};
    for (const row of rows) grouped[row[this.morphId]] = row;

    const relName = this.name ?? "relation";
    for (const parent of parents) {
      (parent as any)[relName] = grouped[parent[this.localKey]] || null;
    }
  }
}
