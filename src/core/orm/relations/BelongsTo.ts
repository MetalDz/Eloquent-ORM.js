import { Relation } from "../Relation.js";
import type { DriverAdapter } from "../../connection/DriverAdapter.js";

export class BelongsTo extends Relation {
  async getResults(parent: Record<string, unknown>): Promise<unknown> {
    const RelatedModel = this.relatedModel;
    if (!RelatedModel) throw new Error("Related model is not defined.");
    const relatedInstance = new RelatedModel();
    const db = await relatedInstance.getDB();
    let row: Record<string, unknown> | null;

    if (this.isMongoDatabase(db)) {
      row = await db
        .collection(relatedInstance.tableName)
        .findOne(this.buildMongoEqualityFilter(this.localKey, parent[this.foreignKey]));
    } else {
      const adapter = db as DriverAdapter;
      const table = adapter.wrapId(relatedInstance.tableName);
      const localKey = adapter.wrapId(this.localKey);
      const sql = `SELECT * FROM ${table} WHERE ${localKey} = ${adapter.placeholder(1)} LIMIT 1`;
      row = await adapter.queryOne<Record<string, unknown>>(sql, [parent[this.foreignKey]]);
    }

    return RelatedModel.hydrateRow(row);
  }

  async match(parents: Record<string, unknown>[]): Promise<void> {
    if (!parents.length) return;
    const foreignKeys = parents.map((p) => p[this.foreignKey]);
    const RelatedModel = this.relatedModel;
    if (!RelatedModel) throw new Error("Related model is not defined.");
    const relatedInstance = new RelatedModel();
    const db = await relatedInstance.getDB();
    let rows: Record<string, unknown>[];

    if (this.isMongoDatabase(db)) {
      rows = await db
        .collection(relatedInstance.tableName)
        .find(this.buildMongoInFilter(this.localKey, foreignKeys))
        .toArray();
    } else {
      const adapter = db as DriverAdapter;
      const table = adapter.wrapId(relatedInstance.tableName);
      const field = adapter.wrapId(this.localKey);
      const inResult = adapter.inClause(field, foreignKeys, 1);
      const sql = `SELECT * FROM ${table} WHERE ${inResult.sql}`;
      rows = await adapter.query<Record<string, unknown>>(sql, inResult.params);
    }

    const grouped: Record<string, Record<string, unknown> | null> = {};
    for (const row of rows) {
      const instance = RelatedModel.hydrateRow(row);
      if (!instance) continue;
      const record = instance as unknown as Record<string, unknown>;
      for (const value of this.getMongoComparableValues(record, this.localKey)) {
        grouped[String(value)] = record;
      }
    }

    const relName = this.name ?? "relation";
    for (const parent of parents) {
      const foreignKeyValue = parent[this.foreignKey];
      (parent as Record<string, unknown>)[relName] =
        grouped[String(foreignKeyValue)] || null;
    }
  }
}
