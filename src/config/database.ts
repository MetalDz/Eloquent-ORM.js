// src/config/database.ts
import * as dotenv from "dotenv";
dotenv.config();

export const dbConfig = {
  default: process.env.DB_CONNECTION || "mysql",

  connections:{
    mysql: {
      driver: "mysql",
      host: process.env.DB_HOST || "localhost",
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "",
      database: process.env.DB_NAME || "eloquentjs",
    },
    mysql_test: {
      driver: "mysql",
      host: process.env.DB_TEST_HOST || process.env.DB_HOST || "localhost",
      user: process.env.DB_TEST_USER || process.env.DB_USER || "root",
      password: process.env.DB_TEST_PASSWORD || process.env.DB_PASSWORD || "",
      database: process.env.DB_TEST_NAME || "db_test",
      port: Number(process.env.DB_TEST_PORT) || 3306,
    },
    pg_test: {
      driver: "pg",
      host: process.env.PG_TEST_HOST || process.env.PG_HOST || "localhost",
      user: process.env.PG_TEST_USER || process.env.PG_USER || "postgres",
      password: process.env.PG_TEST_PASSWORD || process.env.PG_PASSWORD || "",
      database:
        process.env.PG_TEST_NAME ||
        process.env.PG_TEST_DB_NAME ||
        process.env.PG_NAME ||
        process.env.PG_DB_NAME ||
        "db_test_pg",
      port: Number(process.env.PG_TEST_PORT || process.env.PG_PORT) || 5432,
    },
    pg: {
      driver: "pg",
      host: process.env.PG_HOST || "localhost",
      user: process.env.PG_USER || "postgres",
      password: process.env.PG_PASSWORD || "",
      database: process.env.PG_NAME || process.env.PG_DB_NAME || "test_db",
      port: Number(process.env.PG_PORT) || 5432,
    },
    sqlite_test: {
      driver: "sqlite",
      sqlitePath:
        process.env.SQLITE_TEST_PATH ||
        process.env.SQLITE_PATH ||
        "./data.test.sqlite",
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
