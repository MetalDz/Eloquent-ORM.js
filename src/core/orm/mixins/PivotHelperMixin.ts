/**
 * 🔗 PivotHelperMixin
 * Adds helpers for managing many-to-many pivot tables (attach, detach, sync)
 * ✅ Type-safe, constructor-compliant, and works with SQL & Mongo drivers
 */

export interface DatabaseConnection {
  run?(sql: string, params?: unknown[]): Promise<unknown>;
  query?(sql: string, params?: unknown[]): Promise<unknown>;
  collection?(name: string): {
    insertMany(docs: Record<string, unknown>[]): Promise<void>;
    deleteMany(filter: Record<string, unknown>): Promise<void>;
  };
}

export interface PivotCapableModel {
  tableName: string;
  connectionName: string;
  getDB(): Promise<unknown>; // compatible with CoreModel
}

/** Constructor helper */
type Constructor<T = object> = abstract new (...args: any[]) => T;

/**
 * ✅ Updated PivotHelperMixin
 * - Adds a type stub for getDB() so TS is satisfied
 * - Properly casts dynamic `this` when accessing DB
 */
export function PivotHelperMixin<TBase extends Constructor>(Base: TBase) {
  abstract class PivotHelper extends Base implements PivotCapableModel {
    tableName!: string;
    connectionName!: string;

    // ✅ TypeScript fix: declare getDB() stub (implemented upstream in CoreModel)
    abstract getDB(): Promise<unknown>;

    constructor(...args: any[]) {
      super(...args);
    }

    /**
     * ➕ Attach related records to a pivot table
     */
    async attach(
      pivotTable: string,
      foreignKey: string,
      relatedKey: string,
      id: string | number,
      relatedIds: (string | number)[]
    ): Promise<void> {
      const db = await (this as unknown as PivotCapableModel).getDB();
      const rows = relatedIds.map((rid) => ({ [foreignKey]: id, [relatedKey]: rid }));

      const conn = (this as unknown as PivotCapableModel).connectionName;

      switch (conn) {
        case "sqlite":
        case "mysql":
        case "pg": {
          for (const row of rows) {
            const keys = Object.keys(row);
            const placeholders = keys.map(() => "?").join(", ");
            const sql = `INSERT INTO ${pivotTable} (${keys.join(", ")}) VALUES (${placeholders})`;

            const dbc = db as DatabaseConnection;
            if (typeof dbc.run === "function") {
              await dbc.run(sql, Object.values(row));
            } else if (typeof dbc.query === "function") {
              await dbc.query(sql, Object.values(row));
            } else {
              throw new Error("❌ Database driver does not support run/query.");
            }
          }
          break;
        }

        case "mongo": {
          const mongo = db as DatabaseConnection;
          if (typeof mongo.collection !== "function") {
            throw new Error("❌ MongoDB driver not available for pivot operations.");
          }
          await mongo.collection(pivotTable).insertMany(rows);
          break;
        }

        default:
          throw new Error(`❌ Unsupported connection type: ${conn}`);
      }
    }

    /**
     * ➖ Detach related records from a pivot table
     */
    async detach(
      pivotTable: string,
      foreignKey: string,
      id: string | number
    ): Promise<void> {
      const db = await (this as unknown as PivotCapableModel).getDB();
      const conn = (this as unknown as PivotCapableModel).connectionName;

      switch (conn) {
        case "sqlite": {
          const dbc = db as DatabaseConnection;
          if (typeof dbc.run === "function") {
            await dbc.run(`DELETE FROM ${pivotTable} WHERE ${foreignKey} = ?`, [id]);
          } else {
            throw new Error("❌ SQLite driver missing 'run()' method.");
          }
          break;
        }

        case "mysql":
        case "pg": {
          const dbc = db as DatabaseConnection;
          if (typeof dbc.query === "function") {
            await dbc.query(`DELETE FROM ${pivotTable} WHERE ${foreignKey} = ?`, [id]);
          } else {
            throw new Error("❌ SQL driver missing 'query()' method.");
          }
          break;
        }

        case "mongo": {
          const mongo = db as DatabaseConnection;
          if (typeof mongo.collection !== "function") {
            throw new Error("❌ MongoDB driver not available for pivot operations.");
          }
          await mongo.collection(pivotTable).deleteMany({ [foreignKey]: id });
          break;
        }

        default:
          throw new Error(`❌ Unsupported connection type: ${conn}`);
      }
    }

    /**
     * 🔄 Sync related records — clears old ones and attaches the new set
     */
    async sync(
      pivotTable: string,
      foreignKey: string,
      relatedKey: string,
      id: string | number,
      relatedIds: (string | number)[]
    ): Promise<void> {
      await this.detach(pivotTable, foreignKey, id);
      if (relatedIds.length > 0) {
        await this.attach(pivotTable, foreignKey, relatedKey, id, relatedIds);
      }
    }
  }

  // 👇 Important: cast ensures TS knows result = Base + PivotCapableModel
  return PivotHelper as unknown as TBase & (abstract new (...args: any[]) => PivotCapableModel);
}
