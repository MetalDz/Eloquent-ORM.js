import { dbConfig } from "../../config/database.js";
import type { DriverAdapter } from "../connection/DriverAdapter.js";
import type { SchemaField } from "../schema/SchemaBlueprint.js";
import type { TransactionContext } from "../connection/TransactionManager.js";

export type SafeFinderDirection = "asc" | "desc";
export type SafeFinderFilters = Record<string, unknown>;

export interface SafeFinderModelInstance {
  tableName: string;
  connectionName: string;
  getDB(): Promise<unknown>;
  useTransaction(context: TransactionContext): SafeFinderModelInstance;
  getTransactionContext(): TransactionContext | undefined;
  save(pk?: string): Promise<void>;
  create(data: Record<string, unknown>): Promise<SafeFinderModelInstance | null>;
  delete(id?: number | string, pk?: string): Promise<void>;
  find(id: number | string, pk?: string): Promise<SafeFinderModelInstance | null>;
  where(field: string, value: unknown): SafeFinderQuery<SafeFinderModelInstance>;
  with(...relations: string[]): SafeFinderQuery<SafeFinderModelInstance>;
  active(...args: unknown[]): SafeFinderQuery<SafeFinderModelInstance>;
  inactive(...args: unknown[]): SafeFinderQuery<SafeFinderModelInstance>;
  published(...args: unknown[]): SafeFinderQuery<SafeFinderModelInstance>;
  orderBy(
    field: string,
    direction?: SafeFinderDirection
  ): SafeFinderQuery<SafeFinderModelInstance>;
  limit(count: number): SafeFinderQuery<SafeFinderModelInstance>;
  get(): Promise<SafeFinderModelInstance[]>;
  first(): Promise<SafeFinderModelInstance | null>;
  findBy(field: string, value: unknown): SafeFinderQuery<SafeFinderModelInstance>;
  findOneBy(field: string, value: unknown): Promise<SafeFinderModelInstance | null>;
  findAllBy(filters: SafeFinderFilters): Promise<SafeFinderModelInstance[]>;
  existsBy(filters: SafeFinderFilters): Promise<boolean>;
}

export interface SafeFinderModelStatic<TModel extends SafeFinderModelInstance = SafeFinderModelInstance> {
  name: string;
  schema?: Record<string, SchemaField>;
  hydrateRow(row: Record<string, unknown> | null): TModel | null;
  hydrateMany(rows: Record<string, unknown>[]): TModel[];
  scopeActive?(query: SafeFinderQuery<TModel>, ...args: unknown[]): SafeFinderQuery<TModel> | void;
  scopeInactive?(query: SafeFinderQuery<TModel>, ...args: unknown[]): SafeFinderQuery<TModel> | void;
  scopePublished?(query: SafeFinderQuery<TModel>, ...args: unknown[]): SafeFinderQuery<TModel> | void;
}

type FilterEntry = {
  field: string;
  value: unknown;
};

type SafeFinderLockMode = "update" | "share";

