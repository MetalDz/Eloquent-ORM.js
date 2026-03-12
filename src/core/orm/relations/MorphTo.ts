import { Relation, type CoreModelClass, type RelationModel } from "../Relation";
import type { DriverAdapter } from "../../connection/DriverAdapter";
import { MorphRegistry } from "../mixins/MorphRegistry";

export class MorphTo extends Relation {
  protected morphType: string;
  protected morphId: string;

  constructor(morphType: string, morphId: string) {
    // The related model is determined dynamically at runtime
    super(null, morphId, "id");
    this.morphType = morphType;
    this.morphId = morphId;
  }

  async getResults(parent: Record<string, unknown>): Promise<unknown> {
    const modelClassName = parent[this.morphType] as string | undefined;
    if (!modelClassName) return null;
    const Model = MorphRegistry.resolve<RelationModel>(modelClassName) as CoreModelClass;
    const relatedInstance = new Model();
    const db = await relatedInstance.getDB();
    let row: Record<string, unknown> | null;

    if (this.isMongoDatabase(db)) {
      row = await db
        .collection(relatedInstance.tableName)
        .findOne(this.buildMongoEqualityFilter(this.localKey, parent[this.morphId]));
    } else {
      const adapter = db as DriverAdapter;
      const table = adapter.wrapId(relatedInstance.tableName);
      const localKey = adapter.wrapId(this.localKey);
      const sql = `SELECT * FROM ${table} WHERE ${localKey} = ${adapter.placeholder(1)} LIMIT 1`;
      row = await adapter.queryOne<Record<string, unknown>>(sql, [parent[this.morphId]]);
    }

    return Model.hydrateRow(row);
  }

  async match(parents: Record<string, unknown>[]): Promise<void> {
    if (!parents.length) return;

    // Group by morph type (so we can fetch each model type once)
    const groups: Record<string, Record<string, unknown>[]> = {};
    for (const parent of parents) {
      const type = parent[this.morphType] as string;
      if (!groups[type]) groups[type] = [];
      groups[type].push(parent);
    }

    for (const [type, models] of Object.entries(groups)) {
      const Model = MorphRegistry.resolve<RelationModel>(type) as CoreModelClass;
      const relatedInstance = new Model();
      const db = await relatedInstance.getDB();
      const ids = models.map((m) => m[this.morphId]);
      let rows: Record<string, unknown>[];

      if (this.isMongoDatabase(db)) {
        rows = await db
          .collection(relatedInstance.tableName)
          .find(this.buildMongoInFilter(this.localKey, ids))
          .toArray();
      } else {
        const adapter = db as DriverAdapter;
        const table = adapter.wrapId(relatedInstance.tableName);
        const localKey = adapter.wrapId(this.localKey);
        const inResult = adapter.inClause(localKey, ids, 1);
        const sql = `SELECT * FROM ${table} WHERE ${inResult.sql}`;
        rows = await adapter.query<Record<string, unknown>>(sql, inResult.params);
      }

      const relatedMap: Record<string, Record<string, unknown>> = {};
      for (const row of rows) {
        const instance = Model.hydrateRow(row);
        if (!instance) continue;
        const record = instance as unknown as Record<string, unknown>;
        for (const value of this.getMongoComparableValues(record, this.localKey)) {
          relatedMap[String(value)] = record;
        }
      }

      const relName = this.name ?? "relation";
      for (const parent of models) {
        (parent as Record<string, unknown>)[relName] =
          relatedMap[parent[this.morphId] as string] || null;
      }
    }
  }
}
