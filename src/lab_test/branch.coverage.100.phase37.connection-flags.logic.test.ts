import { resolveConnectionNamesFromFlags } from "../cli/utils/resolveConnectionFlags.js";

describe("Branch coverage 100% - phase 37 connection flag resolver", () => {
  test("returns empty when no explicit flags are passed", () => {
    expect(resolveConnectionNamesFromFlags(false)).toEqual([]);
    expect(resolveConnectionNamesFromFlags(true, {})).toEqual([]);
  });

  test("maps explicit mongo flag for runtime and test environments", () => {
    expect(resolveConnectionNamesFromFlags(false, { mongo: true })).toEqual(["mongo"]);
    expect(resolveConnectionNamesFromFlags(true, { mongo: true })).toEqual(["mongo_test"]);
  });

  test("all-connections remains sql-only by default", () => {
    expect(
      resolveConnectionNamesFromFlags(false, { allConnections: true })
    ).toEqual(["mysql", "pg", "sqlite"]);
    expect(
      resolveConnectionNamesFromFlags(true, { allConnections: true })
    ).toEqual(["mysql_test", "pg_test", "sqlite_test"]);
  });

  test("all-connections can include mongo when explicitly enabled", () => {
    expect(
      resolveConnectionNamesFromFlags(
        false,
        { allConnections: true },
        { includeMongoInAllConnections: true }
      )
    ).toEqual(["mysql", "pg", "sqlite", "mongo"]);
    expect(
      resolveConnectionNamesFromFlags(
        true,
        { allConnections: true },
        { includeMongoInAllConnections: true }
      )
    ).toEqual(["mysql_test", "pg_test", "sqlite_test", "mongo_test"]);
  });

  test("throws when multiple explicit flags are selected", () => {
    expect(() =>
      resolveConnectionNamesFromFlags(false, { mysql: true, mongo: true })
    ).toThrow("Choose only one explicit connection flag or use --all-connections.");
  });

  test("sqlOnly mode ignores mongo explicit flag and keeps sql all-connections", () => {
    expect(
      resolveConnectionNamesFromFlags(
        false,
        { mongo: true },
        { sqlOnly: true }
      )
    ).toEqual([]);
    expect(
      resolveConnectionNamesFromFlags(
        true,
        { allConnections: true },
        { sqlOnly: true, includeMongoInAllConnections: true }
      )
    ).toEqual(["mysql_test", "pg_test", "sqlite_test"]);
  });
});

export {};
