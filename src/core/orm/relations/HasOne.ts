import { Relation } from "../Relation.js";
import type { DriverAdapter } from "../../connection/DriverAdapter.js";

export class HasOne extends Relation {
  async getResults(parent: Record<string, unknown>): Promise<unknown> {
    const RelatedModel = this.relatedModel;
    if (!RelatedModel) throw new Error("Related model is not defined.");
    const relatedInstance = new RelatedModel();
    const db = await relatedInstance.getDB();
    const parentValues = this.getMongoComparableValues(parent, this.localKey);
    let row: Record<string, unknown> | null;

    if (this.isMongoDatabase(db)) {
      row = await db
        .collection(relatedInstance.tableName)
        .findOne(this.buildMongoEqualityFilter(this.foreignKey, parentValues[0]));
    } else {
      const adapter = db as DriverAdapter;
      const table = adapter.wrapId(relatedInstance.tableName);
      const foreignKey = adapter.wrapId(this.foreignKey);
      const sql = `SELECT * FROM ${table} WHERE ${foreignKey} = ${adapter.placeholder(1)} LIMIT 1`;
      row = await adapter.queryOne<Record<string, unknown>>(sql, [parent[this.localKey]]);
    }

    return RelatedModel.hydrateRow(row);
  }

  async match(parents: Record<string, unknown>[]): Promise<void> {
    if (!parents.length) return;
    const parentIds = parents.flatMap((p) => this.getMongoComparableValues(p, this.localKey));
    const RelatedModel = this.relatedModel;
    if (!RelatedModel) throw new Error("Related model is not defined.");
    const relatedInstance = new RelatedModel();
    const db = await relatedInstance.getDB();
    let rows: Record<string, unknown>[];

    if (this.isMongoDatabase(db)) {
      rows = await db
        .collection(relatedInstance.tableName)
        .find(this.buildMongoInFilter(this.foreignKey, parentIds))
        .toArray();
    } else {
      const adapter = db as DriverAdapter;
      const table = adapter.wrapId(relatedInstance.tableName);
      const field = adapter.wrapId(this.foreignKey);
      const inResult = adapter.inClause(field, parentIds, 1);
      const sql = `SELECT * FROM ${table} WHERE ${inResult.sql}`;
      rows = await adapter.query<Record<string, unknown>>(sql, inResult.params);
    }

    const grouped: Record<string, Record<string, unknown> | null> = {};
    for (const row of rows) {
      const instance = RelatedModel.hydrateRow(row);
      if (!instance) continue;
      const record = instance as unknown as Record<string, unknown>;
      for (const value of this.getMongoComparableValues(record, this.foreignKey)) {
        grouped[String(value)] = record;
      }
    }

    const relName = this.name ?? "relation";
    for (const parent of parents) {
      const keys = this.getMongoComparableValues(parent, this.localKey).map((value) => String(value));
      const matched = keys.find((key) => grouped[key]);
      (parent as Record<string, unknown>)[relName] = matched ? grouped[matched] : null;
    }
  }
}
