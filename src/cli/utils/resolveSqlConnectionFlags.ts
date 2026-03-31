import type { ConnectionName } from "../../core/connection/ConnectionFactory.js";

export type SqlConnectionFlags = {
  mysql?: boolean;
  pg?: boolean;
  sqlite?: boolean;
  allConnections?: boolean;
};

export function resolveSqlConnectionNames(
  isTest: boolean,
  flags: SqlConnectionFlags = {}
): ConnectionName[] {
  const selected = (["mysql", "pg", "sqlite"] as const).filter(
    (name) => flags[name]
  );

  if (flags.allConnections) {
    return isTest
      ? ["mysql_test", "pg_test", "sqlite_test"]
      : ["mysql", "pg", "sqlite"];
  }

  if (selected.length === 0) {
    return [];
  }

  if (selected.length > 1) {
    throw new Error(
      "Choose only one explicit connection flag or use --all-connections."
    );
  }

  const [selectedConnection] = selected;
  if (isTest) {
    return [`${selectedConnection}_test` as ConnectionName];
  }

  return [selectedConnection];
}
