import { Pool } from "mysql2/promise";
import { dbConfig } from "../../config/database";

export class DatabaseConnection {
  private static instance: Pool;

  static getInstance(): Pool {
    if (!DatabaseConnection.instance) {
      const mysql = require("mysql2/promise");
      DatabaseConnection.instance = mysql.createPool(dbConfig);
    }
    return DatabaseConnection.instance;
  }
}
