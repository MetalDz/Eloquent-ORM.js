import { DatabaseConnection } from "../connection/DatabaseConnection";

export class BaseQueryBuilder {
  private table: string;
  private connection = DatabaseConnection.getInstance();
  private conditions: string[] = [];
  private params: any[] = [];

  constructor(table: string) {
    this.table = table;
  }

  where(field: string, operator: string, value: any) {
    this.conditions.push(`${field} ${operator} ?`);
    this.params.push(value);
    return this;
  }

  async get() {
    const whereClause = this.conditions.length ? `WHERE ${this.conditions.join(" AND ")}` : "";
    const [rows] = await this.connection.query(`SELECT * FROM ${this.table} ${whereClause}`, this.params);
    return rows;
  }
}
