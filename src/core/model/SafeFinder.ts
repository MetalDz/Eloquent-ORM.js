import { dbConfig } from "../../config/database";
import type { DriverAdapter } from "../connection/DriverAdapter";
import type { SchemaField } from "../schema/SchemaBlueprint";

export type SafeFinderDirection = "asc" | "desc";
export type SafeFinderFilters = Record<string, unknown>;

export interface SafeFinderModelInstance {
  tableName: string;
  connectionName: string;
  getDB(): Promise<unknown>;
}

export interface SafeFinderModelStatic<TModel extends SafeFinderModelInstance = SafeFinderModelInstance> {
  name: string;
  schema?: Record<string, SchemaField>;
  hydrateRow(row: Record<string, unknown> | null): TModel | null;
  hydrateMany(rows: Record<string, unknown>[]): TModel[];
  scopeActive?(query: SafeFinderQuery<TModel>, ...args: unknown[]): SafeFinderQuery<TModel> | void;
}

type FilterEntry = {
  field: string;
  value: unknown;
};

export class SafeFinderQuery<TModel extends SafeFinderModelInstance = SafeFinderModelInstance> {
  private readonly filters: FilterEntry[] = [];
  private readonly eagerRelations: string[] = [];
  private orderField?: string;
  private orderDirection: SafeFinderDirection = "asc";
  private limitCount?: number;

  constructor(
    private readonly model: TModel,
    private readonly modelClass: SafeFinderModelStatic<TModel>
  ) {}

  where(field: string, value: unknown): this {
    this.assertColumnField(field, "filter");
    this.filters.push({ field, value });
    return this;
  }

  with(...relations: string[]): this {
    this.eagerRelations.push(...relations);
    return this;
  }

  active(...args: unknown[]): this {
    const scope = this.modelClass.scopeActive;
    if (typeof scope === "function") {
      const result = scope.call(this.modelClass, this, ...args);
      return (result as this | void) ?? this;
    }

    if (this.hasColumnField("status")) {
      return this.where("status", "active");
    }

    if (this.hasColumnField("active")) {
      return this.where("active", true);
    }

    throw new Error(
      `No active scope available on ${this.modelClass.name}. Define static scopeActive(query) or add a 'status'/'active' column.`
    );
  }

  orderBy(field: string, direction: SafeFinderDirection = "asc"): this {
    this.assertColumnField(field, "sort");
    const normalized = String(direction).toLowerCase();
    if (normalized !== "asc" && normalized !== "desc") {
      throw new Error(`Unsupported sort direction '${direction}'. Use 'asc' or 'desc'.`);
    }

    this.orderField = field;
    this.orderDirection = normalized as SafeFinderDirection;
    return this;
  }

  limit(count: number): this {
    if (!Number.isInteger(count) || count < 1) {
      throw new Error("limit() expects a positive integer.");
    }

    this.limitCount = count;
    return this;
  }

  async get(): Promise<TModel[]> {
    const db = await this.model.getDB();
    const driver = this.getDriverName();

    switch (driver) {
      case "sqlite":
      case "mysql":
      case "pg": {
        const adapter = db as DriverAdapter;
        const { sql, params } = this.buildSqlSelect(adapter);
        const rows = await adapter.query<Record<string, unknown>>(sql, params);
        return this.applyEagerLoading(this.modelClass.hydrateMany(rows));
      }

      case "mongo": {
        let cursor = (db as any).collection(this.model.tableName).find(this.buildMongoFilter());
        if (this.orderField) {
          cursor = cursor.sort({ [this.orderField]: this.orderDirection === "asc" ? 1 : -1 });
        }
        if (this.limitCount !== undefined) {
          cursor = cursor.limit(this.limitCount);
        }
        const rows = await cursor.toArray();
        return this.applyEagerLoading(this.modelClass.hydrateMany(rows as Record<string, unknown>[]));
      }

      default:
        throw new Error(`Unsupported driver: ${driver}`);
    }
  }

