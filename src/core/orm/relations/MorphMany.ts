import { Relation } from "../Relation";
import type { DriverAdapter } from "../../connection/DriverAdapter";
import type { CoreModel } from "../../model/CoreModel";

export class MorphMany extends Relation {
  protected morphType: string;
  protected morphId: string;

  constructor(relatedModel: any, morphType: string, morphId: string) {
    super(relatedModel, morphId, "id");
    this.morphType = morphType;
    this.morphId = morphId;
  }

  async getResults(parent: any): Promise<any[]> {
    const relatedInstance = new this.relatedModel();
    const db = await relatedInstance["getDB"]();
    const adapter = db as DriverAdapter;

    const table = adapter.wrapId(relatedInstance["tableName"]);
    const morphId = adapter.wrapId(this.morphId);
    const morphTypeColumn = adapter.wrapId(this.morphType);
    const sql = `
      SELECT * FROM ${table}
      WHERE ${morphId} = ${adapter.placeholder(1)} AND ${morphTypeColumn} = ${adapter.placeholder(2)}
    `;
    const morphTypeValue =
      typeof parent.getMorphClass === "function"
        ? parent.getMorphClass()
        : parent.constructor.name;
    const rows = await adapter.query<Record<string, unknown>>(sql, [
      parent[this.localKey],
      morphTypeValue,
    ]);
    const Model = this.relatedModel as typeof CoreModel;
    return Model.hydrateMany(rows);
  }

  async match(parents: any[]): Promise<void> {
    if (!parents.length) return;
    const parentIds = parents.map((p) => p[this.localKey]);
    const relatedInstance = new this.relatedModel();
    const db = await relatedInstance["getDB"]();
    const adapter = db as DriverAdapter;

    const table = adapter.wrapId(relatedInstance["tableName"]);
    const morphId = adapter.wrapId(this.morphId);
    const morphTypeColumn = adapter.wrapId(this.morphType);
    const inResult = adapter.inClause(morphId, parentIds, 1);
    const typePlaceholder = adapter.placeholder(inResult.nextIndex);
    const sql = `
      SELECT * FROM ${table}
      WHERE ${inResult.sql} AND ${morphTypeColumn} = ${typePlaceholder}
    `;
    const morphTypeValue =
      typeof parents[0]?.getMorphClass === "function"
        ? parents[0].getMorphClass()
        : parents[0].constructor.name;
    const rows = await adapter.query<Record<string, unknown>>(sql, [
      ...inResult.params,
      morphTypeValue,
    ]);

    const grouped: Record<string, any[]> = {};
    const Model = this.relatedModel as typeof CoreModel;
    for (const row of rows) {
      const instance = Model.hydrateRow(row);
      if (!instance) continue;
      const id = (instance as any)[this.morphId] as string;
      if (!grouped[id]) grouped[id] = [];
      grouped[id].push(instance);
    }

    const relName = this.name ?? "relation";
    for (const parent of parents) {
      (parent as any)[relName] = grouped[parent[this.localKey]] || [];
    }
  }
}
