import type { ConnectionName } from "../../core/connection/ConnectionFactory";
import { dbConfig } from "../../config/database";

export type DriverConnectionFlags = {
  mysql?: boolean;
  pg?: boolean;
  sqlite?: boolean;
  mongo?: boolean;
  allConnections?: boolean;
};

export type ResolveConnectionFlagsOptions = {
  sqlOnly?: boolean;
  includeMongoInAllConnections?: boolean;
};

type DriverAlias = "mysql" | "pg" | "sqlite" | "mongo";

function mapDriverToConnectionName(
  driver: DriverAlias,
  isTest: boolean
): ConnectionName | null {
  if (isTest) {
    const testName = `${driver}_test`;
    if (Object.prototype.hasOwnProperty.call(dbConfig.connections, testName)) {
      return testName as ConnectionName;
    }
  }

  if (Object.prototype.hasOwnProperty.call(dbConfig.connections, driver)) {
    return driver as ConnectionName;
  }

  return null;
}

export function resolveConnectionNamesFromFlags(
  isTest: boolean,
  flags: DriverConnectionFlags = {},
  options: ResolveConnectionFlagsOptions = {}
): ConnectionName[] {
  const sqlOnly = options.sqlOnly === true;
  const includeMongoInAll = options.includeMongoInAllConnections === true;
  const allowedDrivers: DriverAlias[] = sqlOnly
    ? ["mysql", "pg", "sqlite"]
    : ["mysql", "pg", "sqlite", "mongo"];

  if (flags.allConnections) {
    const allDrivers: DriverAlias[] = includeMongoInAll
      ? allowedDrivers
      : allowedDrivers.filter((name) => name !== "mongo");

    return allDrivers
      .map((driver) => mapDriverToConnectionName(driver, isTest))
      .filter((name): name is ConnectionName => name !== null);
  }

  const selectedDrivers = allowedDrivers.filter((driver) => flags[driver]);
  if (selectedDrivers.length === 0) {
    return [];
  }

  if (selectedDrivers.length > 1) {
    throw new Error(
      "Choose only one explicit connection flag or use --all-connections."
    );
  }

  const [driver] = selectedDrivers;
  const resolved = mapDriverToConnectionName(driver, isTest);
  return resolved ? [resolved] : [];
}
