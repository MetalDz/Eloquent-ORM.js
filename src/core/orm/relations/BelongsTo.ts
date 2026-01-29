import { Relation } from "../Relation";
import type { DriverAdapter } from "../../connection/DriverAdapter";
import type { CoreModel } from "../../model/CoreModel";

export class BelongsTo extends Relation {
  async getResults(parent: any): Promise<any> {
    const relatedInstance = new this.relatedModel();
    const db = await relatedInstance["getDB"]();
    const adapter = db as DriverAdapter;

    const table = adapter.wrapId(relatedInstance["tableName"]);
    const localKey = adapter.wrapId(this.localKey);
    const sql = `SELECT * FROM ${table} WHERE ${localKey} = ${adapter.placeholder(1)} LIMIT 1`;

    const row = await adapter.queryOne<Record<string, unknown>>(sql, [parent[this.foreignKey]]);
    const Model = this.relatedModel as typeof CoreModel;
    return Model.hydrateRow(row);
  }

  async match(parents: any[]): Promise<void> {
    if (!parents.length) return;
    const foreignKeys = parents.map((p) => p[this.foreignKey]);
    const relatedInstance = new this.relatedModel();
    const db = await relatedInstance["getDB"]();
    const adapter = db as DriverAdapter;

    const table = adapter.wrapId(relatedInstance["tableName"]);
    const field = adapter.wrapId(this.localKey);
    const inResult = adapter.inClause(field, foreignKeys, 1);
    const sql = `SELECT * FROM ${table} WHERE ${inResult.sql}`;
    const rows = await adapter.query<Record<string, unknown>>(sql, inResult.params);

    const grouped: Record<string, any> = {};
    const Model = this.relatedModel as typeof CoreModel;
    for (const row of rows) {
      const instance = Model.hydrateRow(row);
      if (!instance) continue;
      grouped[(instance as any)[this.localKey] as string] = instance;
    }

    const relName = this.name ?? "relation";
    for (const parent of parents) {
      (parent as any)[relName] = grouped[parent[this.foreignKey]] || null;
    }
  }
}
