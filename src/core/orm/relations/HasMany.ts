import { Relation } from "../Relation";
import type { DriverAdapter } from "../../connection/DriverAdapter";

export class HasMany extends Relation {
  async getResults(parent: Record<string, unknown>): Promise<unknown[]> {
    const RelatedModel = this.relatedModel;
    if (!RelatedModel) throw new Error("Related model is not defined.");
    const relatedInstance = new RelatedModel();
    const db = await relatedInstance.getDB();
    const parentValues = this.getMongoComparableValues(parent, this.localKey);
    let rows: Record<string, unknown>[];

    if (this.isMongoDatabase(db)) {
      rows = await db
        .collection(relatedInstance.tableName)
        .find(this.buildMongoEqualityFilter(this.foreignKey, parentValues[0]))
        .toArray();
    } else {
      const adapter = db as DriverAdapter;
      const table = adapter.wrapId(relatedInstance.tableName);
      const foreignKey = adapter.wrapId(this.foreignKey);
      const sql = `SELECT * FROM ${table} WHERE ${foreignKey} = ${adapter.placeholder(1)}`;
      rows = await adapter.query<Record<string, unknown>>(sql, [parent[this.localKey]]);
    }

    return RelatedModel.hydrateMany(rows);
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

    const grouped: Record<string, Record<string, unknown>[]> = {};
    for (const row of rows) {
      const instance = RelatedModel.hydrateRow(row);
      if (!instance) continue;
      const record = instance as unknown as Record<string, unknown>;
      for (const value of this.getMongoComparableValues(record, this.foreignKey)) {
        const key = String(value);
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(record);
      }
    }

    const relName = this.name ?? "relation";
    for (const parent of parents) {
      const keys = this.getMongoComparableValues(parent, this.localKey).map((value) => String(value));
      const matched = keys.flatMap((key) => grouped[key] ?? []);
      (parent as Record<string, unknown>)[relName] = matched;
    }
  }
}
