import { Relation } from "../../Relation";

export class BelongsToMany extends Relation {
  private pivotTable: string;
  private pivotForeignKey: string;
  private pivotRelatedKey: string;

  constructor(
    relatedModel: any,
    pivotTable: string,
    foreignKey: string, // key in pivot that references parent
    pivotForeignKey: string, // key in pivot that references related
    localKey: string,
    pivotRelatedKey: string
  ) {
    super(relatedModel, foreignKey, localKey);
    this.pivotTable = pivotTable;
    this.pivotForeignKey = pivotForeignKey;
    this.pivotRelatedKey = pivotRelatedKey;
  }

  async getResults(parent: any): Promise<any[]> {
    const relatedInstance = new this.relatedModel();
    const db = await relatedInstance["getDB"]();

    const sql = `
      SELECT r.* 
      FROM ${relatedInstance["tableName"]} AS r
      INNER JOIN ${this.pivotTable} AS p 
        ON p.${this.pivotRelatedKey} = r.id
      WHERE p.${this.pivotForeignKey} = ?
    `;

    const [rows] = await db.query(sql, [parent[this.localKey]]);
    return rows;
  }

  // Optionally attach a relation entry in the pivot table
  async attach(parentId: any, relatedId: any): Promise<void> {
    const relatedInstance = new this.relatedModel();
    const db = await relatedInstance["getDB"]();

    const sql = `
      INSERT INTO ${this.pivotTable} (${this.pivotForeignKey}, ${this.pivotRelatedKey})
      VALUES (?, ?)
    `;
    await db.query(sql, [parentId, relatedId]);
  }

  // Optionally detach (remove link)
  async detach(parentId: any, relatedId: any): Promise<void> {
    const relatedInstance = new this.relatedModel();
    const db = await relatedInstance["getDB"]();

    const sql = `
      DELETE FROM ${this.pivotTable}
      WHERE ${this.pivotForeignKey} = ? AND ${this.pivotRelatedKey} = ?
    `;
    await db.query(sql, [parentId, relatedId]);
  }
}
