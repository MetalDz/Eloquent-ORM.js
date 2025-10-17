import { Relation } from "../../Relation";

import { getConnection } from "../../connection/ConnectionFactory";

export class MorphMany extends Relation {
  private typeField: string;
  private typeValue: string;

  constructor(
    relatedModel: any,
    foreignKey: string,
    localKey: string,
    typeField: string,
    typeValue: string
  ) {
    super(relatedModel, foreignKey, localKey);
    this.typeField = typeField;
    this.typeValue = typeValue;
  }

  async getResults(parent: any): Promise<any[]> {
    const db = await getConnection("mysql");
    const sql = `
      SELECT * FROM ${this.relatedModel.table}
      WHERE ${this.foreignKey} = ?
      AND ${this.typeField} = ?
    `;
    const [rows] = await db.query(sql, [parent[this.localKey], this.typeValue]);
    return rows;
  }
}
