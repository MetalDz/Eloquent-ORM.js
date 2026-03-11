// src/config/database.ts
import * as dotenv from "dotenv";
import {
  resolveMysqlEnv,
  resolveMongoEnv,
  resolvePgEnv,
  resolveSqlitePath,
} from "./dbRoleEnv";

dotenv.config();

const mysqlRuntime = resolveMysqlEnv(process.env, { test: false });
const mysqlTest = resolveMysqlEnv(process.env, { test: true });
const pgRuntime = resolvePgEnv(process.env, { test: false });
const pgTest = resolvePgEnv(process.env, { test: true });
const sqliteRuntimePath = resolveSqlitePath(process.env, { test: false });
const sqliteTestPath = resolveSqlitePath(process.env, { test: true });
const mongoRuntime = resolveMongoEnv(process.env, { test: false });
const mongoTest = resolveMongoEnv(process.env, { test: true });

export const dbConfig = {
  default: process.env.DB_CONNECTION || "mysql",

  connections:{
    mysql: {
      driver: "mysql",
      host: mysqlRuntime.host,
      user: mysqlRuntime.user,
      password: mysqlRuntime.password,
      database: mysqlRuntime.database,
      port: mysqlRuntime.port,
    },
    mysql_test: {
      driver: "mysql",
      host: mysqlTest.host,
      user: mysqlTest.user,
      password: mysqlTest.password,
      database: mysqlTest.database,
      port: mysqlTest.port,
    },
    pg_test: {
      driver: "pg",
      host: pgTest.host,
      user: pgTest.user,
      password: pgTest.password,
      database: pgTest.database,
      port: pgTest.port,
    },
    pg: {
      driver: "pg",
      host: pgRuntime.host,
      user: pgRuntime.user,
      password: pgRuntime.password,
      database: pgRuntime.database,
      port: pgRuntime.port,
    },
    sqlite_test: {
      driver: "sqlite",
      sqlitePath: sqliteTestPath,
    },
    sqlite: {
      driver: "sqlite",
      sqlitePath: sqliteRuntimePath,
    },
    mongo: {
      driver: "mongo",
      uri: mongoRuntime.uri,
      database: mongoRuntime.database,
      dnsServers: mongoRuntime.dnsServers,
    },
    mongo_test: {
      driver: "mongo",
      uri: mongoTest.uri,
      database: mongoTest.database,
      dnsServers: mongoTest.dnsServers,
    },
  },
};
