import { Relation, type CoreModelClass } from "../Relation";
import type { DriverAdapter } from "../../connection/DriverAdapter";

export class BelongsToMany extends Relation {
  protected pivotTable: string;
  protected foreignPivotKey: string;
  protected relatedPivotKey: string;

  constructor(
    relatedModel: CoreModelClass,
    pivotTable: string,
    foreignPivotKey: string,
    relatedPivotKey: string
  ) {
    super(relatedModel, foreignPivotKey, relatedPivotKey);
    this.pivotTable = pivotTable;
    this.foreignPivotKey = foreignPivotKey;
    this.relatedPivotKey = relatedPivotKey;
  }

  async getResults(parent: Record<string, unknown>): Promise<unknown[]> {
    const RelatedModel = this.relatedModel;
    if (!RelatedModel) throw new Error("Related model is not defined.");
    const relatedInstance = new RelatedModel();
    const db = await relatedInstance.getDB();
    const adapter = db as DriverAdapter;

    const relatedTable = adapter.wrapId(relatedInstance.tableName);
    const pivotTable = adapter.wrapId(this.pivotTable);
    const rAll = adapter.wrapId("r.*");
    const rId = adapter.wrapId("r.id");
    const pRelated = adapter.wrapId(`p.${this.relatedPivotKey}`);
    const pForeign = adapter.wrapId(`p.${this.foreignPivotKey}`);

    const sql = `
      SELECT ${rAll} FROM ${relatedTable} AS r
      JOIN ${pivotTable} AS p
        ON ${rId} = ${pRelated}
      WHERE ${pForeign} = ${adapter.placeholder(1)}`;
    const rows = await adapter.query<Record<string, unknown>>(sql, [parent[this.localKey]]);
    return RelatedModel.hydrateMany(rows);
  }

  async match(parents: Record<string, unknown>[]): Promise<void> {
    if (!parents.length) return;
    const parentIds = parents.map((p) => p[this.localKey]);
    const RelatedModel = this.relatedModel;
    if (!RelatedModel) throw new Error("Related model is not defined.");
    const relatedInstance = new RelatedModel();
    const db = await relatedInstance.getDB();
    const adapter = db as DriverAdapter;

    const relatedTable = adapter.wrapId(relatedInstance.tableName);
    const pivotTable = adapter.wrapId(this.pivotTable);
    const rAll = adapter.wrapId("r.*");
    const rId = adapter.wrapId("r.id");
    const pRelated = adapter.wrapId(`p.${this.relatedPivotKey}`);
    const pForeign = adapter.wrapId(`p.${this.foreignPivotKey}`);
    const inResult = adapter.inClause(pForeign, parentIds, 1);

    const sql = `
      SELECT ${rAll}, ${pForeign} AS pivot_parent
      FROM ${relatedTable} AS r
      JOIN ${pivotTable} AS p
        ON ${rId} = ${pRelated}
      WHERE ${inResult.sql}`;
    const rows = await adapter.query<Record<string, unknown>>(sql, inResult.params);

    const grouped: Record<string, Record<string, unknown>[]> = {};
    for (const row of rows) {
      const instance = RelatedModel.hydrateRow(row);
      if (!instance) continue;
      const record = instance as unknown as Record<string, unknown>;
      const pid = (record["pivot_parent"] as string) ?? "";
      if ("pivot_parent" in record) {
        delete record["pivot_parent"];
      }
      if (!grouped[pid]) grouped[pid] = [];
      grouped[pid].push(record);
    }

    const relName = this.name ?? "relation";
    for (const parent of parents) {
      (parent as Record<string, unknown>)[relName] = grouped[parent[this.localKey] as string] || [];
    }
  }

  async attach(parentId: unknown, relatedId: unknown): Promise<void> {
    const RelatedModel = this.relatedModel;
    if (!RelatedModel) throw new Error("Related model is not defined.");
    const db = await new RelatedModel().getDB();
    const adapter = db as DriverAdapter;
    const table = adapter.wrapId(this.pivotTable);
    const fk = adapter.wrapId(this.foreignPivotKey);
    const rk = adapter.wrapId(this.relatedPivotKey);

    const sql = `INSERT INTO ${table} (${fk}, ${rk}) VALUES (${adapter.placeholders(2)})`;
    await adapter.execute(sql, [parentId, relatedId]);
  }

  async detach(parentId: unknown, relatedId: unknown): Promise<void> {
    const RelatedModel = this.relatedModel;
    if (!RelatedModel) throw new Error("Related model is not defined.");
    const db = await new RelatedModel().getDB();
    const adapter = db as DriverAdapter;
    const table = adapter.wrapId(this.pivotTable);
    const fk = adapter.wrapId(this.foreignPivotKey);
    const rk = adapter.wrapId(this.relatedPivotKey);

    const sql = `DELETE FROM ${table} WHERE ${fk} = ${adapter.placeholder(
      1
    )} AND ${rk} = ${adapter.placeholder(2)}`;
    await adapter.execute(sql, [parentId, relatedId]);
  }

  async sync(parentId: unknown, relatedIds: unknown[]): Promise<void> {
    const RelatedModel = this.relatedModel;
    if (!RelatedModel) throw new Error("Related model is not defined.");
    const db = await new RelatedModel().getDB();
    const adapter = db as DriverAdapter;
    const table = adapter.wrapId(this.pivotTable);
    const fk = adapter.wrapId(this.foreignPivotKey);
    const sql = `DELETE FROM ${table} WHERE ${fk} = ${adapter.placeholder(1)}`;
    await adapter.execute(sql, [parentId]);
    for (const id of relatedIds) await this.attach(parentId, id);
  }
}
