import { Relation } from "../../Relation";
import { getConnection } from "../../connection/ConnectionFactory";

export class MorphTo extends Relation {
  private typeField: string;
  private idField: string;

  constructor(
    relatedModel: any,
    foreignKey: string,
    localKey: string,
    typeField: string,
    idField: string
  ) {
    super(relatedModel, foreignKey, localKey);
    this.typeField = typeField;
    this.idField = idField;
  }

  async getResults(parent: any): Promise<any> {
    const db = await getConnection("mysql");

    const relatedType = parent[this.typeField];
    const relatedId = parent[this.idField];
    if (!relatedType || !relatedId) return null;

    const relatedTable = relatedType.toLowerCase() + "s"; // convention-based
    const sql = `
      SELECT * FROM ${relatedTable}
      WHERE id = ?
      LIMIT 1
    `;
    const [rows] = await db.query(sql, [relatedId]);
    return rows[0] || null;
  }
}
