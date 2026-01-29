import { Relation } from "../Relation";
import type { DriverAdapter } from "../../connection/DriverAdapter";
import { MorphRegistry } from "../mixins/MorphRegistry";
import type { CoreModel } from "../../model/CoreModel";

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
    if (!modelClassName) return null;
    const Model = MorphRegistry.resolve<any>(modelClassName);
    const relatedInstance = new Model();
    const db = await relatedInstance["getDB"]();
    const adapter = db as DriverAdapter;

    const table = adapter.wrapId(relatedInstance["tableName"]);
    const localKey = adapter.wrapId(this.localKey);
    const sql = `SELECT * FROM ${table} WHERE ${localKey} = ${adapter.placeholder(1)} LIMIT 1`;
    const row = await adapter.queryOne<Record<string, unknown>>(sql, [parent[this.morphId]]);
    const ModelClass = Model as unknown as typeof CoreModel;
    return ModelClass.hydrateRow(row);
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
      const Model = MorphRegistry.resolve<any>(type);
      const relatedInstance = new Model();
      const db = await relatedInstance["getDB"]();
      const adapter = db as DriverAdapter;

      const table = adapter.wrapId(relatedInstance["tableName"]);
      const localKey = adapter.wrapId(this.localKey);
      const ids = models.map((m) => m[this.morphId]);
      const inResult = adapter.inClause(localKey, ids, 1);
      const sql = `SELECT * FROM ${table} WHERE ${inResult.sql}`;
      const rows = await adapter.query<Record<string, unknown>>(sql, inResult.params);

      const relatedMap: Record<string, any> = {};
      const ModelClass = Model as unknown as typeof CoreModel;
      for (const row of rows) {
        const instance = ModelClass.hydrateRow(row);
        if (!instance) continue;
        relatedMap[(instance as any)[this.localKey] as string] = instance;
      }

      const relName = this.name ?? "relation";
      for (const parent of models) {
        (parent as any)[relName] = relatedMap[parent[this.morphId]] || null;
      }
    }
  }
}
