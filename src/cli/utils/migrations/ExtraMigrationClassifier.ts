export type ExtraMigrationDescriptor = {
  targetName: string;
  fileSuffix: string;
  headerLabel: string;
  logLabel: string;
  fallbackRollbackSql: string;
};

export function classifyExtraMigrationSql(sql: string): ExtraMigrationDescriptor {
  const createTableMatch = sql.match(
    /CREATE TABLE(?: IF NOT EXISTS)?\s+[`"]?([A-Za-z0-9_]+)/i
  );
  if (createTableMatch) {
    const tableName = createTableMatch[1];
    return {
      targetName: tableName,
      fileSuffix: `create_${tableName}_table`,
      headerLabel: tableName,
      logLabel: "Pivot migration",
      fallbackRollbackSql: `DROP TABLE IF EXISTS ${tableName};`,
    };
  }

  const createIndexMatch = sql.match(
    /CREATE(?: UNIQUE)? INDEX(?: IF NOT EXISTS)?\s+[`"]?([A-Za-z0-9_]+)[`"]?\s+ON\s+[`"]?([A-Za-z0-9_]+)/i
  );
  if (createIndexMatch) {
    const indexName = createIndexMatch[1];
    const tableName = createIndexMatch[2];
    return {
      targetName: tableName,
      fileSuffix: `add_${tableName}_indexes`,
      headerLabel: `${tableName} indexes`,
      logLabel: "Helper migration",
      fallbackRollbackSql: `DROP INDEX IF EXISTS ${indexName};`,
    };
  }

  return {
    targetName: "schema_extras",
    fileSuffix: "add_schema_extras",
    headerLabel: "schema extras",
    logLabel: "Helper migration",
    fallbackRollbackSql: "-- rollback SQL unavailable for schema extras",
  };
}