export class SafeFinderQuery<TModel extends SafeFinderModelInstance = SafeFinderModelInstance> {
  private readonly filters: FilterEntry[] = [];
  private readonly eagerRelations: string[] = [];
  private orderField?: string;
  private orderDirection: SafeFinderDirection = "asc";
  private limitCount?: number;
  private lockMode?: SafeFinderLockMode;
  private skipLockedRequested = false;

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
    for (const relation of relations) {
      this.assertRelationPath(relation);
      this.eagerRelations.push(relation);
    }
    return this;
  }

  active(...args: unknown[]): this {
    return this.applyNamedScope(
      "active",
      this.modelClass.scopeActive,
      () => {
        if (this.hasColumnField("status")) {
          return this.where("status", "active");
        }

        if (this.hasColumnField("active")) {
          return this.where("active", true);
        }

        return undefined;
      },
      args,
      "Define static scopeActive(query) or add a 'status'/'active' column."
    );
  }

  inactive(...args: unknown[]): this {
    return this.applyNamedScope(
      "inactive",
      this.modelClass.scopeInactive,
      () => {
        if (this.hasColumnField("status")) {
          return this.where("status", "inactive");
        }

        if (this.hasColumnField("active")) {
          return this.where("active", false);
        }

        return undefined;
      },
      args,
      "Define static scopeInactive(query) or add a 'status'/'active' column."
    );
  }

  published(...args: unknown[]): this {
    return this.applyNamedScope(
      "published",
      this.modelClass.scopePublished,
      () => {
        if (this.hasColumnField("published")) {
          return this.where("published", true);
        }

        if (this.hasColumnField("status")) {
          return this.where("status", "published");
        }

        return undefined;
      },
      args,
      "Define static scopePublished(query) or add a 'published'/'status' column."
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

  forUpdate(): this {
    this.assertSqlLockingSupported("forUpdate");
    this.assertCompatibleLockMode("update", "forUpdate");
    this.lockMode = "update";
    return this;
  }

  forShare(): this {
    this.assertSqlLockingSupported("forShare");
    this.assertCompatibleLockMode("share", "forShare");
    this.lockMode = "share";
    return this;
  }

  skipLocked(): this {
    this.assertSqlLockingSupported("skipLocked");

    if (!this.lockMode) {
      throw new Error("skipLocked() requires forUpdate() or forShare() first.");
    }

    this.skipLockedRequested = true;
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
        return this.applyEagerLoading(
          this.bindHydratedModels(this.modelClass.hydrateMany(rows))
        );
      }

      case "mongo": {
        const mongoOptions = this.getMongoSessionOptions();
        const collection = (db as any).collection(this.model.tableName);
        let cursor =
          mongoOptions === undefined
            ? collection.find(this.buildMongoFilter())
            : collection.find(this.buildMongoFilter(), mongoOptions);
        if (this.orderField) {
          cursor = cursor.sort({ [this.orderField]: this.orderDirection === "asc" ? 1 : -1 });
        }
        if (this.limitCount !== undefined) {
          cursor = cursor.limit(this.limitCount);
        }
        const rows = await cursor.toArray();
        return this.applyEagerLoading(
          this.bindHydratedModels(this.modelClass.hydrateMany(rows as Record<string, unknown>[]))
        );
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
        const hydrated = this.bindHydratedModel(this.modelClass.hydrateRow(row));
        if (!hydrated) return null;
        const loaded = await this.applyEagerLoading([hydrated]);
        return loaded[0] ?? null;
      }

      case "mongo": {
        const mongoOptions = this.getMongoSessionOptions();
        const collection = (db as any).collection(this.model.tableName);
        let cursor =
          mongoOptions === undefined
            ? collection.find(this.buildMongoFilter())
            : collection.find(this.buildMongoFilter(), mongoOptions);
        if (this.orderField) {
          cursor = cursor.sort({ [this.orderField]: this.orderDirection === "asc" ? 1 : -1 });
        }
        cursor = cursor.limit(1);
        const rows = await cursor.toArray();
        const hydrated = this.bindHydratedModel(this.modelClass.hydrateRow(
          (rows[0] as Record<string, unknown> | undefined) ?? null
        ));
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

  private assertRelationPath(relation: string): void {
    if (typeof relation !== "string" || relation.trim() === "") {
      throw new Error(`with() expects non-empty relation names on ${this.modelClass.name}.`);
    }

    const segments = relation.split(".");
    if (segments.some((segment) => segment.trim() === "")) {
      throw new Error(`Invalid relation path '${relation}' on ${this.modelClass.name}.`);
    }

    const topLevel = segments[0];
    const relationFn = (this.model as Record<string, unknown>)[topLevel];
    if (typeof relationFn !== "function") {
      throw new Error(`Relation '${topLevel}' is not defined on ${this.modelClass.name}.`);
    }
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

  private getMongoSessionOptions(): { session: unknown } | undefined {
    const tx = this.model.getTransactionContext?.();
    if (tx?.driver !== "mongo") {
      return undefined;
    }

    return { session: tx.session };
  }

  private bindHydratedModel(record: TModel | null): TModel | null {
    const tx = this.model.getTransactionContext?.();
    if (!record || !tx || typeof record.useTransaction !== "function") {
      return record;
    }

    return record.useTransaction(tx) as TModel;
  }

  private bindHydratedModels(records: TModel[]): TModel[] {
    const tx = this.model.getTransactionContext?.();
    if (!tx) {
      return records;
    }

    return records.map((record) => {
      if (typeof record.useTransaction !== "function") {
        return record;
      }

      return record.useTransaction(tx) as TModel;
    });
  }

  private applyNamedScope(
    name: "active" | "inactive" | "published",
    scope:
      | ((query: SafeFinderQuery<TModel>, ...args: unknown[]) => SafeFinderQuery<TModel> | void)
      | undefined,
    fallback: (...args: unknown[]) => this | undefined,
    args: unknown[],
    guidance: string
  ): this {
    if (typeof scope === "function") {
      const result = scope.call(this.modelClass, this, ...args);
      return (result as this | void) ?? this;
    }

    const fallbackResult = fallback(...args);
    if (fallbackResult) {
      return fallbackResult;
    }

    throw new Error(`No ${name} scope available on ${this.modelClass.name}. ${guidance}`);
  }

  private assertCompatibleLockMode(nextMode: SafeFinderLockMode, helperName: string): void {
    if (this.lockMode && this.lockMode !== nextMode) {
      throw new Error(
        `${helperName}() cannot be combined with ${
          this.lockMode === "update" ? "forUpdate()" : "forShare()"
        }.`
      );
    }
  }

  private assertSqlLockingSupported(helperName: string): "pg" | "mysql" {
    const tx = this.model.getTransactionContext?.();
    const driver = this.getDriverName();

    if (!tx) {
      throw new Error(`${helperName}() requires an active SQL transaction.`);
    }

    if (driver === "mongo" || tx.driver === "mongo") {
      throw new Error(`${helperName}() is not supported for mongo finders.`);
    }

    if (driver === "sqlite" || tx.driver === "sqlite") {
      throw new Error(`${helperName}() is not supported for sqlite finders.`);
    }

    if (driver !== "pg" && driver !== "mysql") {
      throw new Error(`${helperName}() is supported only for pg and mysql finders.`);
    }

    if (tx.driver !== driver) {
      throw new Error(
        `${helperName}() requires a transaction matching the model driver '${driver}'.`
      );
    }

    return driver;
  }

  private buildSqlLockClause(): string {
    if (!this.lockMode) {
      if (this.skipLockedRequested) {
        throw new Error("skipLocked() requires forUpdate() or forShare() first.");
      }

      return "";
    }

    this.assertSqlLockingSupported(this.lockMode === "update" ? "forUpdate" : "forShare");

    let clause = this.lockMode === "update" ? "FOR UPDATE" : "FOR SHARE";
    if (this.skipLockedRequested) {
      clause += " SKIP LOCKED";
    }

    return clause;
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

    const lockClause = this.buildSqlLockClause();
    if (lockClause) {
      sql += ` ${lockClause}`;
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
