import { Relation } from "../Relation";

export class MorphTo extends Relation {
  protected morphType: string;
  protected morphId: string;

  constructor(morphType: string, morphId: string) {
    // The related model is determined dynamically at runtime
    super(null, morphId, "id");
    this.morphType = morphType;
    this.morphId = morphId;
  }

  async getResults(parent: any): Promise<any> {
    const modelClassName = parent[this.morphType];
    const Model = await import(`../../models/${modelClassName}.js`).then((m) => m[modelClassName]);
    const relatedInstance = new Model();
    const db = await relatedInstance["getDB"]();

    const sql = `SELECT * FROM ${relatedInstance["tableName"]} WHERE ${this.localKey} = ? LIMIT 1`;
    const [rows] = await db.query(sql, [parent[this.morphId]]);
    return Array.isArray(rows) ? rows[0] : rows;
  }

  async match(parents: any[]): Promise<void> {
    if (!parents.length) return;

    // Group by morph type (so we can fetch each model type once)
    const groups: Record<string, any[]> = {};
    for (const parent of parents) {
      const type = parent[this.morphType];
      if (!groups[type]) groups[type] = [];
      groups[type].push(parent);
    }

    for (const [type, models] of Object.entries(groups)) {
      const Model = await import(`../../models/${type}.js`).then((m) => m[type]);
      const relatedInstance = new Model();
      const db = await relatedInstance["getDB"]();

      const ids = models.map((m) => m[this.morphId]);
      const sql = `SELECT * FROM ${relatedInstance["tableName"]} WHERE ${this.localKey} IN (?)`;
      const [rows] = await db.query(sql, [ids]);

      const relatedMap: Record<string, any> = {};
      for (const row of rows) relatedMap[row[this.localKey]] = row;

      const relName = this.name ?? "relation";
      for (const parent of models) {
        (parent as any)[relName] = relatedMap[parent[this.morphId]] || null;
      }
    }
  }
}
