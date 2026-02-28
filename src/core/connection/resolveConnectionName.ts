// src/core/connection/resolveConnectionName.ts
import { dbConfig } from "../../config/database";
import type { ConnectionName } from "./ConnectionFactory";

/**
 * 🔍 Resolve the correct connection name for a model or fallback globally.
 * Priority:
 * 1. ModelClass.connectionName
 * 2. process.env.DB_CONNECTION
 * 3. dbConfig.default
 * 4. "mysql"
 */
export function resolveConnectionName(
  modelClass?: { connectionName?: string },
  options?: { test?: boolean }
): ConnectionName {
  if (options?.test) {
    const explicitTest = process.env.DB_TEST_CONNECTION;
    if (
      explicitTest &&
      Object.prototype.hasOwnProperty.call(dbConfig.connections, explicitTest)
    ) {
      return explicitTest as ConnectionName;
    }

    for (const fallback of ["mysql_test", "pg_test", "sqlite_test"]) {
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