  async first(): Promise<TModel | null> {
    const db = await this.model.getDB();
    const driver = this.getDriverName();

    switch (driver) {
      case "sqlite":
      case "mysql":
      case "pg": {
        const adapter = db as DriverAdapter;
        const { sql, params } = this.buildSqlSelect(adapter, 1);
        const row = await adapter.queryOne<Record<string, unknown>>(sql, params);
        const hydrated = this.modelClass.hydrateRow(row);
        if (!hydrated) return null;
        const loaded = await this.applyEagerLoading([hydrated]);
        return loaded[0] ?? null;
      }

      case "mongo": {
        let cursor = (db as any).collection(this.model.tableName).find(this.buildMongoFilter());
        if (this.orderField) {
          cursor = cursor.sort({ [this.orderField]: this.orderDirection === "asc" ? 1 : -1 });
        }
        cursor = cursor.limit(1);
        const rows = await cursor.toArray();
        const hydrated = this.modelClass.hydrateRow(
          (rows[0] as Record<string, unknown> | undefined) ?? null
        );
        if (!hydrated) return null;
        const loaded = await this.applyEagerLoading([hydrated]);
        return loaded[0] ?? null;
      }

      default:
        throw new Error(`Unsupported driver: ${driver}`);
    }
  }

  private getDriverName(): string {
    const connections = dbConfig.connections as Record<string, { driver?: string }>;
    return connections[this.model.connectionName]?.driver ?? this.model.connectionName;
  }

  private getSchema(): Record<string, SchemaField> {
    const schema = this.modelClass.schema;
    if (!schema) {
      throw new Error(`${this.modelClass.name} must define a schema to use the safe finder API.`);
    }
    return schema;
  }

  private assertColumnField(field: string, usage: "filter" | "sort"): void {
    const schema = this.getSchema();
    const definition = schema[field];
    if (!definition || definition.kind !== "column") {
      throw new Error(`Unknown ${usage} field '${field}' on ${this.modelClass.name}.`);
    }
  }

  private hasColumnField(field: string): boolean {
    const schema = this.getSchema();
    return schema[field]?.kind === "column";
  }

  private async applyEagerLoading(records: TModel[]): Promise<TModel[]> {
    if (this.eagerRelations.length === 0 || records.length === 0) {
      return records;
    }

    const loader = this.model as Record<string, unknown>;
    const eagerLoadRelations = loader["eagerLoadRelations"];
    if (typeof eagerLoadRelations !== "function") {
      throw new Error(
        `${this.modelClass.name} does not support eager loading on the safe finder path.`
      );
    }

    loader["eagerRelations"] = [...this.eagerRelations];
    return (await eagerLoadRelations.call(this.model, records)) as TModel[];
  }

  private buildSqlSelect(adapter: DriverAdapter, forcedLimit?: number): {
    sql: string;
    params: unknown[];
  } {
    const table = adapter.wrapId(this.model.tableName);
    let sql = `SELECT * FROM ${table}`;
    const params: unknown[] = [];

    if (this.filters.length > 0) {
      const clauses = this.filters.map(({ field, value }, index) => {
        params.push(value);
        return `${adapter.wrapId(field)} = ${adapter.placeholder(index + 1)}`;
      });
      sql += ` WHERE ${clauses.join(" AND ")}`;
    }

    if (this.orderField) {
      sql += ` ORDER BY ${adapter.wrapId(this.orderField)} ${this.orderDirection.toUpperCase()}`;
    }

    const finalLimit = forcedLimit ?? this.limitCount;
    if (finalLimit !== undefined) {
      sql += ` LIMIT ${finalLimit}`;
    }

    return { sql, params };
  }

  private buildMongoFilter(): Record<string, unknown> {
    const filter: Record<string, unknown> = {};
    for (const entry of this.filters) {
      filter[entry.field] = entry.value;
    }
    return filter;
  }
}
