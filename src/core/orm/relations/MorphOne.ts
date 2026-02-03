import { Relation, type CoreModelClass } from "../Relation";
import type { DriverAdapter } from "../../connection/DriverAdapter";

export class MorphOne extends Relation {
  protected morphType: string;
  protected morphId: string;

  constructor(relatedModel: CoreModelClass, morphType: string, morphId: string) {
    super(relatedModel, morphId, "id");
    this.morphType = morphType;
    this.morphId = morphId;
  }

  async getResults(parent: Record<string, unknown>): Promise<unknown> {
    const RelatedModel = this.relatedModel;
    if (!RelatedModel) throw new Error("Related model is not defined.");
    const relatedInstance = new RelatedModel();
    const db = await relatedInstance.getDB();
    const adapter = db as DriverAdapter;

    const table = adapter.wrapId(relatedInstance.tableName);
    const morphId = adapter.wrapId(this.morphId);
    const morphTypeColumn = adapter.wrapId(this.morphType);
    const sql = `
      SELECT * FROM ${table}
      WHERE ${morphId} = ${adapter.placeholder(1)} AND ${morphTypeColumn} = ${adapter.placeholder(
        2
      )} LIMIT 1
    `;
    const morphTypeValue =
      typeof parent.getMorphClass === "function"
        ? parent.getMorphClass()
        : parent.constructor.name;
    const row = await adapter.queryOne<Record<string, unknown>>(sql, [
      parent[this.localKey],
      morphTypeValue,
    ]);
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

    const grouped: Record<string, Record<string, unknown>> = {};
    for (const row of rows) {
      const instance = RelatedModel.hydrateRow(row);
      if (!instance) continue;
      const record = instance as unknown as Record<string, unknown>;
      grouped[record[this.morphId] as string] = record;
    }

    const relName = this.name ?? "relation";
    for (const parent of parents) {
      (parent as Record<string, unknown>)[relName] =
        grouped[parent[this.localKey] as string] || null;
    }
  }
}
