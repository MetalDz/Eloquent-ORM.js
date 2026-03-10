/**
 * ًں”— PivotHelperMixin
 * Adds helpers for managing many-to-many pivot tables (attach, detach, sync)
 * âœ… Type-safe, constructor-compliant, and works with SQL & Mongo drivers
 */

import type { DriverAdapter } from "../../connection/DriverAdapter";
import { dbConfig } from "../../../config/database";

export interface DatabaseConnection {
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
 * âœ… Updated PivotHelperMixin
 * - Adds a type stub for getDB() so TS is satisfied
 * - Properly casts dynamic `this` when accessing DB
 */
export function PivotHelperMixin<TBase extends Constructor>(Base: TBase) {
  abstract class PivotHelper extends Base implements PivotCapableModel {
    tableName!: string;
    connectionName!: string;

    // âœ… TypeScript fix: declare getDB() stub (implemented upstream in CoreModel)
    abstract getDB(): Promise<unknown>;

    constructor(...args: any[]) {
      super(...args);
    }

    /**
     * â‍• Attach related records to a pivot table
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
      if (rows.length === 0) return;

      const conn = (this as unknown as PivotCapableModel).connectionName;
      const key = conn as keyof typeof dbConfig.connections;
      const driver = dbConfig.connections[key]?.driver ?? conn;

      switch (driver) {
        case "sqlite":
        case "mysql":
        case "pg": {
          if (rows.length === 0) return;
          const adapter = db as DriverAdapter;
          const keys = Object.keys(rows[0]);
          const table = adapter.wrapId(pivotTable);
          const columns = keys.map((key) => adapter.wrapId(key)).join(", ");
          const sql = `INSERT INTO ${table} (${columns}) VALUES (${adapter.placeholders(
            keys.length
          )})`;

          for (const row of rows) {
            const values = keys.map((key) => (row as Record<string, unknown>)[key]);
            await adapter.execute(sql, values);
          }
          break;
        }

        case "mongo": {
          const mongo = db as DatabaseConnection;
          if (typeof mongo.collection !== "function") {
            throw new Error("â‌Œ MongoDB driver not available for pivot operations.");
          }
          await mongo.collection(pivotTable).insertMany(rows);
          break;
        }

        default:
          throw new Error(`â‌Œ Unsupported connection type: ${driver}`);
      }
    }

    /**
     * â‍– Detach related records from a pivot table
     */
    async detach(
      pivotTable: string,
      foreignKey: string,
      id: string | number
    ): Promise<void> {
      const db = await (this as unknown as PivotCapableModel).getDB();
      const conn = (this as unknown as PivotCapableModel).connectionName;
      const key = conn as keyof typeof dbConfig.connections;
      const driver = dbConfig.connections[key]?.driver ?? conn;

      switch (driver) {
        case "sqlite":
        case "mysql":
        case "pg": {
          const adapter = db as DriverAdapter;
          const table = adapter.wrapId(pivotTable);
          const fk = adapter.wrapId(foreignKey);
          const sql = `DELETE FROM ${table} WHERE ${fk} = ${adapter.placeholder(1)}`;
          await adapter.execute(sql, [id]);
          break;
        }

        case "mongo": {
          const mongo = db as DatabaseConnection;
          if (typeof mongo.collection !== "function") {
            throw new Error("â‌Œ MongoDB driver not available for pivot operations.");
          }
          await mongo.collection(pivotTable).deleteMany({ [foreignKey]: id });
          break;
        }

        default:
          throw new Error(`â‌Œ Unsupported connection type: ${driver}`);
      }
    }

    /**
     * ًں”„ Sync related records â€” clears old ones and attaches the new set
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

  // ًں‘‡ Important: cast ensures TS knows result = Base + PivotCapableModel
  return PivotHelper as unknown as TBase & (abstract new (...args: any[]) => PivotCapableModel);
}
