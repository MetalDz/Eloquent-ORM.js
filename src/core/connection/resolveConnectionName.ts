// src/core/connection/resolveConnectionName.ts
import { dbConfig } from "../../config/database";
import type { ConnectionName } from "./ConnectionFactory";

/**
 * 🔍 Resolve the correct connection name for a model or fallback globally.
 * Priority:
 * 1. Explicit model test/no-sql connection (test mode)
 * 2. process.env.DB_TEST_CONNECTION (test mode)
 * 3. ModelClass.connectionName
 * 4. process.env.DB_CONNECTION
 * 5. dbConfig.default
 * 6. "mysql"
 */
export function resolveConnectionName(
  modelClass?: { connectionName?: string },
  options?: { test?: boolean }
): ConnectionName {
  if (options?.test) {
    const explicitModelConnection = modelClass?.connectionName;
    if (
      explicitModelConnection &&
      Object.prototype.hasOwnProperty.call(dbConfig.connections, explicitModelConnection)
    ) {
      const modelDriver = (dbConfig.connections as Record<string, { driver?: string }>)[
        explicitModelConnection
      ]?.driver;
      if (explicitModelConnection.endsWith("_test") || modelDriver === "mongo") {
        return explicitModelConnection as ConnectionName;
      }
    }

    const explicitTest = process.env.DB_TEST_CONNECTION;
    if (
      explicitTest &&
      Object.prototype.hasOwnProperty.call(dbConfig.connections, explicitTest)
    ) {
      return explicitTest as ConnectionName;
    }

    for (const fallback of ["mysql_test", "pg_test", "sqlite_test", "mongo_test", "mongo"]) {
      if (Object.prototype.hasOwnProperty.call(dbConfig.connections, fallback)) {
        return fallback as ConnectionName;
      }
    }
  }
  const name =
    modelClass?.connectionName ||
    process.env.DB_CONNECTION ||
    dbConfig.default ||
    "mysql";

  if (!Object.keys(dbConfig.connections).includes(name)) {
    console.warn(
      `⚠️ Invalid connection "${name}" — falling back to "mysql".`
    );
    return "mysql";
  }

  return name as ConnectionName;
}
