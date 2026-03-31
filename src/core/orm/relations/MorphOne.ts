import { Relation, type CoreModelClass } from "../Relation.js";
import type { DriverAdapter } from "../../connection/DriverAdapter.js";

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
    const morphTypeValue =
      typeof parent.getMorphClass === "function"
        ? parent.getMorphClass()
        : parent.constructor.name;
    const parentValues = this.getMongoComparableValues(parent, this.localKey);
    let row: Record<string, unknown> | null;

    if (this.isMongoDatabase(db)) {
      row = await db.collection(relatedInstance.tableName).findOne({
        ...this.buildMongoEqualityFilter(this.morphId, parentValues[0]),
        [this.morphType]: morphTypeValue,
      });
    } else {
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
      row = await adapter.queryOne<Record<string, unknown>>(sql, [
        parent[this.localKey],
        morphTypeValue,
      ]);
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
    const morphTypeValue =
      typeof parents[0]?.getMorphClass === "function"
        ? parents[0].getMorphClass()
        : parents[0].constructor.name;
    let rows: Record<string, unknown>[];

    if (this.isMongoDatabase(db)) {
      rows = await db
        .collection(relatedInstance.tableName)
        .find({
          ...this.buildMongoInFilter(this.morphId, parentIds),
          [this.morphType]: morphTypeValue,
        })
        .toArray();
    } else {
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
      rows = await adapter.query<Record<string, unknown>>(sql, [
        ...inResult.params,
        morphTypeValue,
      ]);
    }

    const grouped: Record<string, Record<string, unknown>> = {};
    for (const row of rows) {
      const instance = RelatedModel.hydrateRow(row);
      if (!instance) continue;
      const record = instance as unknown as Record<string, unknown>;
      for (const value of this.getMongoComparableValues(record, this.morphId)) {
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
