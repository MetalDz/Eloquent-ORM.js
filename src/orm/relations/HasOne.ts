// src/orm/relations/HasOne.ts
import { DatabaseConnection } from "../../core/connection/DatabaseConnection";

/**
 * Very small HasOne relation helper.
 * Usage: new HasOne(RelatedClass, 'foreign_key', 'local_key')
 * .get(parentInstance) -> returns single related row as plain object
 */
export class HasOne {
  relatedCtor: new () => any;
  foreignKey: string;
  localKey: string;

  constructor(relatedCtor: new () => any, foreignKey = "", localKey = "id") {
    this.relatedCtor = relatedCtor;
    this.foreignKey = foreignKey;
    this.localKey = localKey;
  }

  /**
   * Fetch the related record for the parent instance.
   * Returns the first row or null.
   */
  async get(parentInstance: any): Promise<any | null> {
    if (!parentInstance) return null;

    const parentId = parentInstance[this.localKey];
    if (parentId === undefined) return null;

    // derive table name from relatedCtor - expect relatedCtor to set a tableName property
    const relatedInstance = new this.relatedCtor();
    const relatedTable = relatedInstance.tableName || relatedInstance.table || (() => {
      // fallback: lowercase class name + 's'
      return (this.relatedCtor as any).name.toLowerCase() + "s";
    })();

    const fk = this.foreignKey || `${(parentInstance.constructor?.name || "parent").toLowerCase()}_id`;

    const db = DatabaseConnection.getInstance();
    // mysql2/promise returns [rows, fields]
    const [rows] = await (db as any).query(`SELECT * FROM \`${relatedTable}\` WHERE \`${fk}\` = ? LIMIT 1`, [parentId]);

    if (Array.isArray(rows) && rows.length) return rows[0];
    return null;
  }
}
