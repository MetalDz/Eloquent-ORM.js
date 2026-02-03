import { Relation } from "../Relation";
import type { DriverAdapter } from "../../connection/DriverAdapter";

export class HasOne extends Relation {
  async getResults(parent: Record<string, unknown>): Promise<unknown> {
    const RelatedModel = this.relatedModel;
    if (!RelatedModel) throw new Error("Related model is not defined.");
    const relatedInstance = new RelatedModel();
    const db = await relatedInstance.getDB();
    const adapter = db as DriverAdapter;

    const table = adapter.wrapId(relatedInstance.tableName);
    const foreignKey = adapter.wrapId(this.foreignKey);
    const sql = `SELECT * FROM ${table} WHERE ${foreignKey} = ${adapter.placeholder(1)} LIMIT 1`;

    const row = await adapter.queryOne<Record<string, unknown>>(sql, [parent[this.localKey]]);
    return RelatedModel.hydrateRow(row);
  }

  async match(parents: Record<string, unknown>[]): Promise<void> {
    if (!parents.length) return;
    const parentIds = parents.map((p) => p[this.localKey]);
    const RelatedModel = this.relatedModel;
    if (!RelatedModel) throw new Error("Related model is not defined.");
    const relatedInstance = new RelatedModel();
    const db = await relatedInstance.getDB();
    const adapter = db as DriverAdapter;

    const table = adapter.wrapId(relatedInstance.tableName);
    const field = adapter.wrapId(this.foreignKey);
    const inResult = adapter.inClause(field, parentIds, 1);
    const sql = `SELECT * FROM ${table} WHERE ${inResult.sql}`;
    const rows = await adapter.query<Record<string, unknown>>(sql, inResult.params);

    const grouped: Record<string, Record<string, unknown> | null> = {};
    for (const row of rows) {
      const instance = RelatedModel.hydrateRow(row);
      if (!instance) continue;
      const record = instance as unknown as Record<string, unknown>;
      grouped[record[this.foreignKey] as string] = record;
    }

    const relName = this.name ?? "relation";
    for (const parent of parents) {
      (parent as Record<string, unknown>)[relName] = grouped[parent[this.localKey] as string] || null;
    }
  }
}
