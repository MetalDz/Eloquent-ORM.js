// src/config/database.ts
import dotenv from "dotenv";
dotenv.config();

export const dbConfig = {
  default: process.env.DB_CONNECTION || "mysql",

  connections: {
    mysql: {
      driver: "mysql",
      host: process.env.DB_HOST || "localhost",
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "",
      database: process.env.DB_NAME || "test_db",
    },
    pg: {
      driver: "pg",
      host: process.env.PG_HOST || "localhost",
      user: process.env.PG_USER || "postgres",
      password: process.env.PG_PASSWORD || "",
      database: process.env.PG_NAME || "test_db",
      port: Number(process.env.PG_PORT) || 5432,
    },
    sqlite: {
      driver: "sqlite",
      sqlitePath: process.env.SQLITE_PATH || "./data.sqlite",
    },
    mongo: {
      driver: "mongo",
      uri: process.env.MONGO_URI || "mongodb://localhost:27017",
      database: process.env.MONGO_DB || "eloquentjs_db",
    },
  },
};
