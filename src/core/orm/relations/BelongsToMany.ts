import { Relation, type CoreModelClass } from "../Relation";
import type { DriverAdapter } from "../../connection/DriverAdapter";

export class BelongsToMany extends Relation {
  protected pivotTable: string;
  protected foreignPivotKey: string;
  protected relatedPivotKey: string;
  protected relatedLocalKey: string;

  constructor(
    relatedModel: CoreModelClass,
    pivotTable: string,
    foreignPivotKey: string,
    relatedPivotKey: string,
    parentLocalKey: string = "id",
    relatedLocalKey: string = "id"
  ) {
    super(relatedModel, foreignPivotKey, parentLocalKey);
    this.pivotTable = pivotTable;
    this.foreignPivotKey = foreignPivotKey;
    this.relatedPivotKey = relatedPivotKey;
    this.relatedLocalKey = relatedLocalKey;
  }

  async getResults(parent: Record<string, unknown>): Promise<unknown[]> {
    const RelatedModel = this.relatedModel;
    if (!RelatedModel) throw new Error("Related model is not defined.");
    const relatedInstance = new RelatedModel();
    const db = await relatedInstance.getDB();
    const parentValues = this.getMongoComparableValues(parent, this.localKey);

    if (this.isMongoDatabase(db)) {
      if (parentValues.length === 0) return [];

      const pivotRows = await db
        .collection(this.pivotTable)
        .find(this.buildMongoInFilter(this.foreignPivotKey, parentValues))
        .toArray();
      const relatedIds = Array.from(
        new Set(
          pivotRows.flatMap((row) => this.getMongoComparableValues(row, this.relatedPivotKey))
        )
      );
      if (relatedIds.length === 0) return [];

      const relatedRows = await db
        .collection(relatedInstance.tableName)
        .find(this.buildMongoInFilter(this.relatedLocalKey, relatedIds))
        .toArray();

      const relatedMap = new Map<string, Record<string, unknown>>();
      for (const row of relatedRows) {
        for (const value of this.getMongoComparableValues(row, this.relatedLocalKey)) {
          relatedMap.set(String(value), row);
        }
      }

      const ordered = relatedIds
        .map((id) => relatedMap.get(String(id)))
        .filter((row): row is Record<string, unknown> => !!row);
      return RelatedModel.hydrateMany(ordered);
    }

    const adapter = db as DriverAdapter;
    const relatedTable = adapter.wrapId(relatedInstance.tableName);
    const pivotTable = adapter.wrapId(this.pivotTable);
    const rAll = adapter.wrapId("r.*");
    const rId = adapter.wrapId(`r.${this.relatedLocalKey}`);
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
    const parentIds = parents.flatMap((p) => this.getMongoComparableValues(p, this.localKey));
    const RelatedModel = this.relatedModel;
    if (!RelatedModel) throw new Error("Related model is not defined.");
    const relatedInstance = new RelatedModel();
    const db = await relatedInstance.getDB();
    if (this.isMongoDatabase(db)) {
      const pivotRows = await db
        .collection(this.pivotTable)
        .find(this.buildMongoInFilter(this.foreignPivotKey, parentIds))
        .toArray();

      const pivotGroups: Record<string, unknown[]> = {};
      for (const row of pivotRows) {
        const parentKey = row[this.foreignPivotKey];
        if (parentKey === undefined) continue;
        const key = String(parentKey);
        if (!pivotGroups[key]) pivotGroups[key] = [];
        pivotGroups[key].push(row[this.relatedPivotKey]);
      }

      const relatedIds = Array.from(
        new Set(pivotRows.flatMap((row) => this.getMongoComparableValues(row, this.relatedPivotKey)))
      );

      const relatedRows =
        relatedIds.length === 0
          ? []
          : await db
              .collection(relatedInstance.tableName)
              .find(this.buildMongoInFilter(this.relatedLocalKey, relatedIds))
              .toArray();

      const relatedMap = new Map<string, Record<string, unknown>>();
      for (const row of relatedRows) {
        for (const value of this.getMongoComparableValues(row, this.relatedLocalKey)) {
          relatedMap.set(String(value), row);
        }
      }

      const relName = this.name ?? "relation";
      for (const parent of parents) {
        const keys = this.getMongoComparableValues(parent, this.localKey).map((value) => String(value));
        const seen = new Set<string>();
        const related: Record<string, unknown>[] = [];

        for (const key of keys) {
          for (const relatedId of pivotGroups[key] ?? []) {
            const idKey = String(relatedId);
            if (seen.has(idKey)) continue;
            const row = relatedMap.get(idKey);
            if (!row) continue;
            seen.add(idKey);
            const instance = RelatedModel.hydrateRow(row);
            if (!instance) continue;
            related.push(instance as unknown as Record<string, unknown>);
          }
        }

        (parent as Record<string, unknown>)[relName] = related;
      }
      return;
    }

    const adapter = db as DriverAdapter;
    const relatedTable = adapter.wrapId(relatedInstance.tableName);
    const pivotTable = adapter.wrapId(this.pivotTable);
    const rAll = adapter.wrapId("r.*");
    const rId = adapter.wrapId(`r.${this.relatedLocalKey}`);
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
    if (this.isMongoDatabase(db)) {
      const collection = db.collection(this.pivotTable);
      if (typeof collection.insertOne === "function") {
        await collection.insertOne({
          [this.foreignPivotKey]: parentId,
          [this.relatedPivotKey]: relatedId,
        });
        return;
      }
      if (typeof collection.insertMany === "function") {
        await collection.insertMany([
          {
            [this.foreignPivotKey]: parentId,
            [this.relatedPivotKey]: relatedId,
          },
        ]);
        return;
      }
      throw new Error("MongoDB pivot collection does not support insert operations.");
    }
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
    if (this.isMongoDatabase(db)) {
      const collection = db.collection(this.pivotTable);
      if (typeof collection.deleteMany !== "function") {
        throw new Error("MongoDB pivot collection does not support delete operations.");
      }
      await collection.deleteMany({
        [this.foreignPivotKey]: parentId,
        [this.relatedPivotKey]: relatedId,
      });
      return;
    }
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
    if (this.isMongoDatabase(db)) {
      const collection = db.collection(this.pivotTable);
      if (typeof collection.deleteMany !== "function") {
        throw new Error("MongoDB pivot collection does not support delete operations.");
      }
      await collection.deleteMany({ [this.foreignPivotKey]: parentId });
      if (relatedIds.length === 0) return;
      if (typeof collection.insertMany === "function") {
        await collection.insertMany(
          relatedIds.map((id) => ({
            [this.foreignPivotKey]: parentId,
            [this.relatedPivotKey]: id,
          }))
        );
        return;
      }
      for (const id of relatedIds) {
        await this.attach(parentId, id);
      }
      return;
    }
    const adapter = db as DriverAdapter;
    const table = adapter.wrapId(this.pivotTable);
    const fk = adapter.wrapId(this.foreignPivotKey);
    const sql = `DELETE FROM ${table} WHERE ${fk} = ${adapter.placeholder(1)}`;
    await adapter.execute(sql, [parentId]);
    for (const id of relatedIds) await this.attach(parentId, id);
  }
}
